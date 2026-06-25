import type { ParsedComponent, XmlParseResult } from "./xml.types";

// XML tag → dev type (direct / flat export format)
const XML_TAG_TO_DEV_TYPE: Record<string, string> = {
  sys_script: "business_rule",
  sys_script_include: "script_include",
  sys_script_client: "client_script",
  sys_ui_action: "ui_action",
  sys_ui_policy: "ui_policy",
  sys_properties: "system_property",
  sys_security_acl: "acl",
  sysauto_script: "scheduled_job",
  sysevent_email_action: "notification",
  sys_hub_flow: "flow",
  sys_script_fix: "fix_script",
  sys_ws_definition: "scripted_rest_api",
  sys_ws_operation: "scripted_rest_operation",
  sys_transform_map: "transform_map",
  sys_data_source: "data_source",
  sp_widget: "widget",
  sc_cat_item: "catalog_item",
  sc_cat_item_producer: "record_producer",
  sys_ui_script: "ui_script",
  sys_ui_message: "ui_message",
  sys_properties_category: "system_property_category",
  sys_properties_category_m2m: "category_property",
};

// <type> label inside sys_update_xml → dev type (update set / unload format)
// Keys are lowercase. Types not listed fall back to the xmlTag (table name).
const UPDATE_TYPE_TO_DEV_TYPE: Record<string, string> = {
  "system property": "system_property",
  "script include": "script_include",
  "business rule": "business_rule",
  "client script": "client_script",
  "ui action": "ui_action",
  "ui policy": "ui_policy",
  "acl": "acl",
  "scheduled script execution": "scheduled_job",
  "notification": "notification",
  "flow": "flow",
  "fix script": "fix_script",
  "ui script": "ui_script",
  "message": "ui_message",
  "system property category": "system_property_category",
  "category property": "category_property",
  "widget": "widget",
  "catalog item": "catalog_item",
  "order guide": "catalog_item",
  "record producer": "record_producer",
  "transform map": "transform_map",
  "data source": "data_source",
  "scripted rest api": "scripted_rest_api",
  "scripted rest api function": "scripted_rest_operation",
};

function getTextContent(el: Element, tagName: string): string {
  return el.querySelector(tagName)?.textContent?.trim() ?? "";
}

function getDirectChildText(parent: Element, tagName: string): string {
  const lower = tagName.toLowerCase();
  for (let i = 0; i < parent.children.length; i++) {
    if (parent.children[i].tagName.toLowerCase() === lower) {
      return parent.children[i].textContent?.trim() ?? "";
    }
  }
  return "";
}

function getDirectChild(parent: Element, tagName: string): Element | null {
  const lower = tagName.toLowerCase();
  for (let i = 0; i < parent.children.length; i++) {
    if (parent.children[i].tagName.toLowerCase() === lower) {
      return parent.children[i];
    }
  }
  return null;
}

function getDirectChildDisplayOrText(parent: Element, tagName: string): string {
  const child = getDirectChild(parent, tagName);
  return child?.getAttribute("display_value") || child?.textContent?.trim() || "";
}

async function decodeGzipBase64(value: string): Promise<string> {
  const compressed = value.trim();
  if (!compressed || typeof DecompressionStream === "undefined") return "";
  try {
    const binary = atob(compressed);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return await new Response(stream).text();
  } catch {
    return "";
  }
}

async function parseCompressedJson(value: string): Promise<unknown | null> {
  const decoded = await decodeGzipBase64(value);
  if (!decoded) return null;
  try {
    return JSON.parse(decoded) as unknown;
  } catch {
    return null;
  }
}

type FlowDecodedInput = {
  name?: string;
  label?: string;
  value?: unknown;
  displayValue?: unknown;
  internalType?: string;
  type?: string;
  parameter?: {
    label?: string;
    name?: string;
    type?: string;
    typeLabel?: string;
    type_label?: string;
    reference?: string;
    reference_display?: string;
    table?: string;
  };
  children?: FlowDecodedInput[];
};

function stringifyFlowValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function extractDecodedInputs(decoded: unknown): FlowDecodedInput[] {
  if (Array.isArray(decoded)) return decoded as FlowDecodedInput[];
  if (decoded && typeof decoded === "object" && Array.isArray((decoded as { inputs?: unknown }).inputs)) {
    return (decoded as { inputs: FlowDecodedInput[] }).inputs;
  }
  return [];
}

function decodedInputsToParams(inputs: FlowDecodedInput[]): Array<Record<string, string>> {
  const params: Array<Record<string, string>> = [];
  const addParam = (param: Record<string, string>) => {
    params.push(param);
  };
  const visit = (input: FlowDecodedInput, parentLabel?: string) => {
    const label = input.parameter?.label || input.label || input.name || "";
    const name = input.name || input.parameter?.name || label;
    if (name || label) {
      const value = stringifyFlowValue(input.value);
      const displayValue = stringifyFlowValue(input.displayValue) || value;
      addParam({
        name,
        label,
        value,
        display_value: displayValue,
        type: input.parameter?.typeLabel || input.parameter?.type_label || input.internalType || input.parameter?.type || input.type || "",
        reference: input.parameter?.reference || "",
        reference_display: input.parameter?.reference_display || "",
        table: input.parameter?.table || "",
        parent: parentLabel || "",
      });
    }
    for (const child of input.children ?? []) visit(child, label || parentLabel);
  };
  for (const input of inputs) visit(input);

  const byName = new Map(params.map((param) => [param.name, param]));
  const addAlias = (from: string, to: string, label: string) => {
    const source = byName.get(from);
    if (!source || byName.has(to)) return;
    const alias = { ...source, name: to, label };
    addParam(alias);
    byName.set(to, alias);
  };
  addAlias("ah_table_name", "table", "Table");
  addAlias("ah_short_description", "short_description", "Short Description");
  addAlias("ah_requested_item", "requested_item", "Requested Item");
  addAlias("template_catalog_item", "template", "Template");
  addAlias("catalog_variables", "variables", "Variables");
  addAlias("approval_conditions", "approvers", "Approvers / Rules");

  const fields = byName.get("ah_fields");
  if (fields?.value) {
    for (const part of fields.value.split("^")) {
      const eq = part.indexOf("=");
      if (eq <= 0) continue;
      const fieldName = part.slice(0, eq).trim();
      const fieldValue = part.slice(eq + 1).trim();
      if (!fieldName || byName.has(fieldName)) continue;
      const fieldParam = {
        name: fieldName,
        label: fieldName.replace(/_/g, " "),
        value: fieldValue,
        display_value: fieldValue,
        type: "field",
        reference: "",
        reference_display: "",
        table: "",
        parent: fields.label || fields.name,
      };
      addParam(fieldParam);
      byName.set(fieldName, fieldParam);
    }
  }

  return params;
}

