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
import { isPlainObject as isPlainObject_4 } from "../isPlainObject.js";

//@ chunk-e6aww6q8.js:933012-933039 sole-consumer
var historyWriterRegistry = new HostScoped(() => new HistoryWriterStack());
//@ chunk-e6aww6q8.js:933039-933078 placement
function the() {
  return historyWriterRegistry.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:933078-933146 placement
function gFo(e) {
  if (e === null) {
    the().reset();
    return;
  }
  the().register(e);
}
//@ chunk-e6aww6q8.js:933146-933182 placement
function hFo(e) {
  the().unregister(e);
}
//@ chunk-e6aww6q8.js:933182-933213 placement
function F1e(e) {
  the().write(e);
}
//@ chunk-e6aww6q8.js:934527-934583 placement = isToolReferenceWithName (1)
function getToolNameField(obj) {
  return "tool_name" in obj ? obj.tool_name : void 0;
}
//@ chunk-e6aww6q8.js:934583-934653 placement
function j1e(e, n) {
  let r = createMemoryServerVerifier(() => n);
  return e.some((s) => isTrustedMemoryTool(s, r, "live"));
}
//@ chunk-e6aww6q8.js:934653-934716 placement
function KBr(e, n) {
  try {
    return j1e(e, n);
  } catch (error) {
    return (logError(error), !0);
  }
}
//@ chunk-e6aww6q8.js:934716-934963 placement
function touchesAccountMemory(e, n) {
  let r = getToolNameField(e);
  if (r !== void 0) return j1e([r], n);
  switch (e.hook_event_name) {
    case "PostToolBatch":
      return j1e(
        e.tool_calls.map((tool_call) => tool_call.tool_name),
        n,
      );
    case "Elicitation":
    case "ElicitationResult":
      return e.mcp_server_name === MEMORY;
    default:
      return !1;
  }
}
//@ chunk-e6aww6q8.js:934963-935027 placement
function W1e(e, n) {
  return { toolName: getToolNameField(e), accountMemory: touchesAccountMemory(e, n) };
}
//@ chunk-e6aww6q8.js:935027-935038 placement
var z1e = 20;
/**
 * 存在 MCP 入站通道时限制 hook 输出，只保留允许的字段。
 */
//@ chunk-e6aww6q8.js:935038-935418 placement
function restrictHookOutputForMcpInbound(e) {
  if (!hasMcpInboundDoor()) return e;
  let { systemMessage: systemMessage, metrics: metrics, hookSpecificOutput: hookSpecificOutput } = e,
    { hookEventName: hookEventName, additionalContext: additionalContext } = isPlainObject_4(
      hookSpecificOutput,
    )
      ? hookSpecificOutput
      : {};
  return {
    ...(systemMessage !== void 0 && { systemMessage: systemMessage }),
    ...(metrics !== void 0 && { metrics: Object.fromEntries(Object.entries(metrics).slice(0, z1e)) }),
    ...(hookSpecificOutput !== void 0 && {
      hookSpecificOutput: {
        ...(typeof hookEventName === "string" && { hookEventName: hookEventName }),
        ...(typeof additionalContext === "string" && { additionalContext: additionalContext }),
      },
    }),
  };
}
//@ chunk-e6aww6q8.js:935418-935570 placement
function getHookMessageTexts(e) {
  let { systemMessage: systemMessage, hookSpecificOutput: hookSpecificOutput } = isPlainObject_4(e) ? e : {},
    { additionalContext: additionalContext } = isPlainObject_4(hookSpecificOutput) ? hookSpecificOutput : {};
  return [systemMessage, additionalContext].filter((h) => typeof h === "string" && h !== "");
}
//@ chunk-e6aww6q8.js:935570-935636 placement
function hUt(e) {
  if (!hasMcpInboundDoor()) return e;
  let { metrics: metrics, ...r } = e;
  return r;
}
/**
 * SDK 钩子事件开关：是否发送全部钩子事件、是否发送 UserPromptSubmit 的开始/结束事件。
 */
//@ chunk-e6aww6q8.js:935636-935764 placement
class HookEventEmitState {
  allHookEventsEnabled = !1;
  userPromptSubmitStartAndEndEnabled = !1;
  setAllHookEventsEnabled(e) {
    this.allHookEventsEnabled = e;
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
  gFo,
  hFo,
  KBr,
  restrictHookOutputForMcpInbound,
  z1e,
  getToolNameField,
  W1e,
  F1e,
  hUt,
  getHookMessageTexts,
};
