import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Bump when page content changes meaningfully.
const UPDATED = "2026-10-25";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, lastModified: UPDATED, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/how-to-play`, lastModified: UPDATED, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/combos`, lastModified: UPDATED, changeFrequency: "monthly", priority: 0.7 },
  ];
}
