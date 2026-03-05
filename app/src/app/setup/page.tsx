"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createInstance } from "@/lib/api";
import { sendMagicLink } from "@/lib/auth";

type FormData = {
  email: string;
  telegramConnected: boolean;
  telegramUsername: string;
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
  files: File[];
};

const SECTIONS = [
  { id: 1, icon: "📧", label: "Sign In" },
  { id: 2, icon: "✈️", label: "Connect Telegram" },
  { id: 3, icon: "🌐", label: "Your Brand" },
  { id: 4, icon: "🚀", label: "Deploy" },
];

export default function SetupPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState(1);
  const [loading, setLoading] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [deployLog, setDeployLog] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormData>({
    email: "",
    telegramConnected: false,
    telegramUsername: "",
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
    files: [],
  });

  const update = (field: keyof FormData, value: string | boolean | File[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const sectionState = (id: number) => {
    if (id < activeSection) return "completed";
    if (id === activeSection) return "active";
    return "pending";
  };

  const handleSendEmail = async () => {
    if (!form.email) return;
    setEmailSent(true);

    try {
      // Store setup state so callback redirects back to setup
      sessionStorage.setItem("tevy2_pending_setup", "true");
      await sendMagicLink(form.email);
      // User will click email link → /auth/callback → redirect back to /setup
    } catch (err) {
      console.error("Failed to send magic link:", err);
      setEmailSent(false);
    }

    // Mock auth for local dev without Supabase configured
    if (process.env.NEXT_PUBLIC_MOCK_AUTH === "true") {
      setTimeout(() => {
        setEmailVerified(true);
        setActiveSection(2);
      }, 2000);
    }
  };

  const handleTelegramAuth = () => {
    // TODO: Telegram Login Widget / Bot auth
    update("telegramConnected", true);
    update("telegramUsername", "@user");
    setActiveSection(3);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      update("files", [...form.files, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    const updated = [...form.files];
    updated.splice(index, 1);
    update("files", updated);
  };

  const handleDeploy = async () => {
    setLoading(true);
    setLaunched(true);

    const steps = [
      "Initializing agent workspace...",
      `Scanning ${form.websiteUrl || "website"}...`,
      "Analyzing brand voice & audience...",
      "Loading skills: content-drafting, competitor-watch, calendar, brand-analysis...",
      "Configuring Telegram channel...",
      "Deploying agent instance...",
      "Running first brand analysis...",
    ];

    // Show deploy steps with animation
    for (let i = 0; i < 3; i++) {
      await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 400));
      setDeployLog((prev) => [...prev, steps[i]]);
    }

    // Actually call backend to provision
    try {
      const result = await createInstance({
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
        chatChannel: form.telegramConnected ? "telegram" : "webchat",
      });

      // Continue animation after successful provision
      for (let i = 3; i < steps.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        setDeployLog((prev) => [...prev, steps[i]]);
      }

      // Store instance info
      sessionStorage.setItem("tevy2_instance", JSON.stringify(result.instance));

      setDeployLog((prev) => [...prev, `✓ Agent deployed successfully! (${result.instance.region})`]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Deploy failed";
      setDeployLog((prev) => [...prev, `✗ Error: ${message}`]);
      console.error("Deploy failed:", err);
    }

    setLoading(false);
  };

  const canDeploy = form.email && form.businessName;

  // Deploy complete → redirect to dashboard
  if (launched && !loading && deployLog.length === 8) {
    return (
      <div className="min-h-screen flex flex-col">
        <Nav />
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="max-w-lg w-full">
            <div className="terminal-block glow-green mb-8">
              <div className="terminal-header">
                <div className="terminal-dot" style={{ background: "#ff5f57" }}></div>
                <div className="terminal-dot" style={{ background: "#febc2e" }}></div>
                <div className="terminal-dot" style={{ background: "#28c840" }}></div>
                <span className="text-xs text-[var(--muted)] ml-2 font-mono">tevy2 deploy</span>
              </div>
              <div className="terminal-body">
                {deployLog.map((line, i) => (
                  <div key={i} className={`${i === deployLog.length - 1 ? "text-[var(--terminal-green)] font-bold mt-2" : "text-[var(--muted)]"}`}>
                    {line}
                  </div>
                ))}
              </div>
            </div>

            <div className="glass rounded-2xl p-8 text-center glow">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold mb-3">Tevy is live!</h2>
              <p className="text-[var(--muted)] mb-6">
                Your marketing agent is deployed and ready. Head to your dashboard to manage everything.
              </p>
              <button
                onClick={() => router.push("/dashboard")}
                className="btn-primary w-full mb-3"
              >
                Open Dashboard →
              </button>
              <a
                href="https://t.me/tevy2_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-telegram w-full"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                Or chat with Tevy on Telegram
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Deploying animation
  if (launched) {
    return (
      <div className="min-h-screen flex flex-col">
        <Nav />
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="max-w-lg w-full">
            <div className="terminal-block glow">
              <div className="terminal-header">
                <div className="terminal-dot" style={{ background: "#ff5f57" }}></div>
                <div className="terminal-dot" style={{ background: "#febc2e" }}></div>
                <div className="terminal-dot" style={{ background: "#28c840" }}></div>
                <span className="text-xs text-[var(--muted)] ml-2 font-mono">tevy2 deploy --brand &quot;{form.businessName || "your-brand"}&quot;</span>
              </div>
              <div className="terminal-body">
                {deployLog.map((line, i) => (
                  <div key={i} className="text-[var(--muted)]">
                    <span className="text-[var(--terminal-green)]">→</span> {line}
                  </div>
                ))}
                <div className="cursor-blink text-[var(--muted)] mt-1"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      {/* Progress bar */}
      <div className="max-w-2xl mx-auto w-full px-8 mb-6">
        <div className="flex items-center justify-between">
          {SECTIONS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`section-badge ${
                  sectionState(s.id) === "completed" ? "section-badge-done" :
                  sectionState(s.id) === "active" ? "section-badge-active" :
                  "section-badge-pending"
                }`}>
                  {sectionState(s.id) === "completed" ? "✓" : s.icon}
                </div>
                <span className="text-xs text-[var(--muted)] mt-2 hidden md:block">{s.label}</span>
              </div>
              {i < SECTIONS.length - 1 && (
                <div className={`h-[2px] w-12 md:w-20 mx-2 transition-colors ${
                  activeSection > s.id ? "bg-[var(--green)]" : "bg-[var(--border)]"
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* All sections on one page */}
      <div className="flex-1 max-w-lg mx-auto w-full px-8 pb-20 space-y-8">

        {/* SECTION 1: Email Sign In */}
        <div className={`wizard-section ${sectionState(1)}`}>
          <div className="glass rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-2xl">📧</span>
              <div>
                <h2 className="text-xl font-bold">Sign in with your email</h2>
                <p className="text-sm text-[var(--muted)]">We&apos;ll send you a verification code</p>
              </div>
            </div>

            <div className="space-y-4">
              <input
                className="input-field"
                type="email"
                placeholder="you@business.com"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                disabled={emailVerified}
              />

              {!emailSent ? (
                <button
                  onClick={handleSendEmail}
                  className="btn-primary w-full"
                  disabled={!form.email || !form.email.includes("@")}
                >
                  Send verification code →
                </button>
              ) : !emailVerified ? (
                <div className="glass rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse"></div>
                    Checking your inbox...
                  </div>
                </div>
              ) : (
                <div className="glass rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-sm text-[var(--green)]">
                    <span>✓</span> Email verified
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: Telegram Auth */}
        <div className={`wizard-section ${sectionState(2)}`}>
          <div className="glass rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-2xl">✈️</span>
              <div>
                <h2 className="text-xl font-bold">Connect Telegram</h2>
                <p className="text-sm text-[var(--muted)]">This is where Tevy will chat with you</p>
              </div>
            </div>

            {!form.telegramConnected ? (
              <div className="space-y-4">
                <div className="glass rounded-xl p-5 text-center">
                  <div className="text-3xl mb-3">🤖</div>
                  <p className="text-sm text-[var(--muted)] mb-4">
                    Click below to authorize with our Telegram bot.
                    Tevy will be deployed as your personal agent.
                  </p>
                  <button onClick={handleTelegramAuth} className="btn-telegram w-full">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                    </svg>
                    Connect Telegram Account
                  </button>
                </div>
                <p className="text-xs text-[var(--muted)] text-center">
                  More channels (WhatsApp, Discord, Webchat) coming soon
                </p>
              </div>
            ) : (
              <div className="glass rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#2AABEE">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                    </svg>
                    <div>
                      <div className="font-semibold text-sm">Telegram connected</div>
                      <div className="text-xs text-[var(--muted)] font-mono">{form.telegramUsername}</div>
                    </div>
                  </div>
                  <span className="text-[var(--green)]">✓</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: Brand Info */}
        <div className={`wizard-section ${sectionState(3)}`}>
          <div className="glass rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-2xl">🌐</span>
              <div>
                <h2 className="text-xl font-bold">Tell Tevy about your brand</h2>
                <p className="text-sm text-[var(--muted)]">The more you share, the smarter your agent gets</p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[var(--muted)] mb-1 block">Your name</label>
                  <input
                    className="input-field"
                    placeholder="Jane Smith"
                    value={form.ownerName}
                    onChange={(e) => update("ownerName", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-[var(--muted)] mb-1 block">Business name *</label>
                  <input
                    className="input-field"
                    placeholder="Sunrise Coffee Co"
                    value={form.businessName}
                    onChange={(e) => update("businessName", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-[var(--muted)] mb-1 block">Website URL</label>
                <input
                  className="input-field"
                  placeholder="https://sunrisecoffee.com"
                  value={form.websiteUrl}
                  onChange={(e) => update("websiteUrl", e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm text-[var(--muted)] mb-2 block">Social accounts <span className="text-xs">(optional)</span></label>
                <div className="space-y-2">
                  {[
                    { key: "instagram" as keyof FormData, icon: "📸", placeholder: "@handle or URL" },
                    { key: "tiktok" as keyof FormData, icon: "🎵", placeholder: "@handle or URL" },
                    { key: "linkedin" as keyof FormData, icon: "💼", placeholder: "Company page URL" },
                    { key: "twitter" as keyof FormData, icon: "𝕏", placeholder: "@handle" },
                    { key: "facebook" as keyof FormData, icon: "📘", placeholder: "Page URL" },
                  ].map((s) => (
                    <div key={s.key} className="flex items-center gap-2">
                      <span className="w-6 text-center text-sm">{s.icon}</span>
                      <input
                        className="input-field !py-2.5 text-sm"
                        placeholder={s.placeholder}
                        value={form[s.key] as string}
                        onChange={(e) => update(s.key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-[var(--muted)] mb-1 block">
                  Competitors <span className="text-xs">(names or URLs, comma-separated)</span>
                </label>
                <input
                  className="input-field"
                  placeholder="Blue Bottle, Stumptown, intelligentsia.com"
                  value={form.competitors}
                  onChange={(e) => update("competitors", e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm text-[var(--muted)] mb-1 block">
                  Anything else Tevy should know? <span className="text-xs">(optional)</span>
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="Our brand voice is warm and casual. We focus on sustainability..."
                  value={form.brandNotes}
                  onChange={(e) => update("brandNotes", e.target.value)}
                  style={{ resize: "vertical" }}
                />
              </div>

              <div>
                <label className="text-sm text-[var(--muted)] mb-2 block">
                  Brand files <span className="text-xs">(logos, guidelines, past content — optional)</span>
                </label>
                <div
                  className="upload-zone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="text-3xl mb-2">📁</div>
                  <p className="text-sm text-[var(--muted)]">Click to upload or drag files here</p>
                  <p className="text-xs text-[var(--muted)] mt-1">PDF, images, docs — up to 10MB each</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  accept=".pdf,.png,.jpg,.jpeg,.gif,.doc,.docx,.txt,.md"
                />
                {form.files.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {form.files.map((file, i) => (
                      <div key={i} className="glass rounded-lg px-3 py-2 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-[var(--muted)]">📄</span>
                          <span className="truncate">{file.name}</span>
                          <span className="text-xs text-[var(--muted)]">({(file.size / 1024).toFixed(0)}KB)</span>
                        </div>
                        <button onClick={() => removeFile(i)} className="text-[var(--muted)] hover:text-red-400 text-xs ml-2">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => setActiveSection(4)}
                className="btn-primary w-full"
                disabled={!form.businessName}
              >
                Continue to deploy →
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 4: Deploy */}
        <div className={`wizard-section ${sectionState(4)}`}>
          <div className="glass rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-2xl">🚀</span>
              <div>
                <h2 className="text-xl font-bold">Deploy your agent</h2>
                <p className="text-sm text-[var(--muted)]">Review and launch</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="terminal-block">
                <div className="terminal-header">
                  <div className="terminal-dot" style={{ background: "#ff5f57" }}></div>
                  <div className="terminal-dot" style={{ background: "#febc2e" }}></div>
                  <div className="terminal-dot" style={{ background: "#28c840" }}></div>
                  <span className="text-xs text-[var(--muted)] ml-2 font-mono">agent.config</span>
                </div>
                <div className="terminal-body text-sm">
                  <div><span className="text-[var(--terminal-green)]">name:</span> {form.businessName || "—"}</div>
                  <div><span className="text-[var(--terminal-green)]">owner:</span> {form.ownerName || "—"}</div>
                  <div><span className="text-[var(--terminal-green)]">website:</span> {form.websiteUrl || "—"}</div>
                  <div><span className="text-[var(--terminal-green)]">channel:</span> Telegram ({form.telegramUsername || "connected"})</div>
                  <div><span className="text-[var(--terminal-green)]">socials:</span> {
                    [form.instagram && "IG", form.tiktok && "TT", form.linkedin && "LI", form.twitter && "X", form.facebook && "FB"]
                      .filter(Boolean).join(", ") || "none yet"
                  }</div>
                  <div><span className="text-[var(--terminal-green)]">files:</span> {form.files.length > 0 ? `${form.files.length} uploaded` : "none"}</div>
                  {form.competitors && (
                    <div><span className="text-[var(--terminal-green)]">competitors:</span> {form.competitors}</div>
                  )}
                  <div className="mt-2 text-[var(--muted)]">
                    <span className="text-[var(--terminal-green)]">skills:</span> content-drafting, competitor-watch, calendar, brand-analysis
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleDeploy}
              className="btn-primary w-full text-lg"
              disabled={!canDeploy || loading}
            >
              {loading ? "Deploying..." : "🚀 Deploy Tevy Agent"}
            </button>

            <p className="text-xs text-[var(--muted)] text-center mt-3">
              Your agent runs on our infrastructure. No setup needed.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

function Nav() {
  return (
    <nav className="flex items-center justify-between px-8 py-5 max-w-4xl mx-auto w-full">
      <Link href="/" className="flex items-center gap-3">
        <img src="/logo-wizard.jpg" alt="tevy2" className="w-7 h-7 rounded-lg" />
        <span className="text-xl font-bold">
          <span className="gradient-text">tevy2</span>
          <span className="text-[var(--muted)]">.ai</span>
        </span>
        <span className="powered-badge">
          <span style={{ fontSize: "12px" }}>🐾</span> OpenClaw
        </span>
      </Link>
    </nav>
  );
}
