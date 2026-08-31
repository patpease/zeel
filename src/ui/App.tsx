import { useCallback, useMemo, useState } from 'react';
// The mark is inlined rather than linked so the tile's custom properties resolve
// against the live theme. It is our own build-time asset, not user input.
import markSvg from './mark.svg?raw';
import { useTheme } from './theme.js';
import type { ThemeChoice } from './theme.js';
import { SunIcon, MoonIcon } from './Icon.js';
import { BRAND } from '../config/branding.js';
import { ProgrammeEditor } from './ProgrammeEditor.js';
import { ZoneBars } from '../charts/ZoneBars.js';
import { AreaEnergyRings } from '../charts/AreaEnergyRings.js';
import { estimate } from '../engine/estimate.js';
import { spread } from '../engine/spread.js';
import { dataset, getCase, getLocation } from '../model/dataset.js';
import { getPreset, DEFAULT_PRESET_ID } from '../model/presets.js';
import type { Programme } from '../model/types.js';
import { eui as euiUnit } from '../units/units.js';
import type { UnitSystem } from '../units/units.js';
import {
  formatArea, carbonIntensityParts, formatCostIntensity, formatEnergy, formatEui,
} from './format.js';

export function App() {
  const theme = useTheme();
  const [units, setUnits] = useState<UnitSystem>('ip');
  const [caseId] = useState('baseline');

  const [programme, setProgramme] = useState<Programme>(() => getPreset(DEFAULT_PRESET_ID).areas);
  // Bumped only when the programme is replaced wholesale — a preset or a paste —
  // so the editor's fields resync then, and not on every keystroke.
  const [revision, setRevision] = useState(0);

  const replaceProgramme = useCallback((next: Programme) => {
    setProgramme(next);
    setRevision((n) => n + 1);
  }, []);

  const result = useMemo(() => estimate(programme, caseId), [programme, caseId]);
  const energyByZone = useMemo(
    () => Object.fromEntries(result.zones.map((z) => [z.zoneId, z.energy])),
    [result],
  );
  const observed = useMemo(() => spread(), []);
  const simulation = getCase(caseId);
  const location = getLocation(result.locationId);

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          {/* Inlined rather than linked so the tile's custom properties resolve
              against the live theme — one asset instead of a light and a dark
              PNG. It is our own build-time file, not user input. */}
          <span
            className="brand-icon"
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: markSvg }}
          />
          <div className="brand-text">
            <span className="brand-org">{BRAND.organisation}</span>
            <h1>
              {BRAND.appName}
              <span className="badge">Beta</span>
            </h1>
            <span className="brand-tagline">{BRAND.tagline}</span>
          </div>
        </div>

        <div className="header-toggles">
          <div className="unit-toggle" role="group" aria-label="Unit system">
            {(['ip', 'si'] as UnitSystem[]).map((system) => (
              <button
                key={system}
                type="button"
                className={units === system ? 'active' : ''}
                onClick={() => setUnits(system)}
                aria-pressed={units === system}
              >
                {system.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Two buttons for three states: no stored preference follows the
              operating system, and pressing either pins it. The active button
              tracks `resolved` rather than `preference`, so it always shows
              what is actually being painted. See ui/theme.ts. */}
          <div className="unit-toggle theme-toggle" role="group" aria-label="Appearance">
            {([
              { choice: 'light' as ThemeChoice, label: 'Light', Glyph: SunIcon },
              { choice: 'dark' as ThemeChoice, label: 'Dark', Glyph: MoonIcon },
            ]).map(({ choice, label, Glyph }) => (
              <button
                key={choice}
                type="button"
                className={theme.resolved === choice ? 'active' : ''}
                onClick={() => theme.setPreference(choice)}
                aria-pressed={theme.resolved === choice}
                aria-label={`${label} appearance`}
                title={`${label} appearance`}
              >
                <Glyph />
              </button>
            ))}
          </div>
        </div>
      </header>

      {/*
        Permanent page furniture, never a dismissible modal. If a reader takes one
        number away from this tool, this is the sentence that has to travel with it.
      */}
      <p className="scope">
        <span className="scope__lead">What this is for</span>
        <span>
          Early planning and proposal work. The arithmetic is <strong>deliberately linear</strong> —
          fixed zone intensities scaled by the areas you give them — so the output is here to{' '}
          <strong>convey an idea, not predict a saving</strong>. Not for design submissions, energy
          targets, compliance paths, or quantified measure savings.
        </span>
      </p>

      <main className="workspace">
        <section className="panel" aria-labelledby="programme-title">
          <div className="panel__head">
            <h2 className="panel__title" id="programme-title">Programme</h2>
            <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
              {formatArea(result.totalArea, units)}
            </span>
          </div>
          <ProgrammeEditor
            programme={programme}
            units={units}
            revision={revision}
            onChange={setProgramme}
            onReplace={replaceProgramme}
            totalEnergyByZone={energyByZone}
            totalEnergy={result.energy}
          />
        </section>

        <section className="panel" aria-labelledby="results-title">
          <div className="panel__head">
            <h2 className="panel__title" id="results-title">Estimate</h2>
            <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
              {simulation.label} · {location.label}
            </span>
          </div>

          <div className="headline">
            <p className="headline__label">Estimated EUI</p>
            <p className="headline__value">
              {formatEui(result.eui, units)}
              <span className="headline__unit">{euiUnit.label(units)}</span>
            </p>
            {/*
              A range, never a ± band. Five projects establish a spread, not a
              precision, and a stated envelope would invite the prediction reading
              the whole tool is built to avoid.
            */}
            <p className="headline__spread">{observed.statement}</p>
          </div>

          <div className="metrics">
            <div className="metric">
              <span className="metric__value">{formatEnergy(result.energy, units)}</span>
              <span className="metric__label">Total energy</span>
            </div>
            <div className="metric">
              <span className="metric__value">
                {carbonIntensityParts(result.carbonIntensity, units).value}{' '}
                <span className="unit">{carbonIntensityParts(result.carbonIntensity, units).unit}</span>
              </span>
              <span className="metric__label">Carbon intensity</span>
            </div>
            <div className="metric">
              <span className="metric__value">{formatCostIntensity(result.costIntensity, units)}</span>
              <span className="metric__label">
                Operating cost · {location.rates.vintage.year} rates
              </span>
            </div>
          </div>

          {result.caveats.length > 0 && (
            <div className="caveat" role="note">
              <span className="caveat__lead">Known defect in the source data</span>
              {result.caveats.map((caveat) => <p key={caveat}>{caveat}</p>)}
            </div>
          )}

          <AreaEnergyRings result={result} />
          <ZoneBars zones={result.zones} units={units} />

          <div className="placeholder" style={{ marginTop: 16 }}>
            The energy-flow Sankey arrives in phase 05.
          </div>
        </section>
      </main>

      <footer className="colophon">
        <span>
          {dataset.cases.length} simulated cases · {dataset.zones.length} zone types ·{' '}
          {simulation.provenance.tool}, {simulation.provenance.completed}
        </span>
        <span>{dataset.about.study}</span>
        <span>Nothing is uploaded and nothing is kept.</span>
      </footer>
    </div>
  );
}
