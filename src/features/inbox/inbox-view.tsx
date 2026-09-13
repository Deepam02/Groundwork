import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import {
  Mail,
  ArrowUpRight,
  Copy,
  Check,
  ChevronDown,
  FileText,
  Link2,
  LoaderCircle,
} from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import { Button } from '../../components/ui/button';
import { errorMessage } from '../../lib/utils';

export function InboxView({ project }: { project: Doc<'projects'> }) {
  const user = useQuery(api.users.current);
  const messages = useQuery(api.inbox.list, { projectId: project._id });
  const projects = useQuery(api.projects.list);
  const connect = useMutation(api.users.connectEmail);
  const sample = useMutation(api.development.sampleNotice);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setError('Copy didn’t work. Select the address and copy it manually.');
    }
  }
  return (
    <div className="inbox-view">
      <div className="view-intro">
        <span className="eyebrow">A PLAN THAT KEEPS UP</span>
        <h2>Good to hear. Better to act.</h2>
        <p>Forward the paperwork. We’ll help you see what changes.</p>
      </div>
      <section className="forwarding-card">
        <span className="forwarding-icon">
          <Mail size={25} />
        </span>
        <div>
          <h3>Your correspondence, connected.</h3>
          {user?.email && !user.code && !editingEmail ? (
            <>
              <p>
                Forward from <strong>{user.email}</strong> to your shared project inbox.
              </p>
              <div className="address-line">
                <code>{user.inbox ?? 'Inbox connects when AgentMail is configured'}</code>
                {user.inbox && (
                  <button
                    className="icon-button"
                    aria-label="Copy forwarding address"
                    onClick={() => void copy(user.inbox!)}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                )}
              </div>
              <p className="small-copy">
                Add <strong>[GW-{project.forwardingTag}]</strong> to the subject to send it straight
                to this project.
              </p>
              <Button
                variant="ghost"
                size="small"
                onClick={() => {
                  setEmail(user.email!);
                  setEditingEmail(true);
                }}
              >
                Change forwarding address
              </Button>
            </>
          ) : (
            <>
              <p>
                Connect the email you forward from. One inbox keeps every project in its own place.
              </p>
              {user?.code && !editingEmail ? (
                <div className="connect-instructions">
                  <p>
                    Send an email from <strong>{user.pendingEmail}</strong> to{' '}
                    <strong>{user.inbox ?? 'your AgentMail inbox (not configured yet)'}</strong>{' '}
                    with this exact subject:
                  </p>
                  <code>GW-CONNECT-{user.code}</code>
                  <p className="small-copy">
                    Valid for one hour. This page updates when your email connects.
                  </p>
                  <Button
                    variant="ghost"
                    size="small"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      setError('');
                      try {
                        await connect({ email: user.pendingEmail! });
                      } catch (err) {
                        setError(errorMessage(err));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Get a new code
                  </Button>
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => {
                      setEmail(user.pendingEmail ?? '');
                      setEditingEmail(true);
                    }}
                  >
                    Use a different address
                  </Button>
                </div>
              ) : (
                <form
                  className="connect-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    setError('');
                    try {
                      await connect({ email });
                      setEditingEmail(false);
                    } catch (err) {
                      setError(errorMessage(err));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <label className="sr-only" htmlFor="forward-email">
                    Your forwarding email
                  </label>
                  <input
                    id="forward-email"
                    type="email"
                    placeholder="Your forwarding email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <Button type="submit" variant="secondary" size="small" disabled={busy}>
                    {busy ? (
                      <LoaderCircle size={16} className="spin" />
                    ) : (
                      <>
                        <Link2 size={14} /> Connect
                      </>
                    )}
                  </Button>
                </form>
              )}
            </>
          )}
        </div>
      </section>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {project.fixture && (
        <div className="fixture-mail-control">
          <p>Local development · simulate an incoming inspection notice.</p>
          <Button
            variant="secondary"
            size="small"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await sample({ projectId: project._id });
              } catch (err) {
                setError(errorMessage(err));
              } finally {
                setBusy(false);
              }
            }}
          >
            Add sample notice <ArrowUpRight size={15} />
          </Button>
        </div>
      )}
      <div className="section-label inbox-list-heading">
        <span className="eyebrow">CORRESPONDENCE</span>
        <span>{messages?.length ?? 0} messages</span>
      </div>
      {messages === undefined ? (
        <p className="loading-copy">Opening your inbox…</p>
      ) : messages.length ? (
        <div className="message-list">
          {messages.map((message) => (
            <Message key={message._id} message={message} projects={projects ?? []} />
          ))}
        </div>
      ) : (
        <div className="empty-panel inbox-empty">
          <div className="empty-envelope">
            <Mail size={30} strokeWidth={1.25} />
          </div>
          <h3>Your next update starts here.</h3>
          <p>
            An inspection date. A requested document. A new condition.
            <br />
            Forward a notice and we’ll connect it to your next steps.
          </p>
          <div className="empty-tags">
            <span>Inspection notices</span>
            <span>Approval updates</span>
            <span>Document requests</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Message({
  message,
  projects,
}: {
  message: Doc<'mailMessages'>;
  projects: Doc<'projects'>[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const assign = useMutation(api.inbox.assign);
  const confirm = useMutation(api.inbox.confirm);
  return (
    <article className="message">
      <button className="message-heading" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="message-icon">
          <Mail size={19} />
        </span>
        <div>
          <h3>{message.subject}</h3>
          <p>
            {message.summary ||
              (message.state === 'unassigned'
                ? 'Choose a project for this message.'
                : 'Reading your correspondence…')}
          </p>
        </div>
        <span className={`status-pill ${message.state === 'applied' ? 'positive' : 'neutral'}`}>
          {message.state === 'applied'
            ? 'Plan updated'
            : message.state === 'review'
              ? 'Review changes'
              : message.state === 'processing'
                ? 'Reading'
                : message.state === 'failed'
                  ? 'Needs retry'
                  : 'Choose project'}
        </span>
        <ChevronDown size={16} className={open ? 'rotated' : ''} />
      </button>
      {(open ||
        message.state === 'unassigned' ||
        message.state === 'review' ||
        message.state === 'failed') && (
        <div className="message-body">
          {message.state === 'unassigned' && (
            <label className="assign-label">
              Which project is this for?
              <select
                value=""
                disabled={busy}
                onChange={async (e) => {
                  if (!e.target.value) return;
                  setBusy(true);
                  try {
                    await assign({
                      messageId: message._id,
                      projectId: e.target.value as Id<'projects'>,
                    });
                  } catch (err) {
                    setError(errorMessage(err));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <option value="">Choose a project</option>
                {projects.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          {message.changes.map((change, index) => (
            <div className="mail-change" key={index}>
              <span className="eyebrow">
                {message.appliedIndexes.includes(index) ? 'ADDED TO YOUR PLAN' : 'PLEASE CONFIRM'}
              </span>
              <h4>
                {change.title}
                {change.date && <span> · {change.date}</span>}
              </h4>
              <ul>
                {change.tasks.map((task) => (
                  <li key={task}>
                    <Check size={14} />
                    {task}
                  </li>
                ))}
              </ul>
              {!message.appliedIndexes.includes(index) && (
                <Button
                  size="small"
                  variant="secondary"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await confirm({ messageId: message._id, index });
                    } catch (err) {
                      setError(errorMessage(err));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Apply this change <Check size={14} />
                </Button>
              )}
            </div>
          ))}
          {message.state === 'failed' && message.projectId && (
            <Button
              variant="secondary"
              size="small"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await assign({ messageId: message._id, projectId: message.projectId! });
                } catch (err) {
                  setError(errorMessage(err));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Retry processing
            </Button>
          )}
          <details className="original-mail">
            <summary>Read the original message</summary>
            <p>{message.text}</p>
            {message.attachments.map((name) => (
              <span className="attachment" key={name}>
                <FileText size={13} />
                {name}
              </span>
            ))}
          </details>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </article>
  );
}
