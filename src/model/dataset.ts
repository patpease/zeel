import raw from '../../data/dataset.json' with { type: 'json' };
import type { Dataset, SimulationCase, Location, Zone, CaseId, ZoneId, LocationId } from './types.js';

export const dataset = raw as unknown as Dataset;

const caseIndex = new Map<CaseId, SimulationCase>(dataset.cases.map((c) => [c.id, c]));
const locationIndex = new Map<LocationId, Location>(dataset.locations.map((l) => [l.id, l]));
const zoneIndex = new Map<ZoneId, Zone>(dataset.zones.map((z) => [z.id, z]));

export const getCase = (id: CaseId): SimulationCase => {
  const found = caseIndex.get(id);
  if (!found) throw new Error(`Unknown case: ${id}`);
  return found;
};

export const getLocation = (id: LocationId): Location => {
  const found = locationIndex.get(id);
  if (!found) throw new Error(`Unknown location: ${id}`);
  return found;
};

export const getZone = (id: ZoneId): Zone => {
  const found = zoneIndex.get(id);
  if (!found) throw new Error(`Unknown zone: ${id}`);
  return found;
};

export const locationForCase = (id: CaseId): Location => getLocation(getCase(id).locationId);

export const zoneIds: readonly ZoneId[] = dataset.zones.map((z) => z.id);

/** The programme the tool opens on: the study's own 115,000 sf worked example. */
export const DEFAULT_PROGRAMME: Readonly<Record<ZoneId, number>> = Object.freeze(
  Object.fromEntries(
    Object.entries(getCase('baseline').zones).map(([id, z]) => [id, z.area]),
  ),
);
