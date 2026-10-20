"use client";
import { useT } from "@/i18n/LanguageProvider";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { CodeEditor } from "@/components/servicenow/CodeEditor";
import { FormSection } from "@/components/servicenow/RecordForm";

const WHEN_OPTIONS = [
  { value: "before", label: "Before" },
  { value: "after", label: "After" },
  { value: "async", label: "Async" },
  { value: "display", label: "Display" },
];

interface BusinessRuleFieldsProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  readOnly?: boolean;
}

export function BusinessRuleFields({ config, onChange, readOnly }: BusinessRuleFieldsProps) {
  const t = useT();
  function update(key: string, value: unknown) {
    onChange({ ...config, [key]: value });
  }

  return (
    <>
      <FormSection title={t("Business Rule Configuration")}>
        <Input
          label={t("Name")}
          value={(config.name as string) ?? ""}
          onChange={(e) => update("name", e.target.value)}
          disabled={readOnly}
        />
        <Input
          label={t("Table")}
          value={(config.table as string) ?? ""}
          onChange={(e) => update("table", e.target.value)}
          placeholder={t("incident")}
          disabled={readOnly}
        />
        <Select
          label={t("When")}
          options={WHEN_OPTIONS.map(option => ({ ...option, label: t(option.label) }))}
          value={(config.when as string) ?? "before"}
          onChange={(e) => update("when", e.target.value)}
          disabled={readOnly}
        />
        <Input
          label={t("Order")}
          type="number"
          value={(config.order as number) ?? 100}
          onChange={(e) => update("order", parseInt(e.target.value))}
          disabled={readOnly}
        />
      </FormSection>

      <FormSection title={t("Triggers")} columns={1}>
        <div className="flex flex-wrap gap-4">
          <Checkbox label={t("Insert")} checked={(config.insert as boolean) ?? false} onChange={(e) => update("insert", e.target.checked)} disabled={readOnly} />
          <Checkbox label={t("Update")} checked={(config.update as boolean) ?? false} onChange={(e) => update("update", e.target.checked)} disabled={readOnly} />
          <Checkbox label={t("Delete")} checked={(config.delete as boolean) ?? false} onChange={(e) => update("delete", e.target.checked)} disabled={readOnly} />
          <Checkbox label={t("Query")} checked={(config.query as boolean) ?? false} onChange={(e) => update("query", e.target.checked)} disabled={readOnly} />
          <Checkbox label={t("Active")} checked={(config.active as boolean) ?? true} onChange={(e) => update("active", e.target.checked)} disabled={readOnly} />
        </div>
      </FormSection>

      <FormSection title={t("Script")} columns={1}>
        <CodeEditor
          label={t("Condition")}
          value={(config.condition as string) ?? ""}
          onChange={(v) => update("condition", v)}
          language="javascript"
          height="160px"
          readOnly={readOnly}
        />
        <CodeEditor
          label={t("Script")}
          value={(config.script as string) ?? ""}
          onChange={(v) => update("script", v)}
          language="javascript"
          height="600px"
          readOnly={readOnly}
        />
      </FormSection>
    </>
  );
}
