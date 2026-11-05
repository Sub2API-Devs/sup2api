// Claude Code 2.1.318's own tools-used functions, run in Node from the recovered
// source (test/native-closure.mjs), for tools-used.test.mjs and the request
// command it runs in a child process. CC's runtime services are given the
// values of a process without configuration: every feature flag its coded
// default (tengu_silly_shore and the hand-back provenance on, the MCP standard
// keys and REPL mode off), no claude.ai connectors (a custom base URL), no
// telemetry. The session's set (wf) is a set made here with CC's own class
// (H), so each check starts from an empty one. chunk-sva49n74.js is the text
// the 2.1.318 anchors write (they export its compact summary reader).
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { nativeClosure } from '../../native-closure.mjs';
import { pinned } from '../../artifacts.mjs';
const { restored, profile } = pinned('2.1.318');
const require = createRequire(import.meta.url);

// patchedText is a module as the anchors leave it when they only surround it
// (no edit): the imports in front and the code after.
export function patchedText(file) {
  const text = fs.readFileSync(new URL(file, restored), 'utf8');
  const around = { head: '', tail: '' };
  require('../../../patches/2.1.318.cjs')({
    files: new Map([[file, text]]), core: profile.core, entryStub: () => '',
    edit() {}, once: value => value,
    surround(name, { imports = '', code = '' }) { if (name === file) { around.head += imports; around.tail += code; } },
  });
  return around.head + text + around.tail;
}

const noop = () => {};
export function toolsUsedNatives() {
  let set;
  const overrides = {
    'chunk-exfmq47h.js:an': (name, value) => value, 'chunk-exfmq47h.js:v': (name, value) => value,
    'chunk-evj8g37g.js:LFt': name => name, 'chunk-evj8g37g.js:wk': () => false, 'chunk-evj8g37g.js:NOr': name => [name],
    'chunk-wvdswywk.js:cMn': () => false, 'chunk-wvdswywk.js:dMi': noop, 'chunk-gcy2kcsb.js:ae': () => false,
    'chunk-sahntffv.js:PZ': () => true, 'chunk-nkv493nm.js:l': noop,
    'chunk-47b8txen.js:c': noop, 'chunk-47b8txen.js:g': noop, 'chunk-47b8txen.js:m': noop, 'chunk-my2r02mp.js:a': noop,
    'chunk-5ythzcas.js:wf': () => set,
  };
  const { get } = nativeClosure(fileURLToPath(restored), overrides, { 'chunk-sva49n74.js': patchedText('chunk-sva49n74.js') });
  const Ledger = get('chunk-5ythzcas.js', 'H');
  // The profile's bindings, by logical name, as the generated native module exports them.
  const logical = Object.fromEntries(Object.entries(profile.natives.toolsUsed).map(([name, spec]) => {
    const at = spec.lastIndexOf(':');
    return [name, get(spec.slice(0, at), spec.slice(at + 1))];
  }));
  return {
    get, logical, Ledger, Nf: get('chunk-vn3g7zt8.js', 'Nf'),
    // fresh starts the session's set over (a new process).
    fresh() { set = new Ledger(); return set; },
    set: () => set,
  };
}
