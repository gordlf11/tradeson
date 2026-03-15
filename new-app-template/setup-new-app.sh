#!/bin/bash
# ============================================================
# New App Backend Orchestration Setup
# Purpose: Configurable setup script for any new app
# ============================================================

set -e

# ── Configuration (EDIT THESE) ───────────────────────────────
APP_NAME="${APP_NAME:-my-new-app}"
PROJECT_ID="${GCP_PROJECT:-${APP_NAME}-prod}"
PROJECT_STAGING="${GCP_PROJECT_STAGING:-${APP_NAME}-staging}"
PROJECT_DEV="${GCP_PROJECT_DEV:-${APP_NAME}-dev}"
REGION="${GCP_REGION:-us-central1}"
DOMAIN="${APP_DOMAIN:-example.com}"

# Database choice: firestore, cloudsql, spanner
DATABASE_TYPE="${DATABASE_TYPE:-firestore}"

# Auth choice: firebase, auth0, custom
AUTH_TYPE="${AUTH_TYPE:-firebase}"

# Deployment: cloudrun, appengine, gke
DEPLOYMENT_TYPE="${DEPLOYMENT_TYPE:-cloudrun}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   New App Backend Setup Wizard          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo
echo -e "${GREEN}App Name:${NC} $APP_NAME"
echo -e "${GREEN}Database:${NC} $DATABASE_TYPE"
echo -e "${GREEN}Auth:${NC} $AUTH_TYPE"
echo -e "${GREEN}Deployment:${NC} $DEPLOYMENT_TYPE"
echo

# ── Environment Setup ────────────────────────────────────────

setup_environments() {
    echo -e "\n${YELLOW}Setting up multi-environment structure...${NC}"
    
    ENVIRONMENTS=("dev" "staging" "prod")
    
    for env in "${ENVIRONMENTS[@]}"; do
        project_var="PROJECT_${env^^}"
        project="${!project_var}"
        
        echo -e "\n${BLUE}Setting up ${env} environment: ${project}${NC}"
        
        # Create project if it doesn't exist
        if ! gcloud projects describe "$project" &> /dev/null; then
            echo "Creating project $project..."
            gcloud projects create "$project" --name="$APP_NAME-$env"
        fi
        
        # Set project
        gcloud config set project "$project" --quiet
        
        # Enable APIs based on configuration
        echo "Enabling APIs for $env..."
        
        # Base APIs everyone needs
        BASE_APIS="cloudresourcemanager.googleapis.com secretmanager.googleapis.com"
        
        # Database APIs
        case "$DATABASE_TYPE" in
            firestore)
                DB_APIS="firestore.googleapis.com"
                ;;
            cloudsql)
                DB_APIS="sqladmin.googleapis.com sql-component.googleapis.com"
                ;;
            spanner)
                DB_APIS="spanner.googleapis.com"
                ;;
        esac
        
        # Deployment APIs
        case "$DEPLOYMENT_TYPE" in
            cloudrun)
                DEPLOY_APIS="run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com"
                ;;
            appengine)
                DEPLOY_APIS="appengine.googleapis.com cloudbuild.googleapis.com"
                ;;
            gke)
                DEPLOY_APIS="container.googleapis.com cloudbuild.googleapis.com"
                ;;
        esac
        
        # Auth APIs
        case "$AUTH_TYPE" in
            firebase)
                AUTH_APIS="identitytoolkit.googleapis.com"
                ;;
        esac
        
        # Enable all required APIs
        gcloud services enable $BASE_APIS $DB_APIS $DEPLOY_APIS $AUTH_APIS \
            storage.googleapis.com \
            monitoring.googleapis.com \
            logging.googleapis.com \
            --project="$project" --quiet
        
        echo -e "${GREEN}✓ ${env} environment configured${NC}"
    done
}

# ── Database Setup ───────────────────────────────────────────

