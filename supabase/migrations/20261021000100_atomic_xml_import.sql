-- Additive: no existing XML, configuration, or development is rewritten.
BEGIN;
ALTER TABLE public.xml_imports
 ADD COLUMN IF NOT EXISTS commit_fingerprint text,
 ADD COLUMN IF NOT EXISTS commit_result jsonb;
-- Completed retries must remain immutable even when an import is re-analyzed.
CREATE OR REPLACE FUNCTION public.guard_xml_commit() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$ BEGIN
 IF OLD.commit_result IS NOT NULL AND
  (NEW.commit_result IS DISTINCT FROM OLD.commit_result OR NEW.commit_fingerprint IS DISTINCT FROM OLD.commit_fingerprint)
 THEN RAISE EXCEPTION 'Completed import result is immutable'; END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE TRIGGER xml_commit_immutable BEFORE UPDATE ON public.xml_imports
 FOR EACH ROW EXECUTE FUNCTION public.guard_xml_commit();
REVOKE ALL ON FUNCTION public.guard_xml_commit() FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.commit_xml_import(
 p_import uuid,p_space uuid,p_client uuid,p_story uuid,p_components jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE archive public.xml_imports; item jsonb; fingerprint text; result jsonb;
 target uuid; action text; made int:=0; changed int:=0; skipped int:=0; affected int;
BEGIN
 IF auth.uid() IS NULL OR NOT public.space_can_write(p_space) THEN RAISE EXCEPTION 'Write access required'; END IF;
 IF jsonb_typeof(p_components) IS DISTINCT FROM 'array' OR jsonb_array_length(p_components)>10000 THEN RAISE EXCEPTION 'Invalid component list'; END IF;
 -- The lock serializes retries of the same archived XML.
 SELECT * INTO archive FROM public.xml_imports WHERE id=p_import AND space_id=p_space FOR UPDATE;
 IF NOT FOUND OR archive.user_id<>auth.uid() OR archive.client_id IS DISTINCT FROM p_client OR archive.story_id IS DISTINCT FROM p_story THEN RAISE EXCEPTION 'Import and selected parents do not match'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.stories WHERE id=p_story AND client_id=p_client AND space_id=p_space)
 OR NOT EXISTS(SELECT 1 FROM public.clients WHERE id=p_client AND space_id=p_space) THEN RAISE EXCEPTION 'Parents unavailable in this space'; END IF;
 fingerprint:=md5(jsonb_build_object('components',p_components,'client',p_client,'story',p_story)::text);
 IF archive.commit_result IS NOT NULL THEN
  IF archive.commit_fingerprint IS DISTINCT FROM fingerprint THEN RAISE EXCEPTION 'This import has already completed with different selections'; END IF;
  RETURN archive.commit_result;
 END IF;
 IF archive.status='imported' THEN RAISE EXCEPTION 'This legacy import is already completed'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_components) LOOP
  IF coalesce((item->>'selected')::boolean,false)=false THEN CONTINUE; END IF;
  action:=coalesce(item->>'importAction','create');
  IF action='skip' THEN skipped:=skipped+1; CONTINUE; END IF;
  IF action NOT IN ('create','update') OR nullif(btrim(item->>'title'),'') IS NULL
   OR nullif(item->>'developmentType','') IS NULL OR jsonb_typeof(item->'config') IS DISTINCT FROM 'object'
   OR jsonb_typeof(item->'rawXml') IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'Invalid selected component'; END IF;
  target:=nullif(item->>'existingId','')::uuid;
  -- Preserve the existing behavior: update without a target becomes create.
  IF action='update' AND target IS NOT NULL THEN
   UPDATE public.developments SET title=item->>'title',development_type=item->>'developmentType',
    target_table=item->>'targetTable',config=item->'config',raw_xml=item->>'rawXml',xml_import_id=p_import
   WHERE id=target AND story_id=p_story AND client_id=p_client AND space_id=p_space;
   GET DIAGNOSTICS affected=ROW_COUNT;
   IF affected<>1 THEN RAISE EXCEPTION 'Update target is unavailable or belongs to another story'; END IF;
   changed:=changed+1;
  ELSE
   INSERT INTO public.developments(user_id,space_id,story_id,client_id,title,development_type,target_table,config,raw_xml,xml_import_id,status)
    VALUES(auth.uid(),p_space,p_story,p_client,item->>'title',item->>'developmentType',item->>'targetTable',item->'config',item->>'rawXml',p_import,'draft');
   made:=made+1;
  END IF;
 END LOOP;
 result:=jsonb_build_object('created',made,'updated',changed,'skipped',skipped);
 UPDATE public.xml_imports SET status='imported',created_developments_count=made+changed,
  parsed_summary=jsonb_set(coalesce(parsed_summary,'{}'::jsonb),'{importResult}',result),
  commit_fingerprint=fingerprint,commit_result=result WHERE id=p_import;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.commit_xml_import(uuid,uuid,uuid,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.commit_xml_import(uuid,uuid,uuid,uuid,jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
