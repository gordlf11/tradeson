#!/bin/bash
# ============================================================
# Multi-Developer Collaboration Workflow Manager
# Purpose: Coordinate development between multiple developers
# ============================================================

set -e

# Configuration
APP_NAME="${APP_NAME:-my-app}"
GIT_REMOTE="${GIT_REMOTE:-origin}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
DISCORD_WEBHOOK="${DISCORD_WEBHOOK:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# ── Developer Management ─────────────────────────────────────

setup_developer() {
    echo -e "${CYAN}Developer Setup Wizard${NC}"
    
    echo -n "Developer name: "
    read -r dev_name
    
    echo -n "Developer email: "
    read -r dev_email
    
    # Configure git
    git config user.name "$dev_name"
    git config user.email "$dev_email"
    
    # Create developer branch
    dev_branch="dev/$dev_name"
    git checkout -b "$dev_branch" 2>/dev/null || git checkout "$dev_branch"
    
    # Set up pre-commit hooks
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Run tests before commit
npm test || {
    echo "Tests failed. Commit aborted."
    exit 1
}

# Run linter
npm run lint || {
    echo "Linting failed. Commit aborted."
    exit 1
}

# Check for merge conflicts
if grep -rn "<<<<<<< HEAD" --include="*.js" --include="*.ts" --include="*.tsx" .; then
    echo "Merge conflict markers found. Please resolve before committing."
    exit 1
fi
EOF
    chmod +x .git/hooks/pre-commit
    
    # Set up post-commit hook for notifications
    cat > .git/hooks/post-commit << EOF
#!/bin/bash
# Notify team of commit
if [ -n "$SLACK_WEBHOOK" ]; then
    curl -X POST $SLACK_WEBHOOK \
        -H 'Content-Type: application/json' \
        -d "{\"text\":\"$dev_name committed to $dev_branch: \$(git log -1 --pretty=%B)\"}"
fi
EOF
    chmod +x .git/hooks/post-commit
    
    echo -e "${GREEN}✓ Developer setup complete${NC}"
    echo "Your branch: $dev_branch"
}

# ── Conflict Resolution Helper ───────────────────────────────

resolve_conflicts() {
    echo -e "${YELLOW}Conflict Resolution Assistant${NC}"
    
    # Check for conflicts
    if ! git diff --check; then
        echo -e "${RED}Merge conflicts detected!${NC}"
        
        # List conflicted files
        echo -e "\n${YELLOW}Conflicted files:${NC}"
        git diff --name-only --diff-filter=U
        
        echo -e "\n${CYAN}Resolution options:${NC}"
        echo "1) Open in merge tool"
        echo "2) Accept theirs (incoming changes)"
        echo "3) Accept ours (your changes)"
        echo "4) Manual resolution"
        echo "5) Show conflict details"
        echo -n "Select: "
        read -r choice
        
        case $choice in
            1)
                git mergetool
                ;;
            2)
                git checkout --theirs .
                git add .
                echo -e "${GREEN}✓ Accepted incoming changes${NC}"
                ;;
            3)
                git checkout --ours .
                git add .
                echo -e "${GREEN}✓ Kept your changes${NC}"
                ;;
            4)
                echo "Edit the files manually, then run:"
                echo "  git add <files>"
                echo "  git commit"
                ;;
            5)
                git diff --name-only --diff-filter=U | while read -r file; do
                    echo -e "\n${YELLOW}File: $file${NC}"
                    git diff "$file"
                done
                ;;
        esac
    else
        echo -e "${GREEN}No conflicts detected${NC}"
    fi
}

# ── Branch Synchronization ───────────────────────────────────

