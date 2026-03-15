#!/bin/bash
# ============================================================
# New App Master Orchestration Script
# Purpose: Complete backend orchestration for production app
# ============================================================

set -e

# ── Configuration (Customizable per app) ────────────────────
export APP_NAME="${APP_NAME:-my-app}"
export GCP_PROJECT_PROD="${GCP_PROJECT_PROD:-${APP_NAME}-prod}"
export GCP_PROJECT_STAGING="${GCP_PROJECT_STAGING:-${APP_NAME}-staging}"
export GCP_PROJECT_DEV="${GCP_PROJECT_DEV:-${APP_NAME}-dev}"
export GCP_REGION="${GCP_REGION:-us-central1}"
export DOCKER_REGISTRY="${DOCKER_REGISTRY:-gcr.io}"
export DOCKER_HUB_USER="${DOCKER_HUB_USER:-lfg3}"

# Determine current environment based on git branch
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
case "$CURRENT_BRANCH" in
    main|master) 
        export ENVIRONMENT="prod"
        export GCP_PROJECT="$GCP_PROJECT_PROD"
        ;;
    staging) 
        export ENVIRONMENT="staging"
        export GCP_PROJECT="$GCP_PROJECT_STAGING"
        ;;
    *) 
        export ENVIRONMENT="dev"
        export GCP_PROJECT="$GCP_PROJECT_DEV"
        ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# ── Main Dashboard ───────────────────────────────────────────

show_dashboard() {
    clear
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║            App Backend Control Center                     ║${NC}"
    echo -e "${CYAN}╠══════════════════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}║  App:         ${GREEN}${APP_NAME}${NC}"
    echo -e "${CYAN}║  Environment: ${YELLOW}${ENVIRONMENT}${NC}"
    echo -e "${CYAN}║  Project:     ${GREEN}${GCP_PROJECT}${NC}"
    echo -e "${CYAN}║  Branch:      ${BLUE}${CURRENT_BRANCH}${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
    echo
    
    # Show real-time status
    show_status_summary
    
    echo
    echo -e "${BLUE}┌─ Quick Actions ─────────────────────────────────────────┐${NC}"
    echo -e "  ${YELLOW}1)${NC} 🚀 Deploy to ${ENVIRONMENT}"
    echo -e "  ${YELLOW}2)${NC} 📊 View Live Logs"
    echo -e "  ${YELLOW}3)${NC} 🔄 Sync Database"
    echo -e "  ${YELLOW}4)${NC} 🧪 Run Tests"
    echo
    echo -e "${BLUE}┌─ Development ───────────────────────────────────────────┐${NC}"
    echo -e "  ${YELLOW}5)${NC} 🔧 Local Development Server"
    echo -e "  ${YELLOW}6)${NC} 📦 Build & Test Locally"
    echo -e "  ${YELLOW}7)${NC} 🐳 Docker Operations"
    echo -e "  ${YELLOW}8)${NC} 🌿 Git Workflow"
    echo
    echo -e "${BLUE}┌─ Database ──────────────────────────────────────────────┐${NC}"
    echo -e "  ${YELLOW}9)${NC} 📝 Database CLI"
    echo -e "  ${YELLOW}10)${NC} 🔄 Run Migrations"
    echo -e "  ${YELLOW}11)${NC} 💾 Backup/Restore"
    echo -e "  ${YELLOW}12)${NC} 🔍 Query Builder"
    echo
    echo -e "${BLUE}┌─ Infrastructure ────────────────────────────────────────┐${NC}"
    echo -e "  ${YELLOW}13)${NC} ☁️  Environment Setup"
    echo -e "  ${YELLOW}14)${NC} 🔐 Secrets Management"
    echo -e "  ${YELLOW}15)${NC} 📊 Monitoring Dashboard"
    echo -e "  ${YELLOW}16)${NC} 🚨 Alert Configuration"
    echo
    echo -e "${BLUE}┌─ Advanced ──────────────────────────────────────────────┐${NC}"
    echo -e "  ${YELLOW}17)${NC} 🔄 Multi-Environment Sync"
    echo -e "  ${YELLOW}18)${NC} 📈 Performance Analysis"
    echo -e "  ${YELLOW}19)${NC} 🛠️ Debug Mode"
    echo -e "  ${YELLOW}20)${NC} 📋 Generate Reports"
    echo
    echo -e "  ${MAGENTA}h)${NC} Help  ${MAGENTA}s)${NC} Settings  ${RED}0)${NC} Exit"
    echo
    echo -ne "${GREEN}Select option: ${NC}"
}

