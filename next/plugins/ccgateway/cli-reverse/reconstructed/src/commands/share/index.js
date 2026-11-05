/**
 * commands/share/index.ts
 *
 * 2.1.316 新增：/share 命令注册
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ktjdp0n0.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { callLegacyFeedbackDialog } from "../feedback/feedback.js";

//@ chunk-ktjdp0n0.js:15292-15364 placement
/**
 * /bug 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function runShareCommand(onDone, context, args, invokedName) {
  return callLegacyFeedbackDialog(onDone, context, args, invokedName === "share" ? "/share" : "/bug");
}
export { runShareCommand };
