import { CalendarDays, ArrowUpRight, Check, Clock3 } from 'lucide-react';
import { orderRequirements } from '../../../convex/lib/domain';
import type { Requirement } from './types';

export function Timeline({
  rows,
  onSelect,
}: {
  rows: Requirement[];
  onSelect: (id: string) => void;
}) {
  const applicable = rows.filter((row) => row.applicability !== 'not_applicable');
  const { ordered } = orderRequirements(applicable);
  const events = applicable.flatMap((row) => row.events.map((event) => ({ ...event, row })));
  return (
    <div className="timeline-view">
      <div className="view-intro">
        <span className="eyebrow">ONE STEP AT A TIME</span>
        <h2>Your path, taking shape.</h2>
        <p>What comes first, what comes next, and the dates to keep in view.</p>
      </div>
      {events.length > 0 && (
        <section className="upcoming-events">
          <h3>
            <CalendarDays size={17} /> On the calendar
          </h3>
          {events.map((event, i) => (
            <button
              key={`${event.source}:${i}`}
              className="event-card"
              onClick={() => onSelect(event.row._id)}
            >
              <div className="event-date">
                <CalendarDays size={20} />
                <strong>{event.date}</strong>
              </div>
              <div>
                <h4>{event.label}</h4>
                <p>From your correspondence · {event.row.tasks.length} preparation tasks</p>
              </div>
              <ArrowUpRight size={18} />
            </button>
          ))}
        </section>
      )}
      <div className="timeline-list">
        {ordered.map((row, i) => (
          <button className="timeline-item" key={row._id} onClick={() => onSelect(row._id)}>
            <span className={`timeline-number ${row.progress === 'done' ? 'complete' : ''}`}>
              {row.progress === 'done' ? <Check size={17} /> : String(i + 1).padStart(2, '0')}
            </span>
            <div className="timeline-copy">
              <span className="eyebrow">
                {row.prerequisites.length
                  ? `AFTER ${row.prerequisites.map((key) => rows.find((r) => r.key === key)?.title ?? key).join(', ')}`
                  : i === 0
                    ? 'A GOOD PLACE TO START'
                    : 'CAN MOVE ALONGSIDE YOUR OTHER STEPS'}
              </span>
              <h3>{row.title}</h3>
              <p>{row.nextAction}</p>
              {row.duration && (
                <small>
                  <Clock3 size={13} />
                  {row.duration}
                </small>
              )}
            </div>
            <ArrowUpRight size={17} />
          </button>
        ))}
      </div>
      {ordered.length === 0 && (
        <div className="empty-panel">
          <CalendarDays size={28} />
          <h3>Your path will appear here.</h3>
          <p>As we find requirements, we’ll put the next steps in order.</p>
        </div>
      )}
      {ordered.length > 0 && (
        <p className="quiet-note">
          An order to work through, not a promised completion date. Timing stays open until a source
          or notice confirms it.
        </p>
      )}
    </div>
  );
}
