'use client';

import React, { useState } from 'react';
import {
  Award,
  Check,
  ClipboardList,
  GraduationCap,
  HelpCircle,
  LogOut,
  RotateCcw,
  Volume2,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FullscreenButton } from '@/src/components/FullscreenButton';
import { CompletionStatus } from '@/src/components/CompletionStatus';
import { MasterChenAvatar, type MasterChenEmotion } from '@/src/components/visuals/MasterChenAvatar';
import { sounds } from '@/src/components/visuals/SoundEffects';
import { getStudentDisplayName } from '@/src/stores/authStore';
import { A02VoltageScene, A02Step } from './scenes/A02VoltageScene';
import type { EvidenceDimensionId, EvidenceStatus } from '@/src/types/evidence';

interface A02ExperienceProps {
  onReturnLobby: () => void;
}

interface A02StageGuidance {
  task: string;
  objective: string;
  mentorPrompt: string;
  hint: string;
  mentorEmotion: MasterChenEmotion;
}

/**
 * One source of truth for the work-order strip and the mentor panel.  The
 * interactive scene owns the instrument state; this shell only explains the
 * current task and never changes a measurement result.
 */
const A02_STAGE_GUIDANCE: Record<A02Step, A02StageGuidance> = {
  BATTERY_PROBING: {
    task: '实训步骤 1：确认电压挡、插孔与表笔极性',
    objective: '使用 COM/VΩ 插孔测量蓄电池两端，并观察调换表笔后读数正负号的变化。',
    mentorPrompt: '先确认红表笔接 VΩ 插孔、黑表笔接 COM。读数有方向，调换表笔不是接错，而是在改变测量方向。',
    hint: '保持电压挡，红笔选蓄电池正极、黑笔选负极；记录后再点击“调换红黑表笔位置”。',
    mentorEmotion: 'NORMAL',
  },
  SWITCH_AND_LOAD: {
    task: '实训步骤 2：比较断路与带载时的两点电压',
    objective: '分别记录开关断开时开关两端电压，以及开关闭合时检修灯两端电压。',
    mentorPrompt: '不要只看灯亮不亮。把表笔跨接在同一个元件两端，才是在测该元件的电压。',
    hint: '先断开开关并测 SW_IN—SW_OUT；再闭合开关，测 LAMP_POS—LAMP_NEG。',
    mentorEmotion: 'THINKING',
  },
  CONTACT_RESISTANCE_DROP: {
    task: '实训步骤 3：测量供电接点与搭铁压降',
    objective: '在带载状态测灯端电压和接点压降，验证回路各部分压降之和。',
    mentorPrompt: '接触不良时，灯“还能亮”不等于电路正常。带载跨接测量才能看出压降落在哪里。',
    hint: '开关闭合后，先测灯两端；再测 BAT_POS—SW_IN 或 LAMP_NEG—CHASSIS_GND。',
    mentorEmotion: 'WARNING',
  },
  TRANSFER_DIAGNOSIS: {
    task: '实训步骤 4：依据本次测量作出维修判断',
    objective: '用灯端电压和接点压降证据，判断应处理的供电侧故障。',
    mentorPrompt: '结论必须指向本次测得的异常压降，不能只凭“灯暗”就更换蓄电池或灯泡。',
    hint: '比较供电侧 0.91V 异常压降与搭铁侧 0.18V；优先处理产生异常压降的连接点。',
    mentorEmotion: 'THINKING',
  },
};

const A02_GUIDED_EVIDENCE: Partial<Record<EvidenceDimensionId, EvidenceStatus>> = {
  TOOL_MEASUREMENT: 'GUIDED_COMPLETE',
  RULE_EXPLANATION: 'GUIDED_COMPLETE',
};

