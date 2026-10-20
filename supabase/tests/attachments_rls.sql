BEGIN;
-- Run as postgres in a test project containing at least one development.
SELECT set_config('sn_test.development_id',id::text,true), set_config('sn_test.owner_id',user_id::text,true)
FROM public.developments ORDER BY id LIMIT 1;
INSERT INTO public.development_attachments(id,development_id,user_id,file_name,size_bytes)
VALUES ('f4952701-1baf-47c7-8bb5-f34413e0c080',current_setting('sn_test.development_id')::uuid,current_setting('sn_test.owner_id')::uuid,'rls-test.txt',4);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',json_build_object('sub',current_setting('sn_test.owner_id'),'role','authenticated')::text,true);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.development_attachments WHERE id='f4952701-1baf-47c7-8bb5-f34413e0c080')<>1 THEN RAISE EXCEPTION 'Owner read failed'; END IF;
 BEGIN
  UPDATE public.development_attachments SET status='ready' WHERE id='f4952701-1baf-47c7-8bb5-f34413e0c080';
  RAISE EXCEPTION 'Missing-file check failed';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM <> 'Uploaded file missing or size mismatch' THEN RAISE; END IF;
 END;
END $$;
SELECT set_config('request.jwt.claims','{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.development_attachments WHERE id='f4952701-1baf-47c7-8bb5-f34413e0c080') THEN RAISE EXCEPTION 'Cross-user read allowed'; END IF;
 BEGIN
  INSERT INTO public.development_attachments(development_id,user_id,file_name,size_bytes)
  VALUES(current_setting('sn_test.development_id')::uuid,'33333333-3333-4333-8333-333333333333','forbidden.txt',4);
  RAISE EXCEPTION 'Cross-user insert allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
RESET ROLE;
ROLLBACK;
SELECT 'Owner access, cross-user denial and missing-file validation: passed; fixtures rolled back' as result;
