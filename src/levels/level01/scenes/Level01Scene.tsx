'use client';

import { AbilityReport } from '@/src/components/AbilityReport';
import { useLevel01Store } from '@/src/stores/level01Store';
import { AccidentScene } from '@/src/levels/level01/scenes/AccidentScene';
import { FirstAidScene } from '@/src/levels/level01/scenes/FirstAidScene';
import { FireScene } from '@/src/levels/level01/scenes/FireScene';
import { TransferReflectionScene } from '@/src/levels/level01/scenes/TransferReflectionScene';

export function Level01Scene({ onReturnLevel00 }: { onReturnLevel00: () => void }) {
  const { state, dispatch } = useLevel01Store();
  if (['WORK_ORDER', 'ACCIDENT_DISCOVERY', 'ENVIRONMENT_CHECK', 'POWER_ISOLATION', 'SHOCK_MICRO_LEARNING'].includes(state.currentStage)) return <AccidentScene />;
  if (['FIRST_AID_ASSESSMENT', 'FIRST_AID_ACTION'].includes(state.currentStage)) return <FirstAidScene />;
  if (['FIRE_EVENT', 'FIRE_RISK_ASSESSMENT', 'FIRE_RESPONSE'].includes(state.currentStage)) return <FireScene />;
  if (['TRANSFER_CHECK', 'REFLECTION'].includes(state.currentStage)) return <TransferReflectionScene />;
  if (!state.abilityReport) return null;
  return <AbilityReport report={state.abilityReport} metrics={state.metrics} onRestart={() => dispatch({ type: 'RESTART' })} onReturn={onReturnLevel00} />;
}
