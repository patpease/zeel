/**
 * The engine, in full.
 *
 * A zone's energy scales linearly with its area: the stored intensity is held
 * fixed and multiplied by whatever floor area the user gives it. Nothing is
 * re-simulated and no plant is re-sized — doubling the vivarium doubles its
 * contribution and never grows the chiller.
 *
 * That is the method, not a shortcut. It is what makes the programme-to-energy
 * relationship legible and instant, and it is why the output conveys an idea
 * rather than predicting a saving.
 */
import type {
  Programme, SimulationCase, Location, ZoneId, ZoneRecord, EndUse,
} from '../model/types.js';
import { dataset, getCase, locationForCase } from '../model/dataset.js';

const MBTU_TO_KBTU = 1000;

export interface ZoneEstimate {
  readonly zoneId: ZoneId;
  readonly label: string;
  readonly fanGroup: string;
  readonly area: number;
  /** Fixed by the simulation; independent of the area given. */
  readonly eui: number;
  readonly electricity: number;
  readonly gas: number;
  readonly energy: number;
  readonly shareOfArea: number;
  readonly shareOfEnergy: number;
  readonly endUses: Readonly<Record<string, number>>;
}

export interface Slice {
  readonly id: string;
  readonly label: string;
  readonly energy: number;
  readonly share: number;
}

export interface Estimate {
  readonly caseId: string;
  readonly locationId: string;
  readonly totalArea: number;
  readonly electricity: number;
  readonly gas: number;
  readonly energy: number;
  readonly eui: number;
  readonly carbon: number;
  readonly carbonIntensity: number;
  readonly cost: number;
  readonly costIntensity: number;
  readonly zones: readonly ZoneEstimate[];
  readonly endUses: readonly Slice[];
  readonly fanGroups: readonly Slice[];
  readonly fuels: readonly Slice[];
  /** Findings the source workbook carries for this case; empty when it audits clean. */
  readonly caveats: readonly string[];
}

const EMPTY: Omit<Estimate, 'caseId' | 'locationId' | 'caveats'> = {
  totalArea: 0, electricity: 0, gas: 0, energy: 0, eui: 0,
  carbon: 0, carbonIntensity: 0, cost: 0, costIntensity: 0,
  zones: [], endUses: [], fanGroups: [], fuels: [],
};

/** Scale one stored end-use figure to the area the user asked for. */
const scaled = (record: ZoneRecord, endUse: EndUse, area: number): number => {
  const stored = record[endUse.column];
  return (stored as number) * (area / record.area);
};

