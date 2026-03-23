# tevy2.ai Agent Image v2
# Marketing concierge bot with pre-configured skills, templates, and behaviour.
# Differentiated by env vars at runtime.
# Auto-rebuilt via GitHub Actions when OpenClaw updates.

FROM node:22-slim

ARG OPENCLAW_VERSION=latest

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Install OpenClaw globally (pinned or latest)
RUN npm install -g openclaw@${OPENCLAW_VERSION}

# Create workspace directory
RUN mkdir -p /workspace/skills /workspace/memory /workspace/brand-assets

# Copy pre-configured skills
COPY skills/ /workspace/skills/

# Copy templates to safe location that survives volume mounts
COPY templates/ /opt/tevy2-templates/

# Copy version file
COPY VERSION /opt/tevy2-version.txt

# Copy entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# OpenClaw gateway port
EXPOSE 18789

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s \
    CMD curl -f http://localhost:18789/health || exit 1

WORKDIR /workspace

ENTRYPOINT ["/entrypoint.sh"]
