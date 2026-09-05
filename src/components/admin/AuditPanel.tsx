'use client';

import type { AuditItem } from './adminTypes';

export function AuditPanel({ logs }: { logs: AuditItem[] }) {
  return (
    <section className="overflow-auto rounded-xl border border-slate-200 bg-white" aria-label="审计日志">
      <table className="min-w-[760px] w-full text-sm">
        <thead className="sticky top-0 bg-slate-100 text-left text-slate-600"><tr><th className="p-3">时间</th><th className="p-3">操作者</th><th className="p-3">动作</th><th className="p-3">目标</th><th className="p-3">结果</th></tr></thead>
        <tbody>{logs.map((log) => <tr key={log.id} className="border-t border-slate-100"><td className="p-3 whitespace-nowrap">{new Date(log.occurredAt).toLocaleString('zh-CN', { hour12: false })}</td><td className="p-3">{log.actorUsername || '系统/匿名'}{log.actorRole ? `（${log.actorRole}）` : ''}</td><td className="p-3 font-mono text-xs">{log.action}</td><td className="p-3">{log.targetType || '—'} / {log.targetId || '—'}</td><td className="p-3">{log.result}</td></tr>)}</tbody>
      </table>
    </section>
  );
}
