import { type ReactNode, useEffect, useState } from 'react';

/** Blurred backdrop + sheet. Stays mounted so it can fade both ways. */
export function Overlay({ open, onClose, children }: { open: boolean; onClose?: () => void; children: ReactNode }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!open) { setShown(false); return; }
    const r = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(r);
  }, [open]);

  useEffect(() => {
    if (!open || !onClose) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div className={'overlay' + (shown ? ' show' : '')} onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="sheet">{children}</div>
    </div>
  );
}
