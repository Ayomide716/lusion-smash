import type { MetadataRoute } from "next";
import { projects, site } from "@/content/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/how-it-works", "/cv", ...projects.map((p) => `/work/${p.slug}`)];
  return routes.map((path) => ({ url: `${site.url}${path}`, changeFrequency: "monthly", priority: path ? 0.7 : 1 }));
}
