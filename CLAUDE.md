# 🤖 Claude Development Assistant Configuration

## Welcome to the TradesOn Platform Development

This file configures your Claude instance to work on the **TradesOn** platform - a marketplace connecting homeowners with verified tradespeople for home repairs and maintenance.

## 🚀 Initial Setup Questions

When you read this file, please ask the developer:

1. **Role Confirmation**: Are you Kevin or Larry? (This determines task assignments)
2. **Development Phase**: Which phase are we currently working on? (Pre-Launch, 1A, 1B, 1C, 1D, QA, or Phase 2)
3. **Environment Access**: Do you have access to:
   - [ ] GCP Project (frankly-data)
   - [ ] GitHub repository (https://github.com/gordlf11/tradeson.git)
   - [ ] Stripe test account
   - [ ] Firebase project
   - [ ] Figma designs
4. **MCP Setup**: Have you installed the required MCPs?
   - [ ] Figma MCP (for design access)
   - [ ] Firebase MCP (for database operations)
5. **Today's Focus**: What specific screens or features are we implementing today?

## 📋 Project Overview

**TradesOn** is a two-sided marketplace platform that:
- Connects homeowners, realtors, and property managers with verified tradespeople
- Uses AI to analyze job requests and estimate costs
- Handles end-to-end job lifecycle: intake → quote → schedule → execute → payment
- Ensures compliance through identity verification and license checking

### Tech Stack
- **Frontend**: Next.js 14+ (Web), FlutterFlow (iOS)
- **Backend**: Node.js with Express
- **Database**: Firebase Firestore / Supabase
- **AI**: Google Vertex AI with ADK
- **Payments**: Stripe Connect Express
- **Cloud**: Google Cloud Platform (Cloud Run, Cloud Functions)
- **Auth**: Firebase Auth / Supabase Auth
- **File Storage**: Google Cloud Storage

## 🎯 Current Development Phases

### PRE-LAUNCH: Environment Setup ✅
- GCP project setup with Cloud Run, Vertex AI, Cloud Functions
- Payment Processor account (Stripe) in test mode
- Repository structure defined

### PHASE 1A - Foundation (Current Focus)
**Database Schema** (Larry's responsibility):
```typescript
// Core tables needed:
- users (multi-role: homeowner, realtor, property_manager, tradesperson)
- jobs (status, category, severity, location, photos)
- quotes (price, message, ETA, status)
- compliance (licenses, insurance, identity_verification)
- payments (stripe_customer_id, stripe_account_id, transactions)
- audit_log (all system actions, immutable)
```

**Onboarding Screens** (Kevin's responsibility):
- S-03: User type selection
- S-04: Property Manager onboarding
- S-05: Realtor onboarding
- S-06: Homeowner onboarding
- S-07/S-08: Tradesperson onboarding (licensed/non-licensed)

**Authentication** (Larry's responsibility):
- S-01: Login page
- S-02: Account creation + email verification
- JWT session management

**Payment Setup** (Kevin's responsibility):
- S-45: Customer payment method (Stripe Elements)
- S-46: Tradesperson payout (Stripe Connect Express)
- Identity verification integration

### PHASE 1B - AI & Job Board
- Job intake with AI analysis
- Job board with filtering
- Quote submission and comparison

### PHASE 1C - Scheduling & Execution
- Calendar management
- Live tracking
- Payment processing

### PHASE 1D - Dashboards & Admin
- Role-specific dashboards
- Admin portal
- Analytics

## 🛠 Development Guidelines

### File Structure
```
/tradeson
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   ├── auth/              # Auth pages
│   ├── onboarding/        # Onboarding flows
│   ├── dashboard/         # Role-specific dashboards
│   ├── jobs/              # Job management
│   └── admin/             # Admin portal
├── components/            # Reusable components
├── lib/                   # Utilities and helpers
│   ├── stripe/           # Stripe integration
│   ├── firebase/         # Firebase config
│   └── vertex-ai/        # AI agents
├── public/               # Static assets
└── docs/                 # Documentation
```

### Database Conventions
- Use snake_case for table and column names
- Include created_at, updated_at timestamps on all tables
- Implement soft deletes with deleted_at field
- Use UUIDs for primary keys
- Add proper indexes for query optimization

### API Conventions
- RESTful endpoints: `/api/v1/resource`
- Use proper HTTP methods (GET, POST, PUT, DELETE)
- Return consistent error responses
- Implement rate limiting
- Add request validation middleware

### Security Requirements
- Implement Row Level Security (RLS)
- Validate all user inputs
- Sanitize data before storage
- Use environment variables for secrets
- Implement proper CORS policies
- Add audit logging for sensitive operations

## 📊 Screen Reference Guide

The platform consists of 49 screens organized by user role:

### Authentication & Onboarding (S-01 to S-08)
- Login, registration, role selection
- Role-specific onboarding forms
- Document upload for verification

### Brokerage Management (S-09 to S-16)
- Brokerage profile setup
- Agent management
- Referral tracking

### Admin Portal (S-17 to S-23)
- Compliance review
- Account monitoring
- Metrics dashboard

### Tradesperson Dashboard (S-24)
- Job management
- Earnings tracking
- Availability calendar

### Realtor Dashboard (S-25)
- Client management
- Job history
- Commission tracking

### Job Creation (S-26 to S-28)
- Issue input with photos
- AI analysis results
- Summary confirmation

### Job Board (S-29 to S-32)
- Browse available jobs
- Submit quotes
- Compare quotes

### Scheduling (S-33 to S-36)
- Availability management
- Time slot selection
- Route planning

### Execution (S-37 to S-41)
- Live tracking
- Scope adjustments
- Completion docs

### Invoicing (S-42 to S-44)
- Line items
- PDF generation
- Payment approval

### Payments (S-45 to S-47)
- Payment methods
- Payout setup
- Cancellations

### Support (S-48 to S-49)
- Contact form
- Ticket tracking

## 🔄 Git Workflow

### Branch Strategy
```bash
master                  # Main integration branch (default)
├── production         # Production deployments (auto-deploys to Cloud Run)
├── feature/1a-*       # Phase 1A features
├── feature/1b-*       # Phase 1B features
└── hotfix/*           # Emergency fixes
```

### Production Deployment (Cloud Run via Cloud Build)

**Live Production URL**: https://tradeson-app-63629008205.us-central1.run.app

The project uses **Google Cloud Build** with an automated trigger to deploy to **Cloud Run** whenever code is pushed to the `production` branch. The build is fully automated — no manual steps needed in GCP.

**Deployment Flow:**
```
feature branch → PR to master → merge → push master to production → auto-deploys to Cloud Run
```

**Quick Deploy (one command):**
```bash
# Make sure you're up to date, then deploy
git pull origin master && git push origin master:production
```

**Step-by-step deploy:**
```bash
# 1. Ensure your local branch is up to date
git fetch origin
git pull origin master

# 2. Verify the build passes locally before deploying
npm run build

# 3. Push to production (this triggers the deploy)
git push origin master:production

# 4. Monitor the build
#    → GCP Console > Cloud Build > History
#    → Or check: https://console.cloud.google.com/cloud-build/builds?project=frankly-data
```

**How the pipeline works:**
1. Push to `production` branch triggers Cloud Build (`tradesonproduction` trigger)
2. `cloudbuild.yaml` orchestrates: Docker build → push to Container Registry → deploy to Cloud Run
3. `Dockerfile` runs a multi-stage build: Node 20 compiles the Vite/React app, nginx serves it on port 8080
4. Cloud Run serves the app at the production URL above

**Before you deploy — pre-flight checklist:**
- [ ] Run `npm run build` locally — if TypeScript fails, the Cloud Build will also fail
- [ ] Test your changes in the browser (`npm run dev`)
- [ ] Ensure your code is committed and pushed to `master`
- [ ] Coordinate with your partner if deploying shared changes

**Infrastructure details:**
| Setting | Value |
|---|---|
| GCP Project | `frankly-data` (project ID: `tradeson-491518`) |
| Trigger Name | `tradesonproduction` |
| Region | `us-central1` (Iowa) |
| Cloud Run Service | `tradeson-app` |
| Service Account | `63629008205-compute@developer.gserviceaccount.com` |
| Build Config | `cloudbuild.yaml` (auto-detected) |
| Repository | `gordlf11/tradeson` (GitHub App, 1st gen) |
| Access | Public (`--allow-unauthenticated`) |
| Memory | 512Mi |
| Port | 8080 |

**Troubleshooting failed builds:**
1. Check Cloud Build logs: GCP Console > Cloud Build > History > click the failed build
2. Most common failure: **TypeScript errors** — always run `npm run build` locally first
3. If the build passes locally but fails in Cloud Build, check for files missing from git (not committed)
4. To skip a build on a trivial push, include `[skip ci]` in the commit message

**Notes for Claude:** When a developer asks to "deploy to production", "push to prod", or "go live":
1. Pull latest from `origin/master`
2. Run `npm run build` to verify TypeScript compiles
3. If there are errors, fix them before pushing
4. Push to production: `git push origin <current-branch>:production`
5. Keep `master` in sync: `git push origin <current-branch>:master`
6. Confirm the build started in Cloud Build

### Commit Convention
```
[PHASE-SCREEN] Brief description

- Detailed point 1
- Detailed point 2

Refs: #ticket-number
```

Example:
```
[1A-S03] Add user type selection screen

- Implement role routing logic
- Add animations for card selection
- Connect to onboarding flows

Refs: #12
```

### Pull Request Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change

## Phase & Screen
- Phase: 1A
- Screen(s): S-03, S-04

## Testing
- [ ] Manual testing completed
- [ ] Unit tests added/updated
- [ ] E2E tests passing

## Checklist
- [ ] Code follows project conventions
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console errors
```

## 🚦 Development Status Tracker

### Decision Gates (Must Complete)
- [ ] Requirements Document approval
- [ ] Tech stack finalization (Scenario A-F)
- [ ] AI model selection
- [ ] Identity verification vendor (Stripe Identity vs Persona)
- [ ] Platform fee % and payment processor type

### Current Sprint Tasks
Track your daily progress in `/docs/DEVELOPMENT_TRACKER.md`

## 🔗 Important Links

- **GitHub Repository**: https://github.com/gordlf11/tradeson.git
- **PRD Document**: `/TradesOn - Product Requirements Document.pdf`
- **Figma Designs**: [Request access from team]
- **GCP Console**: https://console.cloud.google.com/home/dashboard?project=frankly-data
- **Stripe Dashboard**: https://dashboard.stripe.com/test
- **Firebase Console**: https://console.firebase.google.com

## 💬 Communication Protocol

### Daily Standups
Answer these questions in GitHub Discussions:
1. What did you complete yesterday?
2. What are you working on today?
3. Any blockers?

### Code Reviews
- All PRs require one approval
- Response time: within 4 hours during work hours
- Use GitHub comments for discussions

### Emergency Escalation
1. Slack: #tradeson-dev
2. Phone: [Exchange numbers privately]
3. Email: [Exchange emails privately]

## 🎓 Getting Started Checklist

When starting development:

```bash
# 1. Clone the repository
git clone https://github.com/gordlf11/tradeson.git
cd tradeson

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# 4. Initialize Firebase
firebase init

# 5. Set up Stripe CLI
stripe login

# 6. Run development server
npm run dev

# 7. Check current phase tasks
cat docs/DEVELOPMENT_TRACKER.md
```

## 📝 Notes for Claude

When assisting with this project:

1. **Always ask which phase and screen** the developer is working on
2. **Reference the PRD** for detailed requirements
3. **Follow the established conventions** for code style and structure
4. **Consider the multi-role nature** of the platform (4 user types)
5. **Ensure proper security** for payment and compliance features
6. **Track progress** in the development tracker
7. **Test across all user roles** before marking complete
8. **Document any deviations** from the original plan
9. **Read CHAT_HISTORY.md at session start** to understand what the other developer has done
10. **Log the session to CHAT_HISTORY.md at session end** -- this is how both partners stay in sync

## 📓 Chat History Workflow

This project uses `CHAT_HISTORY.md` as a **shared session log** between Larry and Kevin (and their respective Claude instances).

### Why This Matters
Two developers working async with separate Claude sessions will lose context without a shared log. CHAT_HISTORY.md is the bridge -- it lives in the repo, gets pushed/pulled with the code, and gives each Claude full context on what the other developer has done.

### Rules
1. **Start of session**: Read `CHAT_HISTORY.md` before doing anything else
2. **End of session**: Append a dated entry summarizing what was done, decisions made, and next steps
3. **Format**: `## YYYY-MM-DD -- [Developer Name] -- [Session Title]` followed by bullet points
4. **New entries go at the top** (reverse chronological)
5. **Include the developer's name** (Larry or Kevin) so Claude knows who did what
6. **Commit CHAT_HISTORY.md with your code changes** -- it should always be part of the push
7. **Pull before starting** to get your partner's latest session notes

## 🤝 Collaboration Rules

1. **No direct commits to main** - always use feature branches
2. **Update DEVELOPMENT_TRACKER.md** after completing each task
3. **Comment your code** for complex business logic
4. **Write tests** for critical paths (payments, auth, compliance)
5. **Document API changes** in `/docs/API.md`
6. **Share blockers immediately** - don't wait for standups

---

**Remember**: This is a compliance-heavy platform dealing with payments and identity verification. Security and proper documentation are not optional.

Ready to build? Let's create something amazing! 🚀