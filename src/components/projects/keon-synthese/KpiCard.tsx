import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface KpiCardProps {
  label: string;
  value?: string;
  badge?: boolean;
  badgeClass?: string;
}

export function KpiCard({ label, value, badge, badgeClass }: KpiCardProps) {
  return (
    <Card className="flex-1 min-w-[140px]">
      <CardContent className="p-4 flex flex-col items-center justify-center gap-1 text-center">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        {badge ? (
          <Badge className={badgeClass || ''}>{value || '—'}</Badge>
        ) : (
          <span className="text-xl font-bold text-foreground">{value || '—'}</span>
        )}
      </CardContent>
    </Card>
  );
}
