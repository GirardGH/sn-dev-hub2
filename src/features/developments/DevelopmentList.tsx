"use client";

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
];

const defaultColumns: ListColumn<DevelopmentWithRelations>[] = [
  { key: "title", label: "Title", visible: true, order: 1, render: (row) => (
    <span className="flex items-center gap-2">
      <Code2 className="w-3.5 h-3.5 text-sn-accent flex-shrink-0" />
      <span className="font-medium text-sn-accent">{row.title}</span>
    </span>
  )},
  { key: "development_type", label: "Type", visible: true, order: 2, render: (row) =>
    DEVELOPMENT_TYPE_MAP[row.development_type as keyof typeof DEVELOPMENT_TYPE_MAP]?.label ?? resolveSnLabel(row.development_type)
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
  const router = useRouter();

  async function handleDeleteSelected(ids: string[]) {
    await deleteDevelopments(ids);
    toast.success(`${ids.length} développement${ids.length > 1 ? "s" : ""} supprimé${ids.length > 1 ? "s" : ""}.`);
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
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-sn-text">Developments</h1>
          <p className="text-xs text-sn-text-muted mt-0.5">All ServiceNow developments</p>
        </div>
      </div>

      <ServiceNowList
        title="Developments"
        data={developments}
        columns={defaultColumns}
        filterFields={filterFields}
        onRowClick={navigateToDev}
        onNew={() => router.push("/developments/new")}
        onRefresh={() => router.refresh()}
        onDeleteSelected={handleDeleteSelected}
        emptyMessage="No developments yet. Create a story and add developments from there."
      />
    </div>
  );
}
