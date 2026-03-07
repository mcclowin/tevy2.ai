"use client";

import { useState } from "react";
import Link from "next/link";
import { createInstance } from "@/lib/api";

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
  competitors: string;
  brandNotes: string;
};

const NAV_ITEMS = [
  { id: "home", icon: "🏠", label: "Home" },
  { id: "brand", icon: "🎯", label: "Brand" },
  { id: "calendar", icon: "📅", label: "Calendar" },
  { id: "connect", icon: "🔗", label: "Connect" },
  { id: "analytics", icon: "📊", label: "Analytics" },
  { id: "research", icon: "🔍", label: "Research" },
];

export default function DashboardPage() {
  // TODO: Check if user has an active instance via API
  const [hasInstance, setHasInstance] = useState(false);
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div className="min-h-screen flex">
      {/* Sidebar — always visible */}
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
            <div className={`w-2 h-2 rounded-full ${hasInstance ? "bg-green-500" : "bg-yellow-500 animate-pulse"}`}></div>
            <span className="text-sm font-semibold">{hasInstance ? "Agent Online" : "Setup Required"}</span>
          </div>
        </div>

        <nav className="flex-1 py-3 px-3">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => hasInstance && setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-0.5 transition-colors ${
                !hasInstance ? "opacity-40 cursor-not-allowed" :
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
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {!hasInstance ? (
          <OnboardingPanel onComplete={() => setHasInstance(true)} />
        ) : (
          <>
            {activeTab === "home" && <HomeTab />}
            {activeTab === "brand" && <BrandTab />}
            {activeTab === "calendar" && <CalendarTab />}
            {activeTab === "connect" && <ConnectTab />}
            {activeTab === "analytics" && <AnalyticsTab />}
            {activeTab === "research" && <ResearchTab />}
          </>
        )}
      </main>
    </div>
  );
}

