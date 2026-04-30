/**
 * Report routes — Generate growth report for pediatrician
 * GET /api/kids/:kidId/report/growth — HTML report (print-friendly)
 * @module routes/report
 */
const express = require('express');
const router = express.Router({ mergeParams: true });
const { asyncHandler } = require('../middleware/errorHandler');
const { authorizeKid } = require('../middleware/auth');
const KidRepository = require('../repositories/KidRepository');
const GrowthService = require('../services/GrowthService');

/**
 * GET /api/kids/:kidId/report/growth
 * Generate a print-friendly growth report HTML
 */
router.get('/growth', authorizeKid, asyncHandler(async (req, res) => {
  const kid = KidRepository.findById(req.params.kidId);
  if (!kid) return res.status(404).json({ error: 'Not found' });

  const analysis = GrowthService.analyze(req.params.kidId, kid);
  const records = analysis.records || [];
  const whoAvailable = analysis.whoAvailable;
  const summary = analysis.summary;

  const evalIcon = (e) => e ? `${e.icon} ${e.label}` : '-';
  const fmt = (v, u) => v ? `${v} ${u}` : '-';

  const ageStr = kid.birthday ? (() => {
    const bd = new Date(kid.birthday), now = new Date();
    let y = now.getFullYear() - bd.getFullYear(), m = now.getMonth() - bd.getMonth();
    if (m < 0) { y--; m += 12; }
    return y > 0 ? `${y} tuổi ${m} tháng` : `${m} tháng`;
  })() : '';

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Báo cáo tăng trưởng - ${kid.name}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Helvetica Neue',Arial,sans-serif;color:#333;font-size:13px;line-height:1.6;padding:32px;max-width:800px;margin:0 auto}
  h1{font-size:22px;margin-bottom:4px;color:#6c5ce7}
  h2{font-size:16px;margin:24px 0 12px;color:#2d3436;border-bottom:2px solid #6c5ce7;padding-bottom:6px}
  .header{text-align:center;margin-bottom:28px;padding-bottom:16px;border-bottom:2px solid #eee}
  .header .sub{color:#666;font-size:13px}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px}
  .info-item{padding:8px 12px;background:#f8f7f4;border-radius:8px}
  .info-item .label{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.5px}
  .info-item .value{font-size:14px;font-weight:600;margin-top:2px}
  table{width:100%;border-collapse:collapse;margin:12px 0}
  th{background:#f8f7f4;text-align:left;padding:8px 10px;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid #ddd}
  td{padding:8px 10px;border-bottom:1px solid #eee;font-size:13px}
  .eval{font-weight:600}
  .eval-normal{color:#27ae60}.eval-low{color:#e67e22}.eval-very-low{color:#e74c3c}.eval-high{color:#e67e22}.eval-very-high{color:#e74c3c}.eval-below{color:#f39c12}.eval-above{color:#f39c12}
  .summary-box{background:#f0faf6;border:1px solid #c8e6c9;border-radius:10px;padding:16px;margin:16px 0}
  .alert-box{background:#fff3e0;border:1px solid #ffe0b2;border-radius:10px;padding:16px;margin:16px 0}
  .footer{text-align:center;margin-top:32px;padding-top:16px;border-top:2px solid #eee;font-size:11px;color:#999}
  @media print{body{padding:16px}.no-print{display:none}}
  .print-btn{position:fixed;top:16px;right:16px;padding:10px 24px;background:#6c5ce7;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-weight:600}
  .print-btn:hover{background:#5b4cdb}
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">🖨️ In / Lưu PDF</button>

<div class="header">
  <h1>📊 Báo cáo tăng trưởng</h1>
  <div class="sub">Kid Journey · Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}</div>
</div>

<div class="info-grid">
  <div class="info-item"><div class="label">Tên bé</div><div class="value">${kid.name} ${kid.nickname ? `("${kid.nickname}")` : ''}</div></div>
  <div class="info-item"><div class="label">Ngày sinh</div><div class="value">${kid.birthday || 'Chưa cập nhật'}</div></div>
  <div class="info-item"><div class="label">Giới tính</div><div class="value">${kid.gender === 'boy' ? 'Bé trai' : kid.gender === 'girl' ? 'Bé gái' : 'Chưa cập nhật'}</div></div>
  <div class="info-item"><div class="label">Tuổi</div><div class="value">${ageStr || 'Chưa cập nhật'}</div></div>
</div>

<h2>📋 Kết quả đo gần nhất</h2>
${records.length > 0 ? (() => {
  const latest = records[records.length - 1];
  const w = latest.who || {};
  return `<table>
    <tr><th>Chỉ số</th><th>Giá trị</th><th>Z-score</th><th>Percentile</th><th>Đánh giá</th><th>Median WHO</th></tr>
    ${w.height ? `<tr><td>📏 Chiều cao</td><td>${fmt(latest.height, 'cm')}</td><td>${w.height.zScore}</td><td>${w.height.percentile}%</td><td class="eval eval-${w.height.evaluation.level}">${evalIcon(w.height.evaluation)}</td><td>${w.height.median} cm</td></tr>` : ''}
    ${w.weight ? `<tr><td>⚖️ Cân nặng</td><td>${fmt(latest.weight, 'kg')}</td><td>${w.weight.zScore}</td><td>${w.weight.percentile}%</td><td class="eval eval-${w.weight.evaluation.level}">${evalIcon(w.weight.evaluation)}</td><td>${w.weight.median} kg</td></tr>` : ''}
    ${w.headCirc ? `<tr><td>🧠 Vòng đầu</td><td>${fmt(latest.head_circumference, 'cm')}</td><td>${w.headCirc.zScore}</td><td>${w.headCirc.percentile}%</td><td class="eval eval-${w.headCirc.evaluation.level}">${evalIcon(w.headCirc.evaluation)}</td><td>${w.headCirc.median} cm</td></tr>` : ''}
  </table>`;
})() : '<p style="color:#999;padding:16px 0">Chưa có dữ liệu đo</p>'}

${summary && summary.alerts.length ? `
<div class="alert-box">
  <strong>⚠️ Lưu ý:</strong>
  ${summary.alerts.map(a => `<div style="margin-top:4px">• ${a.type === 'height' ? 'Chiều cao' : 'Cân nặng'} ngày ${a.date}: Z-score ${a.zScore} (${a.evaluation.label})</div>`).join('')}
</div>` : ''}

${summary ? `<div class="summary-box">
  <strong>📈 Xu hướng:</strong>
  Chiều cao: ${summary.heightTrend === 'increasing' ? 'Đang tăng đều' : summary.heightTrend === 'decreasing' ? 'Có dấu hiệu giảm' : 'Ổn định'} ·
  Cân nặng: ${summary.weightTrend === 'increasing' ? 'Đang tăng đều' : summary.weightTrend === 'decreasing' ? 'Có dấu hiệu giảm' : 'Ổn định'}
</div>` : ''}

<h2>📜 Lịch sử đo (${records.length} lần)</h2>
${records.length ? `<table>
  <tr><th>Ngày</th><th>Tuổi</th><th>Chiều cao</th><th>Cân nặng</th><th>Vòng đầu</th><th>Đánh giá</th></tr>
  ${records.map(r => {
    const w = r.who || {};
    const evals = [];
    if (w.height) evals.push(w.height.evaluation.icon);
    if (w.weight) evals.push(w.weight.evaluation.icon);
    if (w.headCirc) evals.push(w.headCirc.evaluation.icon);
    return `<tr>
      <td>${r.date}</td>
      <td>${r.ageMonths ? r.ageMonths.toFixed(1) + 'th' : '-'}</td>
      <td>${fmt(r.height, 'cm')}</td>
      <td>${fmt(r.weight, 'kg')}</td>
      <td>${fmt(r.head_circumference, 'cm')}</td>
      <td>${evals.join(' ') || '-'}</td>
    </tr>`;
  }).join('')}
</table>` : ''}

<div class="footer">
  <p>Báo cáo được tạo bởi Kid Journey · ${new Date().toLocaleString('vi-VN')}</p>
  <p>Dữ liệu tham chiếu: WHO Child Growth Standards</p>
</div>
</body></html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}));

module.exports = router;
