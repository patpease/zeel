#!/usr/bin/env node
// Turn the two 2019 workbooks into data/dataset.json.
//
// Everything is located by the text on the sheet, never by hard-coded cell
// coordinates, so a workbook whose layout has moved fails loudly here instead
// of quietly extracting the wrong column.

import { writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Workbook, str, num, findLabel, headerMap } from './xlsx.mjs';
import {
  ZONES, FAN_GROUPS, LOCATIONS, CASES, PLANT_ITEMS, ZONE_COLUMNS, END_USES,
  CLIMATE_WORKBOOK, MEASURE_WORKBOOK, RATE_VINTAGE,
} from './cases.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SOURCE_DIR = join(ROOT, 'source');
const OUT = join(ROOT, 'data', 'dataset.json');

const MBTU_TO_KBTU = 1000;
const LB_PER_MWH_TO_MT_PER_MBTU = 1.328e-4; // as used on the Conversions sheet
const KWH_PER_MBTU = 318.2544381;
const problems = [];

const openWorkbook = (file) => {
  const path = join(SOURCE_DIR, file);
  if (!existsSync(path)) {
    console.error(`\nMissing input: source/${file}`);
    console.error('The 2019 workbooks are not committed. See docs/extraction.md.\n');
    process.exit(1);
  }
  return new Workbook(path);
};

// ---------------------------------------------------------------- case sheets

/** Read one case sheet: 21 zone rows plus the building-wide plant block. */
function readCaseSheet(wb, sheetName) {
  const cells = wb.cells(sheetName);

  const header = findLabel(cells, 'Zone Name', { columns: ['C', 'D', 'E'] });
  const columns = headerMap(cells, header.row);

  // Resolve each wanted column to a letter, accepting the synonyms the 2019
  // sheets use interchangeably.
  const colFor = {};
  for (const spec of ZONE_COLUMNS) {
    const found = [spec.header, ...(spec.aliases ?? [])].find((h) => columns[h]);
    if (!found) {
      const tried = [spec.header, ...(spec.aliases ?? [])].join('" / "');
      throw new Error(`${sheetName}: no "${tried}" column under row ${header.row}`);
    }
    colFor[spec.key] = columns[found];
  }
  const nameCol = columns['Zone Name'];
  const fanCol = columns['Fan System'];
  if (!nameCol || !fanCol) throw new Error(`${sheetName}: missing Zone Name or Fan System column`);

  // Zone rows run from under the header down to the "Total" row.
  const byName = new Map();
  let totalRow = null;
  for (let row = header.row + 1; row <= header.row + 40; row++) {
    const name = str(cells, `${nameCol}${row}`);
    if (!name) continue;
    if (name === 'Total' || name === 'Totals') { totalRow = row; break; }
    byName.set(name, { row, fanSystem: str(cells, `${fanCol}${row}`) });
  }
  if (!totalRow) throw new Error(`${sheetName}: no Total row found`);

  const zones = {};
  for (const zone of ZONES) {
    const hit = byName.get(zone.sheetName);
    if (!hit) throw new Error(`${sheetName}: zone row "${zone.sheetName}" not found`);
    const group = FAN_GROUPS[hit.fanSystem];
    if (!group) throw new Error(`${sheetName}: unknown fan system "${hit.fanSystem}" on ${zone.sheetName}`);

    const record = { fanGroup: group.id };
    for (const { key } of ZONE_COLUMNS) record[key] = num(cells, `${colFor[key]}${hit.row}`);
    zones[zone.id] = record;
  }
  if (byName.size !== ZONES.length) {
    problems.push(`${sheetName}: sheet has ${byName.size} zone rows, expected ${ZONES.length}`);
  }

  // Building-wide plant totals, labelled in column B with values in column C.
  const plant = {};
  for (const item of PLANT_ITEMS) {
    const at = findLabel(cells, item.label, { columns: ['B'], maxRow: header.row + 30 });
    plant[item.id] = num(cells, `C${at.row}`);
  }

  const totals = {
    area: num(cells, `${colFor.area}${totalRow}`),
    electricity: num(cells, `${colFor.totalElectricity}${totalRow}`),
    gas: num(cells, `${colFor.totalGas}${totalRow}`),
  };

  return { zones, plant, totals, headerRow: header.row };
}

