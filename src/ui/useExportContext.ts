import { useMemo } from 'react';
import type { Estimate } from '../engine/estimate.js';
import { getCase, getLocation } from '../model/dataset.js';

/**
 * The two lines every export carries.
 *
 * An exported chart is the version that reaches people who never saw the tool,
 * so the scope statement and the case it was drawn from are burned into the
 * artwork rather than left behind in the interface.
 */
export const EXPORT_SCOPE =
  'Early planning estimate. Linear approximation from simulated zone intensities — ' +
  'conveys an idea, does not predict a saving.';

export function useExportContext(result: Estimate) {
  return useMemo(() => {
    const simulation = getCase(result.caseId);
    const location = getLocation(result.locationId);
    const area = Math.round(result.totalArea).toLocaleString('en-US');
    return {
      scope: EXPORT_SCOPE,
      provenance:
        `${simulation.label} · ${location.label} (${location.climateZone}) · ${area} sf · ` +
        `${simulation.provenance.tool} ${simulation.provenance.completed} · zeel.peasestudio.com`,
      slug: `zeel-${result.caseId}`,
    };
  }, [result]);
}
