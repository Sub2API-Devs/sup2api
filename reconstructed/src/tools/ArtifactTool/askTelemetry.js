/**
 * tools/ArtifactTool/askTelemetry.ts
 *
 * 2.1.316 新增：权限询问遥测
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8wvtd8sr.js (8)
 * attribution: placement 8
 */
import { ARTIFACT_ACTION_NAME_SET } from "./actionInput.js";
import { overrideDescriptors, setBounded } from "./artifactAskMessages.js";
import { getLiveState } from "../../services/liveReplica/liveReplica.js";
import { logEvent } from "../../services/analytics/index.js";
import { ye } from "../../utils/startupMarks.js";
import { fromEnum, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { getToolPermissionContext, consentMustDeny } from "../../utils/permissions/toolPermissionContext.js";
import { ARTIFACT_TOOL_NAME } from "./constants.js";
import { ODr } from "../../services/artifacts/comments/replyPermissionRules.js";
import { shouldShowAlwaysAllowOptions } from "../../utils/permissions/permissionsLoader.js";
import { isVsCodeTopSession } from "../../utils/sessionShape.js";
import { isDesktopNonClaudecode } from "../../utils/entrypointKinds.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";

/**
 * 取 Artifact 工具输入的动作名用于埋点：缺省为 publish，未知动作为 other。
 */
//@ chunk-8wvtd8sr.js:21788-21927 placement
function artifactActionLabel(e) {
  let n = typeof e === "object" && e !== null ? Reflect.get(e, "action") : void 0;
  if (n === void 0) return "publish";
  return ARTIFACT_ACTION_NAME_SET.has(n) ? n : "other";
}
/**
 * 包装 checkPermissions：每个 toolUseId 首次得到 ask 时记录询问特征（动作、原因类型、仅限本人、询问类别、权限模式、能否回答）并上报 tengu_artifact_ask。
 */
//@ chunk-8wvtd8sr.js:21927-22237 placement
function withAskTelemetry(e) {
  let checkPermissions = e.checkPermissions;
  return overrideDescriptors(e, {
    async checkPermissions(s, r) {
      let h = await checkPermissions.call(this, s, r),
        toolUseId = r.toolUseId;
      if (h.behavior !== "ask" || toolUseId === void 0) return h;
      try {
        let askTelemetry = getLiveState().askTelemetry;
        if (!askTelemetry.has(toolUseId)) {
          let w = captureAskFacts(s, h, r, toolUseId);
          (setBounded(askTelemetry, toolUseId, w),
            logEvent("tengu_artifact_ask", { toolUseID: ye(toolUseId), ...askTelemetryFields(w) }));
        }
      } catch {}
      return h;
    },
  });
}
/**
 * 询问获批时记录 tengu_artifact_ask_granted 事件（工具调用 id、消息 id 与询问时记下的字段），并清除记录。
 */
//@ chunk-8wvtd8sr.js:22237-22510 placement
function logAskGranted(e, n) {
  try {
    let toolUseId = e.toolUseId;
    if (toolUseId === void 0) return;
    let askTelemetry = getLiveState().askTelemetry,
      h = askTelemetry.get(toolUseId);
    if (h === void 0) return;
    (askTelemetry.delete(toolUseId),
      logEvent("tengu_artifact_ask_granted", {
        toolUseID: ye(toolUseId),
        messageID: ye(n?.message.id),
        ...askTelemetryFields(h),
        approvedBy: fromEnum(approvalSourceLabel(e.toolDecisions?.get(toolUseId)?.source)),
      }));
  } catch {}
}
//@ chunk-8wvtd8sr.js:22510-22685 placement
function askTelemetryFields(e) {
  return {
    action: fromEnum(e.action),
    decisionReasonType: fromEnumOpt(e.reasonType),
    personOnly: e.personOnly,
    askClass: fromEnumOpt(e.askClass),
    permissionMode: fromEnum(e.mode),
    answerable: e.answerable,
  };
}
//@ chunk-8wvtd8sr.js:22685-22916 placement
function captureAskFacts(e, n, s, r) {
  let decisionReason = n.decisionReason;
  return {
    action: artifactActionLabel(e),
    reasonType: decisionReason?.type,
    personOnly: decisionReason?.type === "safetyCheck" && decisionReason.classifierApprovable === !1,
    askClass: getLiveState().askClassPending.get(r)?.[0]?.class,
    mode: getToolPermissionContext(s).mode,
    answerable: !consentMustDeny(s),
  };
}
//@ chunk-8wvtd8sr.js:22916-23064 placement
function approvalSourceLabel(e) {
  switch (e) {
    case void 0:
      return "none";
    case "user_temporary":
    case "user_permanent":
    case "hook":
    case "config":
      return e;
    default:
      return "other";
  }
}
//@ chunk-8wvtd8sr.js:23064-23172 placement = buildPermissionUpdates (0.774)
function buildPermissionUpdates(e) {
  return {
    type: "addRules",
    rules: [{ toolName: ARTIFACT_TOOL_NAME }],
    behavior: "allow",
    destination: e ? "session" : ODr(),
  };
}
//@ chunk-8wvtd8sr.js:23172-23245 placement
function Nc() {
  return (
    shouldShowAlwaysAllowOptions() &&
    (isVsCodeTopSession() || isDesktopNonClaudecode()) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_teal_corbel_newel", !1)
  );
}

export { artifactActionLabel, Nc, buildPermissionUpdates, logAskGranted, withAskTelemetry };
