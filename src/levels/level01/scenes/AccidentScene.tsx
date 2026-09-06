'use client';

import { useState } from 'react';
import { TrainingPerson } from '@/src/components/visuals/TrainingPerson';
import {
  AlertOctagon,
  Eye,
  Power,
  ShieldCheck,
  Siren,
  UserX,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import knowledgeData from '@/src/levels/level01/knowledge.json';
import { useLevel01Store } from '@/src/stores/level01Store';
import { ShockSimulationLab } from '@/src/levels/level01/components/ShockSimulationLab';
import { sounds } from '@/src/components/visuals/SoundEffects';

export function AccidentScene() {
  const { state, dispatch } = useLevel01Store();
  const [personTouchedWarning, setPersonTouchedWarning] = useState(false);

  const isPowerOn = state.powerState === 'ON';

  const handleTouchPerson = () => {
    if (isPowerOn) {
      sounds.zap();
      setPersonTouchedWarning(true);
      setTimeout(() => setPersonTouchedWarning(false), 800);
    }
    dispatch({ type: 'TOUCH_PERSON' });
  };

  const handleIsolatePower = () => {
    sounds.estop();
    dispatch({ type: 'ISOLATE_POWER' });
  };

  // Stage: WORK_ORDER
  if (state.currentStage === 'WORK_ORDER') {
    return (
      <div className="relative z-10 w-full max-w-3xl lg:max-w-4xl bg-white/95 backdrop-blur-md rounded-3xl p-8 sm:p-10 border-2 border-slate-200 shadow-2xl animate-in fade-in duration-300 my-auto">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-lg">
            <AlertOctagon size={32} />
          </div>
          <div>
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-rose-700 font-mono">
              正式课程 · 学习任务 1 (建议4学时)
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-800 m-0">实训车间用电安全</h2>
          </div>
        </div>
        <p className="text-slate-600 text-base sm:text-lg leading-relaxed mb-8">
          今天进入车间第2天的实训任务。带教技师<strong>陈师傅</strong>安排你前往<strong>2号实训工位</strong>巡检并熟悉安全操作规程。请点击下方先打开今天的安全任务工单！
        </p>
        <Button
          size="lg"
          className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold h-14 rounded-2xl text-lg shadow-xl transition-transform active:scale-95"
          onClick={() => {
            sounds.click();
            dispatch({ type: 'OPEN_WORK_ORDER' });
          }}
        >
          查看安全训练工单 →
        </Button>
      </div>
    );
  }

  // Stage: ACCIDENT_DISCOVERY or ENVIRONMENT_CHECK
  if (state.currentStage === 'ACCIDENT_DISCOVERY' || state.currentStage === 'ENVIRONMENT_CHECK') {
    return (
      <div className="relative z-10 w-full max-w-5xl xl:max-w-6xl flex flex-col items-center gap-6 animate-in fade-in duration-300 p-2 sm:p-4 my-auto">
        {/* Urgent Audio-Visual Alert Banner */}
        <div className="w-full flex items-center justify-between px-6 py-4 rounded-2xl bg-rose-950/95 border-2 border-rose-500 text-rose-200 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-4">
            <Siren size={28} className="text-rose-400 animate-spin" />
            <div>
              <strong className="text-base sm:text-xl font-black tracking-wide text-white block">
                【突发事故】2号工位异常放电 · 学员倒地！
              </strong>
              <span className="text-sm text-rose-300">
                声响提示：“啪！”· 设备警示灯急促闪烁 · 220V/380V车间动力电供电设备异常漏电
              </span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-200 text-sm font-mono font-bold">
            <Zap size={16} className="animate-pulse" />
            <span>220V/380V LIVE</span>
          </div>
        </div>

        {/* 2号工位事故场景透视画幅 (16:10 宽幅视觉优化) */}
        <div className="relative w-full h-[380px] sm:h-[440px] rounded-3xl border-3 border-slate-700 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 p-8 overflow-hidden shadow-2xl flex items-center justify-between">
          {/* Background Workshop Wall with Danger warning */}
          <div className="absolute top-5 left-8 flex items-center gap-3">
            <span className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-mono text-sm font-bold">
              BAY-02 · 实训台架
            </span>
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs sm:text-sm font-bold ${
                isPowerOn
                  ? 'bg-rose-950 text-rose-400 border border-rose-600 animate-pulse'
                  : 'bg-emerald-950 text-emerald-400 border border-emerald-700'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${isPowerOn ? 'bg-rose-500' : 'bg-emerald-500'}`} />
              {isPowerOn ? '设备处于通电带电状态' : '总电源已紧急切断 · 待确认电气隔离'}
            </div>
          </div>

          {/* Left: Fallen Student (Xiao Zhang) with Sparking Bare Cable */}
          <div className="relative flex flex-col items-center justify-center my-auto ml-4 sm:ml-16">
            {/* Sparking bare cable on floor */}
            {isPowerOn && (
              <div className="absolute -top-16 -left-10 pointer-events-none">
                <div className="w-28 h-2 bg-amber-500 rounded-full rotate-45 relative">
                  {/* Electric Arc particles */}
                  <span className="absolute -top-4 -right-2 text-yellow-300 animate-ping font-bold text-2xl">⚡</span>
                  <span className="absolute -bottom-3 right-6 text-cyan-300 animate-bounce font-bold text-lg">⚡</span>
                </div>
              </div>
            )}

            {/* Clickable Person On Floor */}
            <button
              type="button"
              className={`group relative flex flex-col items-center p-5 rounded-3xl transition-all duration-300 cursor-pointer ${
                personTouchedWarning
                  ? 'animate-shake ring-4 ring-rose-500 bg-rose-950/80'
                  : 'hover:bg-slate-800/60 hover:scale-105'
              }`}
              onClick={handleTouchPerson}
            >
              {/* Lying victim SVG illustration - Enlarged */}
              <div className="relative w-48 h-32 flex items-center justify-center">
                <TrainingPerson pose="lying" />
              </div>

              <div className="flex items-center gap-2 mt-2">
                <UserX size={20} className="text-rose-400" />
                <strong className="text-base sm:text-lg text-white font-bold">学员倒地（小张）</strong>
              </div>
              <span className="text-xs sm:text-sm text-rose-300 font-medium mt-1">
                {isPowerOn ? '身旁有脱落带电导线！' : '总电源已断开，严禁盲目直接搬动'}
              </span>
            </button>
          </div>

          {/* Right: Wall Emergency Stop Mushroom Button & Isolator Switch */}
          <div className="relative flex flex-col items-center justify-center mr-4 sm:mr-16">
            <div className="p-6 rounded-3xl bg-slate-800 border-2 border-slate-700 shadow-2xl flex flex-col items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 font-mono">
                EMERGENCY SHUTOFF
              </span>

              {/* Big Red E-STOP Mushroom Button */}
              <button
                type="button"
                className={`group relative w-28 h-28 rounded-full border-4 border-yellow-400 flex items-center justify-center cursor-pointer transition-all duration-150 active:scale-95 shadow-[0_12px_30px_rgba(225,29,72,0.4)] ${
                  isPowerOn
                    ? 'bg-rose-600 hover:bg-rose-500 hover:shadow-[0_0_35px_#f43f5e]'
                    : 'bg-slate-700 border-slate-500 scale-95 opacity-80 cursor-default'
                }`}
                onClick={handleIsolatePower}
                title={isPowerOn ? '立刻拍下急停按钮切断电源' : '急停已按下，电源回路已断开'}
              >
                <div className="w-20 h-20 rounded-full bg-rose-700 flex flex-col items-center justify-center text-white border-2 border-rose-400/50 shadow-inner">
                  <Power size={32} className={isPowerOn ? 'animate-pulse' : ''} />
                  <span className="text-[10px] font-black uppercase tracking-tight mt-1">E-STOP</span>
                </div>
              </button>

              <span className="text-sm text-slate-200 font-bold mt-3">车间急停开关</span>
              <small className="text-xs text-slate-400 mt-0.5">
                {isPowerOn ? '拍下切断工位总电源' : '✓ 急停已拍下（主动力回路已切断）'}
              </small>
            </div>
          </div>
        </div>

        {/* Action Decision Control Bar */}
        <div className="w-full flex flex-wrap items-center justify-center gap-4 bg-white/95 backdrop-blur-md p-5 rounded-2xl border-2 border-slate-200 shadow-lg">
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="h-14 px-6 text-base border-slate-300 hover:bg-slate-50 font-bold text-slate-700"
            onClick={() => {
              sounds.click();
              dispatch({ type: 'CHECK_ENVIRONMENT' });
            }}
          >
            <Eye size={20} className="mr-2 text-sky-600" />
            仔细观察周围危险源
          </Button>

          <Button
            type="button"
            size="lg"
            className="h-14 px-8 text-base sm:text-lg bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-lg transition-transform active:scale-95"
            onClick={handleIsolatePower}
          >
            <Power size={20} className="mr-2" />
            拍下车间急停断开总控电源
          </Button>

          <Button
            type="button"
            size="lg"
            variant="outline"
            className="h-14 px-6 text-base border-amber-300 text-amber-800 hover:bg-amber-50 font-bold"
            onClick={() => {
              sounds.click();
              dispatch({ type: 'REQUEST_HINT' });
            }}
          >
            <Siren size={20} className="mr-2 text-amber-600" />
            向陈师傅请求指导
          </Button>
        </div>
      </div>
    );
  }

  // Stage: POWER_ISOLATION
  if (state.currentStage === 'POWER_ISOLATION') {
    return (
      <div className="relative z-10 w-full max-w-3xl lg:max-w-4xl bg-white/95 backdrop-blur-md rounded-3xl p-8 sm:p-10 border-2 border-slate-200 shadow-2xl animate-in fade-in duration-300 text-center my-auto">
        <div className="w-20 h-20 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto mb-5 shadow-xl">
          <ShieldCheck size={44} />
        </div>
        <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-700 font-mono">
          E-STOP PRESSED · 急停已动作
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-800 my-2">工位总电源已切断！</h2>
        <p className="text-slate-600 text-base sm:text-lg leading-relaxed mb-8">
          你没有贸然徒手拉拽倒地人员，而是<strong>先拍下急停断开工位总电源</strong>，成功避免了二次触电险情！
          <br />
          <span className="text-sm text-slate-500 block mt-2">
            （专业提示：急停切断了主动力电源；在真实作业中仍需实施“验电、挂锁挂牌并确认残余电荷释放”以完成彻底隔离）
          </span>
          <br />
          在进入施救前，陈师傅带你快速进行<strong>触电形态微实验</strong>，认清刚才险情的物理回路机理。
        </p>

        <Button
          size="lg"
          className="w-full bg-sky-700 hover:bg-sky-800 text-white font-bold h-14 rounded-2xl text-lg shadow-xl animate-bounce"
          onClick={() => {
            sounds.click();
            dispatch({ type: 'OPEN_KNOWLEDGE' });
          }}
        >
          开展触电形态微实验 (5项互动) →
        </Button>
      </div>
    );
  }

  // Stage: SHOCK_MICRO_LEARNING (Interactive Shock Simulation Lab)
  if (state.currentStage === 'SHOCK_MICRO_LEARNING') {
    const knowledge = knowledgeData;
    const currentCard = knowledge[state.knowledgeIndex] || knowledge[0];
    return (
      <div className="relative z-10 w-full flex items-center justify-center p-0.5 sm:p-1">
        <ShockSimulationLab
          knowledgeIndex={state.knowledgeIndex}
          onComplete={() => {
            dispatch({ type: 'COMPLETE_MICRO_SCENARIO', knowledgeId: currentCard.id });
          }}
        />
      </div>
    );
  }

  return null;
}
