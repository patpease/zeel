import { useMemo } from 'react';
import { dataset, getCase, getLocation } from '../model/dataset.js';
import { estimate } from '../engine/estimate.js';
import type { Programme } from '../model/types.js';
import type { UnitSystem } from '../units/units.js';
import { formatEui, formatPercent } from './format.js';

/**
 * Which study, and which case within it.
 *
 * Two modes rather than one combined selector, because the dataset genuinely has
 * two shapes: five climate zones at baseline, and eight cases at 5A Boston.
 * Nothing sits in the intersection, and nothing is interpolated across it — a
 * measure in Atlanta would be an invented number. Saying so on the control is
 * better than greying one out and leaving the reader to wonder.
 *
 * Each chip carries its own result for the programme currently entered, so the
 * comparison is legible before anything is clicked.
 */

interface Props {
  readonly programme: Programme;
  readonly caseId: string;
  readonly studyId: string;
  readonly units: UnitSystem;
  readonly onSelectStudy: (studyId: string) => void;
  readonly onSelectCase: (caseId: string) => void;
}

export function StudyPicker({
  programme, caseId, studyId, units, onSelectStudy, onSelectCase,
}: Props) {
  const study = dataset.studies.find((s) => s.id === studyId) ?? dataset.studies[0]!;

  const figures = useMemo(() => {
    const baseline = estimate(programme, 'baseline').eui;
    // The baseline case appears in both studies and is named by the study it is
    // sitting in. In the climate comparison it is one climate among five, so it
    // wears its zone like the rest — a chip reading "Baseline" beside 6A, 4A, 3A
    // and 5B hides the one thing that row exists to compare. In the measure
    // study it is the reference the others are measured against, and "Baseline"
    // is exactly what it is.
    const byClimate = study.id === 'climate';
    return study.caseIds.map((id) => {
      const simulation = getCase(id);
      const location = getLocation(simulation.locationId);
      const eui = estimate(programme, id).eui;
      return {
        id,
        label: byClimate ? location.climateZone : simulation.label,
        title: simulation.description ?? simulation.label,
        sub: byClimate ? location.label : null,
        eui,
        delta: baseline > 0 ? (eui - baseline) / baseline : 0,
        reverse: simulation.kind === 'reverse-measure',
        isBaseline: id === 'baseline',
      };
    });
  }, [programme, study]);

  return (
    <div className="study">
      <div className="study__modes" role="group" aria-label="Study">
        {dataset.studies.map((option) => (
          <button
            key={option.id}
            type="button"
            className={option.id === studyId ? 'active' : ''}
            aria-pressed={option.id === studyId}
            title={option.description}
            onClick={() => onSelectStudy(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="study__cases" role="group" aria-label="Case">
        {figures.map((figure) => (
          <button
            key={figure.id}
            type="button"
            className={`case-chip${figure.id === caseId ? ' is-selected' : ''}${figure.reverse ? ' is-reverse' : ''}`}
            aria-pressed={figure.id === caseId}
            title={figure.sub ? `${figure.sub} — ${figure.title}` : figure.title}
            onClick={() => onSelectCase(figure.id)}
          >
            <span className="case-chip__label">{figure.label}</span>
            <span className="case-chip__eui">{formatEui(figure.eui, units)}</span>
            {!figure.isBaseline && (
              <span className={`case-chip__delta${figure.delta > 0 ? ' is-up' : ''}`}>
                {figure.delta > 0 ? '+' : ''}{formatPercent(figure.delta, 1)}
              </span>
            )}
          </button>
        ))}
      </div>

      {studyId === 'measure' && (
        <p className="study__note">
          Measures were simulated at 5A Boston only, and are never carried across
          climate zones — that would be an invented number rather than a result.
        </p>
      )}
    </div>
  );
}
