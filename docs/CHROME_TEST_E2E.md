# TradesOn End-to-End Test — Chrome Browser Agent

> Paste these instructions into Claude in Chrome. Test the complete flow: signup → onboarding → create job → job board.

**App URL:** https://tradeson-app-63629008205.us-central1.run.app
**API URL:** https://tradeson-api-63629008205.us-central1.run.app

---

## Phase 1: Create Homeowner Account

1. Navigate to `https://tradeson-app-63629008205.us-central1.run.app/signup`
2. Fill in:
   - Full Name: `Larry Test Homeowner`
   - Email: `homeowner.e2e@tradeson.test`
   - Password: `TestPass123!`
   - Confirm Password: `TestPass123!`
   - Check the "I agree to Terms" checkbox
3. Click **Create Account**
4. Wait for redirect to `/role-selection`
5. Select **Homeowner** → Click **Continue**
6. You should be on `/onboarding/homeowner` — Step 1 should be **Your Location** (not "Your Account")

## Phase 2: Complete Homeowner Onboarding (4 steps)

**Step 1 — Your Location:**
- Primary Address: `842 Maple Avenue`
- City: `Chicago`
- State: `IL`
- Zip Code: `60614`
- Service Radius: Select `25` miles
- Click **Continue**

**Step 2 — Your Property:**
- Check "Same as my primary address"
- Property Type: Select `House`
- Click **Continue**

**Step 3 — Preferences:**
- Select service interests: `Plumbing`, `Electrical`
- Leave notification defaults (SMS and Email checked)
- Click **Continue**

**Step 4 — Payment:**
- Click **Skip for now — I'll add payment before my first job**
- Click **Complete Setup**
- **Expected:** Redirects to `/job-creation`

**Report:** Did all 4 steps complete? Any errors shown? Did it redirect to `/job-creation`?

## Phase 3: Create a Job

On the `/job-creation` page:

1. Fill in the job details:
   - Job Title / Issue: `Kitchen sink is leaking under the cabinet`
   - Category: Select `Plumbing` (if available)
   - Severity/Urgency: Select `Moderate` or `Routine` (if available)
   - Description: `Water is dripping from the P-trap under the kitchen sink. The cabinet floor is getting water damaged. Need a plumber to diagnose and repair.`
   - Address: `842 Maple Avenue, Chicago, IL 60614`
2. Submit the job
3. **Expected:** Job is created, possibly redirects to job board or shows confirmation

**Report:** Did the job creation form load? What fields were available? Did submission work? Any errors?

## Phase 4: Check Job Board

1. Navigate to `/job-board` (or click "My Jobs" in the bottom nav)
2. **Expected:** The job you just created should appear in the list
3. Note what information is displayed for the job (title, status, category, etc.)

**Report:** Does the job board show jobs? Is the job you created visible? What data is displayed?

## Phase 5: Create Tradesperson Account (new session)

1. Clear auth state: run in console `indexedDB.deleteDatabase('firebaseLocalStorageDb')` then refresh
2. Navigate to `/signup`
3. Create account:
   - Full Name: `Mike Test Plumber`
   - Email: `plumber.e2e@tradeson.test`
   - Password: `TestPass123!`
4. Select role: **Licensed Tradesperson** → Continue

**Step 1 — Business Info:**
- Business Name: `Mike's Plumbing Pro`
- Service Address: `100 State Street`
- City: `Chicago`
- State: `IL`
- Zip: `60602`
- Click **Continue**

**Step 2 — Trade Details:**
- Primary Trade: Select `Plumbing`
- Subcategories: Select `Leak Repair`, `Pipe Installation`
- Click **Continue**

**Step 3 — Coverage:**
- Service Radius: `25`
- Add area zip: `60614` (the homeowner's zip)
- Click **Continue**

**Step 4 — Licensing:**
- License Type: `State Plumbing License`
- License Number: `PL-2026-12345`
- Click **Continue**

**Step 5 — Insurance & ID:**
- Has Insurance: `Yes` (if available, or skip)
- Click **Continue**

**Step 6 — Payout & Preferences:**
- Business Entity: `Sole Proprietor` (if available)
- Leave notification defaults
- Click **Complete Setup**
- **Expected:** Redirects to `/job-board`

**Report:** Did all 6 steps complete? Any errors? Did it redirect to `/job-board`?

## Phase 6: Tradesperson Views Job Board

1. On `/job-board` as the tradesperson
2. **Expected:** The homeowner's "Kitchen sink leaking" job should appear
3. If there's a way to submit a quote, try:
   - Price: `195`
   - Estimated Hours: `2`
   - Message: `I can fix this P-trap issue. Available this week.`
4. Submit the quote

**Report:** Can the tradesperson see open jobs? Can they submit a quote? Any errors?

## Phase 7: Check Notifications (if applicable)

1. Switch back to homeowner (clear auth, login as `homeowner.e2e@tradeson.test`)
2. Check if any notification appeared about the quote
3. Check if there's a way to accept the quote

**Report:** Any notifications visible? Can the homeowner see and accept quotes?

---

## Final Report Template

Please provide a structured report with:

1. **Phase-by-phase results** (PASS/FAIL for each phase)
2. **Screenshots** at key moments (signup, onboarding steps, job creation, job board)
3. **Errors encountered** (exact error messages + where they appeared)
4. **Network requests** observed (especially to tradeson-api endpoints)
5. **UX observations** (anything confusing, broken, or well-designed)
6. **Recommendations** for fixes needed before the next test run
