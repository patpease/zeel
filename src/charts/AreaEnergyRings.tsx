import { useId, useMemo, useRef, useState } from 'react';
import type { Estimate } from '../engine/estimate.js';
import { GROUPS } from '../model/groups.js';
import { groupColorVar } from './groups.js';
import { formatPercent } from '../ui/format.js';
import { ExportButton } from '../ui/ExportButton.js';

/**
 * Area outside, energy inside, split the same way.
 *
 * The mismatch between the two rings is the study's finding, and putting them
 * concentric means the reader sees it rather than computing it: on the base
 * programme the laboratory zones take under half the floor and nearly nine
 * tenths of the energy.
 */

const SIZE = 300;
const C = SIZE / 2;
const OUTER = [118, 142] as const; // area
const INNER = [76, 100] as const;  // energy
/** A hairline of surface between segments, in degrees at the outer radius. */
const PAD_DEG = 1.2;

const polar = (r: number, deg: number): [number, number] => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [C + r * Math.cos(rad), C + r * Math.sin(rad)];
};

function segment(rInner: number, rOuter: number, start: number, end: number): string {
  // A full circle cannot be drawn as one arc — its start and end points coincide.
  const sweep = Math.min(end - start, 359.99);
  if (sweep <= 0.01) return '';
  const stop = start + sweep;
  const large = sweep > 180 ? 1 : 0;
  const [x1, y1] = polar(rOuter, start);
  const [x2, y2] = polar(rOuter, stop);
  const [x3, y3] = polar(rInner, stop);
  const [x4, y4] = polar(rInner, start);
  return `M${x1},${y1} A${rOuter},${rOuter} 0 ${large} 1 ${x2},${y2}` +
    ` L${x3},${y3} A${rInner},${rInner} 0 ${large} 0 ${x4},${y4} Z`;
}

interface Ring {
  readonly groupId: string;
  readonly label: string;
  readonly start: number;
  readonly end: number;
  readonly share: number;
}

function ringOf(values: Map<string, number>): Ring[] {
  const total = [...values.values()].reduce((a, b) => a + b, 0);
  if (total <= 0) return [];
  let cursor = 0;
  const out: Ring[] = [];
  for (const group of GROUPS) {
    const value = values.get(group.id) ?? 0;
    if (value <= 0) continue;
    const share = value / total;
    const sweep = share * 360;
    out.push({
      groupId: group.id,
      label: group.label,
      start: cursor + PAD_DEG / 2,
      end: cursor + sweep - PAD_DEG / 2,
      share,
    });
    cursor += sweep;
  }
  return out;
}

interface Props {
  readonly result: Estimate;
  readonly exportScope: string;
  readonly exportProvenance: string;
  readonly exportSlug: string;
}

export function AreaEnergyRings({ result, exportScope, exportProvenance, exportSlug }: Props) {
  const titleId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const { areaRing, energyRing, labShare } = useMemo(() => {
    const areas = new Map<string, number>();
    const energies = new Map<string, number>();
    for (const zone of result.zones) {
      areas.set(zone.fanGroup, (areas.get(zone.fanGroup) ?? 0) + zone.area);
      energies.set(zone.fanGroup, (energies.get(zone.fanGroup) ?? 0) + zone.energy);
    }
    const labGroups = ['lab', 'vivarium', 'special-lab'];
    const sum = (m: Map<string, number>, keys: string[]) =>
      keys.reduce((a, k) => a + (m.get(k) ?? 0), 0);
    const totalArea = [...areas.values()].reduce((a, b) => a + b, 0);
    const totalEnergy = [...energies.values()].reduce((a, b) => a + b, 0);
    return {
      areaRing: ringOf(areas),
      energyRing: ringOf(energies),
      labShare: {
        area: totalArea > 0 ? sum(areas, labGroups) / totalArea : 0,
        energy: totalEnergy > 0 ? sum(energies, labGroups) / totalEnergy : 0,
      },
    };
  }, [result]);

  if (areaRing.length === 0) return null;

  const dim = (groupId: string) => (hovered !== null && hovered !== groupId ? 0.28 : 1);

  return (
    <figure className="chart" aria-labelledby={titleId}>
      <div className="chart__head">
        <figcaption className="chart__caption" id={titleId}>
          Where the floor goes, and where the energy goes
          <span className="chart__sub">
            Outer ring is floor area; inner ring is energy. Same split, same colours.
          </span>
        </figcaption>
        <ExportButton
          target={() => svgRef.current}
          title="Where the floor goes, and where the energy goes"
          scope={exportScope}
          provenance={exportProvenance}
          fileName={`${exportSlug}-area-energy.png`}
        />
      </div>

      <div className="rings">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="rings__svg"
          role="img"
          aria-labelledby={titleId}
        >
          {areaRing.map((seg) => (
            <path
              key={`a-${seg.groupId}`}
              d={segment(OUTER[0], OUTER[1], seg.start, seg.end)}
              fill={groupColorVar(seg.groupId)}
              opacity={dim(seg.groupId)}
              onMouseEnter={() => setHovered(seg.groupId)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
          {energyRing.map((seg) => (
            <path
              key={`e-${seg.groupId}`}
              d={segment(INNER[0], INNER[1], seg.start, seg.end)}
              fill={groupColorVar(seg.groupId)}
              opacity={dim(seg.groupId)}
              onMouseEnter={() => setHovered(seg.groupId)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}

          <text x={C} y={C - 12} className="rings__lead">Lab space</text>
          <text x={C} y={C + 14} className="rings__figure">
            {formatPercent(labShare.area)}
            <tspan className="rings__arrow"> → </tspan>
            {formatPercent(labShare.energy)}
          </text>
          <text x={C} y={C + 32} className="rings__foot">of floor → of energy</text>
        </svg>

        <ul className="legend">
          {GROUPS.map((group) => {
            const a = areaRing.find((s) => s.groupId === group.id);
            const e = energyRing.find((s) => s.groupId === group.id);
            if (!a && !e) return null;
            return (
              <li
                key={group.id}
                className="legend__item"
                onMouseEnter={() => setHovered(group.id)}
                onMouseLeave={() => setHovered(null)}
              >
                <span className="legend__swatch" style={{ background: groupColorVar(group.id) }} />
                <span className="legend__label">{group.label}</span>
                <span className="legend__values">
                  {formatPercent(a?.share ?? 0)} / <strong>{formatPercent(e?.share ?? 0)}</strong>
                </span>
              </li>
            );
          })}
          <li className="legend__key">floor area / energy</li>
        </ul>
      </div>
    </figure>
  );
}
