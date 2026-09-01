/**
 * Export one chart as a PNG.
 *
 * ## Why this is more than serialise-and-draw
 *
 * An SVG loaded into an `<img>` renders in an isolated context: it cannot reach
 * the page's stylesheet, its custom properties, or its fonts. Three consequences,
 * each handled below.
 *
 * 1. **Styles are inlined from the computed values.** Every mark in these charts
 *    is coloured through a class and a `var(--…)`, none of which survives
 *    serialisation. `getComputedStyle` resolves both, so the clone is walked and
 *    the resolved values written onto each element.
 *
 * 2. **The clone is measured inside `[data-theme="light"]`.** A chart exported
 *    from a dark session would otherwise arrive in someone's deck as pale marks
 *    on a black field. The stylesheet defines the palette three times precisely
 *    so a light-stamped container wins over the viewer's system preference.
 *
 * 3. **Fonts are embedded as data URIs.** A `@font-face` pointing at a URL is a
 *    blocked external fetch inside the isolated render, and the text silently
 *    falls back. The two faces are fetched once and cached for the session.
 *
 * The scope line is drawn into the artwork rather than offered alongside it. An
 * exported chart is the version that reaches people who never saw the tool, and
 * it has to carry its own framing.
 */
import archivoUrl from '@fontsource-variable/archivo/files/archivo-latin-wght-normal.woff2?url';
import monoUrl from '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2?url';
import monoBoldUrl from '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-600-normal.woff2?url';

/** Properties that actually carry a chart's appearance. */
const CARRIED = [
  'fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-linecap',
  'stroke-linejoin', 'stroke-dasharray', 'opacity', 'font-family', 'font-size',
  'font-weight', 'font-style', 'letter-spacing', 'text-anchor', 'paint-order',
  'font-variant-numeric', 'text-transform', 'dominant-baseline',
] as const;

const MARGIN = 28;
const TITLE_H = 46;
const FOOTER_H = 40;
/**
 * Exports land in slide decks, so they render well above screen size — but the
 * multiplier is capped. Without a ceiling a small square chart gets scaled five
 * times to hit a width target, which buys nothing and quadruples the file.
 */
const TARGET_WIDTH = 1800;
const MIN_SCALE = 2;
const MAX_SCALE = 3;

let fontCss: string | null = null;

async function dataUri(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
  return `data:font/woff2;base64,${btoa(binary)}`;
}

async function embeddedFonts(): Promise<string> {
  if (fontCss !== null) return fontCss;
  const [archivo, mono, monoBold] = await Promise.all([
    dataUri(archivoUrl), dataUri(monoUrl), dataUri(monoBoldUrl),
  ]);
  fontCss = `
    @font-face { font-family: 'Archivo Variable'; font-weight: 100 900;
      src: url('${archivo}') format('woff2'); }
    @font-face { font-family: 'IBM Plex Mono'; font-weight: 400;
      src: url('${mono}') format('woff2'); }
    @font-face { font-family: 'IBM Plex Mono'; font-weight: 600;
      src: url('${monoBold}') format('woff2'); }
  `;
  return fontCss;
}

/**
 * Freeze the clone's appearance into a stylesheet for the exported document.
 *
 * Read from the **clone**, never from the live element. The clone sits inside a
 * `[data-theme="light"]` container, so its `var(--…)` references resolve to the
 * light palette; the live element resolves to whatever the viewer is looking at.
 * Reading the wrong one is silent — the export simply comes out in dark-theme
 * colours on a white page, which is pale text and a dark halo, and looks like a
 * rendering fault rather than a sampling one.
 *
 * The values are returned as CSS rules rather than written to `style`
 * attributes. `style-src 'self'` blocks a style attribute, and while the
 * serialiser still reads the attribute it set — so the export happened to work —
 * every element raised a violation, and a stricter browser would be within its
 * rights to drop the attribute entirely. A `<style>` block inside the exported
 * SVG is a different document and answers to nothing here.
 *
 * Classes are stripped only after the values are read, since the classes are
 * what the values come from.
 */
function freezeStyles(clone: SVGSVGElement): string {
  const elements = [clone, ...clone.querySelectorAll<SVGElement>('*')];
  const declarations = elements.map((element) => {
    const computed = window.getComputedStyle(element);
    let css = '';
    for (const property of CARRIED) {
      const value = computed.getPropertyValue(property);
      if (value && value !== 'none' && value !== 'normal') css += `${property}:${value};`;
    }
    return css;
  });

  const rules: string[] = [];
  elements.forEach((element, i) => {
    element.removeAttribute('class');
    const css = declarations[i];
    if (!css) return;
    // An ordinary data attribute, and a selector that outranks the presentation
    // attributes the markup carries.
    element.setAttribute('data-e', String(i));
    rules.push(`[data-e="${i}"]{${css}}`);
  });
  return rules.join('');
}

