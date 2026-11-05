/**
 * tools/AgentTool/agentEffort.ts
 *
 * 2.1.316 新增：子代理推理力度设置
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (9)
 * attribution: placement 9
 */
import { AsyncLocalStorage } from "async_hooks";
import { getDefaultSubagentModel } from "../../utils/model/agent.js";
import { env } from "../../utils/env.js";
import { getSubagentEffortOverride, getEffortEnvOverride } from "../../utils/effort.js";
import { getFeatureValue_SESSION_PINNED } from "../../services/analytics/growthbook.js";
import { isPlainObject as isPlainObject_6 } from "../../utils/isPlainObject.js";
import { isDiskless } from "../../bootstrap/state.js";
import { matchesToolName } from "../../Tool.js";
import { SENDMESSAGE } from "../SendMessageTool/constants.js";
import { ENTER_PLAN_MODE_TOOL_NAME } from "../EnterPlanModeTool/constants.js";
import { EXITPLANMODE_2 } from "../ExitPlanModeTool/constants.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1428487-1428514 placement
/**
 * 相对 effort 的取值（lower、higher）。
 */
var RELATIVE_EFFORT_VALUES = ["lower", "higher"];
//@ chunk-5xgkngpb.js:1428514-1428721 placement
function isRelativeEffortDisabled() {
  if (
    getDefaultSubagentModel() !== "inherit" ||
    env.CLAUDE_CODE_SUBAGENT_MODEL_FORCE ||
    getSubagentEffortOverride() !== undefined ||
    getEffortEnvOverride() !== undefined
  )
    return false;
  let CLAUDE_CODE_SNAPPY_PELICAN = env.CLAUDE_CODE_SNAPPY_PELICAN;
  if (CLAUDE_CODE_SNAPPY_PELICAN !== undefined) return CLAUDE_CODE_SNAPPY_PELICAN;
  return getFeatureValue_SESSION_PINNED("tengu_snappy_pelican", false);
}
//@ chunk-5xgkngpb.js:1428721-1428886 placement
function dropRelativeEffortInput(input) {
  if (
    isRelativeEffortDisabled() ||
    !isPlainObject_6(input) ||
    (input.effort !== "lower" && input.effort !== "higher")
  )
    return null;
  let remainingInput = {
    ...input,
  };
  delete remainingInput.effort;
  return {
    input: remainingInput,
    shapeClass: "drop_relative_effort",
  };
}
//@ chunk-5xgkngpb.js:1428886-1428952 placement
/**
 * 无盘会话里且工具表未显式包含该工具。
 */
function toolMissingInDiskless(toolName, tools) {
  return isDiskless() && (tools === undefined || !tools.some((tool) => matchesToolName(tool, toolName)));
}
//@ chunk-5xgkngpb.js:1428952-1428982 placement
/**
 * 无盘会话里 SendMessage 不可用。
 */
function isSendMessageUnavailable() {
  return toolMissingInDiskless(SENDMESSAGE);
}
//@ chunk-5xgkngpb.js:1428982-1429026 placement
/**
 * 无盘会话里进入/退出计划模式的工具不可用。
 */
function isPlanModeToolUnavailable(tools) {
  return (
    toolMissingInDiskless(ENTER_PLAN_MODE_TOOL_NAME, tools) || toolMissingInDiskless(EXITPLANMODE_2, tools)
  );
}
//@ chunk-5xgkngpb.js:1429129-1429145 placement
/**
 * 保存当前远程会话 id 的 AsyncLocalStorage。
 */
var remoteSessionContext; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:1429129", () => {
  remoteSessionContext = new AsyncLocalStorage();
});
//@ chunk-5xgkngpb.js:1429145-1429199 placement
/**
 * 取当前远程会话 id。
 */
function currentRemoteSessionId() {
  return remoteSessionContext.getStore()?.remoteSessionId;
}
//@ chunk-5xgkngpb.js:1429199-1429255 placement
/**
 * 在指定远程会话 id 下执行函数。
 */
function runWithRemoteSessionId(remoteSessionId, fn) {
  return remoteSessionContext.run(
    {
      remoteSessionId,
    },
    fn,
  );
}
export {
  currentRemoteSessionId,
  isPlanModeToolUnavailable,
  isRelativeEffortDisabled,
  isSendMessageUnavailable,
  runWithRemoteSessionId,
  dropRelativeEffortInput,
  toolMissingInDiskless,
  RELATIVE_EFFORT_VALUES,
};
