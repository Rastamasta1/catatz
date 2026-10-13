-- =============================================
-- Migration 014: Rekap Periode & Settings
-- Menambahkan tabel rekap_settings dan rekap_periode_custom
-- untuk konfigurasi siklus cut-off dan periode custom rekap keuangan.
-- =============================================

BEGIN;

-- 1. Tabel rekap_settings
CREATE TABLE IF NOT EXISTS public.rekap_settings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  cutoff_day        SMALLINT NOT NULL DEFAULT 1 CHECK (cutoff_day BETWEEN 1 AND 31),
  akumulasi_saldo   BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Index user_id pada rekap_settings
CREATE INDEX IF NOT EXISTS idx_rekap_settings_user_id ON public.rekap_settings(user_id);

-- Aktifkan RLS rekap_settings
ALTER TABLE public.rekap_settings ENABLE ROW LEVEL SECURITY;

-- Policies rekap_settings (tanpa DELETE policy)
DROP POLICY IF EXISTS "rekap_settings: select own" ON public.rekap_settings;
CREATE POLICY "rekap_settings: select own" ON public.rekap_settings
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "rekap_settings: insert own" ON public.rekap_settings;
CREATE POLICY "rekap_settings: insert own" ON public.rekap_settings
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "rekap_settings: update own" ON public.rekap_settings;
CREATE POLICY "rekap_settings: update own" ON public.rekap_settings
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Grant API access rekap_settings ke role authenticated saja
GRANT SELECT, INSERT, UPDATE ON public.rekap_settings TO authenticated;


-- 2. Tabel rekap_periode_custom
CREATE TABLE IF NOT EXISTS public.rekap_periode_custom (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nama              TEXT NOT NULL CHECK (char_length(trim(nama)) >= 1 AND char_length(nama) <= 100),
  tanggal_mulai     DATE NOT NULL,
  tanggal_selesai   DATE NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_rekap_periode_custom_tanggal CHECK (tanggal_selesai >= tanggal_mulai)
);

-- Index (user_id, tanggal_mulai DESC) pada rekap_periode_custom
CREATE INDEX IF NOT EXISTS idx_rekap_periode_custom_user_tanggal
  ON public.rekap_periode_custom(user_id, tanggal_mulai DESC);

-- Aktifkan RLS rekap_periode_custom
ALTER TABLE public.rekap_periode_custom ENABLE ROW LEVEL SECURITY;

-- Policies rekap_periode_custom (CRUD lengkap)
DROP POLICY IF EXISTS "rekap_periode_custom: select own" ON public.rekap_periode_custom;
CREATE POLICY "rekap_periode_custom: select own" ON public.rekap_periode_custom
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "rekap_periode_custom: insert own" ON public.rekap_periode_custom;
CREATE POLICY "rekap_periode_custom: insert own" ON public.rekap_periode_custom
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "rekap_periode_custom: update own" ON public.rekap_periode_custom;
CREATE POLICY "rekap_periode_custom: update own" ON public.rekap_periode_custom
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "rekap_periode_custom: delete own" ON public.rekap_periode_custom;
CREATE POLICY "rekap_periode_custom: delete own" ON public.rekap_periode_custom
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Grant API access rekap_periode_custom ke role authenticated saja
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rekap_periode_custom TO authenticated;

COMMIT;
