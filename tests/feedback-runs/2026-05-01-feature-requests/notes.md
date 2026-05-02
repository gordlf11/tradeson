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

## B. Tradesperson Dashboard analytics

- **What the user said:** "Average per job return. % breakdown of service times: Maintenance / Service / New Installs."
- **Current state:** Tradesperson Dashboard shows earnings and active jobs but no analytics breakdown.
- **Why it's a feature:** new visualization + new data classification. Each job needs a `service_type` tag (Maintenance / Service / New Install / Other) which doesn't exist today on the `jobs` schema.
- **Suggested split:**
  1. Add `service_type` enum to Postgres `jobs` schema + onboarding question on Job Creation
  2. Add `Avg per job` + `Service mix` cards to Tradesperson Dashboard (read from existing accepted-jobs query, group by `service_type`)
  3. Long-tail: monthly trend chart once BigQuery is wired

## C. "Other" service category — define + clarify

- **What the user said:** "Something like this could be handy for odd jobs & services — servicing (other) — define the 'other' category."
- **Current state:** The full services list is documented in CLAUDE.md as: Plumbing, Electrical, HVAC, General Repairs, Cleaning, Landscaping, Snow Removal. No "Other" category exists.
- **Question for the team:** is "Other" a real category for the customer (free-text job submission) or a tradesperson capability flag ("I take odd jobs")? These are different products.
- **Suggested first step:** add free-text "Additional services" support to the Job Creation flow (currently absent) before adding an "Other" category — it's lower-cost and tests demand.

## D. "Speak before meeting" on quote acceptance

- **What the user said:** "When Accepting Quotes — asking to speak with them prior to meeting (call or messaging)."
- **Current state:** Accepting a quote goes straight to scheduling. The messaging modal exists but is opened separately, not prompted at this moment.
- **Suggested implementation:** after accepting a quote, show a non-blocking prompt: "Want to speak with [tradesperson name] before scheduling? [Message] [Call] [Skip — go to scheduling]". The Message button opens the existing MessagingModal pre-loaded with the thread. Call needs a phone number — surface from the tradesperson's profile.

## E. Property Manager profile fields (Reviews + Locations + Tools/Services)

- **What the user said:** "Property managers require: Reviews / Locations — area they service — what city do they provide / Tools & services that they provide — what tools do they."
- **Current state:** PM onboarding (`PropertyManagerOnboarding`) collects basic info but not service area or capabilities. PMs don't currently have a public profile.
- **Why it's interesting:** this implies PMs are a *supply-side* persona too — they offer services, not just consume them. That's a different product surface from how PMs are positioned today (consumers of the marketplace, like homeowners but at scale).
- **Suggested first step:** confirm with the user-test participant whether PMs are *posting jobs* or *bidding on jobs* in their mental model. The answer changes everything about this work.

## F. Multi-role accounts (one email, multiple roles)

- **What the user said:** "Option to sign up as multiple user roles with the same email."
- **Current state:** Each Firebase Auth user has one role (set in localStorage + Postgres `users.role`). Switching requires creating a new account with a different email.
- **Why it's significant:** this is a substantial data-model change. `users.role` becomes `users.roles[]` in Postgres; UI needs a role-switcher in TopNav; analytics and dashboards need to know which role is active in the current session.
- **Suggested implementation:** add `users.roles text[]` column. Default existing users to `[role]`. UI: add a role-switcher dropdown to TopNav that updates a session-only `activeRole` in localStorage. Onboarding flows are run once per role (so a user can be both homeowner and PM, but each role's onboarding completes independently).

## G. Job-match algorithm — improve / revamp

- **What the user said:** "A job match that can be made for you — how can we improve or revamp the job match."
- **Current state:** Job Board filters by trade category + distance. No active "matching" beyond filters. Vertex AI is mocked in JobCreation but not wired.
- **Why it's a feature, not a bug:** there is no existing matching algorithm to fix — the user is asking us to build one.
- **Suggested first step:** define what "match" means here. Options:
  - **Customer side:** "here are the 3 best tradespeople for this job" — needs ranking on rating, distance, response rate, price history
  - **Tradesperson side:** "here are jobs that match your trades + radius + availability" — current job board already does the first two; "availability" needs an availability-calendar feature first
- This is the largest item in the list. Don't start until D, E, F have been triaged — the answers shape what "match" means.

---

## H. Positive feedback (capture, don't action)

- **What the user said:** "Enjoyed being removed from the situation — if someone was not home and needed a repair this is a great tool."
- **Why it matters:** this validates a core thesis — TradesOn's value is in *coordinating* a repair without the customer being physically present. Worth amplifying in marketing copy and the Job Creation flow ("Won't be home? We'll handle it"). Tag for the marketing site.

---

## Triage prompts for the next session

- **Bug fixes (separate plan):** ready to approve and implement now — no design questions
- **A (ID Verification):** which slice ships first — upload wiring, or full verified-badge loop?
- **B (Dashboard analytics):** is this v1 or post-launch? Needs schema change.
- **C ("Other" category):** what is "Other" — customer free-text or tradesperson flag?
- **D (Speak before meeting):** approve as-is? Cheap to ship.
- **E (PM profile):** are PMs supply or demand side?
- **F (Multi-role):** v1 or post-launch? Affects auth + every dashboard.
- **G (Job match):** park until D, E, F land.

These need answers before any of them become Playwright stories.
