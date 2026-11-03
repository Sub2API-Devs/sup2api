/**
 * services/artifacts/comments/autoreactGates.ts
 *
 * 2.1.316 新增：评论自动响应的开关与权限门槛
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9tgt55am.js (52)
 * attribution: placement 52
 */
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  hasFreshGrowthBookFeatures,
  refreshGrowthBookFeatures,
} from "../../analytics/growthbook.js";
import { BUSY_EDGE_THRESHOLD_MS } from "../../../utils/plugins/hooksModulesRollout.js";
import { parseTimestamp, getCommentAuthorKind } from "./commentState.js";
import { getLiveState } from "../../liveReplica/liveReplica.js";
import { ownAccountUuid, isOwnPrincipal, classifyThreadAuthors } from "./commentAuthorship.js";
import { commentTextChanged, recordJudgedComments } from "../shareEntries.js";
import { logFeatureSad } from "../../analytics/featureTelemetry.js";
import { hasThreadAgentForSlug } from "./backgroundAgent.js";
import { env } from "../../../utils/env.js";
import {
  getPermissionPromptPerson,
  hasPermissionPromptTool,
} from "../../../utils/permissions/permissionPromptHost.js";
import { isUnattendedInteractiveSession } from "../../../utils/concurrentSessions.js";
import {
  hasPermissionsToUseTool,
  isChainOnAllowActive,
  hasAutoModeClassifierDenyRules,
  getAskRuleForTool,
  matchToolRule,
} from "../../../utils/permissions/permissions.js";
import { withDeadline } from "../../../utils/sleep.js";
import {
  getToolPermissionContext,
  consentMustDeny,
} from "../../../utils/permissions/toolPermissionContext.js";
import { artifactCallReadRule } from "../../../tools/ArtifactTool/permissions/readRules.js";
import {
  isBuiltInArtifactHiddenForMcp,
  ARTIFACTS_MCP_READ_COMMENTS_TOOL,
  artifactsMcpToolRef,
} from "../artifactsMcpTools.js";
import { hasArtifactDenyOrAskRule, isReplyDeniedByRules } from "./threadPrompts.js";
import { isAutoAllowedInMode } from "../../../utils/permissions/browserToolNames.js";
import { isCoworkFramePublishSession } from "../artifactToolGates.js";
import { getIsNonInteractiveSession, getPermissionPromptToolName } from "../../../bootstrap/state.js";
import { isAutoModeActive } from "../../../utils/permissions/autoModeState.js";
import { getPluginRegistry } from "../../../utils/plugins/pluginLoadState.js";
import {
  hasModuleHookingSite,
  getLoadedModulesForSite,
} from "../../../plugins/hooksModules/loadedModuleFilters.js";
import { matcherTestTarget } from "../../../utils/hooks/matcherGrammar.js";

//@ chunk-9tgt55am.js:43383-43395 placement
var livePageProbeHook = null;
//@ chunk-9tgt55am.js:43395-43450 placement
function isProbedLivePage(slug) {
  return livePageProbeHook != null && livePageProbeHook.isProbedLivePage(slug);
}
//@ chunk-9tgt55am.js:43450-43518 placement
/**
 * 自动回复的节流与开关常量：合并等待默认 60 s、读重试 [5s,15s,30s,60s]、时钟偏差 10 分钟、快确认刷新 3 s，及若干 GrowthBook 开关名。
 */
var DEFAULT_NUMERIC_FLAG = 60;
var TENGU_SORREL_TRELLIS_WEIR = "tengu_sorrel_trellis_weir";
var TENGU_MADRONE_SPINDLE = "tengu_madrone_spindle";
//@ chunk-9tgt55am.js:43518-43553 placement
function isMadroneSpindleEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_MADRONE_SPINDLE, true) !== false;
}
//@ chunk-9tgt55am.js:43553-43602 placement
var TENGU_MADRONE_SPINDLE_PURLIN = "tengu_madrone_spindle_purlin";
var MAX_RATE_LIMIT_MS = 3600000;
//@ chunk-9tgt55am.js:43602-43703 placement
/**
 * 读取自动响应评论的速率上限开关，非法值用默认值并限制在最大值内。
 */
