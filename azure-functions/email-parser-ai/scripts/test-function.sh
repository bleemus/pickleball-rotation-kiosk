#!/bin/bash
# Test script for the AI Email Parser Azure Function
# Usage: ./scripts/test-function.sh [--fixtures]
#
# Tests can use either:
# - Inline test data (default)
# - .eml fixture files from test-fixtures/ directory
#
# Add --fixtures flag to use fixture files instead of inline data
#
# Function key is loaded from .env file in scripts directory:
#   FUNCTION_KEY=your-function-key

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
FIXTURES_DIR="$SCRIPT_DIR/../test-fixtures"
ENV_FILE="$SCRIPT_DIR/.env"

# Load .env file if it exists
if [ -f "$ENV_FILE" ]; then
    export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

# Check if first arg is --fixtures
if [ "$1" == "--fixtures" ]; then
    USE_FIXTURES="--fixtures"
else
    USE_FIXTURES=""
fi

# Flex Consumption plan URL (with random suffix)
BASE_URL="${BASE_URL:-https://pickleballkiosk-ai-email-c2gufjhgckgme5gj.northcentralus-01.azurewebsites.net}"

echo "=============================================="
echo "AI Email Parser Function Test"
echo "=============================================="
echo "Base URL: $BASE_URL"
echo ""

if [ -z "$FUNCTION_KEY" ]; then
    echo ""
    echo "⚠️  No function key provided. Skipping tests."
    echo "   Get your key from Azure Portal > Function App > Functions > parse-email > Function Keys"
    echo ""
    echo "   Create $SCRIPT_DIR/.env with:"
    echo "     FUNCTION_KEY=your-function-key"
    exit 0
fi

# Health check (requires auth on Flex Consumption plan)
echo "1. Health Check"
echo "---------------"
curl -s "$BASE_URL/api/health?code=$FUNCTION_KEY" | python3 -m json.tool
echo ""

API_URL="$BASE_URL/api/parse-email?code=$FUNCTION_KEY"

# Function to extract body from .eml file and test it
test_eml_file() {
    local file="$1"
    local name="$2"

    if [ ! -f "$file" ]; then
        echo "  ⚠️  File not found: $file"
        return
    fi

    # Extract subject from email headers
    local subject=$(grep -i "^Subject:" "$file" | head -1 | sed 's/^Subject: *//')

    # Extract body (everything after the first blank line)
    local body=$(awk '/^$/{found=1;next}found' "$file")

    # Escape for JSON
    local escaped_body=$(echo "$body" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))')
    local escaped_subject=$(echo "$subject" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read().strip()))')

    echo ""
    echo "Testing: $name"
    echo "Subject: $subject"
    echo "---"

    curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{\"email_text\": $escaped_body, \"email_subject\": $escaped_subject}" | python3 -m json.tool
    echo ""
}

if [ "$USE_FIXTURES" == "--fixtures" ]; then
    echo ""
    echo "Using .eml fixture files from: $FIXTURES_DIR"
    echo "=============================================="

    # Test each fixture file
    for file in "$FIXTURES_DIR"/*.eml; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            test_eml_file "$file" "$filename"
        fi
    done
else
    echo ""
    echo "2. Simple Reservation Email"
    echo "---------------------------"
    curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d '{
        "email_text": "Rally Club Reservation\n\nDecember 23\n5:30 - 7:00pm\nNorth\n\nJohn Smith'\''s Reservation\n\nPlayers\nJohn Smith\nJane Doe\nBob Wilson\nAlice Brown\n\nReservation Fee: $40.00",
        "email_subject": "Rally Club Reservation"
      }' | python3 -m json.tool
    echo ""

    echo ""
    echo "3. Forwarded Email (complex format)"
    echo "------------------------------------"
    curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d '{
        "email_text": "Begin forwarded message:From: Pickle Planner <automated@pickleplanner.com>Subject: Rally Club ReservationDate: December 14, 2025 at 7:43:48 PM CSTTo: user@example.comHi Michael,You have the following event:December 23TUESDAYMacy Russell'\''s Reservation1:30 - 3:30pmNorth, SouthPlayersMacy RussellMichael HellrichAnn JacksonTom PaoliDave RomoserShelly RomoserKevin JaklevicReggie ResperReservation FeeTotal: $31.20Status: PaidFee Breakdown:Dave Romoser    $0.00Macy Russell    $0.00Michael Hellrich    $0.00The door code is 6407",
        "email_subject": "Fwd: Rally Club Reservation"
      }' | python3 -m json.tool
    echo ""

    echo ""
    echo "4. Multi-Court Reservation"
    echo "--------------------------"
    curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d '{
        "email_text": "Rally Club Reservation\n\nJanuary 15\n1:00 - 3:00pm\nNorth, South\n\nTeam Tournament'\''s Reservation\n\nPlayers\nAlice Johnson\nBob Smith\nCharlie Brown\nDiana Prince\nEve Williams\nFrank Miller\nGeorge Wilson\nHelen Davis\n\nReservation Fee: $80.00",
        "email_subject": "Rally Club Reservation - January 15"
      }' | python3 -m json.tool
    echo ""

    echo ""
    echo "5. Non-Reservation Email (should return is_reservation: false)"
    echo "---------------------------------------------------------------"
    curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d '{
        "email_text": "Hey, want to grab lunch tomorrow? Let me know!",
        "email_subject": "Lunch?"
      }' | python3 -m json.tool
    echo ""

    echo ""
    echo "6. AM Time Reservation"
    echo "----------------------"
    curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d '{
        "email_text": "Rally Club Reservation\n\nFebruary 10\n8:00 - 9:30am\nSouth\n\nMorning Group'\''s Reservation\n\nPlayers\nEarly Bird\nMorning Person\nSunrise Player\nDawn Athlete\n\nReservation Fee: $40.00",
        "email_subject": "Rally Club Reservation"
      }' | python3 -m json.tool
    echo ""
fi

echo ""
echo "=============================================="
echo "All tests complete!"
echo "=============================================="
echo ""
echo "Tip: Add real emails to $FIXTURES_DIR/*.eml"
echo "     Then run: $0 --fixtures"
