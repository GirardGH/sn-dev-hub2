import type { Development } from "../developments/development.types";
export type Node = { record: Development; table: string; sysId: string; fields: Record<string, unknown> };
const guid = /^[a-f0-9]{32}$/i;
export function text(value: unknown): string { return value === null || value === undefined ? "" : typeof value === "object" ? JSON.stringify(value) : String(value); }
export function archiveNode(record: Development): Node {
  const c = record.config ?? {};
  const update = text(c.update_name || c.sys_update_name);
  const table = text(c.sys_class_name) || update.replace(/_[a-f0-9]{32}$/i, "") || record.development_type;
  return { record, table, sysId: text(c.sys_id) || update.match(/([a-f0-9]{32})$/i)?.[1] || "", fields: c };
}
export function resolver(nodes: Node[]) {
  const index = new Map<string, Node[]>();
  for (const n of nodes) if (n.sysId) index.set(n.sysId, [...(index.get(n.sysId) ?? []), n]);
  return (id: string, source: Node, table?: string): Node | undefined => {
    const matches = (index.get(id) ?? []).filter(n => !table || n.table === table);
    const sameImport = source.record.xml_import_id ? matches.filter(n => n.record.xml_import_id === source.record.xml_import_id) : [];
    const candidates = sameImport.length ? sameImport : matches;
    return candidates.length === 1 ? candidates[0] : undefined;
  };
}
export const ordered = (nodes: Node[]) => [...nodes].sort((a,b) => (Number(a.fields.order)||0)-(Number(b.fields.order)||0) || a.record.title.localeCompare(b.record.title));
export function references(n: Node): [string,string][] {
  return Object.entries(n.fields).filter(([k,v]) => !k.startsWith("sys_") && !k.startsWith("_") && guid.test(text(v))).map(([k,v])=>[k,text(v)]);
}
export function decisionGroups(nodes: Node[]) {
  const roots = nodes.filter(n=>n.table === "sys_decision");
  return roots.map(root=>({root, members: nodes.filter(n=>n !== root && !!root.sysId && (
    text(n.fields.decision_table || n.fields.decision || n.fields.decision_id || n.fields.model_id) === root.sysId ||
    ["input_table","result_table"].some(k=>text(n.fields[k]).endsWith(`_${root.sysId}`))
  )), rules: ordered(nodes.filter(n=>!!root.sysId && n.table === "sys_decision_question" && text(n.fields.decision_table) === root.sysId))}));
}
export function visibleFields(n: Node): [string,string][] {
  return Object.entries(n.fields).filter(([k,v])=>!k.startsWith("sys_") && !k.startsWith("_") && !["sn_type","action","update_name"].includes(k) && text(v)!=="").map(([k,v])=>[k,text(v)]);
}
export function variables(n: Node): [string,string][] {
  // Variables are dynamic XML children, not normal dictionary fields. Keep raw XML authoritative.
  const source = n.record.raw_xml ?? "";
  const block = source.match(/<variables\b[^>]*>([\s\S]*?)<\/variables>/i)?.[1] ?? "";
  const decode = (s: string) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,"&");
  const result: [string,string][] = [];
  for (const m of block.matchAll(/<([\w:.-]+)\b[^>]*>([\s\S]*?)<\/\1>/g)) if (!/<[a-z]/i.test(m[2].replace(/<!\[CDATA\[[\s\S]*?\]\]>/g,""))) result.push([m[1],decode(m[2])]);
  return result;
}
export function mobileGraph(nodes: Node[]) {
  const mobile = nodes.filter(n=>n.table.startsWith("sys_sg_"));
  const resolve = resolver(mobile);
  const links = mobile.flatMap(source=>references(source).map(([field,id])=>({source,field,id,target:resolve(id,source)})));
  // References point both toward owners (screen/form/view_config) and dependencies (embedded_screen/card).
  const ownerFields = new Set(["screen","form","ui_policy","segment","view_config_element"]);
  const edges = links.filter(l=>l.target).map(l=>(ownerFields.has(l.field) || (l.source.table === "sys_sg_view_config_element" && l.field === "view_config")) ? {parent:l.target!,child:l.source,field:l.field} : {parent:l.source,child:l.target!,field:l.field});
  const roots = mobile.filter(n=>["sys_sg_form_screen","sys_sg_list_screen","sys_sg_launcher_screen"].includes(n.table));
  return {mobile,links,edges,roots:roots.length?[...roots].sort((a,b)=>edges.filter(e=>e.parent===b).length-edges.filter(e=>e.parent===a).length):mobile.filter(n=>!edges.some(e=>e.child===n))};
}
export function conditionValues(condition: string): Record<string,string> | null {
  if (/\^(OR|NQ)|javascript:/i.test(condition)) return null;
  const values: Record<string,string> = {};
  for (const token of condition.split('^').filter(x=>x && x!=="EQ")) {
    const match = token.match(/^([a-zA-Z_][\w.]*)=([^=]*)$/);
    if (!match) return null;
    if (Object.prototype.hasOwnProperty.call(values,match[1])) return null;
    values[match[1]]=match[2];
  }
  return values;
}
export function resultValue(answer: Node, definition: Node, definitions: Node[]): {value:string; source:"field"|"label"} | undefined {
  const key=text(definition.fields.element);
  const variable=variables(answer).find(([k])=>k===key);
  if(variable)return {value:variable[1],source:"field"};
  if(key && answer.fields[key]!==undefined)return {value:text(answer.fields[key]),source:"field"};
  // Some exports contain the result only in its archived display label. Never treat it as a raw value.
  const title=text(answer.fields.label || answer.fields.sys_name);
  const label=text(definition.fields.label || definition.fields.column_label || definition.record.title);
  const start=title.indexOf(label+":");
  if(start<0)return;
  const offset=start+label.length+1;
  const next=definitions.map(d=>text(d.fields.label || d.fields.column_label || d.record.title)).map(l=>title.indexOf(", "+l+":",offset)).filter(i=>i>=0);
  return {value:title.slice(offset,next.length?Math.min(...next):undefined).trim(),source:"label"};
}
