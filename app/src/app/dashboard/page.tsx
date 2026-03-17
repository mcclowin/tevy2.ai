"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createAgent, listAgents, getBootStatus,
  readAgentFile, deleteAgent, startAgent, stopAgent,
  type Agent,
} from "@/lib/api";
import { signOut, isAuthenticated, getUser, getSessionToken } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type OnboardingData = {
  addTelegram: boolean;
  telegramBotToken: string;
  ownerName: string;
  businessName: string;
  websiteUrl: string;
  instagram: string;
  tiktok: string;
  linkedin: string;
  twitter: string;
  facebook: string;
};

const NAV_ITEMS = [
  { id: "home", icon: "🏠", label: "Home" },
  { id: "brand", icon: "🎯", label: "Brand" },
  { id: "calendar", icon: "📅", label: "Calendar" },
  { id: "analytics", icon: "📊", label: "Analytics" },
  { id: "research", icon: "🔍", label: "Research" },
  { id: "seo", icon: "🔎", label: "SEO" },
  { id: "settings", icon: "⚙️", label: "Settings" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [hasAgent, setHasAgent] = useState(false);
  const [liveStatus, setLiveStatus] = useState<string>("unknown");
  const [activeTab, setActiveTab] = useState("home");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [agentData, setAgentData] = useState<Agent | null>(null);

  // Auth guard
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    getUser().then((user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setUserEmail(user.email);
      setAuthChecked(true);
    });
  }, [router]);

  // Hydrate from API on mount
  useEffect(() => {
    if (!authChecked) return;
    async function hydrate() {
      try {
        const { agents } = await listAgents();
        if (agents && agents.length > 0) {
          const agent = agents[0];
          setAgentData(agent);
          setHasAgent(true);
          setLiveStatus(agent.liveStatus || agent.state || "unknown");
        }
      } catch {
        console.warn("Could not reach API to check agents");
      }
    }
    hydrate();
  }, [authChecked]);

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--muted)]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[var(--border)] bg-[var(--surface)] flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-[var(--border)]">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo-wizard.jpg" alt="tevy2" className="w-7 h-7 rounded-lg" />
            <span className="text-lg font-bold">
              <span className="gradient-text">tevy2</span>
              <span className="text-[var(--muted)]">.ai</span>
            </span>
          </Link>
          <div className="mt-2 powered-badge text-xs">
            <span style={{ fontSize: "11px" }}>🐾</span> Powered by OpenClaw
          </div>
        </div>

        <div className="px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2 h-2 rounded-full ${
              !hasAgent ? "bg-yellow-500 animate-pulse" :
              liveStatus === "running" ? "bg-green-500" :
              liveStatus === "stopped" ? "bg-red-500" :
              "bg-yellow-500 animate-pulse"
            }`}></div>
            <span className="text-sm font-semibold">{
              !hasAgent ? "Setup Required" :
              liveStatus === "running" ? "Agent Online" :
              liveStatus === "stopped" ? "Agent Offline" :
              liveStatus === "provisioning" ? "Deploying..." :
              "Checking..."
            }</span>
          </div>
          {agentData && (
            <p className="text-xs text-[var(--muted)] truncate">{agentData.business_name}</p>
          )}
        </div>

        <nav className="flex-1 py-3 px-3">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === "settings" || hasAgent) setActiveTab(item.id);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-0.5 transition-colors ${
                (!hasAgent && item.id !== "settings") ? "opacity-40 cursor-not-allowed" :
                activeTab === item.id
                  ? "bg-[rgba(34,197,94,0.15)] text-white"
                  : "text-[var(--muted)] hover:text-white hover:bg-[var(--surface-light)]"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-[var(--border)]">
          {userEmail && (
            <div className="px-3 py-2 mb-2 text-xs text-[var(--muted)] truncate">
              {userEmail}
            </div>
          )}
          <button
            onClick={async () => {
              await signOut();
              window.location.href = "/login";
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--muted)] hover:text-red-400 hover:bg-[var(--surface-light)] transition-colors"
          >
            <span>🚪</span>
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {!hasAgent ? (
          <OnboardingPanel onComplete={(agent) => {
            setAgentData(agent);
            setHasAgent(true);
            setLiveStatus("provisioning");
          }} />
        ) : (
          <>
            {activeTab === "home" && <HomeTab agentData={agentData} liveStatus={liveStatus} />}
            {activeTab === "brand" && <BrandTab agentData={agentData} />}
            {activeTab === "calendar" && <CalendarTab />}
            {activeTab === "analytics" && <AnalyticsTab />}
            {activeTab === "research" && <ResearchTab agentId={agentData?.id || ""} />}
            {activeTab === "seo" && <SEOTab agentId={agentData?.id || ""} />}
            {activeTab === "settings" && <SettingsTab agentData={agentData} liveStatus={liveStatus} setLiveStatus={setLiveStatus} setHasAgent={setHasAgent} />}
          </>
        )}
      </main>
    </div>
  );
}

/* ─── ONBOARDING PANEL ─── */
function OnboardingPanel({ onComplete }: { onComplete: (agent: Agent) => void }) {
  const [deploying, setDeploying] = useState(false);
  const [bootStatus, setBootStatus] = useState<{
    stage: string;
    progress: number;
    message: string;
    ready: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [form, setForm] = useState<OnboardingData>({
    addTelegram: false,
    telegramBotToken: "",
    ownerName: "",
    businessName: "",
    websiteUrl: "",
    instagram: "",
    tiktok: "",
    linkedin: "",
    twitter: "",
    facebook: "",
  });

  const update = (field: keyof OnboardingData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const pollBoot = useCallback((agentId: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const status = await getBootStatus(agentId);
        setBootStatus(status);
        if (status.ready) {
          if (pollRef.current) clearInterval(pollRef.current);
          // Re-fetch agent to get full data
          setTimeout(async () => {
            try {
              const { agents } = await listAgents();
              if (agents?.[0]) onComplete(agents[0]);
            } catch {
              // Fallback
            }
          }, 1500);
        }
        if (status.stage === "error" || status.stage === "offline") {
          if (pollRef.current) clearInterval(pollRef.current);
          setError(status.message);
          setDeploying(false);
        }
      } catch { /* keep polling */ }
    }, 4000);
  }, [onComplete]);

  const handleDeploy = async () => {
    setDeploying(true);
    setError(null);
    setBootStatus({ stage: "creating", progress: 5, message: "Creating your agent...", ready: false });

    try {
      const result = await createAgent({
        ownerName: form.ownerName,
        businessName: form.businessName,
        websiteUrl: form.websiteUrl,
        instagram: form.instagram,
        tiktok: form.tiktok,
        linkedin: form.linkedin,
        twitter: form.twitter,
        facebook: form.facebook,
        postingGoal: "3-4 posts per week",
        telegramBotToken: form.addTelegram ? form.telegramBotToken : undefined,
      });
      setBootStatus({ stage: "provisioning", progress: 15, message: "Provisioning VPS...", ready: false });
      pollBoot(result.agent.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Deploy failed";
      setError(msg);
      setDeploying(false);
    }
  };

  const canDeploy = form.businessName && (!form.addTelegram || form.telegramBotToken);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Set up your marketing agent</h1>
      <p className="text-sm text-[var(--muted)] mb-8">
        Fill in your details and deploy. Takes about 2 minutes.
      </p>

      {/* Business Info */}
      <div className="space-y-4 mb-8">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-[var(--muted)] mb-1 block">Your name</label>
            <input className="input-field" placeholder="Jane Smith" value={form.ownerName}
              onChange={(e) => update("ownerName", e.target.value)} disabled={deploying} />
          </div>
          <div>
            <label className="text-xs text-[var(--muted)] mb-1 block">Business name *</label>
            <input className="input-field" placeholder="Sunrise Coffee Co" value={form.businessName}
              onChange={(e) => update("businessName", e.target.value)} disabled={deploying} autoFocus />
          </div>
        </div>

        <div>
          <label className="text-xs text-[var(--muted)] mb-1 block">Website URL</label>
          <input className="input-field" placeholder="https://sunrisecoffee.com" value={form.websiteUrl}
            onChange={(e) => update("websiteUrl", e.target.value)} disabled={deploying} />
        </div>

        <div>
          <label className="text-xs text-[var(--muted)] mb-1.5 block">Social accounts <span className="text-xs">(optional)</span></label>
          <div className="space-y-2">
            {([
              { key: "instagram" as const, icon: "📸", placeholder: "@handle or URL" },
              { key: "tiktok" as const, icon: "🎵", placeholder: "@handle or URL" },
              { key: "linkedin" as const, icon: "💼", placeholder: "Company page URL" },
              { key: "twitter" as const, icon: "𝕏", placeholder: "@handle" },
              { key: "facebook" as const, icon: "📘", placeholder: "Page URL" },
            ]).map((s) => (
              <div key={s.key} className="flex items-center gap-2">
                <span className="w-6 text-center text-sm">{s.icon}</span>
                <input className="input-field !py-2 text-sm" placeholder={s.placeholder}
                  value={form[s.key]} onChange={(e) => update(s.key, e.target.value)} disabled={deploying} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Channel */}
      <div className="mb-8">
        <label className="text-xs text-[var(--muted)] mb-2 block uppercase tracking-wide font-semibold">Chat channel</label>

        <button
          onClick={() => !deploying && update("addTelegram", !form.addTelegram)}
          className={`w-full glass rounded-xl p-4 mb-3 text-left transition-all ${
            form.addTelegram ? "border border-[var(--accent)] glow" : "border border-transparent hover:border-[var(--border)]"
          } ${deploying ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#2AABEE] flex items-center justify-center text-white text-xl">✈️</div>
            <div className="flex-1">
              <div className="font-semibold text-sm flex items-center gap-2">
                Telegram
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--surface-light)] text-[var(--accent-light)]">Recommended</span>
              </div>
              <p className="text-xs text-[var(--muted)]">Chat with your agent from your phone, anytime</p>
            </div>
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              form.addTelegram ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--border)]"
            }`}>
              {form.addTelegram && <span className="text-xs">✓</span>}
            </div>
          </div>
        </button>

        {form.addTelegram && (
          <div className="glass rounded-xl p-4 mb-3 ml-14">
            <label className="text-xs text-[var(--muted)] mb-1.5 block">Bot Token <span className="text-[var(--muted)]">(from @BotFather)</span></label>
            <input className="input-field text-sm font-mono" placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              value={form.telegramBotToken} onChange={(e) => update("telegramBotToken", e.target.value)} disabled={deploying} />
            <p className="text-xs text-[var(--muted)] mt-1.5">
              <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-light)] hover:underline">Create a bot</a> — takes 30 seconds
            </p>
          </div>
        )}

        <div className="flex gap-2">
          {[{ icon: "📱", name: "WhatsApp" }, { icon: "🎮", name: "Discord" }, { icon: "💬", name: "Slack" }].map((ch) => (
            <div key={ch.name} className="glass rounded-lg px-3 py-2 opacity-40 text-xs flex items-center gap-1.5">
              <span>{ch.icon}</span>
              <span className="text-[var(--muted)]">{ch.name} — soon</span>
            </div>
          ))}
        </div>
      </div>

      {/* Deploy button OR status bar */}
      {!deploying ? (
        <button onClick={handleDeploy} className="btn-primary w-full text-lg py-3" disabled={!canDeploy}>
          🚀 Deploy Agent
        </button>
      ) : (
        <div className="glass rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            {bootStatus?.ready ? (
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            ) : error ? (
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
            ) : (
              <div className="w-3 h-3 rounded-full bg-[var(--accent)] animate-pulse"></div>
            )}
            <span className="text-sm font-semibold">
              {error ? "Deploy failed" : bootStatus?.message || "Initializing..."}
            </span>
          </div>

          <div className="w-full h-2 bg-[var(--surface-light)] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{
              width: `${bootStatus?.progress || 0}%`,
              background: error ? "#ef4444" : bootStatus?.ready ? "#22c55e" : "linear-gradient(90deg, var(--accent), var(--accent-light))",
            }}></div>
          </div>

          <div className="flex justify-between mt-4 text-xs text-[var(--muted)]">
            {[
              { label: "Provision", threshold: 15 },
              { label: "VPS Boot", threshold: 40 },
              { label: "Install", threshold: 60 },
              { label: "Gateway", threshold: 80 },
              { label: "Ready", threshold: 100 },
            ].map((s) => (
              <span key={s.label} className={(bootStatus?.progress || 0) >= s.threshold ? "text-white font-medium" : ""}>
                {(bootStatus?.progress || 0) >= s.threshold ? "✓ " : ""}{s.label}
              </span>
            ))}
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-lg border border-red-500/30">
              <p className="text-sm text-red-400">{error}</p>
              <button onClick={() => { setError(null); setDeploying(false); }} className="btn-secondary mt-2 text-sm">← Try again</button>
            </div>
          )}

          {bootStatus?.ready && (
            <div className="mt-4 text-center">
              <div className="text-3xl mb-2">🎉</div>
              <h2 className="text-lg font-bold">Your agent is live!</h2>
              <p className="text-sm text-[var(--muted)]">Loading dashboard...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── HOME TAB ─── */
function HomeTab({ agentData, liveStatus }: { agentData: Agent | null; liveStatus: string }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex-1 overflow-auto p-8 max-w-4xl">
        <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
        <p className="text-[var(--muted)] mb-8">{
          liveStatus === "running" ? "Your marketing agent is live and ready." :
          liveStatus === "stopped" ? "Your agent is offline. Start it from Settings." :
          liveStatus === "provisioning" ? "Your agent is being set up..." :
          "Checking agent status..."
        }</p>

        {/* Status cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="glass rounded-xl p-4">
            <div className="text-xs text-[var(--muted)] mb-1">Agent Status</div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                liveStatus === "running" ? "bg-green-500 animate-pulse" :
                liveStatus === "stopped" ? "bg-red-500" :
                "bg-yellow-500 animate-pulse"
              }`}></div>
              <span className={`text-lg font-bold ${
                liveStatus === "running" ? "text-green-400" :
                liveStatus === "stopped" ? "text-red-400" :
                "text-yellow-400"
              }`}>{
                liveStatus === "running" ? "Online" :
                liveStatus === "stopped" ? "Offline" :
                liveStatus === "provisioning" ? "Deploying" :
                "Checking..."
              }</span>
            </div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="text-xs text-[var(--muted)] mb-1">Chat Channel</div>
            <div className="text-lg font-bold">
              {(agentData?.config as Record<string, unknown>)?.telegramBotToken ? "Telegram" : "Webchat"}
            </div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="text-xs text-[var(--muted)] mb-1">Server</div>
            <div className="text-sm font-bold font-mono truncate">{agentData?.hetzner_ip || "—"}</div>
            <div className="text-xs text-[var(--muted)] mt-1">Nuremberg, DE (€2.99/mo)</div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="glass rounded-xl p-6 mb-6">
          <h3 className="font-semibold mb-3">Get started</h3>
          <p className="text-sm text-[var(--muted)] mb-4">
            Message your agent on Telegram or use the chat below. Try these:
          </p>
          <div className="flex gap-2 flex-wrap">
            {["Analyze my website", "Draft 3 social posts", "Research my competitors", "Run an SEO audit", "Create a content calendar"].map((s) => (
              <button key={s} onClick={() => { setChatOpen(true); setChatInput(s); }}
                className="px-3 py-1.5 rounded-full text-xs bg-[var(--surface-light)] text-[var(--muted)] hover:text-white hover:bg-[var(--surface)] border border-[var(--border)] transition-colors">
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Activity */}
        <div className="glass rounded-xl p-6">
          <h3 className="font-semibold mb-3">Recent Activity</h3>
          <div className="text-center py-6">
            <div className="text-2xl mb-2">📋</div>
            <p className="text-sm text-[var(--muted)]">Activity will appear here once you start chatting.</p>
          </div>
        </div>
      </div>

      {/* Chat widget */}
      {chatOpen ? (
        <div className="absolute bottom-4 right-4 w-96 h-[28rem] glass rounded-xl border border-[var(--border)] flex flex-col shadow-2xl overflow-hidden" style={{ zIndex: 50 }}>
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm font-semibold">Agent</span>
            </div>
            <button onClick={() => setChatOpen(false)} className="text-[var(--muted)] hover:text-white text-lg">✕</button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <div className="text-center py-8">
              <div className="text-2xl mb-2">💬</div>
              <p className="text-sm text-[var(--muted)]">Webchat integration coming soon.</p>
              <p className="text-xs text-[var(--muted)] mt-2">For now, use your Telegram bot.</p>
            </div>
          </div>
          <div className="px-3 py-3 border-t border-[var(--border)] shrink-0">
            <div className="flex gap-2">
              <input className="input-field !py-2 text-sm flex-1" placeholder="Message..." value={chatInput}
                onChange={(e) => setChatInput(e.target.value)} />
              <button className="px-3 py-2 rounded-lg bg-[var(--accent)] text-white text-sm hover:opacity-90 transition-opacity">→</button>
            </div>
          </div>
        </div>
      ) : (
        <button onClick={() => setChatOpen(true)}
          className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-[var(--accent)] text-white text-xl flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
          style={{ zIndex: 50 }}>💬</button>
      )}
    </div>
  );
}