export function A02Experience({ onReturnLobby }: A02ExperienceProps) {
  const [currentStep, setCurrentStep] = useState<A02Step>('BATTERY_PROBING');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [stepEvidences, setStepEvidences] = useState<Record<string, unknown>>({});
  const [sceneRevision, setSceneRevision] = useState(0);
  const [showWorkOrder, setShowWorkOrder] = useState(false);
  const [hintRequested, setHintRequested] = useState(false);

  const guidance = A02_STAGE_GUIDANCE[currentStep];

  const handleStepComplete = (step: A02Step, evidence: Record<string, unknown>) => {
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
      setIsCompleted(true);
    }
  };

  const handleRestart = () => {
    setCurrentStep('BATTERY_PROBING');
    setStepEvidences({});
    setHintRequested(false);
    setShowWorkOrder(false);
    setSceneRevision((revision) => revision + 1);
  };

  return (
    <main className="app-shell level02-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark safety-mark bg-amber-600 shadow-amber-600/20">
            <Zap size={22} />
          </span>
          <div>
            <p className="eyebrow text-amber-700">
              篇章一：把电路看明白 · A02
            </p>
            <h1 className="text-slate-800 font-bold">
              学习任务4：给电路做体检——电压分析与测量
            </h1>
          </div>
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
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-xs"
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
              <span className="scene-meta">SAVED AFTER COMPLETION</span>
            </div>
            <div className="scene-content">
              <div className="p-8 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col items-center text-center max-w-2xl mx-auto gap-4">
                <span className="p-4 bg-emerald-100 text-emerald-600 rounded-full">
                  <Award size={48} />
                </span>
                <h2 className="text-xl font-black text-slate-900">
                  A02 电压分析与测量 · 实训能力报告
                </h2>
                <p className="text-sm text-slate-600 max-w-md">
                  已完成表笔极性、开关两端电压和带载压降的测量记录。本次为跟练证据；独立与迁移证据须在不同任务条件下重新取得。
                </p>

                <div className="grid grid-cols-2 gap-3 w-full text-left text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="flex items-center gap-1.5 font-bold text-slate-700"><Check className="text-emerald-600" size={16} /> 表笔反接负号规律 (V03)</span>
                  <span className="flex items-center gap-1.5 font-bold text-slate-700"><Check className="text-emerald-600" size={16} /> 断路与通路两点电压</span>
                  <span className="flex items-center gap-1.5 font-bold text-slate-700"><Check className="text-emerald-600" size={16} /> 接触电阻压降诊断 (V08)</span>
                  <span className="flex items-center gap-1.5 font-bold text-slate-700"><Check className="text-emerald-600" size={16} /> 全回路压降和验证</span>
                </div>

                <CompletionStatus
                  levelId="A02"
                  metrics={stepEvidences}
                  evidence={A02_GUIDED_EVIDENCE}
                  mode="guided"
                  nextTask="学习任务3《元件身份核验——电阻识别与测量》"
                />

                <Button size="lg" className="mt-2 bg-teal-700 hover:bg-teal-800 text-white font-bold cursor-pointer" onClick={onReturnLobby}>
                  返回课程大厅
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="scene-panel">
              <div className="scene-heading">
                <span className="status-dot bg-amber-500 shadow-amber-500/20" />
                <span>3号实训工位 · 12V 数字万用表训练台</span>
                <span className="scene-meta">SEMI GUIDED</span>
              </div>
              <div className="scene-content" key={sceneRevision}>
                <A02VoltageScene
                  currentStep={currentStep}
                  onStepComplete={handleStepComplete}
                  onAdvanceStep={handleAdvanceStep}
                />
              </div>
              <div className="objective-strip">
                <span>当前任务</span>
                <strong>{guidance.task}</strong>
                <output className="feedback">{guidance.objective}</output>
              </div>
            </div>

            <aside className="tutor-panel" aria-label="陈师傅实训指导">
              <div className="tutor-title flex items-center gap-3.5 pb-3 border-b border-slate-200">
                <MasterChenAvatar emotion={guidance.mentorEmotion} size={58} />
                <div>
                  <div className="flex items-center gap-1.5">
                    <strong className="text-base font-bold text-slate-800">陈师傅</strong>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.5 rounded">带教技师</span>
                  </div>
                  <small className="text-xs text-slate-500 font-medium">车间高级电工技师</small>
                </div>
              </div>

              <div className="message-card relative my-4 p-4 rounded-xl border-l-4 border-amber-400 bg-amber-50/90 text-slate-800 shadow-xs" aria-live="polite">
                <div className="flex items-start gap-2">
                  <p className="text-sm font-semibold leading-relaxed m-0 flex-1">{hintRequested ? guidance.hint : `“${guidance.mentorPrompt}”`}</p>
                  <button
                    type="button"
                    className="text-amber-700/60 hover:text-amber-800 transition-colors p-1"
                    title="播报提示音"
                    onClick={() => sounds.click()}
                  >
                    <Volume2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-teal-100 bg-teal-50 p-3 text-sm text-teal-950">
                <strong className="block text-xs tracking-wide text-teal-700">本步目标</strong>
                <span className="mt-1 block leading-6">{guidance.objective}</span>
              </div>

              <div className="tutor-context">
                <span>当前实训环节</span>
                <strong>A02 · 电压测量 · 半引导</strong>
              </div>
            </aside>
          </>
        )}
      </section>

      <nav className="bottom-bar" aria-label="A02 实训功能栏">
        <button type="button" className={showWorkOrder ? 'tool-active' : ''} onClick={() => setShowWorkOrder((open) => !open)}>
          <ClipboardList size={19} /> 工单
        </button>
        <button type="button" className={hintRequested ? 'tool-active' : ''} onClick={() => setHintRequested(true)}>
          <HelpCircle size={19} /> 请师傅提示
        </button>
        <span className="toolbar-spacer" />
        <span className="unlock-hint">基准：V03 极性反接／V08 接点压降 · 学习任务4（18页）</span>
        <button type="button" onClick={handleRestart}>
          <RotateCcw size={18} /> 重新开始
        </button>
      </nav>

      {showWorkOrder && !isCompleted && (
        <dialog open className="fixed inset-0 z-50 flex h-screen w-screen max-w-none items-center justify-center bg-slate-950/35 p-4" aria-label="A02 实训工单">
          <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <p className="eyebrow">工单编号 · WO-A02-VOLTAGE</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">给电路做体检</h2>
            <p className="mt-3 leading-7 text-slate-700">在 12V 检修灯训练台上完成两点电压测量，记录表笔极性、开关状态和带载接点压降。读数必须来自当前接线与仪表状态。</p>
            <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-900">当前任务：{guidance.task}</p>
            <button type="button" className="primary-action mt-5 rounded-xl text-white" onClick={() => setShowWorkOrder(false)}>返回实训工位</button>
          </section>
        </dialog>
      )}
    </main>
  );
}
