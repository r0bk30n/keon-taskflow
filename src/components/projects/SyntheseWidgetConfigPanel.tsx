import { useState, useEffect, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Settings, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Widget definitions ──────────────────────────────────────────────────────
export interface WidgetConfig {
  id: string;
  label: string;
  visible: boolean;
  size: 'compact' | 'normal' | 'large';
  accentColor: string;
  gradientFrom: string;
  gradientTo: string;
}

export const WIDGET_DEFINITIONS: Omit<WidgetConfig, 'visible' | 'size'>[] = [
  { id: 'kpi_strip',     label: 'KPI Strip (8 indicateurs)',     accentColor: '#1E5EFF', gradientFrom: 'from-blue-500/10',   gradientTo: 'to-blue-600/5'   },
  { id: 'map',           label: 'Carte de localisation',         accentColor: '#12B6C8', gradientFrom: 'from-cyan-500/10',   gradientTo: 'to-cyan-600/5'   },
  { id: 'status_pie',    label: 'Par statut (pie)',              accentColor: '#10b981', gradientFrom: 'from-emerald-500/10',gradientTo: 'to-emerald-600/5'},
  { id: 'typo_pie',      label: 'Par typologie (pie)',           accentColor: '#60a5fa', gradientFrom: 'from-blue-400/10',   gradientTo: 'to-blue-500/5'   },
  { id: 'progress_bar',  label: 'Avancement par projet (bar)',   accentColor: '#78C050', gradientFrom: 'from-green-500/10',  gradientTo: 'to-green-600/5'  },
  { id: 'region_bar',    label: 'Répartition géographique (bar)',accentColor: '#FF9432', gradientFrom: 'from-orange-500/10', gradientTo: 'to-orange-600/5' },
  { id: 'keon_spv',      label: 'KEON — SPV créée (pie)',        accentColor: '#8b5cf6', gradientFrom: 'from-violet-500/10', gradientTo: 'to-violet-600/5' },
  { id: 'at_risk',       label: 'Projets en retard',             accentColor: '#ef4444', gradientFrom: 'from-red-500/10',    gradientTo: 'to-red-600/5'    },
  { id: 'top_projects',  label: 'Projets les plus avancés',      accentColor: '#10b981', gradientFrom: 'from-emerald-500/10',gradientTo: 'to-emerald-600/5'},
];

const STORAGE_KEY = 'synthese_widget_config';

function getDefaultWidgets(): WidgetConfig[] {
  return WIDGET_DEFINITIONS.map(w => ({ ...w, visible: true, size: 'normal' as const }));
}

export function loadWidgetConfig(): WidgetConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultWidgets();
    const saved: WidgetConfig[] = JSON.parse(raw);
    // Merge with definitions in case new widgets were added
    const savedMap = new Map(saved.map(w => [w.id, w]));
    const merged: WidgetConfig[] = [];
    // Keep saved order for existing widgets
    saved.forEach(s => {
      const def = WIDGET_DEFINITIONS.find(d => d.id === s.id);
      if (def) merged.push({ ...def, visible: s.visible, size: s.size });
    });
    // Add any new widgets not in saved
    WIDGET_DEFINITIONS.forEach(d => {
      if (!savedMap.has(d.id)) merged.push({ ...d, visible: true, size: 'normal' });
    });
    return merged;
  } catch {
    return getDefaultWidgets();
  }
}

function saveWidgetConfig(widgets: WidgetConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
}

const SIZE_LABELS: Record<string, string> = {
  compact: 'Compact',
  normal: 'Normal',
  large: 'Grand',
};

interface Props {
  widgets: WidgetConfig[];
  onChange: (widgets: WidgetConfig[]) => void;
}

export function SyntheseWidgetConfigPanel({ widgets, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleVisible = (id: string) => {
    const next = widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w);
    onChange(next);
    saveWidgetConfig(next);
  };

  const cycleSize = (id: string) => {
    const sizes: WidgetConfig['size'][] = ['compact', 'normal', 'large'];
    const next = widgets.map(w => {
      if (w.id !== id) return w;
      const idx = sizes.indexOf(w.size);
      return { ...w, size: sizes[(idx + 1) % sizes.length] };
    });
    onChange(next);
    saveWidgetConfig(next);
  };

  const moveUp = (idx: number) => {
    if (idx <= 0) return;
    const next = [...widgets];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next);
    saveWidgetConfig(next);
  };

  const moveDown = (idx: number) => {
    if (idx >= widgets.length - 1) return;
    const next = [...widgets];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange(next);
    saveWidgetConfig(next);
  };

  const reset = () => {
    const defaults = getDefaultWidgets();
    onChange(defaults);
    saveWidgetConfig(defaults);
  };

  const visibleCount = widgets.filter(w => w.visible).length;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <Settings className="h-3.5 w-3.5" />
          Configurer
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[380px] sm:w-[420px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            Configuration Synthèse
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            Afficher, masquer et réordonner les widgets du tableau de bord.
          </p>
        </SheetHeader>

        <div className="mt-6 space-y-1">
          <div className="flex items-center justify-between mb-3">
            <Badge variant="secondary" className="text-xs">
              {visibleCount}/{widgets.length} widgets visibles
            </Badge>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={reset}>
              <RotateCcw className="h-3 w-3" />
              Réinitialiser
            </Button>
          </div>

          <Separator />

          <div className="space-y-1 pt-2">
            {widgets.map((widget, idx) => (
              <div
                key={widget.id}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2.5 transition-colors border',
                  widget.visible
                    ? 'bg-card border-border/60'
                    : 'bg-muted/30 border-transparent opacity-60'
                )}
              >
                {/* Accent dot */}
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: widget.accentColor }}
                />

                {/* Label + size */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate block">{widget.label}</span>
                  <button
                    onClick={() => cycleSize(widget.id)}
                    className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Taille : {SIZE_LABELS[widget.size]} ↻
                  </button>
                </div>

                {/* Reorder buttons */}
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    className="p-0.5 rounded hover:bg-muted disabled:opacity-30 transition-colors"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => moveDown(idx)}
                    disabled={idx === widgets.length - 1}
                    className="p-0.5 rounded hover:bg-muted disabled:opacity-30 transition-colors"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>

                {/* Toggle */}
                <Switch
                  checked={widget.visible}
                  onCheckedChange={() => toggleVisible(widget.id)}
                  className="shrink-0"
                />
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
