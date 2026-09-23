import { useId, useRef, useState } from 'react';
import type { Comparison } from '../engine/estimate.js';
import { formatEui, formatPercent } from '../ui/format.js';
import type { UnitSystem } from '../units/units.js';
import { eui as euiUnit } from '../units/units.js';
import { ExportButton } from '../ui/ExportButton.js';
import type { ExportContext } from '../ui/useExportContext.js';
import { useWidth } from './useWidth.js';

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
/** Below this the desktop drawing no longer fits: its SVG had `min-width: 460px`. */
const COMPACT_BELOW = 460;
/**
 * The phone layout prints every figure in a column of its own at the right
 * edge, this wide. Beside the bars there is no room: a figure outside a short
 * bar on the left half ran into the zone name ("Instruction la12.6%"), and at
 * phone width the halves are too narrow to give it the 90 units it needs. In a
 * column the sign still carries the direction, and the bar still carries it by
 * which side of the rule it sits on. `-20.1%` in the value face is about 36.
 */
const VALUE_COLUMN = 44;

interface Props {
  readonly comparison: Comparison;
  readonly units: UnitSystem;
  readonly exportContext: ExportContext;
}

export function ComparisonStrip({
  comparison, units, exportContext,
}: Props) {
  const titleId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  // The box the SVG is drawn in: the figure's padding is not space it has.
  const boxRef = useRef<HTMLDivElement>(null);
  const measured = useWidth(boxRef, COMPACT_BELOW);
  const compact = measured.compact;
  const [hovered, setHovered] = useState<string | null>(null);

  const rows = comparison.zones.filter((z) => Math.abs(z.deltaFraction) > 0.0005);
  if (rows.length === 0) return null;

  const max = Math.max(...rows.map((z) => Math.abs(z.deltaFraction)));
  const active = rows.find((z) => z.zoneId === hovered) ?? null;
  // Subject and figures, kept apart so the phone layout can put them on two
  // lines: one line of it is ~300 px of mono, wider than a phone's chart.
  const subject = active ? active.label : 'Whole building';
  const figures = active
    ? `${formatEui(active.baseEui, units)} → ${formatEui(active.eui, units)} ` +
      `${euiUnit.label(units)} · ${formatPercent(active.deltaFraction, 1)}`
    : `${formatEui(comparison.base.eui, units)} → ` +
      `${formatEui(comparison.other.eui, units)} ${euiUnit.label(units)} · ` +
      `${formatPercent(comparison.deltaFraction, 1)}`;
  const readout = `${subject}: ${figures}`;

  /*
   * The phone layout is the same drawing at the width it is shown: the label
   * column stays, the two halves share what is left, and the readout takes two
   * lines, which pushes the rows down by one.
   */
  const half = compact ? Math.max(40, (measured.width - LABEL_W - VALUE_COLUMN - 8) / 2) : HALF;
  const top = compact ? AXIS_H + 14 : AXIS_H;
  const width = compact ? measured.width : LABEL_W + HALF * 2 + 92;
  const height = top + rows.length * ROW_H + 6;
  const zeroX = LABEL_W + half;

  return (
    <figure className="chart" aria-labelledby={titleId}>
      <div className="chart__head">
        <figcaption className="chart__caption" id={titleId}>
          Which zones respond
          <span className="chart__sub">
            Change against the baseline, zone by zone. Direction and rough size — not a saving.
          </span>
        </figcaption>
        <ExportButton
          target={() => svgRef.current}
          title="Which zones respond"
          context={exportContext}
          name="comparison"
          desktop={() => (
            <ComparisonStrip comparison={comparison} units={units} exportContext={exportContext} />
          )}
        />
      </div>

      <div className="chart__scroll" ref={boxRef}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className={`chart__svg ${compact ? 'chart__svg--compact' : 'chart__svg--strip'}`}
          data-layout={compact ? 'compact' : 'standard'}
          role="img"
          aria-labelledby={titleId}
        >
          {compact ? (
            <text className="sankey__readout">
              <tspan x={0} y={11}>{subject}</tspan>
              <tspan x={0} y={25}>{figures}</tspan>
            </text>
          ) : (
            <text x={0} y={11} className="sankey__readout">{readout}</text>
          )}
          <text x={zeroX - 8} y={top - 9} className="chart__axis-title" textAnchor="end">
            ← uses less
          </text>
          <text x={zeroX + 8} y={top - 9} className="chart__axis-title">
            uses more →
          </text>
          <line
            x1={zeroX} y1={top - 6} x2={zeroX} y2={height - 4}
            className="chart__baseline"
          />

          {rows.map((zone, i) => {
            const y = top + i * ROW_H;
            const barY = y + (ROW_H - BAR_H) / 2;
            const w = (Math.abs(zone.deltaFraction) / max) * half;
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
                {compact ? (
                  <text x={width} y={y + ROW_H / 2 + 3.5} className="chart__value" textAnchor="end">
                    {formatPercent(zone.deltaFraction, 1)}
                  </text>
                ) : (
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
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Wrapped, because a table ignores `width: 1px`: it is always at least
          as wide as its contents, and a 540 px table positioned absolutely
          made the whole page scroll sideways on a phone. The wrapper takes
          the 1 px and clips; the table keeps its class so it is still found
          as `table.visually-hidden`. */}
      <div className="visually-hidden">
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
      </div>
    </figure>
  );
}
