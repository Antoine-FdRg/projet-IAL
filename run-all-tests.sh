#!/bin/bash

# Script to run all npm tests in the project with parallel execution and timing

# ───────────────────────────────
# Colors for output
# ───────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Maximum number of parallel jobs (adjust based on your system)
MAX_JOBS=4

echo -e "${YELLOW}${BOLD}Running all npm tests in the project with parallel execution...${NC}"

# ───────────────────────────────
# Counters and arrays
# ───────────────────────────────
total_services=0
passed_services=0
failed_services=0
skipped_services=0

declare -a failed_service_names=()
declare -a failed_service_details=()
declare -a passed_service_names=()
declare -a skipped_service_names=()
declare -a service_timings=()

# For managing display lines
declare -A service_lines=()
current_line=0

# Temporary directory for storing results
TEMP_DIR="/tmp/npm_test_results_$$"
mkdir -p "$TEMP_DIR"

# ───────────────────────────────
# Cleanup on exit
# ───────────────────────────────
cleanup() {
    rm -rf "$TEMP_DIR"
    # Kill any remaining loader processes
    jobs -p | xargs -r kill 2>/dev/null
    # Show cursor again
    printf '\033[?25h'
}
trap cleanup EXIT

# Hide cursor for cleaner animation
printf '\033[?25l'

# ───────────────────────────────
# Helper functions
# ───────────────────────────────
show_loader() {
    local service_name=$1
    local line_number=$2
    local chars="⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"
    local i=0
    while [ -f "$TEMP_DIR/$service_name.running" ]; do
        local frame="${chars:i++%${#chars}:1}"
        printf '\033[%d;1H\033[K' "$line_number"
        printf "${CYAN}${frame} ${BOLD}Testing ${service_name}...${NC}"
        sleep 0.15
    done
}

format_time() {
    local duration=$1
    if [ "$duration" -lt 60 ]; then
        printf "%ss" "$duration"
    else
        local minutes=$((duration / 60))
        local seconds=$((duration % 60))
        printf "%dm %ds" "$minutes" "$seconds"
    fi
}

get_timestamp() {
    date +%s
}

calculate_duration() {
    local start=$1
    local end=$2
    echo $((end - start))
}

# ───────────────────────────────
# Run tests for a single service
# ───────────────────────────────
run_tests_bg() {
    local dir=$1
    local service_name
    service_name=$(basename "$dir")
    local result_file="$TEMP_DIR/$service_name.result"
    local running_file="$TEMP_DIR/$service_name.running"
    touch "$running_file"

    if [ ! -f "$dir/package.json" ]; then
        echo "SKIP:no_package_json:0" > "$result_file"
        rm -f "$running_file"
        return
    fi

    pushd "$dir" >/dev/null || return
    local start_time=$(get_timestamp)

    # Check for a test script in package.json
    if ! grep -q '"test"' package.json; then
        local end_time=$(get_timestamp)
        local duration=$(calculate_duration "$start_time" "$end_time")
        echo "SKIP:no_test_script:$duration" > "$result_file"
        rm -f "$running_file"
        popd >/dev/null
        return
    fi

    # Run tests quietly but capture output
    local test_output
    test_output=$(npm test --silent 2>&1)
    local test_exit_code=$?
    local end_time=$(get_timestamp)
    local duration=$(calculate_duration "$start_time" "$end_time")

    # Detect "no tests"
    if [[ "$test_output" =~ [Nn]o[[:space:]]+tests ]]; then
        echo "SKIP:no_tests:$duration" > "$result_file"
        rm -f "$running_file"
        popd >/dev/null
        return
    fi

    # Parse passing test counts from different frameworks
    local test_count="unknown"
    if echo "$test_output" | grep -qE "([0-9]+)[[:space:]]+(tests|specs|passing)"; then
        test_count=$(echo "$test_output" | grep -Eo "([0-9]+)[[:space:]]+(tests|specs|passing)" | grep -Eo "^[0-9]+" | head -1)
    elif echo "$test_output" | grep -qE "Tests:.*[0-9]+\spassed"; then
        test_count=$(echo "$test_output" | grep -Eo "Tests:.*[0-9]+\spassed" | grep -Eo "[0-9]+" | head -1)
    fi

    # Handle success
    if [ $test_exit_code -eq 0 ]; then
        echo "PASS:$duration:$test_count" > "$result_file"
        rm -f "$running_file"
        popd >/dev/null
        return
    fi

    # Handle failures — extract a short summary
    local failed_summary
    failed_summary=$(echo "$test_output" | grep -E "✕|FAIL|Error|AssertionError|TypeError|ReferenceError" | head -15)

    local framework_summary=""
    if echo "$test_output" | grep -q "Tests:"; then
        framework_summary=$(echo "$test_output" | grep "Tests:" | tail -1)
    elif echo "$test_output" | grep -q "Suites:"; then
        framework_summary=$(echo "$test_output" | grep "Suites:" | tail -1)
    fi

    {
        echo "=== $service_name Failures ==="
        echo "$failed_summary"
        echo
        echo "Summary:"
        echo "$framework_summary"
    } > "$TEMP_DIR/$service_name.details"

    echo "FAIL:$duration" > "$result_file"
    rm -f "$running_file"
    popd >/dev/null
}

