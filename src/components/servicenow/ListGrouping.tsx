"use client";
import { isValidElement, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { useT } from "@/i18n/LanguageProvider";

// Read labels from existing cell renderers without rendering interactive links/buttons in a group header.
function plainLabel(node: ReactNode, translate: (value: string) => string): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(n => plainLabel(n, translate)).join("");
  if (isValidElement<{children?: ReactNode; text?: string; status?: string}>(node)) {
    if (typeof node.props.text === "string") return translate(node.props.text);
    if (typeof node.props.status === "string") return translate(node.props.status.replaceAll("_", " ").replace(/\b\w/g,c=>c.toUpperCase()));
    return plainLabel(node.props.children, translate);
  }
  return "";
}
export function GroupHeader({colSpan, field, value, count, closed, toggle, rendered, fallback}: {
  colSpan: number; field: string; value: string; count: number; closed: boolean; toggle: () => void; rendered?: ReactNode; fallback: unknown;
}) {
  const t = useT();
  const label = value === "" ? t("Empty value") : plainLabel(rendered,t) || String(fallback ?? value);
  return <tr className="border-y border-sn-border bg-sn-accent-light"><td colSpan={colSpan} className="p-0">
    <button type="button" aria-expanded={!closed} onClick={toggle} title={value} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-sn-accent focus-visible:outline focus-visible:outline-sn-accent">
      <ChevronRight aria-hidden="true" className={`h-4 w-4 shrink-0 transition-transform ${closed ? "" : "rotate-90"}`} />
      <span className="break-words">{t(field)}: {label}</span><span className="rounded-md border border-sn-border bg-white px-2 py-0.5 text-xs">{count}</span>
    </button>
  </td></tr>;
}
export function GroupToolbar({label,count,clear,expand,collapse}: {label: string; count: number; clear: () => void; expand: () => void; collapse: () => void}) {
  const t = useT();
  return <div role="region" aria-label={t("Grouped by")} className="flex flex-wrap items-center gap-3 border-b border-sn-border bg-white px-4 py-2 text-xs">
    <span className="font-semibold text-sn-text">{t("Grouped by")}: {t(label)} · {count} {t("groups")}</span>
    <button type="button" onClick={expand} className="text-sn-accent hover:underline">{t("Expand all groups")}</button>
    <button type="button" onClick={collapse} className="text-sn-accent hover:underline">{t("Collapse all groups")}</button>
    <button type="button" onClick={clear} className="text-sn-accent hover:underline">{t("Remove grouping")}</button>
  </div>;
}
