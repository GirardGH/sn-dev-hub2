/**
 * Extensible registry of ServiceNow table names → human-readable labels.
 *
 * Keys: lowercase ServiceNow table names (as they appear in XML exports / xmlTag field).
 * Add entries here as SN Dev Hub progressively covers more development types.
 *
 * Lookup order in the app:
 *   1. DEVELOPMENT_TYPE_MAP   — fully supported types (create / edit / detail page)
 *   2. SN_TABLE_REGISTRY      — detected but not yet fully supported
 *   3. Raw tag / type string  — completely unknown
 */
export interface SnTableEntry {
  label: string;
  category: SnTableCategory;
}

export type SnTableCategory =
  | "server_scripting"
  | "client_scripting"
  | "automation"
  | "integration"
  | "catalog"
  | "portal"
  | "ui"
  | "schema"
  | "navigation"
  | "security"
  | "workflow"
  | "testing"
  | "communication"
  | "reporting"
  | "configuration"
  | "system";

export const SN_TABLE_REGISTRY: Record<string, SnTableEntry> = {
  // ── Already fully supported (mirrors DEVELOPMENT_TYPE_MAP) ────────────────
  sys_script:                    { label: "Business Rule",               category: "server_scripting" },
  sys_script_include:            { label: "Script Include",              category: "server_scripting" },
  sys_script_client:             { label: "Client Script",               category: "client_scripting" },
  sys_ui_action:                 { label: "UI Action",                   category: "client_scripting" },
  sys_ui_policy:                 { label: "UI Policy",                   category: "client_scripting" },
  sys_ui_script:                 { label: "UI Script",                   category: "client_scripting" },
  sys_properties:                { label: "System Property",             category: "configuration" },
  sys_properties_category:       { label: "System Property Category",    category: "configuration" },
  sys_properties_category_m2m:   { label: "Category Property",           category: "configuration" },
  sys_security_acl:              { label: "ACL",                         category: "security" },
  sysauto_script:                { label: "Scheduled Job",               category: "automation" },
  sysevent_email_action:         { label: "Notification",                category: "communication" },
  sys_hub_flow:                  { label: "Flow (Flow Designer)",        category: "automation" },
  sys_script_fix:                { label: "Fix Script",                  category: "server_scripting" },
  sys_ws_definition:             { label: "Scripted REST API",           category: "integration" },
  sys_ws_operation:              { label: "Scripted REST Operation",     category: "integration" },
  sys_transform_map:             { label: "Transform Map",               category: "integration" },
  sys_data_source:               { label: "Data Source",                 category: "integration" },
  sp_widget:                     { label: "Service Portal Widget",       category: "portal" },
  sc_cat_item:                   { label: "Catalog Item",                category: "catalog" },
  sc_cat_item_producer:          { label: "Record Producer",             category: "catalog" },
  sys_ui_message:                { label: "UI Message",                  category: "ui" },

  // ── Navigation & Applications ─────────────────────────────────────────────
  sys_app_module:                { label: "Application Module",          category: "navigation" },
  sys_app_application:           { label: "Application Menu",            category: "navigation" },
  sys_app_category:              { label: "Application Category",        category: "navigation" },
  sys_app_separator:             { label: "Module Separator",            category: "navigation" },
  sys_portal_preferences:        { label: "Portal Preferences",          category: "navigation" },

  // ── Schema & Dictionary ───────────────────────────────────────────────────
  sys_dictionary:                { label: "Dictionary Entry",            category: "schema" },
  sys_db_object:                 { label: "Table Definition",            category: "schema" },
  sys_documentation:             { label: "Field Label",                 category: "schema" },
  sys_choice:                    { label: "Choice List Entry",           category: "schema" },
  sys_glide_object:              { label: "Field Type",                  category: "schema" },
  sys_index:                     { label: "Table Index",                 category: "schema" },
  sys_relationship:              { label: "Table Relationship",          category: "schema" },
  sys_number:                    { label: "Number Sequence",             category: "schema" },

  // ── UI ────────────────────────────────────────────────────────────────────
  sys_ui_page:                   { label: "UI Page",                     category: "ui" },
  sys_ui_macro:                  { label: "UI Macro",                    category: "ui" },
  sys_ui_form:                   { label: "Form Layout",                 category: "ui" },
  sys_ui_section:                { label: "Form Section",                category: "ui" },
  sys_ui_element:                { label: "Form Element",                category: "ui" },
  sys_ui_list:                   { label: "List Layout",                 category: "ui" },
  sys_ui_list_control:           { label: "List Control",                category: "ui" },
  sys_ui_list_element:           { label: "List Element",                category: "ui" },
  sys_ui_related_list:           { label: "Related List",                category: "ui" },
  sys_ui_view:                   { label: "View",                        category: "ui" },
  sys_ui_context_menu:           { label: "Context Menu",                category: "ui" },
  sys_ui_policy_action:          { label: "UI Policy Action",            category: "ui" },
  sys_ui_override:               { label: "UI Override",                 category: "ui" },

  // ── Catalog ───────────────────────────────────────────────────────────────
  item_option_new:               { label: "Catalog Variable",            category: "catalog" },
  item_option_new_set:           { label: "Variable Set",                category: "catalog" },
  sc_cat_item_category:          { label: "Catalog Category",            category: "catalog" },
  sc_cat_item_option:            { label: "Catalog Item Option",         category: "catalog" },
  sc_cat_item_option_mtom:       { label: "Catalog Item Option (M2M)",   category: "catalog" },
  sc_cat_item_user_criteria_mtom:{ label: "Catalog Access Criteria",     category: "catalog" },
  sc_category:                   { label: "Service Catalog Category",    category: "catalog" },
  sc_cat_item_delivery_plan:     { label: "Execution Plan",              category: "catalog" },
  sc_cat_item_delivery_task:     { label: "Delivery Task",               category: "catalog" },

  // ── Workflow ──────────────────────────────────────────────────────────────
  wf_workflow:                   { label: "Workflow",                    category: "workflow" },
  wf_workflow_version:           { label: "Workflow Version",            category: "workflow" },
  wf_activity:                   { label: "Workflow Activity",           category: "workflow" },
  wf_activity_definition:        { label: "Workflow Activity Definition",category: "workflow" },
  wf_transition:                 { label: "Workflow Transition",         category: "workflow" },
  wf_context:                    { label: "Workflow Context",            category: "workflow" },

  // ── Flow Designer (beyond sys_hub_flow) ──────────────────────────────────
  sys_hub_action_type_definition:{ label: "Action Definition",           category: "automation" },
  sys_hub_trigger_type:          { label: "Trigger Type",                category: "automation" },
  sys_hub_subflow:               { label: "Subflow",                     category: "automation" },
  sys_hub_action_input:          { label: "Action Input",                category: "automation" },
  sys_hub_action_output:         { label: "Action Output",               category: "automation" },

  // ── IntegrationHub ────────────────────────────────────────────────────────
  sys_spoke_operation:           { label: "Spoke Operation",             category: "integration" },
  sys_spoke:                     { label: "Spoke",                       category: "integration" },
  sn_keystore_alias:             { label: "Connection Alias",            category: "integration" },
  sys_alias:                     { label: "System Alias",                category: "integration" },
  sys_hub_corr_conn_int:         { label: "Connection & Credential",     category: "integration" },

  // ── REST / SOAP / OAuth ───────────────────────────────────────────────────
  rest_message:                  { label: "REST Message",                category: "integration" },
  rest_message_fn:               { label: "REST Message Function",       category: "integration" },
  soap_message:                  { label: "SOAP Message",                category: "integration" },
  soap_message_function:         { label: "SOAP Message Function",       category: "integration" },
  sys_web_service_definition:    { label: "Web Service Definition",      category: "integration" },
  sys_oauth_application:         { label: "OAuth Application",           category: "integration" },
  sys_auth_profile:              { label: "Auth Profile",                category: "integration" },
  sys_ws_resource:               { label: "Scripted REST Resource",      category: "integration" },

  // ── ATF ───────────────────────────────────────────────────────────────────
  sys_atf_test:                  { label: "ATF Test",                    category: "testing" },
  sys_atf_suite:                 { label: "ATF Test Suite",              category: "testing" },
  sys_atf_suite_test:            { label: "ATF Suite Test",              category: "testing" },
  sys_atf_step:                  { label: "ATF Test Step",               category: "testing" },
  sys_atf_step_config:           { label: "ATF Step Config",             category: "testing" },
  sys_atf_agent:                 { label: "ATF Agent",                   category: "testing" },
  sys_atf_profile:               { label: "ATF Profile",                 category: "testing" },

  // ── Data Policies ─────────────────────────────────────────────────────────
  sys_data_policy2:              { label: "Data Policy",                 category: "security" },
  sys_data_policy_rule:          { label: "Data Policy Rule",            category: "security" },

  // ── Roles & Users ────────────────────────────────────────────────────────
  sys_user_role:                 { label: "Role",                        category: "security" },
  sys_user_group:                { label: "Group",                       category: "security" },
  sys_user_has_role:             { label: "User Role Assignment",        category: "security" },
  sys_group_has_role:            { label: "Group Role Assignment",       category: "security" },

  // ── Service Portal ────────────────────────────────────────────────────────
  sp_portal:                     { label: "Service Portal",              category: "portal" },
  sp_page:                       { label: "Portal Page",                 category: "portal" },
  sp_container:                  { label: "Portal Container",            category: "portal" },
  sp_column:                     { label: "Portal Column",               category: "portal" },
  sp_instance:                   { label: "Widget Instance",             category: "portal" },
  sp_header_footer:              { label: "Portal Header/Footer",        category: "portal" },
  sp_theme:                      { label: "Portal Theme",                category: "portal" },
  sp_css_include:                { label: "CSS Include",                 category: "portal" },
  sp_js_include:                 { label: "JS Include",                  category: "portal" },
  sp_angular_provider:           { label: "Angular Provider",            category: "portal" },

  // ── Email & Notifications ────────────────────────────────────────────────
  sysevent_email_style:          { label: "Email Layout",                category: "communication" },
  sysevent_email_template:       { label: "Email Template",              category: "communication" },
  sysevent_register:             { label: "Event Registration",          category: "communication" },

  // ── Reporting & Performance Analytics ────────────────────────────────────
  sys_report:                    { label: "Report",                      category: "reporting" },
  sys_report_source:             { label: "Report Data Source",          category: "reporting" },
  sys_gauge:                     { label: "Gauge",                       category: "reporting" },
  pa_job:                        { label: "PA Collection Job",           category: "reporting" },
  pa_scorecard:                  { label: "PA Scorecard",                category: "reporting" },
  pa_indicator:                  { label: "PA Indicator",                category: "reporting" },
  pa_indicator_source:           { label: "PA Indicator Source",         category: "reporting" },
  pa_break:                      { label: "PA Breakdown",                category: "reporting" },

  // ── System / Misc ─────────────────────────────────────────────────────────
  sys_extension_point:           { label: "Extension Point",             category: "system" },
  sys_scope:                     { label: "Application Scope",           category: "system" },
  sys_package:                   { label: "Package",                     category: "system" },
  sys_update_set:                { label: "Update Set",                  category: "system" },
  sys_update_version:            { label: "Update Version",              category: "system" },
  sys_remote_update_set:         { label: "Remote Update Set",           category: "system" },
  sys_language:                  { label: "Language",                    category: "system" },
  sys_translated_content:        { label: "Translated Content",          category: "system" },
  sys_translated_page:           { label: "Translated Page",             category: "system" },
};

/**
 * Resolve a ServiceNow table name to a human-readable label.
 * Falls back to the raw table name if not in the registry.
 */
export function resolveSnLabel(tableOrTag: string): string {
  return SN_TABLE_REGISTRY[tableOrTag]?.label ?? tableOrTag;
}

/**
 * Check whether a table is in the registry (detected but not yet fully supported).
 */
export function isKnownSnTable(tableOrTag: string): boolean {
  return tableOrTag in SN_TABLE_REGISTRY;
}
