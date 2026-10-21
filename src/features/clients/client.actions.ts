"use server";

import { createSpaceSupabaseClient } from "@/lib/supabaseSpace";
import { clientSchema } from "./client.types";
import { revalidatePath } from "next/cache";
import type { ClientFormValues, Client } from "./client.types";

export async function getClients(): Promise<Client[]> {
  const supabase = await createSpaceSupabaseClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("name");
  if (error) throw new Error(error.message);
  return data as Client[];
}

export async function getClient(id: string): Promise<Client> {
  const supabase = await createSpaceSupabaseClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data as Client;
}

export async function createClient(values: ClientFormValues): Promise<Client> {
  values = clientSchema.parse(values);
  const supabase = await createSpaceSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("clients")
    .insert([{
      user_id: user.id,
      name: values.name,
      code: values.code ?? null,
      description: values.description ?? null,
      instance_url: values.instance_url || null,
      environment: values.environment ?? null,
      status: values.status ?? "active",
    }])
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/clients");
  return data as Client;
}

export async function updateClient(id: string, values: ClientFormValues): Promise<Client> {
  values = clientSchema.parse(values);
  const supabase = await createSpaceSupabaseClient();
  const { data, error } = await supabase
    .from("clients")
    .update({
      name: values.name,
      code: values.code ?? null,
      description: values.description ?? null,
      instance_url: values.instance_url || null,
      environment: values.environment ?? null,
      status: values.status ?? "active",
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  return data as Client;
}

export async function deleteClient(id: string): Promise<void> {
  const supabase = await createSpaceSupabaseClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/clients");
}

export async function deleteClients(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const supabase = await createSpaceSupabaseClient();
  const { error } = await supabase.from("clients").delete().in("id", ids);
  if (error) throw new Error(error.message);
  revalidatePath("/clients");
}
