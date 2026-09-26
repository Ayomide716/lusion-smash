import type { Metadata } from "next";
import { experience, projects, site, skills } from "@/content/site";
import { PrintButton } from "@/components/PrintButton";

export const metadata: Metadata = {
  title: "Résumé",
  description: `Résumé of ${site.name}, ${site.role}.`,
};

export default function CV() {
  return (
    <div className="container-page pt-32 pb-24 print:p-0">
      <div className="mx-auto max-w-3xl rounded-3xl bg-[#f7f7f5] p-8 text-[#15161a] shadow-2xl md:p-14 print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-black/10 pb-8">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">{site.name}</h1>
            <p className="mt-1 text-lg text-black/60">{site.role}</p>
          </div>
          <div className="text-right text-sm text-black/70">
            <p>{site.email}</p>
            <p>{site.location}</p>
            <p>{site.url.replace(/^https?:\/\//, "")}</p>
          </div>
        </header>

        <section className="mt-8">
          <h2 className="font-mono text-xs tracking-widest text-black/50 uppercase">Summary</h2>
          <p className="mt-3">{site.pitch}</p>
        </section>

        <section className="mt-8">
          <h2 className="font-mono text-xs tracking-widest text-black/50 uppercase">Experience</h2>
          <ul className="mt-4 space-y-5">
            {experience.map((job) => (
              <li key={job.company}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold">
                    {job.role}, {job.company}
                  </h3>
                  <span className="font-mono text-xs text-black/50">{job.period}</span>
                </div>
                <p className="mt-1 text-black/75">{job.summary}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="font-mono text-xs tracking-widest text-black/50 uppercase">Selected projects</h2>
          <ul className="mt-4 space-y-3">
            {projects.map((p) => (
              <li key={p.slug}>
                <span className="font-semibold">{p.title}</span> — {p.tagline}{" "}
                <span className="text-black/55">
                  ({p.metrics[0].value} {p.metrics[0].label})
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="font-mono text-xs tracking-widest text-black/50 uppercase">Skills</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            {skills.map((s) => (
              <div key={s.group}>
                <dt className="font-semibold">{s.group}</dt>
                <dd className="text-black/75">{s.items.join(" · ")}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
      <div className="mt-6 flex justify-center print:hidden">
        <PrintButton />
      </div>
    </div>
  );
}
