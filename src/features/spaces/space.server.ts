import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import type { AccessibleSpace, SpaceContext } from './space.types';
export const SPACE_COOKIE = 'sn-active-space';
export const getSpaceContext = cache(async (): Promise<SpaceContext> => {
  const db = await createServerSupabaseClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const [{ data: spaces, error }, { data: memberships, error: memberError }, { data: admin, error: adminError }] = await Promise.all([
    db.from('spaces').select('*').order('created_at'),
    db.from('space_members').select('*').eq('user_id', user.id),
    db.from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle(),
  ]);
  if (error || memberError || adminError) throw new Error('Spaces unavailable. Verify the Supabase migration.');
  const available = (spaces ?? []).flatMap(space => {
    const role = memberships?.find(member => member.space_id === space.id)?.role;
    return role ? [{ ...space, role } as AccessibleSpace] : [];
  });
  const preferred = cookies().get(SPACE_COOKIE)?.value;
  const active = available.find(space => space.id === preferred) ?? available.find(space => space.kind === 'personal' && space.owner_id === user.id);
  if (!active) throw new Error('Personal space unavailable. Contact an administrator.');
  return { active, spaces: available, platformAdmin: !!admin };
});
