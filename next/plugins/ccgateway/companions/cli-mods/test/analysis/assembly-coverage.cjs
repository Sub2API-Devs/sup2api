#!/usr/bin/env node
// A closed-list acceptance gate, not an AST/native execution coverage meter.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { definitionHash } = require('../replay-helpers.cjs');
function requiredAssertions(test, observed) {
  const c = test.contract;
  if (c.response_status === undefined) return [];
  const ids = ['response.status', 'send.upstream-count'];
  if (c.cli_exit_code !== undefined) ids.push('cli.exit-code');
  if (c.upstream_requests === 0) return [...ids, 'input.refused-before-model'];
  ids.push('send.method-and-endpoint', 'send.worker-auth-only', 'content.system', 'content.messages');
  if (c.tools === 'exact') ids.push('content.tools-exact');
  if (test.mode === 'direct' || c.whole_body === 'exact') ids.push('send.direct-whole-body', 'send.direct-raw-bytes');
  ids.push(...Object.keys(c.parameters || {}).map(k => 'parameter.' + k), ...(c.assertions || []));
  if (c.content === 'billing_insert') ids.push('billing.native-version', 'billing.independent-fingerprint', 'billing.native-entrypoint', 'billing.unique-block');
  if (test.mode !== 'direct' && observed.observed_parameter_values) {
    const before = Object.fromEntries(Object.entries(test.body || {}).filter(([k]) => !['system', 'messages', 'tools'].includes(k)));
    for (const k of new Set([...Object.keys(before), ...Object.keys(observed.observed_parameter_values)]))
      if (!Object.hasOwn(c.parameters || {}, k) && !isDeepStrictEqual(before[k], observed.observed_parameter_values[k])) ids.push('parameter.closed-world.' + k);
  }
  return ids;
}
function evaluate(manifest, report) {
  const issues = [];
  if (report && (report.status !== 'pass' || report.fatal)) issues.push('Runtime report is not successful or contains a fatal error');
  const planned = new Map(), actual = new Map();
  for (const c of manifest.cases || []) {
    if (!c.id || planned.has(c.id)) issues.push(`Invalid/duplicate planned ID: ${c.id}`);
    if (!c.group || !c.contract || !c.source_symbols?.length) issues.push(`Incomplete contract/source attribution: ${c.id}`);
    planned.set(c.id, c);
  }
  for (const c of report?.cases || []) {
    if (!c.id || actual.has(c.id)) issues.push(`Invalid/duplicate result ID: ${c.id}`);
    if (!planned.has(c.id)) issues.push(`Unplanned result: ${c.id}`);
    actual.set(c.id, c);
  }
  if (!planned.size) issues.push('Empty test plan');
  const cliSHA = report?.identity?.cli_sha256 || report?.cli_sha256;
  // The pinned artifacts: a legacy manifest's fixed SHAs, else the caller's
  // pins the run recorded (assembly-replay artifact_identity, merged
  // artifact_identity). An unpinned run cannot be accepted as evidence for a
  // specific CLI.
  const pinnedCLI = manifest.expected_cli_sha256 ?? report?.artifact_identity?.cli?.expected_sha256 ?? report?.artifact_identity?.expected_cli_sha256 ?? undefined;
  const pinnedWorker = manifest.expected_worker_sha256 ?? report?.artifact_identity?.worker?.expected_sha256 ?? undefined;
  if (report && !pinnedCLI) issues.push('CLI SHA unpinned: set PROBE_EXPECT_CLI_SHA for the run');
  if (!report) issues.push('Runtime report missing');
  const groups = {};
  const cases = [...planned.values()].map(c => {
    const observed = actual.get(c.id);
    if (observed && observed.definition_sha256 !== definitionHash(c)) issues.push(`Case definition SHA mismatch: ${c.id}`);
    if (observed && !isDeepStrictEqual(observed.contract, c.contract)) issues.push(`Case contract mismatch: ${c.id}`);
    if (observed && (!Array.isArray(observed.checks) || !observed.checks.length)) issues.push(`Case lacks executed assertions: ${c.id}`);
    if (observed?.status === 'pass' && observed.checks?.some(check => check.status !== 'pass')) issues.push(`Case pass contradicts assertion results: ${c.id}`);
    if (observed?.status === 'pass' && c.unknown_reason) issues.push(`Unresolved planned oracle reported as pass: ${c.id}`);
    if (observed?.status === 'pass') {
      if (c.contract.upstream_requests > 0 && !observed.observed_parameter_values) issues.push(`Missing outgoing parameter evidence: ${c.id}`);
      for (const checkID of requiredAssertions(c, observed))
        if (!observed.checks?.some(check => check.id === checkID)) issues.push(`Missing required assertion ${checkID}: ${c.id}`);
    }
    if (observed && pinnedCLI && (observed.actual_identity?.cli_sha256 || cliSHA) !== pinnedCLI)
      issues.push(`CLI identity missing or differs from planned SHA: ${c.id}`);
    if (observed && pinnedWorker && observed.actual_identity?.worker_sha256 !== pinnedWorker)
      issues.push(`Worker identity missing or differs from planned SHA: ${c.id}`);
    let status = observed?.status || 'not-run';
    if (!['pass', 'fail', 'unknown', 'not-run'].includes(status)) {
      issues.push(`Invalid status for ${c.id}: ${status}`); status = 'unknown';
    }
    if (observed && observed.group !== c.group) issues.push(`Group mismatch: ${c.id}`);
    const group = groups[c.group] ||= { planned: 0, pass: 0, fail: 0, unknown: 0, 'not-run': 0 };
    group.planned++; group[status]++;
    return { id: c.id, group: c.group, status, source_symbols: c.source_symbols };
  });
  const accepted = !issues.length && cases.length > 0 && cases.every(c => c.status === 'pass');
  return {
    schema_version: 1, acceptance: accepted ? 'pass' : 'blocked', issues, groups, cases,
    native_branch_execution_coverage: 'unmeasured',
    claim: 'Result completeness and behavioral acceptance of this finite manifest only. Does not prove exhaustive configuration, source branch, or whole-CLI coverage.',
  };
}
module.exports = { evaluate };
if (require.main === module) {
  const root = path.resolve(__dirname, '../../../../../../..');
  const version = process.env.CC_VERSION || '2.1.304';
  const manifestFile = path.resolve(process.argv[2] || path.join(__dirname, `../fixtures/assembly-cases-${version}.json`));
  // Default report location: write the assembly-replay report there (PROBE_REPORT=...)
  // or pass it as argv[3]. The 2026-10-20 report that used to sit there was deleted
  // in the 2026-10-27 artifacts cleanup; a missing report yields "Runtime report missing".
  const reportFile = path.resolve(process.argv[3] || path.join(root, `artifacts/claude-${version}/assembly-repair-report.json`));
  const output = path.resolve(process.argv[4] || path.join(root, `artifacts/claude-${version}/assembly-audit/repair-coverage.json`));
  const manifestBytes = fs.readFileSync(manifestFile);
  const reportBytes = fs.existsSync(reportFile) ? fs.readFileSync(reportFile) : null;
  const sha = b => crypto.createHash('sha256').update(b).digest('hex');
  const report = reportBytes ? JSON.parse(reportBytes) : null;
  const result = evaluate(JSON.parse(manifestBytes), report);
  if (report && report.manifest_sha256 !== sha(manifestBytes)) {
    result.issues.push('Runtime manifest SHA missing or differs from current plan');
    result.acceptance = 'blocked';
  }
  result.inputs = { manifest: { path: manifestFile, sha256: sha(manifestBytes) }, report: { path: reportFile, sha256: reportBytes ? sha(reportBytes) : null } };
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ output, acceptance: result.acceptance, issues: result.issues, groups: result.groups }));
  if (!result.acceptance || result.acceptance !== 'pass') process.exitCode = 1;
}
