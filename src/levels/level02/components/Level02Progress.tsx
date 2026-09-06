'use client';

import React from 'react';
import { Check } from 'lucide-react';

const objectives = [
  { id: 'OBJ_LAMP_LIT', label: '接亮电路' },
  { id: 'OBJ_CLOSED_CIRCUIT_CONCEPT', label: '闭合回路' },
  { id: 'OBJ_SWITCH_CONTROL', label: '开关控制' },
  { id: 'OBJ_CHASSIS_GROUND', label: '车身搭铁' },
  { id: 'OBJ_TRANSFER_PASSED', label: '拓扑迁移' },
];

export function Level02Progress({ completed }: { completed: string[] }) {
  return (
    <div
      className="task-progress level02-progress flex items-center gap-1.5"
      aria-label={`已完成 ${objectives.filter((item) => completed.includes(item.id)).length} 项，共 ${objectives.length} 项`}
    >
      {objectives.map((obj) => {
        const isDone = completed.includes(obj.id);
        return (
          <span
            key={obj.id}
            className={`progress-item flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              isDone
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            {isDone ? <Check size={13} className="text-emerald-400" /> : <span className="w-2 h-2 rounded-full bg-slate-600" />}
            {obj.label}
          </span>
        );
      })}
    </div>
  );
}
