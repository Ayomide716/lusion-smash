// Site content. Everything below except the name is PLACEHOLDER copy —
// replace projects, experience, links and metrics with real ones before publishing.

export const site = {
  name: "Famoyegun Ayomide",
  shortName: "Ayomide",
  initials: "FA",
  role: "Full-stack product engineer",
  pitch: "I build fast, considered products — from the database to the last pixel.",
  location: "Lagos, Nigeria · Remote",
  email: "ayomidefamoyegun1@gmail.com",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  availability: "Open to full-time roles",
  socials: [
    { label: "GitHub", href: "https://github.com/ayomide716" },
    { label: "LinkedIn", href: "https://www.linkedin.com/" },
    { label: "X", href: "https://x.com/" },
  ],
} as const;

export type Project = {
  slug: string;
  title: string;
  tagline: string;
  year: string;
  role: string;
  stack: string[];
  hue: number;
  metrics: { value: string; label: string }[];
  problem: string;
  approach: string[];
  decisions: { title: string; body: string }[];
  outcome: string;
};

export const projects: Project[] = [
  {
    slug: "ledgerly",
    title: "Ledgerly",
    tagline: "Invoicing and cash-flow forecasting for small agencies.",
    year: "2025",
    role: "Founding engineer",
    stack: ["Next.js", "TypeScript", "PostgreSQL", "Stripe", "tRPC"],
    hue: 165,
    metrics: [
      { value: "3.2×", label: "faster invoice creation" },
      { value: "41%", label: "fewer late payments" },
      { value: "99.98%", label: "uptime over 12 months" },
    ],
    problem:
      "Agencies were juggling spreadsheets, a payments tool and an accounting package. Nobody knew what cash would land next month until it was too late.",
    approach: [
      "Interviewed 14 agency owners and mapped the invoice-to-payment journey end to end.",
      "Shipped a thin slice in three weeks: create, send and track an invoice with Stripe payment links.",
      "Layered a forecasting view on top once we had real payment-timing data.",
    ],
    decisions: [
      {
        title: "Postgres as the source of truth for money",
        body: "Every balance change is an append-only ledger row with a database-level constraint, so totals can be audited and replayed.",
      },
      {
        title: "Webhooks are idempotent by design",
        body: "Stripe events are stored before they're processed and keyed by event ID, which made retries and incident recovery boring.",
      },
    ],
    outcome:
      "Grew to 600+ paying teams. The forecasting view became the most-cited reason for upgrading to the paid plan.",
  },
  {
    slug: "pulse",
    title: "Pulse",
    tagline: "Real-time product analytics that engineers actually open.",
    year: "2024",
    role: "Lead full-stack engineer",
    stack: ["React", "Go", "WebSockets", "ClickHouse", "Redis"],
    hue: 265,
    metrics: [
      { value: "<150ms", label: "p95 dashboard query" },
      { value: "2B", label: "events / month" },
      { value: "−60%", label: "infra cost vs. previous vendor" },
    ],
    problem:
      "The team's analytics vendor was slow, expensive and sampled data aggressively. Product decisions were being made on stale, partial numbers.",
    approach: [
      "Designed an ingestion pipeline in Go that batches events into ClickHouse.",
      "Built live dashboards that stream updates over WebSockets instead of polling.",
      "Ran both systems in parallel for a month to prove the numbers matched.",
    ],
    decisions: [
      {
        title: "Pre-aggregate the hot paths",
        body: "Materialised views for the ten most-viewed charts took p95 from seconds to under 150ms without touching the UI.",
      },
      {
        title: "Backpressure over dropped events",
        body: "The ingest service applies backpressure to clients rather than silently sampling, so the numbers stay trustworthy under load.",
      },
    ],
    outcome:
      "Replaced the vendor entirely. Weekly active dashboard users tripled because the tool was finally fast enough to use in meetings.",
  },
  {
    slug: "atlas",
    title: "Atlas",
    tagline: "AI search across a company's docs, tickets and code.",
    year: "2024",
    role: "Full-stack engineer",
    stack: ["Python", "FastAPI", "pgvector", "Next.js", "OpenTelemetry"],
    hue: 20,
    metrics: [
      { value: "68%", label: "of searches answered first try" },
      { value: "11 min", label: "saved per support ticket" },
      { value: "4 wks", label: "from idea to pilot" },
    ],
    problem:
      "Support and engineering answers lived in five different tools. New hires spent their first month asking the same questions.",
    approach: [
      "Built connectors that incrementally sync docs, tickets and repositories.",
      "Combined keyword and vector search, with every answer citing its sources.",
      "Instrumented each step so we could see exactly where answers went wrong.",
    ],
    decisions: [
      {
        title: "Citations are mandatory",
        body: "An answer without a source isn't shown. It cost some coverage but earned the trust that drove adoption.",
      },
      {
        title: "Evaluate before shipping",
        body: "A set of 300 real questions with graded answers ran on every change, turning prompt tweaks into measurable experiments.",
      },
    ],
    outcome:
      "Rolled out to every team after the pilot. It became the default place new hires go before asking in chat.",
  },
  {
    slug: "mise",
    title: "Mise",
    tagline: "An offline-first kitchen operations app for restaurants.",
    year: "2023",
    role: "Product engineer",
    stack: ["React Native", "TypeScript", "SQLite", "Node.js", "Expo"],
    hue: 330,
    metrics: [
      { value: "4.8★", label: "App Store rating" },
      { value: "0", label: "lost orders during outages" },
      { value: "35%", label: "less food waste reported" },
    ],
    problem:
      "Kitchens run on paper because Wi-Fi drops mid-service. Existing apps froze exactly when they were needed most.",
    approach: [
      "Spent shifts in three kitchens to see how prep lists and stock counts really work.",
      "Built the app offline-first, with a local database that syncs when the connection returns.",
      "Designed for greasy hands: big targets, high contrast, one-thumb flows.",
    ],
    decisions: [
      {
        title: "Conflict-free sync",
        body: "Stock counts are merged as operations, not overwritten as values, so two cooks editing offline never clobber each other.",
      },
      {
        title: "Design for the worst minute of service",
        body: "Every flow was tested during a real Friday rush. Anything that needed more than two taps was redesigned.",
      },
    ],
    outcome:
      "Adopted by 40 restaurants in the first six months, mostly through word of mouth between chefs.",
  },
];

