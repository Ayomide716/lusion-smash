"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { site } from "@/content/site";

const EASE = [0.76, 0, 0.24, 1] as const;

/** Full-screen menu for small screens: pink panel wipes down, links rise in a stagger. */
export function MobileMenu({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  // Only portal after hydration (the server has no document.body to portal into).
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!open) return;
    const toggle = button.current;
    const root = document.documentElement;
    root.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", key);
    return () => {
      root.style.overflow = "";
      window.removeEventListener("keydown", key);
      toggle?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((o) => !o)}
        className="relative flex size-11 flex-col items-center justify-center gap-1.5 rounded-full bg-fg md:hidden"
      >
        <span className={`h-[2px] w-5 rounded bg-canvas transition-transform duration-300 ${open ? "translate-y-[4px] rotate-45" : ""}`} />
        <span className={`h-[2px] w-5 rounded bg-canvas transition-transform duration-300 ${open ? "-translate-y-[4px] -rotate-45" : ""}`} />
      </button>

      {/* Portalled to <body>: the nav's backdrop-filter would otherwise trap this fixed
          overlay inside the header. It sits under the header (z-40) so the toggle stays on top. */}
      {mounted &&
        createPortal(
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed inset-0 z-40 flex flex-col justify-between bg-accent px-6 pt-28 pb-10 text-on-accent md:hidden"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <nav aria-label="Mobile">
              <ul className="space-y-1">
                {[...links, { href: "/cv", label: "Résumé" }].map((l, i) => (
                  <li key={l.href} className="overflow-hidden">
                    <motion.div
                      initial={{ y: "110%" }}
                      animate={{ y: "0%" }}
                      exit={{ y: "110%" }}
                      transition={{ duration: 0.7, delay: 0.15 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <Link
                        href={l.href}
                        onClick={() => setOpen(false)}
                        className="flex items-baseline gap-3 font-display text-5xl font-bold tracking-[-0.04em]"
                      >
                        <span className="font-mono text-xs font-normal tracking-widest text-on-accent/60">0{i + 1}</span>
                        {l.label}
                      </Link>
                    </motion.div>
                  </li>
                ))}
              </ul>
            </nav>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
              className="space-y-3 text-sm"
            >
              <a href={`mailto:${site.email}`} className="block text-lg underline underline-offset-4">
                {site.email}
              </a>
              <ul className="flex gap-5 text-on-accent/80">
                {site.socials.map((s) => (
                  <li key={s.label}>
                    <a href={s.href} target="_blank" rel="noreferrer">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
