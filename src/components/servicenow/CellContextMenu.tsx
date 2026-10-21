"use client";
import { useEffect, useRef, useState, type MouseEvent, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/i18n/LanguageProvider";
import { addCellFilter, cellValue, type CellFilter } from "./cellFilters";

type Cell = Omit<CellFilter, "id" | "operator" | "value"> & { value: unknown };
type Menu = Omit<CellFilter, "id" | "operator"> & { x: number; y: number; anchor: HTMLElement };
export function useCellFilters() {
  const [filters, setFilters] = useState<CellFilter[]>([]);
  const [menu, setMenu] = useState<Menu | null>(null);
  function open(event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>, cell: Cell) {
    const value = cellValue(cell.value);
    if (value === undefined) return;
    event.preventDefault(); event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const keyboard = !("clientX" in event) || (event.clientX === 0 && event.clientY === 0);
    const x = keyboard ? rect.left : event.clientX;
    const y = keyboard ? rect.bottom : event.clientY;
    setMenu({ ...cell, value, x: Math.max(8, Math.min(x, window.innerWidth - 280)), y: Math.max(8, Math.min(y, window.innerHeight - 190)), anchor: event.currentTarget });
  }
  function choose(operator: CellFilter["operator"]) {
    if (!menu) return;
    const { key, label, value, display, anchor } = menu;
    setFilters(previous => addCellFilter(previous, { id: crypto.randomUUID(), key, label, value, display, operator }));
    setMenu(null);
    if (anchor.isConnected) anchor.focus({ preventScroll: true });
  }
  const ui = <>
    <CellFilterBar filters={filters} remove={id => setFilters(previous => previous.filter(f => f.id !== id))} clear={() => setFilters([])} />
    {menu && <ValueMenu menu={menu} close={() => setMenu(null)} choose={choose} />}
  </>;
  return { filters, open, ui };
}
function CellFilterBar({ filters, remove, clear }: { filters: CellFilter[]; remove: (id: string) => void; clear: () => void }) {
  const t = useT();
  if (!filters.length) return null;
  return <div className="flex flex-wrap items-center gap-2 border-b border-sn-border bg-sn-accent-light px-4 py-2" role="region" aria-label={t("Cell filters")}>
    <span className="text-xs text-sn-text-muted">{t("Cell filters")}:</span>
    {filters.map(f => <button key={f.id} type="button" onClick={() => remove(f.id)} title={t("Remove filter")} className="max-w-full rounded-md border border-sn-border bg-white px-2 py-1 text-left text-xs text-sn-text"><span className="break-all">{t(f.label)} {f.operator === "is" ? "=" : "≠"} {f.display || t("Empty value")}</span><span aria-hidden="true" className="ml-2">×</span><span className="sr-only">{t("Remove filter")}</span></button>)}
    <button type="button" onClick={clear} className="px-2 py-1 text-xs font-medium text-sn-accent hover:underline">{t("Clear cell filters")}</button>
    <span className="text-xs text-sn-text-muted">{t("Filters apply to loaded records.")}</span>
  </div>;
}
function ValueMenu({ menu, close, choose }: { menu: Menu; close: () => void; choose: (operator: CellFilter["operator"]) => void }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const anchor = menu.anchor;
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const outside = (e: Event) => { if (!ref.current?.contains(e.target as Node)) close(); };
    const escape = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); close(); if (anchor.isConnected) anchor.focus({ preventScroll: true }); } };
    window.addEventListener("pointerdown", outside, true);
    window.addEventListener("scroll", outside, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", escape);
    return () => { window.removeEventListener("pointerdown", outside, true); window.removeEventListener("scroll", outside, true); window.removeEventListener("resize", close); window.removeEventListener("keydown", escape); };
  }, [menu, close]);
  return createPortal(<div ref={ref} role="menu" aria-label={t("Value actions")} onClick={e => e.stopPropagation()} onContextMenu={e => e.preventDefault()}
    onKeyDown={e => {
      const buttons = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) { e.preventDefault(); const next = e.key === "Home" ? 0 : e.key === "End" ? buttons.length - 1 : (index + (e.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length; buttons[next]?.focus(); }
      if (e.key === "Tab") close();
    }} style={{ position: "fixed", top: menu.y, left: menu.x, width: "min(264px, calc(100vw - 16px))", zIndex: 10000 }} className="rounded-lg border border-sn-border bg-white py-1 shadow-xl">
    <div className="border-b border-sn-border px-3 py-2 text-xs"><p className="font-semibold text-sn-text">{t(menu.label)}</p><p className="mt-1 truncate text-sn-text-muted" title={menu.display}>{menu.display || t("Empty value")}</p></div>
    <button type="button" role="menuitem" onClick={() => choose("is")} className="block w-full px-3 py-2 text-left text-sm text-sn-text hover:bg-sn-accent-light focus:bg-sn-accent-light focus:outline-none">{t("Show Matching")}</button>
    <button type="button" role="menuitem" onClick={() => choose("is_not")} className="block w-full px-3 py-2 text-left text-sm text-sn-text hover:bg-sn-accent-light focus:bg-sn-accent-light focus:outline-none">{t("Filter Out")}</button>
  </div>, document.body);
}
