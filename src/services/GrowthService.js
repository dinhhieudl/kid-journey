/**
 * Growth analysis service
 * WHO Z-score calculation, percentile computation, curve generation
 * @module services/GrowthService
 */
const GrowthRepository = require('../repositories/GrowthRepository');

/**
 * Calculate Z-score using WHO LMS method
 * Z = ((X/M)^L - 1) / (L * S) when L≠0
 * Z = ln(X/M) / S when L=0
 * @param {number} x - Observed value
 * @param {number} l - Lambda (Box-Cox power)
 * @param {number} m - Mu (median)
 * @param {number} s - Sigma (coefficient of variation)
 * @returns {number} Z-score
 */
function calcZScore(x, l, m, s) {
  if (Math.abs(l) < 0.0001) {
    return Math.log(x / m) / s;
  }
  return (Math.pow(x / m, l) - 1) / (l * s);
}

/**
 * Calculate value from Z-score (inverse LMS)
 * X = M * (1 + L*S*Z)^(1/L) when L≠0
 * X = M * exp(S*Z) when L=0
 * @param {number} z - Z-score
 * @param {number} l - Lambda
 * @param {number} m - Mu (median)
 * @param {number} s - Sigma
 * @returns {number} Observed value
 */
function calcValueFromZ(z, l, m, s) {
  if (Math.abs(l) < 0.0001) {
    return m * Math.exp(s * z);
  }
  return m * Math.pow(1 + l * s * z, 1 / l);
}

/**
 * Get interpolated LMS values for a given age
 * Uses linear interpolation between nearest data points
 * @param {string} indicator - 'wfa' | 'lhfa' | 'hcfa'
 * @param {number} sex - 1=male, 2=female
 * @param {number} ageMonths
 * @returns {{ l: number, m: number, s: number }|null}
 */
function getLMS(indicator, sex, ageMonths) {
  const { lower, upper } = GrowthRepository.getWhoReferenceRange(indicator, sex, ageMonths);

  if (!lower && !upper) return null;
  if (!lower) return { l: upper.l, m: upper.m, s: upper.s };
  if (!upper) return { l: lower.l, m: lower.m, s: lower.s };

  // If exact match
  if (lower.age_months === ageMonths) {
    return { l: lower.l, m: lower.m, s: lower.s };
  }

  // Linear interpolation
  const ratio = (ageMonths - lower.age_months) / (upper.age_months - lower.age_months);
  return {
    l: lower.l + ratio * (upper.l - lower.l),
    m: lower.m + ratio * (upper.m - lower.m),
    s: lower.s + ratio * (upper.s - lower.s),
  };
}

/**
 * Convert Z-score to percentile using error function approximation
 * @param {number} z - Z-score
 * @returns {number} Percentile (0-100)
 */
function zScoreToPercentile(z) {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return +(0.5 * (1.0 + sign * y) * 100).toFixed(1);
}

/**
 * Evaluate a Z-score into a human-readable category
 * @param {number} z - Z-score
 * @returns {{ level: string, label: string, color: string, icon: string }}
 */
function evaluateZScore(z) {
  if (z < -3) return { level: 'very_low', label: 'Rất thấp', color: '#e74c3c', icon: '🔴' };
  if (z < -2) return { level: 'low', label: 'Thấp', color: '#e67e22', icon: '🟠' };
  if (z < -1) return { level: 'below_avg', label: 'Dưới TB', color: '#f39c12', icon: '🟡' };
  if (z <= 1) return { level: 'normal', label: 'Bình thường', color: '#27ae60', icon: '🟢' };
  if (z <= 2) return { level: 'above_avg', label: 'Trên TB', color: '#f39c12', icon: '🟡' };
  if (z <= 3) return { level: 'high', label: 'Cao', color: '#e67e22', icon: '🟠' };
  return { level: 'very_high', label: 'Rất cao', color: '#e74c3c', icon: '🔴' };
}

/**
 * Calculate age in months between two dates
 * @param {string} birthday - YYYY-MM-DD
 * @param {string} measureDate - YYYY-MM-DD
 * @returns {number|null}
 */
function getAgeInMonths(birthday, measureDate) {
  if (!birthday || !measureDate) return null;
  const b = new Date(birthday);
  const d = new Date(measureDate);
  return (d.getFullYear() - b.getFullYear()) * 12 + (d.getMonth() - b.getMonth()) + (d.getDate() - b.getDate()) / 30;
}

/**
 * Generate WHO percentile curves for chart overlay
 * @param {number} sex - 1=male, 2=female
 * @param {{ min: number, max: number }} ageRange - Age range in months
 * @returns {Object.<string, Array<{ age: number, value: number }>>}
 */
function generateWHOCurves(sex, ageRange) {
  const zScores = [-3, -2, -1, 0, 1, 2, 3];
  const curves = {};

  for (const z of zScores) {
    curves[String(z)] = [];
    for (let age = Math.max(0, ageRange.min); age <= ageRange.max; age += 0.5) {
      const lms = getLMS('lhfa', sex, age);
      if (lms) {
        const value = calcValueFromZ(z, lms.l, lms.m, lms.s);
        curves[String(z)].push({ age, value: +value.toFixed(1) });
      }
    }
  }
  return curves;
}

/**
 * Generate weight-for-age WHO curves
 * @param {number} sex
 * @param {{ min: number, max: number }} ageRange
 * @returns {Object.<string, Array<{ age: number, value: number }>>}
 */
