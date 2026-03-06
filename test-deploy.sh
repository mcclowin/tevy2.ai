#!/bin/bash
# tevy2.ai — Deploy Pipeline Test
# Tests the full flow: backend API → Fly.io Machine → agent boots → responds
#
# Prerequisites:
#   - Backend running locally (pnpm dev)
#   - .env.test filled in (same file as test-local.sh)
#   - Fly.io app created + API token in backend .env
#   - Agent Docker image pushed to GHCR
#   - Supabase schema deployed
#
# Usage:
#   ./test-deploy.sh          # full test: provision → check → cleanup
#   ./test-deploy.sh --keep   # provision but don't delete (for manual testing)
#
# What it does:
#   1. Signs up / logs in via backend API
#   2. POSTs to /api/instances with test business data
#   3. Polls until Fly machine is running
#   4. Hits the agent's health endpoint
#   5. Cleans up (deletes instance) unless --keep

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_URL="${BACKEND_URL:-http://localhost:3001}"
KEEP=false

if [ "$1" = "--keep" ]; then
    KEEP=true
fi

# Load test config
if [ -f "$SCRIPT_DIR/.env.test" ]; then
    set -a
    source "$SCRIPT_DIR/.env.test"
    set +a
fi

TEST_EMAIL="${TEST_EMAIL:-tevy-test@example.com}"
TEST_BUSINESS="${TEST_BUSINESS_NAME:-Deploy Test Coffee}"
TEST_WEBSITE="${TEST_WEBSITE_URL:-https://bluebottlecoffee.com}"

echo ""
echo "=== tevy2.ai Deploy Pipeline Test ==="
echo "Backend:  $BACKEND_URL"
echo "Email:    $TEST_EMAIL"
echo "Business: $TEST_BUSINESS"
echo ""

# --- Helper ---
api() {
    local method=$1 path=$2 data=$3
    local args=(-s -w "\n%{http_code}" -X "$method" "${BACKEND_URL}${path}" -H "Content-Type: application/json")
    [ -n "$AUTH_TOKEN" ] && args+=(-H "Authorization: Bearer $AUTH_TOKEN")
    [ -n "$data" ] && args+=(-d "$data")
    curl "${args[@]}"
}

check_backend() {
    echo -n "1️⃣  Checking backend is running... "
    if curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL" | grep -qE "200|404"; then
        echo "✅"
    else
        echo "❌ Backend not reachable at $BACKEND_URL"
        echo "   Start it with: cd backend && pnpm dev"
        exit 1
    fi
}

# --- Step 1: Check backend ---
check_backend

# --- Step 2: Auth (mock or real) ---
echo -n "2️⃣  Authenticating... "

# Try mock auth first — send magic link then verify with test OTP
RESPONSE=$(api POST "/api/auth/magic-link" "{\"email\":\"$TEST_EMAIL\"}")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "magic link sent."
    echo "   ⚠️  For real auth, check email and verify manually."
    echo "   For mock auth (NEXT_PUBLIC_MOCK_AUTH=true), skipping verification."
    echo ""
    echo "   To test with real auth:"
    echo "   1. Check $TEST_EMAIL inbox for OTP"
    echo "   2. Run: curl -X POST $BACKEND_URL/api/auth/verify-otp -H 'Content-Type: application/json' -d '{\"email\":\"$TEST_EMAIL\",\"token\":\"YOUR_OTP\"}'"
    echo "   3. Copy access_token and re-run with: AUTH_TOKEN=<token> ./test-deploy.sh"
    
    if [ -z "$AUTH_TOKEN" ]; then
        echo ""
        echo "   No AUTH_TOKEN set. Trying direct instance creation (will fail if auth middleware is strict)..."
    fi
else
    echo "auth endpoint returned $HTTP_CODE — $BODY"
fi
echo ""

# --- Step 3: Provision instance ---
echo "3️⃣  Provisioning agent instance..."
PROVISION_DATA=$(cat <<EOF
{
    "ownerName": "Test User",
    "businessName": "$TEST_BUSINESS",
    "websiteUrl": "$TEST_WEBSITE",
    "instagram": "",
    "competitors": "Starbucks, Peet's Coffee",
    "postingGoal": "3-4 posts per week",
    "chatChannel": "webchat"
}
EOF
)

RESPONSE=$(api POST "/api/instances" "$PROVISION_DATA")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "   Status: $HTTP_CODE"

if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "201" ]; then
    echo "   ❌ Provisioning failed: $BODY"
    exit 1
fi

INSTANCE_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('instance',{}).get('id',''))" 2>/dev/null || echo "")
INSTANCE_NAME=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('instance',{}).get('name',''))" 2>/dev/null || echo "")
WEBCHAT_URL=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('instance',{}).get('webchatUrl',''))" 2>/dev/null || echo "")

echo "   ✅ Instance created!"
echo "   ID:      $INSTANCE_ID"
echo "   Name:    $INSTANCE_NAME"
echo "   Webchat: $WEBCHAT_URL"
echo ""

# --- Step 4: Poll until healthy ---
echo "4️⃣  Waiting for agent to boot..."
MAX_WAIT=120
WAITED=0

while [ $WAITED -lt $MAX_WAIT ]; do
    if [ -n "$WEBCHAT_URL" ]; then
        HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "${WEBCHAT_URL}/health" 2>/dev/null || echo "000")
        if [ "$HEALTH" = "200" ]; then
            echo "   ✅ Agent is healthy! (${WAITED}s)"
            echo ""
            echo "   🌐 Open webchat: $WEBCHAT_URL"
            break
        fi
    fi
    echo -n "."
    sleep 5
    WAITED=$((WAITED + 5))
done

if [ $WAITED -ge $MAX_WAIT ]; then
    echo ""
    echo "   ⚠️  Agent didn't respond within ${MAX_WAIT}s."
    echo "   Check Fly.io dashboard for machine status."
fi

# --- Step 5: Cleanup ---
echo ""
if [ "$KEEP" = true ]; then
    echo "5️⃣  --keep flag set. Instance left running."
    echo "   To delete later: curl -X DELETE $BACKEND_URL/api/instances/$INSTANCE_ID -H 'Authorization: Bearer $AUTH_TOKEN'"
else
    echo "5️⃣  Cleaning up..."
    if [ -n "$INSTANCE_ID" ]; then
        RESPONSE=$(api DELETE "/api/instances/$INSTANCE_ID")
        HTTP_CODE=$(echo "$RESPONSE" | tail -1)
        if [ "$HTTP_CODE" = "200" ]; then
            echo "   ✅ Instance deleted."
        else
            echo "   ⚠️  Cleanup returned $HTTP_CODE (may need manual cleanup on Fly.io)"
        fi
    fi
fi

echo ""
echo "=== Test Complete ==="
