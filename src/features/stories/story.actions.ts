"use server";

import { createSpaceSupabaseClient } from "@/lib/supabaseSpace";
import { revalidatePath } from "next/cache";
import type { StoryFormValues, Story } from "./story.types";

export async function getStories(): Promise<Story[]> {
  const supabase = await createSpaceSupabaseClient();
  const { data, error } = await supabase
    .from("stories")
    .select("id, user_id, client_id, reference, title, description, functional_need, technical_solution, status, priority, estimated_uo, created_at, updated_at, clients:client_id(id, name, code, status, user_id, description, instance_url, environment, created_at, updated_at)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as unknown as Story[];
}

export async function getStoriesByClient(clientId: string): Promise<Story[]> {
  const supabase = await createSpaceSupabaseClient();
  const { data, error } = await supabase
    .from("stories")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as Story[];
}

export async function getStory(id: string): Promise<Story> {
  const supabase = await createSpaceSupabaseClient();
  const { data, error } = await supabase
    .from("stories")
    .select("id, user_id, client_id, reference, title, description, functional_need, technical_solution, status, priority, estimated_uo, created_at, updated_at, clients:client_id(id, name, code, status, user_id, description, instance_url, environment, created_at, updated_at)")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as Story;
}

export async function createStory(values: StoryFormValues): Promise<Story> {
  const supabase = await createSpaceSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("stories")
    .insert([{
      user_id: user.id,
      client_id: values.client_id,
      reference: values.reference ?? null,
      title: values.title,
      description: values.description ?? null,
      functional_need: values.functional_need ?? null,
      technical_solution: values.technical_solution ?? null,
      status: values.status ?? "draft",
      priority: values.priority ?? null,
      estimated_uo: values.estimated_uo ?? null,
    }])
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/stories");
  revalidatePath(`/clients/${values.client_id}`);
  return data as Story;
}

export async function updateStory(id: string, values: StoryFormValues): Promise<Story> {
  const supabase = await createSpaceSupabaseClient();
  const { data, error } = await supabase
    .from("stories")
    .update({
      reference: values.reference ?? null,
      title: values.title,
      description: values.description ?? null,
      functional_need: values.functional_need ?? null,
      technical_solution: values.technical_solution ?? null,
      status: values.status ?? "draft",
      priority: values.priority ?? null,
      estimated_uo: values.estimated_uo ?? null,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/stories");
  revalidatePath(`/clients/${values.client_id}/stories/${id}`);
  return data as Story;
}

export async function deleteStory(id: string, clientId: string): Promise<void> {
  const supabase = await createSpaceSupabaseClient();
  const { error } = await supabase.from("stories").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/stories");
  revalidatePath(`/clients/${clientId}`);
}

export async function deleteStories(ids: string[], clientId?: string): Promise<void> {
  if (ids.length === 0) return;
  const supabase = await createSpaceSupabaseClient();
  const { error } = await supabase.from("stories").delete().in("id", ids);
  if (error) throw new Error(error.message);
  revalidatePath("/stories");
  if (clientId) revalidatePath(`/clients/${clientId}`);
}
