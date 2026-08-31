interface Option<T extends string> {
  readonly value: T;
  readonly label: string;
  /** Spoken label, where the visible one is an abbreviation. */
  readonly title?: string;
}

interface Props<T extends string> {
  readonly label: string;
  readonly options: readonly Option<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
}

/**
 * A row of mutually exclusive buttons. `aria-pressed` rather than a radio group:
 * these act immediately rather than being submitted, and a screen reader should
 * hear a toggle that is on, not a selection awaiting confirmation.
 */
export function Segmented<T extends string>({ label, options, value, onChange }: Props<T>) {
  return (
    <div className="control-group">
      <span className="segmented__label" id={`seg-${label}`}>{label}</span>
      <div className="segmented" role="group" aria-labelledby={`seg-${label}`}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className="segmented__option"
            aria-pressed={option.value === value}
            title={option.title ?? option.label}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
