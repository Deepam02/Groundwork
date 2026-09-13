import { Component, type ReactNode } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="connection-screen">
          <span className="eyebrow">LET’S TRY THAT AGAIN</span>
          <h1>A small interruption.</h1>
          <p>The workspace couldn’t be loaded. Check the connection and try once more.</p>
          <div className="button-row">
            <a className="button button-secondary" href="/">
              <ArrowLeft size={16} /> Back home
            </a>
            <button className="button button-primary" onClick={() => location.reload()}>
              <RefreshCw size={16} /> Reload workspace
            </button>
          </div>
        </main>
      );
    return this.props.children;
  }
}
