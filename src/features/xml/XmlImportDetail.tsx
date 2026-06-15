"use client";

import { useRouter } from "next/navigation";
import { FileCode2, ExternalLink } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatDateTime } from "@/lib/utils";
import type { XmlImport } from "./xml.types";

type XmlImportWithRelations = XmlImport & {
  clients?: { id: string; name: string } | null;
  stories?: { id: string; title: string } | null;
};

interface Props {
  xmlImport: XmlImportWithRelations;
}

export function XmlImportDetailClient({ xmlImport }: Props) {
  const router = useRouter();
  const summary = xmlImport.parsed_summary as Record<string, unknown>;

  return (
    <div className="max-w-4xl">
      <Breadcrumbs
        items={[
          { label: "XML Imports", href: "/xml-imports" },
          { label: xmlImport.filename },
        ]}
        className="mb-3"
      />

      <div className="bg-white border border-sn-border rounded shadow-sm mb-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-sn-border">
          <div className="flex items-center gap-3">
            <FileCode2 className="w-5 h-5 text-sn-accent" />
            <div>
              <h1 className="text-base font-semibold text-sn-text">{xmlImport.filename}</h1>
              <p className="text-xs text-sn-text-muted mt-0.5">
                Imported {formatDateTime(xmlImport.created_at)}
              </p>
            </div>
          </div>
          <StatusBadge status={xmlImport.status} />
        </div>

        <div className="p-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-sn-text-muted mb-1">Client</p>
            {xmlImport.clients ? (
              <button
                onClick={() => router.push(`/clients/${xmlImport.clients!.id}`)}
                className="text-sm text-sn-accent hover:underline flex items-center gap-1"
              >
                {xmlImport.clients.name}
                <ExternalLink className="w-3 h-3" />
              </button>
            ) : (
              <p className="text-sm text-sn-text">—</p>
            )}
          </div>
          <div>
            <p className="text-xs text-sn-text-muted mb-1">Story</p>
            {xmlImport.stories && xmlImport.clients ? (
              <button
                onClick={() =>
                  router.push(
                    `/clients/${xmlImport.clients!.id}/stories/${xmlImport.stories!.id}`
                  )
                }
                className="text-sm text-sn-accent hover:underline flex items-center gap-1"
              >
                {xmlImport.stories.title}
                <ExternalLink className="w-3 h-3" />
              </button>
            ) : (
              <p className="text-sm text-sn-text">—</p>
            )}
          </div>
          <div>
            <p className="text-xs text-sn-text-muted mb-1">Developments Created</p>
            <p className="text-sm font-semibold text-sn-text">
              {xmlImport.created_developments_count}
            </p>
          </div>
          <div>
            <p className="text-xs text-sn-text-muted mb-1">Total Detected</p>
            <p className="text-sm text-sn-text">
              {(summary.total as number) ?? "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Raw XML preview */}
      <Card title="Raw XML">
        <pre className="text-xs font-mono bg-sn-bg rounded p-3 overflow-auto max-h-96 whitespace-pre-wrap">
          {xmlImport.raw_xml.slice(0, 5000)}
          {xmlImport.raw_xml.length > 5000 && "\n... (truncated)"}
        </pre>
      </Card>

      <div className="mt-4 flex gap-2">
        <Button variant="secondary" onClick={() => router.push("/xml-imports")}>
          Back to list
        </Button>
        {xmlImport.stories && xmlImport.clients && (
          <Button
            onClick={() =>
              router.push(
                `/clients/${xmlImport.clients!.id}/stories/${xmlImport.stories!.id}`
              )
            }
          >
            View Story
          </Button>
        )}
      </div>
    </div>
  );
}
