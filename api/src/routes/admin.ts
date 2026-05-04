import { Router } from 'express';
import pool from '../config/db';
import { AuthenticatedRequest, requireAuth, requireAdmin } from '../middleware/auth';
import { logAuditEvent } from '../middleware/audit';

const router = Router();

// All admin routes require auth + admin role
router.use(requireAuth, requireAdmin);

// ─── GET /api/v1/admin/compliance ───────────────────────────────────────────
// Returns all tradesperson profiles with user info + document status.
// Frontend maps this to ComplianceSubmission[].
router.get('/compliance', async (_req: AuthenticatedRequest, res) => {
  try {
    const result = await pool.query(`
      SELECT
        tp.id,
        u.full_name        AS tradesperson_name,
        u.email,
        tp.primary_trades[1] AS trade_type,
        tp.compliance_status AS status,
        tp.compliance_admin_note AS admin_note,
        tp.created_at      AS submitted_at,
        tp.id_document_url IS NOT NULL    AS has_gov_id,
        tp.insurance_doc_url IS NOT NULL  AS has_insurance_doc,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'licenseNumber',  cd.license_number,
            'licenseType',    cd.license_type,
            'expirationDate', cd.expiration_date,
            'documentUrl',    cd.document_url,
            'status',         cd.verification_status
          ) ORDER BY cd.created_at DESC)
          FROM compliance_documents cd
          WHERE cd.tradesperson_profile_id = tp.id),
          '[]'::json
        ) AS licenses
      FROM tradesperson_profiles tp
      JOIN users u ON u.id = tp.user_id
      WHERE u.deleted_at IS NULL
      ORDER BY tp.created_at DESC
    `);

    const submissions = result.rows.map(row => {
      const firstLicense = (row.licenses && row.licenses[0]) || {};
      return {
        id:               row.id,
        tradespersonName: row.tradesperson_name,
        email:            row.email,
        tradeType:        row.trade_type ?? 'Tradesperson',
        submittedAt:      row.submitted_at,
        licenseNumber:    firstLicense.licenseNumber ?? '',
        licenseState:     '',                          // not stored; populate if added to schema
        licenseExpiry:    firstLicense.expirationDate ?? '',
        insuranceCoverage: '',                         // not stored; populate if added to schema
        insuranceExpiry:  '',                          // not stored; populate if added to schema
        hasGovId:         row.has_gov_id,
        hasLicenseDoc:    Array.isArray(row.licenses) && row.licenses.length > 0,
        hasInsuranceDoc:  row.has_insurance_doc,
        status:           row.status ?? 'pending',
        adminNote:        row.admin_note ?? '',
      };
    });

    res.json(submissions);
  } catch (err) {
    console.error('Admin compliance list error:', err);
    res.status(500).json({ error: 'Failed to fetch compliance submissions' });
  }
});

// ─── POST /api/v1/admin/compliance/:id/decision ─────────────────────────────
// :id = tradesperson_profiles.id
// Body: { decision: 'approved' | 'rejected' | 'more_docs', admin_note?: string }
router.post('/compliance/:id/decision', async (req: AuthenticatedRequest, res) => {
  const id = String(req.params.id);
  const { decision, admin_note } = req.body;

  if (!['approved', 'rejected', 'more_docs'].includes(decision)) {
    res.status(400).json({ error: 'decision must be approved, rejected, or more_docs' });
    return;
  }

  try {
    await pool.query(
      `UPDATE tradesperson_profiles SET
        compliance_status      = $1,
        compliance_admin_note  = $2,
        compliance_reviewed_at = now(),
        compliance_reviewed_by = $3,
        updated_at             = now()
       WHERE id = $4`,
      [decision, admin_note ?? null, req.user!.id, id]
    );

    if (decision === 'approved') {
      await pool.query(
        `UPDATE users SET is_verified = true, updated_at = now()
         WHERE id = (SELECT user_id FROM tradesperson_profiles WHERE id = $1)`,
        [id]
      );
      await pool.query(
        `UPDATE compliance_documents SET
          verification_status = 'approved',
          verified_at = now(),
          verified_by = $1,
          updated_at  = now()
         WHERE tradesperson_profile_id = $2 AND verification_status = 'pending'`,
        [req.user!.id, id]
      );
    } else if (decision === 'rejected') {
      await pool.query(
        `UPDATE users SET is_active = false, updated_at = now()
         WHERE id = (SELECT user_id FROM tradesperson_profiles WHERE id = $1)`,
        [id]
      );
    }

    await logAuditEvent(
      req.user!.id,
      `compliance.${decision}`,
      'tradesperson_profiles',
      id,
      { admin_note, decision },
      req.ip
    );

    res.json({ id, decision, admin_note });
  } catch (err) {
    console.error('Compliance decision error:', err);
    res.status(500).json({ error: 'Failed to save compliance decision' });
  }
});

