import { useEffect, useRef } from 'react';
import { Check, CircleHelp, ExternalLink, LoaderCircle, Search, Sparkles, X } from 'lucide-react';
import { hostOf, type ResearchEvent } from './types';

/**
 * What the research actually did, in the order it did it — including the
 * candidates it turned down and why. The rejections are the point: they are the
 * difference between a system that reads official pages and one that sounds
 * like it did.
 */
export function ResearchTrail({
  events,
  running,
  stage,
}: {
  events: ResearchEvent[] | undefined;
  running: boolean;
  stage: string;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const count = events?.length ?? 0;
  useEffect(() => {
    if (!running || !endRef.current) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    endRef.current.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'end' });
  }, [count, running]);

  return (
    <div className="trail">
      <header className="pane-head">
        <p className="pane-kicker">How this was researched</p>
        <h2>
          {running ? stage || 'Looking into your project' : 'Every step of the investigation'}
        </h2>
        <p className="pane-lede">
          Each search, each page considered, and the reason anything was turned down. Official
          pages only — a blog that happens to be right is still not evidence.
        </p>
      </header>
      <ol className="trail-list" role="log" aria-live="polite" aria-busy={running}>
        {events === undefined ? (
          <li className="trail-loading">Opening the research log…</li>
        ) : events.length === 0 ? (
          <li className="trail-loading">
            {running ? 'Starting the first search…' : 'No research has run for this project yet.'}
          </li>
        ) : (
          events.map((event) => <TrailRow key={event._id} event={event} />)
        )}
      </ol>
      <div ref={endRef} />
      {running && (
        <p className="trail-foot">
          <LoaderCircle size={14} className="spin" />
          Research is running. Steps appear on the left as they are confirmed.
        </p>
      )}
    </div>
  );
}

function TrailRow({ event }: { event: ResearchEvent }) {
  if (event.kind === 'phase')
    return (
      <li className="trail-phase">
        <span>{event.label}</span>
      </li>
    );

  if (event.kind === 'thought')
    return (
      <li className="trail-row is-thought">
        <span className="trail-icon">
          <Sparkles size={14} />
        </span>
        <div>
          <p className="trail-label">{event.label}</p>
          {event.detail && <p className="trail-detail">{event.detail}</p>}
        </div>
      </li>
    );

  if (event.kind === 'search')
    return (
      <li className="trail-row is-search">
        <span className="trail-icon">
          <Search size={14} />
        </span>
        <div>
          <code className="trail-query">{event.label}</code>
          <p className="trail-detail">
            {event.verdict === 'running' ? 'Searching…' : event.detail}
          </p>
        </div>
        <Verdict verdict={event.verdict} />
      </li>
    );

  if (event.kind === 'gap')
    return (
      <li className="trail-row is-gap">
        <span className="trail-icon">
          <CircleHelp size={14} />
        </span>
        <div>
          <p className="trail-label">Still unclear</p>
          <p className="trail-detail">{event.label}</p>
        </div>
      </li>
    );

  const rejected = event.verdict === 'rejected';
  return (
    <li className={`trail-row is-${event.kind}${rejected ? ' is-rejected' : ''}`}>
      <span className="trail-icon">
        {event.kind === 'confirm' ? <Check size={14} /> : rejected ? <X size={14} /> : <ExternalLink size={14} />}
      </span>
      <div>
        <p className="trail-label">
          {event.kind === 'confirm' ? 'Confirmed · ' : ''}
          {event.label}
        </p>
        <p className="trail-detail">
          {event.host && <span className="trail-host">{event.url ? hostOf(event.url) : event.host}</span>}
          {event.verdict === 'running' ? 'Reading…' : event.detail}
        </p>
      </div>
      <Verdict verdict={event.verdict} />
    </li>
  );
}

function Verdict({ verdict }: { verdict?: ResearchEvent['verdict'] }) {
  if (verdict === 'running')
    return <LoaderCircle size={14} className="spin trail-verdict" aria-label="In progress" />;
  if (verdict === 'accepted')
    return <Check size={14} className="trail-verdict is-ok" aria-label="Used" />;
  if (verdict === 'rejected')
    return <X size={14} className="trail-verdict is-no" aria-label="Turned down" />;
  if (verdict === 'failed')
    return <X size={14} className="trail-verdict is-no" aria-label="Failed" />;
  return null;
}
