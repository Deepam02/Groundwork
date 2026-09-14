import { ArrowRight, ArrowUpRight, Search, Route, Mail } from 'lucide-react';
import { Illustration } from '../project/illustration';
import { ProjectComposer } from '../project/project-composer';
import { ProductPreview } from './product-preview';
import './marketing.css';

const steps = [
  {
    Icon: Search,
    title: 'We do the digging.',
    body: 'Describe your project, anywhere. We discover the relevant authorities and read their public guidance.',
  },
  {
    Icon: Route,
    title: 'You see the way forward.',
    body: 'Get the next steps, the questions that matter, and the sources behind each finding.',
  },
  {
    Icon: Mail,
    title: 'Your plan keeps up.',
    body: 'Forward a notice or an inspection email. See the dates, tasks, and changes in your workspace.',
  },
];

export function Landing({ onStart }: { onStart: () => void }) {
  return (
    <main id="main" className="marketing-page">
      <section className="hero section-width">
        <div className="hero-copy">
          <div className="intro-label">
            <span className="small-dot" />
            FROM IDEA TO APPROVED
          </div>
          <h1>
            Big ideas.
            <br />
            Clear <em>next steps.</em>
          </h1>
          <p className="hero-description">
            Opening a café, renovating a home, or starting a studio? Find the permits, approvals,
            and paperwork between your idea and getting started.
          </p>
          <ProjectComposer
            marketing
            onSubmit={(description) => {
              sessionStorage.setItem('groundwork-draft', description);
              onStart();
            }}
          />
        </div>
        <Illustration />
      </section>
      <section id="how-it-works" className="how-section section-width">
        <div className="how-heading">
          <span className="eyebrow">YOUR PROJECT. NOT A HUNDRED OPEN TABS.</span>
          <h2>
            From “where do I start?”
            <br />
            to <em>“I’ve got this.”</em>
          </h2>
          <p>
            One starting point.{' '}
            <br />
            Wherever you’re starting.
          </p>
        </div>
        <div className="how-steps">
          {steps.map(({ Icon, title, body }, index) => (
            <div className="how-step" key={title}>
              <div className="how-step-top">
                <span>0{index + 1}</span>
                <Icon size={23} />
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </section>
      <ProductPreview />
      <section className="marketing-cta section-width">
        <div>
          <span className="eyebrow">YOUR NEXT CHAPTER STARTS SOMEWHERE</span>
          <h2>
            Let’s start with <em>your idea.</em>
          </h2>
          <p>A business, a building, a change of plans. Tell us what and where.</p>
        </div>
        <a className="button button-primary" href="#project-description">
          Find my starting point
          <ArrowUpRight size={18} />
        </a>
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
