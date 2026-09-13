import { ArrowUpRight, Check, Leaf, MapPin, FileText, ArrowDown } from 'lucide-react';

export function Illustration() {
  return (
    <div
      className="hero-illustration"
      aria-label="Illustration of a project becoming a clear plan"
      role="img"
    >
      <div className="illustration-grid" />
      <span className="orbit orbit-one" />
      <span className="orbit orbit-two" />
      <div className="floating-location">
        <MapPin size={15} /> A place. An idea. A possibility.
      </div>
      <div className="paper paper-back" />
      <div className="paper paper-middle" />
      <div className="paper paper-front">
        <div className="paper-top">
          <span className="eyebrow">THE PATH AHEAD</span>
          <ArrowUpRight size={19} />
        </div>
        <h3>
          Your idea,
          <br />
          <em>taking shape.</em>
        </h3>
        <div className="paper-rule" />
        <div className="paper-step">
          <span className="paper-step-icon">
            <Check size={16} />
          </span>
          <div>
            <strong>Find the requirements</strong>
            <small>The right authorities, connected.</small>
          </div>
        </div>
        <div className="paper-connector" />
        <div className="paper-step">
          <span className="paper-step-icon">
            <FileText size={15} />
          </span>
          <div>
            <strong>Know your next move</strong>
            <small>Clear steps. Sources you can see.</small>
          </div>
        </div>
        <div className="paper-connector" />
        <div className="paper-step">
          <span className="paper-step-icon last">
            <ArrowUpRight size={16} />
          </span>
          <div>
            <strong>Keep moving forward</strong>
            <small>A plan that grows with you.</small>
          </div>
        </div>
        <div className="paper-bottom">
          <span className="small-dot" /> ONE STEP CLOSER <Leaf size={15} />
        </div>
      </div>
      <div className="idea-stamp">
        <Leaf size={23} />
        <span>
          Good things
          <br />
          start here.
        </span>
      </div>
      <div className="illustration-caption">
        <ArrowDown size={17} />
        <span>Less searching. More starting.</span>
      </div>
    </div>
  );
}
