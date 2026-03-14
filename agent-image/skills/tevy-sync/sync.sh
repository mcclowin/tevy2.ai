#!/bin/bash
# tevy-sync — Pull dashboard changes and tasks
# Called by OpenClaw cron or manually via heartbeat
set -e

BACKEND_URL="${TEVY2_BACKEND_URL:-}"
BOT_TOKEN="${GATEWAY_TOKEN:-}"
VERSION_FILE="/workspace/memory/.sync-version.json"

if [[ -z "$BACKEND_URL" || -z "$BOT_TOKEN" ]]; then
  echo "SKIP: TEVY2_BACKEND_URL or GATEWAY_TOKEN not set"
  exit 0
fi

# Read current version
CURRENT_VERSION=0
if [[ -f "$VERSION_FILE" ]]; then
  CURRENT_VERSION=$(cat "$VERSION_FILE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('version',0))" 2>/dev/null || echo 0)
fi

echo "=== Tevy Sync ==="
echo "Backend: $BACKEND_URL"
echo "Since version: $CURRENT_VERSION"

# 1. Pull changes
SYNC_RESPONSE=$(curl -sf -H "Authorization: Bearer $BOT_TOKEN" \
  "$BACKEND_URL/api/sync?since_version=$CURRENT_VERSION" 2>/dev/null || echo '{"version":0,"changes":[],"tasks":[]}')

NEW_VERSION=$(echo "$SYNC_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('version',0))" 2>/dev/null || echo 0)
NUM_CHANGES=$(echo "$SYNC_RESPONSE" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('changes',[])))" 2>/dev/null || echo 0)
NUM_TASKS=$(echo "$SYNC_RESPONSE" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('tasks',[])))" 2>/dev/null || echo 0)

echo "New version: $NEW_VERSION"
echo "Changes: $NUM_CHANGES"
echo "Tasks: $NUM_TASKS"

# 2. Write changed files
if [[ "$NUM_CHANGES" -gt 0 ]]; then
  echo "$SYNC_RESPONSE" | python3 -c "
import sys, json, os
data = json.load(sys.stdin)
for change in data.get('changes', []):
    filepath = '/workspace/' + change['file']
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w') as f:
        f.write(change['content'])
    print(f'  Updated: {change[\"file\"]}')
"
fi

# 3. Save new version
mkdir -p "$(dirname "$VERSION_FILE")"
cat > "$VERSION_FILE" <<EOF
{
  "version": $NEW_VERSION,
  "lastSync": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

# 4. Output tasks as JSON for the agent to process
if [[ "$NUM_TASKS" -gt 0 ]]; then
  echo "=== PENDING TASKS ==="
  echo "$SYNC_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for task in data.get('tasks', []):
    print(f'TASK: [{task[\"type\"]}] {task[\"brief\"]} (id: {task[\"id\"]})')
"
fi

# 5. Check approvals
APPROVALS=$(curl -sf -H "Authorization: Bearer $BOT_TOKEN" \
  "$BACKEND_URL/api/sync/approvals" 2>/dev/null || echo '{"approvals":[]}')

NUM_APPROVALS=$(echo "$APPROVALS" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('approvals',[])))" 2>/dev/null || echo 0)

if [[ "$NUM_APPROVALS" -gt 0 ]]; then
  echo "=== APPROVAL DECISIONS ==="
  echo "$APPROVALS" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for a in data.get('approvals', []):
    print(f'{a[\"status\"].upper()}: [{a[\"platform\"]}] {a[\"content\"][:80]}...')
"
fi

echo "=== Sync complete ==="
