import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryPage } from "@/components/catalog-pages";
import { BreadcrumbSchema } from "@/components/structured-data";
import { categories, products } from "@/data/products";
import { categoryDetails, getCategory } from "@/lib/catalog";
import { createPageMetadata } from "@/lib/page-metadata";

export function generateStaticParams() {
  return categories.map(category => ({ category: category.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const category = getCategory((await params).category);
  if (!category) return {};
  const detail = categoryDetails[category];
  return createPageMetadata(`${detail.title} | Bloomie`, detail.description, `/creations/${category}`);
}

export default async function CreationCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const category = getCategory((await params).category);
  if (!category) notFound();
  const detail = categoryDetails[category];
  return <><BreadcrumbSchema title={detail.title} path={`/creations/${category}`} /><CategoryPage category={category} products={products.filter(product => product.category === category)} /></>;
}
