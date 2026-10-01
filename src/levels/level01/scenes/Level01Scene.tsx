'use client';

import { AbilityReport } from '@/src/components/AbilityReport';
import { useLevel01Store } from '@/src/stores/level01Store';
import { AccidentScene } from '@/src/levels/level01/scenes/AccidentScene';
import { FirstAidScene } from '@/src/levels/level01/scenes/FirstAidScene';
import { FireScene } from '@/src/levels/level01/scenes/FireScene';
import { TransferReflectionScene } from '@/src/levels/level01/scenes/TransferReflectionScene';
import { formatDurationMs } from '@/src/lib/formatDuration';
import type { Level01Metrics } from '@/src/levels/level01/level01Types';

export function calculateO01ProcessScore(metrics: Level01Metrics): number {
  return Math.round(Math.max(0, Math.min(1,
    1
      - 0.12 * (metrics.firstAidSequenceErrors + metrics.fireResponseErrors)
      - 0.15 * metrics.helpRequests
      - 0.30 * (metrics.directContactAttempts + metrics.unsafeFireResponses),
  )) * 100);
}

export function Level01Scene({ onReturnLevel00 }: { onReturnLevel00: () => void }) {
  const { state, dispatch } = useLevel01Store();
  if (['WORK_ORDER', 'ACCIDENT_DISCOVERY', 'ENVIRONMENT_CHECK', 'POWER_ISOLATION', 'SHOCK_MICRO_LEARNING'].includes(state.currentStage)) return <AccidentScene />;
  if (['FIRST_AID_ASSESSMENT', 'FIRST_AID_ACTION'].includes(state.currentStage)) return <FirstAidScene />;
  if (['FIRE_EVENT', 'FIRE_RISK_ASSESSMENT', 'FIRE_RESPONSE'].includes(state.currentStage)) return <FireScene />;
  if (['TRANSFER_CHECK', 'REFLECTION'].includes(state.currentStage)) return <TransferReflectionScene />;
  if (!state.abilityReport) return null;
  const score = calculateO01ProcessScore(state.metrics);
  return <AbilityReport levelId="O01" report={state.abilityReport} score={score} metrics={state.metrics} summaryItems={[
    { label: '过程答错记录', value: `${state.metrics.firstAidSequenceErrors + state.metrics.fireResponseErrors} 次` },
    { label: '教学提示使用', value: `${state.metrics.helpRequests} 次` },
    { label: '安全违规操作', value: `${state.metrics.directContactAttempts + state.metrics.unsafeFireResponses} 次` },
    { label: '本关用时', value: formatDurationMs(state.metrics.levelDuration ?? 0) },
  ]} onRestart={() => dispatch({ type: 'RESTART' })} onReturn={onReturnLevel00} />;
}
