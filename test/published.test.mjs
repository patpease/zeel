// Independent verification. These figures were read off the 2019 I2SL poster and
// presentation — published artefacts that were produced from the workbooks but
// live outside them. If the extraction pipeline drifts, these break.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(new URL('../data/dataset.json', import.meta.url)));
const caseById = Object.fromEntries(data.cases.map((c) => [c.id, c]));

/** Poster "ECM Results" table: zone EUI, rounded to whole kBtu/sf/yr. */
const POSTER_MEASURES = {
  //                    ECM1 ECM2 ECM3 ECM4 ECM5 ECM6
  'auditorium':          [169, 168, 170, 168, 169, 168],
  'atrium':              [ 64,  64,  56,  64,  58,  64],
  'boh':                 [ 12,  12,  12,  11,  12,  12],
  'cafe-kitchen':        [352, 340, 371, 342, 323, 348],
  'computational':       [ 34,  33,  34,  34,  32,  34],
  'office':              [ 39,  39,  41,  36,  38,  40],
  'restroom':            [ 38,  37,  28,  38,  25,  38],
  'classroom':           [ 42,  42,  38,  43,  39,  42],
  'corridor':            [ 15,  14,  14,  15,  14,  14],
  'mri-lab':             [144, 136, 145, 143, 144, 144],
  'nmr-lab':             [288, 278, 289, 289, 289, 288],
  'core-lab':            [304, 288, 303, 314, 316, 320],
  'instruction-lab':     [173, 145, 163, 169, 173, 172],
  'open-lab-bio':        [187, 201, 214, 227, 229, 231],
  'open-lab-chem':       [209, 212, 226, 236, 242, 237],
  'open-lab-general':    [196, 199, 203, 231, 227, 231],
  'support-lab-bio':     [320, 292, 314, 318, 320, 319],
  'support-lab-chem':    [338, 309, 329, 339, 340, 337],
  'support-lab-general': [330, 295, 318, 328, 325, 329],
  'write-up':            [ 44,  43,  39,  46,  43,  45],
  'vivarium':            [585, 499, 588, 584, 585, 583],
};
const MEASURE_ORDER = ['ecm-1-plugs', 'ecm-2-ach', 'ecm-3-writeup', 'ecm-4-glazing',
  'ecm-5-cascade', 'ecm-6-shading'];

/** Poster "Boston Results" table: baseline zone EUI. */
const POSTER_BASELINE = {
  'auditorium': 166, 'atrium': 63, 'boh': 12, 'cafe-kitchen': 322, 'computational': 33,
  'office': 38, 'restroom': 34, 'classroom': 42, 'corridor': 14, 'mri-lab': 142,
  'nmr-lab': 289, 'core-lab': 310, 'instruction-lab': 166, 'open-lab-bio': 223,
  'open-lab-chem': 236, 'open-lab-general': 226, 'support-lab-bio': 314,
  'support-lab-chem': 332, 'support-lab-general': 319, 'write-up': 45, 'vivarium': 624,
};

describe('the published poster', () => {
  it('reproduces every baseline zone EUI', () => {
    const b = caseById['baseline'];
    for (const [zoneId, published] of Object.entries(POSTER_BASELINE)) {
      expect(Math.abs(b.zones[zoneId].eui - published), zoneId).toBeLessThan(0.55);
    }
  });

  it('reproduces all 126 measure results', () => {
    let checked = 0;
    for (const [zoneId, row] of Object.entries(POSTER_MEASURES)) {
      row.forEach((published, i) => {
        const actual = caseById[MEASURE_ORDER[i]].zones[zoneId].eui;
        expect(Math.abs(actual - published), `${MEASURE_ORDER[i]}/${zoneId}`).toBeLessThan(0.55);
        checked++;
      });
    }
    expect(checked).toBe(126);
  });

  it('confirms ECM 4 reduces glazing rather than adding it', () => {
    // The workbook Read Me says the opposite. The poster labels this column
    // "Reduce Glazing" and the presentation sets the baseline at 60% WWR, so
    // two published sources agree against the spreadsheet's own note.
    const office = caseById['ecm-4-glazing'].zones['office'].eui;
    expect(office).toBeLessThan(caseById['baseline'].zones['office'].eui);
    expect(office).toBeCloseTo(35.58, 1);
  });
});

