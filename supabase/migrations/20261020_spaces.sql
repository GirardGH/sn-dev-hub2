-- Additive tenant migration. Existing records keep their IDs and content.
BEGIN;
CREATE TABLE public.spaces (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
 kind text NOT NULL CHECK (kind IN ('personal','company')),
 owner_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
 color text NOT NULL DEFAULT '#176b70' CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
 logo_url text CHECK (logo_url IS NULL OR (length(logo_url) <= 2048 AND logo_url ~ '^https://')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX spaces_one_personal ON public.spaces(owner_id) WHERE kind='personal';
CREATE TABLE public.space_members (
 space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 role text NOT NULL CHECK (role IN ('reader','contributor','admin')),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(space_id,user_id)
);
CREATE INDEX space_members_user ON public.space_members(user_id,space_id);
CREATE TABLE public.platform_admins (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);
CREATE TABLE public.space_copy_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 source_kind text NOT NULL CHECK (source_kind IN ('client','story','development')),
 source_id uuid NOT NULL,
 source_space_id uuid NOT NULL REFERENCES public.spaces(id),
 target_space_id uuid NOT NULL REFERENCES public.spaces(id),
 created_by uuid NOT NULL REFERENCES auth.users(id),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','complete')),
 result jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz,
 CHECK(source_space_id <> target_space_id)
);
CREATE UNIQUE INDEX space_copy_pending ON public.space_copy_jobs(source_kind,source_id,target_space_id) WHERE status='pending';
CREATE TABLE public.space_copy_links (
 entity text NOT NULL CHECK(entity IN ('client','story','development')),
 source_id uuid NOT NULL,
 target_space_id uuid NOT NULL REFERENCES public.spaces(id),
 target_id uuid NOT NULL,
 job_id uuid NOT NULL REFERENCES public.space_copy_jobs(id),
 PRIMARY KEY(entity,source_id,target_space_id)
);
CREATE OR REPLACE FUNCTION public.space_role(p_space uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT m.role FROM public.space_members m WHERE m.space_id=p_space AND m.user_id=(select auth.uid())
$$;
CREATE OR REPLACE FUNCTION public.is_platform_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.platform_admins a WHERE a.user_id=(select auth.uid()))
$$;
CREATE OR REPLACE FUNCTION public.space_can_write(p_space uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(public.space_role(p_space) IN ('contributor','admin'),false)
$$;
CREATE OR REPLACE FUNCTION public.space_copy_visible(p_job uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT p_job IS NULL OR EXISTS(SELECT 1 FROM public.space_copy_jobs j WHERE j.id=p_job AND j.status='complete')
$$;
-- One private personal space per existing account, including empty accounts.
INSERT INTO public.spaces(name,kind,owner_id) SELECT 'Mon espace personnel','personal',id FROM auth.users;
INSERT INTO public.space_members(space_id,user_id,role) SELECT id,owner_id,'admin' FROM public.spaces WHERE kind='personal';
DO $$ DECLARE t text; timestamp_trigger boolean; BEGIN
 FOREACH t IN ARRAY ARRAY['clients','stories','developments','xml_imports','development_attachments'] LOOP
  EXECUTE format('ALTER TABLE public.%I ADD COLUMN space_id uuid REFERENCES public.spaces(id)',t);
  SELECT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=('public.'||t)::regclass AND tgname='set_'||t||'_updated_at' AND tgenabled='O') INTO timestamp_trigger;
  IF timestamp_trigger THEN EXECUTE format('ALTER TABLE public.%I DISABLE TRIGGER %I',t,'set_'||t||'_updated_at'); END IF;
  EXECUTE format('UPDATE public.%I r SET space_id=s.id FROM public.spaces s WHERE s.kind=''personal'' AND s.owner_id=r.user_id',t);
  IF timestamp_trigger THEN EXECUTE format('ALTER TABLE public.%I ENABLE TRIGGER %I',t,'set_'||t||'_updated_at'); END IF;
  EXECUTE format('ALTER TABLE public.%I ALTER COLUMN space_id SET NOT NULL',t);
  EXECUTE format('CREATE INDEX %I ON public.%I(space_id)',t||'_space_idx',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['clients','stories','developments'] LOOP
  EXECUTE format('ALTER TABLE public.%I ADD COLUMN copy_job_id uuid REFERENCES public.space_copy_jobs(id)',t);
 END LOOP;
END $$;
-- Refuse legacy cross-owner relationships instead of silently moving records.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.stories s JOIN public.clients c ON c.id=s.client_id WHERE s.space_id<>c.space_id)
 OR EXISTS(SELECT 1 FROM public.developments d JOIN public.stories s ON s.id=d.story_id WHERE d.space_id<>s.space_id OR d.client_id<>s.client_id)
 OR EXISTS(SELECT 1 FROM public.development_attachments a JOIN public.developments d ON d.id=a.development_id WHERE a.space_id<>d.space_id)
 OR EXISTS(SELECT 1 FROM public.xml_imports x LEFT JOIN public.clients c ON c.id=x.client_id LEFT JOIN public.stories s ON s.id=x.story_id WHERE (c.id IS NOT NULL AND c.space_id<>x.space_id) OR (s.id IS NOT NULL AND (s.space_id<>x.space_id OR s.client_id IS DISTINCT FROM x.client_id)))
 THEN RAISE EXCEPTION 'Existing parent relationships need review before migration'; END IF;
END $$;
-- Old clients may omit space_id: default only to their authenticated personal space.
CREATE OR REPLACE FUNCTION public.guard_space_record() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE parent_space uuid; parent_client uuid;
BEGIN
 IF TG_OP='UPDATE' THEN
  IF NEW.space_id IS DISTINCT FROM OLD.space_id OR NEW.user_id IS DISTINCT FROM OLD.user_id
   THEN RAISE EXCEPTION 'Ownership is immutable; copy to another space instead'; END IF;
  IF TG_TABLE_NAME IN ('clients','stories','developments') THEN
   IF NEW.copy_job_id IS DISTINCT FROM OLD.copy_job_id THEN RAISE EXCEPTION 'Copy provenance is immutable'; END IF;
  END IF;
 IF TG_TABLE_NAME='stories' THEN
   IF NEW.client_id IS DISTINCT FROM OLD.client_id THEN RAISE EXCEPTION 'Story parent is immutable'; END IF;
  END IF;
  IF TG_TABLE_NAME='developments' THEN
   IF NEW.client_id IS DISTINCT FROM OLD.client_id OR NEW.story_id IS DISTINCT FROM OLD.story_id THEN RAISE EXCEPTION 'Development parent is immutable'; END IF;
  END IF;
 ELSIF NEW.space_id IS NULL THEN
  SELECT id INTO NEW.space_id FROM public.spaces WHERE kind='personal' AND owner_id=auth.uid();
 END IF;
 IF TG_TABLE_NAME='stories' THEN
  SELECT space_id INTO parent_space FROM public.clients WHERE id=NEW.client_id;
 ELSIF TG_TABLE_NAME='developments' THEN
  SELECT space_id,client_id INTO parent_space,parent_client FROM public.stories WHERE id=NEW.story_id;
  IF parent_client IS DISTINCT FROM NEW.client_id THEN RAISE EXCEPTION 'Development client and story mismatch'; END IF;
  IF NEW.xml_import_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.xml_imports x WHERE x.id=NEW.xml_import_id AND x.space_id=NEW.space_id) THEN RAISE EXCEPTION 'Import belongs to another space'; END IF;
 ELSIF TG_TABLE_NAME='development_attachments' THEN
  SELECT space_id INTO parent_space FROM public.developments WHERE id=NEW.development_id;
 ELSIF TG_TABLE_NAME='xml_imports' THEN
  IF NEW.client_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.clients WHERE id=NEW.client_id AND space_id=NEW.space_id) THEN RAISE EXCEPTION 'Client belongs to another space'; END IF;
  IF NEW.story_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.stories WHERE id=NEW.story_id AND space_id=NEW.space_id AND client_id=NEW.client_id) THEN RAISE EXCEPTION 'Story belongs to another space'; END IF;
 END IF;
 IF TG_TABLE_NAME IN ('stories','developments','development_attachments') AND parent_space IS DISTINCT FROM NEW.space_id THEN
  RAISE EXCEPTION 'Parent belongs to another space'; END IF;
 RETURN NEW;
