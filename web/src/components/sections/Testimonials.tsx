import Link from "next/link";
import { testimonials } from "@/content/site";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";

export function Testimonials() {
  return (
    <section
      id="testimonials"
      data-shape="sphere"
      data-shape-x="-0.55"
      data-shape-scale="0.7"
      aria-labelledby="testimonials-title"
      className="container-page relative isolate scroll-mt-24 overflow-x-clip py-24 md:py-32"
    >
      <SectionHeading id="testimonials-title" eyebrow="Kind words" title="What clients" italic="say." />
      <div className="mt-12 grid gap-5">
        {testimonials.map((t) => (
          <Reveal key={t.name}>
            <figure className="glass relative overflow-hidden rounded-3xl p-8 md:p-12">
              <span
                aria-hidden
                className="pointer-events-none absolute top-6 left-6 font-display text-[7rem] leading-[0.75] text-accent/25 select-none md:top-8 md:left-10 md:text-[9rem]"
              >
                “
              </span>
              <blockquote className="relative mt-14 max-w-4xl md:mt-16 font-display text-2xl leading-snug font-medium tracking-tight text-balance md:text-4xl">
                {t.quote}
              </blockquote>
              <figcaption className="relative mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="font-semibold text-fg">{t.name}</span>
                <span aria-hidden className="h-px w-6 bg-accent" />
                <Link
                  href={`/work/${t.project}`}
                  data-cursor="View"
                  className="text-accent underline decoration-accent/30 underline-offset-4 hover:decoration-accent"
                >
                  {t.context}
                </Link>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
