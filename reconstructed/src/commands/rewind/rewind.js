/**
 * commands/rewind/rewind.ts
 *
 * /rewind：打开消息选择器
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/rewind/rewind.ts
 * pieces: chunk-ye0hzrsv.js (1)
 * attribution: placement 1
 */

/**
 * /rewind 的 local call(args, context, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-ye0hzrsv.js:191-283 placement
async function o(args, context) {
  return (context.onQueryEvent?.({ type: "open_message_selector" }), { type: "skip" });
}
