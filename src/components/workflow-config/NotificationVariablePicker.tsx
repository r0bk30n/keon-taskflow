import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Variable, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  subProcessTemplateId?: string;
  onInsert: (variable: string) => void;
}

interface CustomField {
  name: string;
  label: string;
}

const SYSTEM_VARIABLES = [
  { key: 'request_number', label: 'N° demande' },
  { key: 'request_title', label: 'Titre de la demande' },
  { key: 'request_status', label: 'Statut de la demande' },
  { key: 'request_priority', label: 'Priorité' },
  { key: 'requester_name', label: 'Nom du demandeur' },
  { key: 'assignee_name', label: 'Nom de l\'assigné' },
  { key: 'step_name', label: 'Nom de l\'étape' },
];

export function NotificationVariablePicker({ subProcessTemplateId, onInsert }: Props) {
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!subProcessTemplateId || !open) return;
    setLoading(true);
    supabase
      .from('template_custom_fields')
      .select('name, label')
      .eq('sub_process_template_id', subProcessTemplateId)
      .order('order_index')
      .then(({ data }) => {
        setCustomFields((data as CustomField[]) || []);
        setLoading(false);
      });
  }, [subProcessTemplateId, open]);

  const handleInsert = (key: string) => {
    onInsert(`{{${key}}}`);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs">
          <Variable className="h-3.5 w-3.5" />
          Insérer une variable
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="max-h-[320px] overflow-y-auto">
          {/* System variables */}
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Variables système</p>
          </div>
          <div className="p-1.5 space-y-0.5">
            {SYSTEM_VARIABLES.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => handleInsert(v.key)}
                className="w-full flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm hover:bg-accent transition-colors text-left"
              >
                <span>{v.label}</span>
                <Badge variant="outline" className="font-mono text-[10px] px-1.5">
                  {`{{${v.key}}}`}
                </Badge>
              </button>
            ))}
          </div>

          {/* Custom fields */}
          {subProcessTemplateId && (
            <>
              <div className="px-3 py-2 border-t border-b border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Champs de la demande</p>
              </div>
              <div className="p-1.5 space-y-0.5">
                {loading ? (
                  <div className="flex items-center justify-center py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : customFields.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">Aucun champ custom</p>
                ) : (
                  customFields.map((f) => (
                    <button
                      key={f.name}
                      type="button"
                      onClick={() => handleInsert(f.name)}
                      className="w-full flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm hover:bg-accent transition-colors text-left"
                    >
                      <span>{f.label}</span>
                      <Badge variant="outline" className="font-mono text-[10px] px-1.5">
                        {`{{${f.name}}}`}
                      </Badge>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
