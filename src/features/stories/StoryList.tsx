"use client";

import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";
import { ServiceNowList, type ListColumn } from "@/components/servicenow/ServiceNowList";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import type { Story } from "./story.types";
import type { FilterField } from "@/components/servicenow/FilterBuilder";

interface StoryWithClient extends Omit<Story, "clients"> {
  clients?: { id: string; name: string; code: string | null } | null;
}

const filterFields: FilterField[] = [
  { key: "title", label: "Title" },
  { key: "reference", label: "Reference" },
  { key: "status", label: "Status", type: "select", options: [
    { value: "draft", label: "Draft" },
    { value: "in_progress", label: "In Progress" },
    { value: "review", label: "Review" },
    { value: "done", label: "Done" },
    { value: "cancelled", label: "Cancelled" },
  ]},
  { key: "priority", label: "Priority", type: "select", options: [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
    { value: "critical", label: "Critical" },
  ]},
];

function buildColumns(onClientClick?: (clientId: string) => void): ListColumn<StoryWithClient>[] {
  return [
    { key: "reference", label: "Reference", visible: true, order: 1 },
    { key: "title", label: "Title", visible: true, order: 2, render: (row) => (
      <span className="flex items-center gap-2">
        <BookOpen className="w-3.5 h-3.5 text-sn-accent flex-shrink-0" />
        <span className="font-medium text-sn-accent">{row.title}</span>
      </span>
    )},
    { key: "client", label: "Client", visible: true, order: 3, render: (row) => (
      row.clients ? (
        <button
          onClick={(e) => { e.stopPropagation(); onClientClick?.(row.clients!.id); }}
          className="text-sn-accent hover:underline"
        >
          {row.clients.name}
        </button>
      ) : "—"
    )},
    { key: "status", label: "Status", visible: true, order: 4, render: (row) => <StatusBadge status={row.status} /> },
    { key: "priority", label: "Priority", visible: true, order: 5, render: (row) => row.priority ? <StatusBadge status={row.priority} /> : null },
    { key: "estimated_uo", label: "UO", visible: true, order: 6 },
    { key: "created_at", label: "Created", visible: true, order: 7, render: (row) => formatDate(row.created_at) },
  ];
}

interface Props {
  stories: StoryWithClient[];
}

export function StoryListClient({ stories }: Props) {
  const router = useRouter();

  const columns = buildColumns((clientId) => router.push(`/clients/${clientId}`));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-sn-text">Stories</h1>
          <p className="text-xs text-sn-text-muted mt-0.5">All stories across all clients</p>
        </div>
      </div>

      <ServiceNowList
        title="Stories"
        data={stories}
        columns={columns}
        filterFields={filterFields}
        onRowClick={(row) => {
          const clientId = row.client_id || row.clients?.id;
          if (clientId) router.push(`/clients/${clientId}/stories/${row.id}`);
        }}
        onRefresh={() => router.refresh()}
        emptyMessage="No stories yet. Create a client first, then add stories."
      />
    </div>
  );
}
