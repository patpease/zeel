// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/ui/App.js';

const links = () => [...document.querySelectorAll('.sankey__link')];
const readout = () => document.querySelector('.sankey__readout')?.textContent ?? '';

describe('the energy flow', () => {
  it('draws fuel, end use and air system', () => {
    render(<App />);
    const labels = [...document.querySelectorAll('.sankey__node text')].map((t) => t.textContent);
    expect(labels.slice(0, 2)).toEqual(['Electricity', 'Natural gas']);
    expect(labels).toContain('Chillers');
    expect(labels).toContain('Lab / high energy');
  });

  it('opens showing the total rather than nothing', () => {
    render(<App />);
    expect(readout()).toBe('15,295 MBtu/yr in total');
  });

  it('reconciles its bands against the workbook’s own plant totals', () => {
    render(<App />);
    const rows = [...document.querySelectorAll('table.visually-hidden tr')]
      .map((tr) => [...tr.children].map((c) => c.textContent));
    const fansToLab = rows.find((r) => r[0] === 'Fans' && r[1] === 'Lab / high energy');
    // The 2019 workbook puts 1,699.512 MBtu through the lab air handlers.
    expect(fansToLab?.[2]).toBe('1,700 MBtu/yr');
  });

  it('lights one band and dims the rest when a band is traced', async () => {
    const user = userEvent.setup();
    render(<App />);
    const all = links();
    await user.hover(all[7]!);

    const lit = all.filter((l) => Number(l.getAttribute('opacity')) > 0.2);
    expect(lit).toHaveLength(1);
    expect(readout()).toMatch(/→/);
    expect(readout()).toMatch(/MBtu\/yr/);
  });

  it('keeps the service hues out of the palette’s reach', () => {
    render(<App />);
    // Cooling is blue and heating is orange because those are physical
    // conventions. A palette that repainted them would make the diagram lie.
    const fills = links().map((l) => l.getAttribute('fill'));
    expect(fills).toContain('var(--use-cooling)');
    expect(fills).toContain('var(--use-heating)');
    expect(fills.some((f) => f?.startsWith('var(--group-'))).toBe(false);
  });

  it('disappears rather than dividing by zero on an empty programme', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^Clear$/i }));
    expect(document.querySelectorAll('.sankey')).toHaveLength(0);
  });
});
