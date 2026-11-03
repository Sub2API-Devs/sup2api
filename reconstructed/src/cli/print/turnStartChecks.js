/**
 * cli/print/turnStartChecks.ts
 *
 * 2.1.316 新增：回合开始前检查（账号插件、提示建议、云插件开关、SDK MCP 等待）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (31)
 * attribution: placement 31
 */
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
} from "crypto";
import {
  getAdminRequestPhase,
  adminRequestKeyForRateLimit,
  isAdminLimitRequestGateOn,
  isSameAdminRequestKey,
  bN,
  setAdminRequestPhase,
  wN,
  getAdminRequestState,
  readAdminLimitRequestConfig,
  vN,
  isValidAdminRequestLabel,
  subscribeAdminRequestPhase,
} from "./adminRequestFrames.js";
import { getSubscriptionType, isExtraUsageAllowed } from "../../utils/auth.js";
import { isVsCodeTopSession } from "../../utils/sessionShape.js";
import { isFirstPartyApiBackend } from "../../utils/model/providers.js";
import { isConsumerPlan } from "../../utils/planTiers.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import {
  getLimitsAccountEpoch,
  getCurrentLimits,
  onLimitsStatusChanged,
  onQuotaRejected,
} from "../../services/claudeAiLimits.js";
import { withDeadline } from "../../utils/sleep.js";
import { runExtraUsage } from "../../commands/extra-usage/extra-usage-core.js";
import { logError } from "../../utils/log.js";
import { toError, errorMessage } from "../../utils/errors.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { fileAdminLimitRequest as fileAdminLimitRequest_2 } from "../../services/api/adminRequests.js";
import { oPs, getOfferBanner, Jre } from "../../services/usageCreditOffers.js";
import {
  buildRateLimitInfo,
  forwardRateLimitEventToBridge,
  Ikr,
  createRateLimitEventThrottle,
} from "./rateLimitForwarding.js";
import { logForDebugging } from "../../utils/debug.js";
import { isQuotaRejectedReemitEnabled } from "../../bridge/bridgeGates.js";
import { setTaskNotificationListener, enqueueTaskNotification } from "../../utils/task/taskNotifications.js";
import { A4e, Npe } from "../../services/mcp/client.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { Br, ayi } from "../../utils/startupTiming.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import {
  logSuggestionOutcome,
  logSuggestionSuppressed,
  tryGenerateSuggestion,
} from "../../services/PromptSuggestion/promptSuggestion.js";
import { env } from "../../utils/env.js";
import { getSessionId, getSyncedPluginReloadDebt, getSyncedPluginDirs } from "../../bootstrap/state.js";
import { getLastCacheSafeParams, isMainThreadCacheWarm } from "../../utils/forkedAgent.js";
import { getTurnOrigin } from "../../utils/messages/promptOrigin.js";
import { isSessionRefsSyncEnabled } from "../../utils/claudeAiSync/sessionRefsGate.js";
import { sJ, wie, Hkt, Hee, eot } from "../../services/plugins/accountSync/syncedPluginHooks.js";
import { Jbt, isSkillsAsPluginsActive, rerunPluginsSync } from "../../utils/claudeAiSync/skillsSync.js";
import {
  listAccountPlugins,
  listErrorTelemetry,
  pluginListFingerprint,
} from "../../services/plugins/accountSync/listPlugins.js";
import { headlessProfilerCheckpoint } from "../../utils/headlessProfiler.js";
import { startEventLoopLagMonitor, bjn } from "../../utils/eventLoopLag.js";
import { awaitFirstSkillsList } from "../../services/skillsSync/skillsSync.js";
import { addStartupContext } from "../../utils/startupProfiler.js";
import { remoteToolsState } from "../../remote/tools/callResults.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { J_ } from "../../utils/plugins/marketplaceNames.js";
import { waitForOrganizationAnswer, askOrganizationOnce } from "../../utils/plugins/commandSource.js";
import { getPrefixServerKey } from "../../components/agents/ToolSelector.js";
import { count } from "../../utils/collections.js";
import { isSelfHostedRemoteEnvironment } from "../../utils/remoteEnvironment.js";
import { switchOffMcpServers, getSwitchedOffMcpServers } from "../../services/mcp/config.js";
import { NoProjectDirectoryError } from "../../bootstrap/sessionSlices.js";
import {
  reconnectMcpServerByName,
  markServerDisabled as markServerDisabled_2,
} from "./mcpControlRequests.js";
import { isClaudeInChromeMCPServer } from "../../utils/claudeInChrome/common.js";
import { normalizeMessage } from "../../utils/queryHelpers.js";
import { emitLoadError } from "../print.js";
import { isPlainObject as isPlainObject_2 } from "../../utils/isPlainObject.js";
import { TASK_CREATE_TOOL_NAME } from "../../tools/TaskCreateTool/constants.js";
import { coerceTaskCreateInput } from "../../tools/TaskCreateTool/inputAliases.js";
import { normalizeTaskInputAliases } from "../../tools/TaskUpdateTool/inputAliases.js";
import { extractTextContent_2 } from "../../utils/messages.js";
import { TASK_UPDATE_TOOL_NAME } from "../../tools/TaskUpdateTool/constants.js";
import { TASK_CREATED_RE } from "../../utils/task/framework.js";

/**
 * 遇到组织/席位额度上限的限流事件时，评估是否可在 IDE 横幅中"向管理员申请额度"。
 */
//@ chunk-tyg7f3ek.js:181110-181791 placement
function evaluateAdminRequestWall(e) {
  let n = getAdminRequestPhase(),
    r = adminRequestKeyForRateLimit(e),
    s = getSubscriptionType();
  if (
    r === null ||
    !isAdminLimitRequestGateOn() ||
    !isVsCodeTopSession() ||
    !isFirstPartyApiBackend() ||
    (s !== "team" && s !== "enterprise") ||
    isConsumerPlan() ||
    !isExtraUsageAllowed() ||
    (e.upgradePaths !== void 0 && !e.upgradePaths.includes("overage")) ||
    isEssentialTrafficOnly()
  )
    return;
  let h = { key: r, reason: e.overageDisabledReason ?? "unknown", accountEpoch: getLimitsAccountEpoch() },
    y = null;
  if (n.phase !== "idle" && isSameAdminRequestKey(n.wall, h))
    switch (n.phase) {
      case "checking":
      case "sending":
        return;
      case "quiet":
      case "ready":
      case "sent":
        if (Date.now() - n.settledAt < bN) return;
        y = n;
    }
  else if (n.phase === "sending") return;
  (setAdminRequestPhase({ phase: "checking", wall: h, standing: y }),
    trackAdminRequest(
      withDeadline(
        runExtraUsage({ openInBrowser: !1 }, void 0).then(
          (S) => ({ outcome: "answered", result: S }),
          (S) => (logError(toError(S)), { outcome: "threw" }),
        ),
        wN,
      ).then((S) => {
        settleAdminRequestCheck(h, S ?? { outcome: "timed_out" }, y !== null);
      }),
    ));
}
//@ chunk-tyg7f3ek.js:181791-181902 placement
function trackAdminRequest(e) {
  let n = getAdminRequestState(),
    r = e
      .catch((s) => {
        logError(toError(s));
      })
      .finally(() => {
        if (n.pending === r) n.pending = null;
      });
  n.pending = r;
}
//@ chunk-tyg7f3ek.js:181902-182987 placement
function settleAdminRequestCheck(e, n, r) {
  let s = getAdminRequestPhase();
  if (s.phase !== "checking" || !isSameAdminRequestKey(s.wall, e)) return;
  let now = Date.now(),
    standing = s.standing;
  switch (n.outcome) {
    case "timed_out":
    case "threw": {
      let L = n.outcome === "timed_out" ? "checks_timeout" : "checks_failed";
      (logFeatureBad("ide_admin_limit_request", L),
        setAdminRequestPhase(
          standing === null
            ? { phase: "quiet", wall: e, cause: L, settledAt: now }
            : { ...standing, settledAt: now },
        ));
      return;
    }
    case "answered":
      break;
  }
  let S = n.result,
    R = adminRequestVerdict(S, e.reason);
  if (R === "usage_unread" && standing !== null) {
    setAdminRequestPhase({ ...standing, settledAt: now });
    return;
  }
  if (R === "nothing_to_file" || R === "usage_unread") {
    setAdminRequestPhase({ phase: "quiet", wall: e, cause: R, settledAt: now });
    return;
  }
  let w = readAdminLimitRequestConfig(),
    P = S.type === "confirm-admin-request" ? S.checked : !0;
  if (
    (logEvent("tengu_tallow_quoit_wall", {
      surface: lit("ide_banner"),
      reason: fromEnum(e.reason),
      verdict: fromEnum(R),
      offered: w !== null,
      checked: P,
      recheck: r,
    }),
    w === null)
  ) {
    setAdminRequestPhase({ phase: "quiet", wall: e, cause: "flag_off", settledAt: now });
    return;
  }
  if (standing?.phase === "sent" && (R === "pending" || (S.type === "confirm-admin-request" && !S.checked))) {
    setAdminRequestPhase({ ...standing, copy: w, settledAt: now });
    return;
  }
  setAdminRequestPhase({
    phase: "ready",
    wall: e,
    verdict: R,
    extraUsage: S.type === "confirm-admin-request" ? S.extraUsage : void 0,
    copy: w,
    checked: P,
    settledAt: now,
    lastFileFailed: !1,
    revision: 0,
  });
}
//@ chunk-tyg7f3ek.js:182987-183389 placement
function adminRequestVerdict(e, n) {
  switch (e.type) {
    case "confirm-admin-request":
      if (e.extraUsage === void 0) return "usage_unread";
      if (e.extraUsage === null) return "nothing_to_file";
      if (n === "org_level_disabled_until" && !(e.extraUsage.is_enabled && !e.extraUsage.disabled_reason))
        return "nothing_to_file";
      return "can_ask";
    case "message":
      return e.reason === "pending" ? "pending" : "nothing_to_file";
    case "browser-opened":
      return "nothing_to_file";
  }
}
//@ chunk-tyg7f3ek.js:183389-183796 placement
function adminRequestBannerState(e) {
  switch (e.phase) {
    case "quiet":
      return;
    case "ready":
      return {
        state: e.verdict,
        label: e.copy.label,
        doneLabel: e.copy.doneLabel,
        confirm: e.copy.confirm,
        confirmPrompt: e.copy.confirmPrompt,
        ...(e.lastFileFailed && { lastFileFailed: !0 }),
        ...(e.revision > 0 && { revision: e.revision }),
      };
    case "sent":
      return {
        state: "sent",
        label: e.copy.label,
        doneLabel: e.copy.doneLabel,
        confirm: e.copy.confirm,
        confirmPrompt: e.copy.confirmPrompt,
      };
  }
}
//@ chunk-tyg7f3ek.js:183796-184193 placement
function adminRequestStateForEvent(e) {
  let n = adminRequestKeyForRateLimit(e),
    r = getAdminRequestPhase();
  if (
    n === null ||
    r.phase === "idle" ||
    r.wall.key !== n ||
    r.wall.accountEpoch !== getLimitsAccountEpoch() ||
    !isAdminLimitRequestGateOn() ||
    isEssentialTrafficOnly()
  )
    return;
  switch (r.phase) {
    case "checking":
      return r.standing === null ? void 0 : adminRequestBannerState(r.standing);
    case "quiet":
    case "ready":
    case "sent":
      return adminRequestBannerState(r);
    case "sending":
      return {
        state: "sending",
        label: r.copy.label,
        doneLabel: r.copy.doneLabel,
        confirm: r.copy.confirm,
        confirmPrompt: r.copy.confirmPrompt,
      };
  }
}
/**
 * 用户确认后提交"向管理员申请额度"请求并上报 tengu_tallow_quoit_filed。
 */
