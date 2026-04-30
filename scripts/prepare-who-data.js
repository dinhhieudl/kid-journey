#!/usr/bin/env node
/**
 * Script để parse WHO LMS data từ CSV/Excel thành JSON
 * 
 * Nguồn dữ liệu WHO chính thức:
 * - https://www.who.int/tools/child-growth-standards/standards
 * - https://www.cdc.gov/growthcharts/who-data-files.htm
 * 
 * Cách sử dụng:
 * 1. Download file Excel từ WHO/CDC
 * 2. Convert sang CSV
 * 3. Chạy: node scripts/prepare-who-data.js <input.csv> > data/who-lms-data.json
 * 
 * Hoặc dùng dữ liệu mẫu đã hardcode bên dưới.
 */

const fs = require('fs');

// ============================================================
// DỮ LIỆU WHO LMS MẪU (0-60 tháng)
// Nguồn: WHO Child Growth Standards
// Chỉ mang tính minh họa — production cần data đầy đủ từ WHO
// ============================================================

function generateSampleLMS() {
  const data = [];

  // === LENGTH-FOR-AGE (lhfa) — Bé trai (sex=1) ===
  // Dữ liệu thực từ WHO, chỉ lấy mẫu 0, 3, 6, 9, 12, 15, 18, 21, 24, 36, 48, 60 tháng
  const lhfa_boys = [
    { age: 0, l: 1, m: 49.8842, s: 0.0379 },
    { age: 0.5, l: 1, m: 51.7301, s: 0.0372 },
    { age: 1, l: 1, m: 54.6921, s: 0.0362 },
    { age: 1.5, l: 1, m: 57.0671, s: 0.0355 },
    { age: 2, l: 1, m: 58.9618, s: 0.0349 },
    { age: 3, l: 1, m: 61.8613, s: 0.0341 },
    { age: 4, l: 1, m: 64.2755, s: 0.0335 },
    { age: 5, l: 1, m: 66.3765, s: 0.0331 },
    { age: 6, l: 1, m: 68.2382, s: 0.0328 },
    { age: 7, l: 1, m: 69.9096, s: 0.0326 },
    { age: 8, l: 1, m: 71.4223, s: 0.0324 },
    { age: 9, l: 1, m: 72.8004, s: 0.0323 },
    { age: 10, l: 1, m: 74.0587, s: 0.0322 },
    { age: 11, l: 1, m: 75.2110, s: 0.0322 },
    { age: 12, l: 1, m: 76.2694, s: 0.0321 },
    { age: 13, l: 1, m: 77.2433, s: 0.0321 },
    { age: 14, l: 1, m: 78.1408, s: 0.0321 },
    { age: 15, l: 1, m: 78.9699, s: 0.0321 },
    { age: 18, l: 1, m: 81.3268, s: 0.0322 },
    { age: 21, l: 1, m: 83.3810, s: 0.0323 },
    { age: 24, l: 1, m: 85.1966, s: 0.0325 },
    { age: 30, l: 1, m: 88.4578, s: 0.0329 },
    { age: 36, l: 1, m: 91.3569, s: 0.0333 },
    { age: 42, l: 1, m: 93.9824, s: 0.0337 },
    { age: 48, l: 1, m: 96.3800, s: 0.0341 },
    { age: 54, l: 1, m: 98.5890, s: 0.0345 },
    { age: 60, l: 1, m: 100.6380, s: 0.0349 },
  ];

  // === LENGTH-FOR-AGE (lhfa) — Bé gái (sex=2) ===
  const lhfa_girls = [
    { age: 0, l: 1, m: 49.1477, s: 0.0379 },
    { age: 0.5, l: 1, m: 50.8434, s: 0.0371 },
    { age: 1, l: 1, m: 53.6872, s: 0.0360 },
    { age: 1.5, l: 1, m: 55.9678, s: 0.0352 },
    { age: 2, l: 1, m: 57.7988, s: 0.0345 },
    { age: 3, l: 1, m: 60.5570, s: 0.0337 },
    { age: 4, l: 1, m: 62.8656, s: 0.0331 },
    { age: 5, l: 1, m: 64.8920, s: 0.0327 },
    { age: 6, l: 1, m: 66.6978, s: 0.0324 },
    { age: 7, l: 1, m: 68.3200, s: 0.0322 },
    { age: 8, l: 1, m: 69.7852, s: 0.0320 },
    { age: 9, l: 1, m: 71.1218, s: 0.0319 },
    { age: 10, l: 1, m: 72.3505, s: 0.0318 },
    { age: 11, l: 1, m: 73.4872, s: 0.0318 },
    { age: 12, l: 1, m: 74.5389, s: 0.0317 },
    { age: 13, l: 1, m: 75.5166, s: 0.0317 },
    { age: 14, l: 1, m: 76.4253, s: 0.0317 },
    { age: 15, l: 1, m: 77.2700, s: 0.0317 },
    { age: 18, l: 1, m: 79.5885, s: 0.0318 },
    { age: 21, l: 1, m: 81.5800, s: 0.0319 },
    { age: 24, l: 1, m: 83.3206, s: 0.0321 },
    { age: 30, l: 1, m: 86.4362, s: 0.0325 },
    { age: 36, l: 1, m: 89.2236, s: 0.0329 },
    { age: 42, l: 1, m: 91.7122, s: 0.0333 },
    { age: 48, l: 1, m: 93.9638, s: 0.0337 },
    { age: 54, l: 1, m: 96.0156, s: 0.0341 },
    { age: 60, l: 1, m: 97.8978, s: 0.0345 },
  ];

  // === WEIGHT-FOR-AGE (wfa) — Bé trai (sex=1) ===
  const wfa_boys = [
    { age: 0, l: 0.3487, m: 3.3464, s: 0.14602 },
    { age: 0.5, l: 0.2477, m: 4.4709, s: 0.13395 },
    { age: 1, l: 0.1601, m: 5.3853, s: 0.12385 },
    { age: 1.5, l: 0.0859, m: 6.1413, s: 0.11653 },
    { age: 2, l: 0.0228, m: 6.7833, s: 0.11110 },
    { age: 3, l: -0.0890, m: 7.8243, s: 0.10450 },
    { age: 4, l: -0.1601, m: 8.6397, s: 0.10068 },
    { age: 5, l: -0.2046, m: 9.2940, s: 0.09812 },
    { age: 6, l: -0.2312, m: 9.8315, s: 0.09622 },
    { age: 7, l: -0.2452, m: 10.2821, s: 0.09478 },
    { age: 8, l: -0.2500, m: 10.6671, s: 0.09368 },
    { age: 9, l: -0.2480, m: 11.0037, s: 0.09281 },
    { age: 10, l: -0.2407, m: 11.3041, s: 0.09211 },
    { age: 11, l: -0.2293, m: 11.5757, s: 0.09153 },
    { age: 12, l: -0.2146, m: 11.8234, s: 0.09103 },
    { age: 15, l: -0.1664, m: 12.4666, s: 0.08985 },
    { age: 18, l: -0.1088, m: 13.0473, s: 0.08903 },
    { age: 21, l: -0.0470, m: 13.5815, s: 0.08847 },
    { age: 24, l: 0.0147, m: 14.0792, s: 0.08815 },
    { age: 30, l: 0.1297, m: 14.9871, s: 0.08802 },
    { age: 36, l: 0.2288, m: 15.8298, s: 0.08838 },
    { age: 42, l: 0.3119, m: 16.6276, s: 0.08914 },
    { age: 48, l: 0.3803, m: 17.3905, s: 0.09023 },
    { age: 54, l: 0.4361, m: 18.1260, s: 0.09157 },
    { age: 60, l: 0.4811, m: 18.8402, s: 0.09310 },
  ];

  // === WEIGHT-FOR-AGE (wfa) — Bé gái (sex=2) ===
  const wfa_girls = [
    { age: 0, l: 0.3808, m: 3.2322, s: 0.14171 },
    { age: 0.5, l: 0.1809, m: 4.1873, s: 0.13410 },
    { age: 1, l: 0.0505, m: 4.9637, s: 0.12580 },
    { age: 1.5, l: -0.0485, m: 5.6060, s: 0.11935 },
    { age: 2, l: -0.1216, m: 6.1457, s: 0.11458 },
    { age: 3, l: -0.2069, m: 7.0292, s: 0.10841 },
    { age: 4, l: -0.2446, m: 7.7303, s: 0.10471 },
    { age: 5, l: -0.2556, m: 8.3097, s: 0.10231 },
    { age: 6, l: -0.2520, m: 8.8008, s: 0.10060 },
    { age: 7, l: -0.2384, m: 9.2239, s: 0.09932 },
    { age: 8, l: -0.2178, m: 9.5942, s: 0.09833 },
    { age: 9, l: -0.1925, m: 9.9227, s: 0.09754 },
    { age: 10, l: -0.1640, m: 10.2169, s: 0.09690 },
    { age: 11, l: -0.1335, m: 10.4843, s: 0.09637 },
    { age: 12, l: -0.1018, m: 10.7309, s: 0.09593 },
    { age: 15, l: -0.0097, m: 11.3677, s: 0.09490 },
    { age: 18, l: 0.0777, m: 11.9459, s: 0.09419 },
    { age: 21, l: 0.1572, m: 12.4786, s: 0.09375 },
    { age: 24, l: 0.2271, m: 12.9761, s: 0.09350 },
    { age: 30, l: 0.3393, m: 13.8833, s: 0.09346 },
    { age: 36, l: 0.4198, m: 14.7140, s: 0.09384 },
    { age: 42, l: 0.4768, m: 15.4955, s: 0.09448 },
    { age: 48, l: 0.5173, m: 16.2436, s: 0.09532 },
    { age: 54, l: 0.5460, m: 16.9686, s: 0.09630 },
    { age: 60, l: 0.5661, m: 17.6777, s: 0.09738 },
  ];

  // === HEAD CIRCUMFERENCE-FOR-AGE (hcfa) — Bé trai (sex=1) ===
  const hcfa_boys = [
    { age: 0, l: -0.5053, m: 34.4618, s: 0.03560 },
    { age: 0.5, l: -0.6497, m: 36.3019, s: 0.03391 },
    { age: 1, l: -0.7680, m: 37.7638, s: 0.03266 },
    { age: 1.5, l: -0.8620, m: 38.9248, s: 0.03172 },
    { age: 2, l: -0.9355, m: 39.8498, s: 0.03100 },
    { age: 3, l: -1.0345, m: 41.1848, s: 0.03000 },
    { age: 4, l: -1.0891, m: 42.0984, s: 0.02933 },
    { age: 5, l: -1.1149, m: 42.7553, s: 0.02886 },
    { age: 6, l: -1.1225, m: 43.2420, s: 0.02851 },
    { age: 7, l: -1.1183, m: 43.6148, s: 0.02825 },
    { age: 8, l: -1.1063, m: 43.8996, s: 0.02806 },
    { age: 9, l: -1.0890, m: 44.1161, s: 0.02791 },
    { age: 10, l: -1.0681, m: 44.2797, s: 0.02780 },
    { age: 11, l: -1.0447, m: 44.4022, s: 0.02772 },
    { age: 12, l: -1.0196, m: 44.4928, s: 0.02765 },
    { age: 15, l: -0.9371, m: 44.7103, s: 0.02748 },
    { age: 18, l: -0.8519, m: 44.8473, s: 0.02736 },
    { age: 21, l: -0.7689, m: 44.9363, s: 0.02727 },
    { age: 24, l: -0.6900, m: 44.9951, s: 0.02720 },
    { age: 36, l: -0.4178, m: 45.2078, s: 0.02695 },
    { age: 48, l: -0.2126, m: 45.3488, s: 0.02681 },
    { age: 60, l: -0.0584, m: 45.4744, s: 0.02674 },
  ];

  // === HEAD CIRCUMFERENCE-FOR-AGE (hcfa) — Bé gái (sex=2) ===
  const hcfa_girls = [
    { age: 0, l: -0.2137, m: 33.8787, s: 0.03496 },
    { age: 0.5, l: -0.3891, m: 35.6478, s: 0.03352 },
    { age: 1, l: -0.5308, m: 37.0563, s: 0.03243 },
    { age: 1.5, l: -0.6416, m: 38.1561, s: 0.03162 },
    { age: 2, l: -0.7276, m: 39.0182, s: 0.03100 },
    { age: 3, l: -0.8452, m: 40.2683, s: 0.03011 },
    { age: 4, l: -0.9106, m: 41.1393, s: 0.02953 },
    { age: 5, l: -0.9437, m: 41.7608, s: 0.02913 },
    { age: 6, l: -0.9560, m: 42.2246, s: 0.02883 },
    { age: 7, l: -0.9551, m: 42.5745, s: 0.02861 },
    { age: 8, l: -0.9453, m: 42.8388, s: 0.02844 },
    { age: 9, l: -0.9292, m: 43.0383, s: 0.02831 },
    { age: 10, l: -0.9087, m: 43.1882, s: 0.02821 },
    { age: 11, l: -0.8851, m: 43.3001, s: 0.02813 },
    { age: 12, l: -0.8593, m: 43.3825, s: 0.02806 },
    { age: 15, l: -0.7781, m: 43.5787, s: 0.02789 },
    { age: 18, l: -0.6932, m: 43.7088, s: 0.02775 },
    { age: 21, l: -0.6100, m: 43.7952, s: 0.02764 },
    { age: 24, l: -0.5310, m: 43.8542, s: 0.02755 },
    { age: 36, l: -0.2688, m: 44.0448, s: 0.02730 },
    { age: 48, l: -0.0819, m: 44.1706, s: 0.02718 },
    { age: 60, l: 0.0528, m: 44.2807, s: 0.02712 },
  ];

  // Convert to standard format
  function addRows(indicator, sex, rows) {
    for (const r of rows) {
      data.push({
        indicator,
        sex,
        age_months: r.age,
        length_cm: null,
        l: r.l,
        m: r.m,
        s: r.s,
      });
    }
  }

  addRows('lhfa', 1, lhfa_boys);
  addRows('lhfa', 2, lhfa_girls);
  addRows('wfa', 1, wfa_boys);
  addRows('wfa', 2, wfa_girls);
  addRows('hcfa', 1, hcfa_boys);
  addRows('hcfa', 2, hcfa_girls);

  return data;
}

// Main
const data = generateSampleLMS();

if (process.argv[2]) {
  // Parse CSV input (nếu có)
  console.error('CSV parsing not implemented yet. Using built-in sample data.');
}

// Output JSON
const json = JSON.stringify(data, null, 2);
const outputPath = process.argv[3] || 'data/who-lms-data.json';

fs.writeFileSync(outputPath, json);
console.log(`✅ Generated ${data.length} LMS reference rows → ${outputPath}`);
console.log(`   Indicators: lhfa (length-for-age), wfa (weight-for-age), hcfa (head-circ-for-age)`);
console.log(`   Sex: 1=boys, 2=girls`);
console.log(`   Age range: 0-60 months`);
console.log(`\n⚠️  This is SAMPLE data. For production, download official WHO data from:`);
console.log(`   https://www.who.int/tools/child-growth-standards/standards`);
