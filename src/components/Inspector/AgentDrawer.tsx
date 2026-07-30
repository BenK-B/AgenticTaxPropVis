import { X } from 'lucide-react';
import { useSimStore } from '@/state/useSimStore';
import { ARCHETYPE_CSS_VAR, cssVar } from '../Canvas/colorMap';
import { AgentStatsBlock } from './AgentStatsBlock';
import { AgentSparkline } from './AgentSparkline';
import { BehaviorLogFeed } from './BehaviorLogFeed';

export function AgentDrawer() {
  const agent = useSimStore((s) => s.selectedAgentSnapshot);
  const selectAgent = useSimStore((s) => s.selectAgent);

  if (!agent) return null;

  const close = () => selectAgent(null);
  const wealthHistory = agent.history.map((h) => h.wealth);

  return (
    <div className="drawer-overlay" onClick={close}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-surface-1 border-b border-border flex items-center justify-between px-4 py-3 z-10">
          <h2 className="text-sm font-semibold">Agent Inspector</h2>
          <button
            type="button"
            onClick={close}
            className="w-7 h-7 flex items-center justify-center rounded-md border border-border hover:border-baseline text-text-secondary"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>
        <div className="p-4 space-y-5">
          <AgentStatsBlock agent={agent} />

          <div>
            <div className="section-title mb-2">Wealth, last {wealthHistory.length} ticks</div>
            <AgentSparkline values={wealthHistory} color={cssVar(ARCHETYPE_CSS_VAR[agent.archetype])} />
          </div>

          <div>
            <div className="section-title mb-2">Behavior log</div>
            <BehaviorLogFeed entries={agent.behaviorLog} />
          </div>
        </div>
      </div>
    </div>
  );
}
