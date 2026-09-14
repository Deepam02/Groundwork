import { useEffect, useState } from 'react';
import { useConvexAuth } from 'convex/react';
import {
  useSignUpWithPassword,
  useSignInWithPassword,
} from '@convex-dev/auth/providers/password/react';
import { api } from '../../../convex/_generated/api';
import { Modal } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { ArrowUpRight, LockKeyhole, LoaderCircle } from 'lucide-react';

export function AuthDialog({
  open,
  onClose,
  onSuccess,
  initialMode = 'signup',
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialMode?: 'signup' | 'signin';
}) {
  const [signup, setSignup] = useState(initialMode === 'signup');
  const { isAuthenticated } = useConvexAuth();
  const [sessionReady, setSessionReady] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { signUp, pending: signingUp } = useSignUpWithPassword(api.auth.signUpWithPassword);
  const { signIn, pending: signingIn } = useSignInWithPassword(api.auth.signInWithPassword);
  const pending = signingUp || signingIn || (sessionReady && !isAuthenticated);
  useEffect(() => {
    if (open && sessionReady && isAuthenticated) onSuccess();
  }, [open, sessionReady, isAuthenticated, onSuccess]);
  return (
    <Modal
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
      title={signup ? 'Make room for your idea.' : 'Welcome back.'}
      description={
        signup
          ? 'Create an account to save your research and keep your project moving.'
          : 'Your next steps are right where you left them.'
      }
    >
      <form
        className="auth-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setError('');
          setSessionReady(false);
          try {
            const result = signup
              ? await signUp({ username: username.trim(), password })
              : await signIn({ username: username.trim(), password });
            if (result.success) {
              setPassword('');
              setSessionReady(true);
              return;
            }
            const code = result.userError.error;
            const errors: Record<string, string> = {
              USERNAME_TAKEN: 'That username is already taken. Try another, or log in.',
              USER_NOT_FOUND: 'No account found. Check your username or create an account.',
              INVALID_CREDENTIALS: 'Check your username and password.',
              PASSWORD_TOO_SHORT: 'Use a longer password (at least 10 characters).',
              PASSWORD_TOO_COMMON: 'Choose a less common password.',
              RATE_LIMITED: 'A few too many attempts. Please wait a moment and try again.',
              USERNAME_TOO_SHORT: 'Choose a username with at least 3 characters.',
              USERNAME_HAS_INVALID_CHARACTERS:
                'Use letters, numbers, or underscores in your username.',
            };
            setError(errors[code] ?? 'Please check your details and try again.');
          } catch {
            setError('We couldn’t connect. Please try again.');
          }
        }}
      >
        <label htmlFor="username">
          Username
          <input
            id="username"
            name="username"
            autoComplete="username"
            placeholder="Choose a username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            maxLength={64}
            disabled={pending}
          />
        </label>
        <label htmlFor="password">
          Password
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={signup ? 'new-password' : 'current-password'}
            placeholder={signup ? 'A little longer, a lot stronger' : 'Your password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={pending}
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <LoaderCircle className="spin" size={17} /> One moment
            </>
          ) : (
            <>
              {signup ? 'Create your account' : 'Log in'}
              <ArrowUpRight size={18} />
            </>
          )}
        </Button>
        <p className="auth-switch">
          {signup ? 'Already have an account?' : 'New to Groundwork?'}{' '}
          <button
            type="button"
            onClick={() => {
              setSignup(!signup);
              setError('');
            }}
          >
            {signup ? 'Log in' : 'Create an account'}
          </button>
        </p>
        <p className="auth-footnote">
          <LockKeyhole size={13} /> Your projects stay in your workspace.
        </p>
      </form>
    </Modal>
  );
}
