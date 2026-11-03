/**
 * commands/statusline/statuslineCommandPrompt.ts
 *
 * 2.1.316 新增：/statusline 命令提示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-khcb6nvd.js (1)
 * attribution: placement 1
 */
import { isLowPriorityActive, endLowPriority } from "../../services/lowPriority/lowPriorityMode.js";
import {
  lowPriorityOffMessage,
  enableLowPriorityMode,
  lowPriorityUnavailableMessage,
  lowPriorityOnMessage,
} from "../../services/lowPriorityMode.js";

//@ chunk-khcb6nvd.js:11955-12133 placement
/**
 * /low-priority 的 local call(args, context, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function callStatuslineCommand() {
  if (isLowPriorityActive()) {
    endLowPriority("user");
    return {
      type: "text",
      value: lowPriorityOffMessage(),
    };
  }
  let t = enableLowPriorityMode("command");
  if (t === "unavailable")
    return {
      type: "text",
      value: lowPriorityUnavailableMessage(),
    };
  return {
    type: "text",
    value: lowPriorityOnMessage(t),
  };
}
