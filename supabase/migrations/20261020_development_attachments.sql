-- Development attachments: metadata in Postgres, binaries in a PRIVATE bucket.
-- Run once in Supabase SQL Editor. No existing business record is modified.
BEGIN;
CREATE TABLE IF NOT EXISTS public.development_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  development_id uuid NOT NULL REFERENCES public.developments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL CHECK (length(file_name) BETWEEN 1 AND 255 AND file_name !~ '[[:cntrl:]/\\]'),
  content_type text NOT NULL DEFAULT 'application/octet-stream',
  size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 26214400),
  storage_path text GENERATED ALWAYS AS (user_id::text || '/' || development_id::text || '/' || id::text) STORED UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready')),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS development_attachments_development_idx ON public.development_attachments(development_id, created_at);
CREATE INDEX IF NOT EXISTS development_attachments_user_idx ON public.development_attachments(user_id);
ALTER TABLE public.development_attachments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.development_attachments TO authenticated;
REVOKE ALL ON public.development_attachments FROM anon;

CREATE POLICY attachments_select_own ON public.development_attachments FOR SELECT TO authenticated
USING (user_id = (select auth.uid()) AND EXISTS (SELECT 1 FROM public.developments d WHERE d.id = development_id AND d.user_id = (select auth.uid())));
CREATE POLICY attachments_insert_own ON public.development_attachments FOR INSERT TO authenticated
WITH CHECK (user_id = (select auth.uid()) AND status = 'pending' AND deleted_at IS NULL AND EXISTS (SELECT 1 FROM public.developments d WHERE d.id = development_id AND d.user_id = (select auth.uid())));
CREATE POLICY attachments_update_own ON public.development_attachments FOR UPDATE TO authenticated
USING (user_id = (select auth.uid()) AND EXISTS (SELECT 1 FROM public.developments d WHERE d.id = development_id AND d.user_id = (select auth.uid())))
WITH CHECK (user_id = (select auth.uid()) AND EXISTS (SELECT 1 FROM public.developments d WHERE d.id = development_id AND d.user_id = (select auth.uid())));
CREATE POLICY attachments_cancel_pending ON public.development_attachments FOR DELETE TO authenticated
USING (user_id = (select auth.uid()) AND status = 'pending');

-- Finalisation is checked in the DB as well as in the app: direct API calls
-- cannot attach someone else's object, change ownership or invent a file size.
CREATE OR REPLACE FUNCTION public.guard_development_attachment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF ROW(NEW.id, NEW.development_id, NEW.user_id, NEW.file_name, NEW.content_type, NEW.size_bytes, NEW.created_at)
     IS DISTINCT FROM ROW(OLD.id, OLD.development_id, OLD.user_id, OLD.file_name, OLD.content_type, OLD.size_bytes, OLD.created_at) THEN
    RAISE EXCEPTION 'Attachment identity and file metadata are immutable';
  END IF;
  IF OLD.status = 'ready' AND NEW.status <> 'ready' THEN RAISE EXCEPTION 'Attachment cannot return to pending'; END IF;
  IF OLD.status = 'pending' AND NEW.status = 'ready' AND NOT EXISTS (
    SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'development-attachments' AND o.name = OLD.storage_path
      AND (o.metadata->>'size')::bigint = OLD.size_bytes
  ) THEN RAISE EXCEPTION 'Uploaded file missing or size mismatch'; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_development_attachment() FROM PUBLIC;
CREATE TRIGGER guard_development_attachment BEFORE UPDATE ON public.development_attachments
FOR EACH ROW EXECUTE FUNCTION public.guard_development_attachment();

INSERT INTO storage.buckets(id, name, public, file_size_limit)
VALUES ('development-attachments', 'development-attachments', false, 26214400)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY development_attachment_read ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'development-attachments' AND EXISTS (
 SELECT 1 FROM public.development_attachments a WHERE a.storage_path = name AND a.user_id = (select auth.uid()) AND a.deleted_at IS NULL
));
CREATE POLICY development_attachment_upload ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'development-attachments' AND EXISTS (
 SELECT 1 FROM public.development_attachments a WHERE a.storage_path = name AND a.user_id = (select auth.uid()) AND a.status = 'pending' AND a.deleted_at IS NULL
));
CREATE POLICY development_attachment_cancel ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'development-attachments' AND EXISTS (
 SELECT 1 FROM public.development_attachments a WHERE a.storage_path = name AND a.user_id = (select auth.uid()) AND a.status = 'pending'
));
-- No object UPDATE policy: upserts and overwriting stored files are forbidden.
NOTIFY pgrst, 'reload schema';
COMMIT;
