# tevy2.ai Agent Image — Option C
# Single shared image for all user instances.
# Differentiated by env vars at runtime.
# Auto-rebuilt via GitHub Actions when OpenClaw updates.

FROM node:22-slim

ARG OPENCLAW_VERSION=latest

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install OpenClaw globally (pinned or latest)
RUN npm install -g openclaw@${OPENCLAW_VERSION}

# Create workspace directory
RUN mkdir -p /workspace/skills /workspace/memory

# Copy pre-configured skills
COPY skills/ /workspace/skills/

# Copy templates (SOUL.md, AGENTS.md — static parts)
COPY templates/ /workspace/templates/

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
