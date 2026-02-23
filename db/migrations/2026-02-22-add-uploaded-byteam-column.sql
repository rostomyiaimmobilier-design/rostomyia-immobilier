ALTER TABLE IF EXISTS properties
ADD COLUMN IF NOT EXISTS uploaded_byteam boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS properties_uploaded_byteam_idx
  ON properties (uploaded_byteam);
