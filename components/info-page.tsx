"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { SiteFooter } from "@/components/site-footer";

export type InfoPageLink = { label: string; href: string };

export function InfoPageHeader() {
  const [open, setOpen] = useState(false);
  return <header className="navbar info-navbar"><div className="nav-inner"><Link href="/#home" className="brand" aria-label="Bloomie home"><Image src="/images/bloomie-logo-cro-display.png" alt="" width={1861} height={1985} priority className="brand-symbol" /><Image src="/images/bloomie-logo-name-display.png" alt="Bloomie - The Crochet Store" width={462} height={136} priority className="brand-wordmark" /></Link><nav className={open ? "open" : ""} aria-label="Main navigation"><Link href="/#home" onClick={() => setOpen(false)}>Home</Link><Link href="/#story" onClick={() => setOpen(false)}>Our Story</Link><Link href="/#creations" onClick={() => setOpen(false)}>Creations</Link><Link href="/#instagram" onClick={() => setOpen(false)}>Instagram</Link><a className="button small" href="https://wa.me/917439792042" target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>Custom Order</a></nav><button className="menu" type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"}>{open ? <X /> : <Menu />}</button></div></header>;
}

export function Breadcrumbs({ current }: { current: string }) {
  return <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/#home">Home</Link><span aria-hidden="true">/</span><span aria-current="page">{current}</span></nav>;
}

export function InfoPageShell({ title, children }: { title: string; children: React.ReactNode }) {
  return <><InfoPageHeader /><main className="info-page"><div className="info-page-inner"><Breadcrumbs current={title} />{children}</div></main><SiteFooter /></>;
}
