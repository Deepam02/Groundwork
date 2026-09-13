import { useState } from 'react';
import { useAuthActions } from '@convex-dev/auth/react';
import { useConvexAuth } from 'convex/react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { ArrowUpRight, LogOut, Plus } from 'lucide-react';
import { Brand } from '../components/brand';
import { Button } from '../components/ui/button';
import { AuthDialog } from '../features/auth/auth-dialog';
import { Start } from '../features/project/start';
import { Workspace } from '../features/plan/workspace';

export function App() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const location = useLocation();
  const [authOpen, setAuthOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const home = location.pathname === '/';
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <nav aria-label="Main navigation">
            {home && (
              <a href="#how-it-works" className="how-link">
                How it works
              </a>
            )}
            {isAuthenticated ? (
              <>
                <Button asChild variant="secondary" size="small">
                  <Link to="/">
                    <Plus size={15} /> New project
                  </Link>
                </Button>
                <button
                  className="icon-button"
                  aria-label="Sign out"
                  onClick={() => {
                    void signOut();
                  }}
                >
                  <LogOut size={17} />
                </button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="small"
                disabled={isLoading}
                onClick={() => setAuthOpen(true)}
              >
                Your workspace <ArrowUpRight size={16} />
              </Button>
            )}
          </nav>
        </div>
      </header>
      {notice && home && (
        <div className="success-notice" role="status">
          {notice}
          <button onClick={() => setNotice('')} aria-label="Dismiss notification">
            ×
          </button>
        </div>
      )}
      <Routes>
        <Route path="/" element={<Start askSignIn={() => setAuthOpen(true)} />} />
        <Route
          path="/project/:projectId"
          element={
            isLoading ? (
              <div className="page-loading">Opening your workspace…</div>
            ) : isAuthenticated ? (
              <Workspace />
            ) : (
              <main id="main" className="connection-screen">
                <span className="eyebrow">YOUR WORKSPACE</span>
                <h1>Your next chapter awaits.</h1>
                <p>Sign in to open your saved project.</p>
                <Button onClick={() => setAuthOpen(true)}>
                  Log in to continue <ArrowUpRight size={17} />
                </Button>
              </main>
            )
          }
        />
        <Route
          path="*"
          element={
            <main id="main" className="connection-screen">
              <h1>A different path.</h1>
              <p>We couldn’t find that page.</p>
              <Link className="button button-primary" to="/">
                Back to Groundwork
              </Link>
            </main>
          }
        />
      </Routes>
      {authOpen && (
        <AuthDialog
          open={authOpen}
          onClose={() => setAuthOpen(false)}
          onSuccess={() => {
            setAuthOpen(false);
            if (home) {
              setNotice(
                'You’re in. Your idea is saved below — find your next steps when you’re ready.',
              );
              document.getElementById('project-description')?.focus();
            }
          }}
        />
      )}
    </>
  );
}
