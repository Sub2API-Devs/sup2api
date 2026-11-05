/**
 * commands/rewind/rewind.ts
 *
 * /rewind：打开消息选择器
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/rewind/rewind.ts
 * pieces: chunk-qtcsgpgh.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-qtcsgpgh.js:191-283 placement
/**
 * /rewind 的 local call(args, context, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function rewindCommandCall(args, context) {
  context.onQueryEvent?.({
    type: "open_message_selector",
  });
  return {
    type: "skip",
  };
}
export { rewindCommandCall };
