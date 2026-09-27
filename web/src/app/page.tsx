import { Hero } from "@/components/sections/Hero";
import { Statement } from "@/components/sections/Statement";
import { Work } from "@/components/sections/Work";
import { Services } from "@/components/sections/Services";
import { Testimonials } from "@/components/sections/Testimonials";
import { About } from "@/components/sections/About";
import { Experience } from "@/components/sections/Experience";
import { Contact } from "@/components/sections/Contact";

export default function Home() {
  return (
    <>
      <Hero />
      <Statement />
      <Work />
      <Testimonials />
      <Services />
      <About />
      <Experience />
      <Contact />
    </>
  );
}
