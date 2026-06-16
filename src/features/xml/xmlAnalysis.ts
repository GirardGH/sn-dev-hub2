import type { ParsedComponent } from "./xml.types";

export interface ParsedSummaryComponent {
  title: string;
  developmentType: string;
  xmlTag: string;
  targetTable: string | null;
}

export interface ParsedSummary {
  totalDetected: number;
  byType: Record<string, number>;
  byTable: Record<string, number>;
  byAction: Record<string, number>;
  warnings: string[];
  components?: ParsedSummaryComponent[];
  importResult?: {
    created: number;
    updated: number;
    skipped: number;
  };
}

export function analyzeParsedComponents(
  components: ParsedComponent[],
  warnings: string[] = []
): ParsedSummary {
  const byType: Record<string, number> = {};
  const byTable: Record<string, number> = {};
  const byAction: Record<string, number> = {};

  for (const c of components) {
    byType[c.developmentType] = (byType[c.developmentType] ?? 0) + 1;

    const table = c.targetTable || (c.developmentType !== "unknown" ? c.xmlTag : null);
    if (table) {
      byTable[table] = (byTable[table] ?? 0) + 1;
    }

    const action = (c.config?.action as string | undefined) ?? "";
    const actionKey = action.toUpperCase() === "DELETE" ? "DELETE" : "INSERT_OR_UPDATE";
    byAction[actionKey] = (byAction[actionKey] ?? 0) + 1;
  }

  const summaryComponents: ParsedSummaryComponent[] = components.map((c) => ({
    title: c.title,
    developmentType: c.developmentType,
    xmlTag: c.xmlTag,
    targetTable: c.targetTable,
  }));

  return {
    totalDetected: components.length,
    byType,
    byTable,
    byAction,
    warnings,
    components: summaryComponents,
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getXmlPreview(
  rawXml: string,
  maxChars = 10000
): { preview: string; truncated: boolean; totalLines: number } {
  const lines = rawXml.split("\n");
  const totalLines = lines.length;

  const cappedLines = lines.slice(0, 300);
  let preview = cappedLines.join("\n");
  const truncatedByLines = totalLines > 300;
  const truncatedByChars = preview.length > maxChars;
  if (truncatedByChars) preview = preview.slice(0, maxChars);

  return { preview, truncated: truncatedByLines || truncatedByChars, totalLines };
}

export function downloadXml(filename: string, rawXml: string): void {
  const safeFilename = filename.endsWith(".xml") ? filename : `${filename}.xml`;
  const blob = new Blob([rawXml], { type: "application/xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = safeFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function copyXmlToClipboard(rawXml: string): Promise<void> {
  await navigator.clipboard.writeText(rawXml);
}
