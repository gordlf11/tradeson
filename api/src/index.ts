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
import paymentsRouter from './routes/payments';
import reviewsRouter from './routes/reviews';

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
app.use('/api/v1/payments', paymentsRouter);
app.use('/api/v1/reviews', reviewsRouter);

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

  // PR 2 — taxonomy + matcher schema
  try {
    await pool.query(`ALTER TABLE compliance_documents ALTER COLUMN document_url DROP NOT NULL;`);
    await pool.query(`ALTER TABLE compliance_documents ALTER COLUMN expiration_date DROP NOT NULL;`);
    await pool.query(`ALTER TABLE tradesperson_profiles ADD COLUMN IF NOT EXISTS offered_services TEXT[] DEFAULT '{}';`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_tradesperson_offered_services ON tradesperson_profiles USING GIN(offered_services);`);
    // Auto-migrate existing tradespeople: expand primary_trades → offered_services
    await pool.query(`
      UPDATE tradesperson_profiles SET offered_services = (
        SELECT ARRAY_AGG(sub) FROM (
          SELECT UNNEST(ARRAY[
            CASE WHEN 'Plumbing'            = ANY(primary_trades) THEN ARRAY['Drain cleaning','Leak repair','Toilet repair','Faucet / sink','Water heater','New install'] ELSE '{}' END,
            CASE WHEN 'Electrical'          = ANY(primary_trades) THEN ARRAY['Outlet / switch','Light fixture install','Ceiling fan','Panel work','EV charger','Troubleshooting'] ELSE '{}' END,
            CASE WHEN 'HVAC'                = ANY(primary_trades) THEN ARRAY['Furnace repair','AC repair','Maintenance / tune-up','Duct cleaning','Thermostat install','New install'] ELSE '{}' END,
            CASE WHEN 'General Contracting' = ANY(primary_trades) OR 'General Repairs' = ANY(primary_trades) OR 'Handyman' = ANY(primary_trades) OR 'Flooring' = ANY(primary_trades)
                                            THEN ARRAY['Furniture assembly','TV mounting','Picture / shelf hanging','Door repair','Drywall patch','Caulking','Curtain / blind install','Childproofing'] ELSE '{}' END,
            CASE WHEN 'Cleaning'            = ANY(primary_trades) THEN ARRAY['Standard','Deep clean','Move-in / Move-out','Post-construction','Carpet cleaning','Window cleaning','Junk removal'] ELSE '{}' END,
            CASE WHEN 'Landscaping'         = ANY(primary_trades) THEN ARRAY['Lawn mowing','Yard cleanup','Tree / shrub trimming','Garden design / planting','Mulching','Aeration / overseeding','Sod install'] ELSE '{}' END,
            CASE WHEN 'Snow Removal'        = ANY(primary_trades) THEN ARRAY['Driveway','Sidewalks / walkways','Steps / entryways','Parking area','Roof','Patio or deck','Mailbox or curb access','Salting / de-icing'] ELSE '{}' END,
            CASE WHEN 'Roofing'             = ANY(primary_trades) THEN ARRAY['Inspection','Leak repair','Shingle replacement','Gutter cleaning','Gutter repair'] ELSE '{}' END,
            CASE WHEN 'Carpentry'           = ANY(primary_trades) THEN ARRAY['Custom builds','Trim / molding','Decking','Framing','Cabinet install'] ELSE '{}' END,
            CASE WHEN 'Masonry'             = ANY(primary_trades) THEN ARRAY['Concrete repair','Driveway / walkway','Brick / stone','Patio install'] ELSE '{}' END
          ]) AS sub WHERE sub IS NOT NULL AND sub != '{}'
        ) expanded
      ) WHERE (offered_services = '{}' OR offered_services IS NULL) AND primary_trades != '{}';
    `);
    await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS intake_answers JSONB DEFAULT '{}';`);
    await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS sub_service TEXT;`);
    await pool.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS tool_inventory JSONB DEFAULT '{}';`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS match_events (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id           UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        tradesperson_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_type       TEXT NOT NULL CHECK (event_type IN ('shown','viewed','quoted','accepted','rejected','messaged')),
        score            DECIMAL(5,2),
        context          JSONB DEFAULT '{}',
        created_at       TIMESTAMPTZ DEFAULT now()
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_match_events_job   ON match_events(job_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_match_events_trade  ON match_events(tradesperson_id);`);
    // Postgres indexes for high-traffic query patterns
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_jobs_status_trade_created    ON jobs(status, category, created_at DESC);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_jobs_customer_status_created ON jobs(homeowner_user_id, status, created_at DESC);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_jobs_tradesperson_status_created ON jobs(assigned_tradesperson_id, status, created_at DESC);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_quotes_job_price   ON quotes(job_id, price ASC);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_quotes_trade_created ON quotes(tradesperson_user_id, created_at DESC);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_created ON reviews(reviewee_id, created_at DESC);`);
    console.log('Migrations: taxonomy + matcher schema OK');
  } catch (err: any) {
    console.warn('Taxonomy migrations skipped:', err.message);
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
