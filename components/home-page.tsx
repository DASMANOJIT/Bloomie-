"use client";

/* Instagram CDN poster URLs expire, so they intentionally bypass Next image optimization. */
/* eslint-disable @next/next/no-img-element */

import Image from "next/image";
import { SiteFooter } from "@/components/site-footer";
import useEmblaCarousel from "embla-carousel-react";
import { Camera, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Gift, Images, Menu, MessageCircle, Sparkles, Volume2, VolumeX, X } from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { categories, products, type Product, type ProductCategory } from "@/data/products";
import { getProductDescription, productPath } from "@/lib/catalog";
import { ShareButton } from "@/components/share-button";

const whatsappNumber = "917439792042";
const instagramUrl = "https://www.instagram.com/bloomiecrochetstore/";
const customOrderMessage = "Hello Bloomie, I would like to discuss a custom crochet order.";
const createWhatsAppUrl = (message?: string) => {
  const baseUrl = `https://wa.me/${whatsappNumber}`;
  return message ? `${baseUrl}?text=${encodeURIComponent(message)}` : baseUrl;
};
const mobileQuery = "(max-width: 700px)";
const subscribeToMobile = (callback: () => void) => { const query = window.matchMedia(mobileQuery); query.addEventListener("change", callback); return () => query.removeEventListener("change", callback); };
const getMobileSnapshot = () => window.matchMedia(mobileQuery).matches;
const getServerMobileSnapshot = () => false;
const useIsMobile = () => useSyncExternalStore(subscribeToMobile, getMobileSnapshot, getServerMobileSnapshot);

type InstagramMediaType = "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";

interface InstagramMediaChild {
  id?: string;
  media_type: "IMAGE" | "VIDEO";
  media_url?: string;
  thumbnail_url?: string;
}

interface InstagramPost {
  id: string;
  caption?: string;
  media_type: InstagramMediaType;
  media_product_type?: string;
  media_url?: string;
  mediaUrl?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp?: string;
  unresolved?: boolean;
  children?: InstagramMediaChild[];
}

interface InstagramReelsResponse {
  reels: InstagramPost[];
  productMedia?: InstagramPost[];
  error?: string;
}

interface InstagramPreview {
  kind: "image" | "video";
  src: string;
  poster?: string;
}

type ProductGalleryItem =
  | { id: string; kind: "image"; image: Product["images"][number] }
  | { id: string; kind: "instagram"; post?: InstagramPost; preview: InstagramPreview | null; poster: string; permalink: string };