function getAutoReactRateLimit() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    TENGU_MADRONE_SPINDLE_PURLIN,
    BUSY_EDGE_THRESHOLD_MS,
  );
  return typeof featureValue_CACHED_MAY_BE_STALE === "number" &&
    Number.isFinite(featureValue_CACHED_MAY_BE_STALE) &&
    featureValue_CACHED_MAY_BE_STALE > 0
    ? Math.min(featureValue_CACHED_MAY_BE_STALE, MAX_RATE_LIMIT_MS)
    : BUSY_EDGE_THRESHOLD_MS;
}
//@ chunk-9tgt55am.js:43703-43749 placement
var TENGU_MADRONE_SPINDLE_NEWEL = "tengu_madrone_spindle_newel";
var MAX_NEWEL_MS = 60000;
//@ chunk-9tgt55am.js:43749-43784 placement
function isMadroneSpindleNewelEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_MADRONE_SPINDLE_NEWEL, false) === true;
}
//@ chunk-9tgt55am.js:43784-43798 placement
var CLOCK_SKEW_TOLERANCE_MS = 600000;
//@ chunk-9tgt55am.js:43798-43873 placement
function isRecentToClaudeAt(e, t) {
  let timestamp = parseTimestamp(e.toClaudeAt);
  return timestamp !== null && Math.abs(t - timestamp) <= CLOCK_SKEW_TOLERANCE_MS;
}
//@ chunk-9tgt55am.js:43873-43889 placement
var MIN_FLAG_VALUE = 1;
var MAX_FLAG_VALUE = 600;
//@ chunk-9tgt55am.js:43889-44035 placement
/**
 * 读取 GrowthBook 数值开关（允许字符串形式的数字），返回四舍五入后的整数，无效时返回 null。
 */
function getNumericFlag(e) {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(e, null);
  let n =
    typeof featureValue_CACHED_MAY_BE_STALE === "string" && featureValue_CACHED_MAY_BE_STALE.trim() !== ""
      ? Number(featureValue_CACHED_MAY_BE_STALE)
      : featureValue_CACHED_MAY_BE_STALE;
  return typeof n === "number" && Number.isFinite(n) ? Math.round(n) : null;
}
//@ chunk-9tgt55am.js:44035-44178 placement
/**
 * 评论自动回复的最大自动回合数：有覆盖值用覆盖值，否则读 tengu_sorrel_trellis_weir（限制在上下限内），未配置用默认值。
 */
function getMaxAutoTurns() {
  let { maxAutoTurnsOverride } = getLiveState().autoReact;
  if (maxAutoTurnsOverride !== null) return maxAutoTurnsOverride;
  let numericFlag = getNumericFlag(TENGU_SORREL_TRELLIS_WEIR);
  return numericFlag !== null && numericFlag > 0
    ? Math.min(Math.max(numericFlag, MIN_FLAG_VALUE), MAX_FLAG_VALUE)
    : DEFAULT_NUMERIC_FLAG;
}
//@ chunk-9tgt55am.js:44178-44213 placement
async function ownAccount(credentials) {
  return ownAccountUuid(credentials);
}
//@ chunk-9tgt55am.js:44213-44276 placement
function hasCommentsFromOthers(thread, t) {
  return thread.comments.some((comment) => !isOwnPrincipal(comment.account, t));
}
//@ chunk-9tgt55am.js:44276-44520 placement
/**
 * 从评论线程里挑出需要重新判断的评论：未见过的，或者已发给 Claude 但"发给 Claude"时间更新（应重新触发）的，或者文字被改过的。
 */
function selectCommentsToJudge(slug, thread, n) {
  let a = [];
  for (let comment of thread.comments)
    if (!n.seen.has(comment.id)) a.push(comment);
    else if (
      (!isDegradedComment(comment) &&
        comment.toClaudeAt !== undefined &&
        n.sentToClaudeAt.has(comment.id) &&
        shouldFireActivation(n.sentToClaudeAt.get(comment.id) ?? null, comment.toClaudeAt).fire) ||
      commentTextChanged(slug, comment.id, comment.text)
    )
      a.push(comment);
  return a;
}
//@ chunk-9tgt55am.js:44520-44669 placement
/**
 * 记录已判定过的评论（讨论串、id、发给 Claude 的时间、文本与作者分类）。
 */