function paramsToDataPillInputs(params: Array<Record<string, string>>): Record<string, unknown>[] {
  const pills: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  for (const param of params) {
    const text = `${param.value} ${param.display_value}`;
    const pillRegex = /\{\{([^}]+)\}\}/g;
    let match: RegExpExecArray | null;
    while ((match = pillRegex.exec(text)) !== null) {
      const pill = match[1]?.trim();
      if (!pill || seen.has(`${param.name}:${pill}`)) continue;
      seen.add(`${param.name}:${pill}`);
      pills.push({
        source_order: 0,
        source_label: "Data pill",
        field: pill,
        usages: [param.label || param.name],
      });
    }
  }
  return pills;
}

function getFlowRecordSysId(el: Element): string {
  return getDirectChildText(el, "flow");
}

function belongsToFlow(el: Element, flowSysId: string): boolean {
  if (!flowSysId) return true;
  const table = el.tagName.toLowerCase();
  if (table === "sys_hub_flow") return getDirectChildText(el, "sys_id") === flowSysId;
  const flowRef = getFlowRecordSysId(el);
  if (flowRef) return flowRef === flowSysId;
  const modelTable = getDirectChildText(el, "model_table");
  const modelId = getDirectChildText(el, "model_id") || getDirectChildText(el, "model");
  if (modelTable === "sys_hub_flow" && modelId) return modelId === flowSysId;
  return true;
}

function extractConfigFromXmlNode(el: Element, devType: string): Record<string, unknown> {
  const config: Record<string, unknown> = {};

  switch (devType) {
    case "business_rule":
      config.name = getTextContent(el, "name");
      config.table = getTextContent(el, "collection");
      config.when = getTextContent(el, "when") || "before";
      config.insert = getTextContent(el, "action_insert") === "true";
      config.update = getTextContent(el, "action_update") === "true";
      config.delete = getTextContent(el, "action_delete") === "true";
      config.query = getTextContent(el, "action_query") === "true";
      config.condition = getTextContent(el, "filter_condition");
      config.script = getTextContent(el, "script");
      config.active = getTextContent(el, "active") !== "false";
      config.order = parseInt(getTextContent(el, "order") || "100");
      break;

    case "script_include":
      config.name = getTextContent(el, "name");
      config.api_name = getTextContent(el, "api_name");
      config.client_callable = getTextContent(el, "client_callable") === "true";
      config.active = getTextContent(el, "active") !== "false";
      config.description = getTextContent(el, "description");
      config.script = getTextContent(el, "script");
      break;

    case "client_script":
      config.name = getTextContent(el, "name");
      config.table = getTextContent(el, "table");
      config.type = getTextContent(el, "type") || "onLoad";
      config.field_name = getTextContent(el, "field_name");
      config.condition = getTextContent(el, "condition");
      config.script = getTextContent(el, "script");
      config.active = getTextContent(el, "active") !== "false";
      break;

    case "ui_action":
      config.name = getTextContent(el, "name");
      config.table = getTextContent(el, "table");
      config.action_name = getTextContent(el, "action_name");
      config.form_button = getTextContent(el, "form_button") === "true";
      config.form_link = getTextContent(el, "form_link") === "true";
      config.list_button = getTextContent(el, "list_button") === "true";
      config.condition = getTextContent(el, "condition");
      config.script = getTextContent(el, "script");
      config.active = getTextContent(el, "active") !== "false";
      break;

    case "ui_policy":
      config.name = getTextContent(el, "name");
      config.table = getTextContent(el, "model_table");
      config.condition = getTextContent(el, "conditions");
      config.reverse_if_false = getTextContent(el, "reverse_if_false") !== "false";
      config.on_load = getTextContent(el, "on_load") !== "false";
      config.active = getTextContent(el, "active") !== "false";
      break;

    case "system_property":
      config.name = getTextContent(el, "name");
      config.type = getTextContent(el, "type") || "string";
      config.value = getTextContent(el, "value");
      config.description = getTextContent(el, "description");
      config.is_private = getTextContent(el, "is_private") === "true";
      break;

    case "acl":
      config.name = getTextContent(el, "name");
      config.operation = getTextContent(el, "operation") || "read";
      config.type = getTextContent(el, "type") || "record";
      config.table = getTextContent(el, "object_name");
      config.condition = getTextContent(el, "condition");
      config.script = getTextContent(el, "script");
      config.active = getTextContent(el, "active") !== "false";
      break;

    case "scheduled_job":
      config.name = getTextContent(el, "name");
      config.run_type = getTextContent(el, "run_type") || "daily";
      config.script = getTextContent(el, "script");
      config.active = getTextContent(el, "active") !== "false";
      break;

    case "notification": {
      // ── Identity ─────────────────────────────────────────────────────────
      config.name        = getTextContent(el, "name");
      config.table       = getTextContent(el, "collection");
      config.type        = getTextContent(el, "type") || "email";
      config.active      = getTextContent(el, "active") !== "false";
      config.description = getTextContent(el, "description");
      config.order       = parseInt(getTextContent(el, "order") || "100");
      config.weight      = parseInt(getTextContent(el, "weight") || "0");
      // category carries a display_value attribute (human label) in SN XML
      const _catEl = el.querySelector("category");
      config.category = _catEl?.getAttribute("display_value") || _catEl?.textContent?.trim() || "";

      // ── When to send ──────────────────────────────────────────────────────
      config.generation_type        = getTextContent(el, "generation_type") || "event";
      config.event_name             = getTextContent(el, "event_name");
      config.condition              = getTextContent(el, "condition");
      config.advanced_condition     = getTextContent(el, "advanced_condition");
      config.action_insert          = getTextContent(el, "action_insert") === "true";
      config.action_update          = getTextContent(el, "action_update") === "true";
      config.affected_field_on_event = getTextContent(el, "affected_field_on_event");

      // ── Who will receive ──────────────────────────────────────────────────
      config.item              = getTextContent(el, "item");         // e.g. "event.parm1"
      config.item_table        = getTextContent(el, "item_table");
      config.recipient_users   = getTextContent(el, "recipient_users");
      config.recipient_groups  = getTextContent(el, "recipient_groups");
      config.recipient_fields  = getTextContent(el, "recipient_fields");
      config.event_parm_1      = getTextContent(el, "event_parm_1") === "true";
      config.event_parm_2      = getTextContent(el, "event_parm_2") === "true";
      config.send_self         = getTextContent(el, "send_self") === "true";
      config.exclude_delegates = getTextContent(el, "exclude_delegates") === "true";
      config.subscribable      = getTextContent(el, "subscribable") === "true";

      // ── What it will contain ──────────────────────────────────────────────
      config.content_type = getTextContent(el, "content_type") || "text/html";
      // template carries a display_value for the human-readable template name
      const _tmplEl = el.querySelector("template");
      config.template_name   = _tmplEl?.getAttribute("display_value") || _tmplEl?.textContent?.trim() || "";
      config.template_sys_id = _tmplEl?.textContent?.trim() || "";
      config.subject         = getTextContent(el, "subject");
      config.message_html    = getTextContent(el, "message_html");
      config.message_text    = getTextContent(el, "message_text");
      config.importance      = getTextContent(el, "importance");
      config.from            = getTextContent(el, "from");
      config.reply_to        = getTextContent(el, "reply_to");
      config.sms_alternate   = getTextContent(el, "sms_alternate");

      // ── Delivery options ──────────────────────────────────────────────────
      config.omit_watermark             = getTextContent(el, "omit_watermark") === "true";
      config.include_attachments        = getTextContent(el, "include_attachments") === "true";
      config.push_message_only          = getTextContent(el, "push_message_only") === "true";
      config.force_delivery             = getTextContent(el, "force_delivery") === "true";
      config.enable_dynamic_translation = getTextContent(el, "enable_dynamic_translation") === "true";
      config.mandatory                  = getTextContent(el, "mandatory") === "true";
      config.digestable                 = getTextContent(el, "digestable") === "true";
      break;
    }

    case "flow":
      config.name = getTextContent(el, "name");
      config.trigger_type = getTextContent(el, "trigger_type");
      config.table = getTextContent(el, "table");
      config.description = getTextContent(el, "description");
      break;

    case "fix_script":
      config.name = getTextContent(el, "name");
      config.description = getTextContent(el, "description");
      config.script = getTextContent(el, "script");
      config.active = getTextContent(el, "active") !== "false";
      break;

    case "scripted_rest_api":
    case "scripted_rest_operation":
      config.api_name = getTextContent(el, "name");
      config.base_path = getTextContent(el, "base_api_path");
      break;

    case "catalog_item":
      config.name = getTextContent(el, "name");
      config.short_description = getTextContent(el, "short_description");
      config.category = getTextContent(el, "category");
      config.active = getTextContent(el, "active") !== "false";
      break;

    case "record_producer":
      config.name = getTextContent(el, "name");
      config.table = getTextContent(el, "table_name");
      config.short_description = getTextContent(el, "short_description");
      config.script = getTextContent(el, "script");
      config.active = getTextContent(el, "active") !== "false";
      break;

    case "ui_script":
      config.name = getTextContent(el, "name");
      config.description = getTextContent(el, "description");
      config.script = getTextContent(el, "script");
      config.active = getTextContent(el, "active") !== "false";
      config.global = getTextContent(el, "global") === "true";
      break;

    case "ui_message":
      config.key = getTextContent(el, "key");
      config.language = getTextContent(el, "language");
      config.message = getTextContent(el, "message");
      break;

    case "system_property_category":
      config.name = getTextContent(el, "name");
      break;

    case "category_property":
      config.name = getTextContent(el, "sys_name");
      break;

    default:
      // For unrecognised types: extract every child element so the generic form
      // has all available data. Reference fields in SN XML carry a display_value
      // attribute (human label) alongside the raw sys_id text content.
      for (let i = 0; i < el.children.length; i++) {
        const child = el.children[i];
        const key = child.tagName.toLowerCase();
        const displayValue = child.getAttribute("display_value");
        const rawText = child.textContent?.trim() ?? "";
        // Prefer display_value when set; avoids surfacing opaque sys_id hashes
        const val =
          displayValue !== null && displayValue !== "" ? displayValue : rawText;
        if (val === "true") {
          config[key] = true;
        } else if (val === "false") {
          config[key] = false;
        } else if (val !== "") {
          config[key] = val;
        }
      }
      break;
  }

  return config;
}