/**
 * Audit one case against the arithmetic it claims to follow. Findings are
 * recorded on the case rather than thrown, because the 2019 workbooks are a
 * published result: the job here is to carry their defects forward visibly, not
 * to quietly repair them.
 */
function auditCase(sheetName, { zones, plant }) {
  const findings = [];
  const TOL = 1e-9;

  // Every allocation share must distribute exactly one whole plant item.
  for (const key of ['heatingShare', 'coolingShare', 'dhwShare']) {
    const sum = Object.values(zones).reduce((a, z) => a + z[key], 0);
    if (Math.abs(sum - 1) > TOL) {
      findings.push({
        code: 'share-does-not-sum',
        detail: `${key} across all zones sums to ${sum}, not 1`,
        magnitude: sum - 1,
      });
    }
  }

  // Fan shares distribute one air system each.
  const byGroup = {};
  for (const [zoneId, z] of Object.entries(zones)) {
    (byGroup[z.fanGroup] ??= []).push(zoneId);
  }
  for (const [group, ids] of Object.entries(byGroup)) {
    const sum = ids.reduce((a, id) => a + zones[id].fanShare, 0);
    if (Math.abs(sum - 1) > TOL) {
      findings.push({
        code: 'fan-share-does-not-sum',
        detail: `fan shares for the ${group} air system sum to ${sum}, not 1`,
        magnitude: sum - 1,
        zones: ids,
      });
    }
  }

  // Fan energy handed to zones must equal the fan energy the plant reports.
  const fanZones = Object.values(zones).reduce((a, z) => a + z.fanElectricity, 0);
  const fanPlant = plant.labFans + plant.generalFans + plant.vivariumFans +
    plant.specialLabFans + plant.auditoriumFans;
  if (Math.abs(fanZones - fanPlant) > 1e-6) {
    findings.push({
      code: 'fan-energy-not-conserved',
      detail: `zones are allocated ${fanZones.toFixed(3)} MBtu of fan energy against a ` +
        `plant total of ${fanPlant.toFixed(3)} MBtu`,
      magnitude: fanZones - fanPlant,
    });
  }

  if (findings.length) {
    problems.push(`${sheetName}: ${findings.length} data-quality finding(s) recorded`);
  }
  return findings;
}

/** Area-weighted building EUI over the prototype areas, kBtu/sf/yr. */
const blendedEui = (zones) => {
  let energy = 0;
  let area = 0;
  for (const z of Object.values(zones)) {
    energy += (z.totalElectricity + z.totalGas) * MBTU_TO_KBTU;
    area += z.area;
  }
  return energy / area;
};

// ------------------------------------------------------------ rate conversion

function readLocations(climateWb) {
  const cells = climateWb.cells('Conversions');
  const out = [];
  for (const loc of LOCATIONS) {
    // Three separate tables on one sheet, each keyed by the same row label.
    const carbonAt = findLabel(cells, loc.conversionRow, { columns: ['B'], maxRow: 40 });
    const costAt = findLabel(cells, loc.conversionRow, { columns: ['H'], maxRow: 40 });
    const gasAt = findLabel(cells, loc.conversionRow, { columns: ['M'], maxRow: 40 });

    const gridLbPerMwh = num(cells, `C${carbonAt.row}`);
    const electricityPerKwh = num(cells, `I${costAt.row}`);
    const gasPer1000Cuft = num(cells, `N${gasAt.row}`);

    out.push({
      id: loc.id,
      label: loc.label,
      state: loc.state,
      climateZone: loc.climateZone,
      rates: {
        vintage: RATE_VINTAGE,
        gridCarbonLbPerMwh: gridLbPerMwh,
        electricityPricePerKwh: electricityPerKwh,
        gasPricePer1000Cuft: gasPer1000Cuft,
        // Derived, and what the engine actually multiplies by.
        electricityCarbonMtPerMbtu: gridLbPerMwh * LB_PER_MWH_TO_MT_PER_MBTU,
        gasCarbonMtPerMbtu: 0.053085,
        electricityCostPerMbtu: electricityPerKwh * KWH_PER_MBTU,
        gasCostPerMbtu: gasPer1000Cuft,
      },
    });
  }
  return out;
}

