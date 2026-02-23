ALTER TABLE IF EXISTS properties
ADD COLUMN IF NOT EXISTS owner_phone text;

CREATE INDEX IF NOT EXISTS properties_owner_phone_idx
  ON properties (owner_phone);
