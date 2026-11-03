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
import { randomUUID } from "crypto";
import {
  getAdminRequestPhase,
  adminRequestKeyForRateLimit,
  isAdminLimitRequestGateOn,
  isSameAdminRequestKey,
  ADMIN_REQUEST_SETTLED_COOLDOWN_MS,
  setAdminRequestPhase,
  EXTRA_USAGE_CHECK_TIMEOUT_MS,
  getAdminRequestState,
  readAdminLimitRequestConfig,
  ADMIN_REQUEST_FILING_TIMEOUT_MS,
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
import {
  offerCreditAtBand,
  getOfferBanner,
  onCreditOfferPromptChange,
} from "../../services/usageCreditOffers.js";
import {
  buildRateLimitInfo,
  forwardRateLimitEventToBridge,
  forwardRateLimitEvent,
  createRateLimitEventThrottle,
} from "./rateLimitForwarding.js";
import { logForDebugging } from "../../utils/debug.js";
import { isQuotaRejectedReemitEnabled } from "../../bridge/bridgeGates.js";
import { setTaskNotificationListener, enqueueTaskNotification } from "../../utils/task/taskNotifications.js";
import { getConnectTimeoutMs, TRANSPORT_FALLBACK_TIMEOUT_MS } from "../../services/mcp/client.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { recordPhase, recordFirstMessageReadFromSpawn } from "../../utils/startupTiming.js";
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
import {
  refreshSyncVeto,
  syncSettingsEnabled,
  isPluginsSyncEligible,
  isNotFoundServerError,
  isSyncRefusal,
} from "../../services/plugins/accountSync/syncedPluginHooks.js";
import {
  isPluginsSyncActive,
  isSkillsAsPluginsActive,
  rerunPluginsSync,
} from "../../utils/claudeAiSync/skillsSync.js";
import {
  listAccountPlugins,
  listErrorTelemetry,
  pluginListFingerprint,
} from "../../services/plugins/accountSync/listPlugins.js";
import { headlessProfilerCheckpoint } from "../../utils/headlessProfiler.js";
import { startEventLoopLagMonitor, LAG_SAMPLE_INTERVAL_MS } from "../../utils/eventLoopLag.js";
import { awaitFirstSkillsList } from "../../services/skillsSync/skillsSync.js";
import { addStartupContext } from "../../utils/startupProfiler.js";
import { remoteToolsState } from "../../remote/tools/callResults.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { marketplaceNameAnswerState } from "../../utils/plugins/marketplaceNames.js";
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

//@ chunk-tyg7f3ek.js:181110-181791 placement
/**
 * 遇到组织/席位额度上限的限流事件时，评估是否可在 IDE 横幅中"向管理员申请额度"。
 */
function evaluateAdminRequestWall(currentLimits) {
  let adminRequestPhase = getAdminRequestPhase();
  let r = adminRequestKeyForRateLimit(currentLimits);
  let subscriptionType = getSubscriptionType();
  if (
    r === null ||
    !isAdminLimitRequestGateOn() ||
    !isVsCodeTopSession() ||
    !isFirstPartyApiBackend() ||
    (subscriptionType !== "team" && subscriptionType !== "enterprise") ||
    isConsumerPlan() ||
    !isExtraUsageAllowed() ||
    (currentLimits.upgradePaths !== undefined && !currentLimits.upgradePaths.includes("overage")) ||
    isEssentialTrafficOnly()
  )
    return;
  let h = {
    key: r,
    reason: currentLimits.overageDisabledReason ?? "unknown",
    accountEpoch: getLimitsAccountEpoch(),
  };
  let y = null;
  if (adminRequestPhase.phase !== "idle" && isSameAdminRequestKey(adminRequestPhase.wall, h))
    switch (adminRequestPhase.phase) {
      case "checking":
      case "sending":
        return;
      case "quiet":
      case "ready":
      case "sent":
        if (Date.now() - adminRequestPhase.settledAt < ADMIN_REQUEST_SETTLED_COOLDOWN_MS) return;
        y = adminRequestPhase;
    }
  else if (adminRequestPhase.phase === "sending") return;
  setAdminRequestPhase({
    phase: "checking",
    wall: h,
    standing: y,
  });
  trackAdminRequest(
    withDeadline(
      runExtraUsage(
        {
          openInBrowser: false,
        },
        undefined,
      ).then(
        (result) => ({
          outcome: "answered",
          result,
        }),
        (error) => {
          logError(toError(error));
          return {
            outcome: "threw",
          };
        },
      ),
      EXTRA_USAGE_CHECK_TIMEOUT_MS,
    ).then((S) => {
      settleAdminRequestCheck(
        h,
        S ?? {
          outcome: "timed_out",
        },
        y !== null,
      );
    }),
  );
}
//@ chunk-tyg7f3ek.js:181791-181902 placement
function trackAdminRequest(e) {
  let adminRequestState = getAdminRequestState();
  let r = e
    .catch((error) => {
      logError(toError(error));
    })
    .finally(() => {
      if (adminRequestState.pending === r) adminRequestState.pending = null;
    });
  adminRequestState.pending = r;
}
//@ chunk-tyg7f3ek.js:181902-182987 placement
function settleAdminRequestCheck(e, n, recheck) {
  let adminRequestPhase = getAdminRequestPhase();
  if (adminRequestPhase.phase !== "checking" || !isSameAdminRequestKey(adminRequestPhase.wall, e)) return;
  let settledAt = Date.now();
  let standing = adminRequestPhase.standing;
  switch (n.outcome) {
    case "timed_out":
    case "threw": {
      let L = n.outcome === "timed_out" ? "checks_timeout" : "checks_failed";
      logFeatureBad("ide_admin_limit_request", L);
      setAdminRequestPhase(
        standing === null
          ? {
              phase: "quiet",
              wall: e,
              cause: L,
              settledAt,
            }
          : {
              ...standing,
              settledAt,
            },
      );
      return;
    }
    case "answered":
      break;
  }
  let S = n.result;
  let R = adminRequestVerdict(S, e.reason);
  if (R === "usage_unread" && standing !== null) {
    setAdminRequestPhase({
      ...standing,
      settledAt,
    });
    return;
  }
  if (R === "nothing_to_file" || R === "usage_unread") {
    setAdminRequestPhase({
      phase: "quiet",
      wall: e,
      cause: R,
      settledAt,
    });
    return;
  }
  let adminLimitRequestConfig = readAdminLimitRequestConfig();
  let checked = S.type === "confirm-admin-request" ? S.checked : true;
  logEvent("tengu_tallow_quoit_wall", {
    surface: lit("ide_banner"),
    reason: fromEnum(e.reason),
    verdict: fromEnum(R),
    offered: adminLimitRequestConfig !== null,
    checked,
    recheck,
  });
  if (adminLimitRequestConfig === null) {
    setAdminRequestPhase({
      phase: "quiet",
      wall: e,
      cause: "flag_off",
      settledAt,
    });
    return;
  }
  if (standing?.phase === "sent" && (R === "pending" || (S.type === "confirm-admin-request" && !S.checked))) {
    setAdminRequestPhase({
      ...standing,
      copy: adminLimitRequestConfig,
      settledAt,
    });
    return;
  }
  setAdminRequestPhase({
    phase: "ready",
    wall: e,
    verdict: R,
    extraUsage: S.type === "confirm-admin-request" ? S.extraUsage : undefined,
    copy: adminLimitRequestConfig,
    checked,
    settledAt,
    lastFileFailed: false,
    revision: 0,
  });
}
//@ chunk-tyg7f3ek.js:182987-183389 placement
function adminRequestVerdict(e, reason) {
  switch (e.type) {
    case "confirm-admin-request":
      if (e.extraUsage === undefined) return "usage_unread";
      if (e.extraUsage === null) return "nothing_to_file";
      if (
        reason === "org_level_disabled_until" &&
        !(e.extraUsage.is_enabled && !e.extraUsage.disabled_reason)
      )
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
        ...(e.lastFileFailed && {
          lastFileFailed: true,
        }),
        ...(e.revision > 0 && {
          revision: e.revision,
        }),
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
  let n = adminRequestKeyForRateLimit(e);
  let adminRequestPhase = getAdminRequestPhase();
  if (
    n === null ||
    adminRequestPhase.phase === "idle" ||
    adminRequestPhase.wall.key !== n ||
    adminRequestPhase.wall.accountEpoch !== getLimitsAccountEpoch() ||
    !isAdminLimitRequestGateOn() ||
    isEssentialTrafficOnly()
  )
    return;
  switch (adminRequestPhase.phase) {
    case "checking":
      return adminRequestPhase.standing === null
        ? undefined
        : adminRequestBannerState(adminRequestPhase.standing);
    case "quiet":
    case "ready":
    case "sent":
      return adminRequestBannerState(adminRequestPhase);
    case "sending":
      return {
        state: "sending",
        label: adminRequestPhase.copy.label,
        doneLabel: adminRequestPhase.copy.doneLabel,
        confirm: adminRequestPhase.copy.confirm,
        confirmPrompt: adminRequestPhase.copy.confirmPrompt,
      };
  }
}
//@ chunk-tyg7f3ek.js:184193-184895 placement
/**
 * 用户确认后提交"向管理员申请额度"请求并上报 tengu_tallow_quoit_filed。
 */
function fileAdminLimitRequest() {
  let adminRequestPhase = getAdminRequestPhase();
  let n =
    adminRequestPhase.phase === "ready"
      ? adminRequestPhase
      : adminRequestPhase.phase === "checking" && adminRequestPhase.standing?.phase === "ready"
        ? adminRequestPhase.standing
        : null;
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
    let R = {
      ...n,
      lastFileFailed: true,
      revision: n.revision + 1,
    };
    setAdminRequestPhase(
      adminRequestPhase.phase === "checking"
        ? {
            ...adminRequestPhase,
            standing: R,
          }
        : R,
    );
    return;
  }
  let { wall, extraUsage, copy } = n;
  setAdminRequestPhase({
    phase: "sending",
    wall,
    extraUsage,
    copy,
  });
  let S = false;
  trackAdminRequest(
    withDeadline(
      fileAdminLimitRequest_2(extraUsage, undefined, (R) => {
        S = true;
        markAdminRequestSent(wall, R);
      }),
      ADMIN_REQUEST_FILING_TIMEOUT_MS,
    ).then((R) => {
      reportAdminRequestFiled(wall, R?.outcome ?? (S ? "granted" : "failed"));
    }),
  );
}
//@ chunk-tyg7f3ek.js:184895-185073 placement
function markAdminRequestSent(wall, n) {
  let adminRequestPhase = getAdminRequestPhase();
  if (adminRequestPhase.phase !== "sending" || !isSameAdminRequestKey(adminRequestPhase.wall, wall)) return;
  setAdminRequestPhase({
    phase: "sent",
    wall,
    copy: isValidAdminRequestLabel(n)
      ? {
          ...adminRequestPhase.copy,
          doneLabel: n,
        }
      : adminRequestPhase.copy,
    alreadyFiled: false,
    settledAt: Date.now(),
  });
}
//@ chunk-tyg7f3ek.js:185073-185803 placement
function reportAdminRequestFiled(wall, n) {
  let r = n === "filed" || n === "already_filed" || n === "granted";
  logEvent("tengu_tallow_quoit_filed", {
    surface: lit("ide_banner"),
    outcome: fromEnum(n),
  });
  if (r) logFeatureOk("ide_admin_limit_request");
  else logFeatureBad("ide_admin_limit_request", n);
  let adminRequestPhase = getAdminRequestPhase();
  if (
    n === "granted" &&
    adminRequestPhase.phase === "sent" &&
    isSameAdminRequestKey(adminRequestPhase.wall, wall)
  ) {
    evaluateAdminRequestWall(getCurrentLimits());
    return;
  }
  if (adminRequestPhase.phase !== "sending" || !isSameAdminRequestKey(adminRequestPhase.wall, wall)) return;
  let settledAt = Date.now();
  switch (n) {
    case "granted":
    case "filed":
    case "already_filed":
      setAdminRequestPhase({
        phase: "sent",
        wall,
        copy: adminRequestPhase.copy,
        alreadyFiled: n === "already_filed",
        settledAt,
      });
      break;
    case "refused":
      setAdminRequestPhase({
        phase: "quiet",
        wall,
        cause: "refused",
        settledAt,
      });
      break;
    case "failed":
      setAdminRequestPhase({
        phase: "ready",
        wall,
        verdict: "can_ask",
        extraUsage: adminRequestPhase.extraUsage,
        copy: adminRequestPhase.copy,
        checked: true,
        settledAt,
        lastFileFailed: true,
        revision: 0,
      });
      break;
  }
  evaluateAdminRequestWall(getCurrentLimits());
}
//@ chunk-tyg7f3ek.js:185803-186643 placement
/**
 * 把限流事件转成 SDK rate_limit_event 帧发给宿主，并附带额度申请横幅状态。
 */
function createRateLimitFrameRelay({ emit, sessionState, bridgeHandle }) {
  let s = null;
  let h = undefined;
  let y = false;
  let S = (G) => {
    let Z = y;
    y = true;
    try {
      let re = G.status === "rejected";
      if (re) offerCreditAtBand(G);
      evaluateAdminRequestWall(G);
      let Ae = re ? adminRequestStateForEvent(G) : undefined;
      let rateLimitInfo = buildRateLimitInfo(G, re ? getOfferBanner() : undefined, Ae);
      if (!rateLimitInfo) return;
      s = re ? G : null;
      h = Ae;
      emit(rateLimitInfo);
      let ce = bridgeHandle();
      if (ce) forwardRateLimitEventToBridge(ce, rateLimitInfo);
      else {
        let nt = forwardRateLimitEvent(sessionState, rateLimitInfo);
        if (nt) sessionState.notifyMetadataChanged(nt);
      }
    } catch (error) {
      logForDebugging(`[rateLimitFrames] listener failed: ${errorMessage(error)}`, {
        level: "error",
      });
    } finally {
      y = Z;
    }
  };
  let R = onLimitsStatusChanged(S);
  let rateLimitEventThrottle = createRateLimitEventThrottle();
  let P = onQuotaRejected((G) => {
    if (isQuotaRejectedReemitEnabled() && rateLimitEventThrottle(G)) S(G);
  });
  let L = null;
  let q = onCreditOfferPromptChange(() => {
    if (y || s === null || L === s || getOfferBanner() === undefined) return;
    L = s;
    S(s);
  });
  let x = subscribeAdminRequestPhase(() => {
    if (y || s === null) return;
    let G = adminRequestStateForEvent(s);
    if (
      G === undefined || h === undefined
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
    R();
    P();
    q();
    x();
  };
}
//@ chunk-tyg7f3ek.js:186643-186749 placement
function installSdkEventDrain({ drain, emit }) {
  let r = () => {
    for (let s of drain()) emit(s);
  };
  setTaskNotificationListener(r);
  return {
    close: () => {
      setTaskNotificationListener(null);
      r();
    },
  };
}
//@ chunk-tyg7f3ek.js:186749-188220 placement
class SdkMcpServerWait {
  sdkUrl;
  unconnectedServers;
  updateSdkMcp;
  relayWaitLeftMs;
  waitedFor = new WeakSet();
  firstQueryReleased = false;
  constructor({ sdkUrl, unconnectedServers, updateSdkMcp, relayWaitLeftMs }) {
    this.sdkUrl = sdkUrl;
    this.unconnectedServers = unconnectedServers;
    this.updateSdkMcp = updateSdkMcp;
    this.relayWaitLeftMs = relayWaitLeftMs;
  }
  noteEntryWait() {
    if (this.sdkUrl) for (let e of this.unconnectedServers()) this.waitedFor.add(e);
  }
  get firstQueryAhead() {
    return Boolean(this.sdkUrl) && !this.firstQueryReleased;
  }
  markFirstQueryReleased() {
    this.firstQueryReleased = true;
  }
  join(e) {
    if (!this.sdkUrl || e.shouldQuery === false) return null;
    let filtered = this.unconnectedServers().filter((S) => !this.waitedFor.has(S));
    let r = filtered.length;
    if (r === 0) {
      this.markFirstQueryReleased();
      return null;
    }
    for (let S of filtered) this.waitedFor.add(S);
    let max = Math.max(getConnectTimeoutMs(), this.relayWaitLeftMs?.() ?? 0);
    let startTime = performance.now();
    let y = this.updateSdkMcp("skip");
    y.then(
      () => this.markFirstQueryReleased(),
      () => this.markFirstQueryReleased(),
    );
    return withDeadline(
      y.then(() => true),
      max,
    )
      .then((S) => {
        this.markFirstQueryReleased();
        let R = S !== true;
        if (R) y.catch(logError);
        let rounded = Math.round(performance.now() - startTime);
        let mapped = this.unconnectedServers()
          .filter((L) => filtered.includes(L))
          .map((L) => L.name);
        logForDiagnosticsNoPII(R ? "warn" : "info", "sdk_mcp_first_query_wait", {
          budget_ms: max,
          waited_ms: rounded,
          pending_servers: r,
          timed_out: R,
          still_pending_servers: mapped.length,
        });
        recordPhase("sdk_mcp_first_query_wait_ms", rounded, startTime);
        if (mapped.length > 0)
          logForDebugging(
            `Waited ${rounded} ms for SDK MCP servers that are still connecting (${mapped.join(", ")}); this turn starts without their tools, which become available when they connect.`,
            {
              level: "warn",
            },
          );
      })
      .catch(logError);
  }
}
//@ chunk-tyg7f3ek.js:188257-188353 placement
var NON_HUMAN_TURN_ORIGINS = new Set([
  "scheduled",
  "task_notification",
  "auto_continuation",
  "host_synthetic",
  "system",
]);
//@ chunk-tyg7f3ek.js:188353-188415 placement
function pausedSuggestionReasonSafe(e) {
  try {
    return pausedPromptSuggestionReason(e);
  } catch (error) {
    logError(toError(error));
    return null;
  }
}
//@ chunk-tyg7f3ek.js:188415-188593 placement
function pausedPromptSuggestionReason({ paused, turnOrigin }) {
  let r;
  if (paused) r = "host_paused";
  else {
    let s = turnOrigin();
    if (s === undefined || !NON_HUMAN_TURN_ORIGINS.has(s)) return null;
    r = "not_user_started";
  }
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_chomp_sable", false) ? r : null;
}
//@ chunk-tyg7f3ek.js:188593-188606 placement
var PROMPT_SUGGESTION_TIMEOUT_MS = 30000;
//@ chunk-tyg7f3ek.js:188606-191278 placement
/**
 * SDK 模式下在轮次之间生成并发送 prompt_suggestion（仅缓存热时）。
 */
class PromptSuggestionEmitter {
  abortController = null;
  inflightPromise = null;
  paused = false;
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
    emit,
    promptSuggestions,
    shuttingDown,
    holdsResults,
    cacheSafeParams,
    turnOrigin,
    generate,
  }) {
    this.emit = emit;
    this.promptSuggestions = promptSuggestions;
    this.shuttingDown = shuttingDown;
    this.holdsResults = holdsResults;
    this.cacheSafeParams = cacheSafeParams;
    this.turnOrigin = turnOrigin;
    this.generate = generate;
  }
  setPaused(paused) {
    this.paused = paused;
  }
  onCommand(e, n) {
    if (e.shouldQuery === false) return;
    this.abortController?.abort();
    this.abortController = null;
    this.pendingSuggestion = null;
    this.pendingLastEmittedEntry = null;
    if (this.lastEmitted && e.mode === "prompt") {
      let userInput = typeof n === "string" ? n : n.find((s) => s.type === "text")?.text;
      if (typeof userInput === "string")
        logSuggestionOutcome(
          this.lastEmitted.text,
          userInput,
          this.lastEmitted.emittedAt,
          this.lastEmitted.generationRequestId,
        );
      this.lastEmitted = null;
    }
  }
  afterResult(e) {
    if (
      !this.promptSuggestions() ||
      e.shouldQuery === false ||
      this.shuttingDown() ||
      env.CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION === false
    )
      return;
    this.abortController?.abort();
    let abortController = new AbortController();
    this.abortController = abortController;
    let r = pausedSuggestionReasonSafe({
      paused: this.paused,
      turnOrigin: this.turnOrigin,
    });
    if (r) {
      try {
        logSuggestionSuppressed(r, "sdk");
      } catch (error) {
        logError(toError(error));
      }
      return;
    }
    let s = this.cacheSafeParams();
    if (!s) {
      logSuggestionSuppressed("sdk_no_params", "sdk");
      return;
    }
    let h = {
      promise: null,
    };
    h.promise = (async () => {
      try {
        let y = await this.generate(abortController, s);
        if (!y || abortController.signal.aborted) return;
        let S = {
          type: "prompt_suggestion",
          suggestion: y.suggestion,
          uuid: randomUUID(),
          session_id: getSessionId(),
        };
        let R = {
          text: y.suggestion,
          emittedAt: Date.now(),
          generationRequestId: y.generationRequestId,
        };
        if (this.holdsResults()) {
          this.pendingSuggestion = S;
          this.pendingLastEmittedEntry = {
            text: R.text,
            generationRequestId: R.generationRequestId,
          };
        } else {
          this.lastEmitted = R;
          this.emit(S);
        }
      } catch (error) {
        if (error instanceof Error && (error.name === "AbortError" || error.name === "APIUserAbortError")) {
          logSuggestionSuppressed("aborted", "sdk");
          return;
        }
        logError(toError(error));
      } finally {
        if (this.inflightPromise === h.promise) this.inflightPromise = null;
      }
    })();
    this.inflightPromise = h.promise;
  }
  emitPending() {
    if (this.pendingSuggestion) {
      this.emit(this.pendingSuggestion);
      if (this.pendingLastEmittedEntry) {
        this.lastEmitted = {
          ...this.pendingLastEmittedEntry,
          emittedAt: Date.now(),
        };
        this.pendingLastEmittedEntry = null;
      }
      this.pendingSuggestion = null;
    }
  }
  discard() {
    this.abortController?.abort();
    this.abortController = null;
    this.lastEmitted = null;
    this.pendingSuggestion = null;
  }
  abort() {
    this.abortController?.abort();
  }
  settle() {
    if (this.inflightPromise) return this.settleInflight(this.inflightPromise);
    this.abortController?.abort();
    this.abortController = null;
    return;
  }
  async settleInflight(e) {
    let timer = setTimeout((r) => r?.abort(), PROMPT_SUGGESTION_TIMEOUT_MS, this.abortController);
    try {
      await e;
    } finally {
      clearTimeout(timer);
    }
    this.abortController?.abort();
    this.abortController = null;
  }
}
//@ chunk-tyg7f3ek.js:191278-191524 placement
function createPromptSuggestionEmitter({ messages, getAppState, ...r }) {
  return new PromptSuggestionEmitter({
    ...r,
    cacheSafeParams: getLastCacheSafeParams,
    turnOrigin: () => getTurnOrigin(messages),
    generate: (abortController, h) => {
      if (!isMainThreadCacheWarm()) {
        logSuggestionSuppressed("cache_cold", "sdk", {
          cacheColdBy: "prefix_not_warm",
        });
        return Promise.resolve(null);
      }
      return tryGenerateSuggestion(abortController, messages, getAppState, h, "sdk");
    },
  });
}
//@ chunk-tyg7f3ek.js:191524-191928 placement
/**
 * 账号插件启动检查：特性默认值、检查间隔与退避（60s 起、2 倍、30 分钟上限）、超时与连续拒绝上限，以及两项未检查/未重载提示文本。
 */
var ACCOUNT_PLUGINS_CHECK_CONSTANTS = "tengu_ccr_plugins_turn_start_check_enabled";
var ACCOUNT_PLUGINS_CHECK_DEFAULT = true;
var ACCOUNT_PLUGINS_CHECK_INTERVAL_MS = 60000;
var ACCOUNT_PLUGINS_MIN_CHECKS = 2;
var ACCOUNT_PLUGINS_CHANGE_TTL_MS = 1800000;
var ACCOUNT_PLUGINS_RETRY_MS = 5000;
var ACCOUNT_PLUGINS_CHECK_TIMEOUT_MS = 30000;
var ACCOUNT_PLUGINS_MAX_REFUSALS = 3;
var ACCOUNT_PLUGINS_REFUSAL_LIMIT = 2;
var ACCOUNT_PLUGINS_UNCHECKED = "account-plugins-unchecked";
var ACCOUNT_PLUGINS_UNCHECKED_TEXT =
  "Couldn't check your plugins for updates. The versions already loaded are still in use.";
var ACCOUNT_PLUGINS_NOT_RELOADED = "account-plugins-not-reloaded";
var ACCOUNT_PLUGINS_NOT_RELOADED_TEXT =
  "Couldn't finish reloading your plugins after a change. Parts of their earlier versions may still be in use until a reload succeeds.";
//@ chunk-tyg7f3ek.js:191928-192027 placement
function isAccountPluginsCheckEnabled(session) {
  return (
    env.CLAUDE_CODE_REMOTE === true &&
    env.CLAUDE_CODE_SYNC_PLUGINS === true &&
    !isSessionRefsSyncEnabled(session) &&
    getFeatureValue_CACHED_MAY_BE_STALE(ACCOUNT_PLUGINS_CHECK_CONSTANTS, ACCOUNT_PLUGINS_CHECK_DEFAULT)
  );
}
//@ chunk-tyg7f3ek.js:192027-192130 placement
var notifyAccountPluginsUnchecked = () =>
  enqueueTaskNotification({
    type: "system",
    subtype: "notification",
    key: ACCOUNT_PLUGINS_UNCHECKED,
    text: ACCOUNT_PLUGINS_UNCHECKED_TEXT,
    priority: "medium",
    color: "warning",
  });
//@ chunk-tyg7f3ek.js:192130-195841 placement
/**
 * CCR 会话每轮开始检查账户插件是否有更新（tengu_ccr_plugins_turn_start_check_enabled），失败/拒绝时告知用户。
 */
class AccountPluginsChecker {
  session;
  credentials;
  checkedAt;
  failuresInARow = 0;
  isChecking = false;
  refusalsInARow = 0;
  roundAtRefusal = null;
  isToldOfRefusal = false;
  unlandedStamp = null;
  unlandedRounds = 0;
  unlandedRoundAt = 0;
  failedReloads = 0;
  failedReloadAt = 0;
  reloadedAtFailedReload = null;
  constructor(session, credentials) {
    this.session = session;
    this.credentials = credentials;
    this.checkedAt = session.host.clock.now();
  }
  atTurnStart(isWaitedFor = true) {
    let n = this.session.host.clock.now();
    if (!this.isDueAt(n)) return;
    this.checkedAt = n;
    this.isChecking = true;
    return this.syncedIfListingChanged()
      .then((r) => {
        logForDiagnosticsNoPII("info", "plugins_sync_turn_start_check_done", {
          is_changed: r,
          is_waited_for: isWaitedFor,
          duration_ms: this.session.host.clock.now() - n,
        });
        return r;
      })
      .finally(() => {
        this.isChecking = false;
      });
  }
  isDueAt(e) {
    let n = e - this.checkedAt;
    let pluginsSync = this.session.pluginsSync;
    if (
      this.refusalsInARow > 0 &&
      pluginsSync.firstSyncPromise !== this.roundAtRefusal &&
      pluginsSync.accountListing === "listed"
    )
      this.refusalsInARow = 0;
    return (
      !this.isChecking &&
      this.refusalsInARow < ACCOUNT_PLUGINS_REFUSAL_LIMIT &&
      (n < 0 || n >= ACCOUNT_PLUGINS_CHECK_INTERVAL_MS) &&
      isAccountPluginsCheckEnabled(this.session)
    );
  }
  isCheckDue() {
    return this.isDueAt(this.session.host.clock.now());
  }
  hasLandedChange() {
    let syncedPluginReloadDebt = getSyncedPluginReloadDebt();
    return (
      syncedPluginReloadDebt.changesLanded !== syncedPluginReloadDebt.changesReloaded &&
      isAccountPluginsCheckEnabled(this.session)
    );
  }
  isReloadOwed() {
    return !getSyncedPluginReloadDebt().reloadHeld && this.hasLandedChange();
  }
  isReloadTryDue() {
    let e = this.session.host.clock.now() - this.failedReloadAt;
    return !(this.failedReloads > 0 && e >= 0 && e < ACCOUNT_PLUGINS_CHECK_INTERVAL_MS);
  }
  reloadEnded(e, n) {
    let failedReloads = n === this.reloadedAtFailedReload ? this.failedReloads : 0;
    this.failedReloads = e ? failedReloads + 1 : 0;
    this.failedReloadAt = this.session.host.clock.now();
    this.reloadedAtFailedReload = getSyncedPluginReloadDebt().changesReloaded;
    if (e)
      logForDiagnosticsNoPII("warn", "plugins_sync_turn_start_reload_failed", {
        failures_in_a_row: this.failedReloads,
      });
    if (e && this.failedReloads === ACCOUNT_PLUGINS_MAX_REFUSALS) {
      logFeatureSad("plugins_sync_turn_start_check", "reload_failed", {
        failures_in_a_row: this.failedReloads,
        hosted: true,
      });
      enqueueTaskNotification({
        type: "system",
        subtype: "notification",
        key: ACCOUNT_PLUGINS_NOT_RELOADED,
        text: ACCOUNT_PLUGINS_NOT_RELOADED_TEXT,
        priority: "medium",
        color: "warning",
      });
    }
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
      await pluginsSync.firstSyncPromise?.catch(() => {});
      refreshSyncVeto();
      if (!isPluginsSyncActive(this.session) || !syncSettingsEnabled() || isPluginsSyncEligible())
        return false;
      let roundAtRefusal = pluginsSync.firstSyncPromise;
      let s = await listAccountPlugins({
        isBackground: true,
        credentials: this.credentials,
        ...(isSkillsAsPluginsActive(this.session) && {
          convertedSkillsAsPlugins: true,
        }),
      });
      let h = !s.success && !isNotFoundServerError(s);
      let y = h && isSyncRefusal(s);
      if (y) {
        this.refusalsInARow++;
        this.roundAtRefusal = roundAtRefusal;
        logForDiagnosticsNoPII("warn", "plugins_sync_turn_start_check_refused", {
          refusals_in_a_row: this.refusalsInARow,
          ...listErrorTelemetry(s),
        });
        logFeatureSad("plugins_sync_turn_start_check", "list_refused", {
          refusals_in_a_row: this.refusalsInARow,
        });
      }
      if (
        y &&
        this.refusalsInARow >= ACCOUNT_PLUGINS_REFUSAL_LIMIT &&
        !this.isToldOfRefusal &&
        getSyncedPluginDirs().length > 0
      ) {
        this.isToldOfRefusal = true;
        notifyAccountPluginsUnchecked();
      }
      if (y) return false;
      this.refusalsInARow = 0;
      if (h) {
        this.noteFailure("list_failed", listErrorTelemetry(s));
        return false;
      }
      if (s.success && s.degraded === true) {
        this.noteFailure("list_degraded", {});
        return false;
      }
      this.failuresInARow = 0;
      let w = pluginListFingerprint(s.success ? s.plugins : []);
      let P = this.session.host.clock.now() - this.unlandedRoundAt;
      let L =
        w === this.unlandedStamp &&
        P >= 0 &&
        P <
          Math.min(
            ACCOUNT_PLUGINS_CHECK_INTERVAL_MS * ACCOUNT_PLUGINS_MIN_CHECKS ** this.unlandedRounds,
            ACCOUNT_PLUGINS_CHANGE_TTL_MS,
          );
      if (!(w !== pluginsSync.listedStamp && !L)) return false;
      let changesLanded = getSyncedPluginReloadDebt().changesLanded;
      let G = await rerunPluginsSync(this.session, this.credentials);
      if (pluginsSync.listedStamp === null) {
        this.unlandedRounds = w === this.unlandedStamp ? this.unlandedRounds + 1 : 1;
        this.unlandedStamp = w;
        this.unlandedRoundAt = this.session.host.clock.now();
        logFeatureSad("plugins_sync_turn_start_check", "round_incomplete", {
          rounds_for_listing: this.unlandedRounds,
        });
      } else this.unlandedStamp = null;
      if (pluginsSync.listedStamp !== null && G) logFeatureOk("plugins_sync_turn_start_check");
      return G || getSyncedPluginReloadDebt().changesLanded !== changesLanded;
    } catch (error) {
      logError(error);
      this.refusalsInARow = 0;
      this.noteFailure("error", {});
      return false;
    }
  }
  noteFailure(e, n) {
    this.failuresInARow++;
    logForDiagnosticsNoPII("warn", "plugins_sync_turn_start_check_failed", {
      failure: e,
      failures_in_a_row: this.failuresInARow,
      ...n,
    });
    logFeatureSad("plugins_sync_turn_start_check", e, {
      failures_in_a_row: this.failuresInARow,
      hosted: true,
    });
    if (this.failuresInARow === ACCOUNT_PLUGINS_MAX_REFUSALS) notifyAccountPluginsUnchecked();
  }
}
//@ chunk-tyg7f3ek.js:195841-211742 placement
/**
 * 轮次开始前的检查集合：延迟命令、SessionStart 钩子、SDK MCP 更新、插件检查、parked 权限退役等。
 */
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
  isRefillLanded = false;
  applyPluginMcpDiff;
  connectedNonDynamicMcpServerNames;
  serverNamesOwnedBeforePluginsSync;
  pendingPluginRefresh;
  pluginRefreshJoined;
  mcpClientCountAtKick;
  mcpPrewaitPromise;
  firstCommandMountJoin;
  mcpPrewait;
  firstCommandTaken = false;
  waitForPendingMcp;
  store;
  allMcpClients;
  registerElicitationHandlers;
  registerChannelHandler;
  buildAllTools;
  enterPhase;
  session;
  accountPluginsFreshness;
  isPastFirstTake = false;
  accountPluginsNeedReload = false;
  unwaitedAccountPluginsCheck;
  isAccountPluginsReloadRunning = false;
  accountPluginsReloadsStarted = 0;
  triesSkippedForRunningReload = 0;
  firstMessageRecorded = false;
  sdkMcpBackgroundRetry;
  skillsSync;
  accountSkillsSyncRepopulatePending;
  pluginsSyncNeedsRefresh = false;
  serversStartedSinceKick = new Set();
  lateForwardedInstallNeedsRefresh = false;
  backgroundRefreshEnabled = false;
  constructor({
    deferredCommandsJoin,
    parkedPermissionRetirement,
    takeClaimSessionStartHooks = () => {
      return;
    },
    takeNewPluginsSessionStart = () => {
      return;
    },
    runSessionStartHooksOfNewPlugins = () => {
      return;
    },
    sdkUrl,
    sdkMcpUpdateKind,
    sdkMcpServersPending,
    sdkToolRelistPending,
    updateSdkMcp,
    noteSdkEntryWait = () => {},
    skillsSync,
    skillsSyncStartedAt,
    accountSkillsSyncRepopulate,
    refreshCurrentCommands,
    pluginStateRefreshTickets,
    pluginStartupPending,
    resolveDeferredPluginStartup,
    closePluginInstallBracket,
    backgroundInstall,
    refreshPluginState,
    refillMarketplaces,
    applyPluginMcpDiff,
    connectedNonDynamicMcpServerNames,
    serverNamesOwnedBeforePluginsSync,
    pendingPluginRefresh,
    pluginRefreshJoined,
    mcpClientCountAtKick,
    mcpPrewaitPromise,
    firstCommandMountJoin,
    mcpPrewait,
    waitForPendingMcp,
    store,
    allMcpClients,
    registerElicitationHandlers,
    registerChannelHandler,
    buildAllTools,
    enterPhase,
    session,
    credentials,
  }) {
    this.deferredCommandsJoin = deferredCommandsJoin;
    this.parkedPermissionRetirement = parkedPermissionRetirement;
    this.takeClaimSessionStartHooks = takeClaimSessionStartHooks;
    this.takeNewPluginsSessionStart = takeNewPluginsSessionStart;
    this.runSessionStartHooksOfNewPlugins = runSessionStartHooksOfNewPlugins;
    this.sdkUrl = sdkUrl;
    this.sdkMcpUpdateKind = sdkMcpUpdateKind;
    this.sdkMcpServersPending = sdkMcpServersPending;
    this.sdkToolRelistPending = sdkToolRelistPending;
    this.updateSdkMcp = updateSdkMcp;
    this.noteSdkEntryWait = noteSdkEntryWait;
    this.skillsSync = skillsSync;
    this.skillsSyncStartedAt = skillsSyncStartedAt;
    this.accountSkillsSyncRepopulatePending = accountSkillsSyncRepopulate;
    this.refreshCurrentCommands = refreshCurrentCommands;
    this.pluginStateRefreshTickets = pluginStateRefreshTickets;
    this.pluginStartupPending = pluginStartupPending;
    this.resolveDeferredPluginStartup = resolveDeferredPluginStartup;
    this.closePluginInstallBracket = closePluginInstallBracket;
    this.backgroundInstall = backgroundInstall;
    this.refreshPluginState = refreshPluginState;
    this.refillMarketplaces = refillMarketplaces;
    this.applyPluginMcpDiff = applyPluginMcpDiff;
    this.connectedNonDynamicMcpServerNames = connectedNonDynamicMcpServerNames;
    this.serverNamesOwnedBeforePluginsSync = serverNamesOwnedBeforePluginsSync;
    this.pendingPluginRefresh = pendingPluginRefresh;
    this.pluginRefreshJoined = pluginRefreshJoined;
    this.mcpClientCountAtKick = mcpClientCountAtKick;
    this.mcpPrewaitPromise = mcpPrewaitPromise;
    this.firstCommandMountJoin = firstCommandMountJoin;
    this.mcpPrewait = mcpPrewait;
    this.waitForPendingMcp = waitForPendingMcp;
    this.store = store;
    this.allMcpClients = allMcpClients;
    this.registerElicitationHandlers = registerElicitationHandlers;
    this.registerChannelHandler = registerChannelHandler;
    this.buildAllTools = buildAllTools;
    this.enterPhase = enterPhase;
    this.session = session;
    this.accountPluginsFreshness = new AccountPluginsChecker(session, credentials);
  }
  notePluginsSyncLanded() {
    this.pluginsSyncNeedsRefresh = true;
  }
  noteLateForwardedInstall() {
    this.lateForwardedInstallNeedsRefresh = true;
  }
  noteReloadedByHost(e) {
    if (getSyncedPluginReloadDebt().reloadsCompleted !== e) {
      this.accountPluginsNeedReload = false;
      this.accountPluginsFreshness.reloadedElsewhere();
    }
  }
  noteServersStartedSinceKick(e) {
    for (let n of e) this.serversStartedSinceKick.add(n);
  }
  *beforeDrain() {
    if (this.deferredCommandsJoin) yield this.deferredCommandsJoin;
    let e = this.parkedPermissionRetirement();
    if (e) yield e;
    headlessProfilerCheckpoint("run_entry");
    let n;
    let r;
    let s;
    let h;
    let y;
    if (!this.firstMessageRecorded) {
      this.firstMessageRecorded = true;
      n = performance.now();
      recordPhase("first_message_read_ms", n, 0);
      recordFirstMessageReadFromSpawn();
      r = process.cpuUsage();
      s = startEventLoopLagMonitor(LAG_SAMPLE_INTERVAL_MS);
    }
    try {
      this.enterPhase("sdk_mcp_update");
      let startTime = performance.now();
      if (this.sdkUrl) {
        this.noteSdkEntryWait();
        let P = this.sdkMcpUpdateKind();
        let L = this.sdkToolRelistPending();
        if (P !== "retry_failed" || (L && !this.sdkMcpBackgroundRetry)) {
          let q = this.updateSdkMcp("skip");
          if (P !== "none" || L) {
            let x = this.sdkUpdateWaitBudgetMs();
            if (
              (yield withDeadline(
                q.then(() => true),
                x,
              )) !== true
            ) {
              q.catch(logError);
              let pendingServers = this.sdkMcpServersPending();
              let relayMarked = this.mcpPrewait.relayMarked;
              let relayHold = this.mcpPrewait.relayHold;
              logEvent("tengu_sdk_mcp_update_wait_timeout", {
                budget_ms: x,
                pending_servers: pendingServers,
                relay_marked: relayMarked,
                relay_hold: relayHold,
              });
              logForDiagnosticsNoPII("warn", "sdk_mcp_update_wait_timeout", {
                budget_ms: x,
                pending_servers: pendingServers,
                relay_marked: relayMarked,
                relay_hold: relayHold,
              });
            }
          } else yield q;
        }
        if (!this.sdkMcpBackgroundRetry && this.sdkMcpUpdateKind() === "retry_failed") {
          logForDiagnosticsNoPII("info", "sdk_mcp_retry_not_awaited");
          this.sdkMcpBackgroundRetry = this.updateSdkMcp()
            .catch(logError)
            .finally(() => {
              this.sdkMcpBackgroundRetry = undefined;
            });
        }
      } else yield this.updateSdkMcp();
      recordPhase("sdk_mcp_update_ms", performance.now() - startTime, startTime);
      headlessProfilerCheckpoint("after_updateSdkMcp");
      this.enterPhase("entry_joins");
      let R = this.takeClaimSessionStartHooks();
      if (R) {
        let startTime = performance.now();
        yield R;
        recordPhase("claim_hooks_join_ms", performance.now() - startTime, startTime);
        headlessProfilerCheckpoint("after_claimSessionStartHooks");
      }
      if (this.skillsSync) {
        let startTime = performance.now();
        yield awaitFirstSkillsList(this.skillsSync, this.skillsSyncStartedAt);
        recordPhase("skills_sync_wait_ms", performance.now() - startTime, startTime);
        if (env.CLAUDE_CODE_CCR_FOLD_FIRST_TURN_RESCAN && this.pluginStartupPending()) {
          y = this.pluginStateRefreshTickets().started;
          addStartupContext({
            fold_first_turn_rescan: 1,
          });
        } else {
          let startTime = performance.now();
          yield this.refreshCurrentCommands();
          recordPhase("skills_sync_commands_refresh_ms", performance.now() - startTime, startTime);
        }
        this.skillsSync = null;
      } else if (this.accountSkillsSyncRepopulatePending) {
        this.accountSkillsSyncRepopulatePending = false;
        if (remoteToolsState().firstRoundEmitted) yield this.refreshCurrentCommands();
      }
      if (this.pluginStartupPending()) yield this.resolveDeferredPluginStartup();
      if (y !== undefined)
        if (this.pluginStateRefreshTickets().lastCompletedStart > y)
          recordPhase("skills_sync_commands_refresh_ms", 0);
        else {
          let startTime = performance.now();
          yield this.refreshCurrentCommands();
          recordPhase("skills_sync_commands_refresh_ms", performance.now() - startTime, startTime);
        }
      let w = this.takeNewPluginsSessionStart();
      if (w) {
        let startTime = performance.now();
        yield w;
        recordPhase("new_plugin_hooks_join_ms", performance.now() - startTime, startTime);
      }
    } finally {
      h = s?.stop();
      this.closePluginInstallBracket();
    }
    this.backgroundRefreshEnabled = env.CLAUDE_CODE_ENABLE_BACKGROUND_PLUGIN_REFRESH;
    if (n !== undefined && r && h !== undefined) {
      recordPhase("first_message_handle_ms", performance.now() - n, n);
      let S = process.cpuUsage(r);
      recordPhase("first_message_handle_cpu_ms", (S.user + S.system) / 1000);
      recordPhase("first_message_handle_loop_lag_ms", h);
    }
  }
  sdkUpdateWaitBudgetMs() {
    let connectTimeoutMs = getConnectTimeoutMs();
    let n =
      this.mcpPrewait.relayHold && !this.firstCommandTaken
        ? this.mcpPrewait.freshWaitDeadlineMs?.()
        : undefined;
    return n === undefined ? connectTimeoutMs : Math.max(connectTimeoutMs, n);
  }
  async loopTop() {
    let lateForwardedInstallNeedsRefresh = this.lateForwardedInstallNeedsRefresh;
    let organizationAsk = getPluginRegistry().organizationAsk;
    if (organizationAsk.isCommandHeld && marketplaceNameAnswerState() === "unanswered") {
      let S = organizationAsk.answerWait !== null;
      await waitForOrganizationAnswer();
      if (S) askOrganizationOnce();
    }
    let r = organizationAsk.isCommandHeld && marketplaceNameAnswerState() !== "unanswered";
    let isRefillLanded = this.isRefillLanded;
    let h = r || isRefillLanded;
    if (
      ((this.backgroundRefreshEnabled && this.backgroundInstall?.needsRefresh) ||
        this.pluginsSyncNeedsRefresh ||
        lateForwardedInstallNeedsRefresh ||
        h) &&
      !this.isReloadHeldByHost()
    ) {
      if (this.backgroundInstall) this.backgroundInstall.needsRefresh = false;
      let pluginsSyncNeedsRefresh = this.pluginsSyncNeedsRefresh;
      this.pluginsSyncNeedsRefresh = false;
      this.lateForwardedInstallNeedsRefresh = false;
      let R = this.landedRoundAtLoopTop();
      let w = 0;
      try {
        let syncedPluginReloadDebt = getSyncedPluginReloadDebt();
        let reloadsCompleted = syncedPluginReloadDebt.reloadsCompleted;
        w = syncedPluginReloadDebt.changesReloaded;
        let q =
          pluginsSyncNeedsRefresh && !lateForwardedInstallNeedsRefresh
            ? await this.serverNamesOwnedBeforePluginsSync()
            : undefined;
        await this.refreshPluginState();
        organizationAsk.isCommandHeld &&= !r;
        this.isRefillLanded &&= !isRefillLanded;
        if (r && organizationAsk.isMarketplaceHeld) {
          organizationAsk.isMarketplaceHeld = false;
          this.refillMarketplaces().then((Ae) => {
            this.isRefillLanded ||= Ae;
          }, logError);
        }
        let x = lateForwardedInstallNeedsRefresh || q !== undefined;
        let G = false;
        if (lateForwardedInstallNeedsRefresh)
          G = await this.applyPluginMcpDiff(
            this.connectedNonDynamicMcpServerNames(),
            "late_plugin_install",
          ).then(
            () => false,
            (error) => {
              logForDebugging(`late plugin install: applyPluginMcpDiff failed: ${errorMessage(error)}`, {
                level: "error",
              });
              return true;
            },
          );
        else if (q)
          G = await this.applyPluginMcpDiff(q, "plugins_sync").then(
            () => false,
            (error) => {
              logForDebugging(`late plugins sync: applyPluginMcpDiff failed: ${errorMessage(error)}`, {
                level: "error",
              });
              return true;
            },
          );
        else if (R === "due")
          G = await this.applyPluginMcpDiff(
            this.connectedNonDynamicMcpServerNames(),
            "plugins_sync",
            "account_plugins",
          ).then(
            () => false,
            (error) => {
              logForDebugging(`account plugins freshness: MCP diff failed: ${errorMessage(error)}`, {
                level: "error",
              });
              return true;
            },
          );
        else if (R === "waiting") {
          this.accountPluginsNeedReload = true;
          this.accountPluginsFreshness.reloadLeftToNextTry();
        }
        if (h && !x)
          await this.applyPluginMcpDiff(this.connectedNonDynamicMcpServerNames(), "plugins_sync").catch(
            (error) => {
              logForDebugging(`released command source: applyPluginMcpDiff failed: ${errorMessage(error)}`, {
                level: "error",
              });
            },
          );
        if (R === "due" || (R === "waiting" && x)) {
          let Ae = G || syncedPluginReloadDebt.reloadsCompleted === reloadsCompleted;
          this.accountPluginsNeedReload = Ae;
          this.accountPluginsFreshness.reloadEnded(Ae, w);
        }
        let re = (pluginsSyncNeedsRefresh || h) && this.runSessionStartHooksOfNewPlugins();
        if (re) await re;
      } catch (error) {
        logError(error);
        let L = R !== "none";
        if (L) {
          this.accountPluginsNeedReload = true;
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
      logForDebugging(`account plugins freshness: host's hold not read: ${errorMessage(error)}`, {
        level: "error",
      });
      return false;
    }
  }
  landedRoundAtLoopTop() {
    try {
      if (!this.accountPluginsFreshness.hasLandedChange()) return "none";
      return this.accountPluginsFreshness.isReloadTryDue() ? "due" : "waiting";
    } catch (error) {
      logForDebugging(`account plugins freshness: landed rounds not read: ${errorMessage(error)}`, {
        level: "error",
      });
      return "none";
    }
  }
  accountPluginsJoin(e) {
    try {
      let unwaitedAccountPluginsCheck = this.isPastFirstTake ? this.unwaitedAccountPluginsCheck : undefined;
      if (
        unwaitedAccountPluginsCheck === undefined &&
        this.isPastFirstTake &&
        this.accountPluginsFreshness.isCheckDue() &&
        !e()
      ) {
        let h = () => {
          let y = this.accountPluginsFreshness.atTurnStart(false)?.then(
            (S) => {
              this.accountPluginsNeedReload ||= S;
              return S;
            },
            (error) => {
              logForDebugging(`account plugins freshness: unwaited check failed: ${errorMessage(error)}`, {
                level: "error",
              });
              return false;
            },
          );
          if (y === undefined) return;
          this.unwaitedAccountPluginsCheck = y;
          y.finally(() => {
            if (this.unwaitedAccountPluginsCheck === y) this.unwaitedAccountPluginsCheck = undefined;
          });
        };
        if (!this.isAccountPluginsReloadOwed()) {
          h();
          return null;
        }
        return this.reloadChangedAccountPlugins(false)
          .then(h)
          .catch((error) =>
            logForDebugging(`account plugins freshness: join failed: ${errorMessage(error)}`, {
              level: "error",
            }),
          );
      }
      let r =
        unwaitedAccountPluginsCheck === undefined && this.isPastFirstTake
          ? this.accountPluginsFreshness.atTurnStart()
          : undefined;
      let s = unwaitedAccountPluginsCheck !== undefined && e() ? unwaitedAccountPluginsCheck : r;
      this.isPastFirstTake = true;
      if (s === undefined && !this.isAccountPluginsReloadOwed()) return null;
      return (
        s === undefined
          ? Promise.resolve(false)
          : withDeadline(
              s.then((h) => {
                this.accountPluginsNeedReload ||= h;
                return h;
              }),
              ACCOUNT_PLUGINS_RETRY_MS,
              (h, y) => this.session.host.clock.setTimeout(h, y),
            ).then((h) => {
              if (h === undefined) {
                if (
                  unwaitedAccountPluginsCheck !== undefined &&
                  this.unwaitedAccountPluginsCheck === unwaitedAccountPluginsCheck
                )
                  this.unwaitedAccountPluginsCheck = undefined;
                logForDiagnosticsNoPII("warn", "plugins_sync_turn_start_check_wait_timeout", {
                  waited_ms: ACCOUNT_PLUGINS_RETRY_MS,
                });
              }
              return h === true;
            })
      )
        .then((h) => this.reloadChangedAccountPlugins(h))
        .catch((error) =>
          logForDebugging(`account plugins freshness: join failed: ${errorMessage(error)}`, {
            level: "error",
          }),
        );
    } catch (error) {
      logForDebugging(`account plugins freshness: check not started: ${errorMessage(error)}`, {
        level: "error",
      });
      return null;
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
      if (this.accountPluginsFreshness.isReloadTryDue()) {
        this.triesSkippedForRunningReload++;
        this.accountPluginsNeedReload = true;
        this.accountPluginsFreshness.reloadEnded(true, getSyncedPluginReloadDebt().changesReloaded);
        this.isAccountPluginsReloadRunning =
          this.triesSkippedForRunningReload < ACCOUNT_PLUGINS_MAX_REFUSALS - 1;
      }
      return;
    }
    if (!this.accountPluginsNeedReload)
      logForDiagnosticsNoPII("info", "plugins_sync_turn_start_reload_of_landed_round");
    this.accountPluginsNeedReload = false;
    let changesReloaded = getSyncedPluginReloadDebt().changesReloaded;
    let s = false;
    this.isAccountPluginsReloadRunning = true;
    this.triesSkippedForRunningReload = 0;
    let h = ++this.accountPluginsReloadsStarted;
    let y = this.reloadAccountPlugins()
      .then((R) => {
        this.isAccountPluginsReloadRunning &&= this.accountPluginsReloadsStarted !== h;
        let w = s && !R;
        this.accountPluginsNeedReload = w ? false : this.accountPluginsNeedReload || R;
        if (!s || !R) this.accountPluginsFreshness.reloadEnded(R, changesReloaded);
        return true;
      })
      .catch((error) => {
        logForDebugging(`account plugins freshness: reload not recorded: ${errorMessage(error)}`, {
          level: "error",
        });
        return true;
      });
    if (
      (await withDeadline(y, ACCOUNT_PLUGINS_CHECK_TIMEOUT_MS, (R, w) =>
        this.session.host.clock.setTimeout(R, w),
      )) !== true
    ) {
      s = true;
      this.accountPluginsNeedReload = true;
      logForDiagnosticsNoPII("warn", "plugins_sync_turn_start_reload_wait_timeout", {
        waited_ms: ACCOUNT_PLUGINS_CHECK_TIMEOUT_MS,
      });
      this.accountPluginsFreshness.reloadEnded(true, changesReloaded);
    }
  }
  async reloadAccountPlugins() {
    let syncedPluginReloadDebt = getSyncedPluginReloadDebt();
    let reloadsCompleted = syncedPluginReloadDebt.reloadsCompleted;
    let r = false;
    try {
      await this.refreshPluginState();
    } catch (error) {
      r = true;
      logError(error);
    }
    if (!r)
      try {
        await this.applyPluginMcpDiff(
          this.connectedNonDynamicMcpServerNames(),
          "plugins_sync",
          "account_plugins",
        );
      } catch (error) {
        r = true;
        logForDebugging(`account plugins freshness: MCP diff failed: ${errorMessage(error)}`, {
          level: "error",
        });
      }
    return r || syncedPluginReloadDebt.reloadsCompleted === reloadsCompleted;
  }
  *firstCommand() {
    let e = this.pendingPluginRefresh();
    if (e) {
      let startTime = performance.now();
      yield e;
      this.pluginRefreshJoined();
      recordPhase("registry_refresh_join_ms", performance.now() - startTime, startTime);
    }
    headlessProfilerCheckpoint("before_mcp_prewait");
    this.enterPhase("mcp_prewait");
    let startTime = performance.now();
    let r = this.mcpPrewait.policyAtFirstCommand();
    let { waitForDeferrable, firstTurnHold } = r;
    let y = this.mcpPrewait.serversToSkipNow(r.skipFullyDeferredServers);
    let S = waitForDeferrable && !this.mcpPrewait.waitForDeferrable;
    let R =
      !this.firstCommandTaken &&
      this.store
        .getState()
        .mcp.clients.some(
          (client) =>
            client.type === "pending" &&
            this.mcpPrewait.skippedAtKick.has(client.name) &&
            !y.has(client.name),
        );
    let w = waitForDeferrable || this.firstCommandTaken ? undefined : this.mcpPrewait.requiredServersNow();
    let P =
      w === undefined
        ? []
        : this.store
            .getState()
            .mcp.clients.filter(
              (client) => client.type === "pending" && w.has(getPrefixServerKey(client.name)),
            );
    let L =
      !this.mcpPrewait.waitForDeferrable &&
      P.some((re) => !this.mcpPrewait.requiredAtKick.has(getPrefixServerKey(re.name)));
    let q = this.store.getState().mcp.clients.length > this.mcpClientCountAtKick;
    let x = new Set(this.serversStartedSinceKick);
    this.serversStartedSinceKick.clear();
    let deadlineMs = this.mcpPrewait.deadlineMs;
    if (q || S || R || L || x.size > 0) {
      let laterWakes = this.firstCommandTaken ? this.mcpPrewait.laterWakes : undefined;
      deadlineMs = laterWakes
        ? laterWakes.deadlineMs
        : (this.mcpPrewait.freshWaitDeadlineMs?.() ?? (S ? r.deadlineMs : this.mcpPrewait.deadlineMs));
      yield this.waitForPendingMcp(deadlineMs, {
        skipTelemetry: this.mcpClientCountAtKick > 0 && !S && !R && !L && x.size === 0,
        waitForDeferrable,
        firstTurnHold,
        requiredServerNames: w,
        ...(x.size > 0 && {
          alsoWaitFor: x,
        }),
        ...(y.size > 0 && {
          skipServerNames: y,
        }),
        localOnly: laterWakes ? laterWakes.localOnly : this.mcpPrewait.localOnly,
        coordinatorMainThreadOnly: this.mcpPrewait.coordinatorMainThreadOnly,
        relayMarked: this.mcpPrewait.relayMarked,
        relayHold: this.mcpPrewait.relayHold,
        relayHoldFollowsBootVerdict: this.mcpPrewait.relayHoldFollowsBootVerdict,
        permissionPromptToolServerName: this.mcpPrewait.permissionPromptToolServerName,
      });
    } else yield this.mcpPrewaitPromise;
    if (!this.firstCommandTaken)
      logEvent("tengu_headless_mcp_first_turn_join", {
        firstTurnHold: fromEnum(firstTurnHold),
        waitForDeferrable,
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
        deadlineMs: deadlineMs ?? TRANSPORT_FALLBACK_TIMEOUT_MS,
      });
    this.firstCommandTaken = true;
    recordPhase("mcp_prewait_ms", performance.now() - startTime, startTime);
    headlessProfilerCheckpoint("after_mcp_prewait");
    this.enterPhase("first_command");
    let Z = this.firstCommandMountJoin(performance.now() - startTime);
    if (Z) yield Z;
  }
  sdkToolRelistJoin(e) {
    if (e.shouldQuery === false || this.sdkMcpBackgroundRetry || !this.sdkToolRelistPending()) return null;
    let n = this.sdkUpdateWaitBudgetMs();
    let startTime = performance.now();
    let s = this.updateSdkMcp("skip");
    return withDeadline(
      s.then(() => true),
      n,
    )
      .then((h) => {
        let y = h !== true;
        if (y) s.catch(logError);
        logForDiagnosticsNoPII(y ? "warn" : "info", "sdk_mcp_relist_wait", {
          budget_ms: n,
          waited_ms: Math.round(performance.now() - startTime),
          timed_out: y,
          tools_change_still_pending: this.sdkToolRelistPending(),
        });
      })
      .catch(logError);
  }
  wireTurn() {
    let state = this.store.getState();
    let n = this.allMcpClients(state);
    this.registerElicitationHandlers(n);
    for (let r of n) this.registerChannelHandler(r);
    return this.buildAllTools(state);
  }
}
//@ chunk-tyg7f3ek.js:211742-211867 placement
var MAX_PREWAIT_SERVERS = 64;
var MAX_SERVER_NAME_LENGTH = 256;
var SDK_MCP_WAIT_MS = 5000;
var EMPTY_MCP_WIRING = {
  startupClients: () => [],
  sdkClients: () => [],
  dynamicClients: () => [],
  markDynamicServerDisabled: () => {},
};
//@ chunk-tyg7f3ek.js:211867-214082 placement
class CloudPluginSwitches {
  io;
  isKept = isSelfHostedRemoteEnvironment();
  isUnread = false;
  switchedOnWhileUnread = new Set();
  foundLate = new Set();
  switchedOffByThisWorker = new Set();
  constructor(io) {
    this.io = io;
  }
  async restore(e, n) {
    if (!this.isKept) return;
    let restoredWorkerState = await this.io.restoredWorkerState;
    if (restoredWorkerState === null) {
      this.isKept = false;
      return;
    }
    if (restoredWorkerState.readFailed === true) {
      this.isUnread = true;
      logFeatureSad("mcp_switched_off_record", "unread_at_boot");
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
    let h = {
      ...e,
      replyNow: null,
    };
    let y = e.engineState();
    let S = new Set();
    await Promise.all(
      y.mcp.clients
        .filter((client) => s.has(client.name) && client.type !== "disabled")
        .map(async (client) => {
          let P = false;
          try {
            await withDeadline(
              (async () =>
                reconnectMcpServerByName(h, EMPTY_MCP_WIRING, client.name, client.config, y, () =>
                  this.switchedOffByThisWorker.has(client.name),
                ))().finally(() => {
                P = true;
              }),
              SDK_MCP_WAIT_MS,
            );
          } catch (error) {
            logError(toError(error));
          }
          if (!P) S.add(client.name);
        }),
    );
    let filtered = e
      .engineState()
      .mcp.clients.filter((client) => s.has(client.name) && client.type !== "disabled");
    for (let w of filtered) markServerDisabled_2(h, EMPTY_MCP_WIRING, w.name);
    if (filtered.length === 0) {
      logFeatureOk("mcp_switched_off_record", {
        server_count: s.size,
      });
      return;
    }
    if (filtered.some((w) => S.has(w.name))) logFeatureSad("mcp_switched_off_record", "close_timed_out");
    if (filtered.some((w) => !S.has(w.name))) logFeatureSad("mcp_switched_off_record", "close_failed");
  }
  switchSaved(e, n) {
    if (!this.isKept) return;
    this.switchedOffByThisWorker.delete(e);
    if (n) this.foundLate.delete(e);
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
    if (e === null || e.readFailed === true) {
      logFeatureSad("mcp_switched_off_record", "unread_at_switch");
      return;
    }
    if (this.isUnread) {
      this.isUnread = false;
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
      this.io.sessionState.notifyInternalMetadataChanged({
        disabled_mcp_servers: e.length > 0 ? e : null,
      });
    } catch (error) {
      logError(toError(error));
      logFeatureSad("mcp_switched_off_record", "write_failed");
    }
  }
}
//@ chunk-tyg7f3ek.js:214082-214252 placement
function normalizeServerNameList(disabledMcpServers) {
  let n = Array.isArray(disabledMcpServers) ? disabledMcpServers : [];
  let r = new Set();
  for (let s of n)
    if (
      typeof s === "string" &&
      s.length > 0 &&
      s.length <= MAX_SERVER_NAME_LENGTH &&
      !isClaudeInChromeMCPServer(s)
    ) {
      r.delete(s);
      r.add(s);
    }
  return [...r].slice(-MAX_PREWAIT_SERVERS);
}
//@ chunk-tyg7f3ek.js:214252-214647 placement
function retirementPromptRows({ sessionId, prompt, listed, retirementRows, othersToCome }) {
  let y = [];
  try {
    y = retirementRows
      .filter((S) => S.type === "user")
      .flatMap((S) => Array.from(normalizeMessage(S)))
      .map((S) => ({
        ...S,
        session_id: sessionId,
      }));
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
      ...(listed !== undefined && {
        user_message_uuids: listed,
      }),
      terminal_reason: "aborted_tools",
      ...(othersToCome > 0 && {
        queued_turn_count: othersToCome,
      }),
    },
  ];
}
//@ chunk-tyg7f3ek.js:214647-214678 placement
var TASK_UPDATE_PREFIX = "Updated task #";
var MAX_TASK_NUMBER = 1e6;
//@ chunk-tyg7f3ek.js:214678-214747 placement
function parseTaskNumber(e) {
  let n = Number(e);
  return /^\d+$/.test(e) && n <= MAX_TASK_NUMBER ? n : undefined;
}
//@ chunk-tyg7f3ek.js:214747-215311 placement
/**
 * 任务工具记录提取辅助：从 tool_use/tool_result 输入里取字段、拼出任务创建/更新参数与结果文本。
 */
var taskToolInputFields = (e, n) => (isPlainObject_2(e) ? e[n] : undefined);
var taskToolInputForTelemetry = (e) =>
  (e.name === TASK_CREATE_TOOL_NAME ? coerceTaskCreateInput(e.input) : normalizeTaskInputAliases(e.input))
    ?.input ?? e.input;
var taskInputFieldNames = (e) => {
  let n = (h) => {
    let y = taskToolInputFields(e, h);
    return typeof y === "string" ? y : undefined;
  };
  let r = (h) => {
    let y = taskToolInputFields(e, h);
    return Array.isArray(y) ? y.filter((S) => typeof S === "string") : undefined;
  };
  let s = taskToolInputFields(e, "metadata");
  return {
    subject: n("subject"),
    description: n("description"),
    activeForm: n("activeForm"),
    status: n("status"),
    owner: n("owner"),
    metadata: isPlainObject_2(s) ? s : undefined,
    addBlocks: r("addBlocks"),
    addBlockedBy: r("addBlockedBy"),
  };
};
var toolResultText = (e) =>
  typeof e.content === "string" ? e.content : Array.isArray(e.content) ? extractTextContent_2(e.content) : "";
//@ chunk-tyg7f3ek.js:215311-216137 placement
function* taskToolCallsInTranscript(e, n = () => false) {
  let r = new Map();
  for (let [s, h] of e.entries())
    if (h.type === "assistant") {
      let response = h.message.id ?? h.uuid ?? `row ${s}`;
      for (let S of h.message.content)
        if (S.type === "tool_use" && (S.name === TASK_CREATE_TOOL_NAME || S.name === TASK_UPDATE_TOOL_NAME))
          r.set(S.id, {
            use: S,
            response,
            askedEarlier: n(h, s),
          });
    }
  for (let [s, h] of e.entries())
    if (h.type === "user" && typeof h.message.content !== "string")
      for (let y of h.message.content) {
        if (y.type !== "tool_result") continue;
        let S = r.get(y.tool_use_id);
        if (S === undefined) continue;
        r.delete(y.tool_use_id);
        if (y.is_error === true) continue;
        let R = toolResultText(y);
        let w = taskToolInputForTelemetry(S.use);
        if (S.use.name === TASK_CREATE_TOOL_NAME) {
          let P = R.match(TASK_CREATED_RE)?.[1];
          if (P !== undefined)
            yield {
              kind: "create",
              taskId: P,
              named: taskInputFieldNames(w),
              result: y,
              answeredEarlier: n(h, s),
              ...S,
            };
        } else if (R.startsWith(TASK_UPDATE_PREFIX)) {
          let P = taskToolInputFields(w, "taskId");
          yield {
            kind: "update",
            taskId: typeof P === "string" ? P : "",
            named: taskInputFieldNames(w),
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
  MAX_TASK_NUMBER,
  parseTaskNumber,
  taskToolCallsInTranscript,
};