// ─── GET /api/v1/admin/flagged-accounts ─────────────────────────────────────
// Returns all unresolved flagged accounts with user info.
router.get('/flagged-accounts', async (_req: AuthenticatedRequest, res) => {
  try {
    const result = await pool.query(`
      SELECT
        fa.id,
        u.full_name   AS name,
        u.email,
        u.role,
        fa.flag_reason,
        fa.flag_type,
        fa.severity,
        fa.created_at  AS flagged_at,
        COALESCE(
          (SELECT ROUND(AVG(r.rating), 1)
           FROM reviews r WHERE r.reviewee_id = fa.user_id),
          NULL
        ) AS avg_rating,
        (SELECT COUNT(*) FROM reviews r WHERE r.reviewee_id = fa.user_id) AS review_count
      FROM flagged_accounts fa
      JOIN users u ON u.id = fa.user_id
      WHERE fa.resolved_at IS NULL
        AND u.deleted_at   IS NULL
      ORDER BY
        CASE fa.severity WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        fa.created_at DESC
    `);

    const accounts = result.rows.map(row => ({
      id:          row.id,
      name:        row.name,
      email:       row.email,
      role:        row.role,
      flagReason:  row.flag_reason,
      flagType:    row.flag_type,
      severity:    row.severity,
      flaggedAt:   row.flagged_at,
      avgRating:   row.avg_rating ? parseFloat(row.avg_rating) : undefined,
      reviewCount: parseInt(row.review_count, 10) || undefined,
    }));

    res.json(accounts);
  } catch (err) {
    console.error('Flagged accounts error:', err);
    res.status(500).json({ error: 'Failed to fetch flagged accounts' });
  }
});

