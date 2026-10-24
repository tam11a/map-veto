import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { BRAND, Logo } from '../../brand/Logo';
import { cx } from '../../lib/fx';
import { useHasLiveVeto } from '../../lib/session';
import { ErrorBoundary } from '../ErrorBoundary';

const FLUSH = [/^\/$/, /^\/maps\/[^/]+$/];

export function Layout() {
  const { pathname, hash } = useLocation();
  // hash links (e.g. /guide#faq) scroll themselves; everything else starts at the top
  useEffect(() => { if (!hash) window.scrollTo({ top: 0 }); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <div className="ambient" aria-hidden="true" />
      <Nav />
      {/* full-bleed heroes run underneath the floating header */}
      <main id="main" tabIndex={-1} className={cx(FLUSH.some(r => r.test(pathname)) && 'flush')}>
        <ErrorBoundary key={pathname}><Outlet /></ErrorBoundary>
      </main>
      <Footer />
    </>
  );
}

function Nav() {
  const live = useHasLiveVeto();
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

  return (
    <header className={cx('nav', scrolled && 'scrolled', open && 'open')}>
      <div className="nav-pill">
        <Link to="/" className="nav-home" aria-label={`${BRAND.name} home`}><Logo size={32} /></Link>
        <button className="burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(o => !o)}><i /></button>
        <nav className="nav-links">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/maps">Maps</NavLink>
          <NavLink to="/guide">Veto guide</NavLink>
          {live
            ? <Link to="/veto" className="btn primary nav-cta"><span className="live-dot" aria-hidden="true" />Resume veto</Link>
            : <Link to="/veto" className="btn primary nav-cta">Start a veto</Link>}
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="foot-grid">
          <div>
            <Logo size={40} />
            <p>{BRAND.pitch} Free, no sign-up, runs entirely in your browser.</p>
          </div>
          <div className="foot-col">
            <h4>Product</h4>
            <Link to="/veto">Start a veto</Link>
            <Link to="/maps">Map pool</Link>
            <Link to="/maps?rotation=competitive">Competitive maps</Link>
            <Link to="/guide">Veto guide</Link>
          </div>
          <div className="foot-col">
            <h4>Formats</h4>
            <Link to="/veto?format=1">Best of 1</Link>
            <Link to="/veto?format=3">Best of 3</Link>
            <Link to="/veto?format=5">Best of 5</Link>
          </div>
          <div className="foot-col">
            <h4>Learn</h4>
            <Link to="/guide#formats">How formats work</Link>
            <Link to="/guide#sides">Side selection</Link>
            <Link to="/guide#faq">FAQ</Link>
          </div>
          <div className="foot-col">
            <h4>Data from</h4>
            <a href="https://docs.henrikdev.xyz/" target="_blank" rel="noreferrer">HenrikDev API</a>
            <a href="https://valorant-api.com/" target="_blank" rel="noreferrer">Valorant-API</a>
            <a href="https://valorant.fandom.com/wiki/Maps" target="_blank" rel="noreferrer">Valorant Wiki</a>
          </div>
        </div>
        <div className="legal">
          <span>
            Live map rotation by the <a href="https://docs.henrikdev.xyz/" target="_blank" rel="noreferrer">HenrikDev API</a>; map art, minimaps and agents by <a href="https://valorant-api.com/" target="_blank" rel="noreferrer">Valorant-API</a>.
            {' '}{BRAND.name} is a fan-made tool and is not affiliated with or endorsed by Riot Games.
            VALORANT and all related names and artwork are trademarks of Riot Games, Inc.
          </span>
          <span className="foot-sign">
            © {new Date().getFullYear()} {BRAND.full}
            <a className="maker" href="https://tam11a.dev" target="_blank" rel="noreferrer">
              Designed and built by <b>Tam</b>
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
