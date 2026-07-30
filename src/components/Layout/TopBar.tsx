import { Pause, Play, RotateCcw, StepForward } from 'lucide-react';
import { useSimStore } from '@/state/useSimStore';
import type { SpeedMultiplier } from '@/types';

const SPEEDS: SpeedMultiplier[] = [1, 5, 10, 20];

export function TopBar() {
  const isPlaying = useSimStore((s) => s.playback.isPlaying);
  const speedMultiplier = useSimStore((s) => s.playback.speedMultiplier);
  const tickNumber = useSimStore((s) => s.tick);
  const simDate = useSimStore((s) => s.simDate);
  const play = useSimStore((s) => s.play);
  const pause = useSimStore((s) => s.pause);
  const step = useSimStore((s) => s.step);
  const setSpeed = useSimStore((s) => s.setSpeed);
  const reset = useSimStore((s) => s.reset);

  return (
    <header className="h-14 shrink-0 flex items-center gap-3 px-4 border-b border-border bg-surface-1">
      <h1 className="text-sm font-semibold tracking-tight whitespace-nowrap">Tax Policy Micro-World</h1>

      <div className="flex items-center gap-1.5 ml-2">
        <button
          type="button"
          onClick={() => (isPlaying ? pause() : play())}
          className="w-8 h-8 flex items-center justify-center rounded-md bg-surface-2 border border-border hover:border-baseline text-text-primary"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={15} /> : <Play size={15} />}
        </button>
        <button
          type="button"
          onClick={step}
          className="w-8 h-8 flex items-center justify-center rounded-md bg-surface-2 border border-border hover:border-baseline text-text-primary"
          aria-label="Step one tick"
          title="Step 1 tick"
        >
          <StepForward size={15} />
        </button>
        <button
          type="button"
          onClick={reset}
          className="w-8 h-8 flex items-center justify-center rounded-md bg-surface-2 border border-border hover:border-baseline text-text-primary"
          aria-label="Reset simulation"
          title="Reset"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      <div className="flex items-center gap-0.5 ml-1 bg-surface-2 rounded-md p-0.5 border border-border">
        {SPEEDS.map((speed) => (
          <button
            key={speed}
            type="button"
            onClick={() => setSpeed(speed)}
            className={`px-2.5 py-1 rounded text-xs transition-colors ${
              speedMultiplier === speed ? 'bg-surface-1 text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {speed}x
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-4 text-xs text-text-secondary tabular-nums">
        <span>Tick {tickNumber}</span>
        <span>
          Year {simDate.year}, Month {simDate.month}
        </span>
      </div>
    </header>
  );
}
