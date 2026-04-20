import { Router } from 'express';
import Stripe from 'stripe';
import pool from '../config/db';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Price IDs per role — configurable via env vars, no code change needed to adjust
const PRICE_IDS: Record<string, string> = {
  homeowner:              process.env.STRIPE_PRICE_HOMEOWNER || '',
  realtor:                process.env.STRIPE_PRICE_REALTOR || '',
  'property-manager':     process.env.STRIPE_PRICE_PM || '',
  'licensed-trade':       process.env.STRIPE_PRICE_LICENSED_TRADE || '',
  'non-licensed-trade':   process.env.STRIPE_PRICE_UNLICENSED_TRADE || '',
};

const PLATFORM_FEE_PERCENT = parseFloat(process.env.PLATFORM_FEE_PERCENT || '0.15');
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

// POST /api/v1/stripe/create-checkout-session
// Returns a client_secret for Stripe Embedded Checkout — no redirect URL returned
router.post('/create-checkout-session', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { role } = req.body;

    const priceId = PRICE_IDS[role];
    if (!priceId) {
      return res.status(400).json({ error: `No Stripe price configured for role: ${role}` });
    }

    // Look up or create Stripe customer, stored on users table
    const userResult = await pool.query(
      'SELECT email, stripe_customer_id FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0];

    let customerId: string = user?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user?.email,
        metadata: { userId },
      });
      customerId = customer.id;
      // Update the user record — stripe_customer_id column added by stripe_migration.sql
      await pool.query(
        'UPDATE users SET stripe_customer_id = $1, updated_at = now() WHERE id = $2',
        [customerId, userId]
      ).catch(() => {
        // Column may not exist yet if migration hasn't run — non-fatal
      });
    }

    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      return_url: `${APP_URL}/onboarding/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      metadata: { userId, role },
    });

    res.json({ client_secret: session.client_secret });
  } catch (err: any) {
    console.error('create-checkout-session error:', err);
    res.status(500).json({ error: err.message });
  }
});

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