interface InstagramPostsState {
  feedPosts: InstagramPost[];
  productPosts: InstagramPost[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const isHttpsUrl = (value: string | undefined): value is string => Boolean(value?.startsWith("https://"));
const isPreviewImageUrl = (value: string | undefined): value is string =>
  typeof value === "string" && (value.startsWith("https://") || value.startsWith("/images/"));
const isPlayableMediaUrl = (value: string | undefined): value is string =>
  typeof value === "string" && (
    value.startsWith("https://") || value.startsWith("/videos/instagram/")
  );

const normalizeInstagramShortcode = (value: string | undefined) => {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    const [type, shortcode] = url.pathname.split("/").filter(Boolean);
    return (type === "p" || type === "reel") && shortcode ? shortcode : undefined;
  } catch {
    return undefined;
  }
};

const getInstagramPreview = (post: InstagramPost): InstagramPreview | null => {
  const source = post.media_type === "CAROUSEL_ALBUM"
    ? post.children?.find(child => isHttpsUrl(child.media_url) || isHttpsUrl(child.thumbnail_url))
    : post;
  if (!source) return null;

  const isVideo = source.media_type === "VIDEO" || (
    post.media_type !== "CAROUSEL_ALBUM" && post.media_product_type === "REELS"
  );
  const playableMediaUrl = post.media_type === "CAROUSEL_ALBUM"
    ? source.media_url
    : post.mediaUrl ?? post.media_url;

  if (isVideo && isPlayableMediaUrl(playableMediaUrl)) {
    return {
      kind: "video",
      src: playableMediaUrl,
      poster: isHttpsUrl(source.thumbnail_url) ? source.thumbnail_url : undefined,
    };
  }

  const imageSource = source.media_type === "IMAGE"
    ? source.media_url
    : source.thumbnail_url ?? source.media_url;
  return isPreviewImageUrl(imageSource) ? { kind: "image", src: imageSource } : null;
};

const getProductInstagramAssociations = (product: Product) => [
  ...(product.instagramPost ? [product.instagramPost] : []),
  ...(product.instagramPosts ?? []),
];

const getProductInstagramPosts = (product: Product, posts: InstagramPost[]) =>
  getProductInstagramAssociations(product).map(association => posts.find(post => (
    (association.mediaId && post.id === association.mediaId) ||
    normalizeInstagramShortcode(post.permalink) === association.shortcode
  )));

const announceAudibleVideo = (id: string) => {
  window.dispatchEvent(new CustomEvent("bloomie-audible-video", { detail: { id } }));
};

function useInstagramPosts(): InstagramPostsState {
  const [feedPosts, setFeedPosts] = useState<InstagramPost[]>([]);
  const [productPosts, setProductPosts] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestPosts = useCallback(async (signal?: AbortSignal, refresh = false) => {
    const response = await fetch(refresh ? "/api/instagram/reels?refresh=1" : "/api/instagram/reels", { signal });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null) as InstagramReelsResponse | null;
      throw new Error(errorData?.error || "Unable to load Instagram Reels");
    }

    return await response.json() as InstagramReelsResponse;
  }, []);

  const applyResult = useCallback((result: InstagramReelsResponse) => {
    const nextPosts = Array.isArray(result.reels) ? result.reels : [];
    setFeedPosts(nextPosts);
    setProductPosts(Array.isArray(result.productMedia) ? result.productMedia : nextPosts);
    setError(result.error || (nextPosts.length === 0 ? "Unable to load Instagram Reels" : null));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    requestPosts(controller.signal)
      .then(applyResult)
      .catch(error => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setError(error instanceof Error ? error.message : "Unable to load Instagram Reels");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [applyResult, requestPosts]);

  const refresh = useCallback(() => {
    void requestPosts(undefined, true)
      .then(applyResult)
      .catch(() => undefined);
  }, [applyResult, requestPosts]);

  return { feedPosts, productPosts, loading, error, refresh };
}

function ProductCardMedia({ product, posts }: { product: Product; posts: InstagramPost[] }) {
  const associations = useMemo(() => getProductInstagramAssociations(product), [product]);
  const resolvedPosts = useMemo(() => getProductInstagramPosts(product, posts), [posts, product]);
  const items = useMemo<ProductGalleryItem[]>(() => {
    const videos = associations.flatMap((association, index) => {
      const post = resolvedPosts[index];
      const preview = post ? getInstagramPreview(post) : null;
      if (preview?.kind !== "video") return [];
      return [{
        id: `${product.id}-${association.shortcode}`,
        kind: "instagram" as const,
        post,
        preview,
        poster: product.thumbnail,
        permalink: post?.permalink ?? association.permalink,
      }];
    });
    return [
      ...product.images.map(image => ({ id: image.src, kind: "image" as const, image })),
      ...videos,
    ];
  }, [associations, product, resolvedPosts]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [previousIndex, setPreviousIndex] = useState<number | null>(null);
  const [incomingReady, setIncomingReady] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || items.length < 2) return;
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting && entry.intersectionRatio >= 0.25), { threshold: [0, 0.25, 1] });
    observer.observe(container);
    return () => observer.disconnect();
  }, [items.length]);

  const activeItem = items[activeIndex] ?? items[0];
  const preview = activeItem?.kind === "instagram" ? activeItem.preview : null;
  const activeIsVideo = preview?.kind === "video";
  const advance = useCallback(() => {
    if (items.length < 2) return;
    setIncomingReady(false);
    setActiveIndex(index => {
      setPreviousIndex(index);
      return (index + 1) % items.length;
    });
  }, [items.length]);

  useEffect(() => {
    if (!isVisible || reducedMotion || activeIsVideo || !incomingReady || items.length < 2) return;
    const nextItem = items[(activeIndex + 1) % items.length];
    if (nextItem?.kind === "image") {
      const preload = new window.Image();
      preload.src = nextItem.image.src;
    }
    const timer = window.setTimeout(advance, 3000);
    return () => window.clearTimeout(timer);
  }, [activeIndex, activeIsVideo, advance, incomingReady, isVisible, items, reducedMotion]);

  useEffect(() => {
    if (previousIndex === null || !incomingReady) return;
    const timer = window.setTimeout(() => setPreviousIndex(null), 600);
    return () => window.clearTimeout(timer);
  }, [activeIndex, incomingReady, previousIndex]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isVisible) void video.play().catch(() => undefined);
    else video.pause();
    return () => video.pause();
  }, [activeIndex, isVisible, preview?.src]);

  const renderSlide = (item: ProductGalleryItem | undefined, state: "incoming" | "outgoing" | "pending" | "static") => {
    if (!item) return null;
    const itemPreview = item.kind === "instagram" ? item.preview : null;
    const className = `product-card-media-slide product-card-media-${state}`;
    const markReady = () => { if (state !== "outgoing") setIncomingReady(true); };
    if (item.kind === "image") return <Image key={`${state}-${item.id}`} className={className} src={item.image.src} alt={item.image.alt} fill sizes="(max-width: 700px) 86vw, (max-width: 1100px) 50vw, 33vw" onLoad={markReady} />;
    if (itemPreview?.kind === "video" && state !== "outgoing") return <video key={`${state}-${item.id}`} className={className} ref={videoRef} src={itemPreview.src} poster={itemPreview.poster || item.poster} autoPlay={isVisible} muted playsInline controls={false} preload="metadata" onLoadedData={markReady} onEnded={() => { if (isVisible && !reducedMotion) advance(); }} />;
    return <Image key={`${state}-${item.id}`} className={className} src={itemPreview?.kind === "image" ? itemPreview.src : itemPreview?.poster || item.poster} alt={`${product.name} Instagram preview`} fill sizes="(max-width: 700px) 86vw, (max-width: 1100px) 50vw, 33vw" onLoad={markReady} />;
  };

  const activeState = previousIndex === null || reducedMotion ? "static" : incomingReady ? "incoming" : "pending";
  return <div ref={containerRef} className="product-card-media">{previousIndex !== null && renderSlide(items[previousIndex], "outgoing")}{renderSlide(activeItem, activeState)}</div>;
}

