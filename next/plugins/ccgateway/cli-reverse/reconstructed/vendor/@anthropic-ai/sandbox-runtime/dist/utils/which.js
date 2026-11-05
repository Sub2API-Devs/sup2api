/**
 * @anthropic-ai/sandbox-runtime/dist/utils/which.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { spawnSync } from "child_process";

//@ chunk-qg41pqt6.js:720185-720407 esm-fingerprint
/**
 * 同步查找 node 可执行文件路径。
 */
function whichSync(bin) {
  if (typeof globalThis.Bun !== "undefined") return globalThis.Bun.which(bin);
  let result = spawnSync("which", [bin], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 1000,
  });
  if (result.status === 0 && result.stdout) return result.stdout.trim();
  return null;
}
export { whichSync };
