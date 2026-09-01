import { PALETTES } from '../charts/palettes.js';
import type { Palette } from '../charts/palettes.js';
import type { ThemeChoice } from './theme.js';

interface Props {
  readonly palette: Palette;
  readonly theme: ThemeChoice;
  readonly onChange: (id: string) => void;
}

/**
 * A native select, not a custom menu. It is one choice from six, it has to work
 * on a phone and with a keyboard, and nothing about it is worth reimplementing.
 *
 * The swatch row beside it previews the ramp in the theme actually being painted,
 * so the choice can be made by looking rather than by reading names.
 */
export function PaletteSelect({ palette, theme, onChange }: Props) {
  return (
    <div className="palette-select">
      <span className="palette-select__swatches" aria-hidden="true">
        {palette[theme].map((colour, i) => (
          <svg key={i} className="palette-select__chip" viewBox="0 0 8 16" aria-hidden="true">
            <rect width="8" height="16" rx="2" fill={colour} />
          </svg>
        ))}
      </span>
      <select
        className="palette-select__control"
        aria-label="Chart palette"
        value={palette.id}
        onChange={(event) => onChange(event.target.value)}
      >
        {PALETTES.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