function InstagramGalleryMedia({ item, product, active = true }: { item: Extract<ProductGalleryItem, { kind: "instagram" }>; product: Product; active?: boolean }) {
  const videoId = `product-${product.id}-modal-instagram`;
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || item.preview?.kind !== "video") return;

    if (!active) {
      video.pause();
      return;
    }

    const syncPlayback = () => {
      const rect = video.getBoundingClientRect();
      const isVisible = !document.hidden && rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
      if (isVisible) void video.play().catch(() => undefined);
      else video.pause();
    };

    const observer = new IntersectionObserver(syncPlayback, { threshold: [0, 0.01, 0.5, 1] });
    observer.observe(video);
    document.addEventListener("visibilitychange", syncPlayback);
    syncPlayback();

    return () => {
      video.pause();
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncPlayback);
    };
  }, [active, item.preview]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = isMuted;
  }, [isMuted]);

  useEffect(() => {
    const onAudibleVideo = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string }>).detail;
      if (detail?.id !== videoId) setIsMuted(true);
    };
    window.addEventListener("bloomie-audible-video", onAudibleVideo);
    return () => window.removeEventListener("bloomie-audible-video", onAudibleVideo);
  }, [videoId]);

  if (item.preview?.kind === "video") {
    return <>
      <video ref={videoRef} src={item.preview.src} poster={item.preview.poster || item.poster} autoPlay muted={isMuted} loop playsInline controls={false} preload="metadata" />
      <a className="modal-instagram-link" href={item.permalink} target="_blank" rel="noopener noreferrer"><ExternalLink /> Instagram</a>
      <button className="reel-mute product-mute" type="button" aria-label={isMuted ? "Unmute product video" : "Mute product video"} onClick={event => { event.preventDefault(); event.stopPropagation(); const nextMuted = !isMuted; setIsMuted(nextMuted); if (!nextMuted) announceAudibleVideo(videoId); }}>{isMuted ? <VolumeX /> : <Volume2 />}</button>
    </>;
  }

  const poster = item.preview?.src || item.poster;
  return <a className="modal-instagram-poster" href={item.permalink} target="_blank" rel="noopener noreferrer" aria-label={`View ${product.name} post on Instagram`}><Image src={poster} alt={`${product.name} Instagram post preview`} fill sizes="(max-width: 768px) 100vw, 50vw" /><span>View on Instagram</span></a>;
}

function RevealController() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion || !("IntersectionObserver" in window)) {
      return;
    }

    document.documentElement.classList.add("reveal-ready");
    const fallbackTimers = new Map<HTMLElement, number>();
    const observedElements = new Set<HTMLElement>();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const element = entry.target as HTMLElement;
        const fallbackTimer = fallbackTimers.get(element);
        if (fallbackTimer) {
          window.clearTimeout(fallbackTimer);
          fallbackTimers.delete(element);
        }
        element.classList.toggle("is-visible", entry.isIntersecting);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    const observe = (element: HTMLElement) => {
      if (observedElements.has(element)) return;
      observedElements.add(element);
      element.dataset.revealObserved = "true";
      observer.observe(element);

      if (element.matches(".product-card")) {
        fallbackTimers.set(element, window.setTimeout(() => {
          element.classList.add("is-visible");
          fallbackTimers.delete(element);
        }, 900));
      }
    };

    document.querySelectorAll<HTMLElement>(".reveal-item").forEach(observe);
    const mutationObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches(".reveal-item")) observe(node);
          node.querySelectorAll<HTMLElement>(".reveal-item").forEach(observe);
        });
      });
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      observer.disconnect();
      fallbackTimers.forEach(timer => window.clearTimeout(timer));
      observedElements.forEach(element => delete element.dataset.revealObserved);
      document.documentElement.classList.remove("reveal-ready");
    };
  }, []);
  return null;
}

function Brand() {
  return <a href="#home" className="brand" aria-label="Bloomie home"><Image src="/images/bloomie-logo-cro-display.png" alt="" width={1861} height={1985} sizes="64px" className="brand-symbol" /><Image src="/images/bloomie-logo-name-display.png" alt={"Bloomie \u2013 The Crochet Store"} width={462} height={136} sizes="160px" className="brand-wordmark" /></a>;
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

  return <header className="navbar"><div className="nav-inner"><Brand /><nav className={mobileOpen ? "open" : ""} aria-label="Main navigation"><a href="#home" onClick={() => setMobileOpen(false)}>Home</a><a href="#story" onClick={() => setMobileOpen(false)}>Our Story</a><div className="creations-menu" ref={dropdownRef}><button className="creations-trigger" aria-expanded={creationsOpen} aria-haspopup="menu" onClick={() => setCreationsOpen(value => !value)} onKeyDown={onTriggerKey}>Creations <ChevronDown className={creationsOpen ? "rotated" : ""} /></button>{creationsOpen && <div className="creations-dropdown shown" role="menu" onKeyDown={onMenuKey}>{categories.map((category, index) => <button key={category.id} ref={element => { itemRefs.current[index] = element; if (element && pendingMenuFocus.current === index) { element.focus(); pendingMenuFocus.current = null; } }} role="menuitem" aria-current={activeCategory === category.id ? "true" : undefined} onClick={() => choose(category.id)}>{category.label}</button>)}</div>}</div><a href="#instagram" onClick={() => setMobileOpen(false)}>Instagram</a><a href="/tutorial" onClick={() => setMobileOpen(false)}>Tutorial</a><a className="button small" href={createWhatsAppUrl(customOrderMessage)} target="_blank" rel="noopener noreferrer" onClick={() => setMobileOpen(false)}>Custom Order</a></nav><button className="menu" onClick={() => setMobileOpen(value => !value)} aria-expanded={mobileOpen} aria-label={mobileOpen ? "Close menu" : "Open menu"}>{mobileOpen ? <X /> : <Menu />}</button></div></header>;
}

