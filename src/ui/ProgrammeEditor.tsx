import { useEffect, useMemo, useState } from 'react';
import type { Programme, ZoneId } from '../model/types.js';
import { GROUPS, ORDERED_ZONE_IDS } from '../model/groups.js';
import { getCase } from '../model/dataset.js';
import { PRESETS } from '../model/presets.js';
import { area as areaUnit } from '../units/units.js';
import type { UnitSystem } from '../units/units.js';
import { formatEui } from './format.js';

/** Grouping and intensities come from the baseline: the editor is about the
 *  programme, not about which case is selected. */
const BASELINE = getCase('baseline');

/** Accepts "4,500", " 4500 ", "4500.5"; rejects anything else. */
function parseArea(raw: string): number | null {
  const cleaned = raw.replace(/[\s,]/g, '');
  if (cleaned === '') return 0;
  const value = Number(cleaned);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

const toDraft = (programme: Programme, units: UnitSystem): Record<string, string> =>
  Object.fromEntries(
    ORDERED_ZONE_IDS.map((id) => {
      const sqft = programme[id] ?? 0;
      const shown = Math.round(areaUnit.toDisplay(sqft, units));
      return [id, shown === 0 ? '' : String(shown)];
    }),
  );

interface Props {
  readonly programme: Programme;
  readonly units: UnitSystem;
  /** Bumped by the parent when the programme is replaced wholesale, so the
   *  fields resync without fighting the keystroke that caused the last change. */
  readonly revision: number;
  /** A single edit. Must NOT bump the revision, or the field being typed in
   *  gets rewritten from the parent on every keystroke. */
  readonly onChange: (programme: Programme) => void;
  /** A wholesale swap — a preset or a clear. Bumps the revision. */
  readonly onReplace: (programme: Programme) => void;
  readonly totalEnergyByZone: Readonly<Record<ZoneId, number>>;
  readonly totalEnergy: number;
}

export function ProgrammeEditor({
  programme, units, revision, onChange, onReplace, totalEnergyByZone, totalEnergy,
}: Props) {
  const [draft, setDraft] = useState(() => toDraft(programme, units));

  useEffect(() => {
    setDraft(toDraft(programme, units));
    // Deliberately keyed on revision and units only. Including `programme` would
    // rewrite the field the user is typing in on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, units]);

  const commit = (next: Record<string, string>) => {
    const areas: Record<ZoneId, number> = {};
    for (const id of ORDERED_ZONE_IDS) {
      const parsed = parseArea(next[id] ?? '');
      areas[id] = areaUnit.fromDisplay(parsed ?? 0, units);
    }
    onChange(areas);
  };

  const setOne = (id: ZoneId, raw: string) => {
    if (parseArea(raw) === null) return; // Reject the keystroke, keep the field.
    const next = { ...draft, [id]: raw };
    setDraft(next);
    commit(next);
  };

  /**
   * A programme arrives as a column out of a spreadsheet, so it has to be
   * pasteable as one. Values fill downward from the row that was pasted into.
   */
  const handlePaste = (id: ZoneId) => (event: React.ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData('text');
    const values = text.split(/[\r\n\t]+/).map((v) => v.trim()).filter((v) => v !== '');
    if (values.length < 2) return; // One value is an ordinary paste.
    event.preventDefault();

    const start = ORDERED_ZONE_IDS.indexOf(id);
    const next = { ...draft };
    values.forEach((value, offset) => {
      const target = ORDERED_ZONE_IDS[start + offset];
      if (!target) return;
      const parsed = parseArea(value);
      if (parsed === null) return;
      next[target] = parsed === 0 ? '' : String(parsed);
    });
    setDraft(next);
    commit(next);
  };

  const totals = useMemo(() => {
    const byGroup = new Map<string, { area: number; energy: number }>();
    for (const group of GROUPS) {
      let area = 0;
      let energy = 0;
      for (const zone of group.zones) {
        area += programme[zone.id] ?? 0;
        energy += totalEnergyByZone[zone.id] ?? 0;
      }
      byGroup.set(group.id, { area, energy });
    }
    return byGroup;
  }, [programme, totalEnergyByZone]);

  const totalArea = ORDERED_ZONE_IDS.reduce((sum, id) => sum + (programme[id] ?? 0), 0);

  return (
    <div className="programme">
      <div className="presets" role="group" aria-label="Worked examples">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="preset"
            title={`${preset.description} — ${preset.source}`}
            onClick={() => onReplace(preset.areas)}
          >
            {preset.label}
            {preset.reportedEui !== null && (
              <span className="preset__eui">{preset.reportedEui}</span>
            )}
          </button>
        ))}
        <button
          type="button"
          className="preset preset--quiet"
          onClick={() => onReplace(Object.fromEntries(ORDERED_ZONE_IDS.map((id) => [id, 0])))}
        >
          Clear
        </button>
      </div>

      <table className="zone-table">
        <caption className="visually-hidden">
          Floor area by zone type, grouped by air system. Paste a column from a
          spreadsheet into any field to fill downward.
        </caption>
        <thead>
          <tr>
            <th scope="col">Zone</th>
            <th scope="col" className="numeric-col">EUI</th>
            <th scope="col" className="numeric-col">Area, {areaUnit.label(units)}</th>
          </tr>
        </thead>

        {GROUPS.map((group) => {
          const groupTotal = totals.get(group.id) ?? { area: 0, energy: 0 };
          const share = totalEnergy > 0 ? groupTotal.energy / totalEnergy : 0;
          return (
            <tbody key={group.id}>
              <tr className="group-row">
                <th scope="colgroup" className="group-row__name">{group.label}</th>
                <td className="numeric-col group-row__share" title="Share of this building’s energy">
                  {groupTotal.area > 0 ? `${(share * 100).toFixed(0)}%` : '—'}
                </td>
                <td className="numeric-col group-row__area">
                  {Math.round(areaUnit.toDisplay(groupTotal.area, units)).toLocaleString('en-US')}
                </td>
              </tr>

              {group.zones.map((zone) => {
                const record = BASELINE.zones[zone.id];
                return (
                  <tr key={zone.id}>
                    <th scope="row" className="zone-row__name">{zone.label}</th>
                    <td className="numeric-col zone-row__eui">
                      {record ? formatEui(record.eui, units) : ''}
                    </td>
                    <td className="numeric-col">
                      <input
                        className="area-input"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        aria-label={`${zone.label} area, ${areaUnit.label(units)}`}
                        value={draft[zone.id] ?? ''}
                        placeholder="0"
                        onChange={(e) => setOne(zone.id, e.target.value)}
                        onPaste={handlePaste(zone.id)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          );
        })}

        <tfoot>
          <tr>
            <th scope="row">Total</th>
            <td className="numeric-col" />
            <td className="numeric-col total-area">
              {Math.round(areaUnit.toDisplay(totalArea, units)).toLocaleString('en-US')}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