describe('the workbook summary tabs', () => {
  // The climate workbook's summary uses the prototype programme as-is.
  const CLIMATE_BLENDED = {
    'baseline': 133.00111304347826,
    'climate-6a': 140.23765217391303,
    'climate-4a': 134.65954086956521,
    // Repaired: the workbook's own summary reads 131.4512, computed from a fan
    // allocation that did not add up. See the Atlanta repair in dataset.test.mjs.
    'climate-3a': 131.28179130434785,
    'climate-5b': 133.07113913043477,
  };

  it('reproduces each climate zone blended EUI', () => {
    for (const [id, expected] of Object.entries(CLIMATE_BLENDED)) {
      expect(caseById[id].prototype.blendedEui, id).toBeCloseTo(expected, 10);
    }
  });

  // The measure workbook's summary uses the same programme with the office at
  // 20,000 sf instead of 10,420 — 124,580 sf in total.
  const MEASURE_PROGRAMME_OFFICE = 20000;
  const MEASURE_BLENDED = {
    'baseline': 125.7243848341852,
    'ecm-1-plugs': 122.52684298639416,
    'ecm-2-ach': 114.24735713008791,
    'ecm-3-writeup': 122.16717077236004,
    'ecm-4-glazing': 125.19259842783843,
    'ecm-5-cascade': 125.27786864957794,
    'ecm-6-shading': 126.48348431813389,
    'recm-1-no-turndown': 135.99692362823274,
  };

  /** The engine, in one line: area-weight the stored intensities. */
  const blend = (kase, programme) => {
    let energy = 0;
    let area = 0;
    for (const [zoneId, sf] of Object.entries(programme)) {
      energy += kase.zones[zoneId].eui * sf;
      area += sf;
    }
    return energy / area;
  };

  it('reproduces every measure result on the office-heavy programme', () => {
    const base = caseById['baseline'];
    const programme = Object.fromEntries(
      Object.entries(base.zones).map(([id, z]) => [id, id === 'office' ? MEASURE_PROGRAMME_OFFICE : z.area]),
    );
    expect(Object.values(programme).reduce((a, b) => a + b, 0)).toBe(124580);

    for (const [id, expected] of Object.entries(MEASURE_BLENDED)) {
      expect(blend(caseById[id], programme), id).toBeCloseTo(expected, 9);
    }
  });
});

describe('the validation set', () => {
  const blend = (intensities, programme) => {
    let energy = 0;
    let area = 0;
    for (const [zoneId, sf] of Object.entries(programme)) {
      energy += intensities[zoneId] * sf;
      area += sf;
    }
    return energy / area;
  };

  it('reproduces each published estimate from the sheet’s own baseline column', () => {
    for (const project of data.validation.projects) {
      const area = Object.values(project.programme).reduce((a, b) => a + b, 0);
      expect(area, `${project.name} area`).toBe(project.totalArea);
      expect(blend(data.validation.workbookBaselineEui, project.programme), project.name)
        .toBeCloseTo(project.workbookEstimatedEui, 6);
    }
  });

  it('holds a baseline column that is stale against the shipped 5A case', () => {
    // Kept as a fact about the source, not a failure: the special labs are the
    // clearest evidence, and it is why recomputed residuals differ from published.
    const shipped = caseById['baseline'].zones;
    expect(data.validation.workbookBaselineEui['nmr-lab']).toBeCloseTo(547.95, 1);
    expect(shipped['nmr-lab'].eui).toBeCloseTo(289.47, 1);
    expect(data.validation.workbookBaselineEui['mri-lab']).toBeCloseTo(179.80, 1);
    expect(shipped['mri-lab'].eui).toBeCloseTo(142.00, 1);
  });

  it('pins the residuals the shipped baseline actually produces', () => {
    const shipped = Object.fromEntries(
      Object.entries(caseById['baseline'].zones).map(([id, z]) => [id, z.eui]),
    );
    const expected = {
      'Boston Lab 1': -2.8, 'Boston Lab 2': -26.6, 'Western Mass Lab 1': -29.6,
      'RI Lab 1': -6.8, 'Maine Lab 1': 10.8,
    };
    for (const project of data.validation.projects) {
      const estimate = blend(shipped, project.programme);
      const errorPct = ((estimate - project.designedEui) / project.designedEui) * 100;
      expect(errorPct, project.name).toBeCloseTo(expected[project.name], 1);
    }
  });

  it('under-predicts on four of the five real buildings', () => {
    const shipped = Object.fromEntries(
      Object.entries(caseById['baseline'].zones).map(([id, z]) => [id, z.eui]),
    );
    const low = data.validation.projects
      .filter((p) => blend(shipped, p.programme) < p.designedEui);
    expect(low).toHaveLength(4);
  });

  it('has a mean ABSOLUTE error of 15.3%, not the 13% the workbook prints', () => {
    // The workbook's "Average" cell averages signed errors, so an over-prediction
    // cancels an under-prediction. That understates the spread and must not be
    // quoted as accuracy.
    const shipped = Object.fromEntries(
      Object.entries(caseById['baseline'].zones).map(([id, z]) => [id, z.eui]),
    );
    const errors = data.validation.projects.map((p) => {
      const estimate = blend(shipped, p.programme);
      return ((estimate - p.designedEui) / p.designedEui) * 100;
    });
    const meanAbs = errors.reduce((a, e) => a + Math.abs(e), 0) / errors.length;
    const meanSigned = errors.reduce((a, e) => a + e, 0) / errors.length;
    expect(meanAbs).toBeCloseTo(15.3, 1);
    expect(Math.abs(meanSigned)).toBeLessThan(meanAbs);
  });
});
