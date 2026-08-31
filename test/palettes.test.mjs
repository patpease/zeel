// Every shipped palette is validated with the data-viz palette checker, not by
// eye. If you change a step, RE-RUN THE CHECKER rather than adjusting this file:
//
//   node validate_palette.js "<hex,...>" --mode light --ordinal
//   node validate_palette.js "<hex,...>" --mode dark --surface "#171e26" --ordinal
//
// The raw source palettes do NOT pass — that is why all but Okabe–Ito are
// re-stepped. nord::frost puts adjacent colours 2.9 ΔE apart and
// wesanderson::Royal2 7.2, where 15 is the floor at which a reader with full
// colour vision can still separate two neighbouring segments.
import { describe, it, expect } from 'vitest';
import { PALETTES, DEFAULT_PALETTE_ID, getPalette, paletteVariables } from '../src/charts/palettes.js';
import { GROUP_ORDER } from '../src/model/groups.js';

const hex = /^#[0-9A-F]{6}$/;

describe('palette catalogue', () => {
  it('offers the default plus five alternatives', () => {
    expect(PALETTES).toHaveLength(6);
    expect(PALETTES[0].id).toBe(DEFAULT_PALETTE_ID);
  });

  it('gives every palette one step per air system, in both modes', () => {
    for (const palette of PALETTES) {
      expect(palette.light, palette.id).toHaveLength(GROUP_ORDER.length);
      expect(palette.dark, palette.id).toHaveLength(GROUP_ORDER.length);
      for (const value of [...palette.light, ...palette.dark]) {
        expect(value, `${palette.id}: ${value}`).toMatch(hex);
      }
    }
  });

  it('uses ids that are unique and stable', () => {
    const ids = PALETTES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('falls back to the default rather than throwing on an unknown id', () => {
    expect(getPalette('nonsense').id).toBe(DEFAULT_PALETTE_ID);
  });
});

describe('licensing', () => {
  it('takes nothing from paletteer itself, which is GPL-3', () => {
    // paletteer was the catalogue used to find these; every value comes from the
    // original source package. Copying paletteer's own data would carry GPL-3
    // into an MIT project.
    for (const palette of PALETTES) {
      expect(palette.source.toLowerCase(), palette.id).not.toContain('paletteer');
    }
  });

  it('sources every borrowed palette from an MIT package', () => {
    for (const palette of PALETTES) {
      if (palette.id === DEFAULT_PALETTE_ID) {
        expect(palette.licence).toBe('In-house');
        continue;
      }
      expect(palette.licence, palette.id).toBe('MIT');
    }
  });

  it('says plainly which palettes are reproduced and which are re-stepped', () => {
    const verbatim = PALETTES.filter((p) => p.derivation === 'verbatim').map((p) => p.id);
    // Only the palette designed for this job ships unchanged.
    expect(verbatim).toEqual(['pease-studio', 'okabe-ito']);
    for (const palette of PALETTES) {
      expect(palette.note.length, palette.id).toBeGreaterThan(20);
    }
  });
});

describe('applying a palette', () => {
  it('maps steps onto the fixed group order, so colour follows the entity', () => {
    const zissou = getPalette('zissou');
    const vars = paletteVariables(zissou, 'light');
    expect(vars.map(([name]) => name)).toEqual(GROUP_ORDER.map((g) => `--group-${g}`));
    expect(vars[0][1]).toBe(zissou.light[0]);
  });

  it('gives each mode its own steps', () => {
    for (const palette of PALETTES) {
      if (palette.id === 'okabe-ito') continue; // Deliberately identical; see palettes.ts.
      expect(palette.light, palette.id).not.toEqual(palette.dark);
    }
  });

  it('keeps Okabe–Ito exactly as published, in both modes', () => {
    const okabe = getPalette('okabe-ito');
    const published = ['#0072B2', '#009E73', '#E69F00', '#D55E00', '#CC79A7'];
    expect(okabe.light).toEqual(published);
    expect(okabe.dark).toEqual(published);
  });
});
