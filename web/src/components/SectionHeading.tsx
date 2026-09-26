import { Reveal } from "@/components/Reveal";
import { Parallax } from "@/components/Parallax";

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
      <p className="font-mono text-xs tracking-widest text-accent uppercase">{eyebrow}</p>
      <h2 id={id} className="mt-4 max-w-3xl text-4xl leading-[1.02] font-bold tracking-[-0.04em] text-balance md:text-6xl">
        {title}
        {italic && (
          <>
            {" "}
            <span className="text-accent">{italic}</span>
          </>
        )}
      </h2>
    </Reveal>
    </Parallax>
  );
}
