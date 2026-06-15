"use server";

import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";
import type { ParsedComponent, XmlImport } from "./xml.types";
import type { Json } from "@/lib/database.types";

export async function getXmlImports(): Promise<XmlImport[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("xml_imports")
    .select("*, clients:client_id(id, name), stories:story_id(id, title)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as unknown as XmlImport[];
}

export async function getXmlImport(id: string): Promise<XmlImport> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("xml_imports")
    .select("*, clients:client_id(id, name), stories:story_id(id, title)")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as XmlImport;
}

export async function createXmlImport(params: {
  filename: string;
  raw_xml: string;
  client_id?: string;
  story_id?: string;
  parsed_summary?: Record<string, unknown>;
}): Promise<XmlImport> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("xml_imports")
    .insert([{
      user_id: user.id,
      filename: params.filename,
      raw_xml: params.raw_xml,
      client_id: params.client_id ?? null,
      story_id: params.story_id ?? null,
      parsed_summary: (params.parsed_summary ?? {}) as unknown as Json,
      status: "parsed",
    }])
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/xml-imports");
  return data as unknown as XmlImport;
}

export async function createDevelopmentsFromXmlImport(params: {
  xmlImportId: string;
  storyId: string;
  clientId: string;
  components: ParsedComponent[];
}): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const toInsert = params.components
    .filter((c) => c.selected)
    .map((c) => ({
      user_id: user.id,
      story_id: params.storyId,
      client_id: params.clientId,
      title: c.title,
      development_type: c.developmentType,
      target_table: c.targetTable ?? null,
      config: c.config as unknown as Json,
      raw_xml: c.rawXml,
      xml_import_id: params.xmlImportId,
      status: "draft",
    }));

  if (toInsert.length === 0) return;

  const { error: devError } = await supabase
    .from("developments")
    .insert(toInsert);
  if (devError) throw new Error(devError.message);

  const { error: updateError } = await supabase
    .from("xml_imports")
    .update({
      created_developments_count: toInsert.length,
      status: "imported",
    })
    .eq("id", params.xmlImportId);
  if (updateError) throw new Error(updateError.message);

  revalidatePath("/developments");
  revalidatePath("/xml-imports");
  revalidatePath(`/clients/${params.clientId}/stories/${params.storyId}`);
}

export async function deleteXmlImport(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("xml_imports").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/xml-imports");
}
