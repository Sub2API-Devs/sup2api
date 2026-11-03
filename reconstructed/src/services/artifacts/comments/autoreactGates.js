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
import { A_n } from "../../../utils/plugins/hooksModulesRollout.js";
import { parseTimestamp, getCommentAuthorKind } from "./commentState.js";
import { getLiveState } from "../../liveReplica/liveReplica.js";
import { ownAccountUuid, isOwnPrincipal, classifyThreadAuthors } from "./commentAuthorship.js";
import { commentTextChanged, recordJudgedComments } from "../shareEntries.js";
import { logFeatureSad } from "../../analytics/featureTelemetry.js";
import { hasThreadAgentForSlug } from "./backgroundAgent.js";
import { env } from "../../../utils/env.js";
import { zjt, zue } from "../../../utils/permissions/permissionPromptHost.js";
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
import { go, mn } from "./threadPrompts.js";
import { isAutoAllowedInMode } from "../../../utils/permissions/browserToolNames.js";
import { isCoworkFramePublishSession } from "../artifactToolGates.js";
import { getIsNonInteractiveSession, getPermissionPromptToolName } from "../../../bootstrap/state.js";
import { isAutoModeActive } from "../../../utils/permissions/autoModeState.js";
import { getPluginRegistry } from "../../../utils/plugins/pluginLoadState.js";
import {
  hasModuleHookingSite,
  getLoadedModulesForSite,
} from "../../../plugins/hooksModules/loadedModuleFilters.js";
import { KW } from "../../../utils/hooks/matcherGrammar.js";

//@ chunk-9tgt55am.js:43383-43395 placement
var sn = null;
//@ chunk-9tgt55am.js:43395-43450 placement
function xt(e) {
  return sn != null && sn.isProbedLivePage(e);
}
//@ chunk-9tgt55am.js:43450-43518 placement
var ws = 60,
  TENGU_SORREL_TRELLIS_WEIR = "tengu_sorrel_trellis_weir",
  TENGU_MADRONE_SPINDLE = "tengu_madrone_spindle";
//@ chunk-9tgt55am.js:43518-43553 placement
function Xn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_MADRONE_SPINDLE, !0) !== !1;
}
//@ chunk-9tgt55am.js:43553-43602 placement
var TENGU_MADRONE_SPINDLE_PURLIN = "tengu_madrone_spindle_purlin",
  vs = 3600000;
/**
 * 读取自动响应评论的速率上限开关，非法值用默认值并限制在最大值内。
 */
//@ chunk-9tgt55am.js:43602-43703 placement
function getAutoReactRateLimit() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_MADRONE_SPINDLE_PURLIN, A_n);
  return typeof e === "number" && Number.isFinite(e) && e > 0 ? Math.min(e, vs) : A_n;
}
//@ chunk-9tgt55am.js:43703-43749 placement
var TENGU_MADRONE_SPINDLE_NEWEL = "tengu_madrone_spindle_newel",
  Rs = 60000;
//@ chunk-9tgt55am.js:43749-43784 placement
function Cs() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_MADRONE_SPINDLE_NEWEL, !1) === !0;
}
//@ chunk-9tgt55am.js:43784-43798 placement
var Os = 600000;
//@ chunk-9tgt55am.js:43798-43873 placement
function io(e, t) {
  let n = parseTimestamp(e.toClaudeAt);
  return n !== null && Math.abs(t - n) <= Os;
}
//@ chunk-9tgt55am.js:43873-43889 placement
var Es = 1,
  Ps = 600;
/**
 * 读取 GrowthBook 数值开关（允许字符串形式的数字），返回四舍五入后的整数，无效时返回 null。
 */
