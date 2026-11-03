/**
 * utils/hooks/hookEventHelpers.ts
 *
 * 2.1.316 新增：钩子事件辅助
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (17)
 * attribution: sole-consumer 1, placement 16
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
import { isPlainObject as isPlainObject_5 } from "../isPlainObject.js";

//@ chunk-e6aww6q8.js:933012-933039 sole-consumer
var historyWriterRegistry = new HostScoped(() => new HistoryWriterStack());
//@ chunk-e6aww6q8.js:933039-933078 placement
function currentHistoryWriter() {
  return historyWriterRegistry.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:933078-933146 placement
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
//@ chunk-e6aww6q8.js:933146-933182 placement
/**
 * 注销某个历史写入器。
 */
function clearHistoryWriter(prevProgressState) {
  currentHistoryWriter().unregister(prevProgressState);
}
//@ chunk-e6aww6q8.js:933182-933213 placement
/**
 * 写入一条历史记录。
 */
function writeHistoryEntry(e) {
  currentHistoryWriter().write(e);
}
//@ chunk-e6aww6q8.js:934527-934583 placement = isToolReferenceWithName (1)
function getToolNameField(obj) {
  return "tool_name" in obj ? obj.tool_name : undefined;
}
//@ chunk-e6aww6q8.js:934583-934653 placement
function anyTrustedMemoryTool(e, n) {
  let memoryServerVerifier = createMemoryServerVerifier(() => n);
  return e.some((s) => isTrustedMemoryTool(s, memoryServerVerifier, "live"));
}
//@ chunk-e6aww6q8.js:934653-934716 placement
/**
 * anyTrustedMemoryTool 的安全包装：异常时返回 true。
 */
function anyTrustedMemoryToolSafe(e, tools) {
  try {
    return anyTrustedMemoryTool(e, tools);
  } catch (error) {
    logError(error);
    return true;
  }
}
//@ chunk-e6aww6q8.js:934716-934963 placement
function touchesAccountMemory(e, n) {
  let toolNameField = getToolNameField(e);
  if (toolNameField !== undefined) return anyTrustedMemoryTool([toolNameField], n);
  switch (e.hook_event_name) {
    case "PostToolBatch":
      return anyTrustedMemoryTool(
        e.tool_calls.map((toolCall) => toolCall.tool_name),
        n,
      );
    case "Elicitation":
    case "ElicitationResult":
      return e.mcp_server_name === MEMORY;
    default:
      return false;
  }
}
//@ chunk-e6aww6q8.js:934963-935027 placement
/**
 * 生成钩子输入摘要（工具名与是否触碰账户记忆）。
 */
function hookInputSummary(hookInput, n) {
  return {
    toolName: getToolNameField(hookInput),
    accountMemory: touchesAccountMemory(hookInput, n),
  };
}
//@ chunk-e6aww6q8.js:935027-935038 placement
/**
 * 钩子输出 metrics 保留的最大键数。
 */
var MAX_HOOK_METRIC_KEYS = 20;
//@ chunk-e6aww6q8.js:935038-935418 placement
/**
 * 存在 MCP 入站通道时限制 hook 输出，只保留允许的字段。
 */
function restrictHookOutputForMcpInbound(asyncHookOutput) {
  if (!hasMcpInboundDoor()) return asyncHookOutput;
  let { systemMessage, metrics, hookSpecificOutput } = asyncHookOutput;
  let { hookEventName, additionalContext } = isPlainObject_5(hookSpecificOutput) ? hookSpecificOutput : {};
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
//@ chunk-e6aww6q8.js:935418-935570 placement
function getHookMessageTexts(response) {
  let { systemMessage, hookSpecificOutput } = isPlainObject_5(response) ? response : {};
  let { additionalContext } = isPlainObject_5(hookSpecificOutput) ? hookSpecificOutput : {};
  return [systemMessage, additionalContext].filter((h) => typeof h === "string" && h !== "");
}
//@ chunk-e6aww6q8.js:935570-935636 placement
/**
 * 存在 MCP 入站通道时去掉 metrics 字段。
 */
function stripMetricsForMcpInbound(response) {
  if (!hasMcpInboundDoor()) return response;
  let { metrics, ...r } = response;
  return r;
}
//@ chunk-e6aww6q8.js:935636-935764 placement
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
//@ chunk-e6aww6q8.js:935764-935791 placement
var hookEventEmitStates = new HostScoped(() => new HookEventEmitState());
//@ chunk-e6aww6q8.js:935791-935830 placement
function getHookEventEmitState() {
  return hookEventEmitStates.of(getRootSession().host);
}
export {
  getHookEventEmitState,
  setHistoryWriter,
  clearHistoryWriter,
  anyTrustedMemoryToolSafe,
  restrictHookOutputForMcpInbound,
  MAX_HOOK_METRIC_KEYS,
  getToolNameField,
  hookInputSummary,
  writeHistoryEntry,
  stripMetricsForMcpInbound,
  getHookMessageTexts,
};
