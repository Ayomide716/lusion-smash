import Link from "next/link";
import { site } from "@/content/site";

export function Footer() {
  return (
    <footer className="container-page print:hidden border-t border-line py-10 text-sm text-muted">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <p>
          © {new Date().getFullYear()} {site.name}. Built with Next.js, WebGPU, TSL, Rust and C++.
        </p>
        <ul className="flex flex-wrap gap-5">
          {site.socials.map((s) => (
            <li key={s.label}>
              <a href={s.href} target="_blank" rel="noreferrer" className="transition-colors hover:text-fg">
                {s.label}
              </a>
            </li>
          ))}
          <li>
            <Link href="/how-it-works" className="transition-colors hover:text-fg">
              How this site works
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}
