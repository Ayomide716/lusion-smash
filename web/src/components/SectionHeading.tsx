import { Reveal } from "@/components/Reveal";

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
    <Reveal>
      <p className="font-mono text-xs tracking-widest text-accent uppercase">{eyebrow}</p>
      <h2 id={id} className="mt-4 max-w-3xl text-4xl leading-[1.02] font-semibold tracking-[-0.03em] text-balance md:text-6xl">
        {title}
        {italic && (
          <>
            {" "}
            <span className="font-serif font-normal italic text-fg/80">{italic}</span>
          </>
        )}
      </h2>
    </Reveal>
  );
}
