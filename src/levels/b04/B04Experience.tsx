'use client';

import React, { useState, useEffect } from 'react';
import {
  Calculator,
  ClipboardList,
  GraduationCap,
  HelpCircle,
  LogOut,
  RotateCcw,
  Volume2,
} from 'lucide-react';
import { FullscreenButton } from '@/src/components/FullscreenButton';
import { AbilityReport } from '@/src/components/AbilityReport';
import { MasterChenAvatar } from '@/src/components/visuals/MasterChenAvatar';
import { sounds } from '@/src/components/visuals/SoundEffects';
import { speakText, stopSpeaking } from '@/src/components/visuals/SpeechTts';
import { getStudentDisplayName } from '@/src/stores/authStore';
import { B04PowerEnergyScene } from './B04PowerEnergyScene';
import { B04_STAGE_CONTENT, type B04Step } from './b04Training';

interface B04ExperienceProps {
  onReturnLobby: () => void;
}

export function B04Experience({ onReturnLobby }: B04ExperienceProps) {
  const [currentStep, setCurrentStep] = useState<B04Step>('RATED_VS_ACTUAL_POWER');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [stepEvidences, setStepEvidences] = useState<Record<string, unknown>>({});
  const [sceneRevision, setSceneRevision] = useState(0);
  const [showWorkOrder, setShowWorkOrder] = useState(false);
  const [hintRequested, setHintRequested] = useState(false);

  const guidance = B04_STAGE_CONTENT[currentStep];

  // Auto-speak Master Chen's prompt or hint on new dialog
  useEffect(() => {
    const textToSpeak = hintRequested ? guidance.hint : guidance.mentorPrompt;
    speakText(textToSpeak);
    return () => {
      stopSpeaking();
    };
  }, [currentStep, hintRequested, guidance.mentorPrompt, guidance.hint]);

  const handleStepComplete = (step: B04Step, evidence: Record<string, unknown>) => {
    setStepEvidences((prev) => ({
      ...prev,
      [step]: evidence,
    }));
  };

  const handleAdvanceStep = () => {
    if (currentStep === 'RATED_VS_ACTUAL_POWER') {
      setCurrentStep('JOULE_HEATING_WIRE_OVERHEAT');
      setHintRequested(false);
    } else if (currentStep === 'JOULE_HEATING_WIRE_OVERHEAT') {
      setCurrentStep('WORKSHOP_ENERGY_BUDGET_CALC');
      setHintRequested(false);
    } else if (currentStep === 'WORKSHOP_ENERGY_BUDGET_CALC') {
      setCurrentStep('QUANTITATIVE_FUSE_SELECT');
      setHintRequested(false);
    } else if (currentStep === 'QUANTITATIVE_FUSE_SELECT') {
      setCurrentStep('TRANSFER_SMOKE_OVERLOAD_DIAG');
      setHintRequested(false);
    } else if (currentStep === 'TRANSFER_SMOKE_OVERLOAD_DIAG') {
      setIsCompleted(true);
    }
  };

  const handleRestart = () => {
    setIsCompleted(false);
    setCurrentStep('RATED_VS_ACTUAL_POWER');
    setStepEvidences({});
    setHintRequested(false);
    setShowWorkOrder(false);
    setSceneRevision((r) => r + 1);
  };

  return (
    <main className="app-shell level02-shell b04-shell">
      {/* Top Navigation Bar */}
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark safety-mark bg-amber-600 shadow-amber-600/20 text-white">
            <Calculator size={22} />
          </span>
          <div>
            <p className="eyebrow text-amber-700">篇章二：让电路按要求工作 · B04</p>
            <h1 className="text-slate-800 font-bold">
              学习任务7：工位用电预算——电能与电功率分析
            </h1>
          </div>
        </div>

        {/* Trainee Profile & Controls */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="trainee-badge">
            <GraduationCap size={18} className="text-amber-600" />
            <span>实训成长称号 · {getStudentDisplayName('见习学员')}</span>
          </div>

          <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold">
            5阶段递进实训
          </span>

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

      {/* Main Workspace (Standard 2-Column: Left Scene, Right Master Chen Tutor) */}
      <section
        className={isCompleted ? 'workspace single' : 'workspace'}
        aria-label="B04 电能与电功率分析实训工作区"
      >
        {isCompleted ? (
          <div className="scene-panel">
            <div className="scene-heading">
              <span className="status-dot bg-emerald-500 shadow-emerald-500/20" />
              <span>8号实训工位 · B04 学习结果</span>
              <span className="scene-meta">SEMI GUIDED</span>
            </div>
            <div className="scene-content">
              <AbilityReport
                levelId="B04"
                domainLabel="技能领域 · 电功率与能量预算"
                title="电功率、电能预算与用电安全能力报告"
                dimensions={[
                  { id: 'RATED_ACTUAL_POWER', label: '额定功率与实际功率辨析', stars: 5 },
                  { id: 'JOULE_HEAT_SAFETY', label: '焦耳定律与线束载流安全', stars: 5 },
                  { id: 'ENERGY_BUDGET', label: '工位用电量与成本预算', stars: 5 },
                  { id: 'FUSE_CALC_SELECT', label: '独立功放保险与线径选型', stars: 5 },
                  { id: 'INVERTER_HAZARD_DIAG', label: '大功率逆变器安全改装决策', stars: 5 },
                ]}
                summaryItems={[
                  { label: '功率与电压关系', value: 'P = U² / R 非线性敏感' },
                  { label: '焦耳热与导线截面', value: 'Q = I² · R · t 细线高阻自燃' },
                  { label: '工位日用电预算', value: '6.20 kWh / ¥5.27' },
                  { label: '360W功放配置', value: 'I=30A / 40A保险 / 6.0mm²线' },
                  { label: '1000W逆变器整改', value: '电瓶直连16mm² / 100A大保险' },
                  { label: '本关用时', value: '1 分钟' },
                ]}
                metrics={stepEvidences}
                mode="guided"
                nextTask="学习任务9《电源为什么带不动——全电路欧姆定律与内阻》"
                onRestart={handleRestart}
                onReturn={onReturnLobby}
              />
            </div>
            <div className="objective-strip">
              <span>当前任务</span>
              <strong>查看电功率、电能预算与用电安全能力报告</strong>
              <output className="feedback">实训评测已通过，电功率/焦耳定律物理本质与车载大功率安全配电标准已熟练掌握。</output>
            </div>
          </div>
        ) : (
          <>
            {/* Left: Interactive Scene Panel */}
            <div className="scene-panel">
              <div className="scene-heading">
                <span className="status-dot bg-amber-500 shadow-amber-500/20" />
                <span>8号实训工位 · 汽车电功率与工位能耗预算实验台</span>
                <span className="scene-meta">5阶段综合实训</span>
              </div>
              <div className="scene-content" key={sceneRevision}>
                <B04PowerEnergyScene
                  currentStep={currentStep}
                  onStepComplete={handleStepComplete}
                  onAdvanceStep={handleAdvanceStep}
                />
              </div>
              <div className="objective-strip">
                <span>当前任务</span>
                <strong>{guidance.title}</strong>
                <output className="feedback">{guidance.objective}</output>
              </div>
            </div>

            {/* Right: Master Chen Tutor Panel */}
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
                <div className="flex items-start gap-2">
                  <p className="text-sm font-semibold leading-relaxed m-0 flex-1">
                    {hintRequested
                      ? guidance.hint
                      : `“${guidance.mentorPrompt}”`}
                  </p>
                  <button
                    type="button"
                    className="text-amber-700/70 hover:text-amber-900 transition-colors p-1.5 cursor-pointer rounded hover:bg-amber-100"
                    title="重播陈师傅语音"
                    onClick={() => {
                      sounds.click();
                      const textToSpeak = hintRequested ? guidance.hint : guidance.mentorPrompt;
                      speakText(textToSpeak);
                    }}
                  >
                    <Volume2 size={18} />
                  </button>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-950">
                <strong className="block text-sm tracking-wide text-amber-700">
                  本步目标
                </strong>
                <span className="mt-1 block leading-6">
                  {guidance.objective}
                </span>
              </div>

              <div className="tutor-context">
                <span>当前实训环节</span>
                <strong>B04 · 电能与电功率分析 · {guidance.title.split('：')[0]}</strong>
              </div>
            </aside>
          </>
        )}
      </section>

      {/* Standard Bottom Navigation Bar */}
      <nav className="bottom-bar" aria-label="B04 实训功能栏">
        <button
          type="button"
          className={showWorkOrder ? 'tool-active cursor-pointer' : 'cursor-pointer'}
          onClick={() => setShowWorkOrder((open) => !open)}
        >
          <ClipboardList size={19} /> 工单
        </button>
        <button
          type="button"
          className={hintRequested ? 'tool-active cursor-pointer' : 'cursor-pointer'}
          onClick={() => setHintRequested(true)}
        >
          <HelpCircle size={19} /> 请师傅提示
        </button>
        <span className="toolbar-spacer" />
        <span className="unlock-hint">
          实训要点：额定vs实际功率／焦耳发热灾难／工位电度预算／逆变器过载合规整改 · 学习任务7（9页）
        </span>
        <button type="button" onClick={handleRestart} className="cursor-pointer">
          <RotateCcw size={18} /> 重新开始
        </button>
      </nav>

      {/* Work Order Modal Dialog */}
      {showWorkOrder && !isCompleted && (
        <dialog
          open
          className="fixed inset-0 z-50 flex h-screen w-screen max-w-none items-center justify-center bg-slate-950/35 p-4"
          aria-label="B04 实训工单"
        >
          <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <p className="eyebrow text-amber-700">工单编号 · WO-B04-POWER</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">
              工位用电预算——电能与电功率分析
            </h2>
            <p className="mt-3 leading-7 text-slate-700">
              在汽车电功率与工位能耗预算实验台上，对比额定功率与实际功率在不同供电电压下的落差，验证导线截面积过小产生焦耳热自燃的破坏性机理，编制汽修工位全天设备用电量与电费预算，独立核算大功率功放保险丝容量，并对大功率逆变器私插点烟器烧蚀险情制定合规整改决策。
            </p>
            <p className="mt-3 rounded-lg bg-amber-50 p-3 text-base font-bold text-amber-900">
              当前任务：{guidance.title}
            </p>
            <button
              type="button"
              className="primary-action mt-5 rounded-xl text-white cursor-pointer bg-amber-600 hover:bg-amber-700"
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
