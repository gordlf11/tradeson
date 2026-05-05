import { Router } from 'express';
import Stripe from 'stripe';
import pool from '../config/db';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { logAuditEvent } from '../middleware/audit';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const PLATFORM_FEE_PERCENT = parseFloat(process.env.PLATFORM_FEE_PERCENT || '0.10');

const router = Router();

// POST /api/v1/jobs — Create a new job
router.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id } = req.user!;
  if (!id) { res.status(401).json({ error: 'User not found' }); return; }

  const { title, description, category, room, severity, job_nature,
          affected_part, adjacent_impact, housewide_impact,
          address, city, state, zip_code, budget_min, budget_max } = req.body;

  try {
    // The 5-step job creation form doesn't collect address — it's the
    // user's home. Auto-fill from the homeowner profile (preferred) or
    // their primary user_addresses row, so we don't lose the data.
    // Anything the client did send wins over the auto-fill.
    let finalAddress = address;
    let finalCity = city;
    let finalState = state;
    let finalZip = zip_code;
    if (!finalAddress || !finalCity || !finalState || !finalZip) {
      const addrResult = await pool.query(
        `SELECT
           COALESCE(hp.property_address, ua.address_line_1) AS address,
           COALESCE(hp.property_city,    ua.city)            AS city,
           COALESCE(hp.property_state,   ua.state)           AS state,
           COALESCE(hp.property_zip,     ua.zip_code)        AS zip_code
         FROM users u
         LEFT JOIN homeowner_profiles hp ON hp.user_id = u.id
         LEFT JOIN user_addresses     ua ON ua.user_id = u.id
         WHERE u.id = $1
         LIMIT 1`,
        [id]
      );
      const a = addrResult.rows[0] || {};
      finalAddress = finalAddress || a.address || null;
      finalCity    = finalCity    || a.city    || null;
      finalState   = finalState   || a.state   || null;
      finalZip     = finalZip     || a.zip_code || null;
    }

    const result = await pool.query(
      `INSERT INTO jobs (homeowner_user_id, title, description, category, room, severity, job_nature,
         affected_part, adjacent_impact, housewide_impact, address, city, state, zip_code,
         budget_min, budget_max, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, now() + interval '72 hours')
       RETURNING *`,
      [id, title, description, category, room, severity, job_nature,
       affected_part, adjacent_impact, housewide_impact, finalAddress, finalCity, finalState, finalZip,
       budget_min, budget_max]
    );

    const job = result.rows[0];
    await logAuditEvent(id, 'job.created', 'jobs', job.id, { category, severity }, req.ip);

    res.status(201).json(job);
  } catch (err) {
    console.error('Create job error:', err);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// GET /api/v1/jobs — List jobs (filtered by role)
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id, role } = req.user!;
  if (!id) { res.status(401).json({ error: 'User not found' }); return; }

  const { status, category, zip_code, limit = '20', offset = '0' } = req.query;

  try {
    let query: string;
    let params: any[];

    if (role === 'licensed_tradesperson' || role === 'unlicensed_tradesperson') {
      // Tradespeople see open jobs (job board)
      query = `SELECT j.*, u.full_name as customer_name,
                 (SELECT COUNT(*) FROM quotes q WHERE q.job_id = j.id) as quote_count
               FROM jobs j
               JOIN users u ON j.homeowner_user_id = u.id
               WHERE j.deleted_at IS NULL AND j.status = COALESCE($1, 'open')
                 ${category ? 'AND j.category = $5' : ''}
                 ${zip_code ? 'AND j.zip_code = $6' : ''}
               ORDER BY j.created_at DESC
               LIMIT $3 OFFSET $4`;
      params = [status || 'open', id, parseInt(limit as string), parseInt(offset as string)];
      if (category) params.push(category);
      if (zip_code) params.push(zip_code);
    } else {
      // Customers see their own jobs
      query = `SELECT j.*,
                 (SELECT COUNT(*) FROM quotes q WHERE q.job_id = j.id) as quote_count,
                 (SELECT u2.full_name FROM users u2 WHERE u2.id = j.assigned_tradesperson_id) as tradesperson_name
               FROM jobs j
               WHERE j.homeowner_user_id = $1 AND j.deleted_at IS NULL
                 ${status ? 'AND j.status = $5' : ''}
               ORDER BY j.created_at DESC
               LIMIT $3 OFFSET $4`;
      params = [id, null, parseInt(limit as string), parseInt(offset as string)];
      if (status) params.push(status);
    }

    const result = await pool.query(query, params);
    res.json({ jobs: result.rows, total: result.rowCount });
  } catch (err) {
    console.error('List jobs error:', err);
    res.status(500).json({ error: 'Failed to list jobs' });
  }
});

