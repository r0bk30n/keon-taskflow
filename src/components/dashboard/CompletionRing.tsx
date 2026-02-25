interface CompletionRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
}

function getProgressColor(progress: number): string {
  if (progress <= 10) return '#ef4444';
  if (progress <= 25) return '#f97316';
  if (progress <= 40) return '#f59e0b';
  if (progress <= 55) return '#eab308';
  if (progress <= 70) return '#a3e635';
  if (progress <= 85) return '#4ade80';
  return '#22c55e';
}

export function CompletionRing({ progress, size = 48, strokeWidth = 5 }: CompletionRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  const color = getProgressColor(progress);
  const fontSize = size * 0.28;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <span
        className="absolute font-bold text-foreground"
        style={{ fontSize }}
      >
        {progress}%
      </span>
    </div>
  );
}
