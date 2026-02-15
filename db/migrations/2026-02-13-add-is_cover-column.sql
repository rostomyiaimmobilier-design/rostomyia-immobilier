-- Add 'is_cover' column to property_images (Postgres / Supabase)
ALTER TABLE IF EXISTS property_images
  ADD COLUMN IF NOT EXISTS is_cover boolean DEFAULT false;

-- Optional index to speed up lookups by property and cover flag
CREATE INDEX IF NOT EXISTS idx_property_images_property_id_is_cover ON property_images (property_id, is_cover);
