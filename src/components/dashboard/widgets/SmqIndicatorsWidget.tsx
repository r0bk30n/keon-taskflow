import { useMemo, useState } from 'react';
import { Task } from '@/types/task';
import { format, differenceInCalendarDays, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear, isWithinInterval, eachMonthOfInterval, eachQuarterOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TicketCheck, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

type SmqPeriod = 'month' | 'quarter' | 'year' | 'last3' | 'last6' | 'last12';
type SmqStep = 'monthly' | 'quarterly';

const PERIOD_OPTIONS: { value: SmqPeriod; label: string }[] = [
  { value: 'month', label: 'Ce mois' },
  { value: 'quarter', label: 'Ce trimestre' },
  { value: 'year', label: 'Cette année' },
  { value: 'last3', label: '3 derniers mois' },
  { value: 'last6', label: '6 derniers mois' },
  { value: 'last12', label: '12 derniers mois' },
];

const STEP_OPTIONS: { value: SmqStep; label: string }[] = [
  { value: 'monthly', label: 'Par mois' },
  { value: 'quarterly', label: 'Par trimestre' },
];

function getPeriodRange(period: SmqPeriod): { start: Date; end: Date; label: string } {
  const now = new Date();
  switch (period) {
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now), label: format(now, 'MMMM yyyy', { locale: fr }) };
    case 'quarter':
      return { start: startOfQuarter(now), end: endOfQuarter(now), label: `T${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()}` };
    case 'year':
      return { start: startOfYear(now), end: endOfYear(now), label: `${now.getFullYear()}` };
    case 'last3':
      return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now), label: '3 derniers mois' };
    case 'last6':
      return { start: startOfMonth(subMonths(now, 5)), end: endOfMonth(now), label: '6 derniers mois' };
    case 'last12':
      return { start: startOfMonth(subMonths(now, 11)), end: endOfMonth(now), label: '12 derniers mois' };
  }
}

interface SmqIndicatorsWidgetProps {
  tasks: Task[];
}

export function SmqIndicatorsWidget({ tasks }: SmqIndicatorsWidgetProps) {
  const [period, setPeriod] = useState<SmqPeriod>('year');
  const [step, setStep] = useState<SmqStep>('monthly');

  const showStepSelector = period !== 'month';

  const { range, metrics, chartData } = useMemo(() => {
    const range = getPeriodRange(period);
    const interval = { start: range.start, end: range.end };

    const openCount = tasks.filter(t => {
      const created = new Date(t.created_at);
      return isWithinInterval(created, interval) && t.status !== 'done' && t.status !== 'validated';
    }).length;

    const closedTasks = tasks.filter(t => {
      const updated = new Date(t.updated_at);
      return (t.status === 'done' || t.status === 'validated') && isWithinInterval(updated, interval);
    });

    let avgDays = 0;
    if (closedTasks.length > 0) {
      const totalDays = closedTasks.reduce((sum, t) => sum + differenceInCalendarDays(new Date(t.updated_at), new Date(t.created_at)), 0);
      avgDays = Math.round((totalDays / closedTasks.length) * 10) / 10;
    }

    // Build chart data by step
    let buckets: { start: Date; end: Date; label: string }[] = [];

    if (period === 'month') {
      // Single month → no breakdown needed, just one bucket
      buckets = [{ start: range.start, end: range.end, label: format(range.start, 'MMM yy', { locale: fr }) }];
    } else if (step === 'monthly') {
      const months = eachMonthOfInterval({ start: range.start, end: range.end });
      buckets = months.map(m => ({
        start: startOfMonth(m),
        end: endOfMonth(m),
        label: format(m, 'MMM yy', { locale: fr }),
      }));
    } else {
      const quarters = eachQuarterOfInterval({ start: range.start, end: range.end });
      buckets = quarters.map(q => ({
        start: startOfQuarter(q),
        end: endOfQuarter(q),
        label: `T${Math.ceil((q.getMonth() + 1) / 3)} ${format(q, 'yy')}`,
      }));
    }

    const chartData = buckets.map(bucket => {
      const bucketInterval = { start: bucket.start, end: bucket.end };

      const open = tasks.filter(t => {
        const created = new Date(t.created_at);
        return isWithinInterval(created, bucketInterval) && t.status !== 'done' && t.status !== 'validated';
      }).length;

      const closed = tasks.filter(t => {
        const updated = new Date(t.updated_at);
        return (t.status === 'done' || t.status === 'validated') && isWithinInterval(updated, bucketInterval);
      });

      let avg = 0;
      if (closed.length > 0) {
        const total = closed.reduce((s, t) => s + differenceInCalendarDays(new Date(t.updated_at), new Date(t.created_at)), 0);
        avg = Math.round((total / closed.length) * 10) / 10;
      }

      return { name: bucket.label, ouverts: open, duree: avg };
    });

    return { range, metrics: { openCount, avgDays, closedCount: closedTasks.length }, chartData };
  }, [tasks, period, step]);

  const cards = [
    {
      label: `Tickets ouverts (${range.label})`,
      value: metrics.openCount,
      icon: TicketCheck,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    },
    {
      label: 'Durée moy. traitement (j)',
      value: metrics.closedCount > 0 ? `${metrics.avgDays} j` : '—',
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
  ];

  return (
    <div className="flex flex-col gap-3 h-full px-2 py-1 overflow-auto">
      <div className="flex gap-2">
        <Select value={period} onValueChange={(v) => setPeriod(v as SmqPeriod)}>
          <SelectTrigger className="h-8 text-xs flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showStepSelector && (
          <Select value={step} onValueChange={(v) => setStep(v as SmqStep)}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STEP_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex gap-3">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border bg-card shadow-sm flex-1 min-w-0">
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", card.bgColor)}>
                <Icon className={cn("h-5 w-5", card.color)} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-xl leading-tight">{card.value}</span>
                <span className="text-[10px] text-muted-foreground truncate">{card.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {chartData.length > 1 && (
        <div className="flex-1 min-h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="ouverts" name="Tickets ouverts" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="duree" name="Durée moy. (j)" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}