function recordJudged(slug, threadId, n, a) {
  recordJudgedComments(
    slug,
    n.map((r) => ({
      threadId,
      id: r.id,
      ...(r.toClaudeAt !== undefined && {
        toClaudeAt: r.toClaudeAt,
      }),
      text: r.text,
      authorship: classifyThreadAuthors([r], a),
    })),
  );
}
//@ chunk-9tgt55am.js:44669-44743 placement
/**
 * 自动回复的合并等待 5 s、读重试退避表与 mullion 开关名。
 */
var DEFAULT_COALESCE_MS = 5000;
var DEFAULT_READ_RETRY_DELAYS_MS = [5000, 15000, 30000, 60000];
var TENGU_SORREL_TRELLIS_MULLION = "tengu_sorrel_trellis_mullion";
//@ chunk-9tgt55am.js:44743-44828 placement
function effectiveReadRetryCount() {
  let e = readRetryDelays().length;
  let numericFlag = getNumericFlag(TENGU_SORREL_TRELLIS_MULLION);
  return numericFlag === null ? e : Math.min(Math.max(numericFlag, 0), e);
}
//@ chunk-9tgt55am.js:44828-44839 placement
var RETRY_JITTER_RATIO = 0.5;
//@ chunk-9tgt55am.js:44839-44905 placement
function readRetryDelays() {
  return getLiveState().autoReact.readRetryDelaysMsOverride ?? DEFAULT_READ_RETRY_DELAYS_MS;
}
//@ chunk-9tgt55am.js:44905-45043 placement
/**
 * 计算第 N 次自动回复的退避等待：按退避表取基数乘以 0.7–1.3 随机系数，与服务端建议的等待（加随机放大）取较大者。
 */
function computeAutoReactBackoff(readRetryAttempts, t, n = Math.random) {
  let retryDelays = readRetryDelays();
  let s = (retryDelays[Math.min(readRetryAttempts, retryDelays.length - 1)] ?? 0) * (0.7 + n() * 0.6);
  let d = t === undefined ? 0 : t * (1 + n() * RETRY_JITTER_RATIO);
  return Math.max(s, d);
}
//@ chunk-9tgt55am.js:45043-45093 placement
var DEFAULT_BURST_SCALE_MS = 2000;
var TENGU_SORREL_TRELLIS_FINIAL = "tengu_sorrel_trellis_finial";
var RETRY_CEILING_SLACK_S = 2;
//@ chunk-9tgt55am.js:45093-45137 placement
function ceilRetryDelay(delayMs) {
  return delayMs > 0 ? Math.ceil(delayMs) + RETRY_CEILING_SLACK_S : 0;
}
//@ chunk-9tgt55am.js:45137-45196 placement
function coalesceMs() {
  return getLiveState().autoReact.coalesceMsOverride ?? DEFAULT_COALESCE_MS;
}
//@ chunk-9tgt55am.js:45196-45308 placement
/**
 * 计算自动响应前的确认停留时间：优先测试覆盖值，否则读开关，非法时用默认值，并限制在上限内。
 */
function getConfirmDwellMs() {
  let e = getLiveState().autoReact.confirmDwellMsOverride ?? getNumericFlag(TENGU_SORREL_TRELLIS_FINIAL);
  let t = e !== null && e >= 0 ? e : DEFAULT_BURST_SCALE_MS;
  return Math.min(t, coalesceMs());
}
//@ chunk-9tgt55am.js:45308-45322 placement
var MAX_MAIN_AGENT_RETRIES = 3;
var MAX_AUX_RETRIES = 3;
//@ chunk-9tgt55am.js:45322-45360 placement
function isHumanComment(comment) {
  return getCommentAuthorKind(comment) === "human";
}
//@ chunk-9tgt55am.js:45360-45404 placement
function hasToClaudeAt(e) {
  return e.toClaudeAt !== undefined;
}
//@ chunk-9tgt55am.js:45404-45519 placement
/**
 * 判断评论信息是否不完整：发给 Claude 时间缺失或无法解析，或作者类型未知。
 */
