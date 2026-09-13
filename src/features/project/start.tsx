import { useState } from 'react';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  MapPin,
  LoaderCircle,
  MoveUpRight,
  Search,
  Route,
  Mail,
} from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { Button } from '../../components/ui/button';
import { Illustration } from './illustration';
import { errorMessage } from '../../lib/utils';

const examples = [
  'A neighbourhood café in Dublin, Ireland',
  'Converting a garage in Melbourne, Australia',
  'A ceramics studio in Toronto, Canada',
];
export function Start({ askSignIn }: { askSignIn: () => void }) {
  const { isAuthenticated } = useConvexAuth();
  const [description, setDescription] = useState(
    () => sessionStorage.getItem('groundwork-draft') ?? '',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const create = useMutation(api.projects.create);
  const navigate = useNavigate();
  const projects = useQuery(api.projects.list, isAuthenticated ? {} : 'skip');
  return (
    <main id="main">
      <section className="hero section-width">
        <div className="hero-copy">
          <div className="intro-label">
            <span className="small-dot" /> FROM IDEA TO APPROVED
          </div>
          <h1>
            Big ideas.
            <br />
            Clear <em>next steps.</em>
          </h1>
          <p className="hero-description">
            Your next chapter shouldn’t start with a hundred open tabs. Turn the rules, permits, and
            paperwork into a path you can actually follow.
          </p>
          <form
            className="project-composer"
            onSubmit={async (e) => {
              e.preventDefault();
              setError('');
              sessionStorage.setItem('groundwork-draft', description);
              if (!isAuthenticated) {
                askSignIn();
                return;
              }
              setBusy(true);
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
          >
            <label htmlFor="project-description">What are you planning?</label>
            <textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="I’m opening a small café in Dublin, with food prepared on-site…"
              rows={3}
              minLength={12}
              maxLength={2000}
              required
            />
            <div className="composer-bottom">
              <span>
                <MapPin size={14} /> Include your city & country
              </span>
              <Button type="submit" disabled={busy}>
                {busy ? (
                  <>
                    <LoaderCircle size={16} className="spin" /> Starting
                  </>
                ) : (
                  <>
                    Find my next steps <ArrowUpRight size={17} />
                  </>
                )}
              </Button>
            </div>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
          </form>
          <div className="example-row">
            <span>A little inspiration</span>
            {examples.map((example, i) => (
              <button
                key={example}
                onClick={() => {
                  setDescription(example);
                  document.getElementById('project-description')?.focus();
                }}
              >
                {['Open a café', 'Reimagine a space', 'Start a studio'][i]}
                <MoveUpRight size={12} />
              </button>
            ))}
          </div>
        </div>
        <Illustration />
      </section>
      {projects && projects.length > 0 && (
        <section className="saved-projects section-width">
          <div className="section-label">
            <span className="eyebrow">PICK UP WHERE YOU LEFT OFF</span>
            <span>
              {projects.length} {projects.length === 1 ? 'project' : 'projects'}
            </span>
          </div>
          <div className="project-grid">
            {projects.map((project) => (
              <Link key={project._id} to={`/project/${project._id}`} className="saved-project">
                <span className="saved-icon">
                  <Route size={20} />
                </span>
                <div>
                  <h3>{project.title}</h3>
                  <p>
                    <MapPin size={12} />
                    {project.location || 'Finding your starting point'}
                  </p>
                </div>
                <ArrowUpRight size={18} />
              </Link>
            ))}
          </div>
        </section>
      )}
      <section id="how-it-works" className="how-section section-width">
        <div className="how-heading">
          <span className="eyebrow">A LITTLE LESS OVERWHELM</span>
          <h2>
            From “where do I start?”
            <br />
            to <em>“I’ve got this.”</em>
          </h2>
          <p>
            The information is out there.
            <br />
            We help you connect it.
          </p>
        </div>
        <div className="how-steps">
          {[
            [
              Search,
              '01',
              'We do the digging.',
              'Describe your project, anywhere. We discover the relevant authorities and read their guidance.',
            ],
            [
              Route,
              '02',
              'You see the way forward.',
              'Get a clear plan, the questions that matter, and the official sources behind each step.',
            ],
            [
              Mail,
              '03',
              'Your plan keeps up.',
              'Forward a notice or an inspection email. Your next steps evolve as your project does.',
            ],
          ].map(([Icon, number, title, body]) => {
            const StepIcon = Icon as typeof Search;
            return (
              <div className="how-step" key={String(number)}>
                <div className="how-step-top">
                  <span>{String(number)}</span>
                  <StepIcon size={23} />
                </div>
                <h3>{String(title)}</h3>
                <p>{String(body)}</p>
              </div>
            );
          })}
        </div>
      </section>
      <section className="closing-note section-width">
        <span className="small-dot" />
        <p>
          Built for your idea. <strong>Wherever it takes root.</strong>
        </p>
        <a href="#project-description" aria-label="Start your project">
          <ArrowRight size={22} />
        </a>
      </section>
      <footer className="site-footer section-width">
        <span>
          groundwork. <span className="footer-muted">A clearer path to getting started.</span>
        </span>
        <span>Sources first. Uncertainty made visible.</span>
      </footer>
    </main>
  );
}
