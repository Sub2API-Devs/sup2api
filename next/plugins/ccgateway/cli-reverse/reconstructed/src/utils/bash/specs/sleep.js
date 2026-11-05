/**
 * utils/bash/specs/sleep.ts
 *
 * sleep 命令的内置 Fig spec。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/bash/specs/sleep.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 */
//@ chunk-5xgkngpb.js:3123610-3123802 fingerprint (2.1.88 match: sleep, 1)
/**
 * sleep 命令的补全 spec。
 */
var sleepSpec = {
  name: "sleep",
  description: "Delay for a specified amount of time",
  args: {
    name: "duration",
    description: "Duration to sleep (seconds or with suffix like 5s, 2m, 1h)",
    isOptional: false,
  },
};
var sleepSpec_2 = sleepSpec;
export { sleepSpec_2 };
