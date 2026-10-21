"use client";
import { useT } from "@/i18n/LanguageProvider";

import { useState } from "react";
import dynamic from "next/dynamic";
import { FormSection } from "@/components/servicenow/RecordForm";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FlowPreviewTrigger {
  name: string;
  definition: string;
  comment: string;
  table?: string;
  catalog_item?: string;
}

export interface FlowPreviewInput {
  name: string;
  label: string;
  type: string;
  mandatory: boolean;
  reference?: string;
  default_value?: string;
  order: number;
}

export interface FlowPreviewStage {
  label: string;
  value: string;
  order: number;
  type: string;
}

export interface FlowPreviewStepOutput {
  path: string;
  type: string;
  reference?: string;
  reference_display?: string;
  choices?: Array<{ label: string; value: string }>;
}

export interface FlowPreviewStepInput {
  source_order: number;
  source_label: string;
  field: string;
  usages: string[];
}

export interface FlowPreviewStepParam {
  name: string;
  value: string;
  display_value: string;
}

export interface FlowPreviewStep {
  order: number;
  label: string;
  type: string;
  table: string;
  sys_id: string;
  action: string;
  stage?: string;
  uuid?: string;
  parent_ui_id?: string;
  connected_to?: string;
  condition?: string;
  comment?: string;
  outputs?: FlowPreviewStepOutput[];
  inputs?: FlowPreviewStepInput[];
  params?: FlowPreviewStepParam[];
  branch_type?: string | null;
}

export interface FlowDebugInfo {
  tables_found: string[];
  record_counts: Record<string, number>;
  branch_structure_found: boolean;
  branch_note: string;
  fields_per_table: Record<string, string[]>;
}

export interface FlowPreviewData {
  name: string;
  description: string;
  status: string;
  type: string;
  run_as: string;
  sys_id: string;
  trigger?: FlowPreviewTrigger;
  inputs: FlowPreviewInput[];
  stages: FlowPreviewStage[];
  steps: FlowPreviewStep[];
  debug?: FlowDebugInfo;
}

// ── React Flow canvas — loaded client-side only (no SSR) ─────────────────────

const FlowCanvas = dynamic(
  () =>
    import("./FlowCanvasPreview").then((m) => ({ default: m.FlowCanvasPreview })),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 rounded-xl border border-slate-200 bg-slate-50 animate-pulse" />
    ),
  }
);

// ── Debug panel ───────────────────────────────────────────────────────────────

