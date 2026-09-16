import Image from "next/image";
import Link from "next/link";
import type { Product, ProductCategory } from "@/data/products";
import { categories } from "@/data/products";
import { categoryDetails, getProductDescription, productPath } from "@/lib/catalog";
import { InfoPageHeader } from "@/components/info-page";
import { SiteFooter } from "@/components/site-footer";

const whatsappUrl = "https://wa.me/917439792042";

const enquiryUrl = (product?: Product) => {
  const text = product
    ? `Hello Bloomie, I would like to ask about ${product.name} (${product.productNumber}).`
    : "Hello Bloomie, I would like to ask about a Bloomie crochet creation.";
  return `${whatsappUrl}?text=${encodeURIComponent(text)}`;
};

function CatalogBreadcrumbs({ category, product }: { category: ProductCategory; product?: Product }) {
  return <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/#home">Home</Link><span aria-hidden="true">/</span><Link href={`/creations/${category}`}>{categoryDetails[category].title}</Link>{product && <><span aria-hidden="true">/</span><span aria-current="page">{product.name}</span></>}</nav>;
}

function CategoryLinks({ current }: { current: ProductCategory }) {
  return <nav className="catalog-categories" aria-label="Browse crochet categories">{categories.map(category => <Link key={category.id} href={`/creations/${category.id}`} aria-current={current === category.id ? "page" : undefined}>{category.label}</Link>)}</nav>;
}

export function CategoryPage({ category, products }: { category: ProductCategory; products: Product[] }) {
  const detail = categoryDetails[category];
  return <><InfoPageHeader /><main className="catalog-page"><div className="catalog-inner"><CatalogBreadcrumbs category={category} /><header className="catalog-intro"><span className="eyebrow">Bloomie creations</span><h1>{detail.title}</h1><p>{detail.intro}</p></header><CategoryLinks current={category} /><section className="catalog-products" aria-label={detail.title}>{products.map(product => <article className="catalog-card" key={product.id}><Link className="catalog-image" href={productPath(product)}><Image src={product.thumbnail} alt={product.images[0]?.alt || product.name} fill sizes="(max-width: 700px) 100vw, (max-width: 1000px) 50vw, 33vw" /></Link><div className="catalog-card-copy"><span className="tag">{product.productNumber}</span><h2><Link href={productPath(product)}>{product.name}</Link></h2><p>{getProductDescription(product)}</p><Link className="text-link" href={productPath(product)}>View creation</Link></div></article>)}</section><p className="catalog-help">Need help deciding? Read the <Link href="/faq">Bloomie FAQ</Link> or <Link href="/support">contact support</Link>.</p></div></main><SiteFooter /></>;
}

export function ProductPage({ product }: { product: Product }) {
  const detail = categoryDetails[product.category];
  return <><InfoPageHeader /><main className="catalog-page"><div className="catalog-inner"><CatalogBreadcrumbs category={product.category} product={product} /><article className="product-page"><div className="product-page-image"><Image src={product.thumbnail} alt={product.images[0]?.alt || product.name} fill priority sizes="(max-width: 800px) 100vw, 50vw" /></div><div className="product-page-copy"><span className="eyebrow">{product.productNumber}</span><h1>{product.name}</h1><p>{getProductDescription(product)}</p><dl><div><dt>Colours shown</dt><dd>{product.variants.map(variant => variant.label).join(", ")}</dd></div><div><dt>Preparation estimate</dt><dd>{product.preparationTime}. Delivery timing is confirmed separately before ordering.</dd></div><div><dt>Customisation</dt><dd>{product.customisation}</dd></div></dl><a className="button whatsapp" href={enquiryUrl(product)} target="_blank" rel="noopener noreferrer">Ask about this creation</a><p className="product-page-links"><Link href={`/creations/${product.category}`}>Browse {detail.title.toLowerCase()}</Link><Link href="/faq">Ordering and timing FAQ</Link></p></div></article></div></main><SiteFooter /></>;
}
