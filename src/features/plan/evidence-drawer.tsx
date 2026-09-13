import { useState } from 'react';
import { useMutation } from 'convex/react';
import { ExternalLink, BookOpen, FileText, CircleHelp, Mail, Check } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { Modal } from '../../components/ui/dialog';
import { errorMessage } from '../../lib/utils';
import { type Requirement, progressLabels } from './types';

export function EvidenceDrawer({ row, onClose }: { row: Requirement | null; onClose: () => void }) {
  const setProgress = useMutation(api.projects.setProgress);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      open={!!row}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          setError('');
        }
      }}
      title={row?.title ?? 'Requirement details'}
      description={row?.authority}
      drawer
    >
      {row && (
        <div className="evidence-content">
          <span
            className={`status-pill ${row.applicability === 'required' ? 'positive' : 'uncertain'}`}
          >
            {row.applicability === 'required'
              ? 'Supported by an official source'
              : row.applicability === 'not_applicable'
                ? 'Not applicable to your project'
                : 'Needs verification'}
          </span>
          <section>
            <span className="eyebrow">WHY IT MATTERS</span>
            <p>{row.reason}</p>
          </section>
          <section className="next-action-box">
            <span className="eyebrow">YOUR NEXT STEP</span>
            <p>{row.nextAction}</p>
          </section>
          <label className="progress-control" htmlFor="requirement-progress">
            Your progress
            <select
              id="requirement-progress"
              value={row.progress}
              disabled={busy}
              onChange={async (e) => {
                setBusy(true);
                setError('');
                try {
                  await setProgress({
                    requirementId: row._id,
                    progress: e.target.value as Requirement['progress'],
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
          </label>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          {row.documents.length > 0 && (
            <section>
              <span className="eyebrow">WHAT TO PREPARE</span>
              <ul className="document-list">
                {row.documents.map((item) => (
                  <li key={item}>
                    <FileText size={15} />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {(row.tasks.length > 0 || row.events.length > 0) && (
            <section className="correspondence-tasks">
              <span className="eyebrow">FROM YOUR CORRESPONDENCE</span>
              {row.events.map((event, index) => (
                <p key={`${event.source}:${index}`}>
                  <Mail size={14} /> {event.label} · {event.date}
                </p>
              ))}
              <ul className="document-list">
                {row.tasks.map((task) => (
                  <li key={task}>
                    <Check size={15} />
                    {task}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <div className="detail-facts">
            <div>
              <span>Published fee</span>
              <strong>{row.fee ?? 'Not confirmed'}</strong>
            </div>
            <div>
              <span>Processing time</span>
              <strong>{row.duration ?? 'Not confirmed'}</strong>
            </div>
          </div>
          <section className="source-evidence">
            <h3>
              <BookOpen size={18} /> Behind this step
            </h3>
            {row.evidence.length ? (
              row.evidence.map((source, index) => (
                <article key={`${source.url}:${index}`}>
                  <span className="evidence-field">{source.field.replaceAll('_', ' ')}</span>
                  <blockquote>“{source.excerpt}”</blockquote>
                  <a href={source.url} target="_blank" rel="noopener noreferrer">
                    Read the source <ExternalLink size={13} />
                  </a>
                </article>
              ))
            ) : (
              <div className="uncertain-note">
                <CircleHelp size={18} />
                <p>
                  We haven’t confirmed this step from official guidance yet. Check with the relevant
                  authority before relying on it.
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
}
