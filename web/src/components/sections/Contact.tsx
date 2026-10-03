import { site } from "@/content/site";
import { ContactForm } from "@/components/ContactForm";
import { Reveal } from "@/components/Reveal";
import { ParallaxWord } from "@/components/Parallax";
import { SectionHeading } from "@/components/SectionHeading";
import { CircleReveal } from "@/components/motion/CircleReveal";
import { Magnetic } from "@/components/motion/Magnetic";
import { ChatIcon } from "@/components/ChatIcon";
import { CopyEmail } from "@/components/CopyEmail";


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
              I&apos;m available for freelance projects and open to full-time roles. The fastest way to reach me is
              WhatsApp, or use the form or email.
            </p>
            <Magnetic className="mt-8">
              <a
                href={site.whatsapp.href}
                target="_blank"
                rel="noreferrer"
                data-cursor="Chat"
                className="group inline-flex h-14 items-center gap-3 rounded-full bg-canvas px-7 font-medium text-fg shadow-[0_18px_40px_-18px_rgb(80_7_36/0.6)] transition-transform duration-300 ease-out-expo hover:scale-[1.03]"
              >
                <span className="text-accent">
                  <ChatIcon />
                </span>
                Chat on WhatsApp
                <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  ↗
                </span>
              </a>
            </Magnetic>
            <dl className="mt-10 space-y-5 text-sm">
              <div>
                <dt className="font-mono text-xs tracking-widest uppercase opacity-70">Email</dt>
                <dd className="mt-1 text-lg">
                  <CopyEmail />
                </dd>
              </div>
              <div>
                <dt className="font-mono text-xs tracking-widest uppercase opacity-70">WhatsApp</dt>
                <dd className="mt-1 text-lg">
                  <a href={site.whatsapp.href} target="_blank" rel="noreferrer" data-cursor="Chat" className="underline decoration-current/40 underline-offset-4 hover:decoration-current">
                    {site.whatsapp.display}
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
        <Reveal delay={0.15} className="relative rounded-3xl bg-panel/90 p-6 text-fg shadow-[0_40px_120px_-40px_rgb(80_7_36/0.55)] backdrop-blur-xl md:p-8">
          <ContactForm />
        </Reveal>
      </div>
      </CircleReveal>
    </section>
  );
}
