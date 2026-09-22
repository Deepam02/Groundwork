import { Activity, ArrowUpRight, Check, CircleHelp, ExternalLink } from 'lucide-react';
import type { Id } from '../../../convex/_generated/dataModel';
import { orderRequirements, sourceKindLabels, classifySource } from '../../../convex/lib/domain';
import { QuestionCard } from '../research/question-card';
import { hostOf, isConfirmed, type WorkspaceData } from './types';

/** Where the pane rests once research is done: what to do next, and what is still open. */
export function Overview({
  data,
  onSelect,
  onTrail,
}: {
  data: WorkspaceData;
  onSelect: (id: Id<'requirements'>) => void;
  onTrail: () => void;
}) {
  const confirmed = data.requirements.filter(isConfirmed);
  const steps = orderRequirements(confirmed.filter((row) => row.applicability === 'required'))
    .ordered;
  const next = steps.find((row) => row.progress !== 'done');
  const answered = data.questions.filter((question) => question.answer);
  const official = data.sources.filter((source) => source.official);

  return (
    <div className="overview">
      <header className="pane-head">
        <p className="pane-kicker">Your plan</p>
        <h2>{data.project.title}</h2>
        <p className="pane-lede">
          {data.project.summary ||
            'The steps confirmed against an official page appear on the left. Open any one to read the page it came from.'}
        </p>
      </header>

      {next && (
        <button className="overview-next" onClick={() => onSelect(next._id)}>
          <span>
            <span className="overview-kicker">Start here</span>
            <strong>{next.title}</strong>
            <small>{next.nextAction}</small>
          </span>
          <ArrowUpRight size={20} />
        </button>
      )}

      <div className="overview-stats">
        <div>
          <strong>{steps.length}</strong>
          <span>confirmed steps</span>
        </div>
        <div>
          <strong>{official.length}</strong>
          <span>official pages read</span>
        </div>
        <div>
          <strong>{data.project.gaps.length}</strong>
          <span>things still unclear</span>
        </div>
      </div>

      <button className="overview-trail" onClick={onTrail}>
        <Activity size={15} />
        See how this was researched
        <ArrowUpRight size={15} />
      </button>

      {data.project.checked.length > 0 && (
        <section className="detail-block">
          <h3>Areas checked</h3>
          <ul className="detail-list">
            {data.project.checked.map((area) => (
              <li key={area}>
                <Check size={14} />
                {area}
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.project.gaps.length > 0 && (
        <section className="detail-block">
          <h3>Still unclear</h3>
          <ul className="detail-list is-open">
            {data.project.gaps.map((gap) => (
              <li key={gap}>
                <CircleHelp size={14} />
                {gap}
              </li>
            ))}
          </ul>
        </section>
      )}

      {official.length > 0 && (
        <section className="detail-block">
          <h3>Sources</h3>
          <div className="overview-sources">
            {official.map((source) => (
              <a key={source._id} href={source.url} target="_blank" rel="noopener noreferrer">
                <span className="source-kind">
                  {sourceKindLabels[source.kind ?? classifySource(source.url, source.title)]}
                </span>
                <span className="source-title">{source.title}</span>
                <span className="source-host">
                  {hostOf(source.url)} <ExternalLink size={12} />
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      {answered.length > 0 && (
        <section className="detail-block">
          <h3>Your project details</h3>
          {answered.map((question) => (
            <QuestionCard key={`${question._id}:${question.answer}`} question={question} editable />
          ))}
        </section>
      )}
    </div>
  );
}
