"use client";

import { useState } from "react";
import Link from "next/link";

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
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[var(--border)] bg-[var(--surface)] flex flex-col">
        {/* Logo */}
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

        {/* Agent Status */}
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-sm font-semibold">Agent Online</span>
          </div>
          <p className="text-xs text-[var(--muted)] font-mono">sunrise-coffee</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-3">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-0.5 transition-colors ${
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

        {/* Bottom */}
        <div className="px-5 py-4 border-t border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-xs font-bold">J</div>
            <div>
              <div className="text-sm font-medium">Jane Smith</div>
              <div className="text-xs text-[var(--muted)]">jane@sunrise.com</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {activeTab === "home" && <HomeTab />}
        {activeTab === "brand" && <BrandTab />}
        {activeTab === "calendar" && <CalendarTab />}
        {activeTab === "connect" && <ConnectTab />}
        {activeTab === "analytics" && <AnalyticsTab />}
        {activeTab === "research" && <ResearchTab />}
        {activeTab === "chat" && <ChatTab />}
      </main>
    </div>
  );
}

/* ─── HOME TAB ─── */
function HomeTab() {
  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">Welcome back, Jane</h1>
      <p className="text-[var(--muted)] mb-8">Here&apos;s what&apos;s happening with your marketing</p>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Posts This Week", value: "4", change: "+2 vs last week" },
          { label: "Engagement Rate", value: "3.2%", change: "+0.5%" },
          { label: "Followers", value: "1,247", change: "+23 this week" },
          { label: "Scheduled", value: "6", change: "Next: Tomorrow 9am" },
        ].map((stat, i) => (
          <div key={i} className="glass rounded-xl p-4">
            <div className="text-xs text-[var(--muted)] mb-1">{stat.label}</div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-xs text-[var(--terminal-green)] mt-1">{stat.change}</div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="glass rounded-xl p-6 mb-6">
        <h3 className="font-semibold mb-4">Recent Agent Activity</h3>
        <div className="space-y-3">
          {[
            { time: "2 hours ago", action: "Drafted 3 Instagram post options for summer collection", status: "⏳ Awaiting approval" },
            { time: "5 hours ago", action: "Completed weekly competitor analysis — Stumptown launched new merch line", status: "📋 Report ready" },
            { time: "Yesterday", action: "Published approved LinkedIn post — 47 impressions so far", status: "✅ Published" },
            { time: "Yesterday", action: "Updated brand profile based on your feedback about tone", status: "✅ Done" },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-4 py-2 border-b border-[var(--border)] last:border-0">
              <div className="text-xs text-[var(--muted)] w-24 shrink-0 pt-0.5">{item.time}</div>
              <div className="flex-1">
                <div className="text-sm">{item.action}</div>
                <div className="text-xs text-[var(--muted)] mt-0.5">{item.status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Posts */}
      <div className="glass rounded-xl p-6">
        <h3 className="font-semibold mb-4">Upcoming Posts</h3>
        <div className="space-y-3">
          {[
            { platform: "📸 Instagram", title: "Summer collection reveal — Option B", time: "Tomorrow, 9:00 AM", status: "Approved" },
            { platform: "💼 LinkedIn", title: "Behind-the-scenes: Our sourcing process", time: "Wed, 11:00 AM", status: "Draft" },
            { platform: "𝕏 X", title: "Quick thread on sustainable fashion", time: "Thu, 2:00 PM", status: "Draft" },
          ].map((post, i) => (
            <div key={i} className="flex items-center gap-4 py-2 border-b border-[var(--border)] last:border-0">
              <div className="text-sm w-28 shrink-0">{post.platform}</div>
              <div className="flex-1 text-sm">{post.title}</div>
              <div className="text-xs text-[var(--muted)]">{post.time}</div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                post.status === "Approved" ? "bg-[var(--green-dim)] text-[var(--green)]" : "bg-[var(--surface-light)] text-[var(--muted)]"
              }`}>
                {post.status}
              </span>
            </div>
          ))}
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
      <p className="text-[var(--muted)] mb-8">How Tevy understands your brand. Edit anytime — or tell Tevy in chat.</p>

      <div className="space-y-6">
        <div className="glass rounded-xl p-6">
          <h3 className="font-semibold mb-3">Brand Identity</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[var(--muted)] block mb-1">Business Name</label>
              <input className="input-field" defaultValue="Sunrise Coffee Co" />
            </div>
            <div>
              <label className="text-xs text-[var(--muted)] block mb-1">Website</label>
              <input className="input-field" defaultValue="https://sunrisecoffee.com" />
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-6">
          <h3 className="font-semibold mb-3">Brand Voice & Audience</h3>
          <div className="terminal-block">
            <div className="terminal-header">
              <div className="terminal-dot" style={{ background: "#ff5f57" }}></div>
              <div className="terminal-dot" style={{ background: "#febc2e" }}></div>
              <div className="terminal-dot" style={{ background: "#28c840" }}></div>
              <span className="text-xs text-[var(--muted)] ml-2 font-mono">brand-profile.md</span>
            </div>
            <div className="terminal-body text-sm leading-relaxed">
              <div><span className="text-[var(--terminal-green)]">vibe:</span> Warm, artisan, community-focused</div>
              <div><span className="text-[var(--terminal-green)]">audience:</span> 25-40, urban professionals who value quality</div>
              <div><span className="text-[var(--terminal-green)]">tone:</span> Friendly, casual, authentic — never corporate</div>
              <div><span className="text-[var(--terminal-green)]">values:</span> Sustainability, craftsmanship, local community</div>
              <div><span className="text-[var(--terminal-green)]">avoid:</span> Hard sell, discount language, generic stock phrases</div>
              <div className="mt-2 text-[var(--muted)]"># Auto-generated by Tevy. Last updated: 2 hours ago</div>
            </div>
          </div>
          <p className="text-xs text-[var(--muted)] mt-3">
            💡 Tell Tevy in chat to update this: &quot;Actually our audience is more 30-50&quot;
          </p>
        </div>

        <div className="glass rounded-xl p-6">
          <h3 className="font-semibold mb-3">Uploaded Files</h3>
          <div className="space-y-2">
            {["brand-guidelines.pdf", "logo-pack.zip", "tone-examples.docx"].map((file, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                <div className="flex items-center gap-2 text-sm">
                  <span>📄</span> {file}
                </div>
                <button className="text-xs text-[var(--muted)] hover:text-red-400">Remove</button>
              </div>
            ))}
          </div>
          <button className="btn-secondary text-sm !py-2 !px-4 mt-4">+ Upload more files</button>
        </div>
      </div>
    </div>
  );
}

/* ─── CALENDAR TAB ─── */
function CalendarTab() {
  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold mb-1">Content Calendar</h1>
      <p className="text-[var(--muted)] mb-8">View and manage scheduled posts</p>

      {/* Week view placeholder */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 border-b border-[var(--border)]">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day} className="px-4 py-3 text-center text-xs text-[var(--muted)] font-semibold border-r border-[var(--border)] last:border-0">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 min-h-[300px]">
          {[
            { day: "Mon", posts: [{ icon: "📸", title: "Summer collection", status: "approved" }] },
            { day: "Tue", posts: [] },
            { day: "Wed", posts: [{ icon: "💼", title: "Behind the scenes", status: "draft" }] },
            { day: "Thu", posts: [{ icon: "𝕏", title: "Sustainability thread", status: "draft" }] },
            { day: "Fri", posts: [] },
            { day: "Sat", posts: [{ icon: "📸", title: "Weekend vibes", status: "draft" }] },
            { day: "Sun", posts: [] },
          ].map((cell, i) => (
            <div key={i} className="border-r border-[var(--border)] last:border-0 p-3 min-h-[200px]">
              <div className="text-xs text-[var(--muted)] mb-2">{3 + i}</div>
              {cell.posts.map((post, j) => (
                <div
                  key={j}
                  className={`rounded-lg px-2 py-1.5 text-xs mb-1 cursor-pointer transition-colors ${
                    post.status === "approved"
                      ? "bg-[var(--green-dim)] text-[var(--green)] hover:bg-[rgba(34,197,94,0.25)]"
                      : "bg-[var(--surface-light)] text-[var(--muted)] hover:text-white"
                  }`}
                >
                  {post.icon} {post.title}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── CONNECT TAB ─── */
function ConnectTab() {
  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">Connected Accounts</h1>
      <p className="text-[var(--muted)] mb-8">Manage your chat channel and social platforms</p>

      <div className="space-y-6">
        {/* Chat Channel */}
        <div className="glass rounded-xl p-6">
          <h3 className="font-semibold mb-4">Chat Channel</h3>
          <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--surface-light)]">
            <div className="flex items-center gap-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#2AABEE">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              <div>
                <div className="font-semibold text-sm">Telegram</div>
                <div className="text-xs text-[var(--muted)] font-mono">@jane_sunrise</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-xs text-[var(--green)]">Connected</span>
            </div>
          </div>
        </div>

        {/* Social Accounts */}
        <div className="glass rounded-xl p-6">
          <h3 className="font-semibold mb-4">Social Platforms</h3>
          <div className="space-y-3">
            {[
              { icon: "📸", name: "Instagram", handle: "@sunrisecoffee", connected: true },
              { icon: "💼", name: "LinkedIn", handle: "Sunrise Coffee Co", connected: true },
              { icon: "𝕏", name: "X / Twitter", handle: "@sunrisecoffee", connected: false },
              { icon: "🎵", name: "TikTok", handle: "", connected: false },
              { icon: "📘", name: "Facebook", handle: "", connected: false },
            ].map((platform, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-light)]">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{platform.icon}</span>
                  <div>
                    <div className="text-sm font-medium">{platform.name}</div>
                    {platform.handle && <div className="text-xs text-[var(--muted)] font-mono">{platform.handle}</div>}
                  </div>
                </div>
                {platform.connected ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-xs text-[var(--green)]">Connected</span>
                  </div>
                ) : (
                  <button className="text-xs text-[var(--accent-light)] hover:underline">Connect</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* API Keys */}
        <div className="glass rounded-xl p-6">
          <h3 className="font-semibold mb-3">API Status</h3>
          <div className="terminal-block">
            <div className="terminal-body text-sm">
              <div><span className="text-[var(--terminal-green)]">✓</span> Search API <span className="text-[var(--muted)]">(managed)</span></div>
              <div><span className="text-[var(--terminal-green)]">✓</span> Posting API <span className="text-[var(--muted)]">(managed)</span></div>
              <div><span className="text-[var(--terminal-green)]">✓</span> AI Engine <span className="text-[var(--muted)]">(managed)</span></div>
              <div className="mt-2 text-[var(--muted)]"># All APIs managed by tevy2.ai — no keys needed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── ANALYTICS TAB ─── */
function AnalyticsTab() {
  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">Analytics</h1>
      <p className="text-[var(--muted)] mb-8">Post performance across platforms</p>

      <div className="glass rounded-xl p-6 mb-6">
        <h3 className="font-semibold mb-4">This Week</h3>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <div className="text-xs text-[var(--muted)] mb-1">Total Impressions</div>
            <div className="text-3xl font-bold">4,821</div>
            <div className="text-xs text-[var(--terminal-green)]">↑ 18% vs last week</div>
          </div>
          <div>
            <div className="text-xs text-[var(--muted)] mb-1">Engagements</div>
            <div className="text-3xl font-bold">156</div>
            <div className="text-xs text-[var(--terminal-green)]">↑ 12%</div>
          </div>
          <div>
            <div className="text-xs text-[var(--muted)] mb-1">Avg Engagement Rate</div>
            <div className="text-3xl font-bold">3.2%</div>
            <div className="text-xs text-[var(--terminal-green)]">↑ 0.5pp</div>
          </div>
        </div>
      </div>

      {/* Chart placeholder */}
      <div className="glass rounded-xl p-6 mb-6">
        <h3 className="font-semibold mb-4">Impressions Over Time</h3>
        <div className="h-48 flex items-end gap-2 px-4">
          {[30, 45, 38, 62, 55, 70, 65, 80, 72, 90, 85, 95, 88, 100].map((val, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-[var(--accent)] transition-all hover:bg-[var(--accent-light)]"
                style={{ height: `${val * 1.6}px`, opacity: 0.6 + (val / 250) }}
              ></div>
            </div>
          ))}
        </div>
        <div className="flex justify-between px-4 mt-2">
          <span className="text-xs text-[var(--muted)]">2 weeks ago</span>
          <span className="text-xs text-[var(--muted)]">Today</span>
        </div>
      </div>

      {/* Top Posts */}
      <div className="glass rounded-xl p-6">
        <h3 className="font-semibold mb-4">Top Performing Posts</h3>
        <div className="space-y-3">
          {[
            { platform: "📸", title: "Behind the roast — new single origin", impressions: "1,247", engagement: "4.8%" },
            { platform: "💼", title: "Why we source directly from farmers", impressions: "892", engagement: "3.5%" },
            { platform: "📸", title: "Morning rituals with Sunrise", impressions: "756", engagement: "3.1%" },
          ].map((post, i) => (
            <div key={i} className="flex items-center gap-4 py-2 border-b border-[var(--border)] last:border-0">
              <span>{post.platform}</span>
              <div className="flex-1 text-sm">{post.title}</div>
              <div className="text-sm text-[var(--muted)]">{post.impressions} views</div>
              <div className="text-sm text-[var(--terminal-green)]">{post.engagement}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── RESEARCH TAB ─── */
function ResearchTab() {
  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">Market Research</h1>
      <p className="text-[var(--muted)] mb-8">Competitor tracking and trend alerts from Tevy</p>

      {/* Latest Report */}
      <div className="glass rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Weekly Research Digest</h3>
          <span className="text-xs text-[var(--muted)]">Generated Mar 3, 2026</span>
        </div>
        <div className="terminal-block">
          <div className="terminal-header">
            <div className="terminal-dot" style={{ background: "#ff5f57" }}></div>
            <div className="terminal-dot" style={{ background: "#febc2e" }}></div>
            <div className="terminal-dot" style={{ background: "#28c840" }}></div>
            <span className="text-xs text-[var(--muted)] ml-2 font-mono">research/2026-03-03.md</span>
          </div>
          <div className="terminal-body text-sm leading-relaxed">
            <div className="text-[var(--terminal-green)] font-bold mb-2"># Weekly Research — Mar 3</div>
            <div className="mb-3">
              <div className="text-[var(--accent-light)]">## Competitor Activity</div>
              <div className="text-[var(--muted)]">- Stumptown launched a merch line (hoodies, mugs). High engagement on IG.</div>
              <div className="text-[var(--muted)]">- Blue Bottle pushing &quot;coffee subscription as gift&quot; angle for spring.</div>
              <div className="text-[var(--muted)]">- Intelligentsia doubled down on YouTube (brewing tutorials).</div>
            </div>
            <div className="mb-3">
              <div className="text-[var(--accent-light)]">## Trending Topics</div>
              <div className="text-[var(--muted)]">- &quot;Slow morning routines&quot; gaining traction on TikTok</div>
              <div className="text-[var(--muted)]">- Sustainability certifications becoming a purchase driver</div>
            </div>
            <div>
              <div className="text-[var(--accent-light)]">## Recommendations</div>
              <div className="text-[var(--muted)]">- Consider a &quot;morning ritual&quot; series for IG Reels / TikTok</div>
              <div className="text-[var(--muted)]">- Highlight your direct-trade sourcing (competitive advantage)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Competitors */}
      <div className="glass rounded-xl p-6">
        <h3 className="font-semibold mb-4">Tracked Competitors</h3>
        <div className="space-y-3">
          {[
            { name: "Stumptown Coffee", platforms: "IG, X, TikTok", lastPost: "2 hours ago", trend: "↑ Merch push" },
            { name: "Blue Bottle", platforms: "IG, LinkedIn", lastPost: "Yesterday", trend: "→ Gift subscriptions" },
            { name: "Intelligentsia", platforms: "IG, YouTube", lastPost: "3 days ago", trend: "↑ Video content" },
          ].map((comp, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-[var(--surface-light)]">
              <div className="flex-1">
                <div className="text-sm font-medium">{comp.name}</div>
                <div className="text-xs text-[var(--muted)]">{comp.platforms}</div>
              </div>
              <div className="text-xs text-[var(--muted)]">{comp.lastPost}</div>
              <div className="text-xs text-[var(--accent-light)]">{comp.trend}</div>
            </div>
          ))}
        </div>
        <button className="btn-secondary text-sm !py-2 !px-4 mt-4">+ Add competitor</button>
      </div>
    </div>
  );
}

/* ─── CHAT TAB ─── */
function ChatTab() {
  return (
    <div className="p-8 max-w-3xl h-full flex flex-col">
      <h1 className="text-2xl font-bold mb-1">Chat with Tevy</h1>
      <p className="text-[var(--muted)] mb-6">Webchat fallback — your agent also lives on Telegram</p>

      <div className="glass rounded-2xl flex-1 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 p-6 overflow-auto space-y-4">
          <div className="flex gap-3">
            <img src="/logo-wizard.jpg" alt="Tevy" className="w-7 h-7 rounded-full flex-shrink-0 mt-1" />
            <div className="glass rounded-xl rounded-tl-sm px-4 py-3 text-sm max-w-[80%]">
              Hey Jane! I just finished this week&apos;s competitor analysis. Stumptown is doing something interesting with merch — want me to draft a response angle for your brand?
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <div className="bg-[var(--accent)] rounded-xl rounded-tr-sm px-4 py-3 text-sm max-w-[80%] text-white">
              Interesting! What kind of merch angle could work for us?
            </div>
          </div>
          <div className="flex gap-3">
            <img src="/logo-wizard.jpg" alt="Tevy" className="w-7 h-7 rounded-full flex-shrink-0 mt-1" />
            <div className="glass rounded-xl rounded-tl-sm px-4 py-3 text-sm max-w-[80%]">
              Given your artisan/sustainability brand, I&apos;d avoid generic mugs. Instead:<br /><br />
              <strong>1.</strong> Reusable cups made from recycled coffee grounds (on-brand + sustainable)<br />
              <strong>2.</strong> Limited edition bags designed by local artists (community angle)<br />
              <strong>3.</strong> &quot;Coffee passport&quot; booklet — visit all locations, get rewards<br /><br />
              Want me to draft an announcement post for any of these?
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="p-4 border-t border-[var(--border)]">
          <div className="flex gap-3">
            <input
              className="input-field flex-1"
              placeholder="Message Tevy..."
            />
            <button className="btn-primary !px-6">Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}
