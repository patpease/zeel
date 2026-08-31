/**
 * Opinions about the programme as entered.
 *
 * These are **notes, not warnings**. A warning means the data is reporting a
 * defect; a note means the tool has a view about the brief. Sharing one colour
 * for both teaches a reader to dismiss both, so they stay separate here and in
 * the stylesheet.
 *
 * Every check states a fact from the current programme and stops. None of them
 * recommends anything: the tool's job is to make the shape of the problem
 * visible, not to design the building.
 */
import type { Estimate } from '../engine/estimate.js';
import { BENCHMARKS } from './benchmarks.js';

export interface Check {
  readonly id: string;
  readonly text: string;
}

const pct = (fraction: number) => `${Math.round(fraction * 100)}%`;

export function checksFor(result: Estimate): Check[] {
  const checks: Check[] = [];
  if (result.totalArea <= 0) return checks;

  const share = (groupIds: string[]) => {
    const zones = result.zones.filter((z) => groupIds.includes(z.fanGroup));
    return {
      area: zones.reduce((a, z) => a + z.shareOfArea, 0),
      energy: zones.reduce((a, z) => a + z.shareOfEnergy, 0),
    };
  };

  const labs = share(['lab', 'special-lab', 'vivarium']);
  if (labs.area > 0) {
    checks.push({
      id: 'lab-share',
      text:
        `Laboratory space is ${pct(labs.area)} of the floor area and ${pct(labs.energy)} of ` +
        `the energy. That gap is the reason zoning a laboratory is an energy decision.`,
    });
  }

  const vivarium = result.zones.find((z) => z.zoneId === 'vivarium');
  if (vivarium && vivarium.shareOfEnergy > 0.05) {
    checks.push({
      id: 'vivarium',
      text:
        `The vivarium is ${pct(vivarium.shareOfArea)} of the area and ` +
        `${pct(vivarium.shareOfEnergy)} of the energy. It runs continuously at twelve air ` +
        `changes an hour and never turns down.`,
    });
  }

  const distance = result.eui / BENCHMARKS.netZero.high;
  if (result.eui > BENCHMARKS.netZero.high) {
    checks.push({
      id: 'net-zero',
      text:
        `At ${result.eui.toFixed(0)} kBtu/sf/yr this programme is about ` +
        `${distance.toFixed(1)}× the ${BENCHMARKS.netZero.low}–${BENCHMARKS.netZero.high} ` +
        `range that onsite renewables can offset.`,
    });
  } else {
    checks.push({
      id: 'net-zero-within',
      text:
        `At ${result.eui.toFixed(0)} kBtu/sf/yr this programme is within the range onsite ` +
        `renewables can plausibly offset — which, for a laboratory, is unusual enough to check.`,
    });
  }

  /*
   * The study's closing point, stated only when the programme actually shows it.
   * Keyed on the share of floor area the four heaviest space types hold, not on
   * their being absent outright — the study's own 50 EUI programme keeps a token
   * core lab, so a test for absence would never fire on the case it describes.
   */
  const HEAVY: Readonly<Record<string, string>> = {
    'nmr-lab': 'the NMR lab',
    'core-lab': 'core labs',
    'support-lab-chem': 'chemistry support',
    vivarium: 'the vivarium',
  };
  const heavyIds = Object.keys(HEAVY);
  const heavyArea = result.zones
    .filter((z) => heavyIds.includes(z.zoneId))
    .reduce((a, z) => a + z.shareOfArea, 0);
  const absent = heavyIds.filter((id) => !result.zones.some((z) => z.zoneId === id));

  if (result.eui < 90 && heavyArea < 0.06) {
    const gone = absent.map((id) => HEAVY[id]).filter(Boolean);
    const list = gone.length > 1
      ? `${gone.slice(0, -1).join(', ')} and ${gone[gone.length - 1]}`
      : gone[0];
    checks.push({
      id: 'what-went',
      text:
        (gone.length > 0
          ? `Reaching this figure has meant leaving out ${list}, with what remains of the `
          : 'Reaching this figure has meant cutting the ') +
        `heaviest space types down to ${pct(heavyArea)} of the floor area. That was the ` +
        `study’s conclusion too: below about 75, the science that defines the building is ` +
        `what has to go.`,
    });
  }

  const plug = result.endUses.find((u) => u.id === 'plug');
  if (plug && plug.share > 0.3) {
    checks.push({
      id: 'plug',
      text:
        `Plug and process load is ${pct(plug.share)} of the total — larger than heating, ` +
        `cooling and fans combined. It is the one end use no envelope measure touches.`,
    });
  }

  return checks;
}
