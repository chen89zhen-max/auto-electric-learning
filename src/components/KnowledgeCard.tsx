import { ArrowDown, BookOpenCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface KnowledgeCardData {
  id: string;
  title: string;
  core: string;
  diagram: string[];
}

export function KnowledgeCard({ card, actionLabel = '知道了', onComplete, children }: { card: KnowledgeCardData; actionLabel?: string; onComplete: () => void; children?: React.ReactNode }) {
  return (
    <section className="knowledge-card" aria-labelledby={`knowledge-${card.id}`}>
      <div className="knowledge-heading"><span><BookOpenCheck size={24} /></span><div><small>经历现象后解锁</small><h2 id={`knowledge-${card.id}`}>{card.title}</h2></div></div>
      <p>{card.core}</p>
      <div className="knowledge-diagram" aria-label={`${card.title}简图`}>
        {card.diagram.map((item, index) => <div key={item}><strong>{item}</strong>{index < card.diagram.length - 1 && <ArrowDown size={18} />}</div>)}
      </div>
      {children}
      <Button size="lg" className="primary-action" onClick={onComplete}>{actionLabel}</Button>
    </section>
  );
}
