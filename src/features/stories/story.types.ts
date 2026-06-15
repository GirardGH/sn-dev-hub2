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
  client_id: z.string().min(1, "Le client est requis"),
  reference: z.string().nullable().optional(),
  title: z.string().min(1, "Le titre est requis"),
  description: z.string().nullable().optional(),
  functional_need: z.string().nullable().optional(),
  technical_solution: z.string().nullable().optional(),
  status: z.string(),
  priority: z.string().nullable().optional(),
  estimated_uo: z.number().nullable().optional(),
});

export type StoryFormValues = z.infer<typeof storySchema>;
