-- ============================================================
-- SN Dev Hub - Supabase Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  full_name  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CLIENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.clients (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  code         TEXT,
  description  TEXT,
  instance_url TEXT,
  environment  TEXT,
  status       TEXT NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS clients_user_id_idx ON public.clients(user_id);

-- ============================================================
-- STORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.stories (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id          UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  reference          TEXT,
  title              TEXT NOT NULL,
  description        TEXT,
  functional_need    TEXT,
  technical_solution TEXT,
  status             TEXT NOT NULL DEFAULT 'draft',
  priority           TEXT,
  estimated_uo       NUMERIC,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS stories_user_id_idx   ON public.stories(user_id);
CREATE INDEX IF NOT EXISTS stories_client_id_idx ON public.stories(client_id);

-- ============================================================
-- XML IMPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.xml_imports (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id                UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  story_id                 UUID REFERENCES public.stories(id) ON DELETE SET NULL,
  filename                 TEXT NOT NULL,
  raw_xml                  TEXT NOT NULL,
  parsed_summary           JSONB NOT NULL DEFAULT '{}',
  created_developments_count INTEGER NOT NULL DEFAULT 0,
  status                   TEXT NOT NULL DEFAULT 'parsed',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS xml_imports_user_id_idx ON public.xml_imports(user_id);

-- ============================================================
-- DEVELOPMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.developments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  story_id         UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  client_id        UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  development_type TEXT NOT NULL,
  target_table     TEXT,
  application_scope TEXT,
  update_set       TEXT,
  short_description TEXT,
  technical_notes  TEXT,
  status           TEXT NOT NULL DEFAULT 'draft',
  config           JSONB NOT NULL DEFAULT '{}',
  raw_xml          TEXT,
  xml_import_id    UUID REFERENCES public.xml_imports(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS developments_user_id_idx   ON public.developments(user_id);
CREATE INDEX IF NOT EXISTS developments_story_id_idx  ON public.developments(story_id);
CREATE INDEX IF NOT EXISTS developments_client_id_idx ON public.developments(client_id);

-- ============================================================
-- LIST LAYOUTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.list_layouts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity     TEXT NOT NULL,
  name       TEXT NOT NULL,
  columns    JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS list_layouts_user_id_entity_idx ON public.list_layouts(user_id, entity);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER set_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER set_stories_updated_at
  BEFORE UPDATE ON public.stories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER set_developments_updated_at
  BEFORE UPDATE ON public.developments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER set_list_layouts_updated_at
  BEFORE UPDATE ON public.list_layouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
