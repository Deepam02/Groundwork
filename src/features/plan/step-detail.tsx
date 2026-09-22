import { useState } from 'react';
import { useMutation } from 'convex/react';
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  CircleHelp,
  FileText,
  Quote,
} from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { documentLinkLabel, isActionablePage } from '../../../convex/lib/domain';
import { errorMessage } from '../../lib/utils';
import { DocumentViewer } from './document-viewer';
import { clean } from './markdown';
import { progressLabels, type Requirement } from './types';

export function StepDetail({
  row,
  rows,
  projectId,
  onBack,
  onSelect,
}: {
  row: Requirement;
  rows: Requirement[];
  projectId: Id<'projects'>;
  onBack: () => void;
  onSelect: (id: Id<'requirements'>) => void;
}) {
  const setProgress = useMutation(api.projects.setProgress);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const primary = row.applyUrl ?? row.evidence.find((item) => isActionablePage(item.url))?.url;
  const prerequisites = row.prerequisites
    .map((key) => rows.find((other) => other.key === key))
    .filter((other): other is Requirement => Boolean(other));
  const [lead, ...supporting] = row.evidence;

  return (
    <article className="step-detail">
      <button className="pane-back" onClick={onBack}>
        <ArrowLeft size={15} /> Plan overview
      </button>
      <header className="pane-head">
        <p className="pane-kicker">{row.authority}</p>
        <h2>{row.title}</h2>
        <p className="pane-lede">{row.reason}</p>
        <div className="detail-flags">
          <span className={`status-chip is-${row.applicability}`}>
            {row.applicability === 'required'
              ? 'Confirmed by an official page'
              : row.applicability === 'not_applicable'
                ? 'Doesn’t apply to you'
                : 'Needs checking'}
          </span>
          {prerequisites.map((other) => (
            <button key={other._id} className="detail-after" onClick={() => onSelect(other._id)}>
              After {other.title}
            </button>
          ))}
        </div>
      </header>

      {primary ? (
        <a className="step-action" href={primary} target="_blank" rel="noopener noreferrer">
          <span>
            <strong>{documentLinkLabel(primary)}</strong>
            <small>{row.nextAction}</small>
          </span>
          <ArrowUpRight size={19} />
        </a>
      ) : (
        <div className="step-action is-missing">
          <CircleHelp size={18} />
          <span>
            <strong>No application page found yet</strong>
            <small>{row.nextAction}</small>
          </span>
        </div>
      )}

      <div className="detail-facts">
        <div>
          <span>Fee</span>
          <strong>{row.fee ?? 'Not published'}</strong>
        </div>
        <div>
          <span>Processing time</span>
          <strong>{row.duration ?? 'Not published'}</strong>
        </div>
        <div>
          <span>Your progress</span>
          <label className="sr-only" htmlFor={`progress-${row._id}`}>
            Your progress
          </label>
          <select
            id={`progress-${row._id}`}
            value={row.progress}
            disabled={busy}
            onChange={async (event) => {
              setBusy(true);
              setError('');
              try {
                await setProgress({
                  requirementId: row._id,
                  progress: event.target.value as Requirement['progress'],
                });
              } catch (err) {
                setError(errorMessage(err));
              } finally {
                setBusy(false);
              }
            }}
          >
            {Object.entries(progressLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {row.documents.length > 0 && (
        <section className="detail-block">
          <h3>What to prepare</h3>
          <ul className="detail-list">
            {row.documents.map((item) => (
              <li key={item}>
                <FileText size={14} />
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      {(row.events.length > 0 || row.tasks.length > 0) && (
        <section className="detail-block">
          <h3>From your correspondence</h3>
          {row.events.map((event, index) => (
            <p key={`${event.source}:${index}`} className="detail-event">
              <CalendarDays size={14} />
              {event.label} · {event.date}
            </p>
          ))}
          <ul className="detail-list">
            {row.tasks.map((task) => (
              <li key={task}>
                <Check size={14} />
                {task}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="detail-block detail-evidence">
        <h3>The page this rests on</h3>
        {lead ? (
          <>
            <blockquote className="evidence-quote">
              <Quote size={14} />
              {clean(lead.excerpt)}
            </blockquote>
            <DocumentViewer projectId={projectId} url={lead.url} excerpt={lead.excerpt} />
            {supporting.length > 0 && (
              <details className="evidence-more">
                <summary>{supporting.length} more supporting passage{supporting.length === 1 ? '' : 's'}</summary>
                {supporting.map((item, index) => (
                  <div key={`${item.url}:${index}`} className="evidence-extra">
                    <span className="evidence-field">{item.field.replaceAll('_', ' ')}</span>
                    <blockquote>{clean(item.excerpt)}</blockquote>
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      {documentLinkLabel(item.url)} <ArrowUpRight size={13} />
                    </a>
                  </div>
                ))}
              </details>
            )}
          </>
        ) : (
          <p className="detail-empty">
            No official page has been attached to this step yet, so treat it as a lead and confirm
            it with {row.authority} directly.
          </p>
        )}
      </section>
    </article>
  );
}