/* ─── BRAND TAB ─── */
function BrandTab({ agentData }: { agentData: Agent | null }) {
  const [brandContent, setBrandContent] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (agentData?.id) {
      readAgentFile(agentData.id, "memory/brand-profile.md")
        .then((res) => { if (res.content) setBrandContent(res.content); })
        .catch(() => {});
    }
  }, [agentData?.id]);

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">Brand Profile</h1>
      <p className="text-[var(--muted)] mb-6">Your brand info and AI-generated analysis</p>

      <div className="glass rounded-xl p-6 mb-6">
        <h3 className="font-semibold mb-4">📝 Business Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-[var(--muted)]">Business:</span>{" "}
            <span className="font-medium">{agentData?.business_name || "—"}</span>
          </div>
          <div>
            <span className="text-[var(--muted)]">Website:</span>{" "}
            <span className="font-medium">{agentData?.website_url || "—"}</span>
          </div>
          <div>
            <span className="text-[var(--muted)]">Slug:</span>{" "}
            <span className="font-mono text-xs">{agentData?.slug || "—"}</span>
          </div>
          <div>
            <span className="text-[var(--muted)]">Server:</span>{" "}
            <span className="font-mono text-xs">{agentData?.hetzner_ip || "—"}</span>
          </div>
        </div>
      </div>

      <div className="glass rounded-xl p-6">
        <h3 className="font-semibold mb-4">🎯 Brand Analysis</h3>
        {brandContent ? (
          <pre className="whitespace-pre-wrap text-sm text-[var(--muted)] bg-[var(--surface-light)] rounded-lg p-4 overflow-auto">
            {brandContent}
          </pre>
        ) : (
          <div className="text-center py-8">
            <div className="text-3xl mb-3">🔍</div>
            <p className="text-sm text-[var(--muted)]">
              Ask your agent to analyze your brand via Telegram:
            </p>
            <p className="text-xs text-[var(--muted)] font-mono mt-2">
              &quot;Analyze my website and create a brand profile&quot;
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── CALENDAR TAB ─── */
function CalendarTab() {
  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">Content Calendar</h1>
      <p className="text-[var(--muted)] mb-6">Managed by your agent. Posts are drafted, approved, then scheduled.</p>
      <div className="glass rounded-xl p-6 text-center">
        <div className="text-4xl mb-3">📅</div>
        <h2 className="text-lg font-semibold mb-2">No scheduled content yet</h2>
        <p className="text-sm text-[var(--muted)]">Ask your agent to create a content calendar.</p>
      </div>
    </div>
  );
}

/* ─── ANALYTICS TAB ─── */
function AnalyticsTab() {
  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">Analytics</h1>
      <p className="text-[var(--muted)] mb-6">Performance tracking across your social accounts</p>
      <div className="glass rounded-xl p-6 text-center">
        <div className="text-4xl mb-3">📊</div>
        <h2 className="text-lg font-semibold mb-2">Analytics coming soon</h2>
        <p className="text-sm text-[var(--muted)]">Connect your social accounts to track engagement.</p>
      </div>
    </div>
  );
}

