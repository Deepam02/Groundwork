import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import { ArrowLeft, ArrowUpRight, FolderOpen, MapPin, Plus, Route } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { Button } from '../../components/ui/button';
import { ProjectComposer } from './project-composer';
import { errorMessage } from '../../lib/utils';
import './workspace-home.css';

const states = {
  queued: 'Getting started',
  researching: 'Researching',
  needs_answer: 'Your answer needed',
  refining: 'Refining your plan',
  ready: 'Plan ready',
  partial: 'Findings ready',
  failed: 'Research paused',
};

export function WorkspaceHome() {
  const projects = useQuery(api.projects.list);
  return (
    <main id="main" className="workspace-home section-width">
      <header className="workspace-home-heading">
        <div>
          <span className="eyebrow">YOUR WORKSPACE</span>
          <h1>
            Your ideas, <em>in motion.</em>
          </h1>
          <p>A place for your plans, your progress, and whatever comes next.</p>
        </div>
        <Button asChild>
          <Link to="/workspace/new">
            <Plus size={17} />
            Start a project
          </Link>
        </Button>
      </header>
      {projects === undefined ? (
        <div role="status" aria-label="Loading projects" className="project-list-skeleton">
          <div className="skeleton skeleton-panel" />
        </div>
      ) : projects.length > 0 ? (
        <section className="workspace-projects" aria-label="Your projects">
          <div className="section-label">
            <h2 className="eyebrow">PICK UP WHERE YOU LEFT OFF</h2>
            <span>
              {projects.length} {projects.length === 1 ? 'project' : 'projects'}
            </span>
          </div>
          <div className="workspace-project-list">
            {projects.map((project) => (
              <Link
                key={project._id}
                to={`/project/${project._id}`}
                className="workspace-project-row"
              >
                <span className="saved-icon">
                  <Route size={21} />
                </span>
                <div className="workspace-project-copy">
                  <h3>{project.title}</h3>
                  <p>
                    <MapPin size={13} />
                    {project.location || 'Finding your starting point'}
                  </p>
                </div>
                <span className="workspace-project-state">
                  <span className="small-dot" />
                  {states[project.state]}
                </span>
                <ArrowUpRight size={18} />
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className="workspace-empty">
          <span className="workspace-empty-icon">
            <FolderOpen size={34} strokeWidth={1.3} />
          </span>
          <span className="eyebrow">ROOM FOR YOUR NEXT CHAPTER</span>
          <h2>Every plan starts with an idea.</h2>
          <p>
            Opening a business? Making a space your own?
            <br />
            Tell us what and where. We’ll help you find the steps.
          </p>
          <Button asChild variant="secondary">
            <Link to="/workspace/new">
              Create your first project
              <ArrowUpRight size={16} />
            </Link>
          </Button>
        </section>
      )}
      <p className="workspace-home-note">Your projects are saved here as you go.</p>
    </main>
  );
}

export function NewProject() {
  const create = useMutation(api.projects.create);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [draft] = useState(() => sessionStorage.getItem('groundwork-draft') ?? '');
  return (
    <main id="main" className="new-project-page section-width">
      <Link className="back-to-workspace" to="/workspace">
        <ArrowLeft size={15} />
        Your workspace
      </Link>
      <div className="new-project-layout">
        <div className="new-project-intro">
          <span className="eyebrow">A NEW BEGINNING</span>
          <h1>
            Let’s give your idea
            <br />
            <em>a way forward.</em>
          </h1>
          <p>
            Describe what you want to do and where. Groundwork will look for the relevant
            authorities, public guidance, and questions worth asking.
          </p>
          <div className="new-project-note">
            <span className="small-dot" />
            You don’t need to know which permits to ask for.
          </div>
        </div>
        <ProjectComposer
          initialValue={draft}
          busy={busy}
          error={error}
          onSubmit={async (description) => {
            setBusy(true);
            setError('');
            sessionStorage.setItem('groundwork-draft', description);
            try {
              const id = await create({ description, requestId: crypto.randomUUID() });
              sessionStorage.removeItem('groundwork-draft');
              navigate(`/project/${id}`);
            } catch (err) {
              setError(errorMessage(err));
            } finally {
              setBusy(false);
            }
          }}
        />
      </div>
    </main>
  );
}
