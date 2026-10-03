"use client";

import { useEffect, useRef, useState } from "react";
import { site } from "@/content/site";
import { say } from "@/lib/say";

/** The email address, plus a button that copies it (and the particles say so). */
export function CopyEmail() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(site.email);
    } catch {
      return; // clipboard blocked: the mailto link still works
    }
    setCopied(true);
    say("COPIED ✓", 2500);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2200);
  };

  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
      <a href={`mailto:${site.email}`} data-cursor="Email" className="break-all underline decoration-current/40 underline-offset-4 hover:decoration-current">
        {site.email}
      </a>
      <button
        type="button"
        onClick={copy}
        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-current/25 px-3 text-xs font-medium transition-colors hover:border-current/60"
      >
        {copied ? "Copied ✓" : "Copy"}
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? "Email address copied" : ""}
      </span>
    </span>
  );
}
