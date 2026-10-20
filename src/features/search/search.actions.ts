"use server";

import { createSpaceSupabaseClient } from "@/lib/supabaseSpace";

export interface ClientResult {
  id: string;
  name: string;
  code: string | null;
}

export interface StoryResult {
  id: string;
  client_id: string;
  reference: string | null;
  title: string;
}

export interface DevelopmentResult {
  id: string;
  client_id: string;
  story_id: string;
  title: string;
  development_type: string;
}

export interface SearchAllResult {
  clients: ClientResult[];
  stories: StoryResult[];
  developments: DevelopmentResult[];
}

export async function searchAll(query: string): Promise<SearchAllResult> {
  const q = query.trim();
  if (q.length < 2) {
    return { clients: [], stories: [], developments: [] };
  }

  const supabase = await createSpaceSupabaseClient();
  // .or() uses PostgREST URL filter syntax where * is the wildcard for ilike (not %)
  const safeQ = q.replace(/[*%]/g, "\\$&");
  const pattern = `*${safeQ}*`;

  const [clientsRes, storiesRes, devsRes] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, code")
      .or(`name.ilike.${pattern},code.ilike.${pattern},description.ilike.${pattern}`)
      .limit(5),

    supabase
      .from("stories")
      .select("id, client_id, reference, title")
      .or(`reference.ilike.${pattern},title.ilike.${pattern},description.ilike.${pattern}`)
      .limit(5),

    supabase
      .from("developments")
      .select("id, client_id, story_id, title, development_type")
      .or(
        `title.ilike.${pattern},short_description.ilike.${pattern},target_table.ilike.${pattern},development_type.ilike.${pattern},technical_notes.ilike.${pattern}`
      )
      .limit(5),
  ]);

  if (clientsRes.error) console.error("[search] clients:", clientsRes.error.message);
  if (storiesRes.error) console.error("[search] stories:", storiesRes.error.message);
  if (devsRes.error) console.error("[search] developments:", devsRes.error.message);

  return {
    clients: (clientsRes.data ?? []) as ClientResult[],
    stories: (storiesRes.data ?? []) as StoryResult[],
    developments: (devsRes.data ?? []) as DevelopmentResult[],
  };
}
