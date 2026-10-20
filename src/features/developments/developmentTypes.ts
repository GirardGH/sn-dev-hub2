import { ADDITIONAL_TYPES } from "./serviceNowForms";
export const DEVELOPMENT_TYPES = [
  "business_rule",
  "script_include",
  "client_script",
  "ui_action",
  "ui_policy",
  "ui_script",
  "system_property",
  "system_property_category",
  "category_property",
  "acl",
  "scheduled_job",
  "notification",
  "flow",
  "fix_script",
  "ui_message",
  "scripted_rest_api",
  "transform_map",
  "data_source",
  "background_script",
  "widget",
  "record_producer",
  "catalog_item",
  ...ADDITIONAL_TYPES.map(([value]) => value),
] as const;

export type DevelopmentTypeName = (typeof DEVELOPMENT_TYPES)[number];

export interface DevelopmentTypeConfig {
  value: DevelopmentTypeName;
  label: string;
  snTable: string;
  defaultConfig: Record<string, unknown>;
}

export const DEVELOPMENT_TYPE_MAP: Record<DevelopmentTypeName, DevelopmentTypeConfig> = {
  ...Object.fromEntries(ADDITIONAL_TYPES.map(([value, label, snTable]) => [value, { value, label, snTable, defaultConfig: {} }])) as Record<(typeof ADDITIONAL_TYPES)[number][0], DevelopmentTypeConfig>,
  business_rule: {
    value: "business_rule",
    label: "Business Rule",
    snTable: "sys_script",
    defaultConfig: {
      name: "", table: "", when: "before", insert: false, update: false,
      delete: false, query: false, advanced: true, filter_condition: "", condition: "", _snFormVersion: 2, script: "", active: true, order: 100,
    },
  },
  script_include: {
    value: "script_include",
    label: "Script Include",
    snTable: "sys_script_include",
    defaultConfig: {
      name: "", api_name: "", client_callable: false, active: true, description: "", script: "",
    },
  },
  client_script: {
    value: "client_script",
    label: "Client Script",
    snTable: "sys_script_client",
    defaultConfig: {
      name: "", table: "", type: "onLoad", field_name: "", condition: "", script: "", active: true,
    },
  },
  ui_action: {
    value: "ui_action",
    label: "UI Action",
    snTable: "sys_ui_action",
    defaultConfig: {
      name: "", table: "", action_name: "", form_button: false, form_link: false,
      list_button: false, condition: "", script: "", active: true, order: 100,
    },
  },
  ui_policy: {
    value: "ui_policy",
    label: "UI Policy",
    snTable: "sys_ui_policy",
    defaultConfig: {
      name: "", table: "", condition: "", reverse_if_false: true, on_load: true,
      active: true, actions: [],
    },
  },
  ui_script: {
    value: "ui_script",
    label: "UI Script",
    snTable: "sys_ui_script",
    defaultConfig: {
      name: "", description: "", script: "", active: true, global: true,
    },
  },
  system_property: {
    value: "system_property",
    label: "System Property",
    snTable: "sys_properties",
    defaultConfig: {
      name: "", type: "string", value: "", description: "", is_private: false,
    },
  },
  system_property_category: {
    value: "system_property_category",
    label: "System Property Category",
    snTable: "sys_properties_category",
    defaultConfig: {
      name: "", title: "", owner: "",
    },
  },
  category_property: {
    value: "category_property",
    label: "Category Property",
    snTable: "sys_properties_category_m2m",
    defaultConfig: {
      name: "", category: "", property: "", order: 100,
    },
  },
  acl: {
    value: "acl",
    label: "ACL",
    snTable: "sys_security_acl",
    defaultConfig: {
      name: "", operation: "read", type: "record", table: "", field: "",
      roles: [], condition: "", script: "", active: true,
    },
  },
  scheduled_job: {
    value: "scheduled_job",
    label: "Scheduled Job",
    snTable: "sysauto_script",
    defaultConfig: {
      name: "", run_type: "daily", script: "", active: true,
    },
  },
  notification: {
    value: "notification",
    label: "Notification",
    snTable: "sysevent_email_action",
    defaultConfig: {
      // Identity
      name: "", table: "", type: "email", active: true, description: "",
      order: 100, weight: 0, category: "",
      // When to send
      generation_type: "event", event_name: "", condition: "",
      advanced_condition: "", action_insert: false, action_update: true,
      affected_field_on_event: "",
      // Who will receive
      item: "", item_table: "", recipient_users: "", recipient_groups: "",
      recipient_fields: "", event_parm_1: false, event_parm_2: false,
      send_self: false, exclude_delegates: false, subscribable: false,
      // What it will contain
      content_type: "text/html", template_name: "", template_sys_id: "",
      subject: "", message_html: "", message_text: "", importance: "",
      from: "", reply_to: "", sms_alternate: "",
      // Delivery
      omit_watermark: false, include_attachments: false,
      push_message_only: false, force_delivery: false,
      enable_dynamic_translation: false, mandatory: false, digestable: false,
    },
  },
  flow: {
    value: "flow",
    label: "Flow",
    snTable: "sys_hub_flow",
    defaultConfig: {
      name: "", trigger_type: "", table: "", description: "", steps: [],
    },
  },
  scripted_rest_api: {
    value: "scripted_rest_api",
    label: "Scripted REST API",
    snTable: "sys_ws_definition",
    defaultConfig: {
      api_name: "", base_path: "", operations: [],
    },
  },
  transform_map: {
    value: "transform_map",
    label: "Transform Map",
    snTable: "sys_transform_map",
    defaultConfig: {
      name: "", source_table: "", target_table: "", run_business_rules: true,
      enforce_mandatory_fields: true, active: true,
    },
  },
  data_source: {
    value: "data_source",
    label: "Data Source",
    snTable: "sys_data_source",
    defaultConfig: {
      name: "", type: "File", format: "CSV", import_set_table_label: "", active: true,
    },
  },
  fix_script: {
    value: "fix_script",
    label: "Fix Script",
    snTable: "sys_script_fix",
    defaultConfig: {
      name: "", description: "", script: "", unloadable: true, active: true,
    },
  },
  ui_message: {
    value: "ui_message",
    label: "Message",
    snTable: "sys_ui_message",
    defaultConfig: {
      key: "", language: "", message: "",
    },
  },
  background_script: {
    value: "background_script",
    label: "Background Script",
    snTable: "",
    defaultConfig: {
      name: "", script: "", description: "",
    },
  },
  widget: {
    value: "widget",
    label: "Widget (Service Portal)",
    snTable: "sp_widget",
    defaultConfig: {
      name: "", id: "", description: "",
      htmlTemplate: "", css: "", clientScript: "", serverScript: "",
      active: true,
    },
  },
  record_producer: {
    value: "record_producer",
    label: "Record Producer",
    snTable: "sc_cat_item_producer",
    defaultConfig: {
      name: "", table: "", short_description: "", variables: [], script: "", active: true,
    },
  },
  catalog_item: {
    value: "catalog_item",
    label: "Catalog Item",
    snTable: "sc_cat_item",
    defaultConfig: {
      name: "", short_description: "", category: "", variables: [],
      workflow: "", flow: "", active: true,
    },
  },
};

export function getDevTypeConfig(type: string): DevelopmentTypeConfig | null {
  return DEVELOPMENT_TYPE_MAP[type as DevelopmentTypeName] ?? null;
}

export const DEVELOPMENT_TYPE_OPTIONS = DEVELOPMENT_TYPES.map((t) => ({
  value: t,
  label: DEVELOPMENT_TYPE_MAP[t].label,
}));
