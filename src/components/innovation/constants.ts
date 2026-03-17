/**
 * Shared constants and types for the Innovation module
 */

export const INNOVATION_PROCESS_ID = 'a1b2c3d4-0000-4000-a000-000000000001';

export const ENTITES = ['NASKEO', 'KEON.BIO', 'TEIKEI', 'SYCOMORE', 'KEON', 'CAPCOO', 'INTERFILIALE', 'GECO2', 'EXTERNE'] as const;

export const THEMES = [
  'INTRANTS',
  'PROCESS PRODUCTION',
  'PROCESS VALORISATION BIOGAZ',
  'PROCESS VALORISATION DIGESTAT',
  'SUPPORT ET FONCTIONS TRANSVERSES',
] as const;

export const SOUS_THEMES: Record<string, string[]> = {
  'INTRANTS': [
    'Nouveaux intrants',
    'Productions végétales',
    'Productions animales',
    'Stockage et manutention',
    'Autre',
  ],
  'PROCESS PRODUCTION': [
    'Préparation intrants',
    'Pilotage, maintenance et exploitation',
    'Efficacité énergétique et auto-production',
    'Process méthanisation',
    'Lots périphériques',
    'Autre',
  ],
  'PROCESS VALORISATION BIOGAZ': [
    'Epuration biogaz',
    'Valorisation offgaz',
    'Efficacité énergétique',
    'Valorisation biométhane',
    'Autre',
  ],
  'PROCESS VALORISATION DIGESTAT': [
    'Logistique et épandage',
    'Amélioration des propriétés / qualité',
    'Nouvelles valorisations',
    'Stockage et manutention',
    'Autre',
  ],
  'SUPPORT ET FONCTIONS TRANSVERSES': [
    "Pilotage de l'entreprise",
    'RH',
    'Communication et concertation',
    'Autre',
  ],
};

export const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  'Soumise':           { label: 'Soumise',           color: 'hsl(210 80% 55%)' },
  'En instruction':    { label: 'En instruction',    color: 'hsl(40 90% 50%)' },
  'Préparation CODIR': { label: 'Préparation CODIR', color: 'hsl(270 60% 55%)' },
  'Arbitrage CODIR':   { label: 'Arbitrage CODIR',   color: 'hsl(25 85% 52%)' },
  'Validée':           { label: 'Validée',           color: 'hsl(140 60% 45%)' },
  'Refusée':           { label: 'Refusée',           color: 'hsl(0 70% 50%)' },
  'En attente info':   { label: 'En attente info',   color: 'hsl(55 85% 45%)' },
  'Annulée':           { label: 'Annulée',           color: 'hsl(0 0% 60%)' },
};

export const GROUPING_FIELDS = [
  { value: 'status', label: 'Statut' },
  { value: 'entite_concernee', label: 'Entité' },
  { value: 'code_projet', label: 'Code projet' },
  { value: 'usage_inno', label: 'Usage' },
  { value: 'theme', label: 'Thème' },
  { value: 'sous_theme', label: 'Sous-thème' },
  { value: 'requester_name', label: 'Demandeur' },
] as const;

export type GroupingField = typeof GROUPING_FIELDS[number]['value'];

export interface InnoRequest {
  id: string;
  title: string;
  status: string;
  priority: string;
  request_number: string | null;
  created_at: string;
  updated_at: string;
  requester_name: string;
  demandeur_id: string;
  // Custom field values (flattened)
  nom_projet: string;
  code_projet: string;
  theme: string;
  sous_theme: string;
  descriptif: string;
  commentaire_demande: string;
  gain_attendu: string;
  partenaires_identifies: string;
  entite_concernee: string;
  usage_inno: string;
  ebitda_retour_financier: number | null;
  capex_investissement: number | null;
  roi: number | null;
  commentaires_financiers: string;
  temps_caracteristique: string;
  difficulte_complexite: number | null;
  niveau_strategique: number | null;
  etiquettes: string;
  sponsor: string;
  commentaire_projet: string;
}

export interface InnoFilters {
  search: string;
  status: string;
  entite: string;
  codeProjet: string;
  usage: string;
  theme: string;
  dateFrom?: Date;
  dateTo?: Date;
}
