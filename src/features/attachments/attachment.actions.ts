"use server";
import { createSpaceSupabaseClient } from "@/lib/supabaseSpace";
import { ATTACHMENT_BUCKET, validateAttachment } from "./attachment.types";
import { z } from "zod";
const idSchema = z.string().uuid();
async function session() {
  const db = await createSpaceSupabaseClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) throw new Error("Connectez-vous pour gérer les pièces jointes.");
  return { db, user };
}
export async function listDevelopmentAttachments(developmentId: string) {
  idSchema.parse(developmentId);
  const { db } = await session();
  const { data, error } = await db.from("development_attachments").select("*").eq("development_id", developmentId).eq("status", "ready").order("created_at", { ascending: false });
  if (error) throw new Error("Impossible de charger les pièces jointes. Réessayez.");
  return data;
}
export async function reserveDevelopmentAttachment(developmentId: string, file: {name: string; size: number; type?: string}) {
  idSchema.parse(developmentId);
  const metadata = validateAttachment(file);
  const { db, user } = await session();
  const { data, error } = await db.from("development_attachments").insert({ development_id: developmentId, user_id: user.id, ...metadata }).select().single();
  if (error) throw new Error("Ajout impossible : vérifiez votre accès à ce développement.");
  return data;
}
export async function completeDevelopmentAttachment(id: string) {
  idSchema.parse(id);
  const { db } = await session();
  // The DB trigger verifies the uploaded object's existence and exact size.
  const { data, error } = await db.from("development_attachments").update({ status: "ready" }).eq("id", id).select().single();
  if (error) throw new Error("Le fichier n’a pas pu être validé. Réessayez l’ajout.");
  return data;
}
export async function cancelDevelopmentAttachment(id: string) {
  idSchema.parse(id);
  const { db } = await session();
  const { data, error } = await db.from("development_attachments").select("*").eq("id", id).eq("status", "pending").maybeSingle();
  if (error) throw new Error("Impossible de vérifier le transfert interrompu.");
  if (!data) return;
  const { error: removeError } = await db.storage.from(ATTACHMENT_BUCKET).remove([data.storage_path]);
  if (removeError) throw new Error("Le transfert interrompu sera conservé pour vérification.");
  const { error: deleteError } = await db.from("development_attachments").delete().eq("id", id).eq("status", "pending");
  if (deleteError) throw new Error("Impossible de nettoyer le transfert interrompu.");
}
export async function setDevelopmentAttachmentRemoved(id: string, removed: boolean) {
  idSchema.parse(id);
  const { db } = await session();
  const { data, error } = await db.from("development_attachments").update({ deleted_at: removed ? new Date().toISOString() : null }).eq("id", id).eq("status", "ready").select().single();
  if (error) throw new Error("Impossible de modifier cette pièce jointe.");
  return data;
}
