---
name: test-feedback
description: Turn user-testing feedback into Playwright stories, run them headless against TradesOn, propose a fix plan, and (after approval) implement the fix and re-verify. Use when the user shares feedback, a bug report, or a UX complaint.
---

# /test-feedback — TradesOn user-testing loop

This skill closes the loop from user feedback → tested fix. It runs in three phases gated by an explicit approval step.

**Phase 1 — Investigate** (always runs)
1. Bootstrap (idempotent, see below).
2. Generate test stories from the feedback.
3. Run them headless via Playwright MCP.
4. Capture screenshots + console + network errors.
5. Write a plan file as `status: draft`.

**Phase 2 — Wait for approval**
- Show the plan path to the user. Stop. Do **not** edit source code yet.
- The user reviews the plan, edits it if they want to redirect, and flips `status:` to `approved`.

**Phase 3 — Implement** (only when re-invoked with an `approved` plan)
- Apply the proposed code changes exactly as the plan describes them.
- Re-run the failing stories to confirm green.
- Flip `status:` to `implemented`. Add a "Verification" section with the re-run results.

---

## Inputs

The skill accepts either:
- **A feedback string**: `/test-feedback "users say the modal X button doesn't always close it"`
- **A plan file path**: `/test-feedback tests/feedback-runs/2026-05-01-modal-close/plan.md`
  — used when re-invoking after approval, or when iterating on a draft.

If no input is given, ask the user for the feedback and what role/persona it's about (homeowner / tradesperson / property manager).

---

## Bootstrap (auto, idempotent — runs at the start of every invocation)

Goal: never make the partner do separate setup steps. The skill detects what's missing and fixes it before doing real work.

1. **Dev server check.** GET `http://localhost:5173`. If unreachable, tell the user to run `npm run dev` in another terminal and stop. Do not auto-start it (zombie risk).
2. **`.env.test` check.** If `.env.test` is missing, copy `.env.test.example`, prompt the user to fill in passwords, and stop.
3. **Test users check.** For each of the three test users in `.env.test`, attempt a login through the Playwright MCP browser:
   - **Login succeeds + has profile** → user ready, continue.
   - **Login fails (`auth/user-not-found` or `auth/invalid-credential`)** → run the signup flow through the UI for that role, then run the role's onboarding flow to completion. This creates both the Firebase Auth user and the Postgres profile via the real app code path — no separate seed script.
   - **Login succeeds but profile is missing** → run the onboarding flow.
4. **Save bootstrap fingerprint.** Write `tests/feedback-runs/.bootstrap.json` with the email + last-verified timestamp for each user. On subsequent runs, skip the bootstrap if the fingerprint is fresh (< 24h) and the dev server is up.

---

## Phase 1 — Investigate

### Step 1. Generate test stories
- Read the feedback text.
- Decide which test user(s) the stories run as (most UX feedback is single-role; payment/messaging stories are often two-role).
- Write 1–4 stories in Given/When/Then form. Each story must be independently runnable.
- Stories are NOT yet committed as code — they live in the plan file as text. The Playwright MCP browser executes them step-by-step.

### Step 2. Run the stories via Playwright MCP
For each story:
1. Navigate to the relevant route.
2. Log in as the right test user (fresh login each run — `--isolated` MCP).
3. Execute the story actions through MCP browser tools (click, fill, etc.).
4. Take a screenshot at the assertion point. Save to `tests/feedback-runs/<slug>/screens/story-N.png`.
5. Capture any console errors and network failures.
6. Mark PASS if the "Then" condition holds, FAIL otherwise.

### Step 3. Write the plan file
- Create `tests/feedback-runs/<YYYY-MM-DD>-<slug>/plan.md` from `tests/feedback-runs/TEMPLATE.md`.
- Fill in: original feedback, derived stories, test results table, expected behavior, proposed code changes, blast radius.
- Set `status: draft`.

### Step 4. Stop and report
Tell the user:
- The plan path
- The number of stories that passed/failed
- The proposed change count
- How to approve (edit `status:` to `approved`, then re-invoke `/test-feedback <plan-path>`)

**Do not modify source code in Phase 1. Ever.**

---

## Phase 2 — Wait for approval

This phase is human-only. The skill does nothing until re-invoked.

If the user re-invokes with a plan path whose `status:` is still `draft`, treat it as "regenerate this plan" — re-run the stories and overwrite the test-results section, but preserve any edits the user made to the proposed-changes section.

---

## Phase 3 — Implement (only when `status: approved`)

1. Read the plan's "Proposed code changes" section. Each bullet maps to a file/line + change description.
2. Apply the changes via Edit (not Write — preserves surrounding code).
3. Re-run the failing stories from Phase 1 against the modified app. The dev server hot-reloads, so no rebuild needed.
4. If all previously-failing stories now pass, append a **"Verification"** section to the plan with:
   - Re-run timestamp
   - New screenshots (`./screens/verify-N.png`)
   - Pass/fail per story
5. Flip `status:` to `implemented`.
6. If any story still fails, leave `status: approved` and report which stories failed plus what the actual behavior was. Do not retry blindly.

---

## Conventions

- **Slug**: lowercase kebab-case, derived from the feedback's main noun-phrase. Max 6 words. E.g. `modal-close-tap-target`.
- **Screenshots**: full-page PNG, named `story-N.png` in Phase 1, `verify-N.png` in Phase 3.
- **Test users**: never use the demo mode for real test stories. Demo mode bypasses `RequireAuth` and skips API calls — it cannot exercise auth/data bugs. Use the seeded `@tradeson.test` accounts.
- **Analytics filter**: every analytics consumer should exclude `email LIKE '%@tradeson.test'`. This is the single source of truth for "is this a test user."
- **Don't commit `tests/feedback-runs/<run>/screens/`** — already gitignored. The plan markdown itself IS committed (it's the audit trail for what was tested and what was fixed).
- **Concurrent runs**: don't run two `/test-feedback` invocations against the same dev server in parallel. The MCP browser is single-session.

---

## Failure modes & how to handle

| Symptom | Cause | What the skill should do |
|---|---|---|
| `npx @playwright/mcp` first-run is slow | Downloading Playwright browsers | Tell the user it's a one-time download; wait it out |
| Login fails for all three test users with `auth/invalid-credential` | `.env.test` passwords don't match what Firebase has | Tell the user; do not attempt to reset passwords — that's a manual decision |
| Dev server returns 500s | API down (Cloud Run cold or backend not running) | Show the user the failed network requests; do not assume the bug is in the frontend |
| Plan file already exists for the same slug+date | Re-run on the same day | Append `-2`, `-3` etc. to the slug |
| `status: implemented` but user re-invokes | They want to test something else | Tell them this plan is closed; ask if they want a new run |
