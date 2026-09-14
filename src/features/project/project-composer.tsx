import { useRef, useState } from 'react';
import { ArrowUpRight, Coffee, House, Palette, MapPin, LoaderCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import './project-composer.css';

const starters = [
  { label: 'Open a café', description: 'I’m opening a small café in ', Icon: Coffee },
  { label: 'Renovate a space', description: 'I’m renovating a space in ', Icon: House },
  { label: 'Start a studio', description: 'I’m starting a studio in ', Icon: Palette },
];

export function ProjectComposer({
  onSubmit,
  busy = false,
  error,
  initialValue = '',
  marketing = false,
}: {
  onSubmit: (description: string) => void | Promise<void>;
  busy?: boolean;
  error?: string;
  initialValue?: string;
  marketing?: boolean;
}) {
  const [description, setDescription] = useState(initialValue);
  const input = useRef<HTMLTextAreaElement>(null);
  return (
    <form
      className="project-composer"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit(description.trim());
      }}
    >
      <div className="composer-heading">
        <label htmlFor="project-description">What are you planning?</label>
        <span>Start with your idea</span>
      </div>
      <div className="composer-quick-actions" aria-label="Project starters">
        {starters.map(({ label, description: starter, Icon }) => (
          <button
            key={label}
            type="button"
            disabled={busy}
            onClick={() => {
              setDescription(starter);
              input.current?.focus();
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>
      <textarea
        ref={input}
        id="project-description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Tell us what you want to do and where. For example, a 20-seat café in Dublin, Ireland…"
        rows={3}
        minLength={12}
        maxLength={2000}
        required
        disabled={busy}
        aria-describedby="project-hint"
      />
      <div className="composer-bottom">
        <span id="project-hint">
          <MapPin size={14} /> Your idea + city & country
        </span>
        <Button type="submit" disabled={busy}>
          {busy ? (
            <>
              <LoaderCircle size={16} className="spin" />
              Starting
            </>
          ) : (
            <>
              Find my next steps
              <ArrowUpRight size={17} />
            </>
          )}
        </Button>
      </div>
      {marketing && (
        <p className="composer-signin-note">
          Save your idea in a workspace. We’ll guide you from there.
        </p>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </form>
  );
}
