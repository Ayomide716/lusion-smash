"use client";

import { useEffect, useState } from "react";

/** Live clock in a given time zone. Renders nothing on the server to avoid a hydration mismatch. */
export function LocalTime({ timeZone, className }: { timeZone: string; className?: string }) {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const tick = () => setNow(fmt.format(new Date()));
    const id = window.setInterval(tick, 1000);
    const first = window.setTimeout(tick, 0);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(first);
    };
  }, [timeZone]);
  return <span className={`tabular-nums ${className ?? ""}`}>{now ?? "--:--:--"}</span>;
}
