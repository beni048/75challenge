import { describe, it, expect } from 'vitest';
import {
  hasShieldAvailable,
  daysUntilShieldReturns,
  shieldAllowanceFor,
  toCommitmentLevel,
  SHIELD_RECHARGE_DAYS,
  DEFAULT_COMMITMENT_LEVEL,
} from '@/lib/shield-policy';

describe('hasShieldAvailable', () => {
  const today = '2026-10-01';

  it('never offers a Purist a shield, used or not', () => {
    expect(hasShieldAvailable('purist', null, today)).toBe(false);
    expect(hasShieldAvailable('purist', '2026-01-01', today)).toBe(false);
  });

  it('gives Classic exactly one for the whole attempt', () => {
    expect(hasShieldAvailable('classic', null, today)).toBe(true);
    expect(hasShieldAvailable('classic', '2026-09-30', today)).toBe(false);
    // Still spent a year later — Classic never recharges.
    expect(hasShieldAvailable('classic', '2025-01-01', today)).toBe(false);
  });

  it('recharges Flex only once the full cooldown has elapsed', () => {
    expect(hasShieldAvailable('flex', null, today)).toBe(true);
    expect(hasShieldAvailable('flex', '2026-09-30', today)).toBe(false);
    expect(hasShieldAvailable('flex', '2026-09-07', today)).toBe(false); // 24 days — one short
  });

  it('recharges Flex on the boundary day itself, not the day after', () => {
    // 2026-09-06 + 25 days === 2026-10-01
    expect(hasShieldAvailable('flex', '2026-09-06', today)).toBe(true);
    expect(hasShieldAvailable('flex', '2026-09-07', today)).toBe(false);
  });
});

describe('daysUntilShieldReturns', () => {
  it('is null when a shield is already available', () => {
    expect(daysUntilShieldReturns('flex', null, '2026-10-01')).toBeNull();
  });

  it('is null for tiers that never recharge', () => {
    expect(daysUntilShieldReturns('classic', '2026-09-30', '2026-10-01')).toBeNull();
    expect(daysUntilShieldReturns('purist', '2026-09-30', '2026-10-01')).toBeNull();
  });

  it('counts down the remaining cooldown for Flex', () => {
    expect(daysUntilShieldReturns('flex', '2026-09-30', '2026-10-01')).toBe(SHIELD_RECHARGE_DAYS - 1);
  });

  it('is null once the cooldown has fully elapsed', () => {
    expect(daysUntilShieldReturns('flex', '2026-09-06', '2026-10-01')).toBeNull();
  });
});

describe('shieldAllowanceFor', () => {
  it('states each tier as a whole-attempt allowance', () => {
    expect(shieldAllowanceFor('purist')).toBe(0);
    expect(shieldAllowanceFor('classic')).toBe(1);
    expect(shieldAllowanceFor('flex')).toBe(3);
  });
});

describe('toCommitmentLevel', () => {
  it('passes through the three valid tiers', () => {
    expect(toCommitmentLevel('purist')).toBe('purist');
    expect(toCommitmentLevel('flex')).toBe('flex');
  });

  it('degrades anything unrecognised to the legacy default', () => {
    // Existing accounts were backfilled to 'classic' precisely because it is
    // their pre-existing behaviour; an unknown value must land there too.
    expect(toCommitmentLevel(null)).toBe(DEFAULT_COMMITMENT_LEVEL);
    expect(toCommitmentLevel('hardcore')).toBe(DEFAULT_COMMITMENT_LEVEL);
    expect(DEFAULT_COMMITMENT_LEVEL).toBe('classic');
  });
});
