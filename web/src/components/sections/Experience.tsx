import Link from "next/link";
import { experience } from "@/content/site";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";

export function Experience() {
  return (
    <section
      id="experience"
      data-shape="knot"
      data-shape-x="0.5"
      data-shape-scale="0.75"
      aria-labelledby="experience-title"
      className="container-page scroll-mt-24 py-24 md:py-36"
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading id="experience-title" eyebrow="Experience" title="Where I've" italic="done the work." />
        <Reveal>
          <Link
            href="/cv"
            className="glass inline-flex h-12 items-center gap-2 rounded-full px-6 text-sm font-medium transition-colors hover:bg-white/10"
          >
            View full résumé <span aria-hidden>↗</span>
          </Link>
        </Reveal>
      </div>

      <ol className="mt-14 max-w-3xl border-l border-line">
        {experience.map((job, i) => (
          <li key={job.company} className="relative pb-12 pl-8 last:pb-0">
            <span
              aria-hidden
              className="absolute top-2 -left-[5px] size-2.5 rounded-full border border-accent bg-ink"
            />
            <Reveal delay={i * 0.06}>
              <p className="font-mono text-xs text-muted">{job.period}</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight">
                {job.role} <span className="font-serif font-normal text-fg/70 italic">at {job.company}</span>
              </h3>
              <p className="mt-3 text-fg/70">{job.summary}</p>
            </Reveal>
          </li>
        ))}
      </ol>
    </section>
  );
}
