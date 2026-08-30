import { describe, it, expect } from 'vitest';
import {
  STORAGE_QUOTA_BYTES,
  CLEANUP_TRIGGER_BYTES,
  CLEANUP_TARGET_BYTES,
  shouldTriggerCleanup,
  bytesToReclaim,
  objectPathFromPublicUrl,
  isStorageQuotaError,
} from '@/lib/storage-quota';

describe('Cleanup thresholds', () => {
  it('leaves the bucket alone well below the trigger', () => {
    expect(shouldTriggerCleanup(0)).toBe(false);
    expect(shouldTriggerCleanup(STORAGE_QUOTA_BYTES * 0.5)).toBe(false);
  });

  it('triggers once usage reaches the trigger point', () => {
    expect(shouldTriggerCleanup(CLEANUP_TRIGGER_BYTES)).toBe(true);
    expect(shouldTriggerCleanup(STORAGE_QUOTA_BYTES)).toBe(true);
  });

  it('keeps a gap between trigger and target, so runs are not re-entrant', () => {
    // Without hysteresis every upload past the line would start another run
    // that frees just enough to dip under it, then immediately cross back.
    expect(CLEANUP_TARGET_BYTES).toBeLessThan(CLEANUP_TRIGGER_BYTES);
  });

  it('asks for nothing once at or under the target', () => {
    expect(bytesToReclaim(CLEANUP_TARGET_BYTES)).toBe(0);
    expect(bytesToReclaim(0)).toBe(0);
  });

  it('asks for the overshoot above the target, not above the trigger', () => {
    expect(bytesToReclaim(CLEANUP_TARGET_BYTES + 5_000)).toBe(5_000);
  });
});

describe('objectPathFromPublicUrl', () => {
  const base = 'https://abc.supabase.co/storage/v1/object/public/proof-photos';

  it('extracts the bucket-relative path from a stored public URL', () => {
    expect(objectPathFromPublicUrl(`${base}/user-1/photo.webp`)).toBe('user-1/photo.webp');
  });

  it('drops a cache-busting query string', () => {
    expect(objectPathFromPublicUrl(`${base}/user-1/photo.webp?v=123`)).toBe('user-1/photo.webp');
  });

  it('returns null for a null or empty value', () => {
    expect(objectPathFromPublicUrl(null)).toBeNull();
    expect(objectPathFromPublicUrl(undefined)).toBeNull();
    expect(objectPathFromPublicUrl('')).toBeNull();
  });

  it('refuses a URL from any other bucket, so it can never become a delete target', () => {
    expect(objectPathFromPublicUrl('https://abc.supabase.co/storage/v1/object/public/avatars/u/a.webp')).toBeNull();
    expect(objectPathFromPublicUrl('https://example.com/something.jpg')).toBeNull();
  });
});

describe('isStorageQuotaError', () => {
  // Ships inert on purpose: nobody has observed what Supabase actually returns
  // when a project's storage quota is exhausted, and a matcher that guessed
  // wrong would respond to a transient network error by deleting other
  // people's photos. These tests pin the default-deny posture so it cannot be
  // loosened by accident.
  it('rejects non-objects', () => {
    expect(isStorageQuotaError(null)).toBe(false);
    expect(isStorageQuotaError(undefined)).toBe(false);
    expect(isStorageQuotaError('quota exceeded')).toBe(false);
  });

  it('does not match on the message, however quota-ish it reads', () => {
    expect(isStorageQuotaError(new Error('Quota Exceeded: storage limit reached'))).toBe(false);
  });

  it('does not fire on ordinary upload failures', () => {
    expect(isStorageQuotaError({ status: 409, message: 'Duplicate' })).toBe(false);
    expect(isStorageQuotaError({ status: 401 })).toBe(false);
    expect(isStorageQuotaError({ code: '42501' })).toBe(false);
  });

  it('is inert until a real observed error shape is added', () => {
    expect(isStorageQuotaError({ status: 413 })).toBe(false);
    expect(isStorageQuotaError({ status: 507 })).toBe(false);
  });
});
