BEGIN;
-- Internal helpers are not callable by API users.
CREATE FUNCTION public.space_copy_plan(p_kind text,p_id uuid,p_target uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE cid uuid; sid uuid; source_space uuid; story_ids uuid[]; dev_ids uuid[];
BEGIN
 IF p_kind='client' THEN SELECT id,space_id INTO cid,source_space FROM public.clients WHERE id=p_id AND public.space_copy_visible(copy_job_id);
 ELSIF p_kind='story' THEN SELECT client_id,id,space_id INTO cid,sid,source_space FROM public.stories WHERE id=p_id AND public.space_copy_visible(copy_job_id);
 ELSIF p_kind='development' THEN SELECT client_id,story_id,space_id INTO cid,sid,source_space FROM public.developments WHERE id=p_id AND public.space_copy_visible(copy_job_id);
 ELSE RAISE EXCEPTION 'Invalid source type'; END IF;
 IF source_space IS NULL OR public.space_role(source_space) IS NULL OR NOT public.space_can_write(p_target) OR source_space=p_target THEN RAISE EXCEPTION 'Source or destination not accessible'; END IF;
 IF p_kind='client' THEN SELECT coalesce(array_agg(id),'{}') INTO story_ids FROM public.stories WHERE client_id=cid AND public.space_copy_visible(copy_job_id);
 ELSE story_ids:=ARRAY[sid]; END IF;
 SELECT coalesce(array_agg(id),'{}') INTO dev_ids FROM public.developments WHERE client_id=cid AND public.space_copy_visible(copy_job_id) AND (CASE WHEN p_kind='development' THEN id=p_id ELSE story_id=ANY(story_ids) END);
 RETURN jsonb_build_object('source_space_id',source_space,'client_id',cid,'story_ids',to_jsonb(story_ids),'development_ids',to_jsonb(dev_ids));
END $$;
CREATE FUNCTION public.preview_space_copy(p_kind text,p_id uuid,p_target uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$ DECLARE plan jsonb; matches int; files int; BEGIN
 plan:=public.space_copy_plan(p_kind,p_id,p_target);
 SELECT count(*) INTO matches FROM public.space_copy_links l WHERE l.target_space_id=p_target AND public.space_copy_visible(l.job_id) AND ((l.entity='client' AND EXISTS(SELECT 1 FROM public.clients WHERE id=l.target_id)) OR (l.entity='story' AND EXISTS(SELECT 1 FROM public.stories WHERE id=l.target_id)) OR (l.entity='development' AND EXISTS(SELECT 1 FROM public.developments WHERE id=l.target_id))) AND
 ((l.entity='client' AND l.source_id=(plan->>'client_id')::uuid) OR (l.entity='story' AND l.source_id IN (SELECT value::uuid FROM jsonb_array_elements_text(plan->'story_ids'))) OR (l.entity='development' AND l.source_id IN (SELECT value::uuid FROM jsonb_array_elements_text(plan->'development_ids'))));
 SELECT count(*) INTO files FROM public.development_attachments a WHERE a.development_id IN (SELECT value::uuid FROM jsonb_array_elements_text(plan->'development_ids')) AND a.status='ready' AND a.deleted_at IS NULL;
 RETURN jsonb_build_object('clients',1,'stories',jsonb_array_length(plan->'story_ids'),'developments',jsonb_array_length(plan->'development_ids'),'attachments',files,'previously_copied',matches);
END $$;
CREATE FUNCTION public.clone_space_entity(p_kind text,p_source uuid,p_target uuid,p_job uuid,p_client uuid DEFAULT NULL,p_story uuid DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE tid uuid; old_link public.space_copy_links; payload jsonb; parent_id uuid; parent_client uuid; f public.development_attachments; aid uuid;
BEGIN
 IF p_kind='client' AND p_client IS NOT NULL THEN
  IF NOT EXISTS(SELECT 1 FROM public.clients WHERE id=p_client AND space_id=p_target AND (public.space_copy_visible(copy_job_id) OR copy_job_id=p_job)) THEN RAISE EXCEPTION 'Invalid destination client'; END IF; RETURN p_client;
 ELSIF p_kind='story' AND p_story IS NOT NULL THEN
  IF NOT EXISTS(SELECT 1 FROM public.stories WHERE id=p_story AND space_id=p_target AND (p_client IS NULL OR client_id=p_client) AND (public.space_copy_visible(copy_job_id) OR copy_job_id=p_job)) THEN RAISE EXCEPTION 'Invalid destination story'; END IF; RETURN p_story;
 END IF;
 SELECT * INTO old_link FROM public.space_copy_links WHERE entity=p_kind AND source_id=p_source AND target_space_id=p_target;
 IF FOUND THEN
  IF NOT public.space_copy_visible(old_link.job_id) AND old_link.job_id<>p_job THEN RAISE EXCEPTION 'Finish the previous pending copy first'; END IF;
  IF p_kind='development' AND EXISTS(SELECT 1 FROM public.developments WHERE id=old_link.target_id AND ((p_client IS NOT NULL AND client_id<>p_client) OR (p_story IS NOT NULL AND story_id<>p_story))) THEN RAISE EXCEPTION 'Previously copied development has different destination parents'; END IF;
  IF (p_kind='client' AND EXISTS(SELECT 1 FROM public.clients WHERE id=old_link.target_id)) OR (p_kind='story' AND EXISTS(SELECT 1 FROM public.stories WHERE id=old_link.target_id AND (p_client IS NULL OR client_id=p_client))) OR (p_kind='development' AND EXISTS(SELECT 1 FROM public.developments WHERE id=old_link.target_id)) THEN RETURN old_link.target_id; END IF;
  IF p_kind='story' AND EXISTS(SELECT 1 FROM public.stories WHERE id=old_link.target_id) THEN RAISE EXCEPTION 'Previously copied story belongs to another destination client'; END IF;
  DELETE FROM public.space_copy_links WHERE entity=p_kind AND source_id=p_source AND target_space_id=p_target;
 END IF;
 tid:=gen_random_uuid();
 IF p_kind='client' THEN
  SELECT to_jsonb(c) INTO payload FROM public.clients c WHERE id=p_source;
 ELSIF p_kind='story' THEN
  SELECT to_jsonb(s) INTO payload FROM public.stories s WHERE id=p_source;
  parent_id:=public.clone_space_entity('client',(payload->>'client_id')::uuid,p_target,p_job,p_client,NULL);
  payload:=payload||jsonb_build_object('client_id',parent_id);
 ELSIF p_kind='development' THEN
  SELECT to_jsonb(d) INTO payload FROM public.developments d WHERE id=p_source;
  parent_id:=public.clone_space_entity('story',(payload->>'story_id')::uuid,p_target,p_job,p_client,p_story);
  SELECT client_id INTO parent_client FROM public.stories WHERE id=parent_id;
  payload:=payload||jsonb_build_object('story_id',parent_id,'client_id',parent_client,'xml_import_id',NULL);
 ELSE RAISE EXCEPTION 'Invalid entity'; END IF;
 IF payload IS NULL THEN RAISE EXCEPTION 'Source no longer exists'; END IF;
 payload:=payload||jsonb_build_object('id',tid,'user_id',auth.uid(),'space_id',p_target,'copy_job_id',p_job,'created_at',now(),'updated_at',now());
 IF p_kind='client' THEN INSERT INTO public.clients SELECT (jsonb_populate_record(NULL::public.clients,payload)).*;
 ELSIF p_kind='story' THEN INSERT INTO public.stories SELECT (jsonb_populate_record(NULL::public.stories,payload)).*;
 ELSE
  INSERT INTO public.developments SELECT (jsonb_populate_record(NULL::public.developments,payload)).*;
  FOR f IN SELECT * FROM public.development_attachments WHERE development_id=p_source AND status='ready' AND deleted_at IS NULL LOOP
   aid:=gen_random_uuid();
   INSERT INTO public.development_attachments(id,development_id,user_id,space_id,file_name,content_type,size_bytes) VALUES(aid,tid,auth.uid(),p_target,f.file_name,f.content_type,f.size_bytes);
   UPDATE public.space_copy_jobs SET result=jsonb_set(result,'{files}',coalesce(result->'files','[]')||jsonb_build_array(jsonb_build_object('source_path',f.storage_path,'target_path',auth.uid()::text||'/'||tid::text||'/'||aid::text))) WHERE id=p_job;
  END LOOP;
 END IF;
 INSERT INTO public.space_copy_links VALUES(p_kind,p_source,p_target,tid,p_job);
 RETURN tid;
END $$;
CREATE FUNCTION public.begin_space_copy(p_kind text,p_id uuid,p_target uuid,p_client uuid DEFAULT NULL,p_story uuid DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE plan jsonb; jid uuid; job public.space_copy_jobs; cid uuid; sid uuid; did uuid; root_id uuid;
BEGIN
 plan:=public.space_copy_plan(p_kind,p_id,p_target);
 PERFORM pg_advisory_xact_lock(hashtextextended(p_target::text,0));
 SELECT * INTO job FROM public.space_copy_jobs WHERE source_kind=p_kind AND source_id=p_id AND target_space_id=p_target AND status='pending';
 IF FOUND THEN
  IF job.created_by<>auth.uid() THEN RAISE EXCEPTION 'Another member has a pending copy for this content'; END IF; RETURN job.id;
 END IF;
 IF p_kind='client' AND (p_client IS NOT NULL OR p_story IS NOT NULL) THEN RAISE EXCEPTION 'Client copy cannot select parents'; END IF;
 IF p_kind='story' AND p_story IS NOT NULL THEN RAISE EXCEPTION 'Story copy selects a client only'; END IF;
 jid:=gen_random_uuid();
 INSERT INTO public.space_copy_jobs(id,source_kind,source_id,source_space_id,target_space_id,created_by) VALUES(jid,p_kind,p_id,(plan->>'source_space_id')::uuid,p_target,auth.uid());
 -- If an existing story was selected, use its parent without cloning an unused client.
 IF p_kind='development' AND p_story IS NOT NULL THEN
  SELECT client_id INTO cid FROM public.stories WHERE id=p_story AND space_id=p_target AND (p_client IS NULL OR client_id=p_client) AND public.space_copy_visible(copy_job_id);
  IF cid IS NULL THEN RAISE EXCEPTION 'Invalid destination story'; END IF;
 ELSE cid:=public.clone_space_entity('client',(plan->>'client_id')::uuid,p_target,jid,p_client,NULL);
 END IF;
 FOR sid IN SELECT value::uuid FROM jsonb_array_elements_text(plan->'story_ids') LOOP
  PERFORM public.clone_space_entity('story',sid,p_target,jid,cid,p_story);
 END LOOP;
 FOR did IN SELECT value::uuid FROM jsonb_array_elements_text(plan->'development_ids') LOOP
  PERFORM public.clone_space_entity('development',did,p_target,jid,cid,p_story);
 END LOOP;
 IF p_kind='client' THEN root_id:=cid;
 ELSIF p_kind='story' THEN SELECT target_id INTO root_id FROM public.space_copy_links WHERE entity='story' AND source_id=p_id AND target_space_id=p_target;
 ELSE SELECT target_id INTO root_id FROM public.space_copy_links WHERE entity='development' AND source_id=p_id AND target_space_id=p_target; END IF;
 UPDATE public.space_copy_jobs SET result=result||jsonb_build_object('root_id',root_id,'preview',public.preview_space_copy(p_kind,p_id,p_target),'created_clients',(SELECT count(*) FROM public.clients WHERE copy_job_id=jid),'created_stories',(SELECT count(*) FROM public.stories WHERE copy_job_id=jid),'created_developments',(SELECT count(*) FROM public.developments WHERE copy_job_id=jid)) WHERE id=jid;
 RETURN jid;
END $$;
CREATE FUNCTION public.get_space_copy_files(p_job uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$ DECLARE j public.space_copy_jobs; result jsonb; BEGIN
 SELECT * INTO j FROM public.space_copy_jobs WHERE id=p_job AND created_by=auth.uid();
 IF NOT FOUND OR NOT public.space_can_write(j.target_space_id) OR public.space_role(j.source_space_id) IS NULL THEN RAISE EXCEPTION 'Copy not accessible'; END IF;
 SELECT coalesce(jsonb_agg(f||jsonb_build_object('copied',EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='development-attachments' AND o.name=f->>'target_path'))),'[]') INTO result FROM jsonb_array_elements(coalesce(j.result->'files','[]')) f;
 RETURN result;
END $$;
CREATE FUNCTION public.finish_space_copy(p_job uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE j public.space_copy_jobs; BEGIN
 SELECT * INTO j FROM public.space_copy_jobs WHERE id=p_job AND created_by=auth.uid() FOR UPDATE;
 IF NOT FOUND OR NOT public.space_can_write(j.target_space_id) OR public.space_role(j.source_space_id) IS NULL THEN RAISE EXCEPTION 'Copy not accessible'; END IF;
 IF j.status='complete' THEN RETURN j.result; END IF;
 -- Existing attachment trigger checks that each binary exists with the expected size.
 UPDATE public.development_attachments a SET status='ready' WHERE a.status='pending' AND a.development_id IN(SELECT id FROM public.developments WHERE copy_job_id=p_job);
 UPDATE public.space_copy_jobs SET status='complete',completed_at=now() WHERE id=p_job;
 RETURN j.result;
END $$;
REVOKE ALL ON FUNCTION public.space_copy_plan(text,uuid,uuid),public.clone_space_entity(text,uuid,uuid,uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.preview_space_copy(text,uuid,uuid),public.begin_space_copy(text,uuid,uuid,uuid,uuid),public.get_space_copy_files(uuid),public.finish_space_copy(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.preview_space_copy(text,uuid,uuid),public.begin_space_copy(text,uuid,uuid,uuid,uuid),public.get_space_copy_files(uuid),public.finish_space_copy(uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