END $$;
DO $$ DECLARE t text; p record; BEGIN
 FOREACH t IN ARRAY ARRAY['clients','stories','developments','xml_imports','development_attachments'] LOOP
  EXECUTE format('CREATE TRIGGER a_guard_space BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.guard_space_record()',t);
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
   EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,t);
  END LOOP;
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO authenticated',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM anon',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['clients','stories','developments'] LOOP
  EXECUTE format('CREATE POLICY space_read ON public.%I FOR SELECT TO authenticated USING(public.space_role(space_id) IS NOT NULL AND public.space_copy_visible(copy_job_id))',t);
  EXECUTE format('CREATE POLICY space_insert ON public.%I FOR INSERT TO authenticated WITH CHECK(public.space_can_write(space_id) AND user_id=auth.uid() AND copy_job_id IS NULL)',t);
  EXECUTE format('CREATE POLICY space_update ON public.%I FOR UPDATE TO authenticated USING(public.space_can_write(space_id) AND public.space_copy_visible(copy_job_id)) WITH CHECK(public.space_can_write(space_id) AND public.space_copy_visible(copy_job_id))',t);
  EXECUTE format('CREATE POLICY space_delete ON public.%I FOR DELETE TO authenticated USING(public.space_role(space_id)=''admin'' AND public.space_copy_visible(copy_job_id))',t);
 END LOOP;
