import './styles.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConvexReactClient } from 'convex/react';
import { ConvexAuthProvider } from '@convex-dev/auth/react';
import { api } from '../convex/_generated/api';
import { App } from './app/app';
import { ErrorBoundary } from './app/error-boundary';
import '@fontsource-variable/dm-sans';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';

const url = import.meta.env.VITE_CONVEX_URL;
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      {url ? (
        <ConvexAuthProvider
          client={new ConvexReactClient(url)}
          api={{ refreshSession: api.auth.refreshSession, signOut: api.auth.signOut }}
        >
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ConvexAuthProvider>
      ) : (
        <main className="connection-screen">
          <span className="eyebrow">GROUNDWORK</span>
          <h1>A good place to begin.</h1>
          <p>
            The workspace needs its Convex connection. Start the local backend, then restart the
            frontend.
          </p>
        </main>
      )}
    </ErrorBoundary>
  </React.StrictMode>,
);
