import { useState, type ReactNode } from 'react';
import { CalendarIcon, ClockIcon, MinusIcon, PlusIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { Field as UiField, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

/** A labelled form control with an optional hint (or error) underneath. */
export function Field({ label, htmlFor, hint, error, className, children }: {
  label: ReactNode; htmlFor?: string; hint?: ReactNode; error?: ReactNode; className?: string; children: ReactNode;
}) {
  return (
    <UiField className={cn('gap-1.5', className)} data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">{label}</FieldLabel>
      {children}
      {error ? <FieldError className="text-xs text-ban">{error}</FieldError> : hint && <FieldDescription className="text-xs text-dim">{hint}</FieldDescription>}
    </UiField>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');
const HOURS = Array.from({ length: 24 }, (_, h) => pad(h));
const MINUTES = Array.from({ length: 12 }, (_, i) => pad(i * 5));

/** Date and time in one control. The value is a local "YYYY-MM-DDTHH:mm" string, or '' for none. */
export function DateTimePicker({ id, value, onChange, placeholder = 'Optional', className }: {
  id?: string; value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [day, time = ''] = value.split('T');
  const date = day ? new Date(`${day}T00:00`) : undefined;
  const [hh, mm] = time ? time.split(':') : ['19', '00'];
  const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const set = (d: Date | undefined, h = hh, m = mm) => onChange(d ? `${ymd(d)}T${h}:${m}` : '');
  const shown = value && !Number.isNaN(new Date(value).getTime())
    ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : '';
  // keep an odd saved minute (from an older version) selectable
  const minutes = MINUTES.includes(mm) ? MINUTES : [...MINUTES, mm].sort();
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn('h-10 w-full justify-start border-input bg-black/25 px-3 font-normal dark:bg-black/25', !shown && 'text-muted-foreground', className)}
        >
          <CalendarIcon className="text-dim" />
          <span className="truncate">{shown || placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} defaultMonth={date} onSelect={d => set(d)} autoFocus />
        <div className="flex items-center gap-2 border-t border-white/10 p-3">
          <ClockIcon className="size-4 text-dim" aria-hidden="true" />
          <Select value={hh} onValueChange={h => set(date ?? new Date(), h, mm)}>
            <SelectTrigger size="sm" className="w-16" aria-label="Hour"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-60">{HOURS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
          </Select>
          <span className="text-muted-foreground">:</span>
          <Select value={mm} onValueChange={m => set(date ?? new Date(), hh, m)}>
            <SelectTrigger size="sm" className="w-16" aria-label="Minute"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-60">{minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <div className="ml-auto flex gap-1">
            {value && <Button size="sm" variant="ghost" onClick={() => { onChange(''); setOpen(false); }}>Clear</Button>}
            <Button size="sm" variant="secondary" onClick={() => setOpen(false)}>Done</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** A number with − and + buttons, for small bounded values (seconds per turn…). */
export function Stepper({ value, onChange, min, max, step = 1, label, className }: {
  value: number; onChange: (v: number) => void; min: number; max: number; step?: number; label: string; className?: string;
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, Math.round(n)));
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <ButtonGroup aria-label={label} className={className}>
      <Button variant="outline" size="icon-sm" aria-label={`Decrease ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(clamp(value - step))}><MinusIcon /></Button>
      <Input
        inputMode="numeric"
        aria-label={label}
        value={draft ?? String(value)}
        onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 4); setDraft(v); if (v) onChange(Math.min(max, Number(v))); }}
        onBlur={() => { setDraft(null); onChange(clamp(value)); }}
        className="h-8 w-14 text-center tabular-nums"
      />
      <Button variant="outline" size="icon-sm" aria-label={`Increase ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(clamp(value + step))}><PlusIcon /></Button>
    </ButtonGroup>
  );
}

/** The heading block at the top of a content page. */
export function PageHeader({ title, children, className }: { title: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <header className={cn('pt-10 pb-10 sm:pt-14', className)}>
      <h1 className="max-w-[18ch] text-4xl font-extrabold tracking-[-0.03em] text-balance sm:text-5xl lg:text-6xl">{title}</h1>
      {children && <div className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">{children}</div>}
    </header>
  );
}

/** A frosted surface for grouping content: a shadcn Card without its header/footer spacing, laid out by the caller. */
export function Panel({ className, ...props }: React.ComponentProps<typeof Card>) {
  // Card is a padded column; reset that so a Panel's own grid/flex classes decide the layout
  return <Card className={cn('block flex-row gap-0 overflow-visible py-0 text-base', className)} {...props} />;
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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent onOpenAutoFocus={focusConfirm ? undefined : e => { e.preventDefault(); (e.currentTarget as HTMLElement).querySelector<HTMLElement>('[data-cancel]')?.focus(); }}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {children && <AlertDialogDescription className="leading-relaxed">{children}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="ghost" data-cancel onClick={e => { if (onCancel) { e.preventDefault(); onCancel(); } }}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
