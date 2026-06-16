"use client";

import { useState } from "react";
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
import { BusinessRuleFields } from "./fields/BusinessRuleFields";
import { ScriptIncludeFields } from "./fields/ScriptIncludeFields";
import { GenericScriptFields } from "./fields/GenericScriptFields";
import { GenericConfigFields } from "./fields/GenericConfigFields";
import { WidgetFields } from "./fields/WidgetFields";
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

  function handleTypeChange(type: string) {
    setSelectedType(type);
    setValue("development_type", type);
    const defaultConfig = getDevTypeConfig(type)?.defaultConfig ?? {};
    setConfig(defaultConfig);
    setValue("config", defaultConfig);
    const snTable = getDevTypeConfig(type)?.snTable ?? "";
    setValue("target_table", snTable);
  }

  function handleConfigChange(newConfig: Record<string, unknown>) {
    setConfig(newConfig);
    setValue("config", newConfig);
  }

  function onInvalid(errs: Record<string, unknown>) {
    const firstMsg = Object.values(errs).find(
      (e): e is { message: string } => typeof e === "object" && e !== null && "message" in e
    );
    toast.error(firstMsg?.message ?? "Formulaire invalide — vérifiez les champs.");
  }

  async function onSubmit(values: DevelopmentFormValues) {
    setSaving(true);
    try {
      const payload = { ...values, config };
      if (isNew) {
        const created = await createDevelopment(payload);
        toast.success("Development créé !");
        router.push(
          `/clients/${resolvedClientId}/stories/${resolvedStoryId}/developments/${created.id}`
        );
      } else {
        await updateDevelopment(development.id, payload);
        toast.success("Development sauvegardé !");
        router.refresh();
      }
    } catch (err) {
      toast.error("Erreur : " + String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteDevelopment(development!.id, resolvedStoryId, resolvedClientId);
      toast.success("Development supprimé.");
      router.push(`/clients/${resolvedClientId}/stories/${resolvedStoryId}`);
    } catch (err) {
      toast.error("Erreur : " + String(err));
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  function renderTypeFields() {
    // Types not in DEVELOPMENT_TYPE_MAP use the fully dynamic generic form
    if (!getDevTypeConfig(selectedType)) {
      return <GenericConfigFields config={config} onChange={handleConfigChange} />;
    }
    switch (selectedType) {
      case "business_rule":
        return <BusinessRuleFields config={config} onChange={handleConfigChange} />;
      case "script_include":
        return <ScriptIncludeFields config={config} onChange={handleConfigChange} />;
      case "widget":
        return <WidgetFields config={config} onChange={handleConfigChange} />;
      default:
        return <GenericScriptFields config={config} onChange={handleConfigChange} devType={selectedType} />;
    }
  }

  const isKnownDevType = getDevTypeConfig(selectedType) !== null;
  const typeLabel =
    DEVELOPMENT_TYPE_MAP[selectedType as keyof typeof DEVELOPMENT_TYPE_MAP]?.label ??
    resolveSnLabel(selectedType);

  return (
    <>
      <RecordForm
        wide
        title={isNew ? `New ${typeLabel}` : development.title}
        subtitle={`${storyTitle}${clientName ? ` · ${clientName}` : ""}`}
        status={!isNew ? development.status : undefined}
        breadcrumbs={[
          { label: "Clients", href: "/clients" },
          { label: clientName, href: `/clients/${resolvedClientId}` },
          { label: storyTitle, href: `/clients/${resolvedClientId}/stories/${resolvedStoryId}` },
          { label: isNew ? "New Development" : development.title },
        ]}
        onSave={handleSubmit(onSubmit, onInvalid)}
        onDelete={!isNew ? () => setConfirmDelete(true) : undefined}
        saving={saving}
        deleting={deleting}
        isNew={isNew}
        createdAt={development?.created_at}
        updatedAt={development?.updated_at}
        backHref={resolvedClientId && resolvedStoryId ? `/clients/${resolvedClientId}/stories/${resolvedStoryId}` : "/developments"}
      >
        {/* Common fields */}
        <FormSection title="General">
          {allClients && (
            <Select
              label="Client *"
              options={[
                { value: "", label: "— Select a client —" },
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
              label="Story *"
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
            label="Title *"
            error={errors.title?.message}
            {...register("title")}
          />
          <Select
            label="Type *"
            options={[
              // For XML-imported components whose type isn't in DEVELOPMENT_TYPE_MAP:
              // show their detected type as a labelled first option so the form stays
              // consistent. The user can reassign to a known type if they want.
              ...(!isKnownDevType
                ? [{ value: selectedType, label: `${resolveSnLabel(selectedType)} — non mappé` }]
                : []),
              ...DEVELOPMENT_TYPE_OPTIONS,
            ]}
            value={selectedType}
            onChange={(e) => handleTypeChange(e.target.value)}
          />
          <Input
            label="Target Table"
            placeholder="incident"
            {...register("target_table")}
          />
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            {...register("status")}
          />
          <Input
            label="Application Scope"
            placeholder="global"
            {...register("application_scope")}
          />
          <Input
            label="Update Set"
            placeholder="Default"
            {...register("update_set")}
          />
        </FormSection>

        <FormSection title="Description" columns={1}>
          <Textarea
            label="Short Description"
            {...register("short_description")}
          />
          <Textarea
            label="Technical Notes"
            {...register("technical_notes")}
            className="min-h-[100px]"
          />
        </FormSection>

        {/* Dynamic type-specific fields */}
        {renderTypeFields()}

        {/* Raw XML source — shown for XML-imported developments */}
        {!isNew && development?.raw_xml && (
          <FormSection title="Raw XML Source" columns={1}>
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
        title="Delete development"
        message={`Delete "${development?.title}"?`}
      />
    </>
  );
}
