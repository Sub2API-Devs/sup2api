/**
 * entrypoints/selfHostedRunner/runId.ts
 *
 * self-hosted runner 运行 id 的 DNS 标签格式校验（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h7hgs1mf.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-h7hgs1mf.js:4957-5002 placement
var SPAWN_REASON_PATTERN = /^[a-z](?:[a-z0-9_]{0,61}[a-z0-9])?$/;
//@ chunk-h7hgs1mf.js:5002-5052 placement
function normalizeSpawnReason(spawnReason) {
  if (!spawnReason || !SPAWN_REASON_PATTERN.test(spawnReason)) return;
  return spawnReason;
}
export { normalizeSpawnReason };
