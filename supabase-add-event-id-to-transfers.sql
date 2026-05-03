-- Add optional event_id to transfers so settlements can be linked to a specific event
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES events(id) ON DELETE SET NULL;

-- Index for fast lookup of settlements per event
CREATE INDEX IF NOT EXISTS idx_transfers_event_id ON transfers(event_id);
