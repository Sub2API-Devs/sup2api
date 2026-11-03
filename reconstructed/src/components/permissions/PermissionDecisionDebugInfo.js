/**
 * components/permissions/PermissionDecisionDebugInfo.tsx
 *
 * 权限决策调试信息：决策原因（规则/hook/分类器/模式）字符串化与建议规则；本模块还混入了 React Compiler 的哨兵常量 S（被 800 处引用）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/PermissionDecisionDebugInfo.tsx
 * pieces: chunk-18hwfzwa.js (1), chunk-e6aww6q8.js (7)
 * attribution: fingerprint 4, placement 3, layout 1
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
import { dNn, lPe } from "../../services/tools/toolDecisionTelemetry.js";
import { firstLineOf } from "../../utils/stringUtils.js";
import { TOOLS_HELD_UNTIL_A_PERSON_TYPES } from "../../utils/permissions/permissions.js";
import { HOOK_EVENTS } from "../../entrypoints/sdk/coreSchemas.js";
import { TOOL_CHECK } from "../../plugins/functionHooks/toolCheckHooks.js";
import { generateSuggestions } from "../../utils/permissions/filesystem.js";
import { parseModeSuggestions } from "./consentRows.js";

//@ chunk-e6aww6q8.js:39273-39452 fingerprint = extractMode (0.676)
function extractMode(updates) {
  if (updates.behavior !== "allow") return updates;
  let { updatedPermissions: updatedPermissions } = updates;
  return updatedPermissions === void 0
    ? updates
    : {
        ...updates,
        updatedPermissions: updatedPermissions.map((s) =>
          s.type === "setMode" ? { ...s, mode: normalizePermissionModeAlias(s.mode) } : s,
        ),
      };
}
//@ chunk-e6aww6q8.js:50309-50457 placement
function decisionReasonText(e) {
  let decisionReason = e.decisionReason;
  switch (e.behavior) {
    case "allow":
      return decisionReason && "reason" in decisionReason ? decisionReason.reason : void 0;
    case "ask":
    case "deny":
      return e.message;
  }
}
/**
 * 在子命令结果中找出决定行为的规则
 */
