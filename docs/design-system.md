# Design system — layout and touch

The palette, both themes and the chart ramps are documented where they are
declared, in `src/ui/styles.css` and `src/charts/palettes.ts`. This file covers
what the palette does not: how the tool lays itself out on a phone, and the
rules that keep that working. Heat Balance Studio follows the same rules and has
the same file, so the suite behaves as one on a small screen as well as a large
one.

## Breakpoints

A custom property cannot be used in a media query, so these are numbers, and
the places that use them must agree.

| Width | Measured against | What changes |
|---|---|---|
| 860px | viewport | The workspace stacks into one column; `--gutter` tightens from 1.25rem to 16px. |
| 640px | viewport | The footer stacks; the header controls take a full row and the palette picker shrinks to fit. |
| 520px | viewport | The three metric tiles go two across, and the third takes a full row. |
| per chart | the chart's own box | The chart's phone layout (see below). |

**A chart flips where its own desktop drawing stops fitting**, measured on the
box it is drawn in by `useWidth` (`src/charts/useWidth.ts`):

| Chart | Flips below | Why that number |
|---|---|---|
| Zone bars, comparison strip | 460px | Their SVG carried `min-width: 460px`. |
| Energy flow (Sankey) | 640px | Its SVG carried `min-width: 640px`. |
| Benchmark scale | 480px | Below it the 9px ticks render under 6px. |

Above those widths every chart is exactly what it was. Below them the chart
used to scroll sideways inside its card; now it redraws for the width it has.

## Tokens

Declared once, in the layout block at the foot of `styles.css`:

| Token | Value | Why |
|---|---|---|
| `--gutter` | 1.25rem, 16px under 860px | Page side padding, previously repeated per selector. |
| `--tap` | 44px | Smallest touch target: Apple's 44pt, WCAG 2.5.5 AAA. |
| `--field-font-touch` | 16px | Below this, iOS Safari zooms the page when a field takes focus. |

## Touch

Touch rules key on `@media (pointer: coarse)`, never on width: a narrow window
on a desk has a mouse, and a tablet in landscape does not.

- Every field, including `.area-input` and the palette picker, renders at
  `--field-font-touch`. The classed fields are named in the rule, because a
  class outranks a bare `input`.
- Chips, toggles, the study modes, disclosures and the area fields are at least
  `--tap` tall. The export camera grows from 26px to `--tap`.
- `index.html` sets `viewport-fit=cover`, and the page's side padding is
  `max(var(--gutter), env(safe-area-inset-*))`, so nothing sits under a notch.
  On a desk the insets are zero and `max()` leaves the padding where it was.

## Charts: a layout per width, not a picture scaled down

An SVG with a fixed viewBox scales its text with its box. The phone layouts are
drawn at the width they are shown, so one unit is one pixel and the type is the
size the stylesheet says.

- **Zone bars** stack the two panels, intensity above total energy, each with
  its own row labels in the same order. The two measures are still two panels,
  never one chart with two axes.
- **Comparison strip** keeps its diverging halves and moves every figure into a
  right-aligned column. Beside the bars there is no room at phone width: a
  figure outside a short bar ran into the zone name. In a column the sign still
  carries the direction, and so does the side of the rule the bar sits on.
- **Energy flow** keeps its three columns and its flow, and moves the labels
  inside the plot: fuels to the right of their bars, end uses and air systems
  to the left of theirs, all with the surface halo. A fuel label that would
  share a line with a long end-use label moves to the top of its bar.
- **Readouts** that would run wider than a phone take two lines: what is
  hovered, then its figures.
- **Exports always use the desktop layout.** An exported chart outlives the
  page, and a programme must export the same picture from any device. When the
  live chart is in its phone layout, `ExportButton` mounts a desktop copy off
  screen (`src/ui/offscreen.tsx`) and exports that. Phone and desktop exports
  are byte-identical.

## Tables

The visible tables (the programme editor and the validation table) fit a phone
as they are. The hidden accessible tables did not: a table ignores
`width: 1px` and is always as wide as its contents, so each one, positioned
absolutely, made the whole page scroll sideways. Each now sits inside a
`.visually-hidden` wrapper that takes the 1px and clips it.

## Checking a layout change

Tests cannot see a layout. jsdom measures every box as 0, which `useWidth`
treats as desktop, and `test/phone-layout.test.tsx` stubs the width to reach
the phone path. After any layout change, open the production build
(`npm run preview`):

- at 360, 375, 390 and 430px wide, with no horizontal scroll;
- in both themes and both unit systems;
- at 1440px, to confirm the desktop is unchanged, and at 900 and 1024px, where
  the Sankey and the bar charts are the first to flip.
