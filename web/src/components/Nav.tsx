"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { site } from "@/content/site";
import { ScrollProgress } from "@/components/motion/ScrollProgress";
import { SoundToggle } from "@/components/SoundToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MobileMenu } from "@/components/MobileMenu";
import { LiveCount } from "@/components/LiveCount";

const links = [
  { href: "/#work", label: "Work" },
  { href: "/#services", label: "Services" },
  { href: "/#about", label: "About" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/#contact", label: "Contact" },
];

/** Which nav link is "here": the home-page section crossing the middle of the screen, or the current page. */
function useActiveLink() {
  const pathname = usePathname();
  const [section, setSection] = useState<string | null>(null);

  useEffect(() => {
    if (pathname !== "/") return;
    const ids = links.filter((l) => l.href.startsWith("/#")).map((l) => l.href.slice(2));
    const els = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    const visible = new Set<string>();
    // A thin band across the middle of the viewport: the section under it is the current one.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        }
        setSection(ids.find((id) => visible.has(id)) ?? null);
      },
      { rootMargin: "-45% 0px -54% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  if (pathname === "/") return section ? `/#${section}` : null;
  return links.find((l) => !l.href.startsWith("/#") && pathname.startsWith(l.href))?.href ?? null;
}

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const active = useActiveLink();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      data-scrolled={scrolled}
      className="fixed inset-x-0 top-0 z-50 border-b border-transparent bg-panel/40 backdrop-blur-md backdrop-saturate-150 transition-[background-color,border-color,backdrop-filter] duration-500 data-[scrolled=true]:border-line data-[scrolled=true]:bg-panel/70 data-[scrolled=true]:backdrop-blur-xl print:hidden"
    >
      <nav aria-label="Primary" className="container-page flex h-16 items-center justify-between gap-4 md:h-18">
        <Link href="/" className="flex items-center gap-2.5 font-display text-base font-semibold tracking-tight">
          <span aria-hidden className="size-2.5 rounded-full bg-accent shadow-[0_0_14px] shadow-pink" />
          {site.shortName}
        </Link>
        <ul className="hidden items-center gap-1 text-sm font-medium md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active === l.href ? "location" : undefined}
                data-particles={l.label.toUpperCase()}
                className="group relative isolate block overflow-hidden rounded-full px-3.5 py-2 text-fg/70 transition-colors duration-200 hover:text-fg aria-[current]:text-fg"
              >
                {/* The "you are here" pill glides between links as you scroll. */}
                {active === l.href && (
                  <motion.span
                    layoutId="nav-active"
                    aria-hidden
                    className="absolute inset-0 -z-10 rounded-full bg-accent/12 ring-1 ring-accent/25"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                {/* Text roll: the label slides up and an accent copy slides in beneath it. */}
                <span className="block transition-transform duration-500 ease-out-expo group-hover:-translate-y-full motion-reduce:transition-none">
                  {l.label}
                </span>
                <span
                  aria-hidden
                  className="absolute inset-x-3.5 top-full block py-2 text-accent transition-transform duration-500 ease-out-expo group-hover:-translate-y-full motion-reduce:transition-none"
                >
                  {l.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <LiveCount className="hidden lg:inline-flex" />
          <SoundToggle />
          <ThemeToggle />
          <Link
            href="/cv"
            className="hidden h-10 items-center rounded-full bg-fg px-5 text-sm font-medium text-canvas transition-transform duration-300 ease-out-expo hover:scale-[1.04] md:flex"
          >
            Résumé
          </Link>
          <MobileMenu links={links} />
        </div>
      </nav>
      <ScrollProgress />
    </header>
  );
}
