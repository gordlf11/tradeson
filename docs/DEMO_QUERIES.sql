-- ═══════════════════════════════════════════════════════════════
-- TradesOn — Cloud SQL Demo Query Set
--
-- Companion to docs/DEMO_RUNBOOK.md. These queries turn Postgres
-- state into the stories you narrate during the client call:
--   "Here's who signed up"
--   "Here's the job they posted"
--   "Here's the tradesperson picking it up"
--   "Here's the full lifecycle of this one job"
--   "Here's the state of the platform right now"
--
-- Paste any single block into Cloud SQL Studio and Run. All
-- read-only — nothing here mutates data.
--
-- Every query is scoped to the 'public' schema.
-- ═══════════════════════════════════════════════════════════════

SET search_path TO public;


-- ═══════════════════════════════════════════════════════════════
-- 1. PLATFORM OVERVIEW — the "headline" shot
-- Run this at the start and end of the demo to show growth.
-- ═══════════════════════════════════════════════════════════════

SELECT
  (SELECT count(*) FROM users WHERE deleted_at IS NULL)                          AS total_users,
  (SELECT count(*) FROM users WHERE role = 'homeowner')                          AS homeowners,
  (SELECT count(*) FROM users WHERE role IN ('licensed_tradesperson',
                                              'unlicensed_tradesperson'))        AS tradespeople,
  (SELECT count(*) FROM users WHERE role = 'property_manager')                   AS property_managers,
  (SELECT count(*) FROM users WHERE role = 'realtor')                            AS realtors,
  (SELECT count(*) FROM jobs WHERE deleted_at IS NULL)                           AS total_jobs,
  (SELECT count(*) FROM jobs WHERE status = 'open')                              AS open_jobs,
  (SELECT count(*) FROM jobs WHERE status = 'scheduled')                         AS scheduled_jobs,
  (SELECT count(*) FROM jobs WHERE status = 'completed')                         AS completed_jobs,
  (SELECT count(*) FROM quotes)                                                  AS total_quotes,
  (SELECT count(*) FROM reviews)                                                 AS total_reviews;


-- ═══════════════════════════════════════════════════════════════
-- 2. LATEST ACTIVITY FEED — "what just happened?"
-- Union of the most recent signups, jobs, quotes, accepts, reviews.
-- Shows the platform is a live system, not a fixture.
-- ═══════════════════════════════════════════════════════════════

WITH feed AS (
  SELECT created_at, 'signup'    AS event, email         AS who, role::text      AS detail FROM users
  UNION ALL
  SELECT created_at, 'job_post'  AS event, title,         category                         FROM jobs
  UNION ALL
  SELECT created_at, 'quote'     AS event, 'tradesperson', 'price $' || price::text         FROM quotes
  UNION ALL
  SELECT accepted_at, 'accept'   AS event, 'customer',    'quote ' || id::text             FROM quotes WHERE status = 'accepted' AND accepted_at IS NOT NULL
  UNION ALL
  SELECT created_at, 'review'    AS event, 'reviewer',    rating || ' stars'               FROM reviews
)
SELECT created_at, event, who, detail
FROM feed
ORDER BY created_at DESC
LIMIT 15;


-- ═══════════════════════════════════════════════════════════════
-- 3. USER FUNNEL — signup → onboarded → active
-- Profiles table exists iff the user completed onboarding for
-- that role. Counts tell you who got stuck where.
-- ═══════════════════════════════════════════════════════════════

SELECT
  u.role,
  count(u.id)                                                     AS signed_up,
  count(hp.user_id) + count(pp.user_id) +
    count(rp.user_id) + count(tp.user_id)                         AS completed_onboarding,
  count(DISTINCT j.homeowner_user_id) +
    count(DISTINCT j.assigned_tradesperson_id)                    AS has_activity
FROM users u
LEFT JOIN homeowner_profiles        hp ON hp.user_id = u.id
LEFT JOIN property_manager_profiles pp ON pp.user_id = u.id
LEFT JOIN realtor_profiles          rp ON rp.user_id = u.id
LEFT JOIN tradesperson_profiles     tp ON tp.user_id = u.id
LEFT JOIN jobs                      j  ON (j.homeowner_user_id = u.id OR j.assigned_tradesperson_id = u.id)
WHERE u.deleted_at IS NULL
GROUP BY u.role
ORDER BY signed_up DESC;


-- ═══════════════════════════════════════════════════════════════
-- 4. SINGLE-JOB LIFECYCLE — everything about one job
-- Replace :job_id with an actual UUID. Useful right after creating
-- the demo job — shows "this one thing you just did, here's every
-- record Postgres captured".
-- ═══════════════════════════════════════════════════════════════

