/**
 * commands/rewind/index.ts
 *
 * /rewind（别名 checkpoint、undo）命令对象
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/rewind/index.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
//@ chunk-e6aww6q8.js:2030566-2030830 fingerprint = rewind (0.748)
/**
 * /rewind 命令对象（local）；描述：Restore the code and/or conversation to a previous point；别名 ["checkpoint","undo"]；实现 chunk-ye0hzrsv.js 的 o。
 */
var rewindCommandDefinition = {
  description: "Restore the code and/or conversation to a previous point",
  name: "rewind",
  aliases: ["checkpoint", "undo"],
  argumentHint: "",
  type: "local",
  supportsNonInteractive: false,
  thinClientDispatch: "control-request",
  load: () => import("./chunk-ye0hzrsv.js"),
};
var rewindCommand = rewindCommandDefinition;
export { rewindCommand };