/* ─── RESEARCH TAB ─── */
function ResearchTab({ agentId }: { agentId: string }) {
  const [content, setContent] = useState<string | null>(null);

  useEffect(() => {
    if (!agentId) return;
    readAgentFile(agentId, "memory/research/latest.md")
      .then((res) => { if (res.content) setContent(res.content); })
      .catch(() => {});
  }, [agentId]);

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">Market Research</h1>
      <p className="text-[var(--muted)] mb-6">Competitor intel and market trends</p>
      {content ? (
        <div className="glass rounded-xl p-6">
          <pre className="whitespace-pre-wrap text-sm text-[var(--muted)] overflow-auto">{content}</pre>
        </div>
      ) : (
        <div className="glass rounded-xl p-6 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <h2 className="text-lg font-semibold mb-2">No research yet</h2>
          <p className="text-sm text-[var(--muted)]">Ask your agent to research your competitors via Telegram.</p>
        </div>
      )}
    </div>
  );
}

/* ─── SEO TAB ─── */
function SEOTab({ agentId }: { agentId: string }) {
  const [content, setContent] = useState<string | null>(null);

  useEffect(() => {
    if (!agentId) return;
    readAgentFile(agentId, "memory/seo/audit.md")
      .then((res) => { if (res.content) setContent(res.content); })
      .catch(() => {});
  }, [agentId]);

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">SEO Audit</h1>
      <p className="text-[var(--muted)] mb-6">Website analysis and recommendations</p>
      {content ? (
        <div className="glass rounded-xl p-6">
          <pre className="whitespace-pre-wrap text-sm text-[var(--muted)] overflow-auto">{content}</pre>
        </div>
      ) : (
        <div className="glass rounded-xl p-6 text-center">
          <div className="text-4xl mb-3">🔎</div>
          <h2 className="text-lg font-semibold mb-2">No audit yet</h2>
          <p className="text-sm text-[var(--muted)]">Ask your agent to run an SEO audit via Telegram.</p>
        </div>
      )}
    </div>
  );
}

