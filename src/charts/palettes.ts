/**
 * Chart palettes the reader can choose between.
 *
 * ## Where these come from, and why not from paletteer directly
 *
 * paletteer is a convenient index of R colour palettes, but the package itself
 * is **GPL-3**. Copying palette data out of it would arguably carry that licence
 * into this MIT-licensed project. Every value below is therefore taken from the
 * **original source package**, each of which is independently MIT licensed —
 * paletteer was used only as a catalogue to find them. See THIRD-PARTY-NOTICES.md.
 *
 * ## Why most of them are re-stepped rather than reproduced
 *
 * Artistic palettes are not data palettes. Run the source palettes through the
 * accessibility checks and they fail, not marginally but badly: nord's `frost`
 * puts adjacent colours 2.9 ΔE apart and wesanderson's `Royal2` 7.2, where 15 is
 * the floor at which a reader with *full* colour vision can still tell two
 * neighbouring segments apart. Shipping them raw would look charming and encode
 * nothing.
 *
 * So each palette below keeps its source's hue family and is re-stepped into an
 * ordinal ramp — which is also the right form for this data, since the air
 * systems are genuinely ordered by the energy they carry. `okabe-ito` is the
 * exception: it was designed for exactly this job and ships verbatim.
 *
 * ## Every ramp here is validated, not eyeballed
 *
 * Each passes the data-viz checks against its own surface, in both modes:
 *
 *   node validate_palette.js "<hex,...>" --mode light --ordinal
 *   node validate_palette.js "<hex,...>" --mode dark --surface "#171e26" --ordinal
 *
 * If you change a step, re-run the checker. Do not adjust the test to match.
 */
import { GROUP_ORDER } from '../model/groups.js';

export type PaletteKind = 'ordinal' | 'categorical';

export interface Palette {
  readonly id: string;
  readonly label: string;
  readonly kind: PaletteKind;
  /** Where the colours came from, shown in the interface. */
  readonly source: string;
  readonly licence: string;
  /** Whether the source palette is reproduced or its hues re-stepped. */
  readonly derivation: 'verbatim' | 're-stepped';
  readonly note: string;
  /** Five steps, in GROUP_ORDER. Colour follows the entity, never its rank. */
  readonly light: readonly [string, string, string, string, string];
  readonly dark: readonly [string, string, string, string, string];
}

export const DEFAULT_PALETTE_ID = 'pease-studio';

export const PALETTES: readonly Palette[] = [
  {
    id: 'pease-studio',
    label: 'Pease Studio',
    kind: 'ordinal',
    source: 'Pease Studio design system',
    licence: 'In-house',
    derivation: 'verbatim',
    note: 'The studio’s identity green, stepped by the energy each air system carries.',
    light: ['#0A322D', '#0E5C55', '#17766A', '#1F9B84', '#3EC29D'],
    dark: ['#8AE9BF', '#5FD8A8', '#3EBF93', '#2A9C7E', '#1E7C6C'],
  },
  {
    id: 'okabe-ito',
    label: 'Okabe–Ito',
    kind: 'categorical',
    source: 'colorblindr (Claus O. Wilke)',
    licence: 'MIT',
    derivation: 'verbatim',
    note: 'The reference colourblind-safe set, reproduced exactly. Distinct hues rather than one ramp.',
    // Identical in both modes, and deliberately so. A lightened dark variant was
    // tried first and failed outright — two of its warm steps landed 14.3 apart
    // where 15 is the floor. The published set clears the dark surface at 3:1 or
    // better, with CVD separation 11.4 and a normal-vision floor of 15.6.
    //
    // One soft flag is accepted rather than fixed: two warm steps sit just above
    // the dark-mode lightness band. Altering them would defeat the point of
    // offering this palette, whose whole value is being the reference set exactly.
    light: ['#0072B2', '#009E73', '#E69F00', '#D55E00', '#CC79A7'],
    dark: ['#0072B2', '#009E73', '#E69F00', '#D55E00', '#CC79A7'],
  },
  {
    id: 'zissou',
    label: 'Zissou',
    kind: 'ordinal',
    source: 'wesanderson::Zissou1 (Karthik Ram)',
    licence: 'MIT',
    derivation: 're-stepped',
    note: 'The deep-water blues of Zissou1, re-stepped so neighbouring bands stay apart.',
    light: ['#0B3A46', '#14586B', '#1E7A92', '#2F9AB4', '#5FBFD6'],
    dark: ['#A9E2F0', '#78C9DE', '#4FA9C2', '#33839C', '#256777'],
  },
  {
    id: 'aurora',
    label: 'Aurora',
    kind: 'ordinal',
    source: 'nord::aurora (Jake Kaupp)',
    licence: 'MIT',
    derivation: 're-stepped',
    note: 'Aurora’s muted rose, re-stepped into an ordered ramp.',
    light: ['#5A1E24', '#7E2C35', '#A64450', '#C86470', '#DE8B94'],
    dark: ['#F2C0C4', '#E29AA2', '#CC7681', '#AE5763', '#8C3E49'],
  },
  {
    id: 'victory',
    label: 'Victory',
    kind: 'ordinal',
    source: 'nord::victory_bonds (Jake Kaupp)',
    licence: 'MIT',
    derivation: 're-stepped',
    note: 'The navy end of victory_bonds, re-stepped.',
    light: ['#101C3A', '#1B2E5C', '#2A4585', '#3D5FA8', '#5B7FC4'],
    dark: ['#C6D6F2', '#9DB6E2', '#7793CC', '#5872AE', '#42568C'],
  },
  {
    id: 'fantastic-fox',
    label: 'Fantastic Fox',
    kind: 'ordinal',
    source: 'wesanderson::FantasticFox1 (Karthik Ram)',
    licence: 'MIT',
    derivation: 're-stepped',
    note: 'FantasticFox1’s amber, re-stepped into an ordered ramp.',
    light: ['#4A2A06', '#6E4009', '#96590C', '#BE7412', '#DE9530'],
    dark: ['#F5D08A', '#E5AE55', '#CC8C2E', '#A86E1C', '#855613'],
  },
];

export const getPalette = (id: string): Palette =>
  PALETTES.find((p) => p.id === id) ?? PALETTES[0]!;

/** The custom properties the charts read, in the order the groups are fixed in. */
export const paletteVariables = (palette: Palette, theme: 'light' | 'dark'): [string, string][] =>
  GROUP_ORDER.map((groupId, i) => [`--group-${groupId}`, palette[theme][i]!] as [string, string]);
