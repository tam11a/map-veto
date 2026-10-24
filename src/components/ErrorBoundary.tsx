import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CircleAlertIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
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
        <Panel className="flex max-w-xl flex-col gap-5 py-7">
          <CardHeader className="px-7">
            <CardTitle><h1 className="text-3xl font-extrabold tracking-[-0.03em]">This page hit an error</h1></CardTitle>
            <CardDescription className="text-base leading-relaxed">
              Something went wrong while showing this page. Your setup, notes and any veto in progress are saved on this
              device, so reloading is safe.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-7">
            <Alert variant="destructive" className="border-ban/40 bg-ban/8 text-ban">
              <CircleAlertIcon />
              <AlertTitle>Error details</AlertTitle>
              <AlertDescription className="font-mono text-xs break-words whitespace-pre-wrap text-ban/90">{error.message}</AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex-wrap gap-2 border-white/10 bg-black/20 px-7 pb-0 [.border-t]:pt-5">
            <Button onClick={() => window.location.reload()}>Reload the page</Button>
            <Button asChild variant="secondary"><Link to="/" onClick={() => this.setState({ error: null })}>Go to the home page</Link></Button>
          </CardFooter>
        </Panel>
      </div>
    );
  }
}
