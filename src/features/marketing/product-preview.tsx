import { useState } from 'react';
import { ArrowUpRight, BookOpen, Check, CircleHelp, FileText, Mail, MapPin } from 'lucide-react';

const views = [
  { id: 'plan', label: 'A clear plan', Icon: FileText },
  { id: 'sources', label: 'The sources', Icon: BookOpen },
  { id: 'updates', label: 'What changed', Icon: Mail },
] as const;

export function ProductPreview() {
  const [view, setView] = useState<(typeof views)[number]['id']>('plan');
  return (
    <section id="what-you-get" className="product-story section-width">
      <div className="product-story-copy">
        <span className="eyebrow">LESS PAPERWORK IN YOUR HEAD</span>
        <h2>
          Not just the rules.
          <br />
          <em>Your way through them.</em>
        </h2>
        <p>
          See what needs doing, why it matters, and where the information came from. When a notice
          arrives, see what changes.
        </p>
        <div
          className="product-view-buttons"
          role="group"
          aria-label="Explore an example workspace"
        >
          {views.map(({ id, label, Icon }) => (
            <button key={id} aria-pressed={view === id} onClick={() => setView(id)}>
              <Icon size={18} />
              <span>{label}</span>
              <ArrowUpRight size={16} />
            </button>
          ))}
        </div>
      </div>
      <div className="product-example">
        <div className="product-example-top">
          <span className="small-dot" />
          <span>AN EXAMPLE WORKSPACE</span>
          <span>Illustrative</span>
        </div>
        <div className="product-example-title">
          <span>
            <MapPin size={12} />
            Your neighbourhood, your next chapter
          </span>
          <h3>A café of your own.</h3>
        </div>
        <div className="product-example-body" aria-live="polite">
          {view === 'plan' && (
            <>
              <div className="example-section-heading">
                <h4>A few next steps</h4>
                <span>Built around your project</span>
              </div>
              {[
                [
                  '01',
                  'Confirm how the space can be used',
                  'Start with the relevant planning authority.',
                  'Start here',
                ],
                [
                  '02',
                  'Find the activity-specific requirements',
                  'Check which registrations and approvals apply.',
                  'Investigate',
                ],
                [
                  '03',
                  'Get ready for the next step',
                  'Keep the documents and dependencies together.',
                  'Prepare',
                ],
              ].map(([number, title, body, tag]) => (
                <div className="example-plan-row" key={number}>
                  <span>{number}</span>
                  <div>
                    <h5>{title}</h5>
                    <p>{body}</p>
                  </div>
                  <span>{tag}</span>
                </div>
              ))}
              <p className="example-footnote">
                <CircleHelp size={13} />
                Actual requirements depend on your project and location.
              </p>
            </>
          )}
          {view === 'sources' && (
            <>
              <div className="example-section-heading">
                <h4>See the thinking behind a step</h4>
                <BookOpen size={16} />
              </div>
              <div className="example-source">
                <span className="eyebrow">EVERY FINDING HAS A TRAIL</span>
                <h5>The authority. The page. The passage.</h5>
                <p>
                  Open a requirement to read the supporting text and follow its link to the original
                  guidance.
                </p>
                <div>
                  <Check size={15} />
                  Evidence you can inspect
                </div>
              </div>
              <p className="example-footnote">
                <CircleHelp size={13} />
                If the evidence is unclear, the plan says so.
              </p>
            </>
          )}
          {view === 'updates' && (
            <>
              <div className="example-section-heading">
                <h4>A notice becomes a next step</h4>
                <Mail size={16} />
              </div>
              <div className="example-incoming">
                <Mail size={20} />
                <div>
                  <span>FORWARDED CORRESPONDENCE</span>
                  <h5>Your inspection is scheduled</h5>
                  <p>“Please bring the requested documents.”</p>
                </div>
              </div>
              <div className="example-mail-change">
                <span className="eyebrow">WHAT CHANGES IN YOUR PLAN</span>
                <p>
                  <Check size={15} />
                  The inspection date, as written in the notice
                </p>
                <p>
                  <Check size={15} />
                  The preparation tasks, in one place
                </p>
              </div>
              <p className="example-footnote">An illustration of the flow, not an actual notice.</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
