import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { Panel } from './kit';

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
      <div className="container grid min-h-[70vh] place-items-center py-16" role="alert">
        <Panel className="grid max-w-xl gap-4 p-7">
          <h1 className="text-3xl font-extrabold tracking-[-0.03em]">This page hit an error</h1>
          <p className="leading-relaxed text-muted-foreground">
            Something went wrong while showing this page. Your setup, notes and any veto in progress are saved on this
            device, so reloading is safe.
          </p>
          <pre className="overflow-auto rounded-md border border-white/10 bg-black/40 p-3 text-xs whitespace-pre-wrap text-ban">{error.message}</pre>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => window.location.reload()}>Reload the page</Button>
            <Button asChild variant="secondary"><Link to="/" onClick={() => this.setState({ error: null })}>Go to the home page</Link></Button>
          </div>
        </Panel>
      </div>
    );
  }
}
