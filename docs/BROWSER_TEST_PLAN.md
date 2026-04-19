# TradesOn Browser Test Plan

> Hand this to Claude in Chrome (or run manually) to test the live app.
> Updated: April 10, 2026

---

## Live URLs

- **Web App:** https://tradeson-app-63629008205.us-central1.run.app
- **API:** https://tradeson-api-63629008205.us-central1.run.app

---

## Test 1: Signup Flow (Create New Account)

1. Navigate to: `https://tradeson-app-63629008205.us-central1.run.app/signup`
2. Fill in:
   - **Full Name:** `Test Homeowner`
   - **Email:** `testhomeowner@tradeson.test`
   - **Password:** `TestPass123!`
   - **Confirm Password:** `TestPass123!`
   - **Accept Terms:** Check the box
3. Click **Create Account**
4. **Expected:** No errors, redirects to `/role-selection`
5. **Verify:** Firebase created the user (check Network tab for 200 response to POST /api/v1/users)

### Test 1b: Duplicate Signup (Error Handling)

1. Try signing up again with the same email
2. **Expected:** Error message: "An account with this email already exists"

---

## Test 2: Role Selection

1. After signup, you should be on `/role-selection`
2. Select **Homeowner**
3. Click **Continue**
4. **Expected:** Redirects to `/onboarding/homeowner`
5. **Verify:** Network tab shows PUT /api/v1/users/me with role update

---

## Test 3: Login Flow

1. Navigate to: `https://tradeson-app-63629008205.us-central1.run.app/login`
2. Enter the test credentials:
   - **Email:** `testhomeowner@tradeson.test`
   - **Password:** `TestPass123!`
3. Click **Sign In**
4. **Expected:** Redirects to `/role-selection` (first login, onboarding not complete) or `/dashboard`
5. **Verify:** No error banner appears

### Test 3b: Wrong Password

1. Try logging in with wrong password: `wrongpassword`
2. **Expected:** Error message: "Invalid email or password"

### Test 3c: Non-existent Account

1. Try logging in with: `nobody@example.com` / `anypassword`
2. **Expected:** Error message about no account found

---

## Test 4: Protected Routes

1. Open a new incognito/private window
2. Navigate directly to: `https://tradeson-app-63629008205.us-central1.run.app/dashboard`
3. **Expected:** Redirects to `/login` (not authenticated)
4. Navigate to: `https://tradeson-app-63629008205.us-central1.run.app/job-board`
5. **Expected:** Redirects to `/login`

---

## Test 5: Create Second User (Tradesperson)

1. Navigate to signup page
2. Create account:
   - **Name:** `Test Tradesperson`
   - **Email:** `testtrade@tradeson.test`
   - **Password:** `TestPass123!`
3. Select role: **Licensed Tradesperson**
4. **Expected:** Redirects to `/onboarding/licensed-trade`

---

## Test 6: API Health Check

1. Open a new tab
2. Navigate to: `https://tradeson-api-63629008205.us-central1.run.app/health`
3. **Expected:** JSON response with `{"status":"ok","service":"tradeson-api",...}`

---

## Test 7: Onboarding Pages Load

After signing up and selecting a role, verify these pages load without errors:

| Role | URL Path | Key Elements |
|------|----------|-------------|
| Homeowner | `/onboarding/homeowner` | Property type, service interests |
| Property Manager | `/onboarding/property-manager` | Company name, properties |
| Realtor | `/onboarding/realtor` | Brokerage, license number |
| Licensed Trade | `/onboarding/licensed-trade` | Trade type, license upload |
| Unlicensed Trade | `/onboarding/non-licensed-trade` | Services offered |

---

## What to Report

After running tests, note:
- [ ] Signup creates Firebase user successfully
- [ ] Signup creates PostgreSQL user row (check API response)
- [ ] Login with valid credentials works
- [ ] Login with invalid credentials shows proper error
- [ ] Role selection updates the backend
- [ ] Protected routes redirect unauthenticated users
- [ ] Onboarding pages load after role selection
- [ ] Bottom navigation shows correct items per role
- [ ] No console errors in browser DevTools

---

## In-App Messaging Test (Future — Requires Onboarding Completion)

Once onboarding pages are wired to the API:

1. **Homeowner** creates a job via `/job-creation`
2. **Tradesperson** sees job on `/job-board` and submits a quote
3. **Homeowner** receives FCM notification "New Quote Received"
4. **Homeowner** accepts the quote
5. **Tradesperson** receives instant FCM notification "Bid Accepted!"
6. Both users can view the notification history

> This test requires completing the onboarding rewire (Priority 2) and dashboard rewire (Priority 3) from BACKEND_SETUP_GUIDE.md.
