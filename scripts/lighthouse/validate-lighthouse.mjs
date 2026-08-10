import { readFile, writeFile } from 'node:fs/promises';
const percentage = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? (parsed > 1 ? parsed / 100 : parsed) : fallback;
};
const thresholds = {
  mobile: {
    categories: {
      performance: percentage(process.env.LH_MOBILE_PERFORMANCE, 0.99),
      accessibility: percentage(process.env.LH_MOBILE_ACCESSIBILITY, 1),
      'best-practices': percentage(process.env.LH_MOBILE_BEST_PRACTICES, 1),
      seo: percentage(process.env.LH_MOBILE_SEO, 1),
    },
    metrics: {
      lcpMs: Number(process.env.LH_MOBILE_LCP || 2500),
      cls: Number(process.env.LH_MOBILE_CLS || 0.05),
      tbtMs: Number(process.env.LH_MOBILE_TBT || 150),
    },
  },
  desktop: {
    categories: {
      performance: percentage(process.env.LH_DESKTOP_PERFORMANCE, 1),
      accessibility: percentage(process.env.LH_DESKTOP_ACCESSIBILITY, 1),
      'best-practices': percentage(process.env.LH_DESKTOP_BEST_PRACTICES, 1),
      seo: percentage(process.env.LH_DESKTOP_SEO, 1),
    },
    metrics: {
      lcpMs: Number(process.env.LH_DESKTOP_LCP || 1800),
      cls: Number(process.env.LH_DESKTOP_CLS || 0.05),
      tbtMs: Number(process.env.LH_DESKTOP_TBT || 75),
    },
  },
};
const rows = [],
  failures = [];
for (const mode of ['mobile', 'desktop']) {
  let report;
  try {
    const html = await readFile(`reports/lighthouse-${mode}.html`, 'utf8');
    if (!html.includes('<html') || !html.includes('Lighthouse'))
      throw new Error('HTML report invalid');
    report = JSON.parse(await readFile(`reports/lighthouse-${mode}.json`, 'utf8'));
  } catch (error) {
    throw new Error(`Missing or malformed ${mode} Lighthouse evidence: ${error.message}`);
  }
  if (
    report.status !== 'completed' ||
    Number(report.runCount) < 3 ||
    !report.lighthouseVersion ||
    !report.url
  )
    failures.push(`${mode}: repeated-run metadata is incomplete`);
  for (const [key, minimum] of Object.entries(thresholds[mode].categories)) {
    const score = Number(report.categories?.[key]?.score);
    if (!Number.isFinite(score) || score < minimum)
      failures.push(`${mode}: ${key} ${score} below ${minimum}`);
  }
  for (const [key, maximum] of Object.entries(thresholds[mode].metrics)) {
    const value = Number(report.metrics?.[key]);
    if (!Number.isFinite(value) || value > maximum)
      failures.push(`${mode}: ${key} ${value} exceeds ${maximum}`);
  }
  rows.push({
    mode,
    runs: report.runCount,
    performance: Math.round(Number(report.categories?.performance?.score) * 100),
    accessibility: Math.round(Number(report.categories?.accessibility?.score) * 100),
    bestPractices: Math.round(Number(report.categories?.['best-practices']?.score) * 100),
    seo: Math.round(Number(report.categories?.seo?.score) * 100),
    lcp: report.metrics?.lcpMs,
    cls: report.metrics?.cls,
    tbt: report.metrics?.tbtMs,
  });
}
const md = [
  '# Lighthouse Repeated-Run Release Gate',
  '',
  'Scores and metrics are medians from at least three runs; the default is five runs with cold and warm-cache evidence.',
  '',
  '| Mode | Runs | Performance | Accessibility | Best Practices | SEO | LCP ms | CLS | TBT ms |',
  '|---|---:|---:|---:|---:|---:|---:|---:|---:|',
  ...rows.map(
    (r) =>
      `| ${r.mode} | ${r.runs} | ${r.performance} | ${r.accessibility} | ${r.bestPractices} | ${r.seo} | ${r.lcp} | ${r.cls} | ${r.tbt} |`,
  ),
  '',
  failures.length
    ? `## Gate failures\n\n${failures.map((x) => `- ${x}`).join('\n')}`
    : '## Result\n\nPASS — repeated-run median scores and budgets are satisfied.',
  '',
];
await writeFile('reports/lighthouse-summary.md', md.join('\n'));
console.info(md.join('\n'));
if (failures.length) process.exit(1);
