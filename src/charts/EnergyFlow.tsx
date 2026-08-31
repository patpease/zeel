import { useId, useMemo, useState } from 'react';
import type { Estimate } from '../engine/estimate.js';
import { dataset } from '../model/dataset.js';
import { GROUPS } from '../model/groups.js';
import { groupColorVar } from './groups.js';
import { layoutSankey, ribbon } from './sankey.js';
import type { SankeyLinkInput, SankeyNodeInput } from './sankey.js';
import type { UnitSystem } from '../units/units.js';
import { formatEnergy, formatPercent } from '../ui/format.js';

/**
 * Fuel to end use to air system.
 *
 * The one drawing that answers "and where does it actually go", which the
 * spreadsheet this replaces never attempted — though its data always supported
 * it. Hovering anything dims the rest, so a single band can be traced from the
 * meter to the rooms that caused it.
 *
 * End uses keep the studio's service hues — blue is cooling, orange is heating —
 * and the chart palette deliberately does not reach them. Those colours carry
 * physical meaning rather than identity, and a Sankey with green heating would
 * be a diagram that lies. Air systems, which are identities, take the palette.
 */

const NODE_W = 11;
const HEIGHT = 330;
const GAP = 9;
const COLUMN_X = [96, 300, 560];
const WIDTH = 800;
const TOP = 26;

const SERVICE_COLOUR: Record<string, string> = {
  process: 'var(--use-plug)',
  air: 'var(--use-fans)',
  cooling: 'var(--use-cooling)',
  heating: 'var(--use-heating)',
  dhw: 'var(--use-dhw)',
};

interface Props {
  readonly result: Estimate;
  readonly units: UnitSystem;
}

export function EnergyFlow({ result, units }: Props) {
  const titleId = useId();
  const [hover, setHover] = useState<string | null>(null);

  const layout = useMemo(() => {
    const nodes: SankeyNodeInput[] = [
      { id: 'fuel:electricity', label: 'Electricity', column: 0, colour: 'var(--ink)' },
      { id: 'fuel:gas', label: 'Natural gas', column: 0, colour: 'var(--ink)' },
    ];
    const links: SankeyLinkInput[] = [];

    // End uses in dataset order, which runs electricity first and gas last.
    // That ordering is what keeps the ribbons from crossing each other.
    for (const use of dataset.endUses) {
      const colour = SERVICE_COLOUR[use.service] ?? 'var(--use-plug)';
      nodes.push({ id: `use:${use.id}`, label: use.label, column: 1, colour });

      const total = result.endUses.find((u) => u.id === use.id)?.energy ?? 0;
      links.push({
        source: `fuel:${use.fuel}`, target: `use:${use.id}`, value: total, colour,
      });

      for (const group of GROUPS) {
        const value = result.zones
          .filter((z) => z.fanGroup === group.id)
          .reduce((a, z) => a + (z.endUses[use.id] ?? 0), 0);
        if (value <= 0) continue;
        links.push({
          source: `use:${use.id}`, target: `group:${group.id}`, value, colour,
        });
      }
    }

    for (const group of GROUPS) {
      nodes.push({
        id: `group:${group.id}`, label: group.label, column: 2,
        colour: groupColorVar(group.id),
      });
    }

    return layoutSankey(nodes, links, {
      columnX: COLUMN_X, nodeWidth: NODE_W, height: HEIGHT, gap: GAP,
    });
  }, [result]);

  if (layout.nodes.length === 0) return null;

  const touched = (id: string): boolean => {
    if (hover === null) return true;
    if (hover === id) return true;
    const link = layout.links.find((l) => l.id === hover);
    if (link) return link.source === id || link.target === id;
    // Hovering a node lights everything attached to it.
    return layout.links.some(
      (l) => (l.source === hover && l.target === id) || (l.target === hover && l.source === id),
    );
  };

  const linkLit = (linkId: string, source: string, target: string): boolean => {
    if (hover === null) return true;
    return hover === linkId || hover === source || hover === target;
  };

  const hovered = hover === null ? null
    : layout.links.find((l) => l.id === hover) ?? null;
  const hoveredNode = hover === null ? null
    : layout.nodes.find((n) => n.id === hover) ?? null;

  const readout = hovered
    ? `${layout.nodes.find((n) => n.id === hovered.source)?.label} → ` +
      `${layout.nodes.find((n) => n.id === hovered.target)?.label} · ` +
      `${formatEnergy(hovered.value, units)} · ${formatPercent(hovered.value / result.energy)}`
    : hoveredNode
      ? `${hoveredNode.label} · ${formatEnergy(hoveredNode.value, units)} · ` +
        `${formatPercent(hoveredNode.value / result.energy)}`
      : `${formatEnergy(result.energy, units)} in total`;

  return (
    <figure className="chart" aria-labelledby={titleId}>
      <figcaption className="chart__caption" id={titleId}>
        How the energy flows
        <span className="chart__sub">
          Fuel, to what it is spent on, to the rooms that spent it. Hover to trace one band.
        </span>
      </figcaption>

      <div className="chart__scroll">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT + TOP + 18}`}
          className="sankey"
          role="img"
          aria-labelledby={titleId}
          onMouseLeave={() => setHover(null)}
        >
          <text x={0} y={13} className="sankey__readout">{readout}</text>

          <g transform={`translate(0, ${TOP})`}>
            {layout.links.map((link) => (
              <path
                key={link.id}
                d={ribbon(link)}
                fill={link.colour}
                className="sankey__link"
                opacity={linkLit(link.id, link.source, link.target) ? 0.5 : 0.08}
                onMouseEnter={() => setHover(link.id)}
              />
            ))}

            {layout.nodes.map((node) => {
              const isGroup = node.column === 2;
              const anchorEnd = node.column === 0;
              return (
                <g
                  key={node.id}
                  className="sankey__node"
                  opacity={touched(node.id) ? 1 : 0.3}
                  onMouseEnter={() => setHover(node.id)}
                >
                  <rect
                    x={node.x} y={node.y0} width={NODE_W} height={Math.max(node.y1 - node.y0, 1)}
                    fill={node.colour} rx={2}
                  />
                  <text
                    x={anchorEnd ? node.x - 8 : node.x + NODE_W + 8}
                    y={(node.y0 + node.y1) / 2 + 3.5}
                    className={`sankey__label${isGroup ? ' sankey__label--group' : ''}`}
                    textAnchor={anchorEnd ? 'end' : 'start'}
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <table className="visually-hidden">
        <caption>Energy by fuel, end use and air system</caption>
        <thead>
          <tr><th scope="col">From</th><th scope="col">To</th><th scope="col">Energy</th></tr>
        </thead>
        <tbody>
          {layout.links.map((link) => (
            <tr key={link.id}>
              <th scope="row">{layout.nodes.find((n) => n.id === link.source)?.label}</th>
              <td>{layout.nodes.find((n) => n.id === link.target)?.label}</td>
              <td>{formatEnergy(link.value, units)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
