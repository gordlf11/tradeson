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