//@ chunk-tyg7f3ek.js:184193-184895 placement
function fileAdminLimitRequest() {
  let e = getAdminRequestPhase(),
    n = e.phase === "ready" ? e : e.phase === "checking" && e.standing?.phase === "ready" ? e.standing : null;
  if (n === null || n.verdict !== "can_ask") {
    logFeatureBad("ide_admin_limit_request", "click_without_ask");
    return;
  }
  let r = !isAdminLimitRequestGateOn()
    ? "click_gate_off"
    : isEssentialTrafficOnly() || !isFirstPartyApiBackend()
      ? "click_traffic_off"
      : n.wall.accountEpoch !== getLimitsAccountEpoch()
        ? "click_other_account"
        : n.wall.key !== adminRequestKeyForRateLimit(getCurrentLimits())
          ? "click_stale_block"
          : null;
  if (r !== null) {
    logFeatureBad("ide_admin_limit_request", r);
    let R = { ...n, lastFileFailed: !0, revision: n.revision + 1 };
    setAdminRequestPhase(e.phase === "checking" ? { ...e, standing: R } : R);
    return;
  }
  let { wall: wall, extraUsage: extraUsage, copy: copy } = n;
  setAdminRequestPhase({ phase: "sending", wall: wall, extraUsage: extraUsage, copy: copy });
  let S = !1;
  trackAdminRequest(
    withDeadline(
      fileAdminLimitRequest_2(extraUsage, void 0, (R) => {
        ((S = !0), markAdminRequestSent(wall, R));
      }),
      vN,
    ).then((R) => {
      reportAdminRequestFiled(wall, R?.outcome ?? (S ? "granted" : "failed"));
    }),
  );
}
//@ chunk-tyg7f3ek.js:184895-185073 placement
function markAdminRequestSent(e, n) {
  let r = getAdminRequestPhase();
  if (r.phase !== "sending" || !isSameAdminRequestKey(r.wall, e)) return;
  setAdminRequestPhase({
    phase: "sent",
    wall: e,
    copy: isValidAdminRequestLabel(n) ? { ...r.copy, doneLabel: n } : r.copy,
    alreadyFiled: !1,
    settledAt: Date.now(),
  });
}
//@ chunk-tyg7f3ek.js:185073-185803 placement
function reportAdminRequestFiled(e, n) {
  let r = n === "filed" || n === "already_filed" || n === "granted";
  if ((logEvent("tengu_tallow_quoit_filed", { surface: lit("ide_banner"), outcome: fromEnum(n) }), r))
    logFeatureOk("ide_admin_limit_request");
  else logFeatureBad("ide_admin_limit_request", n);
  let s = getAdminRequestPhase();
  if (n === "granted" && s.phase === "sent" && isSameAdminRequestKey(s.wall, e)) {
    evaluateAdminRequestWall(getCurrentLimits());
    return;
  }
  if (s.phase !== "sending" || !isSameAdminRequestKey(s.wall, e)) return;
  let now = Date.now();
  switch (n) {
    case "granted":
    case "filed":
    case "already_filed":
      setAdminRequestPhase({
        phase: "sent",
        wall: e,
        copy: s.copy,
        alreadyFiled: n === "already_filed",
        settledAt: now,
      });
      break;
    case "refused":
      setAdminRequestPhase({ phase: "quiet", wall: e, cause: "refused", settledAt: now });
      break;
    case "failed":
      setAdminRequestPhase({
        phase: "ready",
        wall: e,
        verdict: "can_ask",
        extraUsage: s.extraUsage,
        copy: s.copy,
        checked: !0,
        settledAt: now,
        lastFileFailed: !0,
        revision: 0,
      });
      break;
  }
  evaluateAdminRequestWall(getCurrentLimits());
}
/**
 * 把限流事件转成 SDK rate_limit_event 帧发给宿主，并附带额度申请横幅状态。
 */
