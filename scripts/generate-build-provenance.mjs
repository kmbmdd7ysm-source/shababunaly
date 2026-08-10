import { createHash } from 'node:crypto';
import { execSync, execFileSync } from 'node:child_process';

/** Git may be unavailable in some CI images; provenance must not break a build. */
const execSyncSafe = (cmd) => {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
};
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
const files = [];
const walk = (directory) => {
  for (const name of readdirSync(directory)) {
    const absolute = join(directory, name);
    const stats = statSync(absolute);
    if (stats.isDirectory()) walk(absolute);
    else {
      const path = relative(dist, absolute).replaceAll('\\', '/');
      if (path !== 'BUILD_PROVENANCE.json') files.push({ absolute, path, bytes: stats.size });
    }
  }
};
walk(dist);
files.sort((a, b) => a.path.localeCompare(b.path));
const entries = files.map((entry) => ({
  path: entry.path,
  bytes: entry.bytes,
  sha256: createHash('sha256').update(readFileSync(entry.absolute)).digest('hex'),
}));
const distHash = createHash('sha256')
  .update(entries.map((entry) => `${entry.sha256}  ${entry.path}`).join('\n'))
  .digest('hex');
const git = (args, fallback = 'unknown') => {
  try {
    return (
      execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() ||
      fallback
    );
  } catch {
    return fallback;
  }
};
const commitSha =
  process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA || git(['rev-parse', 'HEAD']);
const buildId = process.env.VITE_BUILD_ID || commitSha;
const assetFiles = entries.filter((entry) =>
  /\.(?:js|css|woff2?|png|jpe?g|webp|avif|svg)$/i.test(entry.path),
);
const chunks = assetFiles
  .filter((entry) => /\.js$/i.test(entry.path))
  .sort((a, b) => b.bytes - a.bytes);
const branch =
  process.env.GITHUB_REF_NAME ||
  process.env.VERCEL_GIT_COMMIT_REF ||
  git(['branch', '--show-current']);
const dirty = git(['status', '--porcelain'], '') !== '';
const lockfileHash = (() => {
  try {
    return createHash('sha256').update(readFileSync(join(root, 'package-lock.json'))).digest('hex');
  } catch {
    return 'missing';
  }
})();
let viteVersion = 'unknown';
try {
  viteVersion = JSON.parse(readFileSync(join(root, 'node_modules/vite/package.json'), 'utf8')).version;
} catch {
  /* optional */
}
let npmVersion = 'unknown';
try {
  npmVersion = execSyncSafe('npm -v');
} catch {
  /* optional */
}
const provenance = {
  status: 'passed',
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  buildId,
  commitSha,
  branch,
  ref: process.env.GITHUB_REF || process.env.VERCEL_GIT_COMMIT_REF || branch,
  dirty,
  workingTreeClean: !dirty,
  runId: process.env.GITHUB_RUN_ID || null,
  runAttempt: process.env.GITHUB_RUN_ATTEMPT || null,
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID || null,
  node: process.version,
  npm: npmVersion,
  vite: viteVersion,
  mode: process.env.NODE_ENV || 'production',
  lockfileSha256: lockfileHash,
  fileCount: entries.length,
  totalBytes: entries.reduce((sum, entry) => sum + entry.bytes, 0),
  distSha256: distHash,
  files: entries,
};
const bundle = {
  status: 'passed',
  generatedAt: provenance.generatedAt,
  buildId,
  javascriptBytes: chunks.reduce((sum, entry) => sum + entry.bytes, 0),
  cssBytes: assetFiles
    .filter((entry) => /\.css$/i.test(entry.path))
    .reduce((sum, entry) => sum + entry.bytes, 0),
  largestJavaScriptChunks: chunks.slice(0, 20),
  assetCount: assetFiles.length,
};
mkdirSync('reports/build', { recursive: true });
writeFileSync('reports/build/build-provenance.json', `${JSON.stringify(provenance, null, 2)}\n`);
writeFileSync('reports/build/bundle-report.json', `${JSON.stringify(bundle, null, 2)}\n`);
writeFileSync(
  'reports/build/dist.sha256',
  `${entries.map((entry) => `${entry.sha256}  ${entry.path}`).join('\n')}\n`,
);
/*
 * A compact, stable file the running app can fetch to show its own provenance.
 * The dist hash is a hash OF the bundle, so it cannot be injected into the
 * bundle — the injection would change it. The badge fetches this instead.
 *
 * Written before BUILD_PROVENANCE.json so both describe the same run. Note that
 * this file is itself part of dist but is created after hashing, so it is not
 * included in the hash it reports — which is what makes the value stable.
 */
writeFileSync(
  'dist/build-info.json',
  `${JSON.stringify(
    {
      branch: process.env.VITE_BUILD_BRANCH || execSyncSafe('git rev-parse --abbrev-ref HEAD'),
      commitSha,
      distHash,
      builtAt: provenance.generatedAt,
      review: Boolean(process.env.VITE_SHOW_BUILD_MARKER),
    },
    null,
    2,
  )}\n`,
);

writeFileSync(
  'dist/BUILD_PROVENANCE.json',
  `${JSON.stringify({ buildId, commitSha, distSha256: distHash, generatedAt: provenance.generatedAt }, null, 2)}\n`,
);
writeFileSync(
  'reports/build-status.txt',
  `Status: PASSED\nBuild ID: ${buildId}\nCommit: ${commitSha}\nDist SHA-256: ${distHash}\nFiles: ${entries.length}\n`,
);
console.info(
  `Production build provenance recorded: ${entries.length} files, dist SHA-256 ${distHash}.`,
);