function ProductCard({ product, posts, onOpen, style }: { product: Product; posts: InstagramPost[]; onOpen: (product: Product, trigger: HTMLElement) => void; style?: CSSProperties }) {
  const open = (event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => onOpen(product, event.currentTarget);
  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open(event);
    }
  };
  return <article className="card product-card reveal-item reveal-up" style={style} role="button" tabIndex={0} onClick={open} onKeyDown={onKeyDown} aria-label={`View details for ${product.name}`}><div className="card-image"><ProductCardMedia product={product} posts={posts} />{product.id === "top-002" && <Image src="/images/sticky.png" alt="Free gift" width={500} height={500} sizes="104px" style={{ position: "absolute", zIndex: 2, top: 0, right: 0, width: 104, height: 104, objectFit: "contain", pointerEvents: "none", filter: "drop-shadow(0 5px 10px rgba(75,13,18,.16))", transform: "none" }} />}</div><div className="card-copy"><span className="tag"><Sparkles /> {product.productNumber}</span><h3>{product.name}</h3><p>{getProductDescription(product)}</p><span className="text-link">View Details ↗</span></div></article>;
}

function ProductCarousel({ items, posts, onOpen }: { items: Product[]; posts: InstagramPost[]; onOpen: (product: Product, trigger: HTMLElement) => void }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "start", containScroll: "trimSnaps" });
  const [index, setIndex] = useState(0);
  const sync = useCallback(() => setIndex(emblaApi?.selectedScrollSnap() ?? 0), [emblaApi]);
  useEffect(() => { if (!emblaApi) return; emblaApi.on("select", sync); return () => { emblaApi.off("select", sync); }; }, [emblaApi, sync]);
  if (!items.length) return null;
  return <div className="mobile-products"><div className="carousel-viewport" ref={emblaRef}><div className="carousel-track">{items.map((product, slide) => <div className="carousel-slide" key={product.id} role="group" aria-label={`Slide ${slide + 1} of ${items.length}`}><ProductCard product={product} posts={posts} onOpen={onOpen} /></div>)}</div></div>{items.length > 1 && <><div className="carousel-controls"><button onClick={() => emblaApi?.scrollPrev()} disabled={index === 0} aria-label="Previous product"><ChevronLeft /></button><div className="carousel-dots" aria-label="Choose product slide">{items.map((product, dot) => <button key={product.id} className={dot === index ? "active" : ""} onClick={() => emblaApi?.scrollTo(dot)} aria-label={`Go to slide ${dot + 1}`} aria-current={dot === index ? "true" : undefined} />)}</div><button onClick={() => emblaApi?.scrollNext()} disabled={index === items.length - 1} aria-label="Next product"><ChevronRight /></button></div><p className="sr-only" aria-live="polite">Product {index + 1} of {items.length}</p></>}</div>;
}

function ProductMediaCarousel({ items, product, selectedItemId, onItemSelect }: { items: ProductGalleryItem[]; product: Product; selectedItemId: string; onItemSelect: (id: string) => void }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [index, setIndex] = useState(0);
  const sync = useCallback(() => {
    const selected = emblaApi?.selectedScrollSnap() ?? 0;
    setIndex(selected);
    const item = items[selected];
    if (item) onItemSelect(item.id);
  }, [emblaApi, items, onItemSelect]);
  useEffect(() => { if (!emblaApi) return; emblaApi.on("select", sync); return () => { emblaApi.off("select", sync); }; }, [emblaApi, sync]);
  useEffect(() => {
    const nextIndex = items.findIndex(item => item.id === selectedItemId);
    if (emblaApi && nextIndex >= 0 && nextIndex !== emblaApi.selectedScrollSnap()) emblaApi.scrollTo(nextIndex);
  }, [emblaApi, items, selectedItemId]);
  return <div className="modal-gallery"><div className="modal-gallery-viewport" ref={emblaRef}><div className="modal-gallery-track">{items.map(item => <div className="modal-gallery-slide" key={item.id}>{item.kind === "image" ? <Image src={item.image.src} alt={item.image.alt} fill sizes="(max-width: 768px) 100vw, 50vw" /> : <InstagramGalleryMedia item={item} product={product} active={item.id === selectedItemId} />}</div>)}</div></div>{items.length > 1 && <div className="modal-gallery-controls"><button onClick={() => emblaApi?.scrollPrev()} disabled={index === 0} aria-label="Previous product media"><ChevronLeft /></button><div className="carousel-dots" aria-label="Choose product media">{items.map((item, dot) => <button key={item.id} className={dot === index ? "active" : ""} onClick={() => emblaApi?.scrollTo(dot)} aria-label={item.kind === "image" ? `Show ${item.image.colour} image ${dot + 1}` : "Show Instagram video preview"} aria-current={dot === index ? "true" : undefined} />)}</div><button onClick={() => emblaApi?.scrollNext()} disabled={index === items.length - 1} aria-label="Next product media"><ChevronRight /></button></div>}</div>;
}

