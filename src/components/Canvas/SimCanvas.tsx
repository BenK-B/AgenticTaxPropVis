import { useEffect, useRef } from 'react';
import { useSimStore } from '@/state/useSimStore';
import { engineRunner } from '@/state/engineBridge';
import { renderFrame } from './renderer';
import { findAgentAtPoint } from './hitTest';
import { CanvasLabels } from './CanvasLabels';
import { WealthScale } from './WealthScale';

export function SimCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const selectAgent = useSimStore((s) => s.selectAgent);
  const selectedAgentId = useSimStore((s) => s.selectedAgentId);
  const selectedAgentIdRef = useRef(selectedAgentId);
  selectedAgentIdRef.current = selectedAgentId;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      sizeRef.current = { width: rect.width, height: rect.height };
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const renderCallback = (nowMs: number) => {
      const { width, height } = sizeRef.current;
      if (width === 0 || height === 0) return;
      renderFrame(ctx, engineRunner.getAgentsRef(), width, height, selectedAgentIdRef.current, nowMs);
    };
    engineRunner.setRenderCallback(renderCallback);

    return () => {
      observer.disconnect();
      engineRunner.setRenderCallback(null);
    };
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const { width, height } = sizeRef.current;
    const agent = findAgentAtPoint(engineRunner.getAgentsRef(), x, y, width, height);
    selectAgent(agent ? agent.id : null);
  };

  return (
    <div className="absolute inset-0">
      <canvas ref={canvasRef} onClick={handleClick} className="w-full h-full block cursor-pointer" />
      <WealthScale />
      <CanvasLabels />
    </div>
  );
}
