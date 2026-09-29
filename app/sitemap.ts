import type { MetadataRoute } from "next";
import { categories, products } from "@/data/products";
import { productPath } from "@/lib/catalog";
import { absoluteUrl } from "@/lib/site";

const publicPaths = [...new Set([
  "/",
  "/support",
  "/privacy-policy",
  "/faq",
  "/tutorial",
  ...categories.map(category => `/creations/${category.id}`),
  ...products.map(productPath),
])];

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPaths.flatMap(path => {
    const url = absoluteUrl(path);
    return url ? [{ url }] : [];
  });
}
