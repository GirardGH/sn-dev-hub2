"use client";

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
}

export interface FilterField {
  key: string;
  label: string;
  type?: "text" | "select";
  options?: { value: string; label: string }[];
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
  const [open, setOpen] = useState(false);

  function addCondition() {
    onChange([
      ...conditions,
      {
        id: crypto.randomUUID(),
        field: fields[0]?.key ?? "",
        operator: "is",
        value: "",
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
        Filters{activeCount > 0 && ` (${activeCount})`}
      </Button>

      {open && (
        <div className="absolute top-9 left-0 z-20 bg-white border border-sn-border rounded shadow-lg p-3 w-[640px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-sn-text-muted uppercase tracking-wide">
              Filters
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-sn-text-muted hover:text-sn-text"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {conditions.length === 0 && (
            <p className="text-xs text-sn-text-muted py-2">No conditions. Click Add to start filtering.</p>
          )}

          <div className="flex flex-col gap-2">
            {conditions.map((cond, idx) => {
              const fieldDef = fields.find((f) => f.key === cond.field);
              const noValue = cond.operator === "is_empty" || cond.operator === "is_not_empty";

              return (
                <div key={cond.id} className="flex items-center gap-2">
                  <span className="text-xs text-sn-text-muted w-6 text-right flex-shrink-0">
                    {idx === 0 ? "Where" : "AND"}
                  </span>
                  <Select
                    options={fields.map((f) => ({ value: f.key, label: f.label }))}
                    value={cond.field}
                    onChange={(e) => updateCondition(cond.id, "field", e.target.value)}
                    className="w-36"
                  />
                  <Select
                    options={OPERATORS}
                    value={cond.operator}
                    onChange={(e) => updateCondition(cond.id, "operator", e.target.value)}
                    className="w-32"
                  />
                  {!noValue &&
                    (fieldDef?.type === "select" && fieldDef.options ? (
                      <Select
                        options={fieldDef.options}
                        value={cond.value}
                        onChange={(e) => updateCondition(cond.id, "value", e.target.value)}
                        className="flex-1"
                        placeholder="Select..."
                      />
                    ) : (
                      <Input
                        value={cond.value}
                        onChange={(e) => updateCondition(cond.id, "value", e.target.value)}
                        placeholder="Value..."
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
              Add condition
            </Button>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { onClear(); setOpen(false); }}
              >
                Clear
              </Button>
              <Button
                size="sm"
                onClick={() => { onApply(); setOpen(false); }}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
