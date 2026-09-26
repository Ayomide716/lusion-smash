import { projects } from "@/content/site";
import { ProjectCard } from "@/components/ProjectCard";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";

export function Work() {
  return (
    <section
      id="work"
      data-shape="sphere"
      data-shape-x="0.45"
      data-shape-scale="0.85"
      aria-labelledby="work-title"
      className="container-page scroll-mt-24 py-24 md:py-36"
    >
      <SectionHeading id="work-title" eyebrow="Selected work" title="Products I've shipped" italic="end to end." />
      <ul className="mt-14 grid gap-5 md:grid-cols-2">
        {projects.map((p, i) => (
          <li key={p.slug}>
            <Reveal delay={(i % 2) * 0.08} className="h-full">
              <ProjectCard project={p} index={i} />
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
