"use client";

import { useActionState, useEffect } from "react";
import { motion } from "motion/react";
import { sendMessage, type ContactState } from "@/app/actions/contact";
import { sceneState } from "@/lib/scene-store";
import { say, unsay } from "@/lib/say";

const initial: ContactState = { status: "idle" };

// Floating labels: the label sits inside the empty field and glides up to the
// top edge on focus or once filled; the example text only fades in on focus.
const inputClass =
  "peer w-full rounded-2xl border border-line bg-panel/80 px-4 pt-6 pb-2.5 text-base text-fg placeholder:text-transparent transition-colors outline-none focus:border-accent/70 focus:bg-panel focus:placeholder:text-muted/60 aria-[invalid=true]:border-rose-500/70";
const labelClass =
  "pointer-events-none absolute top-4 left-4 origin-left text-fg/60 transition-all duration-300 ease-out-expo peer-focus:-translate-y-2.5 peer-focus:scale-[0.78] peer-focus:text-accent peer-[:not(:placeholder-shown)]:-translate-y-2.5 peer-[:not(:placeholder-shown)]:scale-[0.78]";

/** Sent: a check that draws itself, and the particles say thank you. */
function Sent() {
  useEffect(() => {
    unsay();
    say("THANK YOU ✦", 4500);
    Object.assign(sceneState.shock, { x: 0, y: 0, age: 0, power: 1.5 });
  }, []);
  return (
    <div role="status" className="flex min-h-80 flex-col items-center justify-center text-center">
      <motion.span
        className="flex size-16 items-center justify-center rounded-full bg-accent text-on-accent"
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 16 }}
      >
        <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.25, duration: 0.5, ease: "easeOut" }} />
        </svg>
      </motion.span>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
        <h3 className="mt-6 text-2xl font-semibold">Message sent.</h3>
        <p className="mt-2 text-fg/70">Thanks for reaching out — I&apos;ll reply within two working days.</p>
      </motion.div>
    </div>
  );
}

export function ContactForm() {
  const [state, action, pending] = useActionState(sendMessage, initial);
  const fields = state.status === "error" ? state.fields : undefined;

  if (state.status === "success") return <Sent />;

  return (
    <form action={action} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="relative block text-sm">
          <input
            name="name"
            autoComplete="name"
            required
            aria-invalid={!!fields?.name}
            aria-describedby={fields?.name ? "name-error" : undefined}
            className={inputClass}
            placeholder="Ada Lovelace"
          />
          <span className={labelClass}>Name</span>
          {fields?.name && <span id="name-error" className="mt-1.5 block text-rose-600">{fields.name}</span>}
        </label>
        <label className="relative block text-sm">
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={!!fields?.email}
            aria-describedby={fields?.email ? "email-error" : undefined}
            className={inputClass}
            placeholder="ada@company.com"
          />
          <span className={labelClass}>Email</span>
          {fields?.email && <span id="email-error" className="mt-1.5 block text-rose-600">{fields.email}</span>}
        </label>
      </div>
      <label className="relative block text-sm">
        <textarea
          name="message"
          rows={5}
          required
          aria-invalid={!!fields?.message}
          aria-describedby={fields?.message ? "message-error" : undefined}
          className={`${inputClass} resize-y`}
          placeholder="Tell me about the role, the product or the problem."
        />
        <span className={labelClass}>What are you building?</span>
        {fields?.message && <span id="message-error" className="mt-1.5 block text-rose-600">{fields.message}</span>}
      </label>
      <div aria-hidden className="absolute -left-[9999px]">
        <label>
          Company <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p role="alert" className="text-sm text-rose-600">
          {state.status === "error" ? state.message : ""}
        </p>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-7 text-sm font-medium text-on-accent transition-all duration-300 ease-out-expo hover:scale-[1.03] disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send message"}
          <span aria-hidden>→</span>
        </button>
      </div>
    </form>
  );
}