function generateWeightCurves(sex, ageRange) {
  const zScores = [-3, -2, -1, 0, 1, 2, 3];
  const curves = {};

  for (const z of zScores) {
    curves[String(z)] = [];
    for (let age = Math.max(0, ageRange.min); age <= ageRange.max; age += 0.5) {
      const lms = getLMS('wfa', sex, age);
      if (lms) {
        const value = calcValueFromZ(z, lms.l, lms.m, lms.s);
        curves[String(z)].push({ age, value: +value.toFixed(2) });
      }
    }
  }
  return curves;
}

/**
 * Generate head circumference WHO curves
 * @param {number} sex
 * @param {{ min: number, max: number }} ageRange
 * @returns {Object.<string, Array<{ age: number, value: number }>>}
 */
function generateHeadCircCurves(sex, ageRange) {
  const zScores = [-3, -2, -1, 0, 1, 2, 3];
  const curves = {};

  for (const z of zScores) {
    curves[String(z)] = [];
    for (let age = Math.max(0, ageRange.min); age <= ageRange.max; age += 0.5) {
      const lms = getLMS('hcfa', sex, age);
      if (lms) {
        const value = calcValueFromZ(z, lms.l, lms.m, lms.s);
        curves[String(z)].push({ age, value: +value.toFixed(1) });
      }
    }
  }
  return curves;
}

/**
 * Analyze growth records for a kid with WHO comparison
 * @param {number} kidId
 * @param {object} kid - Kid record with birthday and gender
 * @returns {{ records: object[], whoAvailable: boolean, whoCurves: object|null, summary: object }}
 */
function analyze(kidId, kid) {
  const records = GrowthRepository.findByKidId(kidId);

  const sex = kid.gender === 'boy' ? 1 : kid.gender === 'girl' ? 2 : null;

  if (!sex || !kid.birthday) {
    return {
      records,
      whoAvailable: false,
      whoCurves: null,
      summary: null,
      message: 'Cập nhật ngày sinh và giới tính để so sánh với chuẩn WHO',
    };
  }

  const analysis = records.map((r) => {
    const ageMonths = getAgeInMonths(kid.birthday, r.date);
    const result = { ...r, ageMonths, who: {} };

    if (r.height && ageMonths !== null && ageMonths >= 0) {
      const lms = getLMS('lhfa', sex, ageMonths);
      if (lms) {
        const z = calcZScore(r.height, lms.l, lms.m, lms.s);
        result.who.height = {
          zScore: +z.toFixed(2),
          percentile: zScoreToPercentile(z),
          evaluation: evaluateZScore(z),
          median: +lms.m.toFixed(1),
        };
      }
    }

    if (r.weight && ageMonths !== null && ageMonths >= 0) {
      const lms = getLMS('wfa', sex, ageMonths);
      if (lms) {
        const z = calcZScore(r.weight, lms.l, lms.m, lms.s);
        result.who.weight = {
          zScore: +z.toFixed(2),
          percentile: zScoreToPercentile(z),
          evaluation: evaluateZScore(z),
          median: +lms.m.toFixed(2),
        };
      }
    }

    if (r.head_circumference && ageMonths !== null && ageMonths >= 0) {
      const lms = getLMS('hcfa', sex, ageMonths);
      if (lms) {
        const z = calcZScore(r.head_circumference, lms.l, lms.m, lms.s);
        result.who.headCirc = {
          zScore: +z.toFixed(2),
          percentile: zScoreToPercentile(z),
          evaluation: evaluateZScore(z),
          median: +lms.m.toFixed(1),
        };
      }
    }

    return result;
  });

  // Calculate age range for curves
  const ages = analysis.filter(r => r.ageMonths !== null).map(r => r.ageMonths);
  const ageRange = {
    min: ages.length > 0 ? Math.max(0, Math.floor(Math.min(...ages) - 1)) : 0,
    max: ages.length > 0 ? Math.ceil(Math.max(...ages) + 1) : 60,
  };

  const whoCurves = {
    height: generateWHOCurves(sex, ageRange),
    weight: generateWeightCurves(sex, ageRange),
    headCirc: generateHeadCircCurves(sex, ageRange),
  };

  const summary = generateSummary(analysis);

  return { records: analysis, whoAvailable: true, whoCurves, summary };
}

/**
 * Generate growth summary with trends and alerts
 * @param {object[]} analysis
 * @returns {object}
 */
function generateSummary(analysis) {
  const alerts = [];
  const recent = analysis.slice(-3);

  // Check for concerning Z-scores
  for (const r of analysis) {
    if (r.who.height && Math.abs(r.who.height.zScore) > 2) {
      alerts.push({ type: 'height', date: r.date, zScore: r.who.height.zScore, evaluation: r.who.height.evaluation });
    }
    if (r.who.weight && Math.abs(r.who.weight.zScore) > 2) {
      alerts.push({ type: 'weight', date: r.date, zScore: r.who.weight.zScore, evaluation: r.who.weight.evaluation });
    }
  }

  // Calculate trends from recent records
  let heightTrend = 'stable';
  let weightTrend = 'stable';

  if (recent.length >= 2) {
    const heightDiff = (recent[recent.length - 1].height || 0) - (recent[0].height || 0);
    const weightDiff = (recent[recent.length - 1].weight || 0) - (recent[0].weight || 0);

    heightTrend = heightDiff > 1 ? 'increasing' : heightDiff < -1 ? 'decreasing' : 'stable';
    weightTrend = weightDiff > 0.5 ? 'increasing' : weightDiff < -0.5 ? 'decreasing' : 'stable';
  }

  return { heightTrend, weightTrend, alerts };
}

module.exports = {
  calcZScore, calcValueFromZ, getLMS, zScoreToPercentile,
  evaluateZScore, getAgeInMonths, generateWHOCurves,
  generateWeightCurves, generateHeadCircCurves, analyze,
};
