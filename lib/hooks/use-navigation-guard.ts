"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

/**
 * Intercepts all in-app navigations (sidebar, links, back button, etc.)
 * and tab close/refresh when `shouldBlock` is true.
 *
 * Returns `showDialog` / `confirm` / `cancel` for rendering a confirmation dialog.
 */
export function useNavigationGuard(shouldBlock: boolean) {
  const router = useRouter();
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!shouldBlock) return;

    // Intercept <a> clicks in capture phase — fires BEFORE Next.js Link handler
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Skip external links, downloads, new tabs, modifier keys
      if (href.startsWith("http") || href.startsWith("//") || href.startsWith("mailto:")) return;
      if (anchor.target === "_blank") return;
      if (anchor.hasAttribute("download")) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      // Skip same-page navigation
      if (href === pathname) return;

      e.preventDefault();
      e.stopPropagation();
      setPendingHref(href);
    };

    // Tab close / refresh guard
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    document.addEventListener("click", handleClick, true);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [shouldBlock, pathname]);

  const confirm = useCallback(() => {
    const href = pendingHref;
    setPendingHref(null);
    if (href) router.push(href);
  }, [pendingHref, router]);

  const cancel = useCallback(() => {
    setPendingHref(null);
  }, []);

  return { showDialog: pendingHref !== null, confirm, cancel };
}
