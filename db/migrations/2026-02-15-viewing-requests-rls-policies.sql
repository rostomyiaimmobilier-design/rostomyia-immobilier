-- RLS policies for viewing_requests: allow public submissions and admin handling.

ALTER TABLE IF EXISTS viewing_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS viewing_requests_insert_public ON viewing_requests;
CREATE POLICY viewing_requests_insert_public
  ON viewing_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    COALESCE(status, 'new') = 'new'
  );

DROP POLICY IF EXISTS viewing_requests_select_authenticated ON viewing_requests;
CREATE POLICY viewing_requests_select_authenticated
  ON viewing_requests
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS viewing_requests_update_authenticated ON viewing_requests;
CREATE POLICY viewing_requests_update_authenticated
  ON viewing_requests
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