setup_database() {
    echo -e "\n${YELLOW}Setting up database: $DATABASE_TYPE${NC}"
    
    for env in "${ENVIRONMENTS[@]}"; do
        project_var="PROJECT_${env^^}"
        project="${!project_var}"
        
        echo -e "\n${BLUE}Database for ${env}: ${project}${NC}"
        gcloud config set project "$project" --quiet
        
        case "$DATABASE_TYPE" in
            firestore)
                # Create Firestore database
                if ! gcloud firestore databases describe --project="$project" &> /dev/null; then
                    gcloud firestore databases create \
                        --location="$REGION" \
                        --project="$project"
                    echo -e "${GREEN}✓ Firestore created${NC}"
                fi
                ;;
                
            cloudsql)
                # Create Cloud SQL instance
                INSTANCE_NAME="${APP_NAME}-db-${env}"
                if ! gcloud sql instances describe "$INSTANCE_NAME" --project="$project" &> /dev/null; then
                    gcloud sql instances create "$INSTANCE_NAME" \
                        --database-version=POSTGRES_14 \
                        --tier=db-f1-micro \
                        --region="$REGION" \
                        --project="$project"
                    echo -e "${GREEN}✓ Cloud SQL instance created${NC}"
                    
                    # Create database
                    gcloud sql databases create "${APP_NAME}_${env}" \
                        --instance="$INSTANCE_NAME" \
                        --project="$project"
                fi
                ;;
                
            spanner)
                # Create Spanner instance
                INSTANCE_NAME="${APP_NAME}-spanner-${env}"
                if ! gcloud spanner instances describe "$INSTANCE_NAME" --project="$project" &> /dev/null; then
                    gcloud spanner instances create "$INSTANCE_NAME" \
                        --config="regional-${REGION}" \
                        --nodes=1 \
                        --project="$project"
                    echo -e "${GREEN}✓ Spanner instance created${NC}"
                    
                    # Create database
                    gcloud spanner databases create "${APP_NAME}_${env}" \
                        --instance="$INSTANCE_NAME" \
                        --project="$project"
                fi
                ;;
        esac
    done
}

# ── Service Accounts ─────────────────────────────────────────

create_service_accounts() {
    echo -e "\n${YELLOW}Creating service accounts...${NC}"
    
    for env in "${ENVIRONMENTS[@]}"; do
        project_var="PROJECT_${env^^}"
        project="${!project_var}"
        
        echo -e "\n${BLUE}Service accounts for ${env}: ${project}${NC}"
        gcloud config set project "$project" --quiet
        
        # Service accounts by role
        ACCOUNTS=(
            "backend:Backend Service:datastore.user,secretmanager.secretAccessor"
            "cicd:CI/CD Pipeline:cloudbuild.builds.builder,run.admin"
            "monitoring:Monitoring Service:monitoring.metricWriter,logging.logWriter"
        )
        
        for account_spec in "${ACCOUNTS[@]}"; do
            IFS=':' read -r name display roles <<< "$account_spec"
            
            SA_EMAIL="${name}@${project}.iam.gserviceaccount.com"
            
            # Create service account
            if ! gcloud iam service-accounts describe "$SA_EMAIL" &> /dev/null; then
                gcloud iam service-accounts create "$name" \
                    --display-name="$display" \
                    --project="$project"
                
                # Assign roles
                IFS=',' read -ra ROLES_ARRAY <<< "$roles"
                for role in "${ROLES_ARRAY[@]}"; do
                    gcloud projects add-iam-policy-binding "$project" \
                        --member="serviceAccount:$SA_EMAIL" \
                        --role="roles/$role" \
                        --quiet
                done
                
                echo -e "${GREEN}✓ Created: $name${NC}"
            fi
        done
    done
}

# ── Storage Buckets ──────────────────────────────────────────

create_storage_buckets() {
    echo -e "\n${YELLOW}Creating storage buckets...${NC}"
    
    for env in "${ENVIRONMENTS[@]}"; do
        project_var="PROJECT_${env^^}"
        project="${!project_var}"
        
        echo -e "\n${BLUE}Storage for ${env}: ${project}${NC}"
        
        BUCKETS=(
            "${project}-uploads"
            "${project}-backups"
            "${project}-exports"
            "${project}-static-assets"
        )
        
        for bucket in "${BUCKETS[@]}"; do
            if ! gsutil ls -b "gs://$bucket" &> /dev/null; then
                gsutil mb -p "$project" -l "$REGION" "gs://$bucket"
                
                # Set lifecycle rules for backups
                if [[ "$bucket" == *"backups"* ]]; then
                    cat > /tmp/lifecycle.json << EOF
{
  "lifecycle": {
    "rule": [{
      "action": {"type": "Delete"},
      "condition": {"age": 30}
    }]
  }
}
EOF
                    gsutil lifecycle set /tmp/lifecycle.json "gs://$bucket"
                fi
                
                echo -e "${GREEN}✓ Created bucket: $bucket${NC}"
            fi
        done
    done
}

# ── Secrets Management ───────────────────────────────────────

