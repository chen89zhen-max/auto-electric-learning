import React from 'react';
import { Check, Lock, Play, Sparkles, Wrench } from 'lucide-react';
import styles from './CourseMapLobby.module.css';

export function CourseMapLegend() {
  return (
    <div className={styles.legendBar} aria-label="课程地图图例说明">
      <div className={styles.legendItems}>
        {/* Flow legend */}
        <div className={styles.legendItem}>
          <svg width="24" height="12" viewBox="0 0 24 12" aria-hidden="true">
            <line
              x1="0"
              y1="6"
              x2="24"
              y2="6"
              stroke="#c9deed"
              strokeWidth="3"
              strokeDasharray="4 2"
            />
          </svg>
          <span className="text-xs text-slate-300">学习路线</span>
        </div>

        <div className={styles.legendItem}>
          <svg width="24" height="12" viewBox="0 0 24 12" aria-hidden="true">
            <line
              x1="0"
              y1="6"
              x2="24"
              y2="6"
              stroke="#34d399"
              strokeWidth="2.5"
            />
          </svg>
          <span className="text-xs text-slate-300">已完成路段</span>
        </div>
        <div className={styles.legendItem}><span aria-hidden="true" style={{ width: 24, height: 3, background: '#fbbf24' }} /><span className="text-xs text-slate-300">当前任务路段</span></div>
      </div>

      <div className={styles.legendItems}>
        {/* States legend */}
        <div className="flex items-center gap-1 text-xs text-emerald-400">
          <Check size={14} />
          <span>已完成</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-amber-400">
          <Sparkles size={14} />
          <span>当前推荐</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-cyan-400">
          <Play size={12} className="fill-cyan-400" />
          <span>可学习</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Lock size={13} />
          <span>未解锁</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-violet-400">
          <Wrench size={13} />
          <span>建设中</span>
        </div>
      </div>
    </div>
  );
}
