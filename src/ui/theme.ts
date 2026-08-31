/**
 * Light and dark, and who decides.
 *
 * Three states, two buttons. The stored preference is `light`, `dark`, or
 * absent — and absent means *follow the operating system*, which is the state a
 * first-time visitor is in. Pressing either button pins the choice; there is no
 * third "system" button because the state it selects is the one you already
 * have before you press anything.
 *
 * The palette is defined three times in `styles.css`: light on `:root`, dark
 * inside a `prefers-color-scheme` media query guarded with
 * `:not([data-theme="light"])`, and dark again on a bare `[data-theme="dark"]`.
 * Removing the attribute hands the decision back to the media query rather than
 * leaving a stale choice behind.
 *
 * There is no pre-hydration script to stamp the attribute before first paint:
 * the content security policy allows no inline script, and that is worth more
 * than the few milliseconds of flash it would save. The media query covers the
 * default case before React mounts, so the only visible switch is for someone
 * who has overridden their system setting, which they did knowingly.
 *
 * Lifted from Psychrometric Studio deliberately. Two tools in one suite should
 * behave the same way, and this mechanism is already proven against export.
 */
import { useCallback, useEffect, useState } from 'react';

export type ThemeChoice = 'light' | 'dark';
/** `null` means no choice has been made: follow the operating system. */
export type ThemePreference = ThemeChoice | null;

const STORAGE_KEY = 'zeel:theme';

export function readPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : null;
  } catch {
    // localStorage throws rather than returning null in a private window on
    // some browsers, and a theme preference is not worth failing a load over.
    return null;
  }
}

function storePreference(preference: ThemePreference): void {
  try {
    if (preference === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    /* Storage unavailable. The choice still applies for this session. */
  }
}

export function applyPreference(preference: ThemePreference): void {
  const root = document.documentElement;
  if (preference === null) root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', preference);
}

export interface Theme {
  readonly preference: ThemePreference;
  /** What is actually being painted, after resolving `null` against the system. */
  readonly resolved: ThemeChoice;
  readonly setPreference: (preference: ThemePreference) => void;
}

export function useTheme(): Theme {
  const [preference, setStored] = useState<ThemePreference>(() =>
    typeof window === 'undefined' ? null : readPreference(),
  );
  const [systemDark, setSystemDark] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches,
  );

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const update = (): void => setSystemDark(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  // Applied from an effect rather than during render: writing to the document is
  // a side effect, and under StrictMode a render may be discarded.
  useEffect(() => {
    applyPreference(preference);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    storePreference(next);
    setStored(next);
  }, []);

  return { preference, resolved: preference ?? (systemDark ? 'dark' : 'light'), setPreference };
}