function isDegradedComment(comment) {
  return (
    comment.toClaudeAtDegraded === true ||
    (comment.toClaudeAt !== undefined && parseTimestamp(comment.toClaudeAt) === null) ||
    getCommentAuthorKind(comment) === "unknown"
  );
}
//@ chunk-9tgt55am.js:45519-45660 placement
/**
 * 自动响应推迟原因只打点一次；条件不再成立时清除记录以便下次再报。
 */
function noteDeferOnce(e, t, n) {
  if (!n) {
    e.deferNoticed.delete(t);
    return;
  }
  if (!e.deferNoticed.has(t)) {
    e.deferNoticed.add(t);
    logFeatureSad("artifact_comments_autoreact", t);
  }
}
//@ chunk-9tgt55am.js:50833-51147 placement
function shouldFireActivation(e, t) {
  if (t === null)
    return {
      fire: false,
      record: e,
    };
  let timestamp = parseTimestamp(t);
  if (e === null)
    return timestamp !== null
      ? {
          fire: true,
          record: t,
        }
      : {
          fire: false,
          record: null,
        };
  if (t === e)
    return {
      fire: false,
      record: e,
    };
  let timestamp_2 = parseTimestamp(e);
  if (timestamp_2 !== null && timestamp !== null)
    return timestamp > timestamp_2
      ? {
          fire: true,
          record: t,
        }
      : {
          fire: false,
          record: e,
        };
  if (timestamp !== null)
    return {
      fire: false,
      record: t,
    };
  return {
    fire: false,
    record: e,
  };
}
//@ chunk-9tgt55am.js:51147-51296 placement
function collectActivationStamps(e) {
  return [
    e.activatedAtDegraded !== true ? (e.activatedAt ?? null) : null,
    ...e.comments.map((comment) =>
      comment.toClaudeAtDegraded !== true ? (comment.toClaudeAt ?? null) : null,
    ),
  ];
}
//@ chunk-9tgt55am.js:51296-51379 placement
function raiseStampHighWater(artifactState, thread) {
  for (let n of collectActivationStamps(thread))
    artifactState.stampHighWater = shouldFireActivation(artifactState.stampHighWater, n).record;
}
//@ chunk-9tgt55am.js:51379-51433 placement
function shouldFireOnStamps(thread, liveSightBoundary) {
  return collectActivationStamps(thread).some((n) => shouldFireActivation(liveSightBoundary, n).fire);
}
//@ chunk-9tgt55am.js:51433-51446 placement
var MAX_STAMP_AGE_MS = 30000;
//@ chunk-9tgt55am.js:51446-51522 placement
function heldReplyChainFor(e) {
  return getLiveState().autoReact.artifacts.get(e)?.heldReplyChain ?? null;
}
//@ chunk-9tgt55am.js:51522-51723 placement
function isArtifactScanBusy(slug) {
  let t = getLiveState().wakes.wakes.get(slug);
  return (
    (t !== undefined &&
      (!t.kickSettled ||
        t.inFlightScan !== null ||
        t.readRetryTimer !== null ||
        t.idleRescanCancel !== null ||
        t.idlePassOwed !== null)) ||
    heldReplyChainFor(slug) !== null ||
    hasThreadAgentForSlug(slug)
  );
}
//@ chunk-9tgt55am.js:51723-51856 placement
function isCommentAutoreactOptedIn() {
  let autoReact = getLiveState().autoReact;
  autoReact.optIn ??=
    env.CLAUDE_CODE_ARTIFACT_COMMENTS_AUTOREACT ??
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_sorrel_trellis", false);
  return autoReact.optIn;
}
//@ chunk-9tgt55am.js:51856-51944 placement
function isFastAckEnabled() {
  return (
    env.CLAUDE_CODE_ARTIFACT_COMMENT_FAST_ACK ??
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_gorse_pylon", false)
  );
}
//@ chunk-9tgt55am.js:51944-51993 placement
function isOchreBitternEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ochre_bittern", false);
}
//@ chunk-9tgt55am.js:51993-52069 placement
function autoReactCanUseTool(agentId, artifactState, n) {
  if (!isOchreBitternEnabled() || artifactState.heldReplyDeclined) return null;
  return makeAutoReactCanUseTool(agentId, n);
}
//@ chunk-9tgt55am.js:52069-52324 placement
/**
 * 构造自动回复用的 canUseTool：先走常规权限检查，需要询问时若是子代理或无人值守会话则记为 unanswered 并返回 ask，否则记 answered 并交给交互式询问。
 */
