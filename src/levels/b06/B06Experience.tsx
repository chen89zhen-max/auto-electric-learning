'use client';
import { ChapterBExperience } from '@/src/levels/chapterB/ChapterBExperience'; import { B06VoltageDividerScene } from './B06VoltageDividerScene';
export function B06Experience({ onReturnLobby }: { onReturnLobby: () => void }) { return <ChapterBExperience levelId="B06" title="传感器信号与分压" subtitle="NTC、水温与带载失真" workOrder="WO-B06-SENSOR" nextTask="篇章三 C01《越来越暗的灯》" evidenceDimensions={['TOOL_MEASUREMENT', 'RULE_EXPLANATION']} Scene={B06VoltageDividerScene} onReturnLobby={onReturnLobby} />; }
