import { describe, it, expect } from 'vitest';
import { layoutSankey, ribbon } from '../src/charts/sankey.js';

const opts = { columnX: [0, 100, 200], nodeWidth: 10, height: 300, gap: 10 };

const nodes = [
  { id: 'a', label: 'A', column: 0, colour: 'red' },
  { id: 'b', label: 'B', column: 0, colour: 'red' },
  { id: 'm', label: 'M', column: 1, colour: 'blue' },
  { id: 'n', label: 'N', column: 1, colour: 'blue' },
  { id: 'z', label: 'Z', column: 2, colour: 'green' },
];
const links = [
  { source: 'a', target: 'm', value: 60, colour: 'x' },
  { source: 'a', target: 'n', value: 20, colour: 'x' },
  { source: 'b', target: 'n', value: 20, colour: 'x' },
  { source: 'm', target: 'z', value: 60, colour: 'x' },
  { source: 'n', target: 'z', value: 40, colour: 'x' },
];

const columnHeight = (layout, column) =>
  layout.nodes.filter((n) => n.column === column).reduce((a, n) => a + (n.y1 - n.y0), 0);

describe('layout', () => {
  const layout = layoutSankey(nodes, links, opts);

  it('sizes a node by what passes through it, not by in plus out', () => {
    // The regression that matters: summing incoming and outgoing makes every
    // middle column exactly twice the height of the ends, and the diagram stops
    // meaning anything.
    const m = layout.nodes.find((n) => n.id === 'm');
    const a = layout.nodes.find((n) => n.id === 'a');
    expect(m.value).toBe(60);
    expect(a.value).toBe(80);
  });

  it('conserves energy across every column', () => {
    const [c0, c1, c2] = [0, 1, 2].map((c) => columnHeight(layout, c));
    expect(c1).toBeCloseTo(c0, 6);
    expect(c2).toBeCloseTo(c0, 6);
  });

  it('never overflows the height it was given', () => {
    for (const node of layout.nodes) {
      expect(node.y0).toBeGreaterThanOrEqual(0);
      expect(node.y1).toBeLessThanOrEqual(opts.height + 0.001);
    }
  });

  it('centres a column that holds fewer nodes', () => {
    const z = layout.nodes.find((n) => n.id === 'z');
    const top = z.y0;
    const bottom = opts.height - z.y1;
    expect(top).toBeCloseTo(bottom, 6);
  });

  it('stacks ribbons against their nodes without gaps or overlaps', () => {
    for (const node of layout.nodes) {
      const out = layout.links.filter((l) => l.source === node.id);
      if (out.length === 0) continue;
      const spans = out.map((l) => l.sy1 - l.sy0).reduce((a, b) => a + b, 0);
      expect(spans).toBeCloseTo(node.y1 - node.y0, 6);
      expect(out[0].sy0).toBeCloseTo(node.y0, 6);
    }
  });

  it('drops links with no energy, and nodes left with none', () => {
    const withZero = layoutSankey(nodes, [...links, { source: 'a', target: 'z', value: 0, colour: 'x' }], opts);
    expect(withZero.links).toHaveLength(links.length);

    const empty = layoutSankey(nodes, [], opts);
    expect(empty.nodes).toHaveLength(0);
    expect(empty.links).toHaveLength(0);
  });

  it('draws a closed ribbon between the two node edges', () => {
    const link = layout.links[0];
    const path = ribbon(link);
    expect(path.startsWith(`M${link.sx},${link.sy0}`)).toBe(true);
    expect(path.endsWith('Z')).toBe(true);
    expect(path).toContain(`L${link.tx},${link.ty1}`);
  });
});
