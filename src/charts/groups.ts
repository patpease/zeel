/**
 * Colour for the five air systems.
 *
 * A single-hue ordinal ramp rather than five categorical hues, for two reasons.
 * The groups are genuinely ordered — by the energy they carry, which is the
 * chart's whole subject — and the studio's categorical hues are already spoken
 * for: blue means cooling, orange means heating, and reusing them here would put
 * "special lab" in the same blue as "chillers" two panels away.
 *
 * Both ramps are validated, not eyeballed. Each passes monotone lightness,
 * an adjacent-step gap of at least 0.06 L, single-hue spread, and a light end
 * that clears its own surface:
 *
 *   light on #ffffff  — light end 2.17:1, hue spread 15°
 *   dark  on #171e26  — light end 3.32:1, hue spread 15°
 *
 * The dark ramp is *selected* against the dark surface rather than flipped from
 * the light one, and runs the other way: on a dark ground the group that carries
 * the most energy is the brightest, not the darkest.
 */
import { GROUP_ORDER } from '../model/groups.js';

/** Slot index per group id, fixed. Colour follows the entity, never its rank. */
export const groupColorVar = (groupId: string): string => `var(--group-${groupId})`;

export const GROUP_SLOTS = GROUP_ORDER;