// Derive the table name from an update_name field (strip trailing _<32hexchars>)
function xmlTagFromUpdateName(name: string): string {
  return name.replace(/_[a-f0-9]{32}$/i, "") || name;
}

/**
 * For a <record_update table="sys_hub_action_type_definition"> element, find
 * the JavaScript script stored in a sibling sys_variable_value that belongs to
 * the "Script" step instance:
 *   action def (sys_id)
 *     → sys_hub_step_instance (action = def sys_id, step_type display_value = "Script")
 *       → sys_variable_value (document = sys_hub_step_instance,
 *                             document_key = step sys_id,
 *                             variable display_value = "Script")
 *
 * Used for both the direct-export format (rootEl = <record_update>) and the
 * update-set payload format (inner parsed <record_update>).
 */
function extractActionDefinitionScript(recordUpdate: Element): string {
  const actionDefEl = recordUpdate.querySelector("sys_hub_action_type_definition");
  const actionSysId =
    actionDefEl?.querySelector("sys_id")?.textContent?.trim() ?? "";

  // Collect sys_ids of Script-typed step instances linked to this action
  const scriptStepIds: string[] = [];
  const stepEls = recordUpdate.querySelectorAll("sys_hub_step_instance");
  for (let s = 0; s < stepEls.length; s++) {
    const stepEl = stepEls[s];
    const stepSysId =
      stepEl.querySelector("sys_id")?.textContent?.trim() ?? "";
    const stepAction =
      stepEl.querySelector("action")?.textContent?.trim() ?? "";
    const stepTypeDisplay =
      stepEl
        .querySelector("step_type")
        ?.getAttribute("display_value")
        ?.toLowerCase() ?? "";
    const stepLabel =
      stepEl.querySelector("label")?.textContent?.trim().toLowerCase() ?? "";

    const isScriptStep =
      stepTypeDisplay === "script" || stepLabel.includes("script");
    const isLinked = !actionSysId || stepAction === actionSysId;

    if (isScriptStep && isLinked && stepSysId) {
      scriptStepIds.push(stepSysId);
    }
  }

  // Primary: sys_variable_value linked through the script step instance
  if (scriptStepIds.length > 0) {
    const varValueEls = recordUpdate.querySelectorAll("sys_variable_value");
    for (let v = 0; v < varValueEls.length; v++) {
      const varEl = varValueEls[v];
      const docType =
        varEl.querySelector("document")?.textContent?.trim() ?? "";
      const docKey =
        varEl.querySelector("document_key")?.textContent?.trim() ?? "";
      const varDisplayName =
        varEl.querySelector("variable")?.getAttribute("display_value") ?? "";
      const valueText =
        varEl.querySelector("value")?.textContent?.trim() ?? "";

      if (
        docType === "sys_hub_step_instance" &&
        scriptStepIds.includes(docKey) &&
        varDisplayName === "Script" &&
        valueText
      ) {
        return valueText;
      }
    }
  }

  // Fallback: any sys_variable_value whose variable is "Script" and value
  // looks like a Flow Action execute function
  const allVarEls = recordUpdate.querySelectorAll("sys_variable_value");
  for (let v = 0; v < allVarEls.length; v++) {
    const varEl = allVarEls[v];
    const varDisplayName =
      varEl.querySelector("variable")?.getAttribute("display_value") ?? "";
    const valueText =
      varEl.querySelector("value")?.textContent?.trim() ?? "";
    if (varDisplayName === "Script" && valueText.startsWith("(function execute")) {
      return valueText;
    }
  }

  return "";
}

