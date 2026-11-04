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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-ag5x7vhf.js:120727-120746 placement
var weakMap; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ag5x7vhf.js:120727", () => {
  weakMap = new WeakMap();
});
//@ chunk-ag5x7vhf.js:120746-120896 placement
function getGroupableToolNames(tools) {
  let names = weakMap.get(tools);
  if (!names) {
    names = new Set(
      tools
        .filter((tool) => hasMcpRenderOverride(tool.uiTableKey ?? tool.name, "renderGroupedToolUse"))
        .map((tool) => tool.name),
    );
    weakMap.set(tools, names);
  }
  return names;
}
//@ chunk-ag5x7vhf.js:120896-121759 placement (2.1.88 match: countToolCallsSince, 1)
function countToolCallsSince_2(messages, tools, skip = false, activeAgents) {
  if (skip)
    return {
      messages,
    };
  let groupableToolNames = getGroupableToolNames(tools);
  let byMessageTool = new Map();
  for (let message of messages) {
    if (message.type !== "assistant") continue;
    let toolUse = message.message.content[0];
    if (toolUse?.type !== "tool_use" || !groupableToolNames.has(toolUse.name)) continue;
    if (toolUse.name === AGENT && hasSubagentOverride(toolUse.input, activeAgents)) continue;
    let groupKey = `${message.message.id}:${toolUse.name}`;
    let group = byMessageTool.get(groupKey);
    if (group === undefined) {
      group = [];
      byMessageTool.set(groupKey, group);
    }
    group.push(message);
  }
  let runs = new Map();
  let toolUseIds = new Set();
  for (let group of byMessageTool.values()) {
    if (group.length < 2) continue;
    for (let message of group) {
      runs.set(message, group);
      toolUseIds.add(message.message.content[0].id);
    }
  }
  if (runs.size === 0)
    return {
      messages,
    };
  let resultsById = new Map();
  for (let message of messages) {
    if (message.type !== "user") continue;
    let toolResult = message.message.content[0];
    if (toolResult.type === "tool_result" && toolUseIds.has(toolResult.tool_use_id))
      resultsById.set(toolResult.tool_use_id, message);
  }
  let out = [];
  for (let message of messages) {
    let group = runs.get(message);
    if (group !== undefined) {
      if (message === group[0]) out.push(applyGrouping(group, resultsById));
      continue;
    }
    if (message.type === "user") {
      let toolResult = message.message.content[0];
      if (toolResult.type === "tool_result" && toolUseIds.has(toolResult.tool_use_id)) continue;
    }
    out.push(message);
  }
  return {
    messages: out,
  };
}
//@ chunk-ag5x7vhf.js:121759-121778 layout
var weakMap_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ag5x7vhf.js:121759", () => {
  weakMap_2 = new WeakMap();
});
//@ chunk-ag5x7vhf.js:121778-122149 fingerprint (2.1.88 match: applyGrouping, 0.96)
/**
 * 把同一 assistant 消息里的同类并行工具调用合并为 grouped_tool_use 以便一起渲染。
 */
function applyGrouping(messages, resultsById) {
  let first = messages[0];
  let results = [];
  for (let msg of messages) {
    let group = resultsById.get(msg.message.content[0].id);
    if (group) results.push(group);
  }
  let resultMsg = weakMap_2.get(first);
  if (
    resultMsg !== undefined &&
    arraysEqual(resultMsg.messages, messages) &&
    arraysEqual(resultMsg.results, results)
  )
    return resultMsg;
  let groupedMessage = {
    type: "grouped_tool_use",
    toolName: first.message.content[0].name,
    messages,
    results,
    displayMessage: first,
    uuid: `grouped-${first.uuid}`,
    timestamp: first.timestamp,
    messageId: first.message.id,
  };
  weakMap_2.set(first, groupedMessage);
  return groupedMessage;
}
export { countToolCallsSince_2 };
