import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductPage } from "@/components/catalog-pages";
import { BreadcrumbSchema } from "@/components/structured-data";
import { products } from "@/data/products";
import { categoryDetails, getCategory, getProduct, productSlug } from "@/lib/catalog";
import { createPageMetadata } from "@/lib/page-metadata";

export const dynamicParams = false;

export function generateStaticParams() {
  return products.map(product => ({ category: product.category, product: productSlug(product) }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string; product: string }> }): Promise<Metadata> {
  const { category, product: slug } = await params;
  const product = getProduct(category, slug);
  if (!product) return {};
  return createPageMetadata(`${product.name} | Bloomie`, `${product.name}: a Bloomie handmade crochet creation. Ask on WhatsApp about colours, customisation, availability, and delivery details.`, `/creations/${product.category}/${slug}`);
}

export default async function ProductDetailPage({ params }: { params: Promise<{ category: string; product: string }> }) {
  const { category, product: slug } = await params;
  const product = getProduct(category, slug);
  const validCategory = getCategory(category);
  if (!product || !validCategory) notFound();
  return <><BreadcrumbSchema title={product.name} path={`/creations/${product.category}/${slug}`} parent={{ title: categoryDetails[validCategory].title, path: `/creations/${validCategory}` }} /><ProductPage product={product} /></>;
}