sync_branches() {
    echo -e "${CYAN}Branch Synchronization${NC}"
    
    current_branch=$(git branch --show-current)
    
    # Fetch latest
    git fetch --all
    
    # Show branch status
    echo -e "\n${YELLOW}Branch Status:${NC}"
    git for-each-ref --format='%(refname:short) %(upstream:track)' refs/heads | column -t
    
    echo -e "\n${CYAN}Sync options:${NC}"
    echo "1) Pull latest from main"
    echo "2) Merge another developer's branch"
    echo "3) Rebase on main"
    echo "4) Push your changes"
    echo "5) Create pull request"
    echo -n "Select: "
    read -r choice
    
    case $choice in
        1)
            git pull origin main --no-edit
            echo -e "${GREEN}✓ Synced with main${NC}"
            ;;
        2)
            echo "Available branches:"
            git branch -r | grep -v HEAD | sed 's/origin\///'
            echo -n "Branch to merge: "
            read -r branch_name
            git pull origin "$branch_name" --no-edit
            echo -e "${GREEN}✓ Merged $branch_name${NC}"
            ;;
        3)
            git rebase origin/main
            echo -e "${GREEN}✓ Rebased on main${NC}"
            ;;
        4)
            git push -u origin "$current_branch"
            echo -e "${GREEN}✓ Pushed to $current_branch${NC}"
            ;;
        5)
            # Create PR using gh CLI if available
            if command -v gh &> /dev/null; then
                gh pr create --fill
            else
                echo "Install GitHub CLI (gh) for PR creation"
                echo "Or create manually at: https://github.com/<org>/<repo>/pull/new/$current_branch"
            fi
            ;;
    esac
}

# ── Code Review System ───────────────────────────────────────

code_review() {
    echo -e "${CYAN}Code Review System${NC}"
    
    echo "1) Request review"
    echo "2) Review pending PRs"
    echo "3) View review comments"
    echo "4) Approve changes"
    echo -n "Select: "
    read -r choice
    
    case $choice in
        1)
            echo -n "Branch to review: "
            read -r branch
            echo -n "Reviewers (comma-separated): "
            read -r reviewers
            
            if command -v gh &> /dev/null; then
                gh pr create --base main --head "$branch" \
                    --reviewer "$reviewers" \
                    --title "Review: $branch" \
                    --body "Please review changes in $branch"
            fi
            
            # Send notification
            notify_team "Code review requested for $branch by $(git config user.name)"
            ;;
        2)
            if command -v gh &> /dev/null; then
                gh pr list --state open
            else
                echo "Install GitHub CLI to view PRs"
            fi
            ;;
        3)
            if command -v gh &> /dev/null; then
                echo -n "PR number: "
                read -r pr_number
                gh pr view "$pr_number" --comments
            fi
            ;;
        4)
            if command -v gh &> /dev/null; then
                echo -n "PR number to approve: "
                read -r pr_number
                gh pr review "$pr_number" --approve
            fi
            ;;
    esac
}

# ── Lock File Management ─────────────────────────────────────

manage_locks() {
    echo -e "${CYAN}File Lock Management${NC}"
    
    LOCK_FILE=".dev-locks.json"
    
    # Initialize lock file if doesn't exist
    if [ ! -f "$LOCK_FILE" ]; then
        echo '{"locks": []}' > "$LOCK_FILE"
    fi
    
    echo "1) Lock file for editing"
    echo "2) Unlock file"
    echo "3) View locked files"
    echo "4) Force unlock (admin)"
    echo -n "Select: "
    read -r choice
    
    case $choice in
        1)
            echo -n "File to lock: "
            read -r file_path
            
            # Check if already locked
            if jq -e ".locks[] | select(.file == \"$file_path\")" "$LOCK_FILE" > /dev/null; then
                echo -e "${RED}File already locked${NC}"
                jq -r ".locks[] | select(.file == \"$file_path\") | \"Locked by: \\(.user) at \\(.timestamp)\"" "$LOCK_FILE"
            else
                # Add lock
                jq ".locks += [{\"file\": \"$file_path\", \"user\": \"$(git config user.name)\", \"timestamp\": \"$(date -Iseconds)\"}]" "$LOCK_FILE" > "$LOCK_FILE.tmp"
                mv "$LOCK_FILE.tmp" "$LOCK_FILE"
                git add "$LOCK_FILE"
                git commit -m "Lock: $file_path"
                git push
                echo -e "${GREEN}✓ File locked${NC}"
            fi
            ;;
        2)
            echo -n "File to unlock: "
            read -r file_path
            
            # Remove lock
            jq "del(.locks[] | select(.file == \"$file_path\"))" "$LOCK_FILE" > "$LOCK_FILE.tmp"
            mv "$LOCK_FILE.tmp" "$LOCK_FILE"
            git add "$LOCK_FILE"
            git commit -m "Unlock: $file_path"
            git push
            echo -e "${GREEN}✓ File unlocked${NC}"
            ;;
        3)
            echo -e "\n${YELLOW}Currently locked files:${NC}"
            jq -r '.locks[] | "\(.file) - locked by \(.user) at \(.timestamp)"' "$LOCK_FILE"
            ;;
        4)
            echo -e "${RED}Warning: Force unlock all files${NC}"
            echo -n "Type 'FORCE UNLOCK' to confirm: "
            read -r confirm
            if [ "$confirm" == "FORCE UNLOCK" ]; then
                echo '{"locks": []}' > "$LOCK_FILE"
                git add "$LOCK_FILE"
                git commit -m "Force unlock all files"
                git push
                echo -e "${GREEN}✓ All files unlocked${NC}"
            fi
            ;;
    esac
}

