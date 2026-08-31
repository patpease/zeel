import { useId, useState } from 'react';
import type { Comparison } from '../engine/estimate.js';
import { formatEui, formatPercent } from '../ui/format.js';
import type { UnitSystem } from '../units/units.js';
import { eui as euiUnit } from '../units/units.js';

/**
 * Per-zone change against the baseline, diverging from a zero rule.
 *
 * It answers *which zones respond*, not how much anyone will save. Reducing air
 * change rates barely moves an office and takes a fifth off a vivarium; that
 * asymmetry is the finding, and a single building-level percentage hides it
 * completely.
 *
 * Direction is carried by which side of the rule a bar sits on as well as by
 * colour, and every row is named, so the encoding is never colour alone.
 */

const ROW_H = 17;
const BAR_H = 10;
const LABEL_W = 132;
const HALF = 118;
const AXIS_H = 34;
/**
 * A bar at least this wide carries its own figure inside it. Below that the
 * figure sits outside — which is why the longest bar cannot simply put its label
 * on the outside edge: at full extent that lands on top of the zone name.
 */
const INSIDE_MIN = 46;

interface Props {
  readonly comparison: Comparison;
  readonly units: UnitSystem;
}

export function ComparisonStrip({ comparison, units }: Props) {
  const titleId = useId();
  const [hovered, setHovered] = useState<string | null>(null);

  const rows = comparison.zones.filter((z) => Math.abs(z.deltaFraction) > 0.0005);
  if (rows.length === 0) return null;

  const max = Math.max(...rows.map((z) => Math.abs(z.deltaFraction)));
  const active = rows.find((z) => z.zoneId === hovered) ?? null;
  const readout = active
    ? `${active.label}: ${formatEui(active.baseEui, units)} → ${formatEui(active.eui, units)} ` +
      `${euiUnit.label(units)} · ${formatPercent(active.deltaFraction, 1)}`
    : `Whole building: ${formatEui(comparison.base.eui, units)} → ` +
      `${formatEui(comparison.other.eui, units)} ${euiUnit.label(units)} · ` +
      `${formatPercent(comparison.deltaFraction, 1)}`;
  const width = LABEL_W + HALF * 2 + 92;
  const height = AXIS_H + rows.length * ROW_H + 6;
  const zeroX = LABEL_W + HALF;

  return (
    <figure className="chart" aria-labelledby={titleId}>
      <figcaption className="chart__caption" id={titleId}>
        Which zones respond
        <span className="chart__sub">
          Change against the baseline, zone by zone. Direction and rough size — not a saving.
        </span>
      </figcaption>

      <div className="chart__scroll">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="chart__svg"
          role="img"
          aria-labelledby={titleId}
          style={{ maxWidth: width }}
        >
          <text x={0} y={11} className="sankey__readout">{readout}</text>
          <text x={zeroX - 8} y={25} className="chart__axis-title" textAnchor="end">
            ← uses less
          </text>
          <text x={zeroX + 8} y={25} className="chart__axis-title">
            uses more →
          </text>
          <line
            x1={zeroX} y1={AXIS_H - 6} x2={zeroX} y2={height - 4}
            className="chart__baseline"
          />

          {rows.map((zone, i) => {
            const y = AXIS_H + i * ROW_H;
            const barY = y + (ROW_H - BAR_H) / 2;
            const w = (Math.abs(zone.deltaFraction) / max) * HALF;
            const up = zone.deltaFraction > 0;
            const isActive = hovered === zone.zoneId;
            const inside = w >= INSIDE_MIN;

            return (
              <g
                key={zone.zoneId}
                className={`chart__row${isActive ? ' is-active' : ''}`}
                onMouseEnter={() => setHovered(zone.zoneId)}
                onMouseLeave={() => setHovered(null)}
              >
                <rect x={0} y={y} width={width} height={ROW_H} className="chart__hit" />
                <text x={LABEL_W - 8} y={y + ROW_H / 2 + 3.5} className="chart__row-label">
                  {zone.label}
                </text>
                <rect
                  x={up ? zeroX : zeroX - w}
                  y={barY}
                  width={Math.max(w, 0.6)}
                  height={BAR_H}
                  rx={2}
                  fill={up ? 'var(--delta-up)' : 'var(--delta-down)'}
                />
                <text
                  x={
                    inside
                      ? (up ? zeroX + w - 5 : zeroX - w + 5)
                      : (up ? zeroX + w + 6 : zeroX - w - 6)
                  }
                  y={y + ROW_H / 2 + 3.5}
                  className={`chart__value${inside ? ' chart__value--inside' : ''}`}
                  textAnchor={inside === up ? 'end' : 'start'}
                >
                  {formatPercent(zone.deltaFraction, 1)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <table className="visually-hidden">
        <caption>Change against the baseline by zone</caption>
        <thead>
          <tr>
            <th scope="col">Zone</th>
            <th scope="col">Baseline</th>
            <th scope="col">This case</th>
            <th scope="col">Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((zone) => (
            <tr key={zone.zoneId}>
              <th scope="row">{zone.label}</th>
              <td>{formatEui(zone.baseEui, units)} {euiUnit.label(units)}</td>
              <td>{formatEui(zone.eui, units)} {euiUnit.label(units)}</td>
              <td>{formatPercent(zone.deltaFraction, 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
