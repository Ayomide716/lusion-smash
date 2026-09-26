import { Reveal } from "@/components/Reveal";
import { Parallax } from "@/components/Parallax";
import { SplitReveal } from "@/components/motion/SplitReveal";

export function SectionHeading({
  id,
  eyebrow,
  title,
  italic,
}: {
  id: string;
  eyebrow: string;
  title: string;
  italic?: string;
}) {
  return (
    <Parallax speed={0.12}>
      <Reveal>
        <p className="flex items-center gap-3 font-mono text-xs tracking-widest text-accent uppercase">
          <span aria-hidden className="h-px w-8 bg-accent" />
          {eyebrow}
        </p>
      </Reveal>
      <h2 id={id} className="mt-4 max-w-3xl text-4xl leading-[1.02] font-bold tracking-[-0.04em] text-balance md:text-6xl">
        <SplitReveal text={title} />
        {italic && (
          <>
            {" "}
            <SplitReveal text={italic} className="text-accent" delay={title.split(" ").length * 0.06} />
          </>
        )}
      </h2>
    </Parallax>
  );
}
