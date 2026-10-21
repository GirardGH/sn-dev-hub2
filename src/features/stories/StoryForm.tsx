"use client";
import { ArchiveExplorer } from "@/features/archive/ArchiveExplorer";
import { CopyToSpace } from "@/features/spaces/CopyToSpace";
import { useT } from "@/i18n/LanguageProvider";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { FileCode2 } from "lucide-react";
import { RecordForm, FormSection } from "@/components/servicenow/RecordForm";
import { RelatedList, type RelatedColumn } from "@/components/servicenow/RelatedList";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import { createStory, updateStory, deleteStory } from "./story.actions";
import { deleteDevelopments } from "@/features/developments/development.actions";
import { storySchema, type StoryFormValues, type Story, STORY_STATUSES, STORY_PRIORITIES } from "./story.types";
import type { Client } from "@/features/clients/client.types";
import type { Development } from "@/features/developments/development.types";
import { DEVELOPMENT_TYPE_MAP } from "@/features/developments/developmentTypes";
import { resolveSnLabel } from "@/features/xml/snTableRegistry";

const STATUS_OPTIONS = STORY_STATUSES.map((s) => ({
  value: s,
  label: s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
}));

const PRIORITY_OPTIONS = [
  { value: "", label: "— None —" },
  ...STORY_PRIORITIES.map((p) => ({
    value: p,
    label: p.charAt(0).toUpperCase() + p.slice(1),
  })),
];

const devColumns: RelatedColumn<Development>[] = [
  { key: "title", label: "Title", visible: true, render: (r) => <span className="text-sn-accent font-medium">{r.title}</span> },
  { key: "development_type", label: "Type", visible: true, render: (r) => DEVELOPMENT_TYPE_MAP[r.development_type as keyof typeof DEVELOPMENT_TYPE_MAP]?.label ?? resolveSnLabel(r.development_type) },
  { key: "target_table", label: "Table", visible: true },
  { key: "status", label: "Status", visible: true, render: (r) => <StatusBadge status={r.status} /> },
  { key: "update_set", label: "Update Set", visible: true },
  { key: "created_at", label: "Created", visible: true, render: (r) => formatDate(r.created_at) },
];

interface Props {
  story?: Story & { clients?: Client | null };
  developments?: Development[];
  clientId?: string;
  client?: Client;
  allClients?: Client[];
}

