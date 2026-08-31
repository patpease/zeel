// The air-system ramps are validated with the data-viz palette checker, not by
// eye. Pinning the hexes here means a change has to be deliberate — and if you
// change one, RE-RUN THE VALIDATOR rather than adjusting this list:
//
//   node validate_palette.js "<hex,...>" --mode light --ordinal
//   node validate_palette.js "<hex,...>" --mode dark --surface "#171e26" --ordinal
//
// Both current ramps pass monotone lightness, adjacent gaps >= 0.06 L, a single
// hue within 15 degrees, and a light end clearing its own surface (2.17:1 on
// white, 3.32:1 on #171e26).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/ui/styles.css', import.meta.url), 'utf8');

const GROUPS = ['lab', 'vivarium', 'special-lab', 'general', 'auditorium'];

const valuesFor = (group) =>
  [...css.matchAll(new RegExp(`--group-${group}:\\s*(#[0-9A-Fa-f]{6});`, 'g'))].map((m) => m[1]);

describe('air-system ramps', () => {
  it('defines every group in all three theme blocks', () => {
    // Light on :root, dark in the media query, dark again on [data-theme].
    // A colour defined in only one of them renders one theme's ink on the other's ground.
    for (const group of GROUPS) {
      expect(valuesFor(group), group).toHaveLength(3);
    }
  });

  it('holds the validated light ramp', () => {
    expect(GROUPS.map((g) => valuesFor(g)[0])).toEqual([
      '#0A322D', '#0E5C55', '#17766A', '#1F9B84', '#3EC29D',
    ]);
  });

  it('holds the validated dark ramp, which is selected rather than flipped', () => {
    const dark = GROUPS.map((g) => valuesFor(g)[1]);
    expect(dark).toEqual(['#8AE9BF', '#5FD8A8', '#3EBF93', '#2A9C7E', '#1E7C6C']);
    // Same order of groups, opposite direction of lightness: on a dark ground
    // the group carrying the most energy is the brightest.
    expect(dark).toEqual(GROUPS.map((g) => valuesFor(g)[2]));
  });

  it('does not reuse a service hue for an air system', () => {
    // Blue means cooling and orange means heating throughout the tool. An air
    // system wearing one of those would collide with the Sankey two panels away.
    const service = ['#2F9BD6', '#E2842F', '#A5588A', '#3ECF8E'];
    const ramp = GROUPS.flatMap(valuesFor).map((h) => h.toUpperCase());
    for (const hue of service) expect(ramp).not.toContain(hue);
  });
});
