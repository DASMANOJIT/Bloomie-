import type { Metadata } from "next";
import { HomePage } from "@/components/home-page";
import { createPageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = createPageMetadata(
  "Bloomie Crochet Store | Handmade Crochet India",
  "Bloomie Crochet Store creates handmade crochet flowers, gifts, accessories and personalised keepsakes in India. Enquire on WhatsApp for custom crochet gifts.",
  "/",
);

export default function Page() { return <HomePage />; }
