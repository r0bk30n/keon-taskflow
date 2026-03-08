import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ITProjectHubHeader } from '@/components/it/ITProjectHubHeader';
import { useITProject, useITProjectTasks, useITProjectStats, useITProjectMilestones } from '@/hooks/useITProjectHub';
import { useITProjectSync } from '@/hooks/useITProjectSync';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Monitor, Calendar, Users, TrendingUp, Target, Euro,
  CheckCircle2, Clock, AlertTriangle, MessageSquareText,
  Link2, Pencil, Flag, ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { IT_PROJECT_TYPE_CONFIG, IT_PROJECT_PHASES, IT_PROJECT_STATUS_CONFIG } from '@/types/itProject';
import { ITProjectFormDialog } from '@/components/it/ITProjectFormDialog';

export default function ITProjectHubOverview() {
  const { code } = useParams<{ code: string }>();
  const { data: project, isLoading, refetch } = useITProject(code);
  const { data: tasks = [] } = useITProjectTasks(project?.id);
  const { data: milestones = [] } = useITProjectMilestones(project?.id);
  const stats = useITProjectStats(tasks, project);
  const { openTeams, openLoop, hasTeams, hasLoop } = useITProjectSync(project);
  const [showEditDialog, setShowEditDialog] = useState(false);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Projet non trouvé
        </div>
      </Layout>
    );
  }

  const typeConfig = project.type_projet ? IT_PROJECT_TYPE_CONFIG[project.type_projet] : null;
  const currentPhaseIndex = IT_PROJECT_PHASES.findIndex(p => p.value === project.phase_courante);

  return (
    <Layout>
      <div className="flex flex-col h-full">
        <ITProjectHubHeader
          project={project}
          stats={stats}
          onEditProject={() => setShowEditDialog(true)}
        />

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1 & 2: Main content */}
            <div className="lg:col-span-2 space-y-6">

              {/* Phase Stepper Dashboard */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Target className="h-4 w-4 text-violet-600" />
                    Phases du projet
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-0">
                    {IT_PROJECT_PHASES.map((phase, idx) => {
                      const milestone = milestones.find(m => m.phase === phase.value);
                      const phaseTasks = tasks.filter(t => t.it_project_phase === phase.value);
                      const totalPhase = phaseTasks.length;
                      const donePhase = phaseTasks.filter(t => ['done', 'validated', 'closed'].includes(t.status)).length;
                      const phaseProgress = totalPhase > 0 ? Math.round((donePhase / totalPhase) * 100) : 0;
                      const isCurrent = phase.value === project.phase_courante;
                      const isDone = currentPhaseIndex >= 0 && idx < currentPhaseIndex;
                      const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0);
                      const hasOverdue = phaseTasks.some(t => {
                        if (!t.due_date) return false;
                        if (['done', 'validated', 'closed', 'cancelled'].includes(t.status)) return false;
                        return new Date(t.due_date) < todayDate;
                      });

                      let indicator = '⬜';
                      if (totalPhase > 0 && donePhase === totalPhase) indicator = '✅';
                      else if (hasOverdue) indicator = '⚠️';
                      else if (donePhase > 0 || isCurrent) indicator = '🔵';

                      const milestoneStatusMap: Record<string, { text: string; variant: 'default' | 'info' | 'success' | 'destructive' }> = {
                        a_venir: { text: 'À venir', variant: 'default' },
                        en_cours: { text: 'En cours', variant: 'info' },
                        termine: { text: 'Terminé', variant: 'success' },
                        retarde: { text: 'En retard', variant: 'destructive' },
                      };
                      const mStatus = milestone ? milestoneStatusMap[milestone.statut] || milestoneStatusMap.a_venir : null;

                      return (
                        <div key={phase.value} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 flex-shrink-0 z-10',
                              isDone && 'bg-violet-600 border-violet-600 text-white',
                              isCurrent && 'bg-white border-violet-600 text-violet-600 ring-2 ring-violet-200',
                              !isDone && !isCurrent && 'bg-muted border-border text-muted-foreground'
                            )}>
                              {isDone ? <CheckCircle2 className="h-4 w-4" /> : phase.order}
                            </div>
                            {idx < IT_PROJECT_PHASES.length - 1 && (
                              <div className={cn(
                                'w-0.5 flex-1 min-h-[24px]',
                                idx < currentPhaseIndex ? 'bg-violet-600' : 'bg-border'
                              )} />
                            )}
                          </div>

                          <div className={cn(
                            'flex-1 pb-5 rounded-lg',
                            isCurrent && 'bg-violet-50/50 dark:bg-violet-950/20 -mx-2 px-3 py-2 border border-violet-200/50'
                          )}>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm">{indicator}</span>
                              <span className={cn(
                                'text-sm font-medium',
                                isCurrent && 'text-violet-700 dark:text-violet-400'
                              )}>
                                {phase.label}
                              </span>
                              {mStatus && (
                                <Badge variant={mStatus.variant} className="text-[10px] px-1.5 py-0">
                                  {mStatus.text}
                                </Badge>
                              )}
                            </div>

                            {milestone && (
                              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                <Flag className="h-3 w-3" />
                                {milestone.titre}
                                {milestone.date_prevue && (
                                  <span className="ml-1">
                                    — {format(new Date(milestone.date_prevue), 'dd MMM yyyy', { locale: fr })}
                                  </span>
                                )}
                              </p>
                            )}

                            {totalPhase > 0 ? (
                              <div className="mt-2 space-y-1">
                                <div className="flex items-center gap-2">
                                  <Progress value={phaseProgress} className="h-1.5 flex-1 bg-muted" />
                                  <span className="text-[10px] font-medium text-muted-foreground w-16 text-right">
                                    {donePhase}/{totalPhase} ({phaseProgress}%)
                                  </span>
                                </div>
                                {hasOverdue && (
                                  <p className="text-[10px] text-destructive flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    Tâches en retard
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-[10px] text-muted-foreground mt-1">Aucune tâche</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Avancement global */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-violet-600" />
                    Synthèse d'avancement
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-sm text-muted-foreground">Avancement global</span>
                      <span className="text-sm font-bold text-violet-600">{stats.progress}%</span>
                    </div>
                    <Progress value={stats.progress} className="h-3 bg-muted" />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-950/30 border">
                      <p className="text-xl font-bold">{stats.openTasks}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">À faire</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100">
                      <p className="text-xl font-bold text-blue-600">{stats.totalTasks - stats.openTasks - stats.doneTasks}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">En cours</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100">
                      <p className="text-xl font-bold text-emerald-600">{stats.doneTasks}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Terminées</p>
                    </div>
                  </div>

                  {project.budget_previsionnel && (
                    <div className="pt-2 border-t">
                      <div className="flex justify-between mb-1.5">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Euro className="h-3.5 w-3.5" /> Budget consommé
                        </span>
                        <span className="text-sm font-bold">
                          {(project.budget_consomme || 0).toLocaleString('fr-FR')} €
                          <span className="text-muted-foreground font-normal">
                            {' / '}{project.budget_previsionnel.toLocaleString('fr-FR')} €
                          </span>
                        </span>
                      </div>
                      <Progress
                        value={stats.budgetRatio || 0}
                        className={cn('h-2', stats.budgetRatio && stats.budgetRatio > 90 ? 'text-red-500' : '')}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Column 3: Sidebar */}
            <div className="space-y-4">
              {/* Fiche projet */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-violet-600" />
                    Fiche projet
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <InfoRow label="Code Digital" value={
                    <span className="font-mono font-bold text-violet-600">{project.code_projet_digital}</span>
                  } />
                  {typeConfig && (
                    <InfoRow label="Type" value={`${typeConfig.icon} ${typeConfig.label}`} />
                  )}
                  {project.date_debut && (
                    <InfoRow label="Début" value={format(new Date(project.date_debut), 'dd/MM/yyyy')} />
                  )}
                  {project.date_fin_prevue && (
                    <InfoRow label="Fin prévue" value={format(new Date(project.date_fin_prevue), 'dd/MM/yyyy')} />
                  )}
                  {project.responsable_it && (
                    <InfoRow label="Responsable IT" value={project.responsable_it.display_name} />
                  )}
                  {project.chef_projet && (
                    <InfoRow label="Chef de projet" value={project.chef_projet.display_name} />
                  )}
                  {project.sponsor && (
                    <InfoRow label="Sponsor" value={project.sponsor.display_name} />
                  )}
                </CardContent>
              </Card>

              {/* Microsoft Teams & Loop */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <MessageSquareText className="h-4 w-4 text-blue-600" />
                    Microsoft 365
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant={hasLoop ? 'outline' : 'ghost'}
                    size="sm"
                    className={cn(
                      'w-full justify-start gap-2 h-9',
                      hasLoop
                        ? 'border-violet-200 text-violet-700 hover:bg-violet-50'
                        : 'text-muted-foreground cursor-default'
                    )}
                    onClick={hasLoop ? openLoop : undefined}
                    disabled={!hasLoop}
                  >
                    <Link2 className="h-4 w-4" />
                    {hasLoop ? 'Ouvrir Microsoft Loop' : 'Loop non configuré'}
                    {hasLoop && <ExternalLink className="h-3 w-3 ml-auto opacity-50" />}
                  </Button>
                  <Button
                    variant={hasTeams ? 'outline' : 'ghost'}
                    size="sm"
                    className={cn(
                      'w-full justify-start gap-2 h-9',
                      hasTeams
                        ? 'border-blue-200 text-blue-700 hover:bg-blue-50'
                        : 'text-muted-foreground cursor-default'
                    )}
                    onClick={hasTeams ? openTeams : undefined}
                    disabled={!hasTeams}
                  >
                    <MessageSquareText className="h-4 w-4" />
                    {hasTeams ? 'Ouvrir Microsoft Teams' : 'Teams non configuré'}
                    {hasTeams && <ExternalLink className="h-3 w-3 ml-auto opacity-50" />}
                  </Button>
                  {!hasLoop && !hasTeams && (
                    <p className="text-xs text-muted-foreground text-center pt-1">
                      Configurez les liens dans l'onglet Teams / Loop
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <ITProjectFormDialog
        open={showEditDialog}
        project={project}
        onClose={() => setShowEditDialog(false)}
        onSaved={refetch}
      />
    </Layout>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-muted-foreground text-xs flex-shrink-0">{label}</span>
      <span className="text-right font-medium text-xs">{value}</span>
    </div>
  );
}
