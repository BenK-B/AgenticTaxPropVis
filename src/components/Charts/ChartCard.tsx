import type { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  children: ReactNode;
}

export function ChartCard({ title, children }: ChartCardProps) {
  return (
    <div className="card h-full flex flex-col !p-3 min-w-0">
      <div className="text-xs font-semibold text-text-secondary mb-1 shrink-0">{title}</div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