# ── Status Functions ─────────────────────────────────────────

show_status_summary() {
    # Check service health
    if gcloud run services describe "$APP_NAME" --region="$GCP_REGION" --project="$GCP_PROJECT" &>/dev/null; then
        SERVICE_STATUS="${GREEN}● Running${NC}"
    else
        SERVICE_STATUS="${RED}● Not Deployed${NC}"
    fi
    
    # Check recent errors
    ERROR_COUNT=$(gcloud logging read "severity>=ERROR" --limit=10 --project="$GCP_PROJECT" 2>/dev/null | grep -c "insertId" || echo "0")
    if [ "$ERROR_COUNT" -gt 0 ]; then
        ERROR_STATUS="${RED}⚠ $ERROR_COUNT errors${NC}"
    else
        ERROR_STATUS="${GREEN}✓ No errors${NC}"
    fi
    
    echo -e "  Service: $SERVICE_STATUS  |  Errors (24h): $ERROR_STATUS"
}

# ── Deployment Functions ─────────────────────────────────────

deploy_to_environment() {
    echo -e "\n${YELLOW}Deploying to ${ENVIRONMENT}...${NC}"
    
    # Pre-deployment checks
    echo "Running pre-deployment checks..."
    
    # Check for uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        echo -e "${YELLOW}Warning: You have uncommitted changes${NC}"
        echo -n "Continue anyway? (y/n): "
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            return
        fi
    fi
    
    # Build and test
    echo "Building application..."
    npm run build || { echo -e "${RED}Build failed${NC}"; return 1; }
    
    echo "Running tests..."
    npm test || { echo -e "${RED}Tests failed${NC}"; return 1; }
    
    # Deploy based on environment
    case "$ENVIRONMENT" in
        prod)
            echo -e "${RED}Deploying to PRODUCTION${NC}"
            echo -n "Type 'DEPLOY PROD' to confirm: "
            read -r confirmation
            if [ "$confirmation" != "DEPLOY PROD" ]; then
                echo "Deployment cancelled"
                return
            fi
            
            # Create production backup first
            backup_database
            ;;
        staging)
            echo "Deploying to staging..."
            ;;
        dev)
            echo "Deploying to development..."
            ;;
    esac
    
    # Deploy to Cloud Run
    gcloud run deploy "$APP_NAME" \
        --source . \
        --region="$GCP_REGION" \
        --project="$GCP_PROJECT" \
        --platform=managed \
        --allow-unauthenticated \
        --set-env-vars="ENVIRONMENT=$ENVIRONMENT" \
        --service-account="${APP_NAME}-backend@${GCP_PROJECT}.iam.gserviceaccount.com"
    
    # Also push to Docker Hub
    if [ "$ENVIRONMENT" == "prod" ]; then
        echo "Building and pushing Docker image..."
        docker build -t "$DOCKER_HUB_USER/$APP_NAME:latest" -t "$DOCKER_HUB_USER/$APP_NAME:$(date +%Y%m%d-%H%M%S)" .
        docker push "$DOCKER_HUB_USER/$APP_NAME" --all-tags
    fi
    
    echo -e "${GREEN}✓ Deployment complete${NC}"
    
    # Show deployment URL
    SERVICE_URL=$(gcloud run services describe "$APP_NAME" --region="$GCP_REGION" --project="$GCP_PROJECT" --format="value(status.url)")
    echo -e "Service URL: ${BLUE}$SERVICE_URL${NC}"
}

# ── Database CLI ─────────────────────────────────────────────

database_cli() {
    echo -e "\n${YELLOW}Database CLI${NC}"
    echo "1) Create document"
    echo "2) Read document"
    echo "3) Update document"
    echo "4) Delete document"
    echo "5) Query collection"
    echo "6) Bulk import"
    echo "7) Export collection"
    echo "8) Interactive query builder"
    echo -n "Select: "
    read -r choice
    
    case $choice in
        1)
            echo -n "Collection: "
            read -r collection
            echo -n "Document ID: "
            read -r doc_id
            echo -n "JSON data: "
            read -r json_data
            bash "$SCRIPT_DIR/database/manage-data.sh" create "$collection" "$doc_id" "$json_data"
            ;;
        2)
            echo -n "Collection: "
            read -r collection
            echo -n "Document ID (leave empty for all): "
            read -r doc_id
            bash "$SCRIPT_DIR/database/manage-data.sh" read "$collection" "$doc_id"
            ;;
        3)
            echo -n "Collection: "
            read -r collection
            echo -n "Document ID: "
            read -r doc_id
            echo -n "JSON updates: "
            read -r json_data
            bash "$SCRIPT_DIR/database/manage-data.sh" update "$collection" "$doc_id" "$json_data"
            ;;
        4)
            echo -n "Collection: "
            read -r collection
            echo -n "Document ID: "
            read -r doc_id
            bash "$SCRIPT_DIR/database/manage-data.sh" delete "$collection" "$doc_id"
            ;;
        5)
            query_builder
            ;;
        8)
            interactive_query_builder
            ;;
    esac
}