END $$;
CREATE POLICY space_read ON public.xml_imports FOR SELECT TO authenticated USING(public.space_role(space_id) IS NOT NULL);
CREATE POLICY space_insert ON public.xml_imports FOR INSERT TO authenticated WITH CHECK(public.space_can_write(space_id) AND user_id=auth.uid());
CREATE POLICY space_update ON public.xml_imports FOR UPDATE TO authenticated USING(public.space_can_write(space_id)) WITH CHECK(public.space_can_write(space_id));
CREATE POLICY space_delete ON public.xml_imports FOR DELETE TO authenticated USING(public.space_role(space_id)='admin');
CREATE POLICY space_read ON public.development_attachments FOR SELECT TO authenticated USING(public.space_role(space_id) IS NOT NULL AND EXISTS(SELECT 1 FROM public.developments d WHERE d.id=development_id));
CREATE POLICY space_insert ON public.development_attachments FOR INSERT TO authenticated WITH CHECK(public.space_can_write(space_id) AND user_id=auth.uid() AND status='pending' AND deleted_at IS NULL AND EXISTS(SELECT 1 FROM public.developments d WHERE d.id=development_id));
CREATE POLICY space_update ON public.development_attachments FOR UPDATE TO authenticated USING(public.space_can_write(space_id)) WITH CHECK(public.space_can_write(space_id));
CREATE POLICY space_cancel ON public.development_attachments FOR DELETE TO authenticated USING(public.space_can_write(space_id) AND user_id=auth.uid() AND status='pending');
CREATE POLICY visible_parent_insert ON public.stories AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(EXISTS(SELECT 1 FROM public.clients c WHERE c.id=client_id));
CREATE POLICY visible_parent_insert ON public.developments AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(EXISTS(SELECT 1 FROM public.stories s WHERE s.id=story_id));
CREATE POLICY visible_parent_insert ON public.xml_imports AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK((client_id IS NULL OR EXISTS(SELECT 1 FROM public.clients c WHERE c.id=client_id)) AND (story_id IS NULL OR EXISTS(SELECT 1 FROM public.stories s WHERE s.id=story_id)));
CREATE POLICY visible_parent_update ON public.xml_imports AS RESTRICTIVE FOR UPDATE TO authenticated USING(true) WITH CHECK((client_id IS NULL OR EXISTS(SELECT 1 FROM public.clients c WHERE c.id=client_id)) AND (story_id IS NULL OR EXISTS(SELECT 1 FROM public.stories s WHERE s.id=story_id)));
-- Replacement storage checks: space membership, immutable objects, pending uploads only.
CREATE OR REPLACE FUNCTION public.space_file_access(p_path text,p_write boolean DEFAULT false) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.development_attachments a JOIN public.developments d ON d.id=a.development_id
 WHERE a.storage_path=p_path AND a.deleted_at IS NULL AND
 CASE WHEN p_write THEN public.space_can_write(a.space_id) AND a.user_id=auth.uid() AND a.status='pending'
 AND (public.space_copy_visible(d.copy_job_id) OR EXISTS(SELECT 1 FROM public.space_copy_jobs j WHERE j.id=d.copy_job_id AND j.created_by=auth.uid() AND j.status='pending'))
 ELSE public.space_role(a.space_id) IS NOT NULL AND ((a.status='ready' AND public.space_copy_visible(d.copy_job_id)) OR (a.status='pending' AND a.user_id=auth.uid() AND public.space_can_write(a.space_id) AND (public.space_copy_visible(d.copy_job_id) OR EXISTS(SELECT 1 FROM public.space_copy_jobs j WHERE j.id=d.copy_job_id AND j.created_by=auth.uid() AND j.status='pending')))) END)
