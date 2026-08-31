// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/ui/App.js';

const figure = (name: RegExp) => screen.getByRole('figure', { name });

describe('area versus energy rings', () => {
  it('draws both rings with a segment per air system', () => {
    const { container } = render(<App />);
    // Five groups, twice: floor area outside, energy inside.
    expect(container.querySelectorAll('.rings__svg path')).toHaveLength(10);
  });

  it('states the mismatch as a number rather than leaving it to be computed', () => {
    const { container } = render(<App />);
    expect(container.querySelector('.rings__figure')?.textContent).toBe('47% → 87%');
  });

  it('carries a legend, so identity is never colour alone', () => {
    const { container } = render(<App />);
    const labels = [...container.querySelectorAll('.legend__label')].map((el) => el.textContent);
    expect(labels).toEqual([
      'Lab / high energy', 'Vivarium', 'Special lab', 'General / low energy', 'Auditorium',
    ]);
  });

  it('moves with the programme', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole('button', { name: /Reaching for 50/i }));
    // With the vivarium and chemistry gone the split changes, and one group empties.
    expect(container.querySelector('.rings__figure')?.textContent).not.toBe('47% → 87%');
    expect(container.querySelectorAll('.rings__svg path').length).toBeLessThan(10);
  });
});

describe('zone bars', () => {
  it('draws two panels per zone rather than one chart with two axes', () => {
    const { container } = render(<App />);
    // 21 zones, an intensity bar and an energy bar each.
    expect(container.querySelectorAll('.chart__svg path')).toHaveLength(42);
  });

  it('orders rows by total energy, not by intensity', () => {
    const { container } = render(<App />);
    const labels = [...container.querySelectorAll('.chart__row-label')].map((el) => el.textContent);
    expect(labels[0]).toBe('Vivarium');
    // Support lab — general is only the third most intense but the second largest
    // consumer, which is the whole reason the two panels sit side by side.
    expect(labels[1]).toBe('Support lab — general');
  });

  it('offers the same numbers as a table for anyone who cannot use the picture', () => {
    render(<App />);
    // Scoped to this figure: the energy flow carries a hidden table too.
    const figure = screen.getByRole('figure', { name: /Intensity and total energy by zone/i });
    const table = figure.querySelector('table.visually-hidden');
    expect(table).not.toBeNull();
    expect(table!.querySelectorAll('tbody tr')).toHaveLength(21);
  });

  it('shows values on hover rather than printing one on every bar', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    expect(container.querySelectorAll('.chart__value')).toHaveLength(0);

    const firstRow = container.querySelector('.chart__row')!;
    await user.hover(firstRow);
    expect(container.querySelectorAll('.chart__value')).toHaveLength(2);
  });

  it('drops zones that were given no area', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole('button', { name: /Reaching for 50/i }));
    const labels = [...container.querySelectorAll('.chart__row-label')].map((el) => el.textContent);
    expect(labels).not.toContain('Vivarium');
    expect(labels).not.toContain('NMR lab');
  });
});

describe('an empty programme', () => {
  it('draws nothing rather than dividing by zero', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole('button', { name: /^Clear$/i }));
    expect(container.querySelectorAll('.rings__svg')).toHaveLength(0);
    expect(container.querySelectorAll('.chart__svg')).toHaveLength(0);
  });
});

describe('figures', () => {
  it('names what each one shows', () => {
    render(<App />);
    expect(figure(/Where the floor goes, and where the energy goes/i)).toBeDefined();
    expect(figure(/Intensity and total energy by zone/i)).toBeDefined();
  });
});
