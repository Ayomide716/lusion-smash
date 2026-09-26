import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { projects, site } from "@/content/site";

export const alt = "Case study";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

/** Share card for a case study: title and tagline beside the project's screenshot. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug) ?? projects[0];
  const image = project.image;
  const screenshot = image
    ? `data:image/jpeg;base64,${await readFile(join(process.cwd(), "public", image.src), "base64")}`
    : null;

  // Phone frame: the screenshot's own shape, or 9:17 around a centred square.
  const frameH = 540;
  const frameW = image && !image.backdrop ? Math.round((frameH * image.width) / image.height) : Math.round((frameH * 9) / 17);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 80px",
          color: "#0a0a0b",
          background: `radial-gradient(50% 70% at 82% 50%, hsla(${project.hue}, 90%, 60%, 0.28), transparent 70%), radial-gradient(45% 50% at 10% 90%, rgba(249,168,212,0.45), transparent 70%), #ffffff`,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: screenshot ? 640 : 1040 }}>
          <div style={{ fontSize: 24, color: "#db2777", letterSpacing: 4, textTransform: "uppercase" }}>Case study</div>
          <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -3, lineHeight: 1, marginTop: 18 }}>{project.title}</div>
          <div style={{ fontSize: 30, opacity: 0.72, marginTop: 24, lineHeight: 1.3 }}>{project.tagline}</div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 48, fontSize: 24 }}>
            <div style={{ width: 14, height: 14, borderRadius: 7, background: "#db2777", marginRight: 14 }} />
            {site.name}
            {project.live && <span style={{ opacity: 0.55, marginLeft: 16 }}>· {project.live.replace(/^https?:\/\//, "")}</span>}
          </div>
        </div>
        {screenshot && image && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: frameW + 20,
              height: frameH + 20,
              padding: 10,
              borderRadius: 44,
              background: "#0a0a0b",
              boxShadow: "0 40px 80px -30px rgba(219,39,119,0.55)",
              transform: "rotate(-4deg)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: frameW,
                height: frameH,
                borderRadius: 34,
                overflow: "hidden",
                background: image.backdrop ?? "#ffffff",
              }}
            >
              <img
                src={screenshot}
                alt=""
                width={frameW}
                height={image.backdrop ? Math.round((frameW * image.height) / image.width) : frameH}
              />
            </div>
          </div>
        )}
      </div>
    ),
    size,
  );
}
