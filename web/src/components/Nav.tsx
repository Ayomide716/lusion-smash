import Link from "next/link";
import { site } from "@/content/site";

const links = [
  { href: "/#work", label: "Work" },
  { href: "/#about", label: "About" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/#contact", label: "Contact" },
];

export function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 print:hidden">
      <nav
        aria-label="Primary"
        className="container-page mt-4 flex items-center justify-between gap-4"
      >
        <Link
          href="/"
          className="glass flex h-11 items-center gap-2.5 rounded-full px-4 text-sm font-medium tracking-tight"
        >
          <span aria-hidden className="size-2 rounded-full bg-accent shadow-[0_0_12px] shadow-accent" />
          {site.shortName}
        </Link>
        <ul className="glass hidden h-11 items-center gap-1 rounded-full px-1.5 text-sm md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="rounded-full px-3.5 py-2 text-fg/75 transition-colors hover:bg-white/8 hover:text-fg"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/#contact"
          className="flex h-11 items-center rounded-full bg-accent px-5 text-sm font-medium text-accent-ink transition-transform duration-300 ease-out-expo hover:scale-[1.04] md:hidden"
        >
          Contact
        </Link>
        <Link
          href="/cv"
          className="hidden h-11 items-center rounded-full bg-accent px-5 text-sm font-medium text-accent-ink transition-transform duration-300 ease-out-expo hover:scale-[1.04] md:flex"
        >
          Résumé
        </Link>
      </nav>
    </header>
  );
}
