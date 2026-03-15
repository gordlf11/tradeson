# New App Backend Orchestration - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### 1. Initial Setup (One-time)

```bash
# Clone and setup
git clone <your-repo>
cd <your-app>

# Make scripts executable
chmod +x scripts/new-app/**/*.sh

# Run initial setup wizard
export APP_NAME="your-app-name"
export GCP_PROJECT_PROD="your-project-id"
./scripts/new-app/orchestrate-app.sh
# Select option 13 (Environment Setup)
```

### 2. Daily Development Workflow

```bash
# Start your day - launch the control center
./scripts/new-app/orchestrate-app.sh

# Quick commands (skip the menu)
./orchestrate-app.sh deploy     # Deploy to current environment
./orchestrate-app.sh logs       # View live logs
./orchestrate-app.sh db         # Database CLI
./orchestrate-app.sh status     # Check everything
```

### 3. Multi-Developer Setup

```bash
# Each developer runs this once
./scripts/new-app/collaboration/multi-dev-workflow.sh
# Select option 1 (Developer Setup)

# Daily collaboration
./multi-dev-workflow.sh
# Use options 3-7 for branch sync, conflicts, reviews
```

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────┐
│            Control Center                    │
│         (orchestrate-app.sh)                │
└────────────┬────────────────┬───────────────┘
             │                │
    ┌────────▼─────┐  ┌───────▼────────┐
    │   Database   │  │  Collaboration  │
    │   Manager    │  │    Manager     │
    └──────────────┘  └────────────────┘
             │                │
    ┌────────▼────────────────▼───────────┐
    │         Google Cloud Platform        │
    │  (Firestore, Cloud Run, Storage)     │
    └──────────────────────────────────────┘
```

## 🎯 Common Tasks

### Deploy to Production
```bash
# Automated safety checks included
./orchestrate-app.sh
# Select option 1 (Deploy to prod)
# Type 'DEPLOY PROD' to confirm
```

### Database Operations
```bash
# Interactive query builder
./scripts/new-app/database/advanced-db-manager.sh
# Select option 2 (Advanced Query Builder)

# Quick CRUD
./orchestrate-app.sh db create users user123 '{"name":"John"}'
./orchestrate-app.sh db read users
./orchestrate-app.sh db query users status EQUAL active
```

### Manage Conflicts (Two Developers)
```bash
# Developer A
git checkout -b feature/payment
# ... make changes ...
git push origin feature/payment

# Developer B
git checkout -b feature/checkout
# ... make changes ...
./multi-dev-workflow.sh
# Select option 3 (Sync) then 2 (Merge payment branch)
```

### Monitor Production
```bash
# Real-time monitoring
./orchestrate-app.sh
# Select option 15 (Monitoring Dashboard)

# Or direct commands
gcloud run services logs tail your-app --project=your-project
gcloud logging read "severity>=ERROR" --limit=10
```

## 🔧 Configuration

### Environment Variables
Create `.env.local`:
```bash
APP_NAME=my-awesome-app
GCP_PROJECT_PROD=my-app-prod
GCP_PROJECT_STAGING=my-app-staging
GCP_PROJECT_DEV=my-app-dev
GCP_REGION=us-central1
DOCKER_HUB_USER=yourusername
```

### Database Types (in setup script)
- `firestore` - NoSQL, real-time
- `cloudsql` - PostgreSQL, relational
- `spanner` - Global scale SQL

### Authentication Methods
- `firebase` - Google Firebase Auth
- `auth0` - Auth0 integration
- `custom` - Your own auth system

### Deployment Targets
- `cloudrun` - Serverless containers
- `appengine` - Managed PaaS
- `gke` - Kubernetes clusters

## 🛡️ Security Best Practices

### Secrets Management
```bash
# Never commit secrets! Use Secret Manager
echo "your-api-key" | gcloud secrets create API_KEY --data-file=-

