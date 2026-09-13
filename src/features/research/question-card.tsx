import { useState } from 'react';
import { useMutation } from 'convex/react';
import { ArrowRight, CornerDownRight, LoaderCircle } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import type { Question } from '../plan/types';
import { Button } from '../../components/ui/button';
import { errorMessage } from '../../lib/utils';

export function QuestionCard({
  question,
  editable = false,
}: {
  question: Question;
  editable?: boolean;
}) {
  const answer = useMutation(api.research.answer);
  const [value, setValue] = useState(question.answer ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(text: string) {
    setBusy(true);
    setError('');
    try {
      await answer({ questionId: question._id, answer: text });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={`question-card ${editable ? 'question-edit' : ''}`}>
      <div className="question-kicker">
        <CornerDownRight size={16} />
        <span>{editable ? 'YOUR PROJECT DETAILS' : 'ONE DETAIL MAKES A DIFFERENCE'}</span>
      </div>
      <h3>{question.text}</h3>
      <p>{question.reason}</p>
      {question.options.length > 0 && (
        <div className="question-options">
          {question.options.map((option) => (
            <button
              key={option}
              className={question.answer === option ? 'selected' : ''}
              disabled={busy}
              onClick={() => void submit(option)}
            >
              {option}
              <ArrowRight size={14} />
            </button>
          ))}
        </div>
      )}
      <form
        className="question-input"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(value);
        }}
      >
        <label className="sr-only" htmlFor={`answer-${question._id}`}>
          Your answer
        </label>
        <input
          id={`answer-${question._id}`}
          placeholder={
            question.options.length
              ? 'Or add a little more detail…'
              : 'City, country, and anything else we should know…'
          }
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={500}
          required
          disabled={busy}
        />
        <Button size="small" variant="secondary" type="submit" disabled={busy || !value.trim()}>
          {busy ? <LoaderCircle size={16} className="spin" /> : <ArrowRight size={16} />}
          <span className="sr-only">Save answer</span>
        </Button>
      </form>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
