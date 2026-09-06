'use client';

import React from 'react';
import { TrainingVehicle } from '@/src/components/visuals/TrainingVehicle';
import { useLevel02Store } from '@/src/stores/level02Store';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight, Eye, Car, CheckCircle2, Power } from 'lucide-react';

export function CarChassisGroundScene() {
  const { state, dispatch } = useLevel02Store();

  const lampLit = state.chassisGroundConnected && state.isPowerOn && state.isLampLit;

  return (
    <div className="w-full h-full bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 shadow-md p-3 sm:p-4 flex flex-col justify-between min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-1.5">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
            <Car size={22} className="text-sky-600" />
            <span>实训步骤 5：汽车车身搭铁挑战（减少一根回路线！）</span>
          </h3>
          <p className="text-xs text-slate-500">
            陈师傅：“汽车里如果每一个灯都拉两根长导线回电池，整车会被线束塞满。试着把灯负端接在车身金属上！”
          </p>
        </div>

        <div>
          {lampLit ? (
            <span className="text-xs px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 flex items-center gap-1.5 font-bold">
              <CheckCircle2 size={16} />
              单线制回路已通电
            </span>
          ) : (
            <span className="text-xs px-3 py-1 bg-amber-50 text-amber-800 rounded-full border border-amber-200 font-semibold">
              {state.chassisGroundConnected ? '搭铁已连接 · 等待通电' : '等待连接车身搭铁点'}
            </span>
          )}
        </div>
      </div>

      <div className="vehicle-stage"><TrainingVehicle connected={state.chassisGroundConnected} powered={lampLit} xray={state.chassisXrayView} /></div>

      {/* Control Strip */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mt-3 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {!state.chassisGroundConnected ? (
            <Button
              size="lg"
              className="bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center gap-2 px-5 shadow-sm"
              onClick={() => dispatch({ type: 'CONNECT_CHASSIS_WIRE' })}
            >
              <Sparkles size={18} />
              连接灯负端至车身搭铁点
            </Button>
          ) : !state.isPowerOn ? (
            <Button
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2 px-5 shadow-sm"
              onClick={() => dispatch({ type: 'POWER_ON' })}
            >
              <Power size={18} />
              合上电源开关通电验证
            </Button>
          ) : (
            <Button
              size="lg"
              variant="outline"
              className={`border-slate-300 font-medium ${
                state.chassisXrayView ? 'bg-sky-100 text-sky-800 border-sky-300' : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
              onClick={() => dispatch({ type: 'TOGGLE_CHASSIS_XRAY' })}
            >
              <Eye size={18} className="mr-1.5 text-sky-600" />
              {state.chassisXrayView ? '还原实车外观' : '查看完整回路 (车身半透明透视)'}
            </Button>
          )}

          {state.isPowerOn && <Button size="lg" variant="outline" onClick={() => dispatch({ type: 'POWER_OFF' })}><Power size={16} />切断电源</Button>}
          <div className="text-xs text-slate-600">
            {!state.chassisGroundConnected ? (
              <span className="text-slate-500">
                点击左侧按钮，将灯负端直接固定到车身金属结构上。
              </span>
            ) : !state.isPowerOn ? (
              <span className="text-amber-700 font-bold">
                搭铁线已固定！现在合上电源开关进行通电测试。
              </span>
            ) : (
              <span className="text-emerald-700 font-bold">
                “车身不是电流的终点，它代替了回流导线，把电流送回蓄电池负极！”
              </span>
            )}
          </div>
        </div>

        {state.chassisGroundConnected && state.isPowerOn && (
          <Button
            size="lg"
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-2 px-6 shadow-md shadow-amber-600/20"
            onClick={() => dispatch({ type: 'PROCEED_TO_TRANSFER' })}
          >
            进入实训步骤 6：空间拓扑打乱测试
            <ArrowRight size={18} />
          </Button>
        )}
      </div>
    </div>
  );
}
