import { testimonials } from "@/content/site";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { TestimonialDeck } from "@/components/TestimonialDeck";

export function Testimonials() {
  return (
    <section
      id="testimonials"
      data-shape="sphere"
      data-shape-x="-0.55"
      data-shape-scale="0.7"
      aria-labelledby="testimonials-title"
      className="container-page relative isolate scroll-mt-24 overflow-x-clip py-24 md:py-32"
    >
      <SectionHeading id="testimonials-title" eyebrow="Kind words" title="What clients" italic="say." />
      <Reveal className="mt-12">
        <TestimonialDeck items={testimonials} />
      </Reveal>
    </section>
  );
}
