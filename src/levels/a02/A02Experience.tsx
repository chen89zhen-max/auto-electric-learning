'use client';
import { getLevelDisplayName } from '@/src/courses/curriculum';
import { getNextLevelLabel } from '@/src/courses/curriculum';


import { LevelHeading } from '@/src/components/LevelHeading';

import React, { useState } from 'react';
import {
  ClipboardList,
  GraduationCap,
  HelpCircle,
  LogOut,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { FullscreenButton } from '@/src/components/FullscreenButton';
import { AbilityReport } from '@/src/components/AbilityReport';
import { MasterChenAvatar } from '@/src/components/visuals/MasterChenAvatar';
import { SpeechControls } from '@/src/components/visuals/SpeechControls';
import { getStudentDisplayName } from '@/src/stores/authStore';
import { A02VoltageScene } from './scenes/A02VoltageScene';
import { A02_STAGE_CONTENT, type A02Step } from './a02Training';
import type { EvidenceDimensionId, EvidenceStatus } from '@/src/types/evidence';
import { formatDurationMs } from '@/src/lib/formatDuration';

interface A02ExperienceProps {
  onReturnLobby: () => void;
}

const A02_GUIDED_EVIDENCE: Partial<
  Record<EvidenceDimensionId, EvidenceStatus>
> = {
  TOOL_MEASUREMENT: 'GUIDED_COMPLETE',
  RULE_EXPLANATION: 'GUIDED_COMPLETE',
};

type ProcessCounters = { wrongAttempts: number; hintRequests: number; meterGuardBlocks: number; unsafeActions: number; retries: number };
type ProcessEvent = keyof ProcessCounters;

function buildA02ProcessReport(counters: ProcessCounters, durationMs: number) {
  const score = Math.round(Math.max(0, Math.min(1, 1 - 0.12 * counters.wrongAttempts - 0.15 * counters.hintRequests - 0.20 * counters.meterGuardBlocks - 0.30 * counters.unsafeActions - 0.05 * counters.retries)) * 100);
  const stars = score >= 90 ? 5 : score >= 80 ? 4 : score >= 70 ? 3 : score >= 60 ? 2 : 1;
  return {
    score,
    dimensions: [
      { id: 'METER_PREP', label: '仪表准备与挡位选择', stars },
      { id: 'POLARITY', label: '表笔极性与符号识别', stars },
      { id: 'VOLTAGE_MEASURE', label: '两点测压与通路验证', stars },
      { id: 'DROP_DIAGNOSIS', label: '接触电阻与压降诊断', stars },
      { id: 'DECISION', label: '维修决策与逻辑表达', stars },
    ],
    summaryItems: [
      { label: '过程答错记录', value: `${counters.wrongAttempts} 次` },
      { label: '教学提示使用', value: `${counters.hintRequests} 次` },
      { label: '仪表安全拦截', value: `${counters.meterGuardBlocks} 次` },
      { label: '安全违规操作', value: `${counters.unsafeActions} 次` },
      { label: '本关用时', value: formatDurationMs(durationMs) },
    ],
  };
}

export function A02Experience({ onReturnLobby }: A02ExperienceProps) {
  const [currentStep, setCurrentStep] = useState<A02Step>('BATTERY_PROBING');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [stepEvidences, setStepEvidences] = useState<Record<string, unknown>>(
    {},
  );
  const [sceneRevision, setSceneRevision] = useState(0);
  const [showWorkOrder, setShowWorkOrder] = useState(false);
  const [hintRequested, setHintRequested] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [completedAt, setCompletedAt] = useState<number | null>(null);
  const [processCounters, setProcessCounters] = useState<ProcessCounters>({ wrongAttempts: 0, hintRequests: 0, meterGuardBlocks: 0, unsafeActions: 0, retries: 0 });

  const guidance = A02_STAGE_CONTENT[currentStep];

  const handleStepComplete = (
    step: A02Step,
    evidence: Record<string, unknown>,
  ) => {
    setStepEvidences((prev) => ({
      ...prev,
      [step]: evidence,
    }));
  };

  const handleAdvanceStep = () => {
    if (currentStep === 'BATTERY_PROBING') {
      setCurrentStep('SWITCH_AND_LOAD');
    } else if (currentStep === 'SWITCH_AND_LOAD') {
      setCurrentStep('CONTACT_RESISTANCE_DROP');
    } else if (currentStep === 'CONTACT_RESISTANCE_DROP') {
      setCurrentStep('TRANSFER_DIAGNOSIS');
    } else if (currentStep === 'TRANSFER_DIAGNOSIS') {
      setCompletedAt(Date.now());
      setIsCompleted(true);
    }
    setHintRequested(false);
  };

  const recordProcessEvent = (event: ProcessEvent) => {
    setProcessCounters((current) => ({ ...current, [event]: current[event] + 1 }));
  };

  const handleRestart = () => {
    setIsCompleted(false);
    setCurrentStep('BATTERY_PROBING');
    setStepEvidences({});
    setHintRequested(false);
    setStartedAt(Date.now());
    setCompletedAt(null);
    setProcessCounters({ wrongAttempts: 0, hintRequests: 0, meterGuardBlocks: 0, unsafeActions: 0, retries: 0 });
    setShowWorkOrder(false);
    setSceneRevision((revision) => revision + 1);
  };

  const report = buildA02ProcessReport(processCounters, completedAt === null ? 0 : Math.max(0, completedAt - startedAt));

  return (
    <main className="app-shell level02-shell a02-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark safety-mark bg-amber-600 shadow-amber-600/20">
            <Zap size={22} />
          </span>
          <LevelHeading levelId="A02" />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <div className="trainee-badge">
            <GraduationCap size={18} className="text-amber-600" />
            <span>实训成长称号 · {getStudentDisplayName('见习学员')}</span>
          </div>
          <FullscreenButton />
          <button
            type="button"
            onClick={onReturnLobby}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-xs"
            title="退出当前实训并返回课程地图"
          >
            <LogOut size={15} />
            <span>退出实训</span>
          </button>
        </div>
      </header>

      <section
        className={isCompleted ? 'workspace single' : 'workspace'}
        aria-label="A02 电压分析与测量实训工作区"
      >
        {isCompleted ? (
          <div className="scene-panel">
            <div className="scene-heading">
              <span className="status-dot bg-emerald-500 shadow-emerald-500/20" />
              <span>3号实训工位 · A02 学习结果</span>
              <span className="scene-meta">SEMI GUIDED</span>
            </div>
            <div className="scene-content">
              <AbilityReport
                levelId="A02"
                domainLabel="技能领域 · 电压分析与测量"
                title="电压分析与测量能力报告"
                dimensions={report.dimensions}
                score={report.score}
                summaryItems={report.summaryItems}
                metrics={stepEvidences}
                evidence={A02_GUIDED_EVIDENCE}
                mode="guided"
                nextTask={getNextLevelLabel('A02')}
                onRestart={handleRestart}
                onReturn={onReturnLobby}
              />
            </div>
            <div className="objective-strip">
              <span>当前操作</span>
              <strong>查看电压分析与测量能力报告</strong>
              <output className="feedback">实训评测已通过，诊断思维已牢固建立。</output>
            </div>
          </div>
        ) : (
          <>
            <div className="scene-panel">
              <div className="scene-heading">
                <span className="status-dot bg-amber-500 shadow-amber-500/20" />
                <span>3号实训工位 · 12V 数字万用表训练台</span>
                <span className="scene-meta">半引导实训</span>
              </div>
              <div className="scene-content" key={sceneRevision}>
                <A02VoltageScene
                  currentStep={currentStep}
                  onStepComplete={handleStepComplete}
                  onAdvanceStep={handleAdvanceStep}
                  onProcessEvent={recordProcessEvent}
                />
              </div>
              <div className="objective-strip">
                <span>当前操作</span>
                <strong>{guidance.title}</strong>
                <output className="feedback">{guidance.objective}</output>
              </div>
            </div>

            <aside className="tutor-panel" aria-label="陈师傅实训指导">
              <div className="tutor-title flex items-center gap-3.5 pb-3 border-b border-slate-200">
                <MasterChenAvatar emotion={guidance.mentorEmotion} size={58} />
                <div>
                  <div className="flex items-center gap-1.5">
                    <strong className="text-base font-bold text-slate-800">
                      陈师傅
                    </strong>
                    <span className="text-sm bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.5 rounded">
                      带教技师
                    </span>
                  </div>
                  <small className="text-sm text-slate-500 font-medium">
                    车间高级电工技师
                  </small>
                </div>
              </div>

              <div
                className="message-card relative my-4 p-4 rounded-xl border-l-4 border-amber-400 bg-amber-50/90 text-slate-800 shadow-xs"
                aria-live="polite"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-end">
                    <SpeechControls
                      currentText={hintRequested ? guidance.hint : guidance.mentorPrompt}
                    />
                  </div>
                  <p className="text-sm font-semibold leading-relaxed m-0">
                    {hintRequested
                      ? guidance.hint
                      : `“${guidance.mentorPrompt}”`}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-teal-100 bg-teal-50 p-3 text-sm text-teal-950">
                <strong className="block text-sm tracking-wide text-teal-700">
                  本步目标
                </strong>
                <span className="mt-1 block leading-6">
                  {guidance.objective}
                </span>
              </div>

              <div className="tutor-context">
                <span>当前实训环节</span>
                <strong>A02 · 电压测量 · 半引导实训</strong>
              </div>
            </aside>
          </>
        )}
      </section>

      <nav className="bottom-bar" aria-label="A02 实训功能栏">
        <button
          type="button"
          className={showWorkOrder ? 'tool-active' : ''}
          onClick={() => setShowWorkOrder((open) => !open)}
        >
          <ClipboardList size={19} /> 工单
        </button>
        <button
          type="button"
          className={hintRequested ? 'tool-active' : ''}
          onClick={() => {
            if (!hintRequested) recordProcessEvent('hintRequests');
            setHintRequested(true);
          }}
        >
          <HelpCircle size={19} /> 请师傅提示
        </button>
        <span className="toolbar-spacer" />
        <span className="unlock-hint">
          测量要点：表笔极性／接点压降 · 教材与考纲见页头
        </span>
        <button type="button" onClick={handleRestart}>
          <RotateCcw size={18} /> 重新开始
        </button>
      </nav>

      {showWorkOrder && !isCompleted && (
        <dialog
          open
          className="fixed inset-0 z-50 flex h-screen w-screen max-w-none items-center justify-center bg-slate-950/35 p-4"
          aria-label="A02 实训工单"
        >
          <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <p className="eyebrow">工单编号 · WO-A02-VOLTAGE</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">{getLevelDisplayName('A02')} · 实训工单</h2>
            <p className="mt-3 leading-7 text-slate-700">
              在 12V
              检修灯训练台上完成两点电压测量，记录表笔极性、开关状态和带载接点压降。读数必须来自当前接线与仪表状态。
            </p>
            <p className="mt-3 rounded-lg bg-amber-50 p-3 text-base font-bold text-amber-900">
              当前任务：{guidance.title}
            </p>
            <button
              type="button"
              className="primary-action mt-5 rounded-xl text-white"
              onClick={() => setShowWorkOrder(false)}
            >
              返回实训工位
            </button>
          </section>
        </dialog>
      )}
    </main>
  );
}
