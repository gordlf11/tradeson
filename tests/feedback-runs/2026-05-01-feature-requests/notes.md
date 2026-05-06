---
status: triage
created: 2026-05-01
feedback_source: user-testing call
slug: feature-requests-from-user-test
---

# Feature requests from user-testing call

These are the items from the 2026-05-01 user-testing call that aren't bugs — they need design + product decisions, not Playwright runs. Listed in rough priority order so you and Kevin can triage. Pair this with `tests/feedback-runs/2026-05-01-bugs-from-user-test/plan.md` for the bug fixes.

---

## A. ID Verification (tradesperson)

- **What the user said:** "ID Verification is needed."
- **Current state:** Onboarding has a "Government-issued ID" upload step in `LicensedTradespersonOnboarding` (Step 5 of 6) and `UnlicensedTradespersonOnboarding`. The upload field is rendered but not wired to Firebase Storage (see Launch Readiness > High Priority > File Uploads in CLAUDE.md — both `Government ID` and `Insurance certificate` are unchecked).
- **Why it's a feature, not a bug:** the user isn't reporting that an existing upload broke; they're saying we need an actual *verification* loop (admin reviews the uploaded ID, account is flagged Verified, badge appears on profile/quote cards).
- **Suggested split into work:**
  1. Wire Firebase Storage upload for the existing ID field (already a tracked item — Kevin)
  2. Admin Compliance Review screen reads the ID + insurance + license and approves/rejects (already partially built — confirm flow end-to-end)
  3. "Verified" badge surfaces on tradesperson profile cards in the Job Board quote view
  4. Optional: add Stripe Identity or Persona for automated ID verification (future, not v1)

## B. Tradesperson Dashboard analytics (PARTIALLY SHIPPED 2026-05-03)

- **What the user said:** "Average per job return. % breakdown of service times: Maintenance / Service / New Installs."
- **What Kevin shipped (commit 74e253b):** `Avg Per Job` metric + `Service Mix` breakdown on `TradespersonDashboard.tsx` with the four canonical buckets **Repair / Maintenance / New Install / Replacement**. Currently rendered with hardcoded mock percentages (lines 255-258 of `TradespersonDashboard.tsx`).
- **Decision (2026-05-03):** the four buckets are canonical. `JobCreation.tsx`'s `JOB_NATURE_OPTIONS` is now aligned to exactly these four values so the rollup will compute correctly once the data path is wired.
- **Remaining work:**
  1. Wire the Service Mix percentages to real data — `GROUP BY job_nature` over the tradesperson's completed jobs in the last 30/90 days.
  2. Wire `Avg Per Job` to `AVG(quotes.price) WHERE quotes.tradesperson_user_id = ? AND quotes.status='accepted'`.
  3. Long-tail: monthly trend chart once BigQuery is wired.

## C. Trade taxonomy — expanded category list, no "Other" (RESOLVED 2026-05-03)

- **What the user said:** "Something like this could be handy for odd jobs & services — servicing (other) — define the 'other' category."
- **Decision (2026-05-03):** **No "Other" category anywhere.** Instead, expand the trade list to cover the categories TaskRabbit and Thumbtack ship today, and define explicit sub-services inside each. Every job and every tradesperson capability maps to a known leaf in this tree.
- **References:** TaskRabbit Popular Projects (Furniture Assembly, Mount Art/Shelves, Mount a TV, Flat-Rate Move, Home & Apt Cleaning, Minor Plumbing Repairs, Electrical Help, Heavy Lifting); Thumbtack categories (Cleaners, Handymen, Landscapers, Movers, Plumbers, Electrical pros, Painters, HVAC pros, Contractors, Pool & spa, Roofing, Windows & doors, Concrete & masonry).

### Proposed canonical taxonomy

Top-level trades expand from 7 → 12. New entries marked with `+`. Each lives in `src/config/tradeTaxonomy.ts` so the list has one source of truth.

