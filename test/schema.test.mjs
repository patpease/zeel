// The schema is enforced, not decorative: a shape change has to be a deliberate
// edit to schema/dataset.schema.json, not a silent consequence of a new column.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
// The schema is draft 2020-12, which is Ajv's separate entry point — the
// default export only knows draft-07.
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const data = JSON.parse(readFileSync(new URL('../data/dataset.json', import.meta.url)));
const schema = JSON.parse(readFileSync(new URL('../schema/dataset.schema.json', import.meta.url)));

describe('schema', () => {
  it('validates the generated dataset', () => {
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    const validate = ajv.compile(schema);
    const ok = validate(data);
    if (!ok) {
      const detail = validate.errors
        .map((e) => `${e.instancePath || '/'} ${e.message}`)
        .slice(0, 20)
        .join('\n  ');
      throw new Error(`dataset.json does not match the schema:\n  ${detail}`);
    }
    expect(ok).toBe(true);
  });

  it('insists every case is simulated, never derived', () => {
    for (const c of data.cases) expect(c.provenance.kind).toBe('simulated');
  });
});
