import { type ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface Props {
  open: boolean;
  onClose?: () => void;
  /** id of the element that names the dialog (usually its heading) */
  labelledBy?: string;
  /** accessible name when there is no visible heading */
  label?: string;
  children: ReactNode;
}

/**
 * Modal dialog: blurred backdrop + sheet, portalled to <body> so the whole app can go inert.
 * Stays mounted so it can fade both ways. While open it traps focus, makes the app (#root)
 * inert, and returns focus to the trigger on close.
 */
export function Overlay({ open, onClose, labelledBy, label, children }: Props) {
  const [shown, setShown] = useState(false);
  const sheet = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) { setShown(false); return; }
    const r = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(r);
  }, [open]);

  // focus in on open, back to the trigger on close; everything else becomes inert
  useEffect(() => {
    if (!open) return;
    returnTo.current = document.activeElement as HTMLElement | null;
    const root = document.getElementById('root');
    const inerted = root && !root.inert ? [root] : [];
    inerted.forEach(el => { el.inert = true; });
    const t = setTimeout(() => {
      const el = sheet.current;
      if (!el || el.contains(document.activeElement)) return;
      (el.querySelector<HTMLElement>('[autofocus]') ?? el.querySelector<HTMLElement>(FOCUSABLE) ?? el).focus();
    }, 30);
    return () => {
      clearTimeout(t);
      inerted.forEach(el => { el.inert = false; });
      const back = returnTo.current;
      if (back && document.contains(back)) back.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab' || !sheet.current) return;
      // keep Tab inside the dialog
      const items = [...sheet.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(el => el.offsetParent !== null);
      if (!items.length) { e.preventDefault(); sheet.current.focus(); return; }
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return createPortal(
    <div className={'overlay' + (shown ? ' show' : '')} aria-hidden={!open} onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div
        ref={sheet}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : label}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
