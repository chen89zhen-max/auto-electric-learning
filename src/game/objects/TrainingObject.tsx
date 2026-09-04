'use client';

import { Cable } from 'lucide-react';
import { useGameStore } from '@/src/stores/gameStore';

export function TrainingObject() {
  const { state, dispatch } = useGameStore();
  if (state.trainingObjectPosition === 'TARGET') return null;

  return (
    <button
      type="button"
      className={state.trainingObjectSelected ? 'training-object selected' : 'training-object'}
      draggable
      aria-pressed={state.trainingObjectSelected}
      onClick={() => dispatch({ type: 'SELECT_OBJECT' })}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        dispatch({ type: 'DRAG_OBJECT' });
      }}
    >
      <Cable size={34} aria-hidden="true" />
      <span>无电训练连接件</span>
      <small>拖动，或点按选择</small>
    </button>
  );
}
