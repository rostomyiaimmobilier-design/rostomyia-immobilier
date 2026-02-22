ALTER TABLE IF EXISTS properties
  ADD COLUMN IF NOT EXISTS amenities text[] NOT NULL DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS properties_amenities_gin_idx
  ON properties
  USING gin (amenities);
