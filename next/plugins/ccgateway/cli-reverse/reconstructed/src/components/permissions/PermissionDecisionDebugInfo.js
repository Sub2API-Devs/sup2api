/**
 * components/permissions/PermissionDecisionDebugInfo.tsx
 *
 * 权限决策调试信息：决策原因（规则/hook/分类器/模式）字符串化与建议规则；本模块还混入了 React Compiler 的哨兵常量 S（被 800 处引用）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/PermissionDecisionDebugInfo.tsx
 * pieces: chunk-5xgkngpb.js (7), chunk-czq1j3j2.js (1), chunk-w3ch4xq2.js (1)
 * attribution: fingerprint 5, placement 3, layout 1
 */
import {
  normalizePermissionModeAlias,
  isOutsideReadsBlockedAsk,
  SANDBOX_AUTO_ALLOW_REASON,
  READ_ONLY_AUTO_ALLOW_REASON,
  RESTRICTED_MODE_DENY_REASON,
  OUTSIDE_READS_BLOCKED_DENY_REASON,
  OUTSIDE_WRITES_BLOCKED_DENY_REASON,
  SETTINGS_WRITES_BLOCKED_DENY_REASON,
  NO_PROJECT_DIRECTORY_DENY_REASON,
  NO_CONFIG_HOME_DENY_REASON,
  CLASSIFIER_TRANSCRIPT_TOO_LONG_REASON,
  CAN_USE_TOOL_STREAM_CLOSED_REASON,
  CAN_USE_TOOL_INVALID_RESULT_REASON,
  CAN_USE_TOOL_REQUEST_FAILED_REASON,
  CAN_USE_TOOL_ABORTED_REASON,
  HOOK_REWRITTEN_INPUT_ASK_REASON,
  NO_APPROVAL_SURFACE_REASON,
  CLASSIFIER_UNAVAILABLE_REASON,
} from "../../types/permissions.js";
import { pickReasonFromList, splitSubcommandReason } from "../../services/tools/toolDecisionTelemetry.js";
import { firstLineOf } from "../../utils/stringUtils.js";
import { TOOLS_HELD_UNTIL_A_PERSON_TYPES } from "../../utils/permissions/permissions.js";
import { HOOK_EVENTS } from "../../entrypoints/sdk/coreSchemas.js";
import { TOOL_CHECK } from "../../plugins/functionHooks/toolCheckHooks.js";
import { untrackedWiredTools, rulesMatchingTool } from "../../services/mcp/serverIdentity.js";
import { permissionRuleValueFromString } from "../../utils/permissions/permissionRuleParser.js";
import { generateSuggestions } from "../../utils/permissions/filesystem.js";
import { parseModeSuggestions } from "./consentRows.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:41861-42040 fingerprint (2.1.88 match: extractMode, 0.677)
function extractMode(updates) {
  if (updates.behavior !== "allow") return updates;
  let { updatedPermissions } = updates;
  return updatedPermissions === undefined
    ? updates
    : {
        ...updates,
        updatedPermissions: updatedPermissions.map((updatedPermission) =>
          updatedPermission.type === "setMode"
            ? {
                ...updatedPermission,
                mode: normalizePermissionModeAlias(updatedPermission.mode),
              }
            : updatedPermission,
        ),
      };
}
//@ chunk-5xgkngpb.js:52725-52873 placement
function decisionReasonText(decision) {
  let decisionReason = decision.decisionReason;
  switch (decision.behavior) {
    case "allow":
      return decisionReason && "reason" in decisionReason ? decisionReason.reason : undefined;
    case "ask":
    case "deny":
      return decision.message;
  }
}
//@ chunk-5xgkngpb.js:52873-53072 placement
/**
 * 在子命令结果中找出决定行为的规则
 */
