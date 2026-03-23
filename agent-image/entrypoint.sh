#!/bin/bash
set -e

WORKSPACE="/workspace"
TEMPLATES="/opt/tevy2-templates"

echo "🤖 Tevy2 Agent starting..."

# First boot: copy templates if workspace is empty
if [ ! -f "$WORKSPACE/SOUL.md" ]; then
  echo "📋 First boot — copying templates..."
  
  # Copy agent behaviour files
  cp "$TEMPLATES/SOUL.md" "$WORKSPACE/SOUL.md"
  cp "$TEMPLATES/AGENTS.md" "$WORKSPACE/AGENTS.md"
  cp "$TEMPLATES/HEARTBEAT.md" "$WORKSPACE/HEARTBEAT.md"
  cp "$TEMPLATES/USER.md" "$WORKSPACE/USER.md"
  
  # Copy memory structure
  mkdir -p "$WORKSPACE/memory/decisions" "$WORKSPACE/memory/research" "$WORKSPACE/memory/seo" "$WORKSPACE/memory/analytics"
  cp "$TEMPLATES/memory/brand-profile.md" "$WORKSPACE/memory/brand-profile.md"
  cp "$TEMPLATES/memory/content-calendar.md" "$WORKSPACE/memory/content-calendar.md"
  cp "$TEMPLATES/memory/competitors.md" "$WORKSPACE/memory/competitors.md"
  cp "$TEMPLATES/memory/decisions/decision-log.md" "$WORKSPACE/memory/decisions/decision-log.md"
  
  # Create brand assets directory
  mkdir -p "$WORKSPACE/brand-assets"
  
  echo "✅ Templates copied"
else
  echo "📂 Existing workspace found — skipping template copy"
fi

# Symlink skills from image into workspace (always, to pick up updates)
if [ -d "$WORKSPACE/skills" ] || mkdir -p "$WORKSPACE/skills"; then
  for skill_dir in /workspace/skills/*/; do
    if [ -d "$skill_dir" ]; then
      skill_name=$(basename "$skill_dir")
      # Don't overwrite customer-installed skills
      if [ ! -e "$WORKSPACE/skills/$skill_name" ]; then
        ln -sfn "$skill_dir" "$WORKSPACE/skills/$skill_name"
      fi
    fi
  done
fi

# Write version info
echo "tevy2-agent-image v$(cat /opt/tevy2-version.txt 2>/dev/null || echo 'dev')" > "$WORKSPACE/.tevy2-version"

# Inject shared keys if present
if [ -f /opt/tevy2-shared-keys.env ]; then
  export $(grep -v '^#' /opt/tevy2-shared-keys.env | xargs)
fi

echo "🚀 Starting OpenClaw gateway..."
exec openclaw gateway run