function ProductModal({ product, posts, onClose, returnFocus }: { product: Product; posts: InstagramPost[]; onClose: () => void; returnFocus: React.RefObject<HTMLElement | null> }) {
  const dialogRef = useRef<HTMLElement>(null);
  const initialVariant = product.variants[0];
  const initialColour = initialVariant?.label ?? "As shown";
  const initialImage = initialVariant?.images[0] ?? product.thumbnail;
  const [selectedVariantId, setSelectedVariantId] = useState(initialVariant?.id ?? "");
  const [selectedColour, setSelectedColour] = useState(initialColour);
  const [selectedItemId, setSelectedItemId] = useState(initialImage);
  const categoryLabel = categories.find(category => category.id === product.category)?.label ?? product.category;
  const selectedVariant = useMemo(() => product.variants.find(variant => variant.id === selectedVariantId) ?? product.variants[0], [product.variants, selectedVariantId]);
  const modalImages = useMemo(() => {
    if (product.id === "top-001") return product.images;
    const sources = new Set(selectedVariant?.images ?? product.images.map(image => image.src));
    return product.images.filter(image => sources.has(image.src));
  }, [product.id, product.images, selectedVariant]);
  const instagramAssociations = useMemo(() => getProductInstagramAssociations(product), [product]);
  const instagramPosts = useMemo(() => getProductInstagramPosts(product, posts), [posts, product]);
  const galleryItems = useMemo<ProductGalleryItem[]>(() => {
    const imageItems = modalImages.map(image => ({ id: image.src, kind: "image" as const, image }));
    return [
      ...imageItems,
      ...instagramAssociations.map((association, index) => {
        const post = instagramPosts[index];
        return {
        id: `${product.id}-${association.shortcode}-instagram-media`,
        kind: "instagram" as const,
        post,
        preview: post ? getInstagramPreview(post) : null,
        poster: product.thumbnail,
        permalink: post?.permalink ?? association.permalink,
      };}),
    ];
  }, [instagramAssociations, instagramPosts, modalImages, product]);
  const selectedIndex = Math.max(0, galleryItems.findIndex(item => item.id === selectedItemId));
  const selectedItem = galleryItems[selectedIndex] ?? galleryItems[0];
  const selectedImageMeta = selectedItem?.kind === "image" ? selectedItem.image : modalImages[0] ?? product.images[0];
  useEffect(() => {
    const dialog = dialogRef.current; const focusTarget = returnFocus.current; const first = dialog?.querySelector<HTMLElement>("button, a[href]"); first?.focus(); document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); if (event.key === "Tab" && dialog) { const focusable = [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]')]; if (!focusable.length) return; const firstItem = focusable[0], lastItem = focusable[focusable.length - 1]; if (event.shiftKey && document.activeElement === firstItem) { event.preventDefault(); lastItem.focus(); } else if (!event.shiftKey && document.activeElement === lastItem) { event.preventDefault(); firstItem.focus(); } } };
    document.addEventListener("keydown", onKey); return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); focusTarget?.focus(); };
  }, [onClose, returnFocus]);
  const chooseColour = (variant: Product["variants"][number]) => {
    setSelectedVariantId(variant.id);
    setSelectedColour(variant.label);
    setSelectedItemId(variant.images[0] ?? product.thumbnail);
  };
  const chooseGalleryItem = (id: string) => {
    setSelectedItemId(id);
  };
  const chooseAdjacentGalleryItem = (direction: -1 | 1) => {
    if (galleryItems.length < 2) return;
    const nextIndex = Math.min(galleryItems.length - 1, Math.max(0, selectedIndex + direction));
    chooseGalleryItem(galleryItems[nextIndex].id);
  };
  const message = `Hello Bloomie, I would like to order ${product.name} (${product.productNumber}) in ${selectedColour}. Please share the price and ordering details.`;
  return <div className="backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}><section ref={dialogRef} className="modal product-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="close" onClick={onClose} aria-label="Close product details"><X /></button><div className="modal-media product-media"><div className="modal-sticky-image"><div className="modal-image-frame">{selectedItem?.kind === "instagram" ? <InstagramGalleryMedia item={selectedItem} product={product} /> : <Image src={selectedImageMeta?.src ?? product.thumbnail} alt={selectedImageMeta?.alt ?? product.name} fill sizes="(max-width: 768px) 100vw, 50vw" />}</div>{galleryItems.length > 1 && <div className="modal-image-controls"><button type="button" onClick={() => chooseAdjacentGalleryItem(-1)} disabled={selectedIndex === 0} aria-label="Previous product media"><ChevronLeft /></button><button type="button" onClick={() => chooseAdjacentGalleryItem(1)} disabled={selectedIndex === galleryItems.length - 1} aria-label="Next product media"><ChevronRight /></button></div>}</div>{galleryItems.length > 1 && <div className="modal-thumbnails" aria-label="Choose product media">{galleryItems.map((item, index) => <button key={item.id} type="button" className={selectedItemId === item.id ? "active" : ""} onClick={() => chooseGalleryItem(item.id)} aria-label={item.kind === "image" ? `Show ${item.image.colour} image ${index + 1}` : "Show Instagram video preview"} aria-current={selectedItemId === item.id ? "true" : undefined}>{item.kind === "image" ? <Image src={item.image.src} alt="" fill sizes="72px" /> : <><Image src={item.preview?.kind === "image" ? item.preview.src : item.preview?.poster || item.poster} alt="" fill sizes="72px" /><span className="modal-thumbnail-video-badge"><Camera /></span></>}</button>)}</div>}<ProductMediaCarousel items={galleryItems} product={product} selectedItemId={selectedItemId} onItemSelect={chooseGalleryItem} /></div><div className="modal-copy product-information"><span className="eyebrow">{categoryLabel}</span><dl className="modal-summary"><div><dt>Product number</dt><dd>{product.productNumber}</dd></div></dl><div className="modal-title-row"><h2 id="modal-title">{product.name}</h2>{product.id === "top-002" && <span className="free-gift-sticker"><Gift /> Free Gift</span>}</div>{product.description && <p>{product.description}</p>}<dl>{product.variants.length > 1 && <div><dt>Colour choices</dt><dd><div className="colour-options" role="radiogroup" aria-label="Choose product colour">{product.variants.map(variant => <button key={variant.id} type="button" className={`colour-option ${selectedVariantId === variant.id ? "active" : ""}`} role="radio" aria-checked={selectedVariantId === variant.id} onClick={() => chooseColour(variant)}><span className="swatch" style={{ background: variant.swatch }} aria-hidden="true" /><span>{variant.label}</span></button>)}</div></dd></div>}{product.customisation && <div><dt>Available customization information</dt><dd>{product.customisation}</dd></div>}<div><dt>Preparation and delivery time</dt><dd>12–15 days</dd></div><div><dt>How to Order</dt><dd><ol className="modal-steps"><li>Select the product and preferred colour.</li><li>Click the “Order via WhatsApp” button.</li><li>Send the automatically generated product enquiry.</li><li>Bloomie will confirm customization, price, availability, and delivery details.</li></ol></dd></div></dl><div className="product-actions"><a className="button whatsapp" href={createWhatsAppUrl(message)} target="_blank" rel="noopener noreferrer"><MessageCircle /> Order via WhatsApp</a><ShareButton path={productPath(product)} title={product.name} /></div><div className="reviews"><h3>Product reviews</h3>{product.reviews.length ? product.reviews.map(review => <article key={review.id} className="review">{review.rating && <b>{review.rating}/5</b>}{review.text && <p>{review.text}</p>}{review.customerName && <span>{review.customerName}</span>}</article>) : <p>Reviews for this creation will be added soon.</p>}</div></div></section></div>;
}

