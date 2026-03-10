
DO $$
DECLARE
  v_wf_id uuid;
  v_rule_achat_id uuid;
  v_rule_compta_id uuid;
  v_t1_id uuid;
  v_t2_id uuid;
  v_t3_id uuid;
  v_t4_id uuid;
  v_t5_id uuid;
  v_t6_id uuid;
BEGIN

  -- ═══════════════════════════════════════════
  -- STEP 0: Custom fields
  -- ═══════════════════════════════════════════
  INSERT INTO public.template_custom_fields (
    name, label, field_type, is_required, is_common,
    sub_process_template_id, order_index, placeholder, description
  )
  VALUES
    ('commentaire_refus', 'Commentaire de refus', 'textarea', false, false,
     'c1111111-1111-1111-1111-111111111111', 900, 'Motif du refus...', 'Visible uniquement par les groupes Achat et Comptabilité lors du refus'),
    ('reference_fournisseur', 'Référence fournisseur créée', 'text', false, false,
     'c1111111-1111-1111-1111-111111111111', 910, 'Ex: F000123', 'Rempli par le service comptabilité lors de la validation finale')
  ON CONFLICT DO NOTHING;

  -- ═══════════════════════════════════════════
  -- ASSIGNMENT RULES (upsert with valid hex UUIDs)
  -- ═══════════════════════════════════════════
  INSERT INTO public.wf_assignment_rules (id, name, type, target_id)
  VALUES ('a1111111-1111-1111-1111-111111111111', 'Groupe Achat', 'group', 'a1111111-1111-1111-1111-111111111111')
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO v_rule_achat_id;
  IF v_rule_achat_id IS NULL THEN v_rule_achat_id := 'a1111111-1111-1111-1111-111111111111'; END IF;

  INSERT INTO public.wf_assignment_rules (id, name, type, target_id)
  VALUES ('a2222222-2222-2222-2222-222222222222', 'Groupe Comptabilité', 'group', 'a2222222-2222-2222-2222-222222222222')
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO v_rule_compta_id;
  IF v_rule_compta_id IS NULL THEN v_rule_compta_id := 'a2222222-2222-2222-2222-222222222222'; END IF;

  -- ═══════════════════════════════════════════
  -- WORKFLOW (use gen_random_uuid)
  -- ═══════════════════════════════════════════
  -- Check if workflow already exists for this sub_process
  SELECT id INTO v_wf_id FROM public.wf_workflows
  WHERE sub_process_template_id = 'c1111111-1111-1111-1111-111111111111' AND is_active = true
  LIMIT 1;

  IF v_wf_id IS NULL THEN
    INSERT INTO public.wf_workflows (
      name, description, sub_process_template_id,
      is_draft, is_active, published_at, config_mode, version
    )
    VALUES (
      'Workflow Demande de nouveau fournisseur',
      'Workflow complet pour la demande de création d''un nouveau fournisseur : validation Achat → création Comptabilité.',
      'c1111111-1111-1111-1111-111111111111',
      false, true, now(), 'custom', 1
    )
    RETURNING id INTO v_wf_id;
  END IF;

  -- ═══════════════════════════════════════════
  -- STEPS
  -- ═══════════════════════════════════════════
  INSERT INTO public.wf_steps (workflow_id, step_key, name, step_type, order_index, state_label, assignment_rule_id, validation_mode)
  VALUES
    (v_wf_id, 'start',                'Début',                          'start',      0,   'Nouvelle demande',                            null,              'none'),
    (v_wf_id, 'validation_achat',     'Vérification fournisseur',       'validation', 10,  'En attente de validation',                    v_rule_achat_id,   'simple'),
    (v_wf_id, 'creation_fournisseur', 'Création fournisseur',           'execution',  20,  'En cours de traitement',                      v_rule_compta_id,  'none'),
    (v_wf_id, 'refuse',              'Refusée',                         'end',        900, 'Refusée',                                     null,              'none'),
    (v_wf_id, 'attente_infos',       'En attente d''informations',      'end',        800, 'En attente d''informations complémentaires',  null,              'none'),
    (v_wf_id, 'termine',             'Terminée',                        'end',        999, 'Terminée',                                    null,              'none')
  ON CONFLICT DO NOTHING;

  -- ═══════════════════════════════════════════
  -- TRANSITIONS
  -- ═══════════════════════════════════════════
  v_t1_id := gen_random_uuid();
  v_t2_id := gen_random_uuid();
  v_t3_id := gen_random_uuid();
  v_t4_id := gen_random_uuid();
  v_t5_id := gen_random_uuid();
  v_t6_id := gen_random_uuid();

  INSERT INTO public.wf_transitions (id, workflow_id, from_step_key, to_step_key, event)
  VALUES
    (v_t1_id, v_wf_id, 'start',                'validation_achat',     'created'),
    (v_t2_id, v_wf_id, 'validation_achat',     'creation_fournisseur', 'approved'),
    (v_t3_id, v_wf_id, 'validation_achat',     'refuse',              'rejected'),
    (v_t4_id, v_wf_id, 'creation_fournisseur', 'termine',             'approved'),
    (v_t5_id, v_wf_id, 'creation_fournisseur', 'refuse',              'rejected'),
    (v_t6_id, v_wf_id, 'creation_fournisseur', 'attente_infos',       'info_requested');

  -- ═══════════════════════════════════════════
  -- ACTIONS
  -- ═══════════════════════════════════════════
  INSERT INTO public.wf_actions (workflow_id, transition_id, action_type, order_index, config_json)
  VALUES
    (v_wf_id, v_t1_id, 'create_task', 0, '{"title":"1.Vérification fournisseur","target_group_id":"a1111111-1111-1111-1111-111111111111","template_task_id":"d1111111-1111-1111-1111-111111111111"}'::jsonb),
    (v_wf_id, v_t1_id, 'set_field',   1, '{"field":"status","value":"pending_validation"}'::jsonb),
    (v_wf_id, v_t2_id, 'set_field',   0, '{"field":"status","value":"in_progress"}'::jsonb),
    (v_wf_id, v_t2_id, 'create_task', 1, '{"title":"Création fournisseur","target_group_id":"a2222222-2222-2222-2222-222222222222","template_task_id":"d2222222-2222-2222-2222-222222222222"}'::jsonb),
    (v_wf_id, v_t3_id, 'set_field',   0, '{"field":"status","value":"rejected"}'::jsonb),
    (v_wf_id, v_t5_id, 'set_field',   0, '{"field":"status","value":"rejected"}'::jsonb),
    (v_wf_id, v_t6_id, 'set_field',   0, '{"field":"status","value":"waiting_for_info"}'::jsonb),
    (v_wf_id, v_t4_id, 'set_field',   0, '{"field":"status","value":"completed"}'::jsonb);

  -- ═══════════════════════════════════════════
  -- NOTIFICATIONS
  -- ═══════════════════════════════════════════
  INSERT INTO public.wf_notifications (workflow_id, step_key, event, channels_json, recipients_rules_json, subject_template, body_template)
  VALUES
    (v_wf_id, 'validation_achat', 'enter', '["in_app"]'::jsonb,
     '[{"type":"group","group_id":"a1111111-1111-1111-1111-111111111111"}]'::jsonb,
     'Nouvelle demande de fournisseur à valider',
     'Merci de vérifier et de valider le cas échéant la demande de création du fournisseur.'),

    (v_wf_id, 'refuse', 'enter', '["in_app"]'::jsonb,
     '[{"type":"requester"}]'::jsonb,
     'Votre demande de fournisseur a été refusée',
     'Votre demande a été refusée car : {{commentaire_refus}}'),

    (v_wf_id, 'creation_fournisseur', 'enter', '["in_app"]'::jsonb,
     '[{"type":"requester"}]'::jsonb,
     'Votre demande de fournisseur a été validée',
     'Votre demande a été validée par le service achat et transmise au service comptabilité.'),

    (v_wf_id, 'attente_infos', 'enter', '["in_app"]'::jsonb,
     '[{"type":"requester"}]'::jsonb,
     'Informations complémentaires requises',
     'Le service comptabilité a besoin d''informations complémentaires concernant votre demande. Merci de consulter le chat de la demande.'),

    (v_wf_id, 'termine', 'enter', '["in_app"]'::jsonb,
     '[{"type":"requester"}]'::jsonb,
     'Votre fournisseur a été créé',
     'Votre demande de nouveau fournisseur a été acceptée et le fournisseur a été créé avec la référence {{reference_fournisseur}}.');

END $$;
