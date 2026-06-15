const LANG_MAP: Record<string, string> = {
  business_rule: "javascript",
  script_include: "javascript",
  client_script: "javascript",
  ui_action: "javascript",
  ui_policy: "javascript",
  ui_script: "javascript",
  acl: "javascript",
  scheduled_job: "javascript",
  fix_script: "javascript",
  background_script: "javascript",
  scripted_rest_api: "javascript",
  transform_map: "javascript",
  record_producer: "javascript",
  notification: "html",
  widget: "html",
  flow: "json",
  data_source: "json",
  catalog_item: "json",
  system_property: "plaintext",
  system_property_category: "plaintext",
  category_property: "plaintext",
  ui_message: "plaintext",
};

export function getEditorLanguage(devType: string): string {
  return LANG_MAP[devType] ?? "plaintext";
}