| Trade | Sub-services |
|---|---|
| Plumbing | Drain cleaning, Leak repair, Toilet repair, Faucet/sink, Water heater, New install |
| Electrical | Outlet/switch, Light fixture install, Ceiling fan, Panel work, EV charger, Troubleshooting |
| HVAC | Furnace repair, AC repair, Maintenance/tune-up, Duct cleaning, Thermostat install, New install |
| Handyman *(was "General Repairs")* | Furniture assembly, TV mounting, Picture/shelf hanging, Door repair, Drywall patch, Caulking, Curtain/blind install, Childproofing |
| Cleaning | Standard, Deep clean, Move-in/Move-out, Post-construction, Carpet cleaning, Window cleaning, Junk removal |
| Landscaping | Lawn mowing, Yard cleanup, Tree/shrub trimming, Garden design/planting, Mulching, Aeration/overseeding, Sod install |
| Snow Removal | Driveway, Sidewalks/walkways, Steps/entryways, Parking area, Roof, Salting/de-icing |
| `+` Painting | Interior, Exterior, Cabinet refinishing, Deck/fence stain, Touch-ups |
| `+` Roofing | Inspection, Leak repair, Shingle replacement, Gutter cleaning, Gutter repair |
| `+` Carpentry | Custom builds, Trim/molding, Decking, Framing, Cabinet install |
| `+` Concrete & Masonry | Concrete repair, Driveway/walkway, Brick/stone, Patio install |
| `+` Moving & Heavy Lifting | Furniture moving, Heavy lifting, Junk hauling, Donation pickup |

### Why no "Other"
- Forces both customers and tradespeople into vague free-text that breaks search, filters, ratings, and the matching algorithm (item G).
- TaskRabbit and Thumbtack don't use it for the same reason — they ship structured options.
- Demand for a missing category is captured via support requests; we add the category to the taxonomy when we see real volume, rather than carrying a permanent escape hatch.

### Implementation
The taxonomy is a single TypeScript file. Every place that today references categories — tradesperson onboarding (`primary_trades`), Job Creation (`category` step), Job Board filters, intake forms (item I), the matching logic (item G) — imports from this file. Adding a new sub-service later is a one-line change.

## D. "Speak before meeting" on quote acceptance

- **What the user said:** "When Accepting Quotes — asking to speak with them prior to meeting (call or messaging)."
- **Current state:** Accepting a quote goes straight to scheduling. The messaging modal exists but is opened separately, not prompted at this moment.
- **Suggested implementation:** after accepting a quote, show a non-blocking prompt: "Want to speak with [tradesperson name] before scheduling? [Message] [Call] [Skip — go to scheduling]". The Message button opens the existing MessagingModal pre-loaded with the thread. Call needs a phone number — surface from the tradesperson's profile.

## E. Property Manager — multi-property demand-side profile (RESOLVED 2026-05-03, REVISED)

- **What the user said:** "Property managers require: Reviews / Locations — area they service — what city do they provide / Tools & services that they provide — what tools do they."
- **Decision (2026-05-03):** PMs are **demand-side only** — they request services, they don't perform them. The original "Tools & services that they provide" line in the user-test notes was about giving PMs visibility into what *tradespeople* bring to a job, not declaring PM-owned tools. PMs are essentially homeowners at scale: more properties, same role.

