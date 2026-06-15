"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, FileCode2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { XmlImportPreview } from "./XmlImportPreview";
import { parseServiceNowXml } from "./xmlParser";
import { createXmlImport, createDevelopmentsFromXmlImport } from "./xml.actions";
import type { Client } from "@/features/clients/client.types";
import type { Story } from "@/features/stories/story.types";
import type { XmlParseResult, ParsedComponent } from "./xml.types";

interface Props {
  clients: Client[];
  stories: Story[];
  defaultClientId?: string;
  defaultStoryId?: string;
}

export function XmlImportFormClient({ clients, stories, defaultClientId, defaultStoryId }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [selectedClientId, setSelectedClientId] = useState(defaultClientId ?? "");
  const [selectedStoryId, setSelectedStoryId] = useState(defaultStoryId ?? "");
  const [parseResult, setParseResult] = useState<XmlParseResult | null>(null);
  const [components, setComponents] = useState<ParsedComponent[]>([]);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const filteredStories = selectedClientId
    ? stories.filter((s) => s.client_id === selectedClientId)
    : stories;

  const clientOptions = [
    { value: "", label: "— Select client —" },
    ...clients.map((c) => ({ value: c.id, label: c.name })),
  ];

  const storyOptions = [
    { value: "", label: "— Select story —" },
    ...filteredStories.map((s) => ({ value: s.id, label: s.title })),
  ];

  function processFile(file: File) {
    if (!file.name.endsWith(".xml")) {
      toast.error("Veuillez sélectionner un fichier XML.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const xmlString = e.target?.result as string;
      const result = parseServiceNowXml(xmlString, file.name);
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
      toast.error("Veuillez sélectionner une story.");
      return;
    }
    if (!selectedClientId) {
      toast.error("Veuillez sélectionner un client.");
      return;
    }
    if (!parseResult) return;

    const selectedComponents = components.filter((c) => c.selected);
    if (selectedComponents.length === 0) {
      toast.error("Sélectionnez au moins un composant à importer.");
      return;
    }

    setImporting(true);
    try {
      const xmlImport = await createXmlImport({
        filename: parseResult.filename,
        raw_xml: parseResult.rawXml,
        client_id: selectedClientId,
        story_id: selectedStoryId,
        parsed_summary: {
          total: parseResult.components.length,
          errors: parseResult.errors,
        },
      });

      await createDevelopmentsFromXmlImport({
        xmlImportId: xmlImport.id,
        storyId: selectedStoryId,
        clientId: selectedClientId,
        components: components,
      });

      toast.success(`${selectedComponents.length} development(s) créé(s) !`);
      const story = stories.find((s) => s.id === selectedStoryId);
      if (story) {
        router.push(`/clients/${selectedClientId}/stories/${selectedStoryId}`);
      } else {
        router.push(`/xml-imports/${xmlImport.id}`);
      }
    } catch (err) {
      toast.error("Erreur lors de l'import : " + String(err));
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="max-w-5xl">
      <Breadcrumbs
        items={[
          { label: "XML Imports", href: "/xml-imports" },
          { label: "New Import" },
        ]}
        className="mb-3"
      />

      <div className="bg-white border border-sn-border rounded shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-sn-border">
          <div className="flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-sn-accent" />
            <h1 className="text-base font-semibold text-sn-text">Import XML ServiceNow</h1>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Context selection */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-sn-bg rounded border border-sn-border">
            <Select
              label="Client *"
              options={clientOptions}
              value={selectedClientId}
              onChange={(e) => {
                setSelectedClientId(e.target.value);
                setSelectedStoryId("");
              }}
            />
            <Select
              label="Story *"
              options={storyOptions}
              value={selectedStoryId}
              onChange={(e) => setSelectedStoryId(e.target.value)}
            />
          </div>

          {/* File drop zone */}
          {!parseResult && (
            <div
              className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer
                ${dragOver ? "border-sn-accent bg-sn-accent-light" : "border-sn-border hover:border-sn-accent hover:bg-gray-50"}`}
              onClick={() => fileRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
            >
              <Upload className="w-8 h-8 mx-auto text-sn-text-muted mb-2" />
              <p className="text-sm font-medium text-sn-text">Drop your XML file here</p>
              <p className="text-xs text-sn-text-muted mt-1">
                ServiceNow update set export (.xml)
              </p>
              <Button variant="secondary" size="sm" className="mt-4">
                Browse file
              </Button>
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
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
              <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">Avertissements</p>
                <ul className="mt-1 text-xs text-yellow-700 space-y-0.5">
                  {parseResult.errors.map((e, i) => <li key={i}>• {e}</li>)}
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
                onReset={() => { setParseResult(null); setComponents([]); }}
              />

              <div className="flex items-center justify-between pt-2 border-t border-sn-border">
                <p className="text-xs text-sn-text-muted">
                  {components.filter((c) => c.selected).length} / {components.length} composant(s) sélectionné(s)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => { setParseResult(null); setComponents([]); }}
                  >
                    Change file
                  </Button>
                  <Button
                    onClick={handleImport}
                    loading={importing}
                    disabled={components.filter((c) => c.selected).length === 0}
                  >
                    Create {components.filter((c) => c.selected).length} Development(s)
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
