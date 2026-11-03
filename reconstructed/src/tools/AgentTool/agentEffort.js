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
import {
  AsyncLocalStorage,
  AsyncLocalStorage as AsyncLocalStorage_2,
  AsyncLocalStorage as AsyncLocalStorage_3,
  AsyncLocalStorage as AsyncLocalStorage_4,
  AsyncLocalStorage as AsyncLocalStorage_5,
  AsyncLocalStorage as AsyncLocalStorage_6,
  AsyncLocalStorage as AsyncLocalStorage_7,
  AsyncLocalStorage as AsyncLocalStorage_8,
} from "async_hooks";
import { getDefaultSubagentModel } from "../../utils/model/agent.js";
import { env } from "../../utils/env.js";
import { getSubagentEffortOverride, getEffortEnvOverride } from "../../utils/effort.js";
import { getFeatureValue_SESSION_PINNED } from "../../services/analytics/growthbook.js";
import { isPlainObject as isPlainObject_4 } from "../../utils/isPlainObject.js";
import { isDiskless } from "../../bootstrap/state.js";
import { toolMatchesName } from "../../Tool.js";
import { SENDMESSAGE } from "../SendMessageTool/constants.js";
import { ENTER_PLAN_MODE_TOOL_NAME } from "../EnterPlanModeTool/constants.js";
import { EXITPLANMODE_2 } from "../ExitPlanModeTool/constants.js";

//@ chunk-e6aww6q8.js:1428917-1428944 placement
var fYs = ["lower", "higher"];
//@ chunk-e6aww6q8.js:1428944-1429151 placement
function isRelativeEffortDisabled() {
  if (
    getDefaultSubagentModel() !== "inherit" ||
    env.CLAUDE_CODE_SUBAGENT_MODEL_FORCE ||
    getSubagentEffortOverride() !== void 0 ||
    getEffortEnvOverride() !== void 0
  )
    return !1;
  let CLAUDE_CODE_SNAPPY_PELICAN = env.CLAUDE_CODE_SNAPPY_PELICAN;
  if (CLAUDE_CODE_SNAPPY_PELICAN !== void 0) return CLAUDE_CODE_SNAPPY_PELICAN;
  return getFeatureValue_SESSION_PINNED("tengu_snappy_pelican", !1);
}
//@ chunk-e6aww6q8.js:1429151-1429316 placement
function dropRelativeEffortInput(e) {
  if (isRelativeEffortDisabled() || !isPlainObject_4(e) || (e.effort !== "lower" && e.effort !== "higher"))
    return null;
  let n = { ...e };
  return (delete n.effort, { input: n, shapeClass: "drop_relative_effort" });
}
//@ chunk-e6aww6q8.js:1429316-1429382 placement
function o8n(e, n) {
  return isDiskless() && (n === void 0 || !n.some((r) => toolMatchesName(r, e)));
}
//@ chunk-e6aww6q8.js:1429382-1429412 placement
function y1r() {
  return o8n(SENDMESSAGE);
}
//@ chunk-e6aww6q8.js:1429412-1429456 placement
function _1r(e) {
  return o8n(ENTER_PLAN_MODE_TOOL_NAME, e) || o8n(EXITPLANMODE_2, e);
}
//@ chunk-e6aww6q8.js:1429559-1429575 placement
var f9t = new AsyncLocalStorage_3();
//@ chunk-e6aww6q8.js:1429575-1429629 placement
function p9t() {
  return f9t.getStore()?.remoteSessionId;
}
//@ chunk-e6aww6q8.js:1429629-1429685 placement
function EYs(e, n) {
  return f9t.run({ remoteSessionId: e }, n);
}

export { y1r, fYs, isRelativeEffortDisabled, dropRelativeEffortInput, EYs, _1r, p9t, o8n };