//@ chunk-9tgt55am.js:43889-44035 placement
function getNumericFlag(e) {
  let t = getFeatureValue_CACHED_MAY_BE_STALE(e, null),
    n = typeof t === "string" && t.trim() !== "" ? Number(t) : t;
  return typeof n === "number" && Number.isFinite(n) ? Math.round(n) : null;
}
/**
 * 评论自动回复的最大自动回合数：有覆盖值用覆盖值，否则读 tengu_sorrel_trellis_weir（限制在上下限内），未配置用默认值。
 */
//@ chunk-9tgt55am.js:44035-44178 placement
function getMaxAutoTurns() {
  let { maxAutoTurnsOverride: maxAutoTurnsOverride } = getLiveState().autoReact;
  if (maxAutoTurnsOverride !== null) return maxAutoTurnsOverride;
  let t = getNumericFlag(TENGU_SORREL_TRELLIS_WEIR);
  return t !== null && t > 0 ? Math.min(Math.max(t, Es), Ps) : ws;
}
//@ chunk-9tgt55am.js:44178-44213 placement
async function ft(e) {
  return ownAccountUuid(e);
}
//@ chunk-9tgt55am.js:44213-44276 placement
function na(e, t) {
  return e.comments.some((comment) => !isOwnPrincipal(comment.account, t));
}
/**
 * 从评论线程里挑出需要重新判断的评论：未见过的，或者已发给 Claude 但"发给 Claude"时间更新（应重新触发）的，或者文字被改过的。
 */
//@ chunk-9tgt55am.js:44276-44520 placement
function selectCommentsToJudge(e, t, n) {
  let a = [];
  for (let comment of t.comments)
    if (!n.seen.has(comment.id)) a.push(comment);
    else if (
      (!isDegradedComment(comment) &&
        comment.toClaudeAt !== void 0 &&
        n.sentToClaudeAt.has(comment.id) &&
        shouldFireActivation(n.sentToClaudeAt.get(comment.id) ?? null, comment.toClaudeAt).fire) ||
      commentTextChanged(e, comment.id, comment.text)
    )
      a.push(comment);
  return a;
}
/**
 * 记录已判定过的评论（讨论串、id、发给 Claude 的时间、文本与作者分类）。
 */
//@ chunk-9tgt55am.js:44520-44669 placement
function recordJudged(e, t, n, a) {
  recordJudgedComments(
    e,
    n.map((r) => ({
      threadId: t,
      id: r.id,
      ...(r.toClaudeAt !== void 0 && { toClaudeAt: r.toClaudeAt }),
      text: r.text,
      authorship: classifyThreadAuthors([r], a),
    })),
  );
}
//@ chunk-9tgt55am.js:44669-44743 placement
var Is = 5000,
  Ns = [5000, 15000, 30000, 60000],
  TENGU_SORREL_TRELLIS_MULLION = "tengu_sorrel_trellis_mullion";
//@ chunk-9tgt55am.js:44743-44828 placement
function Ls() {
  let e = oa().length,
    t = getNumericFlag(TENGU_SORREL_TRELLIS_MULLION);
  return t === null ? e : Math.min(Math.max(t, 0), e);
}
//@ chunk-9tgt55am.js:44828-44839 placement
var Us = 0.5;
//@ chunk-9tgt55am.js:44839-44905 placement
function oa() {
  return getLiveState().autoReact.readRetryDelaysMsOverride ?? Ns;
}
/**
 * 计算第 N 次自动回复的退避等待：按退避表取基数乘以 0.7–1.3 随机系数，与服务端建议的等待（加随机放大）取较大者。
 */
//@ chunk-9tgt55am.js:44905-45043 placement
function computeAutoReactBackoff(e, t, n = Math.random) {
  let a = oa(),
    s = (a[Math.min(e, a.length - 1)] ?? 0) * (0.7 + n() * 0.6),
    d = t === void 0 ? 0 : t * (1 + n() * Us);
  return Math.max(s, d);
}
//@ chunk-9tgt55am.js:45043-45093 placement
var Hs = 2000,
  TENGU_SORREL_TRELLIS_FINIAL = "tengu_sorrel_trellis_finial",
  Gs = 2;
