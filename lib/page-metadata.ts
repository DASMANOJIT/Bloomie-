import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site";

export const createPageMetadata = (title: string, description: string, path: string): Metadata => {
  const canonical = absoluteUrl(path);
  const image = absoluteUrl("/images/crochet-bouquet.png");

  return {
    title,
    description,
    alternates: canonical ? { canonical } : undefined,
    openGraph: { title, description, type: "website", ...(canonical ? { url: canonical } : {}), images: image ? [{ url: image, alt: "Bloomie handmade crochet flower bouquet" }] : undefined },
    twitter: { card: "summary_large_image", title, description, images: image ? [image] : undefined },
  };
};