-- Pick the most recent job (swap for a specific id if you prefer)
WITH latest AS (
  SELECT id FROM jobs ORDER BY created_at DESC LIMIT 1
)
SELECT
  j.id,
  j.title,
  j.category,
  j.severity,
  j.status,
  j.created_at,
  j.expires_at,
  j.budget_min,
  j.budget_max,
  u.full_name                                              AS customer,
  u.email                                                  AS customer_email,
  tp.full_name                                             AS assigned_tradesperson,
  (SELECT count(*) FROM quotes q WHERE q.job_id = j.id)    AS quote_count,
  (SELECT count(*) FROM job_photos p WHERE p.job_id = j.id) AS photo_count,
  (SELECT count(*) FROM reviews r  WHERE r.job_id = j.id)  AS review_count
FROM jobs j
JOIN latest l           ON l.id = j.id
JOIN users u            ON u.id = j.homeowner_user_id
LEFT JOIN users tp      ON tp.id = j.assigned_tradesperson_id;


-- Bonus: all quotes for the latest job
WITH latest AS (SELECT id FROM jobs ORDER BY created_at DESC LIMIT 1)
SELECT
  q.id,
  q.price,
  q.estimated_hours,
  q.status,
  q.created_at,
  q.accepted_at,
  tp.full_name AS tradesperson
FROM quotes q
JOIN latest l  ON l.id = q.job_id
JOIN users tp  ON tp.id = q.tradesperson_user_id
ORDER BY q.price ASC;


-- ═══════════════════════════════════════════════════════════════
-- 5. TRADESPERSON VIEW — what a tradesperson sees
-- All open jobs matching their primary trade (the job board),
-- plus their own quote + accept history. Replace :email.
-- ═══════════════════════════════════════════════════════════════

-- Open jobs visible on the job board for a given tradesperson's trade
-- (adjust category to whatever their primary_trade is)
SELECT
  j.id,
  j.title,
  j.category,
  j.severity,
  j.address,
  j.budget_min,
  j.budget_max,
  j.created_at,
  j.expires_at,
  (SELECT count(*) FROM quotes q WHERE q.job_id = j.id) AS current_quote_count
FROM jobs j
WHERE j.status = 'open'
  AND j.deleted_at IS NULL
  AND j.category = 'Plumbing'          -- swap for tradesperson's primary_trade
ORDER BY j.created_at DESC
LIMIT 10;


-- A specific tradesperson's quote history
SELECT
  q.id,
  j.title              AS job,
  q.price,
  q.status,
  q.created_at,
  q.accepted_at
FROM quotes q
JOIN jobs  j  ON j.id = q.job_id
JOIN users tp ON tp.id = q.tradesperson_user_id
WHERE tp.email = 'REPLACE_WITH_TRADESPERSON_EMAIL@example.com'
ORDER BY q.created_at DESC;


-- ═══════════════════════════════════════════════════════════════
-- 6. CUSTOMER VIEW — what a customer sees
-- All jobs they've posted with aggregated quote + status info.
-- Replace :email.
-- ═══════════════════════════════════════════════════════════════

SELECT
  j.title,
  j.category,
  j.status,
  j.created_at,
  (SELECT count(*) FROM quotes q WHERE q.job_id = j.id)                       AS quotes_received,
  (SELECT min(q.price) FROM quotes q WHERE q.job_id = j.id)                   AS lowest_quote,
  (SELECT max(q.price) FROM quotes q WHERE q.job_id = j.id)                   AS highest_quote,
  tp.full_name                                                                AS assigned_tradesperson
FROM jobs j
JOIN users u       ON u.id = j.homeowner_user_id
LEFT JOIN users tp ON tp.id = j.assigned_tradesperson_id
WHERE u.email = 'REPLACE_WITH_CUSTOMER_EMAIL@example.com'
  AND j.deleted_at IS NULL
ORDER BY j.created_at DESC;


-- ═══════════════════════════════════════════════════════════════
-- 7. MARKETPLACE DYNAMICS — supply and demand by trade
-- "Which categories have too few tradespeople?" "Where are jobs
-- going unquoted?" Powerful during a client call to talk about
-- unit economics.
-- ═══════════════════════════════════════════════════════════════

SELECT
  j.category,
  count(DISTINCT j.id)                                AS jobs_posted,
  count(DISTINCT CASE WHEN j.status = 'open' THEN j.id END)        AS currently_open,
  count(DISTINCT q.id)                                AS quotes_submitted,
  round(count(DISTINCT q.id)::numeric
        / nullif(count(DISTINCT j.id), 0), 2)         AS quotes_per_job,
  count(DISTINCT j.assigned_tradesperson_id)          AS tradespeople_who_won_work
FROM jobs j
LEFT JOIN quotes q ON q.job_id = j.id
WHERE j.deleted_at IS NULL
GROUP BY j.category
ORDER BY jobs_posted DESC;


-- ═══════════════════════════════════════════════════════════════
-- 8. QUOTE ACCEPTANCE FUNNEL — how quotes convert
-- What fraction of quotes become accepted? Time from submit to
-- accept? Talking point for "platform speed."
-- ═══════════════════════════════════════════════════════════════