//@ chunk-9tgt55am.js:45093-45137 placement
function Jn(e) {
  return e > 0 ? Math.ceil(e) + Gs : 0;
}
//@ chunk-9tgt55am.js:45137-45196 placement
function ra() {
  return getLiveState().autoReact.coalesceMsOverride ?? Is;
}
/**
 * 计算自动响应前的确认停留时间：优先测试覆盖值，否则读开关，非法时用默认值，并限制在上限内。
 */
//@ chunk-9tgt55am.js:45196-45308 placement
function getConfirmDwellMs() {
  let e = getLiveState().autoReact.confirmDwellMsOverride ?? getNumericFlag(TENGU_SORREL_TRELLIS_FINIAL),
    t = e !== null && e >= 0 ? e : Hs;
  return Math.min(t, ra());
}
//@ chunk-9tgt55am.js:45308-45322 placement
var Kr = 3,
  aa = 3;
//@ chunk-9tgt55am.js:45322-45360 placement
function rt(e) {
  return getCommentAuthorKind(e) === "human";
}
//@ chunk-9tgt55am.js:45360-45404 placement
function qs(e) {
  return e.toClaudeAt !== void 0;
}
/**
 * 判断评论信息是否不完整：发给 Claude 时间缺失或无法解析，或作者类型未知。
 */
//@ chunk-9tgt55am.js:45404-45519 placement
function isDegradedComment(e) {
  return (
    e.toClaudeAtDegraded === !0 ||
    (e.toClaudeAt !== void 0 && parseTimestamp(e.toClaudeAt) === null) ||
    getCommentAuthorKind(e) === "unknown"
  );
}
/**
 * 自动响应推迟原因只打点一次；条件不再成立时清除记录以便下次再报。
 */
//@ chunk-9tgt55am.js:45519-45660 placement
function noteDeferOnce(e, t, n) {
  if (!n) {
    e.deferNoticed.delete(t);
    return;
  }
  if (!e.deferNoticed.has(t)) (e.deferNoticed.add(t), logFeatureSad("artifact_comments_autoreact", t));
}
//@ chunk-9tgt55am.js:50833-51147 placement
function shouldFireActivation(e, t) {
  if (t === null) return { fire: !1, record: e };
  let n = parseTimestamp(t);
  if (e === null) return n !== null ? { fire: !0, record: t } : { fire: !1, record: null };
  if (t === e) return { fire: !1, record: e };
  let a = parseTimestamp(e);
  if (a !== null && n !== null) return n > a ? { fire: !0, record: t } : { fire: !1, record: e };
  if (n !== null) return { fire: !1, record: t };
  return { fire: !1, record: e };
}
//@ chunk-9tgt55am.js:51147-51296 placement
function collectActivationStamps(e) {
  return [
    e.activatedAtDegraded !== !0 ? (e.activatedAt ?? null) : null,
    ...e.comments.map((comment) => (comment.toClaudeAtDegraded !== !0 ? (comment.toClaudeAt ?? null) : null)),
  ];
}
//@ chunk-9tgt55am.js:51296-51379 placement
function jr(e, t) {
  for (let n of collectActivationStamps(t))
    e.stampHighWater = shouldFireActivation(e.stampHighWater, n).record;
}
//@ chunk-9tgt55am.js:51379-51433 placement
function zs(e, t) {
  return collectActivationStamps(e).some((n) => shouldFireActivation(t, n).fire);
}
//@ chunk-9tgt55am.js:51433-51446 placement
var ua = 30000;
//@ chunk-9tgt55am.js:51446-51522 placement
function Xs(e) {
  return getLiveState().autoReact.artifacts.get(e)?.heldReplyChain ?? null;
}
//@ chunk-9tgt55am.js:51522-51723 placement
function isArtifactScanBusy(e) {
  let t = getLiveState().wakes.wakes.get(e);
  return (
    (t !== void 0 &&
      (!t.kickSettled ||
        t.inFlightScan !== null ||
        t.readRetryTimer !== null ||
        t.idleRescanCancel !== null ||
        t.idlePassOwed !== null)) ||
    Xs(e) !== null ||
    hasThreadAgentForSlug(e)
  );
}
//@ chunk-9tgt55am.js:51723-51856 placement
function isCommentAutoreactOptedIn() {
  let autoReact = getLiveState().autoReact;
  return (
    (autoReact.optIn ??=
      env.CLAUDE_CODE_ARTIFACT_COMMENTS_AUTOREACT ??
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_sorrel_trellis", !1)),
    autoReact.optIn
  );
}
//@ chunk-9tgt55am.js:51856-51944 placement
function lo() {
  return (
    env.CLAUDE_CODE_ARTIFACT_COMMENT_FAST_ACK ?? getFeatureValue_CACHED_MAY_BE_STALE("tengu_gorse_pylon", !1)
  );
}
//@ chunk-9tgt55am.js:51944-51993 placement
function ma() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ochre_bittern", !1);
}
//@ chunk-9tgt55am.js:51993-52069 placement
function uo(e, t, n) {
  if (!ma() || t.heldReplyDeclined) return null;
  return makeAutoReactCanUseTool(e, n);
}
/**
 * 构造自动回复用的 canUseTool：先走常规权限检查，需要询问时若是子代理或无人值守会话则记为 unanswered 并返回 ask，否则记 answered 并交给交互式询问。
 */
