"use client";
import { useT } from "@/i18n/LanguageProvider";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const MIN_VISIBLE_MS = 260;
const MAX_VISIBLE_MS = 5000;

function isInternalNavigationLink(anchor: HTMLAnchorElement) {
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return false;
  if (anchor.target && anchor.target !== "_self") return false;

  const targetUrl = new URL(anchor.href, window.location.href);
  if (targetUrl.origin !== window.location.origin) return false;

  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const target = `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
  return current !== target;
}

export function NavigationFeedback() {
  const t = useT();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const shownAtRef = useRef(0);
  const maxTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (maxTimerRef.current) window.clearTimeout(maxTimerRef.current);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, []);

  const show = () => {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    if (maxTimerRef.current) window.clearTimeout(maxTimerRef.current);
    shownAtRef.current = Date.now();
    setVisible(true);
    maxTimerRef.current = window.setTimeout(() => setVisible(false), MAX_VISIBLE_MS);
  };

  const hide = () => {
    if (!visible) return;
    const elapsed = Date.now() - shownAtRef.current;
    const delay = Math.max(0, MIN_VISIBLE_MS - elapsed);
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      setVisible(false);
      if (maxTimerRef.current) window.clearTimeout(maxTimerRef.current);
    }, delay);
  };

  useEffect(() => {
    hide();
    // The pathname change is the signal that the requested route rendered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      if (target.closest("[data-navigation-feedback='ignore'], input, select, textarea")) return;

      const explicitTrigger = target.closest("[data-navigation-feedback='true']");
      if (explicitTrigger) {
        show();
        return;
      }

      const anchor = target.closest("a[href]");
      if (anchor instanceof HTMLAnchorElement && isInternalNavigationLink(anchor)) show();
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  if (!visible) return null;

  return (
    <div className="workspace-navigation-overlay fixed right-0 top-16 bottom-0 z-[60] flex items-center justify-center bg-sn-bg/55 backdrop-blur-[3px]">
      <div className="flex items-center gap-3 rounded-xl border border-sn-border bg-white/95 px-4 py-3 shadow-xl shadow-slate-900/10">
        <div className="sn-navigation-spinner" aria-hidden="true" />
        <div>
          <p className="text-[13px] font-semibold text-sn-text leading-tight">{t("Chargement")}</p>
          <p className="text-[11px] text-sn-text-muted leading-tight mt-0.5">{t("Ouverture en cours…")}</p>
        </div>
      </div>
    </div>
  );
}
