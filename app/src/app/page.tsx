import Image from "next/image";
import Link from "next/link";

const productFlow = [
  {
    icon: "🚀",
    title: "Deploy your agent",
    description: "Create a dedicated TevY2 workspace for your business in one setup flow.",
  },
  {
    icon: "🧭",
    title: "Run it from one dashboard",
    description: "Manage content, channels, competitor intel, assets, and runtime from one place.",
  },
  {
    icon: "🛠️",
    title: "Extend it when needed",
    description: "Start with the core service, then add custom features once your workflow is live.",
  },
];

const dashboardItems = [
  { icon: "📅", label: "Content calendar" },
  { icon: "🔍", label: "Market intel" },
  { icon: "💬", label: "Chat channels" },
  { icon: "📱", label: "Social accounts" },
  { icon: "🎨", label: "Brand assets" },
  { icon: "⚙️", label: "Runtime + updates" },
];

const plans = [
  {
    name: "Starter",
    price: "$89",
    subtitle: "For one business getting its first TevY2 agent live",
    icon: "🌱",
    features: [
      "1 TevY2 agent",
      "3 social accounts",
      "10 GB storage",
      "5 tracked competitors",
      "Telegram + WhatsApp access",
      "Standard support",
    ],
  },
  {
    name: "Professional",
    price: "$149",
    subtitle: "For active brands running more channels and approvals",
    icon: "📈",
    features: [
      "1 TevY2 agent",
      "8 social accounts",
      "50 GB storage",
      "15 tracked competitors",
      "Approvals + scheduling workflow",
      "Priority support",
    ],
  },
  {
    name: "Growth",
    price: "$299",
    subtitle: "For teams operating multiple brands or heavier output",
    icon: "🏢",
    featured: true,
    features: [
      "3 TevY2 agents",
      "20 social accounts",
      "200 GB storage",
      "40 tracked competitors",
      "Shared operating dashboard",
      "Priority onboarding",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    subtitle: "For custom workflows, integrations, and managed rollout",
    icon: "⚙️",
    features: [
      "Custom agent count",
      "Custom account limits",
      "Custom storage allocation",
      "Custom integrations",
      "Dedicated support",
      "Implementation help",
    ],
  },
];

const problemStats = [
  { value: "96%", label: "of businesses use social media" },
  { value: "90%", label: "fail to get consistent results" },
  { value: "61%", label: "say ROI is still unclear" },
];

const messagingChannels = ["Telegram", "WhatsApp", "Private bot chat"];

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
        <div className="hidden items-center gap-5 md:flex">
          <Link href="/" className="text-sm text-white transition">
            Home
          </Link>
          <a href="#pricing" className="text-sm text-white/70 transition hover:text-white">
            Pricing
          </a>
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
        <section className="landing-hero pb-20 pt-8 md:pt-12">
          <p className="landing-eyebrow mb-5">AI-powered · Fully automated · Data-driven</p>

          <div className="grid gap-6">
            <div className="landing-panel p-6 md:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 flex-1">
                  <h1 className="landing-headline mb-6">
                    The social media wizard for <span className="landing-highlight">reliable execution</span>
                  </h1>
                  <p className="landing-muted mb-6 max-w-2xl text-base md:text-lg">
                    TevY2 gives you a dedicated AI agent, a dashboard to run it, and custom extensions when your workflow needs more than the standard setup.
                  </p>

                  <div className="grid gap-2 text-sm md:text-base">
                    <p className="landing-list-item">Deploy your own TevY2 agent</p>
                    <p className="landing-list-item">Operate it from one dashboard</p>
                    <p className="landing-list-item">Add custom features later</p>
                  </div>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link href="/setup" className="landing-btn-primary">
                      Try free
                    </Link>
                    <a href="#what-you-get" className="landing-btn-outline">
                      See how it works
                    </a>
                  </div>
                </div>

                <div className="relative mx-auto w-full max-w-[240px] shrink-0 md:mx-0 md:w-[240px] lg:max-w-[280px] lg:w-[280px]">
                  <div className="absolute -inset-5 rounded-[2rem] bg-[radial-gradient(circle,rgba(91,243,58,0.18)_0%,transparent_72%)]" />
                  <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[rgba(255,255,255,0.03)] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
                    <Image
                      src="/hero-portrait.jpg"
                      alt="TevY2 botface"
                      width={640}
                      height={860}
                      priority
                      className="h-auto w-full rounded-[1.6rem] object-cover"
                    />
                    <div className="absolute inset-x-5 top-5 rounded-xl border border-white/10 bg-[rgba(11,12,15,0.68)] px-4 py-3 backdrop-blur-sm">
                      <p className="landing-step">TEVY2 AGENT</p>
                      <p className="mt-1 text-sm font-medium text-white">Private assistant, ready to run</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="landing-panel p-6 md:p-8">
              <p className="landing-step">WHY TEVY2</p>
              <h2 className="landing-card-title mt-3 text-2xl">Less noise. More control.</h2>
              <p className="landing-muted mt-4 text-sm md:text-base">
                Most social tools stop at scheduling. TevY2 is built around the full operating layer: deploy the agent, manage the work, connect the channels, and keep the system observable.
              </p>

              <div className="mt-6 landing-card !p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="landing-card-title text-sm">Chat with it directly</p>
                    <p className="landing-muted mt-1 text-sm">Run work from Telegram, WhatsApp, or your private bot chat.</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[.04] text-lg">
                    💬
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="ml-auto max-w-[88%] rounded-2xl rounded-br-md border border-white/10 bg-white/[.05] px-4 py-3 text-sm text-white/90">
                    Review tomorrow&apos;s posts and queue the best one for 9am.
                  </div>
                  <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-[rgba(91,243,58,0.24)] bg-[rgba(91,243,58,0.08)] px-4 py-3 text-sm text-white/90">
                    Draft ready. I can queue LinkedIn and X now, then send the caption here for approval.
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {messagingChannels.map((channel) => (
                    <span key={channel} className="landing-badge !text-[11px] !tracking-[0.16em]">
                      {channel}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                <div className="landing-card !p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-lg">🧭</span>
                    <div>
                      <p className="landing-card-title text-sm">One dashboard to run the system</p>
                      <p className="landing-muted mt-1 text-sm">Content, research, channels, assets, and runtime status in one place.</p>
                    </div>
                  </div>
                </div>
                <div className="landing-card !p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-lg">🔒</span>
                    <div>
                      <p className="landing-card-title text-sm">A dedicated agent for your business</p>
                      <p className="landing-muted mt-1 text-sm">Not a generic shared workspace pretending to be operations software.</p>
                    </div>
                  </div>
                </div>
                <div className="landing-card !p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-lg">🧩</span>
                    <div>
                      <p className="landing-card-title text-sm">Custom features when you need them</p>
                      <p className="landing-muted mt-1 text-sm">Start with the core flow, then extend it once the basics are live.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {problemStats.map((stat) => (
                  <div key={stat.value} className="landing-metric-chip">
                    <p className="landing-highlight text-2xl font-bold">{stat.value}</p>
                    <p className="landing-muted mt-2 text-xs">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section py-10" id="what-you-get">
          <p className="landing-eyebrow mb-4">How TevY2 works</p>
          <h2 className="landing-section-title mb-8">
            A simpler setup, with <span className="landing-highlight">real control</span>
          </h2>
          <div className="grid gap-4 lg:grid-cols-3">
            {productFlow.map((card) => (
              <div key={card.title} className="landing-card">
                <p className="text-2xl">{card.icon}</p>
                <p className="landing-card-title mt-4">{card.title}</p>
                <p className="landing-muted mt-3 text-sm">{card.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-section py-10">
          <p className="landing-eyebrow mb-4">Inside TevY2</p>
          <h2 className="landing-section-title mb-8">Everything important, in one dashboard</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {dashboardItems.map((item) => (
              <div key={item.label} className="landing-card flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[.03] text-xl">
                  {item.icon}
                </div>
                <p className="landing-card-title text-base">{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-section py-10" id="pricing">
          <p className="landing-eyebrow mb-4">Pricing</p>
          <div className="landing-panel p-6 md:p-8">
            <h2 className="landing-section-title mb-4">Pricing that scales with actual operating needs</h2>
            <p className="landing-muted text-sm md:text-base">
              The cleanest way to scale this is by capacity, not vague AI limits: number of agents, connected accounts, storage, tracked competitors, and support level.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {plans.map((plan) => (
                <div key={plan.name} className={`landing-card ${plan.featured ? "landing-card-featured" : ""}`}>
                  <p className="text-lg">{plan.icon}</p>
                  <p className="landing-card-title mt-3">{plan.name}</p>
                  <div className="mt-3 flex items-baseline gap-2">
                    <p className="landing-highlight text-3xl font-bold">{plan.price}</p>
                    {plan.price !== "Custom" ? <p className="landing-muted text-sm">/mo</p> : null}
                  </div>
                  <p className="landing-muted mt-3 text-sm">{plan.subtitle}</p>
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
              Custom features can stay as scoped add-ons instead of being forced into every plan.
            </p>
          </div>
        </section>

        <section className="landing-section py-14 text-center">
          <p className="landing-eyebrow mb-4">Get started</p>
          <h2 className="landing-section-title mb-4">Start with the core service, extend when you need to</h2>
          <p className="landing-muted mx-auto mb-8 max-w-3xl">
            TevY2 is built to get you live quickly, then adapt around your workflow over time.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/setup" className="landing-btn-primary">
              Try free
            </Link>
            <a href="mailto:partner@tevy2.ai" className="landing-btn-outline">
              Talk to us
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
