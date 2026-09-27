import { moreWork, projects } from "@/content/site";
import { Reveal } from "@/components/Reveal";
import { ParallaxWord } from "@/components/Parallax";
import { SectionHeading } from "@/components/SectionHeading";
import { WorkGallery } from "@/components/WorkGallery";

export function Work() {
  return (
    <section
      id="work"
      data-shape="sphere"
      data-shape-x="0.45"
      data-shape-scale="0.85"
      aria-labelledby="work-title"
      className="relative isolate scroll-mt-24 overflow-x-clip pt-24 pb-12 md:pt-36"
    >
      <div className="container-page relative">
        <ParallaxWord text="Work" className="-top-4 -right-[4vw]" />
        <SectionHeading id="work-title" eyebrow="Selected work" title="Products I've shipped" italic="end to end." />
      </div>
      <WorkGallery projects={projects} />

      <div id="more-work" className="container-page mt-16 md:mt-24">
        <Reveal>
          <p className="flex items-center gap-3 font-mono text-xs tracking-widest text-accent uppercase">
            <span aria-hidden className="h-px w-8 bg-accent" />
            More sites
          </p>
        </Reveal>
        <ul className="mt-6 border-t border-line">
          {moreWork.map((w, i) => (
            <li key={w.url}>
              <Reveal delay={i * 0.06}>
                <a
                  href={w.url}
                  target="_blank"
                  rel="noreferrer"
                  data-cursor="Open"
                  data-particles={w.title.toUpperCase()}
                  className="group relative isolate flex flex-col gap-2 border-b border-line py-6 md:flex-row md:items-center md:gap-8 md:py-8"
                >
                  {/* Hover: a soft pink wash wipes in and the row nudges right. */}
                  <span
                    aria-hidden
                    className="absolute inset-0 -z-10 origin-left scale-x-0 rounded-2xl bg-accent-soft/70 transition-transform duration-500 ease-out-expo group-hover:scale-x-100 motion-reduce:transition-none"
                  />
                  <span className="font-display text-3xl font-bold tracking-tight transition-transform duration-500 ease-out-expo group-hover:translate-x-3 md:w-2/5 md:text-4xl">
                    {w.title}
                  </span>
                  <span className="flex-1 text-fg/70">
                    <span className="block text-sm font-medium text-fg">{w.kind}</span>
                    {w.note}
                  </span>
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-accent md:pr-4">
                    {w.url.replace(/^https?:\/\//, "")}
                    <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                      ↗
                    </span>
                  </span>
                </a>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
