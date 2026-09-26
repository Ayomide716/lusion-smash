"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { site } from "@/content/site";
import { ScrollProgress } from "@/components/motion/ScrollProgress";

const links = [
  { href: "/#work", label: "Work" },
  { href: "/#about", label: "About" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/#contact", label: "Contact" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      data-scrolled={scrolled}
      className="fixed inset-x-0 top-0 z-50 border-b border-transparent bg-white/40 backdrop-blur-md backdrop-saturate-150 transition-[background-color,border-color,backdrop-filter] duration-500 data-[scrolled=true]:border-line data-[scrolled=true]:bg-white/70 data-[scrolled=true]:backdrop-blur-xl print:hidden"
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
                className="group relative block overflow-hidden rounded-full px-3.5 py-2 text-fg/70 transition-colors duration-200 hover:text-fg"
              >
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
        <Link
          href="/#contact"
          className="flex h-10 items-center rounded-full bg-accent px-5 text-sm font-medium text-on-accent transition-transform duration-300 ease-out-expo hover:scale-[1.04] md:hidden"
        >
          Contact
        </Link>
        <Link
          href="/cv"
          className="hidden h-10 items-center rounded-full bg-fg px-5 text-sm font-medium text-canvas transition-transform duration-300 ease-out-expo hover:scale-[1.04] md:flex"
        >
          Résumé
        </Link>
      </nav>
      <ScrollProgress />
    </header>
  );
}
