"use client";
import { useT } from "@/i18n/LanguageProvider";

import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { CodeEditor } from "@/components/servicenow/CodeEditor";
import { FormSection } from "@/components/servicenow/RecordForm";

interface Props {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  readOnly?: boolean;
}

export function WidgetFields({ config, onChange, readOnly }: Props) {
  const t = useT();
  function update(key: string, value: unknown) {
    onChange({ ...config, [key]: value });
  }

  return (
    <>
      <FormSection title={t("Widget Configuration")}>
        <Input
          label={t("Name")}
          value={(config.name as string) ?? ""}
          onChange={(e) => update("name", e.target.value)}
          disabled={readOnly}
        />
        <Input
          label={t("Widget ID")}
          value={(config.id as string) ?? ""}
          onChange={(e) => update("id", e.target.value)}
          placeholder={t("my-widget-id")}
          disabled={readOnly}
        />
        <Input
          label={t("Description")}
          value={(config.description as string) ?? ""}
          onChange={(e) => update("description", e.target.value)}
          disabled={readOnly}
        />
        <Checkbox
          label={t("Active")}
          checked={(config.active as boolean) ?? true}
          onChange={(e) => update("active", e.target.checked)}
          disabled={readOnly}
        />
      </FormSection>

      <FormSection title={t("HTML Template")} columns={1}>
        <CodeEditor
          value={(config.htmlTemplate as string) ?? ""}
          onChange={(v) => update("htmlTemplate", v)}
          language="html"
          height="400px"
          readOnly={readOnly}
        />
      </FormSection>

      <FormSection title={t("CSS")} columns={1}>
        <CodeEditor
          value={(config.css as string) ?? ""}
          onChange={(v) => update("css", v)}
          language="css"
          height="300px"
          readOnly={readOnly}
        />
      </FormSection>

      <FormSection title={t("Client Script")} columns={1}>
        <CodeEditor
          value={(config.clientScript as string) ?? ""}
          onChange={(v) => update("clientScript", v)}
          language="javascript"
          height="500px"
          readOnly={readOnly}
        />
      </FormSection>

      <FormSection title={t("Server Script")} columns={1}>
        <CodeEditor
          value={(config.serverScript as string) ?? ""}
          onChange={(v) => update("serverScript", v)}
          language="javascript"
          height="500px"
          readOnly={readOnly}
        />
      </FormSection>
    </>
  );
}