function CreationsBrowser({ activeCategory, posts, onCategory, onOpen }: { activeCategory: ProductCategory; posts: InstagramPost[]; onCategory: (category: ProductCategory) => void; onOpen: (product: Product, trigger: HTMLElement) => void }) {
  const filteredProducts = products.filter(product => product.category === activeCategory);
  const label = categories.find(category => category.id === activeCategory)?.label;
  const isMobile = useIsMobile();
  useEffect(() => {
    if (process.env.NODE_ENV === "development" && filteredProducts.length === 0) {
      console.warn(`No products found for category: ${activeCategory}`);
    }
  }, [activeCategory, filteredProducts.length]);
  return <section className="section" id="creations"><div className="heading reveal-item reveal-up"><div><span className="eyebrow">Made with heart</span><h2>Featured creations</h2></div><p>A little look at what we love to make. Every piece can become uniquely yours.</p></div><div className="category-scroll reveal-item reveal-up" role="group" aria-label="Filter creations by category">{categories.map(category => <button key={category.id} className={`category-pill ${activeCategory === category.id ? "active" : ""}`} aria-pressed={activeCategory === category.id} onClick={() => onCategory(category.id)}>{category.label}</button>)}</div>{filteredProducts.length ? <div className="product-results" key={activeCategory}>{isMobile ? <ProductCarousel items={filteredProducts} posts={posts} onOpen={onOpen} /> : <div className="products-grid">{filteredProducts.map((product, index) => <ProductCard key={product.id} product={product} posts={posts} onOpen={onOpen} style={{ transitionDelay: `${Math.min(index, 5) * 70}ms` }} />)}</div>}</div> : <div className="empty-category reveal-item reveal-up" role="status"><h3>{label} are coming soon</h3><p>Bloomie is preparing this collection. Please check back for new handmade pieces.</p></div>}</section>;
}


