/**
 * utils/hooks/hookEventHelpers.ts
 *
 * 2.1.316 新增：钩子事件辅助
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (17)
 * attribution: sole-consumer 1, placement 16
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { HostScoped } from "../hostScoped.js";
import { HistoryWriterStack } from "../../history.js";
import { getRootSession } from "../../bootstrap/state.js";
import {
  createMemoryServerVerifier,
  isTrustedMemoryTool,
} from "../../services/mcp/memoryServerVerification.js";
import { logError } from "../log.js";
import { MEMORY } from "../../services/mcp/firstPartyServerIds.js";
import { hasMcpInboundDoor } from "../../services/mcp/mcpInboundDoor.js";
import { isPlainObject as isPlainObject_6 } from "../isPlainObject.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:944207-944234 sole-consumer
var historyWriterRegistry; // deferred: uses HistoryWriterStack (../../history.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:944207", () => {
  historyWriterRegistry = new HostScoped(() => new HistoryWriterStack());
});
//@ chunk-5xgkngpb.js:944234-944273 placement
function currentHistoryWriter() {
  return historyWriterRegistry.of(getRootSession().host);
}
//@ chunk-5xgkngpb.js:944273-944341 placement
/**
 * 设置历史写入器（null 表示重置）。
 */
function setHistoryWriter(prevProgressState) {
  if (prevProgressState === null) {
    currentHistoryWriter().reset();
    return;
  }
  currentHistoryWriter().register(prevProgressState);
}
//@ chunk-5xgkngpb.js:944341-944377 placement
/**
 * 注销某个历史写入器。
 */
function clearHistoryWriter(prevProgressState) {
  currentHistoryWriter().unregister(prevProgressState);
}
//@ chunk-5xgkngpb.js:944377-944408 placement
/**
 * 写入一条历史记录。
 */
function writeHistoryEntry(entry) {
  currentHistoryWriter().write(entry);
}
//@ chunk-5xgkngpb.js:945722-945778 placement (2.1.88 match: isToolReferenceWithName, 1)
function getToolNameField(obj) {
  return "tool_name" in obj ? obj.tool_name : undefined;
}
//@ chunk-5xgkngpb.js:945778-945848 placement
function anyTrustedMemoryTool(names, tools) {
  let memoryServerVerifier = createMemoryServerVerifier(() => tools);
  return names.some((name) => isTrustedMemoryTool(name, memoryServerVerifier, "live"));
}
//@ chunk-5xgkngpb.js:945848-945911 placement
/**
 * anyTrustedMemoryTool 的安全包装：异常时返回 true。
 */
function anyTrustedMemoryToolSafe(toolNames, tools) {
  try {
    return anyTrustedMemoryTool(toolNames, tools);
  } catch (error) {
    logError(error);
    return true;
  }
}
//@ chunk-5xgkngpb.js:945911-946158 placement
function touchesAccountMemory(input, tools) {
  let toolNameField = getToolNameField(input);
  if (toolNameField !== undefined) return anyTrustedMemoryTool([toolNameField], tools);
  switch (input.hook_event_name) {
    case "PostToolBatch":
      return anyTrustedMemoryTool(
        input.tool_calls.map((toolCall) => toolCall.tool_name),
        tools,
      );
    case "Elicitation":
    case "ElicitationResult":
      return input.mcp_server_name === MEMORY;
    default:
      return false;
  }
}
//@ chunk-5xgkngpb.js:946158-946222 placement
/**
 * 生成钩子输入摘要（工具名与是否触碰账户记忆）。
 */
function hookInputSummary(hookInput, tools) {
  return {
    toolName: getToolNameField(hookInput),
    accountMemory: touchesAccountMemory(hookInput, tools),
  };
}
//@ chunk-5xgkngpb.js:946222-946233 placement
/**
 * 钩子输出 metrics 保留的最大键数。
 */
var MAX_HOOK_METRIC_KEYS = 20;
//@ chunk-5xgkngpb.js:946233-946612 placement
/**
 * 存在 MCP 入站通道时限制 hook 输出，只保留允许的字段。
 */
function restrictHookOutputForMcpInbound(asyncHookOutput) {
  if (!hasMcpInboundDoor()) return asyncHookOutput;
  let { systemMessage, metrics, hookSpecificOutput } = asyncHookOutput;
  let { hookEventName, additionalContext } = isPlainObject_6(hookSpecificOutput) ? hookSpecificOutput : {};
  return {
    ...(systemMessage !== undefined && {
      systemMessage,
    }),
    ...(metrics !== undefined && {
      metrics: Object.fromEntries(Object.entries(metrics).slice(0, MAX_HOOK_METRIC_KEYS)),
    }),
    ...(hookSpecificOutput !== undefined && {
      hookSpecificOutput: {
        ...(typeof hookEventName === "string" && {
          hookEventName,
        }),
        ...(typeof additionalContext === "string" && {
          additionalContext,
        }),
      },
    }),
  };
}
//@ chunk-5xgkngpb.js:946612-946764 placement
function getHookMessageTexts(response) {
  let { systemMessage, hookSpecificOutput } = isPlainObject_6(response) ? response : {};
  let { additionalContext } = isPlainObject_6(hookSpecificOutput) ? hookSpecificOutput : {};
  return [systemMessage, additionalContext].filter((text) => typeof text === "string" && text !== "");
}
//@ chunk-5xgkngpb.js:946764-946829 placement
/**
 * 存在 MCP 入站通道时去掉 metrics 字段。
 */
function stripMetricsForMcpInbound(response) {
  if (!hasMcpInboundDoor()) return response;
  let { metrics, ...rest } = response;
  return rest;
}
//@ chunk-5xgkngpb.js:946829-946957 placement
/**
 * SDK 钩子事件开关：是否发送全部钩子事件、是否发送 UserPromptSubmit 的开始/结束事件。
 */
class HookEventEmitState {
  allHookEventsEnabled = false;
  userPromptSubmitStartAndEndEnabled = false;
  setAllHookEventsEnabled(allHookEventsEnabled) {
    this.allHookEventsEnabled = allHookEventsEnabled;
  }
}
//@ chunk-5xgkngpb.js:946957-946984 placement
var hookEventEmitStates; // deferred: uses HookEventEmitState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:946957", () => {
  hookEventEmitStates = new HostScoped(() => new HookEventEmitState());
});
//@ chunk-5xgkngpb.js:946984-947023 placement
function getHookEventEmitState() {
  return hookEventEmitStates.of(getRootSession().host);
}
export {
  getHookEventEmitState,
  stripMetricsForMcpInbound,
  restrictHookOutputForMcpInbound,
  getHookMessageTexts,
  anyTrustedMemoryToolSafe,
  MAX_HOOK_METRIC_KEYS,
  getToolNameField,
  hookInputSummary,
  writeHistoryEntry,
  setHistoryWriter,
  clearHistoryWriter,
};
