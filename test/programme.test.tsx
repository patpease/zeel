// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/ui/App.js';
import { PRESETS } from '../src/model/presets.js';
import { estimate } from '../src/engine/estimate.js';

const areaField = (label: string) => screen.getByLabelText(new RegExp(`^${label} area`, 'i'));
const total = () => screen.getByRole('row', { name: /^total/i });

describe('the worked examples', () => {
  it('reproduce the EUIs the study reported for them', () => {
    for (const preset of PRESETS) {
      const result = estimate(preset.areas, 'baseline');
      expect(Math.round(result.eui), preset.label).toBe(preset.reportedEui);
    }
  });

  it('are all the same floor area, so only the mix differs', () => {
    for (const preset of PRESETS) {
      const area = Object.values(preset.areas).reduce((a, b) => a + b, 0);
      expect(area, preset.label).toBe(115000);
    }
  });

  it('swap the whole programme when pressed', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText('133.0')).toBeDefined();

    await user.click(screen.getByRole('button', { name: /Reaching for 50/i }));

    expect(screen.getByText('52.2')).toBeDefined();
    expect(within(total()).getByText('115,000')).toBeDefined();
    // The vivarium is gone in that programme, and the field has to show it.
    expect((areaField('Vivarium') as HTMLInputElement).value).toBe('');
  });

  it('clears to an empty programme without dividing by zero', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^Clear$/i }));
    expect(within(total()).getByText('0')).toBeDefined();
    expect(screen.getByText('0.0')).toBeDefined();
  });
});

describe('editing', () => {
  it('keeps the field the user is typing in, and updates the estimate', async () => {
    const user = userEvent.setup();
    render(<App />);

    const vivarium = areaField('Vivarium') as HTMLInputElement;
    await user.clear(vivarium);
    // 4% of the area carrying 19% of the energy: removing it should move the
    // building hard, and this is the interaction that shows it.
    expect(screen.getByText('112.4')).toBeDefined();

    // Doubling it instead: the building grows by 4% of floor area and gains
    // 19% more energy, so the intensity climbs rather than returning to 133.
    await user.type(vivarium, '9240');
    expect(vivarium.value).toBe('9240');
    expect(screen.getByText('152.0')).toBeDefined();
  });

  it('accepts a number typed with thousands separators', async () => {
    const user = userEvent.setup();
    render(<App />);
    const office = areaField('Office') as HTMLInputElement;
    await user.clear(office);
    await user.type(office, '20,000');
    expect(office.value).toBe('20,000');
    expect(within(total()).getByText('124,580')).toBeDefined();
  });

  it('refuses a keystroke that would not be a number', async () => {
    const user = userEvent.setup();
    render(<App />);
    const office = areaField('Office') as HTMLInputElement;
    await user.clear(office);
    await user.type(office, '12x');
    expect(office.value).toBe('12');
  });
});

describe('pasting a column out of a spreadsheet', () => {
  it('fills downward from the field pasted into', async () => {
    const user = userEvent.setup();
    render(<App />);

    // The three support labs sit together at the top of the lab group.
    const first = areaField('Support lab — chemistry') as HTMLInputElement;
    await user.click(first);
    await user.paste('1000\n2000\n3000');

    expect(first.value).toBe('1000');
    expect((areaField('Support lab — general') as HTMLInputElement).value).toBe('2000');
    expect((areaField('Support lab — biology') as HTMLInputElement).value).toBe('3000');
  });

  it('handles a tab-separated row as well as a column', async () => {
    const user = userEvent.setup();
    render(<App />);
    const first = areaField('Support lab — chemistry') as HTMLInputElement;
    await user.click(first);
    await user.paste('500\t600');
    expect(first.value).toBe('500');
    expect((areaField('Support lab — general') as HTMLInputElement).value).toBe('600');
  });

  it('leaves a single pasted value to behave like an ordinary paste', async () => {
    const user = userEvent.setup();
    render(<App />);
    const general = areaField('Support lab — general') as HTMLInputElement;
    const before = general.value;
    const first = areaField('Support lab — chemistry') as HTMLInputElement;
    await user.clear(first);
    await user.paste('7000');
    expect(first.value).toBe('7000');
    expect(general.value).toBe(before);
  });
});

describe('grouping', () => {
  it('leads with the air system that carries the most energy', () => {
    render(<App />);
    const headers = screen.getAllByRole('columnheader')
      .filter((el) => el.classList.contains('group-row__name'))
      .map((el) => el.textContent);
    expect(headers[0]).toBe('Lab / high energy');
    expect(headers[headers.length - 1]).toBe('Auditorium');
  });

  it('shows each air system’s share of the building’s energy', () => {
    render(<App />);
    const labRow = screen.getByRole('row', { name: /Lab \/ high energy/i });
    // 62% of the energy on the study's own programme.
    expect(within(labRow).getByText('62%')).toBeDefined();
  });

  it('shows every zone’s intensity beside its field', () => {
    render(<App />);
    expect(screen.getByText('624.3')).toBeDefined(); // vivarium
    expect(screen.getByText('12.1')).toBeDefined();  // back of house
  });
});

describe('units', () => {
  it('converts the fields, not just the readout', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect((areaField('Vivarium') as HTMLInputElement).value).toBe('4620');

    const units = screen.getByRole('group', { name: /unit system/i });
    await user.click(within(units).getByRole('button', { name: 'SI' }));

    expect((areaField('Vivarium') as HTMLInputElement).value).toBe('429');
    expect(within(total()).getByText('10,684')).toBeDefined();
  });
});
