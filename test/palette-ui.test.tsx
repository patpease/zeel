// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/ui/App.js';
import { getPalette, DEFAULT_PALETTE_ID } from '../src/charts/palettes.js';

const read = (name: string) => document.documentElement.style.getPropertyValue(name);

describe('choosing a palette', () => {
  it('offers every palette by name', () => {
    render(<App />);
    const select = screen.getByRole('combobox', { name: /chart palette/i });
    const options = within(select).getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['Default', 'Okabe–Ito', 'Zissou', 'Aurora', 'Victory', 'Fantastic Fox']);
  });

  it('loads on the default, with nothing written to the document', () => {
    render(<App />);
    const select = screen.getByRole('combobox', { name: /chart palette/i }) as HTMLSelectElement;
    expect(select.value).toBe(DEFAULT_PALETTE_ID);
    expect((within(select).getAllByRole('option')[0] as HTMLOptionElement).selected).toBe(true);
    // Nothing inline: the stylesheet governs, so the media query still works
    // before any JavaScript has had an opinion.
    expect(read('--group-lab')).toBe('');
  });

  it('writes the chosen ramp onto the document', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.selectOptions(screen.getByRole('combobox', { name: /chart palette/i }), 'zissou');
    expect(read('--group-lab')).toBe(getPalette('zissou').light[0]);
  });

  it('hands control back to the stylesheet when the default is chosen again', async () => {
    const user = userEvent.setup();
    render(<App />);
    const select = screen.getByRole('combobox', { name: /chart palette/i });

    await user.selectOptions(select, 'aurora');
    expect(read('--group-lab')).not.toBe('');

    await user.selectOptions(select, 'default');
    // Removed, not overwritten. An inline value would freeze one theme's colours
    // and stop the media query working.
    expect(read('--group-lab')).toBe('');
  });

  it('follows the theme, so a ramp keeps its dark steps', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.selectOptions(screen.getByRole('combobox', { name: /chart palette/i }), 'victory');
    expect(read('--group-lab')).toBe(getPalette('victory').light[0]);

    const themeGroup = screen.getByRole('group', { name: /appearance/i });
    await user.click(within(themeGroup).getByRole('button', { name: /dark appearance/i }));
    expect(read('--group-lab')).toBe(getPalette('victory').dark[0]);
  });

  it('remembers the choice', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.selectOptions(screen.getByRole('combobox', { name: /chart palette/i }), 'fantastic-fox');
    expect(window.localStorage.getItem('zeel:palette')).toBe('fantastic-fox');
  });

  it('credits the source and its licence where the reader can see it', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.selectOptions(screen.getByRole('combobox', { name: /chart palette/i }), 'zissou');
    const credit = screen.getByText(/wesanderson::Zissou1/i);
    expect(credit.textContent).toMatch(/MIT/);
    expect(credit.textContent).toMatch(/re-stepped/i);
  });
});
