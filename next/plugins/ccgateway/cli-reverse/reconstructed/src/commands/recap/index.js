/**
 * commands/recap/index.ts
 *
 * 2.1.316 新增：/recap 命令定义。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-rrmadgd5.js (1)
 * attribution: placement 1
 */
//@ chunk-rrmadgd5.js:191-377 placement
/**
 * /recap 命令对象（local）；描述：Generate a one-line session recap now；实现 chunk-z9nn3hxt.js 的 E。
 */
var recapCommandDefinition = {
  type: "local",
  name: "recap",
  description: "Generate a one-line session recap now",
  supportsNonInteractive: true,
  thinClientDispatch: "post-text",
  load: () => import("./call.lazy.js"),
};
var recapCommand = recapCommandDefinition;
export { recapCommand };
