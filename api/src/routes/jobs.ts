import { Router } from 'express';
import pool from '../config/db';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { logAuditEvent } from '../middleware/audit';

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

export default router;
