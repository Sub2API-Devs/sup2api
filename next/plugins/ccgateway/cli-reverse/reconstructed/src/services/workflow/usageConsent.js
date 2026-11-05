/**
 * services/workflow/usageConsent.ts
 *
 * 工作流用量警告确认（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-st4np5cx.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { WORKFLOW_TOOL_NAME } from "../../tools/WorkflowTool/constants.js";
import {
  getToolPermissionContext,
  getUltracodeRequested,
} from "../../utils/permissions/toolPermissionContext.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { isTeammateContextReady } from "../../utils/swarm/permissionSync.js";
import { isUltracodeActive } from "../../utils/effort.js";
import { hasSkipWorkflowUsageWarning, updateSettingsForSource } from "../../utils/settings/settings.js";
import { logForDebugging } from "../../utils/debug.js";
import { logEvent } from "../analytics/index.js";

//@ chunk-st4np5cx.js:4266-4534 placement
function needsWorkflowUsageConsent(toolName, toolUseContext) {
  if (toolName !== WORKFLOW_TOOL_NAME) return false;
  if (toolUseContext.options.isNonInteractiveSession) return false;
  if (getToolPermissionContext(toolUseContext).shouldAvoidPermissionPrompts) return false;
  if (isBgSession()) return false;
  if (isTeammateContextReady()) return false;
  if (isUltracodeActive(getUltracodeRequested(toolUseContext), toolUseContext.options.mainLoopModel))
    return false;
  return !toolUseContext.session.workflowUsageConsent.isGranted() && !hasSkipWorkflowUsageWarning();
}
//@ chunk-st4np5cx.js:4534-4796 placement
async function acceptWorkflowUsageWarning(consent, storageV5) {
  consent.grant();
  if (hasSkipWorkflowUsageWarning()) return;
  let { error } = await updateSettingsForSource(
    "userSettings",
    {
      skipWorkflowUsageWarning: true,
    },
    undefined,
    storageV5,
  );
  if (error) {
    logForDebugging(`Failed to persist skipWorkflowUsageWarning: ${error.message}`, {
      level: "error",
    });
    return;
  }
  logEvent("tengu_workflow_usage_warning_accepted", {});
}
export { acceptWorkflowUsageWarning, needsWorkflowUsageConsent };
