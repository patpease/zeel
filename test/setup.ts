/**
 * jsdom has no matchMedia, and the theme hook asks for it on first render.
 * Defaults to light so a test that does not care about theme gets the plain
 * case; tests that do care stamp data-theme directly.
 */
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

const hasDom = typeof window !== 'undefined';

if (hasDom && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

afterEach(() => {
  if (!hasDom) return;
  cleanup();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('style');
  window.localStorage.clear();
});