function InstagramReelsGallery({ posts, loading, error, refresh }: { posts: InstagramPost[]; loading: boolean; error: string | null; refresh: () => void }) {
  const [unmutedId, setUnmutedId] = useState<string | null>(null);
  const unmutedIdRef = useRef<string | null>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef(new Map<string, HTMLVideoElement>());
  const retryAfterCanPlay = useRef(new Set<string>());
  const hasRefetchedMediaUrls = useRef(false);
  const dragState = useRef<{ pointerId: number; startX: number; scrollLeft: number; moved: boolean } | null>(null);
  const suppressCardClick = useRef(false);

  const registerVideo = useCallback((id: string, element: HTMLVideoElement | null) => {
    if (element) {
      element.muted = unmutedIdRef.current !== id;
      element.defaultMuted = true;
      videoRefs.current.set(id, element);
    }
    else videoRefs.current.delete(id);
  }, []);

  useEffect(() => {
    unmutedIdRef.current = unmutedId;
    videoRefs.current.forEach((video, id) => {
      video.defaultMuted = true;
      video.muted = unmutedId !== id;
    });
  }, [unmutedId]);

  const refreshMediaUrlsOnce = useCallback(() => {
    if (hasRefetchedMediaUrls.current) return;
    hasRefetchedMediaUrls.current = true;
    retryAfterCanPlay.current.clear();
    refresh();
  }, [refresh]);

  const isVideoVisible = useCallback((video: HTMLVideoElement) => {
    const carousel = carouselRef.current;
    if (!carousel || document.hidden) return false;

    const videoRect = video.getBoundingClientRect();
    const carouselRect = carousel.getBoundingClientRect();
    return videoRect.bottom > 0 && videoRect.top < window.innerHeight &&
      videoRect.right > 0 && videoRect.left < window.innerWidth &&
      videoRect.right > carouselRect.left && videoRect.left < carouselRect.right &&
      videoRect.bottom > carouselRect.top && videoRect.top < carouselRect.bottom;
  }, []);

  const attemptPlayback = useCallback((id: string, video: HTMLVideoElement, allowCanPlayRetry = true) => {
    if (!isVideoVisible(video) || !video.paused) return;

    if (unmutedIdRef.current !== id) {
      video.muted = true;
      video.defaultMuted = true;
    }
    video.play().catch(() => {
      if (allowCanPlayRetry) retryAfterCanPlay.current.add(id);
    });
  }, [isVideoVisible]);

  const handleVideoLoadedData = useCallback((id: string, video: HTMLVideoElement) => {
    if (!retryAfterCanPlay.current.has(id)) attemptPlayback(id, video);
  }, [attemptPlayback]);

  const handleVideoCanPlay = useCallback((id: string, video: HTMLVideoElement) => {
    const isRetry = retryAfterCanPlay.current.delete(id);
    attemptPlayback(id, video, !isRetry);
  }, [attemptPlayback]);

  const handleVideoError = useCallback((video: HTMLVideoElement) => {
    const source = video.currentSrc || video.src;
    const timing = [...performance.getEntriesByType("resource")]
      .reverse()
      .find(entry => entry.name === source) as PerformanceResourceTiming | undefined;
    const isForbidden = timing?.responseStatus === 403 || video.error?.code === MediaError.MEDIA_ERR_NETWORK;
    if (isForbidden) refreshMediaUrlsOnce();
  }, [refreshMediaUrlsOnce]);

  const galleryItems = useMemo(() => posts.flatMap(post => {
    const preview = getInstagramPreview(post);
    return preview ? [{ post, preview }] : [];
  }), [posts]);

  const updateCarouselControls = useCallback(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const maximumScroll = Math.max(0, carousel.scrollWidth - carousel.clientWidth);
    setCanScrollPrev(carousel.scrollLeft > 2);
    setCanScrollNext(carousel.scrollLeft < maximumScroll - 2);
  }, []);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    updateCarouselControls();
    carousel.addEventListener("scroll", updateCarouselControls, { passive: true });
    const resizeObserver = new ResizeObserver(updateCarouselControls);
    resizeObserver.observe(carousel);

    return () => {
      carousel.removeEventListener("scroll", updateCarouselControls);
      resizeObserver.disconnect();
    };
  }, [galleryItems.length, updateCarouselControls]);

  useEffect(() => {
    const onAudibleVideo = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string }>).detail;
      if (detail?.id && !detail.id.startsWith("reel-")) setUnmutedId(null);
    };
    window.addEventListener("bloomie-audible-video", onAudibleVideo);
    return () => window.removeEventListener("bloomie-audible-video", onAudibleVideo);
  }, []);

  useEffect(() => {
    if (!posts.length || !carouselRef.current || !("IntersectionObserver" in window)) return;

    const syncPlayback = () => {
      if (document.hidden) {
        videoRefs.current.forEach(video => video.pause());
        return;
      }

      videoRefs.current.forEach((video, id) => {
        if (isVideoVisible(video)) {
          attemptPlayback(id, video);
        } else {
          video.pause();
        }
      });
    };

    const observer = new IntersectionObserver(() => {
      syncPlayback();
    }, { threshold: [0, 0.01, 0.5, 1] });

    videoRefs.current.forEach(video => observer.observe(video));
    document.addEventListener("visibilitychange", syncPlayback);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncPlayback);
    };
  }, [attemptPlayback, isVideoVisible, posts]);

  const scrollCarousel = (direction: -1 | 1) => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const card = carousel.querySelector<HTMLElement>(".reel-card");
    const gap = Number.parseFloat(window.getComputedStyle(carousel).columnGap) || 0;
    const distance = (card?.getBoundingClientRect().width ?? carousel.clientWidth) + gap;
    carousel.scrollBy({ left: direction * distance, behavior: "smooth" });
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button")) return;

    dragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: event.currentTarget.scrollLeft,
      moved: false,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const distance = event.clientX - drag.startX;
    if (!drag.moved && Math.abs(distance) > 4) {
      drag.moved = true;
      suppressCardClick.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsDragging(true);
    }
    if (drag.moved) event.currentTarget.scrollLeft = drag.scrollLeft - distance;
  };

  const finishPointerDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (drag.moved && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragState.current = null;
    if (drag.moved) {
      setIsDragging(false);
      window.setTimeout(() => { suppressCardClick.current = false; }, 0);
    }
  };

  const preventClickAfterDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!suppressCardClick.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressCardClick.current = false;
  };

  if (loading && galleryItems.length === 0) {
    return <div className="reels-grid" aria-label="Loading Instagram Reels">{[0, 1, 2].map(item => <div className="reel-skeleton" key={item} />)}</div>;
  }

  if (galleryItems.length === 0 && (error || !loading)) {
    return <p className="feed-note" role="status">Instagram Reels are temporarily unavailable.</p>;
  }

  return <div className="reels-carousel"><div ref={carouselRef} className={`reels-grid${isDragging ? " is-dragging" : ""}`} aria-label="Bloomie Instagram posts" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={finishPointerDrag} onPointerCancel={finishPointerDrag} onClickCapture={preventClickAfterDrag} onDragStart={event => event.preventDefault()}>{galleryItems.map(({ post, preview }) => {
    const isMuted = unmutedId !== post.id;
    return <article className="reel-card" key={post.id}>{preview.kind === "video" ? <video ref={element => registerVideo(post.id, element)} data-reel-id={post.id} src={preview.src} poster={preview.poster} autoPlay muted loop playsInline controls={false} preload="metadata" onLoadedData={event => handleVideoLoadedData(post.id, event.currentTarget)} onCanPlay={event => handleVideoCanPlay(post.id, event.currentTarget)} onPlay={event => { if (unmutedIdRef.current !== post.id) event.currentTarget.muted = true; if (isVideoVisible(event.currentTarget)) event.currentTarget.removeAttribute("poster"); else event.currentTarget.pause(); }} onError={event => handleVideoError(event.currentTarget)} /> : <a className="reel-card-link" href={post.permalink} target="_blank" rel="noopener noreferrer" aria-label={post.caption || "View Bloomie post on Instagram"}><img src={preview.src} alt={post.caption || "Bloomie Instagram post"} loading="lazy" decoding="async" draggable={false} />{post.media_type === "CAROUSEL_ALBUM" && <span className="reel-carousel-badge" role="img" aria-label={"Carousel post"} title="Carousel post"><Images /></span>}</a>}{preview.kind === "video" && <><a className="reel-post-link" href={post.permalink} target="_blank" rel="noopener noreferrer" aria-label={post.caption || "View Bloomie Reel on Instagram"}><ExternalLink /></a><button className="reel-mute" type="button" aria-label={isMuted ? "Unmute Reel" : "Mute Reel"} onClick={event => { event.preventDefault(); event.stopPropagation(); const nextId = isMuted ? post.id : null; setUnmutedId(nextId); if (nextId) announceAudibleVideo(`reel-${nextId}`); }}>{isMuted ? <VolumeX /> : <Volume2 />}</button></>}</article>;
  })}</div><div className="reels-carousel-controls" aria-label="Instagram carousel navigation"><button className="reels-carousel-arrow previous" type="button" onClick={() => scrollCarousel(-1)} disabled={!canScrollPrev} aria-label="Previous Instagram posts"><ChevronLeft /></button><button className="reels-carousel-arrow next" type="button" onClick={() => scrollCarousel(1)} disabled={!canScrollNext} aria-label="Next Instagram posts"><ChevronRight /></button></div></div>;
}


