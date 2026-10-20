"use client";
import { useT } from "@/i18n/LanguageProvider";

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
  const t = useT();
  function update(key: string, value: unknown) {
    onChange({ ...config, [key]: value });
  }

  const lang = getEditorLanguage(devType);

  // ── Client Script ──────────────────────────────────────────────────────────
  if (devType === "client_script") {
    return (
      <>
        <FormSection title={t("Client Script Configuration")}>
          <Input label={t("Name")} value={(config.name as string) ?? ""} onChange={(e) => update("name", e.target.value)} disabled={readOnly} />
          <Input label={t("Table")} value={(config.table as string) ?? ""} onChange={(e) => update("table", e.target.value)} placeholder={t("incident")} disabled={readOnly} />
          <Select label={t("Type")} options={CLIENT_SCRIPT_TYPES.map(option => ({ ...option, label: t(option.label) }))} value={(config.type as string) ?? "onLoad"} onChange={(e) => update("type", e.target.value)} disabled={readOnly} />
          <Input label={t("Field Name (onChange only)")} value={(config.field_name as string) ?? ""} onChange={(e) => update("field_name", e.target.value)} disabled={readOnly} />
        </FormSection>
        <FormSection title={t("Script")} columns={1}>
          <CodeEditor label={t("Condition")} value={(config.condition as string) ?? ""} onChange={(v) => update("condition", v)} language="javascript" height="160px" readOnly={readOnly} />
          <CodeEditor label={t("Script")} value={(config.script as string) ?? ""} onChange={(v) => update("script", v)} language="javascript" height="600px" readOnly={readOnly} />
          <Checkbox label={t("Active")} checked={(config.active as boolean) ?? true} onChange={(e) => update("active", e.target.checked)} disabled={readOnly} />
        </FormSection>
      </>
    );
  }

  // ── UI Action ──────────────────────────────────────────────────────────────
  if (devType === "ui_action") {
    return (
      <>
        <FormSection title={t("UI Action Configuration")}>
          <Input label={t("Name")} value={(config.name as string) ?? ""} onChange={(e) => update("name", e.target.value)} disabled={readOnly} />
          <Input label={t("Table")} value={(config.table as string) ?? ""} onChange={(e) => update("table", e.target.value)} disabled={readOnly} />
          <Input label={t("Action Name")} value={(config.action_name as string) ?? ""} onChange={(e) => update("action_name", e.target.value)} disabled={readOnly} />
          <Input label={t("Order")} type="number" value={(config.order as number) ?? 100} onChange={(e) => update("order", parseInt(e.target.value))} disabled={readOnly} />
        </FormSection>
        <FormSection title={t("Display")} columns={1}>
          <div className="flex gap-4 flex-wrap">
            <Checkbox label={t("Form Button")} checked={(config.form_button as boolean) ?? false} onChange={(e) => update("form_button", e.target.checked)} disabled={readOnly} />
            <Checkbox label={t("Form Link")} checked={(config.form_link as boolean) ?? false} onChange={(e) => update("form_link", e.target.checked)} disabled={readOnly} />
            <Checkbox label={t("List Button")} checked={(config.list_button as boolean) ?? false} onChange={(e) => update("list_button", e.target.checked)} disabled={readOnly} />
            <Checkbox label={t("Active")} checked={(config.active as boolean) ?? true} onChange={(e) => update("active", e.target.checked)} disabled={readOnly} />
          </div>
          <CodeEditor label={t("Condition")} value={(config.condition as string) ?? ""} onChange={(v) => update("condition", v)} language="javascript" height="160px" readOnly={readOnly} />
          <CodeEditor label={t("Script")} value={(config.script as string) ?? ""} onChange={(v) => update("script", v)} language="javascript" height="600px" readOnly={readOnly} />
        </FormSection>
      </>
    );
  }

  // ── UI Policy ──────────────────────────────────────────────────────────────
  if (devType === "ui_policy") {
    return (
      <FormSection title={t("UI Policy Configuration")} columns={1}>
        <div className="grid grid-cols-2 gap-4">
          <Input label={t("Name")} value={(config.name as string) ?? ""} onChange={(e) => update("name", e.target.value)} disabled={readOnly} />
          <Input label={t("Table")} value={(config.table as string) ?? ""} onChange={(e) => update("table", e.target.value)} disabled={readOnly} />
        </div>
        <CodeEditor label={t("Condition")} value={(config.condition as string) ?? ""} onChange={(v) => update("condition", v)} language="javascript" height="160px" readOnly={readOnly} />
        <div className="flex gap-4">
          <Checkbox label={t("Reverse if false")} checked={(config.reverse_if_false as boolean) ?? true} onChange={(e) => update("reverse_if_false", e.target.checked)} disabled={readOnly} />
          <Checkbox label={t("On Load")} checked={(config.on_load as boolean) ?? true} onChange={(e) => update("on_load", e.target.checked)} disabled={readOnly} />
          <Checkbox label={t("Active")} checked={(config.active as boolean) ?? true} onChange={(e) => update("active", e.target.checked)} disabled={readOnly} />
        </div>
      </FormSection>
    );
  }

  // ── UI Script ──────────────────────────────────────────────────────────────
  if (devType === "ui_script") {
    return (
      <>
        <FormSection title={t("UI Script Configuration")}>
          <Input label={t("Name")} value={(config.name as string) ?? ""} onChange={(e) => update("name", e.target.value)} disabled={readOnly} />
          <Input label={t("Description")} value={(config.description as string) ?? ""} onChange={(e) => update("description", e.target.value)} disabled={readOnly} />
        </FormSection>
        <FormSection title={t("Options")} columns={1}>
          <div className="flex gap-4">
            <Checkbox label={t("Active")} checked={(config.active as boolean) ?? true} onChange={(e) => update("active", e.target.checked)} disabled={readOnly} />
            <Checkbox label={t("Global")} checked={(config.global as boolean) ?? true} onChange={(e) => update("global", e.target.checked)} disabled={readOnly} />
          </div>
          <CodeEditor label={t("Script")} value={(config.script as string) ?? ""} onChange={(v) => update("script", v)} language="javascript" height="600px" readOnly={readOnly} />
        </FormSection>
      </>
    );
  }

  // ── System Property ────────────────────────────────────────────────────────
  if (devType === "system_property") {
    return (
      <FormSection title={t("System Property Configuration")}>
        <Input label={t("Name")} value={(config.name as string) ?? ""} onChange={(e) => update("name", e.target.value)} placeholder={t("my.property.name")} disabled={readOnly} />
        <Select label={t("Type")} options={[
          { value: "string", label: t("String") },
          { value: "integer", label: t("Integer") },
          { value: "boolean", label: t("Boolean") },
          { value: "password", label: t("Password") },
        ]} value={(config.type as string) ?? "string"} onChange={(e) => update("type", e.target.value)} disabled={readOnly} />
        <Input label={t("Value")} value={(config.value as string) ?? ""} onChange={(e) => update("value", e.target.value)} disabled={readOnly} />
        <Input label={t("Description")} value={(config.description as string) ?? ""} onChange={(e) => update("description", e.target.value)} disabled={readOnly} />
        <Checkbox label={t("Private")} checked={(config.is_private as boolean) ?? false} onChange={(e) => update("is_private", e.target.checked)} disabled={readOnly} />
      </FormSection>
    );
  }

  // ── System Property Category ───────────────────────────────────────────────
  if (devType === "system_property_category") {
    return (
      <FormSection title={t("Property Category Configuration")}>
        <Input label={t("Name")} value={(config.name as string) ?? ""} onChange={(e) => update("name", e.target.value)} disabled={readOnly} />
        <Input label={t("Title")} value={(config.title as string) ?? ""} onChange={(e) => update("title", e.target.value)} disabled={readOnly} />
        <Input label={t("Owner")} value={(config.owner as string) ?? ""} onChange={(e) => update("owner", e.target.value)} disabled={readOnly} />
      </FormSection>
    );
  }

  // ── Category Property ──────────────────────────────────────────────────────
  if (devType === "category_property") {
    return (
      <FormSection title={t("Category Property Configuration")}>
        <Input label={t("Name")} value={(config.name as string) ?? ""} onChange={(e) => update("name", e.target.value)} disabled={readOnly} />
        <Input label={t("Category")} value={(config.category as string) ?? ""} onChange={(e) => update("category", e.target.value)} disabled={readOnly} />
        <Input label={t("Property")} value={(config.property as string) ?? ""} onChange={(e) => update("property", e.target.value)} disabled={readOnly} />
        <Input label={t("Order")} type="number" value={(config.order as number) ?? 100} onChange={(e) => update("order", parseInt(e.target.value))} disabled={readOnly} />
      </FormSection>
    );
  }

  // ── UI Message ─────────────────────────────────────────────────────────────
  if (devType === "ui_message") {
    return (
      <FormSection title={t("Message Configuration")}>
        <Input label={t("Key")} value={(config.key as string) ?? ""} onChange={(e) => update("key", e.target.value)} placeholder={t("my.message.key")} disabled={readOnly} />
        <Select label={t("Language")} options={LANG_OPTIONS.map(option => ({ ...option, label: t(option.label) }))} value={(config.language as string) ?? "en"} onChange={(e) => update("language", e.target.value)} disabled={readOnly} />
        <Input label={t("Message")} value={(config.message as string) ?? ""} onChange={(e) => update("message", e.target.value)} disabled={readOnly} />
      </FormSection>
    );
  }

  // ── ACL ────────────────────────────────────────────────────────────────────
  if (devType === "acl") {
    return (
      <>
        <FormSection title={t("ACL Configuration")}>
          <Input label={t("Name")} value={(config.name as string) ?? ""} onChange={(e) => update("name", e.target.value)} disabled={readOnly} />
          <Select label={t("Operation")} options={ACL_OPERATIONS.map(option => ({ ...option, label: t(option.label) }))} value={(config.operation as string) ?? "read"} onChange={(e) => update("operation", e.target.value)} disabled={readOnly} />
          <Input label={t("Table")} value={(config.table as string) ?? ""} onChange={(e) => update("table", e.target.value)} disabled={readOnly} />
          <Input label={t("Field")} value={(config.field as string) ?? ""} onChange={(e) => update("field", e.target.value)} disabled={readOnly} />
        </FormSection>
        <FormSection title={t("Script")} columns={1}>
          <CodeEditor label={t("Condition")} value={(config.condition as string) ?? ""} onChange={(v) => update("condition", v)} language="javascript" height="160px" readOnly={readOnly} />
          <CodeEditor label={t("Script")} value={(config.script as string) ?? ""} onChange={(v) => update("script", v)} language="javascript" height="600px" readOnly={readOnly} />
          <Checkbox label={t("Active")} checked={(config.active as boolean) ?? true} onChange={(e) => update("active", e.target.checked)} disabled={readOnly} />
        </FormSection>
      </>
    );
  }

  // ── Scheduled Job ──────────────────────────────────────────────────────────
  if (devType === "scheduled_job") {
    return (
      <FormSection title={t("Scheduled Job Configuration")} columns={1}>
        <div className="grid grid-cols-2 gap-4">
          <Input label={t("Name")} value={(config.name as string) ?? ""} onChange={(e) => update("name", e.target.value)} disabled={readOnly} />
          <Select label={t("Run Type")} options={[
            { value: "daily", label: t("Daily") },
            { value: "weekly", label: t("Weekly") },
            { value: "monthly", label: t("Monthly") },
            { value: "once", label: t("Once") },
            { value: "periodically", label: t("Periodically") },
          ]} value={(config.run_type as string) ?? "daily"} onChange={(e) => update("run_type", e.target.value)} disabled={readOnly} />
        </div>
        <Checkbox label={t("Active")} checked={(config.active as boolean) ?? true} onChange={(e) => update("active", e.target.checked)} disabled={readOnly} />
        <CodeEditor label={t("Script")} value={(config.script as string) ?? ""} onChange={(v) => update("script", v)} language="javascript" height="600px" readOnly={readOnly} />
      </FormSection>
    );
  }

  // ── Fix Script ─────────────────────────────────────────────────────────────
  if (devType === "fix_script") {
    return (
      <FormSection title={t("Fix Script Configuration")} columns={1}>
        <Input label={t("Name")} value={(config.name as string) ?? ""} onChange={(e) => update("name", e.target.value)} disabled={readOnly} />
        <Textarea label={t("Description")} value={(config.description as string) ?? ""} onChange={(e) => update("description", e.target.value)} disabled={readOnly} />
        <div className="flex gap-4">
          <Checkbox label={t("Active")} checked={(config.active as boolean) ?? true} onChange={(e) => update("active", e.target.checked)} disabled={readOnly} />
          <Checkbox label={t("Unloadable")} checked={(config.unloadable as boolean) ?? true} onChange={(e) => update("unloadable", e.target.checked)} disabled={readOnly} />
        </div>
        <CodeEditor label={t("Script")} value={(config.script as string) ?? ""} onChange={(v) => update("script", v)} language="javascript" height="600px" readOnly={readOnly} />
      </FormSection>
    );
  }

  // ── Generic fallback (notification, flow, rest api, transform, etc.) ───────
  return (
    <FormSection title={t("Configuration")} columns={1}>
      <Input label={t("Name")} value={(config.name as string) ?? ""} onChange={(e) => update("name", e.target.value)} disabled={readOnly} />
      {config.description !== undefined && (
        <Textarea label={t("Description")} value={(config.description as string) ?? ""} onChange={(e) => update("description", e.target.value)} disabled={readOnly} />
      )}
      {config.script !== undefined && (
        <CodeEditor label={t("Script")} value={(config.script as string) ?? ""} onChange={(v) => update("script", v)} language={lang} height="600px" readOnly={readOnly} />
      )}
      {config.active !== undefined && (
        <Checkbox label={t("Active")} checked={(config.active as boolean) ?? true} onChange={(e) => update("active", e.target.checked)} disabled={readOnly} />
      )}
    </FormSection>
  );
}
