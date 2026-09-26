// Site content. Projects and experience are real (projects written from each
// repository's code and README). Check: location, availability wording.

export const site = {
  name: "Famoyegun Ayomide",
  shortName: "Ayomide",
  initials: "FA",
  role: "Full-stack product engineer",
  pitch: "I build fast, considered products — from the database to the last pixel.",
  location: "Lagos, Nigeria · Remote",
  email: "ayomidefamoyegun1@gmail.com",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  availability: "Available for freelance projects",
  socials: [
    { label: "GitHub", href: "https://github.com/Ayomide716" },
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
  links: { label: string; href: string }[];
};

export const projects: Project[] = [
  {
    slug: "naijahustle",
    title: "NaijaHustle",
    tagline: "A Fiverr-style freelance and jobs marketplace built for Nigerians.",
    year: "2026",
    role: "Full-stack developer",
    stack: ["React", "TypeScript", "Supabase", "Flutterwave", "Deno Edge Functions", "TanStack Query", "Sentry"],
    hue: 150,
    metrics: [
      { value: "7-day", label: "escrow before sellers are paid" },
      { value: "11", label: "server functions for payments and email" },
      { value: "26", label: "pages: gigs, jobs, orders, messages, admin" },
    ],
    problem:
      "Nigerian freelancers and small businesses need somewhere local to buy and sell services, post jobs and get paid in naira. The hard part isn't the listings; it's trust: buyers need their money safe until work is delivered, and sellers need to know they'll actually be paid.",
    approach: [
      "Built both sides of the marketplace: gig listings and orders for buyers and sellers, plus a jobs board with applications for employers and talent.",
      "Integrated Flutterwave for card and bank payments, bank-account verification and subscriptions, all behind Supabase Edge Functions so no secret keys ever reach the browser.",
      "Added messaging, reviews, a blog and help centre, an admin dashboard, email notifications, and Sentry error monitoring.",
    ],
    decisions: [
      {
        title: "Escrow instead of instant payouts",
        body: "The full payment is held on the platform rather than split to the seller at checkout. A scheduled function settles completed orders only after a 7-day holding period, which leaves room for disputes and refunds.",
      },
      {
        title: "A webhook you can't fake or replay",
        body: "Every Flutterwave webhook must carry the secret hash, compared in constant time so it can't be guessed by timing. The transaction and amount are then re-verified with Flutterwave's API, and processing is idempotent, so duplicate deliveries are safe.",
      },
      {
        title: "Trust enforced in the database, not the UI",
        body: "A security pass removed the ability for users to update their own payment rows (which would have let someone mark an order paid without paying), and moved review eligibility into Postgres: you can only review someone you've actually completed an order or job with.",
      },
    ],
    outcome:
      "A working two-sided marketplace with real payments, escrow and payouts, hardened so that the rules the UI shows are the rules the database enforces.",
    links: [{ label: "View code on GitHub", href: "https://github.com/Ayomide716/cloud-naija-growth" }],
  },
  {
    slug: "zwcc-business-grant",
    title: "ZWCC Business Grant",
    tagline: "A mobile app that runs a church's business grant programme, from application to a year of monitoring.",
    year: "2026",
    role: "Mobile & backend developer",
    stack: ["React Native", "Expo", "TypeScript", "Supabase", "React Query", "Zod"],
    hue: 215,
    metrics: [
      { value: "14", label: "config files that define the whole workflow" },
      { value: "47", label: "screens across applicant, committee and admin" },
      { value: "~200 KB", label: "per uploaded photo, down from ~4 MB" },
    ],
    problem:
      "Zion World Christian Center in Lagos needed to run its 2026 business grant end to end: applications, document verification, committee review, signed agreements and a year of beneficiary reports. The catch: the client's exact process wasn't final while the app was being built.",
    approach: [
      "Built a native Android and iOS app with separate experiences for applicants, the grant committee and administrators.",
      "Made the workflow data, not code: statuses, transitions, approval stages, required documents, form questions and notification copy all live in configuration that the screens read.",
      "Designed for Nigerian mobile networks from the start: slow, metered and often dropping out.",
    ],
    decisions: [
      {
        title: "The workflow is configuration",
        body: "A small engine evaluates the workflow config, and one screen renders every form step from it. When the client changes the process, it's an edit to one file, not a rewrite. Even the database's access rules read the same status flags.",
      },
      {
        title: "Security lives in Postgres",
        body: "Row Level Security on every table, private storage with short-lived signed URLs, and triggers that stop applicants verifying their own documents, editing signed agreement terms or promoting themselves. The audit log is append-only, even for admins.",
      },
      {
        title: "Built for bad connections",
        body: "Form drafts save to the device on every keystroke and sync in the background, so a dropped connection never loses a half-written proposal. Photos are compressed from about 4 MB to about 200 KB before upload, and nothing is downloaded until it's needed.",
      },
    ],
    outcome:
      "A complete grant-management app that ships as an Android APK and iOS build, and adapts to the client's process as it firms up without touching the screens.",
    links: [{ label: "View code on GitHub", href: "https://github.com/Ayomide716/zwcc-business" }],
  },
  {
    slug: "larshaun-party-packs",
    title: "Larshaun Party Packs",
    tagline: "A sales, inventory and reporting dashboard for a party supplies business.",
    year: "2026",
    role: "Full-stack developer",
    stack: ["React", "TypeScript", "Supabase", "Recharts", "jsPDF", "PapaParse"],
    hue: 30,
    metrics: [
      { value: "1-click", label: "PDF invoices and vouchers" },
      { value: "6", label: "workspaces: sales, stock, CRM, reports…" },
      { value: "CSV", label: "export for every record type" },
    ],
    problem:
      "The business was tracking sales, expenses and stock by hand, which made it hard to know what was actually profitable, when to reorder, and to send customers a proper invoice.",
    approach: [
      "Built a single dashboard for recording sales and expenses, with profit worked out automatically.",
      "Added inventory with low-stock reorder alerts, a simple customer list (CRM), and a reports view with charts.",
      "Made paperwork one click: branded PDF invoices and vouchers, plus CSV exports for the accountant.",
    ],
    decisions: [
      {
        title: "Documents generated in the browser",
        body: "Invoices and vouchers are rendered client-side with jsPDF and autoTable, each carrying its own reference number stored against the sale, so there's no document server to run or pay for.",
      },
      {
        title: "Numbers the owner can act on",
        body: "The dashboard leads with the financial summary and profit, and stock levels flag items to reorder, rather than burying the useful figures in tables.",
      },
    ],
    outcome:
      "The owner records a sale, sees profit and stock update straight away, and hands the customer a professional invoice on the spot.",
    links: [{ label: "View code on GitHub", href: "https://github.com/Ayomide716/larshaun-party-packs" }],
  },
  {
    slug: "amelia-hart",
    title: "Amelia Hart Story Studio",
    tagline: "A marketing site for a book marketing expert, built to turn authors into clients.",
    year: "2026",
    role: "Frontend developer",
    stack: ["React", "TypeScript", "Vite", "Tailwind CSS", "shadcn/ui", "Framer Motion"],
    hue: 330,
    metrics: [
      { value: "9", label: "services, from trailers to ghostwriting" },
      { value: "3", label: "pricing tiers, side by side" },
      { value: "15", label: "animated sections" },
    ],
    problem:
      "Amelia helps authors market their books (campaigns, Amazon optimisation, cinematic trailers, covers and ghostwriting) and needed a site that shows the work and makes it easy for an author to get in touch.",
    approach: [
      "Structured the page as a sales journey: hero, services, a four-step process, samples, success stories, testimonials, pricing, FAQ and contact.",
      "Showcased the work directly: a carousel of books she's promoted and playable cinematic trailer samples.",
      "Added scroll-triggered animation throughout with Framer Motion, plus full SEO metadata.",
    ],
    decisions: [
      {
        title: "Contact where the client already works",
        body: "Enquiries go straight to WhatsApp or email rather than through a form, because that's where Amelia replies to authors. Fewer steps for them, faster replies from her.",
      },
      {
        title: "Proof before pricing",
        body: "Samples, success stories and testimonials come before the pricing table, so authors have seen results by the time they compare packages.",
      },
    ],
    outcome:
      "A polished, fast single-page site that presents Amelia's services clearly and gives authors a one-tap way to start a conversation.",
    links: [{ label: "View code on GitHub", href: "https://github.com/Ayomide716/amelia-hart-s-story-studio" }],
  },
];

export const experience = [
  {
    company: "Independent",
    role: "Freelance Full-stack Developer",
    period: "2026 — Present",
    summary:
      "Designing and shipping web and mobile products end to end, from the database and payments to the interface: a freelance marketplace with escrow payments (NaijaHustle), a grant-management app for Zion World Christian Center, a sales and inventory dashboard for Larshaun Party Packs, and a marketing site for book marketer Amelia Hart.",
  },
];

export const skills = [
  {
    group: "Product",
    items: ["Discovery & user research", "Scoping thin slices", "Experimentation", "Analytics"],
  },
  {
    group: "Frontend",
    items: ["TypeScript", "React / Next.js", "React Native / Expo", "Tailwind CSS", "Three.js / WebGPU"],
  },
  {
    group: "Backend",
    items: ["Supabase / PostgreSQL", "Row Level Security", "Edge Functions (Deno)", "Payments (Flutterwave)", "Node.js"],
  },
  {
    group: "Platform",
    items: ["Vercel", "Expo EAS builds", "Sentry monitoring", "Vitest", "Rust → WebAssembly"],
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
