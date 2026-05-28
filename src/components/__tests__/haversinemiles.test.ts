import { describe, test, expect } from 'vitest';
import { haversinemiles } from '../JobTrackingMap';

describe('haversinemiles', () => {
  test('same point returns 0', () => {
    expect(haversinemiles(40.7128, -74.006, 40.7128, -74.006)).toBe(0);
  });

  test('NYC to LA is roughly 2445 miles', () => {
    const d = haversinemiles(40.7128, -74.006, 34.0522, -118.2437);
    expect(d).toBeGreaterThan(2440);
    expect(d).toBeLessThan(2450);
  });

  test('Fargo ND to Sioux Falls SD is roughly 230 miles', () => {
    const d = haversinemiles(46.8772, -96.7898, 43.5473, -96.728);
    expect(d).toBeGreaterThan(225);
    expect(d).toBeLessThan(235);
  });

  test('is symmetric — A→B equals B→A', () => {
    const ab = haversinemiles(44.0, -103.0, 46.8, -100.4);
    const ba = haversinemiles(46.8, -100.4, 44.0, -103.0);
    expect(Math.abs(ab - ba)).toBeLessThan(0.001);
  });

  test('returns a number in miles, not km', () => {
    // NYC to LA should be ~2,445 mi, NOT ~3,934 km
    const d = haversinemiles(40.7128, -74.006, 34.0522, -118.2437);
    expect(d).toBeLessThan(3000);
  });
});
