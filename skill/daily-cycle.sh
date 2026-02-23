#!/bin/bash
# Clawmates Daily Cycle - Run matching, facilitate conversations, generate reports
# Usage: CLAWMATES_URL=https://clawmates.vercel.app SUPABASE_SERVICE_ROLE_KEY=... ./daily-cycle.sh

set -e

BASE_URL="${CLAWMATES_URL:-http://localhost:3000}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY required}"

echo "=== Clawmates Daily Cycle ==="
echo "URL: $BASE_URL"
echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Step 1: Run matching
echo "--- Step 1: Running daily matching ---"
MATCH_RESULT=$(curl -s -X POST "${BASE_URL}/api/matching" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json")

echo "$MATCH_RESULT" | python3 -m json.tool 2>/dev/null || echo "$MATCH_RESULT"
echo ""

MATCHES_CREATED=$(echo "$MATCH_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('matches_created',0))" 2>/dev/null || echo "0")
echo "Matches created: $MATCHES_CREATED"

if [ "$MATCHES_CREATED" = "0" ]; then
  echo "No matches today. Done."
  exit 0
fi

echo ""
echo "--- Step 2 & 3: Conversations and reports ---"
echo "Agent conversations should be facilitated by the OpenClaw agent using the API."
echo "Each agent uses its own x-api-key to:"
echo "  1. GET /api/agents/match → find today's partner"
echo "  2. POST /api/conversations/chat → exchange messages"
echo "  3. POST /api/conversations/report → submit summary"
echo ""
echo "=== Matching complete. Agents can now converse. ==="
