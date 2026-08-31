/**
 * How far off this method has been, on five real laboratory buildings.
 *
 * This is a DESCRIPTION, not a tolerance. There is no ± band here and there
 * must never be one: five projects establish a spread, not a precision, and a
 * stated envelope would be false precision inviting exactly the reading — that
 * the tool predicts a number — the whole design works to avoid.
 *
 * Note also that the source workbook's own "Average" cells average *signed*
 * errors, so an over-prediction cancels an under-prediction. That figure is not
 * an accuracy and is never reported here.
 */
import { dataset, getCase } from '../model/dataset.js';
import type { ZoneId } from '../model/types.js';

export interface Residual {
  readonly project: string;
  readonly designedEui: number;
  readonly estimatedEui: number;
  /** Signed: negative means the method came in below the designed EUI. */
  readonly errorFraction: number;
}

export interface Spread {
  readonly residuals: readonly Residual[];
  readonly lowest: number;
  readonly highest: number;
  readonly meanAbsolute: number;
  readonly medianAbsolute: number;
  readonly underPredicted: number;
  readonly count: number;
  /** One sentence, ready to render, that states the spread without implying a bound. */
  readonly statement: string;
}

const blend = (
  intensities: Readonly<Record<ZoneId, number>>,
  programme: Readonly<Record<ZoneId, number>>,
): number => {
  let energy = 0;
  let area = 0;
  for (const [zoneId, sf] of Object.entries(programme)) {
    energy += (intensities[zoneId] ?? 0) * sf;
    area += sf;
  }
  return area > 0 ? energy / area : 0;
};

const pct = (x: number) => `${Math.abs(x * 100).toFixed(0)}%`;

let cached: Spread | null = null;

/** Residuals recomputed against the baseline the tool actually ships. */
export function spread(): Spread {
  if (cached) return cached;

  const baseline = getCase('baseline');
  const intensities = Object.fromEntries(
    Object.entries(baseline.zones).map(([id, z]) => [id, z.eui]),
  );

  const residuals: Residual[] = dataset.validation.projects.map((project) => {
    const estimatedEui = blend(intensities, project.programme);
    return {
      project: project.name,
      designedEui: project.designedEui,
      estimatedEui,
      errorFraction: (estimatedEui - project.designedEui) / project.designedEui,
    };
  });

  const errors = residuals.map((r) => r.errorFraction);
  const absolute = errors.map(Math.abs).sort((a, b) => a - b);
  const mid = Math.floor(absolute.length / 2);
  const medianAbsolute = absolute.length % 2
    ? (absolute[mid] ?? 0)
    : ((absolute[mid - 1] ?? 0) + (absolute[mid] ?? 0)) / 2;

  const lowest = Math.min(...errors);
  const highest = Math.max(...errors);
  const underPredicted = errors.filter((e) => e < 0).length;

  cached = {
    residuals,
    lowest,
    highest,
    meanAbsolute: absolute.reduce((a, b) => a + b, 0) / absolute.length,
    medianAbsolute,
    underPredicted,
    count: residuals.length,
    statement:
      `Against ${residuals.length} real laboratory buildings this method has landed ` +
      `between ${pct(lowest)} below and ${pct(highest)} above the designed EUI, ` +
      `coming in low on ${underPredicted} of ${residuals.length}.`,
  };
  return cached;
}