//@ chunk-9tgt55am.js:52069-52324 placement
function makeAutoReactCanUseTool(e, t) {
  let n = zjt();
  if (n === null || e !== void 0 || isUnattendedInteractiveSession()) return null;
  return async (a, r, s, d, h, y) => {
    let C = y ?? (await hasPermissionsToUseTool(a, r, s, d, h));
    if (C.behavior !== "ask") return C;
    if (s.agentId !== void 0 || isUnattendedInteractiveSession()) return ((t.ask = "unanswered"), C);
    return ((t.ask = "answered"), n(a, r, s, d, h, C));
  };
}
//@ chunk-9tgt55am.js:52324-52336 placement
var Qs = 3000;
//@ chunk-9tgt55am.js:52336-52643 placement
function refreshFastAckFlag() {
  let CLAUDE_CODE_ARTIFACT_COMMENT_FAST_ACK = env.CLAUDE_CODE_ARTIFACT_COMMENT_FAST_ACK;
  if (
    CLAUDE_CODE_ARTIFACT_COMMENT_FAST_ACK === !1 ||
    (CLAUDE_CODE_ARTIFACT_COMMENT_FAST_ACK !== void 0 &&
      env.CLAUDE_CODE_ARTIFACT_COMMENT_FAST_ACK_FIXED !== void 0) ||
    hasFreshGrowthBookFeatures()
  )
    return Promise.resolve();
  let autoReact = getLiveState().autoReact;
  return (
    (autoReact.fastAckFlagRefresh ??= withDeadline(
      refreshGrowthBookFeatures().catch(() => {}),
      autoReact.fastAckFlagRefreshDeadlineMsOverride ?? Qs,
    )),
    autoReact.fastAckFlagRefresh
  );
}
/**
 * 判断读取评论是否受权限规则约束（有 deny/ask 规则，或在 MCP 替换模式下 MCP 读评论工具需要询问）。
 */