# ── Interactive Query Builder ────────────────────────────────

interactive_query_builder() {
    echo -e "\n${CYAN}Interactive Query Builder${NC}"
    
    echo -n "Collection: "
    read -r collection
    
    echo "Select query type:"
    echo "1) Simple field query"
    echo "2) Range query"
    echo "3) Array contains"
    echo "4) Compound query"
    echo -n "Type: "
    read -r query_type
    
    case $query_type in
        1)
            echo -n "Field path: "
            read -r field
            echo "Operator: (EQUAL, NOT_EQUAL, etc.)"
            read -r operator
            echo -n "Value: "
            read -r value
            
            bash "$SCRIPT_DIR/database/manage-data.sh" query "$collection" "$field" "$operator" "$value"
            ;;
        2)
            echo -n "Field path: "
            read -r field
            echo -n "Min value: "
            read -r min_val
            echo -n "Max value: "
            read -r max_val
            
            # Create compound range query
            cat > /tmp/query.json << EOF
{
  "structuredQuery": {
    "from": [{"collectionId": "$collection"}],
    "where": {
      "compositeFilter": {
        "op": "AND",
        "filters": [
          {
            "fieldFilter": {
              "field": {"fieldPath": "$field"},
              "op": "GREATER_THAN_OR_EQUAL",
              "value": {"integerValue": "$min_val"}
            }
          },
          {
            "fieldFilter": {
              "field": {"fieldPath": "$field"},
              "op": "LESS_THAN_OR_EQUAL",
              "value": {"integerValue": "$max_val"}
            }
          }
        ]
      }
    }
  }
}
EOF
            curl -X POST \
                "https://firestore.googleapis.com/v1/projects/$GCP_PROJECT/databases/(default)/documents:runQuery" \
                -H "Authorization: Bearer $(gcloud auth print-access-token)" \
                -H "Content-Type: application/json" \
                -d @/tmp/query.json | jq '.'
            ;;
    esac
}

# ── Git Workflow ─────────────────────────────────────────────

git_workflow() {
    echo -e "\n${YELLOW}Git Workflow Manager${NC}"
    echo "1) Create feature branch"
    echo "2) Merge to staging"
    echo "3) Deploy to production"
    echo "4) Rollback"
    echo "5) View branch status"
    echo -n "Select: "
    read -r choice
    
    case $choice in
        1)
            echo -n "Feature name: "
            read -r feature_name
            git checkout -b "feature/$feature_name"
            echo -e "${GREEN}Created branch: feature/$feature_name${NC}"
            ;;
        2)
            git checkout staging
            git pull origin staging
            current_branch=$(git branch --show-current)
            git merge "$current_branch" --no-ff -m "Merge $current_branch to staging"
            git push origin staging
            echo -e "${GREEN}Merged to staging${NC}"
            
            # Auto-deploy to staging
            export ENVIRONMENT="staging"
            export GCP_PROJECT="$GCP_PROJECT_STAGING"
            deploy_to_environment
            ;;
        3)
            echo -e "${RED}Production Deployment Checklist:${NC}"
            echo "□ All tests passing"
            echo "□ Staging tested"
            echo "□ Database backed up"
            echo "□ Rollback plan ready"
            echo
            echo -n "Proceed? (yes/no): "
            read -r confirm
            if [ "$confirm" == "yes" ]; then
                git checkout main
                git pull origin main
                git merge staging --no-ff -m "Deploy to production"
                git push origin main
                
                # Tag release
                version=$(date +v%Y.%m.%d-%H%M)
                git tag -a "$version" -m "Production release $version"
                git push origin "$version"
                
                # Deploy to production
                export ENVIRONMENT="prod"
                export GCP_PROJECT="$GCP_PROJECT_PROD"
                deploy_to_environment
            fi
            ;;
    esac
}

