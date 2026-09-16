import { absoluteUrl } from "@/lib/site";

export function BreadcrumbSchema({ title, path, parent }: { title: string; path: string; parent?: { title: string; path: string } }) {
  const homeUrl = absoluteUrl("/");
  const pageUrl = absoluteUrl(path);
  if (!homeUrl || !pageUrl) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: homeUrl },
      ...(parent ? [{ "@type": "ListItem", position: 2, name: parent.title, item: absoluteUrl(parent.path) }] : []),
      { "@type": "ListItem", position: parent ? 3 : 2, name: title, item: pageUrl },
    ],
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}
