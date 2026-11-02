// The tools build injects on a first turn are the official 2.1.316 ones
// (2026-11-02: "工具注入不代表我们需要实现 只是带上定义而已"). The recording is
// the compiled v43 CLI's own output (test/injection-tools-probe.cjs, run
// against the release in an offline Worker image container); this test holds
// it to the official capture of the same version, so the recording cannot
// drift from what official Claude Code sends, and to the current patch, so a
// new patch is probed again before it is released.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { pinned } from '../../artifacts.mjs';

const require = createRequire(import.meta.url);
const { compareInjectedTools, sessionDependent } = require('../../injection-tools.cjs');
const { profile, fixture } = pinned('2.1.316');
const official = JSON.parse(fs.readFileSync(fixture('official-request'), 'utf8'));
const recorded = JSON.parse(fs.readFileSync(fixture('injected-tools'), 'utf8'));

test('the recording is of the current patch, and the official runtime version', () => {
  assert.equal(recorded.patch, profile.extension, 'probe the new patch again (test/injection-tools-probe.cjs) and record it');
  assert.equal(recorded.runtime_version, profile.runtimeVersion);
  assert.ok(profile.capabilities.includes('build_injection_tools_v2'));
});

test('every first-turn tool is injected as official 2.1.316 sends it, in its order, with its placeholder', () => {
  const firstTurn = official.tools.filter(tool => tool.defer_loading !== true).map(tool => tool.name);
  // The default injection is every tool the official first turn sends whole.
  assert.deepEqual(firstTurn, ['Agent', 'Bash', 'Edit', 'ListAgents', 'Read', 'ReportFindings', 'ScheduleWakeup', 'Skill', 'ToolSearch', 'Workflow', 'Write']);
  for (const name of ['first-turn', 'first-turn-and-deferred']) {
    const item = recorded.cases.find(entry => entry.name === name);
    assert.ok(item, name);
    assert.deepEqual(compareInjectedTools(official.tools, item.tools, item.chosen), [], name);
  }
  // The one allowed difference is the launch-dependent Bash timeout, and the
  // recording really has it (a capture from a non-print session would not).
  const bash = JSON.stringify(recorded.cases[0].tools.find(tool => tool.name === 'Bash'));
  for (const allowed of sessionDependent) assert.ok(bash.includes(allowed.injected), allowed.injected);
});

test('without ToolSearch nothing is deferred: WebSearch and NotebookEdit are sent whole', () => {
  const item = recorded.cases.find(entry => entry.name === 'without-toolsearch');
  assert.deepEqual(item.tools.map(tool => tool.name), [...item.chosen].sort());
  assert.ok(!item.tools.some(tool => tool.defer_loading));
  // The rest are the official definitions all the same.
  const shared = item.chosen.filter(name => official.tools.some(tool => tool.name === name));
  assert.deepEqual(compareInjectedTools(official.tools.filter(tool => shared.includes(tool.name)), item.tools.filter(tool => shared.includes(tool.name)), shared), []);
});

test('the comparison fails on any other difference', () => {
  const tools = structuredClone(recorded.cases[0].tools);
  tools.find(tool => tool.name === 'Write').description += ' ';
  assert.match(compareInjectedTools(official.tools, tools, recorded.cases[0].chosen).join('\n'), /Write: differs/);
  assert.match(compareInjectedTools(official.tools, recorded.cases[0].tools.filter(tool => tool.name !== 'DeferredToolPlaceholder'), recorded.cases[0].chosen).join('\n'), /order:/);
});
