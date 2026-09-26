import Link from "next/link";

export default function NotFound() {
  return (
    <section data-shape="galaxy" className="container-page flex min-h-dvh flex-col items-start justify-center py-32">
      <p className="font-mono text-xs tracking-widest text-accent uppercase">404</p>
      <h1 className="mt-4 text-5xl font-semibold tracking-tight md:text-7xl">
        Lost in the <span className="text-accent">particles.</span>
      </h1>
      <Link
        href="/"
        className="mt-10 inline-flex h-12 items-center rounded-full bg-fg px-6 text-sm font-medium text-canvas transition-transform duration-300 hover:scale-[1.03]"
      >
        Back home
      </Link>
    </section>
  );
}
