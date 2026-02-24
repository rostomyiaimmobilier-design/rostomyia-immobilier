ALTER TABLE IF EXISTS owner_leads
  ADD COLUMN IF NOT EXISTS amenities text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE IF EXISTS owner_leads
  ADD COLUMN IF NOT EXISTS commission text;

CREATE INDEX IF NOT EXISTS owner_leads_amenities_gin_idx
  ON owner_leads
  USING gin (amenities);
