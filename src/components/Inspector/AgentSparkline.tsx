interface AgentSparklineProps {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}

/** Hand-rolled SVG sparkline — avoids Recharts mount overhead for a single 12-point line. */
export function AgentSparkline({ values, color, width = 280, height = 48 }: AgentSparklineProps) {
  if (values.length < 2) {
    return <div className="text-[11px] text-text-muted">Not enough history yet.</div>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible max-w-full">
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
