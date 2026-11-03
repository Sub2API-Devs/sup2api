/**
 * utils/bash/specs/time.ts
 *
 * time 命令的内置 Fig spec（参数为被包装命令）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/bash/specs/time.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */

//@ chunk-e6aww6q8.js:3040109-3040233 fingerprint = time (1)
var timeSpec = {
    name: "time",
    description: "Time a command",
    args: { name: "command", description: "Command to time", isCommand: !0 },
  },
  zbn = timeSpec;

export { zbn };
