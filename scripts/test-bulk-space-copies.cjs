const {PGlite}=require(process.env.PGLITE_PATH || '@electric-sql/pglite');const fs=require('fs'),assert=require('node:assert/strict');
process.chdir(require('node:path').resolve(__dirname, '..'));
(async()=>{const db=new PGlite();const owner='00000000-0000-4000-8000-000000000001',reader='00000000-0000-4000-8000-000000000002',outsider='00000000-0000-4000-8000-000000000003';
await db.exec(`CREATE ROLE authenticated;CREATE ROLE anon;CREATE SCHEMA auth;CREATE SCHEMA storage;CREATE TABLE auth.users(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),email text,raw_user_meta_data jsonb DEFAULT '{}');CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;GRANT USAGE ON SCHEMA auth,public,storage TO authenticated;GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint);CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text,metadata jsonb,UNIQUE(bucket_id,name));ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;GRANT SELECT,INSERT,DELETE ON storage.objects TO authenticated;`);
await db.exec(fs.readFileSync('supabase/schema.sql','utf8').replace('CREATE EXTENSION IF NOT EXISTS "pgcrypto";',''));await db.exec(fs.readFileSync('supabase/rls.sql','utf8'));await db.exec(fs.readFileSync('supabase/migrations/20261020_development_attachments.sql','utf8'));await db.exec(`INSERT INTO auth.users(id,email) VALUES('${owner}','owner@example.com'),('${reader}','reader@example.com'),('${outsider}','outsider@example.com');INSERT INTO public.clients(id,user_id,name) VALUES('10000000-0000-4000-8000-000000000001','${owner}','Original client');INSERT INTO public.stories(id,user_id,client_id,title) VALUES('20000000-0000-4000-8000-000000000001','${owner}','10000000-0000-4000-8000-000000000001','Original story');INSERT INTO public.developments(id,user_id,client_id,story_id,title,development_type,config) VALUES('30000000-0000-4000-8000-000000000001','${owner}','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Original dev','business_rule','{"script":"keep();"}');`);
await db.exec(`INSERT INTO public.development_attachments(id,development_id,user_id,file_name,size_bytes) VALUES('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','${owner}','source.txt',13);INSERT INTO storage.objects(bucket_id,name,metadata) SELECT 'development-attachments',storage_path,'{"size":13}' FROM public.development_attachments;UPDATE public.development_attachments SET status='ready';`);
const fingerprintSQL = table => `SELECT md5(jsonb_agg(to_jsonb(t)-'space_id'-'copy_job_id' ORDER BY id)::text) AS fingerprint FROM public.${table} t`;
const originalTables=['clients','stories','developments','xml_imports','development_attachments'];const originalPrints={};for(const table of originalTables)originalPrints[table]=(await db.query(fingerprintSQL(table))).rows[0].fingerprint;
for(const file of ['20261020_spaces.sql','20261020_space_copies.sql','20261020_bulk_space_copies.sql','20261022_archive_copy_identity.sql'])await db.exec(fs.readFileSync('supabase/migrations/'+file,'utf8'));
for(const table of originalTables)assert.equal((await db.query(fingerprintSQL(table))).rows[0].fingerprint,originalPrints[table],`Existing data/timestamps changed in ${table}`);
async function as(uid){await db.exec(`RESET ROLE;SET request.jwt.claim.sub='${uid}';SET ROLE authenticated;`)}
async function query(sql){return (await db.query(sql)).rows}async function scalar(sql){return Object.values((await query(sql))[0])[0]}async function rejects(sql){await assert.rejects(()=>db.exec(sql));}

await db.exec(`RESET ROLE;INSERT INTO public.platform_admins VALUES('${owner}');`);
await as(owner);
const target=await scalar("SELECT public.create_company_space('Shared company')");
const personal=await scalar("SELECT id FROM public.spaces WHERE kind='personal'");
await db.exec(`SELECT public.set_space_member('${target}','reader@example.com','contributor')`);
const sourceClient='10000000-0000-4000-8000-000000000001',sourceStory='20000000-0000-4000-8000-000000000001',sourceDev='30000000-0000-4000-8000-000000000001';
const existingClient=await scalar(`INSERT INTO public.clients(user_id,space_id,name,description) VALUES('${owner}','${target}','  ORIGINAL  CLIENT  ','target client kept') RETURNING id`);
const existingStory=await scalar(`INSERT INTO public.stories(user_id,space_id,client_id,title,description) VALUES('${owner}','${target}','${existingClient}','original story','target story kept') RETURNING id`);
const existingDev=await scalar(`INSERT INTO public.developments(user_id,space_id,client_id,story_id,title,development_type,config) VALUES('${owner}','${target}','${existingClient}','${existingStory}','original DEV','ui_script','{"script":"target();"}') RETURNING id`);
const noOp=await scalar(`SELECT public.preview_space_copy_batch('development',ARRAY['${sourceDev}']::uuid[],'${target}')`);
assert.equal(noOp.clients,0);assert.equal(noOp.stories,0);assert.equal(noOp.developments,0);assert.equal(noOp.attachments,0);assert.equal(noOp.reused_developments,1);
const noOpJob=await scalar(`SELECT public.begin_space_copy_batch('development',ARRAY['${sourceDev}']::uuid[],'${target}')`);
await db.exec(`SELECT public.finish_space_copy('${noOpJob}')`);
assert.equal(await scalar(`SELECT config->>'script' FROM public.developments WHERE id='${existingDev}'`),'target();');
assert.equal(await scalar(`SELECT count(*)::int FROM public.development_attachments WHERE development_id='${existingDev}'`),0);
const dev2='30000000-0000-4000-8000-000000000002';
await db.exec(`INSERT INTO public.developments(id,user_id,space_id,client_id,story_id,title,development_type) VALUES('${dev2}','${owner}','${personal}','${sourceClient}','${sourceStory}','New dev','business_rule')`);
// Copying an existing story still walks its descendants and adds only missing devs.
const storyPreview=await scalar(`SELECT public.preview_space_copy_batch('story',ARRAY['${sourceStory}']::uuid[],'${target}')`);
assert.equal(storyPreview.clients,0);assert.equal(storyPreview.stories,0);assert.equal(storyPreview.developments,1);
const storyJob=await scalar(`SELECT public.begin_space_copy_batch('story',ARRAY['${sourceStory}']::uuid[],'${target}')`);
await db.exec(`SELECT public.finish_space_copy('${storyJob}')`);
assert.equal(await scalar(`SELECT count(*)::int FROM public.developments WHERE story_id='${existingStory}'`),2);
// A different consultant has different IDs but the same client/story names.
await as(reader);const readerPersonal=await scalar(`SELECT id FROM public.spaces WHERE kind='personal' AND owner_id='${reader}'`);
const client2=await scalar(`INSERT INTO public.clients(user_id,space_id,name) VALUES('${reader}','${readerPersonal}','Original client') RETURNING id`);
const story2=await scalar(`INSERT INTO public.stories(user_id,space_id,client_id,title) VALUES('${reader}','${readerPersonal}','${client2}',' Original   Story ') RETURNING id`);
const d3=await scalar(`INSERT INTO public.developments(user_id,space_id,client_id,story_id,title,development_type) VALUES('${reader}','${readerPersonal}','${client2}','${story2}','NEW DEV','business_rule') RETURNING id`);
const d4=await scalar(`INSERT INTO public.developments(user_id,space_id,client_id,story_id,title,development_type) VALUES('${reader}','${readerPersonal}','${client2}','${story2}','Third dev','business_rule') RETURNING id`);
const batch=await scalar(`SELECT public.preview_space_copy_batch('development',ARRAY['${d3}','${d4}','${d4}']::uuid[],'${target}')`);
assert.equal(batch.selected_records,2);assert.equal(batch.clients,0);assert.equal(batch.stories,0);assert.equal(batch.developments,1);
const batchJob=await scalar(`SELECT public.begin_space_copy_batch('development',ARRAY['${d3}','${d4}']::uuid[],'${target}')`);
assert.equal(await scalar(`SELECT public.begin_space_copy_batch('development',ARRAY['${d4}','${d3}']::uuid[],'${target}')`),batchJob);
await db.exec(`SELECT public.finish_space_copy('${batchJob}')`);
assert.equal(await scalar(`SELECT count(*)::int FROM public.clients WHERE space_id='${target}'`),1);
assert.equal(await scalar(`SELECT count(*)::int FROM public.stories WHERE space_id='${target}'`),1);
assert.equal(await scalar(`SELECT count(*)::int FROM public.developments WHERE space_id='${target}'`),3);
// New shared ancestors within the same batch are allocated once, including files.
await as(owner);const newTarget=await scalar("SELECT public.create_company_space('Empty destination')");
const allPlan=await scalar(`SELECT public.preview_space_copy_batch('development',ARRAY['${sourceDev}','${dev2}']::uuid[],'${newTarget}')`);
assert.equal(allPlan.clients,1);assert.equal(allPlan.stories,1);assert.equal(allPlan.developments,2);assert.equal(allPlan.attachments,1);
const allJob=await scalar(`SELECT public.begin_space_copy_batch('development',ARRAY['${sourceDev}','${dev2}']::uuid[],'${newTarget}')`);
assert.equal(await scalar(`SELECT count(*)::int FROM public.clients WHERE space_id='${newTarget}'`),0);
await rejects(`SELECT public.finish_space_copy('${allJob}')`);
const files=await scalar(`SELECT public.get_space_copy_files('${allJob}')`);
for(const f of files)await db.exec(`INSERT INTO storage.objects(bucket_id,name,metadata) VALUES('development-attachments','${f.target_path}','{"size":13}')`);
await db.exec(`SELECT public.finish_space_copy('${allJob}')`);
assert.equal(await scalar(`SELECT count(*)::int FROM public.clients WHERE space_id='${newTarget}'`),1);
assert.equal(await scalar(`SELECT count(*)::int FROM public.stories WHERE space_id='${newTarget}'`),1);
assert.equal(await scalar(`SELECT count(*)::int FROM public.developments WHERE space_id='${newTarget}'`),2);
// Repeating whole client copy skips existing records but still includes later new descendants.
const again=await scalar(`SELECT public.preview_space_copy_batch('client',ARRAY['${sourceClient}']::uuid[],'${newTarget}')`);assert.equal(again.developments,0);
// Matching is parent-scoped: same story/dev titles under another client stay separate.
const otherClient=await scalar(`INSERT INTO public.clients(user_id,space_id,name) VALUES('${owner}','${personal}','Other client') RETURNING id`);
const otherStory=await scalar(`INSERT INTO public.stories(user_id,space_id,client_id,title) VALUES('${owner}','${personal}','${otherClient}','Original story') RETURNING id`);
const otherDev=await scalar(`INSERT INTO public.developments(user_id,space_id,client_id,story_id,title,development_type) VALUES('${owner}','${personal}','${otherClient}','${otherStory}','Original dev','ui_script') RETURNING id`);
const scoped=await scalar(`SELECT public.preview_space_copy_batch('development',ARRAY['${otherDev}']::uuid[],'${target}')`);assert.equal(scoped.clients,1);assert.equal(scoped.stories,1);assert.equal(scoped.developments,1);
// Pre-existing ambiguity stops the entire operation before any row is created.
await db.exec(`INSERT INTO public.clients(user_id,space_id,name) VALUES('${owner}','${target}','ORIGINAL CLIENT')`);
const beforeJobs=await scalar('SELECT count(*)::int FROM public.space_copy_jobs');
await rejects(`SELECT public.begin_space_copy_batch('development',ARRAY['${sourceDev}']::uuid[],'${target}')`);
assert.equal(await scalar('SELECT count(*)::int FROM public.space_copy_jobs'),beforeJobs);
// Names collapsing within a batch must also collapse children without orphans.
const cdup=await scalar(`INSERT INTO public.clients(user_id,space_id,name) VALUES('${owner}','${personal}',' original client ') RETURNING id`);
const sdup=await scalar(`INSERT INTO public.stories(user_id,space_id,client_id,title) VALUES('${owner}','${personal}','${cdup}','Original STORY') RETURNING id`);
const ddup=await scalar(`INSERT INTO public.developments(user_id,space_id,client_id,story_id,title,development_type) VALUES('${owner}','${personal}','${cdup}','${sdup}','Original dev','ui_script') RETURNING id`);
const third=await scalar("SELECT public.create_company_space('Name collapse test')");
const collapse=await scalar(`SELECT public.preview_space_copy_batch('client',ARRAY['${sourceClient}','${cdup}']::uuid[],'${third}')`);
assert.equal(collapse.clients,1);assert.equal(collapse.stories,1);assert.equal(collapse.developments,2);
const collapseJob=await scalar(`SELECT public.begin_space_copy_batch('client',ARRAY['${sourceClient}','${cdup}']::uuid[],'${third}')`);
for(const f of await scalar(`SELECT public.get_space_copy_files('${collapseJob}')`))await db.exec(`INSERT INTO storage.objects(bucket_id,name,metadata) VALUES('development-attachments','${f.target_path}','{"size":13}')`);
await db.exec(`SELECT public.finish_space_copy('${collapseJob}')`);
assert.equal(await scalar(`SELECT count(*)::int FROM public.developments d JOIN public.stories s ON s.id=d.story_id JOIN public.clients c ON c.id=s.client_id WHERE d.space_id='${third}' AND d.client_id=c.id AND s.space_id=d.space_id AND c.space_id=d.space_id`),2);
await rejects(`SELECT public.preview_space_copy_batch('development','{}'::uuid[],'${target}')`);
await rejects(`SELECT public.preview_space_copy_batch('development',ARRAY['${sourceDev}',NULL]::uuid[],'${target}')`);
await as(outsider);await rejects(`SELECT public.begin_space_copy_batch('development',ARRAY['${sourceDev}']::uuid[],'${newTarget}')`);
await as(reader);await rejects(`SELECT public.preview_space_copy_batch('development',ARRAY['${sourceDev}','${d3}']::uuid[],'${target}')`);
await rejects(`SELECT public.start_space_copy_batch('development',ARRAY['${d3}']::uuid[],'${target}')`);
await as(owner);
// Archive repair: same titles across tables, sys_ids and versions must survive.
const archiveTarget=await scalar("SELECT public.create_company_space('Archive identity regression')");
const archiveIds=[];
for(const [type,sysid,value] of [['sys_decision_input','a'.repeat(32),'reason'],['sys_decision_input','b'.repeat(32),'country'],['sys_metadata_link','a'.repeat(32),'reason'],['sys_decision_input','a'.repeat(32),'reason updated']]) {
 archiveIds.push(await scalar(`INSERT INTO public.developments(user_id,space_id,client_id,story_id,title,development_type,config,raw_xml) VALUES('${owner}','${personal}','${sourceClient}','${sourceStory}','Identical label','${type}','${JSON.stringify({sys_id:sysid,element:value})}','<record>${value}</record>') RETURNING id`));
}
// Simulate the previous faulty copy: one target record and links from all source objects.
const archiveFirst=await scalar(`SELECT public.begin_space_copy_batch('development',ARRAY['${archiveIds[0]}']::uuid[],'${archiveTarget}')`);
await db.exec(`SELECT public.finish_space_copy('${archiveFirst}')`);
const originalArchiveTarget=await scalar(`SELECT target_id FROM public.space_copy_links WHERE entity='development' AND source_id='${archiveIds[0]}' AND target_space_id='${archiveTarget}'`);
await db.exec(`RESET ROLE`);
for(const id of archiveIds.slice(1)) await db.exec(`INSERT INTO public.space_copy_links VALUES('development','${id}','${archiveTarget}','${originalArchiveTarget}','${archiveFirst}')`);
await as(owner);
const repairPreview=await scalar(`SELECT public.preview_space_copy_batch('development',ARRAY[${archiveIds.map(id=>"'"+id+"'").join(',')}]::uuid[],'${archiveTarget}')`);
assert.equal(repairPreview.developments,3);assert.equal(repairPreview.reused_developments,1);
const repairJob=await scalar(`SELECT public.begin_space_copy_batch('development',ARRAY[${archiveIds.map(id=>"'"+id+"'").join(',')}]::uuid[],'${archiveTarget}')`);
await db.exec(`SELECT public.finish_space_copy('${repairJob}')`);
assert.equal(await scalar(`SELECT count(*)::int FROM public.developments WHERE space_id='${archiveTarget}'`),4);
assert.equal(await scalar(`SELECT config->>'element' FROM public.developments WHERE id='${originalArchiveTarget}'`),'reason');
const repeatRepair=await scalar(`SELECT public.preview_space_copy_batch('development',ARRAY[${archiveIds.map(id=>"'"+id+"'").join(',')}]::uuid[],'${archiveTarget}')`);
assert.equal(repeatRepair.developments,0);
// Identical archive from another source ID is still reused.
const identicalArchive=await scalar(`INSERT INTO public.developments(user_id,space_id,client_id,story_id,title,development_type,config,raw_xml) SELECT user_id,space_id,client_id,story_id,title,development_type,config,raw_xml FROM public.developments WHERE id='${archiveIds[0]}' RETURNING id`);
assert.equal((await scalar(`SELECT public.preview_space_copy_batch('development',ARRAY['${identicalArchive}']::uuid[],'${archiveTarget}')`)).developments,0);

console.log('Bulk copy integration passed: cross-user name reuse, cascading parents, missing descendants, staged files, repeat/resume, parent-scoped names, ambiguity rollback, batch collapse and denied access.');
await db.close();})().catch(e=>{console.error(e);process.exitCode=1});
