import { useEffect, useRef, useState } from 'react';

/** Dev-only rolling FPS counter, gated by import.meta.env.DEV at the call site. */
export function DevFpsOverlay() {
  const [fps, setFps] = useState(0);
  const framesRef = useRef(0);
  const lastSampleRef = useRef(performance.now());

  useEffect(() => {
    let rafId: number;
    const loop = (now: number) => {
      framesRef.current += 1;
      const elapsed = now - lastSampleRef.current;
      if (elapsed >= 500) {
        setFps(Math.round((framesRef.current * 1000) / elapsed));
        framesRef.current = 0;
        lastSampleRef.current = now;
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-black/60 text-white text-[11px] font-mono tabular-nums pointer-events-none">
      {fps} fps
    </div>
  );
}