// ─── POST /api/v1/admin/resolutions ─────────────────────────────────────────
// Body: { user_id, action_type, reason, suspend_until? }
// action_type: 'warning' | 'suspension' | 'deactivation' | 'explanation_request'
router.post('/resolutions', async (req: AuthenticatedRequest, res) => {
  const { user_id, action_type, reason, suspend_until } = req.body;

  if (!user_id || !action_type || !reason) {
    res.status(400).json({ error: 'user_id, action_type, and reason are required' });
    return;
  }

  const validActions = ['warning', 'suspension', 'deactivation', 'explanation_request'];
  if (!validActions.includes(action_type)) {
    res.status(400).json({ error: `action_type must be one of: ${validActions.join(', ')}` });
    return;
  }

  try {
    const resResult = await pool.query(
      `INSERT INTO admin_resolutions (admin_user_id, target_user_id, action_type, reason, suspend_until)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [req.user!.id, user_id, action_type, reason, suspend_until ?? null]
    );

    if (action_type === 'deactivation') {
      await pool.query(
        `UPDATE users SET is_active = false, updated_at = now() WHERE id = $1`,
        [user_id]
      );
    } else if (action_type === 'suspension' && suspend_until) {
      // MVP: deactivate now; reinstatement on suspend_until handled by a future scheduled job.
      await pool.query(
        `UPDATE users SET is_active = false, updated_at = now() WHERE id = $1`,
        [user_id]
      );
    }

    await pool.query(
      `UPDATE flagged_accounts SET resolved_at = now()
       WHERE user_id = $1 AND resolved_at IS NULL`,
      [user_id]
    );

    await logAuditEvent(
      req.user!.id,
      `resolution.${action_type}`,
      'users',
      user_id,
      { reason, suspend_until, resolution_id: resResult.rows[0].id },
      req.ip
    );

    res.json({ id: resResult.rows[0].id, user_id, action_type });
  } catch (err) {
    console.error('Resolution error:', err);
    res.status(500).json({ error: 'Failed to apply resolution' });
  }
});

// ─── GET /api/v1/admin/metrics ──────────────────────────────────────────────
// Aggregate counts from Postgres. Shape matches the frontend platformMetrics object.
router.get('/metrics', async (_req: AuthenticatedRequest, res) => {
  try {
    const [usersResult, jobsResult, revenueResult, mauResult, funnelResult] = await Promise.all([
      pool.query(`
        SELECT role, COUNT(*) AS count
        FROM users
        WHERE deleted_at IS NULL AND is_active = true
        GROUP BY role
      `),
      pool.query(`
        SELECT status, COUNT(*) AS count
        FROM jobs
        WHERE deleted_at IS NULL
        GROUP BY status
      `),
      pool.query(`
        SELECT
          COALESCE(SUM(amount), 0)       AS gross,
          COALESCE(SUM(net_payout), 0)   AS net,
          COALESCE(SUM(platform_fee), 0) AS platform_fee
        FROM payments
        WHERE status = 'completed'
          AND created_at >= date_trunc('year', now())
      `),
      // MAU proxy: users updated in last 30 days. Replace with an event table once one exists.
      pool.query(`
        SELECT COUNT(DISTINCT u.id) AS total
        FROM users u
        WHERE u.deleted_at IS NULL
          AND u.updated_at >= now() - INTERVAL '30 days'
      `),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE role IN ('homeowner','property_manager','realtor')) AS customer_signups,
          COUNT(*) FILTER (WHERE role IN ('homeowner','property_manager','realtor') AND is_verified = true) AS customer_onboarded,
          (SELECT COUNT(DISTINCT homeowner_user_id) FROM jobs WHERE deleted_at IS NULL) AS customers_with_jobs,
          COUNT(*) FILTER (WHERE role IN ('licensed_tradesperson','unlicensed_tradesperson')) AS trade_signups,
          COUNT(*) FILTER (WHERE role IN ('licensed_tradesperson','unlicensed_tradesperson') AND is_verified = true) AS trade_verified,
          (SELECT COUNT(DISTINCT tradesperson_user_id) FROM quotes) AS trades_with_bids,
          (SELECT COUNT(DISTINCT assigned_tradesperson_id) FROM jobs WHERE status IN ('completed','in_progress') AND assigned_tradesperson_id IS NOT NULL) AS trades_with_jobs
        FROM users
        WHERE deleted_at IS NULL
      `),
    ]);

    const userCounts: Record<string, number> = Object.fromEntries(
      usersResult.rows.map(r => [r.role, parseInt(r.count, 10)])
    );
    const jobCounts: Record<string, number> = Object.fromEntries(
      jobsResult.rows.map(r => [r.status, parseInt(r.count, 10)])
    );
    const rev = revenueResult.rows[0];
    const f = funnelResult.rows[0];
    const totalUsers = Object.values(userCounts).reduce((s, v) => s + v, 0);

    const metrics = {
      users: {
        homeowners:       userCounts.homeowner ?? 0,
        propertyManagers: userCounts.property_manager ?? 0,
        realtors:         userCounts.realtor ?? 0,
        tradespersons:    (userCounts.licensed_tradesperson ?? 0) + (userCounts.unlicensed_tradesperson ?? 0),
        total:            totalUsers,
      },
      mau: {
        total:         parseInt(mauResult.rows[0].total, 10) || 0,
        homeowners:    userCounts.homeowner ?? 0,   // approximation until event tracking is live
        tradespersons: (userCounts.licensed_tradesperson ?? 0) + (userCounts.unlicensed_tradesperson ?? 0),
        others:        (userCounts.property_manager ?? 0) + (userCounts.realtor ?? 0),
      },
      jobs: {
        open:       jobCounts.open ?? 0,
        inProgress: (jobCounts.in_progress ?? 0) + (jobCounts.scheduled ?? 0) + (jobCounts.en_route ?? 0),
        completed:  jobCounts.completed ?? 0,
      },
      revenue: {
        gross:       parseFloat(rev.gross),
        net:         parseFloat(rev.net),
        platformFee: parseFloat(rev.platform_fee),
        opex:        0, // not tracked in PG; fill in manually or from accounting system
      },
      funnel: {
        customer: {
          visits:    0,                                // not tracked in PG; comes from GA4
          signups:   parseInt(f.customer_signups, 10),
          onboarded: parseInt(f.customer_onboarded, 10),
          firstJob:  parseInt(f.customers_with_jobs, 10),
        },
        tradesperson: {
          signups:     parseInt(f.trade_signups, 10),
          verified:    parseInt(f.trade_verified, 10),
          firstBid:    parseInt(f.trades_with_bids, 10),
          firstJobWon: parseInt(f.trades_with_jobs, 10),
        },
      },
      supplyDemand: [],     // requires geo aggregation — leave empty for now
      activationRate: totalUsers > 0
        ? Math.round((parseInt(f.customers_with_jobs, 10) / totalUsers) * 100) / 100
        : 0,
    };

    res.json(metrics);
  } catch (err) {
    console.error('Metrics error:', err);
    res.status(500).json({ error: 'Failed to fetch platform metrics' });
  }
});

export default router;
