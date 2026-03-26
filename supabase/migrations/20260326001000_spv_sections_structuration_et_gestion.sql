-- =========================================================
-- SPV (pilier 02) — Add/align sections:
-- - TABLE DE CAPI ET CCA
-- - GOUVERNANCE (CODIR + AG)
-- - STRUCTURATION JURIDIQUE (Statuts / Pacte / Convention apports CCA)
-- - GESTION ADMINISTRATIVE ET FINANCIERE
-- - GESTION DES RESSOURCES HUMAINES (incl. spreadsheets)
-- - GESTION DE L'IT
--
-- Notes:
-- - Upserts builtin fields by champ_id (champ_id is UNIQUE)
-- - Does not touch custom fields (is_builtin=false)
-- - Spreadsheet templates: rows/cols include headers row+col
-- =========================================================

BEGIN;

INSERT INTO public.questionnaire_field_definitions
  (champ_id, pilier_code, section, sous_section, label, type_champ, options, note, has_evaluation_risque, required, order_index, is_builtin, is_active, spreadsheet_template)
VALUES
  -- =========================================================
  -- TABLE DE CAPI ET CCA
  -- =========================================================
  ('02_CAPI_nb_actions',              '02', 'TABLE DE CAPI ET CCA', NULL, 'Nombre d''actions',                                'number',     NULL, NULL, false, false,  10, true, true, NULL),
  ('02_CAPI_valeur_action',           '02', 'TABLE DE CAPI ET CCA', NULL, 'Valeur d''une action (€/action)',                   'euros',      NULL, NULL, false, false,  20, true, true, NULL),
  ('02_CAPI_montant_ks',              '02', 'TABLE DE CAPI ET CCA', NULL, 'Montant du capital social (KS) en €',               'euros',      NULL, NULL, false, false,  30, true, true, NULL),
  ('02_CAPI_montant_cca_engages',     '02', 'TABLE DE CAPI ET CCA', NULL, 'Montant de comptes courants (CCA) engagés (€)',     'euros',      NULL, NULL, false, false,  40, true, true, NULL),

  -- =========================================================
  -- GOUVERNANCE — CODIR
  -- =========================================================
  ('02_GOV_codir_frequence',          '02', 'GOUVERNANCE', 'CODIR', 'Fréquence CODIR',                                       'text',       NULL, NULL, false, false,  10, true, true, NULL),
  ('02_GOV_codir_delai_convocation',  '02', 'GOUVERNANCE', 'CODIR', 'Délai d''envoi de la convocation avant CODIR',           'text',       NULL, NULL, false, false,  20, true, true, NULL),
  ('02_GOV_majorite_simple',          '02', 'GOUVERNANCE', 'CODIR', 'Majorité simple du CODIR',                               'text',       NULL, 'Format X/X ou X%', false, false,  30, true, true, NULL),
  ('02_GOV_majorite_qualifiee',       '02', 'GOUVERNANCE', 'CODIR', 'Majorité qualifiée du CODIR',                            'text',       NULL, 'Format X/X ou X%', false, false,  40, true, true, NULL),
  ('02_GOV_codir_quorum',             '02', 'GOUVERNANCE', 'CODIR', 'Quorum',                                                'text',       NULL, NULL, false, false,  50, true, true, NULL),

  -- =========================================================
  -- GOUVERNANCE — AG
  -- =========================================================
  ('02_GOV_ag_frequence',             '02', 'GOUVERNANCE', 'AG', 'Fréquence AG',                                             'text',       NULL, NULL, false, false, 110, true, true, NULL),
  ('02_GOV_ag_delai_convocation',     '02', 'GOUVERNANCE', 'AG', 'Délai d''envoi de la convocation avant AG',                 'text',       NULL, NULL, false, false, 120, true, true, NULL),
  ('02_GOV_ag_majorite_simple',       '02', 'GOUVERNANCE', 'AG', 'Majorité simple de l''AG',                                  'text',       NULL, 'Format X/X ou X%', false, false, 130, true, true, NULL),
  ('02_GOV_ag_majorite_qualifiee',    '02', 'GOUVERNANCE', 'AG', 'Majorité qualifiée de l''AG',                               'text',       NULL, 'Format X/X ou X%', false, false, 140, true, true, NULL),
  ('02_GOV_ag_quorum',                '02', 'GOUVERNANCE', 'AG', 'Quorum',                                                  'text',       NULL, NULL, false, false, 150, true, true, NULL),

  -- =========================================================
  -- STRUCTURATION JURIDIQUE — Statuts
  -- =========================================================
  ('02_JUR_statuts_grille_dispo',     '02', 'STRUCTURATION JURIDIQUE', 'Statuts', 'Grille d''analyse des statuts disponible ?', 'select', ARRAY['OUI','NON','NC'], NULL, false, false, 10, true, true, NULL),
  ('02_JUR_statuts_conformite',       '02', 'STRUCTURATION JURIDIQUE', 'Statuts', 'Conformité des statuts à la grille ?',       'select', ARRAY['OUI','NON','NC'], NULL, false, false, 20, true, true, NULL),

  -- STRUCTURATION JURIDIQUE — Pacte d'associés
  ('02_JUR_pacte_dispo',              '02', 'STRUCTURATION JURIDIQUE', 'Pacte d''associés', 'Pacte d''associés disponible ?',               'select', ARRAY['OUI','NON','NC'], NULL, false, false, 30, true, true, NULL),
  ('02_JUR_pacte_conformite',         '02', 'STRUCTURATION JURIDIQUE', 'Pacte d''associés', 'Conformité du pacte d''associés à la grille ?', 'select', ARRAY['OUI','NON','NC'], NULL, false, false, 40, true, true, NULL),

  -- STRUCTURATION JURIDIQUE — Convention d'apports en CCA
  ('02_JUR_cca_grille_dispo',         '02', 'STRUCTURATION JURIDIQUE', 'Convention d''apports en CCA', 'Grille d''analyse de la convention d''apports en CCA disponible ?', 'select', ARRAY['OUI','NON','NC'], NULL, false, false, 50, true, true, NULL),
  ('02_JUR_cca_conformite',           '02', 'STRUCTURATION JURIDIQUE', 'Convention d''apports en CCA', 'Conformité de la convention d''apports en CCA à la grille ?',       'select', ARRAY['OUI','NON','NC'], NULL, false, false, 60, true, true, NULL),

  -- =========================================================
  -- GESTION ADMINISTRATIVE ET FINANCIERE
  -- =========================================================
  ('02_ADM_date_cloture_comptes',     '02', 'GESTION ADMINISTRATIVE ET FINANCIERE', NULL, 'Date de clôture des comptes',                 'text', NULL, 'Format AAAA-MM-JJ', false, false, 10, true, true, NULL),
  ('02_ADM_societe_gestion',          '02', 'GESTION ADMINISTRATIVE ET FINANCIERE', NULL, 'Société en charge de la gestion administrative et financière', 'text', NULL, NULL, false, false, 20, true, true, NULL),
  ('02_ADM_cac_impose',               '02', 'GESTION ADMINISTRATIVE ET FINANCIERE', NULL, 'Commissaire aux comptes imposé ?',           'select', ARRAY['OUI','NON','NC'], NULL, false, false, 30, true, true, NULL),
  ('02_ADM_nom_cac',                  '02', 'GESTION ADMINISTRATIVE ET FINANCIERE', NULL, 'Nom du commissaire aux comptes',             'text', NULL, NULL, false, false, 40, true, true, NULL),
  ('02_ADM_frequence_tva',            '02', 'GESTION ADMINISTRATIVE ET FINANCIERE', NULL, 'Fréquence de déclaration de TVA ?',          'text', NULL, NULL, false, false, 50, true, true, NULL),

  -- =========================================================
  -- GESTION DES RESSOURCES HUMAINES — Informations générales
  -- =========================================================
  ('02_RH_nb_etp',                    '02', 'GESTION DES RESSOURCES HUMAINES', 'Informations générales', 'Nombre d''ETP',           'number', NULL, NULL, false, false, 10, true, true, NULL),
  ('02_RH_recrutement_qui',           '02', 'GESTION DES RESSOURCES HUMAINES', 'Informations générales', 'Qui se charge du recrutement ?', 'text', NULL, NULL, false, false, 20, true, true, NULL),
  ('02_RH_budget_recrutement',        '02', 'GESTION DES RESSOURCES HUMAINES', 'Informations générales', 'Budget recrutement ? (€HT)', 'euros', NULL, NULL, false, false, 30, true, true, NULL),

  -- GESTION DES RESSOURCES HUMAINES — Tables
  ('02_RH_table_recrutement_contrats','02', 'GESTION DES RESSOURCES HUMAINES', 'Recrutement et contrats de travail', 'Tableau recrutement et contrats de travail', 'spreadsheet', NULL, NULL, false, false, 40, true, true,
    jsonb_build_object(
      'rows', 11,
      'cols', 6,
      'colHeaders', ARRAY['','','','',''],
      'rowHeaders', ARRAY['1','2','3','4','5','6','7','8','9','10']
    )
  ),
  ('02_RH_table_formations',          '02', 'GESTION DES RESSOURCES HUMAINES', 'Formations', 'Tableau formations', 'spreadsheet', NULL, NULL, false, false, 50, true, true,
    jsonb_build_object(
      'rows', 11,
      'cols', 6,
      'colHeaders', ARRAY['','','','',''],
      'rowHeaders', ARRAY['1','2','3','4','5','6','7','8','9','10']
    )
  ),
  ('02_RH_table_vehicules_service',   '02', 'GESTION DES RESSOURCES HUMAINES', 'Véhicules de service', 'Tableau véhicules de service', 'spreadsheet', NULL, NULL, false, false, 60, true, true,
    jsonb_build_object(
      'rows', 4,
      'cols', 3,
      'colHeaders', ARRAY['',''],
      'rowHeaders', ARRAY['1','2','3']
    )
  ),

  -- =========================================================
  -- GESTION DE L'IT
  -- =========================================================
  -- Logiciel d'exploitation
  ('02_IT_logiciel_grille_dispo',     '02', 'GESTION DE L''IT', 'logiciel d''exploitation', 'Grille d''analyse des statuts disponible ?',  'select', ARRAY['OUI','NON','NC'], NULL, false, false, 10, true, true, NULL),
  ('02_IT_logiciel_conformite',       '02', 'GESTION DE L''IT', 'logiciel d''exploitation', 'Conformité des statuts à la grille ?',        'select', ARRAY['OUI','NON','NC'], NULL, false, false, 20, true, true, NULL),

  -- Tâches informatiques externalisées
  ('02_IT_ext_grille_dispo',          '02', 'GESTION DE L''IT', 'Tâches informatiques externalisées', 'Grille d''analyse du pacte d''associés disponible ?', 'select', ARRAY['OUI','NON','NC'], NULL, false, false, 30, true, true, NULL),
  ('02_IT_ext_conformite',            '02', 'GESTION DE L''IT', 'Tâches informatiques externalisées', 'Conformité du pacte d''associé à la grille ?',       'select', ARRAY['OUI','NON','NC'], NULL, false, false, 40, true, true, NULL),

  -- Tâches informatiques internalisées
  ('02_IT_int_grille_dispo',          '02', 'GESTION DE L''IT', 'Tâches informatiques internalisées', 'Grille d''analyse de la convention d''apports en CCA disponible ?', 'select', ARRAY['OUI','NON','NC'], NULL, false, false, 50, true, true, NULL),
  ('02_IT_int_conformite',            '02', 'GESTION DE L''IT', 'Tâches informatiques internalisées', 'Conformité de la convention d''apports en CCA à la grille ?',       'select', ARRAY['OUI','NON','NC'], NULL, false, false, 60, true, true, NULL)

ON CONFLICT (champ_id)
DO UPDATE SET
  pilier_code = EXCLUDED.pilier_code,
  section = EXCLUDED.section,
  sous_section = EXCLUDED.sous_section,
  label = EXCLUDED.label,
  type_champ = EXCLUDED.type_champ,
  options = EXCLUDED.options,
  note = EXCLUDED.note,
  has_evaluation_risque = EXCLUDED.has_evaluation_risque,
  required = EXCLUDED.required,
  order_index = EXCLUDED.order_index,
  is_active = EXCLUDED.is_active,
  spreadsheet_template = EXCLUDED.spreadsheet_template
WHERE public.questionnaire_field_definitions.is_builtin = true;

COMMIT;

