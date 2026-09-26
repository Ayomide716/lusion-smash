import { projects } from "@/content/site";
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
    </section>
  );
}
