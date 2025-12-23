#!/bin/bash

# Create a test reservation that shows up immediately on the entry screen
# This creates a reservation for today with a time window that includes "now"

# Get current date in YYYY-MM-DD format (UTC to match server)
TODAY=$(date -u +%Y-%m-%d)

# Get current hour and calculate start/end times
CURRENT_HOUR=$(date +%H)
CURRENT_MINUTE=$(date +%M)

# Calculate start time (30 minutes ago)
START_HOUR=$((CURRENT_HOUR))
START_MINUTE=$((CURRENT_MINUTE - 30))

# Handle negative minutes
if [ $START_MINUTE -lt 0 ]; then
  START_MINUTE=$((START_MINUTE + 60))
  START_HOUR=$((START_HOUR - 1))
fi

# Handle negative hours
if [ $START_HOUR -lt 0 ]; then
  START_HOUR=$((START_HOUR + 24))
fi

# Calculate end time (90 minutes from now)
END_HOUR=$((CURRENT_HOUR + 1))
END_MINUTE=$((CURRENT_MINUTE + 30))

# Handle minute overflow
if [ $END_MINUTE -ge 60 ]; then
  END_MINUTE=$((END_MINUTE - 60))
  END_HOUR=$((END_HOUR + 1))
fi

# Convert to 12-hour format with am/pm
if [ $START_HOUR -ge 12 ]; then
  if [ $START_HOUR -gt 12 ]; then
    START_HOUR_12=$((START_HOUR - 12))
  else
    START_HOUR_12=12
  fi
  START_PERIOD="pm"
else
  if [ $START_HOUR -eq 0 ]; then
    START_HOUR_12=12
  else
    START_HOUR_12=$START_HOUR
  fi
  START_PERIOD="am"
fi

if [ $END_HOUR -ge 12 ]; then
  if [ $END_HOUR -gt 12 ]; then
    END_HOUR_12=$((END_HOUR - 12))
  else
    END_HOUR_12=12
  fi
  END_PERIOD="pm"
else
  if [ $END_HOUR -eq 0 ]; then
    END_HOUR_12=12
  else
    END_HOUR_12=$END_HOUR
  fi
  END_PERIOD="am"
fi

# Format times
START_TIME=$(printf "%d:%02d%s" $START_HOUR_12 $START_MINUTE $START_PERIOD)
END_TIME=$(printf "%d:%02d%s" $END_HOUR_12 $END_MINUTE $END_PERIOD)

echo "Creating test reservation for TODAY ($TODAY)"
echo "Time: $START_TIME - $END_TIME (should show as 'current')"
echo ""

# Create the reservation via API
curl -X POST http://localhost:3002/api/reservations \
  -H "Content-Type: application/json" \
  -d "{
    \"date\": \"$TODAY\",
    \"startTime\": \"$START_TIME\",
    \"endTime\": \"$END_TIME\",
    \"players\": [\"Alice Johnson\", \"Bob Smith\", \"Charlie Brown\", \"Diana Prince\"],
    \"court\": \"North\",
    \"organizer\": \"Test User\"
  }"

echo ""
echo ""
echo "✅ Test reservation created!"
echo ""
echo "Check the frontend entry screen - it should appear immediately."
echo "To verify via API: curl http://localhost:3002/api/reservations/current"
