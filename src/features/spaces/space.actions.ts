"use server";
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { getSpaceContext, SPACE_COOKIE } from './space.server';
import { ATTACHMENT_BUCKET } from '@/features/attachments/attachment.types';
import type { CopyFile, CopyKind, CopyPreview, CopyResult, SpaceMember } from './space.types';
const uuid = z.string().uuid();
const batchCopySchema = z.object({ kind: z.enum(['client','story','development']), ids: z.array(uuid).min(1).max(100), target: uuid });
const companySchema = z.object({ name: z.string().trim().min(1).max(100), color: z.string().regex(/^#[a-fA-F0-9]{6}$/), logoUrl: z.union([z.literal(''), z.url().startsWith('https://')]).optional() });
const copySchema = z.object({ kind: z.enum(['client','story','development']), id: uuid, target: uuid, client: uuid.nullish(), story: uuid.nullish() });
export async function switchSpace(id: string) {
  uuid.parse(id);
  const context = await getSpaceContext();
  if (!context.spaces.some(space => space.id === id)) throw new Error('Space not accessible');
  cookies().set(SPACE_COOKIE, id, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 31536000 });
  revalidatePath('/', 'layout');
}
export async function createCompany(values: { name: string; color: string; logoUrl?: string }) {
  const input = companySchema.parse(values); const db = await createServerSupabaseClient();
  const { data, error } = await db.rpc('create_company_space', { p_name: input.name, p_color: input.color, p_logo_url: input.logoUrl || null });
  if (error) throw new Error(error.message);
  revalidatePath('/', 'layout'); return data;
}
export async function updateCompany(id: string, values: { name: string; color: string; logoUrl?: string }) {
  uuid.parse(id); const input = companySchema.parse(values); const db = await createServerSupabaseClient();
  const { error } = await db.rpc('update_company_space', { p_space: id, p_name: input.name, p_color: input.color, p_logo_url: input.logoUrl || null });
  if (error) throw new Error(error.message); revalidatePath('/', 'layout');
}
export async function setSpaceMember(id: string, email: string, role: 'reader'|'contributor'|'admin'|null) {
  uuid.parse(id); z.email().parse(email); z.enum(['reader','contributor','admin']).nullable().parse(role);
  const db = await createServerSupabaseClient();
  const { error } = await db.rpc('set_space_member', { p_space: id, p_email: email, p_role: role });
  if (error) throw new Error(error.message); revalidatePath('/', 'layout');
}
export async function listSpaceMembers(id: string): Promise<SpaceMember[]> {
  uuid.parse(id); const db = await createServerSupabaseClient();
  const { data, error } = await db.rpc('list_space_members', { p_space: id });
  if (error) throw new Error(error.message); return data as SpaceMember[];
}
export async function getCopyParents(target: string) {
  uuid.parse(target); const db = await createServerSupabaseClient();
  const [{ data: clients, error }, { data: stories, error: storyError }] = await Promise.all([
    db.from('clients').select('id,name').eq('space_id', target).order('name'),
    db.from('stories').select('id,client_id,title').eq('space_id', target).order('title'),
  ]);
  if (error || storyError) throw new Error(error?.message ?? storyError?.message);
  return { clients: clients ?? [], stories: stories ?? [] };
}
export async function previewSpaceCopy(kind: CopyKind, id: string, target: string): Promise<CopyPreview> {
  copySchema.parse({kind,id,target}); const db = await createServerSupabaseClient();
  const { data, error } = await db.rpc('preview_space_copy', { p_kind: kind, p_id: id, p_target: target });
  if (error) throw new Error(error.message); return data as unknown as CopyPreview;
}
export async function copyToSpace(input: { kind: CopyKind; id: string; target: string; client?: string | null; story?: string | null }): Promise<CopyResult> {
  const values = copySchema.parse(input); const db = await createServerSupabaseClient();
  const { data: job, error } = await db.rpc('begin_space_copy', { p_kind: values.kind, p_id: values.id, p_target: values.target, p_client: values.client ?? null, p_story: values.story ?? null });
  if (error) throw new Error(error.message);
  return resumeSpaceCopy(job);
}
export async function resumeSpaceCopy(job: string): Promise<CopyResult> {
  uuid.parse(job); const db = await createServerSupabaseClient();
  const { data, error } = await db.rpc('get_space_copy_files', { p_job: job });
  if (error) throw new Error(error.message);
  const files = data as unknown as CopyFile[];
  for (const file of files) {
    if (file.copied) continue;
    const { error: copyError } = await db.storage.from(ATTACHMENT_BUCKET).copy(file.source_path, file.target_path);
    if (copyError) throw new Error(`File copy interrupted. Resume this copy in Spaces. ${copyError.message}`);
  }
  const { data: result, error: finishError } = await db.rpc('finish_space_copy', { p_job: job });
  if (finishError) throw new Error(finishError.message);
  revalidatePath('/', 'layout'); return result as unknown as CopyResult;
}

export async function previewSpaceCopyBatch(kind: CopyKind, ids: string[], target: string): Promise<CopyPreview> {
  const values = batchCopySchema.parse({kind,ids,target}); const db = await createServerSupabaseClient();
  const {data,error} = await db.rpc('preview_space_copy_batch', {p_kind: values.kind,p_ids: values.ids,p_target: values.target});
  if(error) throw new Error(error.message); return data as unknown as CopyPreview;
}
export async function copyToSpaceBatch(input: {kind: CopyKind; ids: string[]; target: string}): Promise<CopyResult> {
  const values = batchCopySchema.parse(input); const db = await createServerSupabaseClient();
  const {data,error} = await db.rpc('begin_space_copy_batch', {p_kind: values.kind,p_ids: values.ids,p_target: values.target});
  if(error) throw new Error(error.message); return resumeSpaceCopy(data);
}
