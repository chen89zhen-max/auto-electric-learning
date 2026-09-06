'use client';
import { ChapterBExperience } from '@/src/levels/chapterB/ChapterBExperience';
import { B01OhmLawScene } from './B01OhmLawScene';
export function B01Experience({ onReturnLobby }: { onReturnLobby: () => void }) { return <ChapterBExperience levelId="B01" title="找出变化规律" subtitle="欧姆定律应用与控制变量作图" workOrder="WO-B01-OHM" nextTask="B02《灯组改装》" evidenceDimensions={['RULE_EXPLANATION', 'TOOL_MEASUREMENT']} Scene={B01OhmLawScene} onReturnLobby={onReturnLobby} />; }
