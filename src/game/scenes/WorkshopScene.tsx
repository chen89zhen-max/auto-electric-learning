'use client';

import { useState } from 'react';
import { TrainingPerson } from '@/src/components/visuals/TrainingPerson';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Cpu,
  HelpCircle,
  MousePointer2,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/src/stores/gameStore';
import { TrainingObject } from '@/src/game/objects/TrainingObject';
import { Workbench } from '@/src/game/objects/Workbench';
import { WorkshopBackground } from '@/src/components/visuals/WorkshopBackground';
import { sounds } from '@/src/components/visuals/SoundEffects';
import { getStudentDisplayName } from '@/src/stores/authStore';
import { WorkshopPreview } from '@/src/game/workshop-preview/WorkshopPreview';

export function WorkshopScene() {
  const { state, dispatch } = useGameStore();
  const [deviceShake, setDeviceShake] = useState(false);
  const [immersivePreview, setImmersivePreview] = useState(true);

  const handleUnknownAction = () => {
    sounds.zap();
    setDeviceShake(true);
    setTimeout(() => setDeviceShake(false), 500);
    dispatch({ type: 'TRY_UNKNOWN' });
  };

  const handlePlaceObject = () => {
    sounds.success();
    dispatch({ type: 'PLACE_OBJECT' });
  };

  if (state.currentStage === 'WELCOME' && immersivePreview) {
    return <div className="wp-embedded"><WorkshopPreview onExit={() => setImmersivePreview(false)} /></div>;
  }

  return (
    <div className="relative w-full h-full min-h-0 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
      {/* Workshop Bay Perspective Background */}
      <WorkshopBackground stationNumber={1} />

      <div className="workshop-trainee" aria-hidden="true"><TrainingPerson action={state.currentStage === 'WELCOME'} /></div>
      {/* Stage: WELCOME */}
      {state.currentStage === 'WELCOME' && (
        <div className="relative z-10 w-full max-w-xl bg-white/95 backdrop-blur-md rounded-2xl p-5 sm:p-7 border-2 border-slate-200 shadow-2xl animate-in fade-in zoom-in duration-300 my-auto">
          <div className="flex items-center gap-3.5 mb-3.5">
            <div className="w-12 h-12 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-md">
              <Sparkles size={24} />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-sky-700 font-mono">
                新能源汽车维修中心 · 见习工位
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 m-0">技师入职第一天</h2>
            </div>
          </div>
          <p className="text-slate-600 text-xs sm:text-sm sm:leading-relaxed leading-normal mb-5">
            欢迎来到新能源汽车实训车间，<strong>{getStudentDisplayName('见习学员')}</strong>！今天我们暂不维修高压实车，由带教技师<strong>陈师傅</strong>带你熟悉工位操作规程、个人安全防护与基础交互。准备好开启你的电工电子技能成长之旅了吗？
          </p>
          <Button
            size="lg"
            className="w-full bg-sky-700 hover:bg-sky-800 text-white font-bold h-11 sm:h-12 rounded-xl text-sm sm:text-base shadow-lg transition-transform active:scale-95"
            onClick={() => {
              sounds.click();
              dispatch({ type: 'ENTER' });
            }}
          >
            领取入职装备 · 进入实训车间 →
          </Button>
        </div>
      )}

      {/* Stage: READ_WORK_ORDER */}
      {state.currentStage === 'READ_WORK_ORDER' && (
        <div className="relative z-10 flex flex-col items-center gap-4 animate-in fade-in duration-300 my-auto">
          {/* Rugged Automotive Diagnostic Tablet Mockup */}
          <button
            type="button"
            className="group relative flex flex-col items-center justify-center w-72 sm:w-84 h-52 sm:h-60 rounded-2xl border-3 border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-4 shadow-xl cursor-pointer hover:scale-102 transition-all duration-300 hover:shadow-sky-500/25"
            onClick={() => {
              sounds.click();
              dispatch({ type: 'OPEN_WORK_ORDER' });
            }}
          >
            {/* Tablet Camera & Status Bar */}
            <div className="absolute top-2.5 inset-x-0 flex items-center justify-between px-6">
              <span className="text-[11px] font-mono text-emerald-400 font-bold">EV-PAD · 5G ONLINE</span>
              <div className="w-2.5 h-2.5 rounded-full bg-slate-700 border border-slate-600" />
            </div>

            {/* Glowing Screen Content */}
            <div className="w-full h-36 sm:h-42 mt-2 rounded-xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center p-3 text-center shadow-inner group-hover:bg-slate-750 transition-colors">
              <div className="w-11 h-11 rounded-xl bg-sky-600 text-white flex items-center justify-center mb-2 shadow-md group-hover:scale-110 transition-transform">
                <ClipboardList size={24} />
              </div>
              <strong className="text-white text-base tracking-wide font-black">查看电子工单</strong>
              <small className="text-sky-300 text-xs mt-0.5 font-mono">工单编号：WO-2026-001</small>
            </div>
          </button>

          <p className="flex items-center gap-2 text-slate-700 text-xs sm:text-sm font-bold bg-white/95 px-4 py-2 rounded-full border border-slate-200 shadow-sm backdrop-blur-md">
            <MousePointer2 size={16} className="text-sky-600 animate-bounce" />
            岗位职业规范：动手操作前必须先刷工单确认任务目标
          </p>
        </div>
      )}

      {/* Stage: INTERACTION_TUTORIAL (Placing Insulated Gloves) */}
      {state.currentStage === 'INTERACTION_TUTORIAL' && (
        <div className="relative z-10 w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-center animate-in fade-in duration-300 my-auto">
          {/* Left: Tool Storage Tray */}
          <div className="flex flex-col items-center p-5 rounded-2xl border-2 border-dashed border-slate-300 bg-white/95 shadow-lg min-h-[220px] sm:min-h-[240px] justify-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 font-mono">
              工位劳保器材托盘
            </span>
            <TrainingObject />
            {state.trainingObjectPosition === 'TARGET' && (
              <div className="text-slate-400 font-bold text-sm flex items-center gap-2 py-6">
                <CheckCircle2 size={20} className="text-emerald-500" />
                <span>劳保托盘已就绪清空</span>
              </div>
            )}
          </div>

          {/* Right: Designated Target on Workbench Mat */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              className={`w-full min-h-[220px] sm:min-h-[240px] rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center p-5 text-center select-none ${
                state.trainingObjectPosition === 'TARGET'
                  ? 'border-emerald-500 bg-emerald-50/95 shadow-xl'
                  : state.trainingObjectSelected
                  ? 'border-sky-500 bg-sky-50/95 shadow-lg scale-101 animate-pulse cursor-pointer ring-3 ring-sky-300/40'
                  : 'border-dashed border-slate-300 bg-slate-100/90 hover:border-slate-400 cursor-pointer'
              }`}
              onClick={() => state.trainingObjectSelected && handlePlaceObject()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                handlePlaceObject();
              }}
            >
              {state.trainingObjectPosition === 'TARGET' ? (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center mb-3 shadow-lg">
                    <ShieldCheck size={36} />
                  </div>
                  <strong className="text-base sm:text-lg font-bold text-slate-800">劳保装备就位已确认</strong>
                  <small className="text-emerald-700 text-xs mt-1 font-bold">
                    已规范放置于工位抗静电绝缘保护垫
                  </small>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-400 flex items-center justify-center mb-2 text-slate-400 font-bold text-xl">
                    +
                  </div>
                  <strong className="text-base font-bold text-slate-700">工位抗静电收纳区</strong>
                  <small className="text-slate-400 text-xs mt-1">
                    拖动或先点按左侧手套，再点击这里规范归位
                  </small>
                </div>
              )}
            </button>

            {state.trainingObjectPosition === 'TARGET' && (
              <Button
                size="lg"
                className="w-full mt-3 bg-sky-700 hover:bg-sky-800 text-white font-bold h-11 sm:h-12 rounded-xl text-sm sm:text-base shadow-lg animate-bounce"
                onClick={() => {
                  sounds.click();
                  dispatch({ type: 'CONTINUE_AFTER_INTERACTION' });
                }}
              >
                基础交互已掌握 · 进入台架安全认知 →
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Stage: SAFETY_PRECHECK (Workbench power & guard precheck) */}
      {state.currentStage === 'SAFETY_PRECHECK' && (
        <div className="relative z-10 w-full animate-in fade-in duration-300">
          <Workbench />
        </div>
      )}

      {/* Stage: HELP_TUTORIAL (Unknown High-Voltage Device & Asking Master Chen) */}
      {state.currentStage === 'HELP_TUTORIAL' && (
        <div className="relative z-10 w-full max-w-xl bg-white/95 backdrop-blur-md rounded-2xl p-4 sm:p-6 border-2 border-slate-200 shadow-xl animate-in fade-in duration-300 flex flex-col items-center text-center my-auto">
          {/* High Voltage Motor Controller Mockup - Scaled for 16:10 / standard screens */}
          <div
            className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl border-3 border-slate-700 bg-slate-900 shadow-xl flex flex-col items-center justify-center mb-2.5 sm:mb-3 overflow-hidden transition-all ${
              deviceShake ? 'animate-shake ring-4 ring-rose-500' : ''
            }`}
          >
            {/* Orange HV Cables entering */}
            <div className="absolute -top-3 left-5 w-4 h-7 rounded-full bg-orange-500 border-2 border-orange-600 shadow-xs" />
            <div className="absolute -top-3 right-5 w-4 h-7 rounded-full bg-orange-500 border-2 border-orange-600 shadow-xs" />

            <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 mb-1">
              <Cpu size={28} />
            </div>

            <div className="flex items-center gap-1 text-rose-400 font-bold text-[10px] bg-rose-950 px-2 py-0.5 rounded border border-rose-600/50">
              <Zap size={13} className="animate-pulse" />
              <span className="tracking-wider">HIGH VOLTAGE 600V</span>
            </div>

            <span className="text-[10px] text-slate-400 font-mono mt-0.5">MCU 驱动控制器 (未知设备)</span>
          </div>

          <h3 className="text-lg sm:text-xl font-black text-slate-800 mb-1">遇到未知的高压设备</h3>
          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-3 max-w-md">
            这是后续课程才会学习的新能源主驱动电机控制器（MCU），带有<strong>橙色高压电缆</strong>。
            <br />
            作为初入车间的见习技师，<strong>不确定、不认识的带电设备，绝不可随意乱触乱动</strong>！
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2.5 w-full mb-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-10 sm:h-11 px-3 sm:px-4 text-xs sm:text-sm border-rose-300 text-rose-700 hover:bg-rose-50 font-bold rounded-xl cursor-pointer"
              onClick={handleUnknownAction}
            >
              <AlertTriangle size={16} className="mr-1.5" />
              盲目通电碰触 (测试违规后果)
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-10 sm:h-11 px-3 sm:px-4 text-xs sm:text-sm border-slate-300 text-slate-700 hover:bg-slate-50 font-bold rounded-xl cursor-pointer"
              onClick={() => {
                sounds.click();
                dispatch({ type: 'CLEAR_FEEDBACK' });
              }}
            >
              退回安全距离
            </Button>

            <Button
              type="button"
              size="sm"
              className="h-10 sm:h-11 px-4 sm:px-5 text-xs sm:text-sm bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
              onClick={() => {
                sounds.success();
                dispatch({ type: 'REQUEST_HELP' });
              }}
            >
              <HelpCircle size={16} className="mr-1.5" />
              主动向陈师傅请教
            </Button>
          </div>

          {state.helpRequested && (
            <Button
              size="lg"
              className="w-full mt-2 bg-sky-700 hover:bg-sky-800 text-white font-bold h-11 sm:h-12 rounded-xl text-sm sm:text-base shadow-lg animate-bounce cursor-pointer"
              onClick={() => {
                sounds.click();
                dispatch({ type: 'START_REVIEW' });
              }}
            >
              陈师傅已解答规范 · 开始入职确认复盘 →
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
