"use client";

import { Check, Share2 } from "lucide-react";
import { useEffect, useState } from "react";

type ShareStatus = "idle" | "copied" | "failed";

export function ShareButton({ path, title, compact = false, className = "" }: { path: string; title: string; compact?: boolean; className?: string }) {
  const [status, setStatus] = useState<ShareStatus>("idle");

  useEffect(() => {
    if (status === "idle") return;
    const timer = window.setTimeout(() => setStatus("idle"), 1800);
    return () => window.clearTimeout(timer);
  }, [status]);

  const share = async () => {
    const url = new URL(path, window.location.origin).toString();
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
      return;
    } catch {
      const input = document.createElement("textarea");
      input.value = url;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      const copiedSuccessfully = document.execCommand("copy");
      input.remove();
      setStatus(copiedSuccessfully ? "copied" : "failed");
    }
  };

  const label = status === "copied" ? "Link copied" : status === "failed" ? "Unable to copy" : "Share";
  const buttonClassName = `${compact ? "card-share-button" : "button ghost share-button"} ${className}`.trim();
  return <button className={buttonClassName} type="button" onClick={event => { event.stopPropagation(); void share(); }} aria-label={compact ? `Share ${title}` : undefined} title={compact ? `Share ${title}` : undefined}><span aria-live="polite" className={compact ? "sr-only" : undefined}>{label}</span>{status === "copied" ? <Check aria-hidden="true" /> : <Share2 aria-hidden="true" />}{!compact && status === "idle" && " Share"}</button>;
}
