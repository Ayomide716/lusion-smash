import { Marquee } from "@/components/motion/Marquee";
import { ScrollHighlight } from "@/components/motion/ScrollHighlight";

const disciplines = ["Product engineering", "Full-stack", "TypeScript", "React Native", "Supabase", "Payments", "Rust → WASM", "WebGPU"];

/** Velocity marquee band followed by a statement that lights up word by word on scroll. */
export function Statement() {
  return (
    <section aria-label="What I do" data-shape="initials" data-shape-x="0.38" data-shape-y="0.22" data-shape-scale="0.95" className="relative py-16 md:py-28">
      <Marquee className="border-y border-line bg-panel/50 py-5 backdrop-blur-sm md:py-7" speed={60}>
        {disciplines.map((d) => (
          <span key={d} className="flex items-center font-display text-4xl font-bold tracking-[-0.03em] whitespace-nowrap md:text-7xl">
            <span className="px-6 md:px-10">{d}</span>
            <svg aria-hidden viewBox="0 0 24 24" className="size-6 shrink-0 fill-accent md:size-10">
              <path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z" />
            </svg>
          </span>
        ))}
      </Marquee>

      <div className="container-page mt-20 md:mt-32">
        <ScrollHighlight
          className="max-w-5xl font-display text-3xl leading-[1.15] font-semibold tracking-[-0.03em] text-balance md:text-6xl"
          text="I build products that *feel* fast, *look* considered and actually *move* the numbers — from the first customer interview to the last pixel."
        />
      </div>
    </section>
  );
}