// Detect If / Else If / Else / For Each branch type from a step label
function detectBranchType(label: string): string | null {
  const l = label.toLowerCase().trim();
  if (l === "if" || l.startsWith("if ") || l.startsWith("if(")) return "if";
  if (l.startsWith("else if")) return "else_if";
  if (l === "else" || l.startsWith("else ")) return "else";
  if (l.includes("for each") || l.includes("foreach")) return "for_each";
  return null;
}

/**
 * For a <record_update table="sys_hub_flow"> element (or <unload> root), extract
 * the full flow structure (trigger, inputs, stages, action steps) for FlowPreview.
 */
function extractFlowPreview(recordUpdate: Element): Record<string, unknown> | null {
  const flowEl = recordUpdate.querySelector("sys_hub_flow");
  if (!flowEl) return null;

  // ── Basic flow info ────────────────────────────────────────────────────────
  const name = flowEl.querySelector("name")?.textContent?.trim() ?? "";
  const description = flowEl.querySelector("description")?.textContent?.trim() ?? "";
  const stateEl = flowEl.querySelector("state");
  const status =
    stateEl?.getAttribute("display_value") || stateEl?.textContent?.trim() || "";
  const typeEl = flowEl.querySelector("type");
  const type =
    typeEl?.getAttribute("display_value") || typeEl?.textContent?.trim() || "";
  const runAsEl = flowEl.querySelector("run_as");
  const runAs =
    runAsEl?.getAttribute("display_value") || runAsEl?.textContent?.trim() || "";
  const sysId = flowEl.querySelector("sys_id")?.textContent?.trim() ?? "";

  // ── Trigger ────────────────────────────────────────────────────────────────
  let trigger: Record<string, unknown> | undefined;
  const trigEl = recordUpdate.querySelector("sys_hub_trigger_instance_v2");
  if (trigEl) {
    const defEl = trigEl.querySelector("trigger_definition");
    const definition =
      defEl?.getAttribute("display_value") || defEl?.textContent?.trim() || "";
    const trigName = trigEl.querySelector("name")?.textContent?.trim() ?? "";
    const comment = trigEl.querySelector("comment")?.textContent?.trim() ?? "";
    const tableEl = trigEl.querySelector("base_object_type");
    const table =
      tableEl?.getAttribute("display_value") || tableEl?.textContent?.trim() || "";
    trigger = { name: trigName, definition, comment, table: table || undefined };
  }
  const catTrigEl = recordUpdate.querySelector("sys_flow_catalog_trigger");
  if (catTrigEl) {
    const ciEl = catTrigEl.querySelector("catalog_item");
    const catalogItem =
      ciEl?.getAttribute("display_value") || ciEl?.textContent?.trim() || "";
    if (!trigger) trigger = { name: "", definition: "Service Catalog", comment: "" };
    if (catalogItem) trigger.catalog_item = catalogItem;
  }

  // ── Inputs ─────────────────────────────────────────────────────────────────
  const inputs: Record<string, unknown>[] = [];
  const inputEls = recordUpdate.querySelectorAll("sys_hub_flow_input");
  for (let i = 0; i < inputEls.length; i++) {
    const el = inputEls[i];
    if (el.getAttribute("action") === "delete_multiple") continue;
    const element = el.querySelector("element")?.textContent?.trim() ?? "";
    const label =
      el.querySelector("label")?.textContent?.trim() ||
      el.querySelector("column_label")?.textContent?.trim() ||
      "";
    const itEl = el.querySelector("internal_type");
    const internalType =
      itEl?.getAttribute("display_value") || itEl?.textContent?.trim() || "";
    const mandatory = el.querySelector("mandatory")?.textContent?.trim() === "true";
    const refEl = el.querySelector("reference");
    const reference =
      refEl?.getAttribute("display_value") ||
      refEl?.getAttribute("name") ||
      refEl?.textContent?.trim() ||
      "";
    const defaultValue = el.querySelector("default_value")?.textContent?.trim() ?? "";
    const order = parseInt(el.querySelector("order")?.textContent?.trim() || "0") || 0;
    if (element || label) {
      inputs.push({
        name: element,
        label: label || element,
        type: internalType,
        mandatory,
        reference: reference || undefined,
        default_value: defaultValue || undefined,
        order,
      });
    }
  }
  inputs.sort((a, b) => ((a.order as number) || 0) - ((b.order as number) || 0));

  // ── Stages ─────────────────────────────────────────────────────────────────
  const stages: Record<string, unknown>[] = [];
  const stageEls = recordUpdate.querySelectorAll("sys_hub_flow_stage");
  for (let i = 0; i < stageEls.length; i++) {
    const el = stageEls[i];
    if (el.getAttribute("action") === "delete_multiple") continue;
    const label = el.querySelector("label")?.textContent?.trim() ?? "";
    const value = el.querySelector("value")?.textContent?.trim() ?? "";
    const order = parseInt(el.querySelector("order")?.textContent?.trim() || "0") || 0;
    const stageType = el.querySelector("type")?.textContent?.trim() ?? "";
    if (label || value) {
      stages.push({ label, value, order, type: stageType });
    }
  }
  stages.sort((a, b) => ((a.order as number) || 0) - ((b.order as number) || 0));

  // ── Steps (action instances) ───────────────────────────────────────────────
  const steps: Record<string, unknown>[] = [];
  const actionEls = recordUpdate.querySelectorAll("sys_hub_action_instance");
  for (let i = 0; i < actionEls.length; i++) {
    const el = actionEls[i];
    if (el.getAttribute("action") === "delete_multiple") continue;
    const label =
      el.querySelector("label")?.textContent?.trim() ||
      el.querySelector("name")?.textContent?.trim() ||
      "";
    const order = parseInt(el.querySelector("order")?.textContent?.trim() || "0") || 0;
    const stepSysId = el.querySelector("sys_id")?.textContent?.trim() ?? "";
    const atEl = el.querySelector("action_type");
    const actionType =
      atEl?.getAttribute("display_value") || atEl?.textContent?.trim() || "";
    if (label || stepSysId) {
      steps.push({
        order,
        label: label || actionType,
        type: "action",
        table: "sys_hub_action_instance",
        sys_id: stepSysId,
        action: actionType,
        uuid: stepSysId || undefined,
        branch_type: detectBranchType(label || actionType),
      });
    }
  }
  steps.sort((a, b) => ((a.order as number) || 0) - ((b.order as number) || 0));

  // ── label_cache fallback: when sys_hub_action_instance elements are absent ─
  // Parses "N - ActionName➛OutputPath" entries to build enriched step data:
  // uuid (action instance id), outputs (what the step produces), inputs (data
  // pills consumed, resolved via usedInstances UUID → step order mapping).
  if (steps.length === 0) {
    const lcText = flowEl.querySelector("label_cache")?.textContent?.trim() ?? "";
    if (lcText) {
      try {
        type LCEntry = {
          name: string;
          label: string;
          reference?: string;
          reference_display?: string;
          type?: string;
          choices?: Array<{ label: string; value: string }>;
          usedInstances?: Record<string, string[]>;
        };
        const cache = JSON.parse(lcText) as LCEntry[];

        // Extract trigger type if not already known
        if (!trigger) {
          for (const entry of cache) {
            const tm = entry.label.match(/^Trigger\s*-\s*([^➛\n]+)/);
            if (tm) {
              const def = tm[1].trim();
              trigger = { name: def, definition: def, comment: "" };
              break;
            }
          }
        }

        // Phase 1 — UUID→order map + collect outputs per (order, label)
        const uuidToOrder = new Map<string, number>();
        type StepAccum = {
          order: number;
          label: string;
          uuid: string;
          seenPaths: Set<string>;
          outputs: Record<string, unknown>[];
        };
        const accumMap = new Map<string, StepAccum>(); // key: "order-label"

        for (const entry of cache) {
          const m = entry.label.match(/^(\d+)\s*-\s*([^➛\n]+)(?:➛(.+))?$/);
          if (!m) continue;
          const order = parseInt(m[1]);
          const actionLabel = m[2].trim();
          const outputPath = m[3]?.trim() ?? "";

          const dotIdx = (entry.name ?? "").indexOf(".");
          const uuid = dotIdx >= 0 ? entry.name.substring(0, dotIdx) : (entry.name ?? "");
          if (uuid && !uuidToOrder.has(uuid)) uuidToOrder.set(uuid, order);

          const key = `${order}-${actionLabel}`;
          if (!accumMap.has(key)) {
            accumMap.set(key, { order, label: actionLabel, uuid, seenPaths: new Set(), outputs: [] });
          }
          const acc = accumMap.get(key)!;

          if (outputPath && !acc.seenPaths.has(outputPath)) {
            acc.seenPaths.add(outputPath);
            acc.outputs.push({
              path: outputPath,
              type: entry.type ?? "",
              reference: entry.reference || undefined,
              reference_display: entry.reference_display || undefined,
              choices: entry.choices
                ?.filter((c) => c.value !== "")
                .slice(0, 8)
                .map((c) => ({ label: c.label, value: c.value })),
            });
          }
        }

        // Phase 2 — inputs map: which steps consume each output (via usedInstances)
        const inputsMap = new Map<number, Record<string, unknown>[]>();
        for (const entry of cache) {
          if (!entry.usedInstances || Object.keys(entry.usedInstances).length === 0) continue;
          const m = entry.label.match(/^(\d+)\s*-\s*([^➛\n]+)(?:➛(.+))?$/);
          if (!m) continue;
          const srcOrder = parseInt(m[1]);
          const srcLabel = m[2].trim();
          const field = m[3]?.trim() ?? "";
          for (const [consumerUuid, usages] of Object.entries(entry.usedInstances)) {
            const tgtOrder = uuidToOrder.get(consumerUuid);
            if (!tgtOrder || tgtOrder === srcOrder) continue;
            if (!inputsMap.has(tgtOrder)) inputsMap.set(tgtOrder, []);
            const arr = inputsMap.get(tgtOrder)!;
            if (!arr.some((inp) => (inp.source_order as number) === srcOrder && inp.field === field)) {
              arr.push({ source_order: srcOrder, source_label: srcLabel, field, usages });
            }
          }
        }

        // Build final steps (accumMap is already deduplicated by order-label key)
        for (const acc of Array.from(accumMap.values())) {
          steps.push({
            order: acc.order,
            label: acc.label,
            type: "action",
            table: "sys_hub_action_instance",
            sys_id: "",
            action: acc.label,
            uuid: acc.uuid || undefined,
            outputs: acc.outputs.length > 0 ? acc.outputs : undefined,
            inputs: inputsMap.get(acc.order) ?? undefined,
            branch_type: detectBranchType(acc.label),
          });
        }

        steps.sort((a, b) => {
          const d = ((a.order as number) || 0) - ((b.order as number) || 0);
          return d !== 0 ? d : String(a.label).localeCompare(String(b.label));
        });
      } catch { /* ignore malformed JSON */ }
    }
  }

  return { name, description, status, type, run_as: runAs, sys_id: sysId, trigger, inputs, stages, steps };
}

