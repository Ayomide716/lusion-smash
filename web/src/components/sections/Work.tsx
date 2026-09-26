import { projects } from "@/content/site";
import { ProjectCard } from "@/components/ProjectCard";
import { Reveal } from "@/components/Reveal";
import { Parallax, ParallaxWord } from "@/components/Parallax";
import { SectionHeading } from "@/components/SectionHeading";

export function Work() {
  return (
    <section
      id="work"
      data-shape="sphere"
      data-shape-x="0.45"
      data-shape-scale="0.85"
      aria-labelledby="work-title"
      className="container-page relative isolate scroll-mt-24 overflow-x-clip py-24 md:py-36"
    >
      <ParallaxWord text="Work" className="-top-4 -right-[4vw]" />
      <SectionHeading id="work-title" eyebrow="Selected work" title="Products I've shipped" italic="end to end." />
      <ul className="mt-14 grid gap-5 md:grid-cols-2">
        {projects.map((p, i) => (
          <li key={p.slug} className={i % 2 ? "md:mt-24" : undefined}>
            <Parallax speed={i % 2 ? 0.22 : 0.08} className="h-full">
              <Reveal delay={(i % 2) * 0.08} className="h-full">
                <ProjectCard project={p} index={i} />
              </Reveal>
            </Parallax>
          </li>
        ))}
      </ul>
    </section>
  );
}
