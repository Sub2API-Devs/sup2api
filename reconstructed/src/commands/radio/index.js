/**
 * commands/radio/index.ts
 *
 * 2.1.316 新增：/radio 命令对象
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: placement 1
 */

/**
 * /radio 命令对象（local）；描述：Listen to Claude FM lo-fi radio；实现 chunk-03rvwpge.js 的 r。
 */
//@ chunk-e6aww6q8.js:2034929-2035084 placement
var radioCommandDefinition = {
    type: "local",
    name: "radio",
    description: "Listen to Claude FM lo-fi radio",
    supportsNonInteractive: !1,
    load: () => import("./chunk-03rvwpge.js"),
  },
  radioCommand = radioCommandDefinition;

export { radioCommand };
