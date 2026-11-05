/**
 * utils/bash/specs/nohup.ts
 *
 * nohup 命令的内置 Fig spec（参数为被包装命令）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/bash/specs/nohup.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 */
//@ chunk-5xgkngpb.js:3121512-3121664 fingerprint (2.1.88 match: nohup, 1)
/**
 * nohup 命令的补全 spec。
 */
var nohupSpec = {
  name: "nohup",
  description: "Run a command immune to hangups",
  args: {
    name: "command",
    description: "Command to run with nohup",
    isCommand: true,
  },
};
var nohupSpec_2 = nohupSpec;
export { nohupSpec_2 };
