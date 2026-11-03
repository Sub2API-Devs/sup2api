/**
 * commands/color/colorCall.ts
 *
 * /color 命令调用辅助（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-evjaj4jh.js (1)
 * attribution: placement 1
 */
import { performSetColor } from "./setColor.js";

/**
 * /color 的 local call(args, context, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-evjaj4jh.js:11848-11911 placement
async function a(args, context) {
  return { type: "text", value: await performSetColor(args, context) };
}
