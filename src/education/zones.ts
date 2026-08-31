/**
 * What each zone is, and what the 2019 model assumed about it.
 *
 * The assumptions come from slides 21–27 of the I2SL presentation, which is the
 * only place they were ever written down — the workbook carries results, not
 * inputs. They are the honest answer to "where does 220 kBtu/sf/yr come from",
 * and they are what lets a reader argue with the number instead of believing it.
 *
 * **Only what the deck states is recorded here.** Four zones — core lab, MRI,
 * NMR and corridor — appear in the occupancy table but not in the lighting, plug
 * load or air system tables, so those fields are simply absent for them rather
 * than filled with a plausible guess.
 */
import type { ZoneId } from '../model/types.js';

export interface ZoneAssumptions {
  /** ft² per person. Zero means the space is not counted as occupied. */
  readonly occupantDensity?: number;
  /** Lighting power density, W/ft². */
  readonly lightingPower?: number;
  /** Receptacle equipment power density, W/ft². */
  readonly plugLoad?: number;
  /** Heating setback, heating setpoint, cooling setpoint, cooling setback (°F). */
  readonly setpoints?: readonly [number, number, number, number];
  readonly maxRelativeHumidity?: number;
  /** Minimum air changes per hour, occupied then unoccupied. */
  readonly airChanges?: readonly [number, number];
  readonly schedule?: string;
  readonly note?: string;
}

export interface ZoneCard {
  readonly summary: string;
  readonly assumptions: ZoneAssumptions;
}

const DAY = '08:00–20:00';
const CONTINUOUS = 'Continuous, 24 hours';
const LAB_SETPOINTS = [70, 72, 72, 74] as const;
const OFFICE_SETPOINTS = [68, 70, 72, 74] as const;