function makeAutoReactCanUseTool(e, t) {
  let permissionPromptPerson = getPermissionPromptPerson();
  if (permissionPromptPerson === null || e !== undefined || isUnattendedInteractiveSession()) return null;
  return async (a, r, s, d, h, y) => {
    let C = y ?? (await hasPermissionsToUseTool(a, r, s, d, h));
    if (C.behavior !== "ask") return C;
    if (s.agentId !== undefined || isUnattendedInteractiveSession()) {
      t.ask = "unanswered";
      return C;
    }
    t.ask = "answered";
    return permissionPromptPerson(a, r, s, d, h, C);
  };
}
//@ chunk-9tgt55am.js:52324-52336 placement
var FAST_ACK_FLAG_REFRESH_MS = 3000;
//@ chunk-9tgt55am.js:52336-52643 placement
function refreshFastAckFlag() {
  let CLAUDE_CODE_ARTIFACT_COMMENT_FAST_ACK = env.CLAUDE_CODE_ARTIFACT_COMMENT_FAST_ACK;
  if (
    CLAUDE_CODE_ARTIFACT_COMMENT_FAST_ACK === false ||
    (CLAUDE_CODE_ARTIFACT_COMMENT_FAST_ACK !== undefined &&
      env.CLAUDE_CODE_ARTIFACT_COMMENT_FAST_ACK_FIXED !== undefined) ||
    hasFreshGrowthBookFeatures()
  )
    return Promise.resolve();
  let autoReact = getLiveState().autoReact;
  autoReact.fastAckFlagRefresh ??= withDeadline(
    refreshGrowthBookFeatures().catch(() => {}),
    autoReact.fastAckFlagRefreshDeadlineMsOverride ?? FAST_ACK_FLAG_REFRESH_MS,
  );
  return autoReact.fastAckFlagRefresh;
}
//@ chunk-9tgt55am.js:53486-53641 placement
/**
 * 判断读取评论是否受权限规则约束（有 deny/ask 规则，或在 MCP 替换模式下 MCP 读评论工具需要询问）。
 */
function isCommentReadGated(context, t, url) {
  let toolPermissionContext = getToolPermissionContext(context);
  let r = {
    action: "comments",
  };
  if (
    artifactCallReadRule(toolPermissionContext, t, url, "deny", r) !== null ||
    artifactCallReadRule(toolPermissionContext, t, url, "ask", r) !== null
  )
    return true;
  if (!isBuiltInArtifactHiddenForMcp()) return false;
  return hasArtifactDenyOrAskRule(context, ARTIFACTS_MCP_READ_COMMENTS_TOOL, true);
}
//@ chunk-9tgt55am.js:53641-53813 placement
function canAutoreactWithoutPrompts(context) {
  let toolPermissionContext = getToolPermissionContext(context);
  let n = isAutoAllowedInMode(artifactsMcpToolRef(ARTIFACTS_MCP_READ_COMMENTS_TOOL), toolPermissionContext);
  return (
    (isCoworkFramePublishSession() && consentMustDeny(context)) ||
    n === "dontAsk" ||
    ((n === "default" || n === "acceptEdits") &&
      (toolPermissionContext.shouldAvoidPermissionPrompts === true ||
        (getIsNonInteractiveSession() && !hasPermissionPromptTool(getPermissionPromptToolName()))))
  );
}
//@ chunk-9tgt55am.js:53813-53856 placement
function hasReplyAllowRule(toolUseContext) {
  return (
    hasArtifactDenyOrAskRule(toolUseContext, ARTIFACTS_MCP_READ_COMMENTS_TOOL, true) ||
    isReplyDeniedByRules(toolUseContext)
  );
}
//@ chunk-9tgt55am.js:53856-53906 placement
function canPostReply(e, t, n) {
  return isCommentReadGated(e, t, n) || (isBuiltInArtifactHiddenForMcp() && isReplyDeniedByRules(e));
}
//@ chunk-9tgt55am.js:53906-54143 placement
/**
 * 收集决定评论自动编辑能否免询问的权限上下文：当前模式是否自动允许、自动模式是否激活、chain-on-allow、是否避免提示、分类器 deny 规则、是否有可能询问的钩子。
 */
