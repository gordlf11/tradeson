// Internal routes — not behind Firebase auth. Each is gated by the shared
// `x-internal-secret` header and invoked by Cloud Scheduler / webhooks only:
//   POST /release-expired-holds        — every 30 min, captures expired holds
//   POST /populate-flagged-accounts    — nightly, flags expired docs + poor ratings
import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import pool from '../config/db';
import { logAuditEvent } from '../middleware/audit';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// POST /api/v1/internal/release-expired-holds
// Called by Cloud Scheduler every 30 minutes.
// Finds jobs stuck in pending_confirmation past auto_release_at and captures their holds.
// Protected by shared secret header — not tied to Firebase auth.
router.post('/release-expired-holds', async (req: Request, res: Response) => {
  const secret = req.headers['x-internal-secret'];
  if (!process.env.INTERNAL_SECRET || secret !== process.env.INTERNAL_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const expiredResult = await pool.query(`
      SELECT j.id,
             j.stripe_payment_intent_id,
             j.homeowner_user_id,
             j.assigned_tradesperson_id,
             p.id           AS payment_id,
             p.payee_user_id,
             p.stripe_payment_intent_id AS payment_pi_id
      FROM jobs j
      LEFT JOIN payments p ON p.job_id = j.id AND p.status = 'authorized'
      WHERE j.status = 'pending_confirmation'
        AND j.auto_release_at < now()
        AND j.deleted_at IS NULL
    `);

    const results: { jobId: string; result: string }[] = [];

    for (const job of expiredResult.rows) {
      try {
        const piId = job.payment_pi_id || job.stripe_payment_intent_id;

        if (piId) {
          await stripe.paymentIntents.capture(piId);
        }

        await pool.query(
          `UPDATE jobs SET status = 'completed', completed_at = now(), updated_at = now() WHERE id = $1`,
          [job.id]
        );

        if (job.payment_id) {
          await pool.query(
            `UPDATE payments SET status = 'completed', updated_at = now() WHERE id = $1`,
            [job.payment_id]
          );
        }

        if (job.payee_user_id || job.assigned_tradesperson_id) {
          await pool.query(
            `UPDATE tradesperson_profiles SET jobs_completed = jobs_completed + 1, updated_at = now()
             WHERE user_id = $1`,
            [job.payee_user_id || job.assigned_tradesperson_id]
          );
        }

        await logAuditEvent(
          'system', 'job.auto_released', 'jobs', job.id,
          { payment_intent_id: piId ?? null, auto_release: true }, 'cron'
        );

        results.push({ jobId: job.id, result: 'released' });
      } catch (err: any) {
        console.error(`Auto-release failed for job ${job.id}:`, err.message);
        results.push({ jobId: job.id, result: `error: ${err.message}` });
      }
    }

    console.log(`Auto-release sweep: ${results.length} job(s) processed`);
    res.json({ processed: results.length, results });
  } catch (err: any) {
    console.error('release-expired-holds error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/internal/populate-flagged-accounts
// Called by Cloud Scheduler nightly. Inserts flagged_accounts rows for the two
// conditions we can detect by polling:
//   1. expired_insurance — a tradesperson with any compliance document past its
//      expiration_date (license/insurance cert).
//   2. poor_reviews — a tradesperson whose 30-day average rating is below 2.5
//      (requires >= 2 reviews in the window so a single bad review can't flag).
// The third condition, 'dispute', is event-driven (Stripe charge.dispute.created
// webhook in webhooks.ts) — disputes can't be polled.
//
// Both inserts are idempotent: a NOT EXISTS guard skips users who already have an
// UNRESOLVED flag of the same type, so re-running nightly never duplicates.
// Protected by the same shared secret header as the release sweep.
router.post('/populate-flagged-accounts', async (req: Request, res: Response) => {
  const secret = req.headers['x-internal-secret'];
  if (!process.env.INTERNAL_SECRET || secret !== process.env.INTERNAL_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    // 1. Expired compliance / insurance documents → high severity.
    //    DISTINCT ON collapses multiple expired docs for one user into a single flag.
    const expired = await pool.query(`
      INSERT INTO flagged_accounts (user_id, flag_reason, flag_type, severity)
      SELECT DISTINCT ON (tp.user_id)
             tp.user_id,
             'Compliance/insurance document expired on ' || cd.expiration_date::text,
             'expired_insurance',
             'high'
      FROM compliance_documents cd
      JOIN tradesperson_profiles tp ON tp.id = cd.tradesperson_profile_id
      JOIN users u ON u.id = tp.user_id
      WHERE cd.expiration_date < now()
        AND u.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM flagged_accounts fa
          WHERE fa.user_id = tp.user_id
            AND fa.flag_type = 'expired_insurance'
            AND fa.resolved_at IS NULL
        )
      ORDER BY tp.user_id, cd.expiration_date ASC
      RETURNING id
    `);

    // 2. Poor 30-day average rating (< 2.5 over >= 2 reviews) → medium severity.
    const poor = await pool.query(`
      INSERT INTO flagged_accounts (user_id, flag_reason, flag_type, severity)
      SELECT r.reviewee_id,
             'Low 30-day rating: ' || ROUND(AVG(r.rating), 1)::text
               || ' avg over ' || COUNT(*)::text || ' reviews',
             'poor_reviews',
             'medium'
      FROM reviews r
      JOIN users u ON u.id = r.reviewee_id
      WHERE r.created_at >= now() - interval '30 days'
        AND u.deleted_at IS NULL
      GROUP BY r.reviewee_id
      HAVING AVG(r.rating) < 2.5
         AND COUNT(*) >= 2
         AND NOT EXISTS (
           SELECT 1 FROM flagged_accounts fa
           WHERE fa.user_id = r.reviewee_id
             AND fa.flag_type = 'poor_reviews'
             AND fa.resolved_at IS NULL
         )
      RETURNING id
    `);

    const summary = {
      expired_insurance: expired.rowCount ?? 0,
      poor_reviews: poor.rowCount ?? 0,
    };
    console.log('Flagged-account sweep:', JSON.stringify(summary));
    res.json({ flagged: summary });
  } catch (err: any) {
    console.error('populate-flagged-accounts error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
