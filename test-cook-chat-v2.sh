#!/bin/bash

# Test script for cook-chat-v2 v4
# Tests: routing, learning detection, rate limiting, cost logging

PROJECT_URL="https://bnzggihiartfgemdbxts.supabase.co"
SESSION_ID="be635b97-1816-40fa-b5b7-5e13d25e19f1"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== cook-chat-v2 v4 Test Suite ===${NC}\n"

# Check if AUTH_TOKEN is set
if [ -z "$AUTH_TOKEN" ]; then
  echo -e "${RED}Error: AUTH_TOKEN not set${NC}"
  echo "Get your token from the app's localStorage or Supabase dashboard"
  echo "Then run: export AUTH_TOKEN='your-token-here'"
  exit 1
fi

# Test 1: Simple timing question (should route to Gemini Flash - Tier 1)
echo -e "${BLUE}Test 1: Simple timing question (Gemini Flash)${NC}"
RESPONSE1=$(curl -s -X POST \
  "${PROJECT_URL}/functions/v1/cook-chat-v2" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"How long should I cook this?\", \"session_id\": \"${SESSION_ID}\"}")

echo "$RESPONSE1" | jq -r '._metadata.model, ._metadata.provider, .intent, .response[:100]'
echo ""

# Test 2: Substitution request (should route to GPT-4o-mini - Tier 2)
echo -e "${BLUE}Test 2: Substitution request (GPT-4o-mini)${NC}"
RESPONSE2=$(curl -s -X POST \
  "${PROJECT_URL}/functions/v1/cook-chat-v2" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"Can I use butter instead of oil?\", \"session_id\": \"${SESSION_ID}\"}")

echo "$RESPONSE2" | jq -r '._metadata.model, ._metadata.provider, .intent, ._metadata.rag_used, .response[:100]'
echo ""

# Test 3: Learning detection (modification report)
echo -e "${BLUE}Test 3: Learning detection (modification)${NC}"
RESPONSE3=$(curl -s -X POST \
  "${PROJECT_URL}/functions/v1/cook-chat-v2" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"I used whole wheat pasta instead of regular\", \"session_id\": \"${SESSION_ID}\"}")

echo "$RESPONSE3" | jq -r '.learning_saved, .detected_learning.type, .detected_learning.modification, .response[:100]'
echo ""

# Test 4: Check cost logs
echo -e "${BLUE}Test 4: Verify cost logging${NC}"
echo "Checking ai_cost_logs table..."
# This would need a separate query to the database

# Test 5: Check rate limiting
echo -e "${BLUE}Test 5: Check current rate limit${NC}"
echo "Fetching rate limit status..."
# This would need to query user_rate_limits table

echo -e "\n${GREEN}=== Tests Complete ===${NC}"
echo "Check the app logs for detailed results"
echo "Query database for cost logs: SELECT * FROM ai_cost_logs ORDER BY created_at DESC LIMIT 5;"
