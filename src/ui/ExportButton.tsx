import { useRef, useState } from 'react';
import { exportChartPng } from '../io/exportPng.js';
import type { ExportContext } from './useExportContext.js';

/**
 * A camera on the chart it exports, rather than a report button somewhere else.
 *
 * The chart is the unit people want: one goes in a slide, another in an email.
 * Nothing here assembles a document — that can wait until there is evidence
 * anyone wants one.
 */
interface Props {
  /** Resolves the chart's own <svg>, which is only in the DOM once mounted. */
  readonly target: () => SVGSVGElement | null;
  readonly title: string;
  readonly context: ExportContext;
  /** Appended to the context's slug, e.g. "energy-flow". */
  readonly name: string;
}

export function ExportButton({ target, title, context, name }: Props) {
  const [state, setState] = useState<'idle' | 'working' | 'failed'>('idle');
  const timer = useRef<number | null>(null);

  const run = async () => {
    const svg = target();
    if (!svg) return;
    setState('working');
    try {
      await exportChartPng(svg, {
        title,
        scope: context.scope,
        provenance: context.provenance,
        variables: context.variables,
        fileName: `${context.slug}-${name}.png`,
      });
      setState('idle');
    } catch {
      setState('failed');
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setState('idle'), 4000);
    }
  };

  return (
    <button
      type="button"
      className="export-button"
      onClick={run}
      disabled={state === 'working'}
      aria-label={`Download ${title} as PNG`}
      title={state === 'failed' ? 'That did not work — try again' : 'Download as PNG'}
    >
      {state === 'failed' ? (
        <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <circle cx="24" cy="24" r="17" stroke="currentColor" strokeWidth="3" />
          <path d="M24 15v12M24 32.5v.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <path
            d="M7 17h8l4-5h10l4 5h8a2 2 0 0 1 2 2v18a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V19a2 2 0 0 1 2-2Z"
            stroke="currentColor" strokeWidth="3" strokeLinejoin="round"
          />
          <circle cx="24" cy="27" r="7" stroke="currentColor" strokeWidth="3" />
        </svg>
      )}
    </button>
  );
}
