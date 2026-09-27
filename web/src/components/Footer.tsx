import Link from "next/link";
import { site } from "@/content/site";
import { LocalTime } from "@/components/motion/LocalTime";
import { LagosWeather } from "@/components/LagosWeather";
import { LiveCount } from "@/components/LiveCount";
import { Magnetic } from "@/components/motion/Magnetic";
import { Wordmark } from "@/components/motion/Wordmark";

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-line pt-16 text-sm text-muted print:hidden">
      <div className="container-page flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
        <div className="grid grid-cols-2 gap-x-12 gap-y-6 sm:grid-cols-3">
          <div>
            <p className="font-mono text-[11px] tracking-widest uppercase">Local time</p>
            <p className="mt-2 text-base text-fg">
              <LocalTime timeZone="Africa/Lagos" /> <span className="text-muted">WAT</span>
            </p>
            <LagosWeather className="mt-1 block text-muted" />
          </div>
          <div>
            <p className="font-mono text-[11px] tracking-widest uppercase">Status</p>
            <p className="mt-2 flex items-center gap-2 text-base text-fg">
              <span aria-hidden className="size-2 rounded-full bg-accent" />
              {site.availability}
            </p>
            <LiveCount className="-ml-3 mt-1" />
          </div>
          <div>
            <p className="font-mono text-[11px] tracking-widest uppercase">Elsewhere</p>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-base text-fg">
              {site.socials.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noreferrer" className="underline decoration-accent/0 underline-offset-4 transition-colors hover:decoration-accent">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <Magnetic strength={0.35}>
          <Link
            href="#main"
            data-cursor="Top"
            className="flex size-24 items-center justify-center rounded-full bg-fg text-center text-xs font-medium text-canvas transition-colors duration-300 hover:bg-accent"
          >
            Back to top ↑
          </Link>
        </Magnetic>
      </div>

      <div className="mt-16 px-3 text-fg md:mt-24">
        <Wordmark text={site.name} />
      </div>

      <div className="container-page flex flex-col gap-2 border-t border-line py-6 text-xs sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} {site.name}</p>
        <p>
          Built with Next.js, WebGL/WebGPU, TSL, Rust and C++ ·{" "}
          <Link href="/how-it-works" className="text-fg underline decoration-accent/40 underline-offset-4 hover:decoration-accent">
            How this site works
          </Link>
        </p>
      </div>
    </footer>
  );
}
