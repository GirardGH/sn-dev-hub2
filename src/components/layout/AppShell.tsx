"use client";
import { useT } from "@/i18n/LanguageProvider";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { NavigationFeedback } from "./NavigationFeedback";

export function AppShell({ children, userEmail }: { children: React.ReactNode; userEmail?: string }) {
  const t = useT();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  useEffect(() => { try { setCollapsed(localStorage.getItem("sn-sidebar-collapsed") === "true"); } catch {} }, []);
  function toggleSidebar() {
    setCollapsed(value => {
      try { localStorage.setItem("sn-sidebar-collapsed", String(!value)); } catch {}
      return !value;
    });
  }
  return <div className="workspace-shell min-h-screen bg-sn-bg" style={{ "--sidebar-width": collapsed ? "76px" : "240px" } as CSSProperties}>
    <a href="#workspace-main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-sm focus:bg-white focus:px-4 focus:py-2">{t("Aller au contenu")}</a>
    <Header userEmail={userEmail} collapsed={collapsed} onToggleSidebar={toggleSidebar} mobileOpen={mobileOpen} onOpenMobile={() => setMobileOpen(true)} />
    <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onCloseMobile={closeMobile} />
    <NavigationFeedback />
    <main id="workspace-main" tabIndex={-1} className="workspace-main min-w-0 pt-16 min-h-screen outline-hidden">
      <div className="workspace-content p-4 lg:p-6 xl:p-8">{children}</div>
    </main>
  </div>;
}
