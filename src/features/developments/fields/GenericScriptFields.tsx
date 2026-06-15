"use client";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { Textarea } from "@/components/ui/Textarea";
import { CodeEditor } from "@/components/servicenow/CodeEditor";
import { FormSection } from "@/components/servicenow/RecordForm";
import { getEditorLanguage } from "../getEditorLanguage";

interface Props {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  readOnly?: boolean;
  devType: string;
}

const CLIENT_SCRIPT_TYPES = [
  { value: "onLoad", label: "onLoad" },
  { value: "onChange", label: "onChange" },
  { value: "onSubmit", label: "onSubmit" },
  { value: "onCellEdit", label: "onCellEdit" },
];

const ACL_OPERATIONS = [
  { value: "read", label: "read" },
  { value: "write", label: "write" },
  { value: "create", label: "create" },
  { value: "delete", label: "delete" },
  { value: "execute", label: "execute" },
];

const LANG_OPTIONS = [
  { value: "en", label: "English" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "es", label: "Spanish" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "nl", label: "Dutch" },
  { value: "ja", label: "Japanese" },
  { value: "zh", label: "Chinese" },
];

export function GenericScriptFields({ config, onChange, readOnly, devType }: Props) {
  function update(key: string, value: unknown) {
    onChange({ ...config, [key]: value });
  }

  const lang = getEditorLanguage(devType);

  // ── Client Script ──────────────────────────────────────────────────────────
  if (devType === "client_script") {
    return (
      <>
        <FormSection title="Client Script Configuration">
          <Input label="Name" value={(config.name as string) ?? ""} onChange={(e) => update("name", e.target.value)} disabled={readOnly} />
          <Input label="Table" value={(config.table as string) ?? ""} onChange={(e) => update("table", e.target.value)} placeholder="incident" disabled={readOnly} />
          <Select label="Type" options={CLIENT_SCRIPT_TYPES} value={(config.type as string) ?? "onLoad"} onChange={(e) => update("type", e.target.value)} disabled={readOnly} />
          <Input label="Field Name (onChange only)" value={(config.field_name as string) ?? ""} onChange={(e) => update("field_name", e.target.value)} disabled={readOnly} />
        </FormSection>
        <FormSection title="Script" columns={1}>
          <CodeEditor label="Condition" value={(config.condition as string) ?? ""} onChange={(v) => update("condition", v)} language="javascript" height="160px" readOnly={readOnly} />
          <CodeEditor label="Script" value={(config.script as string) ?? ""} onChange={(v) => update("script", v)} language="javascript" height="600px" readOnly={readOnly} />
          <Checkbox label="Active" checked={(config.active as boolean) ?? true} onChange={(e) => update("active", e.target.checked)} disabled={readOnly} />
        </FormSection>
      </>
    );
  }

  // ── UI Action ──────────────────────────────────────────────────────────────
  if (devType === "ui_action") {
    return (
      <>
        <FormSection title="UI Action Configuration">
          <Input label="Name" value={(config.name as string) ?? ""} onChange={(e) => update("name", e.target.value)} disabled={readOnly} />
          <Input label="Table" value={(config.table as string) ?? ""} onChange={(e) => update("table", e.target.value)} disabled={readOnly} />
          <Input label="Action Name" value={(config.action_name as string) ?? ""} onChange={(e) => update("action_name", e.target.value)} disabled={readOnly} />
          <Input label="Order" type="number" value={(config.order as number) ?? 100} onChange={(e) => update("order", parseInt(e.target.value))} disabled={readOnly} />
        </FormSection>
        <FormSection title="Display" columns={1}>
          <div className="flex gap-4 flex-wrap">
            <Checkbox label="Form Button" checked={(config.form_button as boolean) ?? false} onChange={(e) => update("form_button", e.target.checked)} disabled={readOnly} />
            <Checkbox label="Form Link" checked={(config.form_link as boolean) ?? false} onChange={(e) => update("form_link", e.target.checked)} disabled={readOnly} />
            <Checkbox label="List Button" checked={(config.list_button as boolean) ?? false} onChange={(e) => update("list_button", e.target.checked)} disabled={readOnly} />
            <Checkbox label="Active" checked={(config.active as boolean) ?? true} onChange={(e) => update("active", e.target.checked)} disabled={readOnly} />
          </div>
          <CodeEditor label="Condition" value={(config.condition as string) ?? ""} onChange={(v) => update("condition", v)} language="javascript" height="160px" readOnly={readOnly} />
          <CodeEditor label="Script" value={(config.script as string) ?? ""} onChange={(v) => update("script", v)} language="javascript" height="600px" readOnly={readOnly} />
        </FormSection>
      </>
    );
  }

  // ── UI Policy ──────────────────────────────────────────────────────────────
  if (devType === "ui_policy") {
    return (
      <FormSection title="UI Policy Configuration" columns={1}>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Name" value={(config.name as string) ?? ""} onChange={(e) => update("name", e.target.value)} disabled={readOnly} />
          <Input label="Table" value={(config.table as string) ?? ""} onChange={(e) => update("table", e.target.value)} disabled={readOnly} />
        </div>
        <CodeEditor label="Condition" value={(config.condition as string) ?? ""} onChange={(v) => update("condition", v)} language="javascript" height="160px" readOnly={readOnly} />
        <div className="flex gap-4">
          <Checkbox label="Reverse if false" checked={(config.reverse_if_false as boolean) ?? true} onChange={(e) => update("reverse_if_false", e.target.checked)} disabled={readOnly} />
          <Checkbox label="On Load" checked={(config.on_load as boolean) ?? true} onChange={(e) => update("on_load", e.target.checked)} disabled={readOnly} />
          <Checkbox label="Active" checked={(config.active as boolean) ?? true} onChange={(e) => update("active", e.target.checked)} disabled={readOnly} />
        </div>
      </FormSection>
    );
  }

  // ── UI Script ──────────────────────────────────────────────────────────────
  if (devType === "ui_script") {
    return (
      <>
        <FormSection title="UI Script Configuration">
          <Input label="Name" value={(config.name as string) ?? ""} onChange={(e) => update("name", e.target.value)} disabled={readOnly} />
          <Input label="Description" value={(config.description as string) ?? ""} onChange={(e) => update("description", e.target.value)} disabled={readOnly} />
        </FormSection>
        <FormSection title="Options" columns={1}>
          <div className="flex gap-4">
            <Checkbox label="Active" checked={(config.active as boolean) ?? true} onChange={(e) => update("active", e.target.checked)} disabled={readOnly} />
            <Checkbox label="Global" checked={(config.global as boolean) ?? true} onChange={(e) => update("global", e.target.checked)} disabled={readOnly} />
          </div>
          <CodeEditor label="Script" value={(config.script as string) ?? ""} onChange={(v) => update("script", v)} language="javascript" height="600px" readOnly={readOnly} />
        </FormSection>
      </>
    );
  }

  // ── System Property ────────────────────────────────────────────────────────
  if (devType === "system_property") {
    return (
      <FormSection title="System Property Configuration">
        <Input label="Name" value={(config.name as string) ?? ""} onChange={(e) => update("name", e.target.value)} placeholder="my.property.name" disabled={readOnly} />
        <Select label="Type" options={[
          { value: "string", label: "String" },
          { value: "integer", label: "Integer" },
          { value: "boolean", label: "Boolean" },
          { value: "password", label: "Password" },
        ]} value={(config.type as string) ?? "string"} onChange={(e) => update("type", e.target.value)} disabled={readOnly} />
        <Input label="Value" value={(config.value as string) ?? ""} onChange={(e) => update("value", e.target.value)} disabled={readOnly} />
        <Input label="Description" value={(config.description as string) ?? ""} onChange={(e) => update("description", e.target.value)} disabled={readOnly} />
        <Checkbox label="Private" checked={(config.is_private as boolean) ?? false} onChange={(e) => update("is_private", e.target.checked)} disabled={readOnly} />
      </FormSection>
    );
  }

  // ── System Property Category ───────────────────────────────────────────────
  if (devType === "system_property_category") {
    return (
      <FormSection title="Property Category Configuration">
        <Input label="Name" value={(config.name as string) ?? ""} onChange={(e) => update("name", e.target.value)} disabled={readOnly} />
        <Input label="Title" value={(config.title as string) ?? ""} onChange={(e) => update("title", e.target.value)} disabled={readOnly} />
        <Input label="Owner" value={(config.owner as string) ?? ""} onChange={(e) => update("owner", e.target.value)} disabled={readOnly} />
      </FormSection>
    );
  }

  // ── Category Property ──────────────────────────────────────────────────────
  if (devType === "category_property") {
    return (
      <FormSection title="Category Property Configuration">
        <Input label="Name" value={(config.name as string) ?? ""} onChange={(e) => update("name", e.target.value)} disabled={readOnly} />
        <Input label="Category" value={(config.category as string) ?? ""} onChange={(e) => update("category", e.target.value)} disabled={readOnly} />
        <Input label="Property" value={(config.property as string) ?? ""} onChange={(e) => update("property", e.target.value)} disabled={readOnly} />
        <Input label="Order" type="number" value={(config.order as number) ?? 100} onChange={(e) => update("order", parseInt(e.target.value))} disabled={readOnly} />
      </FormSection>
    );
  }

  // ── UI Message ─────────────────────────────────────────────────────────────
  if (devType === "ui_message") {
    return (
      <FormSection title="Message Configuration">
        <Input label="Key" value={(config.key as string) ?? ""} onChange={(e) => update("key", e.target.value)} placeholder="my.message.key" disabled={readOnly} />
        <Select label="Language" options={LANG_OPTIONS} value={(config.language as string) ?? "en"} onChange={(e) => update("language", e.target.value)} disabled={readOnly} />
        <Input label="Message" value={(config.message as string) ?? ""} onChange={(e) => update("message", e.target.value)} disabled={readOnly} />
      </FormSection>
    );
  }

  // ── ACL ────────────────────────────────────────────────────────────────────
  if (devType === "acl") {
    return (
      <>
        <FormSection title="ACL Configuration">
          <Input label="Name" value={(config.name as string) ?? ""} onChange={(e) => update("name", e.target.value)} disabled={readOnly} />
          <Select label="Operation" options={ACL_OPERATIONS} value={(config.operation as string) ?? "read"} onChange={(e) => update("operation", e.target.value)} disabled={readOnly} />
          <Input label="Table" value={(config.table as string) ?? ""} onChange={(e) => update("table", e.target.value)} disabled={readOnly} />
          <Input label="Field" value={(config.field as string) ?? ""} onChange={(e) => update("field", e.target.value)} disabled={readOnly} />
        </FormSection>
        <FormSection title="Script" columns={1}>
          <CodeEditor label="Condition" value={(config.condition as string) ?? ""} onChange={(v) => update("condition", v)} language="javascript" height="160px" readOnly={readOnly} />
          <CodeEditor label="Script" value={(config.script as string) ?? ""} onChange={(v) => update("script", v)} language="javascript" height="600px" readOnly={readOnly} />
          <Checkbox label="Active" checked={(config.active as boolean) ?? true} onChange={(e) => update("active", e.target.checked)} disabled={readOnly} />
        </FormSection>
      </>
    );
  }

  // ── Scheduled Job ──────────────────────────────────────────────────────────
  if (devType === "scheduled_job") {
    return (
      <FormSection title="Scheduled Job Configuration" columns={1}>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Name" value={(config.name as string) ?? ""} onChange={(e) => update("name", e.target.value)} disabled={readOnly} />
          <Select label="Run Type" options={[
            { value: "daily", label: "Daily" },
            { value: "weekly", label: "Weekly" },
            { value: "monthly", label: "Monthly" },
            { value: "once", label: "Once" },
            { value: "periodically", label: "Periodically" },
          ]} value={(config.run_type as string) ?? "daily"} onChange={(e) => update("run_type", e.target.value)} disabled={readOnly} />
        </div>
        <Checkbox label="Active" checked={(config.active as boolean) ?? true} onChange={(e) => update("active", e.target.checked)} disabled={readOnly} />
        <CodeEditor label="Script" value={(config.script as string) ?? ""} onChange={(v) => update("script", v)} language="javascript" height="600px" readOnly={readOnly} />
      </FormSection>
    );
  }

  // ── Fix Script ─────────────────────────────────────────────────────────────
  if (devType === "fix_script") {
    return (
      <FormSection title="Fix Script Configuration" columns={1}>
        <Input label="Name" value={(config.name as string) ?? ""} onChange={(e) => update("name", e.target.value)} disabled={readOnly} />
        <Textarea label="Description" value={(config.description as string) ?? ""} onChange={(e) => update("description", e.target.value)} disabled={readOnly} />
        <div className="flex gap-4">
          <Checkbox label="Active" checked={(config.active as boolean) ?? true} onChange={(e) => update("active", e.target.checked)} disabled={readOnly} />
          <Checkbox label="Unloadable" checked={(config.unloadable as boolean) ?? true} onChange={(e) => update("unloadable", e.target.checked)} disabled={readOnly} />
        </div>
        <CodeEditor label="Script" value={(config.script as string) ?? ""} onChange={(v) => update("script", v)} language="javascript" height="600px" readOnly={readOnly} />
      </FormSection>
    );
  }

  // ── Generic fallback (notification, flow, rest api, transform, etc.) ───────
  return (
    <FormSection title="Configuration" columns={1}>
      <Input label="Name" value={(config.name as string) ?? ""} onChange={(e) => update("name", e.target.value)} disabled={readOnly} />
      {config.description !== undefined && (
        <Textarea label="Description" value={(config.description as string) ?? ""} onChange={(e) => update("description", e.target.value)} disabled={readOnly} />
      )}
      {config.script !== undefined && (
        <CodeEditor label="Script" value={(config.script as string) ?? ""} onChange={(v) => update("script", v)} language={lang} height="600px" readOnly={readOnly} />
      )}
      {config.active !== undefined && (
        <Checkbox label="Active" checked={(config.active as boolean) ?? true} onChange={(e) => update("active", e.target.checked)} disabled={readOnly} />
      )}
    </FormSection>
  );
}
