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

export default router;
