-- Migration: Add FSRS fields and sync tracking
-- Run this on your Supabase database to support FSRS algorithm and offline sync

-- =====================================================
-- 1. Add FSRS fields to study_logs
-- =====================================================

-- Add new FSRS columns
ALTER TABLE study_logs
ADD COLUMN IF NOT EXISTS stability float DEFAULT 0,
ADD COLUMN IF NOT EXISTS difficulty float DEFAULT 5,
ADD COLUMN IF NOT EXISTS reps integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS lapses integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS state text DEFAULT 'new';

-- Add comment for documentation
COMMENT ON COLUMN study_logs.stability IS 'FSRS: Memory stability in days (time for R to drop to 90%)';
COMMENT ON COLUMN study_logs.difficulty IS 'FSRS: Card difficulty (1-10, 1=easy, 10=hard)';
COMMENT ON COLUMN study_logs.reps IS 'FSRS: Total number of reviews';
COMMENT ON COLUMN study_logs.lapses IS 'FSRS: Number of times card was forgotten';
COMMENT ON COLUMN study_logs.state IS 'FSRS: Card state (new, learning, review, relearning)';

-- =====================================================
-- 2. Add sync tracking columns
-- =====================================================

-- Collections sync tracking
ALTER TABLE collections
ADD COLUMN IF NOT EXISTS synced_at timestamp with time zone;

-- Flashcards sync tracking
ALTER TABLE flashcards
ADD COLUMN IF NOT EXISTS synced_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- Study logs sync tracking
ALTER TABLE study_logs
ADD COLUMN IF NOT EXISTS synced_at timestamp with time zone;

-- =====================================================
-- 3. Create indexes for sync queries
-- =====================================================

-- Index for finding unsynced/modified collections
CREATE INDEX IF NOT EXISTS idx_collections_sync
ON collections(user_id, updated_at);

-- Index for finding unsynced/modified flashcards
CREATE INDEX IF NOT EXISTS idx_flashcards_sync
ON flashcards(user_id, created_at);

-- Index for finding unsynced/modified study logs
CREATE INDEX IF NOT EXISTS idx_study_logs_sync
ON study_logs(user_id, last_studied_at);

-- =====================================================
-- 4. Migrate existing SM-2 data to FSRS (one-time)
-- =====================================================

-- Convert existing SM-2 data to FSRS format
-- This preserves the existing scheduling while adding FSRS fields
UPDATE study_logs
SET
  -- Stability approximated from interval
  stability = GREATEST(0.5, COALESCE(interval, 1)),
  -- Difficulty derived from ease_factor (inverse relationship)
  -- SM-2: 1.3 (hard) to 3.0 (easy) -> FSRS: 10 (hard) to 1 (easy)
  difficulty = LEAST(10, GREATEST(1, 11 - (COALESCE(ease_factor, 2.5) - 1.3) * (9.0 / 1.7))),
  -- Reps from box
  reps = COALESCE(box, 0),
  -- Default lapses to 0
  lapses = COALESCE(lapses, 0),
  -- Determine state based on box and interval
  state = CASE
    WHEN box = 0 THEN 'learning'
    WHEN interval <= 1 THEN 'learning'
    ELSE 'review'
  END
WHERE stability IS NULL OR stability = 0;

-- =====================================================
-- 5. Add trigger to auto-update updated_at
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for collections
DROP TRIGGER IF EXISTS update_collections_updated_at ON collections;
CREATE TRIGGER update_collections_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for flashcards
DROP TRIGGER IF EXISTS update_flashcards_updated_at ON flashcards;
CREATE TRIGGER update_flashcards_updated_at
  BEFORE UPDATE ON flashcards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
