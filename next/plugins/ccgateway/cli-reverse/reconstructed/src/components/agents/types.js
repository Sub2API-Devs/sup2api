/**
 * components/agents/types.ts
 *
 * 子代理相关常量（AGENT_PATHS）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/agents/types.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { dirname, basename } from "path";

//@ chunk-5xgkngpb.js:2370962-2371055 fingerprint (2.1.88 match: AGENT_PATHS, 1)
function AGENT_PATHS(absPath) {
  let parentDir = dirname(absPath);
  if (basename(absPath) === "agents" && basename(parentDir) === ".claude") return dirname(parentDir);
  return absPath;
}
export { AGENT_PATHS };
