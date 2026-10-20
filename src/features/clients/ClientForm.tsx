"use client";
import { CopyToSpace } from "@/features/spaces/CopyToSpace";
import { useT } from "@/i18n/LanguageProvider";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { RecordForm, FormSection } from "@/components/servicenow/RecordForm";
import { RelatedList, type RelatedColumn } from "@/components/servicenow/RelatedList";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import {
  createClient,
  updateClient,
  deleteClient,
} from "./client.actions";
import { deleteStories } from "@/features/stories/story.actions";
import {
  clientSchema,
  type ClientFormValues,
  type Client,
  CLIENT_STATUSES,
  CLIENT_ENVIRONMENTS,
} from "./client.types";
import type { Story } from "@/features/stories/story.types";

const STATUS_OPTIONS = CLIENT_STATUSES.map((s) => ({
  value: s,
  label: s.charAt(0).toUpperCase() + s.slice(1),
}));

const ENV_OPTIONS = [
  { value: "", label: "— None —" },
  ...CLIENT_ENVIRONMENTS.map((e) => ({ value: e, label: e.charAt(0).toUpperCase() + e.slice(1) })),
];

const storyColumns: RelatedColumn<Story>[] = [
  { key: "reference", label: "Reference", visible: true },
  { key: "title", label: "Title", visible: true, render: (r) => <span className="text-sn-accent font-medium">{r.title}</span> },
  { key: "status", label: "Status", visible: true, render: (r) => <StatusBadge status={r.status} /> },
  { key: "priority", label: "Priority", visible: true },
  { key: "estimated_uo", label: "UO", visible: true },
  { key: "created_at", label: "Created", visible: true, render: (r) => formatDate(r.created_at) },
];

interface Props {
  client?: Client;
  stories?: Story[];
}

export function ClientFormClient({ client, stories = [] }: Props) {
  const t = useT();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isNew = !client;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: client?.name ?? "",
      code: client?.code ?? "",
      description: client?.description ?? "",
      instance_url: client?.instance_url ?? "",
      environment: client?.environment ?? "",
      status: client?.status ?? "active",
    },
  });

  async function onSubmit(values: ClientFormValues) {
    setSaving(true);
    try {
      if (isNew) {
        const created = await createClient(values);
        toast.success(t("Client créé !"));
        router.push(`/clients/${created.id}`);
      } else {
        await updateClient(client.id, values);
        toast.success(t("Client sauvegardé !"));
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
      await deleteClient(client!.id);
      toast.success(t("Client supprimé."));
      router.push("/clients");
    } catch (err) {
      toast.error(t("Erreur : ") + String(err));
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <>
      <RecordForm
        headerActions={!isNew && <CopyToSpace kind="client" id={client.id} />}
        wide
        title={isNew ? t("New Client") : client.name}
        subtitle={!isNew ? client.code ?? undefined : undefined}
        status={!isNew ? client.status : undefined}
        breadcrumbs={[{ label: t("Clients"), href: "/clients" }, { label: isNew ? t("New") : client.name }]}
        onSave={handleSubmit(onSubmit)}
        onDelete={!isNew ? () => setConfirmDelete(true) : undefined}
        saving={saving}
        deleting={deleting}
        isNew={isNew}
        createdAt={client?.created_at}
        updatedAt={client?.updated_at}
        backHref="/clients"
        relatedLists={
          !isNew ? (
            <RelatedList
        copyKind="story"
              title={t("Stories")}
              data={stories}
              columns={storyColumns}
              onRowClick={(row) => router.push(`/clients/${client.id}/stories/${row.id}`)}
              onNew={() => router.push(`/clients/${client.id}/stories/new`)}
              onRefresh={() => router.refresh()}
              emptyMessage={t("No stories yet.")}
              onDeleteSelected={async (ids) => {
                await deleteStories(ids, client.id);
                toast.success(t("{count} stories deleted.", { count: ids.length }));
                router.refresh();
              }}
            />
          ) : undefined
        }
      >
        <FormSection title={t("General Information")}>
          <Input
            label={t("Name *")}
            placeholder={t("Orange Business")}
            error={errors.name?.message}
            {...register("name")}
          />
          <Input
            label={t("Code")}
            placeholder={t("OBS")}
            {...register("code")}
          />
        </FormSection>

        <FormSection title={t("Instance Details")}>
          <Input
            label={t("Instance URL")}
            type="url"
            placeholder={t("https://instance.service-now.com")}
            error={errors.instance_url?.message}
            {...register("instance_url")}
          />
          <Select
            label={t("Environment")}
            options={ENV_OPTIONS.map(option => ({ ...option, label: t(option.label) }))}
            {...register("environment")}
          />
          <Select
            label={t("Status")}
            options={STATUS_OPTIONS.map(option => ({ ...option, label: t(option.label) }))}
            {...register("status")}
          />
        </FormSection>

        <FormSection title={t("Description")} columns={1}>
          <Textarea
            label={t("Description")}
            placeholder={t("Client description...")}
            className="min-h-[100px]"
            {...register("description")}
          />
        </FormSection>
      </RecordForm>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title={t("Delete client")}
        message={t('Delete "{name}"? All associated stories and developments will also be deleted.', { name: client?.name ?? "" })}
      />
    </>
  );
}
