import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Props { children: ReactNode }
interface State { error: Error | null }

/**
 * Catches a crash inside one page so the header, footer and navigation keep working.
 * Layout keys it by path, so moving to another page clears the error.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Map Veto] page crashed', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="container crash" role="alert">
        <div className="crash-card frost">
          <h1>This page hit an error</h1>
          <p>
            Something went wrong while showing this page. Your setup, notes and any veto in progress are saved on this
            device, so reloading is safe.
          </p>
          <pre>{error.message}</pre>
          <div className="crash-actions">
            <button className="btn primary" onClick={() => window.location.reload()}>Reload the page</button>
            <Link to="/" className="btn glassy" onClick={() => this.setState({ error: null })}>Go to the home page</Link>
          </div>
        </div>
      </div>
    );
  }
}
