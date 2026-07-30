import { PresetButtons } from '../Sidebar/PresetButtons';
import { PolicyControls } from '../Sidebar/PolicyControls';
import { AiTaxMechanismsCard } from '../Sidebar/AiTaxMechanismsCard';
import { ArchetypeRatioSliders } from '../Sidebar/ArchetypeRatioSliders';
import { BehaviorWeightSliders } from '../Sidebar/BehaviorWeightSliders';

export function Sidebar() {
  return (
    <aside className="w-[336px] shrink-0 border-r border-border bg-surface-0 overflow-y-auto p-3 space-y-3">
      <PresetButtons />
      <PolicyControls />
      <AiTaxMechanismsCard />
      <ArchetypeRatioSliders />
      <BehaviorWeightSliders />
    </aside>
  );
}
