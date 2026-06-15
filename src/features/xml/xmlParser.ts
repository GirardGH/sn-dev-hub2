import type { ParsedComponent, XmlParseResult } from "./xml.types";

// XML tag → dev type (direct export / flat format)
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
};

function getTextContent(el: Element, tagName: string): string {
  return el.querySelector(tagName)?.textContent?.trim() ?? "";
}

// Only look at immediate children to avoid diving into nested elements (e.g. payload)
function getDirectChildText(parent: Element, tagName: string): string {
  const lower = tagName.toLowerCase();
  for (let i = 0; i < parent.children.length; i++) {
    if (parent.children[i].tagName.toLowerCase() === lower) {
      return parent.children[i].textContent?.trim() ?? "";
    }
  }
  return "";
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

    case "notification":
      config.name = getTextContent(el, "name");
      config.table = getTextContent(el, "collection");
      config.when_to_send = getTextContent(el, "when_to_send");
      config.condition = getTextContent(el, "condition");
      config.subject = getTextContent(el, "subject");
      config.active = getTextContent(el, "active") !== "false";
      break;

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
      config.name = getTextContent(el, "name") || getTextContent(el, "sys_name");
      break;
  }

  return config;
}

// Derive the XML table name from the update_name field (strip trailing _<32hexchars>)
function xmlTagFromUpdateName(name: string): string {
  return name.replace(/_[a-f0-9]{32}$/i, "") || name;
}

// Map a <sys_update_xml> element to a ParsedComponent
function mapUpdateXmlToComponent(el: Element): ParsedComponent | null {
  const name = getDirectChildText(el, "name");
  const typeLabel = getDirectChildText(el, "type");
  const targetName = getDirectChildText(el, "target_name");
  const action = getDirectChildText(el, "action");
  const payloadText = getDirectChildText(el, "payload");

  if (!name && !typeLabel) return null;

  const xmlTag = xmlTagFromUpdateName(name);
  const devType = UPDATE_TYPE_TO_DEV_TYPE[typeLabel.toLowerCase()] ?? "unknown";
  const title = targetName || name;

  let config: Record<string, unknown> = {
    sn_type: typeLabel || undefined,
    action: action || undefined,
    update_name: name || undefined,
  };
  let targetTable: string | null = null;

  // Try to parse the payload XML to extract detailed config fields
  if (payloadText) {
    try {
      const innerParser = new DOMParser();
      const innerDoc = innerParser.parseFromString(payloadText, "application/xml");
      if (!innerDoc.querySelector("parsererror")) {
        const recordUpdate = innerDoc.querySelector("record_update");
        if (recordUpdate) {
          // First child element of <record_update> is the actual record
          const recordEl = recordUpdate.children[0];
          if (recordEl) {
            const extracted = extractConfigFromXmlNode(recordEl, devType);
            config = { ...config, ...extracted };
            // Derive target table for types that are table-scoped
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
          }
        }
      }
    } catch {
      // Payload could not be parsed, keep basic config
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

// ── Direct / flat export format helpers ──────────────────────────────────────

function detectServiceNowComponents(doc: Document): Element[] {
  const results: Element[] = [];
  for (const tag of Object.keys(XML_TAG_TO_DEV_TYPE)) {
    const elements = doc.getElementsByTagName(tag);
    for (let i = 0; i < elements.length; i++) {
      results.push(elements[i]);
    }
  }
  return results;
}

function mapXmlNodeToDevelopment(el: Element): ParsedComponent | null {
  const tagName = el.tagName.toLowerCase();
  const devType = XML_TAG_TO_DEV_TYPE[tagName];
  if (!devType) return null;

  const config = extractConfigFromXmlNode(el, devType);
  const name = (config.name as string) || el.getAttribute("sys_id") || "Unnamed";
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

// ── Public entry point ────────────────────────────────────────────────────────

export function parseServiceNowXml(xmlString: string, filename: string): XmlParseResult {
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

  // ── Update set format: <unload> root with <sys_update_xml> entries ──
  if (rootTag === "unload") {
    const updateXmls = doc.getElementsByTagName("sys_update_xml");
    for (let i = 0; i < updateXmls.length; i++) {
      const comp = mapUpdateXmlToComponent(updateXmls[i]);
      if (comp) components.push(comp);
    }
    if (components.length === 0) {
      errors.push("Aucun composant ServiceNow reconnu dans ce fichier XML.");
    }
    return { components, errors, rawXml: xmlString, filename };
  }

  // ── Direct export format: known tags appear at document level ──
  const elements = detectServiceNowComponents(doc);
  if (elements.length === 0) {
    errors.push("Aucun composant ServiceNow reconnu dans ce fichier XML.");
  }
  for (const el of elements) {
    const component = mapXmlNodeToDevelopment(el);
    if (component) {
      components.push(component);
    } else {
      errors.push(`Tag non mappé : ${el.tagName}`);
    }
  }

  return { components, errors, rawXml: xmlString, filename };
}
