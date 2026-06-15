"use client";

import { CheckSquare, Square, FileCode2 } from "lucide-react";
import { Checkbox } from "@/components/ui/Checkbox";
import { DEVELOPMENT_TYPE_OPTIONS } from "@/features/developments/developmentTypes";
import type { ParsedComponent } from "./xml.types";

const KNOWN_TYPE_VALUES = new Set<string>(DEVELOPMENT_TYPE_OPTIONS.map((o) => o.value));

interface Props {
  filename: string;
  components: ParsedComponent[];
  onChange: (components: ParsedComponent[]) => void;
  onReset?: () => void;
}

export function XmlImportPreview({ filename, components, onChange }: Props) {
  function toggleAll() {
    const allSelected = components.every((c) => c.selected);
    onChange(components.map((c) => ({ ...c, selected: !allSelected })));
  }

  function toggleOne(index: number) {
    onChange(
      components.map((c, i) => (i === index ? { ...c, selected: !c.selected } : c))
    );
  }

  function updateTitle(index: number, title: string) {
    onChange(components.map((c, i) => (i === index ? { ...c, title } : c)));
  }

  function updateType(index: number, developmentType: string) {
    onChange(components.map((c, i) => (i === index ? { ...c, developmentType } : c)));
  }

  const allSelected = components.every((c) => c.selected);

  return (
    <div className="border border-sn-border rounded overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 border-b border-sn-border">
        <div className="flex items-center gap-2">
          <FileCode2 className="w-4 h-4 text-sn-accent" />
          <span className="text-sm font-medium text-sn-text">{filename}</span>
          <span className="text-xs text-sn-text-muted">
            — {components.length} composant(s) détecté(s)
          </span>
        </div>
        <button
          onClick={toggleAll}
          className="flex items-center gap-1 text-xs text-sn-accent hover:underline"
        >
          {allSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
          {allSelected ? "Deselect all" : "Select all"}
        </button>
      </div>

      {/* Table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-sn-border bg-gray-50/50">
            <th className="w-10 px-3 py-2 text-left">
              <Checkbox
                checked={allSelected}
                onChange={toggleAll}
              />
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-sn-text-muted uppercase tracking-wide">
              Title
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-sn-text-muted uppercase tracking-wide">
              Type
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-sn-text-muted uppercase tracking-wide">
              XML Tag
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-sn-text-muted uppercase tracking-wide">
              Target Table
            </th>
          </tr>
        </thead>
        <tbody>
          {components.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-3 py-6 text-center text-sm text-sn-text-muted">
                No components detected.
              </td>
            </tr>
          ) : (
            components.map((comp, index) => (
              <tr
                key={index}
                className={`border-b border-sn-border last:border-0 transition-colors ${
                  comp.selected ? "bg-white" : "bg-gray-50 opacity-60"
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
                    className="w-full text-sm border-0 border-b border-transparent hover:border-sn-border focus:border-sn-accent outline-none bg-transparent py-0.5"
                    placeholder="Component name..."
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={comp.developmentType}
                    onChange={(e) => updateType(index, e.target.value)}
                    className="text-xs border border-sn-border rounded px-1.5 py-1 bg-white outline-none focus:border-sn-accent"
                  >
                    {!KNOWN_TYPE_VALUES.has(comp.developmentType) && (
                      <option value={comp.developmentType}>
                        Unknown ({comp.developmentType})
                      </option>
                    )}
                    {DEVELOPMENT_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-sn-text-muted">
                    {comp.xmlTag}
                  </code>
                </td>
                <td className="px-3 py-2 text-xs text-sn-text-muted">
                  {comp.targetTable ?? "—"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
