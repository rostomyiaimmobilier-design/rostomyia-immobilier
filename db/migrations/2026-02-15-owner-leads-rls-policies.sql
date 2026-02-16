-- RLS policies for owner_leads: allow public submissions, restrict admin access.

ALTER TABLE IF EXISTS owner_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS owner_leads_insert_public ON owner_leads;
CREATE POLICY owner_leads_insert_public
  ON owner_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    COALESCE(status, 'new') = 'new'
    AND validation_note IS NULL
    AND validated_at IS NULL
    AND validated_by IS NULL
  );

DROP POLICY IF EXISTS owner_leads_select_authenticated ON owner_leads;
CREATE POLICY owner_leads_select_authenticated
  ON owner_leads
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS owner_leads_update_authenticated ON owner_leads;
CREATE POLICY owner_leads_update_authenticated
  ON owner_leads
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
