"use client";

import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import { ServiceNowList, type ListColumn } from "@/components/servicenow/ServiceNowList";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import type { Client } from "./client.types";
import type { FilterField } from "@/components/servicenow/FilterBuilder";
import { deleteClients } from "./client.actions";

const filterFields: FilterField[] = [
  { key: "name", label: "Name" },
  { key: "code", label: "Code" },
  { key: "environment", label: "Environment" },
  { key: "status", label: "Status", type: "select", options: [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "archived", label: "Archived" },
  ]},
];

const defaultColumns: ListColumn<Client>[] = [
  { key: "name", label: "Name", visible: true, order: 1, render: (row) => (
    <span className="flex items-center gap-2">
      <Building2 className="w-3.5 h-3.5 text-sn-accent flex-shrink-0" />
      <span className="font-medium text-sn-accent">{row.name}</span>
    </span>
  )},
  { key: "code", label: "Code", visible: true, order: 2 },
  { key: "environment", label: "Environment", visible: true, order: 3 },
  { key: "instance_url", label: "Instance URL", visible: false, order: 4 },
  { key: "status", label: "Status", visible: true, order: 5, render: (row) => <StatusBadge status={row.status} /> },
  { key: "created_at", label: "Created", visible: true, order: 6, render: (row) => formatDate(row.created_at) },
];

interface Props {
  clients: Client[];
}

export function ClientListClient({ clients }: Props) {
  const router = useRouter();

  async function handleDeleteSelected(ids: string[]) {
    await deleteClients(ids);
    toast.success(`${ids.length} client${ids.length > 1 ? "s" : ""} supprimé${ids.length > 1 ? "s" : ""}.`);
    router.refresh();
  }

  return (
    <div className="h-[calc(100vh-5rem)] min-h-0 flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-sn-text">Clients</h1>
          <p className="text-xs text-sn-text-muted mt-0.5">
            Manage your ServiceNow clients
          </p>
        </div>
      </div>

      <ServiceNowList
        className="flex-1"
        title="Clients"
        data={clients}
        columns={defaultColumns}
        filterFields={filterFields}
        onRowClick={(row) => router.push(`/clients/${row.id}`)}
        onNew={() => router.push("/clients/new")}
        onRefresh={() => router.refresh()}
        onDeleteSelected={handleDeleteSelected}
        emptyMessage="No clients yet. Click New to create your first client."
      />
    </div>
  );
}
