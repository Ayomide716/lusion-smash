import { principles, site, skills } from "@/content/site";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";

export function About() {
  return (
    <section
      id="about"
      data-shape="knot"
      data-shape-x="-0.5"
      data-shape-scale="0.9"
      aria-labelledby="about-title"
      className="container-page scroll-mt-24 py-24 md:py-36"
    >
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

      <ul className="mt-20 grid gap-5 md:grid-cols-3">
        {principles.map((p, i) => (
          <li key={p.title}>
            <Reveal delay={i * 0.08} className="glass h-full rounded-3xl p-6 md:p-8">
              <span className="font-mono text-xs text-accent">0{i + 1}</span>
              <h3 className="mt-6 text-xl font-semibold tracking-tight">{p.title}</h3>
              <p className="mt-3 text-fg/70">{p.body}</p>
            </Reveal>
          </li>
        ))}
      </ul>

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
