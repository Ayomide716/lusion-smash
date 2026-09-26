import Image from "next/image";
import type { Project } from "@/content/site";

/**
 * A project's visual: its screenshot in a phone frame, or, when there's no
 * screenshot yet but the project is live, a browser frame showing the address.
 */
export function ProjectVisual({ project, size }: { project: Project; size: "card" | "hero" }) {
  const hero = size === "hero";

  if (project.image) {
    const { src, alt, width, height, backdrop } = project.image;
    // The frame takes the screenshot's own shape so nothing is cropped; a
    // non-phone-shaped image (a square splash) sits whole on its backdrop.
    const aspect = backdrop ? 9 / 17 : width / height;
    return (
      <div
        style={{ aspectRatio: aspect, background: backdrop }}
        className={`relative overflow-hidden border-fg bg-fg shadow-[0_30px_80px_-30px_rgb(10_10_11/0.5)] ${
          hero ? "w-full max-w-[20rem] rounded-[2.5rem] border-[6px]" : "w-full rounded-[1.4rem] border-[4px]"
        }`}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes={hero ? "(min-width: 768px) 320px, 70vw" : "(min-width: 768px) 180px, 40vw"}
          className={backdrop ? "object-contain" : "object-cover object-top"}
          priority={hero}
        />
        {/* Speaker notch */}
        <span aria-hidden className="absolute top-2 left-1/2 h-1.5 w-12 -translate-x-1/2 rounded-full bg-fg" />
      </div>
    );
  }

  if (project.live) {
    const host = project.live.replace(/^https?:\/\//, "");
    return (
      <div
        className={`overflow-hidden rounded-2xl border border-line bg-panel shadow-[0_30px_80px_-30px_rgb(10_10_11/0.35)] ${
          hero ? "w-full max-w-xl" : "w-full"
        }`}
      >
        <div className="flex items-center gap-1.5 border-b border-line px-3 py-2.5">
          {[0, 1, 2].map((i) => (
            <span key={i} aria-hidden className="size-2 rounded-full bg-fg/15" />
          ))}
          <span className="ml-2 truncate rounded-full bg-fg/5 px-3 py-1 font-mono text-[10px] text-muted">{host}</span>
        </div>
        <div
          className={`relative flex flex-col items-start justify-end gap-3 p-5 ${hero ? "aspect-[16/10] md:p-8" : "aspect-[4/3]"}`}
          style={{ background: `radial-gradient(80% 90% at 85% 10%, hsl(${project.hue} 90% 60% / 0.28), transparent 70%)` }}
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold tracking-widest text-on-accent uppercase">
            <span aria-hidden className="size-1.5 rounded-full bg-on-accent motion-safe:animate-pulse" />
            Live
          </span>
          <span className={`font-display leading-none font-bold tracking-[-0.04em] ${hero ? "text-5xl md:text-6xl" : "text-3xl"}`}>
            {project.title}
          </span>
        </div>
      </div>
    );
  }

  return null;
}
