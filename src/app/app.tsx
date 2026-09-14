import { useState, type ReactNode } from 'react';
import { useAuthActions } from '@convex-dev/auth/react';
import { useConvexAuth } from 'convex/react';
import { Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, LogOut, Plus } from 'lucide-react';
import { Brand } from '../components/brand';
import { Button } from '../components/ui/button';
import { AuthDialog } from '../features/auth/auth-dialog';
import { Landing } from '../features/marketing/landing';
import { WorkspaceHome, NewProject } from '../features/project/workspace-home';
import { Workspace } from '../features/plan/workspace';

type AuthIntent = { mode: 'signup' | 'signin'; destination: string };

export function App() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const location = useLocation();
  const navigate = useNavigate();
  const [authIntent, setAuthIntent] = useState<AuthIntent | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');
  const marketing = location.pathname === '/' && !isAuthenticated;
  function privatePage(children: ReactNode) {
    if (isLoading)
      return (
        <main id="main" className="page-loading" role="status">
          Opening your workspace…
        </main>
      );
    if (isAuthenticated) return children;
    return (
      <main id="main" className="connection-screen">
        <span className="eyebrow">YOUR WORKSPACE</span>
        <h1>Your next chapter awaits.</h1>
        <p>Sign in to open your saved projects and plans.</p>
        <Button
          onClick={() =>
            setAuthIntent({ mode: 'signin', destination: location.pathname + location.search })
          }
        >
          Log in to continue
          <ArrowUpRight size={17} />
        </Button>
      </main>
    );
  }
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Brand to={isAuthenticated ? '/workspace' : '/'} />
          <nav aria-label="Main navigation">
            {isAuthenticated ? (
              <>
                <Link
                  className="workspace-header-link"
                  to="/workspace"
                  aria-current={location.pathname === '/workspace' ? 'page' : undefined}
                >
                  Your workspace
                </Link>
                <Button asChild variant="secondary" size="small">
                  <Link to="/workspace/new">
                    <Plus size={15} />
                    New project
                  </Link>
                </Button>
                <button
                  className="icon-button"
                  aria-label="Sign out"
                  disabled={signingOut}
                  onClick={async () => {
                    setSigningOut(true);
                    setError('');
                    try {
                      await signOut();
                      navigate('/', { replace: true });
                    } catch {
                      setError('Sign-out did not finish. Please try again.');
                    } finally {
                      setSigningOut(false);
                    }
                  }}
                >
                  <LogOut size={17} />
                </button>
              </>
            ) : (
              <>
                {marketing && (
                  <>
                    <a href="#how-it-works" className="how-link">
                      How it works
                    </a>
                    <a href="#what-you-get" className="how-link">
                      What you get
                    </a>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="small"
                  disabled={isLoading}
                  onClick={() =>
                    setAuthIntent({
                      mode: 'signin',
                      destination: marketing ? '/workspace' : location.pathname + location.search,
                    })
                  }
                >
                  Log in
                </Button>
                {marketing && (
                  <Button
                    size="small"
                    disabled={isLoading}
                    onClick={() => setAuthIntent({ mode: 'signup', destination: '/workspace' })}
                  >
                    Get started
                    <ArrowUpRight size={15} />
                  </Button>
                )}
              </>
            )}
          </nav>
        </div>
      </header>
      {error && (
        <p className="form-error section-width" role="alert">
          {error}
        </p>
      )}
      <Routes>
        <Route
          path="/"
          element={
            isLoading ? (
              <main id="main" className="page-loading" role="status">
                Opening Groundwork…
              </main>
            ) : isAuthenticated ? (
              <Navigate to={authIntent?.destination ?? '/workspace'} replace />
            ) : (
              <Landing
                onStart={() => setAuthIntent({ mode: 'signup', destination: '/workspace/new' })}
              />
            )
          }
        />
        <Route path="/workspace" element={privatePage(<WorkspaceHome />)} />
        <Route path="/workspace/new" element={privatePage(<NewProject />)} />
        <Route path="/project/:projectId" element={privatePage(<Workspace />)} />
        <Route
          path="*"
          element={
            <main id="main" className="connection-screen">
              <h1>A different path.</h1>
              <p>We couldn’t find that page.</p>
              <Link className="button button-primary" to={isAuthenticated ? '/workspace' : '/'}>
                Back to Groundwork
              </Link>
            </main>
          }
        />
      </Routes>
      {authIntent && (
        <AuthDialog
          open
          initialMode={authIntent.mode}
          onClose={() => setAuthIntent(null)}
          onSuccess={() => {
            const destination = authIntent.destination;
            setAuthIntent(null);
            navigate(destination, { replace: true });
          }}
        />
      )}
    </>
  );
}
