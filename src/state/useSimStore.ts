import { create } from 'zustand';
import type {
  Agent,
  AiTaxMechanism,
  AiTaxMechanisms,
  Archetype,
  BehaviorWeights,
  MetricsSnapshot,
  Policy,
  SimDate,
  SpeedMultiplier,
} from '@/types';
import {
  DEFAULT_ARCHETYPE_RATIOS,
  DEFAULT_AGENT_COUNT,
  DEFAULT_BEHAVIOR_WEIGHTS,
  DEFAULT_POLICY,
  METRICS_HISTORY_LENGTH,
} from '@/engine';
import { engineRunner } from './engineBridge';

interface SimStore {
  policy: Policy;
  archetypeRatios: Record<Archetype, number>;
  behaviorWeights: BehaviorWeights;
  playback: { isPlaying: boolean; speedMultiplier: SpeedMultiplier };
  tick: number;
  simDate: SimDate;
  selectedAgentId: string | null;
  selectedAgentSnapshot: Agent | null;
  metricsHistory: MetricsSnapshot[];
  agentCountConfig: number;

  setPolicy: (partial: Partial<Omit<Policy, 'aiTaxMechanisms'>>) => void;
  setAiTaxMechanism: (key: keyof AiTaxMechanisms, partial: Partial<AiTaxMechanism>) => void;
  setArchetypeRatio: (archetype: Archetype, value: number) => void;
  setBehaviorWeight: (key: keyof BehaviorWeights, value: number) => void;
  setAgentCount: (count: number) => void;
  applyPreset: (partial: Partial<Policy>) => void;

  play: () => void;
  pause: () => void;
  step: () => void;
  setSpeed: (multiplier: SpeedMultiplier) => void;
  reset: () => void;
  selectAgent: (id: string | null) => void;

  _ingestTicks: (metricsBatch: MetricsSnapshot[]) => void;
  _ingestSelectedSnapshot: (agent: Agent | null) => void;
}

export const useSimStore = create<SimStore>((set, get) => ({
  policy: DEFAULT_POLICY,
  archetypeRatios: DEFAULT_ARCHETYPE_RATIOS,
  behaviorWeights: DEFAULT_BEHAVIOR_WEIGHTS,
  playback: { isPlaying: false, speedMultiplier: 1 },
  tick: 0,
  simDate: { year: 1, month: 1 },
  selectedAgentId: null,
  selectedAgentSnapshot: null,
  metricsHistory: [],
  agentCountConfig: DEFAULT_AGENT_COUNT,

  setPolicy: (partial) => {
    const next = { ...get().policy, ...partial };
    engineRunner.setPolicy(next);
    set({ policy: next });
  },

  setAiTaxMechanism: (key, partial) => {
    const policy = get().policy;
    const next: Policy = {
      ...policy,
      aiTaxMechanisms: {
        ...policy.aiTaxMechanisms,
        [key]: { ...policy.aiTaxMechanisms[key], ...partial },
      },
    };
    engineRunner.setPolicy(next);
    set({ policy: next });
  },

  setArchetypeRatio: (archetype, value) => {
    // Renormalize the other three archetypes proportionally so ratios keep summing to 1.
    const current = get().archetypeRatios;
    const clampedValue = Math.min(1, Math.max(0, value));
    const others = (Object.keys(current) as Archetype[]).filter((a) => a !== archetype);
    const othersSum = others.reduce((sum, a) => sum + current[a], 0);
    const remaining = Math.max(0, 1 - clampedValue);
    const next = { ...current, [archetype]: clampedValue };
    if (othersSum > 0) {
      for (const a of others) next[a] = (current[a] / othersSum) * remaining;
    } else {
      for (const a of others) next[a] = remaining / others.length;
    }
    engineRunner.setArchetypeRatios(next);
    set({ archetypeRatios: next });
  },

  setBehaviorWeight: (key, value) => {
    const next = { ...get().behaviorWeights, [key]: value };
    engineRunner.setBehaviorWeights(next);
    set({ behaviorWeights: next });
  },

  setAgentCount: (count) => {
    engineRunner.setAgentCount(count);
    set({ agentCountConfig: count });
  },

  applyPreset: (partial) => {
    const current = get().policy;
    const next: Policy = {
      ...current,
      ...partial,
      aiTaxMechanisms: { ...current.aiTaxMechanisms, ...(partial.aiTaxMechanisms ?? {}) },
    };
    engineRunner.setPolicy(next);
    set({ policy: next });
  },

  play: () => {
    engineRunner.setPlaying(true);
    set((state) => ({ playback: { ...state.playback, isPlaying: true } }));
  },
  pause: () => {
    engineRunner.setPlaying(false);
    set((state) => ({ playback: { ...state.playback, isPlaying: false } }));
  },
  step: () => {
    engineRunner.step();
  },
  setSpeed: (multiplier) => {
    engineRunner.setSpeed(multiplier);
    set((state) => ({ playback: { ...state.playback, speedMultiplier: multiplier } }));
  },
  reset: () => {
    engineRunner.setPlaying(false);
    engineRunner.reset(get().agentCountConfig, get().archetypeRatios);
    set((state) => ({
      tick: 0,
      simDate: { year: 1, month: 1 },
      metricsHistory: [],
      selectedAgentSnapshot: state.selectedAgentId ? state.selectedAgentSnapshot : null,
      playback: { ...state.playback, isPlaying: false },
    }));
  },
  selectAgent: (id) => {
    engineRunner.setSelectedAgentId(id);
    set({ selectedAgentId: id, selectedAgentSnapshot: id ? (engineRunner.getAgentById(id) ?? null) : null });
  },

  _ingestTicks: (metricsBatch) => {
    if (metricsBatch.length === 0) return;
    const metricsHistory = [...get().metricsHistory, ...metricsBatch];
    while (metricsHistory.length > METRICS_HISTORY_LENGTH) metricsHistory.shift();
    const last = metricsBatch[metricsBatch.length - 1];
    set({ tick: last.tick, simDate: last.simDate, metricsHistory });
  },
  _ingestSelectedSnapshot: (agent) => {
    set({ selectedAgentSnapshot: agent });
  },
}));

engineRunner.init({
  onTicks: (metricsBatch) => useSimStore.getState()._ingestTicks(metricsBatch),
  onSelectedAgentUpdate: (agent) => useSimStore.getState()._ingestSelectedSnapshot(agent),
});

const initialState = useSimStore.getState();
engineRunner.setPolicy(initialState.policy);
engineRunner.setArchetypeRatios(initialState.archetypeRatios);
engineRunner.setBehaviorWeights(initialState.behaviorWeights);
engineRunner.setAgentCount(initialState.agentCountConfig);
