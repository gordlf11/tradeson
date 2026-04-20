import { Router } from 'express';
import Stripe from 'stripe';
import pool from '../config/db';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Platform collects 10% fee on each completed job payment
const PLATFORM_FEE_PERCENT = parseFloat(process.env.PLATFORM_FEE_PERCENT || '0.10');
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

// POST /api/v1/stripe/create-connect-account
// Creates a Stripe Express Connect account for a tradesperson and returns an onboarding URL
router.post('/create-connect-account', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    const profileResult = await pool.query(
      'SELECT id, stripe_account_id, payout_enabled FROM tradesperson_profiles WHERE user_id = $1',
      [userId]
    );
    const profile = profileResult.rows[0];
    if (!profile) return res.status(404).json({ error: 'Tradesperson profile not found' });

    let accountId: string = profile.stripe_account_id;

    if (!accountId) {
      const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
      const account = await stripe.accounts.create({
        type: 'express',
        email: userResult.rows[0]?.email,
        metadata: { userId },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      accountId = account.id;
      await pool.query(
        'UPDATE tradesperson_profiles SET stripe_account_id = $1, updated_at = now() WHERE user_id = $2',
        [accountId, userId]
      );
    }

    // Create onboarding link (valid for 5 minutes)
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${APP_URL}/onboarding/connect-refresh`,
      return_url: `${APP_URL}/onboarding/connect-return`,
      type: 'account_onboarding',
    });

    res.json({ onboarding_url: accountLink.url, account_id: accountId });
  } catch (err: any) {
    console.error('create-connect-account error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/stripe/create-setup-intent
// Creates a Stripe SetupIntent so job posters can save a card for future job payments.
// Idempotently creates a Stripe Customer and links stripe_customer_id to the user row.
// Degrades gracefully if DB is unavailable — creates an anonymous SetupIntent.
router.post('/create-setup-intent', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    let customerId: string | undefined;

    try {
      const result = await pool.query('SELECT email, stripe_customer_id FROM users WHERE id = $1', [userId]);
      const user = result.rows[0];
      if (user) {
        if (user.stripe_customer_id) {
          customerId = user.stripe_customer_id;
        } else {
          const customer = await stripe.customers.create({
            email: user.email,
            metadata: { userId },
          });
          customerId = customer.id;
          await pool.query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customerId, userId]);
        }
      }
    } catch (dbErr) {
      // DB unavailable — create anonymous SetupIntent; customer linked on next login
      console.warn('DB unavailable for create-setup-intent, proceeding without customer');
    }

    const setupIntent = await stripe.setupIntents.create({
      ...(customerId ? { customer: customerId } : {}),
      payment_method_types: ['card'],
    });

    res.json({ client_secret: setupIntent.client_secret });
  } catch (err: any) {
    console.error('create-setup-intent error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/stripe/connect-status
router.get('/connect-status', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const profileResult = await pool.query(
      'SELECT stripe_account_id, payout_enabled FROM tradesperson_profiles WHERE user_id = $1',
      [userId]
    );
    const profile = profileResult.rows[0];
    if (!profile) return res.status(404).json({ error: 'Not found' });

    res.json({
      account_id: profile.stripe_account_id || null,
      payout_enabled: profile.payout_enabled || false,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/stripe/platform-payout
// Platform collected full payment; transfers tradesperson share minus platform fee
// Fee percent configurable via PLATFORM_FEE_PERCENT env var
router.post('/platform-payout', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { job_id, payment_intent_id, tradesperson_user_id, gross_amount_cents } = req.body;

    const profileResult = await pool.query(
      'SELECT stripe_account_id FROM tradesperson_profiles WHERE user_id = $1',
      [tradesperson_user_id]
    );
    const profile = profileResult.rows[0];
    if (!profile?.stripe_account_id) {
      return res.status(400).json({ error: 'Tradesperson has no connected Stripe account' });
    }

    const platformFeeCents = Math.round(gross_amount_cents * PLATFORM_FEE_PERCENT);
    const payoutCents = gross_amount_cents - platformFeeCents;

    const transfer = await stripe.transfers.create({
      amount: payoutCents,
      currency: 'usd',
      destination: profile.stripe_account_id,
      transfer_group: `job_${job_id}`,
      metadata: { job_id, payment_intent_id },
    });

    await pool.query(
      `UPDATE payments SET stripe_transfer_id = $1, status = 'completed', updated_at = now()
       WHERE stripe_payment_intent_id = $2`,
      [transfer.id, payment_intent_id]
    ).catch(() => {/* non-fatal if payment row doesn't exist yet */});

    res.json({
      transfer_id: transfer.id,
      payout_cents: payoutCents,
      fee_cents: platformFeeCents,
      fee_percent: PLATFORM_FEE_PERCENT,
    });
  } catch (err: any) {
    console.error('platform-payout error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/stripe/direct-charge
// Customer pays tradesperson directly on their Connect account; platform collects application_fee_amount
router.post('/direct-charge', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { amount_cents, tradesperson_user_id, job_id, payment_method_id } = req.body;

    const profileResult = await pool.query(
      'SELECT stripe_account_id FROM tradesperson_profiles WHERE user_id = $1',
      [tradesperson_user_id]
    );
    const profile = profileResult.rows[0];
    if (!profile?.stripe_account_id) {
      return res.status(400).json({ error: 'Tradesperson has no connected Stripe account' });
    }

    const platformFeeCents = Math.round(amount_cents * PLATFORM_FEE_PERCENT);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount_cents,
      currency: 'usd',
      application_fee_amount: platformFeeCents,
      payment_method: payment_method_id,
      confirm: true,
      transfer_data: { destination: profile.stripe_account_id },
      metadata: { job_id },
    });

    res.json({
      payment_intent_id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
    });
  } catch (err: any) {
    console.error('direct-charge error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
