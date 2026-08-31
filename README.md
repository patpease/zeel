# ZEEL — Zoned Energy Estimator for Labs

Early-planning energy estimation for laboratory buildings. Enter the areas of 21
laboratory zone types and see the energy, carbon and cost that programme implies,
across five climate zones and seven conservation measures.

**For early planning and proposal work.** The arithmetic is deliberately linear —
fixed zone intensities scaled by the areas you give them — which is what makes
the relationship between programme and energy legible and instant. The output is
there to convey an idea, not to predict a saving. Not for design submissions,
energy targets, compliance paths, or quantified measure savings.

Everything runs in the browser: no account, no upload, nothing kept.

## Where the numbers come from

One IES:VE model of a 115,000 sf STEM building, simulated in 2019, with custom
meters on electricity, fossil fuel, air and water flows per zone. Building-wide
plant totals are allocated to zones by flow share; only room and plug electricity
is a genuine per-zone quantity. A zone's EUI is a signature, not a measurement.

The study was presented at I2SL 2019 as *Quantifying Zoned Energy Approaches for
Academic Science Buildings* by Rishi Nandi (Perkins & Will) and Patrick Pease
(Arup).

Twelve simulation cases: five climate zones at baseline, and eight cases at 5A
Boston. **Measures were never simulated in the other climate zones and are never
interpolated across them** — the tool ships two study modes rather than inventing
the missing 28 cells.

## Layout

```
scripts/extract/   Excel to JSON pipeline; run with npm run extract
schema/            JSON Schema for the dataset, enforced in tests
data/              Generated dataset.json — committed, never hand-edited
test/              Consistency, schema, and published-figure golden tests
source/            The 2019 workbooks. Not committed; see docs/extraction.md
```

## Working on it

```bash
npm install
npm run extract
npm test
```

## Licence

MIT. The dataset is derived from a study by Arup and Perkins & Will; see
`docs/extraction.md`.
