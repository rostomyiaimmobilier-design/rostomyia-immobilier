ALTER TABLE IF EXISTS properties
ADD COLUMN IF NOT EXISTS owner_lead_id uuid;

CREATE INDEX IF NOT EXISTS properties_owner_lead_id_idx
  ON properties (owner_lead_id);
