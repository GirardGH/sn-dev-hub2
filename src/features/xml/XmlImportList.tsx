"use client";
import { useT } from "@/i18n/LanguageProvider";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { FileCode2 } from "lucide-react";
import { toast } from "sonner";
import { ServiceNowList, type ListColumn } from "@/components/servicenow/ServiceNowList";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { deleteXmlImports } from "./xml.actions";
import type { XmlImport } from "./xml.types";
import type { FilterField } from "@/components/servicenow/FilterBuilder";

type XmlImportWithRelations = XmlImport & {
  clients?: { id: string; name: string } | null;
  stories?: { id: string; title: string } | null;
};

const filterFields: FilterField[] = [
  { key: "filename", label: "Filename" },
  { key: "created_developments_count", label: "Developments Created" },
  { key: "status", label: "Status" },
  { key: "created_at", label: "Imported" },
];

const defaultColumns: ListColumn<XmlImportWithRelations>[] = [
  { key: "filename", label: "Filename", visible: true, order: 1, render: (row) => (
    <span className="flex items-center gap-2">
      <FileCode2 className="w-3.5 h-3.5 text-sn-accent shrink-0" />
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
  const t = useT();
  const router = useRouter();
  const clientOptions = useMemo(() => {
    const clients = new Map<string, string>();
    for (const xmlImport of imports) {
      const label = xmlImport.clients?.name;
      if (label) clients.set(label, label);
    }
    return Array.from(clients, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [imports]);
  const storyOptions = useMemo(() => {
    const stories = new Map<string, string>();
    for (const xmlImport of imports) {
      const label = xmlImport.stories?.title;
      if (label) stories.set(label, label);
    }
    return Array.from(stories, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [imports]);
  const xmlImportFilterFields = useMemo<FilterField[]>(() => [
    filterFields[0],
    { key: "client", label: t("Client"), type: "select", options: clientOptions, getValue: (row) => (row as XmlImportWithRelations).clients?.name ?? "" },
    { key: "story", label: t("Story"), type: "select", options: storyOptions, getValue: (row) => (row as XmlImportWithRelations).stories?.title ?? "" },
    ...filterFields.slice(1),
  ], [clientOptions, storyOptions, t]);

  async function handleDeleteSelected(ids: string[]) {
    await deleteXmlImports(ids);
    toast.success(t("{count} imports deleted.", { count: ids.length }));
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="workspace-page-title">{t("XML Imports")}</h1>
          <p className="text-xs text-sn-text-muted mt-0.5">{t("ServiceNow XML update set imports")}</p>
        </div>
      </div>

      <ServiceNowList
        title={t("XML Imports")}
        data={imports}
        columns={defaultColumns}
        filterFields={xmlImportFilterFields}
        onRowClick={(row) => router.push(`/xml-imports/${row.id}`)}
        onNew={() => router.push("/xml-imports/new")}
        onRefresh={() => router.refresh()}
        onDeleteSelected={handleDeleteSelected}
        newLabel={t("Import XML")}
        emptyMessage={t("No XML imports yet. Upload a ServiceNow update set XML.")}
      />
    </div>
  );
}