/* ─── SETTINGS TAB ─── */
function SettingsTab({ agentData, liveStatus, setLiveStatus, setHasAgent }: {
  agentData: Agent | null;
  liveStatus: string;
  setLiveStatus: (s: string) => void;
  setHasAgent: (b: boolean) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [restarting, setRestarting] = useState(false);

  const handleDelete = async () => {
    if (!agentData?.id) return;
    const confirmed = window.confirm("Are you sure? This will permanently delete your agent and its VPS.");
    if (!confirmed) return;
    setDeleting(true);
    try {
      await deleteAgent(agentData.id);
      setHasAgent(false);
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  };

  const handleRestart = async () => {
    if (!agentData?.id) return;
    setRestarting(true);
    try {
      await stopAgent(agentData.id);
      await new Promise((r) => setTimeout(r, 3000));
      await startAgent(agentData.id);
      setLiveStatus("running");
      setRestarting(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Restart failed");
      setRestarting(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">Settings</h1>
      <p className="text-[var(--muted)] mb-8">Manage your agent and account.</p>

      {/* Agent info */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide mb-3">Agent</h3>
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-semibold text-sm">{agentData?.business_name || "Marketing Agent"}</div>
              <div className="text-xs text-[var(--muted)] font-mono">{agentData?.slug} — {agentData?.hetzner_ip}</div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${liveStatus === "running" ? "bg-green-500" : "bg-red-500"}`}></div>
              <span className={`text-xs ${liveStatus === "running" ? "text-green-400" : "text-red-400"}`}>
                {liveStatus === "running" ? "Running" : liveStatus}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleRestart} disabled={restarting || !agentData?.id}
              className="px-3 py-1.5 rounded-lg text-xs bg-[var(--surface-light)] text-[var(--muted)] hover:text-white transition-colors disabled:opacity-40">
              {restarting ? "Restarting..." : "Restart agent"}
            </button>
            <button onClick={handleDelete} disabled={deleting || !agentData?.id}
              className="px-3 py-1.5 rounded-lg text-xs bg-[var(--surface-light)] text-red-400/60 hover:text-red-400 transition-colors disabled:opacity-40">
              {deleting ? "Deleting..." : "🗑️ Delete agent & data"}
            </button>
          </div>
        </div>
      </div>

      {/* Connection info */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide mb-3">Connections</h3>
        <div className="glass rounded-xl p-4 flex items-center gap-4 mb-2">
          <div className="w-10 h-10 rounded-lg bg-[#2AABEE] flex items-center justify-center text-white text-xl">✈️</div>
          <div className="flex-1">
            <div className="font-semibold text-sm">Telegram</div>
            <div className="text-xs text-[var(--muted)]">
              {(agentData?.config as Record<string, unknown>)?.telegramBotToken ? "Connected" : "Not configured"}
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs ${
            (agentData?.config as Record<string, unknown>)?.telegramBotToken
              ? "bg-[rgba(34,197,94,0.15)] text-green-400 border border-[rgba(34,197,94,0.3)]"
              : "bg-[var(--surface-light)] text-[var(--muted)]"
          }`}>
            {(agentData?.config as Record<string, unknown>)?.telegramBotToken ? "🟢 Connected" : "Not set"}
          </span>
        </div>
      </div>

      {/* Control UI link */}
      {agentData?.hetzner_ip && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide mb-3">Advanced</h3>
          <div className="glass rounded-xl p-5">
            <div className="font-semibold text-sm mb-1">OpenClaw Control UI</div>
            <p className="text-xs text-[var(--muted)] mb-3">Direct access to your agent&apos;s OpenClaw interface</p>
            <a href={`http://${agentData.hetzner_ip}:18789`} target="_blank" rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg text-xs bg-[var(--surface-light)] text-[var(--accent-light)] hover:text-white transition-colors inline-block">
              Open Control UI →
            </a>
          </div>
        </div>
      )}

      {/* Account */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide mb-3">Account</h3>
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-sm">Plan: Starter</div>
              <div className="text-xs text-[var(--muted)]">1 agent included</div>
            </div>
            <button className="px-3 py-1.5 rounded-lg text-xs bg-[var(--accent)] text-white hover:opacity-90 transition-opacity">
              Upgrade plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
