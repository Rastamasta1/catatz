-- =============================================
-- Migration 015: Rekap Preferences & Custom Reports
-- Adds rekap configuration to user_preferences
-- and creates the rekap_kustom table.
-- =============================================

-- 1. Extend user_preferences with rekap configuration
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS rekap_start_day INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS rekap_accumulate_balance BOOLEAN NOT NULL DEFAULT TRUE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_user_preferences_rekap_start_day'
      AND conrelid = 'public.user_preferences'::regclass
  ) THEN
    ALTER TABLE public.user_preferences
      ADD CONSTRAINT chk_user_preferences_rekap_start_day
      CHECK (rekap_start_day BETWEEN 1 AND 31);
  END IF;
END $$;

-- 2. Create rekap_kustom table
CREATE TABLE IF NOT EXISTS public.rekap_kustom (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nama            TEXT NOT NULL,
  tanggal_mulai   DATE NOT NULL,
  tanggal_selesai DATE NOT NULL,
  catatan         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_rekap_kustom_tanggal CHECK (tanggal_selesai >= tanggal_mulai)
);

-- Index for querying custom reports by user and start date
CREATE INDEX IF NOT EXISTS idx_rekap_kustom_user_tanggal
  ON public.rekap_kustom(user_id, tanggal_mulai DESC);

-- Enable RLS
ALTER TABLE public.rekap_kustom ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "rekap_kustom: select own" ON public.rekap_kustom;
CREATE POLICY "rekap_kustom: select own" ON public.rekap_kustom
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "rekap_kustom: insert own" ON public.rekap_kustom;
CREATE POLICY "rekap_kustom: insert own" ON public.rekap_kustom
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "rekap_kustom: update own" ON public.rekap_kustom;
CREATE POLICY "rekap_kustom: update own" ON public.rekap_kustom
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "rekap_kustom: delete own" ON public.rekap_kustom;
CREATE POLICY "rekap_kustom: delete own" ON public.rekap_kustom
  FOR DELETE USING (auth.uid() = user_id);

-- Grant API access (Supabase v1.26.05+)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rekap_kustom TO authenticated;