//@ chunk-9tgt55am.js:53486-53641 placement
function isCommentReadGated(e, t, n) {
  let a = getToolPermissionContext(e),
    r = { action: "comments" };
  if (artifactCallReadRule(a, t, n, "deny", r) !== null || artifactCallReadRule(a, t, n, "ask", r) !== null)
    return !0;
  if (!isBuiltInArtifactHiddenForMcp()) return !1;
  return go(e, ARTIFACTS_MCP_READ_COMMENTS_TOOL, !0);
}
//@ chunk-9tgt55am.js:53641-53813 placement
function canAutoreactWithoutPrompts(e) {
  let t = getToolPermissionContext(e),
    n = isAutoAllowedInMode(artifactsMcpToolRef(ARTIFACTS_MCP_READ_COMMENTS_TOOL), t);
  return (
    (isCoworkFramePublishSession() && consentMustDeny(e)) ||
    n === "dontAsk" ||
    ((n === "default" || n === "acceptEdits") &&
      (t.shouldAvoidPermissionPrompts === !0 ||
        (getIsNonInteractiveSession() && !zue(getPermissionPromptToolName()))))
  );
}
//@ chunk-9tgt55am.js:53813-53856 placement
function hasReplyAllowRule(e) {
  return go(e, ARTIFACTS_MCP_READ_COMMENTS_TOOL, !0) || mn(e);
}
//@ chunk-9tgt55am.js:53856-53906 placement
function canPostReply(e, t, n) {
  return isCommentReadGated(e, t, n) || (isBuiltInArtifactHiddenForMcp() && mn(e));
}
/**
 * 收集决定评论自动编辑能否免询问的权限上下文：当前模式是否自动允许、自动模式是否激活、chain-on-allow、是否避免提示、分类器 deny 规则、是否有可能询问的钩子。
 */
//@ chunk-9tgt55am.js:53906-54143 placement
function getAutoEditPermissionContext(e, t) {
  let n = getToolPermissionContext(t);
  return {
    mode: isAutoAllowedInMode(e, n),
    autoActive: isAutoModeActive(),
    chainOnAllow: isChainOnAllowActive(),
    avoidPrompts: n.shouldAvoidPermissionPrompts === !0,
    classifierDenyRules: hasAutoModeClassifierDenyRules(),
    hookMayAsk:
      getPluginRegistry().hooksRespawns.size > 0 ||
      hasModuleHookingSite("tool.check", KW(e), getLoadedModulesForSite("tool.check")),
  };
}
/**
 * 只有 auto 模式且激活、没有 chain-on-allow/避免提示/分类器 deny 规则/可能询问的钩子时，自动编辑才可免询问执行。
 */
//@ chunk-9tgt55am.js:54143-54268 placement
function canAutoEditWithoutPrompt(e) {
  return (
    e.mode === "auto" &&
    e.autoActive &&
    !e.chainOnAllow &&
    !e.avoidPrompts &&
    !e.classifierDenyRules &&
    !e.hookMayAsk
  );
}
//@ chunk-9tgt55am.js:54268-54406 placement
function canAskForReply(e, t, n) {
  let a = getToolPermissionContext(n);
  return (
    canAutoEditWithoutPrompt(getAutoEditPermissionContext(e, n)) &&
    n.hookAskFloor !== !0 &&
    n.requireCanUseTool !== !0 &&
    getAskRuleForTool(a, e) === null &&
    matchToolRule(a, e, t, "ask") === null
  );
}

export {
  hasReplyAllowRule,
  canPostReply,
  canAutoreactWithoutPrompts,
  canAskForReply,
  isCommentAutoreactOptedIn,
  isDegradedComment,
  lo,
  getAutoEditPermissionContext,
  canAutoEditWithoutPrompt,
  isCommentReadGated,
  getMaxAutoTurns,
  ra,
  getConfirmDwellMs,
  Jn,
  Ls,
  computeAutoReactBackoff,
  refreshFastAckFlag,
  getAutoReactRateLimit,
  xt,
  rt,
  shouldFireActivation,
  Cs,
  io,
  Rs,
  aa,
  ua,
  uo,
  zs,
  jr,
  recordJudged,
  ft,
  noteDeferOnce,
  Xn,
  selectCommentsToJudge,
  qs,
  Kr,
  ma,
  na,
  sn,
  isArtifactScanBusy,
};
