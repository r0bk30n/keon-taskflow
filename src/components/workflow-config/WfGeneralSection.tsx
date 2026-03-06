import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Save, Loader2, Rocket, FileEdit, ChevronDown, Settings, Hash, Copy, Archive, XCircle, CheckCircle2 } from 'lucide-react';
import type { WfWorkflow, WfWorkflowUpdate } from '@/types/workflow';
import { toast } from 'sonner';

interface Props {
  workflow: WfWorkflow;
  canManage: boolean;
  onUpdate: (updates: WfWorkflowUpdate) => Promise<void>;
  onPublish: () => Promise<void>;
  coherenceErrors?: number;
}

export function WfGeneralSection({ workflow, canManage, onUpdate, onPublish, coherenceErrors = 0 }: Props) {
  const [name, setName] = useState(workflow.name);
  const [description, setDescription] = useState(workflow.description || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onUpdate({ name, description: description || null });
    setIsSaving(false);
  };

  const handlePublish = async () => {
    if (coherenceErrors > 0) {
      toast.error(`Impossible de publier : ${coherenceErrors} erreur(s) de cohérence détectée(s). Consultez l'onglet Contrôles.`);
      return;
    }
    setIsSaving(true);
    await onPublish();
    setIsSaving(false);
  };

  const publishedAt = (workflow as any).published_at;
  const hasUnpublishedChanges = workflow.is_draft || (publishedAt && new Date(workflow.updated_at) > new Date(publishedAt));

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-xl border bg-card">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 hover:bg-accent/30 transition-colors rounded-xl text-left">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Settings className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-sm truncate">{workflow.name}</h3>
                  {workflow.is_draft ? (
                    <Badge variant="secondary" className="gap-1 text-[10px] h-5">
                      <FileEdit className="h-3 w-3" />
                      Brouillon
                    </Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-700 border-green-300 gap-1 text-[10px] h-5">
                      <Rocket className="h-3 w-3" />
                      v{workflow.version}
                    </Badge>
                  )}
                  {hasUnpublishedChanges && !workflow.is_draft && (
                    <Badge variant="outline" className="text-[10px] h-5 text-amber-600 border-amber-300">
                      Modifications non publiées
                    </Badge>
                  )}
                  {coherenceErrors > 0 && (
                    <Badge variant="destructive" className="gap-1 text-[10px] h-5">
                      <XCircle className="h-3 w-3" /> {coherenceErrors} erreur(s)
                    </Badge>
                  )}
                  {coherenceErrors === 0 && !workflow.is_draft && (
                    <Badge className="bg-green-50 text-green-600 border-green-200 gap-1 text-[10px] h-5">
                      <CheckCircle2 className="h-3 w-3" /> Cohérent
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {workflow.description || 'Configuration générale du workflow'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {canManage && workflow.is_draft && (
                <Button
                  onClick={(e) => { e.stopPropagation(); handlePublish(); }}
                  disabled={isSaving || coherenceErrors > 0}
                  size="sm"
                  className="gap-1 h-7 text-xs"
                  title={coherenceErrors > 0 ? 'Corrigez les erreurs avant de publier' : ''}
                >
                  <Rocket className="h-3 w-3" />
                  Publier
                </Button>
              )}
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t px-4 pb-4 pt-3 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Nom du workflow</Label>
                <Input value={name} onChange={e => setName(e.target.value)} disabled={!canManage} className="h-9 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Mode sous-processus</Label>
                <div className="flex items-center h-9 px-3 bg-muted/50 rounded-md text-sm text-muted-foreground">
                  {workflow.default_subprocess_mode === 'blocking' ? 'Bloquant' : 'Non-bloquant'}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} disabled={!canManage} className="text-sm resize-none" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><Hash className="h-3 w-3" /> <span className="font-mono">{workflow.id.slice(0, 8)}</span></span>
                <span>Version {workflow.version}</span>
                {publishedAt && (
                  <span>Publié le {new Date(publishedAt).toLocaleDateString('fr-FR')}</span>
                )}
              </div>
              {canManage && (
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={isSaving} size="sm" variant="outline" className="h-8 gap-1 text-xs">
                    {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    Enregistrer
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