//@ chunk-tyg7f3ek.js:185803-186643 placement
function createRateLimitFrameRelay({ emit: emit, sessionState: sessionState, bridgeHandle: bridgeHandle }) {
  let s = null,
    h = void 0,
    y = !1,
    S = (G) => {
      let Z = y;
      y = !0;
      try {
        let re = G.status === "rejected";
        if (re) oPs(G);
        evaluateAdminRequestWall(G);
        let Ae = re ? adminRequestStateForEvent(G) : void 0,
          Ue = buildRateLimitInfo(G, re ? getOfferBanner() : void 0, Ae);
        if (!Ue) return;
        ((s = re ? G : null), (h = Ae), emit(Ue));
        let ce = bridgeHandle();
        if (ce) forwardRateLimitEventToBridge(ce, Ue);
        else {
          let nt = Ikr(sessionState, Ue);
          if (nt) sessionState.notifyMetadataChanged(nt);
        }
      } catch (error) {
        logForDebugging(`[rateLimitFrames] listener failed: ${errorMessage(error)}`, { level: "error" });
      } finally {
        y = Z;
      }
    },
    R = onLimitsStatusChanged(S),
    w = createRateLimitEventThrottle(),
    P = onQuotaRejected((G) => {
      if (isQuotaRejectedReemitEnabled() && w(G)) S(G);
    }),
    L = null,
    q = Jre(() => {
      if (y || s === null || L === s || getOfferBanner() === void 0) return;
      ((L = s), S(s));
    }),
    x = subscribeAdminRequestPhase(() => {
      if (y || s === null) return;
      let G = adminRequestStateForEvent(s);
      if (
        G === void 0 || h === void 0
          ? G === h
          : G.state === h.state &&
            G.lastFileFailed === h.lastFileFailed &&
            G.revision === h.revision &&
            G.label === h.label &&
            G.doneLabel === h.doneLabel &&
            G.confirm === h.confirm &&
            G.confirmPrompt === h.confirmPrompt
      )
        return;
      S(s);
    });
  return () => {
    (R(), P(), q(), x());
  };
}
//@ chunk-tyg7f3ek.js:186643-186749 placement
function installSdkEventDrain({ drain: drain, emit: emit }) {
  let r = () => {
    for (let s of drain()) emit(s);
  };
  return (
    setTaskNotificationListener(r),
    {
      close: () => {
        (setTaskNotificationListener(null), r());
      },
    }
  );
}
//@ chunk-tyg7f3ek.js:186749-188220 placement
class SdkMcpServerWait {
  sdkUrl;
  unconnectedServers;
  updateSdkMcp;
  relayWaitLeftMs;
  waitedFor = new WeakSet();
  firstQueryReleased = !1;
  constructor({ sdkUrl: e, unconnectedServers: n, updateSdkMcp: r, relayWaitLeftMs: s }) {
    ((this.sdkUrl = e), (this.unconnectedServers = n), (this.updateSdkMcp = r), (this.relayWaitLeftMs = s));
  }
  noteEntryWait() {
    if (this.sdkUrl) for (let e of this.unconnectedServers()) this.waitedFor.add(e);
  }
  get firstQueryAhead() {
    return Boolean(this.sdkUrl) && !this.firstQueryReleased;
  }
  markFirstQueryReleased() {
    this.firstQueryReleased = !0;
  }
  join(e) {
    if (!this.sdkUrl || e.shouldQuery === !1) return null;
    let filtered = this.unconnectedServers().filter((S) => !this.waitedFor.has(S)),
      r = filtered.length;
    if (r === 0) return (this.markFirstQueryReleased(), null);
    for (let S of filtered) this.waitedFor.add(S);
    let max = Math.max(A4e(), this.relayWaitLeftMs?.() ?? 0),
      startTime = performance.now(),
      updateSdkMcp = this.updateSdkMcp("skip");
    return (
      updateSdkMcp.then(
        () => this.markFirstQueryReleased(),
        () => this.markFirstQueryReleased(),
      ),
      withDeadline(
        updateSdkMcp.then(() => !0),
        max,
      )
        .then((S) => {
          this.markFirstQueryReleased();
          let R = S !== !0;
          if (R) updateSdkMcp.catch(logError);
          let rounded = Math.round(performance.now() - startTime),
            mapped = this.unconnectedServers()
              .filter((L) => filtered.includes(L))
              .map((L) => L.name);
          if (
            (logForDiagnosticsNoPII(R ? "warn" : "info", "sdk_mcp_first_query_wait", {
              budget_ms: max,
              waited_ms: rounded,
              pending_servers: r,
              timed_out: R,
              still_pending_servers: mapped.length,
            }),
            Br("sdk_mcp_first_query_wait_ms", rounded, startTime),
            mapped.length > 0)
          )
            logForDebugging(
              `Waited ${rounded} ms for SDK MCP servers that are still connecting (${mapped.join(", ")}); this turn starts without their tools, which become available when they connect.`,
              { level: "warn" },
            );
        })
        .catch(logError)
    );
  }
}
//@ chunk-tyg7f3ek.js:188257-188353 placement
var MN = new Set(["scheduled", "task_notification", "auto_continuation", "host_synthetic", "system"]);
//@ chunk-tyg7f3ek.js:188353-188415 placement
function jC(e) {
  try {
    return pausedPromptSuggestionReason(e);
  } catch (error) {
    return (logError(toError(error)), null);
  }
}
//@ chunk-tyg7f3ek.js:188415-188593 placement
function pausedPromptSuggestionReason({ paused: paused, turnOrigin: turnOrigin }) {
  let r;
  if (paused) r = "host_paused";
  else {
    let s = turnOrigin();
    if (s === void 0 || !MN.has(s)) return null;
    r = "not_user_started";
  }
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_chomp_sable", !1) ? r : null;
}
//@ chunk-tyg7f3ek.js:188593-188606 placement
var IN = 30000;
/**
 * SDK 模式下在轮次之间生成并发送 prompt_suggestion（仅缓存热时）。
 */
//@ chunk-tyg7f3ek.js:188606-191278 placement
class PromptSuggestionEmitter {
  abortController = null;
  inflightPromise = null;
  paused = !1;
  lastEmitted = null;
  pendingSuggestion = null;
  pendingLastEmittedEntry = null;
  emit;
  promptSuggestions;
  shuttingDown;
  holdsResults;
  cacheSafeParams;
  turnOrigin;
  generate;
  constructor({
    emit: e,
    promptSuggestions: n,
    shuttingDown: r,
    holdsResults: s,
    cacheSafeParams: h,
    turnOrigin: y,
    generate: S,
  }) {
    ((this.emit = e),
      (this.promptSuggestions = n),
      (this.shuttingDown = r),
      (this.holdsResults = s),
      (this.cacheSafeParams = h),
      (this.turnOrigin = y),
      (this.generate = S));
  }
  setPaused(e) {
    this.paused = e;
  }
  onCommand(e, n) {
    if (e.shouldQuery === !1) return;
    if (
      (this.abortController?.abort(),
      (this.abortController = null),
      (this.pendingSuggestion = null),
      (this.pendingLastEmittedEntry = null),
      this.lastEmitted && e.mode === "prompt")
    ) {
      let r = typeof n === "string" ? n : n.find((s) => s.type === "text")?.text;
      if (typeof r === "string")
        logSuggestionOutcome(
          this.lastEmitted.text,
          r,
          this.lastEmitted.emittedAt,
          this.lastEmitted.generationRequestId,
        );
      this.lastEmitted = null;
    }
  }
  afterResult(e) {
    if (
      !this.promptSuggestions() ||
      e.shouldQuery === !1 ||
      this.shuttingDown() ||
      env.CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION === !1
    )
      return;
    this.abortController?.abort();
    let abortController = new AbortController();
    this.abortController = abortController;
    let r = jC({ paused: this.paused, turnOrigin: this.turnOrigin });
    if (r) {
      try {
        logSuggestionSuppressed(r, "sdk");
      } catch (error) {
        logError(toError(error));
      }
      return;
    }
    let cacheSafeParams = this.cacheSafeParams();
    if (!cacheSafeParams) {
      logSuggestionSuppressed("sdk_no_params", "sdk");
      return;
    }
    let h = { promise: null };
    ((h.promise = (async () => {
      try {
        let generate = await this.generate(abortController, cacheSafeParams);
        if (!generate || abortController.signal.aborted) return;
        let S = {
            type: "prompt_suggestion",
            suggestion: generate.suggestion,
            uuid: randomUUID_7(),
            session_id: getSessionId(),
          },
          R = {
            text: generate.suggestion,
            emittedAt: Date.now(),
            generationRequestId: generate.generationRequestId,
          };
        if (this.holdsResults())
          ((this.pendingSuggestion = S),
            (this.pendingLastEmittedEntry = { text: R.text, generationRequestId: R.generationRequestId }));
        else ((this.lastEmitted = R), this.emit(S));
      } catch (error) {
        if (error instanceof Error && (error.name === "AbortError" || error.name === "APIUserAbortError")) {
          logSuggestionSuppressed("aborted", "sdk");
          return;
        }
        logError(toError(error));
      } finally {
        if (this.inflightPromise === h.promise) this.inflightPromise = null;
      }
    })()),
      (this.inflightPromise = h.promise));
  }
  emitPending() {
    if (this.pendingSuggestion) {
      if ((this.emit(this.pendingSuggestion), this.pendingLastEmittedEntry))
        ((this.lastEmitted = { ...this.pendingLastEmittedEntry, emittedAt: Date.now() }),
          (this.pendingLastEmittedEntry = null));
      this.pendingSuggestion = null;
    }
  }
  discard() {
    (this.abortController?.abort(),
      (this.abortController = null),
      (this.lastEmitted = null),
      (this.pendingSuggestion = null));
  }
  abort() {
    this.abortController?.abort();
  }
  settle() {
    if (this.inflightPromise) return this.settleInflight(this.inflightPromise);
    (this.abortController?.abort(), (this.abortController = null));
    return;
  }
  async settleInflight(e) {
    let n = setTimeout((r) => r?.abort(), IN, this.abortController);
    try {
      await e;
    } finally {
      clearTimeout(n);
    }
    (this.abortController?.abort(), (this.abortController = null));
  }
}
//@ chunk-tyg7f3ek.js:191278-191524 placement
function createPromptSuggestionEmitter({ messages: messages, getAppState: getAppState, ...r }) {
  return new PromptSuggestionEmitter({
    ...r,
    cacheSafeParams: getLastCacheSafeParams,
    turnOrigin: () => getTurnOrigin(messages),
    generate: (s, h) => {
      if (!isMainThreadCacheWarm())
        return (
          logSuggestionSuppressed("cache_cold", "sdk", { cacheColdBy: "prefix_not_warm" }),
          Promise.resolve(null)
        );
      return tryGenerateSuggestion(s, messages, getAppState, h, "sdk");
    },
  });
}
//@ chunk-tyg7f3ek.js:191524-191928 placement
var ACCOUNT_PLUGINS_CHECK_CONSTANTS = "tengu_ccr_plugins_turn_start_check_enabled",
  DN = !0,
  X_ = 60000,
  FN = 2,
  xN = 1800000,
  ty = 5000,
  ny = 30000,
  rp = 3,
  zC = 2,
  ACCOUNT_PLUGINS_UNCHECKED = "account-plugins-unchecked",
  LN = "Couldn't check your plugins for updates. The versions already loaded are still in use.",
  ACCOUNT_PLUGINS_NOT_RELOADED = "account-plugins-not-reloaded",
  NN =
    "Couldn't finish reloading your plugins after a change. Parts of their earlier versions may still be in use until a reload succeeds.";
