"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  FileCode2,
  ExternalLink,
  Eye,
  Copy,
  Download,
  RefreshCw,
  AlertTriangle,
  BarChart3,
  Loader2,
  ChevronDown,
  ChevronRight,
  PackageOpen,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDateTime } from "@/lib/utils";
import { DEVELOPMENT_TYPE_MAP } from "@/features/developments/developmentTypes";
import { resolveSnLabel } from "./snTableRegistry";
import { parseServiceNowXml } from "./xmlParser";
import {
  analyzeParsedComponents,
  formatFileSize,
  getXmlPreview,
  downloadXml,
  copyXmlToClipboard,
} from "./xmlAnalysis";
import type { ParsedSummary, ParsedSummaryComponent } from "./xmlAnalysis";
import { updateXmlImportAnalysis, deleteXmlImport } from "./xml.actions";
import type { XmlImport } from "./xml.types";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

type LinkedDevelopment = {
  id: string;
  title: string;
  development_type: string;
  story_id: string;
  client_id: string;
};

type XmlImportWithRelations = XmlImport & {
  clients?: { id: string; name: string } | null;
  stories?: { id: string; title: string } | null;
};

interface Props {
  xmlImport: XmlImportWithRelations;
  linkedDevelopments: LinkedDevelopment[];
}

function extractSummary(raw: Record<string, unknown>): ParsedSummary | null {
  if (typeof raw.totalDetected === "number") return raw as unknown as ParsedSummary;
  return null;
}

function getTypeLabel(type: string): string {
  return (
    DEVELOPMENT_TYPE_MAP[type as keyof typeof DEVELOPMENT_TYPE_MAP]?.label ??
    resolveSnLabel(type)
  );
}

// ── Components Detected expandable table ────────────────────────────────────
interface ComponentsTableProps {
  components: ParsedSummaryComponent[];
}

