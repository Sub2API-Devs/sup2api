/**
 * tools/AgentTool/agentEffort.ts
 *
 * 2.1.316 新增：子代理推理力度设置
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (9)
 * attribution: placement 9
 */
import { AsyncLocalStorage } from "async_hooks";
import { getDefaultSubagentModel } from "../../utils/model/agent.js";
import { env } from "../../utils/env.js";
import { getSubagentEffortOverride, getEffortEnvOverride } from "../../utils/effort.js";
import { getFeatureValue_SESSION_PINNED } from "../../services/analytics/growthbook.js";
import { isPlainObject as isPlainObject_5 } from "../../utils/isPlainObject.js";
import { isDiskless } from "../../bootstrap/state.js";
import { toolMatchesName } from "../../Tool.js";
import { SENDMESSAGE } from "../SendMessageTool/constants.js";
import { ENTER_PLAN_MODE_TOOL_NAME } from "../EnterPlanModeTool/constants.js";
import { EXITPLANMODE_2 } from "../ExitPlanModeTool/constants.js";

//@ chunk-e6aww6q8.js:1428917-1428944 placement
/**
 * 相对 effort 的取值（lower、higher）。
 */
var RELATIVE_EFFORT_VALUES = ["lower", "higher"];
//@ chunk-e6aww6q8.js:1428944-1429151 placement
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
//@ chunk-e6aww6q8.js:1429151-1429316 placement
function dropRelativeEffortInput(e) {
  if (isRelativeEffortDisabled() || !isPlainObject_5(e) || (e.effort !== "lower" && e.effort !== "higher"))
    return null;
  let n = {
    ...e,
  };
  delete n.effort;
  return {
    input: n,
    shapeClass: "drop_relative_effort",
  };
}
//@ chunk-e6aww6q8.js:1429316-1429382 placement
/**
 * 无盘会话里且工具表未显式包含该工具。
 */
function toolMissingInDiskless(e, n) {
  return isDiskless() && (n === undefined || !n.some((r) => toolMatchesName(r, e)));
}
//@ chunk-e6aww6q8.js:1429382-1429412 placement
/**
 * 无盘会话里 SendMessage 不可用。
 */
function isSendMessageUnavailable() {
  return toolMissingInDiskless(SENDMESSAGE);
}
//@ chunk-e6aww6q8.js:1429412-1429456 placement
/**
 * 无盘会话里进入/退出计划模式的工具不可用。
 */
function isPlanModeToolUnavailable(tools) {
  return (
    toolMissingInDiskless(ENTER_PLAN_MODE_TOOL_NAME, tools) || toolMissingInDiskless(EXITPLANMODE_2, tools)
  );
}
//@ chunk-e6aww6q8.js:1429559-1429575 placement
/**
 * 保存当前远程会话 id 的 AsyncLocalStorage。
 */
var remoteSessionContext = new AsyncLocalStorage();
//@ chunk-e6aww6q8.js:1429575-1429629 placement
/**
 * 取当前远程会话 id。
 */
function currentRemoteSessionId() {
  return remoteSessionContext.getStore()?.remoteSessionId;
}
//@ chunk-e6aww6q8.js:1429629-1429685 placement
/**
 * 在指定远程会话 id 下执行函数。
 */
function runWithRemoteSessionId(remoteSessionId, n) {
  return remoteSessionContext.run(
    {
      remoteSessionId,
    },
    n,
  );
}
export {
  isSendMessageUnavailable,
  RELATIVE_EFFORT_VALUES,
  isRelativeEffortDisabled,
  dropRelativeEffortInput,
  runWithRemoteSessionId,
  isPlanModeToolUnavailable,
  currentRemoteSessionId,
  toolMissingInDiskless,
};