//@ chunk-tyg7f3ek.js:191928-192027 placement
function YC(e) {
  return (
    env.CLAUDE_CODE_REMOTE === !0 &&
    env.CLAUDE_CODE_SYNC_PLUGINS === !0 &&
    !isSessionRefsSyncEnabled(e) &&
    getFeatureValue_CACHED_MAY_BE_STALE(ACCOUNT_PLUGINS_CHECK_CONSTANTS, DN)
  );
}
//@ chunk-tyg7f3ek.js:192027-192130 placement
var notifyAccountPluginsUnchecked = () =>
  enqueueTaskNotification({
    type: "system",
    subtype: "notification",
    key: ACCOUNT_PLUGINS_UNCHECKED,
    text: LN,
    priority: "medium",
    color: "warning",
  });
/**
 * CCR 会话每轮开始检查账户插件是否有更新（tengu_ccr_plugins_turn_start_check_enabled），失败/拒绝时告知用户。
 */
//@ chunk-tyg7f3ek.js:192130-195841 placement
class AccountPluginsChecker {
  session;
  credentials;
  checkedAt;
  failuresInARow = 0;
  isChecking = !1;
  refusalsInARow = 0;
  roundAtRefusal = null;
  isToldOfRefusal = !1;
  unlandedStamp = null;
  unlandedRounds = 0;
  unlandedRoundAt = 0;
  failedReloads = 0;
  failedReloadAt = 0;
  reloadedAtFailedReload = null;
  constructor(e, n) {
    ((this.session = e), (this.credentials = n), (this.checkedAt = e.host.clock.now()));
  }
  atTurnStart(e = !0) {
    let now = this.session.host.clock.now();
    if (!this.isDueAt(now)) return;
    return (
      (this.checkedAt = now),
      (this.isChecking = !0),
      this.syncedIfListingChanged()
        .then(
          (r) => (
            logForDiagnosticsNoPII("info", "plugins_sync_turn_start_check_done", {
              is_changed: r,
              is_waited_for: e,
              duration_ms: this.session.host.clock.now() - now,
            }),
            r
          ),
        )
        .finally(() => {
          this.isChecking = !1;
        })
    );
  }
  isDueAt(e) {
    let n = e - this.checkedAt,
      pluginsSync = this.session.pluginsSync;
    if (
      this.refusalsInARow > 0 &&
      pluginsSync.firstSyncPromise !== this.roundAtRefusal &&
      pluginsSync.accountListing === "listed"
    )
      this.refusalsInARow = 0;
    return !this.isChecking && this.refusalsInARow < zC && (n < 0 || n >= X_) && YC(this.session);
  }
  isCheckDue() {
    return this.isDueAt(this.session.host.clock.now());
  }
  hasLandedChange() {
    let e = getSyncedPluginReloadDebt();
    return e.changesLanded !== e.changesReloaded && YC(this.session);
  }
  isReloadOwed() {
    return !getSyncedPluginReloadDebt().reloadHeld && this.hasLandedChange();
  }
  isReloadTryDue() {
    let e = this.session.host.clock.now() - this.failedReloadAt;
    return !(this.failedReloads > 0 && e >= 0 && e < X_);
  }
  reloadEnded(e, n) {
    let s = n === this.reloadedAtFailedReload ? this.failedReloads : 0;
    if (
      ((this.failedReloads = e ? s + 1 : 0),
      (this.failedReloadAt = this.session.host.clock.now()),
      (this.reloadedAtFailedReload = getSyncedPluginReloadDebt().changesReloaded),
      e)
    )
      logForDiagnosticsNoPII("warn", "plugins_sync_turn_start_reload_failed", {
        failures_in_a_row: this.failedReloads,
      });
    if (e && this.failedReloads === rp)
      (logFeatureSad("plugins_sync_turn_start_check", "reload_failed", {
        failures_in_a_row: this.failedReloads,
        hosted: !0,
      }),
        enqueueTaskNotification({
          type: "system",
          subtype: "notification",
          key: ACCOUNT_PLUGINS_NOT_RELOADED,
          text: NN,
          priority: "medium",
          color: "warning",
        }));
  }
  reloadedElsewhere() {
    this.failedReloads = 0;
  }
  reloadLeftToNextTry() {
    this.reloadedAtFailedReload = getSyncedPluginReloadDebt().changesReloaded;
  }
  async syncedIfListingChanged() {
    try {
      let pluginsSync = this.session.pluginsSync;
      if ((await pluginsSync.firstSyncPromise?.catch(() => {}), sJ(), !Jbt(this.session) || !wie() || Hkt()))
        return !1;
      let firstSyncPromise = pluginsSync.firstSyncPromise,
        s = await listAccountPlugins({
          isBackground: !0,
          credentials: this.credentials,
          ...(isSkillsAsPluginsActive(this.session) && { convertedSkillsAsPlugins: !0 }),
        }),
        h = !s.success && !Hee(s),
        y = h && eot(s);
      if (y)
        (this.refusalsInARow++,
          (this.roundAtRefusal = firstSyncPromise),
          logForDiagnosticsNoPII("warn", "plugins_sync_turn_start_check_refused", {
            refusals_in_a_row: this.refusalsInARow,
            ...listErrorTelemetry(s),
          }),
          logFeatureSad("plugins_sync_turn_start_check", "list_refused", {
            refusals_in_a_row: this.refusalsInARow,
          }));
      if (y && this.refusalsInARow >= zC && !this.isToldOfRefusal && getSyncedPluginDirs().length > 0)
        ((this.isToldOfRefusal = !0), notifyAccountPluginsUnchecked());
      if (y) return !1;
      if (((this.refusalsInARow = 0), h)) return (this.noteFailure("list_failed", listErrorTelemetry(s)), !1);
      if (s.success && s.degraded === !0) return (this.noteFailure("list_degraded", {}), !1);
      this.failuresInARow = 0;
      let w = pluginListFingerprint(s.success ? s.plugins : []),
        P = this.session.host.clock.now() - this.unlandedRoundAt,
        L = w === this.unlandedStamp && P >= 0 && P < Math.min(X_ * FN ** this.unlandedRounds, xN);
      if (!(w !== pluginsSync.listedStamp && !L)) return !1;
      let changesLanded = getSyncedPluginReloadDebt().changesLanded,
        G = await rerunPluginsSync(this.session, this.credentials);
      if (pluginsSync.listedStamp === null)
        ((this.unlandedRounds = w === this.unlandedStamp ? this.unlandedRounds + 1 : 1),
          (this.unlandedStamp = w),
          (this.unlandedRoundAt = this.session.host.clock.now()),
          logFeatureSad("plugins_sync_turn_start_check", "round_incomplete", {
            rounds_for_listing: this.unlandedRounds,
          }));
      else this.unlandedStamp = null;
      if (pluginsSync.listedStamp !== null && G) logFeatureOk("plugins_sync_turn_start_check");
      return G || getSyncedPluginReloadDebt().changesLanded !== changesLanded;
    } catch (error) {
      return (logError(error), (this.refusalsInARow = 0), this.noteFailure("error", {}), !1);
    }
  }
  noteFailure(e, n) {
    if (
      (this.failuresInARow++,
      logForDiagnosticsNoPII("warn", "plugins_sync_turn_start_check_failed", {
        failure: e,
        failures_in_a_row: this.failuresInARow,
        ...n,
      }),
      logFeatureSad("plugins_sync_turn_start_check", e, {
        failures_in_a_row: this.failuresInARow,
        hosted: !0,
      }),
      this.failuresInARow === rp)
    )
      notifyAccountPluginsUnchecked();
  }
}
/**
 * 轮次开始前的检查集合：延迟命令、SessionStart 钩子、SDK MCP 更新、插件检查、parked 权限退役等。
 */
