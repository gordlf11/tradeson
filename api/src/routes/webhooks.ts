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

      // Subscription purchased — activate user's role and record subscription IDs
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { userId, role } = session.metadata || {};
        if (userId && session.subscription) {
          await pool.query(
            `UPDATE users
             SET subscription_id = $1, subscription_status = 'active', role = $2, updated_at = now()
             WHERE id = $3`,
            [session.subscription as string, role, userId]
          ).catch(err => console.error('checkout.session.completed DB update failed:', err));
        }
        console.log(`Subscription activated: user=${userId} role=${role}`);
        break;
      }

      // Subscription cancelled — deactivate user access
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await pool.query(
          `UPDATE users
           SET subscription_status = 'cancelled', updated_at = now()
           WHERE stripe_customer_id = $1`,
          [sub.customer as string]
        ).catch(err => console.error('customer.subscription.deleted DB update failed:', err));
        console.log(`Subscription cancelled: customer=${sub.customer}`);
        break;
      }

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
