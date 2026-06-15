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
  name: z.string().min(1, "Le nom est requis"),
  code: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  instance_url: z.string().url("URL invalide").nullable().optional().or(z.literal("")),
  environment: z.string().nullable().optional(),
  status: z.string(),
});

export type ClientFormValues = z.infer<typeof clientSchema>;
