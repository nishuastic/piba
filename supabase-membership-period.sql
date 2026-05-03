-- =============================================
-- PIBA — Membership Period Extension
-- =============================================
-- Adds start/end date fields for membership validity

ALTER TABLE members ADD COLUMN IF NOT EXISTS membership_start date;
ALTER TABLE members ADD COLUMN IF NOT EXISTS membership_end date;

-- Set all existing members to Sep 2025 - Aug 2026
UPDATE members SET membership_start = '2025-09-01', membership_end = '2026-08-31'
  WHERE membership_start IS NULL;
