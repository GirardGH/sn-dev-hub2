"use client";

import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Checkbox } from "@/components/ui/Checkbox";
import { CodeEditor } from "@/components/servicenow/CodeEditor";
import { FormSection, FullWidthField } from "@/components/servicenow/RecordForm";

// Keys whose values should be shown in a Monaco code editor + the target language
const CODE_LANGS: Record<string, string> = {
  script: "javascript",
  javascript: "javascript",
  condition: "javascript",
  filter_condition: "javascript",
  processing_script: "javascript",
  formula: "javascript",
  client_script: "javascript",
  css: "css",
  css_variables: "css",
  style: "css",
  html_template: "html",
  html: "html",
  html_content: "html",
  template: "html",
  body_html: "html",
  json: "json",
  payload: "json",
  options: "json",
  xml: "xml",
  xml_content: "xml",
};

// Keys shown in a Textarea (long but not code)
const TEXTAREA_KEYS = new Set([
  "description",
  "hint",
  "notes",
  "message",
  "short_description",
  "arguments",
  "roles",
  "link",
  "url",
]);

// Parser metadata — never shown to the user
const SKIP_KEYS = new Set(["sn_type", "action", "update_name"]);

// System / audit fields — shown in a dimmed metadata section
const SYS_META_KEYS = new Set([
  "sys_id",
  "sys_class_name",
  "sys_created_by",
  "sys_created_on",
  "sys_updated_by",
  "sys_updated_on",
  "sys_mod_count",
  "sys_domain",
  "sys_scope",
  "sys_package",
  "sys_policy",
  "sys_overrides",
  "sys_customer_update",
  "sys_name",
]);

function toLabel(key: string): string {
  return key
    .replace(/^sys_/, "")
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

interface Props {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  readOnly?: boolean;
}

export function GenericConfigFields({ config, onChange, readOnly }: Props) {
  function update(key: string, value: unknown) {
    onChange({ ...config, [key]: value });
  }

  // Partition config entries by rendering strategy
  const shortEntries: [string, unknown][] = [];
  const textareaEntries: [string, unknown][] = [];
  const boolEntries: [string, boolean][] = [];
  const codeEntries: [string, string][] = []; // [key, language]
  const metaEntries: [string, unknown][] = [];

  for (const [key, value] of Object.entries(config)) {
    if (SKIP_KEYS.has(key)) continue;
    if (value === null || value === undefined || value === "") continue;

    if (SYS_META_KEYS.has(key)) {
      metaEntries.push([key, value]);
      continue;
    }

    const codeLang = CODE_LANGS[key];
    if (codeLang) {
      codeEntries.push([key, codeLang]);
      continue;
    }

    if (typeof value === "boolean") {
      boolEntries.push([key, value]);
      continue;
    }

    if (
      TEXTAREA_KEYS.has(key) ||
      (typeof value === "string" && value.length > 120)
    ) {
      textareaEntries.push([key, value]);
      continue;
    }

    shortEntries.push([key, value]);
  }

  const hasMainSection =
    shortEntries.length > 0 ||
    boolEntries.length > 0 ||
    textareaEntries.length > 0;

  return (
    <>
      {/* ── Short scalar fields + booleans + long text ── */}
      {hasMainSection && (
        <FormSection title="Configuration ServiceNow">
          {shortEntries.map(([key, value]) => (
            <Input
              key={key}
              label={toLabel(key)}
              value={String(value)}
              onChange={(e) => update(key, e.target.value)}
              disabled={readOnly}
            />
          ))}

          {boolEntries.map(([key, value]) => (
            <div key={key} className="flex items-center">
              <Checkbox
                label={toLabel(key)}
                checked={value}
                onChange={(e) => update(key, e.target.checked)}
                disabled={readOnly}
              />
            </div>
          ))}

          {textareaEntries.map(([key, value]) => (
            <FullWidthField key={key}>
              <Textarea
                label={toLabel(key)}
                value={String(value)}
                onChange={(e) => update(key, e.target.value)}
                disabled={readOnly}
              />
            </FullWidthField>
          ))}
        </FormSection>
      )}

      {/* ── Code / markup fields — each in its own full-width section ── */}
      {codeEntries.map(([key, lang]) => {
        const raw = String(config[key] ?? "");
        const lines = raw.split("\n").length;
        return (
          <FormSection key={key} title={toLabel(key)} columns={1}>
            <CodeEditor
              value={raw}
              onChange={(v) => update(key, v)}
              language={lang}
              height={lines > 20 ? "600px" : lines > 5 ? "300px" : "160px"}
              readOnly={readOnly}
            />
          </FormSection>
        );
      })}

      {/* ── System metadata (dimmed) ── */}
      {metaEntries.length > 0 && (
        <FormSection title="Métadonnées système">
          {metaEntries.map(([key, value]) => (
            <Input
              key={key}
              label={toLabel(key)}
              value={String(value)}
              onChange={(e) => update(key, e.target.value)}
              disabled
              className="opacity-50"
            />
          ))}
        </FormSection>
      )}
    </>
  );
}
