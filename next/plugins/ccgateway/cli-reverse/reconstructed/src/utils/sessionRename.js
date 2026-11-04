/**
 * utils/sessionRename.ts
 *
 * 2.1.316 新增：会话重命名
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5h69ret3.js (1)
 * attribution: placement 1
 */
import { performRename } from "../commands/rename/rename.js";

//@ chunk-5h69ret3.js:11876-11959 placement
/**
 * /rename 的 local call(args, context, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function runRenameCommand(args, context) {
  let { message } = await performRename(args, context, false);
  return {
    type: "text",
    value: message,
  };
}
export { runRenameCommand };