# ───────────────────────────────
# Monitor progress
# ───────────────────────────────
monitor_service() {
    local service_path=$1
    local line_number=$2
    local service_name
    service_name=$(basename "$service_path")
    local result_file="$TEMP_DIR/$service_name.result"
    local running_file="$TEMP_DIR/$service_name.running"

    show_loader "$service_name" "$line_number" &
    local loader_pid=$!

    while [ -f "$running_file" ]; do
        sleep 0.1
    done

    kill $loader_pid 2>/dev/null

    if [ -f "$result_file" ]; then
        local result=$(cat "$result_file")
        local status=$(echo "$result" | cut -d: -f1)
        local duration=$(echo "$result" | cut -d: -f2)
        local formatted_time=$(format_time "$duration")

        printf '\033[%d;1H\033[K' "$line_number"

        case $status in
            PASS)
                local count=$(echo "$result" | cut -d: -f3)
                printf "${GREEN}✓ ${BOLD}%s${NC} ${GREEN}tests passed${NC} ${PURPLE}(%s, %s tests)${NC}\n" "$service_name" "$formatted_time" "$count"
                ;;
            FAIL)
                printf "${RED}✗ ${BOLD}%s${NC} ${RED}tests failed${NC} ${PURPLE}(%s)${NC}\n" "$service_name" "$formatted_time"
                ;;
            SKIP)
                local reason=$(echo "$result" | cut -d: -f2)
                printf "${CYAN}⚠ ${BOLD}%s${NC} ${CYAN}skipped (%s)${NC} ${PURPLE}(%s)${NC}\n" "$service_name" "$reason" "$formatted_time"
                ;;
        esac
    fi
}

# ───────────────────────────────
# Parallel execution
# ───────────────────────────────
process_services() {
    local services=("$@")

    echo -e "\n${BLUE}=== Starting Parallel Test Execution ===${NC}"
    for s in "${services[@]}"; do
        ((current_line++))
        service_lines["$(basename "$s")"]=$current_line
        echo
    done

    printf '\033[%dA' "${#services[@]}"

    local active=0
    for s in "${services[@]}"; do
        run_tests_bg "$s" &
        local pid=$!
        monitor_service "$s" "${service_lines[$(basename "$s")]}" &
        ((active++))
        ((active >= MAX_JOBS)) && wait -n && ((active--))
    done

    wait
    printf '\033[%d;1H' $((current_line + 2))
}

# ───────────────────────────────
# Main logic
# ───────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
OVERALL_START=$(get_timestamp)

echo "Project root: $PROJECT_ROOT"
echo -e "Max parallel jobs: ${PURPLE}${BOLD}$MAX_JOBS${NC}"

ALL_SERVICES=(
    "$PROJECT_ROOT/box/broker-client"
    "$PROJECT_ROOT/box/cleaner"
    "$PROJECT_ROOT/box/normalizer"
    "$PROJECT_ROOT/box/outlier-filter"
    "$PROJECT_ROOT/box/uploader"
)

echo -e "\n${YELLOW}Processing ${BOLD}${#ALL_SERVICES[@]}${NC} ${YELLOW}services with parallel execution...${NC}"

process_services "${ALL_SERVICES[@]}"

# ───────────────────────────────
# Summary
# ───────────────────────────────
printf '\033[?25h'
OVERALL_END=$(get_timestamp)
OVERALL_DURATION=$(calculate_duration "$OVERALL_START" "$OVERALL_END")
FORMATTED_OVERALL_TIME=$(format_time "$OVERALL_DURATION")

echo -e "\n${BLUE}${BOLD}=== Test Summary ===${NC}"
echo -e "Total duration: ${PURPLE}$FORMATTED_OVERALL_TIME${NC}"
