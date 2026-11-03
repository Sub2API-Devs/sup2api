/**
 * utils/bash/specs/sleep.ts
 *
 * sleep 命令的内置 Fig spec。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/bash/specs/sleep.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
//@ chunk-e6aww6q8.js:3039519-3039711 fingerprint = sleep (1)
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
