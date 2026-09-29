import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { absoluteUrl, getSiteUrl } from "@/lib/site";
import "./globals.css";
const display = Cormorant_Garamond({ subsets: ["latin"], variable: "--font-display", weight: ["500", "600", "700"] });
const sans = Manrope({ subsets: ["latin"], variable: "--font-sans", weight: ["400", "500", "600", "700"] });
const siteUrl = getSiteUrl();
const socialImage = absoluteUrl("/images/crochet-bouquet.png");

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: { default: "Bloomie | Handmade Crochet India", template: "%s" },
  description: "Thoughtfully handmade crochet flowers, gifts, accessories and personalised keepsakes, made with care in India.",
  alternates: siteUrl ? { canonical: "/" } : undefined,
  openGraph: { title: "Bloomie | Handmade Crochet India", description: "Little loops of joy, made just for you.", type: "website", images: socialImage ? [{ url: socialImage, alt: "Bloomie handmade crochet flower bouquet" }] : undefined },
  twitter: { card: "summary_large_image", title: "Bloomie | Handmade Crochet India", description: "Little loops of joy, made just for you.", images: socialImage ? [socialImage] : undefined },
  icons: { icon: "/favicon.svg" },
};

function SiteSchema() {
  const homeUrl = absoluteUrl("/");
  const organization = { "@context": "https://schema.org", "@type": "Organization", name: "Bloomie", email: "bloomiechrochetstore@gmail.com", sameAs: ["https://www.instagram.com/bloomiecrochetstore/"], ...(homeUrl ? { url: homeUrl } : {}) };
  const website = homeUrl ? { "@context": "https://schema.org", "@type": "WebSite", name: "Bloomie", url: homeUrl } : null;
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />{website && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }} />}</>;
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body className={`${display.variable} ${sans.variable} season-durga-puja`}><SiteSchema />{children}</body></html>; }
