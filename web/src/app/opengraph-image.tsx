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
          color: "#e8eaf0",
          background:
            "radial-gradient(60% 60% at 75% 30%, rgba(122,240,214,0.35), transparent 70%), radial-gradient(50% 50% at 20% 80%, rgba(155,110,255,0.3), transparent 70%), #05060a",
        }}
      >
        <div style={{ fontSize: 28, color: "#7af0d6", letterSpacing: 4, textTransform: "uppercase" }}>{site.role}</div>
        <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -4, marginTop: 16 }}>{site.name}</div>
        <div style={{ fontSize: 32, opacity: 0.75, marginTop: 20, maxWidth: 900 }}>{site.pitch}</div>
      </div>
    ),
    size,
  );
}
