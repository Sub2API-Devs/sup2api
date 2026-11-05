/**
 * commands/radio/index.ts
 *
 * 2.1.316 新增：/radio 命令对象
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: placement 1
 */
//@ chunk-5xgkngpb.js:2090746-2090901 placement
/**
 * /radio 命令对象（local）；描述：Listen to Claude FM lo-fi radio；实现 chunk-03rvwpge.js 的 r。
 */
var radioCommandDefinition = {
  type: "local",
  name: "radio",
  description: "Listen to Claude FM lo-fi radio",
  supportsNonInteractive: false,
  load: () => import("./call.lazy.js"),
};
var radioCommand = radioCommandDefinition;
export { radioCommand };
