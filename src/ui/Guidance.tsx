import type { Estimate } from '../engine/estimate.js';
import { checksFor } from '../education/checks.js';
import { BENCHMARK_NOTE } from '../education/benchmarks.js';
import { spread } from '../engine/spread.js';
import { dataset } from '../model/dataset.js';
import { formatEui, formatPercent } from './format.js';
import type { UnitSystem } from '../units/units.js';

/**
 * Notes about the programme, and the evidence behind the number.
 *
 * The notes are opinions about the brief; the validation panel is the answer to
 * "how do you know". Both are disclosed rather than modal — a reader who does not
 * want them should not have to dismiss anything, and a reader who does should not
 * have to go looking.
 */
interface Props {
  readonly result: Estimate;
  readonly units: UnitSystem;
}

export function Guidance({ result, units }: Props) {
  const checks = checksFor(result);
  const observed = spread();

  return (
    <div className="guidance">
      {checks.length > 0 && (
        <section className="notes" aria-label="Notes on this programme">
          <h3 className="notes__title">Notes on this programme</h3>
          <ul className="notes__list">
            {checks.map((check) => (
              <li key={check.id}>{check.text}</li>
            ))}
          </ul>
          <p className="notes__foot">{BENCHMARK_NOTE}</p>
        </section>
      )}

      <details className="disclosure">
        <summary className="disclosure__summary">How do we know?</summary>
        <div className="disclosure__body">
          <p>
            Each of these was re-described in these zones and compared against its
            designed EUI. {observed.statement}
          </p>
          <table className="validation">
            <thead>
              <tr>
                <th scope="col">Project</th>
                <th scope="col" className="numeric-col">Designed</th>
                <th scope="col" className="numeric-col">Estimated</th>
                <th scope="col" className="numeric-col">Difference</th>
              </tr>
            </thead>
            <tbody>
              {observed.residuals.map((residual) => (
                <tr key={residual.project}>
                  <th scope="row">{residual.project}</th>
                  <td className="numeric-col">{formatEui(residual.designedEui, units)}</td>
                  <td className="numeric-col">{formatEui(residual.estimatedEui, units)}</td>
                  {/*
                    Deliberately not the diverging pair. Coming in low is the
                    concerning direction, not the good one, so painting −29.6%
                    green would contradict the sentence underneath. The sign
                    carries the direction; the prose carries the judgement.
                  */}
                  <td className="numeric-col">
                    {residual.errorFraction > 0 ? '+' : ''}
                    {formatPercent(residual.errorFraction, 1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="notes__foot">
            Read this as a spread, not a tolerance. Five buildings establish roughly
            where the method lands, not a bound it stays inside — and it comes in
            low more often than high, which matters when the number is being used
            to argue for a programme.
          </p>
        </div>
      </details>

      <details className="disclosure">
        <summary className="disclosure__summary">What was assumed</summary>
        <div className="disclosure__body">
          <p>
            One model of a {dataset.cases[0]!.prototype.totalArea.toLocaleString('en-US')} sf
            building, simulated in {dataset.cases[0]!.provenance.tool} with custom meters on
            electricity, fuel, air and water flow per zone. Building-wide plant totals are then
            divided among the zones by their share of airflow, coil flow or demand — only room
            and plug electricity is a genuine per-zone quantity.
          </p>
          <p>
            The envelope is deliberately high-performance, not code-minimum: triple glazing at
            U-0.402, walls at U-0.089, 60% window-to-wall, infiltration 0.06 cfm/ft². That is why
            the envelope measures move so little, and a reader who assumes otherwise will misread
            every measure result.
          </p>
          <p>
            Plant is Konvekta run-around heat recovery, high-efficiency chillers, condensing gas
            boilers, active chilled beams and a heat recovery chiller. Controls are VAV throughout
            with temperature and pressure resets, and a night turndown to one third flow.
          </p>
          <p className="notes__foot">
            Per-zone assumptions — occupancy, lighting, plug load, setpoints and air changes —
            are on each zone in the programme table.
          </p>
        </div>
      </details>
    </div>
  );
}