export function HomePage() {
  const [activeCategory, setActiveCategory] = useState<ProductCategory>("tops");
  const [selected, setSelected] = useState<Product | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const instagramPosts = useInstagramPosts();
  const openProduct = (product: Product, trigger: HTMLElement) => { returnFocus.current = trigger; setSelected(product); };
  return <><RevealController /><Nav activeCategory={activeCategory} onCategory={setActiveCategory} /><main><section className="hero" id="home"><div className="hero-copy reveal-item reveal-up"><span className="eyebrow">Thoughtfully Handmade</span><h1>Little loops of joy, <em>made just for you.</em></h1><p>Bloomie creates handmade crochet flowers, gifts, accessories and personalised keepsakes—each one patiently made by hand.</p><div className="actions"><a className="button" href="#creations">View Our Creations</a><a className="button ghost" href={instagramUrl} target="_blank" rel="noopener noreferrer"><Camera /> Follow on Instagram</a></div><span className="hero-note">⌁ Handmade slowly, gifted joyfully</span></div><div className="hero-visual reveal-item reveal-right"><div className="hero-image" style={{minHeight:"360px"}}><Image src="/images/crochet-bouquet.png" alt="Blush crochet flower bouquet on cream linen" fill priority sizes="(max-width: 800px) 100vw, 48vw" /></div><div className="badge"><b>100%</b> handmade</div></div></section>
  <CreationsBrowser activeCategory={activeCategory} posts={instagramPosts.productPosts} onCategory={setActiveCategory} onOpen={openProduct} />
  <section className="story section" id="story"><div className="story-image reveal-item reveal-left"><Image src="/images/Maker.jpg" alt="The maker behind Bloomie" fill sizes="(max-width: 800px) 100vw, 42vw" /></div><div className="reveal-item reveal-right"><span className="eyebrow">Meet the Maker</span><h2>From a quiet skein of yarn to something meaningful.</h2><p>Bloomie began with a love for thoughtful gifting and the simple magic of making by hand. Every loop is placed with care and every detail is chosen to make someone smile.</p><p>Whether it’s a bouquet that never fades or a tiny keepsake in someone’s favourite colour, each creation carries the warmth of the hands that made it.</p><strong className="signature">Made slowly, with love.</strong></div></section>
  <section className="section ordering"><div className="center reveal-item reveal-up"><span className="eyebrow">Simple & personal</span><h2>How ordering works</h2></div><ol className="steps reveal-item reveal-up"><li><span>01</span><h3>Explore the creations</h3><p>Browse our handmade pieces and find the one that feels just right.</p></li><li><span>02</span><h3>Select a product</h3><p>See the available options and approximate making time.</p></li><li><span>03</span><h3>Chat on WhatsApp</h3><p>We’ll confirm customisation, price, delivery time and payment details.</p></li></ol></section>
  <section className="section" id="instagram"><div className="heading reveal-item reveal-right"><div><span className="eyebrow"><Camera /> @bloomie.crochet</span><h2>Fresh from Instagram</h2></div><a className="button ghost" href={instagramUrl} target="_blank" rel="noopener noreferrer">Follow Bloomie on Instagram</a></div><InstagramReelsGallery posts={instagramPosts.feedPosts} loading={instagramPosts.loading} error={instagramPosts.error} refresh={instagramPosts.refresh} /></section>
  <section className="cta reveal-item reveal-up" id="custom-order"><span className="eyebrow">Custom orders welcome</span><h2>Have something special in mind?</h2><p>Tell us who it’s for, what you’re imagining, and the colours you love. We’ll help turn it into a handmade keepsake.</p><a className="button whatsapp" href={createWhatsAppUrl(customOrderMessage)} target="_blank" rel="noopener noreferrer"><MessageCircle /> Start a custom order</a></section></main>
  <SiteFooter />{selected && <ProductModal key={selected.id} product={selected} posts={instagramPosts.productPosts} onClose={() => setSelected(null)} returnFocus={returnFocus} />}</>;
}