export const ZONE_CARDS: Readonly<Record<ZoneId, ZoneCard>> = {
  'support-lab-chem': {
    summary:
      'Equipment-dense chemistry support, at 16 W/sf of receptacle load — twice an open lab and more than twenty times an office. The plug load is the building.',
    assumptions: {
      occupantDensity: 40, lightingPower: 1.1, plugLoad: 16,
      setpoints: LAB_SETPOINTS, maxRelativeHumidity: 55, airChanges: [6, 2], schedule: DAY,
      note: 'Fume hoods in the space will raise the air change rate above this.',
    },
  },
  'support-lab-general': {
    summary:
      'General equipment support — cold rooms, autoclaves, shared instruments. Same 16 W/sf receptacle load, and usually the largest support area in a building.',
    assumptions: {
      occupantDensity: 40, lightingPower: 1.1, plugLoad: 16,
      setpoints: LAB_SETPOINTS, maxRelativeHumidity: 55, airChanges: [6, 2], schedule: DAY,
    },
  },
  'support-lab-bio': {
    summary:
      'Biology support: incubators, centrifuges, freezers. Equipment that runs whether or not anyone is in the room.',
    assumptions: {
      occupantDensity: 40, lightingPower: 1.1, plugLoad: 16,
      setpoints: LAB_SETPOINTS, maxRelativeHumidity: 55, airChanges: [6, 2], schedule: DAY,
    },
  },
  'core-lab': {
    summary:
      'Shared instrumentation serving several groups. Intense, but usually small — which is exactly the case for reading intensity and total energy side by side.',
    assumptions: { occupantDensity: 40 },
  },
  'open-lab-chem': {
    summary:
      'Open chemistry bench at 8 W/sf and six air changes an hour. Ventilation, not equipment, is what makes it expensive.',
    assumptions: {
      occupantDensity: 40, lightingPower: 1.1, plugLoad: 8,
      setpoints: LAB_SETPOINTS, maxRelativeHumidity: 55, airChanges: [6, 2], schedule: DAY,
      note: 'Fume hoods in the space will raise the air change rate above this.',
    },
  },
  'open-lab-general': {
    summary: 'Open bench for mixed disciplines. The default wet lab, and the one most programmes have most of.',
    assumptions: {
      occupantDensity: 40, lightingPower: 1.1, plugLoad: 8,
      setpoints: LAB_SETPOINTS, maxRelativeHumidity: 55, airChanges: [6, 2], schedule: DAY,
    },
  },
  'open-lab-bio': {
    summary: 'Open biology bench, at the same 8 W/sf and six air changes as the other open labs.',
    assumptions: {
      occupantDensity: 40, lightingPower: 1.1, plugLoad: 8,
      setpoints: LAB_SETPOINTS, maxRelativeHumidity: 55, airChanges: [6, 2], schedule: DAY,
    },
  },
  'instruction-lab': {
    summary:
      'Teaching lab, ventilated like a research lab but with a fraction of the equipment — 2 W/sf against 8. Lab air on a classroom load.',
    assumptions: {
      occupantDensity: 30, lightingPower: 0.91, plugLoad: 2,
      setpoints: LAB_SETPOINTS, maxRelativeHumidity: 55, airChanges: [6, 2], schedule: DAY,
    },
  },
  'write-up': {
    summary:
      'Desk space inside the lab envelope. It has an office load and lab ventilation, which is the whole reason moving it onto the general air system is one of the measures.',
    assumptions: {
      occupantDensity: 50, lightingPower: 0.77, plugLoad: 0.75,
      setpoints: OFFICE_SETPOINTS, maxRelativeHumidity: 55, schedule: DAY,
    },
  },
  vivarium: {
    summary:
      'Animal holding: twelve air changes an hour, conditioned to a tight band, and never turned down. Four per cent of a floor plate can carry a fifth of a building’s energy.',
    assumptions: {
      occupantDensity: 40, lightingPower: 1, plugLoad: 8,
      setpoints: [72, 72, 72, 72], maxRelativeHumidity: 50, airChanges: [12, 10],
      schedule: CONTINUOUS,
    },
  },
  'nmr-lab': {
    summary:
      'Nuclear magnetic resonance. Continuous cryogenic and magnet load in a small footprint, which is why its intensity is second only to the vivarium.',
    assumptions: { occupantDensity: 40 },
  },
  'mri-lab': {
    summary: 'Imaging suite. Like the NMR lab, a large continuous equipment load in a small room.',
    assumptions: { occupantDensity: 40 },
  },
  'cafe-kitchen': {
    summary:
      'Servery and kitchen. Twenty air changes an hour of hood exhaust make it the most intense non-laboratory space in the building — and on a few hundred square feet, almost none of its energy.',
    assumptions: {
      occupantDensity: 15, lightingPower: 1, plugLoad: 2.5,
      setpoints: OFFICE_SETPOINTS, maxRelativeHumidity: 55, schedule: DAY,
      note: 'Kitchen hood exhaust at 20 air changes an hour.',
    },
  },
  auditorium: {
    summary: 'Lecture theatre on its own air system, densely occupied when it is used at all.',
    assumptions: {
      occupantDensity: 6.5, lightingPower: 0.9, plugLoad: 1,
      setpoints: OFFICE_SETPOINTS, maxRelativeHumidity: 55, schedule: DAY,
      note: 'Demand-controlled ventilation.',
    },
  },
  atrium: {
    summary: 'Circulation volume with a large envelope and little load of its own.',
    assumptions: {
      occupantDensity: 10, lightingPower: 0.4, plugLoad: 0.5,
      setpoints: [66, 68, 76, 78], maxRelativeHumidity: 55, schedule: DAY,
    },
  },
  classroom: {
    summary: 'Teaching space on the general air system, with a wider comfort band than a lab.',
    assumptions: {
      occupantDensity: 30, lightingPower: 0.91, plugLoad: 1,
      setpoints: [68, 70, 76, 78], maxRelativeHumidity: 55, schedule: DAY,
      note: 'Demand-controlled ventilation.',
    },
  },
  office: {
    summary:
      'Enclosed office at 0.75 W/sf. Near the range where net zero is arguable — the study puts offices and computational space around 35 kBtu/sf/yr.',
    assumptions: {
      occupantDensity: 200, lightingPower: 0.77, plugLoad: 0.75,
      setpoints: OFFICE_SETPOINTS, maxRelativeHumidity: 55, schedule: DAY,
      note: 'Ventilation per ASHRAE 62.1-2016.',
    },
  },
  computational: {
    summary:
      'Dry research — desks and workstations. The study’s closing point is that computational work supplanting bench work is what a 2030 target actually turns on.',
    assumptions: {
      occupantDensity: 200, lightingPower: 0.77, plugLoad: 0.75,
      setpoints: OFFICE_SETPOINTS, maxRelativeHumidity: 55, schedule: DAY,
    },
  },
  restroom: {
    summary: 'Exhaust-driven, unoccupied for scheduling purposes, and a wide temperature band.',
    assumptions: {
      occupantDensity: 0, lightingPower: 0.56, plugLoad: 0,
      setpoints: [64, 68, 78, 82], schedule: DAY,
    },
  },
  corridor: {
    summary: 'Circulation. Almost no load of its own, and cheap floor area to add.',
    assumptions: { occupantDensity: 0 },
  },
  boh: {
    summary:
      'Back of house — plant, storage, service. Barely conditioned, at a 50°F to 85°F band, and the least intense space in the building.',
    assumptions: {
      occupantDensity: 0, lightingPower: 1, plugLoad: 0,
      setpoints: [50, 50, 85, 85], schedule: DAY,
    },
  },
};

export const cardFor = (zoneId: ZoneId): ZoneCard | null => ZONE_CARDS[zoneId] ?? null;
