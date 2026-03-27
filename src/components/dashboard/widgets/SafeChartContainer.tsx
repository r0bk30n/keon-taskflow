import { ReactNode, useEffect, useRef, useState } from 'react';

type Size = { width: number; height: number };

interface SafeChartContainerProps {
  className?: string;
  /** Ensures a visible height even before measuring */
  minHeight?: number;
  children: (size: Size) => ReactNode;
}

export function SafeChartContainer({ className, minHeight = 240, children }: SafeChartContainerProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let rafId = 0;
    const measure = () => {
      rafId = window.requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const width = Math.floor(rect.width);
        const height = Math.floor(rect.height);
        setSize(prev => (prev.width === width && prev.height === height ? prev : { width, height }));
      });
    };

    measure();

    const ro = new ResizeObserver(() => measure());
    ro.observe(el);

    return () => {
      window.cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={ref} className={className} style={{ minHeight }}>
      {size.width > 0 && size.height > 0 ? children(size) : null}
    </div>
  );
}

