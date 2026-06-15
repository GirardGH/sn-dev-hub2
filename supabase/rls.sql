-- ============================================================
-- SN Dev Hub - Row Level Security Policies
-- Run AFTER schema.sql
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.developments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xml_imports  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_layouts ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ============================================================
-- CLIENTS
-- ============================================================
CREATE POLICY "clients_select_own" ON public.clients
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "clients_insert_own" ON public.clients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "clients_update_own" ON public.clients
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "clients_delete_own" ON public.clients
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- STORIES
-- ============================================================
CREATE POLICY "stories_select_own" ON public.stories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "stories_insert_own" ON public.stories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "stories_update_own" ON public.stories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "stories_delete_own" ON public.stories
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- DEVELOPMENTS
-- ============================================================
CREATE POLICY "developments_select_own" ON public.developments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "developments_insert_own" ON public.developments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "developments_update_own" ON public.developments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "developments_delete_own" ON public.developments
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- XML IMPORTS
-- ============================================================
CREATE POLICY "xml_imports_select_own" ON public.xml_imports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "xml_imports_insert_own" ON public.xml_imports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "xml_imports_update_own" ON public.xml_imports
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "xml_imports_delete_own" ON public.xml_imports
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- LIST LAYOUTS
-- ============================================================
CREATE POLICY "list_layouts_select_own" ON public.list_layouts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "list_layouts_insert_own" ON public.list_layouts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "list_layouts_update_own" ON public.list_layouts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "list_layouts_delete_own" ON public.list_layouts
  FOR DELETE USING (auth.uid() = user_id);
