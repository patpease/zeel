import type { ReactElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

/**
 * Render a chart off screen, at a desk's width, for as long as `use` needs it.
 *
 * The export's job on a phone. The live chart there is its phone layout, and
 * that is not the figure anyone should receive: an exported chart outlives the
 * page, and the same programme must export the same picture from any device.
 * So the export mounts a copy in a box `width` wide, where `useWidth` measures a
 * desk and the desktop layout renders, and shoots that instead.
 *
 * `flushSync` makes it synchronous: the render commits, the layout effect
 * measures the box, and the re-render at the measured width lands, all before
 * `use` is called.
 *
 * The box is sized through `style.setProperty`, the same way the export stage
 * is, because `style-src 'self'` rules out anything React would write as an
 * attribute. It is in the document (a detached node measures 0) but hidden and
 * off screen, and it is removed however `use` ends.
 */
export async function withOffscreen<T>(
  element: ReactElement,
  width: number,
  use: (host: HTMLElement) => Promise<T>,
): Promise<T> {
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  for (const [name, value] of [
    ['position', 'fixed'], ['left', '-10000px'], ['top', '0'],
    ['width', `${width}px`], ['visibility', 'hidden'], ['pointer-events', 'none'],
  ] as const) host.style.setProperty(name, value);
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(element));
    return await use(host);
  } finally {
    root.unmount();
    host.remove();
  }
}
