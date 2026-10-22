"use client";
import { useT } from "@/i18n/LanguageProvider";
import { useSpace } from "@/features/spaces/SpaceProvider";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, Settings2, ChevronDown } from "lucide-react";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { BrandIcon } from "@/components/brand/BrandIcon";
import { GlobalSearch } from "@/components/search/GlobalSearch";

function initials(email?: string) {
  const parts = (email?.split("@")[0] || "Utilisateur").split(/[._-]/).filter(Boolean);
  return (parts.length >= 2 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2)).toUpperCase();
}
function area(path: string) {
  if (path.startsWith("/clients")) return "Clients";
  if (path.startsWith("/stories")) return "Stories";
  if (path.startsWith("/developments")) return "Développements";
  if (path.startsWith("/xml-imports")) return "Imports XML";
  if (path.startsWith("/settings")) return "Paramètres";
  return "Vue d’ensemble";
}
export function Header({ userEmail, collapsed, onToggleSidebar, mobileOpen, onOpenMobile }: {
  userEmail?: string; collapsed: boolean; onToggleSidebar: () => void; mobileOpen: boolean; onOpenMobile: () => void;
}) {
  const t = useT();
  const space = useSpace();
  const router = useRouter();
  const pathname = usePathname();
  async function signOut() {
    const { createClient } = await import("@/lib/supabaseClient");
    await createClient().auth.signOut(); router.push("/login"); router.refresh();
  }
  return <header className="fixed inset-x-0 top-0 z-40 h-16 bg-sn-header text-white border-b border-white/10 flex items-center gap-3 px-4 lg:px-5">
    <Link href="/dashboard" aria-label={t("SN Dev Hub — accueil")} className="flex items-center gap-2.5 shrink-0 lg:w-[200px]">
      <BrandIcon className="h-9 w-9 shrink-0" />
      <span className="hidden sm:block text-[17px] font-semibold tracking-tight">{t("SN Dev")} <span className="text-[#a3db7b]">{t("Hub")}</span></span>
    </Link>
    <button type="button" onClick={onToggleSidebar} aria-label={collapsed ? t("Déployer la navigation") : t("Réduire la navigation")} aria-expanded={!collapsed} className="hidden lg:flex workspace-header-icon">{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button>
    <button type="button" onClick={onOpenMobile} aria-label={t("Ouvrir la navigation")} aria-expanded={mobileOpen} className="lg:hidden workspace-header-icon"><Menu size={20} /></button>
    <span className="hidden xl:block text-[13px] text-white/65 border-l border-white/15 pl-4 ml-1 whitespace-nowrap">{t(area(pathname))}</span>
    <div className="min-w-0 flex-1 max-w-[560px] mx-auto px-1 lg:px-6"><GlobalSearch /></div>
    <Dropdown.Root>
      <Dropdown.Trigger asChild><button type="button" aria-label={t("Menu du compte")} className="flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#a3db7b]">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#d8e9df] text-[#234c47] text-xs font-bold ring-2 ring-white/10">{initials(userEmail)}</span>
        <span className="hidden 2xl:block text-left max-w-[160px]"><span className="block text-xs font-medium truncate">{userEmail}</span><span className="block text-[10px] text-white/50 mt-0.5">{space?.active.kind === "company" ? space.active.name : t("Espace personnel")}</span></span><ChevronDown size={13} className="hidden sm:block text-white/50" />
      </button></Dropdown.Trigger>
      <Dropdown.Portal><Dropdown.Content align="end" sideOffset={12} className="z-[80] w-64 rounded-xl border border-sn-border bg-white shadow-xl p-1.5 text-sm text-sn-text">
        <Dropdown.Label className="px-3 py-2"><span className="block text-xs text-sn-text-muted mb-1">{space?.active.kind === "company" ? space.active.name : t("Connecté à votre espace personnel")}</span><span className="block truncate font-medium">{userEmail || "Mon compte"}</span></Dropdown.Label>
        <Dropdown.Separator className="h-px bg-sn-border my-1" />
        <Dropdown.Item asChild><Link href="/settings" className="workspace-menu-item"><Settings2 size={16} />{t("Paramètres du compte")}</Link></Dropdown.Item>
        <Dropdown.Item onSelect={() => void signOut()} className="workspace-menu-item text-sn-danger"><LogOut size={16} />{t("Se déconnecter")}</Dropdown.Item>
      </Dropdown.Content></Dropdown.Portal>
    </Dropdown.Root>
  </header>;
}
