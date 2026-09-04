import { Check } from 'lucide-react';
import type { Level01Objective } from '@/src/levels/level01/level01Types';

const items: Array<{ id: Level01Objective; label: string }> = [
  { id: 'CONTROL_ELECTRICAL_RISK', label: '控制危险' },
  { id: 'ASSESS_FIRST_AID', label: '人员处置' },
  { id: 'RESPOND_TO_ELECTRICAL_FIRE', label: '火情处置' },
  { id: 'TRANSFER_SAFETY_RULE', label: '迁移判断' },
  { id: 'REFLECT_SAFETY_CHAIN', label: '安全反思' },
];

export function Level01Progress({ completed }: { completed: Level01Objective[] }) {
  return <div className="task-progress level01-progress" aria-label={`已完成 ${completed.length} 项，共 5 项`}>{items.map((item) => { const done = completed.includes(item.id); return <span key={item.id} className={done ? 'progress-item done' : 'progress-item'}>{done ? <Check size={14} /> : <i />}{item.label}</span>; })}</div>;
}
