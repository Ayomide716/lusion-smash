import Link from "next/link";
import { site } from "@/content/site";
import { Reveal } from "@/components/Reveal";

export function Hero() {
  return (
    <section
      data-shape="initials"
      data-shape-x="0.38"
      data-shape-y="0.22"
      data-shape-scale="0.95"
      aria-labelledby="hero-title"
      className="container-page relative flex min-h-dvh flex-col justify-end pb-16 pt-32 md:pb-24"
    >
      <Reveal>
        <p className="glass mb-8 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs text-fg/80">
          <span className="relative flex size-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-accent/70 motion-reduce:hidden" />
            <span className="relative size-2 rounded-full bg-accent" />
          </span>
          {site.availability}
        </p>
      </Reveal>

      <Reveal delay={0.08}>
        <h1 id="hero-title" className="max-w-4xl text-5xl leading-[0.95] font-semibold tracking-[-0.04em] sm:text-7xl lg:text-8xl">
          {site.name}
        </h1>
      </Reveal>

      <Reveal delay={0.16}>
        <p className="mt-6 max-w-xl text-lg text-balance text-fg/75 md:text-xl">
          <span className="font-serif text-2xl text-fg italic md:text-3xl">{site.role}.</span>{" "}
          {site.pitch}
        </p>
      </Reveal>

      <Reveal delay={0.24} className="mt-10 flex flex-wrap items-center gap-3">
        <Link
          href="/#work"
          className="group inline-flex h-12 items-center gap-2 rounded-full bg-fg px-6 text-sm font-medium text-ink transition-transform duration-300 ease-out-expo hover:scale-[1.03]"
        >
          See selected work
          <span aria-hidden className="transition-transform duration-300 group-hover:translate-y-0.5">↓</span>
        </Link>
        <Link
          href="/#contact"
          className="glass inline-flex h-12 items-center rounded-full px-6 text-sm font-medium transition-colors hover:bg-white/10"
        >
          Get in touch
        </Link>
      </Reveal>

      <p aria-hidden className="absolute right-5 bottom-8 hidden font-mono text-[11px] tracking-widest text-muted uppercase md:right-10 md:block">
        Move your cursor · Scroll to morph
      </p>
    </section>
  );
}
