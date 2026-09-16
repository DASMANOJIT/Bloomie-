import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const isPreview = process.env.VERCEL_ENV === "preview" || process.env.SITE_ENV === "preview";
  if (isPreview) return { rules: { userAgent: "*", disallow: "/" } };

  const sitemap = absoluteUrl("/sitemap.xml");
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    ...(sitemap ? { sitemap } : {}),
  };
}
