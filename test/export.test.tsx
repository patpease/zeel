// @vitest-environment jsdom
//
// Rasterisation itself is not tested here: jsdom has no canvas and no image
// decoder, so a test would only assert that the mocks were called. The pipeline
// is verified in a real browser — the failure it caught was that computed styles
// were read from the live element rather than the light-staged clone, which is
// invisible to any assertion jsdom could make.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { ExportOptions } from '../src/io/exportPng.js';

const exportChartPng =
  vi.fn<(svg: SVGSVGElement, options: ExportOptions) => Promise<void>>(() => Promise.resolve());
vi.mock('../src/io/exportPng.js', () => ({ exportChartPng }));

/** The arguments of the one call the test just triggered. */
const lastCall = () => {
  const call = exportChartPng.mock.calls.at(-1);
  if (!call) throw new Error('exportChartPng was not called');
  return { element: call[0], options: call[1] };
};

const { App } = await import('../src/ui/App.js');
const { EXPORT_SCOPE } = await import('../src/ui/useExportContext.js');

beforeEach(() => exportChartPng.mockClear());

describe('the export control', () => {
  it('sits on each chart rather than in a report panel somewhere else', () => {
    render(<App />);
    const labels = screen.getAllByRole('button', { name: /download .* as png/i })
      .map((b) => b.getAttribute('aria-label'));
    expect(labels).toEqual([
      'Download Where the floor goes, and where the energy goes as PNG',
      'Download How the energy flows as PNG',
      'Download Intensity and total energy by zone as PNG',
    ]);
  });

  it('appears on the comparison strip too, once there is one', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /measure study/i }));
    await user.click(screen.getByRole('button', { name: /Air change rate reduction/i }));
    expect(screen.getByRole('button', { name: /Download Which zones respond as PNG/i })).toBeDefined();
  });

  it('hands the chart’s own svg to the exporter', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /How the energy flows as PNG/i }));

    expect(exportChartPng).toHaveBeenCalledOnce();
    const { element, options } = lastCall();
    expect(element.classList.contains('sankey')).toBe(true);
    expect(options.title).toBe('How the energy flows');
  });
});

describe('what every export carries', () => {
  it('burns the scope line into the artwork', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /How the energy flows as PNG/i }));

    const { options } = lastCall();
    // An exported chart is the version that reaches people who never saw the
    // tool, so the framing has to travel with it.
    expect(options.scope).toBe(EXPORT_SCOPE);
    expect(options.scope).toMatch(/does not predict a saving/i);
  });

  it('carries the chosen palette’s LIGHT steps, not the default ramp', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.selectOptions(
      screen.getByRole('combobox', { name: /chart palette/i }), 'fantastic-fox',
    );
    await user.click(screen.getByRole('button', { name: /How the energy flows as PNG/i }));

    // The export stage carries data-theme="light", which the stylesheet also
    // targets — so without these the palette silently reverts to the default
    // ramp. Light steps specifically: the document element holds the dark ones
    // whenever the viewer is in dark mode.
    const { options } = lastCall();
    expect(Object.fromEntries(options.variables.map((v) => [...v]))).toEqual({
      '--group-lab': '#4A2A06',
      '--group-vivarium': '#6E4009',
      '--group-special-lab': '#96590C',
      '--group-general': '#BE7412',
      '--group-auditorium': '#DE9530',
    });
  });

  it('falls back to the default ramp when that is what is chosen', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /How the energy flows as PNG/i }));
    const { options } = lastCall();
    expect(options.variables[0]).toEqual(['--group-lab', '#0A322D']);
  });

  it('names the case, the place and the programme it was drawn from', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /How the energy flows as PNG/i }));

    const { options } = lastCall();
    expect(options.provenance).toMatch(/Baseline/);
    expect(options.provenance).toMatch(/Boston, MA \(5A\)/);
    expect(options.provenance).toMatch(/115,000 sf/);
    expect(options.provenance).toMatch(/IES:VE/);
  });

  it('follows the case that is actually selected', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^6A/ }));
    await user.click(screen.getByRole('button', { name: /How the energy flows as PNG/i }));

    const { options } = lastCall();
    expect(options.provenance).toMatch(/Minneapolis, MN \(6A\)/);
    expect(options.fileName).toBe('zeel-climate-6a-energy-flow.png');
  });

  it('gives each chart its own file name', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /floor goes.*as PNG/i }));
    expect(lastCall().options.fileName).toBe('zeel-baseline-area-energy.png');
  });
});
