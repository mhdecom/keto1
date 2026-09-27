import { describe, expect, it } from 'vitest';
import {
  availabilityCompatibility,
  countSlots,
  describeSharedSlots,
  hasSlot,
  maskFrom,
  setSlot,
  sharedSlots,
  SLOT_COUNT,
  toggleSlot,
} from '../availability';

describe('slot mask', () => {
  it('covers seven days times three blocks', () => {
    expect(SLOT_COUNT).toBe(21);
  });

  it('sets, reads and clears a single slot', () => {
    let mask = 0;
    expect(hasSlot(mask, 2, 'evening')).toBe(false);
    mask = setSlot(mask, 2, 'evening', true);
    expect(hasSlot(mask, 2, 'evening')).toBe(true);
    expect(countSlots(mask)).toBe(1);
    mask = setSlot(mask, 2, 'evening', false);
    expect(hasSlot(mask, 2, 'evening')).toBe(false);
    expect(mask).toBe(0);
  });

  it('does not let one slot bleed into another', () => {
    const mask = maskFrom([[0, 'morning']]);
    expect(hasSlot(mask, 0, 'morning')).toBe(true);
    expect(hasSlot(mask, 0, 'midday')).toBe(false);
    expect(hasSlot(mask, 1, 'morning')).toBe(false);
  });

  it('toggles back to the original value', () => {
    const original = maskFrom([[3, 'midday'], [5, 'morning']]);
    const once = toggleSlot(original, 6, 'evening');
    expect(once).not.toBe(original);
    expect(toggleSlot(once, 6, 'evening')).toBe(original);
  });

  it('stays inside 21 bits when every slot is set', () => {
    let mask = 0;
    for (let day = 0; day < 7; day += 1) {
      for (const block of ['morning', 'midday', 'evening'] as const) {
        mask = setSlot(mask, day, block, true);
      }
    }
    expect(countSlots(mask)).toBe(21);
    expect(mask).toBe(2 ** 21 - 1);
  });
});

describe('availabilityCompatibility', () => {
  it('is zero when one side has no availability at all', () => {
    expect(availabilityCompatibility(0, maskFrom([[1, 'evening']]))).toBe(0);
    expect(availabilityCompatibility(maskFrom([[1, 'evening']]), 0)).toBe(0);
  });

  it('is one for identical grids', () => {
    const mask = maskFrom([[1, 'evening'], [4, 'morning']]);
    expect(availabilityCompatibility(mask, mask)).toBe(1);
  });

  it('is zero with no overlap', () => {
    const a = maskFrom([[0, 'morning']]);
    const b = maskFrom([[0, 'evening']]);
    expect(availabilityCompatibility(a, b)).toBe(0);
  });

  it('does not punish a busy player whose only slot is covered', () => {
    // Someone free only on Tuesday evening is a perfect fit for someone free
    // all week — normalising by the union would wrongly score this low.
    const busy = maskFrom([[1, 'evening']]);
    const flexible = maskFrom([
      [0, 'evening'],
      [1, 'evening'],
      [2, 'evening'],
      [3, 'evening'],
      [4, 'evening'],
    ]);
    expect(availabilityCompatibility(busy, flexible)).toBe(1);
  });

  it('is symmetric', () => {
    const a = maskFrom([[1, 'evening'], [3, 'evening'], [6, 'midday']]);
    const b = maskFrom([[1, 'evening'], [5, 'morning']]);
    expect(availabilityCompatibility(a, b)).toBe(availabilityCompatibility(b, a));
  });

  it('counts partial overlap proportionally', () => {
    const a = maskFrom([[1, 'evening'], [3, 'evening']]);
    const b = maskFrom([[1, 'evening'], [5, 'morning']]);
    expect(sharedSlots(a, b)).toBe(1);
    expect(availabilityCompatibility(a, b)).toBeCloseTo(0.5, 10);
  });
});

describe('describeSharedSlots', () => {
  it('labels shared slots in weekday order', () => {
    const a = maskFrom([[6, 'midday'], [1, 'evening'], [3, 'morning']]);
    const b = maskFrom([[1, 'evening'], [3, 'morning'], [6, 'midday']]);
    expect(describeSharedSlots(a, b, 3)).toEqual(['Di Abend', 'Do Früh', 'So Mittag']);
  });

  it('respects the limit', () => {
    const mask = maskFrom([[0, 'morning'], [1, 'morning'], [2, 'morning']]);
    expect(describeSharedSlots(mask, mask, 2)).toHaveLength(2);
  });

  it('returns nothing when there is no overlap', () => {
    expect(describeSharedSlots(maskFrom([[0, 'morning']]), maskFrom([[1, 'evening']]))).toEqual([]);
  });
});
