import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="text-xl font-bold">
            <span className="gradient-text">tevy2</span>
            <span className="text-[var(--muted)]">.ai</span>
          </div>
          <span className="powered-badge">
            <span style={{ fontSize: "14px" }}>🐾</span> OpenClaw
          </span>
        </div>
        <div className="flex gap-4 items-center">
          <Link href="/login" className="text-[var(--muted)] hover:text-white transition text-sm">
            Log in
          </Link>
          <Link href="/setup" className="btn-primary text-sm !py-2 !px-5">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-8 pt-24 pb-16 text-center">
        <div className="inline-block px-4 py-1.5 rounded-full glass text-sm text-[var(--muted)] mb-6">
          AI-powered marketing for small businesses
        </div>
        <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
          Your first <span className="gradient-text">marketing hire</span>
          <br />doesn&apos;t need a salary
        </h1>
        <p className="text-lg text-[var(--muted)] max-w-2xl mx-auto mb-10">
          Tevy learns your brand, drafts social posts, tracks competitors, and manages your content calendar.
          Like a marketing person — but available 24/7 for a fraction of the cost.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/setup" className="btn-primary">
            Start free trial →
          </Link>
          <a href="#how-it-works" className="btn-secondary">
            See how it works
          </a>
        </div>
      </section>

      {/* Terminal Preview */}
      <section className="max-w-2xl mx-auto px-8 pb-12">
        <div className="terminal-block glow">
          <div className="terminal-header">
            <div className="terminal-dot" style={{ background: "#ff5f57" }}></div>
            <div className="terminal-dot" style={{ background: "#febc2e" }}></div>
            <div className="terminal-dot" style={{ background: "#28c840" }}></div>
            <span className="text-xs text-[var(--muted)] ml-2 font-mono">tevy2 — deploying agent</span>
          </div>
          <div className="terminal-body text-[var(--muted)]">
            <div className="terminal-prompt text-[var(--foreground)]">tevy2 deploy --brand &quot;sunrise-coffee&quot;</div>
            <div className="mt-2">
              <span className="text-[var(--terminal-green)]">✓</span> Scanning website... <span className="text-[var(--terminal-green)]">done</span>
            </div>
            <div>
              <span className="text-[var(--terminal-green)]">✓</span> Analyzing brand voice... <span className="text-[var(--terminal-green)]">done</span>
            </div>
            <div>
              <span className="text-[var(--terminal-green)]">✓</span> Connecting Telegram... <span className="text-[var(--terminal-green)]">done</span>
            </div>
            <div>
              <span className="text-[var(--terminal-green)]">✓</span> Loading skills: <span className="text-[var(--accent-light)]">content-drafting, competitor-watch, calendar</span>
            </div>
            <div className="mt-2 text-[var(--foreground)]">
              <span className="text-[var(--terminal-green)]">●</span> Agent live. Talk to Tevy on Telegram →
            </div>
          </div>
        </div>
      </section>

      {/* Chat Preview */}
      <section className="max-w-2xl mx-auto px-8 pb-20">
        <div className="glass rounded-2xl p-6 glow">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[var(--border)]">
            <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-sm font-bold">T</div>
            <div>
              <div className="font-semibold text-sm">Tevy</div>
              <div className="text-xs text-[var(--muted)]">Your marketing assistant</div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-xs text-[var(--muted)] font-mono">via Telegram</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-[var(--accent)] flex-shrink-0 flex items-center justify-center text-white text-xs font-bold mt-1">T</div>
              <div className="glass rounded-xl rounded-tl-sm px-4 py-3 text-sm max-w-[85%]">
                Hey! I&apos;ve analyzed your website and social accounts. Here&apos;s what I found:
                <br /><br />
                <strong>Brand vibe:</strong> Warm, artisan, community-focused<br />
                <strong>Audience:</strong> 25-40, urban professionals who care about quality<br />
                <strong>Best content:</strong> Behind-the-scenes + product stories<br /><br />
                Does this feel right? Want me to draft your first post?
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <div className="bg-[var(--accent)] rounded-xl rounded-tr-sm px-4 py-3 text-sm max-w-[85%] text-white">
                That&apos;s spot on! Yes, draft something for Instagram about our new summer collection
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-[var(--accent)] flex-shrink-0 flex items-center justify-center text-white text-xs font-bold mt-1">T</div>
              <div className="glass rounded-xl rounded-tl-sm px-4 py-3 text-sm max-w-[85%]">
                Here are 3 options for your summer collection post:<br /><br />
                <strong>Option A</strong> (storytelling):<br />
                &quot;Every piece in our summer collection started as a sketch on a rainy Tuesday...&quot;<br /><br />
                <strong>Option B</strong> (direct):<br />
                &quot;Summer&apos;s here. So is our new collection. 12 pieces, all handcrafted...&quot;<br /><br />
                <strong>Option C</strong> (engagement):<br />
                &quot;Which summer vibe are you? ☀️ Tell us and we&apos;ll match you with your perfect piece...&quot;<br /><br />
                Want me to schedule any of these?
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-4xl mx-auto px-8 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">How it works</h2>
        <p className="text-[var(--muted)] text-center mb-12">Three steps. Two minutes. One marketing agent.</p>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="glass rounded-2xl p-6 text-center">
            <div className="text-4xl mb-4">📧</div>
            <h3 className="font-semibold mb-2">Sign up & connect Telegram</h3>
            <p className="text-sm text-[var(--muted)]">
              Enter your email, connect your Telegram. That&apos;s where Tevy lives — right in your pocket.
            </p>
          </div>
          <div className="glass rounded-2xl p-6 text-center">
            <div className="text-4xl mb-4">🌐</div>
            <h3 className="font-semibold mb-2">Tell Tevy about your brand</h3>
            <p className="text-sm text-[var(--muted)]">
              Paste your website, social accounts, and any brand files. Tevy analyzes everything in seconds.
            </p>
          </div>
          <div className="glass rounded-2xl p-6 text-center">
            <div className="text-4xl mb-4">🚀</div>
            <h3 className="font-semibold mb-2">Deploy & start chatting</h3>
            <p className="text-sm text-[var(--muted)]">
              We deploy your personal marketing agent. Open Telegram and start talking — it&apos;s that simple.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-8 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Everything a marketing person does</h2>

        <div className="grid md:grid-cols-2 gap-6">
          {[
            { icon: "🎯", title: "Brand Analysis", desc: "Scrapes your site, reads your social presence, understands your vibe, audience, and positioning." },
            { icon: "✍️", title: "Content Drafting", desc: "Creates platform-specific posts — Instagram carousels, LinkedIn articles, TikTok scripts, X threads." },
            { icon: "📅", title: "Content Calendar", desc: "Plans your posting schedule, identifies gaps, suggests timely content based on trends and events." },
            { icon: "🔍", title: "Competitor Research", desc: "Tracks what your competitors post, how they engage, and spots opportunities you're missing." },
            { icon: "📊", title: "Market Intelligence", desc: "Monitors industry trends, audience pain points, and emerging topics in your niche." },
            { icon: "📲", title: "Auto Publishing", desc: "Connects to your social accounts and publishes approved posts on schedule." },
          ].map((f, i) => (
            <div key={i} className="glass rounded-xl p-5 flex gap-4">
              <div className="text-2xl">{f.icon}</div>
              <div>
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-[var(--muted)]">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack Badge */}
      <section className="max-w-4xl mx-auto px-8 py-10">
        <div className="terminal-block max-w-lg mx-auto">
          <div className="terminal-header">
            <div className="terminal-dot" style={{ background: "#ff5f57" }}></div>
            <div className="terminal-dot" style={{ background: "#febc2e" }}></div>
            <div className="terminal-dot" style={{ background: "#28c840" }}></div>
            <span className="text-xs text-[var(--muted)] ml-2 font-mono">stack.md</span>
          </div>
          <div className="terminal-body text-sm">
            <div className="text-[var(--muted)]"># Powered by</div>
            <div className="mt-1"><span className="text-[var(--terminal-green)]">engine:</span> OpenClaw (190k+ ⭐)</div>
            <div><span className="text-[var(--terminal-green)]">runtime:</span> Private agent per customer</div>
            <div><span className="text-[var(--terminal-green)]">chat:</span> Telegram (more channels soon)</div>
            <div><span className="text-[var(--terminal-green)]">built_by:</span> <a href="https://brainandbot.gg" className="text-[var(--accent-light)] hover:underline">Brain&amp;Bots</a></div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-4xl mx-auto px-8 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Simple pricing</h2>
        <p className="text-[var(--muted)] text-center mb-12">Less than a freelancer. More reliable than an intern.</p>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          <div className="glass rounded-2xl p-8">
            <div className="text-sm text-[var(--muted)] mb-2">Starter</div>
            <div className="text-4xl font-bold mb-1">$29<span className="text-lg text-[var(--muted)]">/mo</span></div>
            <p className="text-sm text-[var(--muted)] mb-6">Perfect for getting started</p>
            <ul className="space-y-3 text-sm mb-8">
              {["Brand analysis", "30 post drafts/month", "2 social platforms", "Weekly competitor report", "Telegram chat"].map((f, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> {f}
                </li>
              ))}
            </ul>
            <Link href="/setup" className="btn-secondary block text-center w-full">Get started</Link>
          </div>
          <div className="glass rounded-2xl p-8 border-[var(--accent)] glow">
            <div className="text-sm text-[var(--accent-light)] mb-2">Pro</div>
            <div className="text-4xl font-bold mb-1">$79<span className="text-lg text-[var(--muted)]">/mo</span></div>
            <p className="text-sm text-[var(--muted)] mb-6">For serious growth</p>
            <ul className="space-y-3 text-sm mb-8">
              {["Everything in Starter", "Unlimited post drafts", "All social platforms", "Daily competitor tracking", "Market research reports", "Priority support"].map((f, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> {f}
                </li>
              ))}
            </ul>
            <Link href="/setup" className="btn-primary block text-center w-full">Start free trial →</Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-8 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to hire your marketing agent?</h2>
        <p className="text-[var(--muted)] mb-8">Set up in 2 minutes. No credit card required for trial.</p>
        <Link href="/setup" className="btn-primary">
          Get started free →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8 mt-10">
        <div className="max-w-6xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-[var(--muted)]">
          <div className="flex items-center gap-3">
            <span className="gradient-text font-bold">tevy2</span>.ai — AI marketing agents
          </div>
          <div className="flex items-center gap-4">
            <span className="powered-badge">
              <span style={{ fontSize: "14px" }}>🐾</span> Powered by OpenClaw
            </span>
            <span>·</span>
            <a href="https://brainandbot.gg" className="hover:text-white transition">Brain&amp;Bots</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
