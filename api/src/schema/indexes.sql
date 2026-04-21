-- ═══════════════════════════════════════════════════════════════
-- TradesOn Performance Indexes
-- Missing from the base migration.sql; required before launch at
-- scale per Kevin's checklist. Safe to run multiple times.
-- Depends on: migration.sql (base tables must exist).
-- ═══════════════════════════════════════════════════════════════

-- Jobs
CREATE INDEX IF NOT EXISTS idx_jobs_status_trade_created
  ON jobs(status, category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_customer_status
  ON jobs(homeowner_user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_tradesperson_status
  ON jobs(assigned_tradesperson_id, status, created_at DESC);

-- Quotes
CREATE INDEX IF NOT EXISTS idx_quotes_job_price
  ON quotes(job_id, price ASC);

CREATE INDEX IF NOT EXISTS idx_quotes_trade_created
  ON quotes(tradesperson_user_id, created_at DESC);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_created
  ON reviews(reviewee_id, created_at DESC);