# ── Docker Development Environment ───────────────────────────

docker_dev_env() {
    echo -e "${CYAN}Docker Development Environment${NC}"
    
    echo "1) Start dev container"
    echo "2) Stop dev container"
    echo "3) Rebuild container"
    echo "4) View container logs"
    echo "5) Shell into container"
    echo "6) Sync volumes"
    echo -n "Select: "
    read -r choice
    
    case $choice in
        1)
            # Create docker-compose for development
            cat > docker-compose.dev.yml << EOF
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - "3000:3000"
      - "9229:9229"  # Debug port
    environment:
      - NODE_ENV=development
      - CHOKIDAR_USEPOLLING=true
    command: npm run dev

  db:
    image: google/cloud-sdk:alpine
    command: gcloud emulators firestore start --host-port=0.0.0.0:8090
    ports:
      - "8090:8090"

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
EOF
            
            docker-compose -f docker-compose.dev.yml up -d
            echo -e "${GREEN}✓ Development environment started${NC}"
            echo "App: http://localhost:3000"
            echo "Firestore: http://localhost:8090"
            ;;
        2)
            docker-compose -f docker-compose.dev.yml down
            echo -e "${GREEN}✓ Development environment stopped${NC}"
            ;;
        3)
            docker-compose -f docker-compose.dev.yml build --no-cache
            echo -e "${GREEN}✓ Container rebuilt${NC}"
            ;;
        4)
            docker-compose -f docker-compose.dev.yml logs -f
            ;;
        5)
            docker-compose -f docker-compose.dev.yml exec app /bin/bash
            ;;
        6)
            echo "Syncing volumes..."
            docker-compose -f docker-compose.dev.yml exec app npm install
            echo -e "${GREEN}✓ Volumes synced${NC}"
            ;;
    esac
}

# ── Parallel Development ─────────────────────────────────────

parallel_dev() {
    echo -e "${CYAN}Parallel Development Coordinator${NC}"
    
    # Show who's working on what
    echo -e "\n${YELLOW}Active Development:${NC}"
    
    # Check recent branches
    git for-each-ref --sort=-committerdate refs/remotes \
        --format='%(committerdate:short) %(authorname) %(refname:short)' \
        | head -10
    
    echo -e "\n${CYAN}Coordinate work:${NC}"
    echo "1) Claim feature"
    echo "2) Release feature"
    echo "3) View feature map"
    echo "4) Split large feature"
    echo -n "Select: "
    read -r choice
    
    FEATURE_MAP=".feature-map.json"
    
    # Initialize feature map
    if [ ! -f "$FEATURE_MAP" ]; then
        echo '{"features": []}' > "$FEATURE_MAP"
    fi
    
    case $choice in
        1)
            echo -n "Feature name: "
            read -r feature
            echo -n "Estimated hours: "
            read -r hours
            
            # Add to feature map
            jq ".features += [{\"name\": \"$feature\", \"developer\": \"$(git config user.name)\", \"status\": \"in-progress\", \"started\": \"$(date -Iseconds)\", \"estimated_hours\": $hours}]" "$FEATURE_MAP" > "$FEATURE_MAP.tmp"
            mv "$FEATURE_MAP.tmp" "$FEATURE_MAP"
            
            # Create feature branch
            git checkout -b "feature/$feature"
            git add "$FEATURE_MAP"
            git commit -m "Claim feature: $feature"
            git push -u origin "feature/$feature"
            
            echo -e "${GREEN}✓ Feature claimed: $feature${NC}"
            notify_team "$(git config user.name) started work on: $feature"
            ;;
        2)
            echo -n "Feature to release: "
            read -r feature
            
            # Update feature map
            jq "(.features[] | select(.name == \"$feature\") | .status) = \"completed\"" "$FEATURE_MAP" > "$FEATURE_MAP.tmp"
            mv "$FEATURE_MAP.tmp" "$FEATURE_MAP"
            
            git add "$FEATURE_MAP"
            git commit -m "Complete feature: $feature"
            git push
            
            echo -e "${GREEN}✓ Feature released: $feature${NC}"
            notify_team "$(git config user.name) completed: $feature"
            ;;
        3)
            echo -e "\n${YELLOW}Feature Map:${NC}"
            jq -r '.features[] | "\(.name): \(.developer) - \(.status) (Est: \(.estimated_hours)h)"' "$FEATURE_MAP"
            ;;
        4)
            echo -n "Feature to split: "
            read -r feature
            echo -n "Number of sub-features: "
            read -r num_sub
            
            for ((i=1; i<=num_sub; i++)); do
                echo -n "Sub-feature $i name: "
                read -r sub_name
                echo -n "Assign to developer: "
                read -r dev_name
                
                jq ".features += [{\"name\": \"$feature/$sub_name\", \"developer\": \"$dev_name\", \"status\": \"pending\", \"parent\": \"$feature\"}]" "$FEATURE_MAP" > "$FEATURE_MAP.tmp"
                mv "$FEATURE_MAP.tmp" "$FEATURE_MAP"
            done
            
            git add "$FEATURE_MAP"
            git commit -m "Split feature: $feature into $num_sub parts"
            git push
            
            echo -e "${GREEN}✓ Feature split into $num_sub parts${NC}"
            ;;
    esac
}

