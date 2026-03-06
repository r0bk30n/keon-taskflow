import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Save, Loader2, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ProcessWithTasks } from '@/types/template';
import { toast } from 'sonner';
import {
  fetchEnrichedWorkflowAssignmentRules,
  EnrichedAssignmentRule,
} from '@/lib/workflowAssignmentRules';

interface ProcessAssignmentTabProps {
  process: ProcessWithTasks;
  onUpdate: () => void;
  canManage: boolean;
}

type AssignmentScope = 'global' | 'per_subprocess';

interface AssignmentConfig {
  scope: AssignmentScope;
  /** ID from wf_assignment_rules — the default rule for the process */
  default_assignment_rule_id: string | null;
}

const DEFAULT_CONFIG: AssignmentConfig = {
  scope: 'per_subprocess',
  default_assignment_rule_id: null,
};

export function ProcessAssignmentTab({ process, onUpdate, canManage }: ProcessAssignmentTabProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [config, setConfig] = useState<AssignmentConfig>(DEFAULT_CONFIG);
  const [rules, setRules] = useState<EnrichedAssignmentRule[]>([]);

  useEffect(() => {
    Promise.all([loadRules(), loadAssignmentConfig()]);
  }, [process.id]);

  const loadRules = async () => {
    try {
      const enriched = await fetchEnrichedWorkflowAssignmentRules();
      setRules(enriched);
    } catch (e) {
      console.error('Error loading assignment rules:', e);
    }
  };

  const loadAssignmentConfig = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('process_templates')
        .select('settings')
        .eq('id', process.id)
        .single();

      if (error) throw error;

      const settings = (data?.settings as Record<string, any>) || {};
      const saved = settings.assignment_config as AssignmentConfig | undefined;

      setConfig(saved ?? DEFAULT_CONFIG);
      setIsDirty(false);
    } catch (error) {
      console.error('Error loading assignment config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateConfig = (updates: Partial<AssignmentConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!canManage) return;
    setIsSaving(true);

    try {
      const { data: currentData, error: fetchError } = await supabase
        .from('process_templates')
        .select('settings')
        .eq('id', process.id)
        .single();

      if (fetchError) throw fetchError;

      const currentSettings = (currentData?.settings as Record<string, unknown>) || {};
      const updatedSettings = {
        ...currentSettings,
        assignment_config: config as unknown,
      };

      const { error } = await supabase
        .from('process_templates')
        .update({ settings: updatedSettings as any })
        .eq('id', process.id);

      if (error) throw error;

      toast.success("Configuration d'affectation enregistrée");
      setIsDirty(false);
      onUpdate();
    } catch (error: any) {
      console.error('Error saving assignment config:', error);
      toast.error(`Erreur: ${error.message || 'Impossible de sauvegarder'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Group rules by type for readability
  const groupedRules = groupRulesByType(rules);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Affectation des tâches</h3>
          <p className="text-sm text-muted-foreground">
            Définissez la règle d'affectation par défaut. Les étapes de workflow peuvent la surcharger individuellement.
          </p>
        </div>
        {isDirty && (
          <Badge variant="outline" className="text-warning border-warning">
            Modifications non enregistrées
          </Badge>
        )}
      </div>

      {/* Scope */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Périmètre d'affectation</CardTitle>
          <CardDescription>
            Définissez si l'affectation par défaut est gérée globalement ou par sous-processus
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={config.scope}
            onValueChange={(v) => updateConfig({ scope: v as AssignmentScope })}
            disabled={!canManage}
            className="space-y-3"
          >
            <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="per_subprocess" id="scope-subprocess" className="mt-1" />
              <div>
                <Label htmlFor="scope-subprocess" className="font-medium cursor-pointer">
                  Par sous-processus
                </Label>
                <p className="text-sm text-muted-foreground">
                  Chaque sous-processus définit ses propres règles dans son workflow
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="global" id="scope-global" className="mt-1" />
              <div>
                <Label htmlFor="scope-global" className="font-medium cursor-pointer">
                  Global (processus)
                </Label>
                <p className="text-sm text-muted-foreground">
                  Une règle par défaut pour tout le processus (les étapes du workflow peuvent la surcharger)
                </p>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Global rule selector */}
      {config.scope === 'global' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Règle d'affectation par défaut</CardTitle>
            <CardDescription>
              Les étapes de workflow qui n'ont pas de règle spécifique utiliseront cette règle
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={config.default_assignment_rule_id || '__none__'}
              onValueChange={(v) =>
                updateConfig({ default_assignment_rule_id: v === '__none__' ? null : v })
              }
              disabled={!canManage}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une règle d'affectation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Aucune règle par défaut</SelectItem>
                {groupedRules.map((group) => (
                  <div key={group.label}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      {group.label}
                    </div>
                    {group.items.map((rule) => (
                      <SelectItem key={rule.id} value={rule.id}>
                        {rule.display_name}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>

            {config.default_assignment_rule_id && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 p-3 flex gap-2 items-start">
                <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Cette règle sera utilisée comme valeur par défaut pour toute étape de workflow
                  sans règle d'affectation spécifique.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {config.scope === 'per_subprocess' && (
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center text-center">
              <Info className="h-10 w-10 text-blue-500 mb-3" />
              <h4 className="font-medium mb-1">Configuration par sous-processus</h4>
              <p className="text-sm text-muted-foreground max-w-sm">
                Chaque sous-processus définit ses propres règles d'affectation dans la
                configuration de son workflow (onglet "Workflow" → étapes).
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {canManage && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving || !isDirty}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Enregistrer
          </Button>
        </div>
      )}
    </div>
  );
}

// ---- helpers ----

interface RuleGroup {
  label: string;
  items: EnrichedAssignmentRule[];
}

function groupRulesByType(rules: EnrichedAssignmentRule[]): RuleGroup[] {
  const typeOrder: Record<string, string> = {
    manager: 'Manager',
    requester: 'Demandeur',
    user: 'Utilisateurs',
    group: 'Groupes',
    department: 'Services',
    job_title: 'Postes',
  };

  const grouped = new Map<string, EnrichedAssignmentRule[]>();
  for (const rule of rules) {
    const key = rule.type;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(rule);
  }

  const result: RuleGroup[] = [];
  for (const [type, label] of Object.entries(typeOrder)) {
    const items = grouped.get(type);
    if (items && items.length > 0) {
      result.push({ label, items });
    }
  }
  return result;
}
