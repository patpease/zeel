/**
 * The dataset's shape, mirrored from schema/dataset.schema.json. The schema is
 * the authority; these types exist so the engine cannot misspell a field.
 */

export type ZoneId = string;
export type CaseId = string;
export type LocationId = string;
export type Fuel = 'electricity' | 'gas';
export type Service = 'process' | 'air' | 'cooling' | 'heating' | 'dhw';

export interface Zone {
  readonly id: ZoneId;
  readonly label: string;
}

export interface FanGroup {
  readonly id: string;
  readonly label: string;
}

export interface EndUse {
  readonly id: string;
  readonly label: string;
  /** Key on a ZoneRecord holding this end use's energy, in MBtu/yr. */
  readonly column: keyof ZoneRecord;
  readonly fuel: Fuel;
  readonly service: Service;
}

export interface Rates {
  readonly vintage: { readonly year: number; readonly source: string };
  readonly gridCarbonLbPerMwh: number;
  readonly electricityPricePerKwh: number;
  readonly gasPricePer1000Cuft: number;
  readonly electricityCarbonMtPerMbtu: number;
  readonly gasCarbonMtPerMbtu: number;
  readonly electricityCostPerMbtu: number;
  readonly gasCostPerMbtu: number;
}

export interface Location {
  readonly id: LocationId;
  readonly label: string;
  readonly state: string;
  readonly climateZone: string;
  readonly rates: Rates;
}

/** One zone within one simulated case. Energies are MBtu/yr, area is sf. */
export interface ZoneRecord {
  readonly fanGroup: string;
  readonly area: number;
  readonly roomElectricity: number;
  readonly fanElectricity: number;
  readonly heatingElectricity: number;
  readonly chwPumpElectricity: number;
  readonly chillerElectricity: number;
  readonly heatingGas: number;
  readonly totalElectricity: number;
  readonly totalGas: number;
  readonly eui: number;
  readonly airFlow: number;
  readonly fanShare: number;
  readonly heatingShare: number;
  readonly coolingShare: number;
  readonly dhwShare: number;
  readonly dhwDemand: number;
  readonly reheatFlow: number;
  readonly mainHeatCoilFlow: number;
  readonly chwFlow: number;
  readonly mainCoolCoilFlow: number;
}

export interface DataQualityFinding {
  readonly code: 'share-does-not-sum' | 'fan-share-does-not-sum' | 'fan-energy-not-conserved';
  readonly detail: string;
  readonly magnitude: number;
  readonly zones?: readonly ZoneId[];
}

export interface SimulationCase {
  readonly id: CaseId;
  readonly kind: 'baseline' | 'climate' | 'measure' | 'reverse-measure';
  readonly label: string;
  readonly measureNumber?: number;
  readonly locationId: LocationId;
  readonly description?: string;
  readonly note?: string;
  readonly provenance: {
    readonly kind: 'simulated';
    readonly tool: string;
    readonly completed: string;
    readonly workbook: string;
    readonly sheet: string;
    readonly crossCheckedAgainst?: string;
  };
  readonly prototype: {
    readonly totalArea: number;
    readonly totalElectricity: number;
    readonly totalGas: number;
    readonly blendedEui: number;
  };
  readonly plant: Readonly<Record<string, number>>;
  readonly zones: Readonly<Record<ZoneId, ZoneRecord>>;
  readonly dataQuality: readonly DataQualityFinding[];
}

export interface Study {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly caseIds: readonly CaseId[];
}

export interface ValidationProject {
  readonly name: string;
  readonly designedEui: number;
  readonly workbookEstimatedEui: number;
  readonly programme: Readonly<Record<ZoneId, number>>;
  readonly totalArea: number;
}

export interface Dataset {
  readonly schemaVersion: 1;
  readonly generated: string;
  readonly about: {
    readonly name: string;
    readonly summary: string;
    readonly study: string;
    readonly authors: readonly string[];
  };
  readonly units: Readonly<Record<string, string>>;
  readonly zones: readonly Zone[];
  readonly fanGroups: readonly FanGroup[];
  readonly endUses: readonly EndUse[];
  readonly plantItems: readonly { id: string; label: string; service: string; fuel: Fuel }[];
  readonly locations: readonly Location[];
  readonly studies: readonly Study[];
  readonly cases: readonly SimulationCase[];
  readonly validation: {
    readonly note: string;
    readonly workbookBaselineEui: Readonly<Record<ZoneId, number>>;
    readonly projects: readonly ValidationProject[];
  };
}

/** Areas the user has entered, in square feet, by zone. Missing means zero. */
export type Programme = Readonly<Partial<Record<ZoneId, number>>>;