# ── Local Development Server ─────────────────────────────────

local_development() {
    echo -e "\n${YELLOW}Local Development Server${NC}"
    echo "1) Start development server"
    echo "2) Start with hot reload"
    echo "3) Start with debug mode"
    echo "4) Start database emulator"
    echo "5) Full stack local"
    echo -n "Select: "
    read -r choice
    
    case $choice in
        1)
            npm run dev
            ;;
        2)
            npm run dev -- --turbo
            ;;
        3)
            NODE_OPTIONS='--inspect' npm run dev
            ;;
        4)
            gcloud emulators firestore start --host-port=localhost:8090
            ;;
        5)
            # Start all services in parallel
            echo "Starting full local stack..."
            gcloud emulators firestore start --host-port=localhost:8090 &
            FIRESTORE_EMULATOR_HOST="localhost:8090" npm run dev &
            wait
            ;;
    esac
}

# ── Monitoring Dashboard ─────────────────────────────────────

monitoring_dashboard() {
    echo -e "\n${CYAN}Monitoring Dashboard${NC}"
    
    # Service metrics
    echo -e "\n${YELLOW}Service Metrics (last hour):${NC}"
    gcloud monitoring metrics-descriptors list \
        --filter="metric.type:run.googleapis.com" \
        --limit=5 \
        --project="$GCP_PROJECT"
    
    # Recent logs
    echo -e "\n${YELLOW}Recent Logs:${NC}"
    gcloud logging read "resource.type=cloud_run_revision" \
        --limit=10 \
        --project="$GCP_PROJECT" \
        --format="table(timestamp,severity,textPayload)"
    
    # Error analysis
    echo -e "\n${YELLOW}Error Analysis:${NC}"
    gcloud logging read "severity>=ERROR" \
        --limit=5 \
        --project="$GCP_PROJECT" \
        --format="value(jsonPayload.error)"
    
    # Cost estimate
    echo -e "\n${YELLOW}Cost Analysis:${NC}"
    echo "Cloud Run invocations today: $(gcloud logging read 'resource.type=cloud_run_revision' --limit=1000 --project=$GCP_PROJECT | grep -c insertId)"
    echo "Firestore reads today: $(gcloud logging read 'protoPayload.methodName=~"google.firestore.*.Get"' --limit=1000 --project=$GCP_PROJECT | grep -c insertId)"
}

# ── Multi-Environment Sync ───────────────────────────────────

multi_environment_sync() {
    echo -e "\n${YELLOW}Multi-Environment Sync${NC}"
    echo "1) Sync dev → staging"
    echo "2) Sync staging → prod"
    echo "3) Copy prod data to staging (sanitized)"
    echo "4) Environment diff report"
    echo -n "Select: "
    read -r choice
    
    case $choice in
        1)
            echo "Syncing dev to staging..."
            # Export from dev
            gcloud firestore export "gs://${GCP_PROJECT_DEV}-backups/sync-$(date +%s)" \
                --project="$GCP_PROJECT_DEV"
            
            # Import to staging
            echo "Import path will be shown after export completes"
            ;;
        2)
            echo -e "${RED}WARNING: This will sync staging data to production${NC}"
            echo -n "Type 'SYNC TO PROD' to confirm: "
            read -r confirm
            if [ "$confirm" == "SYNC TO PROD" ]; then
                # Backup production first
                backup_database
                
                # Sync process
                echo "Syncing staging to production..."
            fi
            ;;
        4)
            echo "Environment Differences:"
            echo
            echo "Dev vs Staging:"
            diff <(gcloud run services describe "$APP_NAME" --project="$GCP_PROJECT_DEV" --region="$GCP_REGION" 2>/dev/null) \
                 <(gcloud run services describe "$APP_NAME" --project="$GCP_PROJECT_STAGING" --region="$GCP_REGION" 2>/dev/null) || true
            ;;
    esac
}

# ── Backup & Restore ─────────────────────────────────────────

backup_database() {
    echo -e "\n${YELLOW}Creating backup...${NC}"
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    BACKUP_BUCKET="${GCP_PROJECT}-backups"
    
    # Ensure backup bucket exists
    gsutil mb -p "$GCP_PROJECT" "gs://$BACKUP_BUCKET" 2>/dev/null || true
    
    # Create backup
    gcloud firestore export "gs://$BACKUP_BUCKET/backup-$TIMESTAMP" \
        --project="$GCP_PROJECT"
    
    echo -e "${GREEN}✓ Backup initiated: gs://$BACKUP_BUCKET/backup-$TIMESTAMP${NC}"
}

