import Link from "next/link";
import { experience } from "@/content/site";
import { Reveal } from "@/components/Reveal";
import { ParallaxWord } from "@/components/Parallax";
import { ScrollLine } from "@/components/motion/ScrollLine";
import { SectionHeading } from "@/components/SectionHeading";

export function Experience() {
  return (
    <section
      id="experience"
      data-shape="knot"
      data-shape-x="0.5"
      data-shape-scale="0.75"
      aria-labelledby="experience-title"
      className="container-page relative isolate scroll-mt-24 overflow-x-clip py-24 md:py-36"
    >
      <ParallaxWord text="Craft" className="top-24 -right-[4vw]" />
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading id="experience-title" eyebrow="Experience" title="Where I've" italic="done the work." />
        <Reveal>
          <Link
            href="/cv"
            className="glass inline-flex h-12 items-center gap-2 rounded-full px-6 text-sm font-medium transition-colors hover:bg-black/5"
          >
            View full résumé <span aria-hidden>↗</span>
          </Link>
        </Reveal>
      </div>

      <ScrollLine className="mt-14 max-w-3xl">
      <ol>
        {experience.map((job, i) => (
          <li key={job.company} className="group relative isolate mb-4 py-5 pl-8 last:mb-0">
            {/* Hover: a soft pink panel wipes in from the left and the row nudges right. */}
            <span
              aria-hidden
              className="absolute inset-y-0 right-0 left-4 -z-10 origin-left scale-x-0 rounded-2xl bg-accent-soft transition-transform duration-500 ease-out-expo group-hover:scale-x-100 motion-reduce:transition-none"
            />
            <span
              aria-hidden
              className="absolute top-7 -left-[4.5px] size-2.5 rounded-full border border-accent bg-canvas transition-colors duration-300 group-hover:bg-accent"
            />
            <Reveal delay={i * 0.06} className="transition-transform duration-500 ease-out-expo group-hover:translate-x-3 motion-reduce:transition-none">
              <p className="font-mono text-xs text-muted">{job.period}</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight">
                {job.role} <span className="font-normal text-muted">at {job.company}</span>
              </h3>
              <p className="mt-3 text-fg/70">{job.summary}</p>
            </Reveal>
          </li>
        ))}
      </ol>
      </ScrollLine>
    </section>
  );
}
