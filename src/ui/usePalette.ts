/**
 * The chosen chart palette, and how it reaches the stylesheet.
 *
 * The default palette lives in `styles.css`, defined in all three theme blocks,
 * so it responds to the operating system with no JavaScript at all. Choosing a
 * different one writes the five custom properties onto the document element;
 * choosing the default again *removes* them, handing control back to the
 * stylesheet rather than freezing one theme's values in an inline style.
 *
 * The write is keyed on the resolved theme, so a palette survives a theme change
 * and a system theme change underneath it.
 */
import { useCallback, useEffect, useState } from 'react';
import { PALETTES, DEFAULT_PALETTE_ID, getPalette, paletteVariables } from '../charts/palettes.js';
import type { Palette } from '../charts/palettes.js';
import type { ThemeChoice } from './theme.js';

const STORAGE_KEY = 'zeel:palette';

function readStored(): string {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored && PALETTES.some((p) => p.id === stored) ? stored : DEFAULT_PALETTE_ID;
  } catch {
    // localStorage throws rather than returning null in a private window on some
    // browsers, and a palette choice is not worth failing a load over.
    return DEFAULT_PALETTE_ID;
  }
}

export interface PaletteState {
  readonly palette: Palette;
  readonly setPaletteId: (id: string) => void;
}

export function usePalette(resolvedTheme: ThemeChoice): PaletteState {
  const [id, setId] = useState<string>(() =>
    typeof window === 'undefined' ? DEFAULT_PALETTE_ID : readStored(),
  );
  const palette = getPalette(id);

  useEffect(() => {
    const root = document.documentElement;
    const names = paletteVariables(palette, resolvedTheme).map(([name]) => name);
    if (palette.id === DEFAULT_PALETTE_ID) {
      for (const name of names) root.style.removeProperty(name);
      return;
    }
    for (const [name, value] of paletteVariables(palette, resolvedTheme)) {
      root.style.setProperty(name, value);
    }
  }, [palette, resolvedTheme]);

  const setPaletteId = useCallback((next: string) => {
    try {
      if (next === DEFAULT_PALETTE_ID) window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* Storage unavailable. The choice still applies for this session. */
    }
    setId(next);
  }, []);

  return { palette, setPaletteId };
}