function FlowDebugPanel({ debug }: { debug: FlowDebugInfo }) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
      <button
        className="w-full flex items-center justify-between px-4 py-2.5 font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{t("Debug: extracted flow data —")}{debug.tables_found.length} {t("tables found")}</span>
        <span className="text-slate-400 ml-2">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="p-4 space-y-4 bg-white">
          {/* Branch detection status */}
          <div
            className={`rounded-lg border px-4 py-3 ${
              debug.branch_structure_found
                ? "bg-emerald-50 border-emerald-200"
                : "bg-amber-50 border-amber-200"
            }`}
          >
            <p
              className={`font-bold ${
                debug.branch_structure_found ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              {debug.branch_structure_found
                ? "✓ Branch data found in XML"
                : "⚠ Branch structure not found in XML export"}
            </p>
            <p
              className={`mt-0.5 ${
                debug.branch_structure_found ? "text-emerald-600" : "text-amber-600"
              }`}
            >
              {debug.branch_note}
            </p>
          </div>

          {/* Tables found */}
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
              {t("Tables found in XML")}</p>
            <div className="flex flex-wrap gap-1.5">
              {debug.tables_found.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-sm font-mono font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100"
                >
                  {t}
                  <span className="text-indigo-400 font-normal">
                    &nbsp;({debug.record_counts[t]})
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* Fields per interesting table */}
          {Object.keys(debug.fields_per_table).length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                {t("Available fields (first record)")}</p>
              <div className="space-y-2">
                {Object.entries(debug.fields_per_table).map(([table, fields]) => (
                  <div key={table} className="bg-slate-50 rounded-md p-2.5 border border-slate-100">
                    <p className="font-semibold font-mono text-indigo-600 mb-1">
                      {table}{" "}
                      <span className="font-normal text-slate-400">
                        — {debug.record_counts[table]} {t("record")}{debug.record_counts[table] !== 1 ? "s" : ""}
                      </span>
                    </p>
                    <p className="font-mono text-[10px] text-slate-500 leading-relaxed break-all">
                      {fields.join("  ·  ")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Status badge helper ───────────────────────────────────────────────────────

function getStatusBadge(status: string): { label: string; classes: string } {
  const s = status.toLowerCase();
  if (s === "active" || s === "published" || s === "1")
    return { label: status || "Active", classes: "bg-emerald-100 text-emerald-800 border-emerald-200" };
  if (s === "inactive" || s === "retired" || s === "0")
    return { label: status || "Inactive", classes: "bg-red-100 text-red-800 border-red-200" };
  if (s === "paused" || s === "3")
    return { label: "Paused", classes: "bg-amber-100 text-amber-800 border-amber-200" };
  if (s === "draft" || s === "2")
    return { label: "Draft", classes: "bg-slate-100 text-slate-600 border-slate-200" };
  if (s)
    return { label: status, classes: "bg-slate-100 text-slate-600 border-slate-200" };
  return { label: "Draft", classes: "bg-slate-100 text-slate-600 border-slate-200" };
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  data: FlowPreviewData;
}

export function FlowPreview({ data }: Props) {
  const t = useT();
  const { label: statusLabel, classes: statusClasses } = getStatusBadge(data.status);
  const hasStages = (data.stages ?? []).length > 0;
  const hasInputs = (data.inputs ?? []).length > 0;

  // Deduplicate stages by label
  const uniqueStages = (data.stages ?? []).filter(
    (s, i, arr) => arr.findIndex((x) => x.label === s.label) === i
  );

  return (
    <>
      {/* ── Summary ─────────────────────────────────────────────────────────── */}
      <FormSection title={t("Flow Designer Preview")} columns={1}>
        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">
              {data.name || "—"}
            </p>
            {data.description && (
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{data.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {data.status && (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusClasses}`}
              >
                {statusLabel}
              </span>
            )}
            {data.type && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-slate-100 text-slate-600 border-slate-200 capitalize">
                {data.type}
              </span>
            )}
            {data.run_as && (
              <span className="text-xs text-slate-500">
                {t("Run as:")}{" "}
                <span className="font-semibold text-slate-700">{data.run_as}</span>
              </span>
            )}
          </div>
        </div>
      </FormSection>

      {/* ── Stages strip ────────────────────────────────────────────────────── */}
      {hasStages && (
        <FormSection title={t("Stages")} columns={1}>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-wrap">
            {uniqueStages.map((stage, i) => (
              <div key={i} className="flex items-center gap-1.5 shrink-0">
                {i > 0 && <div className="w-3 h-px bg-slate-300 shrink-0" />}
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 whitespace-nowrap">
                  {stage.label || stage.value}
                </span>
              </div>
            ))}
          </div>
        </FormSection>
      )}

      {/* ── React Flow canvas ────────────────────────────────────────────────── */}
      <FormSection title={t("Flow")} columns={1}>
        <FlowCanvas data={data} />
      </FormSection>

      {/* ── Inputs table ─────────────────────────────────────────────────────── */}
      {hasInputs && (
        <FormSection title={t("Flow Inputs")} columns={1}>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {[t("Label"), "Element", t("Type"), "Mand.", "Reference", t("Default")].map((h) => (
                    <th
                      key={h}
                      className="text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data.inputs ?? []).map((input, i) => (
                  <tr
                    key={i}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="px-3 py-2 text-slate-800 font-medium">{input.label}</td>
                    <td className="px-3 py-2 text-slate-500 font-mono text-xs">{input.name}</td>
                    <td className="px-3 py-2 text-slate-600 text-xs">{input.type}</td>
                    <td className="px-3 py-2 text-center">
                      {input.mandatory ? (
                        <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                      ) : (
                        <span className="inline-block w-2 h-2 rounded-full bg-slate-200" />
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-500 text-xs">{input.reference ?? ""}</td>
                    <td className="px-3 py-2 text-slate-500 font-mono text-xs">
                      {input.default_value ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FormSection>
      )}

      {/* ── Debug panel ──────────────────────────────────────────────────────── */}
      {data.debug && (
        <FormSection title={t("XML Inspector")} columns={1}>
          <FlowDebugPanel debug={data.debug} />
        </FormSection>
      )}
    </>
  );
}
