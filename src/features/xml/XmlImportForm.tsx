"use client";
import { useT } from "@/i18n/LanguageProvider";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, FileCode2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { XmlImportPreview } from "./XmlImportPreview";
import { parseServiceNowXml } from "./xmlParser";
import {
  createXmlImport,
  createDevelopmentsFromXmlImport,
  checkExistingDevelopments,
  updateXmlImportAnalysis,
} from "./xml.actions";
import { analyzeParsedComponents } from "./xmlAnalysis";
import type { Client } from "@/features/clients/client.types";
import type { Story } from "@/features/stories/story.types";
import type { XmlParseResult, ParsedComponent } from "./xml.types";

interface Props {
  clients: Client[];
  stories: Story[];
  defaultClientId?: string;
  defaultStoryId?: string;
}

function getSysIdFromConfig(config: Record<string, unknown>): string | null {
  if (typeof config.sys_id === "string" && config.sys_id.length >= 32) {
    return config.sys_id.toLowerCase();
  }
  const updateName = config.update_name;
  if (typeof updateName === "string") {
    const match = updateName.match(/([a-f0-9]{32})$/i);
    if (match) return match[1].toLowerCase();
  }
  return null;
}

export function XmlImportFormClient({ clients, stories, defaultClientId, defaultStoryId }: Props) {
  const t = useT();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [selectedClientId, setSelectedClientId] = useState(defaultClientId ?? "");
  const [selectedStoryId, setSelectedStoryId] = useState(defaultStoryId ?? "");
  const [parseResult, setParseResult] = useState<XmlParseResult | null>(null);
  const [components, setComponents] = useState<ParsedComponent[]>([]);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  const filteredStories = selectedClientId
    ? stories.filter((s) => s.client_id === selectedClientId)
    : stories;

  const clientOptions = [
    { value: "", label: t("— Select client —") },
    ...clients.map((c) => ({ value: c.id, label: c.name })),
  ];

  const storyOptions = [
    { value: "", label: t("— Select story —") },
    ...filteredStories.map((s) => ({ value: s.id, label: s.title })),
  ];

  // Duplicate check whenever story/client/parseResult changes
  useEffect(() => {
    if (!parseResult || !selectedStoryId || !selectedClientId) {
      setComponents((prev) =>
        prev.map((c) => ({ ...c, importAction: "create" as const, existingId: null }))
      );
      return;
    }

    let cancelled = false;
    setCheckingDuplicates(true);

    checkExistingDevelopments({
      storyId: selectedStoryId,
      clientId: selectedClientId,
      components: parseResult.components.map((c) => ({
        title: c.title,
        developmentType: c.developmentType,
        sysId: getSysIdFromConfig(c.config),
      })),
    })
      .then((results) => {
        if (cancelled) return;
        setComponents((prev) =>
          prev.map((c, i) => ({
            ...c,
            importAction: (results[i]?.existingId ? "update" : "create") as
              | "create"
              | "update",
            existingId: results[i]?.existingId ?? null,
          }))
        );
      })
      .catch(() => {
        // silent — components keep their current importAction
      })
      .finally(() => {
        if (!cancelled) setCheckingDuplicates(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedStoryId, selectedClientId, parseResult]);

  function processFile(file: File) {
    if (!file.name.endsWith(".xml")) {
      toast.error(t("Veuillez sélectionner un fichier XML."));
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const xmlString = e.target?.result as string;
      const result = await parseServiceNowXml(xmlString, file.name);
      setParseResult(result);
      setComponents(result.components);
    };
    reader.readAsText(file, "UTF-8");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  async function handleImport() {
    if (!selectedStoryId) {
      toast.error(t("Veuillez sélectionner une story."));
      return;
    }
    if (!selectedClientId) {
      toast.error(t("Veuillez sélectionner un client."));
      return;
    }
    if (!parseResult) return;

    const activeComponents = components.filter(
      (c) => c.selected && (c.importAction ?? "create") !== "skip"
    );
    if (activeComponents.length === 0) {
      toast.error(t("Sélectionnez au moins un composant à importer (hors ignorés)."));
      return;
    }

    setImporting(true);
    try {
      const baseSummary = analyzeParsedComponents(
        parseResult.components,
        parseResult.errors
      ) as unknown as Record<string, unknown>;

      const xmlImport = await createXmlImport({
        filename: parseResult.filename,
        raw_xml: parseResult.rawXml,
        client_id: selectedClientId,
        story_id: selectedStoryId,
        parsed_summary: baseSummary,
      });

      const result = await createDevelopmentsFromXmlImport({
        xmlImportId: xmlImport.id,
        storyId: selectedStoryId,
        clientId: selectedClientId,
        components,
      });

      await updateXmlImportAnalysis(xmlImport.id, {
        ...baseSummary,
        importResult: result,
      });

      const parts: string[] = [];
      if (result.created > 0)
        parts.push(`${result.created} créé${result.created > 1 ? "s" : ""}`);
      if (result.updated > 0) parts.push(`${result.updated} mis à jour`);
      if (result.skipped > 0)
        parts.push(`${result.skipped} ignoré${result.skipped > 1 ? "s" : ""}`);
      toast.success(parts.join(" · ") || "Import terminé.");

      router.push(`/xml-imports/${xmlImport.id}`);
    } catch (err) {
      toast.error(t("Erreur lors de l'import : ") + String(err));
    } finally {
      setImporting(false);
    }
  }

  const createCount = components.filter(
    (c) => c.selected && (c.importAction ?? "create") === "create"
  ).length;
  const updateCount = components.filter(
    (c) => c.selected && c.importAction === "update"
  ).length;
  const skipCount = components.filter(
    (c) => c.selected && c.importAction === "skip"
  ).length;
  const activeCount = createCount + updateCount;

  const importSummaryLine = [
    createCount > 0 && `+${createCount} à créer`,
    updateCount > 0 && `↻${updateCount} à mettre à jour`,
    skipCount > 0 && `${skipCount} ignoré${skipCount > 1 ? "s" : ""}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="max-w-5xl">
      <Breadcrumbs
        items={[
          { label: t("XML Imports"), href: "/xml-imports" },
          { label: t("New Import") },
        ]}
        className="mb-3"
      />

      <div className="bg-white border border-sn-border rounded-sm shadow-xs">
        <div className="flex items-center justify-between px-4 py-3 border-b border-sn-border">
          <div className="flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-sn-accent" />
            <h1 className="text-base font-semibold text-sn-text">{t("Import XML ServiceNow")}</h1>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Context selection */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-sn-bg rounded-sm border border-sn-border">
            <Select
              label={t("Client *")}
              options={clientOptions}
              value={selectedClientId}
              onChange={(e) => {
                setSelectedClientId(e.target.value);
                setSelectedStoryId("");
              }}
            />
            <Select
              label={t("Story *")}
              options={storyOptions}
              value={selectedStoryId}
              onChange={(e) => setSelectedStoryId(e.target.value)}
            />
          </div>

          {/* File drop zone */}
          {!parseResult && (
            <div
              className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer
                ${
                  dragOver
                    ? "border-sn-accent bg-sn-accent-light"
                    : "border-sn-border hover:border-sn-accent hover:bg-gray-50"
                }`}
              onClick={() => fileRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
            >
              <Upload className="w-8 h-8 mx-auto text-sn-text-muted mb-2" />
              <p className="text-sm font-medium text-sn-text">{t("Drop your XML file here")}</p>
              <p className="text-xs text-sn-text-muted mt-1">
                {t("ServiceNow update set export (.xml)")}</p>
              <Button variant="secondary" size="sm" className="mt-4">
                {t("Browse file")}</Button>
              <input
                ref={fileRef}
                type="file"
                accept=".xml"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}

          {/* Parse errors */}
          {parseResult && parseResult.errors.length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-sm text-sm">
              <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">{t("Avertissements")}</p>
                <ul className="mt-1 text-xs text-yellow-700 space-y-0.5">
                  {parseResult.errors.map((e, i) => (
                    <li key={i}>• {e}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Preview */}
          {parseResult && (
            <>
              <XmlImportPreview
                filename={parseResult.filename}
                components={components}
                onChange={setComponents}
                onReset={() => {
                  setParseResult(null);
                  setComponents([]);
                }}
                clientId={selectedClientId || undefined}
                storyId={selectedStoryId || undefined}
                checking={checkingDuplicates}
              />

              <div className="flex items-center justify-between pt-2 border-t border-sn-border">
                <div className="flex flex-col gap-0.5">
                  <p className="text-xs text-sn-text-muted">
                    {components.filter((c) => c.selected).length} / {components.length}{" "}
                    {t("composant(s) sélectionné(s)")}</p>
                  {!checkingDuplicates && importSummaryLine && (
                    <p className="text-xs text-sn-text-muted">{importSummaryLine}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setParseResult(null);
                      setComponents([]);
                    }}
                  >
                    {t("Change file")}</Button>
                  <Button
                    onClick={handleImport}
                    loading={importing}
                    disabled={activeCount === 0 || checkingDuplicates}
                  >
                    {checkingDuplicates ? "Vérification…" : `Importer (${activeCount})`}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
