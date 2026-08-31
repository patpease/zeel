/**
 * Branding — the single source of truth, mirroring Psychrometric Studio's
 * `config/branding.ts` so the two tools stay in step.
 *
 * Every branded surface reads from here: app chrome, and later the stamp applied
 * to SVG, PNG and CSV exports.
 */
export const APP_VERSION = '0.1.0';

export const BRAND = {
  /** The parent identity, shown as an endorsement above the product name. */
  organisation: 'Pease Studio',
  appName: 'ZEEL',
  /**
   * Psychrometric Studio's tagline is a positioning line because its name
   * already explains itself. ZEEL's does not, so the slot spends itself on the
   * expansion instead — the scope statement below the header does the
   * positioning work.
   */
  tagline: 'Zoned Energy Estimator for Labs',
  /** Provisional until the real tile is drawn; see src/ui/mark.svg. */
  markIsPlaceholder: true,
} as const;
