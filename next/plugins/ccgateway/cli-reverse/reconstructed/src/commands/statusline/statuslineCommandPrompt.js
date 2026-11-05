/**
 * commands/statusline/statuslineCommandPrompt.ts
 *
 * 2.1.316 新增：/statusline 命令提示
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-f7x9krby.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isLowPriorityActive, endLowPriority } from "../../services/lowPriority/lowPriorityMode.js";
import {
  lowPriorityOffMessage,
  enableLowPriorityMode,
  lowPriorityUnavailableMessage,
  lowPriorityOnMessage,
} from "../../services/lowPriorityMode.js";

//@ chunk-f7x9krby.js:13103-13281 placement
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
  let runResult = enableLowPriorityMode("command");
  if (runResult === "unavailable")
    return {
      type: "text",
      value: lowPriorityUnavailableMessage(),
    };
  return {
    type: "text",
    value: lowPriorityOnMessage(runResult),
  };
}
export { callStatuslineCommand };