export function estimate(
  programme: Programme,
  caseId: string,
  options: { location?: Location } = {},
): Estimate {
  const simulation: SimulationCase = getCase(caseId);
  const location = options.location ?? locationForCase(caseId);
  const caveats = simulation.dataQuality.map((f) => f.detail);

  const totalArea = Object.values(programme).reduce<number>((a, v) => a + (v ?? 0), 0);
  if (totalArea <= 0) {
    return { ...EMPTY, caseId, locationId: location.id, caveats };
  }

  const endUseTotals: Record<string, number> = Object.fromEntries(
    dataset.endUses.map((u) => [u.id, 0]),
  );
  const groupTotals: Record<string, number> = Object.fromEntries(
    dataset.fanGroups.map((g) => [g.id, 0]),
  );

  let electricity = 0;
  let gas = 0;
  const zones: ZoneEstimate[] = [];

  for (const zone of dataset.zones) {
    const area = programme[zone.id] ?? 0;
    if (area <= 0) continue;
    const record = simulation.zones[zone.id];
    if (!record) throw new Error(`Case ${caseId} has no zone ${zone.id}`);

    const factor = area / record.area;
    const zoneElectricity = record.totalElectricity * factor;
    const zoneGas = record.totalGas * factor;
    const zoneEnergy = zoneElectricity + zoneGas;

    const endUses: Record<string, number> = {};
    for (const endUse of dataset.endUses) {
      const value = scaled(record, endUse, area);
      endUses[endUse.id] = value;
      endUseTotals[endUse.id] = (endUseTotals[endUse.id] ?? 0) + value;
    }

    electricity += zoneElectricity;
    gas += zoneGas;
    groupTotals[record.fanGroup] = (groupTotals[record.fanGroup] ?? 0) + zoneEnergy;

    zones.push({
      zoneId: zone.id,
      label: zone.label,
      fanGroup: record.fanGroup,
      area,
      eui: record.eui,
      electricity: zoneElectricity,
      gas: zoneGas,
      energy: zoneEnergy,
      shareOfArea: area / totalArea,
      shareOfEnergy: 0, // filled below, once the total is known
      endUses,
    });
  }

  const energy = electricity + gas;
  const { rates } = location;
  const carbon = electricity * rates.electricityCarbonMtPerMbtu + gas * rates.gasCarbonMtPerMbtu;
  const cost = electricity * rates.electricityCostPerMbtu + gas * rates.gasCostPerMbtu;

  const share = (value: number) => (energy > 0 ? value / energy : 0);

  return {
    caseId,
    locationId: location.id,
    totalArea,
    electricity,
    gas,
    energy,
    eui: (energy * MBTU_TO_KBTU) / totalArea,
    carbon,
    carbonIntensity: carbon / totalArea,
    cost,
    costIntensity: cost / totalArea,
    zones: zones
      .map((z) => ({ ...z, shareOfEnergy: share(z.energy) }))
      .sort((a, b) => b.energy - a.energy),
    endUses: dataset.endUses.map((u) => ({
      id: u.id,
      label: u.label,
      energy: endUseTotals[u.id] ?? 0,
      share: share(endUseTotals[u.id] ?? 0),
    })),
    fanGroups: dataset.fanGroups
      .map((g) => ({ id: g.id, label: g.label, energy: groupTotals[g.id] ?? 0, share: share(groupTotals[g.id] ?? 0) }))
      .filter((g) => g.energy > 0)
      .sort((a, b) => b.energy - a.energy),
    fuels: [
      { id: 'electricity', label: 'Electricity', energy: electricity, share: share(electricity) },
      { id: 'gas', label: 'Natural gas', energy: gas, share: share(gas) },
    ],
    caveats,
  };
}

export interface ZoneDelta {
  readonly zoneId: ZoneId;
  readonly label: string;
  readonly baseEui: number;
  readonly eui: number;
  readonly deltaEui: number;
  readonly deltaFraction: number;
  readonly deltaEnergy: number;
}

export interface Comparison {
  readonly base: Estimate;
  readonly other: Estimate;
  readonly deltaEui: number;
  readonly deltaFraction: number;
  readonly deltaEnergy: number;
  readonly deltaCarbon: number;
  readonly deltaCost: number;
  /** Sorted by the size of the move, so the zones that respond come first. */
  readonly zones: readonly ZoneDelta[];
}

/**
 * Two cases on the same programme. Answers which zones respond to a measure —
 * not by how much anyone will save.
 */
export function compare(programme: Programme, baseCaseId: string, otherCaseId: string): Comparison {
  const base = estimate(programme, baseCaseId);
  const other = estimate(programme, otherCaseId);
  const baseZones = new Map(base.zones.map((z) => [z.zoneId, z]));

  const zones: ZoneDelta[] = other.zones.map((z) => {
    const from = baseZones.get(z.zoneId);
    const baseEui = from?.eui ?? 0;
    return {
      zoneId: z.zoneId,
      label: z.label,
      baseEui,
      eui: z.eui,
      deltaEui: z.eui - baseEui,
      deltaFraction: baseEui > 0 ? (z.eui - baseEui) / baseEui : 0,
      deltaEnergy: z.energy - (from?.energy ?? 0),
    };
  });

  return {
    base,
    other,
    deltaEui: other.eui - base.eui,
    deltaFraction: base.eui > 0 ? (other.eui - base.eui) / base.eui : 0,
    deltaEnergy: other.energy - base.energy,
    deltaCarbon: other.carbon - base.carbon,
    deltaCost: other.cost - base.cost,
    zones: zones.sort((a, b) => Math.abs(b.deltaFraction) - Math.abs(a.deltaFraction)),
  };
}
