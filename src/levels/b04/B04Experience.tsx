'use client';
import { ChapterBExperience } from '@/src/levels/chapterB/ChapterBExperience'; import { B04PowerEnergyScene } from './B04PowerEnergyScene';
export function B04Experience({ onReturnLobby }: { onReturnLobby: () => void }) { return <ChapterBExperience levelId="B04" title="工位用电预算" subtitle="额定、实际功率与熔丝保护" workOrder="WO-B04-POWER" nextTask="B05《电源为什么带不动》" evidenceDimensions={['RULE_EXPLANATION', 'SAFETY_SPECIFICATION']} Scene={B04PowerEnergyScene} onReturnLobby={onReturnLobby} />; }
