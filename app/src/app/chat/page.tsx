"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import { listAgents, type Agent } from "@/lib/api";
import { getAgentControlUiUrl } from "@/lib/control-ui";

export default function ChatPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);

  useEffect(() => {
    async function init() {
      const user = await getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      loadAgent();
    }

    async function loadAgent() {
      try {
        const { agents } = await listAgents();
        if (agents?.[0]) {
          setAgent(agents[0]);
          setError(null);
        } else {
          setError("No agent found. Create one from the dashboard first.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load agent");
      } finally {
        setLoading(false);
      }
    }

    void init();
  }, [router]);

  const controlUiUrl = getAgentControlUiUrl(agent);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <div className="glass border-b border-[var(--border)] px-4 py-3 flex items-center gap-3">
        <Link href="/dashboard" className="text-[var(--muted)] hover:text-[var(--foreground)] transition">
          ← Dashboard
        </Link>
        <div className="flex-1" />
        <div>
          <div className="font-semibold text-sm">{agent?.business_name || "Agent Chat"}</div>
          <div className="text-xs text-[var(--muted)]">
            {agent?.liveStatus || agent?.state || "Loading"}
          </div>
        </div>
      </div>

      <div className="flex-1 p-4">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-[var(--muted)]">Loading chat...</p>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center">
            <div className="glass rounded-xl p-6 max-w-md text-center">
              <div className="text-3xl mb-3">⚠️</div>
              <p className="text-sm text-red-400 mb-4">{error}</p>
              <Link
                href="/dashboard"
                className="px-3 py-1.5 rounded-lg text-xs bg-[var(--surface-light)] text-[var(--accent-light)] hover:text-white transition-colors inline-block"
              >
                Back to dashboard
              </Link>
            </div>
          </div>
        ) : controlUiUrl ? (
          <iframe
            src={controlUiUrl}
            title="OpenClaw Chat"
            className="w-full h-[calc(100vh-6.5rem)] rounded-xl border border-[var(--border)] bg-white"
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="glass rounded-xl p-6 max-w-md text-center">
              <div className="text-3xl mb-3">💬</div>
              <p className="text-sm text-[var(--muted)] mb-4">
                Control UI URL is not available yet. Try again once the agent finishes provisioning.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
