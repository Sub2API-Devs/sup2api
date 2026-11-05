/**
 * commands/loops/index.ts
 *
 * 2.1.316 新增：/loops 命令对象：管理循环任务
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: placement 1
 */
//@ chunk-5xgkngpb.js:2084140-2084263 placement
/**
 * /loops 命令对象（local-jsx）；描述：List, create, and delete loops；isEnabled: ()=>!1；实现 chunk-wtfk012h.js 的 kt。
 */
var loopsCommandDefinition = {
  type: "local-jsx",
  name: "loops",
  description: "List, create, and delete loops",
  immediate: true,
  isEnabled: () => false,
};
var loopsCommand = loopsCommandDefinition;
export { loopsCommand };
