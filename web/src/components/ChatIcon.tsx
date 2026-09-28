/** Speech bubble with a phone, for WhatsApp links. */
export function ChatIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M12 3.5a8.5 8.5 0 0 0-7.36 12.75L3.5 20.5l4.37-1.12A8.5 8.5 0 1 0 12 3.5Z" />
      <path d="M9.2 8.6c.2-.4.5-.4.7-.4h.5c.2 0 .4 0 .5.4l.6 1.5c.1.2 0 .4-.1.6l-.5.6c.6 1.1 1.5 2 2.6 2.6l.6-.5c.2-.1.4-.2.6-.1l1.5.6c.3.1.4.3.4.5v.5c0 .2 0 .5-.4.7-.5.3-1.2.5-1.9.3-2.4-.6-4.6-2.8-5.2-5.2-.2-.7 0-1.4.1-1.9Z" fill="currentColor" stroke="none" />
    </svg>
  );
}
