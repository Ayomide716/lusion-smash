"use client";

import dynamic from "next/dynamic";

// The GPU scene is client-only and loaded after the page is interactive,
// so the text content never waits on three.js.
const SceneCanvas = dynamic(() => import("./SceneCanvas"), { ssr: false });

export function SceneRoot() {
  return (
    <>
      <div aria-hidden className="scene-fallback pointer-events-none fixed inset-0 -z-20 print:hidden" />
      <SceneCanvas />
    </>
  );
}