# ── Notification System ──────────────────────────────────────

notify_team() {
    local message=$1
    
    # Slack notification
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"$message\"}" \
            2>/dev/null
    fi
    
    # Discord notification
    if [ -n "$DISCORD_WEBHOOK" ]; then
        curl -X POST "$DISCORD_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{\"content\":\"$message\"}" \
            2>/dev/null
    fi
    
    # Local notification (macOS)
    if command -v osascript &> /dev/null; then
        osascript -e "display notification \"$message\" with title \"Team Update\""
    fi
}

# ── Main Menu ────────────────────────────────────────────────

show_menu() {
    clear
    echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║       Multi-Developer Collaboration Manager             ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
    
    # Show current developer
    echo -e "Developer: ${GREEN}$(git config user.name)${NC}"
    echo -e "Branch: ${YELLOW}$(git branch --show-current)${NC}"
    echo
    
    echo -e "${BLUE}┌─ Setup ─────────────────────────────────────────────────┐${NC}"
    echo "  1) Developer Setup"
    echo "  2) Configure Notifications"
    echo
    echo -e "${BLUE}┌─ Development ───────────────────────────────────────────┐${NC}"
    echo "  3) Branch Synchronization"
    echo "  4) Conflict Resolution"
    echo "  5) Code Review"
    echo
    echo -e "${BLUE}┌─ Coordination ──────────────────────────────────────────┐${NC}"
    echo "  6) File Lock Management"
    echo "  7) Parallel Development"
    echo "  8) Feature Planning"
    echo
    echo -e "${BLUE}┌─ Environment ───────────────────────────────────────────┐${NC}"
    echo "  9) Docker Dev Environment"
    echo "  10) Shared Testing"
    echo
    echo "  0) Exit"
    echo
    echo -n "Select option: "
}

# ── Main ─────────────────────────────────────────────────────

main() {
    while true; do
        show_menu
        read -r choice
        
        case $choice in
            1) setup_developer ;;
            2) 
                echo -n "Slack webhook URL: "
                read -r SLACK_WEBHOOK
                echo -n "Discord webhook URL: "
                read -r DISCORD_WEBHOOK
                echo -e "${GREEN}✓ Notifications configured${NC}"
                ;;
            3) sync_branches ;;
            4) resolve_conflicts ;;
            5) code_review ;;
            6) manage_locks ;;
            7) parallel_dev ;;
            8) echo "Feature planning..." ;;
            9) docker_dev_env ;;
            10) echo "Shared testing environment..." ;;
            0) echo -e "${GREEN}Goodbye!${NC}"; exit 0 ;;
            *) echo -e "${RED}Invalid option${NC}" ;;
        esac
        
        if [ "$choice" != "0" ]; then
            read -p "Press Enter to continue..."
        fi
    done
}

# Execute
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi