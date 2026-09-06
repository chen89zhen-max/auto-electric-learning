'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  Eye,
  Flame,
  FlameKindling,
  Megaphone,
  Power,
  ShieldAlert,
  SprayCan,
  Waves,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLevel01Store } from '@/src/stores/level01Store';
import type { ExtinguisherType } from '@/src/levels/level01/level01Types';
import { sounds } from '@/src/components/visuals/SoundEffects';

interface ExtinguisherCard {
  id: ExtinguisherType;
  name: string;
  scope: string;
  color: string;
  nozzle: string;
  suitable: boolean;
  warningNote?: string;
}

const extinguishers: ExtinguisherCard[] = [
  {
    id: 'CO2',
    name: '二氧化碳灭火器',
    scope: '600V以下带电设备、精密仪表仪器',
    color: '#b91c1c',
    nozzle: '黑色绝缘大喇叭喷筒',
    suitable: true,
  },
  {
    id: 'DRY_CHEMICAL',
    name: 'ABC 干粉灭火器',
    scope: '电气设备、易燃液体、可燃气体',
    color: '#dc2626',
    nozzle: '细导管高压喷嘴',
    suitable: true,
  },
  {
    id: 'FOAM',
    name: '泡沫灭火器',
    scope: '普通固体材料、油类火灾',
    color: '#ca8a04',
    nozzle: '泡沫喷枪',
    suitable: false,
    warningNote: '泡沫药剂含水导电！严禁带电！',
  },
  {
    id: 'WATER_BASED',
    name: '水基型灭火器',
    scope: '非水溶性固体、织物材料火灾',
    color: '#15803d',
    nozzle: '清水雾化喷枪',
    suitable: false,
    warningNote: '清水水流导电！易发生严重二次触电！',
  },
];

