import { Router } from 'express';
import pool from '../config/db';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { logAuditEvent } from '../middleware/audit';

const router = Router();

const APP_URL = process.env.APP_URL || 'http://localhost:5173';

function generateReferralCode(): string {
  return 'REA' + Math.random().toString(36).slice(2, 9).toUpperCase();
}

// GET /api/v1/realtor/dashboard
// Returns everything the broker command center needs in one call.
router.get('/dashboard', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

  try {
    // 1. Realtor profile — create referral code if missing
    const profileResult = await pool.query(
      `SELECT rp.id, rp.referral_code, rp.brokerage_name, rp.license_number,
              u.full_name, u.email
       FROM realtor_profiles rp
       JOIN users u ON u.id = rp.user_id
       WHERE rp.user_id = $1`,
      [userId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Realtor profile not found' });
    }

    let profile = profileResult.rows[0];

    if (!profile.referral_code) {
      let code = generateReferralCode();
      // Retry on collision (extremely unlikely)
      for (let i = 0; i < 5; i++) {
        try {
          await pool.query(
            'UPDATE realtor_profiles SET referral_code = $1 WHERE id = $2',
            [code, profile.id]
          );
          profile.referral_code = code;
          break;
        } catch {
          code = generateReferralCode();
        }
      }
    }

    const realtorProfileId = profile.id;

    // 2. Clients linked to this realtor
    const clientsResult = await pool.query(
      `SELECT rc.id, rc.client_email, rc.invited_at, rc.accepted_at, rc.client_user_id,
              u.full_name, u.id as user_id,
              hp.property_address, hp.property_city, hp.property_state, hp.property_zip
       FROM realtor_clients rc
       LEFT JOIN users u ON u.id = rc.client_user_id
       LEFT JOIN homeowner_profiles hp ON hp.user_id = rc.client_user_id
       WHERE rc.realtor_profile_id = $1
       ORDER BY rc.invited_at DESC`,
      [realtorProfileId]
    );

    const clients = clientsResult.rows;
    const activeClientIds = clients
      .filter(c => c.client_user_id)
      .map(c => c.client_user_id);

    // 3. Count homeowners who signed up via referral link directly
    const referralSignupsResult = await pool.query(
      'SELECT COUNT(*) FROM users WHERE referred_by_realtor_id = $1',
      [realtorProfileId]
    );
    const referralSignupCount = parseInt(referralSignupsResult.rows[0].count) || 0;

    // 4. Jobs across all linked clients
    let jobs: any[] = [];
    let costByCategory: any[] = [];

    if (activeClientIds.length > 0) {
      const jobsResult = await pool.query(
        `SELECT j.id, j.title, j.category, j.status, j.created_at,
                j.address, j.city, j.state, j.zip_code,
                j.homeowner_user_id,
                u.full_name AS client_name,
                tp_user.full_name AS tradesperson_name,
                p.amount, p.status AS payment_status
         FROM jobs j
         JOIN users u ON u.id = j.homeowner_user_id
         LEFT JOIN users tp_user ON tp_user.id = j.assigned_tradesperson_id
         LEFT JOIN payments p ON p.job_id = j.id
         WHERE j.homeowner_user_id = ANY($1) AND j.deleted_at IS NULL
         ORDER BY j.created_at DESC
         LIMIT 200`,
        [activeClientIds]
      );
      jobs = jobsResult.rows;

      const costResult = await pool.query(
        `SELECT j.category,
                COUNT(j.id)::int AS job_count,
                ROUND(AVG(p.amount)::numeric, 2) AS avg_cost,
                ROUND(SUM(p.amount)::numeric, 2) AS total_cost
         FROM jobs j
         JOIN payments p ON p.job_id = j.id AND p.status = 'completed'
         WHERE j.homeowner_user_id = ANY($1) AND j.deleted_at IS NULL
           AND j.category IS NOT NULL
         GROUP BY j.category
         ORDER BY total_cost DESC`,
        [activeClientIds]
      );
      costByCategory = costResult.rows;
    }

    // 5. Trusted tradesperson favorites
    const favResult = await pool.query(
      `SELECT rf.tradesperson_user_id, rf.trade_category, rf.note, rf.created_at,
              u.full_name, tp.rating, tp.jobs_completed, tp.primary_trades,
              tp.business_name, tp.service_city, tp.service_state
       FROM realtor_favorites rf
       JOIN users u ON u.id = rf.tradesperson_user_id
       LEFT JOIN tradesperson_profiles tp ON tp.user_id = rf.tradesperson_user_id
       WHERE rf.realtor_profile_id = $1
       ORDER BY rf.created_at DESC`,
      [realtorProfileId]
    );

    // 6. Group jobs by property address for the properties view
    const propertyMap: Record<string, any> = {};
    for (const job of jobs) {
      const key = `${job.address}||${job.city}`;
      if (!propertyMap[key]) {
        propertyMap[key] = {
          address: job.address || 'Address not specified',
          city: job.city || '',
          state: job.state || '',
          zip_code: job.zip_code || '',
          client_name: job.client_name,
          homeowner_user_id: job.homeowner_user_id,
          jobs: [],
          total_spend: 0,
          open_jobs: 0,
        };
      }
      const amount = parseFloat(job.amount) || 0;
      propertyMap[key].jobs.push({
        id: job.id,
        title: job.title,
        category: job.category,
        status: job.status,
        tradesperson_name: job.tradesperson_name,
        amount,
        payment_status: job.payment_status,
        created_at: job.created_at,
      });
      if (job.payment_status === 'completed') {
        propertyMap[key].total_spend += amount;
      }
      if (['open', 'quoted', 'scheduled', 'en_route', 'in_progress'].includes(job.status)) {
        propertyMap[key].open_jobs += 1;
      }
    }
    const properties = Object.values(propertyMap);

    // 7. Summary stats
    const totalSpend = jobs.reduce((sum, j) => {
      return j.payment_status === 'completed' ? sum + (parseFloat(j.amount) || 0) : sum;
    }, 0);

    const summary = {
      total_clients: clients.length,
      active_clients: activeClientIds.length,
      referral_signups: referralSignupCount,
      total_jobs: jobs.length,
      open_jobs: jobs.filter(j => ['open', 'quoted', 'scheduled', 'en_route', 'in_progress'].includes(j.status)).length,
      completed_jobs: jobs.filter(j => j.status === 'completed').length,
      active_properties: properties.filter((p: any) => p.open_jobs > 0).length,
      total_properties: properties.length,
      total_spend: Math.round(totalSpend * 100) / 100,
    };

    res.json({
      profile: {
        full_name: profile.full_name,
        brokerage_name: profile.brokerage_name,
        referral_code: profile.referral_code,
        referral_url: `${APP_URL}/join?ref=${profile.referral_code}`,
      },
      summary,
      clients: clients.map(c => ({
        id: c.id,
        client_email: c.client_email,
        full_name: c.full_name || null,
        user_id: c.client_user_id || null,
        invited_at: c.invited_at,
        accepted_at: c.accepted_at,
        property_address: c.property_address,
        property_city: c.property_city,
        property_state: c.property_state,
      })),
      properties,
      cost_by_category: costByCategory,
      favorites: favResult.rows,
    });
  } catch (err: any) {
    console.error('Realtor dashboard error:', err);
    res.status(500).json({ error: 'Failed to load broker dashboard' });
  }
});

