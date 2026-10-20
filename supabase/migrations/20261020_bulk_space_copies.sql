BEGIN;
-- Identity for sharing: case-insensitive names, trimmed and collapsed whitespace.
-- This intentionally does not merge historical records or overwrite their content.
CREATE FUNCTION public.space_copy_name(p_value text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT lower(btrim(regexp_replace(coalesce(p_value,''), '[[:space:]]+', ' ', 'g')))
$$;
CREATE FUNCTION public.space_copy_batch_plan(p_kind text,p_ids uuid[],p_target uuid,p_client uuid DEFAULT NULL,p_story uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE ids uuid[]; rid uuid; one_plan jsonb; source_space uuid; client_ids uuid[]:='{}'; story_ids uuid[]:='{}'; dev_ids uuid[]:='{}';
 entries jsonb:='[]'; item record; entity text; source_id uuid; parent_client uuid; parent_story uuid;
 candidates uuid[]; tid uuid; reused boolean; key_name text; entry jsonb; roots jsonb:='[]'; files int;
BEGIN
 SELECT array_agg(id ORDER BY id) INTO ids FROM (SELECT DISTINCT unnest(p_ids) id) q;
 IF ids IS NULL OR cardinality(ids)<1 OR cardinality(ids)>100 OR array_position(ids,NULL) IS NOT NULL THEN RAISE EXCEPTION 'Select between 1 and 100 records'; END IF;
 IF cardinality(ids)>1 AND (p_client IS NOT NULL OR p_story IS NOT NULL) THEN RAISE EXCEPTION 'Batch copies resolve parents automatically'; END IF;
 IF p_kind='client' AND (p_client IS NOT NULL OR p_story IS NOT NULL) THEN RAISE EXCEPTION 'Client copy cannot select parents'; END IF;
 IF p_kind='story' AND p_story IS NOT NULL THEN RAISE EXCEPTION 'Story copy selects a client only'; END IF;
 FOREACH rid IN ARRAY ids LOOP
  one_plan:=public.space_copy_plan(p_kind,rid,p_target);
  IF source_space IS NOT NULL AND source_space<>(one_plan->>'source_space_id')::uuid THEN RAISE EXCEPTION 'Selected records must belong to the same space'; END IF;
  source_space:=(one_plan->>'source_space_id')::uuid;
  client_ids:=array_append(client_ids,(one_plan->>'client_id')::uuid);
  SELECT story_ids||coalesce(array_agg(value::uuid),'{}') INTO story_ids FROM jsonb_array_elements_text(one_plan->'story_ids');
  SELECT dev_ids||coalesce(array_agg(value::uuid),'{}') INTO dev_ids FROM jsonb_array_elements_text(one_plan->'development_ids');
 END LOOP;
 -- An explicitly chosen story already supplies its client (legacy single-copy API).
 IF p_story IS NOT NULL THEN
  SELECT client_id INTO p_client FROM public.stories WHERE id=p_story AND space_id=p_target AND (p_client IS NULL OR client_id=p_client) AND public.space_copy_visible(copy_job_id);
  IF p_client IS NULL THEN RAISE EXCEPTION 'Invalid destination story'; END IF;
 END IF;
 IF p_client IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.clients WHERE id=p_client AND space_id=p_target AND public.space_copy_visible(copy_job_id)) THEN RAISE EXCEPTION 'Invalid destination client'; END IF;
 -- Parents are planned first. Equivalent source parents in this same selection
 -- share the same target ID even if neither existed before this transaction.
 FOR item IN
  SELECT 1 AS level,'client'::text AS entity,id AS source_id,name AS label,NULL::uuid AS client_id,NULL::uuid AS story_id FROM public.clients WHERE id=ANY(client_ids)
  UNION ALL SELECT 2,'story',id,title,client_id,NULL::uuid FROM public.stories WHERE id=ANY(story_ids)
  UNION ALL SELECT 3,'development',id,title,client_id,story_id FROM public.developments WHERE id=ANY(dev_ids)
  ORDER BY 1,3
 LOOP
  entity:=item.entity; source_id:=item.source_id; key_name:=public.space_copy_name(item.label); parent_client:=NULL; parent_story:=NULL;
  IF key_name='' THEN RAISE EXCEPTION 'A source record has an empty name'; END IF;
  IF entity IN ('story','development') THEN
   SELECT (e->>'target_id')::uuid INTO parent_client FROM jsonb_array_elements(entries) e WHERE e->>'entity'='client' AND (e->>'source_id')::uuid=item.client_id;
  END IF;
  IF entity='development' THEN
   SELECT (e->>'target_id')::uuid INTO parent_story FROM jsonb_array_elements(entries) e WHERE e->>'entity'='story' AND (e->>'source_id')::uuid=item.story_id;
  END IF;
  candidates:='{}';
  IF entity='client' AND p_client IS NOT NULL THEN candidates:=ARRAY[p_client];
  ELSIF entity='story' AND p_story IS NOT NULL THEN candidates:=ARRAY[p_story];
  ELSIF entity='client' THEN SELECT coalesce(array_agg(id),'{}') INTO candidates FROM public.clients WHERE space_id=p_target AND public.space_copy_name(name)=key_name;
  ELSIF entity='story' THEN SELECT coalesce(array_agg(id),'{}') INTO candidates FROM public.stories WHERE space_id=p_target AND client_id=parent_client AND public.space_copy_name(title)=key_name;
  ELSE SELECT coalesce(array_agg(id),'{}') INTO candidates FROM public.developments WHERE space_id=p_target AND story_id=parent_story AND public.space_copy_name(title)=key_name;
  END IF;
  IF cardinality(candidates)>1 THEN RAISE EXCEPTION 'Ambiguous destination name: % (%). Resolve the duplicates before copying.',item.label,entity; END IF;
  reused:=cardinality(candidates)=1;
  IF reused THEN
   tid:=candidates[1];
   IF (entity='client' AND EXISTS(SELECT 1 FROM public.clients WHERE id=tid AND NOT public.space_copy_visible(copy_job_id))) OR
      (entity='story' AND EXISTS(SELECT 1 FROM public.stories WHERE id=tid AND NOT public.space_copy_visible(copy_job_id))) OR
      (entity='development' AND EXISTS(SELECT 1 FROM public.developments WHERE id=tid AND NOT public.space_copy_visible(copy_job_id))) THEN
    RAISE EXCEPTION 'Finish the previous pending copy first';
   END IF;
  ELSE
   SELECT e INTO entry FROM jsonb_array_elements(entries) e WHERE e->>'entity'=entity AND e->>'name_key'=key_name
    AND (e->>'client_id')::uuid IS NOT DISTINCT FROM parent_client AND (e->>'story_id')::uuid IS NOT DISTINCT FROM parent_story LIMIT 1;
   IF FOUND THEN tid:=(entry->>'target_id')::uuid; reused:=true;
   ELSE tid:=gen_random_uuid(); END IF;
  END IF;
  entries:=entries||jsonb_build_array(jsonb_build_object('entity',entity,'source_id',source_id,'target_id',tid,'client_id',parent_client,'story_id',parent_story,'name_key',key_name,'reused',reused));
 END LOOP;
 FOREACH rid IN ARRAY ids LOOP
  SELECT e->'target_id' INTO entry FROM jsonb_array_elements(entries) e WHERE e->>'entity'=p_kind AND (e->>'source_id')::uuid=rid;
  roots:=roots||jsonb_build_array(entry);
 END LOOP;
 SELECT count(*) INTO files FROM public.development_attachments a WHERE a.status='ready' AND a.deleted_at IS NULL AND EXISTS(SELECT 1 FROM jsonb_array_elements(entries) e WHERE e->>'entity'='development' AND NOT (e->>'reused')::boolean AND (e->>'source_id')::uuid=a.development_id);
 RETURN jsonb_build_object('source_space_id',source_space,'selection_ids',to_jsonb(ids),'root_ids',roots,'entries',entries,'preview',
  jsonb_build_object('selected_records',cardinality(ids),'clients',(SELECT count(*) FROM jsonb_array_elements(entries) e WHERE e->>'entity'='client' AND NOT (e->>'reused')::boolean),
   'stories',(SELECT count(*) FROM jsonb_array_elements(entries) e WHERE e->>'entity'='story' AND NOT (e->>'reused')::boolean),
   'developments',(SELECT count(*) FROM jsonb_array_elements(entries) e WHERE e->>'entity'='development' AND NOT (e->>'reused')::boolean),'attachments',files,
   'reused_clients',(SELECT count(*) FROM jsonb_array_elements(entries) e WHERE e->>'entity'='client' AND (e->>'reused')::boolean),
   'reused_stories',(SELECT count(*) FROM jsonb_array_elements(entries) e WHERE e->>'entity'='story' AND (e->>'reused')::boolean),
   'reused_developments',(SELECT count(*) FROM jsonb_array_elements(entries) e WHERE e->>'entity'='development' AND (e->>'reused')::boolean),
   'previously_copied',(SELECT count(*) FROM jsonb_array_elements(entries) e WHERE (e->>'reused')::boolean)));
END $$;
CREATE FUNCTION public.preview_space_copy_batch(p_kind text,p_ids uuid[],p_target uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT public.space_copy_batch_plan(p_kind,p_ids,p_target)->'preview' $$;
CREATE OR REPLACE FUNCTION public.preview_space_copy(p_kind text,p_id uuid,p_target uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT public.preview_space_copy_batch(p_kind,ARRAY[p_id],p_target) $$;
CREATE FUNCTION public.start_space_copy_batch(p_kind text,p_ids uuid[],p_target uuid,p_client uuid DEFAULT NULL,p_story uuid DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE ids uuid[]; rid uuid; base_plan jsonb; source_space uuid; plan jsonb; e jsonb; jid uuid; old_job public.space_copy_jobs;
 payload jsonb; entity text; sid uuid; tid uuid; f public.development_attachments; aid uuid;
BEGIN
 SELECT array_agg(id ORDER BY id) INTO ids FROM (SELECT DISTINCT unnest(p_ids) id) q;
 IF ids IS NULL OR cardinality(ids)<1 OR cardinality(ids)>100 OR array_position(ids,NULL) IS NOT NULL THEN RAISE EXCEPTION 'Select between 1 and 100 records'; END IF;
 -- Validate every source before returning any resumable job. No cross-space reads.
 FOREACH rid IN ARRAY ids LOOP
  base_plan:=public.space_copy_plan(p_kind,rid,p_target);
  IF source_space IS NOT NULL AND source_space<>(base_plan->>'source_space_id')::uuid THEN RAISE EXCEPTION 'Selected records must belong to the same space'; END IF;
  source_space:=(base_plan->>'source_space_id')::uuid;
 END LOOP;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_target::text,0));
 SELECT * INTO old_job FROM public.space_copy_jobs WHERE source_kind=p_kind AND source_id=ids[1] AND target_space_id=p_target AND status='pending';
 IF FOUND THEN
  IF old_job.created_by<>auth.uid() THEN RAISE EXCEPTION 'Another member has a pending copy for this content'; END IF;
  IF coalesce(old_job.result->'selection_ids',jsonb_build_array(old_job.source_id))<>to_jsonb(ids) OR
   (old_job.result->>'destination_client')::uuid IS DISTINCT FROM p_client OR (old_job.result->>'destination_story')::uuid IS DISTINCT FROM p_story THEN
   RAISE EXCEPTION 'Finish the previous pending copy first';
  END IF;
  RETURN old_job.id;
 END IF;
 plan:=public.space_copy_batch_plan(p_kind,ids,p_target,p_client,p_story);
 jid:=gen_random_uuid();
 INSERT INTO public.space_copy_jobs(id,source_kind,source_id,source_space_id,target_space_id,created_by,result)
 VALUES(jid,p_kind,ids[1],source_space,p_target,auth.uid(),jsonb_build_object('files','[]'::jsonb,'selection_ids',to_jsonb(ids),'destination_client',p_client,'destination_story',p_story,'root_ids',plan->'root_ids','root_id',plan->'root_ids'->0,'preview',plan->'preview',
  'created_clients',plan->'preview'->'clients','created_stories',plan->'preview'->'stories','created_developments',plan->'preview'->'developments'));
 FOR e IN SELECT value FROM jsonb_array_elements(plan->'entries') LOOP
  entity:=e->>'entity';sid:=(e->>'source_id')::uuid;tid:=(e->>'target_id')::uuid;
  IF NOT (e->>'reused')::boolean THEN
   IF entity='client' THEN SELECT to_jsonb(c) INTO payload FROM public.clients c WHERE id=sid;
   ELSIF entity='story' THEN SELECT to_jsonb(s) INTO payload FROM public.stories s WHERE id=sid;
    payload:=payload||jsonb_build_object('client_id',e->'client_id');
   ELSE SELECT to_jsonb(d) INTO payload FROM public.developments d WHERE id=sid;
    payload:=payload||jsonb_build_object('client_id',e->'client_id','story_id',e->'story_id','xml_import_id',NULL);
   END IF;
   IF payload IS NULL THEN RAISE EXCEPTION 'Source no longer exists'; END IF;
   payload:=payload||jsonb_build_object('id',tid,'user_id',auth.uid(),'space_id',p_target,'copy_job_id',jid,'created_at',now(),'updated_at',now());
   IF entity='client' THEN INSERT INTO public.clients SELECT (jsonb_populate_record(NULL::public.clients,payload)).*;
   ELSIF entity='story' THEN INSERT INTO public.stories SELECT (jsonb_populate_record(NULL::public.stories,payload)).*;
   ELSE
    INSERT INTO public.developments SELECT (jsonb_populate_record(NULL::public.developments,payload)).*;
    FOR f IN SELECT * FROM public.development_attachments WHERE development_id=sid AND status='ready' AND deleted_at IS NULL LOOP
     aid:=gen_random_uuid();
     INSERT INTO public.development_attachments(id,development_id,user_id,space_id,file_name,content_type,size_bytes) VALUES(aid,tid,auth.uid(),p_target,f.file_name,f.content_type,f.size_bytes);
     UPDATE public.space_copy_jobs SET result=jsonb_set(result,'{files}',result->'files'||jsonb_build_array(jsonb_build_object('source_path',f.storage_path,'target_path',auth.uid()::text||'/'||tid::text||'/'||aid::text))) WHERE id=jid;
    END LOOP;
   END IF;
  END IF;
  INSERT INTO public.space_copy_links(entity,source_id,target_space_id,target_id,job_id) VALUES(entity,sid,p_target,tid,jid)
  ON CONFLICT ON CONSTRAINT space_copy_links_pkey DO UPDATE SET target_id=EXCLUDED.target_id,job_id=EXCLUDED.job_id;
 END LOOP;
 RETURN jid;
END $$;
CREATE FUNCTION public.begin_space_copy_batch(p_kind text,p_ids uuid[],p_target uuid) RETURNS uuid
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT public.start_space_copy_batch(p_kind,p_ids,p_target) $$;
CREATE OR REPLACE FUNCTION public.begin_space_copy(p_kind text,p_id uuid,p_target uuid,p_client uuid DEFAULT NULL,p_story uuid DEFAULT NULL) RETURNS uuid
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT public.start_space_copy_batch(p_kind,ARRAY[p_id],p_target,p_client,p_story) $$;
REVOKE ALL ON FUNCTION public.space_copy_name(text),public.space_copy_batch_plan(text,uuid[],uuid,uuid,uuid),public.start_space_copy_batch(text,uuid[],uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.preview_space_copy_batch(text,uuid[],uuid),public.begin_space_copy_batch(text,uuid[],uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.preview_space_copy_batch(text,uuid[],uuid),public.begin_space_copy_batch(text,uuid[],uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
