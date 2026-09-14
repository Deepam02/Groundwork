import { useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import {
  ArrowLeft,
  ArrowUpRight,
  MapPin,
  ListChecks,
  Route,
  Mail,
  Check,
  ChevronRight,
  ChevronDown,
  CircleHelp,
  Search,
  BookOpen,
  LoaderCircle,
  RefreshCw,
  Leaf,
} from 'lucide-react';
import type { Id } from '../../../convex/_generated/dataModel';
import { api } from '../../../convex/_generated/api';
import { orderRequirements } from '../../../convex/lib/domain';
import { Button } from '../../components/ui/button';
import { cn, errorMessage } from '../../lib/utils';
import { QuestionCard } from '../research/question-card';
import { EvidenceDrawer } from './evidence-drawer';
import { Timeline } from './timeline';
import { InboxView } from '../inbox/inbox-view';
import type { Requirement, WorkspaceData } from './types';
import { progressLabels } from './types';

export function Workspace() {
  const { projectId } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = params.get('view') ?? 'plan';
  const data = useQuery(api.projects.workspace, { projectId: projectId as Id<'projects'> });
  const retry = useMutation(api.projects.retry);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState(false);
  if (!data)
    return (
      <main id="main" className="workspace-loading section-width">
        <span className="eyebrow">YOUR PROJECT WORKSPACE</span>
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-copy" />
        <div className="skeleton skeleton-panel" />
      </main>
    );
  const { project, requirements, questions, run } = data;
  const running = ['queued', 'researching', 'refining'].includes(project.state);
  const activeQuestions = questions.filter((q) => !q.answer && q.runId === run?._id);
  const selected = requirements.find((r) => r._id === selectedId) ?? null;
  const done = requirements.filter(
    (r) => r.progress === 'done' && r.applicability !== 'not_applicable',
  ).length;
  const total = requirements.filter((r) => r.applicability !== 'not_applicable').length;
  return (
    <main id="main" className="workspace section-width">
      <div className="workspace-breadcrumb">
        <Link to="/workspace">
          <ArrowLeft size={14} /> All projects
        </Link>
        <span>/</span>
        <span>Your workspace</span>
      </div>
      {project.fixture && (
        <div className="fixture-banner">
          <span className="small-dot" />
          <strong>Local development</strong>
          <span>
            Sources and AI responses are synthetic fixtures. Live research connects after API keys
            are added.
          </span>
        </div>
      )}
      <header className="project-heading">
        <div>
          <div className="project-location">
            <MapPin size={14} />
            {project.location || 'Finding your starting point'}
          </div>
          <h1>{project.title}</h1>
          <p>{project.description}</p>
        </div>
        <div className="project-progress">
          <div
            className="progress-circle"
            style={{ '--progress': `${total ? (done / total) * 100 : 0}%` } as React.CSSProperties}
          >
            <Leaf size={23} strokeWidth={1.4} />
          </div>
          <div>
            <strong>
              {done} of {total} steps
            </strong>
            <span>
              {done && done === total
                ? 'Your recorded tasks are complete'
                : 'One good step at a time'}
            </span>
          </div>
        </div>
      </header>
      <div className="workspace-nav">
        <nav aria-label="Project views">
          {[
            { key: 'plan', label: 'Your plan', Icon: ListChecks },
            { key: 'timeline', label: 'Timeline', Icon: Route },
            { key: 'inbox', label: 'Inbox', Icon: Mail },
          ].map(({ key, label, Icon }) => (
            <button
              key={key}
              className={cn('view-tab', tab === key && 'active')}
              aria-current={tab === key ? 'page' : undefined}
              onClick={() => setParams(key === 'plan' ? {} : { view: key })}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </nav>
        <span className="live-label">
          <span className="small-dot" /> Saved as you go
        </span>
      </div>
      {running && (
        <section className="research-status" role="status" aria-live="polite">
          <span className="research-symbol">
            <Search size={20} />
          </span>
          <div>
            <strong>{run?.stage ?? 'Starting your research'}</strong>
            <p>
              {data.sources.length
                ? `${data.sources.length} sources read. Your plan is taking shape below.`
                : 'Looking for the public guidance that matters to your project.'}
            </p>
          </div>
          <LoaderCircle size={19} className="spin" />
        </section>
      )}
      {run?.error && !running && (
        <div className="research-error" role="alert">
          <CircleHelp size={18} />
          <div>
            <strong>There’s more to uncover.</strong>
            <p>{run.error}</p>
          </div>
          <Button
            variant="secondary"
            size="small"
            disabled={retrying}
            onClick={async () => {
              setRetrying(true);
              try {
                await retry({ projectId: project._id });
              } catch (err) {
                setError(errorMessage(err));
              } finally {
                setRetrying(false);
              }
            }}
          >
            <RefreshCw size={14} />
            Retry
          </Button>
        </div>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {activeQuestions.length > 0 && !running && (
        <div className="questions-section">
          {activeQuestions.map((q) => (
            <QuestionCard key={q._id} question={q} />
          ))}
        </div>
      )}
      {tab === 'timeline' ? (
        <Timeline rows={requirements} onSelect={setSelectedId} />
      ) : tab === 'inbox' ? (
        <InboxView project={project} />
      ) : (
        <Plan data={data} onSelect={setSelectedId} running={running} />
      )}
      <footer className="workspace-footer">
        <Leaf size={14} />
        <span>Know what’s next. See where it came from.</span>
        <span>groundwork.</span>
      </footer>
      <EvidenceDrawer row={selected} onClose={() => setSelectedId(null)} />
    </main>
  );
}

function Plan({
  data,
  onSelect,
  running,
}: {
  data: WorkspaceData;
  onSelect: (id: string) => void;
  running: boolean;
}) {
  const rows = orderRequirements(data.requirements).ordered;
  const required = rows.filter((r) => r.applicability === 'required');
  const groups = [
    {
      label: 'Start here',
      note: 'Lay the foundations.',
      rows: required.filter((r) => !r.prerequisites.length),
    },
    {
      label: 'Then, keep moving',
      note: 'The steps that build on your progress.',
      rows: required.filter((r) => r.prerequisites.length),
    },
    {
      label: 'A little more checking',
      note: 'We’ll keep the unknowns visible.',
      rows: rows.filter(
        (r) => r.applicability === 'needs_verification' || r.applicability === 'checking',
      ),
    },
  ];
  const next = required.find((r) => r.progress !== 'done');
  return (
    <div className="plan-layout">
      <div className="plan-main">
        <section className="plan-intro">
          <span className="eyebrow">THE WAY FORWARD</span>
          <h2>{rows.length ? 'A clearer path from here.' : 'Every good plan starts somewhere.'}</h2>
          <p>
            {data.project.summary ||
              'We’re finding the requirements and connecting the steps. Your findings will appear here as the research progresses.'}
          </p>
        </section>
        {next && (
          <button className="next-step" onClick={() => onSelect(next._id)}>
            <span className="next-step-icon">
              <ArrowUpRight size={21} />
            </span>
            <div>
              <span className="eyebrow">YOUR NEXT GOOD MOVE</span>
              <h3>{next.title}</h3>
              <p>{next.nextAction}</p>
            </div>
            <ArrowUpRight size={19} />
          </button>
        )}
        {groups.map(
          (group) =>
            group.rows.length > 0 && (
              <section className="requirement-group" key={group.label}>
                <div className="group-heading">
                  <h3>
                    {group.label}
                    <span>{group.rows.length}</span>
                  </h3>
                  <p>{group.note}</p>
                </div>
                <div className="requirement-list">
                  {group.rows.map((row, i) => (
                    <RequirementRow
                      key={row._id}
                      row={row}
                      index={i}
                      onSelect={() => onSelect(row._id)}
                    />
                  ))}
                </div>
              </section>
            ),
        )}
        {rows.some((r) => r.applicability === 'not_applicable') && (
          <details className="not-applicable">
            <summary>
              <Check size={16} /> A few things you don’t need to do{' '}
              <span>{rows.filter((r) => r.applicability === 'not_applicable').length}</span>
              <ChevronDown size={15} />
            </summary>
            {rows
              .filter((r) => r.applicability === 'not_applicable')
              .map((row) => (
                <button key={row._id} onClick={() => onSelect(row._id)}>
                  <span>{row.title}</span>
                  <span>
                    See why <ChevronRight size={14} />
                  </span>
                </button>
              ))}
          </details>
        )}
        {!rows.length && (
          <div className="empty-plan">
            <div className="empty-plan-lines">
              <span />
              <span />
              <span />
            </div>
            <p>
              {running
                ? 'Making sense of the details…'
                : 'Your requirements will appear here once research completes.'}
            </p>
          </div>
        )}
        {data.questions.some((q) => q.answer) && (
          <details className="answered-questions">
            <summary>
              Your project details <ChevronDown size={15} />
            </summary>
            {data.questions
              .filter((q) => q.answer)
              .map((q) =>
                running ? (
                  <p key={q._id}>
                    {q.text} — {q.answer}
                  </p>
                ) : (
                  <QuestionCard key={`${q._id}:${q.answer}`} question={q} editable />
                ),
              )}
          </details>
        )}
      </div>
      <aside className="plan-aside">
        <section className="coverage-card">
          <div className="aside-heading">
            <BookOpen size={17} />
            <h3>Behind your plan</h3>
          </div>
          <p className="aside-intro">A little transparency goes a long way.</p>
          <div className="coverage-count">
            <strong>{data.sources.length}</strong>
            <span>
              sources
              <br />
              examined
            </span>
            <span className="coverage-badge">
              <Check size={20} />
            </span>
          </div>
          {data.project.checked.length > 0 && (
            <div className="coverage-areas">
              <span className="eyebrow">AREAS CHECKED</span>
              {data.project.checked.map((area) => (
                <div key={area}>
                  <Check size={13} />
                  <span>{area}</span>
                </div>
              ))}
            </div>
          )}
          {data.project.gaps.length > 0 && (
            <details className="coverage-gaps" open>
              <summary>
                <CircleHelp size={15} /> Still unclear <ChevronDown size={14} />
              </summary>
              {data.project.gaps.map((gap) => (
                <p key={gap}>{gap}</p>
              ))}
            </details>
          )}
          {data.sources.length > 0 && (
            <details className="source-list">
              <summary>
                Explore the sources <ArrowUpRight size={14} />
              </summary>
              {data.sources.map((source) => (
                <a key={source._id} href={source.url} target="_blank" rel="noopener noreferrer">
                  <span>{source.authority || source.title}</span>
                  <ArrowUpRight size={13} />
                </a>
              ))}
            </details>
          )}
        </section>
        <div className="aside-note">
          <span className="note-spark">✳</span>
          <p>A starting point you can see through.</p>
          <small>
            Public guidance can have gaps. We’ll show what we found and what still needs a
            conversation with the authority.
          </small>
        </div>
        {data.activity.length > 0 && (
          <section className="activity-card">
            <span className="eyebrow">ALONG THE WAY</span>
            {data.activity.slice(0, 4).map((item) => (
              <div key={item._id}>
                <span className="activity-dot" />
                <p>{item.text}</p>
              </div>
            ))}
          </section>
        )}
      </aside>
    </div>
  );
}
function RequirementRow({
  row,
  index,
  onSelect,
}: {
  row: Requirement;
  index: number;
  onSelect: () => void;
}) {
  const uncertain = row.applicability !== 'required';
  return (
    <button
      className={cn('requirement-row', row.progress === 'done' && 'is-done')}
      onClick={onSelect}
    >
      <span className={cn('requirement-number', uncertain && 'uncertain-number')}>
        {row.progress === 'done' ? (
          <Check size={16} />
        ) : uncertain ? (
          <CircleHelp size={17} />
        ) : (
          String(index + 1).padStart(2, '0')
        )}
      </span>
      <div className="requirement-copy">
        <span className="requirement-authority">{row.authority}</span>
        <h4>{row.title}</h4>
        <p>{row.nextAction}</p>
        {row.tasks.length > 0 && (
          <small className="task-preview">
            <Mail size={12} />
            {row.tasks.length} preparation tasks from correspondence
          </small>
        )}
      </div>
      <span
        className={cn(
          'status-pill',
          uncertain
            ? 'uncertain'
            : row.progress === 'done'
              ? 'positive'
              : row.progress === 'scheduled'
                ? 'scheduled'
                : 'neutral',
        )}
      >
        {uncertain ? 'Needs checking' : progressLabels[row.progress]}
      </span>
      <ChevronRight size={17} />
    </button>
  );
}
