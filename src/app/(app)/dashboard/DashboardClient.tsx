"use client";
import { SpaceWriteOnly } from "@/features/spaces/SpaceWriteOnly";
import { useT } from "@/i18n/LanguageProvider";
import { useSpace } from "@/features/spaces/SpaceProvider";
import Link from "next/link";
import { Building2, BookOpen, Code2, FileCode2, ArrowRight, Plus, ArrowUpRight, Library, Upload } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/utils";
import { DEVELOPMENT_TYPE_MAP } from "@/features/developments/developmentTypes";
import { resolveSnLabel } from "@/features/xml/snTableRegistry";
interface Stats {
  clients: number;
  stories: number;
  developments: number;
}

export interface RecentDev {
  id: string;
  title: string;
  development_type: string;
  status: string;
  created_at: string;
  client_id: string;
  story_id: string;
  stories: { title: string } | null;
  clients: { name: string } | null;
}

export interface RecentImport {
  id: string;
  filename: string;
  created_developments_count: number;
  status: string;
  created_at: string;
  clients: { name: string } | null;
}

interface Props {
  stats: Stats;
  recentDevelopments: RecentDev[];
  recentImports: RecentImport[];
}


const statCards = [
  { key: "clients" as const, label: "Clients", description: "Vos contextes de mission", icon: Building2, href: "/clients", color: "bg-[#edf3f8] text-[#476d87]" },
  { key: "stories" as const, label: "Stories", description: "Vos besoins et réalisations", icon: BookOpen, href: "/stories", color: "bg-[#edf3e8] text-[#5b7b3d]" },
  { key: "developments" as const, label: "Développements", description: "Votre bibliothèque technique", icon: Code2, href: "/developments", color: "bg-[#e8f2ef] text-[#28766b]" },
];
export function DashboardClient({ stats, recentDevelopments, recentImports }: Props) {
  const t = useT();
  const space = useSpace();
  return <div className="max-w-[1600px] mx-auto">
    <div className="flex flex-wrap items-end justify-between gap-4 mb-7">
      <div><p className="text-xs font-medium text-sn-accent mb-2 flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-[#7fb35c] rounded-full" />{space?.active.kind === "company" ? space.active.name : t("Espace personnel")}</p>
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight text-sn-text">{t("Votre savoir-faire, au même endroit.")}</h1>
        <p className="text-sm text-sn-text-muted mt-2">{t("Retrouvez vos clients, vos stories et tous vos développements ServiceNow.")}</p></div>
      <div className="flex gap-2"><SpaceWriteOnly><Link href="/xml-imports/new" className="inline-flex items-center gap-2 px-3.5 h-9 rounded-md border border-sn-border bg-white text-sn-text text-xs font-semibold hover:bg-sn-accent-light"><Upload size={15} />{t("Importer un XML")}</Link></SpaceWriteOnly><SpaceWriteOnly><Link href="/developments/new" className="inline-flex items-center gap-2 px-3.5 h-9 rounded-md bg-sn-accent text-white text-xs font-semibold hover:bg-sn-accent-hover"><Plus size={16} />{t("Nouveau développement")}</Link></SpaceWriteOnly></div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7">
      {statCards.map(({key,label,description,icon:Icon,href,color}) => <Link key={key} href={href} className="workspace-card p-5 group hover:border-sn-accent/40 transition-colors">
        <div className="flex justify-between items-start"><span className={`flex items-center justify-center w-10 h-10 rounded-xl ${color}`}><Icon size={21} strokeWidth={1.7} /></span><ArrowUpRight size={17} className="text-sn-border-dark group-hover:text-sn-accent" /></div>
        <div className="flex items-baseline gap-2.5 mt-4"><span className="text-[32px] font-semibold leading-none tracking-tight tabular-nums">{stats[key]}</span><span className="text-sm font-medium">{t(label)}</span></div><p className="text-xs text-sn-text-muted mt-2">{t(description)}</p>
      </Link>)}
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-5 items-start">
      <section className="workspace-card overflow-hidden">
        <div className="flex flex-wrap gap-2 items-center justify-between px-5 py-4 border-b border-sn-border"><div><h2 className="text-[15px] font-semibold">{t("Derniers développements")}</h2><p className="text-xs text-sn-text-muted mt-0.5">{t("Vos ajouts les plus récents")}</p></div><Link href="/developments" className="flex items-center gap-1.5 text-xs font-semibold text-sn-accent hover:underline">{t("Tout consulter")}<ArrowRight size={14}/></Link></div>
        <div className="divide-y divide-sn-border/70">{recentDevelopments.length === 0 ? <div className="p-10 text-center text-sn-text-muted"><Library className="mx-auto mb-3 text-sn-border-dark" /><p>{t("Votre bibliothèque attend son premier développement.")}</p><SpaceWriteOnly><Link className="text-sn-accent inline-block mt-3 hover:underline" href="/developments/new">{t("Créer un développement")}</Link></SpaceWriteOnly></div> : recentDevelopments.map(dev => <Link key={dev.id} href={`/clients/${dev.client_id}/stories/${dev.story_id}/developments/${dev.id}`} className="group flex items-start gap-3 px-5 py-4 hover:bg-sn-accent-light/60 transition-colors">
          <span className="w-9 h-9 rounded-lg bg-sn-table-header border border-sn-border/70 flex items-center justify-center shrink-0 text-sn-accent mt-0.5"><Code2 size={17} /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-sn-text group-hover:text-sn-accent truncate" title={dev.title}>{dev.title}</p><p className="text-xs text-sn-text-muted mt-1 truncate">{t(DEVELOPMENT_TYPE_MAP[dev.development_type as keyof typeof DEVELOPMENT_TYPE_MAP]?.label ?? resolveSnLabel(dev.development_type))}{dev.clients ? ` · ${dev.clients.name}` : ""}</p><p className="sm:hidden text-[11px] text-sn-text-muted mt-1">{formatDateTime(dev.created_at)}</p></div><div className="shrink-0 flex flex-col items-end gap-2"><StatusBadge status={dev.status} /><span className="hidden sm:block text-[11px] text-sn-text-muted">{formatDateTime(dev.created_at)}</span></div>
        </Link>)}</div>
      </section>
      <div className="space-y-5 min-w-0"><section className="workspace-card overflow-hidden"><div className="flex justify-between items-center gap-2 px-5 py-4 border-b border-sn-border"><h2 className="text-[15px] font-semibold">{t("Imports XML récents")}</h2><Link href="/xml-imports" aria-label={t("Consulter tous les imports XML")} className="text-sn-accent hover:bg-sn-accent-light rounded-md p-1"><ArrowRight size={16}/></Link></div><div className="divide-y divide-sn-border/70">{recentImports.length === 0 ? <p className="p-5 text-sm text-sn-text-muted">{t("Aucun import pour le moment.")}</p> : recentImports.slice(0,4).map(imp => <Link key={imp.id} href={`/xml-imports/${imp.id}`} className="flex gap-3 px-5 py-3.5 hover:bg-sn-accent-light/60"><FileCode2 size={18} className="text-sn-accent shrink-0 mt-0.5"/><div className="min-w-0"><p className="truncate text-[13px] font-medium" title={imp.filename}>{imp.filename}</p><p className="text-xs text-sn-text-muted mt-1">{imp.created_developments_count} {t("développement")}{imp.created_developments_count > 1 ? "s" : ""}{imp.clients ? ` · ${imp.clients.name}` : ""}</p></div></Link>)}</div></section>
        <section className="rounded-xl border border-[#d6e5d4] bg-[#edf4e9] p-5"><span className="flex w-9 h-9 items-center justify-center rounded-lg bg-white/75 text-[#507c44]"><Upload size={18}/></span><h2 className="font-semibold text-[15px] mt-3">{t("Archivez un Update Set")}</h2><p className="text-xs leading-relaxed text-[#526c54] mt-1.5">{t("Importez votre XML pour retrouver les développements qu’il contient dans votre bibliothèque.")}</p><SpaceWriteOnly><Link href="/xml-imports/new" className="flex items-center gap-2 text-xs font-semibold text-[#365c34] mt-4 hover:underline">{t("Importer un fichier XML")}<ArrowRight size={14}/></Link></SpaceWriteOnly></section>
      </div>
    </div>
    <SpaceWriteOnly><section className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 py-3"><span className="text-xs text-sn-text-muted font-medium">{t("Créer rapidement")}</span>{[{href:"/clients/new",label:t("Un client"),icon:Building2},{href:"/stories/new",label:t("Une story"),icon:BookOpen},{href:"/developments/new",label:t("Un développement"),icon:Code2}].map(({href,label,icon:Icon})=><Link key={href} href={href} className="flex items-center gap-2 text-xs text-sn-accent font-semibold hover:underline"><Icon size={15}/>{label}<Plus size={12} className="opacity-60"/></Link>)}</section></SpaceWriteOnly>
  </div>;
}
