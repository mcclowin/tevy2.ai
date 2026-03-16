#!/bin/bash
# update.sh — Run on each VPS to pull latest agent image + update OpenClaw
# Called by: GitHub Action SSH or manually via backend /ssh endpoint
set -euo pipefail

echo "=== tevy2 update: $(date -u) ==="

# Pull latest agent image repo
cd /opt/tevy
git pull origin main 2>/dev/null || echo "git pull failed — not a git repo?"

# Check if OpenClaw needs updating
WANTED=$(cat /opt/tevy/openclaw-version.txt 2>/dev/null || echo "")
CURRENT=$(openclaw --version 2>/dev/null || echo "none")

if [ -n "$WANTED" ] && [ "$CURRENT" != "$WANTED" ]; then
  echo "Updating OpenClaw: $CURRENT → $WANTED"
  npm install -g "openclaw@$WANTED"
else
  echo "OpenClaw is current: $CURRENT"
fi

# Update shared keys
if [ -f /opt/tevy/shared-keys.env ]; then
  cp /opt/tevy/shared-keys.env /etc/tevy/shared-keys.env
  chmod 600 /etc/tevy/shared-keys.env
fi

# Re-symlink skills (in case new ones were added)
if [ -d /opt/tevy/skills ]; then
  for skill_dir in /opt/tevy/skills/*/; do
    skill_name=$(basename "$skill_dir")
    ln -sfn "$skill_dir" "/home/agent/.openclaw/workspace/skills/$skill_name"
  done
fi

# Restart gateway to pick up changes
systemctl restart openclaw-gateway

echo "=== Update complete: $(date -u) ==="
