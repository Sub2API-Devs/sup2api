/**
 * hooks/toolPermission/lateAnswerBounds.ts
 *
 * 2.1.316 新增。晚到的权限回答输入越界检查。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-frs14hy1.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  MAX_ANSWER_VALUES,
  MAX_ANSWER_DEPTH,
  MAX_ANSWER_CHARS,
  capPermissionUpdates_2,
  measureAnswerBounds,
  applyAnswerPermissionUpdates,
  denyLostTightening,
} from "../../utils/permissions/permissionAnswer.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { logForDebugging } from "../../utils/debug.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import {
  isPersonTypesHold,
  isConversationEndTool,
  buildToolsPausedMessage,
  TOOLS_HELD_UNTIL_A_PERSON_TYPES,
} from "../../utils/permissions/permissions.js";
import { getToolNameForPermissionCheck as getToolNameForPermissionCheck_5 } from "../../services/mcp/mcpStringUtils.js";
import { logError } from "../../utils/log.js";
import { TOOL_PERMISSION_REQUEST_FAILED } from "../../cli/toolPermissionStream.js";
import { CAN_USE_TOOL_REQUEST_FAILED_DENY_REASON } from "../../types/permissions.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-frs14hy1.js:31900-32161 placement
var LATE_ANSWER_OUT_OF_BOUNDS_MESSAGE; // deferred: uses MAX_ANSWER_DEPTH (../../utils/permissions/permissionAnswer.js) of its import cycle while loading; runs once the cycle is complete
var orphanedPermissionCap;
deferInit("chunk-frs14hy1.js:31900", () => {
  LATE_ANSWER_OUT_OF_BOUNDS_MESSAGE = `The call was not run. The permission answer gave it an input past what this session takes from an answer: ${MAX_ANSWER_VALUES} values, ${MAX_ANSWER_DEPTH} levels of nesting, ${MAX_ANSWER_CHARS} characters of text. Nothing of the answer is in force.`;
  orphanedPermissionCap = DoctorLazy(() => capPermissionUpdates_2("cut", "orphaned permission"));
});
//@ chunk-frs14hy1.js:32161-32360 placement
/**
 * 创建晚到权限回答的边界检查器：首次调用时计算并缓存拒绝结果，可查询是否已放行，未被询问时警告其权限更新从未应用。
 */
function createLateAnswerBound(permissionUpdates, answer, toolUseID, strip) {
  let refusal;
  let wasServed = false;
  return {
    refusalOf: (updatedPermissions, toolUseID_2, toolPermissionContext, setContext) => {
      let isServedAllow = !wasServed;
      wasServed = true;
      return (refusal ??= boundLateAnswerInput(
        permissionUpdates,
        answer,
        toolUseID,
        strip,
        isServedAllow,
        updatedPermissions,
        toolUseID_2,
        toolPermissionContext,
        setContext,
      ));
    },
    hasServedAllow: () => wasServed && refusal === undefined,
    warnIfNeverAsked: () => {
      if (!wasServed) warnLateAllowNeverServed(toolUseID, answer.updatedPermissions);
    },
  };
}
//@ chunk-frs14hy1.js:32360-32550 placement
/**
 * 记录警告：晚到的允许回答从未被使用，其 updatedPermissions 均未应用。
 */
function warnLateAllowNeverServed(toolUseID, updatedPermissions) {
  if (updatedPermissions !== undefined)
    logForDebugging(
      `the late allow for toolUseID=${toolUseID} was never served: nothing of its updatedPermissions (${Array.isArray(updatedPermissions) ? updatedPermissions.length : 1} item(s)) was applied`,
      {
        level: "warn",
      },
    );
}
//@ chunk-frs14hy1.js:32550-33588 placement
function boundLateAnswerInput(
  permissionUpdates,
  { updatedInput, updatedPermissions },
  toolUseID,
  strip,
  isServedAllow,
  tool,
  originalInput,
  toolUseContext,
  setContext,
) {
  try {
    let bounds = measureAnswerBounds(updatedInput);
    if (!bounds.within) {
      logForDebugging(
        `refused a late permission answer for ${tool.name}: its updatedInput is past the answer bounds (${bounds.values} values, depth ${bounds.depth}, ${bounds.chars} string characters when the walk stopped)`,
        {
          level: "warn",
        },
      );
      return {
        behavior: "deny",
        message: LATE_ANSWER_OUT_OF_BOUNDS_MESSAGE,
        toolUseID,
        decisionReason: {
          type: "other",
          reason: "the permission answer's input is past the answer bounds",
        },
        decideLocation: "ask-path",
      };
    }
    if (!isServedAllow) return;
    let toolPermissionContext = getToolPermissionContext(toolUseContext);
    if (isPersonTypesHold(toolPermissionContext) && !isConversationEndTool(tool))
      return {
        behavior: "deny",
        message: buildToolsPausedMessage(tool.name),
        toolUseID,
        decisionReason: {
          type: "other",
          reason: TOOLS_HELD_UNTIL_A_PERSON_TYPES,
        },
      };
    let effectiveInput = Object.keys(updatedInput).length > 0 ? updatedInput : originalInput;
    let { lostTightenings } = applyAnswerPermissionUpdates(
      permissionUpdates,
      orphanedPermissionCap().parse(updatedPermissions),
      {
        vetoed: () => false,
        strip: (rule) => strip(rule, tool, effectiveInput, toolPermissionContext),
        toolName: getToolNameForPermissionCheck_5(tool),
        input: originalInput,
        suggested: (input) => tool.suggestedAllowRule?.(input, "late") === true,
        setContext,
      },
    );
    return lostTightenings > 0 ? denyLostTightening(tool.name, toolUseID) : undefined;
  } catch (error) {
    logForDebugging(`refused a late permission answer for ${tool.name}: judging it threw`, {
      level: "warn",
    });
    logError(error);
    return {
      behavior: "deny",
      message: TOOL_PERMISSION_REQUEST_FAILED,
      toolUseID,
      decisionReason: CAN_USE_TOOL_REQUEST_FAILED_DENY_REASON,
      decideLocation: "ask-path",
    };
  }
}
export { warnLateAllowNeverServed, createLateAnswerBound };
