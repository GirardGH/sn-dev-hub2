import { NextResponse } from "next/server";
import { createSpaceSupabaseClient } from "@/lib/supabaseSpace";
import { ATTACHMENT_BUCKET } from "@/features/attachments/attachment.types";
import { z } from "zod";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  if (!z.string().uuid().safeParse(params.id).success) return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  const db = await createSpaceSupabaseClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  const { data, error } = await db.from("development_attachments").select("*").eq("id", params.id).eq("status", "ready").is("deleted_at", null).single();
  if (error || !data) return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  const { data: signed, error: storageError } = await db.storage.from(ATTACHMENT_BUCKET).createSignedUrl(data.storage_path, 60, { download: data.file_name });
  if (storageError || !signed) return NextResponse.json({ error: "Téléchargement indisponible" }, { status: 503 });
  const response = NextResponse.redirect(signed.signedUrl);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
