"use client";
import { SpaceWriteOnly } from "@/features/spaces/SpaceWriteOnly";
import { useT } from "@/i18n/LanguageProvider";
import { SpaceSwitcher } from "@/features/spaces/SpaceSwitcher";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Building2, BookOpen, Code2, FileCode2, Settings2, LayoutDashboard, Plus, ChevronRight, X, Library } from "lucide-react";
import { cn } from "@/lib/utils";
const groups = [
  { label: "Mon espace", items: [
    {href:"/dashboard",label:"Vue d’ensemble",icon:LayoutDashboard},
    {href:"/clients",label:"Clients",icon:Building2},
    {href:"/stories",label:"Stories",icon:BookOpen},
    {href:"/developments",label:"Développements",icon:Code2},
  ]},
  {label:"Outils",items:[{href:"/spaces",label:"Spaces",icon:Building2},{href:"/xml-imports",label:"Imports XML",icon:FileCode2},{href:"/settings",label:"Paramètres",icon:Settings2}]},
];
export function Sidebar({ collapsed, mobileOpen, onCloseMobile }: {collapsed: boolean; mobileOpen: boolean; onCloseMobile: () => void}) {
  const t = useT();
  const path = usePathname();
  useEffect(() => { onCloseMobile(); }, [path, onCloseMobile]);
  function contents(compact: boolean) {
    return <>
      <SpaceSwitcher compact={compact} />
      <div className={cn("py-6", compact ? "px-3" : "px-5")}>
        <SpaceWriteOnly><Link href="/developments/new" title={compact ? t("Nouveau développement") : undefined} className={cn("flex items-center justify-center gap-2 rounded-lg h-10 text-[13px] font-semibold border border-sn-accent/20 bg-sn-accent-light text-sn-accent hover:bg-[#d7e9e7] transition-colors", compact && "w-12")}><Plus size={17} /><span className={compact ? "sr-only" : ""}>{t("Nouveau développement")}</span></Link></SpaceWriteOnly>
      </div>
      <nav aria-label={t("Navigation principale")} className="flex-1 overflow-y-auto px-3">
        {groups.map(group => <div key={group.label} className="mb-6">
          {!compact && <p className="px-3 mb-2 text-[10px] uppercase tracking-[0.13em] font-semibold text-[#849392]">{t(group.label)}</p>}
          {group.items.map(({href,label,icon:Icon}) => {
            const active = href === "/dashboard" ? path === href : path.startsWith(href);
            return <Link key={href} href={href} aria-current={active ? "page" : undefined} title={compact ? t(label) : undefined} className={cn("group relative flex items-center gap-3 min-h-11 rounded-lg my-1 px-3 text-[13px] transition-colors",compact && "justify-center px-0",active ? "bg-[#eaf2ee] text-[#244c40] font-semibold" : "text-[#596d70] hover:bg-[#f1f5f4] hover:text-sn-text")}>
              {active && <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-[#73aa4d]" />}
              <Icon size={18} strokeWidth={active ? 1.9 : 1.7} className="shrink-0" /><span className={compact ? "sr-only" : "flex-1"}>{t(label)}</span>{active && !compact && <ChevronRight size={13} className="opacity-50" />}
            </Link>;
          })}
        </div>)}
      </nav>
      <div className={cn("border-t border-sn-border mx-4 py-4",compact && "mx-3")}>
        <div className={cn("flex gap-2.5 items-center",compact && "justify-center")}><span className="w-8 h-8 rounded-lg bg-[#f0f4f2] flex items-center justify-center text-[#6b817b]"><Library size={16} /></span>{!compact && <div><p className="text-xs text-sn-text font-medium">{t("Votre bibliothèque")}</p><p className="text-[10px] text-sn-text-muted mt-0.5">{t("Clients · Stories · Développements")}</p></div>}</div>
      </div>
    </>;
  }
  return <>
    <aside className="workspace-sidebar fixed top-16 left-0 bottom-0 hidden lg:flex flex-col bg-white border-r border-sn-border z-30 select-none">{contents(collapsed)}</aside>
    <Dialog.Root open={mobileOpen} onOpenChange={v => { if (!v) onCloseMobile(); }}><Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-sn-header/45 lg:hidden" />
      <Dialog.Content className="fixed left-0 top-0 bottom-0 z-50 flex flex-col w-[280px] max-w-[85vw] bg-white shadow-2xl lg:hidden">
        <div className="h-16 px-5 border-b border-sn-border flex items-center justify-between"><Dialog.Title className="font-semibold text-sn-text">{t("SN Dev Hub")}</Dialog.Title><Dialog.Close aria-label={t("Fermer la navigation")} className="p-2 text-sn-text-muted"><X size={18} /></Dialog.Close></div>
        <Dialog.Description className="sr-only">{t("Accéder aux clients, stories, développements et imports XML.")}</Dialog.Description>{contents(false)}
      </Dialog.Content>
    </Dialog.Portal></Dialog.Root>
  </>;
}
