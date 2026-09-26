import { site } from "@/content/site";
import { ContactForm } from "@/components/ContactForm";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";

export function Contact() {
  return (
    <section
      id="contact"
      data-shape="galaxy"
      data-shape-scale="1.15"
      aria-labelledby="contact-title"
      className="container-page scroll-mt-24 py-24 md:py-36"
    >
      <div className="grid gap-12 lg:grid-cols-2">
        <div>
          <SectionHeading id="contact-title" eyebrow="Contact" title="Have a product to build?" italic="Let's talk." />
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-md text-lg text-fg/70">
              I&apos;m currently looking for full-time product engineering roles. The fastest way to reach me is this
              form, or email.
            </p>
            <dl className="mt-10 space-y-5 text-sm">
              <div>
                <dt className="font-mono text-xs tracking-widest text-muted uppercase">Email</dt>
                <dd className="mt-1 text-lg">
                  <a href={`mailto:${site.email}`} className="underline decoration-accent/50 underline-offset-4 hover:decoration-accent">
                    {site.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="font-mono text-xs tracking-widest text-muted uppercase">Based in</dt>
                <dd className="mt-1 text-lg">{site.location}</dd>
              </div>
            </dl>
          </Reveal>
        </div>
        <Reveal delay={0.15} className="glass relative rounded-3xl p-6 md:p-8">
          <ContactForm />
        </Reveal>
      </div>
    </section>
  );
}
