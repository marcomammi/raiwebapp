import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

/**
 * When running as an installed PWA (iOS Home Screen / standalone display mode),
 * a same-origin <a href> click that isn't handled by the router causes iOS to
 * pop out to Safari with the URL bar. This listener intercepts those clicks
 * and routes them through TanStack Router instead.
 *
 * Skipped for: non-standalone browsing, external origins, mailto/tel/etc.,
 * target=_blank, download links, modifier-key clicks, and file assets
 * (e.g. .pdf) that should still open natively.
 */
export function StandaloneNavGuard() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS Safari legacy flag
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (!isStandalone) return;

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const path = e.composedPath();
      const anchor = path.find(
        (n): n is HTMLAnchorElement =>
          n instanceof HTMLAnchorElement && !!n.href,
      );
      if (!anchor) return;

      // Respect explicit opt-outs
      const target = anchor.target;
      if (target && target !== "" && target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      if (anchor.dataset.noRouter === "true") return;

      const url = new URL(anchor.href, window.location.href);
      // Only intercept http(s) same-origin URLs
      if (url.protocol !== "http:" && url.protocol !== "https:") return;
      if (url.origin !== window.location.origin) return;

      // Leave asset/download-like URLs to the browser (pdf, images, zip, etc.)
      if (/\.[a-z0-9]{2,5}$/i.test(url.pathname)) return;

      // Same page + hash: let browser handle in-page anchor scroll
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search &&
        url.hash
      ) {
        return;
      }

      e.preventDefault();
      router.navigate({
        to: url.pathname + url.search + url.hash,
        replace: false,
      });
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [router]);

  return null;
}