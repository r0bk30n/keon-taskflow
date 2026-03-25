import { useEffect, useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Save, Info, Lock, Plus } from 'lucide-react';
import { OPTIONS_EVALUATION_RISQUE, type PilierCode } from '@/config/questionnaireConfig';
import { useProjectQuestionnaire, type AnswersMap } from '@/hooks/useProjectQuestionnaire';
import { useQuestionnaireFieldDefs, groupFieldsBySection, type FieldDefinition } from '@/hooks/useQuestionnaireFieldDefs';
import { AddCustomFieldDialog } from './AddCustomFieldDialog';
import { TableInsertSpreadsheet } from './TableInsertSpreadsheet';

interface PilierQuestionnaireTabProps {
  projectId: string;
  codeDivalto: string;
  pilierCode: PilierCode;
  readonly?: boolean;
}

interface AddFieldContext {
  section: string;
  sousSection?: string;
}

export function PilierQuestionnaireTab({
  projectId,
  codeDivalto,
  pilierCode,
  readonly = false,
}: PilierQuestionnaireTabProps) {
  const { answers, isLoading: isLoadingAnswers, isSaving, fetchAnswers, saveSectionAnswers, canWritePilier } =
    useProjectQuestionnaire(projectId, codeDivalto);
  const { data: fieldDefs = [], isLoading: isLoadingDefs } = useQuestionnaireFieldDefs(pilierCode);

  const [localAnswers, setLocalAnswers] = useState<AnswersMap>({});
  const [dirtySection, setDirtySection] = useState<Set<string>>(new Set());
  const [addFieldCtx, setAddFieldCtx] = useState<AddFieldContext | null>(null);

  const canWrite = !readonly && canWritePilier(pilierCode);
  const sections = groupFieldsBySection(fieldDefs);
  const isLoading = isLoadingAnswers || isLoadingDefs;

  useEffect(() => {
    fetchAnswers(pilierCode);
  }, [pilierCode, fetchAnswers]);

  useEffect(() => {
    setLocalAnswers(answers);
  }, [answers]);

  const handleChange = (champ_id: string, field: 'valeur' | 'valeur_evaluation', value: string, section: string) => {
    setLocalAnswers(prev => ({
      ...prev,
      [champ_id]: { ...prev[champ_id], champ_id, [field]: value },
    }));
    setDirtySection(prev => new Set(prev).add(section));
  };

  const handleSave = async (section: string, sectionFields: FieldDefinition[]) => {
    const ok = await saveSectionAnswers(pilierCode, section, sectionFields, localAnswers);
    if (ok) {
      setDirtySection(prev => {
        const next = new Set(prev);
        next.delete(section);
        return next;
      });
    }
  };

  const renderField = (field: FieldDefinition) => {
    const val = localAnswers[field.champ_id]?.valeur ?? '';
    const evalVal = localAnswers[field.champ_id]?.valeur_evaluation ?? '';

    return (
      <div key={field.champ_id} className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Label htmlFor={field.champ_id} className="text-sm font-medium">
            {field.label}
            {!field.is_builtin && (
              <Badge variant="outline" className="ml-1.5 text-[10px] py-0">custom</Badge>
            )}
          </Label>
          {field.note && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">{field.note}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <div>
          {field.type === 'select' && (
            <Select
              value={val}
              onValueChange={v => handleChange(field.champ_id, 'valeur', v, field.section)}
              disabled={!canWrite}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="— Sélectionner —" />
              </SelectTrigger>
              <SelectContent>
                {(field.options || []).map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {field.type === 'textarea' && (
            <Textarea
              id={field.champ_id}
              value={val}
              onChange={e => handleChange(field.champ_id, 'valeur', e.target.value, field.section)}
              disabled={!canWrite}
              rows={2}
              className="text-sm"
            />
          )}

          {field.type === 'text' && (
            <Input
              id={field.champ_id}
              value={val}
              onChange={e => handleChange(field.champ_id, 'valeur', e.target.value, field.section)}
              disabled={!canWrite}
              className="h-8 text-sm"
            />
          )}

          {(field.type === 'number' || field.type === 'percentage' || field.type === 'euros') && (
            <div className="relative">
              <Input
                id={field.champ_id}
                type="number"
                value={val}
                onChange={e => handleChange(field.champ_id, 'valeur', e.target.value, field.section)}
                disabled={!canWrite}
                className="h-8 text-sm pr-10"
              />
              {field.type === 'percentage' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
              )}
              {field.type === 'euros' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
              )}
            </div>
          )}
        </div>

        {field.has_evaluation_risque && (
          <div className="mt-1">
            <Label className="text-xs text-muted-foreground">Évaluation des risques</Label>
            <Select
              value={evalVal}
              onValueChange={v => handleChange(field.champ_id, 'valeur_evaluation', v, field.section)}
              disabled={!canWrite}
            >
              <SelectTrigger className="h-7 text-xs mt-0.5">
                <SelectValue placeholder="— Risque —" />
              </SelectTrigger>
              <SelectContent>
                {OPTIONS_EVALUATION_RISQUE.map(opt => (
                  <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
        <p className="text-sm">Aucun champ défini pour ce pilier.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!canWrite && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          <Lock className="h-4 w-4 flex-shrink-0" />
          <span>Vous avez un accès en lecture seule sur ce pilier.</span>
        </div>
      )}

      <Accordion
        type="multiple"
        defaultValue={[]}
        className="space-y-2"
      >
        {sections.map(({ section, fields: sectionFields }) => {
          const isDirty = dirtySection.has(section);
          const filledCount = sectionFields.filter(f => localAnswers[f.champ_id]?.valeur).length;
          const sousSections = [...new Set(sectionFields.map(f => f.sous_section || ''))];

          return (
            <AccordionItem
              key={section}
              value={section}
              className="border rounded-lg overflow-visible"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
                <div className="flex items-center gap-3 w-full">
                  <span className="font-semibold text-sm text-left">{section}</span>
                  <Badge
                    variant={filledCount === sectionFields.length ? 'default' : filledCount > 0 ? 'secondary' : 'outline'}
                    className="text-xs ml-auto mr-2"
                  >
                    {filledCount} / {sectionFields.length}
                  </Badge>
                  {isDirty && (
                    <Badge variant="destructive" className="text-xs">Non sauvegardé</Badge>
                  )}
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-4 pb-4">
                {sousSections.map(ss => {
                  const ssFields = sectionFields.filter(f => (f.sous_section || '') === ss);
                  return (
                    <div key={ss || 'default'} className="mb-4">
                      {ss && (
                        <div className="flex items-center justify-between mb-3 border-b pb-1">
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {ss}
                          </h4>
                          {/* Bouton ajout dans une sous-section */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground"
                            onClick={() => setAddFieldCtx({ section, sousSection: ss })}
                          >
                            <Plus className="h-3 w-3" />
                            Ajouter un champ
                          </Button>
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {ssFields.map(f => renderField(f))}
                      </div>
                    </div>
                  );
                })}

                {/* Bouton ajout si pas de sous-sections, ou ajout global à la section */}
                {(sousSections.length === 1 && sousSections[0] === '') && (
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                      onClick={() => setAddFieldCtx({ section })}
                    >
                      <Plus className="h-3 w-3" />
                      Ajouter un champ à cette section
                    </Button>
                  </div>
                )}

                {canWrite && (
                  <div className="flex justify-end mt-4 pt-3 border-t">
                    <Button
                      size="sm"
                      onClick={() => handleSave(section, sectionFields)}
                      disabled={isSaving || !isDirty}
                      className="gap-2"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {isSaving ? 'Sauvegarde…' : 'Sauvegarder la section'}
                    </Button>
                  </div>
                )}

                {section === 'GENERALITES' && (
                  <div className="mt-4 border-t pt-4">
                    <TableInsertSpreadsheet
                      disabled={!canWrite}
                      persistenceKey={`${projectId}:${pilierCode}:${section}`}
                    />
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {addFieldCtx && (
        <AddCustomFieldDialog
          open={true}
          onClose={() => setAddFieldCtx(null)}
          pilierCode={pilierCode}
          section={addFieldCtx.section}
          sousSection={addFieldCtx.sousSection}
        />
      )}
    </div>
  );
}
