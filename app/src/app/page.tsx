import Image from "next/image";
import Link from "next/link";

const processSteps = [
  {
    id: "01",
    title: "Scan and monitor",
    description:
      "Continuously tracks your social presence and competitor activity across major channels.",
  },
  {
    id: "02",
    title: "Analyze and understand",
    description:
      "Builds a live picture of your market, audience behavior, and content performance.",
  },
  {
    id: "03",
    title: "Identify trends",
    description:
      "Spots emerging topics before they peak, so you publish while attention is building.",
  },
  {
    id: "04",
    title: "Suggest content",
    description:
      "Generates channel-ready copy, visual concepts, and hashtag strategy — all in your brand voice.",
  },
  {
    id: "05",
    title: "Optimize channels",
    description:
      "Recommends the right platform mix and posting cadence for your goals.",
  },
  {
    id: "06",
    title: "Auto-post and learn",
    description:
      "Publishes at optimal times and improves recommendations from every campaign result.",
  },
];

const pricingPlans = [
  {
    name: "Starter",
    price: "$39",
    subtitle: "Perfect for freelancers and solopreneurs",
    features: ["3 social accounts", "60 AI-generated posts/month", "Basic analytics", "Email support"],
  },
  {
    name: "Professional",
    price: "$89",
    subtitle: "Ideal for growing businesses and agencies",
    features: ["10 social accounts", "Unlimited AI posts", "Advanced analytics", "Competitor tracking"],
  },
  {
    name: "Growth",
    price: "$149",
    subtitle: "Built for scaling businesses",
    features: ["20 social accounts", "Unlimited AI posts", "Priority support", "Advanced intelligence suite"],
    featured: true,
  },
  {
    name: "Enterprise",
    price: "$299",
    subtitle: "For organizations with custom needs",
    features: ["Unlimited accounts", "Custom AI training", "Dedicated manager", "SLA and API access"],
  },
];

