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
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { fromEnum, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { getToolPermissionContext, consentMustDeny } from "../../utils/permissions/toolPermissionContext.js";
import { ARTIFACT_TOOL_NAME } from "./constants.js";
import { permissionRuleDestination } from "../../services/artifacts/comments/replyPermissionRules.js";
import { shouldShowAlwaysAllowOptions } from "../../utils/permissions/permissionsLoader.js";
import { isVsCodeTopSession } from "../../utils/sessionShape.js";
import { isDesktopNonClaudecode } from "../../utils/entrypointKinds.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";

//@ chunk-8wvtd8sr.js:21788-21927 placement
/**
 * 取 Artifact 工具输入的动作名用于埋点：缺省为 publish，未知动作为 other。
 */
function artifactActionLabel(input) {
  let action = typeof input === "object" && input !== null ? Reflect.get(input, "action") : undefined;
  if (action === undefined) return "publish";
  return ARTIFACT_ACTION_NAME_SET.has(action) ? action : "other";
}
//@ chunk-8wvtd8sr.js:21927-22237 placement
/**
 * 包装 checkPermissions：每个 toolUseId 首次得到 ask 时记录询问特征（动作、原因类型、仅限本人、询问类别、权限模式、能否回答）并上报 tengu_artifact_ask。
 */
function withAskTelemetry(base) {
  let checkPermissions = base.checkPermissions;
  return overrideDescriptors(base, {
    async checkPermissions(input, context) {
      let decision = await checkPermissions.call(this, input, context);
      let toolUseId = context.toolUseId;
      if (decision.behavior !== "ask" || toolUseId === undefined) return decision;
      try {
        let askTelemetry = getLiveState().askTelemetry;
        if (!askTelemetry.has(toolUseId)) {
          let facts = captureAskFacts(input, decision, context, toolUseId);
          setBounded(askTelemetry, toolUseId, facts);
          logEvent("tengu_artifact_ask", {
            toolUseID: sanitizeMarkName(toolUseId),
            ...askTelemetryFields(facts),
          });
        }
      } catch {}
      return decision;
    },
  });
}
//@ chunk-8wvtd8sr.js:22237-22510 placement
/**
 * 询问获批时记录 tengu_artifact_ask_granted 事件（工具调用 id、消息 id 与询问时记下的字段），并清除记录。
 */
function logAskGranted(context, message) {
  try {
    let toolUseId = context.toolUseId;
    if (toolUseId === undefined) return;
    let askTelemetry = getLiveState().askTelemetry;
    let facts = askTelemetry.get(toolUseId);
    if (facts === undefined) return;
    askTelemetry.delete(toolUseId);
    logEvent("tengu_artifact_ask_granted", {
      toolUseID: sanitizeMarkName(toolUseId),
      messageID: sanitizeMarkName(message?.message.id),
      ...askTelemetryFields(facts),
      approvedBy: fromEnum(approvalSourceLabel(context.toolDecisions?.get(toolUseId)?.source)),
    });
  } catch {}
}
//@ chunk-8wvtd8sr.js:22510-22685 placement
function askTelemetryFields(facts) {
  return {
    action: fromEnum(facts.action),
    decisionReasonType: fromEnumOpt(facts.reasonType),
    personOnly: facts.personOnly,
    askClass: fromEnumOpt(facts.askClass),
    permissionMode: fromEnum(facts.mode),
    answerable: facts.answerable,
  };
}
//@ chunk-8wvtd8sr.js:22685-22916 placement
function captureAskFacts(input, decision, context, toolUseId) {
  let decisionReason = decision.decisionReason;
  return {
    action: artifactActionLabel(input),
    reasonType: decisionReason?.type,
    personOnly: decisionReason?.type === "safetyCheck" && decisionReason.classifierApprovable === false,
    askClass: getLiveState().askClassPending.get(toolUseId)?.[0]?.class,
    mode: getToolPermissionContext(context).mode,
    answerable: !consentMustDeny(context),
  };
}
//@ chunk-8wvtd8sr.js:22916-23064 placement
function approvalSourceLabel(source) {
  switch (source) {
    case undefined:
      return "none";
    case "user_temporary":
    case "user_permanent":
    case "hook":
    case "config":
      return source;
    default:
      return "other";
  }
}
//@ chunk-8wvtd8sr.js:23064-23172 placement = buildPermissionUpdates (0.774)
function buildPermissionUpdates(sessionScoped) {
  return {
    type: "addRules",
    rules: [
      {
        toolName: ARTIFACT_TOOL_NAME,
      },
    ],
    behavior: "allow",
    destination: sessionScoped ? "session" : permissionRuleDestination(),
  };
}
//@ chunk-8wvtd8sr.js:23172-23245 placement
/**
 * 判断是否应展示「总是允许」选项（VS Code 或桌面会话加开关）。
 */
function shouldOfferAlwaysAllow() {
  return (
    shouldShowAlwaysAllowOptions() &&
    (isVsCodeTopSession() || isDesktopNonClaudecode()) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_teal_corbel_newel", false)
  );
}
export {
  artifactActionLabel,
  shouldOfferAlwaysAllow,
  buildPermissionUpdates,
  logAskGranted,
  withAskTelemetry,
};
