import { Award, CheckCircle2, RotateCcw, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AbilityReportData } from '@/src/abilities/AbilityTracker';
import type { Level01Metrics } from '@/src/levels/level01/level01Types';

export function AbilityReport({ report, metrics, onRestart, onReturn }: { report: AbilityReportData; metrics: Level01Metrics; onRestart: () => void; onReturn: () => void }) {
  const duration = metrics.levelDuration ? `${Math.max(1, Math.round(metrics.levelDuration / 60_000))} 分钟` : '未记录';
  return (
    <section className="ability-report">
      <div className="ability-heading"><span><Award size={32} /></span><div><p className="step-label">技能解锁 · 安全作业Ⅰ</p><h2>安全作业能力报告</h2></div></div>
      <div className="ability-grid">{report.dimensions.map((dimension) => <div className="ability-row" key={dimension.id}><strong>{dimension.label}</strong><span aria-label={`${dimension.stars}星`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={19} fill={index < dimension.stars ? 'currentColor' : 'none'} className={index < dimension.stars ? 'filled' : ''} />)}</span></div>)}</div>
      <dl className="process-summary">
        <div><dt>危险操作尝试</dt><dd>{report.summary.directContactAttempts + metrics.unsafeFireResponses} 次</dd></div>
        <div><dt>主动查看设备状态</dt><dd>{report.summary.environmentChecked ? '是' : '否'}</dd></div>
        <div><dt>主动切断危险源</dt><dd>{report.summary.powerIsolated ? '是' : '否'}</dd></div>
        <div><dt>提示使用</dt><dd>{report.summary.helpRequests} 次</dd></div>
        <div><dt>火情处置</dt><dd>{report.summary.fireResponse}</dd></div>
        <div><dt>本关用时</dt><dd>{duration}</dd></div>
      </dl>
      <div className="next-task"><CheckCircle2 size={24} /><div><small>下一任务</small><strong>点亮第一盏检修灯</strong><span>Sprint 2 尚未开发</span></div></div>
      <div className="report-actions"><Button size="lg" variant="outline" onClick={onRestart}><RotateCcw size={18} />重新开始本关</Button><Button size="lg" className="primary-action" onClick={onReturn}>返回任务大厅</Button></div>
    </section>
  );
}
