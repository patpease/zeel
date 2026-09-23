// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/ui/App.js';

/**
 * The phone layout.
 *
 * Each chart measures the box it is drawn in and, below the width its desktop
 * drawing needs, draws itself at the width it is shown instead of scrolling
 * sideways inside its card. Three things here break without anything looking
 * wrong on a desk, which is where the tool is developed:
 *
 *   - an UNMEASURED box must be desktop — jsdom reports every width as 0, and
 *     the export's off-screen copy relies on measuring wide;
 *   - the phone layouts must keep what the desktop ones promise: both zone
 *     panels, every figure on the comparison strip, all three Sankey columns;
 *   - the hidden tables must not be able to widen the page.
 */
afterEach(() => vi.restoreAllMocks());

/** Make every box measure `width`, which is how a phone looks to useWidth. */
const measureAs = (width: number) =>
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    width, height: 400, top: 0, left: 0, right: width, bottom: 400, x: 0, y: 0,
    toJSON: () => ({}),
  } as DOMRect);

const layouts = (container: HTMLElement) =>
  [...container.querySelectorAll('svg[data-layout]')].map((svg) => svg.getAttribute('data-layout'));

const figure = (name: RegExp) => screen.getByRole('figure', { name });

describe('an unmeasured box', () => {
  it('draws every chart in its desktop layout', () => {
    const { container } = render(<App />);
    const found = layouts(container);
    expect(found.length).toBeGreaterThanOrEqual(3);
    expect(new Set(found)).toEqual(new Set(['standard']));
  });
});

describe('a phone-width box', () => {
  it('draws every chart in its phone layout, at the width it is shown', () => {
    measureAs(320);
    const { container } = render(<App />);
    expect(new Set(layouts(container))).toEqual(new Set(['compact']));
    for (const svg of container.querySelectorAll('svg[data-layout]')) {
      expect(svg.getAttribute('viewBox')).toMatch(/^0 0 320 /);
    }
  });

  it('stacks the zone panels and names every row in both', () => {
    measureAs(320);
    render(<App />);
    const zones = figure(/Intensity and total energy by zone/i);
    const titles = [...zones.querySelectorAll('.chart__axis-title')].map((t) => t.textContent);
    expect(titles).toEqual(['Intensity, kBtu/sf/yr', 'Total energy, MBtu/yr']);
    // 21 zones, a bar in each panel — the same count as the desktop drawing.
    expect(zones.querySelectorAll('svg[data-layout] path')).toHaveLength(42);
    const labels = [...zones.querySelectorAll('.chart__row-label')].map((t) => t.textContent);
    expect(labels).toHaveLength(42);
    // Same order in both panels, so a zone sits at the same place in each.
    expect(labels.slice(21)).toEqual(labels.slice(0, 21));
  });

  it('prints every change figure in a column at the right edge', async () => {
    measureAs(320);
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Measure study/i }));
    await user.click(screen.getByRole('button', { name: /Air change rate reduction/i }));

    const strip = figure(/Which zones respond/i);
    const values = [...strip.querySelectorAll('svg[data-layout] .chart__value')];
    expect(values.length).toBeGreaterThan(0);
    for (const value of values) {
      expect(value.getAttribute('x')).toBe('320');
      expect(value.getAttribute('text-anchor')).toBe('end');
    }
  });

  /*
   * The Sankey's inset labels: fuels right of their bars, end uses and air
   * systems left of theirs. A fuel label and a long end-use label both sit over
   * the first span of ribbons, and the layout moves the fuel label when they
   * would share a line. Checked on all three of the study's programmes, whose
   * end-use splits differ enough to move every node.
   */
  for (const preset of [/Mid-size institutional/i, /Reaching for 75/i, /Reaching for 50/i]) {
    it(`keeps fuel labels off end-use labels: ${preset.source}`, async () => {
      measureAs(320);
      const user = userEvent.setup();
      render(<App />);
      await user.click(screen.getByRole('button', { name: preset }));

      const flow = figure(/How the energy flows/i);
      const labels = [...flow.querySelectorAll('.sankey__node text')].map((text) => {
        const x = Number(text.getAttribute('x'));
        const width = (text.textContent ?? '').length * 5.6;
        const start = text.getAttribute('text-anchor') === 'start';
        return {
          name: text.textContent,
          y: Number(text.getAttribute('y')),
          x0: start ? x : x - width,
          x1: start ? x + width : x,
          start,
        };
      });
      const fuels = labels.filter((l) => l.name === 'Electricity' || l.name === 'Natural gas');
      const others = labels.filter((l) => !fuels.includes(l));

      expect(fuels.every((l) => l.start)).toBe(true);
      expect(others.every((l) => !l.start)).toBe(true);
      for (const fuel of fuels) {
        for (const other of others) {
          const sameLine = Math.abs(fuel.y - other.y) < 12;
          const overlap = fuel.x0 < other.x1 && other.x0 < fuel.x1;
          expect(sameLine && overlap, `${fuel.name} against ${other.name}`).toBe(false);
        }
      }
    });
  }

  it('gives the total one readout line, and a hovered band two', async () => {
    measureAs(320);
    const user = userEvent.setup();
    render(<App />);
    const flow = figure(/How the energy flows/i);
    const lines = () => [...flow.querySelectorAll('.sankey__readout tspan')].map((t) => t.textContent);

    expect(lines()).toEqual(['15,295 MBtu/yr in total']);
    await user.hover(flow.querySelector('.sankey__link')!);
    expect(lines()).toHaveLength(2);
    expect(lines()[0]).toContain('→');
  });
});

describe('the hidden tables', () => {
  /*
   * A table ignores `width: 1px` and is always as wide as its contents, so a
   * 540 px table positioned absolutely made the whole page scroll sideways on
   * a phone. Each sits inside a 1 px wrapper that clips it.
   */
  it('are each wrapped in a clipping box', () => {
    const { container } = render(<App />);
    const tables = [...container.querySelectorAll('table.visually-hidden')];
    expect(tables.length).toBeGreaterThanOrEqual(2);
    for (const table of tables) {
      expect(table.parentElement?.classList.contains('visually-hidden')).toBe(true);
    }
  });
});
