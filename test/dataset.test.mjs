// Internal consistency: the dataset must agree with itself.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(new URL('../data/dataset.json', import.meta.url)));
const caseById = Object.fromEntries(data.cases.map((c) => [c.id, c]));
const close = (a, b, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThan(tol);

describe('shape', () => {
  it('holds the twelve simulated cases', () => {
    expect(data.cases).toHaveLength(12);
    expect(data.cases.every((c) => c.provenance.kind === 'simulated')).toBe(true);
  });

  it('describes all 21 zones in every case', () => {
    for (const c of data.cases) {
      expect(Object.keys(c.zones)).toHaveLength(21);
      for (const z of data.zones) expect(c.zones[z.id]).toBeDefined();
    }
  });

  it('carries five locations, none of them California 3C', () => {
    expect(data.locations).toHaveLength(5);
    expect(data.locations.map((l) => l.climateZone).sort()).toEqual(['3A', '4A', '5A', '5B', '6A']);
  });

  it('points every study at cases that exist', () => {
    for (const s of data.studies) for (const id of s.caseIds) expect(caseById[id]).toBeDefined();
  });

  it('keeps every measure case at 5A Boston — nothing is interpolated across climate', () => {
    const measure = data.studies.find((s) => s.id === 'measure');
    for (const id of measure.caseIds) expect(caseById[id].locationId).toBe('boston-5a');
  });
});

describe('per-zone arithmetic', () => {
  it('sums electricity from its five components', () => {
    for (const c of data.cases) {
      for (const [zoneId, z] of Object.entries(c.zones)) {
        const parts = z.roomElectricity + z.fanElectricity + z.heatingElectricity +
          z.chwPumpElectricity + z.chillerElectricity;
        expect(Math.abs(parts - z.totalElectricity), `${c.id}/${zoneId}`).toBeLessThan(1e-6);
      }
    }
  });

  it('takes gas entirely from the boiler column', () => {
    for (const c of data.cases) {
      for (const [zoneId, z] of Object.entries(c.zones)) {
        expect(Math.abs(z.heatingGas - z.totalGas), `${c.id}/${zoneId}`).toBeLessThan(1e-6);
      }
    }
  });

  it('derives EUI from energy over area', () => {
    for (const c of data.cases) {
      for (const [zoneId, z] of Object.entries(c.zones)) {
        const eui = ((z.totalElectricity + z.totalGas) * 1000) / z.area;
        expect(Math.abs(eui - z.eui), `${c.id}/${zoneId}`).toBeLessThan(1e-6);
      }
    }
  });
});

describe('allocation shares', () => {
  it('splits heating, cooling and hot water across the zones exactly once', () => {
    for (const c of data.cases) {
      for (const key of ['heatingShare', 'coolingShare', 'dhwShare']) {
        const total = Object.values(c.zones).reduce((a, z) => a + z[key], 0);
        expect(Math.abs(total - 1), `${c.id}/${key}`).toBeLessThan(1e-9);
      }
    }
  });

  it('splits fan energy across the zones within each air system', () => {
    // No exemptions any more: Atlanta was the one case that failed this, and it
    // is repaired rather than excused.
    for (const c of data.cases) {
      const byGroup = {};
      for (const z of Object.values(c.zones)) byGroup[z.fanGroup] = (byGroup[z.fanGroup] ?? 0) + z.fanShare;
      for (const [group, total] of Object.entries(byGroup)) {
        expect(Math.abs(total - 1), `${c.id}/${group}`).toBeLessThan(1e-9);
      }
    }
  });

  it('conserves fan energy between plant and zones', () => {
    for (const c of data.cases) {
      const zoneFans = Object.values(c.zones).reduce((a, z) => a + z.fanElectricity, 0);
      const plantFans = c.plant.labFans + c.plant.generalFans + c.plant.vivariumFans +
        c.plant.specialLabFans + c.plant.auditoriumFans;
      expect(Math.abs(zoneFans - plantFans), c.id).toBeLessThan(1e-6);
    }
  });
});

describe('the Atlanta repair', () => {
  it('leaves every case auditing clean', () => {
    const flagged = data.cases.filter((c) => c.dataQuality.length).map((c) => c.id);
    expect(flagged).toEqual([]);
  });

  it('is recorded on the case rather than applied silently', () => {
    const repaired = data.cases.filter((c) => c.repairs.length).map((c) => c.id);
    expect(repaired).toEqual(['climate-3a']);

    const [repair] = caseById['climate-3a'].repairs;
    expect(repair.code).toBe('fan-allocation');
    expect(repair.detail).toMatch(/write-up from general to lab/);
  });

  it('puts write-up back on the lab air system, as every other case has it', () => {
    for (const c of data.cases) {
      // ECM 3 is the case that deliberately moves it, and only that one.
      const expected = c.id === 'ecm-3-writeup' ? 'general' : 'lab';
      expect(c.zones['write-up'].fanGroup, c.id).toBe(expected);
    }
  });

  it('moves the building barely, and the zones materially', () => {
    const [repair] = caseById['climate-3a'].repairs;
    expect(repair.euiBefore).toBeCloseTo(131.4512, 3);
    expect(repair.euiAfter).toBeCloseTo(131.2818, 3);
    // 0.13% at the building scale — and the reason to repair it anyway is that
    // Atlanta's general zones were each carrying about a fifth too little.
    expect(Math.abs(repair.euiAfter / repair.euiBefore - 1)).toBeLessThan(0.002);
  });
});

describe('prototype totals', () => {
  it('matches the 115,000 sf prototype in every case', () => {
    for (const c of data.cases) {
      const area = Object.values(c.zones).reduce((a, z) => a + z.area, 0);
      expect(area, c.id).toBe(115000);
      close(area, c.prototype.totalArea);
    }
  });

  it('reconciles the Boston baseline to the workbook total of 15,295 MBtu', () => {
    const b = caseById['baseline'];
    const energy = Object.values(b.zones).reduce((a, z) => a + z.totalElectricity + z.totalGas, 0);
    expect(energy).toBeCloseTo(15295.128, 3);
    expect(b.prototype.blendedEui).toBeCloseTo(133.00111304347826, 10);
  });
});
