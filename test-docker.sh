#!/bin/bash
# tevy2.ai — Docker Agent Test
# Builds and runs the actual agent Docker image locally.
# Identical to what runs on Fly.io in production.
#
# Usage:
#   cp .env.test.example .env.test   # fill in ANTHROPIC_API_KEY
#   ./test-docker.sh                 # build + run
#   ./test-docker.sh --rebuild       # force rebuild image
#   ./test-docker.sh --stop          # stop running container

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
IMAGE_NAME="tevy2-agent"
CONTAINER_NAME="tevy2-test"

# --- Handle --stop ---
if [ "$1" = "--stop" ]; then
    echo "Stopping $CONTAINER_NAME..."
    docker stop "$CONTAINER_NAME" 2>/dev/null && docker rm "$CONTAINER_NAME" 2>/dev/null
    echo "✅ Stopped."
    exit 0
fi

# --- Load .env.test ---
if [ -f "$SCRIPT_DIR/.env.test" ]; then
    echo "📂 Loading .env.test..."
    set -a
    source "$SCRIPT_DIR/.env.test"
    set +a
else
    echo "❌ No .env.test found. Copy .env.test.example and fill in ANTHROPIC_API_KEY."
    exit 1
fi

if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "❌ ANTHROPIC_API_KEY is required in .env.test"
    exit 1
fi

# --- Build image ---
NEEDS_BUILD=false
if [ "$1" = "--rebuild" ]; then
    NEEDS_BUILD=true
elif ! docker image inspect "$IMAGE_NAME" &>/dev/null; then
    NEEDS_BUILD=true
fi

if [ "$NEEDS_BUILD" = true ]; then
    echo "🔨 Building Docker image (no cache)..."
    docker build --no-cache -t "$IMAGE_NAME" "$SCRIPT_DIR/agent-image"
    echo "✅ Image built."
else
    echo "✅ Image exists (use --rebuild to force)."
fi

# --- Stop existing container if running ---
if docker ps -q -f name="$CONTAINER_NAME" | grep -q .; then
    echo "🔄 Stopping existing container..."
    docker stop "$CONTAINER_NAME" && docker rm "$CONTAINER_NAME"
fi
# Clean up stopped container too
docker rm "$CONTAINER_NAME" 2>/dev/null || true

# --- Run ---
echo ""
echo "=== tevy2.ai Docker Agent Test ==="
echo "Business:  ${TEST_BUSINESS_NAME:-Demo Coffee Shop}"
echo "Website:   ${TEST_WEBSITE_URL:-https://bluebottlecoffee.com}"
echo ""

DOCKER_ARGS=(
    --name "$CONTAINER_NAME"
    -p 18789:18789
    -e "ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY"
    -e "INSTANCE_ID=tevy-local-test"
    -e "BUSINESS_NAME=${TEST_BUSINESS_NAME:-Demo Coffee Shop}"
    -e "WEBSITE_URL=${TEST_WEBSITE_URL:-https://bluebottlecoffee.com}"
    -e "OWNER_NAME=${TEST_OWNER_NAME:-Test User}"
    -e "POSTING_GOAL=3-4 posts per week"
    -e "CHAT_CHANNEL=webchat"
)

# Add Telegram if token provided
if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
    DOCKER_ARGS+=(-e "TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN")
    DOCKER_ARGS+=(-e "CHAT_CHANNEL=telegram")
    echo "📱 Telegram: enabled"
fi

echo "🌐 Webchat: http://localhost:18789"
echo ""
echo "Press Ctrl+C to stop."
echo ""

docker run --rm "${DOCKER_ARGS[@]}" "$IMAGE_NAME"