function getAutoEditPermissionContext(tool, context) {
  let toolPermissionContext = getToolPermissionContext(context);
  return {
    mode: isAutoAllowedInMode(tool, toolPermissionContext),
    autoActive: isAutoModeActive(),
    chainOnAllow: isChainOnAllowActive(),
    avoidPrompts: toolPermissionContext.shouldAvoidPermissionPrompts === true,
    classifierDenyRules: hasAutoModeClassifierDenyRules(),
    hookMayAsk:
      getPluginRegistry().hooksRespawns.size > 0 ||
      hasModuleHookingSite("tool.check", matcherTestTarget(tool), getLoadedModulesForSite("tool.check")),
  };
}
//@ chunk-9tgt55am.js:54143-54268 placement
/**
 * 只有 auto 模式且激活、没有 chain-on-allow/避免提示/分类器 deny 规则/可能询问的钩子时，自动编辑才可免询问执行。
 */
function canAutoEditWithoutPrompt(autoEditPermissionContext) {
  return (
    autoEditPermissionContext.mode === "auto" &&
    autoEditPermissionContext.autoActive &&
    !autoEditPermissionContext.chainOnAllow &&
    !autoEditPermissionContext.avoidPrompts &&
    !autoEditPermissionContext.classifierDenyRules &&
    !autoEditPermissionContext.hookMayAsk
  );
}
//@ chunk-9tgt55am.js:54268-54406 placement
function canAskForReply(e, t, n) {
  let toolPermissionContext = getToolPermissionContext(n);
  return (
    canAutoEditWithoutPrompt(getAutoEditPermissionContext(e, n)) &&
    n.hookAskFloor !== true &&
    n.requireCanUseTool !== true &&
    getAskRuleForTool(toolPermissionContext, e) === null &&
    matchToolRule(toolPermissionContext, e, t, "ask") === null
  );
}
export {
  hasReplyAllowRule,
  canPostReply,
  canAutoreactWithoutPrompts,
  canAskForReply,
  isCommentAutoreactOptedIn,
  isDegradedComment,
  isFastAckEnabled,
  getAutoEditPermissionContext,
  canAutoEditWithoutPrompt,
  isCommentReadGated,
  getMaxAutoTurns,
  coalesceMs,
  getConfirmDwellMs,
  ceilRetryDelay,
  effectiveReadRetryCount,
  computeAutoReactBackoff,
  refreshFastAckFlag,
  getAutoReactRateLimit,
  isProbedLivePage,
  isHumanComment,
  shouldFireActivation,
  isMadroneSpindleNewelEnabled,
  isRecentToClaudeAt,
  MAX_NEWEL_MS,
  MAX_AUX_RETRIES,
  MAX_STAMP_AGE_MS,
  autoReactCanUseTool,
  shouldFireOnStamps,
  raiseStampHighWater,
  recordJudged,
  ownAccount,
  noteDeferOnce,
  isMadroneSpindleEnabled,
  selectCommentsToJudge,
  hasToClaudeAt,
  MAX_MAIN_AGENT_RETRIES,
  isOchreBitternEnabled,
  hasCommentsFromOthers,
  livePageProbeHook,
  isArtifactScanBusy,
};