// ---------------------------------------------------------------- validation

function readValidation(climateWb) {
  const cells = climateWb.cells('Validation');
  const header = findLabel(cells, 'Designed EUI', { columns: ['C', 'D', 'E', 'F'], maxRow: 80 });

  const projects = [];
  for (let row = header.row + 1; row <= header.row + 12; row++) {
    const name = str(cells, `D${row}`);
    if (!name || name === 'Average' || name === 'Median' || name === 'Maximum') break;
    projects.push({
      name,
      designedEui: num(cells, `E${row}`),
      workbookEstimatedEui: num(cells, `F${row}`),
    });
  }

  // Each project's programme sits in a pair of columns above: area, then energy.
  const progHeader = findLabel(cells, 'Zone Name', { columns: ['D'], maxRow: 40 });
  const areaColumns = {};
  for (const p of projects) {
    const at = findLabel(cells, p.name, { columns: ['F', 'H', 'J', 'L', 'N'], maxRow: progHeader.row });
    areaColumns[p.name] = at.col;
  }

  const zoneRowByName = new Map();
  for (let row = progHeader.row + 1; row <= progHeader.row + 30; row++) {
    const name = str(cells, `D${row}`);
    if (!name) continue;
    if (name === 'Total' || name === 'Totals') break;
    zoneRowByName.set(name, row);
  }

  // The sheet carries its own copy of the baseline intensities in column E, and
  // that copy is STALE — it predates the final 5A revision, most visibly on the
  // special labs (NMR reads 548 here against 289 on the 5A sheet). The published
  // residuals were computed against this column, so it is kept alongside the
  // programme rather than discarded: the workbook's own arithmetic has to stay
  // reproducible even where its inputs have since moved on.
  const workbookBaselineEui = {};
  for (const zone of ZONES) {
    const row = zoneRowByName.get(zone.sheetName);
    if (row != null) workbookBaselineEui[zone.id] = num(cells, `E${row}`);
  }

  for (const p of projects) {
    const col = areaColumns[p.name];
    const programme = {};
    for (const zone of ZONES) {
      const row = zoneRowByName.get(zone.sheetName);
      if (row == null) continue;
      const area = num(cells, `${col}${row}`);
      if (area > 0) programme[zone.id] = area;
    }
    p.programme = programme;
    p.totalArea = Object.values(programme).reduce((a, b) => a + b, 0);
  }
  return {
    projects,
    workbookBaselineEui,
    note:
      'Residuals as published were computed against the baseline intensities held ' +
      'on this sheet, which predate the final 5A revision. Recomputing against the ' +
      'shipped baseline moves every residual — see docs/extraction.md.',
  };
}

// ---------------------------------------------------------------------- build

