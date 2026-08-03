// Builds the route structural-rebuild ledger from the ACTUAL router.
//
// A route counts as structurally rebuilt only when its page component's JSX has
// meaningfully changed against the pre-redesign baseline AND it renders the new
// composition architecture. A stylesheet change alone never counts — that is the
// exact failure this ledger exists to expose.
//
// Detection is mechanical, not self-reported:
//   1. parse the route table out of src/App.jsx
//   2. resolve each route to its page component file
//   3. diff that file against the baseline commit
//   4. classify by how much of the render tree actually moved
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const BASELINE = process.env.BASELINE_REF || 'main';

/** Marker classes that only exist in the rebuilt composition architecture. */
const REBUILT_MARKERS = [
  'gw-masthead',
  'gw-colophon',
  'gw-catalogue',
  'gw-stage',
  'gw-deck',
  'gw-ledger',
  'gw-checkout',
  'gw-hero',
  'gw-section',
  'gw-studio',
  'gw-workspace',
  'gw-dossier',
  'gw-console',
  'gw-account',
];

/** Legacy wrappers whose presence means the old composition still dominates. */
const LEGACY_WRAPPERS = ['PageHero', 'section className="section"', 'className="container"'];

const app = readFileSync('src/App.jsx', 'utf8');

// --- 1. route table --------------------------------------------------------
const routes = [...app.matchAll(/<Route\s+path="([^"]+)"\s+element=\{<([A-Za-z0-9_]+)/g)].map(
  ([, path, component]) => ({ path, component }),
);

// --- 2. lazy + static import map -------------------------------------------
const imports = new Map();
for (const [, name, file] of app.matchAll(
  /const\s+([A-Za-z0-9_]+)\s*=\s*lazy\(\s*\(\)\s*=>\s*import\(['"]([^'"]+)['"]\)/g,
)) {
  imports.set(name, file);
}
for (const [, name, file] of app.matchAll(
  /^import\s+([A-Za-z0-9_]+)\s+from\s+['"]([^'"]+)['"]/gm,
)) {
  if (!imports.has(name)) imports.set(name, file);
}

const resolve = (spec) => {
  if (!spec) return null;
  const base = spec.replace(/^\.\//, 'src/').replace(/^\.\.\//, 'src/');
  for (const candidate of [`${base}.jsx`, `${base}.js`, base]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
};

const git = (args) => {
  try {
    return execFileSync('git', args, { encoding: 'utf8' });
  } catch {
    return '';
  }
};

const ACCESS = (path) => {
  if (path.startsWith('/operations')) return 'staff';
  if (['/account', '/orders'].some((p) => path.startsWith(p))) return 'customer';
  if (path.startsWith('/team-locker')) return 'team';
  return 'public';
};

const rows = [];
for (const { path, component } of routes) {
  const file = resolve(imports.get(component));
  const source = file ? readFileSync(file, 'utf8') : '';
  const numstat = file ? git(['diff', '--numstat', `${BASELINE}..HEAD`, '--', file]).trim() : '';
  const [added, removed] = numstat ? numstat.split(/\s+/).map(Number) : [0, 0];

  const markers = REBUILT_MARKERS.filter((marker) => source.includes(marker));
  const legacy = LEGACY_WRAPPERS.filter((wrapper) => source.includes(wrapper));
  // A page is only "rebuilt" when its own JSX moved AND it renders new
  // composition markers. Either alone is not enough.
  const jsxChanged = added + removed > 40;
  // `<Navigate>` entries are redirects, not pages. They have no composition to
  // rebuild and must not inflate the legacy count.
  const isRedirect = component === 'Navigate';
  const status = isRedirect
    ? 'redirect'
    : jsxChanged && markers.length > 0
      ? 'fully-rebuilt'
      : markers.length > 0 || jsxChanged
        ? 'partially-rebuilt'
        : 'not-rebuilt';

  rows.push({
    route: path,
    component,
    file: file || '(unresolved)',
    access: ACCESS(path),
    linesAdded: added,
    linesRemoved: removed,
    compositionMarkers: markers,
    legacyWrappers: legacy,
    status,
  });
}

const counts = rows.reduce((acc, row) => ({ ...acc, [row.status]: (acc[row.status] || 0) + 1 }), {
  'fully-rebuilt': 0,
  'partially-rebuilt': 0,
  'not-rebuilt': 0,
  redirect: 0,
});
// Distinct page components matter more than route count: one file can serve
// five routes, so progress is tracked both ways.
const pageFiles = new Map();
for (const row of rows) {
  if (row.status === 'redirect') continue;
  if (!pageFiles.has(row.file)) pageFiles.set(row.file, row.status);
}
const fileCounts = [...pageFiles.values()].reduce(
  (acc, status) => ({ ...acc, [status]: (acc[status] || 0) + 1 }),
  { 'fully-rebuilt': 0, 'partially-rebuilt': 0, 'not-rebuilt': 0 },
);

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  baselineRef: BASELINE,
  totalRoutes: rows.length,
  counts,
  distinctPageComponents: pageFiles.size,
  pageComponentCounts: fileCounts,
  routes: rows,
};

mkdirSync('reports/rebuild', { recursive: true });
writeFileSync('ROUTE_STRUCTURAL_REBUILD_MATRIX.json', `${JSON.stringify(report, null, 2)}\n`);

const badge = {
  'fully-rebuilt': '**REBUILT**',
  'partially-rebuilt': '_partial_',
  'not-rebuilt': 'LEGACY',
  redirect: 'redirect',
};
const md = [
  '# Route structural-rebuild matrix',
  '',
  `Generated by \`scripts/generate-route-ledger.mjs\` from the real router in \`src/App.jsx\`,`,
  `diffed against \`${BASELINE}\` on ${report.generatedAt.slice(0, 10)}.`,
  '',
  'A route counts as **rebuilt** only when its own page component JSX moved by more than 40 lines',
  '**and** it renders the new composition architecture. A stylesheet change alone never counts —',
  'that is the precise failure this ledger exists to expose.',
  '',
  `| Status | Count |`,
  `| --- | ---: |`,
  `| Fully rebuilt | **${counts['fully-rebuilt']}** |`,
  `| Partially rebuilt | **${counts['partially-rebuilt']}** |`,
  `| Not rebuilt | **${counts['not-rebuilt']}** |`,
  `| Redirect (no page) | ${counts.redirect} |`,
  `| **Total routes** | **${rows.length}** |`,
  '',
  `Distinct page components: **${pageFiles.size}** — ${fileCounts['fully-rebuilt']} rebuilt, ` +
    `${fileCounts['partially-rebuilt']} partial, ${fileCounts['not-rebuilt']} legacy. ` +
    'One component can serve several routes, so both counts are tracked.',
  '',
  '| Route | Component | Access | JSX +/- | Composition | Status |',
  '| --- | --- | --- | ---: | --- | --- |',
  ...rows.map(
    (r) =>
      `| \`${r.route}\` | ${r.component} | ${r.access} | +${r.linesAdded}/-${r.linesRemoved} | ${r.compositionMarkers.join(', ') || '—'} | ${badge[r.status]} |`,
  ),
  '',
];
writeFileSync('ROUTE_STRUCTURAL_REBUILD_MATRIX.md', `${md.join('\n')}\n`);

console.info(
  `Route ledger: ${rows.length} routes — ${counts['fully-rebuilt']} rebuilt, ` +
    `${counts['partially-rebuilt']} partial, ${counts['not-rebuilt']} legacy, ${counts.redirect} redirects. ` +
    `Page components: ${fileCounts['fully-rebuilt']}/${pageFiles.size} rebuilt.`,
);
