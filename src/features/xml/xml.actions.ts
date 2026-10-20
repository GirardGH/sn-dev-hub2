"use server";

import { createSpaceSupabaseClient } from "@/lib/supabaseSpace";
import { revalidatePath } from "next/cache";
import type { ParsedComponent, XmlImport } from "./xml.types";
import type { Json } from "@/lib/database.types";

export async function getXmlImports(): Promise<XmlImport[]> {
  const supabase = await createSpaceSupabaseClient();
  const { data, error } = await supabase
    .from("xml_imports")
    .select("*, clients:client_id(id, name), stories:story_id(id, title)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as unknown as XmlImport[];
}

export async function getXmlImport(id: string): Promise<XmlImport> {
  const supabase = await createSpaceSupabaseClient();
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
  const supabase = await createSpaceSupabaseClient();
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

export async function checkExistingDevelopments(params: {
  storyId: string;
  clientId: string;
  components: Array<{
    title: string;
    developmentType: string;
    sysId?: string | null;
  }>;
}): Promise<Array<{ existingId: string | null; matchedBy: "sys_id" | "title_type" | null }>> {
  const supabase = await createSpaceSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: existing, error } = await supabase
    .from("developments")
    .select("id, title, development_type, config")
    .eq("story_id", params.storyId)
    .eq("client_id", params.clientId);

  if (error) throw new Error(error.message);

  const existingDevs = (existing ?? []) as Array<{
    id: string;
    title: string;
    development_type: string;
    config: Record<string, unknown>;
  }>;

  return params.components.map(({ title, developmentType, sysId }) => {
    if (sysId) {
      const byId = existingDevs.find(
        (d) =>
          typeof d.config?.sys_id === "string" &&
          d.config.sys_id.toLowerCase() === sysId.toLowerCase()
      );
      if (byId) return { existingId: byId.id, matchedBy: "sys_id" as const };
    }

    const byTitle = existingDevs.find(
      (d) =>
        d.development_type === developmentType &&
        d.title.toLowerCase() === title.toLowerCase()
    );
    if (byTitle) return { existingId: byTitle.id, matchedBy: "title_type" as const };

    return { existingId: null, matchedBy: null };
  });
}

export async function createDevelopmentsFromXmlImport(params: {
  xmlImportId: string;
  storyId: string;
  clientId: string;
  components: ParsedComponent[];
}): Promise<{ created: number; updated: number; skipped: number }> {
  const supabase = await createSpaceSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const selected = params.components.filter((c) => c.selected);

  const toCreate = selected.filter(
    (c) =>
      !c.importAction ||
      c.importAction === "create" ||
      (c.importAction === "update" && !c.existingId)
  );
  const toUpdate = selected.filter(
    (c) => c.importAction === "update" && !!c.existingId
  );
  const toSkip = selected.filter((c) => c.importAction === "skip");

  // Batch insert new developments
  if (toCreate.length > 0) {
    const inserts = toCreate.map((c) => ({
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
    const { error } = await supabase.from("developments").insert(inserts);
    if (error) throw new Error(error.message);
  }

  // Update existing developments one by one
  for (const c of toUpdate) {
    const { error } = await supabase
      .from("developments")
      .update({
        title: c.title,
        development_type: c.developmentType,
        target_table: c.targetTable ?? null,
        config: c.config as unknown as Json,
        raw_xml: c.rawXml,
        xml_import_id: params.xmlImportId,
      })
      .eq("id", c.existingId!);
    if (error) throw new Error(error.message);
  }

  const created = toCreate.length;
  const updated = toUpdate.length;
  const skipped = toSkip.length;

  const { error: updateError } = await supabase
    .from("xml_imports")
    .update({
      created_developments_count: created + updated,
      status: "imported",
    })
    .eq("id", params.xmlImportId);
  if (updateError) throw new Error(updateError.message);

  revalidatePath("/developments");
  revalidatePath("/xml-imports");
  revalidatePath(`/clients/${params.clientId}/stories/${params.storyId}`);

  return { created, updated, skipped };
}

export async function updateXmlImportAnalysis(
  id: string,
  parsedSummary: Record<string, unknown>
): Promise<void> {
  const supabase = await createSpaceSupabaseClient();
  const { error } = await supabase
    .from("xml_imports")
    .update({ parsed_summary: parsedSummary as unknown as Json })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/xml-imports/${id}`);
  revalidatePath("/xml-imports");
}

export async function getDevelopmentsByXmlImport(
  xmlImportId: string
): Promise<Array<{ id: string; title: string; development_type: string; story_id: string; client_id: string }>> {
  const supabase = await createSpaceSupabaseClient();
  const { data, error } = await supabase
    .from("developments")
    .select("id, title, development_type, story_id, client_id")
    .eq("xml_import_id", xmlImportId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{ id: string; title: string; development_type: string; story_id: string; client_id: string }>;
}

export async function deleteXmlImport(id: string): Promise<void> {
  const supabase = await createSpaceSupabaseClient();
  const { error } = await supabase.from("xml_imports").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/xml-imports");
}

export async function deleteXmlImports(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const supabase = await createSpaceSupabaseClient();
  const { error } = await supabase.from("xml_imports").delete().in("id", ids);
  if (error) throw new Error(error.message);
  revalidatePath("/xml-imports");
}
