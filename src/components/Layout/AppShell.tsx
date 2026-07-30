import { useCallback, useEffect, useRef, useState } from 'react';
import { engineRunner } from '@/state/engineBridge';
import { clamp } from '@/engine/mathUtils';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { BottomPanel } from './BottomPanel';
import { SimCanvas } from '../Canvas/SimCanvas';
import { AgentDrawer } from '../Inspector/AgentDrawer';

const CANVAS_HEIGHT_STORAGE_KEY = 'taxsim.canvasHeightPx';
const DEFAULT_CANVAS_HEIGHT = 220;
const MIN_CANVAS_HEIGHT = 140;
const MIN_BOTTOM_HEIGHT = 200;
const KEYBOARD_STEP = 24;

function loadStoredCanvasHeight(): number {
  const stored = Number(window.localStorage.getItem(CANVAS_HEIGHT_STORAGE_KEY));
  return Number.isFinite(stored) && stored > 0 ? stored : DEFAULT_CANVAS_HEIGHT;
}

export function AppShell() {
  const [canvasHeight, setCanvasHeight] = useState(loadStoredCanvasHeight);
  const mainRef = useRef<HTMLElement>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    engineRunner.start();
    return () => engineRunner.stop();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CANVAS_HEIGHT_STORAGE_KEY, String(canvasHeight));
  }, [canvasHeight]);

  const clampToMain = useCallback((desiredHeight: number) => {
    const rect = mainRef.current?.getBoundingClientRect();
    const maxHeight = rect ? Math.max(MIN_CANVAS_HEIGHT, rect.height - MIN_BOTTOM_HEIGHT) : desiredHeight;
    return clamp(desiredHeight, MIN_CANVAS_HEIGHT, maxHeight);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current || !mainRef.current) return;
      const rect = mainRef.current.getBoundingClientRect();
      setCanvasHeight(clampToMain(e.clientY - rect.top));
    },
    [clampToMain],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCanvasHeight((h) => clampToMain(h - KEYBOARD_STEP));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCanvasHeight((h) => clampToMain(h + KEYBOARD_STEP));
      }
    },
    [clampToMain],
  );

  return (
    <div className="h-screen w-screen flex flex-col bg-surface-0 text-text-primary overflow-hidden">
      <TopBar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main ref={mainRef} className="flex-1 flex flex-col min-w-0">
          <div className="shrink-0 relative border-b border-border" style={{ height: canvasHeight }}>
            <SimCanvas />
          </div>
          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize agent view and charts"
            tabIndex={0}
            className="h-2 shrink-0 cursor-row-resize relative group focus:outline-none touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onKeyDown={handleKeyDown}
          >
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-border group-hover:bg-text-muted group-focus:bg-text-muted transition-colors" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-1 rounded-full bg-text-muted/50 group-hover:bg-text-muted group-focus:bg-text-muted transition-colors" />
          </div>
          <BottomPanel />
        </main>
      </div>
      <AgentDrawer />
    </div>
  );
}
