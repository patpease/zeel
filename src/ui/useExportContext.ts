import { useMemo } from 'react';
import type { Estimate } from '../engine/estimate.js';
import { getCase, getLocation } from '../model/dataset.js';
import { paletteVariables } from '../charts/palettes.js';
import { BRAND } from '../config/branding.js';
import type { Palette } from '../charts/palettes.js';

/**
 * Everything an export needs that the chart itself does not know.
 *
 * Bundled rather than passed as four separate props, because the last time a
 * field was added here it had to be threaded through every chart by hand — and
 * the one that gets forgotten fails silently.
 */
export interface ExportContext {
  /** The one line that has to travel with the picture. */
  readonly scope: string;
  /** Which case, place and programme the chart was drawn from. */
  readonly provenance: string;
  readonly slug: string;
  /**
   * The chosen palette's **light** steps, applied inline to the export stage.
   *
   * Without these the export silently reverts to the default ramp. The palette
   * is set as custom properties on the document element, but the stage carries
   * `data-theme="light"` — which the stylesheet also targets, re-declaring
   * `--group-*` and out-ranking the inherited values. An inline style on the
   * stage beats both, and it has to be the light steps: the document element
   * holds the dark ones whenever the viewer is in dark mode.
   */
  readonly variables: readonly (readonly [string, string])[];
}

export const EXPORT_SCOPE =
  'Early planning estimate. Linear approximation from simulated zone intensities — ' +
  'conveys an idea, does not predict a saving.';

export function useExportContext(result: Estimate, palette: Palette): ExportContext {
  return useMemo(() => {
    const simulation = getCase(result.caseId);
    const location = getLocation(result.locationId);
    const area = Math.round(result.totalArea).toLocaleString('en-US');
    return {
      scope: EXPORT_SCOPE,
      provenance:
        `${simulation.label} · ${location.label} (${location.climateZone}) · ${area} sf · ` +
        `${simulation.provenance.tool} ${simulation.provenance.completed} · ${BRAND.host}`,
      slug: `zeel-${result.caseId}`,
      variables: paletteVariables(palette, 'light'),
    };
  }, [result, palette]);
}
