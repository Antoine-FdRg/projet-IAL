#!/bin/bash

# Script to run all npm tests in the project with detailed failure tracking
# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Running all npm tests in the project...${NC}"

# Counter for tracking results
total_services=0
passed_services=0
failed_services=0
skipped_services=0

# Arrays to store detailed results
declare -a failed_service_names=()
declare -a failed_service_details=()
declare -a passed_service_names=()
declare -a skipped_service_names=()

# Function to run tests in a directory
run_tests() {
    local dir=$1
    local service_name=$(basename "$dir")

    if [ -f "$dir/package.json" ]; then
        echo -e "\n${YELLOW}=== Testing $service_name ===${NC}"
        cd "$dir"

        total_services=$((total_services + 1))

        # Check if test script exists in package.json
        local has_test_script=$(npm run | grep -c "test" || true)

        if [ $has_test_script -eq 0 ]; then
            echo -e "${CYAN}⚠ $service_name - No test script found, skipping${NC}"
            skipped_services=$((skipped_services + 1))
            skipped_service_names+=("$service_name (no test script)")
            cd - > /dev/null
            return
        fi

        # Capture test output to analyze failures
        local test_output
        test_output=$(npm test 2>&1)
        local test_exit_code=$?

        # Check if the failure is due to no tests found
        if [[ $test_output == *"No tests found"* ]] || [[ $test_output == *"no test files found"* ]] || [[ $test_output == *"0 tests"* ]]; then
            echo -e "${CYAN}⚠ $service_name - No tests implemented, skipping${NC}"
            skipped_services=$((skipped_services + 1))
            skipped_service_names+=("$service_name (no tests implemented)")
        elif [ $test_exit_code -eq 0 ]; then
            echo -e "${GREEN}✓ $service_name tests passed${NC}"
            passed_services=$((passed_services + 1))
            passed_service_names+=("$service_name")
        else
            echo -e "${RED}✗ $service_name tests failed${NC}"
            failed_services=$((failed_services + 1))
            failed_service_names+=("$service_name")

            # Extract detailed failure information
            local failed_tests=$(echo "$test_output" | grep -E "✕|FAIL|Failed|Error:|TypeError:|ReferenceError:" | head -10)
            local test_summary=$(echo "$test_output" | grep -E "Tests:|Suites:|Failed:|Passed:" | tail -3)
            local specific_errors=$(echo "$test_output" | grep -A 2 -B 2 "Cannot read properties\|undefined" | head -15)

            # Store detailed failure info
            failed_service_details+=("=== $service_name Failures ===
$failed_tests

Specific Errors:
$specific_errors

Summary:
$test_summary
")
        fi

        cd - > /dev/null
    fi
}

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

echo "Project root: $PROJECT_ROOT"

# Run tests for all services with package.json
echo -e "\n${YELLOW}Scanning for services with tests...${NC}"

# Box services
run_tests "$PROJECT_ROOT/box/broker-client"
run_tests "$PROJECT_ROOT/box/gatt-server"

# Pipeline services
run_tests "$PROJECT_ROOT/pipeline/aggregator"
run_tests "$PROJECT_ROOT/pipeline/broker"
run_tests "$PROJECT_ROOT/pipeline/cleaner"
run_tests "$PROJECT_ROOT/pipeline/normalizer"
run_tests "$PROJECT_ROOT/pipeline/outlier-filter"
run_tests "$PROJECT_ROOT/pipeline/splitter"

# Other services
run_tests "$PROJECT_ROOT/family-notif-service"
run_tests "$PROJECT_ROOT/save-service"
run_tests "$PROJECT_ROOT/urgency-service"
run_tests "$PROJECT_ROOT/webapp"

# Detailed Summary
echo -e "\n${BLUE}=== Detailed Test Results Summary ===${NC}"
echo -e "Total services scanned: $total_services"
echo -e "${GREEN}Passed: $passed_services${NC}"
echo -e "${RED}Failed: $failed_services${NC}"
echo -e "${CYAN}Skipped: $skipped_services${NC}"

# Show passed services
if [ $passed_services -gt 0 ]; then
    echo -e "\n${GREEN}✓ Passed Services:${NC}"
    for service in "${passed_service_names[@]}"; do
        echo -e "  ${GREEN}• $service${NC}"
    done
fi

# Show skipped services
if [ $skipped_services -gt 0 ]; then
    echo -e "\n${CYAN}⚠ Skipped Services:${NC}"
    for service in "${skipped_service_names[@]}"; do
        echo -e "  ${CYAN}• $service${NC}"
    done
fi

# Show failed services with details
if [ $failed_services -gt 0 ]; then
    echo -e "\n${RED}✗ Failed Services:${NC}"
    for service in "${failed_service_names[@]}"; do
        echo -e "  ${RED}• $service${NC}"
    done

    echo -e "\n${RED}=== Detailed Failure Information ===${NC}"
    for detail in "${failed_service_details[@]}"; do
        echo -e "${RED}$detail${NC}"
        echo -e "${RED}----------------------------------------${NC}"
    done
fi

# Final result
if [ $failed_services -eq 0 ]; then
    if [ $passed_services -gt 0 ]; then
        echo -e "\n${GREEN}🎉 All implemented tests passed successfully!${NC}"
        echo -e "${GREEN}$passed_services services with tests are working correctly.${NC}"
    else
        echo -e "\n${YELLOW}⚠ No services with tests found or all were skipped.${NC}"
    fi
    if [ $skipped_services -gt 0 ]; then
        echo -e "${CYAN}$skipped_services services were skipped (no tests implemented).${NC}"
    fi
    exit 0
else
    echo -e "\n${RED}❌ Test failures detected!${NC}"
    echo -e "${RED}$failed_services out of $((passed_services + failed_services)) tested services have failing tests.${NC}"
    if [ $skipped_services -gt 0 ]; then
        echo -e "${CYAN}$skipped_services services were skipped (no tests implemented).${NC}"
    fi
    echo -e "${YELLOW}Please check the detailed failure information above.${NC}"
    exit 1
fi