function ComponentsTable({ components }: ComponentsTableProps) {
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());

  const grouped: Record<string, ParsedSummaryComponent[]> = {};
  for (const c of components) {
    if (!grouped[c.developmentType]) grouped[c.developmentType] = [];
    grouped[c.developmentType].push(c);
  }

  const toggleType = (type: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  return (
    <div className="border border-sn-border rounded overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-sn-bg border-b border-sn-border">
            <th className="text-left px-3 py-2 font-semibold text-sn-text-muted uppercase tracking-wider">
              Type
            </th>
            <th className="text-right px-3 py-2 font-semibold text-sn-text-muted uppercase tracking-wider w-16">
              Nb
            </th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(grouped)
            .sort(([, a], [, b]) => b.length - a.length)
            .map(([type, items], idx) => {
              const isExpanded = expandedTypes.has(type);
              const isLast = idx === Object.keys(grouped).length - 1;
              return (
                <React.Fragment key={type}>
                  <tr
                    className={`cursor-pointer hover:bg-sn-bg transition-colors ${
                      !isLast || isExpanded ? "border-b border-sn-border" : ""
                    }`}
                    onClick={() => toggleType(type)}
                  >
                    <td className="px-3 py-2 font-medium text-sn-text">
                      <span className="flex items-center gap-1.5">
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-sn-text-muted flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-sn-text-muted flex-shrink-0" />
                        )}
                        {getTypeLabel(type)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-sn-accent">
                      {items.length}
                    </td>
                  </tr>
                  {isExpanded &&
                    items.map((item, i) => (
                      <tr
                        key={`${type}-${i}`}
                        className={`bg-blue-50/40 ${
                          i < items.length - 1 ? "border-b border-sn-border/50" : ""
                        }`}
                      >
                        <td colSpan={2} className="px-3 py-1.5 pl-8">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-sn-text font-mono truncate max-w-xs"
                              title={item.title}
                            >
                              {item.title}
                            </span>
                            {item.targetTable && (
                              <span className="text-[10px] text-blue-600 bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded font-mono flex-shrink-0">
                                {item.targetTable}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </React.Fragment>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}

// ── Developments Created grouped list ──────────────────────────────────────
interface DevListProps {
  developments: LinkedDevelopment[];
}

function DevelopmentsCreatedList({ developments }: DevListProps) {
  const router = useRouter();

  const grouped: Record<string, LinkedDevelopment[]> = {};
  for (const d of developments) {
    if (!grouped[d.development_type]) grouped[d.development_type] = [];
    grouped[d.development_type].push(d);
  }

  return (
    <div className="space-y-3">
      {Object.entries(grouped)
        .sort(([, a], [, b]) => b.length - a.length)
        .map(([type, items]) => (
          <div key={type}>
            <p className="text-[11px] font-semibold text-sn-text-muted uppercase tracking-wider mb-1.5">
              {getTypeLabel(type)}
              <span className="ml-1.5 font-bold text-sn-accent">{items.length}</span>
            </p>
            <div className="space-y-1">
              {items.map((dev) => (
                <button
                  key={dev.id}
                  onClick={() =>
                    router.push(
                      `/clients/${dev.client_id}/stories/${dev.story_id}/developments/${dev.id}`
                    )
                  }
                  className="w-full flex items-center justify-between px-3 py-2 bg-sn-bg border border-sn-border rounded hover:bg-white hover:border-sn-accent/40 transition-colors text-left group"
                >
                  <span className="text-sm text-sn-text truncate group-hover:text-sn-accent transition-colors">
                    {dev.title}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-sn-text-muted/50 group-hover:text-sn-accent flex-shrink-0 ml-2 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export function XmlImportDetailClient({ xmlImport, linkedDevelopments }: Props) {
  const router = useRouter();
  const [summary, setSummary] = useState<ParsedSummary | null>(
    extractSummary(xmlImport.parsed_summary)
  );
  const [showFullXml, setShowFullXml] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [copying, setCopying] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { preview, truncated, totalLines } = getXmlPreview(xmlImport.raw_xml);
  const fileSize = formatFileSize(xmlImport.raw_xml.length);

  const legacyTotal = (xmlImport.parsed_summary as Record<string, unknown>).total as
    | number
    | undefined;
  const displayTotal = summary?.totalDetected ?? legacyTotal ?? "—";

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteXmlImport(xmlImport.id);
      toast.success("Import XML supprimé.");
      router.push("/xml-imports");
    } catch (err) {
      toast.error("Erreur : " + String(err));
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function handleReanalyze() {
    setReanalyzing(true);
    try {
      const result = await parseServiceNowXml(xmlImport.raw_xml, xmlImport.filename);
      const newSummary = analyzeParsedComponents(result.components, result.errors);
      await updateXmlImportAnalysis(
        xmlImport.id,
        newSummary as unknown as Record<string, unknown>
      );
      setSummary(newSummary);
      toast.success(
        `Re-analyse terminée · ${newSummary.totalDetected} composant(s) détecté(s).`
      );
    } catch (err) {
      toast.error("Erreur lors de la re-analyse : " + String(err));
    } finally {
      setReanalyzing(false);
    }
  }

  async function handleCopy() {
    setCopying(true);
    try {
      await copyXmlToClipboard(xmlImport.raw_xml);
      toast.success("XML copié dans le presse-papiers.");
    } catch {
      toast.error("Impossible de copier le XML.");
    } finally {
      setCopying(false);
    }
  }

  function handleDownload() {
    downloadXml(xmlImport.filename, xmlImport.raw_xml);
  }

  return (
    <div className="max-w-5xl space-y-4">
      <Breadcrumbs
        items={[
          { label: "XML Imports", href: "/xml-imports" },
          { label: xmlImport.filename },
        ]}
        className="mb-1"
      />

      {/* ── Header card ── */}
      <div className="bg-white border border-sn-border rounded shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-sn-border">
          <div className="flex items-center gap-3">
            <FileCode2 className="w-5 h-5 text-sn-accent flex-shrink-0" />
            <div>
              <h1 className="text-base font-semibold text-sn-text">{xmlImport.filename}</h1>
              <p className="text-xs text-sn-text-muted mt-0.5">
                Importé le {formatDateTime(xmlImport.created_at)}
                {" · "}
                {fileSize}
                {" · "}
                {totalLines.toLocaleString()} lignes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={xmlImport.status} />
            <Button
              variant="secondary"
              size="sm"
              icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />}
              onClick={() => setConfirmDelete(true)}
              loading={deleting}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              Supprimer
            </Button>
          </div>
        </div>

        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
          <div>
            <p className="text-[11px] text-sn-text-muted mb-1 uppercase tracking-wider font-semibold">
              Client
            </p>
            {xmlImport.clients ? (
              <button
                onClick={() => router.push(`/clients/${xmlImport.clients!.id}`)}
                className="text-sm text-sn-accent hover:underline flex items-center gap-1"
              >
                {xmlImport.clients.name}
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </button>
            ) : (
              <p className="text-sm text-sn-text">—</p>
            )}
          </div>

          <div>
            <p className="text-[11px] text-sn-text-muted mb-1 uppercase tracking-wider font-semibold">
              Story
            </p>
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
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </button>
            ) : (
              <p className="text-sm text-sn-text">—</p>
            )}
          </div>

          <div>
            <p className="text-[11px] text-sn-text-muted mb-1 uppercase tracking-wider font-semibold">
              Développements créés
            </p>
            {summary?.importResult ? (
              <div className="flex flex-col gap-0.5">
                {summary.importResult.created > 0 && (
                  <span className="text-sm font-semibold text-green-700">
                    +{summary.importResult.created} créé{summary.importResult.created > 1 ? "s" : ""}
                  </span>
                )}
                {summary.importResult.updated > 0 && (
                  <span className="text-sm font-semibold text-amber-700">
                    ↻{summary.importResult.updated} mis à jour
                  </span>
                )}
                {summary.importResult.skipped > 0 && (
                  <span className="text-xs text-sn-text-muted">
                    {summary.importResult.skipped} ignoré{summary.importResult.skipped > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm font-semibold text-sn-text">
                {xmlImport.created_developments_count}
              </p>
            )}
          </div>

          <div>
            <p className="text-[11px] text-sn-text-muted mb-1 uppercase tracking-wider font-semibold">
              Composants détectés
            </p>
            <p className="text-sm text-sn-text">{displayTotal}</p>
          </div>
        </div>
      </div>

      {/* ── Analysis card ── */}
      <Card
        title="Analyse"
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon={
              reanalyzing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )
            }
            onClick={handleReanalyze}
            disabled={reanalyzing}
          >
            Re-analyser
          </Button>
        }
      >
        {summary ? (
          <div className="space-y-5">
            {/* Components detected table */}
            {summary.components && summary.components.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-sn-text-muted uppercase tracking-wider mb-2">
                  Composants détectés
                </p>
                <ComponentsTable components={summary.components} />
              </div>
            )}

            {/* By action */}
            {Object.keys(summary.byAction).length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-sn-text-muted uppercase tracking-wider mb-2">
                  Actions
                </p>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(summary.byAction).map(([action, count]) => (
                    <span
                      key={action}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium border ${
                        action === "DELETE"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-green-50 text-green-700 border-green-200"
                      }`}
                    >
                      {action === "DELETE" ? "DELETE" : "INSERT / UPDATE"}
                      <span className="font-bold text-sm">{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* By table */}
            {Object.keys(summary.byTable).length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-sn-text-muted uppercase tracking-wider mb-2">
                  Tables détectées
                </p>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(summary.byTable)
                    .sort(([, a], [, b]) => b - a)
                    .map(([table, count]) => (
                      <span
                        key={table}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-mono"
                      >
                        {table}
                        {count > 1 && (
                          <span className="font-bold ml-0.5">×{count}</span>
                        )}
                      </span>
                    ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {summary.warnings.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-yellow-800 mb-1">
                    Avertissements ({summary.warnings.length})
                  </p>
                  <ul className="space-y-0.5">
                    {summary.warnings.map((w, i) => (
                      <li key={i} className="text-xs text-yellow-700">
                        • {w}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center py-8 text-center gap-3">
            <BarChart3 className="w-10 h-10 text-sn-text-muted/30" />
            <div>
              <p className="text-sm font-medium text-sn-text">
                Aucune analyse détaillée disponible
              </p>
              <p className="text-xs text-sn-text-muted mt-1 max-w-xs mx-auto">
                Cliquez sur &ldquo;Re-analyser&rdquo; pour calculer la répartition par type,
                table et action des composants ServiceNow de ce fichier.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={
                reanalyzing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )
              }
              onClick={handleReanalyze}
              disabled={reanalyzing}
            >
              Re-analyser maintenant
            </Button>
          </div>
        )}
      </Card>

      {/* ── Developments created card ── */}
      {linkedDevelopments.length > 0 && (
        <Card title={`Développements créés (${linkedDevelopments.length})`}>
          <DevelopmentsCreatedList developments={linkedDevelopments} />
        </Card>
      )}

      {/* ── Raw XML card ── */}
      <Card
        title="Raw XML"
        actions={
          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              icon={<Eye className="w-3.5 h-3.5" />}
              onClick={() => setShowFullXml(true)}
            >
              Voir complet
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={
                copying ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )
              }
              onClick={handleCopy}
              disabled={copying}
            >
              Copier
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={handleDownload}
            >
              Télécharger
            </Button>
          </div>
        }
      >
        {truncated && (
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-xs font-medium">
              <AlertTriangle className="w-3 h-3" />
              Aperçu — {totalLines.toLocaleString()} lignes au total · fichier complet via
              &ldquo;Voir complet&rdquo; ou &ldquo;Télécharger&rdquo;
            </span>
          </div>
        )}
        <pre className="text-xs font-mono bg-sn-bg rounded border border-sn-border p-3 overflow-auto max-h-80 whitespace-pre">
          {preview}
          {truncated && "\n..."}
        </pre>
      </Card>

      {/* ── Footer ── */}
      <div className="flex items-center gap-2 pb-6">
        <Button variant="secondary" onClick={() => router.push("/xml-imports")}>
          Retour à la liste
        </Button>
        {xmlImport.stories && xmlImport.clients && (
          <Button
            onClick={() =>
              router.push(
                `/clients/${xmlImport.clients!.id}/stories/${xmlImport.stories!.id}`
              )
            }
          >
            Voir la Story
          </Button>
        )}
      </div>

      {/* ── Delete confirmation ── */}
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Supprimer l'import XML"
        message={`Supprimer "${xmlImport.filename}" ? Les développements créés depuis cet import ne seront pas supprimés.`}
      />

      {/* ── Full XML modal (Monaco) ── */}
      <Modal
        open={showFullXml}
        onClose={() => setShowFullXml(false)}
        title={xmlImport.filename}
        size="xl"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              icon={
                copying ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )
              }
              onClick={handleCopy}
              disabled={copying}
            >
              Copier
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={handleDownload}
            >
              Télécharger
            </Button>
            <Button variant="secondary" onClick={() => setShowFullXml(false)}>
              Fermer
            </Button>
          </>
        }
      >
        <div className="h-[62vh]">
          <MonacoEditor
            height="100%"
            language="xml"
            value={xmlImport.raw_xml}
            options={{
              readOnly: true,
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              fontSize: 12,
              lineNumbers: "on",
              wordWrap: "off",
              folding: true,
              renderLineHighlight: "all",
              scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
            }}
            theme="vs"
            loading={
              <div className="flex items-center justify-center h-full gap-2 text-sn-text-muted text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Chargement de l&apos;éditeur…
              </div>
            }
          />
        </div>
      </Modal>
    </div>
  );
}

// No-developments placeholder (kept for import completeness — not currently rendered)
export function XmlImportNoDevsPlaceholder() {
  return (
    <div className="flex flex-col items-center py-8 gap-3 text-center">
      <PackageOpen className="w-10 h-10 text-sn-text-muted/30" />
      <p className="text-sm text-sn-text-muted">Aucun développement créé depuis cet import.</p>
    </div>
  );
}
