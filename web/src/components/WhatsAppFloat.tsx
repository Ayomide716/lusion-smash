"use client";

import { useEffect, useState } from "react";
import { site } from "@/content/site";
import { ChatIcon } from "@/components/ChatIcon";
import { useOnline } from "@/components/ReplyTime";

/**
 * Phones only: a WhatsApp button that slides in once you scroll past the hero,
 * and steps aside when the Contact section (which has its own) is on screen.
 */
export function WhatsAppFloat() {
  const [show, setShow] = useState(false);
  const online = useOnline();

  useEffect(() => {
    let pastHero = false;
    let atContact = false;
    const update = () => setShow(pastHero && !atContact);
    const onScroll = () => {
      pastHero = window.scrollY > window.innerHeight * 0.6;
      update();
    };
    const contact = document.getElementById("contact");
    const io = contact
      ? new IntersectionObserver(([e]) => {
          atContact = e.isIntersecting;
          update();
        })
      : null;
    if (contact) io?.observe(contact);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      io?.disconnect();
    };
  }, []);

  return (
    <a
      href={site.whatsapp.href}
      target="_blank"
      rel="noreferrer"
      aria-hidden={!show}
      tabIndex={show ? undefined : -1}
      className={`fixed right-4 bottom-4 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-accent pr-5 pl-4 text-sm font-medium text-on-accent shadow-[0_18px_40px_-14px_rgb(219_39_119/0.8)] transition-[translate,opacity] duration-500 ease-out-expo md:hidden print:hidden ${
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-24 opacity-0"
      }`}
    >
      <span className="relative">
        <ChatIcon />
        {online && (
          <span aria-label="Online now" className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-400 ring-2 ring-accent" />
        )}
      </span>
      Chat on WhatsApp
    </a>
  );
}
