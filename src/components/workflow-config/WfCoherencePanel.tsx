import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle, XCircle, Info, ShieldCheck, CheckCircle2,
} from 'lucide-react';
import type { WfStep, WfTransition, WfAction, WfNotification } from '@/types/workflow';
import type { WfTaskConfig, WfValidationConfig } from '@/types/workflowTaskConfig';
import { runCoherenceChecks, type CoherenceCheck, type CheckSeverity } from '@/lib/workflowCoherenceChecks';

interface Props {
  steps: WfStep[];
  transitions: WfTransition[];
  actions: WfAction[];
  notifications: WfNotification[];
  taskConfigs: WfTaskConfig[];
  validationConfigs: WfValidationConfig[];
}

const SEVERITY_CONFIG: Record<CheckSeverity, { icon: typeof XCircle; color: string; label: string }> = {
  error: { icon: XCircle, color: 'text-red-600', label: 'Erreur' },
  warning: { icon: AlertTriangle, color: 'text-amber-600', label: 'Alerte' },
  info: { icon: Info, color: 'text-blue-600', label: 'Info' },
};

export function WfCoherencePanel({ steps, transitions, actions, notifications, taskConfigs, validationConfigs }: Props) {
  const checks = useMemo(
    () => runCoherenceChecks(steps, transitions, actions, notifications, taskConfigs, validationConfigs),
    [steps, transitions, actions, notifications, taskConfigs, validationConfigs]
  );

  const errors = checks.filter(c => c.severity === 'error');
  const warnings = checks.filter(c => c.severity === 'warning');
  const infos = checks.filter(c => c.severity === 'info');

  const grouped = useMemo(() => {
    const map = new Map<string, CoherenceCheck[]>();
    for (const c of checks) {
      const list = map.get(c.category) || [];
      list.push(c);
      map.set(c.category, list);
    }
    return map;
  }, [checks]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Contrôles de cohérence
            </CardTitle>
            <CardDescription className="mt-1">
              Analyse automatique de la configuration du workflow
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {errors.length > 0 && (
              <Badge variant="destructive" className="gap-1 text-xs">
                <XCircle className="h-3 w-3" /> {errors.length}
              </Badge>
            )}
            {warnings.length > 0 && (
              <Badge className="bg-amber-100 text-amber-700 border-amber-300 gap-1 text-xs">
                <AlertTriangle className="h-3 w-3" /> {warnings.length}
              </Badge>
            )}
            {infos.length > 0 && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Info className="h-3 w-3" /> {infos.length}
              </Badge>
            )}
            {checks.length === 0 && (
              <Badge className="bg-green-100 text-green-700 border-green-300 gap-1 text-xs">
                <CheckCircle2 className="h-3 w-3" /> OK
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {checks.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-green-500 mb-2" />
            <p className="text-sm font-medium text-green-700">Aucune anomalie détectée</p>
            <p className="text-xs text-muted-foreground mt-1">La configuration du workflow est cohérente.</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[420px]">
            <div className="space-y-4">
              {Array.from(grouped.entries()).map(([category, items]) => (
                <div key={category}>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{category}</h4>
                  <div className="space-y-1.5">
                    {items.map(check => {
                      const cfg = SEVERITY_CONFIG[check.severity];
                      const Icon = cfg.icon;
                      return (
                        <div key={check.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 text-xs">
                          <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${cfg.color}`} />
                          <span className="leading-relaxed">{check.message}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
