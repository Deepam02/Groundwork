import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import { ArrowLeft, Mail, RefreshCw, TriangleAlert } from 'lucide-react';
import type { Id } from '../../../convex/_generated/dataModel';
import { api } from '../../../convex/_generated/api';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/dialog';
import { errorMessage } from '../../lib/utils';
import { QuestionCard } from '../research/question-card';
import { InboxView } from '../inbox/inbox-view';
import { StepRail } from './step-rail';
import { ResearchTrail } from './research-trail';
import { StepDetail } from './step-detail';
import { Overview } from './overview';
import { runningStates } from './types';

/**
 * One shell for the whole life of a project. The rail fills in as steps are
 * confirmed and the right pane moves from watching the research happen to
 * reading the page that proved a step — without the layout ever changing shape.
 */
export function Workspace() {
  const { projectId } = useParams();
  const data = useQuery(api.projects.workspace, { projectId: projectId as Id<'projects'> });
  const events = useQuery(api.trail.forProject, { projectId: projectId as Id<'projects'> });
  const retry = useMutation(api.projects.retry);
  const [selectedId, setSelectedId] = useState<Id<'requirements'> | null>(null);
  const [pinnedTrail, setPinnedTrail] = useState(false);
  const [mailOpen, setMailOpen] = useState(false);
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState(false);

  // While research runs the trail is the pane by default; pinning only matters
  // for going back to it after the fact.
  const running = data ? runningStates.includes(data.project.state) : false;

  if (!data)
    return (
      <main id="main" className="workspace-loading">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-copy" />
        <div className="skeleton skeleton-panel" />
      </main>
    );

  const { project, requirements, questions, run } = data;
  const question = questions.find((item) => !item.answer && item.runId === run?._id) ?? null;
  const selected = requirements.find((row) => row._id === selectedId) ?? null;
  const pane = question
    ? 'question'
    : selected
      ? 'step'
      : running || pinnedTrail
        ? 'trail'
        : 'overview';

  function openStep(id: Id<'requirements'>) {
    setSelectedId(id);
    setPinnedTrail(false);
  }
  function openTrail() {
    setSelectedId(null);
    setPinnedTrail(true);
  }
  function openOverview() {
    setSelectedId(null);
    setPinnedTrail(false);
  }

  return (
    <main id="main" className="workspace" data-detail={pane === 'overview' ? 'home' : 'open'}>
      <header className="project-bar">
        <Link className="project-back" to="/workspace" aria-label="All projects">
          <ArrowLeft size={16} />
        </Link>
        <div className="project-identity">
          <h1>{project.title}</h1>
          <p>{project.location || 'Finding your starting point'}</p>
        </div>
        <StatusChip state={project.state} stage={run?.stage ?? ''} />
        {project.fixture && <span className="fixture-chip">Fixture data</span>}
        <button className="mail-button" onClick={() => setMailOpen(true)}>
          <Mail size={15} />
          Mail
        </button>
      </header>

      {run?.error && !running && (
        <div className="run-error" role="alert">
          <TriangleAlert size={17} />
          <p>{run.error}</p>
          <Button
            variant="secondary"
            size="small"
            disabled={retrying}
            onClick={async () => {
              setRetrying(true);
              setError('');
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
            Try again
          </Button>
        </div>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="workspace-shell">
        <StepRail
          data={data}
          running={running}
          selectedId={selectedId}
          trailActive={pane === 'trail'}
          overviewActive={pane === 'overview'}
          eventCount={events?.length ?? 0}
          onSelect={openStep}
          onTrail={openTrail}
          onOverview={openOverview}
        />
        <section className="workspace-pane" aria-live="off">
          {pane === 'question' && question ? (
            <div className="pane-question">
              <QuestionCard question={question} />
            </div>
          ) : pane === 'step' && selected ? (
            <StepDetail
              key={selected._id}
              row={selected}
              rows={requirements}
              projectId={project._id}
              onBack={openOverview}
              onSelect={openStep}
            />
          ) : pane === 'trail' ? (
            <ResearchTrail events={events} running={running} stage={run?.stage ?? ''} />
          ) : (
            <Overview data={data} onSelect={openStep} onTrail={openTrail} />
          )}
        </section>
      </div>

      <Modal
        open={mailOpen}
        onOpenChange={setMailOpen}
        title="Forwarded correspondence"
        description="Mail you forward is matched to this project and turned into dated tasks."
      >
        <InboxView project={project} />
      </Modal>
    </main>
  );
}

function StatusChip({ state, stage }: { state: string; stage: string }) {
  const running = runningStates.includes(state);
  const label = running
    ? stage || 'Researching'
    : state === 'needs_answer'
      ? 'Waiting on you'
      : state === 'ready'
        ? 'Plan ready'
        : state === 'partial'
          ? 'Plan ready, with gaps'
          : 'Research paused';
  return (
    <span className={`status-chip ${running ? 'is-live' : `is-${state}`}`}>
      {running && <span className="pulse" aria-hidden="true" />}
      {label}
    </span>
  );
}
