"use client";

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
  function update(key: string, value: unknown) {
    onChange({ ...config, [key]: value });
  }

  return (
    <>
      <FormSection title="Widget Configuration">
        <Input
          label="Name"
          value={(config.name as string) ?? ""}
          onChange={(e) => update("name", e.target.value)}
          disabled={readOnly}
        />
        <Input
          label="Widget ID"
          value={(config.id as string) ?? ""}
          onChange={(e) => update("id", e.target.value)}
          placeholder="my-widget-id"
          disabled={readOnly}
        />
        <Input
          label="Description"
          value={(config.description as string) ?? ""}
          onChange={(e) => update("description", e.target.value)}
          disabled={readOnly}
        />
        <Checkbox
          label="Active"
          checked={(config.active as boolean) ?? true}
          onChange={(e) => update("active", e.target.checked)}
          disabled={readOnly}
        />
      </FormSection>

      <FormSection title="HTML Template" columns={1}>
        <CodeEditor
          value={(config.htmlTemplate as string) ?? ""}
          onChange={(v) => update("htmlTemplate", v)}
          language="html"
          height="400px"
          readOnly={readOnly}
        />
      </FormSection>

      <FormSection title="CSS" columns={1}>
        <CodeEditor
          value={(config.css as string) ?? ""}
          onChange={(v) => update("css", v)}
          language="css"
          height="300px"
          readOnly={readOnly}
        />
      </FormSection>

      <FormSection title="Client Script" columns={1}>
        <CodeEditor
          value={(config.clientScript as string) ?? ""}
          onChange={(v) => update("clientScript", v)}
          language="javascript"
          height="500px"
          readOnly={readOnly}
        />
      </FormSection>

      <FormSection title="Server Script" columns={1}>
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
