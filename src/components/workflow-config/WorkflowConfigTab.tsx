import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2, Plus, Workflow, Settings, ListOrdered, ArrowRightLeft,
  Bell, Zap, Eye as EyeIcon, FileEdit, Rocket,
} from 'lucide-react';
import { useWorkflowConfig } from '@/hooks/useWorkflowConfig';
import { WfGeneralSection } from './WfGeneralSection';
import { WfStepsSection } from './WfStepsSection';
import { WfTransitionsSection } from './WfTransitionsSection';
import { WfNotificationsSection } from './WfNotificationsSection';
import { WfActionsSection } from './WfActionsSection';
import { WfFlowPreview } from './WfFlowPreview';

interface Props {
  subProcessId: string;
  subProcessName: string;
  canManage: boolean;
}

export function WorkflowConfigTab({ subProcessId, subProcessName, canManage }: Props) {
  const wf = useWorkflowConfig(subProcessId);
  const [activeTab, setActiveTab] = useState('steps');

  if (wf.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!wf.workflow) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center">
          <Workflow className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <div className="text-center">
          <p className="font-medium text-lg">Aucun workflow configuré</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Créez un workflow pour définir les étapes, tâches, validations et actions automatiques de ce sous-processus.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => wf.createWorkflow(`Workflow — ${subProcessName}`)} className="gap-2">
            <Plus className="h-4 w-4" />
            Créer le workflow
          </Button>
        )}
      </div>
    );
  }

  // Counts for badges
  const stepCount = wf.steps.filter(s => s.step_type !== 'start' && s.step_type !== 'end').length;
  const transitionCount = wf.transitions.length;
  const notifCount = wf.notifications.length;
  const actionCount = wf.actions.length;

  const subTabs = [
    { id: 'steps', label: 'Étapes', icon: ListOrdered, count: stepCount },
    { id: 'transitions', label: 'Transitions', icon: ArrowRightLeft, count: transitionCount },
    { id: 'notifications', label: 'Notifications', icon: Bell, count: notifCount },
    { id: 'actions', label: 'Actions auto.', icon: Zap, count: actionCount },
    { id: 'preview', label: 'Aperçu', icon: EyeIcon, count: null },
  ];

  return (
    <div className="space-y-5">
      {/* General params - compact header card */}
      <WfGeneralSection
        workflow={wf.workflow}
        canManage={canManage}
        onUpdate={wf.updateWorkflow}
        onPublish={wf.publishWorkflow}
      />

      {/* Sub-tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start bg-muted/50 p-1 h-auto flex-wrap">
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 py-2"
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                {tab.count !== null && tab.count > 0 && (
                  <Badge variant="secondary" className="h-4 min-w-[16px] px-1 text-[10px] ml-0.5">
                    {tab.count}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="steps" className="mt-4">
          <WfStepsSection
            steps={wf.steps}
            transitions={wf.transitions}
            notifications={wf.notifications}
            actions={wf.actions}
            assignmentRules={wf.assignmentRules}
            canManage={canManage}
            subProcessId={subProcessId}
            onAdd={wf.addStep}
            onUpdate={wf.updateStep}
            onDelete={wf.deleteStep}
            onDuplicate={wf.duplicateStep}
            onReorder={wf.reorderSteps}
          />
        </TabsContent>

        <TabsContent value="transitions" className="mt-4">
          <WfTransitionsSection
            transitions={wf.transitions}
            steps={wf.steps}
            canManage={canManage}
            onAdd={wf.addTransition}
            onUpdate={wf.updateTransition}
            onDelete={wf.deleteTransition}
          />
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <WfNotificationsSection
            notifications={wf.notifications}
            steps={wf.steps}
            canManage={canManage}
            onAdd={wf.addNotification}
            onUpdate={wf.updateNotification}
            onDelete={wf.deleteNotification}
          />
        </TabsContent>

        <TabsContent value="actions" className="mt-4">
          <WfActionsSection
            actions={wf.actions}
            transitions={wf.transitions}
            steps={wf.steps}
            canManage={canManage}
            subProcessId={subProcessId}
            onAdd={wf.addAction}
            onUpdate={wf.updateAction}
            onDelete={wf.deleteAction}
          />
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <WfFlowPreview
            steps={wf.steps}
            transitions={wf.transitions}
            actions={wf.actions}
            notifications={wf.notifications}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
