import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TEAMC } from '@/data/maps';
import { vars } from '@/lib/fx';
import { cn } from '@/lib/utils';
import type { TeamIdx } from '@/types';

/**
 * A team's logo, or its letter (A/B) on the team colour when there is none or the image fails to load.
 * Size it with `className` (size-*, rounded-*, and a text size for the letter).
 */
export function TeamAvatar({ i, url, className }: { i: TeamIdx; url: string; className?: string }) {
  return (
    <Avatar className={cn('rounded-md after:hidden', className)} style={vars({ '--tc': TEAMC[i] })}>
      {url && <AvatarImage src={url} alt="" referrerPolicy="no-referrer" className="rounded-[inherit] bg-black/40 object-contain p-[12%]" />}
      <AvatarFallback className="rounded-[inherit] bg-(--tc) text-[1em] font-extrabold text-ink">{i ? 'B' : 'A'}</AvatarFallback>
    </Avatar>
  );
}
