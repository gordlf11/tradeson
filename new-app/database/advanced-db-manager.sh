#!/bin/bash
# ============================================================
# Advanced Database Manager with Real-time Operations
# Purpose: Production-grade database operations and monitoring
# ============================================================

set -e

# Configuration
PROJECT_ID="${GCP_PROJECT:-my-app-prod}"
FIRESTORE_URL="https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ── Authentication ───────────────────────────────────────────

get_token() {
    gcloud auth print-access-token
}

# ── Advanced Query Builder ───────────────────────────────────

build_complex_query() {
    local collection=$1
    
    echo -e "${CYAN}Advanced Query Builder${NC}"
    echo "Building query for collection: $collection"
    
    # Start building query JSON
    cat > /tmp/query_builder.json << EOF
{
  "structuredQuery": {
    "from": [{"collectionId": "$collection"}],
EOF
    
    # Add WHERE clause
    echo "Add WHERE conditions? (y/n): "
    read -r add_where
    
    if [ "$add_where" == "y" ]; then
        echo "Number of conditions: "
        read -r num_conditions
        
        if [ "$num_conditions" -gt 1 ]; then
            echo "Combine with (AND/OR): "
            read -r combine_op
            
            cat >> /tmp/query_builder.json << EOF
    "where": {
      "compositeFilter": {
        "op": "$combine_op",
        "filters": [
EOF
        fi
        
        for ((i=1; i<=num_conditions; i++)); do
            echo -e "\n${YELLOW}Condition $i:${NC}"
            echo -n "Field path: "
            read -r field
            
            echo "Operator:"
            echo "1) EQUAL"
            echo "2) NOT_EQUAL"
            echo "3) GREATER_THAN"
            echo "4) GREATER_THAN_OR_EQUAL"
            echo "5) LESS_THAN"
            echo "6) LESS_THAN_OR_EQUAL"
            echo "7) ARRAY_CONTAINS"
            echo "8) IN"
            echo "9) ARRAY_CONTAINS_ANY"
            read -r op_choice
            
            case $op_choice in
                1) operator="EQUAL" ;;
                2) operator="NOT_EQUAL" ;;
                3) operator="GREATER_THAN" ;;
                4) operator="GREATER_THAN_OR_EQUAL" ;;
                5) operator="LESS_THAN" ;;
                6) operator="LESS_THAN_OR_EQUAL" ;;
                7) operator="ARRAY_CONTAINS" ;;
                8) operator="IN" ;;
                9) operator="ARRAY_CONTAINS_ANY" ;;
            esac
            
            echo "Value type:"
            echo "1) String"
            echo "2) Integer"
            echo "3) Boolean"
            echo "4) Timestamp"
            echo "5) Array"
            read -r value_type_choice
            
            echo -n "Value: "
            read -r value
            
            # Build value JSON based on type
            case $value_type_choice in
                1) value_json="{\"stringValue\": \"$value\"}" ;;
                2) value_json="{\"integerValue\": \"$value\"}" ;;
                3) value_json="{\"booleanValue\": $value}" ;;
                4) value_json="{\"timestampValue\": \"$value\"}" ;;
                5) value_json="{\"arrayValue\": {\"values\": [$value]}}" ;;
            esac
            
            if [ "$num_conditions" -gt 1 ]; then
                if [ $i -gt 1 ]; then echo "," >> /tmp/query_builder.json; fi
                cat >> /tmp/query_builder.json << EOF
          {
            "fieldFilter": {
              "field": {"fieldPath": "$field"},
              "op": "$operator",
              "value": $value_json
            }
          }
EOF
            else
                cat >> /tmp/query_builder.json << EOF
    "where": {
      "fieldFilter": {
        "field": {"fieldPath": "$field"},
        "op": "$operator",
        "value": $value_json
      }
    },
EOF
            fi
        done
        
        if [ "$num_conditions" -gt 1 ]; then
            cat >> /tmp/query_builder.json << EOF

        ]
      }
    },
EOF
        fi
    fi
    
    # Add ORDER BY
    echo "Add ORDER BY? (y/n): "
    read -r add_order
    
    if [ "$add_order" == "y" ]; then
        echo -n "Field to order by: "
        read -r order_field
        echo "Direction (ASCENDING/DESCENDING): "
        read -r direction
        
        cat >> /tmp/query_builder.json << EOF
    "orderBy": [{
      "field": {"fieldPath": "$order_field"},
      "direction": "$direction"
    }],