//@ chunk-tyg7f3ek.js:195841-211742 placement
class TurnStartChecks {
  deferredCommandsJoin;
  parkedPermissionRetirement;
  takeClaimSessionStartHooks;
  takeNewPluginsSessionStart;
  runSessionStartHooksOfNewPlugins;
  sdkUrl;
  sdkMcpUpdateKind;
  sdkMcpServersPending;
  sdkToolRelistPending;
  updateSdkMcp;
  noteSdkEntryWait;
  skillsSyncStartedAt;
  refreshCurrentCommands;
  pluginStateRefreshTickets;
  pluginStartupPending;
  resolveDeferredPluginStartup;
  closePluginInstallBracket;
  backgroundInstall;
  refreshPluginState;
  refillMarketplaces;
  isRefillLanded = !1;
  applyPluginMcpDiff;
  connectedNonDynamicMcpServerNames;
  serverNamesOwnedBeforePluginsSync;
  pendingPluginRefresh;
  pluginRefreshJoined;
  mcpClientCountAtKick;
  mcpPrewaitPromise;
  firstCommandMountJoin;
  mcpPrewait;
  firstCommandTaken = !1;
  waitForPendingMcp;
  store;
  allMcpClients;
  registerElicitationHandlers;
  registerChannelHandler;
  buildAllTools;
  enterPhase;
  session;
  accountPluginsFreshness;
  isPastFirstTake = !1;
  accountPluginsNeedReload = !1;
  unwaitedAccountPluginsCheck;
  isAccountPluginsReloadRunning = !1;
  accountPluginsReloadsStarted = 0;
  triesSkippedForRunningReload = 0;
  firstMessageRecorded = !1;
  sdkMcpBackgroundRetry;
  skillsSync;
  accountSkillsSyncRepopulatePending;
  pluginsSyncNeedsRefresh = !1;
  serversStartedSinceKick = new Set();
  lateForwardedInstallNeedsRefresh = !1;
  backgroundRefreshEnabled = !1;
  constructor({
    deferredCommandsJoin: e,
    parkedPermissionRetirement: n,
    takeClaimSessionStartHooks: r = () => {
      return;
    },
    takeNewPluginsSessionStart: s = () => {
      return;
    },
    runSessionStartHooksOfNewPlugins: h = () => {
      return;
    },
    sdkUrl: y,
    sdkMcpUpdateKind: S,
    sdkMcpServersPending: R,
    sdkToolRelistPending: w,
    updateSdkMcp: P,
    noteSdkEntryWait: L = () => {},
    skillsSync: q,
    skillsSyncStartedAt: x,
    accountSkillsSyncRepopulate: G,
    refreshCurrentCommands: Z,
    pluginStateRefreshTickets: re,
    pluginStartupPending: Ae,
    resolveDeferredPluginStartup: Ue,
    closePluginInstallBracket: ce,
    backgroundInstall: nt,
    refreshPluginState: ie,
    refillMarketplaces: Se,
    applyPluginMcpDiff: me,
    connectedNonDynamicMcpServerNames: Me,
    serverNamesOwnedBeforePluginsSync: Ee,
    pendingPluginRefresh: He,
    pluginRefreshJoined: Xe,
    mcpClientCountAtKick: We,
    mcpPrewaitPromise: St,
    firstCommandMountJoin: wt,
    mcpPrewait: Lt,
    waitForPendingMcp: pn,
    store: _n,
    allMcpClients: Mn,
    registerElicitationHandlers: jn,
    registerChannelHandler: Jn,
    buildAllTools: ze,
    enterPhase: Dr,
    session: $r,
    credentials: $n,
  }) {
    ((this.deferredCommandsJoin = e),
      (this.parkedPermissionRetirement = n),
      (this.takeClaimSessionStartHooks = r),
      (this.takeNewPluginsSessionStart = s),
      (this.runSessionStartHooksOfNewPlugins = h),
      (this.sdkUrl = y),
      (this.sdkMcpUpdateKind = S),
      (this.sdkMcpServersPending = R),
      (this.sdkToolRelistPending = w),
      (this.updateSdkMcp = P),
      (this.noteSdkEntryWait = L),
      (this.skillsSync = q),
      (this.skillsSyncStartedAt = x),
      (this.accountSkillsSyncRepopulatePending = G),
      (this.refreshCurrentCommands = Z),
      (this.pluginStateRefreshTickets = re),
      (this.pluginStartupPending = Ae),
      (this.resolveDeferredPluginStartup = Ue),
      (this.closePluginInstallBracket = ce),
      (this.backgroundInstall = nt),
      (this.refreshPluginState = ie),
      (this.refillMarketplaces = Se),
      (this.applyPluginMcpDiff = me),
      (this.connectedNonDynamicMcpServerNames = Me),
      (this.serverNamesOwnedBeforePluginsSync = Ee),
      (this.pendingPluginRefresh = He),
      (this.pluginRefreshJoined = Xe),
      (this.mcpClientCountAtKick = We),
      (this.mcpPrewaitPromise = St),
      (this.firstCommandMountJoin = wt),
      (this.mcpPrewait = Lt),
      (this.waitForPendingMcp = pn),
      (this.store = _n),
      (this.allMcpClients = Mn),
      (this.registerElicitationHandlers = jn),
      (this.registerChannelHandler = Jn),
      (this.buildAllTools = ze),
      (this.enterPhase = Dr),
      (this.session = $r),
      (this.accountPluginsFreshness = new AccountPluginsChecker($r, $n)));
  }
  notePluginsSyncLanded() {
    this.pluginsSyncNeedsRefresh = !0;
  }
  noteLateForwardedInstall() {
    this.lateForwardedInstallNeedsRefresh = !0;
  }
  noteReloadedByHost(e) {
    if (getSyncedPluginReloadDebt().reloadsCompleted !== e)
      ((this.accountPluginsNeedReload = !1), this.accountPluginsFreshness.reloadedElsewhere());
  }
  noteServersStartedSinceKick(e) {
    for (let n of e) this.serversStartedSinceKick.add(n);
  }
  *beforeDrain() {
    if (this.deferredCommandsJoin) yield this.deferredCommandsJoin;
    let parkedPermissionRetirement = this.parkedPermissionRetirement();
    if (parkedPermissionRetirement) yield parkedPermissionRetirement;
    headlessProfilerCheckpoint("run_entry");
    let n, r, s, h, y;
    if (!this.firstMessageRecorded)
      ((this.firstMessageRecorded = !0),
        (n = performance.now()),
        Br("first_message_read_ms", n, 0),
        ayi(),
        (r = process.cpuUsage()),
        (s = startEventLoopLagMonitor(bjn)));
    try {
      this.enterPhase("sdk_mcp_update");
      let startTime = performance.now();
      if (this.sdkUrl) {
        this.noteSdkEntryWait();
        let sdkMcpUpdateKind = this.sdkMcpUpdateKind(),
          sdkToolRelistPending = this.sdkToolRelistPending();
        if (sdkMcpUpdateKind !== "retry_failed" || (sdkToolRelistPending && !this.sdkMcpBackgroundRetry)) {
          let updateSdkMcp = this.updateSdkMcp("skip");
          if (sdkMcpUpdateKind !== "none" || sdkToolRelistPending) {
            let sdkUpdateWaitBudgetMs = this.sdkUpdateWaitBudgetMs();
            if (
              (yield withDeadline(
                updateSdkMcp.then(() => !0),
                sdkUpdateWaitBudgetMs,
              )) !== !0
            ) {
              updateSdkMcp.catch(logError);
              let sdkMcpServersPending = this.sdkMcpServersPending(),
                relayMarked = this.mcpPrewait.relayMarked,
                relayHold = this.mcpPrewait.relayHold;
              (logEvent("tengu_sdk_mcp_update_wait_timeout", {
                budget_ms: sdkUpdateWaitBudgetMs,
                pending_servers: sdkMcpServersPending,
                relay_marked: relayMarked,
                relay_hold: relayHold,
              }),
                logForDiagnosticsNoPII("warn", "sdk_mcp_update_wait_timeout", {
                  budget_ms: sdkUpdateWaitBudgetMs,
                  pending_servers: sdkMcpServersPending,
                  relay_marked: relayMarked,
                  relay_hold: relayHold,
                }));
            }
          } else yield updateSdkMcp;
        }
        if (!this.sdkMcpBackgroundRetry && this.sdkMcpUpdateKind() === "retry_failed")
          (logForDiagnosticsNoPII("info", "sdk_mcp_retry_not_awaited"),
            (this.sdkMcpBackgroundRetry = this.updateSdkMcp()
              .catch(logError)
              .finally(() => {
                this.sdkMcpBackgroundRetry = void 0;
              })));
      } else yield this.updateSdkMcp();
      (Br("sdk_mcp_update_ms", performance.now() - startTime, startTime),
        headlessProfilerCheckpoint("after_updateSdkMcp"),
        this.enterPhase("entry_joins"));
      let takeClaimSessionStartHooks = this.takeClaimSessionStartHooks();
      if (takeClaimSessionStartHooks) {
        let startTime = performance.now();
        (yield takeClaimSessionStartHooks,
          Br("claim_hooks_join_ms", performance.now() - startTime, startTime),
          headlessProfilerCheckpoint("after_claimSessionStartHooks"));
      }
      if (this.skillsSync) {
        let startTime = performance.now();
        if (
          (yield awaitFirstSkillsList(this.skillsSync, this.skillsSyncStartedAt),
          Br("skills_sync_wait_ms", performance.now() - startTime, startTime),
          env.CLAUDE_CODE_CCR_FOLD_FIRST_TURN_RESCAN && this.pluginStartupPending())
        )
          ((y = this.pluginStateRefreshTickets().started), addStartupContext({ fold_first_turn_rescan: 1 }));
        else {
          let startTime = performance.now();
          (yield this.refreshCurrentCommands(),
            Br("skills_sync_commands_refresh_ms", performance.now() - startTime, startTime));
        }
        this.skillsSync = null;
      } else if (this.accountSkillsSyncRepopulatePending) {
        if (((this.accountSkillsSyncRepopulatePending = !1), remoteToolsState().firstRoundEmitted))
          yield this.refreshCurrentCommands();
      }
      if (this.pluginStartupPending()) yield this.resolveDeferredPluginStartup();
      if (y !== void 0)
        if (this.pluginStateRefreshTickets().lastCompletedStart > y) Br("skills_sync_commands_refresh_ms", 0);
        else {
          let startTime = performance.now();
          (yield this.refreshCurrentCommands(),
            Br("skills_sync_commands_refresh_ms", performance.now() - startTime, startTime));
        }
      let takeNewPluginsSessionStart = this.takeNewPluginsSessionStart();
      if (takeNewPluginsSessionStart) {
        let startTime = performance.now();
        (yield takeNewPluginsSessionStart,
          Br("new_plugin_hooks_join_ms", performance.now() - startTime, startTime));
      }
    } finally {
      ((h = s?.stop()), this.closePluginInstallBracket());
    }
    if (
      ((this.backgroundRefreshEnabled = env.CLAUDE_CODE_ENABLE_BACKGROUND_PLUGIN_REFRESH),
      n !== void 0 && r && h !== void 0)
    ) {
      Br("first_message_handle_ms", performance.now() - n, n);
      let cpuUsage = process.cpuUsage(r);
      (Br("first_message_handle_cpu_ms", (cpuUsage.user + cpuUsage.system) / 1000),
        Br("first_message_handle_loop_lag_ms", h));
    }
  }
  sdkUpdateWaitBudgetMs() {
    let e = A4e(),
      n =
        this.mcpPrewait.relayHold && !this.firstCommandTaken
          ? this.mcpPrewait.freshWaitDeadlineMs?.()
          : void 0;
    return n === void 0 ? e : Math.max(e, n);
  }
  async loopTop() {
    let lateForwardedInstallNeedsRefresh = this.lateForwardedInstallNeedsRefresh,
      organizationAsk = getPluginRegistry().organizationAsk;
    if (organizationAsk.isCommandHeld && J_() === "unanswered") {
      let S = organizationAsk.answerWait !== null;
      if ((await waitForOrganizationAnswer(), S)) askOrganizationOnce();
    }
    let r = organizationAsk.isCommandHeld && J_() !== "unanswered",
      isRefillLanded = this.isRefillLanded,
      h = r || isRefillLanded;
    if (
      ((this.backgroundRefreshEnabled && this.backgroundInstall?.needsRefresh) ||
        this.pluginsSyncNeedsRefresh ||
        lateForwardedInstallNeedsRefresh ||
        h) &&
      !this.isReloadHeldByHost()
    ) {
      if (this.backgroundInstall) this.backgroundInstall.needsRefresh = !1;
      let pluginsSyncNeedsRefresh = this.pluginsSyncNeedsRefresh;
      ((this.pluginsSyncNeedsRefresh = !1), (this.lateForwardedInstallNeedsRefresh = !1));
      let landedRoundAtLoopTop = this.landedRoundAtLoopTop(),
        w = 0;
      try {
        let P = getSyncedPluginReloadDebt(),
          reloadsCompleted = P.reloadsCompleted;
        w = P.changesReloaded;
        let q =
          pluginsSyncNeedsRefresh && !lateForwardedInstallNeedsRefresh
            ? await this.serverNamesOwnedBeforePluginsSync()
            : void 0;
        if (
          (await this.refreshPluginState(),
          (organizationAsk.isCommandHeld &&= !r),
          (this.isRefillLanded &&= !isRefillLanded),
          r && organizationAsk.isMarketplaceHeld)
        )
          ((organizationAsk.isMarketplaceHeld = !1),
            this.refillMarketplaces().then((Ae) => {
              this.isRefillLanded ||= Ae;
            }, logError));
        let x = lateForwardedInstallNeedsRefresh || q !== void 0,
          G = !1;
        if (lateForwardedInstallNeedsRefresh)
          G = await this.applyPluginMcpDiff(
            this.connectedNonDynamicMcpServerNames(),
            "late_plugin_install",
          ).then(
            () => !1,
            (Ae) => (
              logForDebugging(`late plugin install: applyPluginMcpDiff failed: ${errorMessage(Ae)}`, {
                level: "error",
              }),
              !0
            ),
          );
        else if (q)
          G = await this.applyPluginMcpDiff(q, "plugins_sync").then(
            () => !1,
            (Ae) => (
              logForDebugging(`late plugins sync: applyPluginMcpDiff failed: ${errorMessage(Ae)}`, {
                level: "error",
              }),
              !0
            ),
          );
        else if (landedRoundAtLoopTop === "due")
          G = await this.applyPluginMcpDiff(
            this.connectedNonDynamicMcpServerNames(),
            "plugins_sync",
            "account_plugins",
          ).then(
            () => !1,
            (Ae) => (
              logForDebugging(`account plugins freshness: MCP diff failed: ${errorMessage(Ae)}`, {
                level: "error",
              }),
              !0
            ),
          );
        else if (landedRoundAtLoopTop === "waiting")
          ((this.accountPluginsNeedReload = !0), this.accountPluginsFreshness.reloadLeftToNextTry());
        if (h && !x)
          await this.applyPluginMcpDiff(this.connectedNonDynamicMcpServerNames(), "plugins_sync").catch(
            (Ae) => {
              logForDebugging(`released command source: applyPluginMcpDiff failed: ${errorMessage(Ae)}`, {
                level: "error",
              });
            },
          );
        if (landedRoundAtLoopTop === "due" || (landedRoundAtLoopTop === "waiting" && x)) {
          let Ae = G || P.reloadsCompleted === reloadsCompleted;
          ((this.accountPluginsNeedReload = Ae), this.accountPluginsFreshness.reloadEnded(Ae, w));
        }
        let re = (pluginsSyncNeedsRefresh || h) && this.runSessionStartHooksOfNewPlugins();
        if (re) await re;
      } catch (error) {
        logError(error);
        let L = landedRoundAtLoopTop !== "none";
        if (L) {
          this.accountPluginsNeedReload = !0;
          try {
            this.accountPluginsFreshness.reloadEnded(L, w);
          } catch (error) {
            logForDebugging(`account plugins freshness: failed reload not counted: ${errorMessage(error)}`, {
              level: "error",
            });
          }
        }
      }
    }
  }
  isReloadHeldByHost() {
    try {
      return getSyncedPluginReloadDebt().reloadHeld;
    } catch (error) {
      return (
        logForDebugging(`account plugins freshness: host's hold not read: ${errorMessage(error)}`, {
          level: "error",
        }),
        !1
      );
    }
  }
  landedRoundAtLoopTop() {
    try {
      if (!this.accountPluginsFreshness.hasLandedChange()) return "none";
      return this.accountPluginsFreshness.isReloadTryDue() ? "due" : "waiting";
    } catch (error) {
      return (
        logForDebugging(`account plugins freshness: landed rounds not read: ${errorMessage(error)}`, {
          level: "error",
        }),
        "none"
      );
    }
  }
  accountPluginsJoin(e) {
    try {
      let n = this.isPastFirstTake ? this.unwaitedAccountPluginsCheck : void 0;
      if (n === void 0 && this.isPastFirstTake && this.accountPluginsFreshness.isCheckDue() && !e()) {
        let h = () => {
          let y = this.accountPluginsFreshness.atTurnStart(!1)?.then(
            (S) => ((this.accountPluginsNeedReload ||= S), S),
            (S) => (
              logForDebugging(`account plugins freshness: unwaited check failed: ${errorMessage(S)}`, {
                level: "error",
              }),
              !1
            ),
          );
          if (y === void 0) return;
          ((this.unwaitedAccountPluginsCheck = y),
            y.finally(() => {
              if (this.unwaitedAccountPluginsCheck === y) this.unwaitedAccountPluginsCheck = void 0;
            }));
        };
        if (!this.isAccountPluginsReloadOwed()) return (h(), null);
        return this.reloadChangedAccountPlugins(!1)
          .then(h)
          .catch((y) =>
            logForDebugging(`account plugins freshness: join failed: ${errorMessage(y)}`, { level: "error" }),
          );
      }
      let r = n === void 0 && this.isPastFirstTake ? this.accountPluginsFreshness.atTurnStart() : void 0,
        s = n !== void 0 && e() ? n : r;
      if (((this.isPastFirstTake = !0), s === void 0 && !this.isAccountPluginsReloadOwed())) return null;
      return (
        s === void 0
          ? Promise.resolve(!1)
          : withDeadline(
              s.then((h) => ((this.accountPluginsNeedReload ||= h), h)),
              ty,
              (h, y) => this.session.host.clock.setTimeout(h, y),
            ).then((h) => {
              if (h === void 0) {
                if (n !== void 0 && this.unwaitedAccountPluginsCheck === n)
                  this.unwaitedAccountPluginsCheck = void 0;
                logForDiagnosticsNoPII("warn", "plugins_sync_turn_start_check_wait_timeout", {
                  waited_ms: ty,
                });
              }
              return h === !0;
            })
      )
        .then((h) => this.reloadChangedAccountPlugins(h))
        .catch((h) =>
          logForDebugging(`account plugins freshness: join failed: ${errorMessage(h)}`, { level: "error" }),
        );
    } catch (error) {
      return (
        logForDebugging(`account plugins freshness: check not started: ${errorMessage(error)}`, {
          level: "error",
        }),
        null
      );
    }
  }
  isAccountPluginsReloadOwed() {
    return (
      ((this.accountPluginsNeedReload && !this.isReloadHeldByHost()) ||
        (!this.pluginsSyncNeedsRefresh && this.accountPluginsFreshness.isReloadOwed())) &&
      this.accountPluginsFreshness.isReloadTryDue()
    );
  }
  async reloadChangedAccountPlugins(e) {
    let n = e || this.isAccountPluginsReloadOwed();
    if (this.isReloadHeldByHost() || !n) return;
    if (this.isAccountPluginsReloadRunning) {
      if (this.accountPluginsFreshness.isReloadTryDue())
        (this.triesSkippedForRunningReload++,
          (this.accountPluginsNeedReload = !0),
          this.accountPluginsFreshness.reloadEnded(!0, getSyncedPluginReloadDebt().changesReloaded),
          (this.isAccountPluginsReloadRunning = this.triesSkippedForRunningReload < rp - 1));
      return;
    }
    if (!this.accountPluginsNeedReload)
      logForDiagnosticsNoPII("info", "plugins_sync_turn_start_reload_of_landed_round");
    this.accountPluginsNeedReload = !1;
    let changesReloaded = getSyncedPluginReloadDebt().changesReloaded,
      s = !1;
    ((this.isAccountPluginsReloadRunning = !0), (this.triesSkippedForRunningReload = 0));
    let h = ++this.accountPluginsReloadsStarted,
      y = this.reloadAccountPlugins()
        .then((R) => {
          this.isAccountPluginsReloadRunning &&= this.accountPluginsReloadsStarted !== h;
          let w = s && !R;
          if (((this.accountPluginsNeedReload = w ? !1 : this.accountPluginsNeedReload || R), !s || !R))
            this.accountPluginsFreshness.reloadEnded(R, changesReloaded);
          return !0;
        })
        .catch(
          (R) => (
            logForDebugging(`account plugins freshness: reload not recorded: ${errorMessage(R)}`, {
              level: "error",
            }),
            !0
          ),
        );
    if ((await withDeadline(y, ny, (R, w) => this.session.host.clock.setTimeout(R, w))) !== !0)
      ((s = !0),
        (this.accountPluginsNeedReload = !0),
        logForDiagnosticsNoPII("warn", "plugins_sync_turn_start_reload_wait_timeout", { waited_ms: ny }),
        this.accountPluginsFreshness.reloadEnded(!0, changesReloaded));
  }
  async reloadAccountPlugins() {
    let e = getSyncedPluginReloadDebt(),
      reloadsCompleted = e.reloadsCompleted,
      r = !1;
    try {
      await this.refreshPluginState();
    } catch (error) {
      ((r = !0), logError(error));
    }
    if (!r)
      try {
        await this.applyPluginMcpDiff(
          this.connectedNonDynamicMcpServerNames(),
          "plugins_sync",
          "account_plugins",
        );
      } catch (error) {
        ((r = !0),
          logForDebugging(`account plugins freshness: MCP diff failed: ${errorMessage(error)}`, {
            level: "error",
          }));
      }
    return r || e.reloadsCompleted === reloadsCompleted;
  }
  *firstCommand() {
    let pendingPluginRefresh = this.pendingPluginRefresh();
    if (pendingPluginRefresh) {
      let startTime = performance.now();
      (yield pendingPluginRefresh,
        this.pluginRefreshJoined(),
        Br("registry_refresh_join_ms", performance.now() - startTime, startTime));
    }
    (headlessProfilerCheckpoint("before_mcp_prewait"), this.enterPhase("mcp_prewait"));
    let startTime = performance.now(),
      policyAtFirstCommand = this.mcpPrewait.policyAtFirstCommand(),
      { waitForDeferrable: waitForDeferrable, firstTurnHold: firstTurnHold } = policyAtFirstCommand,
      serversToSkipNow = this.mcpPrewait.serversToSkipNow(policyAtFirstCommand.skipFullyDeferredServers),
      S = waitForDeferrable && !this.mcpPrewait.waitForDeferrable,
      R =
        !this.firstCommandTaken &&
        this.store
          .getState()
          .mcp.clients.some(
            (client) =>
              client.type === "pending" &&
              this.mcpPrewait.skippedAtKick.has(client.name) &&
              !serversToSkipNow.has(client.name),
          ),
      w = waitForDeferrable || this.firstCommandTaken ? void 0 : this.mcpPrewait.requiredServersNow(),
      P =
        w === void 0
          ? []
          : this.store
              .getState()
              .mcp.clients.filter(
                (client) => client.type === "pending" && w.has(getPrefixServerKey(client.name)),
              ),
      L =
        !this.mcpPrewait.waitForDeferrable &&
        P.some((re) => !this.mcpPrewait.requiredAtKick.has(getPrefixServerKey(re.name))),
      q = this.store.getState().mcp.clients.length > this.mcpClientCountAtKick,
      x = new Set(this.serversStartedSinceKick);
    this.serversStartedSinceKick.clear();
    let deadlineMs = this.mcpPrewait.deadlineMs;
    if (q || S || R || L || x.size > 0) {
      let re = this.firstCommandTaken ? this.mcpPrewait.laterWakes : void 0;
      ((deadlineMs = re
        ? re.deadlineMs
        : (this.mcpPrewait.freshWaitDeadlineMs?.() ??
          (S ? policyAtFirstCommand.deadlineMs : this.mcpPrewait.deadlineMs))),
        yield this.waitForPendingMcp(deadlineMs, {
          skipTelemetry: this.mcpClientCountAtKick > 0 && !S && !R && !L && x.size === 0,
          waitForDeferrable: waitForDeferrable,
          firstTurnHold: firstTurnHold,
          requiredServerNames: w,
          ...(x.size > 0 && { alsoWaitFor: x }),
          ...(serversToSkipNow.size > 0 && { skipServerNames: serversToSkipNow }),
          localOnly: re ? re.localOnly : this.mcpPrewait.localOnly,
          coordinatorMainThreadOnly: this.mcpPrewait.coordinatorMainThreadOnly,
          relayMarked: this.mcpPrewait.relayMarked,
          relayHold: this.mcpPrewait.relayHold,
          relayHoldFollowsBootVerdict: this.mcpPrewait.relayHoldFollowsBootVerdict,
          permissionPromptToolServerName: this.mcpPrewait.permissionPromptToolServerName,
        }));
    } else yield this.mcpPrewaitPromise;
    if (!this.firstCommandTaken)
      logEvent("tengu_headless_mcp_first_turn_join", {
        firstTurnHold: fromEnum(firstTurnHold),
        waitForDeferrable: waitForDeferrable,
        blockedMs: Math.round(performance.now() - startTime),
        freshWait: fromEnum(
          S
            ? "hold_since_kick"
            : L
              ? "required_since_kick"
              : R
                ? "skip_lapsed_since_kick"
                : q
                  ? "clients_grew"
                  : x.size > 0
                    ? "started_since_kick"
                    : "none",
        ),
        pendingRequiredBeforeJoin: P.length,
        pendingAfterJoin: count(this.store.getState().mcp.clients, (re) => re.type === "pending"),
        relayMarked: this.mcpPrewait.relayMarked,
        relayHold: this.mcpPrewait.relayHold,
        relayHoldFollowsBootVerdict: this.mcpPrewait.relayHoldFollowsBootVerdict,
        deadlineMs: deadlineMs ?? Npe,
      });
    ((this.firstCommandTaken = !0),
      Br("mcp_prewait_ms", performance.now() - startTime, startTime),
      headlessProfilerCheckpoint("after_mcp_prewait"),
      this.enterPhase("first_command"));
    let firstCommandMountJoin = this.firstCommandMountJoin(performance.now() - startTime);
    if (firstCommandMountJoin) yield firstCommandMountJoin;
  }
  sdkToolRelistJoin(e) {
    if (e.shouldQuery === !1 || this.sdkMcpBackgroundRetry || !this.sdkToolRelistPending()) return null;
    let sdkUpdateWaitBudgetMs = this.sdkUpdateWaitBudgetMs(),
      startTime = performance.now(),
      updateSdkMcp = this.updateSdkMcp("skip");
    return withDeadline(
      updateSdkMcp.then(() => !0),
      sdkUpdateWaitBudgetMs,
    )
      .then((h) => {
        let y = h !== !0;
        if (y) updateSdkMcp.catch(logError);
        logForDiagnosticsNoPII(y ? "warn" : "info", "sdk_mcp_relist_wait", {
          budget_ms: sdkUpdateWaitBudgetMs,
          waited_ms: Math.round(performance.now() - startTime),
          timed_out: y,
          tools_change_still_pending: this.sdkToolRelistPending(),
        });
      })
      .catch(logError);
  }
  wireTurn() {
    let state = this.store.getState(),
      allMcpClients = this.allMcpClients(state);
    this.registerElicitationHandlers(allMcpClients);
    for (let r of allMcpClients) this.registerChannelHandler(r);
    return this.buildAllTools(state);
  }
}
//@ chunk-tyg7f3ek.js:211742-211867 placement
var MAX_PREWAIT_SERVERS = 64,
  MAX_SERVER_NAME_LENGTH = 256,
  SDK_MCP_WAIT_MS = 5000,
  EMPTY_MCP_WIRING = {
    startupClients: () => [],
    sdkClients: () => [],
    dynamicClients: () => [],
    markDynamicServerDisabled: () => {},
  };
