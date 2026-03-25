import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PILIERS, PilierCode } from '@/config/questionnaireConfig';
import { BEProject } from '@/types/beProject';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Leaf, Flame, MapPin, BarChart3 } from 'lucide-react';

import { KpiCard } from './keon-synthese/KpiCard';
import { ProgressGauge } from './keon-synthese/ProgressGauge';
import { InfoRow } from './keon-synthese/InfoRow';
import { computePilierCompletion } from './keon-synthese/utils';

interface Props {
  project: BEProject;
  qstData: Record<string, string>;
}

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];

const SPV_CREE_PROGRESS: Record<string, number> = {
  'OUI': 100,
  'EN COURS': 70,
  'EN ATTENTE': 45,
  'A LANCER': 20,
  'NON': 0,
  '?': 0,
};

const FONCIER_AVANCEMENT_PROGRESS: Record<string, number> = {
  'NC': 0,
  'A LANCER': 20,
  'A DEMARRER': 35,
  'EN ATTENTE': 50,
  'EN COURS': 65,
  'SIGNE': 80,
  'LOI SIGNEE': 90,
  'ACHETE': 100,
};

function isFilled(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === 'string') return v.trim() !== '' && v.trim() !== '—';
  return true;
}

function toNumberOrNull(v: unknown): number | null {
  if (v === undefined || v === null) return null;
  const s = typeof v === 'string' ? v.trim() : String(v);
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function progressFromSelect(option: string | undefined, map: Record<string, number>): number {
  const key = (option || '').toUpperCase().trim();
  if (!key) return 0;
  // Les valeurs du questionnaire sont en majuscules, mais on garde un fallback.
  const direct = map[key];
  if (direct !== undefined) return direct;

  // Fallback sur clés sans majuscules strictes.
  const found = Object.keys(map).find(k => k.toUpperCase() === key);
  return found ? map[found] : 0;
}

function computePilierAvancement(pilierCode: PilierCode, qstData: Record<string, string>): number {
  switch (pilierCode) {
    case '00': {
      // KPI band : typologie
      return isFilled(qstData['00_GEN_typologie']) ? 100 : 0;
    }
    case '02': {
      // KPI band : spv_cree + keon.co KS (%)
      const spvOption = qstData['02_GEN_spv_cree'];
      const spvProgress = progressFromSelect(spvOption, SPV_CREE_PROGRESS);
      const ksRaw = toNumberOrNull(qstData['02_CAPI_keon_pct']);
      const ksProgress = ksRaw === null ? null : Math.max(0, Math.min(100, ksRaw));

      const parts: number[] = [];
      if (isFilled(spvOption)) parts.push(spvProgress);
      if (ksProgress !== null) parts.push(ksProgress);
      return parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : 0;
    }
    case '04': {
      // KPI-like : sécurisation niv1 avancement (si renseigné)
      return progressFromSelect(qstData['04_SEC_p1_niv1_avancement'], FONCIER_AVANCEMENT_PROGRESS);
    }
    case '05': {
      // KPI band : cmax1
      const cmax1 = toNumberOrNull(qstData['05_GEN_cmax1']);
      return cmax1 !== null && cmax1 > 0 ? 100 : 0;
    }
    case '06': {
      // KPI band : gisement total (et on combine avec le statut agricole si présent)
      const quantite = toNumberOrNull(qstData['06_GEN_quantite_totale']);
      const statut = qstData['06_GEN_statut_agricole'];

      const parts: number[] = [];
      if (quantite !== null && quantite > 0) parts.push(100);
      if (isFilled(statut)) {
        // 'Oui' => 100, 'Non'/'NC' => 0
        const statutKey = (statut || '').toLowerCase().trim();
        parts.push(statutKey === 'oui' ? 100 : 0);
      }
      return parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : 0;
    }
    case '07': {
      // Digestat : on combine 3 champs (si renseignés)
      const eligible = progressFromSelect(qstData['07_DIG_eligible_digagri'], { 'OUI': 100, 'NON': 0, 'NC': 0 });
      const plan = progressFromSelect(qstData['07_DIG_plan_epandage_necessaire'], { 'OUI': 100, 'NON': 0, 'NC': 0 });
      const surface = toNumberOrNull(qstData['07_DIG_surface_epandable']);
      const surfaceProg = surface !== null && surface > 0 ? 100 : 0;

      const parts: number[] = [];
      if (isFilled(qstData['07_DIG_eligible_digagri'])) parts.push(eligible);
      if (isFilled(qstData['07_DIG_plan_epandage_necessaire'])) parts.push(plan);
      if (isFilled(qstData['07_DIG_surface_epandable'])) parts.push(surfaceProg);
      return parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : 0;
    }
    default:
      return 0;
  }
}

export function BEProjectKeonSyntheseTab({ project, qstData }: Props) {
  // Radar : complétude (nombre de champs renseignés) pour le côté "complétion".
  // Gauges : on affiche un "avancement" cohérent avec les KPI band (présence/valeurs des champs clés).
  const pilierCompletions = useMemo(
    () =>
      PILIERS.map(p => ({
        code: p.code,
        label: p.shortLabel,
        fullLabel: p.label,
        completion: computePilierCompletion(p.code as PilierCode, qstData),
      })),
    [qstData]
  );

  const radarData = useMemo(
    () => pilierCompletions.map(p => ({ subject: p.label, value: p.completion, fullMark: 100 })),
    [pilierCompletions]
  );

  const gisementPieData = useMemo(() => {
    const fields = [
      { key: '06_GEN_pct_effluents', label: 'Effluents élevage' },
      { key: '06_GEN_pct_cultures', label: 'Cultures' },
      { key: '06_GEN_pct_dechets_iaa', label: 'Déchets IAA / Biodéchets' },
      { key: '06_GEN_pct_maitrise_actionnaires', label: 'Maîtrisé actionnaires' },
    ];
    const data = fields
      .map(f => ({ name: f.label, value: parseFloat(qstData[f.key]) || 0 }))
      .filter(d => d.value > 0);
    const total = data.reduce((s, d) => s + d.value, 0);
    if (total < 100 && total > 0) data.push({ name: 'Autre', value: 100 - total });
    return data;
  }, [qstData]);

  const totalGisement = qstData['06_GEN_quantite_totale'] || '—';
  const spvValue = qstData['02_GEN_spv_cree'] || '—';
  const typologieValue = qstData['00_GEN_typologie'] || '—';
  const keonPct = qstData['02_CAPI_keon_pct'];
  const cmax1 = qstData['05_GEN_cmax1'];
  const cmasValue = qstData['03_GEN_cmas'] || '—';

  const commune = qstData['04_GEN_commune'] || '—';
  const departement = qstData['04_GEN_departement_nom'] || '—';
  const region = qstData['04_GEN_region'] || '—';
  const statutAgricole = qstData['06_GEN_statut_agricole'] || '—';

  return (
    <div className="space-y-6">
      {/* 1. KPI Band */}
      <div className="flex flex-wrap gap-3">
        <KpiCard label="Typologie" value={typologieValue} badge badgeClass="bg-primary/10 text-primary border border-primary/20" />
        <KpiCard
          label="SPV créée ?"
          value={spvValue}
          badge
          badgeClass={spvValue === 'OUI'
            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
            : 'bg-red-500/10 text-red-600 border border-red-500/20'}
        />
        <KpiCard label="Keon.co KS (%)" value={keonPct ? `${keonPct}%` : '—'} badge badgeClass="bg-blue-500/10 text-blue-600 border border-blue-500/20" />
        <KpiCard label="Gisement total" value={totalGisement !== '—' ? `${totalGisement} tMB/an` : '—'} />
        <KpiCard label="CMAS" value={cmasValue} />
      </div>

      {/* 2. Radar + 3. Gauges */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
             
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary " />
              Taux de remplissage du questionnaire</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6 py-4">
              {pilierCompletions.map(p => (
                <ProgressGauge key={p.code} label={p.label} percent={p.completion} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Localisation + 5. Gisement + 6. Gaz */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 4. Localisation */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Localisation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {project.gps_coordinates && (
                <div className="rounded-lg bg-muted/50 p-3 text-center mb-2">
                  <span className="text-xs font-mono text-muted-foreground">{project.gps_coordinates}</span>
                </div>
              )}
              <InfoRow label="Commune" value={commune} />
              <InfoRow label="Département" value={departement} />
              <InfoRow label="Région" value={region} />
              <InfoRow label="Statut agricole" value={statutAgricole} />
              <InfoRow label="Type de foncier" value={qstData['04_GEN_type_foncier'] || '—'} />
              <InfoRow label="Code postal" value={qstData['04_GEN_code_postal'] || '—'} />
            </div>
          </CardContent>
        </Card>

        {/* 5. Gisement Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Leaf className="h-4 w-4 text-emerald-600" />
              Répartition du gisement
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {gisementPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={gisementPieData}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={80}
                    dataKey="value"
                    nameKey="name"
                    paddingAngle={2}
                  >
                    {gisementPieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-8">Aucune donnée de gisement</p>
            )}
            <span className="text-sm font-medium text-muted-foreground mt-2">
              Total : <span className="font-bold text-foreground">{totalGisement} tMB/an</span>
            </span>
          </CardContent>
        </Card>

        {/* 6. Gaz */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              Gaz & Injection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-center py-3">
                <span className="text-3xl font-bold text-foreground">{cmax1 || '—'}</span>
                <p className="text-xs text-muted-foreground mt-1">Cmax 1 (Nm³CH4/h)</p>
              </div>
              <InfoRow label="Cmax 2" value={qstData['05_GEN_cmax2'] ? `${qstData['05_GEN_cmax2']} Nm³/h` : '—'} />
              <InfoRow label="Cmax 3" value={qstData['05_GEN_cmax3'] ? `${qstData['05_GEN_cmax3']} Nm³/h` : '—'} />
              <InfoRow label="Gestionnaire réseau" value={qstData['05_GEN_gestionnaire_reseau'] || '—'} />
              <InfoRow label="Étiage (%)" value={qstData['05_INJ_etiage_pct'] ? `${qstData['05_INJ_etiage_pct']}%` : '—'} />
              <InfoRow label="Mécanisme tarifaire" value={qstData['05_CONTRAT_mecanisme1'] || '—'} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