export default function Home() {
  return (
    <div className="landing-shell">
      <div className="landing-grid" />
      <div className="landing-glow" />
      <div className="landing-grain" />

      <nav className="landing-nav landing-container flex items-center justify-between py-6">
        <div className="flex items-center gap-3">
          <Image src="/logo-wizard.jpg" alt="tevy2" width={36} height={36} className="h-9 w-9 rounded-lg" />
          <div className="landing-display text-lg font-bold tracking-tight">TevY2.ai</div>
          <span className="landing-badge">Enterprise-grade AI</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="landing-btn-outline !px-4 !py-2 text-sm">
            Log in
          </Link>
          <Link href="/setup" className="landing-btn-primary !px-4 !py-2 text-sm">
            Try free
          </Link>
        </div>
      </nav>

      <main className="landing-container pb-24">
        {/* ═══════ HERO ═══════ */}
        <section className="landing-hero pb-20 pt-8 md:pt-12">
          <p className="landing-eyebrow mb-5">AI-powered · Fully automated · Data-driven</p>

          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
            <div className="landing-panel p-6 md:p-8">
              <h1 className="landing-headline mb-6">
                The social media wizard that turns <span className="landing-highlight">chaos</span> into{" "}
                <span className="landing-em">conversions</span>
              </h1>
              <p className="landing-muted mb-6 max-w-2xl text-base md:text-lg">
                TevY2 combines real-time competitive intelligence, AI content creation, and automated publishing — so your business grows on social without adding headcount.
              </p>
              <div className="grid gap-2 text-sm md:text-base">
                <p className="landing-list-item">Competitor intelligence that runs 24/7</p>
                <p className="landing-list-item">Trend detection before topics peak</p>
                <p className="landing-list-item">Brand-matched content created and published automatically</p>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/setup" className="landing-btn-primary">
                  Try it free — no card required
                </Link>
                <a href="#how-it-works" className="landing-btn-outline">
                  See how it works
                </a>
              </div>
            </div>

            <div className="landing-panel overflow-hidden p-2">
              <Image
                src="/hero-portrait.jpg"
                alt="TevY2 Social Media Wizard"
                width={960}
                height={1280}
                priority
                className="h-full min-h-[320px] w-full rounded-2xl object-cover"
              />
            </div>
          </div>
        </section>

        {/* ═══════ REC #1: INTERACTIVE DEMO / MICRO-TOOL ═══════ */}
        <section className="landing-section py-10" id="try-it">
          <p className="landing-eyebrow mb-4">Try it now</p>
          <h2 className="landing-section-title mb-8">
            See TevY2 in action — <span className="landing-highlight">in 30 seconds</span>
          </h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="landing-panel p-6 md:p-8">
              <p className="landing-step">⚡</p>
              <h3 className="landing-card-title mt-3 text-xl">Competitor Vibe Check</h3>
              <p className="landing-muted mt-3 text-sm">
                Drop a competitor&apos;s social handle and TevY2 generates a 3-point insight report — their posting frequency, top content themes, and engagement gaps you can exploit.
              </p>
              <div className="mt-6 flex items-center gap-2">
                <div className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/40">
                  @competitor_handle
                </div>
                <Link href="/setup" className="landing-btn-primary !py-3 whitespace-nowrap">
                  Analyze free →
                </Link>
              </div>
              <p className="landing-muted mt-3 text-xs">No signup required. Get your report in under 30 seconds.</p>
            </div>

            <div className="landing-panel p-6 md:p-8">
              <p className="landing-step">🎬</p>
              <h3 className="landing-card-title mt-3 text-xl">Interactive product tour</h3>
              <p className="landing-muted mt-3 text-sm">
                Walk through the full TevY2 experience — from competitor scan to published post — without creating an account. Click through a real workflow.
              </p>
              <div className="mt-6 flex h-32 items-center justify-center rounded-xl border border-white/10 bg-white/[.03]">
                <div className="text-center">
                  <p className="text-3xl">▶</p>
                  <p className="landing-muted mt-2 text-xs">Interactive demo — 2 min walkthrough</p>
                </div>
              </div>
              <div className="mt-4">
                <Link href="/setup" className="landing-btn-outline w-full justify-center !py-3 text-center text-sm">
                  Start the guided tour
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════ PROBLEM ═══════ */}
        <section className="landing-section py-10" id="problem">
          <p className="landing-eyebrow mb-4">The problem</p>
          <h2 className="landing-section-title mb-8">
            96% of SMBs use social media, but <span className="landing-highlight">90% fail to generate results</span>
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="landing-card">
              <p className="landing-stat">96%</p>
              <p className="landing-card-title">Social adoption is universal</p>
              <p className="landing-muted text-sm">Businesses know social channels are essential for growth and visibility.</p>
            </div>
            <div className="landing-card">
              <p className="landing-stat">90%</p>
              <p className="landing-card-title">Results are inconsistent</p>
              <p className="landing-muted text-sm">Most businesses invest heavily yet fail to produce reliable business impact.</p>
            </div>
            <div className="landing-card">
              <p className="landing-stat">61%</p>
              <p className="landing-card-title">ROI is unclear</p>
              <p className="landing-muted text-sm">Without clear attribution, strategy and budget decisions stay reactive.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="landing-card">
              <p className="landing-card-title">Time-intensive</p>
              <p className="landing-muted text-sm">Creating content, reviewing metrics, and engaging audiences can exceed 15 hours per week per platform.</p>
            </div>
            <div className="landing-card">
              <p className="landing-card-title">Complexity overload</p>
              <p className="landing-muted text-sm">Teams juggle roughly 6.8 platforms with different algorithms, formats, and audience behavior.</p>
            </div>
            <div className="landing-card">
              <p className="landing-card-title">Constant change</p>
              <p className="landing-muted text-sm">Trends, best practices, and distribution systems shift daily, making manual adaptation too slow.</p>
            </div>
          </div>
        </section>

        {/* ═══════ PAIN POINTS ═══════ */}
        <section className="landing-section py-10">
          <p className="landing-eyebrow mb-4">Pain points</p>
          <h2 className="landing-section-title mb-8">Three questions every marketer keeps asking</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="landing-card">
              <p className="landing-card-title">How do we influence our audience day to day?</p>
              <p className="landing-muted text-sm">Most businesses still post without reliable insight into timing, behavior, and message resonance.</p>
            </div>
            <div className="landing-card">
              <p className="landing-card-title">How do we stay relevant?</p>
              <p className="landing-muted text-sm">By the time trends are recognized manually, the opportunity window is usually closed.</p>
            </div>
            <div className="landing-card">
              <p className="landing-card-title">How do we scale high-quality content?</p>
              <p className="landing-muted text-sm">Manual production is slow and inconsistent, causing posting gaps and lost momentum.</p>
            </div>
          </div>
          <p className="mt-5 landing-muted">
            The gap: most tools help businesses schedule posts, but not decide what to post, when to post, and why it matters.
          </p>
        </section>

        {/* ═══════ SOLUTION ═══════ */}
        <section className="landing-section py-10">
          <p className="landing-eyebrow mb-4">The solution</p>
          <div className="landing-panel p-6 md:p-8">
            <h2 className="landing-section-title mb-4">Meet TevY2: your AI social media wizard</h2>
            <blockquote className="landing-quote mb-6">
              &quot;Like having a data scientist, content strategist, and social media manager
              working 24/7 — at a fraction of the cost of one hire.&quot;
            </blockquote>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="landing-card">
                <p className="landing-card-title">Intelligent analysis</p>
                <p className="landing-muted text-sm">Scans competitors, market trends, and audience behavior in real time.</p>
              </div>
              <div className="landing-card">
                <p className="landing-card-title">Automated creation</p>
                <p className="landing-muted text-sm">Builds platform-optimized content that reflects your brand voice.</p>
              </div>
              <div className="landing-card">
                <p className="landing-card-title">Perfect timing</p>
                <p className="landing-muted text-sm">Publishes at high-impact moments based on audience and algorithm patterns.</p>
              </div>
              <div className="landing-card">
                <p className="landing-card-title">Continuous learning</p>
                <p className="landing-muted text-sm">Improves output quality and targeting from every campaign outcome.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════ REC #2: AUDIENCE SEGMENTS ═══════ */}
        <section className="landing-section py-10" id="who-its-for">
          <p className="landing-eyebrow mb-4">Built for your business</p>
          <h2 className="landing-section-title mb-8">
            One platform, <span className="landing-highlight">tailored to how you work</span>
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="landing-card">
              <p className="text-2xl mb-3">🏪</p>
              <p className="landing-card-title">For growing businesses</p>
              <p className="landing-muted mt-2 text-sm">
                You know social matters, but you don&apos;t have a dedicated marketing team. TevY2 handles competitive research, content creation, and publishing — so you can focus on running your business.
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="landing-list-item">Save 25+ hours/week on social</li>
                <li className="landing-list-item">Consistent posting without the burnout</li>
                <li className="landing-list-item">From $39/mo — less than a freelancer&apos;s day rate</li>
              </ul>
            </div>
            <div className="landing-card">
              <p className="text-2xl mb-3">🏢</p>
              <p className="landing-card-title">For agencies &amp; consultants</p>
              <p className="landing-muted mt-2 text-sm">
                Manage multiple client accounts without scaling headcount. White-label AI content, automated reporting, and margin optimization built in.
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="landing-list-item">Multi-account management dashboard</li>
                <li className="landing-list-item">Client-specific brand voice training</li>
                <li className="landing-list-item">Automated performance reports</li>
              </ul>
            </div>
            <div className="landing-card">
              <p className="text-2xl mb-3">🎨</p>
              <p className="landing-card-title">For creators &amp; freelancers</p>
              <p className="landing-muted mt-2 text-sm">
                Build your personal brand on autopilot. TevY2 learns your voice, spots trends in your niche, and keeps your feeds active even when you&apos;re heads-down on client work.
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="landing-list-item">Niche trend detection for your audience</li>
                <li className="landing-list-item">AI writes in your voice, not generic corporate</li>
                <li className="landing-list-item">Schedule a week of content in 5 minutes</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ═══════ HOW IT WORKS ═══════ */}
        <section id="how-it-works" className="landing-section py-10">
          <p className="landing-eyebrow mb-4">Product features</p>
          <h2 className="landing-section-title mb-8">How TevY2 works: six steps</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {processSteps.map((step) => (
              <div key={step.id} className="landing-card">
                <p className="landing-step">{step.id}</p>
                <p className="landing-card-title mt-2">{step.title}</p>
                <p className="landing-muted mt-2 text-sm">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════ REC #4: VISUAL CAPABILITIES SHOWCASE ═══════ */}
        <section className="landing-section py-10" id="visuals">
          <p className="landing-eyebrow mb-4">AI-generated visuals</p>
          <h2 className="landing-section-title mb-8">
            From brand guidelines to <span className="landing-highlight">publish-ready content</span>
          </h2>
          <div className="landing-panel p-6 md:p-8">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/[.03] text-3xl">📋</div>
                <p className="landing-card-title mt-4">1. Your brand input</p>
                <p className="landing-muted mt-2 text-sm">Upload your brand colors, fonts, tone guidelines, and example content.</p>
              </div>
              <div className="text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/[.03] text-3xl">🧠</div>
                <p className="landing-card-title mt-4">2. TevY2 creates</p>
                <p className="landing-muted mt-2 text-sm">AI generates copy, image concepts, and visual assets — matched to your brand and each platform&apos;s format.</p>
              </div>
              <div className="text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/[.03] text-3xl">🚀</div>
                <p className="landing-card-title mt-4">3. Published automatically</p>
                <p className="landing-muted mt-2 text-sm">Platform-optimized posts go live at peak engagement times. Review first, or let TevY2 auto-publish.</p>
              </div>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-center">
                <p className="text-sm font-medium text-white/80">Instagram carousel</p>
                <p className="landing-muted text-xs mt-1">1080×1080 · brand colors</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-center">
                <p className="text-sm font-medium text-white/80">LinkedIn thought piece</p>
                <p className="landing-muted text-xs mt-1">Text + header image</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-center">
                <p className="text-sm font-medium text-white/80">X/Twitter thread</p>
                <p className="landing-muted text-xs mt-1">Hook + 5 tweets + CTA</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-center">
                <p className="text-sm font-medium text-white/80">Facebook post</p>
                <p className="landing-muted text-xs mt-1">Copy + visual + link</p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════ AI CAPABILITIES ═══════ */}
        <section className="landing-section py-10">
          <p className="landing-eyebrow mb-4">AI capabilities</p>
          <h2 className="landing-section-title mb-8">Intelligence that understands your market</h2>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="landing-card">
              <p className="landing-card-title">Competitor intelligence</p>
              <p className="landing-muted mt-2 text-sm">Real-time activity tracking plus AI-driven gap analysis across content strategy.</p>
              <div className="landing-metric-chip mt-4">
                <p className="landing-highlight text-xl font-bold">+340%</p>
                <p className="landing-muted text-xs">Engagement increase</p>
              </div>
            </div>
            <div className="landing-card">
              <p className="landing-card-title">Market trend detection</p>
              <p className="landing-muted mt-2 text-sm">Identifies rising topics before they become mainstream so businesses can lead.</p>
              <div className="landing-metric-chip mt-4">
                <p className="landing-highlight text-xl font-bold">3 weeks</p>
                <p className="landing-muted text-xs">Typical early signal window</p>
              </div>
            </div>
            <div className="landing-card">
              <p className="landing-card-title">Customer understanding</p>
              <p className="landing-muted mt-2 text-sm">Deep analysis of demographics, behavior patterns, and sentiment by channel.</p>
              <div className="landing-metric-chip mt-4">
                <p className="landing-highlight text-xl font-bold">-60%</p>
                <p className="landing-muted text-xs">Time spent on manual planning</p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════ AUTOMATION + TESTIMONIAL ═══════ */}
        <section className="landing-section py-10">
          <p className="landing-eyebrow mb-4">Automation engine</p>
          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="landing-card">
              <h3 className="landing-card-title text-xl">Content creation at scale</h3>
              <p className="landing-muted mt-3 text-sm">
                TevY2 generates platform-ready copy, image concepts with AI-generated visuals, and full posting calendars — then schedules and publishes at the right time for each audience.
              </p>
              <blockquote className="landing-quote mt-6">
                &quot;What used to take our team a full week now happens automatically in minutes. We went from 3 posts a week to 3 a day — and engagement tripled.&quot;
              </blockquote>
              <p className="landing-muted mt-3 text-xs">— Sarah K., Marketing Lead at a London e-commerce brand (beta customer)</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <div className="landing-metric-chip p-5">
                <p className="landing-highlight text-2xl font-bold">+287%</p>
                <p className="landing-muted text-sm">Engagement rate</p>
              </div>
              <div className="landing-metric-chip p-5">
                <p className="landing-highlight text-2xl font-bold">10x</p>
                <p className="landing-muted text-sm">Content output</p>
              </div>
              <div className="landing-metric-chip p-5">
                <p className="landing-highlight text-2xl font-bold">25 hrs/week</p>
                <p className="landing-muted text-sm">Time saved</p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════ REC #5: COMPETITOR COMPARISON ═══════ */}
        <section className="landing-section py-10" id="compare">
          <p className="landing-eyebrow mb-4">Why TevY2</p>
          <h2 className="landing-section-title mb-8">
            Not another scheduling tool. <span className="landing-highlight">An AI marketing team.</span>
          </h2>
          <div className="landing-panel p-6 md:p-8 overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 600 }}>
              <thead>
                <tr className="border-b border-white/10">
                  <th className="pb-4 text-left font-medium text-white/40 w-1/4"></th>
                  <th className="pb-4 text-center font-bold">
                    <span className="landing-highlight">TevY2.ai</span>
                  </th>
                  <th className="pb-4 text-center font-medium text-white/50">Hootsuite</th>
                  <th className="pb-4 text-center font-medium text-white/50">Buffer</th>
                </tr>
              </thead>
              <tbody className="landing-muted">
                <tr className="border-b border-white/5">
                  <td className="py-3 text-white/60">AI content generation</td>
                  <td className="py-3 text-center">✅ Full autopilot</td>
                  <td className="py-3 text-center">⚠️ Basic suggestions</td>
                  <td className="py-3 text-center">⚠️ AI assistant</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-3 text-white/60">Competitor intelligence</td>
                  <td className="py-3 text-center">✅ Real-time tracking</td>
                  <td className="py-3 text-center">⚠️ Manual streams</td>
                  <td className="py-3 text-center">❌ None</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-3 text-white/60">Trend detection</td>
                  <td className="py-3 text-center">✅ 3 weeks early</td>
                  <td className="py-3 text-center">❌ None</td>
                  <td className="py-3 text-center">❌ None</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-3 text-white/60">Auto-publishing</td>
                  <td className="py-3 text-center">✅ AI-optimized timing</td>
                  <td className="py-3 text-center">✅ Scheduled</td>
                  <td className="py-3 text-center">✅ Scheduled</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-3 text-white/60">Visual content creation</td>
                  <td className="py-3 text-center">✅ AI-generated</td>
                  <td className="py-3 text-center">⚠️ Canva integration</td>
                  <td className="py-3 text-center">⚠️ Canva integration</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-3 text-white/60">Brand voice learning</td>
                  <td className="py-3 text-center">✅ Trained on your content</td>
                  <td className="py-3 text-center">❌ None</td>
                  <td className="py-3 text-center">❌ None</td>
                </tr>
                <tr>
                  <td className="py-3 text-white/60">Starting price</td>
                  <td className="py-3 text-center font-bold text-white">$39/mo</td>
                  <td className="py-3 text-center">$99/mo</td>
                  <td className="py-3 text-center">$6/mo</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="landing-muted mt-4 text-sm text-center">
            Traditional tools tell you <em>where</em> to post. TevY2 tells you <strong className="text-white/80">what, when, and why</strong> — then does it for you.
          </p>
        </section>

        {/* ═══════ REC #3: HIGGSFIELD COMMUNITY ═══════ */}
        <section className="landing-section py-10" id="community">
          <p className="landing-eyebrow mb-4">Community</p>
          <h2 className="landing-section-title mb-8">
            Backed by the <span className="landing-highlight">15 million</span> strong higgsfield.ai community
          </h2>
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="landing-panel p-6 md:p-8">
              <h3 className="landing-card-title text-xl mb-4">Why the community matters</h3>
              <p className="landing-muted text-sm mb-4">
                TevY2 is the official AI marketing partner for the higgsfield.ai community — one of the largest creator and business networks in the world. That means:
              </p>
              <div className="space-y-3">
                <div className="landing-card !p-4">
                  <p className="landing-card-title text-sm">Community-powered features</p>
                  <p className="landing-muted text-xs mt-1">Every feature is built from real user feedback. What the community requests, we ship.</p>
                </div>
                <div className="landing-card !p-4">
                  <p className="landing-card-title text-sm">Shared intelligence</p>
                  <p className="landing-muted text-xs mt-1">Trend detection powered by signals from millions of active creators across every niche.</p>
                </div>
                <div className="landing-card !p-4">
                  <p className="landing-card-title text-sm">Battle-tested at scale</p>
                  <p className="landing-muted text-xs mt-1">The AI improves from community-wide patterns, not just your data alone.</p>
                </div>
              </div>
            </div>

            <div className="landing-panel p-6 md:p-8 flex flex-col justify-between">
              <div>
                <h3 className="landing-card-title text-xl mb-4">Community exclusive</h3>
                <p className="landing-muted text-sm mb-6">
                  Higgsfield.ai members get early access to new features, exclusive templates, and an extended free trial.
                </p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="landing-highlight text-2xl font-bold">15M+</p>
                    <p className="landing-muted text-xs">Community members</p>
                  </div>
                  <div>
                    <p className="landing-highlight text-2xl font-bold">200+</p>
                    <p className="landing-muted text-xs">Content templates</p>
                  </div>
                  <div>
                    <p className="landing-highlight text-2xl font-bold">30 days</p>
                    <p className="landing-muted text-xs">Extended free trial</p>
                  </div>
                </div>
              </div>
              <div className="mt-8">
                <Link href="/setup?ref=higgsfield" className="landing-btn-primary w-full justify-center !py-3 text-center">
                  Claim your community offer →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════ PRICING ═══════ */}
        <section className="landing-section py-10" id="pricing">
          <p className="landing-eyebrow mb-4">Pricing</p>
          <h2 className="landing-section-title mb-8">Simple pricing, no surprises</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {pricingPlans.map((plan) => (
              <div key={plan.name} className={`landing-card ${plan.featured ? "landing-card-featured" : ""}`}>
                <p className="landing-card-title">{plan.name}</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <p className="landing-highlight text-3xl font-bold">{plan.price}</p>
                  <p className="landing-muted text-sm">/mo</p>
                </div>
                <p className="landing-muted mt-2 text-sm">{plan.subtitle}</p>
                <ul className="mt-4 space-y-2 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="landing-list-item">
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="landing-muted mt-6 text-sm">
            Built for growing businesses who need results from social — without hiring a full marketing team. Start free, upgrade when you&apos;re ready.
          </p>
        </section>

        {/* ═══════ FINAL CTA ═══════ */}
        <section className="landing-section py-14 text-center">
          <p className="landing-eyebrow mb-4">Get started</p>
          <h2 className="landing-section-title mb-4">Your AI marketing team starts here</h2>
          <p className="landing-muted mx-auto mb-8 max-w-3xl">
            Join businesses already using TevY2 to automate their social media — from competitive intelligence to content creation to publishing. No credit card required.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/setup" className="landing-btn-primary">
              Start free trial
            </Link>
            <a href="mailto:partner@tevy2.ai" className="landing-btn-outline">
              Partner with us
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