//@ chunk-tyg7f3ek.js:211867-214082 placement
class CloudPluginSwitches {
  io;
  isKept = isSelfHostedRemoteEnvironment();
  isUnread = !1;
  switchedOnWhileUnread = new Set();
  foundLate = new Set();
  switchedOffByThisWorker = new Set();
  constructor(e) {
    this.io = e;
  }
  async restore(e, n) {
    if (!this.isKept) return;
    let restoredWorkerState = await this.io.restoredWorkerState;
    if (restoredWorkerState === null) {
      this.isKept = !1;
      return;
    }
    if (restoredWorkerState.readFailed === !0) {
      ((this.isUnread = !0), logFeatureSad("mcp_switched_off_record", "unread_at_boot"));
      return;
    }
    let s = new Set(normalizeServerNameList(restoredWorkerState.internal?.disabled_mcp_servers));
    if (s.size === 0) return;
    try {
      switchOffMcpServers([...s], n);
    } catch (error) {
      if (error instanceof NoProjectDirectoryError)
        logForDebugging("[MCP] no directory to restore switched-off servers in");
      else logError(toError(error));
      logFeatureSad("mcp_switched_off_record", "save_failed");
      return;
    }
    for (let w of s) this.switchedOffByThisWorker.add(w);
    let h = { ...e, replyNow: null },
      engineState = e.engineState(),
      S = new Set();
    await Promise.all(
      engineState.mcp.clients
        .filter((client) => s.has(client.name) && client.type !== "disabled")
        .map(async (w) => {
          let P = !1;
          try {
            await withDeadline(
              (async () =>
                reconnectMcpServerByName(h, EMPTY_MCP_WIRING, w.name, w.config, engineState, () =>
                  this.switchedOffByThisWorker.has(w.name),
                ))().finally(() => {
                P = !0;
              }),
              SDK_MCP_WAIT_MS,
            );
          } catch (error) {
            logError(toError(error));
          }
          if (!P) S.add(w.name);
        }),
    );
    let filtered = e
      .engineState()
      .mcp.clients.filter((client) => s.has(client.name) && client.type !== "disabled");
    for (let w of filtered) markServerDisabled_2(h, EMPTY_MCP_WIRING, w.name);
    if (filtered.length === 0) {
      logFeatureOk("mcp_switched_off_record", { server_count: s.size });
      return;
    }
    if (filtered.some((w) => S.has(w.name))) logFeatureSad("mcp_switched_off_record", "close_timed_out");
    if (filtered.some((w) => !S.has(w.name))) logFeatureSad("mcp_switched_off_record", "close_failed");
  }
  switchSaved(e, n) {
    if (!this.isKept) return;
    if ((this.switchedOffByThisWorker.delete(e), n)) this.foundLate.delete(e);
    else if (getSwitchedOffMcpServers().includes(e)) this.switchedOffByThisWorker.add(e);
    if (!this.isUnread) {
      this.write();
      return;
    }
    if (n) this.switchedOnWhileUnread.add(e);
    else this.switchedOnWhileUnread.delete(e);
    this.readThenWrite();
  }
  async readThenWrite() {
    let e = await this.io.rereadWorkerState().catch(() => null);
    if (e === null || e.readFailed === !0) {
      logFeatureSad("mcp_switched_off_record", "unread_at_switch");
      return;
    }
    if (this.isUnread) {
      this.isUnread = !1;
      for (let n of normalizeServerNameList(e.internal?.disabled_mcp_servers))
        if (!this.switchedOnWhileUnread.has(n)) this.foundLate.add(n);
      this.switchedOnWhileUnread.clear();
    }
    this.write();
  }
  write() {
    try {
      let e = normalizeServerNameList([
        ...this.foundLate,
        ...getSwitchedOffMcpServers(),
        ...this.switchedOffByThisWorker,
      ]);
      this.io.sessionState.notifyInternalMetadataChanged({ disabled_mcp_servers: e.length > 0 ? e : null });
    } catch (error) {
      (logError(toError(error)), logFeatureSad("mcp_switched_off_record", "write_failed"));
    }
  }
}
//@ chunk-tyg7f3ek.js:214082-214252 placement
function normalizeServerNameList(e) {
  let n = Array.isArray(e) ? e : [],
    r = new Set();
  for (let s of n)
    if (
      typeof s === "string" &&
      s.length > 0 &&
      s.length <= MAX_SERVER_NAME_LENGTH &&
      !isClaudeInChromeMCPServer(s)
    )
      (r.delete(s), r.add(s));
  return [...r].slice(-MAX_PREWAIT_SERVERS);
}
//@ chunk-tyg7f3ek.js:214252-214647 placement
function retirementPromptRows({
  sessionId: sessionId,
  prompt: prompt,
  listed: listed,
  retirementRows: retirementRows,
  othersToCome: othersToCome,
}) {
  let y = [];
  try {
    y = retirementRows
      .filter((S) => S.type === "user")
      .flatMap((S) => Array.from(normalizeMessage(S)))
      .map((S) => ({ ...S, session_id: sessionId }));
  } catch (error) {
    logError(error);
  }
  return [
    ...y,
    {
      ...emitLoadError(
        sessionId,
        ["This reply was stopped while a tool call waited for permission."],
        prompt,
      ),
      ...(listed !== void 0 && { user_message_uuids: listed }),
      terminal_reason: "aborted_tools",
      ...(othersToCome > 0 && { queued_turn_count: othersToCome }),
    },
  ];
}
//@ chunk-tyg7f3ek.js:214647-214678 placement
var TASK_UPDATE_PREFIX = "Updated task #",
  qu = 1e6;
