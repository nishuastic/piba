-- =============================================
-- PIBA — Event Cost Payer Extension
-- =============================================
-- Run this in the Supabase SQL Editor to add "paid by" tracking for event costs

ALTER TABLE events ADD COLUMN IF NOT EXISTS court_cost_paid_by text DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS shuttle_cost_paid_by text DEFAULT '';
