-- ═══════════════════════════════════════════════════════════════
-- TradesOn Database Schema Migration
-- Source: docs/DATABASE_SCHEMA.md (base) + Ultraplan extensions
-- Target: Cloud SQL PostgreSQL 16 (tradeson-491518:tradeson-db)
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ═══════════════════════════════════════════
-- 1. USERS & AUTH
-- ═══════════════════════════════════════════

CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid      VARCHAR(128) UNIQUE NOT NULL,
  email             TEXT UNIQUE NOT NULL,
  phone_number      VARCHAR(20),
  full_name         TEXT NOT NULL,
  role              TEXT NOT NULL CHECK (role IN (
                      'homeowner','property_manager','realtor',
                      'licensed_tradesperson','unlicensed_tradesperson')),
  profile_photo_url TEXT,
  is_verified       BOOLEAN DEFAULT FALSE,
  is_active         BOOLEAN DEFAULT TRUE,
  marketing_opt_in  BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(deleted_at) WHERE deleted_at IS NULL;

-- ═══════════════════════════════════════════
-- 2. USER ADDRESSES
-- ═══════════════════════════════════════════

CREATE TABLE user_addresses (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  address_line_1        TEXT NOT NULL,
  city                  TEXT NOT NULL,
  state                 VARCHAR(2) NOT NULL,
  zip_code              VARCHAR(10) NOT NULL,
  latitude              DECIMAL(9,6),
  longitude             DECIMAL(9,6),
  service_radius_miles  INTEGER,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_addresses_user_id ON user_addresses(user_id);

-- ═══════════════════════════════════════════
-- 3. NOTIFICATION PREFERENCES
-- ═══════════════════════════════════════════

CREATE TABLE user_notification_preferences (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notify_sms    BOOLEAN DEFAULT TRUE,
  notify_email  BOOLEAN DEFAULT TRUE,
  notify_push   BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════
-- 4. ROLE PROFILE TABLES
-- ═══════════════════════════════════════════

-- Homeowner (S-06)
CREATE TABLE homeowner_profiles (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_address        TEXT,
  property_city           TEXT,
  property_state          VARCHAR(2),
  property_zip            VARCHAR(10),
  property_type           TEXT CHECK (property_type IN ('house','apartment','condo','townhouse')),
  service_interests       TEXT[] DEFAULT '{}',
  payment_method_deferred BOOLEAN DEFAULT TRUE,
  stripe_customer_id      TEXT,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

-- Property Manager (S-04)
CREATE TABLE property_manager_profiles (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name            TEXT NOT NULL,
  job_title               TEXT NOT NULL,
  business_email          TEXT NOT NULL,
  property_count_range    TEXT,
  property_types          TEXT[] DEFAULT '{}',
  preferred_service_types TEXT[] DEFAULT '{}',
  urgency_types           TEXT[] DEFAULT '{}',
  plan_type               TEXT,
  stripe_customer_id      TEXT,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

-- Managed Properties (PM portfolio)
CREATE TABLE managed_properties (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_manager_profile_id UUID NOT NULL REFERENCES property_manager_profiles(id) ON DELETE CASCADE,
  address_line_1              TEXT NOT NULL,
  city                        TEXT NOT NULL,
  state                       VARCHAR(2) NOT NULL,
  zip_code                    VARCHAR(10) NOT NULL,
  property_type               TEXT,
  created_at                  TIMESTAMPTZ DEFAULT now(),
  deleted_at                  TIMESTAMPTZ
);

CREATE INDEX idx_managed_properties_pm_id ON managed_properties(property_manager_profile_id);

-- Realtor (S-05)
CREATE TABLE realtor_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brokerage_name        TEXT NOT NULL,
  license_number        TEXT NOT NULL,
  service_radius_miles  INTEGER,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- Realtor Client Invitations
CREATE TABLE realtor_clients (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_profile_id  UUID NOT NULL REFERENCES realtor_profiles(id) ON DELETE CASCADE,
  client_email        TEXT NOT NULL,
  invited_at          TIMESTAMPTZ DEFAULT now(),
  accepted_at         TIMESTAMPTZ,
  client_user_id      UUID REFERENCES users(id)
);

CREATE INDEX idx_realtor_clients_realtor_id ON realtor_clients(realtor_profile_id);
CREATE INDEX idx_realtor_clients_email ON realtor_clients(client_email);

-- Tradesperson (S-07 licensed, S-08 unlicensed)
CREATE TABLE tradesperson_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name         TEXT,
  is_licensed           BOOLEAN NOT NULL,
  service_address       TEXT,
  service_city          TEXT,
  service_state         VARCHAR(2),
  service_zip           VARCHAR(10),
  service_radius_miles  INTEGER,
  primary_trades        TEXT[] DEFAULT '{}',
  subcategories         TEXT[] DEFAULT '{}',
  additional_services   TEXT,
  business_entity_type  TEXT,
  id_verified           BOOLEAN DEFAULT FALSE,
  id_document_url       TEXT,
  has_insurance         BOOLEAN,
  insurance_doc_url     TEXT,
  stripe_account_id     TEXT,
  payout_enabled        BOOLEAN DEFAULT FALSE,
  rating                DECIMAL(3,2),
  jobs_completed        INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tradesperson_user_id ON tradesperson_profiles(user_id);
CREATE INDEX idx_tradesperson_service_zip ON tradesperson_profiles(service_zip);
CREATE INDEX idx_tradesperson_primary_trades ON tradesperson_profiles USING GIN(primary_trades);

-- Service Areas (zip codes beyond radius)
CREATE TABLE service_areas (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tradesperson_profile_id   UUID NOT NULL REFERENCES tradesperson_profiles(id) ON DELETE CASCADE,
  zip_code                  VARCHAR(10) NOT NULL
);

CREATE INDEX idx_service_areas_profile_id ON service_areas(tradesperson_profile_id);
CREATE INDEX idx_service_areas_zip ON service_areas(zip_code);

-- Compliance Documents (licenses)
CREATE TABLE compliance_documents (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tradesperson_profile_id   UUID NOT NULL REFERENCES tradesperson_profiles(id) ON DELETE CASCADE,
  license_type              TEXT NOT NULL,
  license_number            TEXT NOT NULL,
  expiration_date           DATE NOT NULL,
  document_url              TEXT NOT NULL,
  verification_status       TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending','approved','rejected')),
  verified_at               TIMESTAMPTZ,
  verified_by               UUID REFERENCES users(id),
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now()
);

-- Payout Accounts (Stripe Connect)
CREATE TABLE payout_accounts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_account_id     TEXT NOT NULL,
  business_entity_type  TEXT NOT NULL,
  payouts_enabled       BOOLEAN DEFAULT FALSE,
  bank_last4            VARCHAR(4),
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════
-- 5. JOB LIFECYCLE
-- ═══════════════════════════════════════════

CREATE TABLE jobs (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_user_id         UUID NOT NULL REFERENCES users(id),
  assigned_tradesperson_id  UUID REFERENCES users(id),
  title                     TEXT NOT NULL,
  description               TEXT NOT NULL,
  category                  TEXT NOT NULL,
  room                      TEXT NOT NULL,
  severity                  TEXT CHECK (severity IN ('routine','moderate','urgent')),
  job_nature                TEXT CHECK (job_nature IN ('Cosmetic','Routine Maintenance','Repair / Fix','Renovation','Other')),
  affected_part             TEXT,
  adjacent_impact           TEXT,
  housewide_impact          TEXT,
  status                    TEXT DEFAULT 'open' CHECK (status IN (
                              'open','quoted','scheduled','en_route',
                              'in_progress','completed','cancelled','expired')),
  address                   TEXT NOT NULL,
  city                      TEXT NOT NULL,
  state                     VARCHAR(2) NOT NULL,
  zip_code                  VARCHAR(10) NOT NULL,
  latitude                  DECIMAL(9,6),
  longitude                 DECIMAL(9,6),
  budget_min                DECIMAL(10,2),
  budget_max                DECIMAL(10,2),
  ai_summary                TEXT,
  ai_price_low              DECIMAL(10,2),
  ai_price_high             DECIMAL(10,2),
  expires_at                TIMESTAMPTZ,
  scheduled_at              TIMESTAMPTZ,
  completed_at              TIMESTAMPTZ,
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now(),
  deleted_at                TIMESTAMPTZ
);

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_zip ON jobs(zip_code);
CREATE INDEX idx_jobs_category ON jobs(category);
CREATE INDEX idx_jobs_homeowner ON jobs(homeowner_user_id);
CREATE INDEX idx_jobs_tradesperson ON jobs(assigned_tradesperson_id);
CREATE INDEX idx_jobs_created ON jobs(created_at DESC);

-- Job Photos
CREATE TABLE job_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users(id),
  photo_url   TEXT NOT NULL,
  photo_type  TEXT CHECK (photo_type IN ('intake','before','after','completion')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_job_photos_job ON job_photos(job_id);

-- Quotes
CREATE TABLE quotes (
  id                                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id                              UUID NOT NULL REFERENCES jobs(id),
  tradesperson_user_id                UUID NOT NULL REFERENCES users(id),
  price                               DECIMAL(10,2) NOT NULL,
  estimated_hours                     DECIMAL(4,1) NOT NULL,
  hourly_overage_rate                 DECIMAL(6,2) NOT NULL,
  message                             TEXT,
  tradesperson_rating_at_submission   DECIMAL(3,2),
  status                              TEXT DEFAULT 'pending' CHECK (status IN (
                                        'pending','accepted','rejected','withdrawn','expired')),
  accepted_at                         TIMESTAMPTZ,
  expires_at                          TIMESTAMPTZ,
  created_at                          TIMESTAMPTZ DEFAULT now(),
  updated_at                          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(job_id, tradesperson_user_id)
);

CREATE INDEX idx_quotes_job_id ON quotes(job_id);
CREATE INDEX idx_quotes_tradesperson ON quotes(tradesperson_user_id);
CREATE INDEX idx_quotes_status ON quotes(status);

-- ═══════════════════════════════════════════
-- 6. SCHEDULING & EXECUTION (NEW - Ultraplan)
-- ═══════════════════════════════════════════

CREATE TABLE appointments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id            UUID NOT NULL REFERENCES jobs(id),
  quote_id          UUID REFERENCES quotes(id),
  tradesperson_id   UUID NOT NULL REFERENCES users(id),
  customer_id       UUID NOT NULL REFERENCES users(id),
  scheduled_date    DATE NOT NULL,
  time_slot_start   TIME NOT NULL,
  time_slot_end     TIME NOT NULL,
  status            TEXT DEFAULT 'confirmed' CHECK (status IN (
                      'confirmed','en_route','in_progress',
                      'completed','cancelled','no_show')),
  arrival_eta       TIMESTAMPTZ,
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_appt_job ON appointments(job_id);
CREATE INDEX idx_appt_trade ON appointments(tradesperson_id);
CREATE INDEX idx_appt_date ON appointments(scheduled_date);

CREATE TABLE appointment_checklist (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  item            TEXT NOT NULL,
  completed       BOOLEAN DEFAULT false,
  completed_at    TIMESTAMPTZ
);

CREATE TABLE scope_changes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          UUID NOT NULL REFERENCES jobs(id),
  appointment_id  UUID REFERENCES appointments(id),
  tradesperson_id UUID NOT NULL REFERENCES users(id),
  description     TEXT NOT NULL,
  price_delta     DECIMAL(10,2) NOT NULL,
  status          TEXT DEFAULT 'pending' CHECK (status IN (
                    'pending','approved','declined')),
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════
-- 7. PAYMENTS & INVOICING
-- ═══════════════════════════════════════════

CREATE TABLE payments (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id                    UUID NOT NULL REFERENCES jobs(id),
  quote_id                  UUID REFERENCES quotes(id),
  payer_user_id             UUID NOT NULL REFERENCES users(id),
  payee_user_id             UUID NOT NULL REFERENCES users(id),
  amount                    DECIMAL(10,2) NOT NULL,
  platform_fee              DECIMAL(10,2) NOT NULL,
  net_payout                DECIMAL(10,2) NOT NULL,
  stripe_payment_intent_id  TEXT,
  stripe_transfer_id        TEXT,
  status                    TEXT DEFAULT 'pending' CHECK (status IN (
                              'pending','processing','completed','failed','refunded')),
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payments_job ON payments(job_id);

CREATE TABLE invoices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      UUID NOT NULL REFERENCES jobs(id),
  payment_id  UUID REFERENCES payments(id),
  subtotal    DECIMAL(10,2) NOT NULL,
  tax         DECIMAL(10,2) DEFAULT 0,
  total       DECIMAL(10,2) NOT NULL,
  pdf_url     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_invoices_job ON invoices(job_id);

CREATE TABLE invoice_line_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description VARCHAR(255) NOT NULL,
  category    VARCHAR(30),
  quantity    DECIMAL(10,2) DEFAULT 1,
  unit_price  DECIMAL(10,2) NOT NULL,
  amount      DECIMAL(10,2) NOT NULL,
  sort_order  INTEGER DEFAULT 0
);

-- ═══════════════════════════════════════════
-- 8. REVIEWS (NEW - Ultraplan)
-- ═══════════════════════════════════════════

CREATE TABLE reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      UUID NOT NULL REFERENCES jobs(id),
  reviewer_id UUID NOT NULL REFERENCES users(id),
  reviewee_id UUID NOT NULL REFERENCES users(id),
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(job_id, reviewer_id)
);

CREATE INDEX idx_reviews_reviewee ON reviews(reviewee_id);

-- ═══════════════════════════════════════════
-- 9. MESSAGING (NEW - Ultraplan)
-- Conversation metadata in PG, messages in Firestore
-- ═══════════════════════════════════════════

CREATE TABLE conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          UUID REFERENCES jobs(id),
  participant_ids UUID[] NOT NULL,
  last_message_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_conv_participants ON conversations USING GIN(participant_ids);
CREATE INDEX idx_conv_job ON conversations(job_id);

-- ═══════════════════════════════════════════
-- 10. NOTIFICATIONS & DEVICE TOKENS (NEW - Ultraplan)
-- ═══════════════════════════════════════════

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  type        VARCHAR(50) NOT NULL,
  title       VARCHAR(255),
  body        TEXT,
  data        JSONB,
  channel     VARCHAR(10) NOT NULL CHECK (channel IN ('push','email','sms')),
  delivered   BOOLEAN DEFAULT false,
  read        BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notif_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notif_unread ON notifications(user_id) WHERE read = false;

CREATE TABLE device_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  token       TEXT NOT NULL,
  platform    VARCHAR(10) DEFAULT 'web',
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, token)
);

-- ═══════════════════════════════════════════
-- 11. AUDIT LOG (immutable)
-- ═══════════════════════════════════════════

CREATE TABLE audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id   UUID REFERENCES users(id),
  action          TEXT NOT NULL,
  resource_type   TEXT NOT NULL,
  resource_id     UUID NOT NULL,
  metadata        JSONB,
  ip_address      INET,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_user_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

-- ═══════════════════════════════════════════
-- DONE — 25 tables, all indexes created
-- ═══════════════════════════════════════════

-- ═══════════════════════════════════════════
-- 12. ADMIN COMPLIANCE + RESOLUTIONS (additive — safe to re-run)
-- These are also applied automatically at startup by runMigrations() in index.ts.
-- Apply manually with: psql $DATABASE_URL -f api/src/schema/migration.sql
-- (the IF NOT EXISTS guards make the whole block idempotent)
-- ═══════════════════════════════════════════

-- Compliance status on tradesperson profiles (one decision per tradesperson)
ALTER TABLE tradesperson_profiles
  ADD COLUMN IF NOT EXISTS compliance_status TEXT DEFAULT 'pending'
    CHECK (compliance_status IN ('pending','approved','rejected','more_docs')),
  ADD COLUMN IF NOT EXISTS compliance_admin_note TEXT,
  ADD COLUMN IF NOT EXISTS compliance_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS compliance_reviewed_by UUID REFERENCES users(id);

-- Add 'admin' to the users role check constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN (
  'homeowner','property_manager','realtor',
  'licensed_tradesperson','unlicensed_tradesperson','admin'
));

-- Flagged accounts (admin queue)
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

CREATE INDEX IF NOT EXISTS idx_flagged_accounts_user ON flagged_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_flagged_accounts_unresolved ON flagged_accounts(created_at DESC)
  WHERE resolved_at IS NULL;

-- Admin resolutions (warning / suspension / deactivation / explanation_request)
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

CREATE INDEX IF NOT EXISTS idx_admin_resolutions_target ON admin_resolutions(target_user_id);

-- ═══════════════════════════════════════════
-- 13. COMPLIANCE DOCUMENTS — nullable fields
-- Allows documents to be uploaded post-onboarding via InsuranceUpload.
-- Root cause of the licensed tradesperson onboarding registration bug:
-- frontend sent licenses:[] but the NOT NULL constraint still blocked
-- if the INSERT path was reached with any partial data.
-- ═══════════════════════════════════════════

ALTER TABLE compliance_documents ALTER COLUMN document_url DROP NOT NULL;
ALTER TABLE compliance_documents ALTER COLUMN expiration_date DROP NOT NULL;

-- ═══════════════════════════════════════════
-- 14. TAXONOMY & MATCHER SCHEMA (PR 2)
-- Run after tradeTaxonomy.ts is deployed so offered_services labels match.
-- ═══════════════════════════════════════════

-- Sub-service leaves the tradesperson offers (populated during onboarding,
-- editable in Settings). Auto-migrated from primary_trades on deploy.
ALTER TABLE tradesperson_profiles
  ADD COLUMN IF NOT EXISTS offered_services TEXT[] DEFAULT '{}';

-- Populate offered_services for existing tradespeople: expand each trade
-- in primary_trades to all its sub-services using the canonical taxonomy.
-- Tradespeople can prune unwanted sub-services in Settings after migration.
-- Only runs for rows where offered_services is still empty.
UPDATE tradesperson_profiles SET offered_services = (
  SELECT ARRAY_AGG(sub) FROM (
    SELECT UNNEST(ARRAY[
      CASE WHEN 'Plumbing'            = ANY(primary_trades) THEN ARRAY['Drain cleaning','Leak repair','Toilet repair','Faucet / sink','Water heater','New install']                                                  ELSE '{}' END,
      CASE WHEN 'Electrical'          = ANY(primary_trades) THEN ARRAY['Outlet / switch','Light fixture install','Ceiling fan','Panel work','EV charger','Troubleshooting']                                          ELSE '{}' END,
      CASE WHEN 'HVAC'                = ANY(primary_trades) THEN ARRAY['Furnace repair','AC repair','Maintenance / tune-up','Duct cleaning','Thermostat install','New install']                                       ELSE '{}' END,
      CASE WHEN 'General Contracting' = ANY(primary_trades)
        OR 'General Repairs'          = ANY(primary_trades)
        OR 'Handyman'                 = ANY(primary_trades)
        OR 'Flooring'                 = ANY(primary_trades)
                                      THEN ARRAY['Furniture assembly','TV mounting','Picture / shelf hanging','Door repair','Drywall patch','Caulking','Curtain / blind install','Childproofing'] ELSE '{}' END,
      CASE WHEN 'Cleaning'            = ANY(primary_trades) THEN ARRAY['Standard','Deep clean','Move-in / Move-out','Post-construction','Carpet cleaning','Window cleaning','Junk removal']                          ELSE '{}' END,
      CASE WHEN 'Landscaping'         = ANY(primary_trades) THEN ARRAY['Lawn mowing','Yard cleanup','Tree / shrub trimming','Garden design / planting','Mulching','Aeration / overseeding','Sod install']            ELSE '{}' END,
      CASE WHEN 'Snow Removal'        = ANY(primary_trades) THEN ARRAY['Driveway','Sidewalks / walkways','Steps / entryways','Parking area','Roof','Patio or deck','Mailbox or curb access','Salting / de-icing']   ELSE '{}' END,
      CASE WHEN 'Roofing'             = ANY(primary_trades) THEN ARRAY['Inspection','Leak repair','Shingle replacement','Gutter cleaning','Gutter repair']                                                           ELSE '{}' END,
      CASE WHEN 'Carpentry'           = ANY(primary_trades) THEN ARRAY['Custom builds','Trim / molding','Decking','Framing','Cabinet install']                                                                       ELSE '{}' END,
      CASE WHEN 'Masonry'             = ANY(primary_trades) THEN ARRAY['Concrete repair','Driveway / walkway','Brick / stone','Patio install']                                                                      ELSE '{}' END
    ]) AS sub
    WHERE sub IS NOT NULL AND sub != '{}'
  ) expanded
) WHERE (offered_services = '{}' OR offered_services IS NULL)
  AND primary_trades != '{}';

CREATE INDEX IF NOT EXISTS idx_tradesperson_offered_services
  ON tradesperson_profiles USING GIN(offered_services);

-- Structured intake answers collected during job creation for
-- Cleaning, Snow Removal, and Landscaping jobs.
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS intake_answers JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sub_service    TEXT;

CREATE INDEX IF NOT EXISTS idx_jobs_sub_service ON jobs(sub_service);

-- Per-quote tool inventory from the QuoteSubmissionModal checklist.
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS tool_inventory JSONB DEFAULT '{}';

-- Match events: every time a tradesperson sees a job or takes an action,
-- we log it. Used to train the ML matcher in the future (Track 2).
CREATE TABLE IF NOT EXISTS match_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id           UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  tradesperson_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type       TEXT NOT NULL CHECK (event_type IN ('shown','viewed','quoted','accepted','rejected','messaged')),
  score            DECIMAL(5,2),
  context          JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_events_job        ON match_events(job_id);
CREATE INDEX IF NOT EXISTS idx_match_events_trade      ON match_events(tradesperson_id);
CREATE INDEX IF NOT EXISTS idx_match_events_type_date  ON match_events(event_type, created_at DESC);

-- Postgres indexes for high-traffic query patterns (Launch Readiness tracker)
CREATE INDEX IF NOT EXISTS idx_jobs_status_trade_created
  ON jobs(status, category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_customer_status_created
  ON jobs(homeowner_user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_tradesperson_status_created
  ON jobs(assigned_tradesperson_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_job_price
  ON quotes(job_id, price ASC);
CREATE INDEX IF NOT EXISTS idx_quotes_trade_created
  ON quotes(tradesperson_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_created
  ON reviews(reviewee_id, created_at DESC);

-- ═══════════════════════════════════════════
-- 15. PRE-AUTH PAYMENT HOLD + 3-HOUR CONFIRMATION WINDOW
-- When a quote is accepted, a Stripe PaymentIntent is created with
-- capture_method: 'manual' (funds held on job poster's card).
-- Tradesperson marks done → status becomes 'pending_confirmation'.
-- Job poster confirms (or auto-release fires after 3 hours) → capture.
-- ═══════════════════════════════════════════

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS auto_release_at TIMESTAMPTZ;

-- Extend the status constraint to include the confirmation window step.
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check CHECK (status IN (
  'open','quoted','scheduled','en_route','in_progress',
  'pending_confirmation','completed','cancelled','expired'
));

-- ═══════════════════════════════════════════
-- 16. BROKER (REALTOR) COMMAND CENTER
-- Referral link tracking + trusted tradesperson favorites
-- ═══════════════════════════════════════════

-- Unique referral code for the realtor's share link
ALTER TABLE realtor_profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_realtor_referral_code
  ON realtor_profiles(referral_code) WHERE referral_code IS NOT NULL;

-- When a homeowner signs up via a realtor's referral link, track the source
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS referred_by_realtor_id UUID REFERENCES realtor_profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by_realtor_id) WHERE referred_by_realtor_id IS NOT NULL;

-- Realtor's curated list of trusted tradespeople (shown on dashboard, shareable)
CREATE TABLE IF NOT EXISTS realtor_favorites (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_profile_id    UUID NOT NULL REFERENCES realtor_profiles(id) ON DELETE CASCADE,
  tradesperson_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trade_category        TEXT,
  note                  TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  UNIQUE(realtor_profile_id, tradesperson_user_id)
);
CREATE INDEX IF NOT EXISTS idx_realtor_favorites_profile ON realtor_favorites(realtor_profile_id);
