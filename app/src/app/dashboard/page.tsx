"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createAgent, listAgents, getBootStatus, getAgentRuntime, updateAgent,
  readAgentFile, writeAgentFile, deleteAgent, startAgent, stopAgent,
  setupWhatsApp, getWhatsAppStatus, getWhatsAppQR, disconnectWhatsApp,
  type Agent, type AgentRuntime, type WhatsAppStatus, type WhatsAppQR,
} from "@/lib/api";
import { signOut, getUser } from "@/lib/auth";

type OnboardingData = {
  addTelegram: boolean;
  telegramBotToken: string;
  ownerName: string;
  businessName: string;
  botName: string;
};

type BrandAsset = {
  name: string;
  path: string;
  size: number;
  type: string;
  uploadedAt: string;
};

type BrandFormData = {
  businessName: string;
  websiteUrl: string;
};

type SocialAccount = {
  platform: string;
  handle: string;
  connected: boolean;
};

type ActivityEntry = {
  time: string;
  emoji: string;
  summary: string;
};

type CalendarEntry = {
  date: string;
  platform: string;
  draft: string;
  status: string;
  statusEmoji: string;
};

type CompetitorEntry = {
  name: string;
  website: string;
  description: string;
  differentiator: string;
};

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-|-$/g, "") || "asset";
}

async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
}

const PLATFORM_ICONS: Record<string, string> = {
  "X/Twitter": "𝕏",
  "Instagram": "📸",
  "LinkedIn": "💼",
  "Reddit": "🤖",
  "TikTok": "🎵",
  "Facebook": "📘",
  "YouTube": "▶️",
};

const PLATFORM_OPTIONS = ["X/Twitter", "Instagram", "LinkedIn", "Reddit", "TikTok", "Facebook", "YouTube"];

