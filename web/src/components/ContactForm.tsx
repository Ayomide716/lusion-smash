"use client";

import { useActionState } from "react";
import { sendMessage, type ContactState } from "@/app/actions/contact";

const initial: ContactState = { status: "idle" };

const inputClass =
  "mt-2 w-full rounded-2xl border border-line bg-panel/80 px-4 py-3 text-fg placeholder:text-muted/60 transition-colors outline-none focus:border-accent/70 focus:bg-panel aria-[invalid=true]:border-rose-500/70";

export function ContactForm() {
  const [state, action, pending] = useActionState(sendMessage, initial);
  const fields = state.status === "error" ? state.fields : undefined;

  if (state.status === "success") {
    return (
      <div role="status" className="flex min-h-80 flex-col items-center justify-center text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-accent text-2xl text-on-accent">✓</span>
        <h3 className="mt-6 text-2xl font-semibold">Message sent.</h3>
        <p className="mt-2 text-fg/70">Thanks for reaching out — I&apos;ll reply within two working days.</p>
      </div>
    );
  }

  return (
    <form action={action} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm text-fg/80">
          Name
          <input
            name="name"
            autoComplete="name"
            required
            aria-invalid={!!fields?.name}
            aria-describedby={fields?.name ? "name-error" : undefined}
            className={inputClass}
            placeholder="Ada Lovelace"
          />
          {fields?.name && <span id="name-error" className="mt-1.5 block text-rose-600">{fields.name}</span>}
        </label>
        <label className="block text-sm text-fg/80">
          Email
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
          {fields?.email && <span id="email-error" className="mt-1.5 block text-rose-600">{fields.email}</span>}
        </label>
      </div>
      <label className="block text-sm text-fg/80">
        What are you building?
        <textarea
          name="message"
          rows={5}
          required
          aria-invalid={!!fields?.message}
          aria-describedby={fields?.message ? "message-error" : undefined}
          className={`${inputClass} resize-y`}
          placeholder="Tell me about the role, the product or the problem."
        />
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
