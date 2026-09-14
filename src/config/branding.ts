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

/**
 * The studio footer's links — the same set, in the same order, as the footer on
 * peasestudio.com. Kept here beside the rest of the identity rather than
 * imported, because the site is a separate repo and a separate deploy.
 *
 * Privacy points at the studio's policy: one studio, one policy, and it already
 * covers the tools by saying nothing is collected anywhere.
 */
export type FooterLink = {
  readonly label: string;
  readonly href: string;
  /** Drawn inline. A deliberately closed set: a footer of icons is noise. */
  readonly icon?: 'coffee';
};

export const FOOTER_LINKS: readonly FooterLink[] = [
  { label: 'Privacy', href: 'https://peasestudio.com/privacy/' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/patrick-pease-eng/' },
  { label: 'GitHub', href: 'https://github.com/patpease' },
  { label: 'Email', href: 'mailto:peasestudio@gmail.com' },
  {
    label: 'Buy me a coffee',
    href: 'https://buymeacoffee.com/peasestudio',
    icon: 'coffee',
  },
];

/** Alias so SiteFooter.tsx is identical across the tools. */
export const STUDIO_NAME = BRAND.organisation;
