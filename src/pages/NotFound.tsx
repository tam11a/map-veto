import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { useTitle } from '@/lib/useTitle';

export function NotFound() {
  useTitle('Page not found');
  return (
    <Empty className="container min-h-[70vh] py-20">
      <EmptyHeader className="max-w-none">
        <EmptyMedia className="relative mb-4 text-[clamp(7rem,22vw,13rem)] leading-none font-extrabold tracking-[-0.05em] text-white/10">
          404
          <span className="absolute top-1/2 left-1/2 -translate-1/2 -rotate-8 rounded-md border-3 border-ban bg-[rgb(13_10_18/0.72)] px-4 py-1 text-3xl tracking-[0.12em] text-ban">BANNED</span>
        </EmptyMedia>
        <EmptyTitle className="text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl" role="heading" aria-level={1}>This page got vetoed.</EmptyTitle>
        <EmptyDescription className="text-base">The page you’re looking for isn’t in the pool.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row flex-wrap justify-center">
        <Button asChild><Link to="/">Back home</Link></Button>
        <Button asChild variant="secondary"><Link to="/veto">Start a veto</Link></Button>
      </EmptyContent>
    </Empty>
  );
}