EOF
    fi
    
    # Add LIMIT
    echo -n "Limit results (default 100): "
    read -r limit
    limit="${limit:-100}"
    
    cat >> /tmp/query_builder.json << EOF
    "limit": $limit
  }
}
EOF
    
    # Execute query
    echo -e "\n${YELLOW}Executing query...${NC}"
    response=$(curl -s -X POST \
        "https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery" \
        -H "Authorization: Bearer $(get_token)" \
        -H "Content-Type: application/json" \
        -d @/tmp/query_builder.json)
    
    # Parse and display results
    echo "$response" | jq -r '.[] | .document.fields' 2>/dev/null || echo "$response"
    
    # Save query for reuse
    echo -e "\n${GREEN}Query saved to: /tmp/last_query.json${NC}"
    cp /tmp/query_builder.json /tmp/last_query.json
}

# ── Batch Operations with Progress ───────────────────────────

batch_import_csv() {
    local csv_file=$1
    local collection=$2
    
    if [ ! -f "$csv_file" ]; then
        echo -e "${RED}File not found: $csv_file${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}Importing CSV to $collection...${NC}"
    
    # Count total lines
    total_lines=$(wc -l < "$csv_file")
    current_line=0
    
    # Read CSV header
    IFS=',' read -r -a headers < "$csv_file"
    
    # Process each line
    tail -n +2 "$csv_file" | while IFS=',' read -r -a values; do
        current_line=$((current_line + 1))
        
        # Build JSON from CSV row
        json='{"fields":{'
        for i in "${!headers[@]}"; do
            if [ $i -gt 0 ]; then json+=','; fi
            # Auto-detect type
            if [[ "${values[$i]}" =~ ^[0-9]+$ ]]; then
                json+="\"${headers[$i]}\":{\"integerValue\":\"${values[$i]}\"}"
            elif [[ "${values[$i]}" =~ ^(true|false)$ ]]; then
                json+="\"${headers[$i]}\":{\"booleanValue\":${values[$i]}}"
            else
                json+="\"${headers[$i]}\":{\"stringValue\":\"${values[$i]}\"}"
            fi
        done
        json+='}}'
        
        # Generate document ID
        doc_id="${collection}_$(date +%s%N)"
        
        # Create document
        curl -s -X POST \
            "${FIRESTORE_URL}/${collection}?documentId=${doc_id}" \
            -H "Authorization: Bearer $(get_token)" \
            -H "Content-Type: application/json" \
            -d "$json" > /dev/null
        
        # Show progress
        progress=$((current_line * 100 / total_lines))
        printf "\rProgress: [%-50s] %d%%" $(printf '#%.0s' $(seq 1 $((progress/2)))) $progress
    done
    
    echo -e "\n${GREEN}✓ Imported $current_line documents${NC}"
}

# ── Real-time Monitoring ─────────────────────────────────────

monitor_collection() {
    local collection=$1
    local refresh_seconds=${2:-5}
    
    echo -e "${CYAN}Monitoring collection: $collection${NC}"
    echo "Refresh every ${refresh_seconds}s (Ctrl+C to stop)"
    
    while true; do
        clear
        echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
        echo -e "${CYAN}║  Real-time Monitor: $collection$(printf ' %.0s' {1..30})║${NC}"
        echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
        
        # Get collection stats
        response=$(curl -s -X GET \
            "${FIRESTORE_URL}/${collection}" \
            -H "Authorization: Bearer $(get_token)")
        
        doc_count=$(echo "$response" | grep -o '"name"' | wc -l)
        
        echo -e "\n${YELLOW}Statistics:${NC}"
        echo "  Document count: $doc_count"
        echo "  Last refresh: $(date '+%Y-%m-%d %H:%M:%S')"
        
        # Get recent documents
        echo -e "\n${YELLOW}Recent Documents (last 5):${NC}"
        echo "$response" | jq -r '.documents[-5:] | .[] | "\(.name | split("/")[-1]): \(.fields | to_entries | map("\(.key)=\(.value | tostring)") | join(", "))"' 2>/dev/null || echo "No documents"
        
        # Check for changes
        if [ -f "/tmp/monitor_${collection}_last" ]; then
            if ! diff -q <(echo "$response") "/tmp/monitor_${collection}_last" > /dev/null; then
                echo -e "\n${GREEN}● Changes detected${NC}"
            fi
        fi
        echo "$response" > "/tmp/monitor_${collection}_last"
        
        sleep "$refresh_seconds"
    done
}

# ── Transaction Support ──────────────────────────────────────

