"use server";

import { headers } from "next/headers";
import { site } from "@/content/site";

export type ContactState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string; fields?: Partial<Record<"name" | "email" | "message", string>> };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 3;

// Best-effort per-instance limiter. Serverless instances don't share memory,
// so this blunts bursts rather than guaranteeing a global limit.
const hits = new Map<string, number[]>();

function rateLimited(key: string) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > MAX_PER_WINDOW;
}

export async function sendMessage(_prev: ContactState, form: FormData): Promise<ContactState> {
  // Honeypot: real users never see or fill this field.
  if (String(form.get("company") ?? "").length > 0) return { status: "success" };

  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const message = String(form.get("message") ?? "").trim();

  const fields: NonNullable<Extract<ContactState, { status: "error" }>["fields"]> = {};
  if (name.length < 2 || name.length > 100) fields.name = "Please enter your name.";
  if (!EMAIL.test(email) || email.length > 200) fields.email = "Please enter a valid email address.";
  if (message.length < 10 || message.length > 5000) fields.message = "Please write at least a sentence (10+ characters).";
  if (Object.keys(fields).length > 0) {
    return { status: "error", message: "A couple of fields need another look.", fields };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) {
    return { status: "error", message: "Too many messages — please try again in a few minutes." };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL ?? site.email;
  if (!apiKey) {
    console.info("[contact] RESEND_API_KEY not set; message logged instead of sent", { name, email });
    return { status: "success" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.CONTACT_FROM_EMAIL ?? "Portfolio <onboarding@resend.dev>",
      to: [to],
      reply_to: email,
      subject: `New message from ${name}`,
      text: `${message}\n\n— ${name} <${email}>`,
    }),
  });

  if (!res.ok) {
    console.error("[contact] Resend failed", res.status, await res.text());
    return { status: "error", message: `Something went wrong sending that. You can email me directly at ${site.email}.` };
  }
  return { status: "success" };
}
