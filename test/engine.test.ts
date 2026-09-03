import { describe, it, expect } from 'vitest';
import { estimate, compare } from '../src/engine/estimate.js';
import { spread } from '../src/engine/spread.js';
import { dataset, getCase, DEFAULT_PROGRAMME } from '../src/model/dataset.js';
import type { Programme, ZoneId } from '../src/model/types.js';

const prototypeProgramme = DEFAULT_PROGRAMME;

describe('the default programme', () => {
  it('is the study’s own 115,000 sf worked example', () => {
    const total = Object.values(prototypeProgramme).reduce((a, b) => a + b, 0);
    expect(total).toBe(115000);
  });

  it('reproduces the published blended EUI of 133', () => {
    const result = estimate(prototypeProgramme, 'baseline');
    expect(result.eui).toBeCloseTo(133.00111304347826, 10);
  });
});

describe('scaling', () => {
  it('leaves EUI unchanged when every area is scaled by the same factor', () => {
    const doubled = Object.fromEntries(
      Object.entries(prototypeProgramme).map(([id, sf]) => [id, sf * 2]),
    ) as Programme;
    const base = estimate(prototypeProgramme, 'baseline');
    const scaled = estimate(doubled, 'baseline');

    expect(scaled.eui).toBeCloseTo(base.eui, 10);
    expect(scaled.energy).toBeCloseTo(base.energy * 2, 6);
    expect(scaled.carbon).toBeCloseTo(base.carbon * 2, 6);
    expect(scaled.carbonIntensity).toBeCloseTo(base.carbonIntensity, 12);
  });

  it('scales one zone linearly and leaves the others alone', () => {
    const base = estimate(prototypeProgramme, 'baseline');
    const more = estimate({ ...prototypeProgramme, vivarium: 9240 }, 'baseline');
    const vivBase = base.zones.find((z) => z.zoneId === 'vivarium')!;
    const vivMore = more.zones.find((z) => z.zoneId === 'vivarium')!;

    expect(vivMore.energy).toBeCloseTo(vivBase.energy * 2, 6);
    expect(vivMore.eui).toBeCloseTo(vivBase.eui, 12);
    const officeBase = base.zones.find((z) => z.zoneId === 'office')!;
    const officeMore = more.zones.find((z) => z.zoneId === 'office')!;
    expect(officeMore.energy).toBeCloseTo(officeBase.energy, 12);
  });

  it('contributes nothing for a zone at zero area', () => {
    const withoutVivarium: Programme = { ...prototypeProgramme, vivarium: 0 };
    const result = estimate(withoutVivarium, 'baseline');
    expect(result.zones.some((z) => z.zoneId === 'vivarium')).toBe(false);
    expect(result.totalArea).toBe(115000 - 4620);
    // Removing 19% of the energy from 4% of the area pulls the EUI down hard:
    // 133.0 to 112.4, a 15% drop for a 4% change in floor area.
    expect(result.eui).toBeCloseTo(112.436, 3);
    expect(result.eui).toBeLessThan(estimate(prototypeProgramme, 'baseline').eui * 0.86);
  });

  it('returns a zeroed result rather than dividing by zero on an empty programme', () => {
    const result = estimate({}, 'baseline');
    expect(result.totalArea).toBe(0);
    expect(result.eui).toBe(0);
    expect(result.zones).toEqual([]);
  });
});

describe('decomposition', () => {
  it('splits energy into end uses that sum back to the total', () => {
    for (const c of dataset.cases) {
      const result = estimate(prototypeProgramme, c.id);
      const sum = result.endUses.reduce((a, u) => a + u.energy, 0);
      expect(sum, c.id).toBeCloseTo(result.energy, 6);
      expect(result.endUses.reduce((a, u) => a + u.share, 0), c.id).toBeCloseTo(1, 10);
    }
  });

  it('splits energy into fan groups that sum back to the total', () => {
    const result = estimate(prototypeProgramme, 'baseline');
    const sum = result.fanGroups.reduce((a, g) => a + g.energy, 0);
    expect(sum).toBeCloseTo(result.energy, 6);
  });

  it('splits energy into two fuels that sum back to the total', () => {
    const result = estimate(prototypeProgramme, 'baseline');
    expect(result.fuels[0]!.energy + result.fuels[1]!.energy).toBeCloseTo(result.energy, 9);
  });

  it('reconciles the Boston baseline to the workbook’s 15,295 MBtu', () => {
    const result = estimate(prototypeProgramme, 'baseline');
    expect(result.energy).toBeCloseTo(15295.128, 3);
    expect(result.electricity).toBeCloseTo(13971.136, 2);
    expect(result.gas).toBeCloseTo(1323.992, 2);
  });
});

describe('the finding the tool exists to show', () => {
  it('puts 47% of the area against 87% of the energy in lab-type zones', () => {
    const result = estimate(prototypeProgramme, 'baseline');
    const labGroups = new Set(['lab', 'special-lab', 'vivarium']);
    const labZones = result.zones.filter((z) => labGroups.has(z.fanGroup));

    const areaShare = labZones.reduce((a, z) => a + z.shareOfArea, 0);
    const energyShare = labZones.reduce((a, z) => a + z.shareOfEnergy, 0);

    expect(areaShare).toBeCloseTo(0.468, 3);
    expect(energyShare).toBeCloseTo(0.869, 3);
  });

  it('makes the vivarium 4% of area and 19% of energy', () => {
    const result = estimate(prototypeProgramme, 'baseline');
    const viv = result.zones.find((z) => z.zoneId === 'vivarium')!;
    expect(viv.shareOfArea).toBeCloseTo(0.0402, 4);
    expect(viv.shareOfEnergy).toBeCloseTo(0.1886, 4);
  });
});

