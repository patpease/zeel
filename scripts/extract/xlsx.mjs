// A read-only slice of SpreadsheetML: enough to pull cached cell values out of
// the 2019 workbooks, and no more. Formulas are ignored — Excel stores the last
// computed value alongside them, and that value is what the study published.
import { readFileSync } from 'node:fs';
import { unzipSync, strFromU8 } from 'fflate';
import { XMLParser } from 'fast-xml-parser';

const MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  // A sheet with one row, or a row with one cell, must still parse as a list.
  isArray: (name) => ['sheet', 'row', 'c', 'si', 'r', 'Relationship'].includes(name),
});

const arr = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

/** "BC12" -> { col: 55, row: 12 } */
export function refToRC(ref) {
  const m = /^([A-Z]+)(\d+)$/.exec(ref);
  if (!m) throw new Error(`Not a cell reference: ${ref}`);
  let col = 0;
  for (const ch of m[1]) col = col * 26 + (ch.charCodeAt(0) - 64);
  return { col, row: Number(m[2]) };
}

/** 1 -> "A", 27 -> "AA" */
export function colName(n) {
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = (n - 1 - r) / 26;
  }
  return s;
}

function textOf(si) {
  // <si> is either a bare <t> or a sequence of <r><t> runs.
  if (si.t != null) return typeof si.t === 'object' ? (si.t['#text'] ?? '') : String(si.t);
  return arr(si.r)
    .map((run) => (typeof run.t === 'object' ? (run.t['#text'] ?? '') : (run.t ?? '')))
    .join('');
}

export class Workbook {
  constructor(path) {
    this.path = path;
    const files = unzipSync(readFileSync(path));
    this.read = (name) => {
      const f = files[name];
      if (!f) throw new Error(`${path}: missing ${name}`);
      return strFromU8(f);
    };

    this.sharedStrings = [];
    if (files['xl/sharedStrings.xml']) {
      const sst = parser.parse(this.read('xl/sharedStrings.xml')).sst;
      this.sharedStrings = arr(sst?.si).map(textOf);
    }

    const rels = {};
    for (const rel of arr(parser.parse(this.read('xl/_rels/workbook.xml.rels')).Relationships?.Relationship)) {
      rels[rel['@Id']] = String(rel['@Target']).replace(/^\/?(xl\/)?/, 'xl/');
    }

    const wb = parser.parse(this.read('xl/workbook.xml')).workbook;
    this.sheets = arr(wb.sheets?.sheet).map((sh) => ({
      name: String(sh['@name']),
      state: sh['@state'] ?? 'visible',
      target: rels[sh['@r:id']],
    }));
    this._cache = new Map();
  }

  sheetNames() {
    return this.sheets.map((s) => s.name);
  }

  /** Cell values for one sheet, keyed by reference: { A1: "Title", C11: 2471.261 } */
  cells(sheetName) {
    if (this._cache.has(sheetName)) return this._cache.get(sheetName);
    const sheet = this.sheets.find((s) => s.name === sheetName);
    if (!sheet) throw new Error(`${this.path}: no sheet named ${sheetName}`);

    const ws = parser.parse(this.read(sheet.target)).worksheet;
    const out = {};
    for (const row of arr(ws.sheetData?.row)) {
      for (const c of arr(row.c)) {
        const ref = c['@r'];
        const type = c['@t'];
        let value;
        if (type === 'inlineStr') {
          value = c.is ? textOf(c.is) : '';
        } else if (c.v != null) {
          const raw = typeof c.v === 'object' ? c.v['#text'] : c.v;
          if (type === 's') value = this.sharedStrings[Number(raw)] ?? '';
          else if (type === 'str' || type === 'e') value = String(raw);
          else if (type === 'b') value = Number(raw) === 1;
          else value = Number(raw);
        }
        if (value !== undefined && ref) out[ref] = value;
      }
    }
    this._cache.set(sheetName, out);
    return out;
  }
}

/** Trimmed string at a reference, or '' */
export const str = (cells, ref) => {
  const v = cells[ref];
  return v == null ? '' : String(v).trim();
};

/** Finite number at a reference, or `fallback` (default 0) */
export const num = (cells, ref, fallback = 0) => {
  const v = cells[ref];
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
};

/**
 * Find the single cell whose trimmed text equals `label`, scanning the given
 * columns. Layout is located by what it says, never by hard-coded coordinates,
 * so a shifted sheet fails loudly instead of extracting the wrong column.
 */
export function findLabel(cells, label, { columns, maxRow = 200 } = {}) {
  const cols = columns ?? ['A', 'B', 'C', 'D', 'E'];
  const hits = [];
  for (const col of cols) {
    for (let row = 1; row <= maxRow; row++) {
      if (str(cells, `${col}${row}`) === label) hits.push({ col, row });
    }
  }
  if (hits.length === 0) throw new Error(`Label not found: "${label}"`);
  if (hits.length > 1) {
    const where = hits.map((h) => h.col + h.row).join(', ');
    throw new Error(`Label "${label}" is ambiguous: ${where}`);
  }
  return hits[0];
}

/** Map header text -> column letter, reading across one row. */
export function headerMap(cells, row, { maxCol = 40 } = {}) {
  const map = {};
  for (let c = 1; c <= maxCol; c++) {
    const name = colName(c);
    const label = str(cells, `${name}${row}`);
    if (label) map[label] = name;
  }
  return map;
}
