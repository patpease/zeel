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
src/model/presets  The study's own worked programmes — 133, 75, 52. Not invented.
src/model/groups   The five air systems, their fixed order, and zone membership.
src/charts/        Hand-authored SVG, including the Sankey layout. No chart library.
src/ui/            Shell, theme, programme editor, formatting. styles.css holds the palette.
test/              Consistency, schema, published-figure, engine, unit, shell tests.
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

## The chrome is Psychrometric Studio's, deliberately

`.app-header`, `.brand`, `.unit-toggle` and `.theme-toggle` are matched to that
tool's markup and CSS rather than reinvented: organisation eyebrow, product
name, tagline, then IP/SI and a sun/moon pair on the right. Two tools in one
suite should be recognisable as one suite, and the chrome is what someone reads
first. If Psychrometric Studio's header changes, this one follows.

One detail is easy to get wrong: the theme buttons track `theme.resolved`, not
`theme.preference`. With no stored preference both would otherwise sit unlit and
the control would look broken on a first visit. There is a test for it.

`src/config/branding.ts` is the single source of truth for the name and tagline,
mirroring that tool's `config/branding.ts`.

## The programme editor teaches before it collects

Zones are grouped by air system and the groups are ordered by the energy they
carry — labs 62%, vivarium 19%, general 11%, special labs 6%, auditorium 2%.
That order is **fixed, not recomputed from what the user typed**: rows that
reshuffle mid-entry are unusable, and the point is to show the shape of the
problem before anyone starts. Every row also carries its intensity, so the cost
of a choice is visible while it is being made rather than only afterwards.

The presets are the 2019 study's own programmes and each reproduces the EUI it
reported — 133, 75, 52 — all at 115,000 sf, so they differ only in what the
floor area is spent on. Tests pin that.

**Two callbacks, not one.** `onChange` is a single edit and must not bump
`revision`; `onReplace` is a wholesale swap and must. Collapsing them rewrites
the field the user is typing in on every keystroke.

## Two studies, because the dataset has two shapes

Five climate zones at baseline, eight cases at 5A Boston, nothing in the
intersection. The picker has two modes rather than one combined selector, and
**says so on the control** — a greyed-out option leaves the reader wondering
whether it is broken; a sentence saying measures were simulated at 5A only, and
are never carried across, tells them it is a fact about the data.

Switching study resets to the baseline, which both studies share. Keeping the
previous case would show a measure labelled as a climate zone.

Each chip carries its own result for the programme currently entered, so the
comparison is legible before anything is clicked — which is also what makes the
measure study rank itself.

Change against a baseline is **polarity, not status**: a validated diverging pair
either side of a neutral rule, with direction carried by which side a bar sits on
as well as by colour. The comparison strip answers *which zones respond*, never
how much anyone will save.

## Charts

Two rules that are easy to break and expensive to notice late:

**A Sankey node is as tall as what passes THROUGH it** — the larger of what
arrives and what leaves, never their sum. Adding them makes every middle column
exactly twice the height of the ends, and the diagram stops meaning anything: a
Sankey's whole promise is that a band's width is its quantity. `sankey.test.mjs`
pins it, because the bug renders as a plausible-looking picture.

**The palette does not reach the Sankey's end uses.** Blue means cooling and
orange means heating; those are physical conventions, not styling, and a Sankey
with green heating would be a diagram that lies. Air systems are identities, so
they take the palette; services do not. There is a test.

**Never one chart with two axes.** Intensity and total energy are different
scales, so they are two panels sharing one set of rows. The pairing is the
point — a café kitchen at 322 kBtu/sf/yr is the third most intense room in the
building and, on 300 square feet, contributes nothing. Intensity alone misleads,
which is what the spreadsheet this replaces showed.

**Palettes are user-selectable, and every one is validated.** `src/charts/palettes.ts`
holds six: the studio default plus five alternatives. Two facts about them are
load-bearing:

- **Nothing is copied from paletteer.** paletteer is GPL-3; taking its data would
  carry that licence into an MIT project. It was used as a *catalogue* to find
  packages, and every value comes from the original source — colorblindr,
  wesanderson and nord, each independently MIT. See `THIRD-PARTY-NOTICES.md`.
- **Artistic palettes are not data palettes.** Run the source palettes through the
  checks and they fail badly: nord's `frost` puts adjacent colours 2.9 ΔE apart
  and wesanderson's `Royal2` 7.2, where 15 is the floor for a reader with full
  colour vision. Only `Okabe–Ito` ships verbatim; the rest keep their source's
  hue family and are re-stepped into ordinal ramps.

Choosing the default *removes* the inline custom properties rather than
overwriting them, so the stylesheet's media query keeps working. Any other
palette writes the five properties keyed on the resolved theme.

**The air-system ramps are validated, not eyeballed.** A single-hue ordinal ramp,
because the groups are genuinely ordered by the energy they carry and because the
studio's categorical hues already mean something here — blue is cooling, orange is
heating, and reusing them would put "special lab" in the chiller's blue two panels
away. If you change a step, re-run the checker rather than adjusting the test:

```bash
node validate_palette.js "<hex,...>" --mode light --ordinal
node validate_palette.js "<hex,...>" --mode dark --surface "#171e26" --ordinal
```

The dark ramp is *selected* against the dark surface and runs the other way: on a
dark ground the group carrying the most energy is the brightest.

Values wear text tokens, never the series colour. Numbers appear on hover rather
than on every bar, and every chart carries a visually-hidden table so the figures
are reachable without the picture.

## The stylesheet is the palette, three times over

Light on `:root`, dark inside a `prefers-color-scheme` query guarded with
`:not([data-theme="light"])`, dark again on a bare `[data-theme="dark"]`. The
guard is what lets an export container win over the viewer's system preference —
without it a light-themed clone inside a dark page inherits dark tokens and the
whole exercise is a no-op. Any new colour must be defined in all three.

Surface, ink and accent are copied from Psychrometric Studio unchanged. The
end-use hues are ZEEL's own: `--use-plug/fans/cooling/heating/dhw`.

**`--use-*` is for fills and strokes only.** `--use-*-ink` is the text pairing.
These hues are tuned to stay distinct from each other on a chart, which is a
different problem from being readable on a ground, and several fail WCAG AA at
label sizes. A legend swatch takes the hue; the words beside it take the ink.

**The accent is never a series colour.** That is what keeps identity green and
air green from ever appearing as two adjacent data marks.

Fonts are self-hosted through `@fontsource` — the CSP allows no third-party
origins, and a brand face that silently falls back to system-ui is not the brand.

## Test environments are split

Vitest runs in `node` by default, because most of the suite reads
`data/dataset.json` off disk and under jsdom `import.meta.url` is an http URL
that `readFileSync` rejects. A DOM test opts in with a
`// @vitest-environment jsdom` docblock.

## Verifying a change

```bash
npm run extract && npm test && npm run build
```

`npm run dev` serves on 5184, `npm run preview` on 4184.

The golden tests check the extraction against artefacts that live *outside* the
workbooks — all 126 measure results and 21 baseline intensities printed on the
2019 poster. If the pipeline drifts, those break before anything else does.

A green suite is not evidence the browser works. Once there is a UI, open it.

## Deployment

Cloudflare **Worker** first, **Pages** later. That only stays a cheap migration
if the app is a pure static bundle throughout: no Worker-only routes, no KV, no
SSR. The Worker entry point serves `dist` and returns a real 404 for anything
that is not a file.
