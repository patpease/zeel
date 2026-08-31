/** Display formatting. Never used inside the engine — only on the way out. */
import type { UnitSystem } from '../units/units.js';
import { area, energy, eui, carbonIntensity, costIntensity } from '../units/units.js';

const fixed = (value: number, digits: number): string =>
  value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const formatArea = (sqft: number, system: UnitSystem): string =>
  `${Math.round(area.toDisplay(sqft, system)).toLocaleString('en-US')} ${area.label(system)}`;

export const formatEui = (value: number, system: UnitSystem): string =>
  fixed(eui.toDisplay(value, system), system === 'si' ? 0 : 1);

export const formatEnergy = (mbtu: number, system: UnitSystem): string =>
  `${Math.round(energy.toDisplay(mbtu, system)).toLocaleString('en-US')} ${energy.label(system)}`;

/** Split so a caller can keep the unit from being orphaned onto its own line. */
export const carbonIntensityParts = (
  value: number,
  system: UnitSystem,
): { value: string; unit: string } => ({
  value: system === 'si' ? fixed(carbonIntensity.toDisplay(value, system), 1) : fixed(value, 4),
  unit: carbonIntensity.label(system),
});

export const formatCarbonIntensity = (value: number, system: UnitSystem): string => {
  const parts = carbonIntensityParts(value, system);
  return `${parts.value} ${parts.unit}`;
};

export const formatCostIntensity = (value: number, system: UnitSystem): string =>
  `$${fixed(costIntensity.toDisplay(value, system), 2)}/${system === 'si' ? 'm²' : 'sf'}/yr`;

export const formatPercent = (fraction: number, digits = 0): string =>
  `${(fraction * 100).toFixed(digits)}%`;
