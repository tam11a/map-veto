import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { MenuIcon } from 'lucide-react';
import { BRAND, Logo } from '@/brand/Logo';
import { Button } from '@/components/ui/button';
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, navigationMenuTriggerStyle } from '@/components/ui/navigation-menu';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useHasLiveVeto } from '@/lib/session';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from '../ErrorBoundary';

/** Routes whose hero runs underneath the floating header. */
const FLUSH = [/^\/$/, /^\/maps\/[^/]+$/];

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/maps', label: 'Maps' },
  { to: '/guide', label: 'Veto guide' },
];

export function Layout() {
  const { pathname, hash } = useLocation();
  // hash links (e.g. /guide#faq) scroll themselves; everything else starts at the top
  useEffect(() => { if (!hash) window.scrollTo({ top: 0 }); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <a
        href="#main"
        className="fixed top-[-60px] left-4 z-[60] rounded-md bg-foreground px-4 py-2.5 font-semibold text-background transition-[top] focus:top-3"
      >
        Skip to content
      </a>
      <div className="ambient" aria-hidden="true" />
      <Nav />
      <main id="main" tabIndex={-1} className={cn('min-h-screen outline-none', !FLUSH.some(r => r.test(pathname)) && 'pt-20 sm:pt-22')}>
        <ErrorBoundary key={pathname}><Outlet /></ErrorBoundary>
      </main>
      <Footer />
    </>
  );
}

function CallToAction({ className }: { className?: string }) {
  const live = useHasLiveVeto();
  return (
    <Button asChild className={className}>
      <Link to="/veto">
        {live && <span className="size-2 animate-pulse rounded-full bg-white motion-reduce:animate-none" aria-hidden="true" />}
        {live ? 'Resume veto' : 'Start a veto'}
      </Link>
    </Button>
  );
}

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  // NavLink marks the current page with aria-current, which styles the active link
  const linkClass = 'rounded-md text-muted-foreground hover:bg-white/5 hover:text-foreground focus:bg-white/5 aria-[current=page]:bg-white/10 aria-[current=page]:text-foreground aria-[current=page]:shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]';

  return (
    <header className="pointer-events-none fixed inset-x-0 top-3 z-40 px-4">
      <div
        className={cn(
          'pointer-events-auto mx-auto flex h-15 max-w-[1120px] items-center gap-4 rounded-xl border border-white/10 pr-2.5 pl-4 backdrop-blur-xl transition-colors',
          'shadow-[inset_0_1px_0_rgb(255_255_255/0.1),0_24px_60px_-24px_rgb(0_0_0/0.75)]',
          scrolled ? 'bg-[rgb(20_14_26/0.8)]' : 'bg-[rgb(22_16_30/0.6)]',
        )}
      >
        <Link to="/" aria-label={`${BRAND.name} home`} className="rounded-md"><Logo size={32} /></Link>
        <NavigationMenu viewport={false} className="ml-auto hidden max-w-none flex-none md:flex" aria-label="Main">
          <NavigationMenuList className="gap-0.5">
            {LINKS.map(l => (
              <NavigationMenuItem key={l.to}>
                <NavigationMenuLink asChild className={cn(navigationMenuTriggerStyle(), linkClass, 'h-9 px-3.5')}>
                  <NavLink to={l.to} end={l.end}>{l.label}</NavLink>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
            <NavigationMenuItem><CallToAction className="ml-2" /></NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="ml-auto md:hidden" aria-label="Menu"><MenuIcon className="size-5" /></Button>
          </SheetTrigger>
          <SheetContent side="top" className="border-white/10 bg-popover/95 px-4 pt-6 pb-6 backdrop-blur-xl">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <Logo size={32} />
            <nav className="mt-4 grid gap-1" aria-label="Main">
              {LINKS.map(l => (
                <Button key={l.to} asChild variant="ghost" className={cn(linkClass, 'h-12 justify-start px-3.5 text-base font-medium')}>
                  <NavLink to={l.to} end={l.end}>{l.label}</NavLink>
                </Button>
              ))}
              <CallToAction className="mt-2 h-12 w-full text-base" />
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

const FOOT_COLS: { title: string; links: { to: string; label: string; external?: boolean }[] }[] = [
  { title: 'Product', links: [
    { to: '/veto', label: 'Start a veto' }, { to: '/maps', label: 'Map pool' },
    { to: '/maps?rotation=competitive', label: 'Competitive maps' }, { to: '/guide', label: 'Veto guide' },
  ] },
  { title: 'Formats', links: [{ to: '/veto?format=1', label: 'Best of 1' }, { to: '/veto?format=3', label: 'Best of 3' }, { to: '/veto?format=5', label: 'Best of 5' }] },
  { title: 'Learn', links: [{ to: '/guide#formats', label: 'How formats work' }, { to: '/guide#sides', label: 'Side selection' }, { to: '/guide#faq', label: 'FAQ' }] },
  { title: 'Data from', links: [
    { to: 'https://docs.henrikdev.xyz/', label: 'HenrikDev API', external: true },
    { to: 'https://valorant-api.com/', label: 'Valorant-API', external: true },
    { to: 'https://valorant.fandom.com/wiki/Maps', label: 'Valorant Wiki', external: true },
  ] },
];

const ext = { target: '_blank', rel: 'noreferrer' } as const;
const inline = 'text-muted-foreground underline decoration-white/20 underline-offset-3 transition-colors hover:text-foreground';

function Footer() {
  return (
    <footer className="mt-24 border-t border-white/10 bg-black/20 py-14 backdrop-blur-sm">
      <div className="mx-auto max-w-[1240px] px-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-[1.7fr_repeat(4,1fr)]">
          <div className="col-span-2 md:col-span-1">
            <Logo size={40} />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">{BRAND.pitch} Free, no sign-up, runs entirely in your browser.</p>
          </div>
          {FOOT_COLS.map(col => (
            <div key={col.title}>
              <h4 className="mb-3 text-sm font-semibold">{col.title}</h4>
              <ul className="grid gap-2">
                {col.links.map(l => (
                  <li key={l.label}>
                    {l.external
                      ? <a href={l.to} {...ext} className="text-sm text-muted-foreground transition-colors hover:text-foreground">{l.label}</a>
                      : <Link to={l.to} className="text-sm text-muted-foreground transition-colors hover:text-foreground">{l.label}</Link>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-6 border-t border-white/10 pt-6 text-xs leading-relaxed text-dim">
          <p className="max-w-2xl">
            Live map rotation by the <a href="https://docs.henrikdev.xyz/" {...ext} className={inline}>HenrikDev API</a>; map art, minimaps and agents by{' '}
            <a href="https://valorant-api.com/" {...ext} className={inline}>Valorant-API</a>. {BRAND.name} is a fan-made tool and is not affiliated with or endorsed by Riot Games.
            VALORANT and all related names and artwork are trademarks of Riot Games, Inc.
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span>© {new Date().getFullYear()} {BRAND.full}</span>
            <a
              href="https://tam11a.dev"
              {...ext}
              className="maker inline-flex items-center gap-1.5 rounded-md border border-white/12 bg-white/5 px-3 py-1.5 text-muted-foreground transition-colors hover:border-pick hover:text-foreground"
            >
              Designed and built by <b className="font-bold text-foreground">Tam</b>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
