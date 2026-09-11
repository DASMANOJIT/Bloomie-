"use client";

import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { Camera, ChevronDown, ChevronLeft, ChevronRight, Menu, MessageCircle, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { categories, products, type Product, type ProductCategory } from "@/data/products";

const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
const insta = process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "https://instagram.com/";
const wa = (message: string) => `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
const mobileQuery = "(max-width: 700px)";
const subscribeToMobile = (callback: () => void) => { const query = window.matchMedia(mobileQuery); query.addEventListener("change", callback); return () => query.removeEventListener("change", callback); };
const getMobileSnapshot = () => window.matchMedia(mobileQuery).matches;
const getServerMobileSnapshot = () => false;
const useIsMobile = () => useSyncExternalStore(subscribeToMobile, getMobileSnapshot, getServerMobileSnapshot);

function RevealController() {
  useEffect(() => {
    const elements = [...document.querySelectorAll<HTMLElement>(".reveal-item")];
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion || !("IntersectionObserver" in window)) {
      elements.forEach(element => element.classList.add("is-visible"));
      return;
    }
    document.documentElement.classList.add("reveal-ready");
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.target.classList.toggle("is-visible", entry.isIntersecting));
    }, { threshold: 0.14, rootMargin: "0px 0px -6%" });
    elements.forEach(element => observer.observe(element));
    return () => {
      observer.disconnect();
      document.documentElement.classList.remove("reveal-ready");
    };
  }, []);
  return null;
}

function Brand() {
  return <a href="#home" className="brand" aria-label="Bloomie home"><Image src="/images/bloomie-logo-cro-display.png" alt="" width={1861} height={1985} priority className="brand-symbol" /><Image src="/images/bloomie-logo-name-display.png" alt={"Bloomie \u2013 The Crochet Store"} width={462} height={136} priority className="brand-wordmark" /></a>;
}

function Nav({ activeCategory, onCategory }: { activeCategory: ProductCategory; onCategory: (category: ProductCategory) => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [creationsOpen, setCreationsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const pendingMenuFocus = useRef<number | null>(null);

  useEffect(() => {
    const onPointer = (event: PointerEvent) => { if (!dropdownRef.current?.contains(event.target as Node)) setCreationsOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setCreationsOpen(false); };
    document.addEventListener("pointerdown", onPointer); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey); };
  }, []);

  const choose = (category: ProductCategory) => {
    onCategory(category); setCreationsOpen(false); setMobileOpen(false);
    requestAnimationFrame(() => document.getElementById("creations")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const onTriggerKey = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault(); pendingMenuFocus.current = event.key === "ArrowDown" ? 0 : categories.length - 1; setCreationsOpen(true);
    }
  };  const onMenuKey = (event: React.KeyboardEvent) => {
    const current = itemRefs.current.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "ArrowDown") { event.preventDefault(); itemRefs.current[(current + 1 + categories.length) % categories.length]?.focus(); }
    if (event.key === "ArrowUp") { event.preventDefault(); itemRefs.current[(current - 1 + categories.length) % categories.length]?.focus(); }
    if (event.key === "Home") { event.preventDefault(); itemRefs.current[0]?.focus(); }
    if (event.key === "End") { event.preventDefault(); itemRefs.current[categories.length - 1]?.focus(); }
  };

  return <header className="navbar"><div className="nav-inner"><Brand /><nav className={mobileOpen ? "open" : ""} aria-label="Main navigation"><a href="#home" onClick={() => setMobileOpen(false)}>Home</a><a href="#story" onClick={() => setMobileOpen(false)}>Our Story</a><div className="creations-menu" ref={dropdownRef}><button className="creations-trigger" aria-expanded={creationsOpen} aria-haspopup="menu" onClick={() => setCreationsOpen(value => !value)} onKeyDown={onTriggerKey}>Creations <ChevronDown className={creationsOpen ? "rotated" : ""} /></button>{creationsOpen && <div className="creations-dropdown shown" role="menu" onKeyDown={onMenuKey}>{categories.map((category, index) => <button key={category.id} ref={element => { itemRefs.current[index] = element; if (element && pendingMenuFocus.current === index) { element.focus(); pendingMenuFocus.current = null; } }} role="menuitem" aria-current={activeCategory === category.id ? "true" : undefined} onClick={() => choose(category.id)}>{category.label}</button>)}</div>}</div><a href="#instagram" onClick={() => setMobileOpen(false)}>Instagram</a><a className="button small" href="#custom-order" onClick={() => setMobileOpen(false)}>Custom Order</a></nav><button className="menu" onClick={() => setMobileOpen(value => !value)} aria-expanded={mobileOpen} aria-label={mobileOpen ? "Close menu" : "Open menu"}>{mobileOpen ? <X /> : <Menu />}</button></div></header>;
}

function ProductCard({ product, onOpen }: { product: Product; onOpen: (product: Product, trigger: HTMLElement) => void }) {
  const open = (event: React.MouseEvent<HTMLElement>) => onOpen(product, event.currentTarget);
  return <article className="card product-card"><button className="card-image" onClick={open} aria-label={`View details for ${product.name}`}><Image src={product.images[0]} alt={`${product.name}, handmade by Bloomie`} fill sizes="(max-width: 700px) 86vw, (max-width: 1100px) 50vw, 33vw" /></button><div className="card-copy"><span className="tag"><Sparkles /> Customisable</span><h3>{product.name}</h3><p>{product.shortDescription}</p><button className="text-link" onClick={open}>View Details ↗</button></div></article>;
}

function ProductCarousel({ items, onOpen }: { items: Product[]; onOpen: (product: Product, trigger: HTMLElement) => void }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "start", containScroll: "trimSnaps" });
  const [index, setIndex] = useState(0);
  const sync = useCallback(() => setIndex(emblaApi?.selectedScrollSnap() ?? 0), [emblaApi]);
  useEffect(() => { if (!emblaApi) return; emblaApi.on("select", sync); return () => { emblaApi.off("select", sync); }; }, [emblaApi, sync]);
  if (!items.length) return null;
  return <div className="mobile-products"><div className="carousel-viewport" ref={emblaRef}><div className="carousel-track">{items.map((product, slide) => <div className="carousel-slide" key={product.id} role="group" aria-label={`Slide ${slide + 1} of ${items.length}`}><ProductCard product={product} onOpen={onOpen} /></div>)}</div></div>{items.length > 1 && <><div className="carousel-controls"><button onClick={() => emblaApi?.scrollPrev()} disabled={index === 0} aria-label="Previous product"><ChevronLeft /></button><div className="carousel-dots" aria-label="Choose product slide">{items.map((product, dot) => <button key={product.id} className={dot === index ? "active" : ""} onClick={() => emblaApi?.scrollTo(dot)} aria-label={`Go to slide ${dot + 1}`} aria-current={dot === index ? "true" : undefined} />)}</div><button onClick={() => emblaApi?.scrollNext()} disabled={index === items.length - 1} aria-label="Next product"><ChevronRight /></button></div><p className="sr-only" aria-live="polite">Product {index + 1} of {items.length}</p></>}</div>;
}

function ProductImageCarousel({ product }: { product: Product }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [index, setIndex] = useState(0);
  const sync = useCallback(() => setIndex(emblaApi?.selectedScrollSnap() ?? 0), [emblaApi]);
  useEffect(() => { if (!emblaApi) return; emblaApi.on("select", sync); return () => { emblaApi.off("select", sync); }; }, [emblaApi, sync]);
  return <div className="modal-gallery"><div className="modal-gallery-viewport" ref={emblaRef}><div className="modal-gallery-track">{product.images.map((image, slide) => <div className="modal-gallery-slide" key={image}><Image src={image} alt={`${product.name}, view ${slide + 1}`} fill sizes="(max-width: 760px) 100vw, 50vw" /></div>)}</div></div>{product.images.length > 1 && <div className="modal-gallery-controls"><button onClick={() => emblaApi?.scrollPrev()} disabled={index === 0} aria-label="Previous product image"><ChevronLeft /></button><div className="carousel-dots">{product.images.map((image, dot) => <button key={image} className={dot === index ? "active" : ""} onClick={() => emblaApi?.scrollTo(dot)} aria-label={`Show image ${dot + 1}`} aria-current={dot === index ? "true" : undefined} />)}</div><button onClick={() => emblaApi?.scrollNext()} disabled={index === product.images.length - 1} aria-label="Next product image"><ChevronRight /></button></div>}</div>;
}

function ProductModal({ product, onClose, returnFocus }: { product: Product; onClose: () => void; returnFocus: React.RefObject<HTMLElement | null> }) {
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current; const focusTarget = returnFocus.current; const first = dialog?.querySelector<HTMLElement>("button, a[href]"); first?.focus(); document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); if (event.key === "Tab" && dialog) { const focusable = [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]')]; if (!focusable.length) return; const firstItem = focusable[0], lastItem = focusable[focusable.length - 1]; if (event.shiftKey && document.activeElement === firstItem) { event.preventDefault(); lastItem.focus(); } else if (!event.shiftKey && document.activeElement === lastItem) { event.preventDefault(); firstItem.focus(); } } };
    document.addEventListener("keydown", onKey); return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); focusTarget?.focus(); };
  }, [onClose, returnFocus]);
  const message = `Hello Bloomie! I’m interested in ordering the ${product.name}. Please share the available colours, price, customisation and delivery details.`;
  return <div className="backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}><section ref={dialogRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="close" onClick={onClose} aria-label="Close product details"><X /></button><ProductImageCarousel product={product} /><div className="modal-copy"><span className="eyebrow">Made for you</span><h2 id="modal-title">{product.name}</h2><p>{product.description}</p><dl>{product.customisation && <div><dt>Customisation</dt><dd>{product.customisation}</dd></div>}{product.preparationTime && <div><dt>Preparation time</dt><dd>{product.preparationTime}</dd></div>}{product.price && <div><dt>Approximate price</dt><dd>{product.price}</dd></div>}</dl><a className="button whatsapp" href={wa(message)} target="_blank" rel="noreferrer"><MessageCircle /> Order Now on WhatsApp</a></div></section></div>;
}

function CreationsBrowser({ activeCategory, onCategory, onOpen }: { activeCategory: ProductCategory; onCategory: (category: ProductCategory) => void; onOpen: (product: Product, trigger: HTMLElement) => void }) {
  const visible = products.filter(product => product.category === activeCategory);
  const label = categories.find(category => category.id === activeCategory)?.label;
  const isMobile = useIsMobile();
  return <section className="section" id="creations"><div className="heading reveal-item reveal-up"><div><span className="eyebrow">Made with heart</span><h2>Featured creations</h2></div><p>A little look at what we love to make. Every piece can become uniquely yours.</p></div><div className="category-scroll reveal-item reveal-up" role="group" aria-label="Filter creations by category">{categories.map(category => <button key={category.id} className={`category-pill ${activeCategory === category.id ? "active" : ""}`} aria-pressed={activeCategory === category.id} onClick={() => onCategory(category.id)}>{category.label}</button>)}</div>{visible.length ? <div className="product-results reveal-item reveal-up" key={activeCategory}>{isMobile ? <ProductCarousel items={visible} onOpen={onOpen} /> : <div className="products-grid">{visible.map(product => <ProductCard key={product.id} product={product} onOpen={onOpen} />)}</div>}</div> : <div className="empty-category reveal-item reveal-up" role="status"><h3>{label} are coming soon</h3><p>Bloomie is preparing this collection. Please check back for new handmade pieces.</p></div>}</section>;
}

export function HomePage() {
  const [activeCategory, setActiveCategory] = useState<ProductCategory>("bouquets");
  const [selected, setSelected] = useState<Product | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const openProduct = (product: Product, trigger: HTMLElement) => { returnFocus.current = trigger; setSelected(product); };
  const posts = ["crochet-bouquet.png", "crochet-tote.png", "crochet-gifts.png", "crochet-tote.png", "crochet-bouquet.png", "crochet-gifts.png"];
  return <><RevealController /><Nav activeCategory={activeCategory} onCategory={setActiveCategory} /><main><section className="hero" id="home"><div className="hero-copy reveal-item reveal-up"><span className="eyebrow">Thoughtfully Handmade</span><h1>Little loops of joy, <em>made just for you.</em></h1><p>Bloomie creates handmade crochet flowers, gifts, accessories and personalised keepsakes—each one patiently made by hand.</p><div className="actions"><a className="button" href="#creations">View Our Creations</a><a className="button ghost" href={insta} target="_blank" rel="noreferrer"><Camera /> Follow on Instagram</a></div><span className="hero-note">⌁ Handmade slowly, gifted joyfully</span></div><div className="hero-visual reveal-item reveal-right"><div className="hero-image" style={{minHeight:"360px"}}><Image src="/images/crochet-bouquet.png" alt="Blush crochet flower bouquet on cream linen" fill priority sizes="(max-width: 800px) 100vw, 48vw" /></div><div className="badge"><b>100%</b> handmade</div></div></section>
  <CreationsBrowser activeCategory={activeCategory} onCategory={setActiveCategory} onOpen={openProduct} />
  <section className="story section" id="story"><div className="story-image reveal-item reveal-left"><Image src="/images/crochet-tote.png" alt="Handmade crochet tote showing detailed stitches" fill sizes="(max-width: 800px) 100vw, 42vw" /></div><div className="reveal-item reveal-right"><span className="eyebrow">Meet the Maker</span><h2>From a quiet skein of yarn to something meaningful.</h2><p>Bloomie began with a love for thoughtful gifting and the simple magic of making by hand. Every loop is placed with care and every detail is chosen to make someone smile.</p><p>Whether it’s a bouquet that never fades or a tiny keepsake in someone’s favourite colour, each creation carries the warmth of the hands that made it.</p><strong className="signature">Made slowly, with love.</strong></div></section>
  <section className="section ordering"><div className="center reveal-item reveal-up"><span className="eyebrow">Simple & personal</span><h2>How ordering works</h2></div><ol className="steps reveal-item reveal-up"><li><span>01</span><h3>Explore the creations</h3><p>Browse our handmade pieces and find the one that feels just right.</p></li><li><span>02</span><h3>Select a product</h3><p>See the available options and approximate making time.</p></li><li><span>03</span><h3>Chat on WhatsApp</h3><p>We’ll confirm customisation, price, delivery time and payment details.</p></li></ol></section>
  <section className="section" id="instagram"><div className="heading reveal-item reveal-right"><div><span className="eyebrow"><Camera /> @bloomie.crochet</span><h2>Fresh from Instagram</h2></div><a className="button ghost" href={insta} target="_blank" rel="noreferrer">Follow Bloomie on Instagram</a></div><div className="insta-grid reveal-item reveal-up">{posts.map((image, index) => <a key={index} href={insta} target="_blank" rel="noreferrer" aria-label={`Instagram placeholder post ${index + 1}`}><Image src={`/images/${image}`} alt={`Bloomie crochet placeholder post ${index + 1}`} fill sizes="(max-width: 600px) 50vw, 33vw" /><span><Camera /></span></a>)}</div><p className="feed-note reveal-item reveal-up">A visual preview for now — real Instagram posts can be connected later.</p></section>
  <section className="cta reveal-item reveal-up" id="custom-order"><span className="eyebrow">Custom orders welcome</span><h2>Have something special in mind?</h2><p>Tell us who it’s for, what you’re imagining, and the colours you love. We’ll help turn it into a handmade keepsake.</p><a className="button whatsapp" href={wa("Hello Bloomie! I have a custom crochet idea I’d love to discuss.")} target="_blank" rel="noreferrer"><MessageCircle /> Start a custom order</a></section></main>
  <footer><div className="footer-content"><div className="footer-grid"><div className="reveal-item reveal-left"><Brand /><p>Little loops of joy, thoughtfully handmade in India.</p></div><nav className="reveal-item reveal-up"><b>Explore</b><a href="#home">Home</a><a href="#story">Our Story</a><a href="#creations">Creations</a><a href="#custom-order">Custom Order</a></nav><div className="reveal-item reveal-right"><b>Say hello</b><div className="footer-socials"><a href={insta} target="_blank" rel="noopener noreferrer" aria-label="Visit Bloomie on Instagram"><Image src="/images/instagram.png" alt="" width={26} height={26} className="footer-social-icon" /></a><a href="https://wa.me/917439792042" target="_blank" rel="noopener noreferrer" aria-label="Chat with Bloomie on WhatsApp"><Image src="/images/WhatsApp.svg.png" alt="" width={26} height={26} className="footer-social-icon" /></a></div></div></div><div className="footer-bottom reveal-item reveal-up"><span>Handmade in India &hearts;</span><span>Developed and maintained by <a href="https://dmstacklabs.in/" target="_blank" rel="noopener noreferrer" aria-label="Visit DM Stack Labs website">DM STACK LABS</a></span><span>&copy; {new Date().getFullYear()} Bloomie. All rights reserved.</span></div></div></footer>{selected && <ProductModal product={selected} onClose={() => setSelected(null)} returnFocus={returnFocus} />}</>;
}







