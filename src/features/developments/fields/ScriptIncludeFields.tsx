"use client";

import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { Textarea } from "@/components/ui/Textarea";
import { CodeEditor } from "@/components/servicenow/CodeEditor";
import { FormSection } from "@/components/servicenow/RecordForm";

interface Props {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  readOnly?: boolean;
}

export function ScriptIncludeFields({ config, onChange, readOnly }: Props) {
  function update(key: string, value: unknown) {
    onChange({ ...config, [key]: value });
  }

  return (
    <>
      <FormSection title="Script Include Configuration">
        <Input
          label="Name"
          value={(config.name as string) ?? ""}
          onChange={(e) => update("name", e.target.value)}
          disabled={readOnly}
        />
        <Input
          label="API Name"
          value={(config.api_name as string) ?? ""}
          onChange={(e) => update("api_name", e.target.value)}
          hint="Used to reference this Script Include"
          disabled={readOnly}
        />
      </FormSection>

      <FormSection title="Options" columns={1}>
        <div className="flex gap-4">
          <Checkbox
            label="Client Callable"
            checked={(config.client_callable as boolean) ?? false}
            onChange={(e) => update("client_callable", e.target.checked)}
            disabled={readOnly}
          />
          <Checkbox
            label="Active"
            checked={(config.active as boolean) ?? true}
            onChange={(e) => update("active", e.target.checked)}
            disabled={readOnly}
          />
        </div>
        <Textarea
          label="Description"
          value={(config.description as string) ?? ""}
          onChange={(e) => update("description", e.target.value)}
          disabled={readOnly}
        />
        <CodeEditor
          label="Script"
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