// POST /api/v1/realtor/favorites
// Add a tradesperson to this realtor's trusted list
router.post('/favorites', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { tradesperson_user_id, trade_category, note } = req.body;

  if (!tradesperson_user_id) {
    return res.status(400).json({ error: 'tradesperson_user_id is required' });
  }

  try {
    const profileResult = await pool.query(
      'SELECT id FROM realtor_profiles WHERE user_id = $1',
      [userId]
    );
    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Realtor profile not found' });
    }
    const realtorProfileId = profileResult.rows[0].id;

    await pool.query(
      `INSERT INTO realtor_favorites (realtor_profile_id, tradesperson_user_id, trade_category, note)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (realtor_profile_id, tradesperson_user_id) DO UPDATE
         SET trade_category = EXCLUDED.trade_category,
             note = EXCLUDED.note`,
      [realtorProfileId, tradesperson_user_id, trade_category || null, note || null]
    );

    await logAuditEvent(userId!, 'realtor.favorite_added', 'realtor_favorites', realtorProfileId, { tradesperson_user_id }, req.ip);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Add favorite error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/v1/realtor/favorites/:tradespersonUserId
router.delete('/favorites/:tradespersonUserId', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { tradespersonUserId } = req.params;

  try {
    const profileResult = await pool.query(
      'SELECT id FROM realtor_profiles WHERE user_id = $1',
      [userId]
    );
    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Realtor profile not found' });
    }
    const realtorProfileId = profileResult.rows[0].id;

    await pool.query(
      'DELETE FROM realtor_favorites WHERE realtor_profile_id = $1 AND tradesperson_user_id = $2',
      [realtorProfileId, tradespersonUserId]
    );

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/realtor/tradespeople-used
// Returns tradespeople who worked on jobs for this realtor's clients.
// Used to populate the "Add Favorite" picker.
router.get('/tradespeople-used', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;

  try {
    const profileResult = await pool.query(
      'SELECT id FROM realtor_profiles WHERE user_id = $1',
      [userId]
    );
    if (profileResult.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });
    const realtorProfileId = profileResult.rows[0].id;

    const result = await pool.query(
      `SELECT DISTINCT ON (tp_user.id)
              tp_user.id, tp_user.full_name,
              tp.rating, tp.jobs_completed, tp.primary_trades, tp.business_name
       FROM realtor_clients rc
       JOIN jobs j ON j.homeowner_user_id = rc.client_user_id
       JOIN users tp_user ON tp_user.id = j.assigned_tradesperson_id
       LEFT JOIN tradesperson_profiles tp ON tp.user_id = tp_user.id
       LEFT JOIN realtor_favorites rf ON rf.realtor_profile_id = $1
         AND rf.tradesperson_user_id = tp_user.id
       WHERE rc.realtor_profile_id = $1
         AND j.assigned_tradesperson_id IS NOT NULL
         AND j.deleted_at IS NULL
         AND rf.id IS NULL  -- exclude already-favorited
       ORDER BY tp_user.id, j.created_at DESC
       LIMIT 20`,
      [realtorProfileId]
    );

    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