execute_transaction() {
    echo -e "${YELLOW}Transaction Builder${NC}"
    
    local operations=()
    
    while true; do
        echo -e "\nCurrent transaction has ${#operations[@]} operations"
        echo "1) Add CREATE operation"
        echo "2) Add UPDATE operation"
        echo "3) Add DELETE operation"
        echo "4) Execute transaction"
        echo "5) Cancel"
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
                
                operations+=("CREATE:$collection:$doc_id:$json_data")
                echo -e "${GREEN}Added CREATE operation${NC}"
                ;;
            2)
                echo -n "Collection: "
                read -r collection
                echo -n "Document ID: "
                read -r doc_id
                echo -n "JSON updates: "
                read -r json_data
                
                operations+=("UPDATE:$collection:$doc_id:$json_data")
                echo -e "${GREEN}Added UPDATE operation${NC}"
                ;;
            3)
                echo -n "Collection: "
                read -r collection
                echo -n "Document ID: "
                read -r doc_id
                
                operations+=("DELETE:$collection:$doc_id")
                echo -e "${GREEN}Added DELETE operation${NC}"
                ;;
            4)
                if [ ${#operations[@]} -eq 0 ]; then
                    echo -e "${RED}No operations to execute${NC}"
                    continue
                fi
                
                echo -e "\n${YELLOW}Executing transaction with ${#operations[@]} operations...${NC}"
                
                # Build transaction JSON
                echo '{"writes": [' > /tmp/transaction.json
                
                first=true
                for op in "${operations[@]}"; do
                    IFS=':' read -r op_type collection doc_id json_data <<< "$op"
                    
                    if [ "$first" != true ]; then
                        echo "," >> /tmp/transaction.json
                    fi
                    first=false
                    
                    case $op_type in
                        CREATE)
                            cat >> /tmp/transaction.json << EOF
{
  "update": {
    "name": "projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${doc_id}",
    "fields": ${json_data:-{}}
  }
}
EOF
                            ;;
                        UPDATE)
                            cat >> /tmp/transaction.json << EOF
{
  "updateMask": {"fieldPaths": ["*"]},
  "currentDocument": {"exists": true},
  "update": {
    "name": "projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${doc_id}",
    "fields": ${json_data:-{}}
  }
}
EOF
                            ;;
                        DELETE)
                            cat >> /tmp/transaction.json << EOF
{
  "delete": "projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${doc_id}"
}
EOF
                            ;;
                    esac
                done
                
                echo "]}" >> /tmp/transaction.json
                
                # Execute transaction
                response=$(curl -s -X POST \
                    "https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:commit" \
                    -H "Authorization: Bearer $(get_token)" \
                    -H "Content-Type: application/json" \
                    -d @/tmp/transaction.json)
                
                if echo "$response" | grep -q "error"; then
                    echo -e "${RED}Transaction failed:${NC}"
                    echo "$response" | jq '.'
                else
                    echo -e "${GREEN}✓ Transaction completed successfully${NC}"
                fi
                
                return
                ;;
            5)
                echo "Transaction cancelled"
                return
                ;;
        esac
    done
}

# ── Data Validation ──────────────────────────────────────────

validate_collection() {
    local collection=$1
    local schema_file=$2
    
    echo -e "${YELLOW}Validating $collection against schema...${NC}"
    
    if [ ! -f "$schema_file" ]; then
        echo -e "${RED}Schema file not found: $schema_file${NC}"
        return 1
    fi
    
    # Get all documents
    response=$(curl -s -X GET \
        "${FIRESTORE_URL}/${collection}" \
        -H "Authorization: Bearer $(get_token)")
    
    # Validate each document
    invalid_count=0
    total_count=$(echo "$response" | grep -o '"name"' | wc -l)
    
    echo "$response" | jq -c '.documents[]' | while read -r doc; do
        doc_id=$(echo "$doc" | jq -r '.name' | awk -F'/' '{print $NF}')
        
        # Validate against schema (simplified example)
        # In production, use a proper JSON schema validator
        required_fields=$(jq -r '.required[]' "$schema_file" 2>/dev/null)
        
        for field in $required_fields; do
            if ! echo "$doc" | jq -e ".fields.$field" > /dev/null 2>&1; then
                echo -e "${RED}Document $doc_id missing required field: $field${NC}"
                invalid_count=$((invalid_count + 1))
            fi
        done
    done
    
    echo -e "\n${GREEN}Validation complete: $((total_count - invalid_count))/$total_count valid documents${NC}"
}

# ── Performance Analysis ─────────────────────────────────────