export interface ExportOptions {
  readonly title: string;
  /** The one line that has to travel with the picture. */
  readonly scope: string;
  /** Which case and location the chart was drawn from. */
  readonly provenance: string;
  readonly fileName: string;
  /**
   * Custom properties to stamp on the export stage — the chosen palette's light
   * steps. Required, because the stage's own `data-theme="light"` makes the
   * stylesheet re-declare `--group-*`, which would otherwise silently drag every
   * export back to the default ramp.
   */
  readonly variables: readonly (readonly [string, string])[];
}

export async function exportChartPng(
  svg: SVGSVGElement,
  options: ExportOptions,
): Promise<void> {
  const viewBox = svg.viewBox.baseVal;
  const w = viewBox.width || svg.clientWidth || 800;
  const h = viewBox.height || svg.clientHeight || 400;

  // Measured inside a light-stamped container so the export never carries a dark
  // session's palette. It must be laid out — not `display:none` — for
  // getComputedStyle to resolve anything.
  const stage = document.createElement('div');
  stage.setAttribute('data-theme', 'light');
  // Set property by property through the CSSOM rather than as a style attribute:
  // the attribute is what `style-src 'self'` refuses.
  for (const [name, value] of [
    ['position', 'fixed'], ['left', '-10000px'], ['top', '0'],
    ['width', '900px'], ['pointer-events', 'none'], ['opacity', '0'],
  ]) stage.style.setProperty(name!, value!);
  // Inline, so they out-rank the stylesheet's own [data-theme="light"] block.
  for (const [name, value] of options.variables) stage.style.setProperty(name, value);

  const clone = svg.cloneNode(true) as SVGSVGElement;
  // A nested <svg> with no width or height takes the *outer* viewport as its
  // size, not its own viewBox — so it scales and re-centres itself and spills
  // past the footer. Pin it to the size its viewBox describes.
  clone.setAttribute('width', String(w));
  clone.setAttribute('height', String(h));
  stage.appendChild(clone);
  document.body.appendChild(stage);

  let pngBlob: Blob | null = null;
  try {
    const frozen = freezeStyles(clone);
    // Rendered light, so the surrounding chrome is light too.
    const light = window.getComputedStyle(stage);
    const ink = light.getPropertyValue('--ink').trim() || '#14202b';
    const muted = light.getPropertyValue('--ink-muted').trim() || '#5d6b7a';
    const faint = light.getPropertyValue('--ink-faint').trim() || '#8794a2';
    const surface = light.getPropertyValue('--surface').trim() || '#ffffff';
    const border = light.getPropertyValue('--border').trim() || '#d9dee5';
    const accent = light.getPropertyValue('--accent').trim() || '#0F5F52';

    const fonts = await embeddedFonts();
    const totalW = w + MARGIN * 2;
    const totalH = h + MARGIN * 2 + TITLE_H + FOOTER_H;
    const inner = new XMLSerializer().serializeToString(clone);

    const escape = (text: string) =>
      text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const document_ = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
<style>${fonts}
${frozen}
text { font-family: 'Archivo Variable', sans-serif; }
.x-title { font-size: 17px; font-weight: 600; fill: ${ink}; }
.x-scope { font-family: 'IBM Plex Mono', monospace; font-size: 9.5px; fill: ${faint}; letter-spacing: 0.04em; }
.x-foot { font-family: 'IBM Plex Mono', monospace; font-size: 9.5px; fill: ${muted}; }
.x-mark { font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 600; fill: ${accent}; }
</style>
<rect width="${totalW}" height="${totalH}" fill="${surface}"/>
<text class="x-title" x="${MARGIN}" y="${MARGIN + 8}">${escape(options.title)}</text>
<text class="x-scope" x="${MARGIN}" y="${MARGIN + 27}">${escape(options.scope)}</text>
<g transform="translate(${MARGIN}, ${MARGIN + TITLE_H})">${inner}</g>
<line x1="${MARGIN}" y1="${totalH - FOOTER_H + 4}" x2="${totalW - MARGIN}" y2="${totalH - FOOTER_H + 4}" stroke="${border}" stroke-width="1"/>
<text class="x-mark" x="${MARGIN}" y="${totalH - 14}">ZEEL</text>
<text class="x-foot" x="${MARGIN + 44}" y="${totalH - 14}">${escape(options.provenance)}</text>
</svg>`;

    const blob = new Blob([document_], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    try {
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('The chart could not be rasterised.'));
        image.src = url;
      });

      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, TARGET_WIDTH / totalW));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(totalW * scale);
      canvas.height = Math.round(totalH * scale);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('The chart could not be rasterised.');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    } finally {
      URL.revokeObjectURL(url);
    }
  } finally {
    stage.remove();
  }

  if (!pngBlob) throw new Error('The chart could not be rasterised.');
  const href = URL.createObjectURL(pngBlob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = options.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoked on the next turn of the loop: revoking immediately can cancel the
  // download in some browsers.
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
}