# Access in code
const apiKey = await secretManager.getSecret('API_KEY');
```

### Branch Protection
```bash
# Set up protection rules
./multi-dev-workflow.sh
# Option 5 (Code Review) enforces reviews
```

### Database Backups
```bash
# Automatic before production deploy
# Manual backup anytime:
./orchestrate-app.sh backup
```

## 📈 Performance Optimization

### Database Performance
```bash
# Analyze collection performance
./advanced-db-manager.sh
# Option 7 (Performance Analysis)

# Add indexes for common queries
gcloud firestore indexes create \
  --collection-group=users \
  --field-config field-path=email,order=ASCENDING
```

### Caching Strategy
```bash
# Warm cache for frequently accessed data
./advanced-db-manager.sh
# Option 8 → Option 2 (Warm cache)
```

## 🐛 Troubleshooting

### Common Issues

**Issue**: "Permission denied" errors
```bash
# Fix: Ensure service account has correct roles
gcloud projects add-iam-policy-binding YOUR_PROJECT \
  --member="serviceAccount:YOUR_SA@YOUR_PROJECT.iam.gserviceaccount.com" \
  --role="roles/datastore.user"
```

**Issue**: Deployment fails
```bash
# Check build logs
gcloud builds list --limit=5
gcloud builds log LATEST_BUILD_ID

# Check quotas
gcloud compute project-info describe --project=YOUR_PROJECT
```

**Issue**: Database queries slow
```bash
# Check missing indexes
gcloud firestore indexes list
# Add composite indexes for complex queries
```

## 🎓 Advanced Features

### Transaction Support
```bash
# Build complex multi-operation transactions
./advanced-db-manager.sh
# Option 4 (Execute Transaction)
# Add multiple operations, execute atomically
```

### Multi-Environment Sync
```bash
# Promote code through environments
./orchestrate-app.sh
# Option 17 (Multi-Environment Sync)
# Safely sync dev → staging → prod
```

### Parallel Development
```bash
# Coordinate features between developers
./multi-dev-workflow.sh
# Option 7 (Parallel Development)
# Claim features, track progress
```

## 📚 Quick Reference

### File Structure
```
scripts/new-app/
├── orchestrate-app.sh           # Main control center
├── database/
│   └── advanced-db-manager.sh   # Database operations
├── collaboration/
│   └── multi-dev-workflow.sh    # Team coordination
└── QUICKSTART.md                # This file
```

### Command Shortcuts
```bash
alias app="./scripts/new-app/orchestrate-app.sh"
alias db="./scripts/new-app/orchestrate-app.sh db"
alias deploy="./scripts/new-app/orchestrate-app.sh deploy"
alias collab="./scripts/new-app/collaboration/multi-dev-workflow.sh"
```

### Useful GCloud Commands
```bash
# List all services
gcloud run services list

# View service details
gcloud run services describe YOUR_APP

# Stream logs
gcloud run services logs tail YOUR_APP

# Check costs
gcloud billing accounts list
gcloud alpha billing budgets list

# Database operations
gcloud firestore operations list
gcloud firestore indexes list
```

## 💡 Pro Tips

1. **Always work in feature branches** - Never commit directly to main
2. **Use the lock system** - For critical files when two devs might conflict
3. **Monitor costs** - Set up billing alerts in GCP Console
4. **Automate everything** - If you do it twice, script it
5. **Document changes** - Use meaningful commit messages

## 🆘 Support

- **Documentation**: Update this file as you customize
- **Issues**: Track in GitHub/GitLab issues
- **Monitoring**: Set up alerts for production errors

## 🎉 Ready to Build!

You now have a complete backend orchestration system that handles:
- ✅ Multi-environment deployments
- ✅ Database management with CLI
- ✅ Multi-developer collaboration
- ✅ Automated testing and CI/CD
- ✅ Production monitoring
- ✅ Backup and recovery

Start with `./orchestrate-app.sh` and explore from there!