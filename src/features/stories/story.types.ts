import { z } from "zod";
import type { Client } from "@/features/clients/client.types";

export const STORY_STATUSES = ["draft", "in_progress", "review", "done", "cancelled"] as const;
export type StoryStatus = (typeof STORY_STATUSES)[number];

export const STORY_PRIORITIES = ["low", "medium", "high", "critical"] as const;
export type StoryPriority = (typeof STORY_PRIORITIES)[number];

export interface Story {
  id: string;
  user_id: string;
  client_id: string;
  reference: string | null;
  title: string;
  description: string | null;
  functional_need: string | null;
  technical_solution: string | null;
  status: string;
  priority: string | null;
  estimated_uo: number | null;
  created_at: string;
  updated_at: string;
  clients?: Client | null;
}

export const storySchema = z.object({
  client_id: z.string().uuid("Le client est requis"),
  reference: z.string().max(1_000_000).nullable().optional(),
  title: z.string().trim().max(500).min(1, "Le titre est requis"),
  description: z.string().max(1_000_000).nullable().optional(),
  functional_need: z.string().max(1_000_000).nullable().optional(),
  technical_solution: z.string().max(1_000_000).nullable().optional(),
  status: z.string().min(1).max(64),
  priority: z.string().max(1_000_000).nullable().optional(),
  estimated_uo: z.number().finite().nonnegative().nullable().optional(),
});

export type StoryFormValues = z.infer<typeof storySchema>;