/* ─── ONBOARDING PANEL (inside dashboard layout) ─── */
function OnboardingPanel({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [deployLog, setDeployLog] = useState<string[]>([]);

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
    competitors: "",
    brandNotes: "",
  });

  const update = (field: keyof OnboardingData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDeploy = async () => {
    setLoading(true);
    setStep(3);

    const steps = [
      "Initializing agent workspace...",
      `Scanning ${form.websiteUrl || "website"}...`,
      "Analyzing brand voice & audience...",
      "Loading skills: content-drafting, competitor-watch, calendar...",
      "Configuring channels...",
      "Deploying agent instance...",
    ];

    for (const line of steps) {
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));
      setDeployLog((prev) => [...prev, line]);
    }

    // Mock mode: skip real API call, just show success
    if (process.env.NEXT_PUBLIC_MOCK_DEPLOY === "true") {
      await new Promise((r) => setTimeout(r, 1000));
      setDeployLog((prev) => [...prev, "✓ Agent deployed successfully!"]);
      setTimeout(onComplete, 2000);
    } else {
      try {
        await createInstance({
          ownerName: form.ownerName,
          businessName: form.businessName,
          websiteUrl: form.websiteUrl,
          instagram: form.instagram,
          tiktok: form.tiktok,
          linkedin: form.linkedin,
          twitter: form.twitter,
          facebook: form.facebook,
          competitors: form.competitors,
          brandNotes: form.brandNotes,
          postingGoal: "3-4 posts per week",
          chatChannel: form.addTelegram ? "telegram" : "webchat",
          telegramBotToken: form.addTelegram ? form.telegramBotToken : undefined,
        });
        setDeployLog((prev) => [...prev, "✓ Agent deployed successfully!"]);
        setTimeout(onComplete, 2000);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Deploy failed";
        setDeployLog((prev) => [...prev, `✗ Error: ${msg}`]);
      }
    }

    setLoading(false);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center gap-3 mb-8 text-sm">
        <span className={step >= 1 ? "text-white font-semibold" : "text-[var(--muted)]"}>① Channel</span>
        <span className="text-[var(--border)]">—</span>
        <span className={step >= 2 ? "text-white font-semibold" : "text-[var(--muted)]"}>② Brand</span>
        <span className="text-[var(--border)]">—</span>
        <span className={step >= 3 ? "text-white font-semibold" : "text-[var(--muted)]"}>③ Deploy</span>
      </div>

      {/* STEP 1: Channel */}
      {step === 1 && (
        <div>
          <h1 className="text-2xl font-bold mb-2">How do you want to chat with Tevy?</h1>
          <p className="text-sm text-[var(--muted)] mb-6">
            Choose your preferred channel. You can add more later.
          </p>

          {/* Telegram — primary */}
          <button
            onClick={() => update("addTelegram", !form.addTelegram)}
            className={`w-full glass rounded-xl p-4 mb-3 text-left transition-all ${
              form.addTelegram ? "border border-[var(--accent)] glow" : "border border-transparent hover:border-[var(--border)]"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#2AABEE] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm flex items-center gap-2">
                  Telegram
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--surface-light)] text-[var(--accent-light)]">Recommended</span>
                </div>
                <p className="text-xs text-[var(--muted)]">Chat with Tevy from your phone, anytime</p>
              </div>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                form.addTelegram ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--border)]"
              }`}>
                {form.addTelegram && <span className="text-xs">✓</span>}
              </div>
            </div>
          </button>

          {/* Telegram bot token input */}
          {form.addTelegram && (
            <div className="glass rounded-xl p-4 mb-3 ml-14">
              <label className="text-xs text-[var(--muted)] mb-1.5 block">
                Bot Token <span className="text-[var(--muted)]">(from @BotFather)</span>
              </label>
              <input
                className="input-field text-sm font-mono"
                placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                value={form.telegramBotToken}
                onChange={(e) => update("telegramBotToken", e.target.value)}
                autoFocus
              />
              <p className="text-xs text-[var(--muted)] mt-1.5">
                <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-light)] hover:underline">Create a bot</a> — takes 30 seconds
              </p>
            </div>
          )}

          {/* Coming soon channels */}
          <div className="space-y-2 mt-4 mb-6">
            {[
              { icon: "📱", name: "WhatsApp", bg: "#25D366" },
              { icon: "🎮", name: "Discord", bg: "#5865F2" },
              { icon: "💬", name: "Slack", bg: "#4A154B" },
            ].map((ch) => (
              <div key={ch.name} className="glass rounded-xl p-3 opacity-40">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ background: ch.bg }}>
                    {ch.icon}
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium">{ch.name}</span>
                    <span className="text-xs text-[var(--muted)] ml-2">Coming soon</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setStep(2)}
            className="btn-primary w-full"
            disabled={form.addTelegram && !form.telegramBotToken}
          >
            Continue →
          </button>
        </div>
      )}

      {/* STEP 2: Brand Info */}
      {step === 2 && (
        <div>
          <h1 className="text-2xl font-bold mb-2">Tell Tevy about your brand</h1>
          <p className="text-sm text-[var(--muted)] mb-6">
            The more you share, the better. You can always update this later — or just tell Tevy in chat.
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[var(--muted)] mb-1 block">Your name</label>
                <input
                  className="input-field"
                  placeholder="Jane Smith"
                  value={form.ownerName}
                  onChange={(e) => update("ownerName", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-[var(--muted)] mb-1 block">Business name *</label>
                <input
                  className="input-field"
                  placeholder="Sunrise Coffee Co"
                  value={form.businessName}
                  onChange={(e) => update("businessName", e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-[var(--muted)] mb-1 block">Website URL</label>
              <input
                className="input-field"
                placeholder="https://sunrisecoffee.com"
                value={form.websiteUrl}
                onChange={(e) => update("websiteUrl", e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-[var(--muted)] mb-1.5 block">Social accounts <span className="text-xs">(optional)</span></label>
              <div className="space-y-2">
                {[
                  { key: "instagram" as const, icon: "📸", placeholder: "@handle or URL" },
                  { key: "tiktok" as const, icon: "🎵", placeholder: "@handle or URL" },
                  { key: "linkedin" as const, icon: "💼", placeholder: "Company page URL" },
                  { key: "twitter" as const, icon: "𝕏", placeholder: "@handle" },
                  { key: "facebook" as const, icon: "📘", placeholder: "Page URL" },
                ].map((s) => (
                  <div key={s.key} className="flex items-center gap-2">
                    <span className="w-6 text-center text-sm">{s.icon}</span>
                    <input
                      className="input-field !py-2 text-sm"
                      placeholder={s.placeholder}
                      value={form[s.key]}
                      onChange={(e) => update(s.key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-[var(--muted)] mb-1 block">Competitors <span className="text-xs">(optional)</span></label>
              <input
                className="input-field"
                placeholder="Blue Bottle, Stumptown"
                value={form.competitors}
                onChange={(e) => update("competitors", e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-[var(--muted)] mb-1 block">Anything else? <span className="text-xs">(optional)</span></label>
              <textarea
                className="input-field"
                rows={2}
                placeholder="Brand voice, goals, audience..."
                value={form.brandNotes}
                onChange={(e) => update("brandNotes", e.target.value)}
                style={{ resize: "vertical" }}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(1)} className="btn-secondary flex-1">← Back</button>
            <button
              onClick={handleDeploy}
              className="btn-primary flex-1"
              disabled={!form.businessName}
            >
              🚀 Deploy Agent
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Deploying */}
      {step === 3 && (
        <div>
          <div className="terminal-block glow mb-6">
            <div className="terminal-header">
              <div className="terminal-dot" style={{ background: "#ff5f57" }}></div>
              <div className="terminal-dot" style={{ background: "#febc2e" }}></div>
              <div className="terminal-dot" style={{ background: "#28c840" }}></div>
              <span className="text-xs text-[var(--muted)] ml-2 font-mono">tevy2 deploy --brand &quot;{form.businessName}&quot;</span>
            </div>
            <div className="terminal-body">
              {deployLog.map((line, i) => (
                <div key={i} className={`${
                  line.startsWith("✓") ? "text-[var(--terminal-green)] font-bold mt-2" :
                  line.startsWith("✗") ? "text-red-400 font-bold mt-2" :
                  "text-[var(--muted)]"
                }`}>
                  {!line.startsWith("✓") && !line.startsWith("✗") && <span className="text-[var(--terminal-green)]">→ </span>}
                  {line}
                </div>
              ))}
              {loading && <div className="cursor-blink text-[var(--muted)] mt-1"></div>}
            </div>
          </div>

          {!loading && deployLog.some(l => l.startsWith("✓")) && (
            <div className="glass rounded-xl p-6 text-center">
              <div className="text-4xl mb-3">🎉</div>
              <h2 className="text-xl font-bold mb-2">Tevy is live!</h2>
              <p className="text-sm text-[var(--muted)]">Loading your dashboard...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── DASHBOARD TABS ─── */
function HomeTab() {
  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">Welcome!</h1>
      <p className="text-[var(--muted)] mb-8">Your marketing agent is live.</p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Agent Status", value: "🟢 Online", sub: "Ready to chat" },
          { label: "Posts Drafted", value: "12", sub: "3 scheduled this week" },
          { label: "Channels", value: "Active", sub: "Webchat + Telegram" },
        ].map((stat, i) => (
          <div key={i} className="glass rounded-xl p-4">
            <div className="text-xs text-[var(--muted)] mb-1">{stat.label}</div>
            <div className="text-xl font-bold">{stat.value}</div>
            <div className="text-xs text-[var(--muted)] mt-1">{stat.sub}</div>
          </div>
        ))}
      </div>

      <div className="glass rounded-xl p-6">
        <h3 className="font-semibold mb-3">Get started</h3>
        <p className="text-sm text-[var(--muted)] mb-4">
          Send a message to Tevy — via the Chat tab or on Telegram. Try:
        </p>
        <div className="terminal-block">
          <div className="terminal-body text-sm">
            <div>&quot;Analyze my website and tell me what you think&quot;</div>
            <div>&quot;Draft 3 Instagram posts about our new product&quot;</div>
            <div>&quot;What are my competitors posting this week?&quot;</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── BRAND TAB ─── */
function BrandTab() {
  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">Brand Profile</h1>
      <p className="text-[var(--muted)] mb-6">Generated by Tevy from your website and socials. Edit anytime.</p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="glass rounded-xl p-5">
          <div className="text-xs text-[var(--muted)] mb-2 uppercase tracking-wide">Brand Voice</div>
          <div className="text-sm space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎯</span>
              <div>
                <div className="font-semibold">Tone</div>
                <div className="text-[var(--muted)]">Friendly, approachable, knowledgeable</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">💬</span>
              <div>
                <div className="font-semibold">Style</div>
                <div className="text-[var(--muted)]">Conversational, uses emojis sparingly</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🚫</span>
              <div>
                <div className="font-semibold">Avoid</div>
                <div className="text-[var(--muted)]">Corporate jargon, hard-sell tactics</div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-5">
          <div className="text-xs text-[var(--muted)] mb-2 uppercase tracking-wide">Target Audience</div>
          <div className="text-sm space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">👤</span>
              <div>
                <div className="font-semibold">Primary</div>
                <div className="text-[var(--muted)]">25-40, urban professionals, health-conscious</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🌍</span>
              <div>
                <div className="font-semibold">Location</div>
                <div className="text-[var(--muted)]">UK, US, Europe</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">💡</span>
              <div>
                <div className="font-semibold">Pain Points</div>
                <div className="text-[var(--muted)]">No time, overwhelmed by options, want quality</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass rounded-xl p-5 mb-4">
        <div className="text-xs text-[var(--muted)] mb-2 uppercase tracking-wide">Value Proposition</div>
        <p className="text-sm">&quot;Premium quality made accessible — we simplify the best so you can focus on what matters.&quot;</p>
      </div>

      <div className="glass rounded-xl p-5">
        <div className="text-xs text-[var(--muted)] mb-2 uppercase tracking-wide">Content Pillars</div>
        <div className="flex flex-wrap gap-2">
          {["Product Highlights", "Behind the Scenes", "Customer Stories", "Industry Tips", "Sustainability"].map((pillar) => (
            <span key={pillar} className="px-3 py-1.5 rounded-full bg-[var(--surface-light)] text-sm">{pillar}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── CALENDAR TAB ─── */
function CalendarTab() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const posts = [
    { day: 0, time: "9:00 AM", platform: "📸", title: "New product spotlight", status: "scheduled" },
    { day: 1, time: "12:00 PM", platform: "💼", title: "Industry insights thread", status: "draft" },
    { day: 2, time: "10:00 AM", platform: "🎵", title: "Behind the scenes reel", status: "scheduled" },
    { day: 3, time: "2:00 PM", platform: "𝕏", title: "Customer testimonial", status: "draft" },
    { day: 4, time: "11:00 AM", platform: "📸", title: "Weekend vibes carousel", status: "scheduled" },
  ];

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Content Calendar</h1>
          <p className="text-[var(--muted)]">This week — March 10–16, 2026</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary text-sm px-3 py-1.5">← Prev</button>
          <button className="btn-secondary text-sm px-3 py-1.5">Next →</button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-4">
        {days.map((day, i) => (
          <div key={day} className="text-center">
            <div className="text-xs text-[var(--muted)] mb-2">{day}</div>
            <div className={`glass rounded-xl p-3 min-h-[120px] ${i < 5 ? "" : "opacity-50"}`}>
              <div className="text-sm font-semibold mb-1">{10 + i}</div>
              {posts.filter(p => p.day === i).map((post, j) => (
                <div key={j} className={`rounded-lg p-2 mb-1 text-xs ${
                  post.status === "scheduled" 
                    ? "bg-[rgba(34,197,94,0.15)] border border-[rgba(34,197,94,0.3)]" 
                    : "bg-[rgba(251,191,36,0.15)] border border-[rgba(251,191,36,0.3)]"
                }`}>
                  <div className="flex items-center gap-1">
                    <span>{post.platform}</span>
                    <span className="truncate">{post.title}</span>
                  </div>
                  <div className="text-[var(--muted)] mt-0.5">{post.time}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500"></span> 3 Scheduled
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span> 2 Drafts
            </span>
          </div>
          <span className="text-xs text-[var(--muted)]">Goal: 3-4 posts/week ✅</span>
        </div>
      </div>
    </div>
  );
}

/* ─── CONNECT TAB ─── */
function ConnectTab() {
  const channels = [
    { icon: "✈️", name: "Telegram", status: "connected", detail: "@YourBizBot", color: "#2AABEE" },
    { icon: "📸", name: "Instagram", status: "connected", detail: "@yourbrand", color: "#E4405F" },
    { icon: "🎵", name: "TikTok", status: "pending", detail: "Connect account", color: "#000000" },
    { icon: "💼", name: "LinkedIn", status: "connected", detail: "Your Brand Page", color: "#0A66C2" },
    { icon: "𝕏", name: "X / Twitter", status: "disconnected", detail: "Connect account", color: "#1DA1F2" },
    { icon: "📘", name: "Facebook", status: "disconnected", detail: "Connect page", color: "#1877F2" },
  ];

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">Connected Accounts</h1>
      <p className="text-[var(--muted)] mb-6">Manage your chat channels and social accounts.</p>

      <div className="mb-8">
        <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide mb-3">Chat Channel</h3>
        <div className="glass rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#2AABEE] flex items-center justify-center text-white text-xl">✈️</div>
          <div className="flex-1">
            <div className="font-semibold text-sm">Telegram</div>
            <div className="text-xs text-[var(--muted)]">@YourBizBot — Active, receiving messages</div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs bg-[rgba(34,197,94,0.15)] text-green-400 border border-[rgba(34,197,94,0.3)]">
            🟢 Connected
          </span>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide mb-3">Social Accounts</h3>
        <div className="space-y-2">
          {channels.slice(1).map((ch) => (
            <div key={ch.name} className="glass rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xl" style={{ background: ch.color }}>
                {ch.icon}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm">{ch.name}</div>
                <div className="text-xs text-[var(--muted)]">{ch.detail}</div>
              </div>
              {ch.status === "connected" && (
                <span className="px-2.5 py-1 rounded-full text-xs bg-[rgba(34,197,94,0.15)] text-green-400 border border-[rgba(34,197,94,0.3)]">
                  ✅ Connected
                </span>
              )}
              {ch.status === "pending" && (
                <span className="px-2.5 py-1 rounded-full text-xs bg-[rgba(251,191,36,0.15)] text-yellow-400 border border-[rgba(251,191,36,0.3)]">
                  ⏳ Pending
                </span>
              )}
              {ch.status === "disconnected" && (
                <button className="px-3 py-1.5 rounded-lg text-xs bg-[var(--surface-light)] text-[var(--muted)] hover:text-white transition-colors">
                  Connect →
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── ANALYTICS TAB ─── */
function AnalyticsTab() {
  const stats = [
    { label: "Total Impressions", value: "14.2K", change: "+23%", up: true },
    { label: "Engagement Rate", value: "4.8%", change: "+0.6%", up: true },
    { label: "Followers Gained", value: "+127", change: "+15%", up: true },
    { label: "Link Clicks", value: "342", change: "-5%", up: false },
  ];

  const topPosts = [
    { platform: "📸", title: "Behind the scenes: How we source our ingredients", impressions: "3.2K", engagement: "6.1%", date: "Mar 4" },
    { platform: "💼", title: "5 trends reshaping our industry in 2026", impressions: "2.8K", engagement: "5.3%", date: "Mar 2" },
    { platform: "🎵", title: "Quick tips reel: 30-second guide", impressions: "4.1K", engagement: "7.2%", date: "Feb 28" },
    { platform: "𝕏", title: "Thread: What we learned from 100 customer calls", impressions: "1.9K", engagement: "3.8%", date: "Feb 27" },
  ];

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Analytics</h1>
          <p className="text-[var(--muted)]">Last 7 days performance</p>
        </div>
        <select className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-[var(--muted)]">
          <option>Last 7 days</option>
          <option>Last 30 days</option>
          <option>Last 90 days</option>
        </select>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className="glass rounded-xl p-4">
            <div className="text-xs text-[var(--muted)] mb-1">{stat.label}</div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className={`text-xs mt-1 ${stat.up ? "text-green-400" : "text-red-400"}`}>
              {stat.change} vs last week
            </div>
          </div>
        ))}
      </div>

      {/* Fake chart area */}
      <div className="glass rounded-xl p-5 mb-6">
        <div className="text-sm font-semibold mb-3">Impressions over time</div>
        <div className="flex items-end gap-1 h-32">
          {[40, 55, 35, 70, 60, 85, 75, 90, 65, 95, 80, 100, 88, 72].map((h, i) => (
            <div key={i} className="flex-1 rounded-t" style={{
              height: `${h}%`,
              background: `linear-gradient(to top, var(--accent), var(--accent-light))`,
              opacity: 0.6 + (h / 300),
            }}></div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-[var(--muted)] mt-2">
          <span>Mar 1</span>
          <span>Mar 7</span>
        </div>
      </div>

      <div className="glass rounded-xl p-5">
        <div className="text-sm font-semibold mb-3">Top performing posts</div>
        <div className="space-y-3">
          {topPosts.map((post, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0">
              <span className="text-lg">{post.platform}</span>
              <div className="flex-1">
                <div className="text-sm">{post.title}</div>
                <div className="text-xs text-[var(--muted)]">{post.date}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">{post.impressions}</div>
                <div className="text-xs text-green-400">{post.engagement} eng.</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── RESEARCH TAB ─── */
function ResearchTab() {
  const competitors = [
    { name: "Competitor A", posts: 12, topTheme: "Sustainability", engagement: "3.2%", trend: "↑" },
    { name: "Competitor B", posts: 8, topTheme: "Product launches", engagement: "5.1%", trend: "→" },
    { name: "Competitor C", posts: 15, topTheme: "Community events", engagement: "2.8%", trend: "↓" },
  ];

  const trends = [
    { topic: "AI-powered personalization", mentions: 234, sentiment: "positive" },
    { topic: "Sustainable packaging", mentions: 189, sentiment: "positive" },
    { topic: "Price sensitivity shift", mentions: 156, sentiment: "neutral" },
    { topic: "Short-form video dominance", mentions: 312, sentiment: "positive" },
  ];

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Market Research</h1>
          <p className="text-[var(--muted)]">Weekly digest — updated by Tevy every Monday</p>
        </div>
        <span className="text-xs text-[var(--muted)]">Last updated: Mar 3, 2026</span>
      </div>

      <div className="glass rounded-xl p-5 mb-6">
        <div className="text-sm font-semibold mb-3">🏆 Competitor Activity (last 7 days)</div>
        <div className="space-y-3">
          {competitors.map((comp, i) => (
            <div key={i} className="flex items-center gap-4 py-2 border-b border-[var(--border)] last:border-0">
              <div className="w-8 h-8 rounded-full bg-[var(--surface-light)] flex items-center justify-center text-sm font-bold">
                {comp.name.split(" ")[1]}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{comp.name}</div>
                <div className="text-xs text-[var(--muted)]">Top theme: {comp.topTheme}</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold">{comp.posts}</div>
                <div className="text-xs text-[var(--muted)]">posts</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold">{comp.engagement}</div>
                <div className="text-xs text-[var(--muted)]">eng. rate</div>
              </div>
              <div className="text-lg">{comp.trend}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass rounded-xl p-5 mb-6">
        <div className="text-sm font-semibold mb-3">📈 Trending in Your Industry</div>
        <div className="space-y-2">
          {trends.map((trend, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <span className="text-sm font-mono text-[var(--muted)]">#{i + 1}</span>
              <div className="flex-1">
                <div className="text-sm">{trend.topic}</div>
              </div>
              <div className="text-xs text-[var(--muted)]">{trend.mentions} mentions</div>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                trend.sentiment === "positive" ? "bg-[rgba(34,197,94,0.15)] text-green-400" :
                "bg-[rgba(251,191,36,0.15)] text-yellow-400"
              }`}>
                {trend.sentiment}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="glass rounded-xl p-5">
        <div className="text-sm font-semibold mb-3">💡 Tevy&apos;s Recommendations</div>
        <div className="space-y-3 text-sm">
          <div className="flex gap-3">
            <span className="text-green-400 mt-0.5">→</span>
            <p>Competitor B&apos;s product launch posts are getting 2x engagement. Consider a similar format for your upcoming release.</p>
          </div>
          <div className="flex gap-3">
            <span className="text-green-400 mt-0.5">→</span>
            <p>Sustainability content is trending up 34% this month. Your brand values align — draft a &quot;behind the scenes&quot; sustainability post?</p>
          </div>
          <div className="flex gap-3">
            <span className="text-green-400 mt-0.5">→</span>
            <p>Short-form video is dominating engagement across all competitors. Consider adding 1-2 TikTok/Reels per week.</p>
          </div>
        </div>
      </div>
    </div>
  );
}


