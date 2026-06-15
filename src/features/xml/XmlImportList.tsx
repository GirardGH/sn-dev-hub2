"use client";

import { useRouter } from "next/navigation";
import { FileCode2 } from "lucide-react";
import { ServiceNowList, type ListColumn } from "@/components/servicenow/ServiceNowList";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import type { XmlImport } from "./xml.types";

type XmlImportWithRelations = XmlImport & {
  clients?: { id: string; name: string } | null;
  stories?: { id: string; title: string } | null;
};

const defaultColumns: ListColumn<XmlImportWithRelations>[] = [
  { key: "filename", label: "Filename", visible: true, order: 1, render: (row) => (
    <span className="flex items-center gap-2">
      <FileCode2 className="w-3.5 h-3.5 text-sn-accent flex-shrink-0" />
      <span className="font-medium text-sn-accent">{row.filename}</span>
    </span>
  )},
  { key: "client", label: "Client", visible: true, order: 2, render: (row) => row.clients?.name ?? "—" },
  { key: "story", label: "Story", visible: true, order: 3, render: (row) => row.stories?.title ?? "—" },
  { key: "created_developments_count", label: "Developments Created", visible: true, order: 4 },
  { key: "status", label: "Status", visible: true, order: 5, render: (row) => <StatusBadge status={row.status} /> },
  { key: "created_at", label: "Imported", visible: true, order: 6, render: (row) => formatDate(row.created_at) },
];

interface Props {
  imports: XmlImportWithRelations[];
}

export function XmlImportListClient({ imports }: Props) {
  const router = useRouter();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-sn-text">XML Imports</h1>
          <p className="text-xs text-sn-text-muted mt-0.5">ServiceNow XML update set imports</p>
        </div>
      </div>

      <ServiceNowList
        title="XML Imports"
        data={imports}
        columns={defaultColumns}
        onRowClick={(row) => router.push(`/xml-imports/${row.id}`)}
        onNew={() => router.push("/xml-imports/new")}
        onRefresh={() => router.refresh()}
        newLabel="Import XML"
        emptyMessage="No XML imports yet. Upload a ServiceNow update set XML."
      />
    </div>
  );
}