// GET /api/v1/jobs/:id — Get single job with quotes
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const jobResult = await pool.query('SELECT * FROM jobs WHERE id = $1 AND deleted_at IS NULL', [req.params.id]);
    if (jobResult.rows.length === 0) { res.status(404).json({ error: 'Job not found' }); return; }

    const job = jobResult.rows[0];

    const photosResult = await pool.query('SELECT * FROM job_photos WHERE job_id = $1 ORDER BY created_at', [job.id]);
    const quotesResult = await pool.query(
      `SELECT q.*, u.full_name as tradesperson_name, tp.rating, tp.jobs_completed
       FROM quotes q
       JOIN users u ON q.tradesperson_user_id = u.id
       LEFT JOIN tradesperson_profiles tp ON tp.user_id = u.id
       WHERE q.job_id = $1
       ORDER BY q.created_at DESC`,
      [job.id]
    );

    res.json({ ...job, photos: photosResult.rows, quotes: quotesResult.rows });
  } catch (err) {
    console.error('Get job error:', err);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// PATCH /api/v1/jobs/:id/status
// Updates job status. When status transitions to 'completed', automatically
// triggers the Stripe platform payout (10% fee retained, remainder transferred
// to the tradesperson's Connect account).
router.patch('/:id/status', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id: userId } = req.user!;
  const { id: jobId } = req.params;
  const { status } = req.body;

  const validStatuses = ['open','quoted','scheduled','en_route','in_progress','completed','cancelled','expired'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    return;
  }

  try {
    const jobResult = await pool.query(
      'SELECT * FROM jobs WHERE id = $1 AND deleted_at IS NULL',
      [jobId]
    );
    if (jobResult.rows.length === 0) { res.status(404).json({ error: 'Job not found' }); return; }

    const job = jobResult.rows[0];

    const updateResult = await pool.query(
      `UPDATE jobs SET status = $1, updated_at = now()
         ${status === 'completed' ? ', completed_at = now()' : ''}
       WHERE id = $2
       RETURNING *`,
      [status, jobId]
    );

    await logAuditEvent(userId!, 'job.status_changed', 'jobs', jobId, { from: job.status, to: status }, req.ip);

    // Auto-trigger payout when job completes
    if (status === 'completed' && job.status !== 'completed') {
      try {
        const paymentResult = await pool.query(
          `SELECT p.*, tp.stripe_account_id
           FROM payments p
           JOIN tradesperson_profiles tp ON tp.user_id = p.payee_user_id
           WHERE p.job_id = $1 AND p.status = 'processing'
           LIMIT 1`,
          [jobId]
        );

        const payment = paymentResult.rows[0];
        if (payment?.stripe_account_id && payment?.stripe_payment_intent_id) {
          const grossCents = Math.round(parseFloat(payment.amount) * 100);
          const feeCents   = Math.round(grossCents * PLATFORM_FEE_PERCENT);
          const payoutCents = grossCents - feeCents;

          const transfer = await stripe.transfers.create({
            amount:         payoutCents,
            currency:       'usd',
            destination:    payment.stripe_account_id,
            transfer_group: `job_${jobId}`,
            metadata:       { job_id: jobId, payment_intent_id: payment.stripe_payment_intent_id },
          });

          await pool.query(
            `UPDATE payments SET stripe_transfer_id = $1, status = 'completed', updated_at = now()
             WHERE id = $2`,
            [transfer.id, payment.id]
          );

          await pool.query(
            `UPDATE tradesperson_profiles SET jobs_completed = jobs_completed + 1, updated_at = now()
             WHERE user_id = $1`,
            [payment.payee_user_id]
          );
        }
      } catch (payoutErr) {
        // Non-fatal — log and continue. Payout can be retried manually via /stripe/platform-payout.
        console.error('Auto-payout failed for job', jobId, payoutErr);
      }
    }

    res.json(updateResult.rows[0]);
  } catch (err) {
    console.error('Update job status error:', err);
    res.status(500).json({ error: 'Failed to update job status' });
  }
});

export default router;
