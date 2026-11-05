/**
 * commands/rewind/index.ts
 *
 * /rewind（别名 checkpoint、undo）命令对象
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/rewind/index.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 */
//@ chunk-5xgkngpb.js:2086383-2086647 fingerprint (2.1.88 match: rewind, 0.748)
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
  load: () => import("./call.lazy.js"),
};
var rewindCommandAlias = rewindCommandDefinition;
export { rewindCommandAlias };
