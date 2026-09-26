import type { Metadata, Viewport } from "next";
import { Archivo, Space_Grotesk } from "next/font/google";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { SceneRoot } from "@/components/scene/SceneRoot";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Intro, introInitScript } from "@/components/Intro";
import { Cursor } from "@/components/motion/Cursor";
import { Analytics } from "@vercel/analytics/next";
import { services, site } from "@/content/site";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

// ui-ux-pro-max "Minimalist Portfolio" pairing. next/font self-hosts both and
// generates size-adjusted fallbacks, so text doesn't jump when they load.
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"], display: "swap" });
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} — ${site.role}`, template: `%s — ${site.name}` },
  description: site.pitch,
  authors: [{ name: site.name }],
  openGraph: {
    type: "website",
    siteName: site.name,
    title: `${site.name} — ${site.role}`,
    description: site.pitch,
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

// Structured data so search engines can show the name, role and services properly.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": `${site.url}/#person`,
      name: site.name,
      jobTitle: "Freelance Full-stack Developer",
      description: site.pitch,
      url: site.url,
      email: `mailto:${site.email}`,
      address: { "@type": "PostalAddress", addressLocality: "Lagos", addressCountry: "NG" },
      knowsAbout: ["React", "Next.js", "TypeScript", "React Native", "Supabase", "PostgreSQL", "Payments integration"],
      sameAs: site.socials.map((s) => s.href),
    },
    {
      "@type": "ProfessionalService",
      "@id": `${site.url}/#service`,
      name: `${site.name} — Freelance Full-stack Development`,
      url: site.url,
      founder: { "@id": `${site.url}/#person` },
      areaServed: "Worldwide",
      address: { "@type": "PostalAddress", addressLocality: "Lagos", addressCountry: "NG" },
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Services",
        itemListElement: services.map((s) => ({
          "@type": "Offer",
          itemOffered: { "@type": "Service", name: s.title, description: s.body },
        })),
      },
    },
    { "@type": "WebSite", "@id": `${site.url}/#website`, url: site.url, name: site.name, publisher: { "@id": `${site.url}/#person` } },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${archivo.variable} antialiased`}
    >
      <head>
        {/* Apply a saved theme before first paint (no flash of the wrong theme). */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: introInitScript }} />
      </head>
      <body className="min-h-dvh">
        <a
          href="#main"
          className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-accent focus:translate-y-0"
        >
          Skip to content
        </a>
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important}.intro-curtain{display:none}`}</style>
        </noscript>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
        <Intro />
        <SceneRoot />
        <SmoothScroll />
        <Nav />
        <main id="main">{children}</main>
        <Footer />
        <Cursor />
        {/* Vercel serves the analytics script; elsewhere it would 404. */}
        {process.env.NEXT_PUBLIC_VERCEL_ENV && <Analytics />}
      </body>
    </html>
  );
}
