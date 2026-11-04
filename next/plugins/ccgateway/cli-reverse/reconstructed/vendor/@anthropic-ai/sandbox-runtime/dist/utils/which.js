/**
 * @anthropic-ai/sandbox-runtime/dist/utils/which.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: esm-fingerprint 1
 */
import { spawnSync } from "child_process";

//@ chunk-fq0cr76a.js:718503-718725 esm-fingerprint
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
