'use client';

import { useState } from 'react';
import { Eye, KeyRound, Lock, Power, ShieldAlert, ShieldCheck, Unlock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/src/stores/gameStore';
import { sounds } from '@/src/components/visuals/SoundEffects';

export function Workbench() {
  const { state, dispatch } = useGameStore();
  const [interlockShake, setInterlockShake] = useState(false);

  const isPowerOn = state.workbenchPower === 'ON';
  const isGuardOpen = state.guardState === 'OPEN';

  const handleOpenGuard = () => {
    if (isPowerOn) {
      sounds.zap();
      setInterlockShake(true);
      setTimeout(() => setInterlockShake(false), 500);
    } else {
      sounds.click();
    }
    dispatch({ type: 'OPEN_GUARD' });
  };

  const handleTogglePower = () => {
    sounds.click();
    dispatch({ type: 'TOGGLE_POWER' });
  };

  const handleViewPower = () => {
    sounds.click();
    dispatch({ type: 'VIEW_POWER' });
  };

  return (
    <div
      className={`workbench-card relative w-full max-w-3xl mx-auto rounded-2xl border-2 border-slate-300 bg-gradient-to-b from-slate-100 to-slate-200 p-4 sm:p-6 shadow-xl transition-all duration-300 my-auto ${
        interlockShake ? 'animate-shake ring-4 ring-rose-500/50' : ''
      }`}
    >
      {/* Bench Header / Nameplate */}
      <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-300">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 text-amber-400 flex items-center justify-center font-black text-sm shadow-inner">
            01
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 m-0 leading-tight">1号新能源汽车电气实训台</h3>
            <span className="text-[11px] sm:text-xs text-slate-500 font-medium">WB-EV01 · 见习工位设备 (12V直流供电)</span>
          </div>
        </div>

        {/* Digital Voltmeter & Power Indicator */}
        <div className="flex items-center gap-2.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700 shadow-inner">
          <div className="flex flex-col items-end">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-mono">DC BUS VOLTAGE</span>
            <span
              className={`font-mono text-xl font-black leading-none ${
                isPowerOn ? 'text-rose-400 animate-pulse' : 'text-emerald-400'
              }`}
            >
              {isPowerOn ? '12.4' : '0.0'} <span className="text-xs font-bold">V</span>
            </span>
          </div>
          <div
            className={`w-3.5 h-3.5 rounded-full border-2 border-slate-900 transition-colors shadow-sm ${
              isPowerOn ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' : 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
            }`}
            title={`电源状态: ${state.workbenchPower}`}
          />
        </div>
      </div>

      {/* Main Interactive Stage: Transparent Acrylic Shield & Inner Circuit */}
      <div className="relative my-3 sm:my-4 h-48 sm:h-56 rounded-2xl border-2 border-slate-400/80 bg-slate-800 overflow-hidden shadow-inner flex items-center justify-center">
        {/* Inner Circuit Elements visible inside */}
        <div className="absolute inset-0 flex items-center justify-around px-12 opacity-80">
          {/* 12V Battery Pack Silhouette */}
          <div className="flex flex-col items-center">
            <div className="w-18 h-20 rounded-2xl bg-slate-700 border-2 border-slate-600 flex flex-col items-center justify-center text-slate-200 shadow-md">
              <Zap size={28} className={isPowerOn ? 'text-amber-400 animate-bounce' : 'text-slate-500'} />
              <span className="text-[10px] font-mono font-bold mt-1">BATTERY</span>
            </div>
            <span className="text-xs text-slate-300 mt-2 font-bold">12V低压供电</span>
          </div>

          {/* Wire path with glow when ON */}
          <div className="h-2 w-24 bg-slate-600 rounded-full relative overflow-hidden">
            {isPowerOn && <div className="absolute inset-0 bg-amber-400 animate-pulse" />}
          </div>

          {/* Relays and Terminals */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-18 rounded-2xl bg-slate-700 border-2 border-slate-600 flex flex-col items-center justify-center text-slate-200 shadow-md">
              <KeyRound size={26} className={isPowerOn ? 'text-rose-400' : 'text-slate-500'} />
              <span className="text-[10px] font-mono font-bold mt-1">MAIN-RELAY</span>
            </div>
            <span className="text-xs text-slate-300 mt-2 font-bold">主控制继电器</span>
          </div>
        </div>

        {/* Acrylic Safety Shield (Sliding Window) */}
        <div
          className={`acrylic-guard absolute inset-x-3 rounded-2xl transition-all duration-500 flex flex-col items-center justify-center select-none ${
            isGuardOpen
              ? 'top-[-90%] bottom-[100%] opacity-20 border-emerald-400 bg-emerald-500/10'
              : 'top-3 bottom-3 border-2 border-sky-400/80 bg-sky-950/50 backdrop-blur-xs shadow-xl'
          }`}
        >
          {isGuardOpen ? (
            <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-base bg-slate-900/90 px-5 py-2 rounded-full border border-emerald-500 shadow-lg">
              <ShieldCheck size={22} />
              <span>防护罩已完全升起 · 可安全开展后续检修</span>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center p-6 bg-slate-900/90 rounded-2xl border border-sky-400/50 shadow-lg max-w-md">
              <div className="p-3 rounded-full bg-sky-500/20 text-sky-300 mb-2.5">
                {isPowerOn ? <ShieldAlert size={34} className="text-amber-400" /> : <Lock size={30} />}
              </div>
              <strong className="text-white text-base tracking-wide font-bold">
                透明防爆安全防护罩【{isPowerOn ? '安全联锁生效中' : '联锁已解除 · 可安全开启'}】
              </strong>
              <small className="text-slate-300 text-xs sm:text-sm mt-1.5 leading-relaxed">
                {isPowerOn
                  ? '⚠ 警告：台架带电运行中，机械联锁处于锁止状态，禁止开罩！'
                  : '✓ 电源已安全切断，请点击下方按钮开启防护罩。'}
              </small>
            </div>
          )}
        </div>
      </div>

      {/* Control Actions Bottom Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full sm:flex-1 h-10 sm:h-11 bg-white hover:bg-slate-50 border-slate-300 text-slate-800 font-bold text-xs sm:text-sm rounded-xl cursor-pointer"
          onClick={handleViewPower}
        >
          <Eye size={18} className="text-sky-600 mr-1.5" />
          观察设备状态
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          className={`w-full sm:flex-1 h-10 sm:h-11 border-2 font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer ${
            isPowerOn
              ? 'bg-rose-50 border-rose-400 text-rose-700 hover:bg-rose-100'
              : 'bg-emerald-50 border-emerald-400 text-emerald-700 hover:bg-emerald-100'
          }`}
          onClick={handleTogglePower}
        >
          <Power size={18} className="mr-1.5" />
          电源开关：{state.workbenchPower}
        </Button>

        <Button
          type="button"
          size="sm"
          className={`w-full sm:flex-1 h-10 sm:h-11 font-bold text-xs sm:text-sm shadow-md rounded-xl transition-all cursor-pointer ${
            isGuardOpen
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
              : isPowerOn
              ? 'bg-amber-600 hover:bg-amber-700 text-white'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
          disabled={isGuardOpen}
          onClick={handleOpenGuard}
        >
          {isGuardOpen ? <Unlock size={18} className="mr-1.5" /> : <Lock size={18} className="mr-1.5" />}
          打开护盖
        </Button>
      </div>

      {/* Step Completion Prompts */}
      {isGuardOpen && (
        <div className="mt-3 pt-2.5 border-t border-slate-300 flex justify-end">
          <Button
            size="lg"
            className="w-full h-11 sm:h-12 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-xl text-sm sm:text-base shadow-lg animate-bounce cursor-pointer"
            onClick={() => {
              sounds.success();
              dispatch({ type: 'CONTINUE_AFTER_SAFETY' });
            }}
          >
            完成规范操作 · 继续下一步训练 →
          </Button>
        </div>
      )}
    </div>
  );
}
