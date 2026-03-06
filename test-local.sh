#!/bin/bash
# tevy2.ai — Local Agent Test
# One-click: sets up workspace, configures OpenClaw, starts gateway with Telegram.
#
# Usage:
#   cp .env.test.example .env.test   # fill in your keys
#   ./test-local.sh
#
# Or pass inline:
#   ANTHROPIC_API_KEY=sk-... TELEGRAM_BOT_TOKEN=123:ABC ./test-local.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEST_DIR="/tmp/tevy-test"
CONFIG_DIR="/tmp/tevy-test-config"

# --- Load .env.test if it exists ---
if [ -f "$SCRIPT_DIR/.env.test" ]; then
    echo "📂 Loading .env.test..."
    set -a
    source "$SCRIPT_DIR/.env.test"
    set +a
fi

# --- Validate required vars ---
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "❌ ANTHROPIC_API_KEY is required. Set it in .env.test or pass inline."
    exit 1
fi

if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "⚠️  No TELEGRAM_BOT_TOKEN — will run webchat only."
    echo "   Set TELEGRAM_BOT_TOKEN in .env.test to test Telegram."
    CHAT_MODE="webchat"
else
    CHAT_MODE="telegram"
    echo "✅ Telegram bot token found."
fi

# --- Test business config (customise these) ---
BUSINESS_NAME="${TEST_BUSINESS_NAME:-Demo Coffee Shop}"
WEBSITE_URL="${TEST_WEBSITE_URL:-https://bluebottlecoffee.com}"
OWNER_NAME="${TEST_OWNER_NAME:-Test User}"

echo ""
echo "=== tevy2.ai Local Agent Test ==="
echo "Business:  $BUSINESS_NAME"
echo "Website:   $WEBSITE_URL"
echo "Chat mode: $CHAT_MODE"
echo "Workspace: $TEST_DIR"
echo ""

# --- Clean & setup workspace ---
rm -rf "$TEST_DIR" "$CONFIG_DIR"
mkdir -p "$TEST_DIR/memory" "$CONFIG_DIR"

# Copy templates (SOUL.md, AGENTS.md)
cp "$SCRIPT_DIR/agent-image/templates/SOUL.md" "$TEST_DIR/SOUL.md"
cp "$SCRIPT_DIR/agent-image/templates/AGENTS.md" "$TEST_DIR/AGENTS.md"

# Copy skills if any exist
if [ -d "$SCRIPT_DIR/agent-image/skills" ] && [ "$(ls -A "$SCRIPT_DIR/agent-image/skills" 2>/dev/null)" ]; then
    cp -r "$SCRIPT_DIR/agent-image/skills" "$TEST_DIR/skills"
fi

# Generate USER.md
cat > "$TEST_DIR/USER.md" <<EOF
# USER.md — About the Business Owner

- **Name:** $OWNER_NAME
- **Business:** $BUSINESS_NAME
- **Website:** $WEBSITE_URL
- **Chat channel:** $CHAT_MODE

## Posting Goal
3-4 posts per week
EOF

# Generate brand-profile.md (placeholder — agent fills this in)
cat > "$TEST_DIR/memory/brand-profile.md" <<EOF
# Brand Profile

> Pending analysis. Tevy will scrape $WEBSITE_URL and fill this in.

## Business
- **Name:** $BUSINESS_NAME
- **Website:** $WEBSITE_URL
EOF

# Generate content calendar
cat > "$TEST_DIR/memory/content-calendar.md" <<EOF
# Content Calendar

> Managed by Tevy. Posts are drafted, approved, then scheduled.

## Upcoming
(none yet)

## Published
(none yet)
EOF

# --- Write OpenClaw config ---
cat > "$CONFIG_DIR/config.yaml" <<EOF
gateway:
  port: 18789
workspace: $TEST_DIR
model: claude-sonnet-4-20250514
providers:
  anthropic:
    apiKey: "$ANTHROPIC_API_KEY"
channels:
  webchat:
    enabled: true
EOF

# Add Telegram channel if token provided
if [ "$CHAT_MODE" = "telegram" ]; then
    cat >> "$CONFIG_DIR/config.yaml" <<EOF
  telegram:
    enabled: true
    botToken: "$TELEGRAM_BOT_TOKEN"
EOF
fi

echo "✅ Workspace ready at $TEST_DIR"
echo "✅ Config ready at $CONFIG_DIR/config.yaml"
echo ""

# --- Start OpenClaw ---
echo "🚀 Starting OpenClaw gateway..."
echo "   Webchat: http://localhost:18789"
if [ "$CHAT_MODE" = "telegram" ]; then
    echo "   Telegram: message your bot!"
fi
echo ""
echo "   Press Ctrl+C to stop."
echo ""

OPENCLAW_HOME="$CONFIG_DIR" exec openclaw gateway start --foreground
