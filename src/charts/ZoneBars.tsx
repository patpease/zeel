import { useId, useRef, useState } from 'react';
import type { ZoneEstimate } from '../engine/estimate.js';
import type { UnitSystem } from '../units/units.js';
import { energy as energyUnit, eui as euiUnit } from '../units/units.js';
import { groupColorVar } from './groups.js';
import { labelForGroup } from '../model/groups.js';
import { formatEnergy, formatEui } from '../ui/format.js';
import { useWidth } from './useWidth.js';
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
/** Below this the side-by-side drawing no longer fits: its SVG had `min-width: 460px`. */
const COMPACT_BELOW = 460;
/** Room right of the longest bar for the value shown on hover, in the phone layout. */
const VALUE_ROOM = 44;
/** Space between the two stacked panels in the phone layout. */
const SPLIT = 20;

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
  // The box the SVG is drawn in, not the figure: the figure's padding is not
  // space the drawing has.
  const boxRef = useRef<HTMLDivElement>(null);
  const measured = useWidth(boxRef, COMPACT_BELOW);
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
          desktop={() => <ZoneBars zones={zones} units={units} exportContext={exportContext} />}
        />
      </div>

      <div className="chart__scroll" ref={boxRef}>
        {measured.compact ? (
          <CompactZoneBars
            svgRef={svgRef}
            titleId={titleId}
            rows={rows}
            width={measured.width}
            units={units}
            hovered={hovered}
            onHover={setHovered}
          />
        ) : (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            className="chart__svg"
            data-layout="standard"
            role="img"
            aria-labelledby={titleId}
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
        )}
      </div>

      {/* The same numbers, for a reader who cannot use the picture. */}
      {/* Wrapped, because a table ignores `width: 1px`: it is always at least
          as wide as its contents, and a 540 px table positioned absolutely
          made the whole page scroll sideways on a phone. The wrapper takes
          the 1 px and clips; the table keeps its class so it is still found
          as `table.visually-hidden`. */}
      <div className="visually-hidden">
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
      </div>
    </figure>
  );
}

/**
 * The phone layout: the two panels stacked, intensity above total energy.
 *
 * Side by side, two 168-unit panels and a 132-unit label column need 494 px,
 * and a phone gives the chart about 320 — so the second panel scrolled off
 * the edge, and with it the half of the pairing that says a room is
 * irrelevant. Stacked, each panel gets the full width left after its labels,
 * and every row is named in both, so neither panel has to be read against the
 * other's labels. The cost is distance: a zone's two bars are one panel apart
 * rather than one gap. The rows keep the same order in both panels, sorted by
 * total energy, so a zone sits at the same position in each.
 *
 * Drawn at the width it is shown, so type renders at its stylesheet size.
 */
function CompactZoneBars({
  svgRef, titleId, rows, width, units, hovered, onHover,
}: {
  readonly svgRef: React.RefObject<SVGSVGElement | null>;
  readonly titleId: string;
  readonly rows: readonly ZoneEstimate[];
  readonly width: number;
  readonly units: UnitSystem;
  readonly hovered: string | null;
  readonly onHover: (zoneId: string | null) => void;
}) {
  const panelW = Math.max(40, width - LABEL_W - VALUE_ROOM);
  const blockH = AXIS_H + rows.length * ROW_H;
  const height = blockH * 2 + SPLIT + 6;

  const panels = [
    {
      key: 'eui',
      top: 0,
      title: `Intensity, ${euiUnit.label(units)}`,
      max: Math.max(...rows.map((z) => z.eui)),
      of: (z: ZoneEstimate) => z.eui,
      format: (z: ZoneEstimate) => formatEui(z.eui, units),
    },
    {
      key: 'energy',
      top: blockH + SPLIT,
      title: `Total energy, ${energyUnit.label(units)}`,
      max: Math.max(...rows.map((z) => z.energy)),
      of: (z: ZoneEstimate) => z.energy,
      format: (z: ZoneEstimate) => formatEnergy(z.energy, units),
    },
  ];

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      className="chart__svg chart__svg--compact"
      data-layout="compact"
      role="img"
      aria-labelledby={titleId}
    >
      {panels.map((panel) => (
        <g key={panel.key}>
          <text x={LABEL_W} y={panel.top + 11} className="chart__axis-title">{panel.title}</text>
          {[0, panel.max / 2, panel.max].map((t, i) => {
            const x = LABEL_W + (panel.max > 0 ? (t / panel.max) * panelW : 0);
            return (
              <line
                key={i}
                x1={x} y1={panel.top + AXIS_H - 6} x2={x} y2={panel.top + blockH + 2}
                className={i === 0 ? 'chart__baseline' : 'chart__grid'}
              />
            );
          })}

          {rows.map((zone, i) => {
            const y = panel.top + AXIS_H + i * ROW_H;
            const barY = y + (ROW_H - BAR_H) / 2;
            const w = panel.max > 0 ? (panel.of(zone) / panel.max) * panelW : 0;
            const active = hovered === zone.zoneId;
            return (
              <g
                key={zone.zoneId}
                className={`chart__row${active ? ' is-active' : ''}`}
                onMouseEnter={() => onHover(zone.zoneId)}
                onMouseLeave={() => onHover(null)}
              >
                <rect x={0} y={y} width={width} height={ROW_H} className="chart__hit" />
                <text x={LABEL_W - 8} y={y + ROW_H / 2 + 3.5} className="chart__row-label">
                  {zone.label}
                </text>
                <path d={barPath(LABEL_W, barY, w, BAR_H)} fill={groupColorVar(zone.fanGroup)} />
                {active && (
                  <text x={LABEL_W + w + 6} y={y + ROW_H / 2 + 3.5} className="chart__value">
                    {panel.format(zone)}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      ))}
    </svg>
  );
}
