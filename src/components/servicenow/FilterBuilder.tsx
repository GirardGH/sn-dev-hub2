"use client";
import { useT } from "@/i18n/LanguageProvider";

import { useState } from "react";
import { Plus, X, Filter } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";

export interface FilterCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
  connector?: "and" | "or";
}

export interface FilterField {
  key: string;
  label: string;
  type?: "text" | "select";
  options?: { value: string; label: string }[];
  getValue?: (row: unknown) => unknown;
}

const OPERATORS = [
  { value: "is", label: "is" },
  { value: "is_not", label: "is not" },
  { value: "contains", label: "contains" },
  { value: "starts_with", label: "starts with" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
];

interface FilterBuilderProps {
  fields: FilterField[];
  conditions: FilterCondition[];
  onChange: (conditions: FilterCondition[]) => void;
  onApply: () => void;
  onClear: () => void;
}

export function FilterBuilder({ fields, conditions, onChange, onApply, onClear }: FilterBuilderProps) {
  const t = useT();
  const [open, setOpen] = useState(false);

  function addCondition() {
    onChange([
      ...conditions,
      {
        id: crypto.randomUUID(),
        field: fields[0]?.key ?? "",
        operator: "is",
        value: "",
        connector: conditions.length === 0 ? "and" : "and",
      },
    ]);
  }

  function updateCondition(id: string, key: keyof FilterCondition, value: string) {
    onChange(conditions.map((c) => (c.id === id ? { ...c, [key]: value } : c)));
  }

  function removeCondition(id: string) {
    onChange(conditions.filter((c) => c.id !== id));
  }

  const activeCount = conditions.length;

  return (
    <div className="relative">
      <Button
        variant="secondary"
        size="sm"
        icon={<Filter className="w-3.5 h-3.5" />}
        onClick={() => setOpen(!open)}
        className={activeCount > 0 ? "border-sn-accent text-sn-accent" : ""}
      >
        {t("Filters")}{activeCount > 0 && ` (${activeCount})`}
      </Button>

      {open && (
        <div className="absolute top-9 right-0 z-20 bg-white border border-sn-border rounded-sm shadow-lg w-[640px] max-w-[calc(100vw-1rem)] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-sn-table-header border-b border-sn-border">
            <span className="text-[11px] font-semibold text-sn-text-muted uppercase tracking-widest">
              {t("Filters")}</span>
            <button
              onClick={() => setOpen(false)}
              className="text-sn-text-muted hover:text-sn-text transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-3">
          {conditions.length === 0 && (
            <p className="text-[12px] text-sn-text-muted py-2">{t("No conditions. Click Add to start filtering.")}</p>
          )}

          <div className="flex flex-col gap-2">
            {conditions.map((cond, idx) => {
              const fieldDef = fields.find((f) => f.key === cond.field);
              const noValue = cond.operator === "is_empty" || cond.operator === "is_not_empty";

              return (
                <div key={cond.id} className="flex items-center gap-2">
                  {idx === 0 ? (
                    <span className="text-[11px] font-semibold text-sn-text-muted w-10 text-right flex-shrink-0 uppercase tracking-wide">
                      {t("Where")}</span>
                  ) : (
                    <Select
                      options={[
                        { value: "and", label: t("AND") },
                        { value: "or", label: t("OR") },
                      ]}
                      value={cond.connector ?? "and"}
                      onChange={(e) => updateCondition(cond.id, "connector", e.target.value)}
                      className="w-20"
                    />
                  )}
                  <Select
                    options={fields.map((f) => ({ value: f.key, label: t(f.label) }))}
                    value={cond.field}
                    onChange={(e) => updateCondition(cond.id, "field", e.target.value)}
                    className="w-36"
                  />
                  <Select
                    options={OPERATORS.map(option => ({ ...option, label: t(option.label) }))}
                    value={cond.operator}
                    onChange={(e) => updateCondition(cond.id, "operator", e.target.value)}
                    className="w-32"
                  />
                  {!noValue &&
                    (fieldDef?.type === "select" && fieldDef.options ? (
                      <Select
                        options={fieldDef.options?.map(option => ({ ...option, label: ["client", "story"].includes(fieldDef.key) ? option.label : t(option.label) }))}
                        value={cond.value}
                        onChange={(e) => updateCondition(cond.id, "value", e.target.value)}
                        className="flex-1"
                        placeholder={t("Select...")}
                      />
                    ) : (
                      <Input
                        value={cond.value}
                        onChange={(e) => updateCondition(cond.id, "value", e.target.value)}
                        placeholder={t("Value...")}
                        className="flex-1"
                      />
                    ))}
                  {noValue && <div className="flex-1" />}
                  <button
                    onClick={() => removeCondition(cond.id)}
                    className="text-sn-text-muted hover:text-sn-danger"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-3 pt-2 border-t border-sn-border">
            <Button
              variant="ghost"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={addCondition}
            >
              {t("Add condition")}</Button>
            <div className="flex gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { onClear(); setOpen(false); }}
              >
                {t("Clear")}</Button>
              <Button
                size="sm"
                onClick={() => { onApply(); setOpen(false); }}
              >
                {t("Apply")}</Button>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
