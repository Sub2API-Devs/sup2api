/**
 * hooks/toolPermission/lateAnswerBounds.ts
 *
 * 2.1.316 新增。晚到的权限回答输入越界检查。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0h4e7gnq.js (4)
 * attribution: placement 4
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
import { getToolNameForPermissionCheck as getToolNameForPermissionCheck_3 } from "../../services/mcp/mcpStringUtils.js";
import { logError } from "../../utils/log.js";
import { TOOL_PERMISSION_REQUEST_FAILED } from "../../cli/toolPermissionStream.js";
import { CAN_USE_TOOL_REQUEST_FAILED_DENY_REASON } from "../../types/permissions.js";

//@ chunk-0h4e7gnq.js:27425-27686 placement
var LATE_ANSWER_OUT_OF_BOUNDS_MESSAGE = `The call was not run. The permission answer gave it an input past what this session takes from an answer: ${MAX_ANSWER_VALUES} values, ${MAX_ANSWER_DEPTH} levels of nesting, ${MAX_ANSWER_CHARS} characters of text. Nothing of the answer is in force.`;
var orphanedPermissionCap = DoctorLazy(() => capPermissionUpdates_2("cut", "orphaned permission"));
//@ chunk-0h4e7gnq.js:27686-27885 placement
/**
 * 创建晚到权限回答的边界检查器：首次调用时计算并缓存拒绝结果，可查询是否已放行，未被询问时警告其权限更新从未应用。
 */
function createLateAnswerBound(e, n, toolUseID, computePermissionUpdatesForReplay) {
  let r;
  let S = false;
  return {
    refusalOf: (h, k, w, setContext) => {
      let L = !S;
      S = true;
      return (r ??= boundLateAnswerInput(
        e,
        n,
        toolUseID,
        computePermissionUpdatesForReplay,
        L,
        h,
        k,
        w,
        setContext,
      ));
    },
    hasServedAllow: () => S && r === undefined,
    warnIfNeverAsked: () => {
      if (!S) warnLateAllowNeverServed(toolUseID, n.updatedPermissions);
    },
  };
}
//@ chunk-0h4e7gnq.js:27885-28075 placement
/**
 * 记录警告：晚到的允许回答从未被使用，其 updatedPermissions 均未应用。
 */
function warnLateAllowNeverServed(e, updatedPermissions) {
  if (updatedPermissions !== undefined)
    logForDebugging(
      `the late allow for toolUseID=${e} was never served: nothing of its updatedPermissions (${Array.isArray(updatedPermissions) ? updatedPermissions.length : 1} item(s)) was applied`,
      {
        level: "warn",
      },
    );
}
//@ chunk-0h4e7gnq.js:28075-29062 placement
function boundLateAnswerInput(e, { updatedInput, updatedPermissions }, y, r, S, h, k, w, setContext) {
  try {
    let L = measureAnswerBounds(updatedInput);
    if (!L.within) {
      logForDebugging(
        `refused a late permission answer for ${h.name}: its updatedInput is past the answer bounds (${L.values} values, depth ${L.depth}, ${L.chars} string characters when the walk stopped)`,
        {
          level: "warn",
        },
      );
      return {
        behavior: "deny",
        message: LATE_ANSWER_OUT_OF_BOUNDS_MESSAGE,
        toolUseID: y,
        decisionReason: {
          type: "other",
          reason: "the permission answer's input is past the answer bounds",
        },
        decideLocation: "ask-path",
      };
    }
    if (!S) return;
    let toolPermissionContext = getToolPermissionContext(w);
    if (isPersonTypesHold(toolPermissionContext) && !isConversationEndTool(h))
      return {
        behavior: "deny",
        message: buildToolsPausedMessage(h.name),
        toolUseID: y,
        decisionReason: {
          type: "other",
          reason: TOOLS_HELD_UNTIL_A_PERSON_TYPES,
        },
      };
    let G = Object.keys(updatedInput).length > 0 ? updatedInput : k;
    let { lostTightenings } = applyAnswerPermissionUpdates(
      e,
      orphanedPermissionCap().parse(updatedPermissions),
      {
        vetoed: () => false,
        strip: (te) => r(te, h, G, toolPermissionContext),
        toolName: getToolNameForPermissionCheck_3(h),
        input: k,
        setContext,
      },
    );
    return lostTightenings > 0 ? denyLostTightening(h.name, y) : undefined;
  } catch (error) {
    logForDebugging(`refused a late permission answer for ${h.name}: judging it threw`, {
      level: "warn",
    });
    logError(error);
    return {
      behavior: "deny",
      message: TOOL_PERMISSION_REQUEST_FAILED,
      toolUseID: y,
      decisionReason: CAN_USE_TOOL_REQUEST_FAILED_DENY_REASON,
      decideLocation: "ask-path",
    };
  }
}
export { warnLateAllowNeverServed, createLateAnswerBound };