SELECT
  count(*)                                                           AS total_quotes,
  count(*) FILTER (WHERE status = 'accepted')                        AS accepted,
  count(*) FILTER (WHERE status = 'rejected')                        AS rejected,
  count(*) FILTER (WHERE status = 'pending')                         AS pending,
  round(100.0 * count(*) FILTER (WHERE status = 'accepted')
               / nullif(count(*), 0), 1)                              AS accept_rate_pct,
  round(avg(EXTRACT(EPOCH FROM (accepted_at - created_at))/60)
          FILTER (WHERE status = 'accepted'), 1)                     AS avg_minutes_to_accept
FROM quotes;


-- ═══════════════════════════════════════════════════════════════
-- 9. PAYMENTS FLOW (Stripe-backed)
-- Shows the payment record for each completed job. Useful for
-- the "here's where the money moves" part of the narrative.
-- Note: actual payment state-of-record is Stripe; this table
-- mirrors the key fields for auditing and reporting.
-- ═══════════════════════════════════════════════════════════════

SELECT
  j.title                         AS job,
  j.status                        AS job_status,
  p.amount_cents / 100.0          AS amount_usd,
  p.status                        AS payment_status,
  p.created_at                    AS paid_at,
  cust.full_name                  AS customer,
  trade.full_name                 AS tradesperson
FROM payments p
JOIN jobs  j      ON j.id = p.job_id
JOIN users cust   ON cust.id = j.homeowner_user_id
LEFT JOIN users trade ON trade.id = j.assigned_tradesperson_id
ORDER BY p.created_at DESC
LIMIT 10;


-- ═══════════════════════════════════════════════════════════════
-- 10. AUDIT TRAIL — who did what
-- Every admin-relevant action is logged. Show the client this is
-- compliance-ready.
-- ═══════════════════════════════════════════════════════════════

SELECT
  a.created_at,
  u.email                              AS actor,
  a.action,
  a.resource_type,
  a.resource_id,
  a.ip_address,
  a.metadata
FROM audit_log a
LEFT JOIN users u ON u.id = a.actor_user_id
ORDER BY a.created_at DESC
LIMIT 20;


-- ═══════════════════════════════════════════════════════════════
-- 11. DATA INTEGRITY — orphan and drift checks
-- Run these as a "we can tell you the state is clean" reassurance.
-- All counts should be 0 in a healthy system.
-- ═══════════════════════════════════════════════════════════════

SELECT
  (SELECT count(*) FROM jobs   j WHERE j.homeowner_user_id NOT IN (SELECT id FROM users)) AS orphan_jobs,
  (SELECT count(*) FROM quotes q WHERE q.job_id             NOT IN (SELECT id FROM jobs))  AS orphan_quotes,
  (SELECT count(*) FROM quotes q WHERE q.tradesperson_user_id NOT IN (SELECT id FROM users)) AS orphan_quote_tradesperson,
  (SELECT count(*) FROM reviews r WHERE r.reviewer_id       NOT IN (SELECT id FROM users)) AS orphan_review_reviewer,
  (SELECT count(*) FROM jobs WHERE status = 'scheduled'
     AND assigned_tradesperson_id IS NULL)                                                 AS scheduled_without_tradesperson,
  (SELECT count(*) FROM quotes WHERE status = 'accepted' AND accepted_at IS NULL)          AS accepted_without_timestamp;


-- ═══════════════════════════════════════════════════════════════
-- 12. TRADESPERSON LEADERBOARD — revenue + reputation
-- Good for tradesperson-facing product talk: "here's what a
-- successful provider looks like on the platform."
-- ═══════════════════════════════════════════════════════════════

SELECT
  u.full_name,
  u.email,
  count(DISTINCT q.job_id) FILTER (WHERE q.status = 'accepted')  AS jobs_won,
  count(DISTINCT q.id)                                            AS quotes_submitted,
  round(avg(r.rating)::numeric, 2)                                AS avg_rating,
  count(r.id)                                                     AS review_count
FROM users u
LEFT JOIN quotes q  ON q.tradesperson_user_id = u.id
LEFT JOIN reviews r ON r.reviewee_id = u.id
WHERE u.role IN ('licensed_tradesperson', 'unlicensed_tradesperson')
  AND u.deleted_at IS NULL
GROUP BY u.id, u.full_name, u.email
ORDER BY jobs_won DESC, avg_rating DESC NULLS LAST
LIMIT 10;


-- ═══════════════════════════════════════════════════════════════
-- 13. HYPOTHETICAL REPORT — weekly revenue projection
-- The kind of number an investor wants to see. Uses accepted
-- quotes as the booking proxy; platform fee is 10% per CLAUDE.md.
-- ═══════════════════════════════════════════════════════════════

SELECT
  date_trunc('week', q.accepted_at)::date   AS week,
  count(*)                                   AS jobs_booked,
  sum(q.price)                               AS gross_booked,
  round(sum(q.price) * 0.10, 2)              AS platform_fee_10pct,
  round(sum(q.price) * 0.90, 2)              AS tradesperson_payout
FROM quotes q
WHERE q.status = 'accepted' AND q.accepted_at IS NOT NULL
GROUP BY date_trunc('week', q.accepted_at)
ORDER BY week DESC;
