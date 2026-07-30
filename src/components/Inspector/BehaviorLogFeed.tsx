import type { BehaviorLogEntry, BehaviorLogKind } from '@/types';

const KIND_COLOR: Record<BehaviorLogKind, string> = {
  evasion: 'var(--status-warning)',
  flight: 'var(--series-flight)',
  audit_caught: 'var(--status-critical)',
  audit_clear: 'var(--status-good)',
  write_off: 'var(--archetype-business)',
  ai_shield: 'var(--series-avoided)',
  ubi: 'var(--status-good)',
  job_loss: 'var(--status-critical)',
  income_boost: 'var(--status-good)',
  expense_shock: 'var(--status-warning)',
  windfall: 'var(--status-good)',
};

export function BehaviorLogFeed({ entries }: { entries: BehaviorLogEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-[11px] text-text-muted">No notable decisions yet — keep the simulation running.</p>;
  }
  const reversed = [...entries].reverse();
  return (
    <ul className="space-y-2.5">
      {reversed.map((entry, i) => (
        <li
          key={`${entry.tick}-${i}`}
          className="text-xs leading-snug border-l-2 pl-2"
          style={{ borderColor: KIND_COLOR[entry.kind] }}
        >
          <span className="text-text-muted tabular-nums">Tick {entry.tick}:</span>{' '}
          <span className="text-text-secondary">{entry.message}</span>
        </li>
      ))}
    </ul>
  );
}
