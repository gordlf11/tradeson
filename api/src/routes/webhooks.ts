import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import pool from '../config/db';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// POST /api/v1/stripe/webhooks
// Raw body is required — this route must be registered BEFORE express.json() in index.ts
router.post('/', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    switch (event.type) {

      // Tradesperson Connect account updated — mark payout-enabled when onboarding complete
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        if (account.payouts_enabled) {
          await pool.query(
            `UPDATE tradesperson_profiles
             SET payout_enabled = TRUE, updated_at = now()
             WHERE stripe_account_id = $1`,
            [account.id]
          ).catch(err => console.error('account.updated DB update failed:', err));
          console.log(`Payout enabled for Connect account: ${account.id}`);
        }
        break;
      }

      // Platform-initiated payout transfer — log for internal records
      case 'transfer.created': {
        const transfer = event.data.object as Stripe.Transfer;
        console.log(
          `Transfer created: id=${transfer.id} amount=${transfer.amount} ` +
          `destination=${transfer.destination} group=${transfer.transfer_group}`
        );
        break;
      }

      // Customer disputed a charge (chargeback) — flag the tradesperson whose
      // payout this job funds, for admin review. Disputes are push-only (can't
      // be polled), so the nightly flagged-accounts sweep can't catch these.
      // Idempotent: skip if the user already has an unresolved dispute flag.
      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        const piId = typeof dispute.payment_intent === 'string'
          ? dispute.payment_intent
          : dispute.payment_intent?.id;

        if (!piId) {
          console.warn(`Dispute ${dispute.id}: no payment_intent to map to a user`);
          break;
        }

        // Map the disputed payment intent → the tradesperson on that job.
        const owner = await pool.query(
          `SELECT COALESCE(p.payee_user_id, j.assigned_tradesperson_id) AS user_id
           FROM jobs j
           LEFT JOIN payments p ON p.job_id = j.id
           WHERE j.stripe_payment_intent_id = $1 OR p.stripe_payment_intent_id = $1
           LIMIT 1`,
          [piId]
        );
        const userId = owner.rows[0]?.user_id;

        if (!userId) {
          console.warn(`Dispute ${dispute.id}: no matching job/payment for PI ${piId}`);
          break;
        }

        await pool.query(
          `INSERT INTO flagged_accounts (user_id, flag_reason, flag_type, severity)
           SELECT $1, $2, 'dispute', 'high'
           WHERE NOT EXISTS (
             SELECT 1 FROM flagged_accounts
             WHERE user_id = $1 AND flag_type = 'dispute' AND resolved_at IS NULL
           )`,
          [userId, `Stripe dispute ${dispute.id} (reason: ${dispute.reason}, amount: ${dispute.amount})`]
        ).catch(err => console.error('dispute flag insert failed:', err));

        console.log(`Dispute ${dispute.id} flagged user ${userId}`);
        break;
      }

      default:
        // Unhandled event type — safe to ignore
        break;
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error('Webhook handler error:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

export default router;
