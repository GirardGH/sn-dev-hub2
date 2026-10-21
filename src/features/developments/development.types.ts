import { z } from "zod";
import type { Story } from "@/features/stories/story.types";
import type { Client } from "@/features/clients/client.types";

export const DEVELOPMENT_STATUSES = [
  "draft",
  "in_progress",
  "review",
  "done",
  "deployed",
  "cancelled",
] as const;
export type DevelopmentStatus = (typeof DEVELOPMENT_STATUSES)[number];

export interface Development {
  id: string;
  user_id: string;
  story_id: string;
  client_id: string;
  title: string;
  development_type: string;
  target_table: string | null;
  application_scope: string | null;
  update_set: string | null;
  short_description: string | null;
  technical_notes: string | null;
  status: string;
  config: Record<string, unknown>;
  raw_xml: string | null;
  xml_import_id: string | null;
  created_at: string;
  updated_at: string;
  stories?: Story | null;
  clients?: Client | null;
}

export const developmentSchema = z.object({
  story_id: z.string().uuid("La story est requise"),
  client_id: z.string().uuid("Le client est requis"),
  title: z.string().trim().max(500).min(1, "Le titre est requis"),
  development_type: z.string().trim().min(1, "Le type est requis").max(128),
  target_table: z.string().max(1_000_000).nullable().optional(),
  application_scope: z.string().max(1_000_000).nullable().optional(),
  update_set: z.string().max(1_000_000).nullable().optional(),
  short_description: z.string().max(1_000_000).nullable().optional(),
  technical_notes: z.string().max(1_000_000).nullable().optional(),
  status: z.string().min(1).max(64),
  config: z.record(z.string(), z.unknown()).refine(value => {
    try { return new TextEncoder().encode(JSON.stringify(value)).byteLength <= 2 * 1024 * 1024; }
    catch { return false; }
  }, "La configuration dépasse la limite de 2 Mo ou n’est pas sérialisable."),
});

export type DevelopmentFormValues = z.infer<typeof developmentSchema>;
