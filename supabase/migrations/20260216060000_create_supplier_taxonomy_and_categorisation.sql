-- These tables were created manually in the original project without a migration.
-- Recreating them here so subsequent migrations (20260216061648) can apply RLS.

CREATE TABLE IF NOT EXISTS public.supplier_taxonomy (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  categorie   TEXT        NOT NULL,
  famille     TEXT        NOT NULL,
  segment     TEXT        NOT NULL,
  sous_segment TEXT,
  active      BOOLEAN     NOT NULL DEFAULT true,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.supplier_categorisation (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  categorie   TEXT        NOT NULL,
  famille     TEXT        NOT NULL,
  active      BOOLEAN     NOT NULL DEFAULT true,
  catfam_key  TEXT        NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
