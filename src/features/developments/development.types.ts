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
  story_id: z.string().min(1, "La story est requise"),
  client_id: z.string().min(1, "Le client est requis"),
  title: z.string().min(1, "Le titre est requis"),
  development_type: z.string().min(1, "Le type est requis"),
  target_table: z.string().nullable().optional(),
  application_scope: z.string().nullable().optional(),
  update_set: z.string().nullable().optional(),
  short_description: z.string().nullable().optional(),
  technical_notes: z.string().nullable().optional(),
  status: z.string(),
  config: z.record(z.string(), z.unknown()),
});

export type DevelopmentFormValues = z.infer<typeof developmentSchema>;
