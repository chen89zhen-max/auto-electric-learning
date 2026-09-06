'use client';
import { ChapterBExperience } from '@/src/levels/chapterB/ChapterBExperience'; import { B02LoadConnectionScene } from './B02LoadConnectionScene';
export function B02Experience({ onReturnLobby }: { onReturnLobby: () => void }) { return <ChapterBExperience levelId="B02" title="灯组改装" subtitle="串并联特性与双路车灯" workOrder="WO-B02-LAMPS" nextTask="B03《追踪节点与回路》" evidenceDimensions={['CIRCUIT_READING', 'RULE_EXPLANATION']} Scene={B02LoadConnectionScene} onReturnLobby={onReturnLobby} />; }