function parseBrandProfile(md: string): { form: BrandFormData; accounts: SocialAccount[] } {
  const form: BrandFormData = {
    businessName: "",
    websiteUrl: "",
  };
  const accounts: SocialAccount[] = [];

  const extract = (label: string): string => {
    const regex = new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+?)(?:\\n|$)`, "i");
    const match = md.match(regex);
    return match ? match[1].trim() : "";
  };

  const extractMultiline = (label: string): string => {
    const regex = new RegExp(`\\*\\*${label}:\\*\\*\\s*\\n([\\s\\S]*?)(?=\\n\\*\\*|\\n##|$)`, "i");
    const match = md.match(regex);
    if (match) return match[1].trim();
    return extract(label);
  };

  form.businessName = extract("Name") || extract("Business Name");
  form.websiteUrl = extract("Website");

  const socialSection = md.match(/## Social Presence[\s\S]*?(?=\n## |$)/i);
  if (socialSection) {
    const lines = socialSection[0].split("\n");
    for (const line of lines) {
      const accountMatch = line.match(/^-\s*\*\*(.+?)\*\*:\s*(.+)/);
      if (accountMatch) {
        const platform = accountMatch[1].trim();
        const handle = accountMatch[2].trim();
        if (handle && handle !== "—" && handle !== "-") {
          accounts.push({ platform, handle, connected: false });
        }
      }
    }
  }

  return { form, accounts };
}

function brandFormFromAgent(agent: Agent | null): { form: BrandFormData; accounts: SocialAccount[] } {
  const cfg = (agent?.config || {}) as Record<string, unknown>;
  const socials = (cfg.socials && typeof cfg.socials === "object" ? cfg.socials : {}) as Record<string, string>;
  const accounts: SocialAccount[] = [
    ["Instagram", socials.instagram || ""],
    ["TikTok", socials.tiktok || ""],
    ["LinkedIn", socials.linkedin || ""],
    ["X/Twitter", socials.twitter || ""],
    ["Facebook", socials.facebook || ""],
  ]
    .filter(([, handle]) => handle)
    .map(([platform, handle]) => ({ platform, handle, connected: false }));

  return {
    form: {
      businessName: typeof cfg.businessName === "string" ? cfg.businessName : (agent?.business_name || ""),
      websiteUrl: typeof cfg.websiteUrl === "string" ? cfg.websiteUrl : "",
    },
    accounts,
  };
}

function serializeBrandProfile(form: BrandFormData, accounts: SocialAccount[]): string {
  let md = `# Brand Profile\n\n`;
  md += `**Name:** ${form.businessName}\n`;
  md += `**Website:** ${form.websiteUrl}\n`;

  if (accounts.length > 0) {
    md += `\n## Social Presence\n\n`;
    for (const acc of accounts) {
      md += `- **${acc.platform}**: ${acc.handle}\n`;
    }
  }

  return md;
}

function parseActivityLog(md: string): ActivityEntry[] {
  const entries: ActivityEntry[] = [];
  const lines = md.split("\n");
  for (const line of lines) {
    const richMatch = line.match(/^-\s*\*\*(\d{1,2}:\d{2})\*\*\s*(\S+)\s+(.+)/);
    if (richMatch) {
      entries.push({ time: richMatch[1], emoji: richMatch[2], summary: richMatch[3] });
      continue;
    }

    const datedMatch = line.match(/^-\s*(\d{4}-\d{2}-\d{2}):\s+(.+)/);
    if (datedMatch) {
      entries.push({ time: datedMatch[1], emoji: "📝", summary: datedMatch[2] });
      continue;
    }

    const plainBullet = line.match(/^-\s+(.+)/);
    if (plainBullet) {
      entries.push({ time: "", emoji: "📝", summary: plainBullet[1] });
    }
  }
  return entries;
}

function parseContentCalendar(md: string): CalendarEntry[] {
  const entries: CalendarEntry[] = [];
  const lines = md.split("\n");

  const normalizeStatus = (raw: string): { statusEmoji: string; status: string } => {
    const cleaned = raw.trim().replace(/^[^\p{L}\p{N}]+/u, "").toLowerCase();

    if (cleaned.startsWith("approved")) return { statusEmoji: "✅", status: "Approved" };
    if (cleaned.startsWith("published") || cleaned.startsWith("live")) return { statusEmoji: "🚀", status: "Published" };
    if (cleaned.startsWith("planned")) return { statusEmoji: "🟡", status: "Planned" };
    if (cleaned.startsWith("draft")) return { statusEmoji: "🟡", status: "Drafted" };
    if (cleaned.startsWith("skip") || cleaned.startsWith("cancel") || cleaned.startsWith("postpone")) {
      return { statusEmoji: "🟡", status: "Skipped" };
    }

    return { statusEmoji: "🟡", status: raw.trim() || "Pending" };
  };

  for (const line of lines) {
    const match = line.match(/^-\s*\*\*(.+?)\*\*\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(🟡|✅|🚀)\s*(.+)/);
    if (match) {
      entries.push({
        date: match[1].trim(),
        platform: match[2].trim(),
        draft: match[3].trim(),
        statusEmoji: match[4],
        status: match[5].trim(),
      });
    }
    const altMatch = line.match(/^-\s*(🟡|✅|🚀)\s*\*\*(.+?)\*\*\s*\|\s*(.+?)\s*\|\s*(.+)/);
    if (altMatch) {
      entries.push({
        statusEmoji: altMatch[1],
        date: altMatch[2].trim(),
        platform: altMatch[3].trim(),
        draft: altMatch[4].trim(),
        status: altMatch[1] === "🟡" ? "Pending" : altMatch[1] === "✅" ? "Approved" : "Published",
      });
    }

    if (!line.trim().startsWith("|")) continue;

    const cells = line
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);

    if (cells.length < 4) continue;
    if (cells.every((cell) => /^:?-{3,}:?$/.test(cell))) continue;
    if (cells[0].toLowerCase() === "date" && cells[1].toLowerCase() === "platform") continue;

    const [date, platform, draft, rawStatus] = cells;
    if (!date || !platform || !draft || !rawStatus) continue;

    const { statusEmoji, status } = normalizeStatus(rawStatus);
    entries.push({
      date,
      platform,
      draft,
      statusEmoji,
      status,
    });
  }

  const headingMatches = [...md.matchAll(/^###\s+(.+)$/gm)];
  for (let i = 0; i < headingMatches.length; i++) {
    const current = headingMatches[i];
    const next = headingMatches[i + 1];
    const date = current[1].trim();
    const start = (current.index ?? 0) + current[0].length;
    const end = next?.index ?? md.length;
    const block = md.slice(start, end);
    const blockLines = block.split("\n");

    let platform = "";
    let topic = "";
    let rawStatus = "";
    let draft = "";
    let collectingDraft = false;
    const draftLines: string[] = [];

    for (const rawLine of blockLines) {
      const line = rawLine.trimEnd();

      const platformMatch = line.match(/^- \*\*Platform:\*\*\s*(.+)$/);
      if (platformMatch) {
        platform = platformMatch[1].trim();
        collectingDraft = false;
        continue;
      }

      const topicMatch = line.match(/^- \*\*Topic:\*\*\s*(.+)$/);
      if (topicMatch) {
        topic = topicMatch[1].trim();
        collectingDraft = false;
        continue;
      }

      const statusMatch = line.match(/^- \*\*Status:\*\*\s*(.+)$/);
      if (statusMatch) {
        rawStatus = statusMatch[1].trim();
        collectingDraft = false;
        continue;
      }

      const draftMatch = line.match(/^- \*\*Draft:\*\*\s*(.*)$/);
      if (draftMatch) {
        const inlineDraft = draftMatch[1].trim();
        if (inlineDraft) draftLines.push(inlineDraft);
        collectingDraft = true;
        continue;
      }

      if (!collectingDraft) continue;
      if (/^- \*\*.+:\*\*/.test(line) || /^---+$/.test(line.trim())) break;

      if (line.trim().startsWith(">")) {
        draftLines.push(line.trim().replace(/^>\s?/, ""));
      } else if (line.trim().startsWith("- ")) {
        break;
      } else {
        draftLines.push(line.trim());
      }
    }

    draft = draftLines.join("\n").trim() || topic;
    if (!date || !platform || !draft) continue;

    const { statusEmoji, status } = normalizeStatus(rawStatus);
    entries.push({
      date,
      platform,
      draft,
      statusEmoji,
      status,
    });
  }

  return entries;
}

function parseCompetitors(md: string): CompetitorEntry[] {
  const entries: CompetitorEntry[] = [];
  const sections = md.split(/(?=^##\s)/m);
  for (const section of sections) {
    const nameMatch = section.match(/^##\s+(.+)/);
    if (!nameMatch) continue;
    const name = nameMatch[1].trim();
    if (name.toLowerCase() === "competitors" || name.toLowerCase() === "tracked competitors") continue;

    const website = (section.match(/\*\*Website\*\*:\s*(.+)/i) || section.match(/\*\*URL\*\*:\s*(.+)/i) || ["", ""])[1].trim();
    const description = (section.match(/\*\*Description\*\*:\s*(.+)/i) || section.match(/\*\*What they do\*\*:\s*(.+)/i) || ["", ""])[1].trim();
    const differentiator = (section.match(/\*\*Differentiator\*\*:\s*(.+)/i) || section.match(/\*\*Difference\*\*:\s*(.+)/i) || ["", ""])[1].trim();

    entries.push({ name, website, description, differentiator });
  }

  if (entries.length === 0) {
    const lines = md.split("\n");
    for (const line of lines) {
      const match = line.match(/^-\s*\*\*(.+?)\*\*\s*[-–—]\s*\[(.+?)\]\((.+?)\)\s*[-–—:]\s*(.+)/);
      if (match) {
        entries.push({
          name: match[1].trim(),
          website: match[3].trim(),
          description: match[4].trim(),
          differentiator: "",
        });
      }
    }
  }

  return entries;
}

const NAV_ITEMS = [
  { id: "home", icon: "🏠", label: "Home" },
  { id: "brand", icon: "🎯", label: "Brand" },
  { id: "calendar", icon: "📅", label: "Calendar" },
  { id: "market-intel", icon: "🔍", label: "Market Intel" },
  { id: "settings", icon: "⚙️", label: "Agent Settings" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [hasAgent, setHasAgent] = useState(false);
  const [liveStatus, setLiveStatus] = useState<string>("unknown");
  const [activeTab, setActiveTab] = useState("home");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [agentData, setAgentData] = useState<Agent | null>(null);

  // Auth guard — validate token with backend
  useEffect(() => {
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

          let nextStatus = agent.liveStatus || agent.state || "unknown";
          if (nextStatus === "provisioning") {
            try {
              const boot = await getBootStatus(agent.id);
              if (boot.ready) nextStatus = "running";
            } catch {
              // ignore boot-status reconciliation failure
            }
          }

          setLiveStatus(nextStatus);
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
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--accent)]/20 text-[var(--accent-light)] border border-[var(--accent)]/30 leading-none">Beta</span>
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
            setLiveStatus(agent.liveStatus || agent.state || "unknown");
          }} />
        ) : (
          <>
            {activeTab === "home" && <HomeTab agentData={agentData} liveStatus={liveStatus} />}
            {activeTab === "brand" && <BrandTab agentData={agentData} />}
            {activeTab === "calendar" && <CalendarTab agentId={agentData?.id || ""} />}
            {activeTab === "market-intel" && <MarketIntelTab agentId={agentData?.id || ""} />}
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
    botName: "Tevy",
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
          setTimeout(async () => {
            try {
              const { agents } = await listAgents();
              if (agents?.[0]) onComplete({ ...agents[0], state: "running", liveStatus: "running" });
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
        name: form.businessName,
        ownerName: form.ownerName,
        businessName: form.businessName,
        botName: form.botName || "Tevy",
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
  const progress = bootStatus?.progress || 0;
  const stage = bootStatus?.stage || "creating";
  const stepLabels = [
    { label: "Creating your bot", threshold: 15 },
    { label: "Starting its computer", threshold: 40 },
    { label: "Installing Tevy", threshold: 60 },
    { label: "Connecting chat", threshold: 80 },
    { label: "Ready", threshold: 100 },
  ];
  const stageExplainer =
    stage === "creating" ? "We’re creating your Tevy bot and preparing its workspace." :
    stage === "provisioning" ? "We’re setting up its own computer in the cloud." :
    stage === "booting" ? "That new computer is waking up so we can log into it." :
    stage === "installing" ? "We’re installing Tevy, OpenClaw, and your starter workspace." :
    stage === "gateway" ? "We’re bringing Tevy online so you can chat with it." :
    stage === "ready" ? "Everything is live. Your bot is ready." :
    stage === "offline" ? "The machine is currently offline." :
    error ? "Something went wrong while setting things up." :
    "We’re getting everything ready for you.";

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Set up your marketing agent</h1>
      <p className="text-sm text-[var(--muted)] mb-8">
        Just the basics for now. You can fill in the rest later.
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
          <label className="text-xs text-[var(--muted)] mb-1 block">Bot name</label>
          <input className="input-field" placeholder="Tevy" value={form.botName}
            onChange={(e) => update("botName", e.target.value)} disabled={deploying} />
          <p className="text-xs text-[var(--muted)] mt-1">Your marketing agent&apos;s name. Defaults to Tevy.</p>
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

        <div className="flex gap-2 flex-wrap">
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
          <div className="mb-5 rounded-2xl border border-[var(--border)] bg-[linear-gradient(180deg,rgba(16,185,129,0.08),rgba(59,130,246,0.05))] p-5 overflow-hidden relative">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)] mb-2">Provisioning</div>
                <div className="flex items-center gap-3">
                  <div className="relative w-16 h-16 rounded-2xl bg-[var(--surface-light)] border border-[var(--border)] flex items-center justify-center">
                    <div className="text-3xl">🤖</div>
                    {!bootStatus?.ready && !error && (
                      <>
                        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[var(--accent)] animate-ping"></div>
                        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[var(--accent)]"></div>
                      </>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-semibold">
                      {error ? "Something went wrong" : bootStatus?.ready ? "Your Tevy bot is live" : "Building your Tevy bot"}
                    </div>
                    <p className="text-sm text-[var(--muted)] mt-1">{stageExplainer}</p>
                  </div>
                </div>
              </div>
              <div className="hidden sm:flex items-end gap-2 self-center">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-2 rounded-full bg-[var(--accent-light)]/80 animate-pulse" style={{ height: `${16 + ((i + Math.floor(progress / 20)) % 5) * 8}px`, animationDelay: `${i * 120}ms` }}></div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-3">
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
              width: `${progress}%`,
              background: error ? "#ef4444" : bootStatus?.ready ? "#22c55e" : "linear-gradient(90deg, var(--accent), var(--accent-light))",
            }}></div>
          </div>

          <div className="flex justify-between gap-2 mt-4 text-xs text-[var(--muted)] flex-wrap">
            {stepLabels.map((s) => (
              <span key={s.label} className={progress >= s.threshold ? "text-white font-medium" : ""}>
                {progress >= s.threshold ? "✓ " : ""}{s.label}
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
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  useEffect(() => {
    if (!agentData?.id) return;
    setActivitiesLoading(true);
    readAgentFile(agentData.id, "memory/activity-log.md")
      .then((res) => {
        if (res.content) {
          setActivities(parseActivityLog(res.content));
        }
      })
      .catch(() => {})
      .finally(() => setActivitiesLoading(false));
  }, [agentData?.id]);

  return (
    <div className="h-full flex flex-col">
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
              {((agentData?.config as Record<string, unknown>)?.chatChannel === "telegram" || (agentData?.config as Record<string, unknown>)?.telegramEnabled)
                ? "Telegram"
                : "Not configured"}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass rounded-xl p-6 mb-6">
          <h3 className="font-semibold mb-3">Recent Activity</h3>
          {activitiesLoading ? (
            <div className="text-center py-6">
              <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-[var(--muted)]">Loading activity...</p>
            </div>
          ) : activities.length > 0 ? (
            <div className="space-y-3">
              {activities.map((entry, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-14 text-xs font-mono text-[var(--muted)] pt-0.5">{entry.time}</div>
                  <div className="flex-shrink-0 w-6 text-center relative">
                    <span>{entry.emoji}</span>
                    {i < activities.length - 1 && (
                      <div className="absolute left-1/2 top-6 bottom-0 w-px bg-[var(--border)] -translate-x-1/2" style={{ height: "calc(100% + 0.25rem)" }}></div>
                    )}
                  </div>
                  <div className="text-sm text-[var(--foreground)]">{entry.summary}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="text-2xl mb-2">📋</div>
              <p className="text-sm text-[var(--muted)]">No activity yet</p>
            </div>
          )}
        </div>


      </div>
    </div>
  );
}

/* ─── BRAND TAB ─── */
function BrandTab({ agentData }: { agentData: Agent | null }) {
  const [brandForm, setBrandForm] = useState<BrandFormData>({
    businessName: "",
    websiteUrl: "",
  });
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [newPlatform, setNewPlatform] = useState(PLATFORM_OPTIONS[0]);
  const [newHandle, setNewHandle] = useState("");
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agentData?.id) return;
    const agentId = agentData.id;

    async function loadBrandWorkspace() {
      setLoading(true);
      setError(null);

      try {
        const [profile, assetIndex] = await Promise.all([
          readAgentFile(agentId, "memory/brand-profile.md").catch(() => ({ content: "" })),
          readAgentFile(agentId, "brand-assets/index.json").catch(() => ({ content: "" })),
        ]);

        if (profile.content) {
          const parsed = parseBrandProfile(profile.content);
          setBrandForm(parsed.form);
          setSocialAccounts(parsed.accounts);
        } else {
          const fallback = brandFormFromAgent(agentData);
          setBrandForm(fallback.form);
          setSocialAccounts(fallback.accounts);
        }

        if (assetIndex.content) {
          const parsed = JSON.parse(assetIndex.content) as { assets?: BrandAsset[] };
          setAssets(Array.isArray(parsed.assets) ? parsed.assets : []);
        } else {
          setAssets([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load brand workspace");
      } finally {
        setLoading(false);
      }
    }

    void loadBrandWorkspace();
  }, [agentData?.id]);

  const saveBrandProfile = async () => {
    if (!agentData?.id) return;
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const md = serializeBrandProfile(brandForm, socialAccounts);
      await writeAgentFile(agentData.id, "memory/brand-profile.md", md);
      setMessage("Brand profile saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save brand profile");
    } finally {
      setSaving(false);
    }
  };

  const addSocialAccount = () => {
    if (!newHandle.trim()) return;
    setSocialAccounts((prev) => [...prev, { platform: newPlatform, handle: newHandle.trim(), connected: false }]);
    setNewHandle("");
  };

  const removeSocialAccount = (index: number) => {
    setSocialAccounts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAssetUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!agentData?.id || !event.target.files?.length) return;

    setUploading(true);
    setMessage(null);
    setError(null);

    try {
      const nextAssets = [...assets];

      for (const file of Array.from(event.target.files)) {
        const uploadedAt = new Date().toISOString();
        const safeName = `${Date.now()}-${sanitizeFileName(file.name)}`;
        const path = `brand-assets/${safeName}`;
        const base64 = await fileToBase64(file);

        await writeAgentFile(agentData.id, path, base64, "base64");

        nextAssets.unshift({
          name: file.name,
          path,
          size: file.size,
          type: file.type || "application/octet-stream",
          uploadedAt,
        });
      }

      setAssets(nextAssets);
      await writeAgentFile(agentData.id, "brand-assets/index.json", JSON.stringify({ assets: nextAssets }, null, 2));
      setMessage("Brand assets uploaded.");
      event.target.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload brand assets");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">Brand Profile</h1>
        <button
          onClick={saveBrandProfile}
          disabled={saving}
          className="px-4 py-2 rounded-lg text-sm bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {saving ? "Saving..." : "Save profile"}
        </button>
      </div>
      <p className="text-[var(--muted)] mb-6">Edit your brand profile and manage social accounts.</p>
      {message && <p className="text-sm text-green-400 mb-4">{message}</p>}
      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      {loading ? (
        <div className="glass rounded-xl p-6 text-center">
          <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-[var(--muted)]">Loading brand profile...</p>
        </div>
      ) : (
        <>
          {/* Project Info — factual details at the top */}
          <div className="glass rounded-xl p-6 mb-6">
            <h3 className="font-semibold mb-4">📋 Project Info</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[var(--muted)] mb-1 block">Business Name</label>
                  <input
                    className="input-field"
                    placeholder="Sunrise Coffee Co"
                    value={brandForm.businessName}
                    onChange={(e) => setBrandForm((f) => ({ ...f, businessName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--muted)] mb-1 block">Website URL</label>
                  <input
                    className="input-field"
                    placeholder="https://example.com"
                    value={brandForm.websiteUrl}
                    onChange={(e) => setBrandForm((f) => ({ ...f, websiteUrl: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Social Accounts */}
          <div className="glass rounded-xl p-6 mb-6">
            <h3 className="font-semibold mb-4">📱 Social Accounts</h3>

            {socialAccounts.length > 0 ? (
              <div className="space-y-2 mb-4">
                {socialAccounts.map((account, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg bg-[var(--surface-light)] px-4 py-3">
                    <span className="text-lg w-6 text-center">{PLATFORM_ICONS[account.platform] || "🌐"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{account.handle}</div>
                      <div className="text-xs text-[var(--muted)]">{account.platform}</div>
                    </div>
                    <button
                      onClick={() => removeSocialAccount(i)}
                      className="text-red-400/60 hover:text-red-400 transition-colors text-sm ml-2"
                      title="Remove account"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 mb-4">
                <p className="text-sm text-[var(--muted)]">No social accounts added yet.</p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <select
                value={newPlatform}
                onChange={(e) => setNewPlatform(e.target.value)}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
              >
                {PLATFORM_OPTIONS.map((p) => (
                  <option key={p} value={p}>{PLATFORM_ICONS[p]} {p}</option>
                ))}
              </select>
              <input
                className="input-field !py-2 text-sm flex-1"
                placeholder="@handle or URL"
                value={newHandle}
                onChange={(e) => setNewHandle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addSocialAccount(); }}
              />
              <button
                onClick={addSocialAccount}
                disabled={!newHandle.trim()}
                className="px-4 py-2 rounded-lg text-xs bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-40 whitespace-nowrap"
              >
                + Add
              </button>
            </div>

            {message && <p className="text-xs text-green-400 mt-3">{message}</p>}
            {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
          </div>

          {/* Brand Assets */}
          <div className="glass rounded-xl p-6">
            <h3 className="font-semibold mb-2">📎 Brand Assets</h3>
            <p className="text-sm text-[var(--muted)] mb-4">
              Upload logos, screenshots, PDFs, brand decks, packaging shots, and other source material into the agent workspace.
            </p>

            <label className="upload-zone rounded-xl p-6 border border-dashed border-[var(--border)] block cursor-pointer mb-4">
              <input type="file" multiple className="hidden" onChange={handleAssetUpload} />
              <div className="text-center">
                <div className="text-3xl mb-2">⬆️</div>
                <p className="text-sm">{uploading ? "Uploading..." : "Upload brand files"}</p>
                <p className="text-xs text-[var(--muted)] mt-1">Files are stored under `brand-assets/` on the agent.</p>
              </div>
            </label>

            {assets.length > 0 ? (
              <div className="space-y-2">
                {assets.map((asset) => (
                  <div key={`${asset.path}-${asset.uploadedAt}`} className="flex items-center justify-between gap-3 rounded-lg bg-[var(--surface-light)] px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate">{asset.name}</div>
                      <div className="text-xs text-[var(--muted)] font-mono truncate">{asset.path}</div>
                    </div>
                    <div className="text-xs text-[var(--muted)] shrink-0">
                      {(asset.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-2xl mb-2">🗂️</div>
                <p className="text-sm text-[var(--muted)]">No brand assets uploaded yet.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── CALENDAR TAB ─── */
function CalendarTab({ agentId }: { agentId: string }) {
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentId) return;
    setLoading(true);
    readAgentFile(agentId, "memory/content-calendar.md")
      .then((res) => {
        if (res.content) {
          setEntries(parseContentCalendar(res.content));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [agentId]);

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">Content Calendar</h1>
      <p className="text-[var(--muted)] mb-6">Managed by your agent. Posts are drafted, approved, then scheduled.</p>

      {loading ? (
        <div className="glass rounded-xl p-6 text-center">
          <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-[var(--muted)]">Loading calendar...</p>
        </div>
      ) : entries.length > 0 ? (
        <div className="space-y-3">
          {entries.map((entry, i) => (
            <div key={i} className="glass rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-[var(--muted)] bg-[var(--surface-light)] px-2 py-1 rounded">{entry.date}</span>
                  <span className="text-xs font-medium text-[var(--foreground)]">{entry.platform}</span>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs ${
                  entry.statusEmoji === "🚀" ? "bg-[rgba(34,197,94,0.15)] text-green-400 border border-[rgba(34,197,94,0.3)]" :
                  entry.statusEmoji === "✅" ? "bg-[rgba(59,130,246,0.15)] text-blue-400 border border-[rgba(59,130,246,0.3)]" :
                  "bg-[rgba(234,179,8,0.15)] text-yellow-400 border border-[rgba(234,179,8,0.3)]"
                }`}>
                  {entry.statusEmoji} {entry.status}
                </span>
              </div>
              <p className="text-sm text-[var(--foreground)]">{entry.draft}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass rounded-xl p-6 text-center">
          <div className="text-4xl mb-3">📅</div>
          <h2 className="text-lg font-semibold mb-2">No posts scheduled</h2>
          <p className="text-sm text-[var(--muted)]">Ask your agent to create a content calendar.</p>
        </div>
      )}
    </div>
  );
}

/* ─── MARKET INTEL TAB ─── */
function serializeCompetitors(entries: CompetitorEntry[]): string {
  let md = "# Competitor Tracking\n\n";
  if (entries.length === 0) {
    md += "No competitors tracked yet.\n";
    return md;
  }
  for (const entry of entries) {
    md += `## ${entry.name}\n`;
    if (entry.website) md += `- **Website:** ${entry.website}\n`;
    if (entry.description) md += `- **What they do well:** ${entry.description}\n`;
    if (entry.differentiator) md += `- **Our differentiator:** ${entry.differentiator}\n`;
    md += "\n";
  }
  return md;
}

function MarketIntelTab({ agentId }: { agentId: string }) {
  const [competitors, setCompetitors] = useState<CompetitorEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [newCompetitor, setNewCompetitor] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!agentId) return;
    setLoading(true);
    readAgentFile(agentId, "memory/competitors.md")
      .then((res) => {
        if (res.content) {
          setCompetitors(parseCompetitors(res.content));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [agentId]);

  const addCompetitor = () => {
    if (!newCompetitor.trim()) return;
    setCompetitors((prev) => [...prev, { name: newCompetitor.trim(), website: "", description: "", differentiator: "" }]);
    setNewCompetitor("");
    setDirty(true);
  };

  const removeCompetitor = (index: number) => {
    setCompetitors((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  };

  const saveCompetitors = async () => {
    if (!agentId) return;
    setSaving(true);
    setMessage(null);
    try {
      const md = serializeCompetitors(competitors);
      await writeAgentFile(agentId, "memory/competitors.md", md);
      setMessage("Competitors saved.");
      setDirty(false);
    } catch {
      setMessage("Failed to save competitors.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">Market Intel</h1>
      <p className="text-[var(--muted)] mb-6">Tell your bot what to track. It will research and report back.</p>

      {loading ? (
        <div className="glass rounded-xl p-6 text-center">
          <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-[var(--muted)]">Loading...</p>
        </div>
      ) : (
        <>
          {/* Tracking List */}
          <div className="glass rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold">🎯 Tracking List</h3>
              <button
                onClick={saveCompetitors}
                disabled={saving || !dirty}
                className="px-3 py-1.5 rounded-lg text-xs bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
            <p className="text-xs text-[var(--muted)] mb-4">Competitors, accounts, and topics your bot monitors.</p>
            {message && <p className="text-xs text-green-400 mb-3">{message}</p>}

            {competitors.length > 0 && (
              <div className="space-y-2 mb-4">
                {competitors.map((comp, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg bg-[var(--surface-light)] px-4 py-3">
                    <span className="text-sm">🏢</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{comp.name}</div>
                      {comp.website && <div className="text-xs text-[var(--muted)]">{comp.website}</div>}
                    </div>
                    {comp.description && (
                      <span className="text-xs text-[var(--muted)] max-w-[200px] truncate hidden md:block">{comp.description}</span>
                    )}
                    <button
                      onClick={() => removeCompetitor(i)}
                      className="text-red-400/60 hover:text-red-400 transition-colors text-sm ml-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                className="input-field !py-2 text-sm flex-1"
                placeholder="Add a competitor name, handle, or URL..."
                value={newCompetitor}
                onChange={(e) => setNewCompetitor(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addCompetitor(); }}
              />
              <button
                onClick={addCompetitor}
                disabled={!newCompetitor.trim()}
                className="px-4 py-2 rounded-lg text-xs bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-40 whitespace-nowrap"
              >
                + Add
              </button>
            </div>
          </div>

          {/* Reporting */}
          <div className="glass rounded-xl p-6 mb-6">
            <h3 className="font-semibold mb-1">📊 Reports</h3>
            <p className="text-xs text-[var(--muted)] mb-4">Your bot runs competitor research and delivers reports via Telegram.</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-[var(--surface-light)] p-3 text-center">
                <p className="text-xs text-[var(--muted)] mb-1">Report frequency</p>
                <p className="text-sm font-medium">Weekly</p>
              </div>
              <div className="rounded-lg bg-[var(--surface-light)] p-3 text-center">
                <p className="text-xs text-[var(--muted)] mb-1">Last report</p>
                <p className="text-sm font-medium text-[var(--muted)]">—</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <span className="px-3 py-1.5 rounded-full text-xs bg-[var(--surface-light)] text-[var(--muted)] border border-[var(--border)]">
                💬 &quot;Research my competitors&quot;
              </span>
              <span className="px-3 py-1.5 rounded-full text-xs bg-[var(--surface-light)] text-[var(--muted)] border border-[var(--border)]">
                💬 &quot;What are competitors posting?&quot;
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── WHATSAPP CHANNEL ROW ─── */
function WhatsAppChannelRow({ agentId, agentConfig }: { agentId: string; agentConfig: Record<string, unknown> }) {
  const [showSetup, setShowSetup] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [setting, setSetting] = useState(false);
  const [waStatus, setWaStatus] = useState<WhatsAppStatus | null>(null);
  const [qrData, setQrData] = useState<WhatsAppQR | null>(null);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
  };

  // Check status on mount
  useEffect(() => {
    if (!agentId) return;
    getWhatsAppStatus(agentId)
      .then(setWaStatus)
      .catch(() => {});
  }, [agentId]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => { stopPolling(); };
  }, []);

  const startSetup = async () => {
    setSetting(true);
    setError(null);
    try {
      await setupWhatsApp(agentId, {
        phoneNumber: phoneNumber || undefined,
        dmPolicy: phoneNumber ? "allowlist" : "open",
      });

      // Start polling for QR code
      setPolling(true);
      let attempts = 0;
      const pollQr = async () => {
        attempts++;
        try {
          const qr = await getWhatsAppQR(agentId);
          setQrData(qr);

          if (qr.linked) {
            // Successfully linked!
            stopPolling();
            setPolling(false);
            setSetting(false);
            setShowSetup(false);
            // Refresh status
            const status = await getWhatsAppStatus(agentId);
            setWaStatus(status);
            return;
          }
        } catch {
          // Keep polling
        }

        if (attempts > 60) {
          // 2 minutes timeout
          stopPolling();
          setPolling(false);
          setSetting(false);
          setError("QR code timed out. Try again.");
          return;
        }

        pollRef.current = setTimeout(() => { void pollQr(); }, 2000);
      };

      void pollQr();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
      setSetting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect WhatsApp? You'll need to scan QR again to reconnect.")) return;
    setDisconnecting(true);
    try {
      await disconnectWhatsApp(agentId);
      setWaStatus(null);
      setQrData(null);
      setShowSetup(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disconnect failed");
    } finally {
      setDisconnecting(false);
    }
  };

  const isConnected = !!(waStatus?.linked || waStatus?.hasCreds);

  return (
    <>
      <div className="flex items-center gap-4 p-4">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xl flex-shrink-0" style={{ backgroundColor: "#25D366" }}>📱</div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm flex items-center gap-2">
            WhatsApp
            {!isConnected && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-light)] text-[var(--muted)]">Popular</span>}
          </div>
          <div className="text-xs text-[var(--muted)]">Link your WhatsApp — scan QR code to connect</div>
        </div>
        {isConnected ? (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="px-2.5 py-1 rounded-full text-xs bg-[rgba(34,197,94,0.15)] text-green-400 border border-[rgba(34,197,94,0.3)]">🟢 Connected</span>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="px-2 py-1 rounded text-xs text-red-400/60 hover:text-red-400 transition-colors"
            >
              {disconnecting ? "..." : "✕"}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowSetup(!showSetup)}
            className="px-3 py-1.5 rounded-lg text-xs bg-[var(--accent)] text-white hover:opacity-90 transition-opacity flex-shrink-0"
          >
            Connect
          </button>
        )}
      </div>

      {/* Setup panel — shown inline below the row */}
      {showSetup && !isConnected && (
        <div className="px-4 pb-4">
          <div className="glass rounded-xl p-5 ml-14">
            {!polling && !qrData?.qr ? (
              <>
                <h4 className="font-semibold text-sm mb-3">Connect WhatsApp</h4>
                <div className="mb-4">
                  <label className="text-xs text-[var(--muted)] mb-1 block">Your phone number <span className="text-[var(--muted)]">(optional, for access control)</span></label>
                  <input
                    className="input-field text-sm"
                    placeholder="+44 7XXX XXXXXX"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    disabled={setting}
                  />
                  <p className="text-xs text-[var(--muted)] mt-1">If provided, only this number can message the bot. Leave empty for open access.</p>
                </div>
                <button
                  onClick={startSetup}
                  disabled={setting}
                  className="btn-primary text-sm py-2 px-4"
                >
                  {setting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Setting up...
                    </span>
                  ) : "Generate QR Code"}
                </button>
              </>
            ) : qrData?.linked ? (
              <div className="text-center py-4">
                <div className="text-3xl mb-2">✅</div>
                <p className="font-semibold">WhatsApp linked!</p>
                <p className="text-sm text-[var(--muted)]">Your bot is now accessible via WhatsApp.</p>
              </div>
            ) : (
              <div className="text-center">
                <h4 className="font-semibold text-sm mb-3">Scan QR Code</h4>
                <p className="text-xs text-[var(--muted)] mb-4">Open WhatsApp → Settings → Linked Devices → Link a Device</p>

                {qrData?.qr && qrData.qrType === "text" ? (
                  <pre
                    className="bg-white text-black p-4 rounded-xl text-[8px] leading-[8px] md:text-[10px] md:leading-[10px] font-mono inline-block mx-auto mb-4 select-none overflow-auto max-w-full"
                    style={{ letterSpacing: "-0.4px" }}
                  >
                    {qrData.qr}
                  </pre>
                ) : qrData?.qr && qrData.qrType === "data" ? (
                  <div className="mb-4">
                    <p className="text-sm text-[var(--muted)]">QR data ready — rendering...</p>
                    <code className="text-xs break-all">{qrData.qr.slice(0, 50)}...</code>
                  </div>
                ) : (
                  <div className="py-8">
                    <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-sm text-[var(--muted)]">{qrData?.message || "Generating QR code..."}</p>
                  </div>
                )}

                <p className="text-xs text-[var(--muted)]">
                  {polling ? "Waiting for you to scan..." : ""}
                </p>

                <button
                  onClick={() => {
                    stopPolling();
                    setPolling(false);
                    setSetting(false);
                    setQrData(null);
                    setShowSetup(false);
                  }}
                  className="mt-4 text-xs text-[var(--muted)] hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-400 mt-3">{error}</p>
            )}
          </div>
        </div>
      )}
    </>
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
  const [updating, setUpdating] = useState(false);
  const [runtime, setRuntime] = useState<AgentRuntime | null>(null);
  const [runtimeLoading, setRuntimeLoading] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [botName, setBotName] = useState<string>((agentData?.config as Record<string, unknown>)?.botName as string || "Tevy");
  const [savingName, setSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState<string | null>(null);
  const [toolToggles, setToolToggles] = useState({
    webSearch: false,
    imageGen: false,
    emailOutreach: false,
    deepSearch: true,
  });

  const refreshRuntime = useCallback(async () => {
    if (!agentData?.id) return;
    setRuntimeLoading(true);
    try {
      const nextRuntime = await getAgentRuntime(agentData.id);
      setRuntime(nextRuntime);
      setRuntimeError(null);
    } catch (err) {
      setRuntimeError(err instanceof Error ? err.message : "Could not load runtime info");
    } finally {
      setRuntimeLoading(false);
    }
  }, [agentData?.id]);

  useEffect(() => {
    refreshRuntime();
  }, [refreshRuntime]);

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
      setUpdateMessage("Agent restarted. Refreshing runtime info...");
      setTimeout(() => { void refreshRuntime(); }, 1500);
      setRestarting(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Restart failed");
      setRestarting(false);
    }
  };

  const handleUpdate = async () => {
    if (!agentData?.id) return;
    setUpdating(true);
    setUpdateMessage(null);
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Update timed out — the agent may still be updating in the background.")), 60_000)
      );
      const result = await Promise.race([updateAgent(agentData.id), timeoutPromise]);
      setRuntime(result.runtime || null);
      setRuntimeError(null);
      setUpdateMessage(
        `Update complete. OpenClaw ${result.runtime?.openclawVersion || "unknown"} · image ${result.runtime?.imageRevision || "unknown"}`
      );
    } catch (err) {
      setUpdateMessage(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUpdating(false);
    }
  };

  const toggleTool = (key: keyof typeof toolToggles) => {
    setToolToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const saveBotName = async () => {
    if (!agentData?.id || !botName.trim()) return;
    setSavingName(true);
    setNameMessage(null);
    try {
      const name = botName.trim();
      const businessName = agentData.business_name || agentData.name || "your business";
      const slug = agentData.slug || "";
      const identityMd = `# IDENTITY.md\n\n- **Name:** ${name}\n- **Role:** Marketing concierge for ${businessName}\n- **Business:** ${businessName}\n- **Slug:** ${slug}\n- **Platform:** tevy2.ai\n- **Workspace:** Customer-owned OpenClaw workspace\n`;
      await writeAgentFile(agentData.id, "IDENTITY.md", identityMd);

      // Also update SOUL.md name references
      try {
        const soul = await readAgentFile(agentData.id, "SOUL.md");
        if (soul.content) {
          const updated = soul.content
            .replace(/# SOUL\.md — .+?, Your/, `# SOUL.md — ${name}, Your`)
            .replace(/You are \*\*.+?\*\*,/, `You are **${name}**,`);
          await writeAgentFile(agentData.id, "SOUL.md", updated);
        }
      } catch { /* SOUL.md may not exist yet */ }

      setNameMessage("Bot name updated.");
    } catch {
      setNameMessage("Failed to update bot name.");
    } finally {
      setSavingName(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">Agent Settings</h1>
      <p className="text-[var(--muted)] mb-8">Manage your agent, connections, and account.</p>

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
          <div className="grid grid-cols-2 gap-4 text-xs mb-4">
            <div>
              <div className="text-[var(--muted)] mb-1">OpenClaw version</div>
              <div className="font-mono">{runtimeLoading ? "Loading..." : runtime?.openclawVersion || "Unavailable"}</div>
            </div>
            <div>
              <div className="text-[var(--muted)] mb-1">Image revision</div>
              <div className="font-mono">{runtimeLoading ? "Loading..." : runtime?.imageRevision || "Unavailable"}</div>
            </div>
            <div>
              <div className="text-[var(--muted)] mb-1">Gateway</div>
              <div className="font-mono">{runtimeLoading ? "Loading..." : runtime?.gatewayStatus || "Unknown"}</div>
            </div>
            <div>
              <div className="text-[var(--muted)] mb-1">Update script</div>
              <div className="font-mono">
                {runtimeLoading ? "Loading..." : runtime?.updateScriptPresent ? "Present" : "Missing"}
              </div>
            </div>
          </div>
          {runtimeError && (
            <p className="text-xs text-red-400 mb-3">{runtimeError}</p>
          )}
          {updateMessage && (
            <p className="text-xs text-green-400 mb-3">{updateMessage}</p>
          )}
          <div className="flex gap-2">
            <button onClick={handleUpdate} disabled={updating || !agentData?.id || liveStatus !== "running"}
              className="px-3 py-1.5 rounded-lg text-xs bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-40">
              {updating ? "Updating..." : "Update image"}
            </button>
            <button onClick={handleRestart} disabled={restarting || !agentData?.id}
              className="px-3 py-1.5 rounded-lg text-xs bg-[var(--surface-light)] text-[var(--muted)] hover:text-white transition-colors disabled:opacity-40">
              {restarting ? "Restarting..." : "Restart agent"}
            </button>
            <button onClick={() => { void refreshRuntime(); }} disabled={runtimeLoading || !agentData?.id}
              className="px-3 py-1.5 rounded-lg text-xs bg-[var(--surface-light)] text-[var(--muted)] hover:text-white transition-colors disabled:opacity-40">
              {runtimeLoading ? "Refreshing..." : "Refresh status"}
            </button>
            <button onClick={handleDelete} disabled={deleting || !agentData?.id}
              className="px-3 py-1.5 rounded-lg text-xs bg-[var(--surface-light)] text-red-400/60 hover:text-red-400 transition-colors disabled:opacity-40">
              {deleting ? "Deleting..." : "🗑️ Delete agent & data"}
            </button>
          </div>
        </div>
      </div>

      {/* Bot Name */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide mb-3">Bot Identity</h3>
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-[var(--muted)] mb-1 block">Bot name</label>
              <input
                className="input-field"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                placeholder="Tevy"
              />
            </div>
            <button
              onClick={saveBotName}
              disabled={savingName || !botName.trim()}
              className="px-3 py-1.5 rounded-lg text-xs bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-40 mt-4"
            >
              {savingName ? "Saving..." : "Save"}
            </button>
          </div>
          {nameMessage && <p className="text-xs text-green-400 mt-2">{nameMessage}</p>}
          <p className="text-xs text-[var(--muted)] mt-2">This name is used in your agent&apos;s identity and personality files.</p>
        </div>
      </div>

      {/* Chat Channels */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide mb-3">Chat Channels</h3>
        <p className="text-xs text-[var(--muted)] mb-3">How <strong>you</strong> chat with your bot. This is your private communication channel — not visible to your customers.</p>
        <div className="glass rounded-xl divide-y divide-[var(--border)]">
          {/* Telegram */}
          <div className="flex items-center gap-4 p-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xl flex-shrink-0" style={{ backgroundColor: "#2AABEE" }}>✈️</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">Telegram</div>
              <div className="text-xs text-[var(--muted)]">Chat with your bot from any device</div>
            </div>
            {(agentData?.config as Record<string, unknown>)?.telegramBotToken ? (
              <span className="px-2.5 py-1 rounded-full text-xs bg-[rgba(34,197,94,0.15)] text-green-400 border border-[rgba(34,197,94,0.3)] flex-shrink-0">🟢 Connected</span>
            ) : (
              <button className="px-3 py-1.5 rounded-lg text-xs bg-[var(--surface-light)] text-[var(--muted)] hover:text-white border border-[var(--border)] transition-colors flex-shrink-0">Connect</button>
            )}
          </div>

          {/* WhatsApp — Interactive */}
          <WhatsAppChannelRow agentId={agentData?.id || ""} agentConfig={agentData?.config as Record<string, unknown>} />

          {/* Coming soon channels */}
          {([
            { icon: "🎮", name: "Discord", desc: "Add your bot to a Discord server", color: "#5865F2" },
            { icon: "💬", name: "Slack", desc: "Use your bot inside your Slack workspace", color: "#4A154B" },
            { icon: "💬", name: "Signal", desc: "Privacy-focused encrypted messaging", color: "#3A76F0" },
            { icon: "💬", name: "iMessage", desc: "Chat via Apple Messages (requires BlueBubbles)", color: "#34C759" },
            { icon: "💬", name: "Matrix", desc: "Decentralized, open-source messaging", color: "#0DBD8B" },
          ]).map((ch) => (
            <div key={ch.name} className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xl flex-shrink-0" style={{ backgroundColor: ch.color }}>{ch.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm flex items-center gap-2">
                  {ch.name}
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-light)] text-[var(--muted)]">Soon</span>
                </div>
                <div className="text-xs text-[var(--muted)]">{ch.desc}</div>
              </div>
              <button disabled className="px-3 py-1.5 rounded-lg text-xs bg-[var(--surface-light)] text-[var(--muted)] border border-[var(--border)] opacity-40 cursor-not-allowed flex-shrink-0">Connect</button>
            </div>
          ))}
        </div>
      </div>

      {/* Social Accounts — accounts the bot will track/manage later */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide mb-3">Social Accounts</h3>
        <p className="text-xs text-[var(--muted)] mb-3">Direct account connections are not part of the MVP yet. For now, add handles and URLs in Brand so Tevy knows what to track.</p>
        <div className="glass rounded-xl divide-y divide-[var(--border)]">
          {([
            {
              icon: "💼",
              name: "LinkedIn",
              desc: "Best first use: track your company page and competitors, then add posting later.",
            },
            {
              icon: "𝕏",
              name: "X / Twitter",
              desc: "Best first use: monitor timelines, competitor posts, and draft content.",
            },
            {
              icon: "📸",
              name: "Instagram",
              desc: "Track handles and media references first. Posting/auth comes later.",
            },
            {
              icon: "🎵",
              name: "TikTok",
              desc: "Keep as tracked account only for MVP.",
            },
            {
              icon: "📘",
              name: "Facebook",
              desc: "Keep as tracked page/account only for MVP.",
            },
          ]).map((account) => (
            <div key={account.name} className="flex items-center gap-4 p-4">
              <span className="text-xl w-8 text-center">{account.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm flex items-center gap-2">
                  {account.name}
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-light)] text-[var(--muted)]">MVP: tracked only</span>
                </div>
                <div className="text-xs text-[var(--muted)]">{account.desc}</div>
              </div>
              <span className="px-3 py-1.5 rounded-lg text-xs bg-[var(--surface-light)] text-[var(--muted)] border border-[var(--border)] flex-shrink-0">Coming later</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tools & Integrations */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide mb-3">Tools & Integrations</h3>
        <p className="text-xs text-[var(--muted)] mb-3">This section is descriptive for MVP. Real per-account tool setup will come later.</p>
        <div className="glass rounded-xl divide-y divide-[var(--border)]">
          {([
            {
              icon: "🔎",
              name: "Deep Search (Tavily)",
              desc: "Advanced web research for content and competitor analysis.",
              status: "Included by platform",
            },
            {
              icon: "🔍",
              name: "Web Search",
              desc: "General web search and monitoring capabilities.",
              status: "Platform-managed",
            },
            {
              icon: "🎨",
              name: "Image Generation (Higgsfield)",
              desc: "Potential future image/video generation integration.",
              status: "Under evaluation",
            },
            {
              icon: "📧",
              name: "Email Outreach",
              desc: "Not active in MVP. Would require explicit approval and mail setup.",
              status: "Coming later",
            },
          ]).map((tool) => (
            <div key={tool.name} className="flex items-center gap-4 p-4">
              <span className="text-xl w-8 text-center">{tool.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{tool.name}</div>
                <div className="text-xs text-[var(--muted)]">{tool.desc}</div>
                <div className="text-xs mt-0.5 text-[var(--muted)]">Status: {tool.status}</div>
              </div>
              <span className="px-3 py-1.5 rounded-lg text-xs bg-[var(--surface-light)] text-[var(--muted)] border border-[var(--border)] flex-shrink-0">Info only</span>
            </div>
          ))}
        </div>
      </div>

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
