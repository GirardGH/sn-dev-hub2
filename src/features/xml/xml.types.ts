export type { ParsedSummary, ParsedSummaryComponent } from "./xmlAnalysis";

export interface XmlImport {
  id: string;
  user_id: string;
  client_id: string | null;
  story_id: string | null;
  filename: string;
  raw_xml: string;
  parsed_summary: Record<string, unknown>;
  created_developments_count: number;
  status: string;
  created_at: string;
  clients?: { id: string; name: string } | null;
  stories?: { id: string; title: string } | null;
}

export interface ParsedComponent {
  xmlTag: string;
  developmentType: string;
  title: string;
  targetTable: string | null;
  config: Record<string, unknown>;
  rawXml: string;
  selected: boolean;
  /** Determined after DB duplicate check — defaults to "create" */
  importAction?: "create" | "update" | "skip";
  /** ID of the existing development if a duplicate was found */
  existingId?: string | null;
}

export interface XmlParseResult {
  components: ParsedComponent[];
  errors: string[];
  rawXml: string;
  filename: string;
}