describe('carbon and cost', () => {
  it('uses the location attached to the case', () => {
    const boston = estimate(prototypeProgramme, 'baseline');
    const denver = estimate(prototypeProgramme, 'climate-5b');
    expect(boston.locationId).toBe('boston-5a');
    expect(denver.locationId).toBe('denver-5b');
  });

  it('shows Denver at similar energy but far worse carbon than Boston', () => {
    // The 2019 study's sharpest carbon point: a similar EUI on a dirtier grid.
    const boston = estimate(prototypeProgramme, 'baseline');
    const denver = estimate(prototypeProgramme, 'climate-5b');
    expect(Math.abs(denver.eui - boston.eui)).toBeLessThan(1);
    expect(denver.carbonIntensity / boston.carbonIntensity).toBeGreaterThan(1.5);
  });

  it('recomputes rather than storing, so a rate change moves the answer', () => {
    const boston = estimate(prototypeProgramme, 'baseline');
    const halved = estimate(prototypeProgramme, 'baseline', {
      location: {
        ...dataset.locations.find((l) => l.id === 'boston-5a')!,
        rates: {
          ...dataset.locations.find((l) => l.id === 'boston-5a')!.rates,
          electricityCarbonMtPerMbtu:
            dataset.locations.find((l) => l.id === 'boston-5a')!.rates.electricityCarbonMtPerMbtu / 2,
        },
      },
    });
    expect(halved.carbon).toBeLessThan(boston.carbon);
    expect(halved.energy).toBeCloseTo(boston.energy, 9);
  });
});

describe('comparison', () => {
  it('finds air change rate the strongest measure, and shading a regression', () => {
    const ach = compare(prototypeProgramme, 'baseline', 'ecm-2-ach');
    const shade = compare(prototypeProgramme, 'baseline', 'ecm-6-shading');
    expect(ach.deltaFraction).toBeLessThan(-0.08);
    expect(shade.deltaFraction).toBeGreaterThan(0);
  });

  it('prices night turndown at roughly what the best measure buys', () => {
    // Losing the overnight setback costs 8.6%; the strongest measure in the set
    // — dropping labs from 6 to 4 air changes — buys 9.4%. A control the owner
    // already has is worth about as much as the biggest thing they could do.
    const reverse = compare(prototypeProgramme, 'baseline', 'recm-1-no-turndown');
    const best = compare(prototypeProgramme, 'baseline', 'ecm-2-ach');

    expect(reverse.deltaFraction).toBeCloseTo(0.0858, 4);
    expect(best.deltaFraction).toBeCloseTo(-0.0941, 4);
    expect(reverse.deltaFraction / Math.abs(best.deltaFraction)).toBeGreaterThan(0.85);
  });

  it('makes the reverse measure the only case that costs energy', () => {
    const measures = dataset.studies.find((s) => s.id === 'measure')!.caseIds
      .filter((id) => id !== 'baseline');
    const worse = measures.filter(
      (id) => compare(prototypeProgramme, 'baseline', id).deltaFraction > 0.01,
    );
    expect(worse).toEqual(['recm-1-no-turndown']);
  });

  it('ranks zones by how hard they move, not by size', () => {
    const ach = compare(prototypeProgramme, 'baseline', 'ecm-2-ach');
    const moved = Math.abs(ach.zones[0]!.deltaFraction);
    const last = Math.abs(ach.zones[ach.zones.length - 1]!.deltaFraction);
    expect(moved).toBeGreaterThan(last);
    // Reducing air changes should bite hardest where the air changes are.
    expect(['vivarium', 'instruction-lab']).toContain(ach.zones[0]!.zoneId);
  });

  it('leaves the programme out of it — deltas hold on any programme', () => {
    const officeHeavy: Programme = { office: 50000, 'open-lab-general': 10000 };
    const c = compare(officeHeavy, 'baseline', 'ecm-2-ach');
    expect(c.zones.every((z) => z.baseEui > 0)).toBe(true);
    expect(c.other.totalArea).toBe(60000);
  });
});

describe('caveats and repairs', () => {
    it('carries no caveats at all, now that Atlanta is repaired', () => {
    for (const c of dataset.cases) {
      expect(estimate(prototypeProgramme, c.id).caveats, c.id).toEqual([]);
    }
  });

  it('carries Atlanta’s repair through to the result', () => {
    const atlanta = estimate(prototypeProgramme, 'climate-3a');
    expect(atlanta.repairs.length).toBe(1);
    expect(atlanta.repairs[0]).toMatch(/rederived from airflow/i);
  });

  it('leaves every other case unrepaired', () => {
    for (const c of dataset.cases) {
      if (c.id === 'climate-3a') continue;
      expect(estimate(prototypeProgramme, c.id).repairs, c.id).toEqual([]);
    }
  });
});

describe('spread', () => {
  const s = spread();

  it('describes five real buildings', () => {
    expect(s.count).toBe(5);
    expect(s.underPredicted).toBe(4);
  });

  it('reports mean ABSOLUTE error, never the workbook’s signed average', () => {
    expect(s.meanAbsolute).toBeCloseTo(0.153, 3);
    const signed = s.residuals.reduce((a, r) => a + r.errorFraction, 0) / s.count;
    expect(Math.abs(signed)).toBeLessThan(s.meanAbsolute);
  });

  it('states a range rather than a tolerance', () => {
    expect(s.lowest).toBeCloseTo(-0.296, 3);
    expect(s.highest).toBeCloseTo(0.108, 3);
    expect(s.statement).toContain('between');
    expect(s.statement).not.toMatch(/±/);
  });
});
