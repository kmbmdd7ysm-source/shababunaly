import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const failures = [];
const results = {};
const thresholds = {
  mobile: { performance: 0.99, accessibility: 1, 'best-practices': 1, seo: 1, lcpMs: 2500, cls: 0.05, tbtMs: 150 },
  desktop: { performance: 1, accessibility: 1, 'best-practices': 1, seo: 1, lcpMs: 1800, cls: 0.05, tbtMs: 75 },
};
for (const strategy of ['mobile', 'desktop']) {
  const path = `reports/pagespeed-${strategy}.json`;
  if (!existsSync(path)) {
    failures.push(`${strategy}: missing ${path}`);
    continue;
  }
  let report;
  try { report = JSON.parse(readFileSync(path, 'utf8')); }
  catch { failures.push(`${strategy}: invalid JSON`); continue; }
  results[strategy] = report;
  if (report.status !== 'completed') failures.push(`${strategy}: status is ${report.status || 'missing'}`);
  for (const category of ['performance', 'accessibility', 'best-practices', 'seo']) {
    const score = Number(report.categories?.[category]?.score);
    if (!Number.isFinite(score) || score < thresholds[strategy][category]) failures.push(`${strategy}: ${category} score ${score} is below ${thresholds[strategy][category]}`);
  }
  const lcp = Number(report.metrics?.lcpMs);
  const cls = Number(report.metrics?.cls);
  const tbt = Number(report.metrics?.tbtMs);
  if (!Number.isFinite(lcp) || lcp > thresholds[strategy].lcpMs) failures.push(`${strategy}: LCP ${lcp}ms exceeds ${thresholds[strategy].lcpMs}ms`);
  if (!Number.isFinite(cls) || cls > thresholds[strategy].cls) failures.push(`${strategy}: CLS ${cls} exceeds ${thresholds[strategy].cls}`);
  if (!Number.isFinite(tbt) || tbt > thresholds[strategy].tbtMs) failures.push(`${strategy}: TBT ${tbt}ms exceeds ${thresholds[strategy].tbtMs}ms`);
}
const summary = { status: failures.length ? 'failed' : 'passed', generatedAt: new Date().toISOString(), thresholds, failures };
mkdirSync('reports', { recursive: true });
writeFileSync('reports/pagespeed-validation.json', `${JSON.stringify(summary, null, 2)}\n`);
if (failures.length) {
  console.error(`PageSpeed validation failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.info('PageSpeed mobile and desktop evidence passed all production thresholds.');
