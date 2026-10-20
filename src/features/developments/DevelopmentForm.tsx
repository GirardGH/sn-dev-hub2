"use client";
import { CopyToSpace } from "@/features/spaces/CopyToSpace";
import { useT } from "@/i18n/LanguageProvider";

import { DevelopmentAttachments } from "@/features/attachments/DevelopmentAttachments";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { RecordForm, FormSection } from "@/components/servicenow/RecordForm";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  createDevelopment,
  updateDevelopment,
  deleteDevelopment,
} from "./development.actions";
import {
  developmentSchema,
  type DevelopmentFormValues,
  type Development,
  DEVELOPMENT_STATUSES,
} from "./development.types";
import {
  DEVELOPMENT_TYPE_OPTIONS,
  DEVELOPMENT_TYPE_MAP,
  getDevTypeConfig,
} from "./developmentTypes";
import { ServiceNowFields } from "./fields/ServiceNowFields";
import { SN_SCHEMAS, SN_LEGACY_ALIASES } from "./serviceNowForms";
import { GenericScriptFields } from "./fields/GenericScriptFields";
import { GenericConfigFields } from "./fields/GenericConfigFields";
import { NotificationConfigFields } from "./fields/NotificationConfigFields";
import { FlowPreview, type FlowPreviewData } from "./fields/FlowPreview";
import { CodeEditor } from "@/components/servicenow/CodeEditor";
import { resolveSnLabel } from "@/features/xml/snTableRegistry";
import type { Client } from "@/features/clients/client.types";
import type { Story } from "@/features/stories/story.types";

const STATUS_OPTIONS = DEVELOPMENT_STATUSES.map((s) => ({
  value: s,
  label: s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
}));

type DevWithRelations = Development & {
  stories?: Story | null;
  clients?: Client | null;
};

interface Props {
  development?: DevWithRelations;
  client?: Client;
  story?: Story;
  clientId?: string;
  storyId?: string;
  allClients?: Client[];
  allStories?: Story[];
}