// Collect records from a single payload text into a shared table→elements map.
// Used for update-set format where payloads are escaped text, not DOM children.
function collectPayloadRecords(
  payloadText: string,
  map: Map<string, Element[]>,
): void {
  try {
    const innerDoc = new DOMParser().parseFromString(payloadText, "application/xml");
    if (innerDoc.querySelector("parsererror")) return;
    const recordUpdate = innerDoc.querySelector("record_update");
    if (!recordUpdate) return;
    for (let i = 0; i < recordUpdate.children.length; i++) {
      const child = recordUpdate.children[i];
      const table = child.tagName.toLowerCase();
      if (table === "parsererror") continue;
      if (!map.has(table)) map.set(table, []);
      map.get(table)!.push(child);
    }
  } catch {
    // Unparseable payload — skip
  }
}

// Collect flow-related records from a direct-export root element (parsed DOM, not text).
function collectRecordsFromDirectExport(rootEl: Element): Map<string, Element[]> {
  const map = new Map<string, Element[]>();
  const tables = [
    "sys_hub_action_instance", "sys_variable_value", "sys_hub_step_instance",
    "sys_hub_flow_logic", "sys_hub_flow_branch", "sys_flow_condition",
    "sys_hub_action_value", "sys_element_mapping", "sys_hub_flow",
    "sys_hub_trigger_instance_v2", "sys_flow_catalog_trigger",
    "sys_hub_action_type_definition", "sys_hub_flow_input",
    "sys_hub_action_instance_v2", "sys_hub_flow_logic_instance_v2",
    "sys_hub_sub_flow_instance_v2",
  ];
  for (const table of tables) {
    const els = rootEl.querySelectorAll(table);
    if (els.length > 0) map.set(table, Array.from(els));
  }
  return map;
}

