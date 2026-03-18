# Switchover Supabase (ancien → nouveau) — TODO simple

## Pré-requis (une fois)

- [ ] Vérifier que le projet **nouveau** est bien celui-ci : `lfwwtasnurwwkaufymma`
- [ ] Dans `.env`, garder séparés :
  - [ ] **Ancien**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (sert encore tant que pas switch)
  - [ ] **Nouveau**: `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (servira aux imports)
- [ ] Avoir un moyen de **réexporter** les CSV depuis l’ancien projet (batch complet).

---

## Stratégie recommandée (sans `updated_at`) : **full refresh**

> Objectif : repartir d’un snapshot complet de l’ancien et **écraser** le nouveau proprement, puis switch l’app.

### A) Juste avant le switch (fenêtre de cutover)

- [ ] Choisir une fenêtre “maintenance” (idéalement : pas de writes côté app pendant 5–15 min)
- [ ] Faire un **export CSV complet** de l’ancien projet (nouvelle copie, pas celle d’aujourd’hui)
  - [ ] Remplacer le contenu de `migrate_data/` par ces nouveaux CSV

### B) Remettre le nouveau projet à zéro (données uniquement)

- [ ] Sur le nouveau projet, **TRUNCATE toutes les tables `public`** (RESTART IDENTITY + CASCADE)
- [ ] Si nécessaire pour éviter blocages à l’import :
  - [ ] Désactiver les **user triggers** sur `tasks`, `request_sub_processes`, `workflow_runs`
  - [ ] Supprimer temporairement les **FK circulaires** (`tasks ↔ request_sub_processes`, auto-FK sur `tasks`)
  - [ ] Supprimer temporairement les **FK vers `auth.users`** (car pas d’utilisateurs auth au début)

### C) Réimporter le snapshot complet

- [ ] Lancer l’import **API** (pas `psql`) :

```bash
UPSERT=1 ON_CONFLICT_MAP='{"number_counters":"project_code,entity_type"}' node scripts/import_csv_via_supabase_api.mjs
```

- [ ] Vérifier que l’import finit en `exit code 0`
- [ ] Vérifier 2–3 tables clés (ex: `tasks`, `profiles`, `fou_resultat`) et quelques jointures.

### D) Restaurer ce qui doit l’être

- [ ] Réactiver les **user triggers** (si désactivés)
- [ ] Recréer les **FK internes** avec `NOT VALID` (si tu veux les remettre tout de suite)
- [ ] **Ne pas** réactiver les FK vers `auth.users` tant que les users n’existent pas dans `auth.users`
  - [ ] (Option) plus tard : migrer/créer les utilisateurs auth, puis réactiver ces FK

---

## Switch de l’application (Lovable / front)

- [ ] Remplacer la config Supabase utilisée par l’app :
  - [ ] `VITE_SUPABASE_URL` → URL du **nouveau** projet
  - [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` → anon key du **nouveau** projet
- [ ] Déployer / publier la nouvelle version
- [ ] Surveiller :
  - [ ] erreurs RLS / permissions
  - [ ] erreurs liées aux users (si l’app attend des `auth.users` existants)

---

## Plan “sans friction” (contrôle)

- [ ] Avant switch : exporter un snapshot “T-0”
- [ ] Après switch (quelques heures) : comparer rapidement des compteurs (count) entre ancien et nouveau sur tables clés
- [ ] Garder l’ancien projet actif quelques jours (rollback possible : juste remettre les variables VITE sur l’ancien)

