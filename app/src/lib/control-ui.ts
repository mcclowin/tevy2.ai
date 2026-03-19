type AgentLike = {
  webchatUrl?: string;
  gateway_token?: string | null;
};

export function getAgentControlUiUrl(agent: AgentLike | null | undefined): string | null {
  if (!agent?.webchatUrl) return null;

  const normalized = agent.webchatUrl.replace(/\s+/g, "").trim();
  let url: URL;

  try {
    url = new URL(normalized);
  } catch {
    console.warn("Invalid agent Control UI URL", agent.webchatUrl);
    return null;
  }

  // OpenClaw accepts a one-time bootstrap token from the URL fragment and then
  // stores it in sessionStorage inside the Control UI tab.
  if (agent.gateway_token) {
    url.hash = `token=${encodeURIComponent(agent.gateway_token)}`;
  }

  return url.toString();
}
