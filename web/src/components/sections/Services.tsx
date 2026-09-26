import Link from "next/link";
import { projects, services, workflow } from "@/content/site";
import { Reveal } from "@/components/Reveal";
import { ParallaxWord } from "@/components/Parallax";
import { SectionHeading } from "@/components/SectionHeading";
import { Magnetic } from "@/components/motion/Magnetic";
import { DrawRule } from "@/components/motion/DrawRule";

export function Services() {
  return (
    <section
      id="services"
      data-shape="sphere"
      data-shape-x="0.55"
      data-shape-scale="0.8"
      aria-labelledby="services-title"
      className="container-page relative isolate scroll-mt-24 overflow-x-clip py-24 md:py-36"
    >
      <ParallaxWord text="Build" className="top-10 -right-[3vw]" />
      <SectionHeading id="services-title" eyebrow="Services" title="What I can" italic="build for you." />

      <ul className="mt-14 grid gap-5 md:grid-cols-2">
        {services.map((s, i) => {
          const proof = projects.find((p) => p.slug === s.proof);
          return (
            <li key={s.title}>
              <Reveal delay={(i % 2) * 0.08} className="h-full">
                <div className="glass group relative flex h-full flex-col overflow-hidden rounded-3xl p-6 md:p-8">
                  {/* Hover: a pink wash rises from the bottom edge. */}
                  <span
                    aria-hidden
                    className="absolute inset-0 -z-10 origin-bottom scale-y-0 bg-gradient-to-t from-accent-soft to-transparent transition-transform duration-700 ease-out-expo group-hover:scale-y-100 motion-reduce:transition-none"
                  />
                  <span className="font-mono text-xs text-muted">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-6 text-2xl font-bold tracking-tight md:text-3xl">{s.title}</h3>
                  <p className="mt-3 text-fg/70">{s.body}</p>
                  <ul className="mt-6 flex flex-wrap gap-2">
                    {s.includes.map((item) => (
                      <li key={item} className="rounded-full border border-line bg-panel/60 px-3 py-1 text-xs text-fg/75">
                        {item}
                      </li>
                    ))}
                  </ul>
                  {proof && (
                    <Link
                      href={`/work/${proof.slug}`}
                      data-cursor="View"
                      data-particles={proof.title.toUpperCase()}
                      className="mt-auto inline-flex items-center gap-2 self-start pt-8 text-sm font-medium text-accent"
                    >
                      <span className="text-muted">Example:</span>
                      <span className="underline decoration-accent/30 underline-offset-4 transition-colors group-hover:decoration-accent">
                        {proof.title}
                      </span>
                      <span aria-hidden className="transition-transform duration-500 ease-out-expo group-hover:translate-x-1">
                        →
                      </span>
                    </Link>
                  )}
                </div>
              </Reveal>
            </li>
          );
        })}
      </ul>

      <Reveal className="mt-24">
        <h3 className="font-mono text-xs tracking-widest text-accent uppercase">How we&apos;d work together</h3>
      </Reveal>
      <ol className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {workflow.map((step, i) => (
          <li key={step.title}>
            <Reveal delay={i * 0.08} className="group relative border-t border-line pt-6">
              {/* The accent rule fills in when the step comes into view. */}
              <DrawRule delay={0.3 + i * 0.08} className="absolute -top-px left-0 w-full" />
              <p className="font-display text-5xl font-bold tracking-tight text-accent/25 transition-colors duration-500 group-hover:text-accent">
                0{i + 1}
              </p>
              <p className="mt-4 text-xl font-semibold tracking-tight">{step.title}</p>
              <p className="mt-2 text-fg/70">{step.body}</p>
            </Reveal>
          </li>
        ))}
      </ol>

      <Reveal className="mt-16 flex flex-wrap items-center gap-5">
        <Magnetic>
          <Link
            href="/#contact"
            data-cursor="Say hi"
            className="group inline-flex h-14 items-center gap-3 rounded-full bg-accent px-7 font-medium text-on-accent shadow-[0_18px_40px_-18px] shadow-accent transition-transform duration-300 ease-out-expo hover:scale-[1.03]"
          >
            Start a project
            <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </Link>
        </Magnetic>
        <p className="max-w-sm text-sm text-muted">Tell me what you need and I&apos;ll reply with a plan and a fixed quote.</p>
      </Reveal>
    </section>
  );
}
