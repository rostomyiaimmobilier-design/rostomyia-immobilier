DO $$
BEGIN
  IF to_regclass('public.agency_storefronts') IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agency_storefronts_builder_type_check'
    
      AND conrelid = 'public.agency_storefronts'::regclass
  ) THEN
    ALTER TABLE public.agency_storefronts
      DROP CONSTRAINT agency_storefronts_builder_type_check;
  END IF;

  ALTER TABLE public.agency_storefronts
    ADD CONSTRAINT agency_storefronts_builder_type_check
    CHECK (builder_type IN ('native', 'puck', 'webstudio'));
END $$;