export const experience = [
  {
    company: "Acme Labs",
    role: "Senior Full-stack Engineer",
    period: "2024 — Present",
    summary:
      "Leading a product squad of five. Own the web platform end to end, from Postgres schema design to the design system.",
  },
  {
    company: "Northwind",
    role: "Full-stack Engineer",
    period: "2022 — 2024",
    summary:
      "Built real-time features and the analytics pipeline. Cut page load times by 55% across the core app.",
  },
  {
    company: "Globex Studio",
    role: "Frontend Engineer",
    period: "2020 — 2022",
    summary:
      "Shipped marketing sites and web apps for clients in fintech and retail. Introduced TypeScript and automated testing.",
  },
];

export const skills = [
  {
    group: "Product",
    items: ["Discovery & user research", "Scoping thin slices", "Experimentation", "Analytics"],
  },
  {
    group: "Frontend",
    items: ["TypeScript", "React / Next.js", "Tailwind CSS", "Three.js / WebGPU", "Accessibility"],
  },
  {
    group: "Backend",
    items: ["Node.js", "Go", "Python / FastAPI", "PostgreSQL", "Redis"],
  },
  {
    group: "Platform",
    items: ["AWS / Vercel", "Docker", "CI/CD", "Observability", "Rust → WebAssembly"],
  },
];

export const principles = [
  {
    title: "Ship the thin slice",
    body: "Get something real in front of users in weeks, not quarters, then let their behaviour steer.",
  },
  {
    title: "Own it end to end",
    body: "Schema, API, interface and the dashboard that proves it worked. Fewer handoffs, fewer gaps.",
  },
  {
    title: "Fast is a feature",
    body: "Performance and polish are how users feel quality. I measure both and treat regressions as bugs.",
  },
];
