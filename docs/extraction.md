# Extraction

`npm run extract` turns the two 2019 Arup workbooks into `data/dataset.json`.
The generated file is committed, so the app builds without the workbooks — but
regenerating means a corrected source cannot ship as last week's output.

## Inputs

The workbooks are **not committed**. They carry a client job number and named
engineers, and the derived intensities are what this project publishes. Put them
in `source/` (gitignored):

```
source/STEM Lab Zoned EUI Tool_Climate Zones_SHARED.xlsx   rev 1.3
source/STEM Lab Zoned EUI Tool_ECM_SHARED.xlsx             rev 2
```

## How it reads a sheet

Everything is located by the text on the sheet, never by cell coordinates. The
header row is found by looking for "Zone Name"; columns are then mapped from
their header text; the building-wide plant block is found by its labels in
column B. A workbook whose layout has moved fails loudly instead of silently
extracting the wrong column.

This is not defensive over-engineering — the sheets genuinely disagree with each
other. Five of the eight measure sheets call fan energy "Fan Energy" and three
call it "Fan Elec"; the Baseline sheet calls gas "Total Fossil Fuel" where every
other sheet says "Total Nat Gas", and orders its last few columns differently.
`ZONE_COLUMNS` in `scripts/extract/cases.mjs` lists the synonyms observed.

## What is deliberately not stored

**Carbon and cost.** Both are energy multiplied by a rate. Storing them would
freeze the 2017 rates into the dataset and make refreshing them a re-extraction
instead of a data edit. `locations[].rates` holds the factors; the engine does
the multiplication.

## Decisions the source forced

### ECM 4 reduces glazing

The workbook Read Me matrix says ECM 4 moves window-to-wall from 40% to 60%.
Two published sources say otherwise: slide 21 of the 2019 presentation sets the
baseline at **60%** WWR, and slide 29 names the measure **"Glazing Reduced to
<40%"**. The poster's results table heads the same column "Reduce Glazing". The
Read Me's two matrix rows are transposed; the presentation governs.

### ECM 6 is external shading

`ECM 6 - Shade` carries ECM 4's title by copy-paste. Slide 29 names it External
Shading.

### The Climate Zones workbook's ECM 5 and ECM 6 sheets are orphans

Both workbooks contain sheets named `ECM 5 - Cascade` and `ECM 6 - Shade`, and
they disagree. The special-lab fan total reads 262 MBtu in the Climate Zones
copy against 216 in the measure workbook, and the NMR lab lands at 555
kBtu/sf/yr against 289.

The measure workbook wins, for three reasons: nothing in the Climate Zones
workbook's summaries references those sheets, the measure workbook is the later
revision, and — decisively — the measure workbook's figures are the ones printed
on the 2019 poster. `test/published.test.mjs` pins all 126 published measure
results, so this cannot drift.

### California 3C is dropped

The Conversions sheet carries six locations; only five were ever simulated.

## Defects: recorded, and where justified, repaired

The workbooks are a published result, so nothing is corrected quietly. A defect
is either **carried forward with a `dataQuality` finding** on the case, or
**repaired with a `repairs` entry** saying what changed and what it moved. A case
with an empty `dataQuality` audits clean; a case with a `repairs` entry says so
in the interface, as a note rather than a warning.

### Atlanta's fan allocation (`climate-3a`) — repaired

Two slips on the `3A - Atlanta` sheet:

1. Write-up is labelled `General/Low Energy` but its fan energy is drawn from
   `High_Energy_Fan`, as on every other sheet.
2. Its fan share divides by `SUM($H$22:$H$29)` — the lab rows **excluding
   write-up itself** — where the 5A sheet correctly uses `$H$22:$H$30`.
   Write-up's flow is meanwhile counted in the general system's denominator.

The general air system's shares therefore summed to 0.837 instead of 1, and
zones were allocated 19.5 MBtu more fan energy than the plant produced.

**The label is the error, and the multiplier records the intent.** The four other
climate zones are the same building in different weather and all put write-up on
the lab system; ECM 3 is the case that deliberately moves it to the general AHU,
and this is not that case.

So write-up rejoins the lab system and the fan allocation is rederived: each
zone takes the share of its air system's fan energy that its airflow represents,
and total electricity and EUI follow.

**What licences that rederivation is that it is the workbook's own logic.** Run
over the eleven sheets that audit clean it reproduces their stored figures
*exactly* — worst error 0.0 on both share and energy — so applying it to the
twelfth restores arithmetic the sheet was already attempting rather than
substituting a new model. `test/dataset.test.mjs` holds that guarantee.

The effect is the shape the defect predicted:

| | Before | After |
|---|---:|---:|
| Building EUI | 131.45 | 131.28 |
| General zones | — | +3% to +7% each |
| Lab zones | — | about −1% each |

0.13% at the building scale, which is why it was tempting to leave. The reason
to repair it is the zone scale: Atlanta's atrium, office and classroom were each
carrying roughly a fifth less fan energy than they should, in a tool whose whole
purpose is comparing zones.

### The validation tab's baseline column is stale

`Validation` carries its own copy of the baseline intensities in column E, and
that copy predates the final 5A revision. The special labs show it most clearly:
NMR reads 548 there against 289 on the 5A sheet, MRI 180 against 142.

Both are kept. `validation.workbookBaselineEui` reproduces the published
residuals exactly; the shipped baseline produces different ones:

| Project | Designed | As published | Recomputed |
|---|---:|---:|---:|
| Boston Lab 1 | 90.7 | −4.8% | −2.8% |
| Boston Lab 2 | 134.4 | −28.1% | −26.6% |
| Western Mass Lab 1 | 130.6 | −31.3% | −29.6% |
| RI Lab 1 | 64.8 | −9.1% | −6.8% |
| Maine Lab 1 | 50.0 | +8.5% | +10.8% |

**The workbook's "Average" cells average signed errors**, so an over-prediction
cancels an under-prediction. The 12.97% it prints is not a mean absolute error —
that figure is 16.4% as published and 15.3% recomputed. Do not quote the
workbook's average as accuracy.

## Regenerating

```bash
npm run extract && npm test
```

27 tests cover internal consistency, the JSON Schema, all 126 published measure
results, both workbook summary tabs, and the validation set.
