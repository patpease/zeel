/**
 * Air systems in descending order of the energy they carry in the study's own
 * programme: labs 62%, vivarium 19%, general 11%, special labs 6%, auditorium 2%.
 *
 * Fixed, and shared by the editor and every chart. Recomputing it from the
 * current programme would reshuffle rows while someone is typing and would repaint
 * the survivors when a group empties — colour has to follow the entity, not its
 * rank in the moment.
 */
import { dataset, getCase } from './dataset.js';
import type { ZoneId } from './types.js';

export const GROUP_ORDER = ['lab', 'vivarium', 'special-lab', 'general', 'auditorium'] as const;
export type GroupId = (typeof GROUP_ORDER)[number];

/** Grouping and intensities come from the baseline: this is about the programme,
 *  not about which case is selected. */
const BASELINE = getCase('baseline');

export interface ZoneGroup {
  readonly id: GroupId;
  readonly label: string;
  readonly zones: readonly { readonly id: ZoneId; readonly label: string; readonly eui: number }[];
}

export const GROUPS: readonly ZoneGroup[] = GROUP_ORDER.map((groupId) => {
  const group = dataset.fanGroups.find((g) => g.id === groupId);
  if (!group) throw new Error(`Unknown fan group: ${groupId}`);
  const zones = dataset.zones
    .filter((z) => BASELINE.zones[z.id]?.fanGroup === groupId)
    .map((z) => ({ id: z.id, label: z.label, eui: BASELINE.zones[z.id]?.eui ?? 0 }))
    .sort((a, b) => b.eui - a.eui);
  return { id: groupId, label: group.label, zones };
}).filter((g) => g.zones.length > 0);

export const ORDERED_ZONE_IDS: readonly ZoneId[] = GROUPS.flatMap((g) => g.zones.map((z) => z.id));

const groupOfZone = new Map<ZoneId, GroupId>(
  GROUPS.flatMap((g) => g.zones.map((z) => [z.id, g.id] as const)),
);

export const groupFor = (zoneId: ZoneId): GroupId => groupOfZone.get(zoneId) ?? 'general';

export const labelForGroup = (id: string): string =>
  GROUPS.find((g) => g.id === id)?.label ?? id;
