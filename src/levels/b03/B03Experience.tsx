'use client';
import { ChapterBExperience } from '@/src/levels/chapterB/ChapterBExperience'; import { B03KclKvlScene } from './B03KclKvlScene';
export function B03Experience({ onReturnLobby }: { onReturnLobby: () => void }) { return <ChapterBExperience levelId="B03" title="追踪节点与回路" subtitle="KCL、KVL 与参考地" workOrder="WO-B03-KIRCHHOFF" nextTask="B04《工位用电预算》" evidenceDimensions={['CIRCUIT_READING', 'DIAGNOSTIC_STRATEGY']} Scene={B03KclKvlScene} onReturnLobby={onReturnLobby} />; }