//@ chunk-tyg7f3ek.js:214678-214747 placement
function parseTaskNumber(e) {
  let n = Number(e);
  return /^\d+$/.test(e) && n <= qu ? n : void 0;
}
//@ chunk-tyg7f3ek.js:214747-215311 placement
var taskToolInputFields = (e, n) => (isPlainObject_2(e) ? e[n] : void 0),
  $N = (e) =>
    (e.name === TASK_CREATE_TOOL_NAME ? coerceTaskCreateInput(e.input) : normalizeTaskInputAliases(e.input))
      ?.input ?? e.input,
  nP = (e) => {
    let n = (h) => {
        let y = taskToolInputFields(e, h);
        return typeof y === "string" ? y : void 0;
      },
      r = (h) => {
        let y = taskToolInputFields(e, h);
        return Array.isArray(y) ? y.filter((S) => typeof S === "string") : void 0;
      },
      s = taskToolInputFields(e, "metadata");
    return {
      subject: n("subject"),
      description: n("description"),
      activeForm: n("activeForm"),
      status: n("status"),
      owner: n("owner"),
      metadata: isPlainObject_2(s) ? s : void 0,
      addBlocks: r("addBlocks"),
      addBlockedBy: r("addBlockedBy"),
    };
  },
  KN = (e) =>
    typeof e.content === "string"
      ? e.content
      : Array.isArray(e.content)
        ? extractTextContent_2(e.content)
        : "";
