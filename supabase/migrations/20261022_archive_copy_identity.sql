BEGIN;
-- Imported objects with equal labels can belong to different tables, sys_ids,
-- languages or versions. Only reuse an identical archived payload.
CREATE OR REPLACE FUNCTION public.space_copy_development_key(d public.developments) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT CASE WHEN coalesce(d.raw_xml,'')<>'' OR coalesce(d.config->>'sys_id',d.config->>'update_name',d.config->>'sys_update_name','')<>''
 THEN 'archive:' || md5(jsonb_build_array(d.development_type,d.config, d.raw_xml)::text)
 ELSE 'manual:' || public.space_copy_name(d.title) END
$$;
REVOKE ALL ON FUNCTION public.space_copy_development_key(public.developments) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.space_copy_batch_plan(p_kind text,p_ids uuid[],p_target uuid,p_client uuid DEFAULT NULL,p_story uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE ids uuid[]; rid uuid; one_plan jsonb; source_space uuid; client_ids uuid[]:='{}'; story_ids uuid[]:='{}'; dev_ids uuid[]:='{}';
 entries jsonb:='[]'; development_index jsonb; item record; entity text; source_id uuid; parent_client uuid; parent_story uuid;
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
 -- Compute archive fingerprints once per destination, not for every source row.
 SELECT coalesce(jsonb_object_agg(k,archive_ids),'{}'::jsonb) INTO development_index FROM (
  SELECT d.story_id::text || ':' || public.space_copy_development_key(d) k, jsonb_agg(d.id) archive_ids
  FROM public.developments d WHERE d.space_id=p_target GROUP BY 1
 ) indexed;
 -- Parents are planned first. Equivalent source parents in this same selection
 -- share the same target ID even if neither existed before this transaction.
 FOR item IN
  SELECT 1 AS level,'client'::text AS entity,id AS source_id,name AS label,NULL::uuid AS client_id,NULL::uuid AS story_id FROM public.clients WHERE id=ANY(client_ids)
  UNION ALL SELECT 2,'story',id,title,client_id,NULL::uuid FROM public.stories WHERE id=ANY(story_ids)
  UNION ALL SELECT 3,'development',id,title,client_id,story_id FROM public.developments WHERE id=ANY(dev_ids)
  ORDER BY 1,3
 LOOP
  entity:=item.entity; source_id:=item.source_id; key_name:=public.space_copy_name(item.label); parent_client:=NULL; parent_story:=NULL;
  IF entity='development' THEN
   SELECT public.space_copy_development_key(d) INTO key_name FROM public.developments d WHERE d.id=source_id;
  END IF;
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
  ELSE SELECT coalesce(array_agg(value::uuid),'{}') INTO candidates FROM jsonb_array_elements_text(coalesce(development_index->(parent_story::text||':'||key_name),'[]'::jsonb));
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
NOTIFY pgrst,'reload schema';
COMMIT;
