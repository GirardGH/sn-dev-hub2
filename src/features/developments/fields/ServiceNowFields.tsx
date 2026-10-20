"use client";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Checkbox } from "@/components/ui/Checkbox";
import { FormSection } from "@/components/servicenow/RecordForm";
import { GenericConfigFields } from "./GenericConfigFields";
import { CodeEditor } from "@/components/servicenow/CodeEditor";
import { SN_SCHEMAS, SN_LEGACY_ALIASES, PRIMARY_FIELDS, normalizeSnConfig, updateSnConfig, snBoolean, isSnFieldVisible, type SnField } from "../serviceNowForms";

function JsonField({ name, value }: { name: string; value: unknown; onChange: (v: unknown) => void }) {
  return <Textarea label={name} value={JSON.stringify(value, null, 2)} readOnly hint="Données associées conservées telles quelles dans l’archive." />;
}

export function ServiceNowFields({ table, config, onChange }: {
  table: string; config: Record<string, unknown>; onChange: (config: Record<string, unknown>) => void;
}) {
  const normalized = normalizeSnConfig(table, config);
  const fields = (SN_SCHEMAS[table] ?? []).filter(f => !f.name.startsWith("sys_") || f.name === "sys_policy");
  const primaryNames = PRIMARY_FIELDS[table] ?? ["name", "short_description", "active", "table", "order", "type", "description", "script"];
  const primary = primaryNames.flatMap(name => fields.filter(f => f.name === name));
  const extra = fields.filter(f => !primaryNames.includes(f.name));
  function update(key: string, value: unknown) { onChange(updateSnConfig(table, config, key, value)); }
  function field(f: SnField) {
    if (!isSnFieldVisible(table, f.name, normalized)) return null;
    const value = normalized[f.name];
    const label = f.label;
    const hint = `${f.name}${f.reference ? ` · référence ${f.reference} (sys_id ou nom archivé)` : ""}${f.mandatory ? " · requis dans ServiceNow" : ""}`;
    const shared = { id: `sn-${table}-${f.name}`, label, disabled: f.readOnly, hint };
    const scalar = value == null ? "" : String(value);
    let editor;
    if (f.internalType === "boolean") editor = <div className="py-1"><Checkbox id={shared.id} label={label} disabled={f.readOnly} checked={snBoolean(value)} onChange={e => update(f.name, e.target.checked)} /><p className="text-[11px] text-sn-text-muted mt-1">{hint}</p></div>;
    else if (value !== null && typeof value === "object") editor = <JsonField name={label} value={value} onChange={v => update(f.name, v)} />;
    else if (f.choices?.length) {
      const options = f.choices.filter(c => !c.dependentValue || !f.dependent || c.dependentValue === String(normalized[f.dependent] ?? ""));
      const unique = Array.from(new Map(options.map(c => [c.value, c])).values());
      editor = <Select {...shared} value={scalar} options={[{value: "", label: "— Non renseigné —"}, ...(!unique.some(c => c.value === scalar) && scalar ? [{value: scalar, label: `${scalar} (valeur conservée)`}] : []), ...unique]} onChange={e => update(f.name, e.target.value)} />;
    } else if (["conditions", "template_value"].includes(f.internalType)) {
      editor = <Textarea {...shared} value={scalar} placeholder={f.internalType === "conditions" ? "active=true^priority=1" : "state=2^priority=1"} hint={`${hint} · ${f.internalType === "conditions" ? "Filtre encodé ServiceNow" : "Valeurs encodées ServiceNow"}`} onChange={e => update(f.name, e.target.value)} />;
    } else if (/script|html|xml|css|condition_string/.test(f.internalType) || ["css", "template", "html", "client_script", "operation_script"].includes(f.name)) {
      editor = <div><p className="text-xs text-sn-text-muted mb-1">{hint}</p><CodeEditor label={label} value={scalar} language={f.name === "css" ? "css" : /html|xml|template/.test(f.internalType) ? "html" : "javascript"} readOnly={f.readOnly} height="280px" onChange={v => update(f.name, v)} /></div>;
    } else if (["description", "message", "messages", "option_schema"].includes(f.name) || f.maxLength && f.maxLength > 1000) editor = <Textarea {...shared} value={scalar} onChange={e => update(f.name, e.target.value)} />;
    else editor = <Input {...shared} type={/^(integer|float|decimal)$/.test(f.internalType) ? "number" : "text"} step={f.internalType === "integer" ? "1" : "any"} value={scalar} onChange={e => update(f.name, e.target.type === "number" && e.target.value !== "" ? Number(e.target.value) : e.target.value)} />;
    return <div key={f.name} className={/script|html|xml|conditions|template/.test(f.internalType) || typeof value === "object" ? "col-span-full" : ""}>{editor}</div>;
  }
  const known = new Set((SN_SCHEMAS[table] ?? []).map(f => f.name));
  const aliases = new Set(Object.values(SN_LEGACY_ALIASES[table] ?? {}));
  const legacy = Object.fromEntries(Object.entries(config).filter(([key, value]) => !known.has(key) && !aliases.has(key) && !key.startsWith("_") && !["sn_type", "action", "update_name"].includes(key) && (value === null || typeof value !== "object")));
  const metadata = Object.entries(config).filter(([key]) => key.startsWith("sys_") && key !== "sys_policy");
  const objects = Object.entries(config).filter(([key, value]) => !known.has(key) && !key.startsWith("_") && value !== null && typeof value === "object" && key !== "flow_preview");
  return <>
    <FormSection title="Configuration ServiceNow">{primary.map(field)}</FormSection>
    <details className="border border-sn-border rounded-sm mb-4" open={primary.length === 0}>
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">Autres champs ServiceNow ({extra.length})</summary>
      <FormSection title="Options complémentaires">{extra.map(field)}</FormSection>
    </details>
    {objects.length > 0 && <details className="border border-sn-border rounded-sm mb-4"><summary className="cursor-pointer px-4 py-3 text-sm font-semibold">Configurations associées archivées</summary><FormSection title="Données associées" columns={1}>{objects.map(([key, value]) => <JsonField key={key} name={key} value={value} onChange={v => update(key, v)} />)}</FormSection></details>}
    {Object.keys(legacy).length > 0 && <details className="border border-sn-border rounded-sm mb-4"><summary className="cursor-pointer px-4 py-3 text-sm font-semibold">Champs hérités ou spécifiques à l’archive</summary><GenericConfigFields config={legacy} onChange={changes => onChange({ ...config, ...changes })} /></details>}
    {metadata.length > 0 && <details className="border border-sn-border rounded-sm mb-4"><summary className="cursor-pointer px-4 py-3 text-sm font-semibold">Métadonnées de la source</summary><FormSection title="Source ServiceNow">{metadata.map(([key, value]) => <Input key={key} id={`meta-${key}`} label={key} value={String(value ?? "")} readOnly />)}</FormSection></details>}
    <p className="text-[11px] text-sn-text-muted mb-4">Champs relevés sur dev389937 le 20/10/2026 · références et filtres archivés en texte. Les listes associées de ServiceNow sont des enregistrements distincts.</p>
  </>;
}
