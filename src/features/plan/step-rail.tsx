import { Activity, Check, ChevronDown, CircleHelp, CalendarDays, Map } from 'lucide-react';
import type { Id } from '../../../convex/_generated/dataModel';
import { orderRequirements } from '../../../convex/lib/domain';
import { cn } from '../../lib/utils';
import {
  isConfirmed,
  isDismissed,
  progressLabels,
  type Requirement,
  type WorkspaceData,
} from './types';

/**
 * The plan itself. Only steps an official page actually confirmed appear as
 * numbered work; everything else is grouped and labelled rather than hidden or
 * deleted, so nothing a user was shown ever silently disappears.
 */
export function StepRail({
  data,
  running,
  selectedId,
  trailActive,
  overviewActive,
  eventCount,
  onSelect,
  onTrail,
  onOverview,
}: {
  data: WorkspaceData;
  running: boolean;
  selectedId: Id<'requirements'> | null;
  trailActive: boolean;
  overviewActive: boolean;
  eventCount: number;
  onSelect: (id: Id<'requirements'>) => void;
  onTrail: () => void;
  onOverview: () => void;
}) {
  const confirmed = data.requirements.filter(isConfirmed);
  const steps = orderRequirements(confirmed.filter((row) => row.applicability === 'required'))
    .ordered;
  const unsure = confirmed.filter((row) => row.applicability === 'needs_verification');
  const notApplicable = confirmed.filter((row) => row.applicability === 'not_applicable');
  const unconfirmed = data.requirements.filter(isDismissed);
  const done = steps.filter((row) => row.progress === 'done').length;

  return (
    <nav className="step-rail" aria-label="Project plan">
      <div className="rail-nav">
        <button
          className={cn('rail-tab', trailActive && 'active')}
          aria-current={trailActive ? 'true' : undefined}
          onClick={onTrail}
        >
          <Activity size={15} />
          How this was researched
          {running ? (
            <span className="rail-live" aria-label="Research running" />
          ) : (
            eventCount > 0 && <span className="rail-count">{eventCount}</span>
          )}
        </button>
        <button
          className={cn('rail-tab', overviewActive && 'active')}
          aria-current={overviewActive ? 'true' : undefined}
          onClick={onOverview}
        >
          <Map size={15} />
          Plan overview
        </button>
      </div>

      {steps.length > 0 && (
        <div className="rail-group">
          <h2>
            Your steps
            <span>
              {done} of {steps.length} done
            </span>
          </h2>
          <ol className="rail-steps">
            {steps.map((row, index) => (
              <li key={row._id}>
                <StepButton
                  row={row}
                  index={index + 1}
                  active={row._id === selectedId}
                  onSelect={() => onSelect(row._id)}
                />
              </li>
            ))}
          </ol>
        </div>
      )}

      {unsure.length > 0 && (
        <div className="rail-group">
          <h2>Check the detail yourself</h2>
          <ol className="rail-steps">
            {unsure.map((row) => (
              <li key={row._id}>
                <StepButton
                  row={row}
                  active={row._id === selectedId}
                  onSelect={() => onSelect(row._id)}
                />
              </li>
            ))}
          </ol>
        </div>
      )}

      {steps.length === 0 && unsure.length === 0 && (
        <p className="rail-empty">
          {running
            ? 'Steps appear here the moment an official page confirms one.'
            : 'No step has been confirmed against an official page yet.'}
        </p>
      )}

      <RailFold
        label="Doesn’t apply to you"
        count={notApplicable.length}
        rows={notApplicable}
        selectedId={selectedId}
        onSelect={onSelect}
      />
      <RailFold
        label="Couldn’t confirm"
        count={unconfirmed.length}
        rows={unconfirmed}
        selectedId={selectedId}
        onSelect={onSelect}
        note="Named in a local account, but no official page backed it up."
      />
    </nav>
  );
}

function StepButton({
  row,
  index,
  active,
  onSelect,
}: {
  row: Requirement;
  index?: number;
  active: boolean;
  onSelect: () => void;
}) {
  const date = row.events[0]?.date;
  return (
    <button
      className={cn('rail-step', active && 'active', row.progress === 'done' && 'is-done')}
      aria-current={active ? 'true' : undefined}
      onClick={onSelect}
    >
      <span className="rail-marker">
        {row.progress === 'done' ? (
          <Check size={14} />
        ) : index ? (
          String(index).padStart(2, '0')
        ) : (
          <CircleHelp size={15} />
        )}
      </span>
      <span className="rail-text">
        <span className="rail-authority">{row.authority}</span>
        <span className="rail-title">{row.title}</span>
        <span className="rail-meta">
          {date && (
            <span className="rail-date">
              <CalendarDays size={12} />
              {date}
            </span>
          )}
          {row.prerequisites.length > 0 && <span>After an earlier step</span>}
          {row.progress !== 'not_started' && <span>{progressLabels[row.progress]}</span>}
        </span>
      </span>
    </button>
  );
}

function RailFold({
  label,
  count,
  rows,
  note,
  selectedId,
  onSelect,
}: {
  label: string;
  count: number;
  rows: Requirement[];
  note?: string;
  selectedId: Id<'requirements'> | null;
  onSelect: (id: Id<'requirements'>) => void;
}) {
  if (!count) return null;
  return (
    <details className="rail-fold">
      <summary>
        {label}
        <span className="rail-count">{count}</span>
        <ChevronDown size={14} />
      </summary>
      {note && <p className="rail-note">{note}</p>}
      {rows.map((row) => (
        <button
          key={row._id}
          className={cn('rail-quiet', row._id === selectedId && 'active')}
          onClick={() => onSelect(row._id)}
        >
          {row.title}
        </button>
      ))}
    </details>
  );
}
