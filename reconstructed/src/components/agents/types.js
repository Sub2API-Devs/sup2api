/**
 * components/agents/types.ts
 *
 * 子代理相关常量（AGENT_PATHS）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/agents/types.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
import { dirname, basename } from "path";

//@ chunk-e6aww6q8.js:2315571-2315664 fingerprint = AGENT_PATHS (1)
function AGENT_PATHS(e) {
  let n = dirname(e);
  if (basename(e) === "agents" && basename(n) === ".claude") return dirname(n);
  return e;
}
export { AGENT_PATHS };
