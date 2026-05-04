import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pool from './config/db';
import usersRouter from './routes/users';
import onboardingRouter from './routes/onboarding';
import jobsRouter from './routes/jobs';
import quotesRouter from './routes/quotes';
import stripeRouter from './routes/stripe';
import webhooksRouter from './routes/webhooks';
import adminRouter from './routes/admin';

const app = express();
const PORT = parseInt(process.env.PORT || '8080', 10);

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://tradeson-app-63629008205.us-central1.run.app',
    'https://tradeson-491518.web.app',
  ],
  credentials: true,
}));

// Stripe webhooks require raw body — must be registered BEFORE express.json()
app.use('/api/v1/stripe/webhooks', express.raw({ type: 'application/json' }), webhooksRouter);

app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'tradeson-api', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/onboarding', onboardingRouter);
app.use('/api/v1/jobs', jobsRouter);
app.use('/api/v1/quotes', quotesRouter);
app.use('/api/v1/stripe', stripeRouter);
app.use('/api/v1/admin', adminRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Run idempotent migrations on startup — safe to re-run, uses IF NOT EXISTS
async function runMigrations() {
  try {
    await pool.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
        ADD COLUMN IF NOT EXISTS subscription_id TEXT,
        ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none';
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users (stripe_customer_id);
    `);
    console.log('Migrations: stripe columns OK');
  } catch (err: any) {
    // Non-fatal — log and continue. DB may not be reachable in local dev without a connection string.
    console.warn('Migrations skipped:', err.message);
  }

  // Admin / compliance migration — additive, idempotent.
  // Mirror of the block at the bottom of api/src/schema/migration.sql so live
  // Cloud Run boots converge to the same schema without a manual psql run.
  try {
    await pool.query(`
      ALTER TABLE tradesperson_profiles
        ADD COLUMN IF NOT EXISTS compliance_status TEXT DEFAULT 'pending'
          CHECK (compliance_status IN ('pending','approved','rejected','more_docs')),
        ADD COLUMN IF NOT EXISTS compliance_admin_note TEXT,
        ADD COLUMN IF NOT EXISTS compliance_reviewed_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS compliance_reviewed_by UUID REFERENCES users(id);
    `);
    await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;`);
    await pool.query(`
      ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN (
        'homeowner','property_manager','realtor',
        'licensed_tradesperson','unlicensed_tradesperson','admin'
      ));
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS flagged_accounts (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        flagged_by  UUID REFERENCES users(id),
        flag_reason TEXT NOT NULL,
        flag_type   TEXT CHECK (flag_type IN ('dispute','poor_reviews','expired_insurance','suspicious_activity')),
        severity    TEXT CHECK (severity IN ('low','medium','high')) DEFAULT 'medium',
        resolved_at TIMESTAMPTZ,
        created_at  TIMESTAMPTZ DEFAULT now()
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_flagged_accounts_user ON flagged_accounts(user_id);`);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_flagged_accounts_unresolved ON flagged_accounts(created_at DESC)
        WHERE resolved_at IS NULL;
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_resolutions (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_user_id   UUID REFERENCES users(id),
        target_user_id  UUID NOT NULL REFERENCES users(id),
        action_type     TEXT NOT NULL CHECK (action_type IN (
                          'warning','suspension','deactivation','explanation_request')),
        reason          TEXT NOT NULL,
        suspend_until   DATE,
        created_at      TIMESTAMPTZ DEFAULT now()
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_admin_resolutions_target ON admin_resolutions(target_user_id);`);
    console.log('Migrations: admin/compliance schema OK');
  } catch (err: any) {
    console.warn('Admin migrations skipped:', err.message);
  }
}

// Start listening immediately so Cloud Run's startup probe passes even if
// the DB is unreachable. DB-dependent routes will return 503 via the
// auth middleware's catch block until connectivity is restored.
app.listen(PORT, '0.0.0.0', () => {
  console.log(`tradeson-api listening on port ${PORT}`);
});

// Run migrations in the background. Errors are logged inside runMigrations;
// this catch guards against any unexpected unhandled rejection.
runMigrations().catch((err) => {
  console.error('runMigrations unexpectedly rejected:', err);
});

export default app;
