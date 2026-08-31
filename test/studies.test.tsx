// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/ui/App.js';

const modes = () => screen.getByRole('group', { name: /^study$/i });
const cases = () => screen.getByRole('group', { name: /^case$/i });
const chip = (name: RegExp) => within(cases()).getByRole('button', { name });
const headline = () => document.querySelector('.headline__value')?.textContent ?? '';

describe('two studies, because the dataset has two shapes', () => {
  it('opens on the climate comparison', () => {
    render(<App />);
    const labels = within(cases()).getAllByRole('button').map((b) => b.textContent);
    expect(labels).toHaveLength(5);
    expect(labels[0]).toMatch(/^Baseline/);
  });

  it('offers eight cases in the measure study', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(within(modes()).getByRole('button', { name: /measure study/i }));
    expect(within(cases()).getAllByRole('button')).toHaveLength(8);
  });

  it('says on the control that measures are 5A only, rather than greying one out', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(within(modes()).getByRole('button', { name: /measure study/i }));
    expect(screen.getByText(/simulated at 5A Boston only/i).textContent)
      .toMatch(/never carried across/i);
  });

  it('returns to the baseline when the study changes', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(within(modes()).getByRole('button', { name: /measure study/i }));
    await user.click(chip(/Air change rate reduction/i));
    expect(headline()).toContain('120.5');

    // Landing on the previous study's case would show a measure labelled as a climate.
    await user.click(within(modes()).getByRole('button', { name: /climate comparison/i }));
    expect(headline()).toContain('133.0');
  });
});

describe('the chips carry their own result', () => {
  it('shows each climate zone’s figure and its change', () => {
    render(<App />);
    expect(chip(/6A/).textContent).toMatch(/140\.2/);
    expect(chip(/6A/).textContent).toMatch(/\+5\.4%/);
    expect(chip(/3A/).textContent).toMatch(/-1\.2%/);
  });

  it('ranks the measures without anything being clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(within(modes()).getByRole('button', { name: /measure study/i }));
    expect(chip(/Air change rate reduction/i).textContent).toMatch(/-9\.4%/);
    expect(chip(/Glazing reduced/i).textContent).toMatch(/-0\.3%/);
    // The only case in the set that costs energy.
    expect(chip(/Night turndown removed/i).textContent).toMatch(/\+8\.6%/);
  });
});

describe('the reverse measure', () => {
  it('is framed as one rather than left to look like a failed idea', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(within(modes()).getByRole('button', { name: /measure study/i }));
    await user.click(chip(/Night turndown removed/i));

    const note = document.querySelector('.caveat--note');
    expect(note?.querySelector('.caveat__lead')?.textContent).toBe('A reverse measure');
    expect(note?.textContent).toMatch(/what the baseline control is worth/i);
  });
});

describe('the comparison strip', () => {
  it('stays hidden on the baseline, since there is nothing to compare', () => {
    render(<App />);
    expect(screen.queryByRole('figure', { name: /which zones respond/i })).toBeNull();
  });

  it('answers which zones respond rather than how much is saved', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(within(modes()).getByRole('button', { name: /measure study/i }));
    await user.click(chip(/Air change rate reduction/i));

    const figure = screen.getByRole('figure', { name: /which zones respond/i });
    const rows = [...figure.querySelectorAll('tbody tr')].map((r) => r.children[0]?.textContent);
    // Reducing air changes bites hardest where the air changes are.
    expect(rows[0]).toBe('Vivarium');
    expect(figure.textContent).toMatch(/not a saving/i);
  });

  it('leads with the whole-building move, then breaks it down', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(within(modes()).getByRole('button', { name: /measure study/i }));
    await user.click(chip(/Air change rate reduction/i));
    const readout = document.querySelectorAll('.sankey__readout')[0]?.textContent ?? '';
    expect(readout).toBe('Whole building: 133.0 → 120.5 kBtu/sf/yr · -9.4%');
  });

  it('separates the zones that go the other way', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(within(modes()).getByRole('button', { name: /measure study/i }));
    await user.click(chip(/Air change rate reduction/i));

    const figure = screen.getByRole('figure', { name: /which zones respond/i });
    const up = [...figure.querySelectorAll('svg rect[fill="var(--delta-up)"]')];
    const down = [...figure.querySelectorAll('svg rect[fill="var(--delta-down)"]')];
    expect(down.length).toBeGreaterThan(up.length);
    expect(up.length).toBeGreaterThan(0);
  });
});

describe('carrying the caveat through', () => {
  it('warns on Atlanta, where the source data misallocates fan energy', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(chip(/3A/));
    const caveat = document.querySelector('.caveat:not(.caveat--note)');
    expect(caveat?.textContent).toMatch(/fan/i);
  });
});