### What to build
1. **Multi-property capture** — PM onboarding currently collects one address. Add a "Properties you manage" step that lets the PM add N properties (address + city + zip + property type). Stored as `pm_properties` rows linked to the user, not as a single `address` blob.
2. **Service-area summary** — derived from the union of cities/zips across their managed properties. Used to scope job visibility (a PM in Toronto doesn't see jobs from Vancouver tradespeople by default).
3. **Portfolio dashboard** — group jobs by property. The existing CustomerDashboard becomes a per-property tab list when `userRole === 'property-manager'`.
4. **Reviews** — PMs leave + read reviews on tradespeople using the same flow as homeowners. No special PM-side review surface needed.
5. **Tradesperson visibility into PM** — when a PM posts a job, the tradesperson sees "Posted by [PM Name] (Property Manager)" plus the property address. No PM public profile, no PM ratings.

### What NOT to build
- **No `tools` or `offered_services` on PM profiles.** PMs aren't in the matcher pool.
- **No "do you offer services in-house?" branch.** If a PM company has an in-house plumber, that plumber should onboard separately as a tradesperson (under the PM org or as an individual). One-role-per-account stays the model unless item F (multi-role) lands.
- **No public PM profile page.** PMs don't get reviewed; they're the customer.

### Why this matters
The PM in the user test described coordinating repairs across many properties. The pain point is "I'm managing 10 doors and need a different tradesperson for each property's emergency." The fix is multi-property capture + portfolio view, not turning the PM into a supplier. Treating PMs as supply confused both sides — and would let unverified PMs bid on jobs without going through the licensed-tradesperson compliance flow.

## F. Multi-role accounts — basic version SHIPPED 2026-05-03, refine post-launch

- **What the user said:** "Option to sign up as multiple user roles with the same email."
- **What Kevin shipped (commit 74e253b):** "My Roles" section in Settings showing the active role, plus an "Add Another Role" picker and a "Switch" button to toggle between roles. Currently localStorage-driven.
- **Decision (2026-05-03):** treat the shipped UX as the v1 contract. Don't rip it out. Refinements deferred until post-launch:
  1. Backend persistence — add `users.roles text[]` column (default `[users.role]`); each role still has its own onboarding completion gate.
  2. Per-role profile data isolation — when switching roles, dashboards/screens read from the correct role-scoped profile (homeowner_profiles vs tradesperson_profiles vs property_manager_profiles).
  3. Analytics — every event tagged with `active_role` so funnel reports stay clean across role switches.
- **Risk to flag:** the localStorage-only model means switching roles doesn't survive a re-login on another device. Acceptable for beta; document in onboarding docs and revisit in v1.1.

## G. Job-match recommendations — logic-based v1, ML-ready storage (RESOLVED 2026-05-03, REVISED)

- **What the user said:** "A job match that can be made for you — how can we improve or revamp the job match."
- **Decision (2026-05-03):** Two-track approach. **Track 1 (now):** ship a deterministic logic-based recommender weighing **skills, distance, ratings**. **Track 2 (later):** capture every match decision + outcome as event data so an ML model can be trained the moment we have enough volume. Start collecting data on day one even though the model won't run for months.
- **Revision note (2026-05-03):** Tools dropped as a profile-level signal. Kevin shipped a per-quote "tools I have / client provides" checklist on `QuoteSubmissionModal` (commit 74e253b). That's the canonical place tools live — at the quote layer, not the user layer. Match scoring weights renormalized to compensate.

### Track 1 — the logic-based recommender (ships in v1)

Two views, same scoring engine:

- **Tradesperson view ("Jobs for you")** on Job Board — instead of every open job sorted by date, show jobs ranked by match score for *this* tradesperson.
- **Customer view ("Recommended pros")** on the Quote Comparison screen — when no quotes have arrived yet (or alongside the ones that have), show the top 5 tradespeople ranked for *this* job.

**Scoring formula** (weighted sum, 0–100):

| Signal | Weight | What it computes |
|---|---|---|
| Skill match | 50% | Does the tradesperson have the job's sub-service in their `offered_services`? Exact leaf match = 100; same trade, different sub-service = 60; no match = 0. Excludes from results below threshold. |
| Distance | 25% | Linear decay inside the tradesperson's `service_radius_miles`. At 0 mi = 100, at radius edge = 0, beyond = excluded. |
| Ratings | 25% | `avg_rating × log10(num_reviews + 10) / log10(110)` — Bayesian-flavored to avoid 5-star-from-1-review winning over 4.8-from-100-reviews. Tradespeople with 0 reviews get a neutral 60 so they're not frozen out. |

Computed at request time on the API (cheap — no PG full-table scans, just one query per request). Cache per (job_id, tradesperson_id) for 5 min in Redis or in-memory.

**Tools as a future signal:** the per-quote checklist Kevin shipped writes to a `quote.tool_inventory` JSONB blob (will need to be added to the `quotes` schema). Once enough quotes exist, we can derive a tradesperson-level tool footprint by aggregating their submitted quotes — this becomes a derived feature for the ML model in Track 2 without making the user fill in a separate "what tools do you own" form.

### Track 2 — the data foundation for ML

New table `match_events`:

| column | purpose |
|---|---|
| id, created_at | std |
| job_id | the job being matched |
| tradesperson_id | the candidate |
| event_type | `shown`, `viewed`, `quoted`, `accepted`, `rejected`, `messaged` |
| score | the v1 logic score at time of event |
| context | JSONB — snapshot of the signals (distance_mi, tools_match_pct, etc.) so we can replay |

Cloud Run emits a Pub/Sub event on every write (matches the existing architecture). BigQuery sink (when wired per CLAUDE.md item) gives us a clean training dataset: features + outcomes, labeled. No app changes needed when we want to train.

**Why store this from day one:** by the time we have enough volume to train (~10k accepted jobs), we'll have a year of labeled data. If we wait to start logging until we decide to train, we lose that year.

### Implementation plan
1. **Schema** — `users.offered_services text[]` (sub-service leaves from item C), `quotes.tool_inventory jsonb DEFAULT '{}'` (Kevin's per-quote checklist target), `match_events` table.
2. **Tradesperson onboarding** — replace flat `primary_trades` with the trade → sub-services taxonomy from item C. (No separate tools step — tools captured per-quote.)
3. **API route** — `GET /api/v1/jobs/:id/recommended-tradespeople` returns the scored top N.
4. **API route** — `GET /api/v1/tradespeople/me/recommended-jobs` returns the scored job feed.
5. **Event emission** — every Job Board view + every quote submission writes to `match_events`.
6. **UI** — replace Job Board's default sort with the recommended sort for tradespeople; add "Recommended for you" carousel on the customer Quote Comparison screen.

---

## H. Positive feedback (capture, don't action)

- **What the user said:** "Enjoyed being removed from the situation — if someone was not home and needed a repair this is a great tool."
- **Why it matters:** this validates a core thesis — TradesOn's value is in *coordinating* a repair without the customer being physically present. Worth amplifying in marketing copy and the Job Creation flow ("Won't be home? We'll handle it"). Tag for the marketing site.

---

## I. Category-specific intake questionnaires (UPDATED 2026-05-03 — no "Other")

The customer-test partner spec'd three full intake forms (Cleaning, Snow Removal, Landscaping). The intake's "service type" question pulls directly from the trade taxonomy in item C, so the options match what the matching algorithm in item G already knows about. **No "Other" anywhere** — replaced with explicit options.

### Spec — what each questionnaire asks

**Cleaning** (sub-service options match item C taxonomy)
- *What type of cleaning do you need?* (radio, required) — Standard / Deep clean / Move-in or Move-out / Post-construction / Carpet cleaning / Window cleaning / Junk removal
- *Approximate square footage* (number, required)
- *How many bedrooms?* (number)
- *How many bathrooms?* (number)
- *What areas need to be cleaned?* (checkbox group, required) — Kitchen / Bathrooms / Bedrooms / Living areas / Laundry room / Basement / Garage
- *Please describe what needs to be done* (long text, required)
- *Special requirements or add-ons* (long text)

**Snow Removal**
- *What areas need snow removed?* (checkbox group, required) — Driveway / Sidewalks/walkways / Steps/entryways / Parking area / Roof / Patio or deck / Mailbox or curb access
- *Approximate size of the area* (text, required) — driveway length, # cars, or sq ft
- *How deep is the snow currently?* (text) — e.g. 2 in, 6+ in, drifting
- *Do you require salting / de-icing?* (yes/no, required)
- *Specific requirements* (long text)

**Landscaping** (sub-service options match item C taxonomy)
- *What type of landscaping service?* (radio, required) — Lawn mowing / Yard cleanup / Tree or shrub trimming / Garden design or planting / Mulching / Aeration or overseeding / Sod install
- *Approximate property size* (text)
- *What areas need work?* (checkbox group) — Front yard / Backyard / Side yard / Entire property
- *Current condition of the yard?* (radio) — Well-maintained / Overgrown / Needs full cleanup / Recently done, just maintenance
- *Do you need removal of waste / debris?* (yes/no)
- *Please describe what needs to be done* (long text)

### Why this matters
Right now Job Creation captures only generic title + description + severity + photos. A cleaner can't quote without sq ft; a snow removal pro can't quote without depth + salting; a landscaper can't quote without condition + waste-removal scope. Forces tradespeople to either guess (wrong quotes → bad UX) or ping the customer in messaging before quoting (slow). Structured intake is the cheapest way to lift quote quality and speed.

### Implementation plan — four phases

**Phase 1 — schema + types (Larry, ~1 day)**
1. Add `intake_answers JSONB DEFAULT '{}'` column to Postgres `jobs` table (single migration).
2. Add a TypeScript discriminated union `CategoryIntake` in `src/types/jobIntake.ts` with three variants (`CleaningIntake`, `SnowRemovalIntake`, `LandscapingIntake`) — each variant matches the spec above. JSONB stays loosely typed at the DB layer; the union is enforced at the client + API boundary.
3. Update `api.createJob` payload type to optionally include `intake_answers`.
4. No backwards-compat work needed — existing jobs just have `{}`.

**Phase 2 — Job Creation UI (Kevin, ~2 days)**
1. New reusable component `src/components/intake/CategoryIntake.tsx` that takes `{ category, value, onChange }` and renders the right form. Three sibling components inside it: `CleaningForm`, `SnowRemovalForm`, `LandscapingForm`.
2. Field primitives: reuse existing `Input` for text/number, build small `RadioGroup` and `CheckboxGroup` if not already present in `src/components/ui/`. No "Other" escape hatch — every option list is exhaustive (per item C decision).
3. Slot it into `JobCreation.tsx` as a new step that activates **only** when the selected trade category is one of the three spec'd ones. Other trades skip the step entirely (so Plumbing / Electrical / HVAC / General Repairs aren't blocked while we wait for their specs).
4. Validation: required-field markers + a "needs answer" gate on Continue. Mirror the existing Job Creation step pattern.

**Phase 3 — display on Job Board + Quote Submission (Kevin, ~1 day)**
1. Job detail card on `JobBoardEnhanced.tsx`: when `intake_answers` is non-empty, render a "Job Details" section above the description showing each field as a label/value pair. Cleaner than raw JSON.
2. `QuoteSubmissionModal`: surface the same intake summary at the top so the tradesperson has the facts they need without re-opening the job.

**Phase 4 — AI integration (Larry, blocked on B/I)**
1. When the Vertex AI / Gemini job-analysis endpoint is wired (item B in CLAUDE.md Launch Readiness, "Important — AI Integration"), include the structured `intake_answers` in the prompt rather than just the free-text description. Should materially improve the cost/hours estimate.

### Open product questions before building
1. **Non-spec'd categories.** The other 9 trades (Plumbing, Electrical, HVAC, Handyman, Painting, Roofing, Carpentry, Concrete & Masonry, Moving) need intake specs too — but Job Creation should still work for them in the meantime. Plan: those categories skip the intake step (just title + description + photos) until their specs land. Agree?
2. **Photos.** Should each intake have its own photo prompts ("photo of yard" for landscaping, "photo of driveway" for snow), or keep the existing generic photo step? Recommend keeping generic for now — it's an extra step per category otherwise.
3. **Customer-side editability.** If a customer edits the job after a quote is submitted, do quotes get invalidated? (Likely yes — same rule should apply to intake edits.)
4. **Tradesperson side note.** Should the tradesperson see who answered which fields, or treat it as one customer voice? Recommend: don't surface authorship.

### Suggested rollout
Ship Phase 1 + Phase 2 + Phase 3 together as one PR per category. Cleaning first (most user-test demand), then Snow, then Landscaping. Each PR is small enough to land in a single day's work, and the rollout pattern lets us learn from the first launch before locking the other two.

---

## J. Unified implementation roadmap (REVISED 2026-05-05)

Items C, E, G, I are interlocked: the matching algorithm (G) needs the taxonomy (C) and the offered-services profile field; the intake forms (I) reference the same taxonomy; PM multi-property (E) is independent. The roadmap below is the snapshot after the 2026-05-04 production push.

**Reality check (2026-05-05):** Two big production drops have happened since this section was first written.

- **2026-05-03 (74e253b)** — Kevin: Cleaning / Snow / Landscaping intake forms, tools-on-quote checklist, multi-role basic UI, Service Mix dashboard buckets.
- **2026-05-04 (d026489)** — Kevin: Trade taxonomy file, tradesperson sub-services picker, full schema migration, payments + reviews routes, FCM client wiring, job-status PATCH with auto-Stripe-payout, support tickets Firestore rules.

The roadmap below reflects what's still left after both drops.

### Sequencing — what's done vs what's left

**PR 1 — Trade taxonomy as code (SHIPPED 2026-05-04, commit d026489)** — *done*
- `src/config/tradeTaxonomy.ts` exports 12 trades × N sub-services + `findTrade()` helper.
- "Handyman" replaced "General Repairs" (open question #1 confirmed).
- 5 new trades added (Painting, Roofing, Carpentry, Concrete & Masonry, Moving).
- `JobCreation.tsx` and both tradesperson onboardings now derive their lists from this file via `TRADES.map(...)` and `findTrade('cleaning')!.subServices.map(...)`.

**PR 2 — Schema migration (SHIPPED 2026-05-04, commit d026489)** — *done*
- Added `users.offered_services text[]`, `jobs.intake_answers jsonb`, `jobs.sub_service text`, `quotes.tool_inventory jsonb`, `match_events` table, plus indexes.
- Auto-migration: existing tradespeople's flat `primary_trades` expanded to all sub-services in that trade and written to `offered_services` (open question #3 confirmed).
- Made `compliance_documents.document_url` and `expiration_date` nullable so docs can be uploaded post-onboarding via Insurance Upload.
- All wired into `runMigrations()` in `api/src/index.ts` so Cloud Run boot converges live DB.

**PR 3 — Tradesperson onboarding sub-services picker (SHIPPED 2026-05-04, commit d026489)** — *done*
- Both `LicensedTradespersonOnboarding` and `UnlicensedTradespersonOnboarding` now use a two-tier picker (trade → sub-services).
- Writes both `primary_trades` (legacy) and `offered_services` (new).
- Onboarding API routes wrapped in PG transactions with ROLLBACK so partial onboarding never leaves orphan rows.

**PR 4 — Job Creation intake forms (SHIPPED 2026-05-03, cleaned up 2026-05-04, commit c99a131)** — *done*
- Forms shipped 74e253b; "Other" removed in c99a131.
- Currently sending the flat fields (`cleaning_type`, `snow_areas`, etc.) to the API. PR 5 below covers the migration to a single `intake_answers` JSONB payload.

**PR 5 — Send intake_answers + sub_service from JobCreation; render on Job Board (Kevin, ~½ day)** — *not yet started*
- Today the form sends `cleaning_type`, `snow_areas`, `landscaping_type`, etc. as separate fields.
- Now that `jobs.intake_answers` exists in the schema, JobCreation should pack the per-trade fields into one JSONB blob and send it as `intake_answers`. Also send `sub_service` (the leaf category — `cleaningType`, `landscapingType`, or first item of `snowAreas`).
- `JobBoardEnhanced.tsx`: render `intake_answers` as a structured "Job Details" block on each card.
- `QuoteSubmissionModal`: surface the same intake summary at the top, above Kevin's existing tools checklist.

**PR 6 — Logic-based matcher + event emission (Larry, ~2 days)** — *not yet started*
- New API routes: `GET /jobs/:id/recommended-tradespeople`, `GET /tradespeople/me/recommended-jobs`.
- Scoring engine per item G revised spec (skills 50 / distance 25 / ratings 25). Score field NOT exposed in API response (open question #4 — hide score).
- `match_events` row written on every Job Board view (`shown` event) and on every quote action.
- UI: tradesperson Job Board defaults to "Recommended for you" sort; customer Quote Comparison gets a "Recommended pros" panel.

**PR 7 — PM multi-property capture + portfolio view (Kevin + Larry, ~1.5 days)** — *not yet started*
- `managed_properties` table already exists in the original schema (per migration.sql line 109). PR 7 just needs to wire the UI.
- `PropertyManagerOnboarding`: replace the single-address step with a "Properties you manage" step (add/remove rows, address + city + zip + type per row).
- `CustomerDashboard` for PMs: group jobs by property, with a property selector at the top. Job Creation pre-fills the property address from a dropdown.
- `users.address` stays as the PM's billing/HQ address (separate from managed properties).

### Bonus shipped in d026489 (outside Section J scope, knocks out CLAUDE.md launch-readiness items)

- ✅ **`api/src/routes/payments.ts`** — `GET /api/v1/payments/me` (CLAUDE.md launch-readiness item: Payment History)
- ✅ **`api/src/routes/reviews.ts`** — `POST /api/v1/reviews` + `GET /api/v1/reviews/:tradespersonId`; updates rolling rating on `tradesperson_profiles` (CLAUDE.md item: Reviews migration to Postgres)
- ✅ **`api/src/routes/jobs.ts` PATCH** — `/api/v1/jobs/:id/status` auto-fires `/stripe/platform-payout` on `completed` transition (CLAUDE.md item: Payout trigger on job completion)
- ✅ **FCM token storage** — `src/contexts/AuthContext.tsx` writes `fcmToken` to Firestore on login + foreground `onMessage` handler with in-app notification banner (CLAUDE.md item: FCM Real-Time UX, ~50% complete; still missing Pub/Sub fan-out from Cloud Run writes)
- ✅ **`firebase/firestore.rules`** — `support_tickets` collection rules added

### Total sizing remaining
~3 days of focused work: PR 5 (~½ day, Kevin), PR 6 (~2 days, Larry), PR 7 (~1.5 days, Kevin + Larry).

### Critical dependencies
- PR 1, 2, 3 are all done — nothing blocks PR 5, 6, or 7 anymore.
- PR 6 *can* ship before PR 5 (matcher works on existing job data) but ranking quality stays low until intake_answers land via PR 5.
- PR 7 (PM multi-property capture) is independent — ships any time.

### Open questions — RESOLVED 2026-05-04 (Kevin)

1. **Naming**: ✅ **"Handyman" confirmed.** Replaces "General Repairs" everywhere in taxonomy, onboarding, and UI copy.
2. **Snow Removal as seasonal**: ✅ **Keep year-round — no seasonal hiding.** New joiners signing up in May should see Snow Removal so they understand the platform's full service offering. Show in Job Creation always.
3. **Existing tradespeople**: ✅ **Auto-migrate confirmed.** When the PR 2 migration runs, expand each tradesperson's flat `primary_trades` entry to all sub-services in that trade and write to `offered_services`. They can prune unwanted sub-services in Settings post-migration. Keeps existing accounts visible in match results the moment PR 6 ships.
4. **Match score visibility**: ✅ **Hidden — remove the score % entirely.** Don't show the number to tradespeople or customers. Surface ranking order only. No UI work needed for this; just don't expose the score field in the API response.

---

## K. Larry's immediate backlog (queued by Kevin 2026-05-05)

Items Kevin left for Larry on the live deploy. Listed in dependency order.

### K-A — Set Kevin's admin claim + smoke admin metrics
- `node scripts/setAdminClaim.mjs kevinbradfo@gmail.com`
- Kevin signs out + back in on prod to refresh his token
- Smoke: load `/dashboard/admin` → click Metrics → confirm 200 from `/api/v1/admin/metrics`
- **Status:** in-flight this session

### K-B — Firestore rules deploy (`support_tickets`)
- `firebase deploy --only firestore:rules`
- Activates Kevin's `support_tickets` rules so users can create their own tickets and admins can read/update.
- **Status:** in-flight this session

### K-C — Cloud SQL schema migration (unblocks PR 6 + PR 7)
- The migration in `api/src/schema/migration.sql` is fully idempotent. Run it once against the live Cloud SQL instance:
  ```
  psql $DATABASE_URL -f api/src/schema/migration.sql
  ```
- Or rely on `runMigrations()` at next Cloud Run boot — it mirrors the same statements inline (commits `5667df5` + `d026489`). Restarting the Cloud Run service is enough.
- After this lands: PR 6 (logic-based matcher) and PR 7 (PM multi-property) have everything they need (`users.offered_services`, `jobs.intake_answers`, `jobs.sub_service`, `quotes.tool_inventory`, `match_events`, `pm_properties` already present in original schema).
- **Status:** waiting on Larry's manual psql run.

### K-D — FCM server-side (Pub/Sub publisher + Cloud Function fan-out)
The client side is already shipped (`d026489` — token storage, `onMessage` handler, in-app banner). What's missing is the server side that actually delivers pushes when something happens.

Two pieces:
1. **Pub/Sub publisher in Cloud Run** — small helper in `api/src/services/pubsub.ts`. Each route that should fan out (job created, quote submitted, quote accepted, job status changed, message sent) calls `publish('quote.submitted', { targetUserId, title, body, data })`. Helper is best-effort: if publish fails we log + continue (don't block the user-facing write).
2. **Cloud Function fan-out** — separate Cloud Function (`functions/fcm-fanout/`) that subscribes to the Pub/Sub topic, pulls the recipient's FCM token from Firestore (`users/{uid}.fcmToken`), and sends via `admin.messaging().send()`.

Pub/Sub event shape (per CLAUDE.md):
```json
{
  "event": "quote.submitted",
  "targetUserId": "<firebase_uid>",
  "title": "New Quote Received",
  "body": "Carlos Rivera submitted a quote for Kitchen Faucet Repair",
  "data": { "jobId": "...", "quoteId": "..." }
}
```

GCP wiring needed (Larry runs manually since I can't reach gcloud from here):
```
gcloud pubsub topics create tradeson-events
gcloud functions deploy fcm-fanout \
  --gen2 --region us-central1 --runtime nodejs20 \
  --entry-point fanout \
  --trigger-topic tradeson-events \
  --service-account=tradeson-fcm@tradeson-491518.iam.gserviceaccount.com
```

Cloud Run service account needs `roles/pubsub.publisher` on the project.

- **Status:** code drafted this session, deployment pending.

---

## Triage prompts for the next session

- **Bug fixes (separate plan):** shipped 2026-05-01 — see implemented plan
- **A (ID Verification):** which slice ships first — upload wiring, or full verified-badge loop?
- **B (Dashboard analytics):** **partially shipped 2026-05-03** — UI live with mock %; just needs the data wired in PR 6 (or a small dashboard data PR).
- **C (Trade taxonomy):** **resolved 2026-05-04** — 12 trades, no "Other", spec'd in this doc; JobCreation now matches.
- **D (Speak before meeting):** approve as-is? Cheap to ship.
- **E (PM profile):** **resolved 2026-05-03 (revised)** — PMs are demand-side only, multi-property capture + portfolio view, see PR 7 in section J.
- **F (Multi-role):** **basic version shipped 2026-05-03** — refinements (backend persistence, per-role profile isolation) deferred to v1.1.
- **G (Job match):** **resolved 2026-05-03 (revised 2026-05-04)** — logic-based matcher with skills/distance/ratings (tools dropped — captured per-quote per Kevin's UX), see PR 6 in section J.
- **I (Category intakes):** **shipped 2026-05-03** by Kevin; cleaned up 2026-05-04. Still TODO: switch payload to `intake_answers` JSONB once PR 2 schema lands.
- **J (Implementation roadmap):** approve the 5-PR remaining sequence + the four open questions at the end of section J? PR 1 is non-blocking and can start immediately.

These need answers before any of them become Playwright stories.
