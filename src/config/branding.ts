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
  /**
   * Where that endorsement points. The tool sits on its own subdomain, so this
   * is the only route a reader — or a crawler — has back to the studio.
   */
  organisationUrl: 'https://peasestudio.com/',
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
  /**
   * Where the tool actually lives. Stamped on every export, so it has to be
   * the host that resolves — which is now the studio subdomain, not the
   * workers.dev address the beta launched on.
   */
  host: 'zeel.peasestudio.com',
  /**
   * The beta exists to find out whether anyone wants this, so it needs somewhere
   * to say so. Issues rather than an address: no public contact email has been
   * settled, and a mailto nobody reads is worse than no link.
   */
  feedbackUrl: 'https://github.com/patpease/zeel/issues',
} as const;