interface FlowDebugInfo {
  tables_found: string[];
  record_counts: Record<string, number>;
  branch_structure_found: boolean;
  branch_note: string;
  fields_per_table: Record<string, string[]>;
}

const BRANCH_TABLES = ["sys_hub_flow_logic", "sys_hub_flow_branch", "sys_flow_condition", "sys_hub_flow_logic_instance_v2"];
const INSPECT_TABLES = [
  "sys_hub_action_instance", "sys_variable_value", "sys_hub_step_instance",
  "sys_hub_flow_logic", "sys_hub_flow_branch", "sys_flow_condition",
  "sys_hub_action_value", "sys_element_mapping",
  "sys_hub_action_instance_v2", "sys_hub_flow_logic_instance_v2",
  "sys_hub_sub_flow_instance_v2", "sys_hub_trigger_instance_v2",
];

async function buildFlowEnrichment(
  allRecords: Map<string, Element[]>,
  existingPreview: Record<string, unknown>,
): Promise<{ enrichedSteps: Record<string, unknown>[]; debug: FlowDebugInfo }> {
  const flowSysId = String(existingPreview.sys_id ?? "");
  const scopedRecords = new Map<string, Element[]>();
  for (const [table, els] of Array.from(allRecords.entries())) {
    const scoped = els.filter((el) => belongsToFlow(el, flowSysId));
    if (scoped.length > 0) scopedRecords.set(table, scoped);
  }

  // ── Debug info ───────────────────────────────────────────────────────────────
  const tables_found = Array.from(scopedRecords.keys()).sort();
  const record_counts: Record<string, number> = {};
  for (const [table, els] of Array.from(scopedRecords.entries())) {
    record_counts[table] = els.length;
  }

  const fields_per_table: Record<string, string[]> = {};
  for (const table of INSPECT_TABLES) {
    const els = scopedRecords.get(table);
    if (els && els.length > 0) {
      fields_per_table[table] = Array.from(els[0].children)
        .map((c) => c.tagName)
        .filter(Boolean);
    }
  }

  const hasBranchTables = BRANCH_TABLES.some((t) => scopedRecords.has(t));
  const branchTablesList = BRANCH_TABLES
    .filter((t) => scopedRecords.has(t))
    .map((t) => `${t} (${record_counts[t]})`);
  const branch_note = hasBranchTables
    ? `Branch data found: ${branchTablesList.join(", ")}`
    : "Branch structure not found in XML export. Branch detection is based on step label only.";

  // ── Build params map from sys_variable_value ─────────────────────────────────
  const varsByUuid = new Map<string, Array<{ name: string; value: string; display_value: string }>>();

  for (const el of scopedRecords.get("sys_variable_value") ?? []) {
    const uuid = el.querySelector("action_instance")?.textContent?.trim() ?? "";
    if (!uuid) continue;
    const name = el.querySelector("name")?.textContent?.trim() ?? "";
    if (!name) continue;
    const valueEl = el.querySelector("value");
    const value = valueEl?.textContent?.trim() ?? "";
    const display_value = valueEl?.getAttribute("display_value") ?? value;
    if (!varsByUuid.has(uuid)) varsByUuid.set(uuid, []);
    varsByUuid.get(uuid)!.push({ name, value, display_value });
  }

  // Also check sys_hub_action_value (alternative variable storage used by some action types)
  for (const el of scopedRecords.get("sys_hub_action_value") ?? []) {
    const uuid =
      el.querySelector("action_instance")?.textContent?.trim() ||
      el.querySelector("step_execution")?.textContent?.trim() || "";
    if (!uuid) continue;
    const nameEl = el.querySelector("action_input");
    const name =
      nameEl?.getAttribute("display_value") ||
      nameEl?.textContent?.trim() ||
      el.querySelector("name")?.textContent?.trim() || "";
    if (!name) continue;
    const valueEl = el.querySelector("value");
    const value = valueEl?.textContent?.trim() ?? "";
    const display_value = valueEl?.getAttribute("display_value") ?? value;
    if (!varsByUuid.has(uuid)) varsByUuid.set(uuid, []);
    const existing = varsByUuid.get(uuid)!;
    if (!existing.some((p) => p.name === name)) {
      existing.push({ name, value, display_value });
    }
  }

  // ── Build enriched steps ──────────────────────────────────────────────────────
  const existingSteps = (existingPreview.steps ?? []) as Record<string, unknown>[];
  const actionInstancesV2 = scopedRecords.get("sys_hub_action_instance_v2") ?? [];
  const logicInstancesV2 = scopedRecords.get("sys_hub_flow_logic_instance_v2") ?? [];
  const subflowInstancesV2 = scopedRecords.get("sys_hub_sub_flow_instance_v2") ?? [];
  const actionInstances = scopedRecords.get("sys_hub_action_instance") ?? [];
  let enrichedSteps: Record<string, unknown>[];

  if (actionInstancesV2.length > 0 || logicInstancesV2.length > 0 || subflowInstancesV2.length > 0) {
    const v2Items: Array<{ el: Element; kind: "action" | "logic" | "subflow" }> = [
      ...actionInstancesV2.map((el) => ({ el, kind: "action" as const })),
      ...logicInstancesV2.map((el) => ({ el, kind: "logic" as const })),
      ...subflowInstancesV2.map((el) => ({ el, kind: "subflow" as const })),
    ]
      .filter((item) => item.el.getAttribute("action") !== "delete_multiple")
      .sort((a, b) => {
        const oa = parseInt(getDirectChildText(a.el, "order") || "0") || 0;
        const ob = parseInt(getDirectChildText(b.el, "order") || "0") || 0;
        if (oa !== ob) return oa - ob;
        return getDirectChildText(a.el, "sys_id").localeCompare(getDirectChildText(b.el, "sys_id"));
      });

    enrichedSteps = [];
    for (const item of v2Items) {
      const el = item.el;
      const order = parseInt(getDirectChildText(el, "order") || "0") || enrichedSteps.length + 1;
      const sysId = getDirectChildText(el, "sys_id");
      const uiId = getDirectChildText(el, "ui_id");
      const parentUiId = getDirectChildText(el, "parent_ui_id");
      const connectedTo = getDirectChildText(el, "connected_to");
      const comment = getDirectChildText(el, "comment");
      const actionType =
        item.kind === "action"
          ? getDirectChildDisplayOrText(el, "action_type")
          : item.kind === "subflow"
            ? getDirectChildDisplayOrText(el, "subflow")
            : getDirectChildDisplayOrText(el, "logic_definition");
      const decoded = await parseCompressedJson(
        getDirectChildText(el, item.kind === "subflow" ? "subflow_inputs" : "values")
      );
      const decodedParams = decodedInputsToParams(extractDecodedInputs(decoded));
      const oldParams = varsByUuid.get(sysId) ?? [];
      const params = decodedParams.length > 0 ? decodedParams : oldParams;
      const condition = params.find((p) => p.name === "condition");
      const conditionName = params.find((p) => p.name === "condition_name");
      const label =
        conditionName?.display_value ||
        comment ||
        actionType ||
        (item.kind === "logic" ? "Flow logic" : item.kind === "subflow" ? "Subflow" : "Action");
      const actionLower = actionType.toLowerCase();
      const branchType =
        actionLower === "if" ? "if" :
        actionLower === "else if" ? "else_if" :
        actionLower === "else" ? "else" :
        detectBranchType(label || actionType);
      const dataPillInputs = paramsToDataPillInputs(params as Array<Record<string, string>>);

      enrichedSteps.push({
        order,
        label,
        type: item.kind,
        table: el.tagName.toLowerCase(),
        sys_id: sysId,
        action: actionType || label,
        uuid: uiId || sysId || undefined,
        parent_ui_id: parentUiId || undefined,
        connected_to: connectedTo || undefined,
        branch_type: branchType,
        condition: condition?.display_value || condition?.value || undefined,
        comment: comment || undefined,
        params: params.length > 0 ? params : undefined,
        inputs: dataPillInputs.length > 0 ? dataPillInputs : undefined,
      });
    }
  } else if (actionInstances.length > 0) {
    const sorted = [...actionInstances].sort((a, b) => {
      const oa = parseInt(a.querySelector("order")?.textContent?.trim() ?? "0") || 0;
      const ob = parseInt(b.querySelector("order")?.textContent?.trim() ?? "0") || 0;
      return oa - ob;
    });

    enrichedSteps = sorted.map((ai, idx) => {
      const sysId = ai.querySelector("sys_id")?.textContent?.trim() ?? "";
      const label =
        ai.querySelector("label")?.textContent?.trim() ||
        ai.querySelector("name")?.textContent?.trim() || "";
      const atEl = ai.querySelector("action_type_definition");
      const actionType = atEl?.getAttribute("display_value") || atEl?.textContent?.trim() || "";

      // Merge with label_cache step for its outputs/inputs data
      const lcStep =
        existingSteps.find((s) => s.label === label) ||
        existingSteps.find((s) => s.action === label) ||
        existingSteps[idx];

      const params = varsByUuid.get(sysId);
      return {
        ...(lcStep ?? {}),
        order: idx + 1,
        label: label || actionType || `Step ${idx + 1}`,
        type: "action",
        table: "sys_hub_action_instance",
        sys_id: sysId,
        action: actionType || label,
        uuid: sysId,
        branch_type: detectBranchType(label || actionType),
        params: params && params.length > 0 ? params : (lcStep?.params ?? undefined),
      };
    });
  } else {
    // No action instances found — keep existing steps, enrich with params where possible
    enrichedSteps = existingSteps.map((step) => {
      const uuid = step.uuid as string | undefined;
      const params = uuid ? varsByUuid.get(uuid) : undefined;
      return params && params.length > 0 ? { ...step, params } : step;
    });
  }

  return {
    enrichedSteps,
    debug: {
      tables_found,
      record_counts,
      branch_structure_found: hasBranchTables,
      branch_note,
      fields_per_table,
    },
  };
}

