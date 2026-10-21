"use client";
import { useT } from "@/i18n/LanguageProvider";

import { CheckSquare, Square, FileCode2, ExternalLink, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/Checkbox";
import { DEVELOPMENT_TYPE_OPTIONS } from "@/features/developments/developmentTypes";
import { resolveSnLabel, isKnownSnTable } from "./snTableRegistry";
import type { ParsedComponent } from "./xml.types";

const KNOWN_DEV_TYPE_VALUES = new Set<string>(DEVELOPMENT_TYPE_OPTIONS.map((o) => o.value));

interface Props {
  filename: string;
  components: ParsedComponent[];
  onChange: (components: ParsedComponent[]) => void;
  onReset?: () => void;
  clientId?: string;
  storyId?: string;
  checking?: boolean;
}

export function XmlImportPreview({
  filename,
  components,
  onChange,
  clientId,
  storyId,
  checking,
}: Props) {
  const t = useT();
  function toggleAll() {
    const allSelected = components.every((c) => c.selected);
    onChange(components.map((c) => ({ ...c, selected: !allSelected })));
  }

  function toggleOne(index: number) {
    onChange(components.map((c, i) => (i === index ? { ...c, selected: !c.selected } : c)));
  }

  function updateTitle(index: number, title: string) {
    onChange(components.map((c, i) => (i === index ? { ...c, title } : c)));
  }

  function updateType(index: number, developmentType: string) {
    onChange(components.map((c, i) => (i === index ? { ...c, developmentType } : c)));
  }

  function updateAction(index: number, importAction: "create" | "update" | "skip") {
    onChange(components.map((c, i) => (i === index ? { ...c, importAction } : c)));
  }

  const allSelected = components.every((c) => c.selected);

  return (
    <div className="border border-sn-border rounded-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 border-b border-sn-border">
        <div className="flex items-center gap-2">
          <FileCode2 className="w-4 h-4 text-sn-accent" />
          <span className="text-sm font-medium text-sn-text">{filename}</span>
          <span className="text-xs text-sn-text-muted">
            — {components.length} {t("composant(s) détecté(s)")}</span>
          {checking && (
            <span className="flex items-center gap-1 text-xs text-amber-600">
              <Loader2 className="w-3 h-3 animate-spin" />
              {t("Vérification des doublons…")}</span>
          )}
        </div>
        <button
          onClick={toggleAll}
          className="flex items-center gap-1 text-xs text-sn-accent hover:underline"
        >
          {allSelected ? (
            <CheckSquare className="w-3.5 h-3.5" />
          ) : (
            <Square className="w-3.5 h-3.5" />
          )}
          {allSelected ? "Deselect all" : "Select all"}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sn-border bg-gray-50/50">
              <th className="w-10 px-3 py-2 text-left">
                <Checkbox checked={allSelected} onChange={toggleAll} />
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-sn-text-muted uppercase tracking-wide">
                {t("Title")}</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-sn-text-muted uppercase tracking-wide">
                {t("Type")}</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-sn-text-muted uppercase tracking-wide">
                {checking ? (
                  <span className="flex items-center gap-1">
                    {t("Action")}<Loader2 className="w-3 h-3 animate-spin text-amber-500" />
                  </span>
                ) : (
                  t("Action")
                )}
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-sn-text-muted uppercase tracking-wide">
                {t("XML Tag")}</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-sn-text-muted uppercase tracking-wide">
                {t("Target Table")}</th>
            </tr>
          </thead>
          <tbody>
            {components.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-sm text-sn-text-muted">
                  {t("No components detected.")}</td>
              </tr>
            ) : (
              components.map((comp, index) => {
                const action = comp.importAction ?? "create";
                const isExisting = !!comp.existingId;
                // undefined = not yet checked, null = checked/no match, string = matched
                const hasDuplicateInfo = comp.existingId !== undefined;

                return (
                  <tr
                    key={index}
                    className={`border-b border-sn-border last:border-0 transition-colors ${
                      action === "skip"
                        ? "opacity-40 bg-gray-50"
                        : comp.selected
                        ? "bg-white"
                        : "bg-gray-50 opacity-60"
                    }`}
                  >
                    <td className="px-3 py-2">
                      <Checkbox checked={comp.selected} onChange={() => toggleOne(index)} />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={comp.title}
                        onChange={(e) => updateTitle(index, e.target.value)}
                        className="w-full text-sm border-0 border-b border-transparent hover:border-sn-border focus:border-sn-accent outline-hidden bg-transparent py-0.5"
                        placeholder={t("Component name...")}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={comp.developmentType}
                        onChange={(e) => updateType(index, e.target.value)}
                        className="text-xs border border-sn-border rounded-sm px-1.5 py-1 bg-white outline-hidden focus:border-sn-accent"
                      >
                        {!KNOWN_DEV_TYPE_VALUES.has(comp.developmentType) && (
                          <option value={comp.developmentType}>
                            {isKnownSnTable(comp.developmentType)
                              ? `${resolveSnLabel(comp.developmentType)} — non mappé`
                              : `${comp.developmentType} — inconnu`}
                          </option>
                        )}
                        {DEVELOPMENT_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {t(opt.label)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        {hasDuplicateInfo && (
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-semibold border shrink-0 ${
                              isExisting
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-green-50 text-green-700 border-green-200"
                            }`}
                          >
                            {isExisting ? "Existant" : t("Nouveau")}
                          </span>
                        )}
                        <select
                          value={action}
                          onChange={(e) =>
                            updateAction(index, e.target.value as "create" | "update" | "skip")
                          }
                          className="text-xs border border-sn-border rounded-sm px-1.5 py-1 bg-white outline-hidden focus:border-sn-accent"
                        >
                          <option value="create">{t("Créer")}</option>
                          <option value="update">{t("Mettre à jour")}</option>
                          <option value="skip">{t("Ignorer")}</option>
                        </select>
                        {comp.existingId && clientId && storyId && (
                          <a
                            href={`/clients/${clientId}/stories/${storyId}/developments/${comp.existingId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sn-accent hover:opacity-70 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded-sm text-sn-text-muted">
                        {comp.xmlTag}
                      </code>
                    </td>
                    <td className="px-3 py-2 text-xs text-sn-text-muted">
                      {comp.targetTable ?? "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
