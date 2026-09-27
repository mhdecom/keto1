import { DAY_LABELS, TIME_BLOCKS, type AvailabilityMask, type TimeBlock } from './types';

export const SLOT_COUNT = DAY_LABELS.length * TIME_BLOCKS.length;

/** Bit index for a given weekday (Mo=0) and time block. */
export function slotIndex(day: number, block: TimeBlock): number {
  return day * TIME_BLOCKS.length + TIME_BLOCKS.indexOf(block);
}

export function hasSlot(mask: AvailabilityMask, day: number, block: TimeBlock): boolean {
  return (mask & (1 << slotIndex(day, block))) !== 0;
}

export function toggleSlot(mask: AvailabilityMask, day: number, block: TimeBlock): AvailabilityMask {
  return mask ^ (1 << slotIndex(day, block));
}

export function setSlot(
  mask: AvailabilityMask,
  day: number,
  block: TimeBlock,
  on: boolean,
): AvailabilityMask {
  const bit = 1 << slotIndex(day, block);
  return on ? mask | bit : mask & ~bit;
}

export function countSlots(mask: AvailabilityMask): number {
  let count = 0;
  let remaining = mask;
  while (remaining !== 0) {
    remaining &= remaining - 1;
    count += 1;
  }
  return count;
}

export function sharedSlots(a: AvailabilityMask, b: AvailabilityMask): number {
  return countSlots(a & b);
}

/**
 * Availability overlap from 0 to 1.
 *
 * Normalised by the *smaller* of the two grids on purpose: someone who can
 * only play Tuesday evenings is a perfect fit for someone who is free all
 * week. Dividing by the union would punish them for being busy.
 */
export function availabilityCompatibility(a: AvailabilityMask, b: AvailabilityMask): number {
  const smaller = Math.min(countSlots(a), countSlots(b));
  if (smaller === 0) return 0;
  return sharedSlots(a, b) / smaller;
}

/** Human readable list of shared slots, e.g. ["Di Abend", "Sa Früh"]. */
export function describeSharedSlots(
  a: AvailabilityMask,
  b: AvailabilityMask,
  limit = 3,
): string[] {
  const shared = a & b;
  const labels: string[] = [];
  const blockShort: Record<TimeBlock, string> = {
    morning: 'Früh',
    midday: 'Mittag',
    evening: 'Abend',
  };
  for (let day = 0; day < DAY_LABELS.length; day += 1) {
    for (const block of TIME_BLOCKS) {
      if ((shared & (1 << slotIndex(day, block))) !== 0) {
        labels.push(`${DAY_LABELS[day]} ${blockShort[block]}`);
        if (labels.length >= limit) return labels;
      }
    }
  }
  return labels;
}

/** Builds a mask from readable pairs, handy for seed data and tests. */
export function maskFrom(slots: Array<[number, TimeBlock]>): AvailabilityMask {
  return slots.reduce((mask, [day, block]) => setSlot(mask, day, block, true), 0);
}
