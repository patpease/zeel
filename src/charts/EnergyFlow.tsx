import { useId, useMemo, useRef, useState } from 'react';
import type { Estimate } from '../engine/estimate.js';
import { dataset } from '../model/dataset.js';
import { GROUPS } from '../model/groups.js';
import { groupColorVar } from './groups.js';
import { layoutSankey, ribbon } from './sankey.js';
import type { SankeyLinkInput, SankeyNodeInput } from './sankey.js';
import type { UnitSystem } from '../units/units.js';
import { formatEnergy, formatPercent } from '../ui/format.js';
import { ExportButton } from '../ui/ExportButton.js';
import type { ExportContext } from '../ui/useExportContext.js';
import { useWidth } from './useWidth.js';

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

/**
 * The phone layout.
 *
 * The desktop drawing needs 640 px — its SVG carried that as a `min-width` and
 * scrolled sideways inside the card, which on a phone hid the third column,
 * the rooms, which is the column the diagram exists to reach. Below that it is
 * drawn at the width it is shown instead, with the same three columns and the
 * same flow, and the labels move inside the plot:
 *
 *   - fuel labels to the RIGHT of their bars,
 *   - end-use labels to the LEFT of theirs,
 *   - air-system labels to the LEFT of theirs, at the right edge,
 *
 * all painted with the surface halo the middle column already used, so a label
 * over a ribbon still reads. The middle column sits right of centre so the
 * longest end use ("Heat recovery & HHW pumps") ends before its own bar, and
 * the air-system labels start after it. Taller than the desktop drawing,
 * because a phone has height to spare and taller nodes space the labels out.
 */
const COMPACT_BELOW = 640;
const COMPACT_HEIGHT = 400;
const COMPACT_TOP = 38;
const COMPACT_GAP = 10;
/** Where the middle column sits, as a share of the width. */
const COMPACT_MIDDLE = 0.56;
/** A label's width, estimated: the label face averages about 5.6 px a character at 10.5 px. */
const labelWidth = (text: string) => text.length * 5.6;
/** A label's line, for deciding whether two collide. */
const LABEL_LINE = 12;

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
  readonly exportContext: ExportContext;
}

