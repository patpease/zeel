// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/ui/App.js';
import { applyPreference, readPreference } from '../src/ui/theme.js';

/** Scoped: every case chip also prints an EUI. */
const headline = () => document.querySelector('.headline__value')?.textContent ?? '';

describe('the shell', () => {
  it('states what the tool is for, without being asked', () => {
    render(<App />);
    const scope = screen.getByText(/What this is for/i).parentElement!;
    expect(scope.textContent).toMatch(/deliberately linear/i);
    expect(scope.textContent).toMatch(/convey an idea, not predict a saving/i);
    expect(scope.textContent).toMatch(/Not for design submissions/i);
  });

  it('marks itself as a beta', () => {
    render(<App />);
    expect(screen.getByText('Beta')).toBeDefined();
  });

  it('wears the suite’s chrome — organisation, product, tagline', () => {
    render(<App />);
    // Scoped: "Pease Studio" is also a palette name and appears in the credit.
    expect(document.querySelector('.brand-org')?.textContent).toBe('Pease Studio');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/ZEEL/);
    expect(screen.getByText('Zoned Energy Estimator for Labs')).toBeDefined();
  });

  it('always lights the theme button that matches what is painted', () => {
    render(<App />);
    const themeGroup = screen.getByRole('group', { name: /appearance/i });
    const pressed = within(themeGroup)
      .getAllByRole('button')
      .filter((b) => b.getAttribute('aria-pressed') === 'true');
    // Even with no stored preference, one button reflects the resolved theme —
    // an unlit pair would leave the control looking broken on first visit.
    expect(pressed).toHaveLength(1);
  });

  it('opens on the study’s own worked example', () => {
    render(<App />);
    expect(screen.getByText('115,000 sf')).toBeDefined();
    expect(headline()).toContain('133.0');
  });

  it('describes the spread as a range and never as a tolerance', () => {
    render(<App />);
    const statement = screen.getByText(/real laboratory buildings/i);
    expect(statement.textContent).toMatch(/between/);
    expect(statement.textContent).not.toMatch(/±/);
    expect(statement.textContent).not.toMatch(/plus or minus/i);
  });

  it('says "estimated", never "predictive" or "pEUI"', () => {
    const { container } = render(<App />);
    expect(screen.getByText(/Estimated EUI/i)).toBeDefined();
    expect(container.textContent).not.toMatch(/pEUI/);
    expect(container.textContent).not.toMatch(/predictive EUI/i);
  });
});

describe('units', () => {
  it('converts the whole readout, not just the headline', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(headline()).toContain('133.0');
    expect(screen.getByText('115,000 sf')).toBeDefined();

    const units = screen.getByRole('group', { name: /unit system/i });
    await user.click(within(units).getByRole('button', { name: 'SI' }));

    expect(headline()).toContain('420');
    expect(screen.getByText('10,684 m²')).toBeDefined();
    // Scoped: the charts label their axes in the same unit.
    expect(document.querySelector('.headline__unit')?.textContent).toBe('kWh/m²/yr');
  });
});

describe('theme', () => {
  it('has three states, and starts in the one that follows the system', () => {
    render(<App />);
    expect(readPreference()).toBeNull();
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('pins a choice, and stores it', async () => {
    const user = userEvent.setup();
    render(<App />);

    const themeGroup = screen.getByRole('group', { name: /appearance/i });
    await user.click(within(themeGroup).getByRole('button', { name: /dark appearance/i }));

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(readPreference()).toBe('dark');
  });

  it('hands control back to the system when the preference is cleared', () => {
    applyPreference('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    applyPreference(null);
    // Removed, not set to "system" — a stale attribute would beat the media query.
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});
