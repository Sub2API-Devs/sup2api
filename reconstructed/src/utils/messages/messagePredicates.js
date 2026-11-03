/**
 * utils/messages/messagePredicates.ts
 *
 * 消息判定小函数（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qz53w8v8.js (7)
 * attribution: placement 7
 */

//@ chunk-qz53w8v8.js:500-567 placement
function Jvt(e) {
  return e === "now" || e === "next" || e === "later" ? e : void 0;
}
//@ chunk-qz53w8v8.js:567-627 placement = _temp (1)
function isNonEmptyImageAttachment(c) {
  return c.type === "image" && c.content.length > 0;
}
//@ chunk-qz53w8v8.js:627-726 placement
function Qvt(e) {
  return e.mode === "poll-event" || e.mode === "task-notification" || e.skipAttachments === !0;
}
/**
 * 判断是否为真实的助手消息：类型为 assistant、不是交接产生的，且 uuid 不是版本 5（合成）格式。
 */
//@ chunk-qz53w8v8.js:726-870 placement
function isRealAssistantMessage(e) {
  return (
    e.type === "assistant" &&
    e.handedOff !== !0 &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(e.uuid)
  );
}
//@ chunk-qz53w8v8.js:870-948 placement
function jKt(e) {
  return e.findLast((t) => t.type === "user" || t.type === "assistant");
}
//@ chunk-qz53w8v8.js:948-1544 placement = countToolCallsSince (1)
function isToolResultForToolUse(e) {
  let t = (n) =>
      n.type === "user" &&
      Array.isArray(n.message.content) &&
      n.message.content.length > 0 &&
      n.message.content.every((i) => i.type === "tool_result"),
    filtered = e.filter((n) => n.type === "user" || n.type === "assistant"),
    r = filtered.length - 1,
    a = new Set();
  while (r >= 0 && t(filtered[r])) {
    let n = filtered[r];
    if (n.type === "user" && Array.isArray(n.message.content)) {
      for (let i of n.message.content) if (i.type === "tool_result") a.add(i.tool_use_id);
    }
    r--;
  }
  for (; r >= 0 && filtered[r].type === "assistant"; r--) {
    let n = filtered[r];
    if (
      n.type === "assistant" &&
      Array.isArray(n.message.content) &&
      n.message.content.some((block) => block.type === "tool_use" && !a.has(block.id))
    )
      return !0;
  }
  return !1;
}
/**
 * 找最后一条包含 tool_use 的 assistant 消息，找不到时取最后一条消息。
 */
//@ chunk-qz53w8v8.js:1544-1699 placement = getLastToolUseName (1)
function findLastToolUseAssistantMessage(message) {
  return (
    message.findLast(
      (t) =>
        t.type === "assistant" &&
        Array.isArray(t.message.content) &&
        t.message.content.some((o) => o.type === "tool_use"),
    ) ?? message.at(-1)
  );
}

export {
  isToolResultForToolUse,
  findLastToolUseAssistantMessage,
  jKt,
  Jvt,
  Qvt,
  isNonEmptyImageAttachment,
  isRealAssistantMessage,
};
