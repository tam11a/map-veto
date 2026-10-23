import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { BRAND, Logo } from '../../brand/Logo';
import { cx } from '../../lib/fx';

export function Layout() {
  const { pathname, hash } = useLocation();
  // hash links (e.g. /guide#faq) scroll themselves; everything else starts at the top
  useEffect(() => { if (!hash) window.scrollTo({ top: 0 }); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <Nav />
      <main><Outlet /></main>
      <Footer />
    </>
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

  return (
    <header className={cx('nav', scrolled && 'scrolled', open && 'open')}>
      <div className="container nav-in">
        <Link to="/" aria-label={`${BRAND.name} home`}><Logo size={36} /></Link>
        <button className="burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(o => !o)}><i /></button>
        <nav className="nav-links">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/maps">Maps</NavLink>
          <NavLink to="/guide">Veto guide</NavLink>
          <Link to="/veto" className="btn primary nav-cta">Start veto <span className="arr">→</span></Link>
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
        </div>
        <div className="legal">
          <span>
            {BRAND.name} is a fan-made tool and is not affiliated with or endorsed by Riot Games.
            VALORANT and all related names and artwork are trademarks of Riot Games, Inc.
          </span>
          <span>© {new Date().getFullYear()} {BRAND.full}</span>
        </div>
      </div>
    </footer>
  );
}

/** Fades children in when they scroll into view. */
export function Reveal({ children, delay = 0, className, as: Tag = 'div', style }: {
  children: ReactNode; delay?: number; className?: string; as?: 'div' | 'section' | 'li'; style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect(); } }, { rootMargin: '0px 0px -8% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref as never} className={cx('reveal', inView && 'in', className)} style={{ ...style, ['--d' as string]: `${delay}ms` }}>
      {children}
    </Tag>
  );
}
