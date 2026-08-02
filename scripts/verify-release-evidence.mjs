import { existsSync } from 'node:fs';
import { directoryManifest, fileHash, releaseIdentity, safeJson, sameHash, sha256, verifySourceManifest } from './lib/release-evidence.mjs';
const file='reports/release/evidence-bundle.json'; if(!existsSync(file)){console.error('Release evidence bundle is missing.');process.exit(1)}
const bundle=safeJson(file); const failures=[]; const current=releaseIdentity();
if(!bundle||bundle.schemaVersion!==3) failures.push('unsupported or invalid evidence schema');
if(!bundle?.commitSha||bundle.commitSha==='unknown') failures.push('commit SHA is missing');
if(bundle?.attestationRequired&&(!bundle.runId||!bundle.repository||!bundle.workflowRef)) failures.push('GitHub run identity is incomplete');
if(current.commitSha&&bundle?.commitSha!==current.commitSha) failures.push('bundle commit SHA differs from current CI commit');
if(current.runId&&bundle?.runId!==current.runId) failures.push('bundle run ID differs from current CI run');
const source=verifySourceManifest(bundle?.sourceManifest?.path||'RELEASE_MANIFEST.sha256');
if(source.status!=='passed') failures.push(...source.failures.map(x=>`source manifest: ${x}`));
if(!sameHash(source.sha256,bundle?.sourceManifest?.sha256)||!sameHash(source.entriesSha256,bundle?.sourceManifest?.entriesSha256)) failures.push('source manifest evidence does not match current verified source');
const dist=directoryManifest('dist', { exclude: ['BUILD_PROVENANCE.json'] }); if(bundle?.dist?.sha256!==dist.sha256) failures.push('dist hash does not match current dist');
if(bundle?.dist?.buildReportedSha256&&bundle.dist.buildReportedSha256!==dist.sha256) failures.push('build provenance dist hash mismatch');
if(bundle?.dist?.buildCommitSha&&bundle.commitSha&&bundle.dist.buildCommitSha!==bundle.commitSha) failures.push('build provenance commit does not match evidence commit');
for(const report of bundle?.reports||[]){
  if(report.exists&&(!existsSync(report.path)||!sameHash(fileHash(report.path),report.sha256))) failures.push(`report changed or missing: ${report.path}`);
  if(report.exists&&report.commitSha&&bundle.commitSha&&report.commitSha!==bundle.commitSha) failures.push(`report commit mismatch: ${report.path}`);
  if(report.exists&&report.runId&&bundle.runId&&String(report.runId)!==String(bundle.runId)) failures.push(`report run mismatch: ${report.path}`);
}
const recomputed=sha256(JSON.stringify({identity:{repository:bundle?.repository||null,workflowRef:bundle?.workflowRef||null,runId:bundle?.runId||null,runAttempt:bundle?.runAttempt||null,commitSha:bundle?.commitSha||null,ref:bundle?.ref||null},source:source.entriesSha256,dist:dist.sha256,reports:(bundle?.reports||[]).map(({path,sha256})=>({path,sha256}))}));
if(recomputed!==bundle?.evidenceDigest) failures.push('evidence digest mismatch');
if(failures.length){console.error(`Release evidence verification failed:\n- ${failures.join('\n- ')}`);process.exit(1)}
console.log('Release evidence, source manifest, dist and report hashes are internally consistent for the current run. Deployment must also verify GitHub artifact attestations.');
