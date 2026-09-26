import { site } from "@/content/site";
import { ContactForm } from "@/components/ContactForm";
import { Reveal } from "@/components/Reveal";
import { ParallaxWord } from "@/components/Parallax";
import { SectionHeading } from "@/components/SectionHeading";
import { CircleReveal } from "@/components/motion/CircleReveal";

export function Contact() {
  return (
    <section
      id="contact"
      data-shape="galaxy"
      data-shape-scale="1.15"
      aria-labelledby="contact-title"
      className="relative isolate scroll-mt-24 overflow-x-clip"
    >
      <CircleReveal className="py-24 md:py-40">
      <div className="container-page relative grid gap-12 lg:grid-cols-2">
        <ParallaxWord text="Hello" className="-bottom-24 -left-[2vw] opacity-60 [&_span]:[-webkit-text-stroke-color:rgb(255_255_255/0.35)]" />
        <div>
          <SectionHeading id="contact-title" eyebrow="Contact" title="Have a product to build?" italic="Let's talk." inverse />
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-md text-lg opacity-80">
              I&apos;m currently looking for full-time product engineering roles. The fastest way to reach me is this
              form, or email.
            </p>
            <dl className="mt-10 space-y-5 text-sm">
              <div>
                <dt className="font-mono text-xs tracking-widest uppercase opacity-70">Email</dt>
                <dd className="mt-1 text-lg">
                  <a href={`mailto:${site.email}`} data-cursor="Email" className="underline decoration-current/40 underline-offset-4 hover:decoration-current">
                    {site.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="font-mono text-xs tracking-widest uppercase opacity-70">Based in</dt>
                <dd className="mt-1 text-lg">{site.location}</dd>
              </div>
            </dl>
          </Reveal>
        </div>
        <Reveal delay={0.15} className="relative rounded-3xl bg-white/90 p-6 text-fg shadow-[0_40px_120px_-40px_rgb(80_7_36/0.55)] backdrop-blur-xl md:p-8">
          <ContactForm />
        </Reveal>
      </div>
      </CircleReveal>
    </section>
  );
}
