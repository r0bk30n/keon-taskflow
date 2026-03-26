-- =========================================================
-- SPV (pilier 02) — Generalites fields restructuring
-- - Keeps customization logic intact (custom fields untouched)
-- - Upserts builtin fields by champ_id (champ_id is UNIQUE)
-- =========================================================

BEGIN;

INSERT INTO public.questionnaire_field_definitions
  (champ_id, pilier_code, section, sous_section, label, type_champ, options, note, has_evaluation_risque, required, order_index, is_builtin, is_active)
VALUES
  ('02_GEN_spv_cree',                    '02', 'GENERALITES', 'Données admin.', 'SPV créée ?',                                                   'select',     ARRAY['OUI','NON','EN COURS','EN ATTENTE','A LANCER','?'], NULL, false, false,  10, true, true),
  ('02_GEN_raison_sociale',              '02', 'GENERALITES', 'Données admin.', 'Raison sociale',                                                'text',       NULL, NULL, false, false,  20, true, true),
  ('02_GEN_statut_juridique',            '02', 'GENERALITES', 'Données admin.', 'Statut juridique',                                              'text',       NULL, NULL, false, false,  30, true, true),
  ('02_GEN_code_ape',                    '02', 'GENERALITES', 'Données admin.', 'Code APE',                                                      'text',       NULL, NULL, false, false,  40, true, true),
  ('02_GEN_siret',                       '02', 'GENERALITES', 'Données admin.', 'Numéro de SIRET',                                               'text',       NULL, NULL, false, false,  50, true, true),
  ('02_GEN_rcs',                         '02', 'GENERALITES', 'Données admin.', 'Numéro RCS',                                                    'text',       NULL, NULL, false, false,  60, true, true),
  ('02_GEN_date_prev_creation',          '02', 'GENERALITES', 'Données admin.', 'Date prévisionnelle de création',                              'text',       NULL, 'Format AAAA-MM-JJ', false, false,  70, true, true),
  ('02_GEN_date_creation',               '02', 'GENERALITES', 'Données admin.', 'Date de création',                                              'text',       NULL, 'Format AAAA-MM-JJ', false, false,  80, true, true),
  ('02_GEN_date_immatriculation',        '02', 'GENERALITES', 'Données admin.', 'Date d''immatriculation',                                       'text',       NULL, 'Format AAAA-MM-JJ', false, false,  90, true, true),
  ('02_GEN_capital_social',              '02', 'GENERALITES', 'Données admin.', 'Montant du capital social actuel (€)',                          'euros',      NULL, NULL, false, false, 100, true, true),
  ('02_GEN_capital_social_closing',      '02', 'GENERALITES', 'Données admin.', 'Montant du capital social au moment du closing financier (€)',  'euros',      NULL, NULL, false, false, 110, true, true),
  ('02_GEN_nb_salaries',                 '02', 'GENERALITES', 'Données admin.', 'Nombre de salariés',                                            'number',     NULL, NULL, false, false, 120, true, true),
  ('02_GEN_adresse_siege',               '02', 'GENERALITES', 'Données admin.', 'Adresse du siège social',                                       'textarea',   NULL, NULL, false, false, 130, true, true),
  ('02_GEN_etablissement_secondaire',    '02', 'GENERALITES', 'Données admin.', 'Présence d''un établissement secondaire',                       'select',     ARRAY['OUI','NON'], NULL, false, false, 140, true, true),
  ('02_GEN_adresse_etab_secondaire',     '02', 'GENERALITES', 'Données admin.', 'Adresse de l''établissement secondaire',                        'textarea',   NULL, NULL, false, false, 150, true, true),
  ('02_GEN_president',                   '02', 'GENERALITES', 'Données admin.', 'Nom du président',                                              'text',       NULL, NULL, false, false, 160, true, true),
  ('02_GEN_president_mandate',           '02', 'GENERALITES', 'Données admin.', 'Nom du président mandaté',                                      'text',       NULL, NULL, false, false, 170, true, true)
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
  is_active = EXCLUDED.is_active
WHERE public.questionnaire_field_definitions.is_builtin = true;

COMMIT;

