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
  { id: "chat", icon: "💬", label: "Chat" },
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
            {activeTab === "chat" && <ChatTab />}
            {activeTab !== "home" && activeTab !== "chat" && (
              <div className="p-8 max-w-4xl">
                <h1 className="text-2xl font-bold mb-2 capitalize">{activeTab}</h1>
                <p className="text-[var(--muted)]">Coming soon — Tevy is setting things up.</p>
              </div>
            )}
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
            Webchat is always available in your dashboard. You can also add Telegram for mobile access.
          </p>

          {/* Webchat — always on */}
          <div className="glass rounded-xl p-4 mb-3 border border-[var(--green-dim)]">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-[var(--surface-light)] flex items-center justify-center text-xl">💬</div>
              <div className="flex-1">
                <div className="font-semibold text-sm flex items-center gap-2">
                  Webchat
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--green-dim)] text-[var(--green)]">Always on</span>
                </div>
                <p className="text-xs text-[var(--muted)]">Chat with Tevy right here in your dashboard</p>
              </div>
              <span className="text-[var(--green)]">✓</span>
            </div>
          </div>

          {/* Telegram — optional add */}
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
                  Also add Telegram
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
          { label: "Posts Drafted", value: "0", sub: "Chat with Tevy to start" },
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

function ChatTab() {
  return (
    <div className="p-8 max-w-3xl h-full flex flex-col">
      <h1 className="text-2xl font-bold mb-1">Chat with Tevy</h1>
      <p className="text-[var(--muted)] mb-6">Webchat — also available on Telegram</p>

      <div className="glass rounded-2xl flex-1 flex flex-col overflow-hidden min-h-[400px]">
        <div className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center">
            <img src="/logo-wizard.jpg" alt="Tevy" className="w-16 h-16 rounded-full mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Webchat loading...</h3>
            <p className="text-sm text-[var(--muted)]">Will embed your agent&apos;s OpenClaw webchat here.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
