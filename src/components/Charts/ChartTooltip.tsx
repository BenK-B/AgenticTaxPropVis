interface TooltipPayloadItem {
  dataKey?: string;
  name?: string;
  value?: number;
  color?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  formatValue?: (value: number) => string;
}

/** Shared custom Recharts tooltip: line-key (not a swatch box) per series, value bolded, name in secondary ink. */
export function ChartTooltip({ active, payload, label, formatValue }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-surface-2 border border-border rounded-lg px-2.5 py-2 text-xs shadow-lg min-w-[150px]">
      <div className="text-text-muted mb-1 tabular-nums">Tick {label}</div>
      {payload.map((item) => (
        <div key={item.dataKey ?? item.name} className="flex items-center justify-between gap-3 py-0.5">
          <span className="flex items-center gap-1.5 text-text-secondary">
            <span className="inline-block w-2.5 h-[2px] rounded-full shrink-0" style={{ background: item.color }} />
            {item.name}
          </span>
          <span className="font-semibold text-text-primary tabular-nums">
            {formatValue && item.value !== undefined ? formatValue(item.value) : item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