export function DevelopmentFormClient({ development, client, story, clientId, storyId, allClients, allStories }: Props) {
  const t = useT();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pickedClientId, setPickedClientId] = useState(clientId ?? development?.client_id ?? client?.id ?? "");
  const [pickedStoryId, setPickedStoryId] = useState(storyId ?? development?.story_id ?? story?.id ?? "");
  const isNew = !development;

  const resolvedClientId = pickedClientId || (clientId ?? development?.client_id ?? client?.id ?? "");
  const resolvedStoryId = pickedStoryId || (storyId ?? development?.story_id ?? story?.id ?? "");
  const pickedClient = allClients?.find((c) => c.id === pickedClientId);
  const pickedStory = allStories?.find((s) => s.id === pickedStoryId);
  const clientName = pickedClient?.name ?? client?.name ?? development?.clients?.name ?? "";
  const storyTitle = pickedStory?.title ?? story?.title ?? development?.stories?.title ?? "";
  const filteredStories = allStories?.filter((s) => s.client_id === pickedClientId) ?? [];

  const defaultDevType = development?.development_type ?? "business_rule";
  const [selectedType, setSelectedType] = useState(defaultDevType);
  const [config, setConfig] = useState<Record<string, unknown>>(
    (development?.config as Record<string, unknown>) ??
      getDevTypeConfig(defaultDevType)?.defaultConfig ??
      {}
  );

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<DevelopmentFormValues>({
    resolver: zodResolver(developmentSchema),
    defaultValues: {
      story_id: resolvedStoryId,
      client_id: resolvedClientId,
      title: development?.title ?? "",
      development_type: defaultDevType,
      target_table: development?.target_table ?? "",
      application_scope: development?.application_scope ?? "",
      update_set: development?.update_set ?? "",
      short_description: development?.short_description ?? "",
      technical_notes: development?.technical_notes ?? "",
      status: development?.status ?? "draft",
      config: (development?.config as Record<string, unknown>) ?? {},
    },
  });

  const configDrafts = useRef<Record<string, Record<string, unknown>>>({});

  function handleTypeChange(type: string) {
    configDrafts.current[selectedType] = config;
    setSelectedType(type);
    setValue("development_type", type);
    const defaultConfig = configDrafts.current[type] ?? structuredClone(getDevTypeConfig(type)?.defaultConfig ?? {});
    setConfig(defaultConfig);
    setValue("config", defaultConfig);
  }

  function handleConfigChange(newConfig: Record<string, unknown>) {
    const table = getDevTypeConfig(selectedType)?.snTable ?? selectedType;
    const synced = { ...newConfig };
    for (const [canonical, alias] of Object.entries(SN_LEGACY_ALIASES[table] ?? {})) {
      if (alias in newConfig && newConfig[alias] !== config[alias] && newConfig[canonical] === config[canonical]) {
        synced[canonical] = newConfig[alias];
      }
    }
    setConfig(synced);
    setValue("config", synced);
  }

  function onInvalid(errs: Record<string, unknown>) {
    const firstMsg = Object.values(errs).find(
      (e): e is { message: string } => typeof e === "object" && e !== null && "message" in e
    );
    toast.error(firstMsg?.message ? t(firstMsg.message) : t("Formulaire invalide — vérifiez les champs."));
  }

  async function onSubmit(values: DevelopmentFormValues) {
    setSaving(true);
    try {
      const payload = { ...values, config };
      if (isNew) {
        const created = await createDevelopment(payload);
        toast.success(t("Development créé !"));
        router.push(
          `/clients/${resolvedClientId}/stories/${resolvedStoryId}/developments/${created.id}`
        );
      } else {
        await updateDevelopment(development.id, payload);
        toast.success(t("Development sauvegardé !"));
        router.refresh();
      }
    } catch (err) {
      toast.error(t("Erreur : ") + String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteDevelopment(development!.id, resolvedStoryId, resolvedClientId);
      toast.success(t("Development supprimé."));
      router.push(`/clients/${resolvedClientId}/stories/${resolvedStoryId}`);
    } catch (err) {
      toast.error(t("Erreur : ") + String(err));
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  function renderTypeFields() {
    const snTable = getDevTypeConfig(selectedType)?.snTable ?? selectedType;
    if (SN_SCHEMAS[snTable] && selectedType !== "notification") {
      return <ServiceNowFields key={selectedType} table={snTable} config={config} onChange={handleConfigChange} />;
    }
    if (!getDevTypeConfig(selectedType)) {
      return <GenericConfigFields config={config} onChange={handleConfigChange} />;
    }
    switch (selectedType) {
      case "notification":
        return <><NotificationConfigFields config={config} onChange={handleConfigChange} /><details className="mb-4 border border-sn-border"><summary className="p-3 cursor-pointer text-sm">{t("Tous les champs du dictionnaire ServiceNow")}</summary><ServiceNowFields table="sysevent_email_action" config={config} onChange={handleConfigChange} /></details></>;
      case "flow":
        return (
          <>
            {config.flow_preview && (
              <FlowPreview data={config.flow_preview as FlowPreviewData} />
            )}
            <GenericScriptFields config={config} onChange={handleConfigChange} devType="flow" />
          </>
        );
      default:
        return <GenericScriptFields config={config} onChange={handleConfigChange} devType={selectedType} />;
    }
  }

  const isKnownDevType = getDevTypeConfig(selectedType) !== null;
  const typeLabel =
    DEVELOPMENT_TYPE_MAP[selectedType as keyof typeof DEVELOPMENT_TYPE_MAP]?.label ??
    resolveSnLabel(selectedType);

  return (
    <DevelopmentAttachments developmentId={development?.id}>
      {({ header, strip, busy }) => <>
      <RecordForm
        headerActions={<>{header}{!isNew && <CopyToSpace kind="development" id={development.id} />}</>}
        attachmentStrip={strip}
        wide
        title={isNew ? `${t("New")} · ${t(typeLabel)}` : development.title}
        subtitle={`${storyTitle}${clientName ? ` · ${clientName}` : ""}`}
        status={!isNew ? development.status : undefined}
        breadcrumbs={[
          { label: t("Clients"), href: "/clients" },
          { label: clientName, href: `/clients/${resolvedClientId}` },
          { label: storyTitle, href: `/clients/${resolvedClientId}/stories/${resolvedStoryId}` },
          { label: isNew ? t("New Development") : development.title },
        ]}
        onSave={busy ? undefined : handleSubmit(onSubmit, onInvalid)}
        onDelete={!isNew && !busy ? () => setConfirmDelete(true) : undefined}
        saving={saving}
        deleting={deleting}
        isNew={isNew}
        createdAt={development?.created_at}
        updatedAt={development?.updated_at}
        backHref={resolvedClientId && resolvedStoryId ? `/clients/${resolvedClientId}/stories/${resolvedStoryId}` : "/developments"}
      >
        {/* Common fields */}
        <FormSection title={t("General")}>
          {allClients && (
            <Select
              label={t("Client *")}
              options={[
                { value: "", label: t("— Select a client —") },
                ...allClients.map((c) => ({ value: c.id, label: c.name + (c.code ? ` (${c.code})` : "") })),
              ]}
              value={pickedClientId}
              onChange={(e) => {
                setPickedClientId(e.target.value);
                setPickedStoryId("");
                setValue("client_id", e.target.value);
                setValue("story_id", "");
              }}
            />
          )}
          {allStories && (
            <Select
              label={t("Story *")}
              options={[
                { value: "", label: pickedClientId ? "— Select a story —" : "— Select a client first —" },
                ...filteredStories.map((s) => ({ value: s.id, label: s.reference ? `${s.reference} – ${s.title}` : s.title })),
              ]}
              value={pickedStoryId}
              onChange={(e) => {
                setPickedStoryId(e.target.value);
                setValue("story_id", e.target.value);
              }}
              disabled={!pickedClientId}
            />
          )}
          <Input
            label={t("Title *")}
            error={errors.title?.message}
            {...register("title")}
          />
          <Select
            label={t("Type *")}
            options={[
              // For XML-imported components whose type isn't in DEVELOPMENT_TYPE_MAP:
              // show their detected type as a labelled first option so the form stays
              // consistent. The user can reassign to a known type if they want.
              ...(!isKnownDevType
                ? [{ value: selectedType, label: `${resolveSnLabel(selectedType)} — non mappé` }]
                : []),
              ...DEVELOPMENT_TYPE_OPTIONS.map(option => ({ ...option, label: t(option.label) })),
            ]}
            value={selectedType}
            onChange={(e) => handleTypeChange(e.target.value)}
          />
          <Input
            label={t("Target Table")}
            placeholder={t("incident")}
            {...register("target_table")}
          />
          <Select
            label={t("Status")}
            options={STATUS_OPTIONS.map(option => ({ ...option, label: t(option.label) }))}
            {...register("status")}
          />
          <Input
            label={t("Application Scope")}
            placeholder={t("global")}
            {...register("application_scope")}
          />
          <Input
            label={t("Update Set")}
            placeholder={t("Default")}
            {...register("update_set")}
          />
        </FormSection>

        <FormSection title={t("Description")} columns={1}>
          <Textarea
            label={t("Short Description")}
            {...register("short_description")}
          />
          <Textarea
            label={t("Technical Notes")}
            {...register("technical_notes")}
            className="min-h-[100px]"
          />
        </FormSection>

        {/* Dynamic type-specific fields */}
        {renderTypeFields()}

        {/* Raw XML source — shown for XML-imported developments */}
        {!isNew && development?.raw_xml && (
          <FormSection title={t("Raw XML Source")} columns={1}>
            <CodeEditor
              value={development.raw_xml}
              onChange={() => {}}
              language="xml"
              height="300px"
              readOnly
            />
          </FormSection>
        )}
      </RecordForm>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title={t("Delete development")}
        message={t('Delete "{name}"?', { name: development?.title ?? "" })}
      />
    </>}
    </DevelopmentAttachments>
  );
}
