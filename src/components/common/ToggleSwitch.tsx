interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  accentColor?: string;
}

export function ToggleSwitch({ checked, onChange, label, accentColor }: ToggleSwitchProps) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <span className="relative inline-block w-8 h-[18px] shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="opacity-0 w-full h-full absolute inset-0 cursor-pointer z-10 m-0"
        />
        <span
          className="absolute inset-0 rounded-full transition-colors"
          style={{ background: checked ? (accentColor ?? 'var(--status-good)') : 'var(--baseline)' }}
        />
        <span
          className="absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-surface-1 transition-transform"
          style={{ transform: checked ? 'translateX(14px)' : 'translateX(0)' }}
        />
      </span>
      {label && <span className="text-xs text-text-secondary">{label}</span>}
    </label>
  );
}
