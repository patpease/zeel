# ZEEL — Zoned Energy Estimator for Labs

Early-planning energy estimation for laboratory programme mixes. Rebuild of a
2019 Arup Excel tool. Everything runs in the browser; no account, no upload,
nothing kept. Will deploy to `zeel.peasestudio.com`.

**Read this file first.** `README.md` orients; `docs/extraction.md` is the
authority on where the numbers come from and what is wrong with them.

## The framing is load-bearing, not marketing

The arithmetic is **deliberately linear**: fixed zone intensities scaled by user
areas. Changing an area never re-runs the plant allocation. This is the method,
not a shortcut — it is what makes the programme-to-energy relationship legible
and instant.

It also fixes what the output is worth. The tool **conveys an idea; it does not
predict a saving.** Not for design submissions, energy targets, compliance paths,
or quantified measure savings. The scope statement is permanent page furniture,
never a dismissible modal, and it is burned into every chart export — an exported
chart is the version that reaches people who never saw the tool.

Two rules follow, and both have already been got wrong once:

- **Never state a ± tolerance.** Five validation projects show *spread*, not
  precision. A stated envelope is false precision and invites the prediction
  reading the whole tool is built to avoid. Show the observed range.
- **The headline is "estimated EUI", never "pEUI".** The 2019 deck says pEUI and
  it is the AIA 2030 term, but a tool that says it does not predict cannot label
  its own headline *predictive*. pEUI is explained in the education content.

## Layout

```
scripts/extract/   Excel to JSON pipeline. Label-driven, never coordinate-driven.
schema/            JSON Schema for the dataset. Enforced in tests, not decorative.
data/              Generated dataset.json. Committed; never hand-edit it.
src/model/         Dataset types and the indexed loader.
src/engine/        estimate(), compare(), spread(). Pure functions, no UI.
src/units/         IP and SI. Converted at the boundary, nowhere else.
test/              Consistency, schema, published-figure, engine and unit tests.
source/            The 2019 workbooks. Gitignored — client job number, named engineers.
```

## The engine works in one unit set

Square feet, MBtu, kBtu/sf/yr, metric tons, dollars. `src/units/units.ts`
converts on the way in from a user and on the way out to a screen; nothing in
between knows which system is displayed. Do not add an SI branch inside the
engine — that is the version of this that rots.

The SI anchors are genuinely different landmarks, not converted numbers: 133
kBtu/sf/yr is 420 kWh/m²/yr, and the education copy needs both sets.

## The dataset is 12 cases, not 40

Five climate zones at baseline, eight cases at 5A Boston. Nothing sits in the
intersection. **Measures are never interpolated across climate zones** — the tool
ships two study modes instead of inventing the missing cells. Every case carries
`provenance.kind === 'simulated'`, and the schema pins that to a constant so a
derived case cannot be added without an explicit schema change.

## Defects are recorded, not repaired

The workbooks are a published result. Where their arithmetic is wrong the
extractor writes a `dataQuality` finding onto the case and carries the numbers
through unchanged. Repairing them would change published numbers, which is the
author's call.

Two live findings, both documented in full in `docs/extraction.md`:

- **`climate-3a` misallocates fan energy.** Write-up is labelled general but paid
  from the lab fan total, and its share divides by a range that excludes itself.
  0.13% of Atlanta's electricity, but ~21% at the zone level for general zones.
- **The validation tab's baseline column is stale.** It reproduces the published
  residuals; the shipped baseline gives different ones. Both are kept.

And a trap worth knowing: **the workbook's "Average" cells average signed
errors.** The 12.97% it prints is not a mean absolute error — that is 16.4% as
published, 15.3% recomputed. Never quote the workbook's average as accuracy.

## Verifying a change

```bash
npm run extract && npm test
```

The golden tests check the extraction against artefacts that live *outside* the
workbooks — all 126 measure results and 21 baseline intensities printed on the
2019 poster. If the pipeline drifts, those break before anything else does.

A green suite is not evidence the browser works. Once there is a UI, open it.

## Deployment

Cloudflare **Worker** first, **Pages** later. That only stays a cheap migration
if the app is a pure static bundle throughout: no Worker-only routes, no KV, no
SSR. The Worker entry point serves `dist` and returns a real 404 for anything
that is not a file.
