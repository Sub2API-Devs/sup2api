// Merge immutable batch evidence only when the executed definition still
// matches the final manifest. Changed contracts require a new execution.
// The CLI pin is the final manifest's legacy expected_cli_sha256, else
// PROBE_EXPECT_CLI_SHA; without either every batch must have run one and the
// same CLI, and the merged report says sha_unpinned.
const fs = require('node:fs');
const { sha, definitionHash } = require('./replay-helpers.cjs');
const [finalPath, outputPath, ...pairs] = process.argv.slice(2);
if (!finalPath || !outputPath || !pairs.length || pairs.length % 2) throw Error('Usage: assembly-merge.cjs final-manifest output batch-manifest batch-report [...]');
const final = JSON.parse(fs.readFileSync(finalPath));
const pinnedCLI = final.expected_cli_sha256 ?? process.env.PROBE_EXPECT_CLI_SHA;
const report = { suite: final.suite, scope: final.scope, cc_version: final.cc_version, manifest_sha256: sha(fs.readFileSync(finalPath)),
  branch_coverage_claim: 'Named contract executions only; AST branches remain unmeasured.', runs: [], cases: [] };
const evidence = new Map();
for (let i = 0; i < pairs.length; i += 2) {
  const [manifestPath, reportPath] = pairs.slice(i, i + 2);
  const manifest = JSON.parse(fs.readFileSync(manifestPath)), batch = JSON.parse(fs.readFileSync(reportPath));
  if (batch.manifest_sha256 !== sha(fs.readFileSync(manifestPath))) throw Error('Batch manifest hash mismatch: ' + reportPath);
  const definitions = new Map(manifest.cases.map(test => [test.id, test]));
  report.runs.push({ manifest_sha256: batch.manifest_sha256, report_sha256: sha(fs.readFileSync(reportPath)),
    report_path: reportPath, cases: batch.cases.length, upstream_requests: batch.upstream_requests });
  for (const item of batch.cases) {
    const definition = definitions.get(item.id);
    if (!definition) throw Error('Result outside batch manifest: ' + item.id);
    const hash = definitionHash(definition);
    if (item.definition_sha256 && item.definition_sha256 !== hash) throw Error('Executed definition hash mismatch: ' + item.id);
    evidence.set(item.id + ':' + hash, { ...item, definition_sha256: hash, executed_manifest_sha256: batch.manifest_sha256 });
  }
}
for (const test of final.cases) {
  const item = evidence.get(test.id + ':' + definitionHash(test));
  if (!item) throw Error('No matching execution for final case definition: ' + test.id);
  const actualCLI = item.actual_identity?.cli_sha256;
  if (!actualCLI || (pinnedCLI ?? report.cases[0]?.actual_identity?.cli_sha256 ?? actualCLI) !== actualCLI) throw Error('CLI identity mismatch: ' + test.id);
  report.cases.push({ ...item, fixture_source: test.fixture_source, source_symbols: test.source_symbols });
}
report.artifact_identity = { cli_sha256: report.cases[0]?.actual_identity?.cli_sha256 ?? null, expected_cli_sha256: pinnedCLI ?? null };
report.sha_unpinned = pinnedCLI === undefined;
report.summary = Object.fromEntries(['pass', 'fail', 'unknown'].map(status => [status, report.cases.filter(item => item.status === status).length]));
report.groups = Object.fromEntries([...new Set(report.cases.map(item => item.group))].map(group => [group,
  Object.fromEntries(['pass', 'fail', 'unknown'].map(status => [status, report.cases.filter(item => item.group === group && item.status === status).length]))]));
report.total = report.cases.length;
report.upstream_requests = report.cases.reduce((sum, item) => sum + (item.upstream_requests ?? 0), 0);
report.total_executed_upstream_requests = report.runs.reduce((sum, item) => sum + (item.upstream_requests ?? 0), 0);
report.status = report.summary.fail ? 'fail' : report.summary.unknown ? 'unknown' : 'pass';
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ total: report.total, summary: report.summary, upstream_requests: report.upstream_requests, total_executed_upstream_requests: report.total_executed_upstream_requests }));
if (report.status !== 'pass') process.exitCode = 1;
