"use client";
import { UiText } from "@/i18n/UiText";
import { useT } from "@/i18n/LanguageProvider";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Code2 } from "lucide-react";
import { toast } from "sonner";
import { ServiceNowList, type ListColumn } from "@/components/servicenow/ServiceNowList";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import type { Development } from "./development.types";
import { DEVELOPMENT_TYPE_MAP, DEVELOPMENT_TYPE_OPTIONS } from "./developmentTypes";
import { resolveSnLabel } from "@/features/xml/snTableRegistry";
import type { FilterField } from "@/components/servicenow/FilterBuilder";
import { deleteDevelopments } from "./development.actions";

type DevelopmentWithRelations = Development & {
  stories?: { id: string; title: string } | null;
  clients?: { id: string; name: string } | null;
};

const filterFields: FilterField[] = [
  { key: "title", label: "Title" },
  { key: "development_type", label: "Type", type: "select", options: DEVELOPMENT_TYPE_OPTIONS },
  { key: "target_table", label: "Target Table" },
  { key: "update_set", label: "Update Set" },
  { key: "application_scope", label: "Scope" },
  { key: "status", label: "Status", type: "select", options: [
    { value: "draft", label: "Draft" },
    { value: "in_progress", label: "In Progress" },
    { value: "review", label: "Review" },
    { value: "done", label: "Done" },
    { value: "deployed", label: "Deployed" },
    { value: "cancelled", label: "Cancelled" },
  ]},
  { key: "created_at", label: "Created" },
];

const defaultColumns: ListColumn<DevelopmentWithRelations>[] = [
  { key: "title", label: "Title", visible: true, order: 1, render: (row) => (
    <span className="flex items-center gap-2">
      <Code2 className="w-3.5 h-3.5 text-sn-accent shrink-0" />
      <span className="font-medium text-sn-accent">{row.title}</span>
    </span>
  )},
  { key: "development_type", label: "Type", visible: true, order: 2, render: (row) =>
    <UiText text={DEVELOPMENT_TYPE_MAP[row.development_type as keyof typeof DEVELOPMENT_TYPE_MAP]?.label ?? resolveSnLabel(row.development_type)} />
  },
  { key: "target_table", label: "Table", visible: true, order: 3 },
  { key: "story", label: "Story", visible: true, order: 4, render: (row) =>
    row.stories ? <span className="text-sn-text-muted text-xs">{row.stories.title}</span> : "—"
  },
  { key: "client", label: "Client", visible: true, order: 5, render: (row) =>
    row.clients ? <span className="text-sn-text-muted text-xs">{row.clients.name}</span> : "—"
  },
  { key: "update_set", label: "Update Set", visible: false, order: 6 },
  { key: "application_scope", label: "Scope", visible: false, order: 7 },
  { key: "status", label: "Status", visible: true, order: 8, render: (row) => <StatusBadge status={row.status} /> },
  { key: "created_at", label: "Created", visible: true, order: 9, render: (row) => formatDate(row.created_at) },
];

interface Props {
  developments: DevelopmentWithRelations[];
}

export function DevelopmentListClient({ developments }: Props) {
  const t = useT();
  const router = useRouter();
  const clientOptions = useMemo(() => {
    const clients = new Map<string, string>();
    for (const development of developments) {
      const label = development.clients?.name;
      if (label) clients.set(label, label);
    }
    return Array.from(clients, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [developments]);
  const storyOptions = useMemo(() => {
    const stories = new Map<string, string>();
    for (const development of developments) {
      const label = development.stories?.title;
      if (label) stories.set(label, label);
    }
    return Array.from(stories, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [developments]);
  const developmentFilterFields = useMemo<FilterField[]>(() => [
    ...filterFields.slice(0, 3),
    { key: "story", label: t("Story"), type: "select", options: storyOptions, getValue: (row) => (row as DevelopmentWithRelations).stories?.title ?? "" },
    { key: "client", label: t("Client"), type: "select", options: clientOptions, getValue: (row) => (row as DevelopmentWithRelations).clients?.name ?? "" },
    ...filterFields.slice(3),
  ], [clientOptions, storyOptions, t]);

  async function handleDeleteSelected(ids: string[]) {
    await deleteDevelopments(ids);
    toast.success(t("{count} developments deleted.", { count: ids.length }));
    router.refresh();
  }

  function navigateToDev(row: DevelopmentWithRelations) {
    const clientId = row.client_id || row.clients?.id;
    const storyId = row.story_id || row.stories?.id;
    if (clientId && storyId) {
      router.push(`/clients/${clientId}/stories/${storyId}/developments/${row.id}`);
    }
  }

  return (
    <div className="workspace-list-page min-h-0 flex flex-col">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="workspace-page-title">{t("Developments")}</h1>
          <p className="text-xs text-sn-text-muted mt-0.5">{t("All ServiceNow developments")}</p>
        </div>
      </div>

      <ServiceNowList
        copyKind="development"
        className="flex-1"
        title={t("Developments")}
        data={developments}
        columns={defaultColumns}
        filterFields={developmentFilterFields}
        onRowClick={navigateToDev}
        onNew={() => router.push("/developments/new")}
        onRefresh={() => router.refresh()}
        onDeleteSelected={handleDeleteSelected}
        emptyMessage={t("No developments yet. Create a story and add developments from there.")}
      />
    </div>
  );
}
