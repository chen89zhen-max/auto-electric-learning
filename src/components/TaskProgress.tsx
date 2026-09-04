import { Check } from 'lucide-react';
import type { ObjectiveId } from '@/src/core/types';

const objectives: Array<{ id: ObjectiveId; label: string }> = [
  { id: 'READ_WORK_ORDER', label: '查看任务' },
  { id: 'BASIC_INTERACTION', label: '基础操作' },
  { id: 'DEVICE_STATE_CHECK', label: '状态确认' },
  { id: 'USE_TUTOR_HELP', label: '请求帮助' },
];

export function TaskProgress({ completed }: { completed: ObjectiveId[] }) {
  return (
    <div className="task-progress" aria-label={`已完成 ${completed.length} 项，共 4 项`}>
      {objectives.map((objective) => {
        const done = completed.includes(objective.id);
        return <span key={objective.id} className={done ? 'progress-item done' : 'progress-item'}>{done ? <Check size={14} /> : <i />}{objective.label}</span>;
      })}
    </div>
  );
}
