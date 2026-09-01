import { useId, useRef, useState } from 'react';
import type { ZoneEstimate } from '../engine/estimate.js';
import type { UnitSystem } from '../units/units.js';
import { energy as energyUnit, eui as euiUnit } from '../units/units.js';
import { groupColorVar } from './groups.js';
import { labelForGroup } from '../model/groups.js';
import { formatEnergy, formatEui } from '../ui/format.js';
import { ExportButton } from '../ui/ExportButton.js';
import type { ExportContext } from '../ui/useExportContext.js';

/**
 * Intensity and total energy, side by side.
 *
 * Two measures on two scales, so two panels sharing one set of rows — never one
 * chart with two axes. The pairing is the point: a café kitchen at 322
 * kBtu/sf/yr is the third most intense room in the building and, on 300 square
 * feet, contributes almost nothing. Intensity alone misleads, which is exactly
 * what the spreadsheet this replaces showed.
 */

const ROW_H = 18;
const BAR_H = 11;
const LABEL_W = 132;
const GAP = 26;
const AXIS_H = 22;

/** A bar with its far end rounded and its baseline end square. */
function barPath(x: number, y: number, w: number, h: number, r = 4): string {
  const radius = Math.min(r, w);
  if (w <= 0) return '';
  return `M${x},${y} H${x + w - radius} A${radius},${radius} 0 0 1 ${x + w},${y + radius}` +
    ` V${y + h - radius} A${radius},${radius} 0 0 1 ${x + w - radius},${y + h} H${x} Z`;
}

interface Props {
  readonly zones: readonly ZoneEstimate[];
  readonly units: UnitSystem;
  readonly exportContext: ExportContext;
}

export function ZoneBars({ zones, units, exportContext }: Props) {
  const titleId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  if (zones.length === 0) return null;

  const rows = [...zones].sort((a, b) => b.energy - a.energy);
  const maxEui = Math.max(...rows.map((z) => z.eui));
  const maxEnergy = Math.max(...rows.map((z) => z.energy));

  const panelW = 168;
  const width = LABEL_W + panelW * 2 + GAP;
  const height = AXIS_H + rows.length * ROW_H + 6;

  const xEui = LABEL_W;
  const xEnergy = LABEL_W + panelW + GAP;

  const ticks = (max: number) => [0, max / 2, max];

  return (
    <figure className="chart" aria-labelledby={titleId}>
      <div className="chart__head">
        <figcaption className="chart__caption" id={titleId}>
          Intensity and total energy by zone
          <span className="chart__sub">
            A room can be intense and irrelevant. The two panels have separate scales.
          </span>
        </figcaption>
        <ExportButton
          target={() => svgRef.current}
          title="Intensity and total energy by zone"
          context={exportContext}
          name="zones"
        />
      </div>

      <div className="chart__scroll">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="chart__svg"
          role="img"
          aria-labelledby={titleId}
          style={{ maxWidth: width }}
        >
          <g className="chart__axis">
            <text x={xEui} y={11} className="chart__axis-title">
              Intensity, {euiUnit.label(units)}
            </text>
            <text x={xEnergy} y={11} className="chart__axis-title">
              Total energy, {energyUnit.label(units)}
            </text>

            {[[xEui, maxEui] as const, [xEnergy, maxEnergy] as const].map(([x0, max]) =>
              ticks(max).map((t, i) => {
                const x = x0 + (max > 0 ? (t / max) * panelW : 0);
                return (
                  <line
                    key={`${x0}-${i}`}
                    x1={x} y1={AXIS_H - 6} x2={x} y2={height - 4}
                    className={i === 0 ? 'chart__baseline' : 'chart__grid'}
                  />
                );
              }),
            )}
          </g>

          {rows.map((zone, i) => {
            const y = AXIS_H + i * ROW_H;
            const barY = y + (ROW_H - BAR_H) / 2;
            const wEui = maxEui > 0 ? (zone.eui / maxEui) * panelW : 0;
            const wEnergy = maxEnergy > 0 ? (zone.energy / maxEnergy) * panelW : 0;
            const active = hovered === zone.zoneId;
            const fill = groupColorVar(zone.fanGroup);

            return (
              <g
                key={zone.zoneId}
                className={`chart__row${active ? ' is-active' : ''}`}
                onMouseEnter={() => setHovered(zone.zoneId)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* A hit target the full width of the row, not just the bar. */}
                <rect x={0} y={y} width={width} height={ROW_H} className="chart__hit" />
                <text x={LABEL_W - 8} y={y + ROW_H / 2 + 3.5} className="chart__row-label">
                  {zone.label}
                </text>
                <path d={barPath(xEui, barY, wEui, BAR_H)} fill={fill} />
                <path d={barPath(xEnergy, barY, wEnergy, BAR_H)} fill={fill} />
                {active && (
                  <>
                    <text x={xEui + wEui + 6} y={y + ROW_H / 2 + 3.5} className="chart__value">
                      {formatEui(zone.eui, units)}
                    </text>
                    <text x={xEnergy + wEnergy + 6} y={y + ROW_H / 2 + 3.5} className="chart__value">
                      {formatEnergy(zone.energy, units)}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* The same numbers, for a reader who cannot use the picture. */}
      <table className="visually-hidden">
        <caption>Intensity and total energy by zone</caption>
        <thead>
          <tr>
            <th scope="col">Zone</th>
            <th scope="col">Air system</th>
            <th scope="col">Intensity</th>
            <th scope="col">Total energy</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((zone) => (
            <tr key={zone.zoneId}>
              <th scope="row">{zone.label}</th>
              <td>{labelForGroup(zone.fanGroup)}</td>
              <td>{formatEui(zone.eui, units)} {euiUnit.label(units)}</td>
              <td>{formatEnergy(zone.energy, units)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