setup_secrets() {
    echo -e "\n${YELLOW}Setting up secrets management...${NC}"
    
    # Common secrets needed by most apps
    SECRET_TEMPLATES=(
        "DATABASE_URL:Connection string for database"
        "JWT_SECRET:Secret for JWT token signing"
        "API_KEY:Main API key for external services"
        "SMTP_PASSWORD:Email service password"
        "STRIPE_SECRET_KEY:Payment processing key"
        "REDIS_URL:Redis connection string"
        "S3_SECRET_KEY:Object storage credentials"
    )
    
    for env in "${ENVIRONMENTS[@]}"; do
        project_var="PROJECT_${env^^}"
        project="${!project_var}"
        
        echo -e "\n${BLUE}Secrets for ${env}: ${project}${NC}"
        gcloud config set project "$project" --quiet
        
        for secret_spec in "${SECRET_TEMPLATES[@]}"; do
            IFS=':' read -r name description <<< "$secret_spec"
            
            if ! gcloud secrets describe "$name" --project="$project" &> /dev/null; then
                # Create secret placeholder
                echo "placeholder-$env" | gcloud secrets create "$name" \
                    --data-file=- \
                    --project="$project" \
                    --labels="environment=$env,app=$APP_NAME"
                
                echo -e "${GREEN}✓ Created secret: $name${NC}"
            fi
        done
    done
    
    echo -e "\n${YELLOW}Note: Update secret values with actual credentials:${NC}"
    echo "gcloud secrets versions add SECRET_NAME --data-file=-"
}

# ── Git Repository Setup ─────────────────────────────────────

setup_git_structure() {
    echo -e "\n${YELLOW}Setting up Git branching structure...${NC}"
    
    # Create recommended branch structure
    cat > /tmp/git-setup.sh << 'EOF'
#!/bin/bash

# Initialize git if needed
if [ ! -d .git ]; then
    git init
fi

# Create main branches
git checkout -b main 2>/dev/null || git checkout main
git checkout -b develop
git checkout -b staging

# Create .github/workflows directory
mkdir -p .github/workflows

# Create GitHub Actions workflow
cat > .github/workflows/deploy.yml << 'WORKFLOW'
name: Deploy Pipeline

on:
  push:
    branches: [main, staging, develop]
  pull_request:
    branches: [main]

env:
  PROJECT_DEV: ${{ secrets.GCP_PROJECT_DEV }}
  PROJECT_STAGING: ${{ secrets.GCP_PROJECT_STAGING }}
  PROJECT_PROD: ${{ secrets.GCP_PROJECT_PROD }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
      - run: npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set environment
        run: |
          if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
            echo "ENV=prod" >> $GITHUB_ENV
            echo "PROJECT=${{ env.PROJECT_PROD }}" >> $GITHUB_ENV
          elif [[ "${{ github.ref }}" == "refs/heads/staging" ]]; then
            echo "ENV=staging" >> $GITHUB_ENV
            echo "PROJECT=${{ env.PROJECT_STAGING }}" >> $GITHUB_ENV
          else
            echo "ENV=dev" >> $GITHUB_ENV
            echo "PROJECT=${{ env.PROJECT_DEV }}" >> $GITHUB_ENV
          fi
      
      - name: Deploy to GCP
        run: |
          echo "Deploying to $ENV environment"
          # Add deployment commands
WORKFLOW

echo "Git structure created with branches: main, develop, staging"
EOF
    
    chmod +x /tmp/git-setup.sh
    
    echo -e "${GREEN}✓ Git setup script created at /tmp/git-setup.sh${NC}"
    echo "Run it in your repository: bash /tmp/git-setup.sh"
}

# ── Main Execution ───────────────────────────────────────────

main() {
    echo -e "\n${CYAN}Starting setup for: $APP_NAME${NC}\n"
    
    # Confirm configuration
    echo "Configuration:"
    echo "  Environments: dev, staging, prod"
    echo "  Database: $DATABASE_TYPE"
    echo "  Auth: $AUTH_TYPE"
    echo "  Deployment: $DEPLOYMENT_TYPE"
    echo
    read -p "Continue? (y/n) " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled"
        exit 1
    fi
    
    # Run setup steps
    setup_environments
    setup_database
    create_service_accounts
    create_storage_buckets
    setup_secrets
    setup_git_structure
    
    echo -e "\n${GREEN}╔════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║      Setup Complete for $APP_NAME!      ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
    
    echo -e "\nNext steps:"
    echo "1. Update secret values: gcloud secrets versions add SECRET_NAME --data-file=-"
    echo "2. Configure domain: gcloud run domain-mappings create --service=$APP_NAME --domain=$DOMAIN"
    echo "3. Set up monitoring: gcloud monitoring dashboards create --config-from-file=dashboard.yaml"
}

# Execute
main "$@"