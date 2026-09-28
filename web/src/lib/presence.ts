// Client for the presence service (services/presence): shares this visitor's
// cursor (viewport coordinates only) and receives everyone else's, plus a live
// count. Optional: without NEXT_PUBLIC_PRESENCE_URL, or if the server is down,
// nothing is shown and nothing breaks.

import { sceneState } from "@/lib/scene-store";

const BASE = process.env.NEXT_PUBLIC_PRESENCE_URL?.replace(/\/$/, "");
const SEND_EVERY_MS = 80;
/** Without any movement, scrolling or typing for this long, you stop counting as "here". */
const IDLE_MS = 3 * 60_000;
const MAX_PEERS = 12;

export type Peer = {
  /** Latest position from the server (NDC). */
  tx: number;
  ty: number;
  /** Smoothed position drawn on screen (NDC); advanced by the scene each frame. */
  x: number;
  y: number;
  seen: number;
};

/** Other visitors' cursors by id. Read and smoothed by the scene loop. */
export const peers = new Map<number, Peer>();

let count = 0;
/** "off": not configured; "connecting": trying (or the server is waking); "live": connected. */
let status: "off" | "connecting" | "live" = BASE ? "connecting" : "off";
const listeners = new Set<() => void>();

export function getPresenceCount() {
  return count;
}

export function getPresenceStatus() {
  return status;
}

function setStatus(next: typeof status) {
  if (next === status) return;
  status = next;
  listeners.forEach((l) => l());
}

export function subscribePresence(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function setCount(n: number) {
  if (n === count) return;
  count = n;
  listeners.forEach((l) => l());
}

function socketUrl() {
  if (!BASE) return null;
  try {
    const url = new URL("/ws", BASE);
    url.protocol = url.protocol === "http:" ? "ws:" : "wss:";
    return url.toString();
  } catch {
    return null;
  }
}

function onMessage(data: unknown) {
  if (typeof data !== "string" || data.length > 4096) return;
  let msg: { n?: unknown; p?: unknown };
  try {
    msg = JSON.parse(data);
  } catch {
    return;
  }
  if (typeof msg.n === "number" && Number.isFinite(msg.n)) setCount(Math.max(0, Math.floor(msg.n)));
  if (!Array.isArray(msg.p)) return;
  const now = performance.now();
  const live = new Set<number>();
  for (const entry of msg.p.slice(0, MAX_PEERS)) {
    if (!Array.isArray(entry) || entry.length !== 3 || !entry.every((v) => typeof v === "number" && Number.isFinite(v))) continue;
    const [id, x, y] = entry as [number, number, number];
    const tx = Math.max(-1, Math.min(1, x));
    const ty = Math.max(-1, Math.min(1, y));
    live.add(id);
    const peer = peers.get(id);
    if (peer) Object.assign(peer, { tx, ty, seen: now });
    else peers.set(id, { tx, ty, x: tx, y: ty, seen: now });
  }
  for (const id of peers.keys()) if (!live.has(id)) peers.delete(id);
}

let started = false;

/** Connect (and keep reconnecting with backoff while the tab is visible). */
export function startPresence() {
  const url = socketUrl();
  if (started || !url || typeof window === "undefined" || !("WebSocket" in window)) return;
  started = true;

  let socket: WebSocket | null = null;
  let away = false;
  let lastActive = Date.now();
  let retry = 2000;
  let retryTimer = 0;
  let sendTimer = 0;
  let last = "";

  const send = () => {
    if (socket?.readyState !== WebSocket.OPEN) return;
    const p = sceneState.pointer;
    const msg = p.active ? JSON.stringify({ x: +p.x.toFixed(3), y: +p.y.toFixed(3) }) : '{"x":null}';
    if (msg !== last) {
      socket.send(msg);
      last = msg;
    }
  };

  const connect = () => {
    window.clearTimeout(retryTimer);
    if (document.hidden || away || socket) return;
    const ws = new WebSocket(url);
    socket = ws;
    ws.onopen = () => {
      setStatus("live");
      retry = 2000;
      last = "";
      sendTimer = window.setInterval(send, SEND_EVERY_MS);
    };
    ws.onmessage = (e) => onMessage(e.data);
    ws.onclose = () => {
      window.clearInterval(sendTimer);
      socket = null;
      peers.clear();
      setCount(0);
      setStatus("connecting");
      // Closed on purpose (tab hidden or idle): reconnect on return, not on a timer.
      if (document.hidden || away) return;
      // A sleeping free server takes a while to wake; back off up to a minute.
      retryTimer = window.setTimeout(connect, retry);
      retry = Math.min(retry * 2, 60_000);
    };
  };

  // Don't hold a connection (or count as "here") while the tab is in the background.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) socket?.close();
    else {
      lastActive = Date.now();
      away = false;
      retry = 2000;
      connect();
    }
  });

  // A tab left open on an unattended screen shouldn't count as someone here.
  const activity = () => {
    lastActive = Date.now();
    if (away) {
      away = false;
      retry = 2000;
      connect();
    }
  };
  for (const type of ["pointermove", "pointerdown", "keydown", "scroll", "wheel"] as const) {
    window.addEventListener(type, activity, { passive: true });
  }
  window.setInterval(() => {
    if (!away && Date.now() - lastActive > IDLE_MS) {
      away = true;
      socket?.close();
    }
  }, 15_000);

  connect();
}