function mapUpdateXmlToComponent(el: Element): ParsedComponent | null {
  const name = getDirectChildText(el, "name");
  const typeLabel = getDirectChildText(el, "type");
  const targetName = getDirectChildText(el, "target_name");
  const action = getDirectChildText(el, "action");
  const payloadText = getDirectChildText(el, "payload");

  if (!name && !typeLabel) return null;

  const xmlTag = xmlTagFromUpdateName(name);
  // Fall back to the xmlTag (table name) instead of "unknown" for unmapped types
  const devType = UPDATE_TYPE_TO_DEV_TYPE[typeLabel.toLowerCase()] ?? xmlTag;
  const title = targetName || name;

  let config: Record<string, unknown> = {
    sn_type: typeLabel || undefined,
    action: action || undefined,
    update_name: name || undefined,
  };
  let targetTable: string | null = null;

  if (payloadText) {
    try {
      const innerParser = new DOMParser();
      const innerDoc = innerParser.parseFromString(payloadText, "application/xml");
      if (!innerDoc.querySelector("parsererror")) {
        const recordUpdate = innerDoc.querySelector("record_update");
        if (recordUpdate) {
          const recordEl = recordUpdate.children[0];
          if (recordEl) {
            const extracted = extractConfigFromXmlNode(recordEl, devType);
            config = { ...config, ...extracted };
            switch (devType) {
              case "business_rule":
              case "notification":
                targetTable = (extracted.table as string) || null;
                break;
              case "client_script":
              case "ui_action":
              case "ui_policy":
              case "acl":
              case "flow":
                targetTable = (extracted.table as string) || null;
                break;
            }

            // sys_hub_action_type_definition: the JS script lives in a sibling
            // sys_variable_value in the same payload <record_update>, not as a
            // direct child of the action element itself.
            if (xmlTag === "sys_hub_action_type_definition") {
              const scriptText = extractActionDefinitionScript(recordUpdate);
              if (scriptText) config.script = scriptText;
            }

            // sys_hub_flow: extract full flow structure (trigger, inputs, stages,
            // steps) for the FlowPreview component.
            if (xmlTag === "sys_hub_flow") {
              const preview = extractFlowPreview(recordUpdate);
              if (preview) config.flow_preview = preview;
            }
          }
        }
      }
    } catch {
      // Payload unparseable — keep basic config
    }
  }

  return {
    xmlTag,
    developmentType: devType,
    title,
    targetTable,
    config,
    rawXml: payloadText || el.outerHTML,
    selected: true,
  };
}

