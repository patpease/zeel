/**
 * Worked examples, taken from the 2019 presentation rather than invented.
 *
 * Slides 34 to 42 do the whole argument by hand: a mid-size institutional
 * programme at 133, then two progressively reduced programmes reaching 75 and
 * 52. Shipping them as presets puts the study's own conclusion one click away —
 * that a laboratory's energy is decided by what is in the brief, and that the
 * targets get hard to reach while the special labs and the vivarium are still
 * in it.
 *
 * Every preset is 115,000 sf. That is the point: they differ only in what the
 * floor area is spent on.
 */
import type { ZoneId } from './types.js';

export interface Preset {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  /** What the study reported for this programme, kBtu/sf/yr. */
  readonly reportedEui: number | null;
  readonly source: string;
  readonly areas: Readonly<Record<ZoneId, number>>;
}

export const PRESETS: readonly Preset[] = [
  {
    id: 'institutional',
    label: 'Mid-size institutional',
    description:
      'The study’s base programme — a diverse brief representative of a mid-size ' +
      'institutional science building.',
    reportedEui: 133,
    source: '2019 presentation, slides 34–35',
    areas: {
      auditorium: 1600, atrium: 4770, boh: 23040, 'cafe-kitchen': 300,
      computational: 6720, office: 10420, restroom: 1000, classroom: 7500,
      corridor: 5790, 'mri-lab': 2550, 'nmr-lab': 1800, 'core-lab': 2750,
      'instruction-lab': 7140, 'open-lab-bio': 4500, 'open-lab-chem': 4500,
      'open-lab-general': 4500, 'support-lab-bio': 3000, 'support-lab-chem': 3000,
      'support-lab-general': 6500, 'write-up': 9000, vivarium: 4620,
    },
  },
  {
    id: 'toward-75',
    label: 'Reaching for 75',
    description:
      'Wet lab area cut roughly in half and the vivarium removed entirely, with the ' +
      'floor area moved into offices, teaching and computational space. The study’s ' +
      'note on this one: difficult to keep vivarium space, and the special labs need ' +
      'significant reduction.',
    reportedEui: 75,
    source: '2019 presentation, slides 39–40',
    areas: {
      auditorium: 1600, atrium: 4000, boh: 23000, 'cafe-kitchen': 400,
      computational: 12000, office: 16000, restroom: 2000, classroom: 12500,
      corridor: 14000, 'mri-lab': 2000, 'nmr-lab': 2000, 'core-lab': 2500,
      'instruction-lab': 3000, 'open-lab-bio': 2500, 'open-lab-chem': 1000,
      'open-lab-general': 2500, 'support-lab-bio': 2500, 'support-lab-chem': 1500,
      'support-lab-general': 2500, 'write-up': 7500, vivarium: 0,
    },
  },
  {
    id: 'toward-50',
    label: 'Reaching for 50',
    description:
      'NMR, chemistry labs and the vivarium gone altogether; core and support labs ' +
      'cut to a token. This is the programme the study used to make its closing ' +
      'point — at this target, the science that defines the building is what has to go.',
    reportedEui: 52,
    source: '2019 presentation, slides 41–42',
    areas: {
      auditorium: 1600, atrium: 2000, boh: 23000, 'cafe-kitchen': 400,
      computational: 11500, office: 28000, restroom: 2000, classroom: 12500,
      corridor: 14000, 'mri-lab': 2000, 'nmr-lab': 0, 'core-lab': 1000,
      'instruction-lab': 2000, 'open-lab-bio': 1500, 'open-lab-chem': 0,
      'open-lab-general': 1500, 'support-lab-bio': 1500, 'support-lab-chem': 0,
      'support-lab-general': 1500, 'write-up': 9000, vivarium: 0,
    },
  },
];

export const DEFAULT_PRESET_ID = 'institutional';

export const getPreset = (id: string): Preset => {
  const found = PRESETS.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown preset: ${id}`);
  return found;
};
