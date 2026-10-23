import { useEffect } from 'react';
import { BRAND } from '../brand/Logo';

export function useTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${BRAND.name}` : `${BRAND.name} — ${BRAND.tagline}`;
  }, [title]);
}
