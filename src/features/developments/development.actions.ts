"use server";

import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";
import type { DevelopmentFormValues, Development } from "./development.types";
import type { Json } from "@/lib/database.types";

export async function getDevelopments(): Promise<Development[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("developments")
    .select("*, stories:story_id(id, title), clients:client_id(id, name)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as unknown as Development[];
}

export async function getDevelopmentsByStory(storyId: string): Promise<Development[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("developments")
    .select("*")
    .eq("story_id", storyId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as unknown as Development[];
}

export async function getDevelopmentsByClient(clientId: string): Promise<Development[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("developments")
    .select("*, stories:story_id(id, title)")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as unknown as Development[];
}

export async function getDevelopment(id: string): Promise<Development> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("developments")
    .select("*, stories:story_id(id, title, client_id), clients:client_id(id, name)")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as Development;
}

export async function createDevelopment(values: DevelopmentFormValues): Promise<Development> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("developments")
    .insert([{
      user_id: user.id,
      story_id: values.story_id,
      client_id: values.client_id,
      title: values.title,
      development_type: values.development_type,
      target_table: values.target_table ?? null,
      application_scope: values.application_scope ?? null,
      update_set: values.update_set ?? null,
      short_description: values.short_description ?? null,
      technical_notes: values.technical_notes ?? null,
      status: values.status ?? "draft",
      config: (values.config ?? {}) as unknown as Json,
    }])
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/developments");
  revalidatePath(`/clients/${values.client_id}/stories/${values.story_id}`);
  return data as unknown as Development;
}

export async function updateDevelopment(id: string, values: DevelopmentFormValues): Promise<Development> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("developments")
    .update({
      title: values.title,
      development_type: values.development_type,
      target_table: values.target_table ?? null,
      application_scope: values.application_scope ?? null,
      update_set: values.update_set ?? null,
      short_description: values.short_description ?? null,
      technical_notes: values.technical_notes ?? null,
      status: values.status ?? "draft",
      config: (values.config ?? {}) as unknown as Json,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/developments");
  revalidatePath(`/clients/${values.client_id}/stories/${values.story_id}/developments/${id}`);
  return data as unknown as Development;
}

export async function deleteDevelopment(id: string, storyId: string, clientId: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("developments").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/developments");
  revalidatePath(`/clients/${clientId}/stories/${storyId}`);
}