export function FireScene() {
  const { state, dispatch } = useLevel01Store();
  const [sprayAnimation, setSprayAnimation] = useState(false);
  const [zapFlash, setZapFlash] = useState(false);

  const isPowerOn = state.firePowerState === 'ON';

  const handleWaterAttempt = () => {
    sounds.zap();
    setZapFlash(true);
    setTimeout(() => setZapFlash(false), 600);
    dispatch({ type: 'USE_WATER' });
  };

  const handleSelectExtinguisher = (type: ExtinguisherType) => {
    if (isPowerOn) {
      sounds.zap();
      setZapFlash(true);
      setTimeout(() => setZapFlash(false), 500);
    } else {
      sounds.click();
    }
    dispatch({ type: 'SELECT_EXTINGUISHER', extinguisherType: type });
  };

  const handleExecuteResponse = () => {
    sounds.spray();
    setSprayAnimation(true);
    setTimeout(() => {
      setSprayAnimation(false);
      dispatch({ type: 'EXECUTE_FIRE_RESPONSE' });
    }, 700);
  };

  // Realistic Smoking Distribution Cabinet Component (Enlarged)
  const renderDistributionCabinet = () => (
    <div
      className={`relative w-full h-64 sm:h-72 rounded-3xl border-3 border-slate-700 bg-slate-900 p-6 flex items-center justify-between shadow-2xl overflow-hidden mb-6 ${
        zapFlash ? 'animate-shake ring-4 ring-rose-500' : ''
      }`}
    >
      {/* Cabinet Louvers and Smoke Particles */}
      <div className="flex flex-col justify-between h-full w-56 sm:w-64">
        <div className="flex items-center gap-2">
          <ShieldAlert size={24} className="text-amber-400" />
          <span className="text-sm font-mono font-bold text-slate-200">MAIN-DIST-02 · 车间配电柜</span>
        </div>

        {/* Cabinet Door Grille with Overheating Glow */}
        <div className="relative w-full h-32 rounded-2xl bg-slate-950 border border-slate-800 p-3 flex flex-col justify-around overflow-hidden">
          {isPowerOn && (
            <div className="absolute inset-0 bg-rose-600/30 animate-pulse pointer-events-none" />
          )}
          <div className="h-1.5 bg-slate-800 rounded-full" />
          <div className="h-1.5 bg-slate-800 rounded-full" />
          <div className="h-1.5 bg-slate-800 rounded-full" />
          <div className="h-1.5 bg-slate-800 rounded-full" />
          {/* Overheating glowing wire contact */}
          {isPowerOn && (
            <div className="absolute bottom-3 left-6 flex items-center gap-1.5 text-amber-300 text-xs font-mono font-bold animate-ping">
              ⚡ 接触电阻过大 · 异常发热
            </div>
          )}
        </div>

        <div className="text-xs sm:text-sm font-mono text-slate-300">
          配电箱电源状态：
          <strong className={isPowerOn ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
            {state.firePowerState}
          </strong>
        </div>
      </div>

      {/* Center: Billowing Smoke Clouds */}
      <div className="relative flex flex-col items-center justify-center">
        {state.fireResolved ? (
          <div className="flex flex-col items-center text-emerald-400 font-bold text-base">
            <CheckCircle2 size={54} />
            <span className="mt-2">电气火情解除 · 烟雾已消散</span>
          </div>
        ) : (
          <div className="relative w-40 h-40 flex items-center justify-center">
            {sprayAnimation && (
              <div className="absolute inset-0 bg-slate-100/70 blur-sm rounded-full animate-ping pointer-events-none z-10" />
            )}
            {/* Animated Smoke SVG */}
            <svg viewBox="0 0 100 100" className="w-full h-full opacity-80">
              <circle cx="50" cy="50" r="32" fill="#64748b" className="animate-ping" opacity="0.4" />
              <circle cx="45" cy="45" r="25" fill="#94a3b8" className="animate-pulse" opacity="0.6" />
              <circle cx="55" cy="48" r="20" fill="#cbd5e1" opacity="0.7" />
            </svg>
            <Flame size={40} className="text-amber-500 absolute animate-bounce" />
          </div>
        )}
      </div>

      {/* Right: Power Breaker Lever on the Cabinet */}
      <div className="flex flex-col items-center">
        <div className="p-4 rounded-3xl bg-slate-800 border-2 border-slate-700 flex flex-col items-center shadow-lg">
          <span className="text-xs font-mono text-slate-300 font-bold mb-1.5">BREAKER</span>
          <button
            type="button"
            className={`w-14 h-24 rounded-2xl border-2 flex flex-col items-center justify-between p-2 transition-all cursor-pointer ${
              isPowerOn
                ? 'bg-rose-900 border-rose-500 text-rose-200 hover:scale-105 shadow-md'
                : 'bg-emerald-900 border-emerald-500 text-emerald-200'
            }`}
            onClick={() => {
              sounds.click();
              if (isPowerOn) {
                dispatch({ type: 'ISOLATE_FIRE_POWER' });
              }
            }}
            title={isPowerOn ? '点击扳动空开拉闸断电' : '空开已处于断开位置'}
          >
            <span className="text-[10px] font-black">ON</span>
            <div
              className={`w-10 h-10 rounded-xl bg-white shadow-md flex items-center justify-center transition-transform ${
                isPowerOn ? '-translate-y-1 text-rose-700' : 'translate-y-7 text-emerald-700'
              }`}
            >
              <Power size={22} />
            </div>
            <span className="text-[10px] font-black">OFF</span>
          </button>
        </div>
        <span className="text-xs text-slate-300 font-bold mt-2">配电箱断路器</span>
      </div>
    </div>
  );

  // Stage 1: FIRE_EVENT
  if (state.currentStage === 'FIRE_EVENT') {
    return (
      <div className="relative z-10 w-full max-w-5xl xl:max-w-6xl bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-10 border-2 border-slate-200 shadow-2xl animate-in fade-in duration-300 my-auto">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-lg">
            <FlameKindling size={30} />
          </div>
          <div>
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-700 font-mono">
              新的突发险情 · 车间配电区域
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-800 m-0">配电箱异常发热冒烟</h2>
          </div>
        </div>

        {/* Professional Review Status Disclaimer */}
        <div className="w-full bg-amber-50 border border-amber-300 rounded-2xl p-3 sm:p-4 mb-4 text-left flex items-start gap-3">
          <ShieldAlert size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-amber-900 leading-relaxed">
            <strong>电气火情实训审定提示（待学校消防实训规程复核）：</strong>
            电气火灾第一原则为“先断电再扑救”；如火势蔓延或无法确保安全，<strong>应立即组织人员撤离并报警</strong>，切忌强行灭火！
          </div>
        </div>

        {renderDistributionCabinet()}

        <p className="text-slate-700 text-base sm:text-lg font-bold mb-5 text-center">
          发现电气设备起火冒烟，<strong>切忌盲目泼水扑救</strong>！第一步核心操作是什么？
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="h-14 text-base border-slate-300 hover:bg-slate-50 text-slate-800 font-bold"
            onClick={() => {
              sounds.click();
              dispatch({ type: 'CHECK_FIRE_DEVICE' });
            }}
          >
            <Eye size={20} className="mr-2 text-sky-600" />
            查看确认起火设备类型
          </Button>

          <Button
            type="button"
            size="lg"
            variant="outline"
            className="h-14 text-base border-slate-300 hover:bg-slate-50 text-slate-800 font-bold"
            onClick={() => {
              sounds.click();
              dispatch({ type: 'CHECK_FIRE_POWER' });
            }}
          >
            <Power size={20} className="mr-2 text-amber-600" />
            检查配电箱电源状态
          </Button>

          <Button
            type="button"
            size="lg"
            variant="outline"
            className="h-14 text-base border-slate-300 hover:bg-slate-50 text-slate-800 font-bold"
            onClick={() => {
              sounds.click();
              dispatch({ type: 'REQUEST_FIRE_SUPPORT' });
            }}
          >
            <Megaphone size={20} className="mr-2 text-sky-600" />
            呼叫周围师生与车间支援
          </Button>

          <Button
            type="button"
            size="lg"
            variant="outline"
            className="h-14 text-base border-rose-300 bg-rose-50/70 hover:bg-rose-100 text-rose-700 font-bold"
            onClick={handleWaterAttempt}
          >
            <Waves size={20} className="mr-2" />
            直接端水灭火 (测试危险后果)
          </Button>
        </div>
      </div>
    );
  }

  // Stage 2: FIRE_RISK_ASSESSMENT & FIRE_RESPONSE
  return (
    <div className="relative z-10 w-full max-w-5xl xl:max-w-6xl bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-10 border-2 border-slate-200 shadow-2xl animate-in fade-in duration-300 my-auto">
      <div className="flex items-center justify-between pb-5 border-b border-slate-200 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-lg">
            <SprayCan size={30} />
          </div>
          <div>
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-700 font-mono">
              规范灭火 · 器材选用标准 (教材表 1-2)
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-800 m-0">配电柜火情应急处置台</h2>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-2xl border border-slate-200">
          <span className="text-sm font-semibold text-slate-600">配电电源:</span>
          <span
            className={`px-3 py-0.5 rounded-full text-sm font-bold font-mono ${
              isPowerOn ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {state.firePowerState}
          </span>
        </div>
      </div>

      {/* Professional Review Status Disclaimer */}
      <div className="w-full bg-amber-50 border border-amber-300 rounded-2xl p-3 sm:p-4 mb-5 text-left flex items-start gap-3">
        <ShieldAlert size={20} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-amber-900 leading-relaxed">
          <strong>电气火情实训审定提示（待学校消防实训规程复核）：</strong>
          灭火器材选用依据教材标准表配置。若火势超出初起阶段或现场浓烟威胁人身安全，<strong>首要原则是立即撤离报警</strong>，严禁盲目逗留！
        </div>
      </div>

      {renderDistributionCabinet()}

      {/* Extinguisher Rack */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 font-mono">
            车间灭火器材架（点击选取适用灭火器）
          </span>
          <span className="text-xs sm:text-sm text-slate-400 font-medium">国家规划教材标准规范</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {extinguishers.map((ext) => {
            const isSelected = state.selectedExtinguisher === ext.id;

            return (
              <button
                key={ext.id}
                type="button"
                className={`group relative p-5 rounded-3xl border-2 transition-all flex flex-col items-center text-center cursor-pointer select-none ${
                  isSelected
                    ? 'border-sky-500 bg-sky-50/90 shadow-xl scale-102 ring-4 ring-sky-300/40'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                }`}
                onClick={() => handleSelectExtinguisher(ext.id)}
              >
                {/* Extinguisher Bottle Vector Icon */}
                <div className="relative w-20 h-24 mb-3 flex items-center justify-center">
                  <svg viewBox="0 0 60 80" className="w-full h-full drop-shadow-sm group-hover:scale-105 transition-transform">
                    {/* Valve & Handle */}
                    <rect x="25" y="6" width="10" height="8" rx="2" fill="#475569" />
                    <line x1="22" y1="8" x2="38" y2="8" stroke="#1e293b" strokeWidth="2.5" />
                    {/* Bottle */}
                    <rect x="18" y="14" width="24" height="56" rx="10" fill={ext.color} />
                    {/* Label Badge on Bottle */}
                    <rect x="21" y="32" width="18" height="24" rx="2" fill="#ffffff" fillOpacity="0.95" />
                    <text x="30" y="44" fill="#0f172a" fontSize="5.5" fontWeight="bold" textAnchor="middle">
                      {ext.id === 'CO2' ? 'CO₂' : ext.id === 'DRY_CHEMICAL' ? '干粉' : ext.id === 'FOAM' ? '泡沫' : '水基'}
                    </text>
                    {/* Warning sign for foam & water */}
                    {!ext.suitable && (
                      <text x="30" y="52" fill="#dc2626" fontSize="4.5" fontWeight="black" textAnchor="middle">
                        禁带电
                      </text>
                    )}
                  </svg>
                </div>

                <strong className="text-base font-bold text-slate-800">{ext.name}</strong>
                <small className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{ext.scope}</small>

                <div className="mt-3 w-full pt-2 border-t border-slate-100">
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      ext.suitable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {ext.suitable ? '✓ 电气适用' : '⚠ 严禁带电扑救'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Response Action Execution */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {isPowerOn ? (
          <Button
            size="lg"
            variant="outline"
            className="w-full sm:w-auto h-14 px-6 text-base border-2 border-rose-400 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold shadow-md animate-pulse"
            onClick={() => {
              sounds.click();
              dispatch({ type: 'ISOLATE_FIRE_POWER' });
            }}
          >
            <Power size={20} className="mr-2" />
            切断配电箱总电源开关
          </Button>
        ) : (
          <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-300 px-5 py-3.5 rounded-xl font-bold text-sm sm:text-base">
            <CheckCircle2 size={20} className="text-emerald-600" />
            <span>配电电源已切断 · 请在上方选取适用灭火器</span>
          </div>
        )}

        <Button
          size="lg"
          className={`flex-1 w-full h-14 rounded-2xl text-lg font-bold shadow-xl transition-all ${
            state.selectedExtinguisher && !isPowerOn
              ? 'bg-sky-700 hover:bg-sky-800 text-white animate-bounce cursor-pointer'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
          disabled={!state.selectedExtinguisher || isPowerOn}
          onClick={handleExecuteResponse}
        >
          <SprayCan size={22} className="mr-2" />
          {isPowerOn
            ? '请先切断配电箱电源'
            : state.selectedExtinguisher
            ? '执行灭火处置 · 喷雾消烟降温 →'
            : '请在上方器材架选择适用灭火器'}
        </Button>
      </div>
    </div>
  );
}
