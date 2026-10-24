import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

/**
 * App-level building blocks on top of shadcn/ui. Screens use these (and the ui/ primitives) instead of
 * one-off styles, so the same thing always looks the same.
 */

/** One choice out of a few, shown side by side (format, timer, sides…). */
export function Segmented<T extends string>({
  value, onChange, options, label, className, size = 'default', stretch,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly { value: T; label: ReactNode; hint?: ReactNode; disabled?: boolean }[];
  /** accessible name for the group */
  label: string;
  className?: string;
  size?: 'sm' | 'default';
  /** fill the available width */
  stretch?: boolean;
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={v => { if (v) onChange(v as T); }}
      aria-label={label}
      className={cn('gap-0.5 rounded-lg border border-white/10 bg-black/30 p-1', stretch && 'flex w-full', className)}
    >
      {options.map(o => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          disabled={o.disabled}
          className={cn(
            'rounded-md! px-3 font-semibold text-muted-foreground hover:bg-white/5 hover:text-foreground',
            'data-[state=on]:bg-white/12 data-[state=on]:text-foreground data-[state=on]:shadow-[inset_0_1px_0_rgb(255_255_255/0.1)]',
            size === 'sm' ? 'h-7 text-xs' : 'h-8 text-sm',
            stretch && 'min-w-0 flex-1',
          )}
        >
          <span className="truncate">{o.label}</span>
          {o.hint != null && <span className="text-xs font-medium text-dim tabular-nums">{o.hint}</span>}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/** A labelled form control with an optional hint underneath. */
export function Field({ label, htmlFor, hint, error, className, children }: {
  label: ReactNode; htmlFor?: string; hint?: ReactNode; error?: ReactNode; className?: string; children: ReactNode;
}) {
  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
      {(error || hint) && <p className={cn('text-xs', error ? 'text-ban' : 'text-dim')}>{error || hint}</p>}
    </div>
  );
}

/** The heading block at the top of a content page. */
export function PageHeader({ title, children, className }: { title: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <header className={cn('pt-32 pb-10 sm:pt-36', className)}>
      <h1 className="max-w-[18ch] text-4xl font-extrabold tracking-[-0.03em] text-balance sm:text-5xl lg:text-6xl">{title}</h1>
      {children && <div className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">{children}</div>}
    </header>
  );
}

/** A frosted surface for grouping content (lighter weight than a Card, no header slots). */
export function Panel({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('rounded-xl bg-card shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_24px_60px_-24px_rgb(0_0_0/0.75)] ring-1 ring-white/10 backdrop-blur-xl', className)}
      {...props}
    >
      {children}
    </div>
  );
}

/** Small section heading used inside screens ("Map pool", "Veto order"…). */
export function SectionTitle({ children, aside, className, id }: { children: ReactNode; aside?: ReactNode; className?: string; id?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-2', className)}>
      <h2 id={id} className="text-xl font-bold tracking-tight">{children}</h2>
      {aside}
    </div>
  );
}

/** A yes/no question in a dialog: "Start anyway?", "Leave the veto?"… */
export function ConfirmDialog({
  open, onOpenChange, title, children, confirmLabel, cancelLabel = 'Cancel', onConfirm, onCancel, focusConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  children?: ReactNode;
  confirmLabel: ReactNode;
  cancelLabel?: ReactNode;
  onConfirm: () => void;
  /** what the cancel button does, when it's more than closing the dialog */
  onCancel?: () => void;
  /** put focus on the confirm button instead of cancel (when confirming is the safe choice) */
  focusConfirm?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} onOpenAutoFocus={focusConfirm ? undefined : e => { e.preventDefault(); (e.currentTarget as HTMLElement).querySelector<HTMLElement>('[data-cancel]')?.focus(); }}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold tracking-tight">{title}</DialogTitle>
          {children && <DialogDescription className="text-sm leading-relaxed text-muted-foreground">{children}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" data-cancel onClick={() => (onCancel ? onCancel() : onOpenChange(false))}>{cancelLabel}</Button>
          <Button onClick={() => { onOpenChange(false); onConfirm(); }}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
