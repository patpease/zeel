/**
 * IP and SI, converted at the boundary.
 *
 * The engine works in one unit set and one only — square feet, MBtu, kBtu/sf/yr,
 * metric tons, US dollars. Conversion happens on the way in from a user and on
 * the way out to a screen. Nothing in between knows which system is displayed,
 * which is the only version of this that stays correct under refactoring.
 */

export type UnitSystem = 'ip' | 'si';

/** Exact by definition. */
export const SQFT_TO_SQM = 0.09290304;
/** 1000 international-table Btu = 1055055.85262 J; 1 kWh = 3.6 MJ. */
export const KBTU_TO_KWH = 1055055.85262 / 3.6e6; // 0.29307107017222

export const SQM_TO_SQFT = 1 / SQFT_TO_SQM;
export const KWH_TO_KBTU = 1 / KBTU_TO_KWH;

/** kBtu/sf/yr -> kWh/m²/yr */
export const EUI_IP_TO_SI = KBTU_TO_KWH / SQFT_TO_SQM; // 3.15459...
/** MT/sf/yr -> kg CO₂e/m²/yr */
export const CARBON_INTENSITY_IP_TO_SI = 1000 / SQFT_TO_SQM;
/** $/sf/yr -> $/m²/yr */
export const COST_INTENSITY_IP_TO_SI = 1 / SQFT_TO_SQM;
/** MBtu/yr -> MWh/yr */
export const MBTU_TO_MWH = KBTU_TO_KWH;

export const area = {
  toDisplay: (sqft: number, system: UnitSystem) => (system === 'si' ? sqft * SQFT_TO_SQM : sqft),
  fromDisplay: (value: number, system: UnitSystem) => (system === 'si' ? value * SQM_TO_SQFT : value),
  label: (system: UnitSystem) => (system === 'si' ? 'm²' : 'sf'),
};

export const energy = {
  toDisplay: (mbtu: number, system: UnitSystem) => (system === 'si' ? mbtu * MBTU_TO_MWH : mbtu),
  label: (system: UnitSystem) => (system === 'si' ? 'MWh/yr' : 'MBtu/yr'),
};

export const eui = {
  toDisplay: (kbtuPerSqft: number, system: UnitSystem) =>
    system === 'si' ? kbtuPerSqft * EUI_IP_TO_SI : kbtuPerSqft,
  fromDisplay: (value: number, system: UnitSystem) =>
    system === 'si' ? value / EUI_IP_TO_SI : value,
  label: (system: UnitSystem) => (system === 'si' ? 'kWh/m²/yr' : 'kBtu/sf/yr'),
};

export const carbonIntensity = {
  toDisplay: (mtPerSqft: number, system: UnitSystem) =>
    system === 'si' ? mtPerSqft * CARBON_INTENSITY_IP_TO_SI : mtPerSqft,
  label: (system: UnitSystem) => (system === 'si' ? 'kg CO₂e/m²/yr' : 'MT CO₂e/sf/yr'),
};

export const costIntensity = {
  toDisplay: (usdPerSqft: number, system: UnitSystem) =>
    system === 'si' ? usdPerSqft * COST_INTENSITY_IP_TO_SI : usdPerSqft,
  label: (system: UnitSystem) => (system === 'si' ? '$/m²/yr' : '$/sf/yr'),
};

/**
 * Reference points a reader anchors on, in whichever system they are reading.
 * The anchors are genuinely different numbers in each system — 25 kBtu/sf/yr and
 * 79 kWh/m²/yr are the same target but not the same mental landmark — so the
 * education copy needs both sets, not one converted on the fly.
 */
export const BENCHMARKS_IP = {
  netZeroLow: 25,
  netZeroHigh: 30,
  onsiteRenewablesLow: 15,
  onsiteRenewablesHigh: 30,
  i2slLabMean: 531,
} as const;
