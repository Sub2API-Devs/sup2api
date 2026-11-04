/**
 * commands/share/index.ts
 *
 * 2.1.316 新增：/share 命令注册
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-myrezy36.js (1)
 * attribution: placement 1
 */
import { callLegacyFeedbackDialog } from "../feedback/feedback.js";

//@ chunk-myrezy36.js:13976-14048 placement
/**
 * /bug 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function runShareCommand(onDone, context, args, invokedName) {
  return callLegacyFeedbackDialog(onDone, context, args, invokedName === "share" ? "/share" : "/bug");
}
export { runShareCommand };
