const {PGlite}=require(process.env.PGLITE_PATH || '@electric-sql/pglite');const fs=require('fs'),assert=require('node:assert/strict');
process.chdir(require('node:path').resolve(__dirname, '..'));
(async()=>{const db=new PGlite();const owner='00000000-0000-4000-8000-000000000001',reader='00000000-0000-4000-8000-000000000002',outsider='00000000-0000-4000-8000-000000000003';
await db.exec(`CREATE ROLE authenticated;CREATE ROLE anon;CREATE SCHEMA auth;CREATE SCHEMA storage;CREATE TABLE auth.users(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),email text,raw_user_meta_data jsonb DEFAULT '{}');CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;GRANT USAGE ON SCHEMA auth,public,storage TO authenticated;GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint);CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text,metadata jsonb,UNIQUE(bucket_id,name));ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;GRANT SELECT,INSERT,DELETE ON storage.objects TO authenticated;`);
await db.exec(fs.readFileSync('supabase/schema.sql','utf8').replace('CREATE EXTENSION IF NOT EXISTS "pgcrypto";',''));await db.exec(fs.readFileSync('supabase/rls.sql','utf8'));await db.exec(fs.readFileSync('supabase/migrations/20261020_development_attachments.sql','utf8'));await db.exec(`INSERT INTO auth.users(id,email) VALUES('${owner}','owner@example.com'),('${reader}','reader@example.com'),('${outsider}','outsider@example.com');INSERT INTO public.clients(id,user_id,name) VALUES('10000000-0000-4000-8000-000000000001','${owner}','Original client');INSERT INTO public.stories(id,user_id,client_id,title) VALUES('20000000-0000-4000-8000-000000000001','${owner}','10000000-0000-4000-8000-000000000001','Original story');INSERT INTO public.developments(id,user_id,client_id,story_id,title,development_type,config) VALUES('30000000-0000-4000-8000-000000000001','${owner}','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Original dev','business_rule','{"script":"keep();"}');`);
await db.exec(`INSERT INTO public.development_attachments(id,development_id,user_id,file_name,size_bytes) VALUES('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','${owner}','source.txt',13);INSERT INTO storage.objects(bucket_id,name,metadata) SELECT 'development-attachments',storage_path,'{"size":13}' FROM public.development_attachments;UPDATE public.development_attachments SET status='ready';`);
const fingerprintSQL = table => `SELECT md5(jsonb_agg(to_jsonb(t)-'space_id'-'copy_job_id' ORDER BY id)::text) AS fingerprint FROM public.${table} t`;
const originalTables=['clients','stories','developments','xml_imports','development_attachments'];const originalPrints={};for(const table of originalTables)originalPrints[table]=(await db.query(fingerprintSQL(table))).rows[0].fingerprint;
for(const file of ['20261020_spaces.sql','20261020_space_copies.sql','20261020_bulk_space_copies.sql'])await db.exec(fs.readFileSync('supabase/migrations/'+file,'utf8'));
for(const table of originalTables)assert.equal((await db.query(fingerprintSQL(table))).rows[0].fingerprint,originalPrints[table],`Existing data/timestamps changed in ${table}`);
async function as(uid){await db.exec(`RESET ROLE;SET request.jwt.claim.sub='${uid}';SET ROLE authenticated;`)}
async function query(sql){return (await db.query(sql)).rows}async function scalar(sql){return Object.values((await query(sql))[0])[0]}async function rejects(sql){await assert.rejects(()=>db.exec(sql));}
await db.exec(fs.readFileSync('supabase/migrations/20261021000100_atomic_xml_import.sql','utf8'));
await as(owner);
const personal=await scalar(`SELECT id FROM public.spaces WHERE kind='personal' AND owner_id='${owner}'`);
const client='10000000-0000-4000-8000-000000000001',story='20000000-0000-4000-8000-000000000001',dev='30000000-0000-4000-8000-000000000001';
async function archive(){return scalar(`INSERT INTO public.xml_imports(user_id,space_id,client_id,story_id,filename,raw_xml,status,parsed_summary) VALUES('${owner}','${personal}','${client}','${story}','fixture.xml','<xml>original &amp; exact</xml>','parsed','{"original":"kept"}') RETURNING id`)}
const component=(title,extra={})=>({xmlTag:'sys_script',developmentType:'business_rule',title,targetTable:'incident',config:{script:'  var x = "é & < >";\n',active:false,order:0},rawXml:'<sys_script>  exact  </sys_script>',selected:true,...extra});
const payload=[component('Created'),component('Updated',{importAction:'update',existingId:dev}),component('Skipped',{importAction:'skip'}),component('Not selected',{selected:false}),component('Missing target fallback',{importAction:'update',existingId:null})];
async function commit(id,items,cl=client,st=story){return scalar(`SELECT public.commit_xml_import('${id}','${personal}','${cl}','${st}',$1::jsonb)`,[JSON.stringify(items)])}
// Parameterized helpers for untrusted/raw component content.
scalar=async function(sql,params){return Object.values((await db.query(sql,params)).rows[0])[0]};
const id=await archive(),before=await scalar('SELECT count(*)::int FROM public.developments');
const result=await commit(id,payload);assert.deepEqual(result,{created:2,updated:1,skipped:1});
assert.equal(await scalar('SELECT count(*)::int FROM public.developments'),before+2);
assert.equal(await scalar(`SELECT raw_xml FROM public.xml_imports WHERE id='${id}'`),'<xml>original &amp; exact</xml>');
assert.equal(await scalar(`SELECT parsed_summary->>'original' FROM public.xml_imports WHERE id='${id}'`),'kept');
assert.equal(await scalar(`SELECT config->>'script' FROM public.developments WHERE id='${dev}'`),payload[1].config.script);
assert.equal(await scalar(`SELECT raw_xml FROM public.developments WHERE id='${dev}'`),payload[1].rawXml);
const snapshot=await scalar(`SELECT md5(jsonb_agg(to_jsonb(d) ORDER BY id)::text) FROM public.developments d`);
assert.deepEqual(await commit(id,payload),result);
assert.equal(await scalar(`SELECT md5(jsonb_agg(to_jsonb(d) ORDER BY id)::text) FROM public.developments d`),snapshot);
await assert.rejects(()=>commit(id,[component('different')]));
await assert.rejects(()=>db.exec(`UPDATE public.xml_imports SET commit_result=NULL,commit_fingerprint=NULL WHERE id='${id}'`));
await db.exec(`UPDATE public.xml_imports SET parsed_summary='{"reanalyzed":true}' WHERE id='${id}'`);
assert.deepEqual(await commit(id,payload),result);

// Later failure must roll back earlier inserts AND earlier successful updates.
const failed=await archive();await assert.rejects(()=>commit(failed,[component('Should roll back'),component('Changed first',{importAction:'update',existingId:dev}),component('Bad target',{importAction:'update',existingId:'30000000-0000-4000-8000-000000000099'})]));
assert.equal(await scalar(`SELECT md5(jsonb_agg(to_jsonb(d) ORDER BY id)::text) FROM public.developments d`),snapshot);
assert.equal(await scalar(`SELECT status FROM public.xml_imports WHERE id='${failed}'`),'parsed');
assert.equal(await scalar(`SELECT commit_result FROM public.xml_imports WHERE id='${failed}'`),null);
const otherStory=await scalar(`INSERT INTO public.stories(user_id,space_id,client_id,title) VALUES('${owner}','${personal}','${client}','Another story') RETURNING id`);
const wrongParentDev=await scalar(`INSERT INTO public.developments(user_id,space_id,client_id,story_id,title,development_type) VALUES('${owner}','${personal}','${client}','${otherStory}','Other dev','ui_script') RETURNING id`);
await assert.rejects(()=>commit(failed,[component('wrong parent',{importAction:'update',existingId:wrongParentDev})]));
await assert.rejects(()=>commit(failed,[component('x')],client,otherStory));
await as(outsider);await assert.rejects(()=>commit(failed,[component('Unauthorized')]));
await as(reader);await assert.rejects(()=>commit(failed,[component('Unauthorized reader')]));
await db.exec('RESET ROLE');
assert.equal(await scalar(`SELECT has_function_privilege('anon','public.commit_xml_import(uuid,uuid,uuid,uuid,jsonb)','EXECUTE')`),false);
console.log('Atomic XML integration passed: unchanged XML/config, create/update/skip/unselected/fallback, same-request retry without writes, rollback after insert/update failure, wrong-parent and cross-user refusal.');
await db.close();})().catch(e=>{console.error(e);process.exitCode=1});
