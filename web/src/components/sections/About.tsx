import { principles, site, skills } from "@/content/site";
import { Reveal } from "@/components/Reveal";
import { ParallaxWord } from "@/components/Parallax";
import { StackCards } from "@/components/motion/StackCards";
import { SectionHeading } from "@/components/SectionHeading";

export function About() {
  return (
    <section
      id="about"
      data-shape="knot"
      data-shape-x="-0.5"
      data-shape-scale="0.9"
      aria-labelledby="about-title"
      className="container-page relative isolate scroll-mt-24 overflow-x-clip py-24 md:py-36"
    >
      <ParallaxWord text="About" className="top-16 -left-[3vw]" />
      <div className="grid gap-14 md:grid-cols-12">
        <div className="md:col-span-7 md:col-start-6">
          <SectionHeading id="about-title" eyebrow="About" title="Engineer by trade," italic="product person by habit." />
          <Reveal delay={0.1}>
            <div className="mt-8 space-y-5 text-lg text-fg/75">
              <p>
                I&apos;m {site.shortName}, a full-stack engineer who cares about the whole product: why it exists,
                how it feels, and whether it actually moved the numbers it was built to move.
              </p>
              <p>
                I&apos;m happiest working in small teams where I can go from a customer conversation to a shipped
                feature in the same week, and I like leaving codebases simpler than I found them.
              </p>
            </div>
          </Reveal>
        </div>
      </div>

      <StackCards items={principles} />

      <Reveal className="glass mt-5 grid gap-8 rounded-3xl p-6 sm:grid-cols-2 md:p-8 lg:grid-cols-4">
        {skills.map((s) => (
          <div key={s.group}>
            <h3 className="font-mono text-xs tracking-widest text-muted uppercase">{s.group}</h3>
            <ul className="mt-4 space-y-2 text-fg/85">
              {s.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </Reveal>
    </section>
  );
}
