import { describe, it, expect } from 'vitest';
import {
  area, energy, eui, carbonIntensity, costIntensity,
  SQFT_TO_SQM, KBTU_TO_KWH, EUI_IP_TO_SI, BENCHMARKS_IP,
} from '../src/units/units.js';
import { estimate } from '../src/engine/estimate.js';
import { DEFAULT_PROGRAMME } from '../src/model/dataset.js';

describe('constants', () => {
  it('uses the exact definitions', () => {
    expect(SQFT_TO_SQM).toBe(0.09290304);
    expect(KBTU_TO_KWH).toBeCloseTo(0.29307107017222, 14);
    expect(EUI_IP_TO_SI).toBeCloseTo(3.1545907, 7);
  });

  it('converts the study’s headline into the other system', () => {
    // 133 kBtu/sf/yr is 420 kWh/m²/yr — the same building, a different landmark.
    expect(eui.toDisplay(133, 'si')).toBeCloseTo(419.6, 1);
    expect(area.toDisplay(115000, 'si')).toBeCloseTo(10683.85, 2);
  });
});

describe('round trips', () => {
  it('returns the original value through display and back', () => {
    for (const value of [0, 1, 133.00111304347826, 115000, 1e-6]) {
      for (const system of ['ip', 'si'] as const) {
        expect(area.fromDisplay(area.toDisplay(value, system), system)).toBeCloseTo(value, 9);
        expect(eui.fromDisplay(eui.toDisplay(value, system), system)).toBeCloseTo(value, 9);
      }
    }
  });

  it('leaves IP untouched', () => {
    expect(area.toDisplay(115000, 'ip')).toBe(115000);
    expect(eui.toDisplay(133, 'ip')).toBe(133);
    expect(energy.toDisplay(15295.128, 'ip')).toBe(15295.128);
  });
});

describe('labels', () => {
  it('names each unit in both systems', () => {
    expect(area.label('ip')).toBe('sf');
    expect(area.label('si')).toBe('m²');
    expect(eui.label('ip')).toBe('kBtu/sf/yr');
    expect(eui.label('si')).toBe('kWh/m²/yr');
    expect(energy.label('si')).toBe('MWh/yr');
    expect(carbonIntensity.label('si')).toBe('kg CO₂e/m²/yr');
    expect(costIntensity.label('si')).toBe('$/m²/yr');
  });
});

describe('the engine is unit-agnostic', () => {
  it('produces one answer, converted only for display', () => {
    // Entering the same building in m² must give the same kBtu/sf/yr internally.
    const inSqm = Object.fromEntries(
      Object.entries(DEFAULT_PROGRAMME).map(([id, sf]) => [id, area.toDisplay(sf, 'si')]),
    );
    const backToSqft = Object.fromEntries(
      Object.entries(inSqm).map(([id, m2]) => [id, area.fromDisplay(m2, 'si')]),
    );

    const original = estimate(DEFAULT_PROGRAMME, 'baseline');
    const roundTripped = estimate(backToSqft, 'baseline');
    expect(roundTripped.eui).toBeCloseTo(original.eui, 9);
    expect(roundTripped.totalArea).toBeCloseTo(original.totalArea, 6);
  });

  it('keeps intensity invariant while totals convert', () => {
    const result = estimate(DEFAULT_PROGRAMME, 'baseline');
    expect(eui.toDisplay(result.eui, 'si') / result.eui).toBeCloseTo(EUI_IP_TO_SI, 9);
    expect(energy.toDisplay(result.energy, 'si')).toBeCloseTo(result.energy * KBTU_TO_KWH, 6);
  });
});

describe('benchmarks', () => {
  it('puts the study’s building far above the net zero range', () => {
    const result = estimate(DEFAULT_PROGRAMME, 'baseline');
    expect(result.eui).toBeGreaterThan(BENCHMARKS_IP.netZeroHigh * 4);
  });

  it('puts it far below the i2SL laboratory mean', () => {
    const result = estimate(DEFAULT_PROGRAMME, 'baseline');
    expect(result.eui).toBeLessThan(BENCHMARKS_IP.i2slLabMean / 2);
  });
});