function main() {
  const climateWb = openWorkbook(CLIMATE_WORKBOOK);
  const measureWb = openWorkbook(MEASURE_WORKBOOK);
  const workbooks = { [CLIMATE_WORKBOOK]: climateWb, [MEASURE_WORKBOOK]: measureWb };

  const cases = [];
  for (const spec of CASES) {
    const read = readCaseSheet(workbooks[spec.workbook], spec.sheet);

    // Where a case appears in both workbooks, prove the copies agree rather
    // than trusting that they do.
    if (spec.crossCheck) {
      const other = readCaseSheet(workbooks[spec.crossCheck.workbook], spec.crossCheck.sheet);
      for (const zone of ZONES) {
        const a = read.zones[zone.id].eui;
        const b = other.zones[zone.id].eui;
        if (Math.abs(a - b) > 1e-9) {
          problems.push(
            `${spec.id}: ${zone.id} EUI differs between ${spec.sheet} (${a}) and ` +
            `${spec.crossCheck.sheet} (${b})`,
          );
        }
      }
    }

    cases.push({
      id: spec.id,
      kind: spec.kind,
      label: spec.label,
      ...(spec.measureNumber ? { measureNumber: spec.measureNumber } : {}),
      locationId: spec.locationId,
      ...(spec.description ? { description: spec.description } : {}),
      ...(spec.note ? { note: spec.note } : {}),
      provenance: {
        kind: 'simulated',
        tool: 'IES:VE',
        completed: '2019-08-30',
        workbook: spec.workbook,
        sheet: spec.sheet,
        ...(spec.crossCheck ? { crossCheckedAgainst: spec.crossCheck.sheet } : {}),
      },
      prototype: {
        totalArea: read.totals.area,
        totalElectricity: read.totals.electricity,
        totalGas: read.totals.gas,
        blendedEui: blendedEui(read.zones),
      },
      plant: read.plant,
      zones: read.zones,
      dataQuality: auditCase(spec.sheet, read),
    });
  }

  const dataset = {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    about: {
      name: 'Zoned Energy Estimator for Labs',
      summary:
        'Zone energy intensities for a 115,000 sf STEM laboratory prototype, ' +
        'simulated in IES:VE in 2019 and allocated to zones by flow share. ' +
        'For early planning and proposal work: the output conveys ideas, it does ' +
        'not predict savings.',
      study: 'Quantifying Zoned Energy Approaches for Academic Science Buildings, I2SL 2019',
      authors: ['Rishi Nandi, Perkins & Will', 'Patrick Pease, Arup'],
    },
    units: { energy: 'MBtu/yr', intensity: 'kBtu/sf/yr', area: 'sf', carbon: 'MT/yr', cost: 'USD/yr' },
    zones: ZONES.map(({ id, label }) => ({ id, label })),
    fanGroups: Object.values(FAN_GROUPS),
    endUses: END_USES,
    plantItems: PLANT_ITEMS,
    zoneColumns: ZONE_COLUMNS,
    locations: readLocations(climateWb),
    studies: [
      {
        id: 'climate',
        label: 'Climate comparison',
        description: 'The baseline building in five climate zones.',
        caseIds: ['baseline', 'climate-6a', 'climate-4a', 'climate-3a', 'climate-5b'],
      },
      {
        id: 'measure',
        label: 'Measure study',
        description:
          'Six energy conservation measures and one reverse measure, all at 5A Boston. ' +
          'Measures were not simulated in the other climate zones and are never interpolated across them.',
        caseIds: ['baseline', 'ecm-1-plugs', 'ecm-2-ach', 'ecm-3-writeup', 'ecm-4-glazing',
          'ecm-5-cascade', 'ecm-6-shading', 'recm-1-no-turndown'],
      },
    ],
    cases,
    validation: (() => {
      const v = readValidation(climateWb);
      return { note: v.note, workbookBaselineEui: v.workbookBaselineEui, projects: v.projects };
    })(),
  };

  writeFileSync(OUT, JSON.stringify(dataset, null, 2) + '\n');

  const bytes = JSON.stringify(dataset).length;
  console.log(`Wrote data/dataset.json — ${cases.length} cases, ${ZONES.length} zones, ` +
    `${dataset.locations.length} locations, ${dataset.validation.projects.length} validation projects ` +
    `(${(bytes / 1024).toFixed(0)} KB minified)`);
  for (const c of cases) {
    console.log(`  ${c.id.padEnd(20)} ${c.prototype.blendedEui.toFixed(2).padStart(7)} kBtu/sf/yr`);
  }
  const flagged = cases.filter((c) => c.dataQuality.length);
  if (flagged.length) {
    console.log('\nData-quality findings carried into the dataset:');
    for (const c of flagged) {
      for (const f of c.dataQuality) console.log(`  ${c.id}: ${f.detail}`);
    }
  }

  // Cross-workbook disagreements are a different matter — they mean the
  // extraction picked a source it cannot justify, and must stop the build.
  const hard = problems.filter((p) => !p.includes('data-quality finding'));
  if (hard.length) {
    console.error('\nProblems:');
    for (const p of hard) console.error('  - ' + p);
    process.exit(1);
  }
}

main();
