function getGaugeColor(pct: number) {
  if (pct <= 30) return 'hsl(0, 72%, 51%)';
  if (pct <= 70) return 'hsl(38, 92%, 50%)';
  return 'hsl(142, 71%, 45%)';
}

interface ProgressGaugeProps {
  label: string;
  percent: number;
  size?: number;
}

export function ProgressGauge({ label, percent, size = 90 }: ProgressGaugeProps) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;
  const color = getGaugeColor(percent);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} />
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none"
            stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <span className="absolute text-lg font-bold" style={{ color }}>{percent}%</span>
      </div>
      <span className="text-xs font-medium text-muted-foreground text-center">{label}</span>
    </div>
  );
}
