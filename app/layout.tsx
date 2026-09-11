import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
const display = Cormorant_Garamond({ subsets: ["latin"], variable: "--font-display", weight: ["500", "600", "700"] });
const sans = Manrope({ subsets: ["latin"], variable: "--font-sans", weight: ["400", "500", "600", "700"] });
export const metadata: Metadata = { title: "Bloomie | The Crochet Store", description: "Thoughtfully handmade crochet flowers, gifts, accessories and personalised keepsakes, made with care in India.", openGraph: { title: "Bloomie | The Crochet Store", description: "Little loops of joy, made just for you.", type: "website" }, icons: { icon: "/favicon.svg" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body className={`${display.variable} ${sans.variable}`}>{children}</body></html>; }
