/**
 * commands/color/colorCall.ts
 *
 * /color 命令调用辅助（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5bfa2jwp.js (1)
 * attribution: placement 1
 */
import { performSetColor } from "./setColor.js";

//@ chunk-5bfa2jwp.js:12996-13059 placement
/**
 * /color 的 local call(args, context, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function setColorCall(args, context) {
  return {
    type: "text",
    value: await performSetColor(args, context),
  };
}
export { setColorCall };
