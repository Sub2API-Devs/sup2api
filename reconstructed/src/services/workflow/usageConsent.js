/**
 * services/workflow/usageConsent.ts
 *
 * 工作流用量警告确认（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hxj257dq.js (2)
 * attribution: placement 2
 */
import { WORKFLOW_TOOL_NAME } from "../../tools/WorkflowTool/constants.js";
import {
  getToolPermissionContext,
  getUltracodeRequested,
} from "../../utils/permissions/toolPermissionContext.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { Yqe } from "../../utils/swarm/permissionSync.js";
import { isUltracodeActive } from "../../utils/effort.js";
import { hasSkipWorkflowUsageWarning, updateSettingsForSource } from "../../utils/settings/settings.js";
import { logForDebugging } from "../../utils/debug.js";
import { logEvent } from "../analytics/index.js";

//@ chunk-hxj257dq.js:3902-4170 placement
function needsWorkflowUsageConsent(e, o) {
  if (e !== WORKFLOW_TOOL_NAME) return !1;
  if (o.options.isNonInteractiveSession) return !1;
  if (getToolPermissionContext(o).shouldAvoidPermissionPrompts) return !1;
  if (isBgSession()) return !1;
  if (Yqe()) return !1;
  if (isUltracodeActive(getUltracodeRequested(o), o.options.mainLoopModel)) return !1;
  return !o.session.workflowUsageConsent.isGranted() && !hasSkipWorkflowUsageWarning();
}
//@ chunk-hxj257dq.js:4170-4432 placement
async function acceptWorkflowUsageWarning(e, o) {
  if ((e.grant(), hasSkipWorkflowUsageWarning())) return;
  let { error: error } = await updateSettingsForSource(
    "userSettings",
    { skipWorkflowUsageWarning: !0 },
    void 0,
    o,
  );
  if (error) {
    logForDebugging(`Failed to persist skipWorkflowUsageWarning: ${error.message}`, { level: "error" });
    return;
  }
  logEvent("tengu_workflow_usage_warning_accepted", {});
}
