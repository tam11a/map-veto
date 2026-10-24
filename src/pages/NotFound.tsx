import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTitle } from '@/lib/useTitle';

export function NotFound() {
  useTitle('Page not found');
  return (
    <div className="container grid min-h-[70vh] place-items-center py-20 text-center">
      <div className="grid justify-items-center gap-4">
        <div className="relative text-[clamp(7rem,22vw,13rem)] leading-none font-extrabold tracking-[-0.05em] text-white/10">
          404
          <span className="absolute top-1/2 left-1/2 -translate-1/2 -rotate-8 rounded-md border-3 border-ban bg-[rgb(13_10_18/0.72)] px-4 py-1 text-3xl tracking-[0.12em] text-ban">BANNED</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">This page got vetoed.</h1>
        <p className="text-muted-foreground">The page you’re looking for isn’t in the pool.</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Button asChild><Link to="/">Back home</Link></Button>
          <Button asChild variant="secondary"><Link to="/veto">Start a veto</Link></Button>
        </div>
      </div>
    </div>
  );
}
