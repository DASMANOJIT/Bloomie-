import type { Metadata } from "next";
import { InfoPageHeader } from "@/components/info-page";
import { SiteFooter } from "@/components/site-footer";
import { createPageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = createPageMetadata(
  "Tutorial | Bloomie",
  "Bloomie crochet tutorials will be available soon.",
  "/tutorial",
);

export default function TutorialPage() {
  return <><InfoPageHeader /><main className="info-page"><div className="info-page-inner"><header className="info-intro"><h1>Tutorial</h1><p>Tutorials will be available soon.</p></header></div></main><SiteFooter /></>;
}
