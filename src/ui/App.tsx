import { useMemo, useState } from 'react';
// The mark is inlined rather than linked so the tile's custom properties resolve
// against the live theme. It is our own build-time asset, not user input.
import markSvg from './mark.svg?raw';
import { useTheme } from './theme.js';
import { Segmented } from './Segmented.js';
import { estimate } from '../engine/estimate.js';
import { spread } from '../engine/spread.js';
import { DEFAULT_PROGRAMME, dataset, getCase, getLocation } from '../model/dataset.js';
import { eui as euiUnit } from '../units/units.js';
import type { UnitSystem } from '../units/units.js';
import {
  formatArea, carbonIntensityParts, formatCostIntensity, formatEnergy, formatEui,
} from './format.js';

export function App() {
  const theme = useTheme();
  const [units, setUnits] = useState<UnitSystem>('ip');
  const [caseId] = useState('baseline');

  const result = useMemo(() => estimate(DEFAULT_PROGRAMME, caseId), [caseId]);
  const observed = useMemo(() => spread(), []);
  const simulation = getCase(caseId);
  const location = getLocation(result.locationId);

  return (
    <div className="app">
      <header className="masthead">
        {/* eslint-disable-next-line react/no-danger */}
        <span className="masthead__mark" aria-hidden="true" dangerouslySetInnerHTML={{ __html: markSvg }} />
        <div className="masthead__names">
          <span className="masthead__wordmark">
            ZEEL <span className="badge">Beta</span>
          </span>
          <span className="masthead__full">Zoned Energy Estimator for Labs</span>
        </div>

        <Segmented
          label="Units"
          value={units}
          onChange={setUnits}
          options={[
            { value: 'ip', label: 'IP', title: 'Inch-pound: square feet and kBtu' },
            { value: 'si', label: 'SI', title: 'Metric: square metres and kWh' },
          ]}
        />
        <Segmented
          label="Theme"
          value={theme.preference ?? 'system'}
          onChange={(next) => theme.setPreference(next === 'system' ? null : next)}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
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
          <div className="placeholder">
            The 21-zone area table lands here in phase 03, grouped by air system rather than
            listed alphabetically — the grouping is the finding. Showing the study’s own
            115,000 sf worked example until then.
          </div>
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

          <div className="placeholder" style={{ marginTop: 16 }}>
            Zone bars, the area-versus-energy rings and the Sankey arrive in phases 04 and 05.
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
