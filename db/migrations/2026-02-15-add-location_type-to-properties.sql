-- Add explicit location type (type de location) to properties.
ALTER TABLE IF EXISTS properties
  ADD COLUMN IF NOT EXISTS location_type text;

-- Backfill existing rows using current base type.
UPDATE properties
SET location_type = CASE
  WHEN lower(type) = 'vente' THEN 'vente'
  WHEN lower(type) = 'location' THEN 'location'
  ELSE location_type
END
WHERE location_type IS NULL;

-- Optional index for faster filtering by location type.
CREATE INDEX IF NOT EXISTS idx_properties_location_type
  ON properties (location_type);