//@ chunk-tyg7f3ek.js:215311-216137 placement
function* taskToolCallsInTranscript(e, n = () => !1) {
  let r = new Map();
  for (let [s, h] of e.entries())
    if (h.type === "assistant") {
      let y = h.message.id ?? h.uuid ?? `row ${s}`;
      for (let S of h.message.content)
        if (S.type === "tool_use" && (S.name === TASK_CREATE_TOOL_NAME || S.name === TASK_UPDATE_TOOL_NAME))
          r.set(S.id, { use: S, response: y, askedEarlier: n(h, s) });
    }
  for (let [s, h] of e.entries())
    if (h.type === "user" && typeof h.message.content !== "string")
      for (let y of h.message.content) {
        if (y.type !== "tool_result") continue;
        let S = r.get(y.tool_use_id);
        if (S === void 0) continue;
        if ((r.delete(y.tool_use_id), y.is_error === !0)) continue;
        let R = KN(y),
          w = $N(S.use);
        if (S.use.name === TASK_CREATE_TOOL_NAME) {
          let P = R.match(TASK_CREATED_RE)?.[1];
          if (P !== void 0)
            yield { kind: "create", taskId: P, named: nP(w), result: y, answeredEarlier: n(h, s), ...S };
        } else if (R.startsWith(TASK_UPDATE_PREFIX)) {
          let P = taskToolInputFields(w, "taskId");
          yield {
            kind: "update",
            taskId: typeof P === "string" ? P : "",
            named: nP(w),
            result: y,
            answeredEarlier: n(h, s),
            ...S,
          };
        }
      }
}

export {
  CloudPluginSwitches,
  retirementPromptRows,
  installSdkEventDrain,
  createPromptSuggestionEmitter,
  createRateLimitFrameRelay,
  fileAdminLimitRequest,
  TurnStartChecks,
  SdkMcpServerWait,
  qu,
  parseTaskNumber,
  taskToolCallsInTranscript,
};
