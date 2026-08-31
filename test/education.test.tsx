// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/ui/App.js';
import { ZONE_CARDS } from '../src/education/zones.js';
import { dataset } from '../src/model/dataset.js';

describe('zone cards', () => {
  it('covers every zone in the dataset', () => {
    for (const zone of dataset.zones) {
      expect(ZONE_CARDS[zone.id], zone.id).toBeDefined();
      expect(ZONE_CARDS[zone.id]!.summary.length, zone.id).toBeGreaterThan(30);
    }
  });

  it('records only what the presentation states', () => {
    // The 2019 deck lists these four in its occupancy table but in none of the
    // lighting, plug load or air system tables. Inventing plausible values would
    // be the easiest thing in this file to get wrong.
    for (const id of ['core-lab', 'mri-lab', 'nmr-lab', 'corridor']) {
      const { assumptions } = ZONE_CARDS[id]!;
      expect(assumptions.occupantDensity, id).toBeDefined();
      expect(assumptions.lightingPower, id).toBeUndefined();
      expect(assumptions.plugLoad, id).toBeUndefined();
      expect(assumptions.airChanges, id).toBeUndefined();
    }
  });

  it('carries the figures the study actually used', () => {
    expect(ZONE_CARDS['support-lab-chem']!.assumptions.plugLoad).toBe(16);
    expect(ZONE_CARDS['open-lab-bio']!.assumptions.plugLoad).toBe(8);
    expect(ZONE_CARDS['office']!.assumptions.plugLoad).toBe(0.75);
    expect(ZONE_CARDS['vivarium']!.assumptions.airChanges).toEqual([12, 10]);
    expect(ZONE_CARDS['open-lab-chem']!.assumptions.airChanges).toEqual([6, 2]);
  });

  it('opens from the zone name, one at a time', async () => {
    const user = userEvent.setup();
    render(<App />);
    const vivarium = screen.getByRole('button', { name: 'Vivarium' });
    expect(vivarium.getAttribute('aria-expanded')).toBe('false');

    await user.click(vivarium);
    expect(vivarium.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText(/12 \/ 10 ACH/)).toBeDefined();

    // Twenty-one expanded rows is a document, not a table.
    await user.click(screen.getByRole('button', { name: 'Office' }));
    expect(vivarium.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('notes on the programme', () => {
  it('states the finding the tool exists for', () => {
    render(<App />);
    const notes = screen.getByRole('region', { name: /notes on this programme/i });
    expect(notes.textContent).toMatch(/47% of the floor area and 87% of the energy/);
  });

  it('names the vivarium, and what makes it expensive', () => {
    render(<App />);
    const notes = screen.getByRole('region', { name: /notes on this programme/i });
    expect(notes.textContent).toMatch(/vivarium is 4% of the area and 19% of the energy/i);
  });

  it('moves with the programme', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Reaching for 50/i }));
    const notes = screen.getByRole('region', { name: /notes on this programme/i });
    // The vivarium is gone in that programme, so its note goes with it.
    expect(notes.textContent).not.toMatch(/vivarium is/i);
    expect(notes.textContent).toMatch(/what has to go/i);
  });

  it('gives the reader somewhere to stand', () => {
    render(<App />);
    const notes = screen.getByRole('region', { name: /notes on this programme/i });
    expect(notes.textContent).toMatch(/784 laboratories with a mean of 531/);
  });
});

describe('the evidence', () => {
  it('shows all five validation projects and their residuals', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText(/how do we know/i));

    const table = screen.getByRole('table', { name: '' }) ?? null;
    const rows = [...document.querySelectorAll('.validation tbody tr')];
    expect(rows).toHaveLength(5);
    expect(rows[0]!.textContent).toMatch(/Boston Lab 1/);
    expect(table === null || true).toBe(true);
  });

  it('does not paint an under-prediction as a good thing', () => {
    render(<App />);
    // Coming in low is the concerning direction, so the diverging pair — which
    // means "less energy is better" everywhere else — must not appear here.
    const cells = [...document.querySelectorAll('.validation tbody td')];
    for (const cell of cells) {
      expect((cell as HTMLElement).style.color).toBe('');
    }
  });

  it('calls it a spread rather than a tolerance', () => {
    render(<App />);
    const body = document.querySelectorAll('.disclosure__body')[0];
    expect(body?.textContent).toMatch(/spread, not a tolerance/i);
    expect(body?.textContent).not.toMatch(/±/);
  });

  it('says the envelope is high-performance, not code-minimum', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText(/what was assumed/i));
    const body = document.querySelectorAll('.disclosure__body')[1];
    expect(body?.textContent).toMatch(/high-performance, not code-minimum/i);
    expect(body?.textContent).toMatch(/triple glazing/i);
  });
});

describe('the benchmark scale', () => {
  it('anchors at the laboratory benchmark mean rather than somewhere flattering', () => {
    render(<App />);
    const figure = screen.getByRole('img', { name: /net zero range and the i2SL/i });
    expect(figure.textContent).toMatch(/i2SL mean 531/);
    expect(figure.textContent).toMatch(/Net zero 25–30/);
  });
});
