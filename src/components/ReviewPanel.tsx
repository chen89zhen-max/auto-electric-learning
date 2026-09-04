'use client';

import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import reviewData from '@/src/levels/level00/review.json';
import type { ReviewQuestion } from '@/src/core/types';
import { useGameStore } from '@/src/stores/gameStore';

const questions = reviewData as ReviewQuestion[];

export function ReviewPanel() {
  const { state, dispatch } = useGameStore();
  const question = questions[state.reviewIndex];
  const completedCount = Object.keys(state.reviewAnswers).length;

  return (
    <section className="review-panel" aria-labelledby="review-title">
      <div className="review-record">
        <p className="step-label">入职训练记录</p>
        {['查看工作任务', '完成基础操作', '操作前确认设备状态', '学会请求师傅帮助'].map((item) => <span key={item}><CheckCircle2 size={17} />{item}</span>)}
      </div>
      <div className="review-question">
        <p className="question-count">情境确认 {state.reviewIndex + 1} / {questions.length}</p>
        <h2 id="review-title">{question.prompt}</h2>
        <div className="answer-list">
          {question.options.map((option) => (
            <Button
              key={option.id}
              size="lg"
              variant="outline"
              disabled={Boolean(state.reviewAnswers[question.id])}
              onClick={() => dispatch({ type: 'ANSWER_REVIEW', questionId: question.id, optionId: option.id, correct: option.correct, feedback: option.feedback })}
            >{option.label}</Button>
          ))}
        </div>
        <p className="review-status" aria-live="polite">已确认 {completedCount} / {questions.length}</p>
      </div>
    </section>
  );
}