analyze_performance() {
    local collection=$1
    
    echo -e "${CYAN}Performance Analysis for $collection${NC}"
    
    # Measure read performance
    echo -e "\n${YELLOW}Read Performance Test:${NC}"
    start_time=$(date +%s%N)
    
    curl -s -X GET \
        "${FIRESTORE_URL}/${collection}?pageSize=100" \
        -H "Authorization: Bearer $(get_token)" > /dev/null
    
    end_time=$(date +%s%N)
    read_time=$(( (end_time - start_time) / 1000000 ))
    echo "  100 document read: ${read_time}ms"
    
    # Measure write performance
    echo -e "\n${YELLOW}Write Performance Test:${NC}"
    test_doc='{"fields":{"test":{"booleanValue":true}}}'
    
    start_time=$(date +%s%N)
    
    for i in {1..10}; do
        curl -s -X POST \
            "${FIRESTORE_URL}/${collection}?documentId=perf_test_$i" \
            -H "Authorization: Bearer $(get_token)" \
            -H "Content-Type: application/json" \
            -d "$test_doc" > /dev/null
    done
    
    end_time=$(date +%s%N)
    write_time=$(( (end_time - start_time) / 1000000 / 10 ))
    echo "  Average write time: ${write_time}ms"
    
    # Clean up test documents
    for i in {1..10}; do
        curl -s -X DELETE \
            "${FIRESTORE_URL}/${collection}/perf_test_$i" \
            -H "Authorization: Bearer $(get_token)" > /dev/null
    done
    
    # Index recommendations
    echo -e "\n${YELLOW}Index Recommendations:${NC}"
    echo "  Consider adding indexes for frequently queried fields"
    echo "  Current indexes:"
    gcloud firestore indexes list --project="$PROJECT_ID" 2>/dev/null || echo "  None configured"
}

# ── Cache Management ─────────────────────────────────────────

manage_cache() {
    echo -e "${CYAN}Cache Management${NC}"
    echo "1) View cache statistics"
    echo "2) Warm cache for collection"
    echo "3) Clear cache"
    echo "4) Set up Redis caching"
    echo -n "Select: "
    read -r choice
    
    case $choice in
        1)
            if command -v redis-cli &> /dev/null; then
                echo -e "\n${YELLOW}Redis Cache Stats:${NC}"
                redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" INFO stats
            else
                echo "Redis not available"
            fi
            ;;
        2)
            echo -n "Collection to warm: "
            read -r collection
            
            echo "Warming cache for $collection..."
            
            # Fetch all documents and cache them
            response=$(curl -s -X GET \
                "${FIRESTORE_URL}/${collection}" \
                -H "Authorization: Bearer $(get_token)")
            
            if command -v redis-cli &> /dev/null; then
                echo "$response" | jq -c '.documents[]' | while read -r doc; do
                    doc_id=$(echo "$doc" | jq -r '.name' | awk -F'/' '{print $NF}')
                    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" \
                        SETEX "firestore:${collection}:${doc_id}" 3600 "$doc" > /dev/null
                done
                echo -e "${GREEN}✓ Cache warmed${NC}"
            fi
            ;;
        3)
            if command -v redis-cli &> /dev/null; then
                redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" FLUSHDB
                echo -e "${GREEN}✓ Cache cleared${NC}"
            fi
            ;;
    esac
}

# ── Main Menu ────────────────────────────────────────────────

show_menu() {
    echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║          Advanced Database Manager                      ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "${BLUE}Basic Operations:${NC}"
    echo "  1) CRUD Operations"
    echo "  2) Advanced Query Builder"
    echo "  3) Batch Import CSV"
    echo
    echo -e "${BLUE}Advanced Features:${NC}"
    echo "  4) Execute Transaction"
    echo "  5) Real-time Monitor"
    echo "  6) Validate Collection"
    echo "  7) Performance Analysis"
    echo
    echo -e "${BLUE}Management:${NC}"
    echo "  8) Cache Management"
    echo "  9) Export/Import"
    echo "  10) Schema Migration"
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
            1)
                echo "CRUD operation - Use the basic manage-data.sh script"
                ;;
            2)
                echo -n "Collection name: "
                read -r collection
                build_complex_query "$collection"
                ;;
            3)
                echo -n "CSV file path: "
                read -r csv_file
                echo -n "Target collection: "
                read -r collection
                batch_import_csv "$csv_file" "$collection"
                ;;
            4)
                execute_transaction
                ;;
            5)
                echo -n "Collection to monitor: "
                read -r collection
                monitor_collection "$collection"
                ;;
            6)
                echo -n "Collection: "
                read -r collection
                echo -n "Schema file: "
                read -r schema_file
                validate_collection "$collection" "$schema_file"
                ;;
            7)
                echo -n "Collection to analyze: "
                read -r collection
                analyze_performance "$collection"
                ;;
            8)
                manage_cache
                ;;
            9)
                echo "Use manage-data.sh export/import commands"
                ;;
            10)
                echo "Use migrate-schema.sh for migrations"
                ;;
            0)
                echo -e "${GREEN}Goodbye!${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}Invalid option${NC}"
                ;;
        esac
        
        if [ "$choice" != "0" ] && [ "$choice" != "5" ]; then
            read -p "Press Enter to continue..."
        fi
    done
}

# Execute
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi