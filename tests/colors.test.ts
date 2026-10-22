import { describe, expect, it } from 'vitest';
import { gradientColors, HEX } from '../src/lib/colors';

describe('gradientColors', () => {
  it('uses the given colors first, without duplicates', () => {
    expect(gradientColors(['teal', 'pink', 'teal', 'amber'])).toEqual([HEX.teal, HEX.pink, HEX.amber]);
  });

  it('tops up from the default palette so there are always three colors', () => {
    expect(gradientColors([])).toEqual([HEX.indigo, HEX.violet, HEX.pink]);
    expect(gradientColors(['indigo'])).toEqual([HEX.indigo, HEX.violet, HEX.pink]);
    expect(gradientColors(['emerald'])).toEqual([HEX.emerald, HEX.indigo, HEX.violet]);
  });
});
