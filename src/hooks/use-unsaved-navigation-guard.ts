"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type UseUnsavedNavigationGuardParams = {
  isDirty: boolean;
  message: string;
};

type UseUnsavedNavigationGuardResult = {
  isDialogOpen: boolean;
  stayOnPage: () => void;
  confirmLeave: () => void;
};

export function useUnsavedNavigationGuard({
  isDirty,
  message,
}: UseUnsavedNavigationGuardParams): UseUnsavedNavigationGuardResult {
  const router = useRouter();
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [isDialogOpen, setDialogOpen] = useState(false);

  const stayOnPage = useCallback(() => {
    setDialogOpen(false);
    setPendingPath(null);
  }, []);

  const confirmLeave = useCallback(() => {
    if (!pendingPath) {
      setDialogOpen(false);
      return;
    }

    const next = pendingPath;
    setDialogOpen(false);
    setPendingPath(null);
    router.push(next);
  }, [pendingPath, router]);

  useEffect(() => {
    if (!isDirty) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = message;
      return message;
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [isDirty, message]);

  useEffect(() => {
    if (!isDirty) return;

    const onClickCapture = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href) return;
      if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;

      const nextPath = `${url.pathname}${url.search}${url.hash}`;
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (nextPath === currentPath) return;

      event.preventDefault();
      event.stopPropagation();
      setPendingPath(nextPath);
      setDialogOpen(true);
    };

    document.addEventListener("click", onClickCapture, true);
    return () => {
      document.removeEventListener("click", onClickCapture, true);
    };
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;

    const onPopState = () => {
      const allow = window.confirm(message);
      if (!allow) {
        window.history.go(1);
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [isDirty, message]);

  return {
    isDialogOpen,
    stayOnPage,
    confirmLeave,
  };
}