function findDecidingRule(reason, behavior) {
  if (reason?.type !== "subcommandResults") return;
  for (let reason_2 of reason.reasons.values()) {
    let decisionReason = reason_2.behavior === behavior ? reason_2.decisionReason : undefined;
    let rule =
      decisionReason?.type === "rule" ? decisionReason.rule : findDecidingRule(decisionReason, behavior);
    if (rule !== undefined) return rule;
  }
  return;
}
//@ chunk-5xgkngpb.js:53358-53474 fingerprint (2.1.88 match: PermissionDecisionInfoItem, 0.576)
function PermissionDecisionInfoItem(t0) {
  return t0?.type === "subcommandResults"
    ? [...t0.reasons.values()].some((reason) => PermissionDecisionInfoItem(reason.decisionReason))
    : isOutsideReadsBlockedAsk(t0);
}
//@ chunk-5xgkngpb.js:3861343-3863218 fingerprint (2.1.88 match: decisionReasonDisplayString, 0.391)
function decisionReasonDisplayString(reason, type, mode, permissionMode) {
  if (type !== undefined && type !== "config") {
    if (type === "hook") return "hook:PermissionRequest";
    if (type === "classifier" && mode?.type === "classifier") return formatClassifierReasonTag(mode);
    return type;
  }
  if (mode?.type !== "rule" && permissionMode !== undefined) return `rule:${permissionMode.source}`;
  if (mode === undefined) return "unknown";
  switch (mode.type) {
    case "rule":
      return `rule:${mode.rule.source}`;
    case "mode":
      return `mode:${mode.mode}`;
    case "hook":
      return `hook:${pickReasonFromList(HOOK_ANALYTICS_NAMES, firstLineOf(mode.hookName, ":"))}`;
    case "classifier":
      return formatClassifierReasonTag(mode);
    case "subcommandResults": {
      let lines = new Set();
      for (let reason_2 of mode.reasons.values())
        if (
          (reason_2.behavior === reason || (reason === "ask" && reason_2.behavior === "passthrough")) &&
          reason_2.decisionReason !== undefined
        ) {
          let text = decisionReasonDisplayString(reason, undefined, reason_2.decisionReason);
          for (let line of reason === "ask" ? splitSubcommandReason(text) : [text]) lines.add(line);
        }
      let [firstLine] = lines;
      if (lines.size === 1 && firstLine !== undefined) return firstLine;
      if (lines.size > 1) {
        let uniqueLines =
          reason === "ask" ? lines : new Set([...lines].map((line) => firstLineOf(line, ":")));
        return `${SUBCOMMANDS}${[...uniqueLines].sort().join("+")}`;
      }
      return "subcommandResults";
    }
    case "other":
      if (mode.reason === SANDBOX_AUTO_ALLOW_REASON) return "sandboxAutoAllow";
      if (mode.reason === READ_ONLY_AUTO_ALLOW_REASON) return "readOnlyCommand";
      if (mode.reason === RESTRICTED_MODE_DENY_REASON) return "restrictedMode";
      if (mode.reason === OUTSIDE_READS_BLOCKED_DENY_REASON) return "outsideReadsBlocked";
      if (
        mode.reason === OUTSIDE_WRITES_BLOCKED_DENY_REASON ||
        mode.reason === SETTINGS_WRITES_BLOCKED_DENY_REASON
      )
        return "outsideWritesBlocked";
      if (mode.reason === NO_PROJECT_DIRECTORY_DENY_REASON) return "noProjectDirectory";
      if (mode.reason === TOOLS_HELD_UNTIL_A_PERSON_TYPES) return "toolsHeld";
      if (mode.reason === NO_CONFIG_HOME_DENY_REASON) return "noConfigHome";
      if (mode.reason === CLASSIFIER_TRANSCRIPT_TOO_LONG_REASON) return "classifierTranscriptTooLong";
      if (mode.reason === CAN_USE_TOOL_STREAM_CLOSED_REASON) return "permissionStreamClosed";
      if (mode.reason === CAN_USE_TOOL_INVALID_RESULT_REASON) return "canUseToolInvalidResult";
      if (mode.reason === CAN_USE_TOOL_REQUEST_FAILED_REASON) return "canUseToolRequestFailed";
      if (mode.reason === CAN_USE_TOOL_ABORTED_REASON) return "canUseToolAborted";
      if (mode.bashMissKind !== undefined) return `bashMiss:${mode.bashMissKind}`;
      return "other";
    case "asyncAgent":
      if (mode.reason === HOOK_REWRITTEN_INPUT_ASK_REASON) return "hookRewrittenInputAsk";
      if (mode.reason === NO_APPROVAL_SURFACE_REASON) return "noApprovalSurface";
      return mode.type;
    case "safetyCheck":
      if (mode.reason === OUTSIDE_READS_BLOCKED_DENY_REASON) return "outsideReadsBlocked";
      if (mode.reason === NO_CONFIG_HOME_DENY_REASON) return "noConfigHome";
      return mode.type;
    case "permissionPromptTool":
    case "sandboxOverride":
    case "workingDir":
      return mode.type;
    default:
      return "unknown";
  }
}
//@ chunk-5xgkngpb.js:3863218-3863390 layout
function formatClassifierReasonTag(classifierResult) {
  let reasonName = pickReasonFromList(CLASSIFIER_ANALYTICS_NAMES, classifierResult.classifier);
  if (classifierResult.reason === CLASSIFIER_UNAVAILABLE_REASON)
    return `classifier:${reasonName}:unavailable`;
  if (classifierResult.noVerdict) return `classifier:${reasonName}:no-verdict`;
  return `classifier:${reasonName}`;
}
//@ chunk-5xgkngpb.js:3863390-3863447 placement (2.1.88 match: getAutoModeDumpDir, 0.608)
var CLASSIFIER_ANALYTICS_NAMES; // deferred: uses HOOK_EVENTS (../../entrypoints/sdk/coreSchemas.js) of its import cycle while loading; runs once the cycle is complete
var HOOK_ANALYTICS_NAMES;
var SUBCOMMANDS;
deferInit("chunk-5xgkngpb.js:3863390", () => {
  CLASSIFIER_ANALYTICS_NAMES = ["auto-mode"];
  HOOK_ANALYTICS_NAMES = [...HOOK_EVENTS, TOOL_CHECK];
  SUBCOMMANDS = "subcommands:";
});
//@ chunk-w3ch4xq2.js:128703-128992 fingerprint (2.1.88 match: _temp5, 0.632)
function expandToolScopedRules(u_1, i) {
  if (untrackedWiredTools().length === 0) return [...u_1];
  let seenRules = new Set(u_1.map(({ rule, source }) => `${source} ${rule}`));
  return [
    ...u_1,
    ...i.flatMap(({ ruleValue, source }) =>
      rulesMatchingTool(ruleValue.toolName).flatMap((toolName) => {
        let expandedRuleValue = permissionRuleValueFromString({
          ...ruleValue,
          toolName,
        });
        let dedupeKey = `${source} ${expandedRuleValue}`;
        if (seenRules.has(dedupeKey)) return [];
        seenRules.add(dedupeKey);
        return [
          {
            rule: expandedRuleValue,
            source,
          },
        ];
      }),
    ),
  ];
}
//@ chunk-czq1j3j2.js:1391849-1392044 fingerprint (2.1.88 match: extractDirectories, 0.651)
function extractDirectories(filePath, operationType, toolPermissionContext) {
  let found = generateSuggestions(filePath, operationType, toolPermissionContext).find(
    (update) => update.type === "addDirectories",
  );
  if (found?.type !== "addDirectories") return null;
  let modeSuggestions = parseModeSuggestions(found.directories);
  return modeSuggestions === null
    ? null
    : {
        row: modeSuggestions,
        value: "yes-session",
      };
}
export {
  extractMode,
  findDecidingRule,
  decisionReasonText,
  PermissionDecisionInfoItem,
  extractDirectories,
  decisionReasonDisplayString,
  SUBCOMMANDS,
  expandToolScopedRules,
};
