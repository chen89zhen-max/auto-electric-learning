'use client';
import { ChapterBExperience } from '@/src/levels/chapterB/ChapterBExperience'; import { B05InternalResistanceScene } from './B05InternalResistanceScene';
export function B05Experience({ onReturnLobby }: { onReturnLobby: () => void }) { return <ChapterBExperience levelId="B05" title="电源为什么带不动" subtitle="全电路欧姆定律与内阻" workOrder="WO-B05-BATTERY" nextTask="B06《传感器信号与分压》" evidenceDimensions={['DIAGNOSTIC_STRATEGY', 'TOOL_MEASUREMENT']} Scene={B05InternalResistanceScene} onReturnLobby={onReturnLobby} />; }
