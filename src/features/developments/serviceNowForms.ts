import snapshot from "./serviceNowSchema.json";

export interface SnField {
  name: string; label: string; internalType: string;
  mandatory?: boolean; readOnly?: boolean; reference?: string; dependent?: string; maxLength?: number;
  choices?: { value: string; label: string; dependentValue?: string }[];
}
export const SN_SCHEMAS: Record<string, SnField[]> = snapshot;
export const ADDITIONAL_TYPES = [
  ["scripted_rest_operation", "Scripted REST Resource", "sys_ws_operation"],
  ["catalog_client_script", "Catalog Client Script", "catalog_script_client"],
  ["catalog_ui_policy", "Catalog UI Policy", "catalog_ui_policy"],
  ["ui_policy_action", "UI Policy Action", "sys_ui_policy_action"],
  ["catalog_ui_policy_action", "Catalog UI Policy Action", "catalog_ui_policy_action"],
  ["ui_page", "UI Page", "sys_ui_page"], ["ui_macro", "UI Macro", "sys_ui_macro"],
  ["email_script", "Email Script", "sys_script_email"],
  ["transform_script", "Transform Script", "sys_transform_script"],
  ["rest_message", "REST Message", "sys_rest_message"],
  ["rest_method", "REST Message HTTP Method", "sys_rest_message_fn"],
  ["catalog_variable", "Catalog Variable", "item_option_new"],
  ["variable_set", "Variable Set", "item_option_new_set"],
  ["data_policy", "Data Policy", "sys_data_policy2"],
  ["data_policy_rule", "Data Policy Rule", "sys_data_policy_rule"],
  ["event_registry", "Event Registration", "sysevent_register"],
] as const;

// Previous versions used these aliases. Keep them in stored config, but edit the
// dictionary key. No bulk rewrite is needed and imported/custom keys survive.
export const SN_LEGACY_ALIASES: Record<string, Record<string, string>> = {
  sys_script: { collection: "table", action_insert: "insert", action_update: "update", action_delete: "delete", action_query: "query" },
  sys_script_client: { field: "field_name" },
  sys_ui_policy: { short_description: "name", conditions: "condition" },
  sp_widget: { template: "htmlTemplate", client_script: "clientScript", script: "serverScript" },
  sysevent_email_action: { collection: "table", template: "template_sys_id" },
  sys_properties: { private: "is_private" },
  sys_ws_definition: { name: "api_name", base_uri: "base_path" },
};
export function normalizeSnConfig(table: string, source: Record<string, unknown>) {
  const result = { ...source };
  for (const [key, alias] of Object.entries(SN_LEGACY_ALIASES[table] ?? {})) {
    if (result[key] === undefined && source[alias] !== undefined) result[key] = source[alias];
  }
  // Historical BR condition was the encoded filter, not advanced JavaScript.
  if (table === "sys_script" && source._snFormVersion !== 2 && source.filter_condition === undefined) {
    result.filter_condition = source.condition ?? "";
    result.condition = "";
  }
  return result;
}
export function updateSnConfig(table: string, source: Record<string, unknown>, key: string, value: unknown) {
  const result = { ...normalizeSnConfig(table, source), [key]: value, _snFormVersion: 2 };
  const alias = SN_LEGACY_ALIASES[table]?.[key];
  if (alias) result[alias] = value;
  return result;
}
export function snBoolean(value: unknown) { return value === true || value === "true" || value === 1 || value === "1"; }

export const PRIMARY_FIELDS: Record<string, string[]> = {
  sys_script: ["name", "collection", "active", "advanced", "when", "order", "action_insert", "action_update", "action_delete", "action_query", "filter_condition", "condition", "script", "add_message", "message", "abort_action", "template", "role_conditions"],
  sys_script_include: ["name", "api_name", "active", "client_callable", "access", "caller_access", "description", "script"],
  sys_script_client: ["name", "table", "active", "ui_type", "type", "field", "global", "view", "applies_extended", "isolate_script", "description", "messages", "script"],
  sys_ui_action: ["name", "table", "action_name", "active", "order", "client", "form_button", "form_link", "form_context_menu", "list_button", "list_banner_button", "list_link", "list_context_menu", "show_insert", "show_update", "onclick", "condition", "script", "form_button_v2", "form_menu_button_v2", "client_script_v2"],
  sys_ui_policy: ["short_description", "table", "active", "order", "conditions", "on_load", "reverse_if_false", "global", "view", "inherit", "run_scripts", "ui_type", "script_true", "script_false"],
  sys_security_acl: ["name", "type", "operation", "active", "advanced", "admin_overrides", "description", "condition", "script"],
  sysauto_script: ["name", "active", "run_type", "run_time", "run_dayofweek", "run_dayofmonth", "run_start", "run_period", "run_as", "conditional", "condition", "script"],
  sp_widget: ["name", "id", "description", "public", "roles", "template", "css", "client_script", "script", "link", "option_schema"],
  sys_transform_map: ["name", "source_table", "target_table", "active", "order", "run_business_rules", "enforce_mandatory_fields", "copy_empty_fields", "run_script", "script"],
  sys_ws_operation: ["name", "web_service_definition", "http_method", "relative_path", "requires_authentication", "requires_acl_authorization", "operation_script"],
};

// Deliberately only the dependencies confirmed for the core forms. Hidden fields
// stay in config; changing a toggle never deletes archived code.
export function isSnFieldVisible(table: string, key: string, config: Record<string, unknown>) {
  if (table === "sys_script") {
    if (["condition", "script"].includes(key)) return config.advanced === undefined || snBoolean(config.advanced);
    if (key === "message") return snBoolean(config.add_message);
  }
  if (table === "sys_script_client" && key === "field") return ["onChange", "onCellEdit"].includes(String(config.type));
  if (table === "sys_ui_policy" && ["script_true", "script_false", "ui_type"].includes(key)) return snBoolean(config.run_scripts);
  if (["sys_script_client", "sys_ui_policy"].includes(table) && key === "view") return !snBoolean(config.global);
  if (table === "sys_ui_action" && key === "onclick") return snBoolean(config.client);
  return true;
}
