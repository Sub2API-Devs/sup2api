/**
 * utils/groupToolUses.ts
 *
 * 把同一消息中的同类并行工具调用合并为 grouped_tool_use 以便渲染
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/groupToolUses.ts
 * pieces: chunk-ag5x7vhf.js (2)
 * attribution: affinity 1, fingerprint 1
 */
import { arraysEqual } from "./collections.js";

//@ chunk-ag5x7vhf.js:121759-121778 affinity
var weakMap_2 = new WeakMap();
/**
 * 把同一 assistant 消息里的同类并行工具调用合并为 grouped_tool_use 以便一起渲染。
 */
//@ chunk-ag5x7vhf.js:121778-122149 fingerprint = applyGrouping (0.96)
function applyGrouping(m, h) {
  let x = m[0],
    T = [];
  for (let msg of m) {
    let group = h.get(msg.message.content[0].id);
    if (group) T.push(group);
  }
  let resultMsg = weakMap_2.get(x);
  if (resultMsg !== void 0 && arraysEqual(resultMsg.messages, m) && arraysEqual(resultMsg.results, T))
    return resultMsg;
  let groupedMessage = {
    type: "grouped_tool_use",
    toolName: x.message.content[0].name,
    messages: m,
    results: T,
    displayMessage: x,
    uuid: `grouped-${x.uuid}`,
    timestamp: x.timestamp,
    messageId: x.message.id,
  };
  return (weakMap_2.set(x, groupedMessage), groupedMessage);
}

export { applyGrouping };
