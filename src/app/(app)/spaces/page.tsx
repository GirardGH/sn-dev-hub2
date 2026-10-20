import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { getSpaceContext } from '@/features/spaces/space.server';
import { listSpaceMembers } from '@/features/spaces/space.actions';
import { SpacesClient } from '@/features/spaces/SpacesClient';
export default async function SpacesPage(){
 const db=await createServerSupabaseClient();const context=await getSpaceContext();
 const [{data:companies,error},{data:pending,error:copyError}]=await Promise.all([
  db.from('spaces').select('*').eq('kind','company').order('name'),
  db.from('space_copy_jobs').select('id,source_kind,source_id,target_space_id,created_at,result').eq('status','pending').order('created_at',{ascending:false}),
 ]);
 if(error||copyError)throw new Error(error?.message??copyError?.message);
 const manageable=await Promise.all((companies??[]).map(async company=>{
  const canManage=context.platformAdmin||context.spaces.find(space=>space.id===company.id)?.role==='admin';
  return {...company,canManage,members:canManage?await listSpaceMembers(company.id):[]};
 }));
 return <SpacesClient companies={manageable} pendingCopies={pending??[]}/>;
}