export function EnergyFlow({ result, units, exportContext }: Props) {
  const titleId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  // The box the SVG is drawn in: the figure's padding is not space it has.
  const boxRef = useRef<HTMLDivElement>(null);
  const measured = useWidth(boxRef, COMPACT_BELOW);
  const compact = measured.compact;
  const width = compact ? measured.width : WIDTH;
  const height = compact ? COMPACT_HEIGHT : HEIGHT;
  const top = compact ? COMPACT_TOP : TOP;
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

    return layoutSankey(nodes, links, compact
      ? {
          columnX: [0, Math.round(width * COMPACT_MIDDLE), width - NODE_W],
          nodeWidth: NODE_W, height, gap: COMPACT_GAP,
        }
      : { columnX: COLUMN_X, nodeWidth: NODE_W, height: HEIGHT, gap: GAP });
  }, [result, compact, width, height]);

  /**
   * Where each label goes, and which way it runs.
   *
   * The desktop rule is the original one: fuels left of their bars, everything
   * else right. The phone rule is the one above, plus one correction. A fuel
   * label and a long end-use label can land on the same line — both sit over
   * the first span of ribbons — so a fuel label that would touch one moves to
   * the top of its own bar, or failing that the bottom.
   */
  const labels = useMemo(() => {
    const placed = new Map<string, { x: number; y: number; anchor: 'start' | 'end' }>();
    for (const node of layout.nodes) {
      const middle = (node.y0 + node.y1) / 2 + 3.5;
      if (!compact) {
        const anchorEnd = node.column === 0;
        placed.set(node.id, {
          x: anchorEnd ? node.x - 8 : node.x + NODE_W + 8, y: middle, anchor: anchorEnd ? 'end' : 'start',
        });
      } else if (node.column === 0) {
        placed.set(node.id, { x: node.x + NODE_W + 8, y: middle, anchor: 'start' });
      } else {
        placed.set(node.id, { x: node.x - 8, y: middle, anchor: 'end' });
      }
    }
    if (!compact) return placed;

    const span = (id: string): readonly [number, number] => {
      const at = placed.get(id)!;
      const label = layout.nodes.find((n) => n.id === id)!.label;
      const w = labelWidth(label);
      return at.anchor === 'start' ? [at.x, at.x + w] : [at.x - w, at.x];
    };
    const collides = (id: string, y: number) => {
      const [a0, a1] = span(id);
      return layout.nodes.some((other) => {
        if (other.column !== 1) return false;
        const [b0, b1] = span(other.id);
        return a0 < b1 && b0 < a1 && Math.abs(placed.get(other.id)!.y - y) < LABEL_LINE;
      });
    };
    for (const node of layout.nodes.filter((n) => n.column === 0)) {
      const at = placed.get(node.id)!;
      if (!collides(node.id, at.y)) continue;
      const choices = [node.y0 + 11, node.y1 - 4].filter((y) => y >= node.y0 + 8 && y <= node.y1);
      const clear = choices.find((y) => !collides(node.id, y));
      if (clear !== undefined) placed.set(node.id, { ...at, y: clear });
    }
    return placed;
  }, [layout, compact]);

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

  // Subject and figures kept apart, so the phone layout can give each a line.
  const subject = hovered
    ? `${layout.nodes.find((n) => n.id === hovered.source)?.label} → ` +
      `${layout.nodes.find((n) => n.id === hovered.target)?.label}`
    : hoveredNode?.label ?? null;
  const figures = hovered
    ? `${formatEnergy(hovered.value, units)} · ${formatPercent(hovered.value / result.energy)}`
    : hoveredNode
      ? `${formatEnergy(hoveredNode.value, units)} · ${formatPercent(hoveredNode.value / result.energy)}`
      : `${formatEnergy(result.energy, units)} in total`;
  const readout = subject === null ? figures : `${subject} · ${figures}`;

  return (
    <figure className="chart" aria-labelledby={titleId}>
      <div className="chart__head">
        <figcaption className="chart__caption" id={titleId}>
          How the energy flows
          <span className="chart__sub">
            Fuel, to what it is spent on, to the rooms that spent it. Hover to trace one band.
          </span>
        </figcaption>
        <ExportButton
          target={() => svgRef.current}
          title="How the energy flows"
          context={exportContext}
          name="energy-flow"
          desktop={() => <EnergyFlow result={result} units={units} exportContext={exportContext} />}
        />
      </div>

      <div className="chart__scroll" ref={boxRef}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height + top + 18}`}
          className={compact ? 'sankey sankey--compact' : 'sankey'}
          data-layout={compact ? 'compact' : 'standard'}
          role="img"
          aria-labelledby={titleId}
          onMouseLeave={() => setHover(null)}
        >
          {compact ? (
            <text className="sankey__readout">
              {/* The total needs one line; something hovered needs two, what
                  and how much, because together they are wider than a phone. */}
              {subject === null ? (
                <tspan x={0} y={13}>{figures}</tspan>
              ) : (
                <>
                  <tspan x={0} y={13}>{subject}</tspan>
                  <tspan x={0} y={27}>{figures}</tspan>
                </>
              )}
            </text>
          ) : (
            <text x={0} y={13} className="sankey__readout">{readout}</text>
          )}

          <g transform={`translate(0, ${top})`}>
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
              const label = labels.get(node.id)!;
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
                    x={label.x}
                    y={label.y}
                    className={`sankey__label${isGroup ? ' sankey__label--group' : ''}`}
                    textAnchor={label.anchor}
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Wrapped, because a table ignores `width: 1px`: it is always at least
          as wide as its contents, and a 540 px table positioned absolutely
          made the whole page scroll sideways on a phone. The wrapper takes
          the 1 px and clips; the table keeps its class so it is still found
          as `table.visually-hidden`. */}
      <div className="visually-hidden">
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
      </div>
    </figure>
  );
}
