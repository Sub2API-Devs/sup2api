/**
 * utils/bash/specs/time.ts
 *
 * time 命令的内置 Fig spec（参数为被包装命令）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/bash/specs/time.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-5xgkngpb.js:3124200-3124324 fingerprint (2.1.88 match: time, 1)
/**
 * time 命令的补全 spec。
 */
var timeSpec = {
  name: "time",
  description: "Time a command",
  args: {
    name: "command",
    description: "Command to time",
    isCommand: true,
  },
};
var timeSpec_2 = timeSpec;
export { timeSpec_2 };
