import { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronRight,
  CircleHelp,
  ExternalLink,
  LoaderCircle,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { hostOf, type ResearchEvent } from './types';

/**
 * What the research actually did, in the order it did it — including the
 * candidates it turned down and why. The rejections are the point: they are the
 * difference between a system that reads official pages and one that sounds
 * like it did.
 *
 * A run makes a few hundred decisions, so this is not a log. Finished stages
 * fold to a single line with their tally, only the stage in progress is open,
 * and the pages that were turned down sit behind one disclosure instead of
 * pushing the live work off the screen.
 */
export function ResearchTrail({
  events,
  running,
  stage,
  onDone,
}: {
  events: ResearchEvent[] | undefined;
  running: boolean;
  stage: string;
  onDone: () => void;
}) {
  const stages = groupIntoStages(events ?? []);
  const tally = summarize(events ?? []);

  return (
    <div className="trail">
      <header className="pane-head">
        <h2>{running ? stage || 'Looking into your project' : 'How this plan was researched'}</h2>
        <p className="pane-lede">
          Every search, every page considered, and the reason anything was turned down. Official
          pages only — a blog that happens to be right is still not evidence.
        </p>
      </header>

      <TrailMeter tally={tally} running={running} />

      {events === undefined ? (
        <p className="trail-loading">Opening the research log…</p>
      ) : stages.length === 0 ? (
        <p className="trail-loading">
          {running ? 'Starting the first search…' : 'No research has run for this project yet.'}
        </p>
      ) : (
        <div className="trail-stages">
          {stages.map((group, index) => (
            <Stage
              key={group.id}
              group={group}
              live={running && index === stages.length - 1}
              last={index === stages.length - 1}
            />
          ))}
        </div>
      )}

      {!running && events !== undefined && events.length > 0 && (
        <button className="trail-done" onClick={onDone}>
          <Check size={15} />
          <span>
            <strong>Research complete</strong>
            <small>
              {tally.reads} official {tally.reads === 1 ? 'page' : 'pages'} read, {tally.confirmed}{' '}
              {tally.confirmed === 1 ? 'step' : 'steps'} confirmed. See the plan.
            </small>
          </span>
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  );
}

/** The four numbers that show the work is going somewhere while it runs. */
function TrailMeter({ tally, running }: { tally: Tally; running: boolean }) {
  return (
    <dl className="trail-meter" aria-live="polite">
      <div>
        <dt>Searches</dt>
        <dd>{tally.searches}</dd>
      </div>
      <div>
        <dt>Pages weighed</dt>
        <dd>{tally.considered}</dd>
      </div>
      <div>
        <dt>Turned down</dt>
        <dd>{tally.rejected}</dd>
      </div>
      <div className="is-lead">
        <dt>Confirmed</dt>
        <dd>
          {tally.confirmed}
          {running && <LoaderCircle size={13} className="spin" aria-label="Still running" />}
        </dd>
      </div>
    </dl>
  );
}

function Stage({ group, live, last }: { group: Group; live: boolean; last: boolean }) {
  const [open, setOpen] = useState<boolean | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  // Open while it is the stage being worked on, or the final stage once the run
  // has stopped; a reader arriving afterwards should land on the outcome.
  const shown = open ?? (live || (last && !live));

  useEffect(() => {
    if (!live || !endRef.current) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    endRef.current.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'end' });
  }, [live, group.rows.length]);

  const kept = group.rows.filter((event) => event.verdict !== 'rejected');
  const turned = group.rows.filter((event) => event.verdict === 'rejected');

  return (
    <section className={`trail-stage${shown ? ' is-open' : ''}${live ? ' is-live' : ''}`}>
      <button className="trail-stage-head" onClick={() => setOpen(!shown)} aria-expanded={shown}>
        <span className="trail-stage-mark">
          {live ? <LoaderCircle size={14} className="spin" /> : <Check size={14} />}
        </span>
        <span className="trail-stage-title">{group.label}</span>
        <span className="trail-stage-tally">{describe(group)}</span>
        <ChevronRight size={15} className="trail-chevron" />
      </button>

      {shown && (
        <div className="trail-stage-body">
          <ol className="trail-list" role="log" aria-live={live ? 'polite' : 'off'}>
            {kept.map((event) => (
              <TrailRow key={event._id} event={event} />
            ))}
          </ol>
          {turned.length > 0 && (
            <details className="trail-turned">
              <summary>
                <X size={13} />
                {turned.length} {turned.length === 1 ? 'page' : 'pages'} turned down
              </summary>
              <ol className="trail-list">
                {turned.map((event) => (
                  <TrailRow key={event._id} event={event} />
                ))}
              </ol>
            </details>
          )}
          <div ref={endRef} />
        </div>
      )}
    </section>
  );
}

function TrailRow({ event }: { event: ResearchEvent }) {
  if (event.kind === 'thought')
    return (
      <li className="trail-row is-thought">
        <span className="trail-icon">
          <Sparkles size={14} />
        </span>
        <p className="trail-label">{event.label}</p>
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
        {event.kind === 'confirm' ? (
          <Check size={14} />
        ) : rejected ? (
          <X size={14} />
        ) : event.verdict === 'running' ? (
          <LoaderCircle size={14} className="spin" />
        ) : (
          <ExternalLink size={14} />
        )}
      </span>
      <div>
        <p className="trail-label">
          {event.kind === 'confirm' ? 'Confirmed · ' : ''}
          {event.label}
        </p>
        <p className="trail-detail">
          {event.host && (
            <span className="trail-host">{event.url ? hostOf(event.url) : event.host}</span>
          )}
          {event.verdict === 'running' ? 'Reading…' : event.detail}
        </p>
      </div>
    </li>
  );
}

type Group = { id: string; label: string; rows: ResearchEvent[] };
type Tally = { searches: number; considered: number; rejected: number; confirmed: number; reads: number };

/** Phase markers are section breaks, not entries; everything after one belongs to it. */
function groupIntoStages(events: ResearchEvent[]): Group[] {
  const groups: Group[] = [];
  for (const event of events) {
    if (event.kind === 'phase') {
      groups.push({ id: event._id, label: event.label, rows: [] });
      continue;
    }
    if (!groups.length) groups.push({ id: 'opening', label: 'Reading your project', rows: [] });
    groups[groups.length - 1].rows.push(event);
  }
  return groups;
}

function describe(group: Group): string {
  const searches = group.rows.filter((event) => event.kind === 'search').length;
  const pages = group.rows.filter(
    (event) => event.kind === 'candidate' || event.kind === 'read',
  ).length;
  const confirmed = group.rows.filter((event) => event.kind === 'confirm').length;
  const parts = [
    searches && `${searches} ${searches === 1 ? 'search' : 'searches'}`,
    pages && `${pages} ${pages === 1 ? 'page' : 'pages'}`,
    confirmed && `${confirmed} confirmed`,
  ].filter(Boolean);
  return parts.join(' · ');
}

function summarize(events: ResearchEvent[]): Tally {
  return {
    searches: events.filter((event) => event.kind === 'search').length,
    considered: events.filter((event) => event.kind === 'candidate' || event.kind === 'read').length,
    rejected: events.filter((event) => event.verdict === 'rejected').length,
    confirmed: events.filter((event) => event.kind === 'confirm').length,
    reads: events.filter((event) => event.kind === 'read' && event.verdict === 'accepted').length,
  };
}
