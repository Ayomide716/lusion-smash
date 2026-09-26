import { ImageResponse } from "next/og";
import { site } from "@/content/site";

export const alt = `${site.name} — ${site.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: 80,
          color: "#0a0a0b",
          background:
            "radial-gradient(55% 60% at 78% 30%, rgba(236,72,153,0.35), transparent 70%), radial-gradient(45% 50% at 15% 85%, rgba(249,168,212,0.45), transparent 70%), #ffffff",
        }}
      >
        <div style={{ fontSize: 28, color: "#db2777", letterSpacing: 4, textTransform: "uppercase" }}>{site.role}</div>
        <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -4, marginTop: 16 }}>{site.name}</div>
        <div style={{ fontSize: 32, opacity: 0.75, marginTop: 20, maxWidth: 900 }}>{site.pitch}</div>
      </div>
    ),
    size,
  );
}
