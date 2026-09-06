'use client';

import React from 'react';
import {
  ClipboardList,
  FileJson,
  GraduationCap,
  HelpCircle,
  LogOut,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { Level02StoreProvider, useLevel02Store, Level02Stage } from '@/src/stores/level02Store';
import { Level02Scene } from './scenes/Level02Scene';
import { Level02WorkOrder } from './components/Level02WorkOrder';
import { Level02Tutor } from './components/Level02Tutor';
import { Level02Progress } from './components/Level02Progress';
import { EventLogger } from '@/src/logging/EventLogger';
import { FullscreenButton } from '@/src/components/FullscreenButton';
import { getStudentDisplayName } from '@/src/stores/authStore';

const stageLabels: Record<Level02Stage, string> = {
  WORK_ORDER: '阅读并签署维修工单',
  COMPONENT_EXPLORE: '实训步骤 1：观察工作台上的物料',
  BUILD_DOUBLE_WIRE_CIRCUIT: '实训步骤 2：动手搭建闭合回路',
  OPEN_CIRCUIT_EXPERIMENT: '实训步骤 3：制造断路并探究原因',
  SWITCH_EXPERIMENT: '实训步骤 4：开关控制与原理图双向映射',
  SCHEMATIC_MAPPING: '实训步骤 4：开关控制与原理图双向映射',
  CHASSIS_GROUND_CHALLENGE: '实训步骤 5：实车车身搭铁挑战',
  TRANSFER_CHALLENGE: '实训步骤 6：空间拓扑打乱测试',
  REFLECTION: '实训步骤 7：用自己的话说出电路规律',
  COMPLETE: 'Sprint 2 检修灯任务能力报告',
};

function Level02GameContent({ onReturnLobby }: { onReturnLobby: () => void }) {
  const { state, dispatch } = useLevel02Store();

  return (
    <main className="app-shell level02-shell">
      {/* Top Header matching Sprint 0 and Sprint 1 */}
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark safety-mark bg-amber-600 shadow-amber-600/20">
            <Zap size={22} />
          </span>
          <div>
            <p className="eyebrow text-amber-700">新能源汽车维修中心 · 第二天</p>
            <h1 className="text-slate-800 font-bold">学习任务2：点亮第一盏检修灯——电路的认知</h1>
          </div>
        </div>

        <Level02Progress completed={state.completedObjectives} />

        <div className="trainee-badge">
          <GraduationCap size={18} className="text-amber-600" />
          <span>实训成长称号 · {getStudentDisplayName('见习学员')}</span>
        </div>

        {/* Topbar Actions */}
        <div className="flex items-center gap-2 ml-auto">
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

      {/* Main Workspace matching Sprint 0 and Sprint 1 layout */}
      <section
        className={state.currentStage === 'COMPLETE' ? 'workspace single' : 'workspace'}
        aria-label="检修灯实训工作区"
      >
        {/* Left: Main Scene Panel */}
        <div className="scene-panel">
          <div className="scene-heading">
            <span className="status-dot bg-amber-500 shadow-amber-500/20" />
            <span>
              {state.currentStage === 'CHASSIS_GROUND_CHALLENGE'
                ? '实训车间 · 蓝色新能源教学展车前部'
                : '3号实训工位 · 12V 检修工作台'}
            </span>
            <span className="scene-meta">SEMI GUIDED</span>
          </div>

          <div className="scene-content" key={state.currentStage}>
            <Level02Scene onReturnLobby={onReturnLobby} />
          </div>

          <div className="objective-strip">
            <span>当前任务</span>
            <strong>{stageLabels[state.currentStage]}</strong>
            {state.feedback && (
              <output className="feedback">
                {state.feedback}
              </output>
            )}
          </div>
        </div>

        {/* Right: Master Chen Tutor Panel */}
        {state.currentStage !== 'COMPLETE' && <Level02Tutor />}
      </section>

      {/* Bottom Functional Toolbar matching Sprint 0 and Sprint 1 */}
      <nav className="bottom-bar" aria-label="实训功能栏">
        <button type="button" onClick={() => dispatch({ type: 'OPEN_WORK_ORDER' })}>
          <ClipboardList size={19} />
          工单
        </button>

        <button type="button" onClick={() => dispatch({ type: 'REQUEST_HINT' })}>
          <HelpCircle size={19} />
          请师傅提示
        </button>

        <span className="toolbar-spacer" />

        {process.env.NODE_ENV !== 'production' && (
          <button
            type="button"
            onClick={() => EventLogger.download(state.eventLog)}
          >
            <FileJson size={18} />
            导出日志
          </button>
        )}

        <button
          type="button"
          onClick={() => dispatch({ type: 'RESTART' })}
        >
          <RotateCcw size={18} />
          重新开始
        </button>
      </nav>

      {/* Work Order Dialog Modal */}
      <Level02WorkOrder />
    </main>
  );
}

export function Level02Experience({ onReturnLobby }: { onReturnLobby: () => void }) {
  return (
    <Level02StoreProvider>
      <Level02GameContent onReturnLobby={onReturnLobby} />
    </Level02StoreProvider>
  );
}
