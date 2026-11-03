/**
 * utils/groupToolUses.ts
 *
 * 把同一消息中的同类并行工具调用合并为 grouped_tool_use 以便渲染
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/groupToolUses.ts
 * pieces: chunk-ag5x7vhf.js (5)
 * attribution: placement 3, layout 1, fingerprint 1
 */
import { hasMcpRenderOverride } from "../components/Message.js";
import { AGENT } from "../tools/AgentTool/constants.js";
import { hasSubagentOverride } from "../tools/AgentTool/agentDisplay.js";
import { arraysEqual } from "./collections.js";

//@ chunk-ag5x7vhf.js:120727-120746 placement
var weakMap = new WeakMap();
//@ chunk-ag5x7vhf.js:120746-120896 placement
function getGroupableToolNames(m) {
  let h = weakMap.get(m);
  if (!h) {
    h = new Set(
      m
        .filter((x) => hasMcpRenderOverride(x.uiTableKey ?? x.name, "renderGroupedToolUse"))
        .map((x) => x.name),
    );
    weakMap.set(m, h);
  }
  return h;
}
//@ chunk-ag5x7vhf.js:120896-121759 placement = countToolCallsSince (1)
function countToolCallsSince_2(m, tools, x = false, activeAgents) {
  if (x)
    return {
      messages: m,
    };
  let groupableToolNames = getGroupableToolNames(tools);
  let _ = new Map();
  for (let V of m) {
    if (V.type !== "assistant") continue;
    let W = V.message.content[0];
    if (W?.type !== "tool_use" || !groupableToolNames.has(W.name)) continue;
    if (W.name === AGENT && hasSubagentOverride(W.input, activeAgents)) continue;
    let z = `${V.message.id}:${W.name}`;
    let K = _.get(z);
    if (K === undefined) {
      K = [];
      _.set(z, K);
    }
    K.push(V);
  }
  let I = new Map();
  let D = new Set();
  for (let V of _.values()) {
    if (V.length < 2) continue;
    for (let W of V) {
      I.set(W, V);
      D.add(W.message.content[0].id);
    }
  }
  if (I.size === 0)
    return {
      messages: m,
    };
  let A = new Map();
  for (let V of m) {
    if (V.type !== "user") continue;
    let W = V.message.content[0];
    if (W.type === "tool_result" && D.has(W.tool_use_id)) A.set(W.tool_use_id, V);
  }
  let L = [];
  for (let message of m) {
    let W = I.get(message);
    if (W !== undefined) {
      if (message === W[0]) L.push(applyGrouping(W, A));
      continue;
    }
    if (message.type === "user") {
      let z = message.message.content[0];
      if (z.type === "tool_result" && D.has(z.tool_use_id)) continue;
    }
    L.push(message);
  }
  return {
    messages: L,
  };
}
//@ chunk-ag5x7vhf.js:121759-121778 layout
var weakMap_2 = new WeakMap();
//@ chunk-ag5x7vhf.js:121778-122149 fingerprint = applyGrouping (0.96)
/**
 * 把同一 assistant 消息里的同类并行工具调用合并为 grouped_tool_use 以便一起渲染。
 */
function applyGrouping(m, h) {
  let x = m[0];
  let T = [];
  for (let msg of m) {
    let group = h.get(msg.message.content[0].id);
    if (group) T.push(group);
  }
  let resultMsg = weakMap_2.get(x);
  if (resultMsg !== undefined && arraysEqual(resultMsg.messages, m) && arraysEqual(resultMsg.results, T))
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
  weakMap_2.set(x, groupedMessage);
  return groupedMessage;
}
export { countToolCallsSince_2 };
