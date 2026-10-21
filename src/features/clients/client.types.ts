import { z } from "zod";

export const CLIENT_STATUSES = ["active", "inactive", "archived"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const CLIENT_ENVIRONMENTS = ["production", "staging", "development", "sandbox"] as const;
export type ClientEnvironment = (typeof CLIENT_ENVIRONMENTS)[number];

export interface Client {
  id: string;
  user_id: string;
  name: string;
  code: string | null;
  description: string | null;
  instance_url: string | null;
  environment: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export const clientSchema = z.object({
  name: z.string().trim().max(500).min(1, "Le nom est requis"),
  code: z.string().max(1_000_000).nullable().optional(),
  description: z.string().max(1_000_000).nullable().optional(),
  instance_url: z.string().url("URL invalide").nullable().optional().or(z.literal("")),
  environment: z.string().max(1_000_000).nullable().optional(),
  status: z.string().min(1).max(64),
});

export type ClientFormValues = z.infer<typeof clientSchema>;