function mapDirectXmlNode(el: Element): ParsedComponent | null {
  const tagName = el.tagName.toLowerCase();

  // Skip XML infrastructure elements
  if (tagName === "parsererror" || tagName === "unload") return null;

  // Known type → use its mapped dev type; unknown → use the tag itself
  const devType = XML_TAG_TO_DEV_TYPE[tagName] ?? tagName;
  const config = extractConfigFromXmlNode(el, devType);

  const name =
    (config.name as string) ||
    el.getAttribute("sys_id") ||
    el.getAttribute("name") ||
    tagName;

  let targetTable: string | null = null;
  switch (devType) {
    case "business_rule":
    case "notification":
      targetTable = (config.table as string) || null;
      break;
    case "client_script":
    case "ui_action":
    case "ui_policy":
    case "acl":
    case "flow":
      targetTable = (config.table as string) || null;
      break;
  }

  return {
    xmlTag: tagName,
    developmentType: devType,
    title: name,
    targetTable,
    config,
    rawXml: el.outerHTML,
    selected: true,
  };
}

export async function parseServiceNowXml(xmlString: string, filename: string): Promise<XmlParseResult> {
  const errors: string[] = [];
  const components: ParsedComponent[] = [];

  if (!xmlString.trim()) {
    return { components, errors: ["Empty XML content"], rawXml: xmlString, filename };
  }

  let doc: Document;
  try {
    const parser = new DOMParser();
    doc = parser.parseFromString(xmlString, "application/xml");
    const parseError = doc.querySelector("parsererror");
    if (parseError) {
      return {
        components,
        errors: ["XML invalide : " + (parseError.textContent ?? "Parse error")],
        rawXml: xmlString,
        filename,
      };
    }
  } catch (err) {
    return {
      components,
      errors: ["Erreur lors du parsing XML : " + String(err)],
      rawXml: xmlString,
      filename,
    };
  }

  const rootTag = doc.documentElement?.tagName?.toLowerCase();

  // ── Update set format: <unload> root with <sys_update_xml> children ──────
  if (rootTag === "unload") {
    const updateXmls = doc.getElementsByTagName("sys_update_xml");
    if (updateXmls.length > 0) {
      const allRecords = new Map<string, Element[]>();
      for (let i = 0; i < updateXmls.length; i++) {
        const el = updateXmls[i];
        const comp = mapUpdateXmlToComponent(el);
        if (comp) components.push(comp);
        // Collect records from each payload for flow enrichment
        const payloadText = getDirectChildText(el, "payload");
        if (payloadText) collectPayloadRecords(payloadText, allRecords);
      }
      if (components.length === 0) {
        errors.push("Aucun composant ServiceNow reconnu dans ce fichier XML.");
      }
      // Enrich each flow component with records scoped to its sys_id.
      for (const flowComp of components.filter((c) => c.xmlTag === "sys_hub_flow" && c.config?.flow_preview)) {
        const fp = flowComp.config.flow_preview as Record<string, unknown>;
        const { enrichedSteps, debug } = await buildFlowEnrichment(allRecords, fp);
        if (enrichedSteps.length > 0) fp.steps = enrichedSteps;
        fp.debug = debug;
      }
      return { components, errors, rawXml: xmlString, filename };
    }
    // Fall through: <unload> root without sys_update_xml → direct record export
  }

  // ── Direct export format: scan all direct children of the root element ───
  const rootEl = doc.documentElement;
  for (let i = 0; i < rootEl.children.length; i++) {
    const comp = mapDirectXmlNode(rootEl.children[i]);
    if (comp) components.push(comp);
  }

  // ── sys_hub_action_type_definition (direct export): same script extraction
  // as the update-set path — delegate to the shared helper.
  if (
    rootTag === "record_update" &&
    rootEl.getAttribute("table") === "sys_hub_action_type_definition"
  ) {
    const actionDefComp = components.find(
      (c) => c.xmlTag === "sys_hub_action_type_definition"
    );
    if (actionDefComp) {
      const scriptText = extractActionDefinitionScript(rootEl);
      if (scriptText) actionDefComp.config.script = scriptText;
    }
  }

  // ── sys_hub_flow (direct export): extract full flow preview structure.
  // rootEl is either <record_update table="sys_hub_flow"> or <unload> — both
  // have sys_hub_flow and its siblings as descendants, so querySelector works.
  const flowComp = components.find((c) => c.xmlTag === "sys_hub_flow");
  if (flowComp) {
    const preview = extractFlowPreview(rootEl);
    if (preview) {
      const allRecords = collectRecordsFromDirectExport(rootEl);
      const { enrichedSteps, debug } = await buildFlowEnrichment(allRecords, preview);
      if (enrichedSteps.length > 0) preview.steps = enrichedSteps;
      preview.debug = debug;
      flowComp.config.flow_preview = preview;
    }
  }

  if (components.length === 0) {
    errors.push("Aucun composant ServiceNow reconnu dans ce fichier XML.");
  }

  return { components, errors, rawXml: xmlString, filename };
}