export function StoryFormClient({ story, developments = [], clientId, client, allClients }: Props) {
  const t = useT();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pickedClientId, setPickedClientId] = useState(clientId ?? story?.client_id ?? client?.id ?? "");
  const isNew = !story;
  const resolvedClientId = pickedClientId || (clientId ?? story?.client_id ?? client?.id ?? "");
  const pickedClient = allClients?.find((c) => c.id === pickedClientId);
  const clientName = pickedClient?.name ?? client?.name ?? story?.clients?.name ?? "";
  const clientCode = pickedClient?.code ?? client?.code ?? story?.clients?.code ?? null;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<StoryFormValues>({
    resolver: zodResolver(storySchema),
    defaultValues: {
      client_id: resolvedClientId,
      reference: story?.reference ?? "",
      title: story?.title ?? "",
      description: story?.description ?? "",
      functional_need: story?.functional_need ?? "",
      technical_solution: story?.technical_solution ?? "",
      status: story?.status ?? "draft",
      priority: story?.priority ?? "",
      estimated_uo: story?.estimated_uo ?? undefined,
    },
  });

  function onInvalid(errs: Record<string, unknown>) {
    const firstMsg = Object.values(errs).find(
      (e): e is { message: string } => typeof e === "object" && e !== null && "message" in e
    );
    toast.error(firstMsg?.message ? t(firstMsg.message) : t("Formulaire invalide — vérifiez les champs."));
  }

  async function onSubmit(values: StoryFormValues) {
    setSaving(true);
    try {
      if (isNew) {
        const created = await createStory({ ...values, client_id: resolvedClientId });
        toast.success(t("Story créée !"));
        router.push(`/clients/${resolvedClientId}/stories/${created.id}`);
      } else {
        await updateStory(story.id, values);
        toast.success(t("Story sauvegardée !"));
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
      await deleteStory(story!.id, resolvedClientId);
      toast.success(t("Story supprimée."));
      router.push(`/clients/${resolvedClientId}`);
    } catch (err) {
      toast.error(t("Erreur : ") + String(err));
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const devRelatedList = !isNew ? (
    <>
    <ArchiveExplorer records={developments} />
    <RelatedList
        copyKind="development"
      title={t("Developments")}
      data={developments}
      columns={devColumns}
      onRowClick={(row) =>
        router.push(`/clients/${resolvedClientId}/stories/${story!.id}/developments/${row.id}`)
      }
      onNew={() =>
        router.push(`/clients/${resolvedClientId}/stories/${story!.id}/developments/new`)
      }
      onRefresh={() => router.refresh()}
      emptyMessage={t("No developments yet.")}
      onDeleteSelected={async (ids) => {
        await deleteDevelopments(ids, story!.id, resolvedClientId);
        toast.success(t("{count} developments deleted.", { count: ids.length }));
        router.refresh();
      }}
      extraActions={
        <Button
          variant="secondary"
          size="sm"
          icon={<FileCode2 className="w-3.5 h-3.5" />}
          onClick={() =>
            router.push(
              `/xml-imports/new?storyId=${story!.id}&clientId=${resolvedClientId}`
            )
          }
        >
          {t("Import XML")}</Button>
      }
    />
    </>
  ) : undefined;

  return (
    <>
      <RecordForm
        headerActions={!isNew && <CopyToSpace kind="story" id={story.id} />}
        wide
        title={isNew ? t("New Story") : story.title}
        subtitle={
          !isNew && story.reference
            ? story.reference
            : clientName
              ? `Client: ${clientName}${clientCode ? ` (${clientCode})` : ""}`
              : undefined
        }
        status={!isNew ? story.status : undefined}
        breadcrumbs={[
          { label: t("Clients"), href: "/clients" },
          { label: clientName || "Client", href: `/clients/${resolvedClientId}` },
          { label: t("Stories") },
          { label: isNew ? t("New") : (story.reference || story.title) },
        ]}
        onSave={handleSubmit(onSubmit, onInvalid)}
        onDelete={!isNew ? () => setConfirmDelete(true) : undefined}
        saving={saving}
        deleting={deleting}
        isNew={isNew}
        createdAt={story?.created_at}
        updatedAt={story?.updated_at}
        backHref={`/clients/${resolvedClientId}`}
        relatedLists={devRelatedList}
      >
        <FormSection title={t("Identification")}>
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
                setValue("client_id", e.target.value);
              }}
            />
          )}
          <Input
            label={t("Reference")}
            placeholder={t("STORY-001")}
            {...register("reference")}
          />
          <Input
            label={t("Title *")}
            placeholder={t("Gestion notifications ELS")}
            error={errors.title?.message}
            {...register("title")}
          />
        </FormSection>

        <FormSection title={t("Planning")}>
          <Select
            label={t("Status")}
            options={STATUS_OPTIONS.map(option => ({ ...option, label: t(option.label) }))}
            {...register("status")}
          />
          <Select
            label={t("Priority")}
            options={PRIORITY_OPTIONS.map(option => ({ ...option, label: t(option.label) }))}
            {...register("priority")}
          />
          <Input
            label={t("Estimated UO")}
            type="number"
            step="0.5"
            placeholder="0"
            {...register("estimated_uo", {
            setValueAs: (v: string) =>
              v === "" || v === null || v === undefined ? undefined : isNaN(Number(v)) ? undefined : Number(v),
          })}
          />
        </FormSection>

        <FormSection title={t("Description")} columns={1}>
          <Textarea
            label={t("Description")}
            placeholder={t("Story description...")}
            {...register("description")}
          />
          <Textarea
            label={t("Functional Need")}
            placeholder={t("What does the user need?")}
            {...register("functional_need")}
          />
          <Textarea
            label={t("Technical Solution")}
            placeholder={t("How will it be implemented?")}
            {...register("technical_solution")}
          />
        </FormSection>
      </RecordForm>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title={t("Delete story")}
        message={t('Delete "{name}"? All associated developments will also be deleted.', { name: story?.title ?? "" })}
      />
    </>
  );
}
