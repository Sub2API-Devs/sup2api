/**
 * utils/bash/specs/timeout.ts
 *
 * timeout 命令的内置 Fig spec（时长+被包装命令）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/bash/specs/timeout.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
//@ chunk-e6aww6q8.js:3040233-3040478 fingerprint (2.1.88 match: timeout, 1)
/**
 * timeout 命令的补全 spec。
 */
var timeoutSpec = {
  name: "timeout",
  description: "Run a command with a time limit",
  args: [
    {
      name: "duration",
      description: "Duration to wait before timing out (e.g., 10, 5s, 2m)",
      isOptional: false,
    },
    {
      name: "command",
      description: "Command to run",
      isCommand: true,
    },
  ],
};
var timeoutSpec_2 = timeoutSpec;
export { timeoutSpec_2 };
