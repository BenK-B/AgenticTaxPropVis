interface FieldRowProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  accentColor?: string;
  formatValue?: (value: number) => string;
}

export function FieldRow({ label, value, onChange, min, max, step = 1, unit, accentColor, formatValue }: FieldRowProps) {
  return (
    <div className="field-row">
      <span className="field-row-label" title={label}>
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={accentColor ? { accentColor } : undefined}
      />
      <span className="field-row-unit">{formatValue ? formatValue(value) : `${value}${unit ?? ''}`}</span>
    </div>
  );
}