//@ chunk-e6aww6q8.js:50457-50656 placement
function findDecidingRule(e, n) {
  if (e?.type !== "subcommandResults") return;
  for (let r of e.reasons.values()) {
    let h = r.behavior === n ? r.decisionReason : void 0,
      S = h?.type === "rule" ? h.rule : findDecidingRule(h, n);
    if (S !== void 0) return S;
  }
  return;
}
//@ chunk-e6aww6q8.js:50942-51058 fingerprint = PermissionDecisionInfoItem (0.631)
function PermissionDecisionInfoItem(t0) {
  return t0?.type === "subcommandResults"
    ? [...t0.reasons.values()].some((t2) => PermissionDecisionInfoItem(t2.decisionReason))
    : isOutsideReadsBlockedAsk(t0);
}
//@ chunk-e6aww6q8.js:3765551-3767426 fingerprint = decisionReasonDisplayString (0.389)
function decisionReasonDisplayString(e, n, r, s) {
  if (n !== void 0 && n !== "config") {
    if (n === "hook") return "hook:PermissionRequest";
    if (n === "classifier" && r?.type === "classifier") return formatClassifierReasonTag(r);
    return n;
  }
  if (r?.type !== "rule" && s !== void 0) return `rule:${s.source}`;
  if (r === void 0) return "unknown";
  switch (r.type) {
    case "rule":
      return `rule:${r.rule.source}`;
    case "mode":
      return `mode:${r.mode}`;
    case "hook":
      return `hook:${dNn(HOOK_ANALYTICS_NAMES, firstLineOf(r.hookName, ":"))}`;
    case "classifier":
      return formatClassifierReasonTag(r);
    case "subcommandResults": {
      let h = new Set();
      for (let S of r.reasons.values())
        if (
          (S.behavior === e || (e === "ask" && S.behavior === "passthrough")) &&
          S.decisionReason !== void 0
        ) {
          let L = decisionReasonDisplayString(e, void 0, S.decisionReason);
          for (let G of e === "ask" ? lPe(L) : [L]) h.add(G);
        }
      let [y] = h;
      if (h.size === 1 && y !== void 0) return y;
      if (h.size > 1) {
        let S = e === "ask" ? h : new Set([...h].map((w) => firstLineOf(w, ":")));
        return `${SUBCOMMANDS}${[...S].sort().join("+")}`;
      }
      return "subcommandResults";
    }
    case "other":
      if (r.reason === SANDBOX_AUTO_ALLOW_REASON) return "sandboxAutoAllow";
      if (r.reason === READ_ONLY_AUTO_ALLOW_REASON) return "readOnlyCommand";
      if (r.reason === RESTRICTED_MODE_DENY_REASON) return "restrictedMode";
      if (r.reason === OUTSIDE_READS_BLOCKED_DENY_REASON) return "outsideReadsBlocked";
      if (r.reason === OUTSIDE_WRITES_BLOCKED_DENY_REASON || r.reason === SETTINGS_WRITES_BLOCKED_DENY_REASON)
        return "outsideWritesBlocked";
      if (r.reason === NO_PROJECT_DIRECTORY_DENY_REASON) return "noProjectDirectory";
      if (r.reason === TOOLS_HELD_UNTIL_A_PERSON_TYPES) return "toolsHeld";
      if (r.reason === NO_CONFIG_HOME_DENY_REASON) return "noConfigHome";
      if (r.reason === CLASSIFIER_TRANSCRIPT_TOO_LONG_REASON) return "classifierTranscriptTooLong";
      if (r.reason === CAN_USE_TOOL_STREAM_CLOSED_REASON) return "permissionStreamClosed";
      if (r.reason === CAN_USE_TOOL_INVALID_RESULT_REASON) return "canUseToolInvalidResult";
      if (r.reason === CAN_USE_TOOL_REQUEST_FAILED_REASON) return "canUseToolRequestFailed";
      if (r.reason === CAN_USE_TOOL_ABORTED_REASON) return "canUseToolAborted";
      if (r.bashMissKind !== void 0) return `bashMiss:${r.bashMissKind}`;
      return "other";
    case "asyncAgent":
      if (r.reason === HOOK_REWRITTEN_INPUT_ASK_REASON) return "hookRewrittenInputAsk";
      if (r.reason === NO_APPROVAL_SURFACE_REASON) return "noApprovalSurface";
      return r.type;
    case "safetyCheck":
      if (r.reason === OUTSIDE_READS_BLOCKED_DENY_REASON) return "outsideReadsBlocked";
      if (r.reason === NO_CONFIG_HOME_DENY_REASON) return "noConfigHome";
      return r.type;
    case "permissionPromptTool":
    case "sandboxOverride":
    case "workingDir":
      return r.type;
    default:
      return "unknown";
  }
}
//@ chunk-e6aww6q8.js:3767426-3767598 layout
function formatClassifierReasonTag(e) {
  let n = dNn(CLASSIFIER_ANALYTICS_NAMES, e.classifier);
  if (e.reason === CLASSIFIER_UNAVAILABLE_REASON) return `classifier:${n}:unavailable`;
  if (e.noVerdict) return `classifier:${n}:no-verdict`;
  return `classifier:${n}`;
}
//@ chunk-e6aww6q8.js:3767598-3767655 placement = getAutoModeDumpDir (0.607)
var CLASSIFIER_ANALYTICS_NAMES = ["auto-mode"],
  HOOK_ANALYTICS_NAMES = [...HOOK_EVENTS, TOOL_CHECK],
  SUBCOMMANDS = "subcommands:";
//@ chunk-18hwfzwa.js:1369049-1369244 fingerprint = extractDirectories (0.651)
function extractDirectories(h, x, D) {
  let found = generateSuggestions(h, x, D).find((update) => update.type === "addDirectories");
  if (found?.type !== "addDirectories") return null;
  let ee = parseModeSuggestions(found.directories);
  return ee === null ? null : { row: ee, value: "yes-session" };
}

export {
  extractDirectories,
  findDecidingRule,
  extractMode,
  decisionReasonText,
  PermissionDecisionInfoItem,
  decisionReasonDisplayString,
  SUBCOMMANDS,
};
