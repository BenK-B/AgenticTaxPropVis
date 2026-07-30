import { useEffect } from 'react';
import { engineRunner } from '@/state/engineBridge';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { BottomPanel } from './BottomPanel';
import { SimCanvas } from '../Canvas/SimCanvas';
import { AgentDrawer } from '../Inspector/AgentDrawer';

export function AppShell() {
  useEffect(() => {
    engineRunner.start();
    return () => engineRunner.stop();
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-surface-0 text-text-primary overflow-hidden">
      <TopBar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0 relative">
            <SimCanvas />
          </div>
          <BottomPanel />
        </main>
      </div>
      <AgentDrawer />
    </div>
  );
}
