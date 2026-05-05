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

  const validStatuses = ['open','quoted','scheduled','en_route','in_progress','pending_confirmation','completed','cancelled','expired'];
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

    const setPendingConfirmation = status === 'pending_confirmation' && job.status !== 'pending_confirmation';
    const setCompleted = status === 'completed' && job.status !== 'completed';

    const updateResult = await pool.query(
      `UPDATE jobs SET status = $1, updated_at = now()
         ${setCompleted ? ', completed_at = now()' : ''}
         ${setPendingConfirmation ? ', auto_release_at = now() + interval \'3 hours\'' : ''}
       WHERE id = $2
       RETURNING *`,
      [status, jobId]
    );

    await logAuditEvent(userId!, 'job.status_changed', 'jobs', jobId, { from: job.status, to: status }, req.ip);

    // When tradesperson marks done and there is NO pre-auth hold (legacy jobs or
    // tradesperson without Stripe Connect), fall back to immediate transfer on 'completed'.
    if (setCompleted && !job.stripe_payment_intent_id) {
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
          const grossCents  = Math.round(parseFloat(payment.amount) * 100);
          const feeCents    = Math.round(grossCents * PLATFORM_FEE_PERCENT);
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
        console.error('Auto-payout (legacy) failed for job', jobId, payoutErr);
      }
    }

    res.json(updateResult.rows[0]);
  } catch (err) {
    console.error('Update job status error:', err);
    res.status(500).json({ error: 'Failed to update job status' });
  }
});

// POST /api/v1/jobs/:id/confirm-complete
// Called by the job poster to confirm completion and capture the pre-auth hold.
// Also handles auto-release: if auto_release_at has passed, any caller (or a cron) can trigger.
router.post('/:id/confirm-complete', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id: userId, role } = req.user!;
  const { id: jobId } = req.params;

  try {
    const jobResult = await pool.query(
      `SELECT j.*,
              p.id           AS payment_id,
              p.payee_user_id,
              p.stripe_payment_intent_id AS payment_pi_id
       FROM jobs j
       LEFT JOIN payments p ON p.job_id = j.id AND p.status = 'authorized'
       WHERE j.id = $1 AND j.deleted_at IS NULL`,
      [jobId]
    );
    if (jobResult.rows.length === 0) return res.status(404).json({ error: 'Job not found' });
    const job = jobResult.rows[0];

    // Only the job poster or an admin can confirm; auto-release cron passes ?auto=1
    const isAutoRelease = req.query.auto === '1';
    const canConfirm = job.homeowner_user_id === userId || role === 'admin' || isAutoRelease;
    if (!canConfirm) {
      return res.status(403).json({ error: 'Only the job poster can confirm completion' });
    }

    if (job.status !== 'pending_confirmation') {
      return res.status(400).json({ error: `Job is not awaiting confirmation (status: ${job.status})` });
    }

    const piId = job.payment_pi_id || job.stripe_payment_intent_id;

    if (!piId) {
      // No pre-auth — mark complete without a capture (will need manual payout)
      await pool.query(
        `UPDATE jobs SET status = 'completed', completed_at = now(), updated_at = now() WHERE id = $1`,
        [jobId]
      );
      await logAuditEvent(userId!, 'job.confirmed_complete', 'jobs', jobId, { captured: false }, req.ip);
      return res.json({ success: true, captured: false, message: 'Job marked complete — no payment hold to capture' });
    }

    // Capture the hold — this charges the job poster and routes to tradesperson via transfer_data
    const captured = await stripe.paymentIntents.capture(piId);

    await pool.query(
      `UPDATE jobs SET status = 'completed', completed_at = now(), updated_at = now() WHERE id = $1`,
      [jobId]
    );

    if (job.payment_id) {
      await pool.query(
        `UPDATE payments SET status = 'completed', updated_at = now() WHERE id = $1`,
        [job.payment_id]
      );
    }

    if (job.payee_user_id) {
      await pool.query(
        `UPDATE tradesperson_profiles SET jobs_completed = jobs_completed + 1, updated_at = now()
         WHERE user_id = $1`,
        [job.payee_user_id]
      );
    }

    await logAuditEvent(
      userId!, 'job.payment_captured', 'jobs', jobId,
      { payment_intent_id: piId, amount_received: captured.amount_received }, req.ip
    );

    res.json({
      success: true,
      captured: true,
      payment_intent_id: captured.id,
      amount_received: captured.amount_received,
    });
  } catch (err: any) {
    console.error('confirm-complete error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
