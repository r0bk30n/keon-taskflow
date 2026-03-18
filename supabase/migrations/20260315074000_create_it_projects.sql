-- Table created manually in the original project without a migration.
-- Recreating it here so subsequent migrations can reference it via FK.

CREATE TABLE IF NOT EXISTS public.it_projects (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  code_projet_digital   TEXT          NOT NULL UNIQUE,
  nom_projet            TEXT          NOT NULL,
  description           TEXT,
  type_projet           TEXT,
  priorite              TEXT,
  statut                TEXT          NOT NULL DEFAULT 'backlog',
  phase_courante        TEXT,
  responsable_it_id     UUID          REFERENCES public.profiles(id) ON DELETE SET NULL,
  chef_projet_id        UUID          REFERENCES public.profiles(id) ON DELETE SET NULL,
  chef_projet_it_id     UUID          REFERENCES public.profiles(id) ON DELETE SET NULL,
  chef_projet_metier_id UUID          REFERENCES public.profiles(id) ON DELETE SET NULL,
  sponsor_id            UUID          REFERENCES public.profiles(id) ON DELETE SET NULL,
  directeur_id          UUID          REFERENCES public.profiles(id) ON DELETE SET NULL,
  groupe_service_id     UUID          REFERENCES public.departments(id) ON DELETE SET NULL,
  company_id            UUID          REFERENCES public.companies(id) ON DELETE SET NULL,
  created_by            UUID          REFERENCES public.profiles(id) ON DELETE SET NULL,
  membres_ids           UUID[],
  date_debut            DATE,
  date_fin_prevue       DATE,
  date_fin_reelle       DATE,
  budget_previsionnel   NUMERIC,
  budget_consomme       NUMERIC,
  progress              NUMERIC       DEFAULT 0,
  teams_channel_id      TEXT,
  teams_channel_url     TEXT,
  loop_workspace_id     TEXT,
  loop_workspace_url    TEXT,
  pilier                TEXT,
  fdr_priorite          TEXT,
  fdr_type              TEXT,
  fdr_description       TEXT,
  fdr_commentaires      TEXT,
  statut_fdr            TEXT,
  etape_validation_fdr  INTEGER       DEFAULT 0,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE public.it_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read it_projects"
  ON public.it_projects FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert it_projects"
  ON public.it_projects FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update it_projects"
  ON public.it_projects FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete it_projects"
  ON public.it_projects FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_it_projects_updated_at
  BEFORE UPDATE ON public.it_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
