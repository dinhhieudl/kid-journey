/**
 * Growth Service unit tests
 * Tests Z-score calculation, percentile, evaluation, and LMS interpolation
 */
const GrowthService = require('../src/services/GrowthService');

describe('GrowthService', () => {
  describe('calcZScore', () => {
    test('calculates Z-score with L≠0 (standard case)', () => {
      // Example: X=85, L=1, M=87.1, S=0.0325
      // Z = ((85/87.1)^1 - 1) / (1 * 0.0325) = -0.7419
      const z = GrowthService.calcZScore(85, 1, 87.1, 0.0325);
      expect(z).toBeCloseTo(-0.742, 2);
    });

    test('calculates Z-score with L=0 (log case)', () => {
      // Z = ln(X/M) / S
      // X=10, M=10.5, S=0.1
      const z = GrowthService.calcZScore(10, 0, 10.5, 0.1);
      const expected = Math.log(10 / 10.5) / 0.1;
      expect(z).toBeCloseTo(expected, 5);
    });

    test('Z-score is 0 when X equals median M', () => {
      const z = GrowthService.calcZScore(50, 1, 50, 0.05);
      expect(z).toBeCloseTo(0, 5);
    });

    test('Z-score is positive when X > M', () => {
      const z = GrowthService.calcZScore(90, 1, 87.1, 0.0325);
      expect(z).toBeGreaterThan(0);
    });

    test('Z-score is negative when X < M', () => {
      const z = GrowthService.calcZScore(80, 1, 87.1, 0.0325);
      expect(z).toBeLessThan(0);
    });

    test('handles very small L (near zero) gracefully', () => {
      // L=0.00005 should use the log formula
      const z = GrowthService.calcZScore(10, 0.00005, 10, 0.1);
      // When X=M, Z should be ~0 regardless of L
      expect(z).toBeCloseTo(0, 2);
    });

    test('handles negative L values', () => {
      // Some WHO indicators have negative L (e.g., head circumference)
      const z = GrowthService.calcZScore(34.5, -0.5, 34.46, 0.0356);
      expect(typeof z).toBe('number');
      expect(isFinite(z)).toBe(true);
    });
  });

  describe('calcValueFromZ', () => {
    test('calculates value from Z-score with L≠0', () => {
      // Round-trip: calcZScore then calcValueFromZ should return original
      const original = 85;
      const l = 1, m = 87.1, s = 0.0325;
      const z = GrowthService.calcZScore(original, l, m, s);
      const result = GrowthService.calcValueFromZ(z, l, m, s);
      expect(result).toBeCloseTo(original, 1);
    });

    test('calculates value from Z-score with L=0', () => {
      const original = 10;
      const l = 0, m = 10.5, s = 0.1;
      const z = GrowthService.calcZScore(original, l, m, s);
      const result = GrowthService.calcValueFromZ(z, l, m, s);
      expect(result).toBeCloseTo(original, 3);
    });

    test('returns median when Z=0', () => {
      const result = GrowthService.calcValueFromZ(0, 1, 87.1, 0.0325);
      expect(result).toBeCloseTo(87.1, 1);
    });
  });

  describe('zScoreToPercentile', () => {
    test('Z=0 gives 50th percentile', () => {
      expect(GrowthService.zScoreToPercentile(0)).toBeCloseTo(50, 0);
    });

    test('Z=1 gives approximately 84.1 percentile', () => {
      expect(GrowthService.zScoreToPercentile(1)).toBeCloseTo(84.1, 0);
    });

    test('Z=-1 gives approximately 15.9 percentile', () => {
      expect(GrowthService.zScoreToPercentile(-1)).toBeCloseTo(15.9, 0);
    });

    test('Z=2 gives approximately 97.7 percentile', () => {
      expect(GrowthService.zScoreToPercentile(2)).toBeCloseTo(97.7, 0);
    });

    test('Z=-2 gives approximately 2.3 percentile', () => {
      expect(GrowthService.zScoreToPercentile(-2)).toBeCloseTo(2.3, 0);
    });

    test('Z=3 gives approximately 99.9 percentile', () => {
      expect(GrowthService.zScoreToPercentile(3)).toBeGreaterThan(99);
    });

    test('Z=-3 gives approximately 0.1 percentile', () => {
      expect(GrowthService.zScoreToPercentile(-3)).toBeLessThan(1);
    });
  });

  describe('evaluateZScore', () => {
    test('Z < -3 is very_low', () => {
      const result = GrowthService.evaluateZScore(-3.5);
      expect(result.level).toBe('very_low');
      expect(result.label).toBe('Rất thấp');
    });

    test('-3 <= Z < -2 is low', () => {
      const result = GrowthService.evaluateZScore(-2.5);
      expect(result.level).toBe('low');
      expect(result.label).toBe('Thấp');
    });

    test('-2 <= Z < -1 is below_avg', () => {
      const result = GrowthService.evaluateZScore(-1.5);
      expect(result.level).toBe('below_avg');
      expect(result.label).toBe('Dưới TB');
    });

    test('-1 <= Z <= 1 is normal', () => {
      expect(GrowthService.evaluateZScore(-1).level).toBe('normal');
      expect(GrowthService.evaluateZScore(0).level).toBe('normal');
      expect(GrowthService.evaluateZScore(1).level).toBe('normal');
    });

    test('1 < Z <= 2 is above_avg', () => {
      const result = GrowthService.evaluateZScore(1.5);
      expect(result.level).toBe('above_avg');
      expect(result.label).toBe('Trên TB');
    });

    test('2 < Z <= 3 is high', () => {
      const result = GrowthService.evaluateZScore(2.5);
      expect(result.level).toBe('high');
      expect(result.label).toBe('Cao');
    });

    test('Z > 3 is very_high', () => {
      const result = GrowthService.evaluateZScore(3.5);
      expect(result.level).toBe('very_high');
      expect(result.label).toBe('Rất cao');
    });

    test('all evaluations have required fields', () => {
      const result = GrowthService.evaluateZScore(0);
      expect(result).toHaveProperty('level');
      expect(result).toHaveProperty('label');
      expect(result).toHaveProperty('color');
      expect(result).toHaveProperty('icon');
    });
  });

  describe('getAgeInMonths', () => {
    test('returns null for missing birthday', () => {
      expect(GrowthService.getAgeInMonths(null, '2026-04-30')).toBeNull();
    });

    test('returns null for missing measure date', () => {
      expect(GrowthService.getAgeInMonths('2024-06-15', null)).toBeNull();
    });

    test('calculates age correctly', () => {
      const age = GrowthService.getAgeInMonths('2024-06-15', '2026-04-30');
      expect(age).toBeCloseTo(22.5, 0);
    });

    test('returns 0 for same month', () => {
      const age = GrowthService.getAgeInMonths('2024-06-15', '2024-06-20');
      expect(age).toBeCloseTo(0, 0);
    });
  });

  describe('WHO LMS data integration', () => {
    // These tests require the database to be set up
    // They test the getLMS function with real WHO data
    let hasWhoData = false;

    beforeAll(() => {
      try {
        const { getDb } = require('../src/database/connection');
        const db = getDb();
        const count = db.prepare('SELECT COUNT(*) as c FROM growth_who_reference').get().c;
        hasWhoData = count > 0;
      } catch (e) {
        hasWhoData = false;
      }
    });

    test('getLMS returns valid data for known WHO data points', () => {
      if (!hasWhoData) return; // Skip if no WHO data

      // Male, 0 months, lhfa: L=1, M=49.8842, S=0.0379
      const lms = GrowthService.getLMS('lhfa', 1, 0);
      expect(lms).not.toBeNull();
      expect(lms.m).toBeCloseTo(49.8842, 1);
    });

    test('getLMS interpolates between data points', () => {
      if (!hasWhoData) return;

      // Between 0 and 0.5 months
      const lms = GrowthService.getLMS('lhfa', 1, 0.25);
      expect(lms).not.toBeNull();
      // M should be between 49.8842 and 51.7301
      expect(lms.m).toBeGreaterThan(49);
      expect(lms.m).toBeLessThan(52);
    });

    test('Z-score round-trip with WHO reference data', () => {
      if (!hasWhoData) return;

      // For a male baby at 12 months, lhfa median is ~76.27
      const lms = GrowthService.getLMS('lhfa', 1, 12);
      expect(lms).not.toBeNull();

      // If measured at median, Z should be ~0
      const z = GrowthService.calcZScore(lms.m, lms.l, lms.m, lms.s);
      expect(z).toBeCloseTo(0, 3);
    });
  });

  describe('edge cases', () => {
    test('extremely high Z-score does not crash', () => {
      const z = GrowthService.calcZScore(200, 1, 87.1, 0.0325);
      expect(isFinite(z)).toBe(true);
      expect(z).toBeGreaterThan(3);
    });

    test('extremely low Z-score does not crash', () => {
      const z = GrowthService.calcZScore(10, 1, 87.1, 0.0325);
      expect(isFinite(z)).toBe(true);
      expect(z).toBeLessThan(-3);
    });

    test('percentile is always between 0 and 100', () => {
      for (let z = -5; z <= 5; z += 0.5) {
        const p = GrowthService.zScoreToPercentile(z);
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(100);
      }
    });
  });
});
