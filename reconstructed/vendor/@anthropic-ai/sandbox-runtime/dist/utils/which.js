/**
 * @anthropic-ai/sandbox-runtime/dist/utils/which.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: esm-fingerprint 1
 */
import { spawnSync, spawnSync as spawnSync_2, spawnSync as spawnSync_3 } from "child_process";

/**
 * 同步查找 node 可执行文件路径。
 */
//@ chunk-fq0cr76a.js:718503-718725 esm-fingerprint
function ha(e) {
  if (typeof globalThis.Bun < "u") return globalThis.Bun.which(e);
  let n = spawnSync("which", [e], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 1000 });
  if (n.status === 0 && n.stdout) return n.stdout.trim();
  return null;
}

export { ha };
