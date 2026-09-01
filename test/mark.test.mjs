// The mark exists three times — inlined twice for the header, once more as the
// favicon — and they have to stay in step. A drift here is invisible until
// someone looks at a tab strip in the other theme.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const standard = read('../src/ui/mark.svg');
const reversed = read('../src/ui/mark-reversed.svg');
const favicon = read('../public/mark.svg');
const css = read('../src/ui/styles.css');

describe('the two marks', () => {
  it('are actually inverses of each other', () => {
    // Dark ground with light rules, and the reverse.
    expect(standard).toMatch(/rect width="70" height="70"[^>]*fill="#0B2B28"/);
    expect(reversed).toMatch(/rect x="4" y="4"[^>]*fill="#F4F7F6"/);
  });

  it('both keep the orange bar, which is the mark’s one accent', () => {
    expect(standard).toMatch(/#E2842F/);
    expect(reversed).toMatch(/#E2842F/);
  });
});

describe('choosing between them', () => {
  it('covers all three theme states, not just the media query', () => {
    // A pinned light theme on a dark system must still show the standard mark,
    // which is precisely what a <picture> media query would get wrong.
    expect(css).toMatch(/\.brand-icon--reversed\s*\{\s*display:\s*none/);
    expect(css).toMatch(/:root:not\(\[data-theme='light'\]\) \.brand-icon--reversed/);
    expect(css).toMatch(/\[data-theme='dark'\] \.brand-icon--reversed/);
  });
});

describe('the favicon', () => {
  it('carries both marks, since a tab icon cannot be swapped by the app', () => {
    expect(favicon).toMatch(/class="standard"/);
    expect(favicon).toMatch(/class="reversed"/);
    expect(favicon).toMatch(/@media \(prefers-color-scheme: dark\)/);
  });

  it('defaults to the standard mark, so an unsupporting browser still gets a tile', () => {
    expect(favicon.indexOf('class="standard"')).toBeLessThan(favicon.indexOf('class="reversed"'));
    expect(favicon).toMatch(/\.reversed \{ display: none; \}/);
  });

  it('uses the same geometry as the two header marks', () => {
    for (const bar of ['x="33" y="23" width="12" height="29"']) expect(standard).toContain(bar);
    for (const bar of ['x="33" y="22" width="12" height="29"']) expect(reversed).toContain(bar);
    expect(favicon).toContain('x="33" y="23" width="12" height="29"');
    expect(favicon).toContain('x="33" y="22" width="12" height="29"');
  });
});
