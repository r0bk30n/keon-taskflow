
ALTER TABLE public.inno_demandes
  ADD COLUMN IF NOT EXISTS theme text,
  ADD COLUMN IF NOT EXISTS sous_theme text,
  ADD COLUMN IF NOT EXISTS gain_attendu text,
  ADD COLUMN IF NOT EXISTS partenaires_identifies text,
  ADD COLUMN IF NOT EXISTS ebitda_retour_financier numeric,
  ADD COLUMN IF NOT EXISTS capex_investissement numeric,
  ADD COLUMN IF NOT EXISTS roi numeric,
  ADD COLUMN IF NOT EXISTS commentaires_financiers text,
  ADD COLUMN IF NOT EXISTS temps_caracteristique text,
  ADD COLUMN IF NOT EXISTS commentaire_projet text;
