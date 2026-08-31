import { useId } from 'react';
import { BENCHMARKS } from '../education/benchmarks.js';
import type { UnitSystem } from '../units/units.js';
import { eui as euiUnit } from '../units/units.js';
import { formatEui } from '../ui/format.js';

/**
 * Where this figure stands, on a scale that goes as far as laboratories actually
 * go. The i2SL mean of 531 is the right-hand end because anchoring at, say, 200
 * would quietly flatter every result.
 */
const W = 720;
const H = 62;
const PAD = 4;
const TRACK_Y = 30;
const MAX = BENCHMARKS.i2sl.mean;

interface Props {
  readonly eui: number;
  readonly units: UnitSystem;
}

export function BenchmarkScale({ eui, units }: Props) {
  const titleId = useId();
  if (eui <= 0) return null;

  const x = (value: number) => PAD + (Math.min(value, MAX) / MAX) * (W - PAD * 2);
  const here = x(eui);
  const overrun = eui > MAX;

  return (
    <figure className="benchmark" aria-labelledby={titleId}>
      <figcaption className="visually-hidden" id={titleId}>
        This programme against the net zero range and the i2SL laboratory benchmark mean
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="benchmark__svg" role="img" aria-labelledby={titleId}>
        <rect x={PAD} y={TRACK_Y} width={W - PAD * 2} height={7} rx={3.5} className="benchmark__track" />

        <rect
          x={x(BENCHMARKS.netZero.low)}
          y={TRACK_Y - 3}
          width={Math.max(x(BENCHMARKS.netZero.high) - x(BENCHMARKS.netZero.low), 3)}
          height={13}
          rx={3}
          className="benchmark__zone"
        />
        <text x={x(BENCHMARKS.netZero.high) + 8} y={TRACK_Y - 8} className="benchmark__tick">
          Net zero {BENCHMARKS.netZero.low}–{BENCHMARKS.netZero.high}
        </text>

        <line
          x1={x(MAX)} y1={TRACK_Y - 5} x2={x(MAX)} y2={TRACK_Y + 12}
          className="benchmark__rule"
        />
        <text x={x(MAX) - 8} y={TRACK_Y - 8} className="benchmark__tick" textAnchor="end">
          i2SL mean {BENCHMARKS.i2sl.mean}
        </text>

        <g transform={`translate(${here}, 0)`}>
          <circle cx={0} cy={TRACK_Y + 3.5} r={7} className="benchmark__here" />
          <text
            x={0} y={TRACK_Y + 30}
            className="benchmark__value"
            textAnchor={here > W - 120 ? 'end' : here < 90 ? 'start' : 'middle'}
          >
            {overrun ? '≥ ' : ''}{formatEui(eui, units)} {euiUnit.label(units)}
          </text>
        </g>
      </svg>
    </figure>
  );
}
