import { Reveal } from "@/components/Reveal";
import { Parallax } from "@/components/Parallax";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { ScrambleText } from "@/components/motion/ScrambleText";

export function SectionHeading({
  id,
  eyebrow,
  title,
  italic,
  inverse = false,
}: {
  id: string;
  eyebrow: string;
  title: string;
  italic?: string;
  /** On a coloured background: inherit the text colour instead of using the accent. */
  inverse?: boolean;
}) {
  const accent = inverse ? "underline decoration-current/35 decoration-[0.08em] underline-offset-[0.12em]" : "text-accent";
  return (
    <Parallax speed={0.12}>
      <Reveal>
        <p className={`flex items-center gap-3 font-mono text-xs tracking-widest uppercase ${inverse ? "opacity-80" : "text-accent"}`}>
          <span aria-hidden className={`h-px w-8 ${inverse ? "bg-current" : "bg-accent"}`} />
          <ScrambleText text={eyebrow} />
        </p>
      </Reveal>
      <h2 id={id} className="mt-4 max-w-3xl text-4xl leading-[1.02] font-bold tracking-[-0.04em] text-balance md:text-6xl">
        <SplitReveal text={title} />
        {italic && (
          <>
            {" "}
            <SplitReveal text={italic} className={accent} delay={title.split(" ").length * 0.06} />
          </>
        )}
      </h2>
    </Parallax>
  );
}
