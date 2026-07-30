import type { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function ChartCard({ title, subtitle, children }: ChartCardProps) {
  return (
    <div className="card h-full flex flex-col !p-3 min-w-0">
      <div className="shrink-0 mb-1">
        <div className="text-xs font-semibold text-text-secondary">{title}</div>
        {subtitle && <div className="text-[10.5px] text-text-muted leading-snug">{subtitle}</div>}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