# ── Settings Management ──────────────────────────────────────

show_settings() {
    echo -e "\n${CYAN}Settings${NC}"
    echo "Current configuration:"
    echo "  APP_NAME: $APP_NAME"
    echo "  ENVIRONMENT: $ENVIRONMENT"
    echo "  GCP_PROJECT: $GCP_PROJECT"
    echo "  GCP_REGION: $GCP_REGION"
    echo "  DOCKER_HUB_USER: $DOCKER_HUB_USER"
    echo
    echo "1) Change environment"
    echo "2) Update Docker Hub username"
    echo "3) Configure notifications"
    echo "4) Set up CI/CD"
    echo -n "Select: "
    read -r choice
    
    case $choice in
        1)
            echo "Select environment:"
            echo "1) Development"
            echo "2) Staging"
            echo "3) Production"
            read -r env_choice
            case $env_choice in
                1) export ENVIRONMENT="dev"; export GCP_PROJECT="$GCP_PROJECT_DEV" ;;
                2) export ENVIRONMENT="staging"; export GCP_PROJECT="$GCP_PROJECT_STAGING" ;;
                3) export ENVIRONMENT="prod"; export GCP_PROJECT="$GCP_PROJECT_PROD" ;;
            esac
            ;;
    esac
}

# ── Help System ──────────────────────────────────────────────

show_help() {
    echo -e "\n${CYAN}Help & Documentation${NC}"
    cat << EOF

Quick Commands:
  ./orchestrate-app.sh deploy     - Deploy to current environment
  ./orchestrate-app.sh logs       - View live logs
  ./orchestrate-app.sh db         - Database CLI
  ./orchestrate-app.sh status     - Check service status
  
Environment Variables:
  APP_NAME              - Application name
  GCP_PROJECT_*         - Project IDs for each environment
  DOCKER_HUB_USER       - Docker Hub username
  
Database Operations:
  Create: db create <collection> <id> <json>
  Read:   db read <collection> [id]
  Query:  db query <collection> <field> <op> <value>
  
Git Workflow:
  feature → develop → staging → main
  
Monitoring:
  Logs:    gcloud logging tail
  Metrics: gcloud monitoring dashboards list
  Errors:  gcloud logging read "severity>=ERROR"
  
Support:
  Documentation: https://docs.example.com
  Issues:        https://github.com/org/repo/issues

EOF
    read -p "Press Enter to continue..."
}

# ── Main Loop ────────────────────────────────────────────────

main() {
    # Handle command line arguments
    if [ $# -gt 0 ]; then
        case "$1" in
            deploy) deploy_to_environment ;;
            logs) gcloud run services logs tail "$APP_NAME" --project="$GCP_PROJECT" ;;
            db) shift; database_cli "$@" ;;
            status) monitoring_dashboard ;;
            backup) backup_database ;;
            help) show_help ;;
            *) echo "Usage: $0 [deploy|logs|db|status|backup|help]" ;;
        esac
        exit 0
    fi
    
    # Interactive mode
    while true; do
        show_dashboard
        read -r choice
        
        case $choice in
            1) deploy_to_environment ;;
            2) gcloud run services logs tail "$APP_NAME" --project="$GCP_PROJECT" --region="$GCP_REGION" ;;
            3) database_cli ;;
            4) npm test ;;
            5) local_development ;;
            6) npm run build && npm test ;;
            7) docker_operations ;;
            8) git_workflow ;;
            9) database_cli ;;
            10) bash "$SCRIPT_DIR/database/migrate-schema.sh" status ;;
            11) backup_database ;;
            12) interactive_query_builder ;;
            13) bash "$SCRIPT_DIR/setup-infrastructure.sh" ;;
            14) bash "$SCRIPT_DIR/secrets-manager.sh" ;;
            15) monitoring_dashboard ;;
            16) echo "Alert configuration..." ;;
            17) multi_environment_sync ;;
            18) echo "Performance analysis..." ;;
            19) NODE_OPTIONS='--inspect' npm run dev ;;
            20) generate_reports ;;
            h) show_help ;;
            s) show_settings ;;
            0) echo -e "${GREEN}Goodbye!${NC}"; exit 0 ;;
            *) echo -e "${RED}Invalid option${NC}"; sleep 1 ;;
        esac
        
        if [ "$choice" != "2" ]; then
            read -p "Press Enter to continue..."
        fi
    done
}

# Execute
main "$@"