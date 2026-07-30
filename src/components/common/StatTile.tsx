interface StatTileProps {
  label: string;
  value: string;
  accentColor?: string;
  sub?: string;
}

export function StatTile({ label, value, accentColor, sub }: StatTileProps) {
  return (
    <div className="stat-tile !p-2.5" style={accentColor ? { borderLeft: `3px solid ${accentColor}` } : undefined}>
      <div className="text-[10px] uppercase tracking-wide text-text-muted truncate">{label}</div>
      <div className="text-base font-semibold tabular-nums truncate">{value}</div>
      {sub && <div className="text-[11px] text-text-secondary truncate">{sub}</div>}
    </div>
  );
}
