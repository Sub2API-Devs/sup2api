import { test } from 'node:test';
import assert from 'node:assert/strict';
import gate from './analysis/assembly-coverage.cjs';
import helpers from './replay-helpers.cjs';
const manifest = { expected_cli_sha256: 'fixture-sha', cases: [
  { id: 'a', group: 'TOOLS', contract: { tools: 'equal' }, source_symbols: ['FH'] },
  { id: 'b', group: 'PARAM', contract: { parameters: { top_p: 'equal' } }, source_symbols: ['uXn'] },
] };
const good = () => ({ status: 'pass', identity: { cli_sha256: 'fixture-sha' }, cases: manifest.cases.map(c => ({
  id: c.id, group: c.group, status: 'pass', contract: structuredClone(c.contract),
  definition_sha256: helpers.definitionHash(c), checks: [{ id: 'content.assertion', status: 'pass' }],
})) });
test('finite manifest acceptance requires every result and preserves unmeasured branch coverage', () => {
  const r = gate.evaluate(manifest, good());
  assert.equal(r.acceptance, 'pass');
  assert.equal(r.native_branch_execution_coverage, 'unmeasured');
});
test('missing, unknown and failed cases cannot disappear behind successful HTTP outcomes', () => {
  for (const status of ['fail', 'unknown', 'not-run']) {
    const r = good(); r.cases[1].status = status; r.cases[1].http_status = 200;
    assert.equal(gate.evaluate(manifest, r).acceptance, 'blocked');
  }
  const r = good(); r.cases.pop();
  assert.equal(gate.evaluate(manifest, r).groups.PARAM['not-run'], 1);
  assert.equal(gate.evaluate(manifest, r).acceptance, 'blocked');
});
test('wrong artifact, duplicate result and unplanned result block acceptance', () => {
  const wrong = good(); wrong.identity.cli_sha256 = 'old-cli';
  const duplicate = good(); duplicate.cases.push(duplicate.cases[0]);
  const unplanned = good(); unplanned.cases.push({ id: 'c', group: 'PARAM', status: 'pass' });
  for (const report of [wrong, duplicate, unplanned]) assert.equal(gate.evaluate(manifest, report).acceptance, 'blocked');
});
test('false green summaries cannot hide failed assertions, missing checks, fatal errors or stale definitions', () => {
  const failed = good(); failed.cases[0].checks[0].status = 'fail';
  const empty = good(); empty.cases[0].checks = [];
  const fatal = good(); fatal.fatal = 'setup failed';
  const stale = good(); stale.cases[0].definition_sha256 = 'old-definition';
  const changed = good(); changed.cases[0].contract = { tools: 'ignore' };
  for (const report of [failed, empty, fatal, stale, changed]) assert.equal(gate.evaluate(manifest, report).acceptance, 'blocked');
  const unknown = structuredClone(manifest); unknown.cases[0].unknown_reason = 'Model facts unverified';
  const contradictory = good(); contradictory.cases[0].definition_sha256 = helpers.definitionHash(unknown.cases[0]);
  assert.equal(gate.evaluate(unknown, contradictory).acceptance, 'blocked');
});
test('HTTP success and request count cannot replace semantic contract assertions', () => {
  const plan = { expected_cli_sha256: 'fixture-sha', cases: [{
    id: 'wire', group: 'TOOLS', body: { model: 'expected' }, source_symbols: ['FH'],
    contract: { response_status: 200, upstream_requests: 1, content: 'preserve', tools: 'exact', parameters: { model: 'expected' } },
  }] };
  const result = { status: 'pass', identity: { cli_sha256: 'fixture-sha' }, cases: [{
    ...structuredClone(plan.cases[0]), status: 'pass', definition_sha256: helpers.definitionHash(plan.cases[0]),
    observed_parameter_values: { model: 'expected' },
    checks: [{ id: 'response.status', status: 'pass' }, { id: 'send.upstream-count', status: 'pass' }],
  }] };
  const evaluated = gate.evaluate(plan, result);
  assert.equal(evaluated.acceptance, 'blocked');
  assert(evaluated.issues.some(s => s.includes('content.tools-exact')));
  assert(evaluated.issues.some(s => s.includes('parameter.model')));
});