$$;
DROP POLICY development_attachment_read ON storage.objects;
DROP POLICY development_attachment_upload ON storage.objects;
DROP POLICY development_attachment_cancel ON storage.objects;
CREATE POLICY development_attachment_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='development-attachments' AND public.space_file_access(name,false));
CREATE POLICY development_attachment_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='development-attachments' AND public.space_file_access(name,true));
CREATE POLICY development_attachment_cancel ON storage.objects FOR DELETE TO authenticated USING(bucket_id='development-attachments' AND public.space_file_access(name,true));
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['spaces','space_members','platform_admins','space_copy_jobs','space_copy_links'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM anon,authenticated',t);
  EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
 END LOOP;
END $$;
CREATE POLICY own_admin ON public.platform_admins FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY space_read ON public.spaces FOR SELECT TO authenticated USING(public.space_role(id) IS NOT NULL OR (kind='company' AND public.is_platform_admin()));
CREATE POLICY members_read ON public.space_members FOR SELECT TO authenticated USING(public.space_role(space_id) IS NOT NULL OR (public.is_platform_admin() AND EXISTS(SELECT 1 FROM public.spaces s WHERE s.id=space_id AND s.kind='company')));
CREATE POLICY copies_read ON public.space_copy_jobs FOR SELECT TO authenticated USING(created_by=auth.uid() AND public.space_role(target_space_id) IS NOT NULL);
CREATE POLICY links_read ON public.space_copy_links FOR SELECT TO authenticated USING(public.space_role(target_space_id) IS NOT NULL AND public.space_copy_visible(job_id));
-- Company creation and membership are narrow RPCs: no public table write grants.
CREATE OR REPLACE FUNCTION public.create_company_space(p_name text,p_color text DEFAULT '#176b70',p_logo_url text DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE sid uuid;
BEGIN
 IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Platform administrator required'; END IF;
 INSERT INTO public.spaces(name,kind,owner_id,color,logo_url) VALUES(trim(p_name),'company',auth.uid(),p_color,p_logo_url) RETURNING id INTO sid;
 INSERT INTO public.space_members VALUES(sid,auth.uid(),'admin',now()); RETURN sid;
END $$;
CREATE OR REPLACE FUNCTION public.set_space_member(p_space uuid,p_email text,p_role text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE uid uuid; typ text;
BEGIN
 SELECT kind INTO typ FROM public.spaces WHERE id=p_space FOR UPDATE;
 IF typ IS DISTINCT FROM 'company' OR NOT coalesce((public.space_role(p_space)='admin' OR public.is_platform_admin()),false) THEN RAISE EXCEPTION 'Company administrator required'; END IF;
 IF p_role IS NOT NULL AND p_role NOT IN ('reader','contributor','admin') THEN RAISE EXCEPTION 'Invalid role'; END IF;
 SELECT id INTO uid FROM auth.users WHERE lower(email)=lower(trim(p_email));
 IF uid IS NULL THEN RAISE EXCEPTION 'An existing registered account with this email is required'; END IF;
 IF (p_role IS DISTINCT FROM 'admin') AND EXISTS(SELECT 1 FROM public.space_members WHERE space_id=p_space AND user_id=uid AND role='admin') AND (SELECT count(*) FROM public.space_members WHERE space_id=p_space AND role='admin')<=1 THEN RAISE EXCEPTION 'Keep at least one administrator'; END IF;
 IF p_role IS NULL THEN DELETE FROM public.space_members WHERE space_id=p_space AND user_id=uid;
 ELSE INSERT INTO public.space_members(space_id,user_id,role) VALUES(p_space,uid,p_role) ON CONFLICT(space_id,user_id) DO UPDATE SET role=excluded.role; END IF;
END $$;
CREATE OR REPLACE FUNCTION public.list_space_members(p_space uuid) RETURNS TABLE(user_id uuid,email text,full_name text,role text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.spaces WHERE id=p_space AND kind='company') OR NOT coalesce((public.space_role(p_space)='admin' OR public.is_platform_admin()),false) THEN RAISE EXCEPTION 'Administrator required'; END IF;
 RETURN QUERY SELECT m.user_id,u.email::text,p.full_name,m.role FROM public.space_members m JOIN auth.users u ON u.id=m.user_id LEFT JOIN public.profiles p ON p.id=m.user_id WHERE m.space_id=p_space ORDER BY u.email;
END $$;
CREATE OR REPLACE FUNCTION public.update_company_space(p_space uuid,p_name text,p_color text,p_logo_url text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF NOT coalesce((public.space_role(p_space)='admin' OR public.is_platform_admin()),false) THEN RAISE EXCEPTION 'Administrator required'; END IF;
 UPDATE public.spaces SET name=trim(p_name),color=p_color,logo_url=p_logo_url WHERE id=p_space AND kind='company';
 IF NOT FOUND THEN RAISE EXCEPTION 'Company space not found'; END IF;
END $$;
CREATE OR REPLACE FUNCTION public.create_personal_space() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE sid uuid; BEGIN
 INSERT INTO public.spaces(name,kind,owner_id) VALUES('Mon espace personnel','personal',NEW.id) RETURNING id INTO sid;
 INSERT INTO public.space_members VALUES(sid,NEW.id,'admin',now()); RETURN NEW;
END $$;
CREATE TRIGGER on_auth_space_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_personal_space();
-- Explicit function grants, no anonymous invocation of security-definer functions.
DO $$ DECLARE fn record; BEGIN
 FOR fn IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('space_role','is_platform_admin','space_can_write','space_copy_visible','space_file_access','create_company_space','set_space_member','list_space_members','update_company_space') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon',fn.signature);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',fn.signature);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.guard_space_record(),public.create_personal_space() FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
