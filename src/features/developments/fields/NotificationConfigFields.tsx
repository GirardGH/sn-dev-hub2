"use client";
import { useT } from "@/i18n/LanguageProvider";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { Textarea } from "@/components/ui/Textarea";
import { CodeEditor } from "@/components/servicenow/CodeEditor";
import { FormSection } from "@/components/servicenow/RecordForm";

const GENERATION_TYPE_OPTIONS = [
  { value: "event", label: "Event is fired" },
  { value: "record_insert", label: "Record inserted" },
  { value: "record_update", label: "Record updated" },
  { value: "record_change", label: "Record change" },
  { value: "manually", label: "Manually" },
];

const CONTENT_TYPE_OPTIONS = [
  { value: "text/html", label: "HTML only" },
  { value: "text/plain", label: "Text only" },
  { value: "text/both", label: "HTML and Text" },
];

const NOTIFICATION_TYPE_OPTIONS = [
  { value: "email", label: "EMAIL" },
  { value: "sms", label: "SMS" },
  { value: "meet", label: "Meeting" },
];

interface Props {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  readOnly?: boolean;
}

export function NotificationConfigFields({ config, onChange, readOnly }: Props) {
  const t = useT();
  function update(key: string, value: unknown) {
    onChange({ ...config, [key]: value });
  }

  const generationType = (config.generation_type as string) ?? "event";

  return (
    <>
      {/* ── General ────────────────────────────────────────────────────────── */}
      <FormSection title={t("Notification Configuration")}>
        <Select
          label={t("Type")}
          options={NOTIFICATION_TYPE_OPTIONS.map(option => ({ ...option, label: t(option.label) }))}
          value={(config.type as string) ?? "email"}
          onChange={(e) => update("type", e.target.value)}
          disabled={readOnly}
        />
        <Input
          label={t("Category")}
          value={(config.category as string) ?? ""}
          onChange={(e) => update("category", e.target.value)}
          placeholder={t("Uncategorized")}
          disabled={readOnly}
        />
        <Input
          label={t("Order")}
          type="number"
          value={String((config.order as number) ?? 100)}
          onChange={(e) => update("order", parseInt(e.target.value) || 100)}
          disabled={readOnly}
        />
        <Input
          label={t("Weight")}
          type="number"
          value={String((config.weight as number) ?? 0)}
          onChange={(e) => update("weight", parseInt(e.target.value) || 0)}
          disabled={readOnly}
        />
      </FormSection>

      <FormSection title={t("Status")} columns={1}>
        <div className="flex flex-wrap gap-4">
          <Checkbox
            label={t("Active")}
            checked={(config.active as boolean) ?? true}
            onChange={(e) => update("active", e.target.checked)}
            disabled={readOnly}
          />
          <Checkbox
            label={t("Allow Digest")}
            checked={(config.digestable as boolean) ?? false}
            onChange={(e) => update("digestable", e.target.checked)}
            disabled={readOnly}
          />
        </div>
        <Textarea
          label={t("Description")}
          value={(config.description as string) ?? ""}
          onChange={(e) => update("description", e.target.value)}
          disabled={readOnly}
        />
      </FormSection>

      {/* ── When to send ───────────────────────────────────────────────────── */}
      <FormSection title={t("When to Send")}>
        <Select
          label={t("Send When")}
          options={GENERATION_TYPE_OPTIONS.map(option => ({ ...option, label: t(option.label) }))}
          value={generationType}
          onChange={(e) => update("generation_type", e.target.value)}
          disabled={readOnly}
        />
        {generationType === "event" ? (
          <Input
            label={t("Event Name")}
            value={(config.event_name as string) ?? ""}
            onChange={(e) => update("event_name", e.target.value)}
            placeholder={t("ritm.comment.to.assigned")}
            disabled={readOnly}
          />
        ) : (
          <Input
            label={t("Affected Field on Event")}
            value={(config.affected_field_on_event as string) ?? ""}
            onChange={(e) => update("affected_field_on_event", e.target.value)}
            disabled={readOnly}
          />
        )}
      </FormSection>

      <FormSection title={t("Trigger Actions")} columns={1}>
        <div className="flex flex-wrap gap-4 mb-2">
          <Checkbox
            label={t("Insert")}
            checked={(config.action_insert as boolean) ?? false}
            onChange={(e) => update("action_insert", e.target.checked)}
            disabled={readOnly}
          />
          <Checkbox
            label={t("Update")}
            checked={(config.action_update as boolean) ?? true}
            onChange={(e) => update("action_update", e.target.checked)}
            disabled={readOnly}
          />
        </div>
        <CodeEditor
          label={t("Condition")}
          value={(config.condition as string) ?? ""}
          onChange={(v) => update("condition", v)}
          language="javascript"
          height="120px"
          readOnly={readOnly}
        />
        <CodeEditor
          label={t("Advanced Condition")}
          value={(config.advanced_condition as string) ?? ""}
          onChange={(v) => update("advanced_condition", v)}
          language="javascript"
          height="200px"
          readOnly={readOnly}
        />
      </FormSection>

      {/* ── Who will receive ───────────────────────────────────────────────── */}
      <FormSection title={t("Who Will Receive")}>
        <Input
          label={t("Users/Groups in Fields")}
          value={(config.item as string) ?? ""}
          onChange={(e) => update("item", e.target.value)}
          placeholder={t("event.parm1")}
          disabled={readOnly}
        />
        <Input
          label={t("Item Table")}
          value={(config.item_table as string) ?? ""}
          onChange={(e) => update("item_table", e.target.value)}
          disabled={readOnly}
        />
        <Input
          label={t("Recipient Users")}
          value={(config.recipient_users as string) ?? ""}
          onChange={(e) => update("recipient_users", e.target.value)}
          disabled={readOnly}
        />
        <Input
          label={t("Recipient Groups")}
          value={(config.recipient_groups as string) ?? ""}
          onChange={(e) => update("recipient_groups", e.target.value)}
          disabled={readOnly}
        />
      </FormSection>

      <FormSection title={t("Recipient Options")} columns={1}>
        <div className="flex flex-wrap gap-4">
          <Checkbox
            label={t("Event parm 1 contains recipient")}
            checked={(config.event_parm_1 as boolean) ?? false}
            onChange={(e) => update("event_parm_1", e.target.checked)}
            disabled={readOnly}
          />
          <Checkbox
            label={t("Send to event creator")}
            checked={(config.send_self as boolean) ?? false}
            onChange={(e) => update("send_self", e.target.checked)}
            disabled={readOnly}
          />
          <Checkbox
            label={t("Event parm 2 contains recipient")}
            checked={(config.event_parm_2 as boolean) ?? false}
            onChange={(e) => update("event_parm_2", e.target.checked)}
            disabled={readOnly}
          />
          <Checkbox
            label={t("Exclude Delegates")}
            checked={(config.exclude_delegates as boolean) ?? false}
            onChange={(e) => update("exclude_delegates", e.target.checked)}
            disabled={readOnly}
          />
          <Checkbox
            label={t("Subscribable")}
            checked={(config.subscribable as boolean) ?? false}
            onChange={(e) => update("subscribable", e.target.checked)}
            disabled={readOnly}
          />
        </div>
      </FormSection>

      {/* ── What it will contain ───────────────────────────────────────────── */}
      <FormSection title={t("What It Will Contain")}>
        <Select
          label={t("Content Type")}
          options={CONTENT_TYPE_OPTIONS.map(option => ({ ...option, label: t(option.label) }))}
          value={(config.content_type as string) ?? "text/html"}
          onChange={(e) => update("content_type", e.target.value)}
          disabled={readOnly}
        />
        <Input
          label={t("Email Template")}
          value={(config.template_name as string) ?? ""}
          onChange={(e) => update("template_name", e.target.value)}
          placeholder={t("requested item template")}
          disabled={readOnly}
        />
        <Input
          label={t("Subject")}
          value={(config.subject as string) ?? ""}
          onChange={(e) => update("subject", e.target.value)}
          placeholder="A comment is sent to you, about the request ${number}"
          disabled={readOnly}
        />
        <Input
          label={t("From")}
          value={(config.from as string) ?? ""}
          onChange={(e) => update("from", e.target.value)}
          disabled={readOnly}
        />
        <Input
          label={t("Reply To")}
          value={(config.reply_to as string) ?? ""}
          onChange={(e) => update("reply_to", e.target.value)}
          disabled={readOnly}
        />
      </FormSection>

      <FormSection title={t("Message HTML")} columns={1}>
        <CodeEditor
          label={t("Message HTML")}
          value={(config.message_html as string) ?? ""}
          onChange={(v) => update("message_html", v)}
          language="html"
          height="400px"
          readOnly={readOnly}
        />
        {(config.message_text as string) && (
          <Textarea
            label={t("Message Text (alternate)")}
            value={(config.message_text as string) ?? ""}
            onChange={(e) => update("message_text", e.target.value)}
            className="min-h-[100px] font-mono text-xs"
            disabled={readOnly}
          />
        )}
        {(config.sms_alternate as string) && (
          <Textarea
            label={t("SMS Alternate")}
            value={(config.sms_alternate as string) ?? ""}
            onChange={(e) => update("sms_alternate", e.target.value)}
            className="min-h-[80px]"
            disabled={readOnly}
          />
        )}
      </FormSection>

      <FormSection title={t("Delivery Options")} columns={1}>
        <div className="flex flex-wrap gap-4">
          <Checkbox
            label={t("Omit Watermark")}
            checked={(config.omit_watermark as boolean) ?? false}
            onChange={(e) => update("omit_watermark", e.target.checked)}
            disabled={readOnly}
          />
          <Checkbox
            label={t("Include Attachments")}
            checked={(config.include_attachments as boolean) ?? false}
            onChange={(e) => update("include_attachments", e.target.checked)}
            disabled={readOnly}
          />
          <Checkbox
            label={t("Push Message Only")}
            checked={(config.push_message_only as boolean) ?? false}
            onChange={(e) => update("push_message_only", e.target.checked)}
            disabled={readOnly}
          />
          <Checkbox
            label={t("Force Delivery")}
            checked={(config.force_delivery as boolean) ?? false}
            onChange={(e) => update("force_delivery", e.target.checked)}
            disabled={readOnly}
          />
          <Checkbox
            label={t("Enable Dynamic Translation")}
            checked={(config.enable_dynamic_translation as boolean) ?? false}
            onChange={(e) => update("enable_dynamic_translation", e.target.checked)}
            disabled={readOnly}
          />
          <Checkbox
            label={t("Mandatory")}
            checked={(config.mandatory as boolean) ?? false}
            onChange={(e) => update("mandatory", e.target.checked)}
            disabled={readOnly}
          />
        </div>
      </FormSection>
    </>
  );
}
