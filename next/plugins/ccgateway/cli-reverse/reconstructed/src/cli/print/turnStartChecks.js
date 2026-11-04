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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-tyg7f3ek.js:181110-181791 placement
/**
 * 遇到组织/席位额度上限的限流事件时，评估是否可在 IDE 横幅中"向管理员申请额度"。
 */
function evaluateAdminRequestWall(limitState) {
  let adminRequestPhase = getAdminRequestPhase();
  let key = adminRequestKeyForRateLimit(limitState);
  let subscriptionType = getSubscriptionType();
  if (
    key === null ||
    !isAdminLimitRequestGateOn() ||
    !isVsCodeTopSession() ||
    !isFirstPartyApiBackend() ||
    (subscriptionType !== "team" && subscriptionType !== "enterprise") ||
    isConsumerPlan() ||
    !isExtraUsageAllowed() ||
    (limitState.upgradePaths !== undefined && !limitState.upgradePaths.includes("overage")) ||
    isEssentialTrafficOnly()
  )
    return;
  let wall = {
    key,
    reason: limitState.overageDisabledReason ?? "unknown",
    accountEpoch: getLimitsAccountEpoch(),
  };
  let standing = null;
  if (adminRequestPhase.phase !== "idle" && isSameAdminRequestKey(adminRequestPhase.wall, wall))
    switch (adminRequestPhase.phase) {
      case "checking":
      case "sending":
        return;
      case "quiet":
      case "ready":
      case "sent":
        if (Date.now() - adminRequestPhase.settledAt < ADMIN_REQUEST_SETTLED_COOLDOWN_MS) return;
        standing = adminRequestPhase;
    }
  else if (adminRequestPhase.phase === "sending") return;
  setAdminRequestPhase({
    phase: "checking",
    wall,
    standing,
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
    ).then((outcome) => {
      settleAdminRequestCheck(
        wall,
        outcome ?? {
          outcome: "timed_out",
        },
        standing !== null,
      );
    }),
  );
}
//@ chunk-tyg7f3ek.js:181791-181902 placement
function trackAdminRequest(promise) {
  let adminRequestState = getAdminRequestState();
  let tracked = promise
    .catch((error) => {
      logError(toError(error));
    })
    .finally(() => {
      if (adminRequestState.pending === tracked) adminRequestState.pending = null;
    });
  adminRequestState.pending = tracked;
}
//@ chunk-tyg7f3ek.js:181902-182987 placement
function settleAdminRequestCheck(wall, outcome, recheck) {
  let adminRequestPhase = getAdminRequestPhase();
  if (adminRequestPhase.phase !== "checking" || !isSameAdminRequestKey(adminRequestPhase.wall, wall)) return;
  let settledAt = Date.now();
  let standing = adminRequestPhase.standing;
  switch (outcome.outcome) {
    case "timed_out":
    case "threw": {
      let cause = outcome.outcome === "timed_out" ? "checks_timeout" : "checks_failed";
      logFeatureBad("ide_admin_limit_request", cause);
      setAdminRequestPhase(
        standing === null
          ? {
              phase: "quiet",
              wall,
              cause,
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
  let result = outcome.result;
  let verdict = adminRequestVerdict(result, wall.reason);
  if (verdict === "usage_unread" && standing !== null) {
    setAdminRequestPhase({
      ...standing,
      settledAt,
    });
    return;
  }
  if (verdict === "nothing_to_file" || verdict === "usage_unread") {
    setAdminRequestPhase({
      phase: "quiet",
      wall,
      cause: verdict,
      settledAt,
    });
    return;
  }
  let adminLimitRequestConfig = readAdminLimitRequestConfig();
  let checked = result.type === "confirm-admin-request" ? result.checked : true;
  logEvent("tengu_tallow_quoit_wall", {
    surface: lit("ide_banner"),
    reason: fromEnum(wall.reason),
    verdict: fromEnum(verdict),
    offered: adminLimitRequestConfig !== null,
    checked,
    recheck,
  });
  if (adminLimitRequestConfig === null) {
    setAdminRequestPhase({
      phase: "quiet",
      wall,
      cause: "flag_off",
      settledAt,
    });
    return;
  }
  if (
    standing?.phase === "sent" &&
    (verdict === "pending" || (result.type === "confirm-admin-request" && !result.checked))
  ) {
    setAdminRequestPhase({
      ...standing,
      copy: adminLimitRequestConfig,
      settledAt,
    });
    return;
  }
  setAdminRequestPhase({
    phase: "ready",
    wall,
    verdict,
    extraUsage: result.type === "confirm-admin-request" ? result.extraUsage : undefined,
    copy: adminLimitRequestConfig,
    checked,
    settledAt,
    lastFileFailed: false,
    revision: 0,
  });
}
//@ chunk-tyg7f3ek.js:182987-183389 placement
function adminRequestVerdict(result, reason) {
  switch (result.type) {
    case "confirm-admin-request":
      if (result.extraUsage === undefined) return "usage_unread";
      if (result.extraUsage === null) return "nothing_to_file";
      if (
        reason === "org_level_disabled_until" &&
        !(result.extraUsage.is_enabled && !result.extraUsage.disabled_reason)
      )
        return "nothing_to_file";
      return "can_ask";
    case "message":
      return result.reason === "pending" ? "pending" : "nothing_to_file";
    case "browser-opened":
      return "nothing_to_file";
  }
}
//@ chunk-tyg7f3ek.js:183389-183796 placement
function adminRequestBannerState(phase) {
  switch (phase.phase) {
    case "quiet":
      return;
    case "ready":
      return {
        state: phase.verdict,
        label: phase.copy.label,
        doneLabel: phase.copy.doneLabel,
        confirm: phase.copy.confirm,
        confirmPrompt: phase.copy.confirmPrompt,
        ...(phase.lastFileFailed && {
          lastFileFailed: true,
        }),
        ...(phase.revision > 0 && {
          revision: phase.revision,
        }),
      };
    case "sent":
      return {
        state: "sent",
        label: phase.copy.label,
        doneLabel: phase.copy.doneLabel,
        confirm: phase.copy.confirm,
        confirmPrompt: phase.copy.confirmPrompt,
      };
  }
}
//@ chunk-tyg7f3ek.js:183796-184193 placement
function adminRequestStateForEvent(limits) {
  let key = adminRequestKeyForRateLimit(limits);
  let phase = getAdminRequestPhase();
  if (
    key === null ||
    phase.phase === "idle" ||
    phase.wall.key !== key ||
    phase.wall.accountEpoch !== getLimitsAccountEpoch() ||
    !isAdminLimitRequestGateOn() ||
    isEssentialTrafficOnly()
  )
    return;
  switch (phase.phase) {
    case "checking":
      return phase.standing === null ? undefined : adminRequestBannerState(phase.standing);
    case "quiet":
    case "ready":
    case "sent":
      return adminRequestBannerState(phase);
    case "sending":
      return {
        state: "sending",
        label: phase.copy.label,
        doneLabel: phase.copy.doneLabel,
        confirm: phase.copy.confirm,
        confirmPrompt: phase.copy.confirmPrompt,
      };
  }
}
//@ chunk-tyg7f3ek.js:184193-184895 placement
/**
 * 用户确认后提交"向管理员申请额度"请求并上报 tengu_tallow_quoit_filed。
 */
function fileAdminLimitRequest() {
  let adminRequestPhase = getAdminRequestPhase();
  let phase =
    adminRequestPhase.phase === "ready"
      ? adminRequestPhase
      : adminRequestPhase.phase === "checking" && adminRequestPhase.standing?.phase === "ready"
        ? adminRequestPhase.standing
        : null;
  if (phase === null || phase.verdict !== "can_ask") {
    logFeatureBad("ide_admin_limit_request", "click_without_ask");
    return;
  }
  let refusal = !isAdminLimitRequestGateOn()
    ? "click_gate_off"
    : isEssentialTrafficOnly() || !isFirstPartyApiBackend()
      ? "click_traffic_off"
      : phase.wall.accountEpoch !== getLimitsAccountEpoch()
        ? "click_other_account"
        : phase.wall.key !== adminRequestKeyForRateLimit(getCurrentLimits())
          ? "click_stale_block"
          : null;
  if (refusal !== null) {
    logFeatureBad("ide_admin_limit_request", refusal);
    let nextState = {
      ...phase,
      lastFileFailed: true,
      revision: phase.revision + 1,
    };
    setAdminRequestPhase(
      adminRequestPhase.phase === "checking"
        ? {
            ...adminRequestPhase,
            standing: nextState,
          }
        : nextState,
    );
    return;
  }
  let { wall, extraUsage, copy } = phase;
  setAdminRequestPhase({
    phase: "sending",
    wall,
    extraUsage,
    copy,
  });
  let sent = false;
  trackAdminRequest(
    withDeadline(
      fileAdminLimitRequest_2(extraUsage, undefined, (doneLabel) => {
        sent = true;
        markAdminRequestSent(wall, doneLabel);
      }),
      ADMIN_REQUEST_FILING_TIMEOUT_MS,
    ).then((outcome) => {
      reportAdminRequestFiled(wall, outcome?.outcome ?? (sent ? "granted" : "failed"));
    }),
  );
}
//@ chunk-tyg7f3ek.js:184895-185073 placement
function markAdminRequestSent(wall, doneLabel) {
  let adminRequestPhase = getAdminRequestPhase();
  if (adminRequestPhase.phase !== "sending" || !isSameAdminRequestKey(adminRequestPhase.wall, wall)) return;
  setAdminRequestPhase({
    phase: "sent",
    wall,
    copy: isValidAdminRequestLabel(doneLabel)
      ? {
          ...adminRequestPhase.copy,
          doneLabel,
        }
      : adminRequestPhase.copy,
    alreadyFiled: false,
    settledAt: Date.now(),
  });
}
//@ chunk-tyg7f3ek.js:185073-185803 placement
function reportAdminRequestFiled(wall, outcome) {
  let ok = outcome === "filed" || outcome === "already_filed" || outcome === "granted";
  logEvent("tengu_tallow_quoit_filed", {
    surface: lit("ide_banner"),
    outcome: fromEnum(outcome),
  });
  if (ok) logFeatureOk("ide_admin_limit_request");
  else logFeatureBad("ide_admin_limit_request", outcome);
  let adminRequestPhase = getAdminRequestPhase();
  if (
    outcome === "granted" &&
    adminRequestPhase.phase === "sent" &&
    isSameAdminRequestKey(adminRequestPhase.wall, wall)
  ) {
    evaluateAdminRequestWall(getCurrentLimits());
    return;
  }
  if (adminRequestPhase.phase !== "sending" || !isSameAdminRequestKey(adminRequestPhase.wall, wall)) return;
  let settledAt = Date.now();
  switch (outcome) {
    case "granted":
    case "filed":
    case "already_filed":
      setAdminRequestPhase({
        phase: "sent",
        wall,
        copy: adminRequestPhase.copy,
        alreadyFiled: outcome === "already_filed",
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
  let lastRejected = null;
  let banner = undefined;
  let emitting = false;
  let onLimits = (limits) => {
    let wasEmitting = emitting;
    emitting = true;
    try {
      let isRejected = limits.status === "rejected";
      if (isRejected) offerCreditAtBand(limits);
      evaluateAdminRequestWall(limits);
      let adminBanner = isRejected ? adminRequestStateForEvent(limits) : undefined;
      let rateLimitInfo = buildRateLimitInfo(limits, isRejected ? getOfferBanner() : undefined, adminBanner);
      if (!rateLimitInfo) return;
      lastRejected = isRejected ? limits : null;
      banner = adminBanner;
      emit(rateLimitInfo);
      let handle = bridgeHandle();
      if (handle) forwardRateLimitEventToBridge(handle, rateLimitInfo);
      else {
        let payload = forwardRateLimitEvent(sessionState, rateLimitInfo);
        if (payload) sessionState.notifyMetadataChanged(payload);
      }
    } catch (error) {
      logForDebugging(`[rateLimitFrames] listener failed: ${errorMessage(error)}`, {
        level: "error",
      });
    } finally {
      emitting = wasEmitting;
    }
  };
  let unsubscribeLimits = onLimitsStatusChanged(onLimits);
  let rateLimitEventThrottle = createRateLimitEventThrottle();
  let unsubscribeQuota = onQuotaRejected((limits) => {
    if (isQuotaRejectedReemitEnabled() && rateLimitEventThrottle(limits)) onLimits(limits);
  });
  let lastOffer = null;
  let unsubscribeOffer = onCreditOfferPromptChange(() => {
    if (emitting || lastRejected === null || lastOffer === lastRejected || getOfferBanner() === undefined)
      return;
    lastOffer = lastRejected;
    onLimits(lastRejected);
  });
  let unsubscribeAdmin = subscribeAdminRequestPhase(() => {
    if (emitting || lastRejected === null) return;
    let nextBanner = adminRequestStateForEvent(lastRejected);
    if (
      nextBanner === undefined || banner === undefined
        ? nextBanner === banner
        : nextBanner.state === banner.state &&
          nextBanner.lastFileFailed === banner.lastFileFailed &&
          nextBanner.revision === banner.revision &&
          nextBanner.label === banner.label &&
          nextBanner.doneLabel === banner.doneLabel &&
          nextBanner.confirm === banner.confirm &&
          nextBanner.confirmPrompt === banner.confirmPrompt
    )
      return;
    onLimits(lastRejected);
  });
  return () => {
    unsubscribeLimits();
    unsubscribeQuota();
    unsubscribeOffer();
    unsubscribeAdmin();
  };
}
//@ chunk-tyg7f3ek.js:186643-186749 placement
function installSdkEventDrain({ drain, emit }) {
  let drainEvents = () => {
    for (let event of drain()) emit(event);
  };
  setTaskNotificationListener(drainEvents);
  return {
    close: () => {
      setTaskNotificationListener(null);
      drainEvents();
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
    if (this.sdkUrl) for (let server of this.unconnectedServers()) this.waitedFor.add(server);
  }
  get firstQueryAhead() {
    return Boolean(this.sdkUrl) && !this.firstQueryReleased;
  }
  markFirstQueryReleased() {
    this.firstQueryReleased = true;
  }
  join(command) {
    if (!this.sdkUrl || command.shouldQuery === false) return null;
    let filtered = this.unconnectedServers().filter((server) => !this.waitedFor.has(server));
    let pendingCount = filtered.length;
    if (pendingCount === 0) {
      this.markFirstQueryReleased();
      return null;
    }
    for (let server of filtered) this.waitedFor.add(server);
    let max = Math.max(getConnectTimeoutMs(), this.relayWaitLeftMs?.() ?? 0);
    let startTime = performance.now();
    let update = this.updateSdkMcp("skip");
    update.then(
      () => this.markFirstQueryReleased(),
      () => this.markFirstQueryReleased(),
    );
    return withDeadline(
      update.then(() => true),
      max,
    )
      .then((finished) => {
        this.markFirstQueryReleased();
        let timedOut = finished !== true;
        if (timedOut) update.catch(logError);
        let rounded = Math.round(performance.now() - startTime);
        let mapped = this.unconnectedServers()
          .filter((server) => filtered.includes(server))
          .map((server) => server.name);
        logForDiagnosticsNoPII(timedOut ? "warn" : "info", "sdk_mcp_first_query_wait", {
          budget_ms: max,
          waited_ms: rounded,
          pending_servers: pendingCount,
          timed_out: timedOut,
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
var NON_HUMAN_TURN_ORIGINS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-tyg7f3ek.js:188257", () => {
  NON_HUMAN_TURN_ORIGINS = new Set([
    "scheduled",
    "task_notification",
    "auto_continuation",
    "host_synthetic",
    "system",
  ]);
});
//@ chunk-tyg7f3ek.js:188353-188415 placement
function pausedSuggestionReasonSafe(state) {
  try {
    return pausedPromptSuggestionReason(state);
  } catch (error) {
    logError(toError(error));
    return null;
  }
}
//@ chunk-tyg7f3ek.js:188415-188593 placement
function pausedPromptSuggestionReason({ paused, turnOrigin }) {
  let reason;
  if (paused) reason = "host_paused";
  else {
    let origin = turnOrigin();
    if (origin === undefined || !NON_HUMAN_TURN_ORIGINS.has(origin)) return null;
    reason = "not_user_started";
  }
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_chomp_sable", false) ? reason : null;
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
  onCommand(command, content) {
    if (command.shouldQuery === false) return;
    this.abortController?.abort();
    this.abortController = null;
    this.pendingSuggestion = null;
    this.pendingLastEmittedEntry = null;
    if (this.lastEmitted && command.mode === "prompt") {
      let userInput =
        typeof content === "string" ? content : content.find((block) => block.type === "text")?.text;
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
  afterResult(result) {
    if (
      !this.promptSuggestions() ||
      result.shouldQuery === false ||
      this.shuttingDown() ||
      env.CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION === false
    )
      return;
    this.abortController?.abort();
    let abortController = new AbortController();
    this.abortController = abortController;
    let reason = pausedSuggestionReasonSafe({
      paused: this.paused,
      turnOrigin: this.turnOrigin,
    });
    if (reason) {
      try {
        logSuggestionSuppressed(reason, "sdk");
      } catch (error) {
        logError(toError(error));
      }
      return;
    }
    let params = this.cacheSafeParams();
    if (!params) {
      logSuggestionSuppressed("sdk_no_params", "sdk");
      return;
    }
    let state = {
      promise: null,
    };
    state.promise = (async () => {
      try {
        let suggestion = await this.generate(abortController, params);
        if (!suggestion || abortController.signal.aborted) return;
        let message = {
          type: "prompt_suggestion",
          suggestion: suggestion.suggestion,
          uuid: randomUUID(),
          session_id: getSessionId(),
        };
        let entry = {
          text: suggestion.suggestion,
          emittedAt: Date.now(),
          generationRequestId: suggestion.generationRequestId,
        };
        if (this.holdsResults()) {
          this.pendingSuggestion = message;
          this.pendingLastEmittedEntry = {
            text: entry.text,
            generationRequestId: entry.generationRequestId,
          };
        } else {
          this.lastEmitted = entry;
          this.emit(message);
        }
      } catch (error) {
        if (error instanceof Error && (error.name === "AbortError" || error.name === "APIUserAbortError")) {
          logSuggestionSuppressed("aborted", "sdk");
          return;
        }
        logError(toError(error));
      } finally {
        if (this.inflightPromise === state.promise) this.inflightPromise = null;
      }
    })();
    this.inflightPromise = state.promise;
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
  async settleInflight(promise) {
    let timer = setTimeout(
      (controller) => controller?.abort(),
      PROMPT_SUGGESTION_TIMEOUT_MS,
      this.abortController,
    );
    try {
      await promise;
    } finally {
      clearTimeout(timer);
    }
    this.abortController?.abort();
    this.abortController = null;
  }
}
//@ chunk-tyg7f3ek.js:191278-191524 placement
function createPromptSuggestionEmitter({ messages, getAppState, ...options }) {
  return new PromptSuggestionEmitter({
    ...options,
    cacheSafeParams: getLastCacheSafeParams,
    turnOrigin: () => getTurnOrigin(messages),
    generate: (abortController, params) => {
      if (!isMainThreadCacheWarm()) {
        logSuggestionSuppressed("cache_cold", "sdk", {
          cacheColdBy: "prefix_not_warm",
        });
        return Promise.resolve(null);
      }
      return tryGenerateSuggestion(abortController, messages, getAppState, params, "sdk");
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
    let now = this.session.host.clock.now();
    if (!this.isDueAt(now)) return;
    this.checkedAt = now;
    this.isChecking = true;
    return this.syncedIfListingChanged()
      .then((changed) => {
        logForDiagnosticsNoPII("info", "plugins_sync_turn_start_check_done", {
          is_changed: changed,
          is_waited_for: isWaitedFor,
          duration_ms: this.session.host.clock.now() - now,
        });
        return changed;
      })
      .finally(() => {
        this.isChecking = false;
      });
  }
  isDueAt(now) {
    let since = now - this.checkedAt;
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
      (since < 0 || since >= ACCOUNT_PLUGINS_CHECK_INTERVAL_MS) &&
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
    let since = this.session.host.clock.now() - this.failedReloadAt;
    return !(this.failedReloads > 0 && since >= 0 && since < ACCOUNT_PLUGINS_CHECK_INTERVAL_MS);
  }
  reloadEnded(failed, reloadedAt) {
    let failedReloads = reloadedAt === this.reloadedAtFailedReload ? this.failedReloads : 0;
    this.failedReloads = failed ? failedReloads + 1 : 0;
    this.failedReloadAt = this.session.host.clock.now();
    this.reloadedAtFailedReload = getSyncedPluginReloadDebt().changesReloaded;
    if (failed)
      logForDiagnosticsNoPII("warn", "plugins_sync_turn_start_reload_failed", {
        failures_in_a_row: this.failedReloads,
      });
    if (failed && this.failedReloads === ACCOUNT_PLUGINS_MAX_REFUSALS) {
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
      let listed = await listAccountPlugins({
        isBackground: true,
        credentials: this.credentials,
        ...(isSkillsAsPluginsActive(this.session) && {
          convertedSkillsAsPlugins: true,
        }),
      });
      let failed = !listed.success && !isNotFoundServerError(listed);
      let refused = failed && isSyncRefusal(listed);
      if (refused) {
        this.refusalsInARow++;
        this.roundAtRefusal = roundAtRefusal;
        logForDiagnosticsNoPII("warn", "plugins_sync_turn_start_check_refused", {
          refusals_in_a_row: this.refusalsInARow,
          ...listErrorTelemetry(listed),
        });
        logFeatureSad("plugins_sync_turn_start_check", "list_refused", {
          refusals_in_a_row: this.refusalsInARow,
        });
      }
      if (
        refused &&
        this.refusalsInARow >= ACCOUNT_PLUGINS_REFUSAL_LIMIT &&
        !this.isToldOfRefusal &&
        getSyncedPluginDirs().length > 0
      ) {
        this.isToldOfRefusal = true;
        notifyAccountPluginsUnchecked();
      }
      if (refused) return false;
      this.refusalsInARow = 0;
      if (failed) {
        this.noteFailure("list_failed", listErrorTelemetry(listed));
        return false;
      }
      if (listed.success && listed.degraded === true) {
        this.noteFailure("list_degraded", {});
        return false;
      }
      this.failuresInARow = 0;
      let stamp = pluginListFingerprint(listed.success ? listed.plugins : []);
      let since = this.session.host.clock.now() - this.unlandedRoundAt;
      let unlanded =
        stamp === this.unlandedStamp &&
        since >= 0 &&
        since <
          Math.min(
            ACCOUNT_PLUGINS_CHECK_INTERVAL_MS * ACCOUNT_PLUGINS_MIN_CHECKS ** this.unlandedRounds,
            ACCOUNT_PLUGINS_CHANGE_TTL_MS,
          );
      if (!(stamp !== pluginsSync.listedStamp && !unlanded)) return false;
      let changesLanded = getSyncedPluginReloadDebt().changesLanded;
      let changed = await rerunPluginsSync(this.session, this.credentials);
      if (pluginsSync.listedStamp === null) {
        this.unlandedRounds = stamp === this.unlandedStamp ? this.unlandedRounds + 1 : 1;
        this.unlandedStamp = stamp;
        this.unlandedRoundAt = this.session.host.clock.now();
        logFeatureSad("plugins_sync_turn_start_check", "round_incomplete", {
          rounds_for_listing: this.unlandedRounds,
        });
      } else this.unlandedStamp = null;
      if (pluginsSync.listedStamp !== null && changed) logFeatureOk("plugins_sync_turn_start_check");
      return changed || getSyncedPluginReloadDebt().changesLanded !== changesLanded;
    } catch (error) {
      logError(error);
      this.refusalsInARow = 0;
      this.noteFailure("error", {});
      return false;
    }
  }
  noteFailure(failure, fields) {
    this.failuresInARow++;
    logForDiagnosticsNoPII("warn", "plugins_sync_turn_start_check_failed", {
      failure,
      failures_in_a_row: this.failuresInARow,
      ...fields,
    });
    logFeatureSad("plugins_sync_turn_start_check", failure, {
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
  noteReloadedByHost(reloads) {
    if (getSyncedPluginReloadDebt().reloadsCompleted !== reloads) {
      this.accountPluginsNeedReload = false;
      this.accountPluginsFreshness.reloadedElsewhere();
    }
  }
  noteServersStartedSinceKick(names) {
    for (let name of names) this.serversStartedSinceKick.add(name);
  }
  *beforeDrain() {
    if (this.deferredCommandsJoin) yield this.deferredCommandsJoin;
    let retirement = this.parkedPermissionRetirement();
    if (retirement) yield retirement;
    headlessProfilerCheckpoint("run_entry");
    let firstReadAt;
    let cpuStart;
    let lagMonitor;
    let stopLag;
    let ticketsBefore;
    if (!this.firstMessageRecorded) {
      this.firstMessageRecorded = true;
      firstReadAt = performance.now();
      recordPhase("first_message_read_ms", firstReadAt, 0);
      recordFirstMessageReadFromSpawn();
      cpuStart = process.cpuUsage();
      lagMonitor = startEventLoopLagMonitor(LAG_SAMPLE_INTERVAL_MS);
    }
    try {
      this.enterPhase("sdk_mcp_update");
      let startTime = performance.now();
      if (this.sdkUrl) {
        this.noteSdkEntryWait();
        let updateKind = this.sdkMcpUpdateKind();
        let relistPending = this.sdkToolRelistPending();
        if (updateKind !== "retry_failed" || (relistPending && !this.sdkMcpBackgroundRetry)) {
          let updatePromise = this.updateSdkMcp("skip");
          if (updateKind !== "none" || relistPending) {
            let budgetMs = this.sdkUpdateWaitBudgetMs();
            if (
              (yield withDeadline(
                updatePromise.then(() => true),
                budgetMs,
              )) !== true
            ) {
              updatePromise.catch(logError);
              let pendingServers = this.sdkMcpServersPending();
              let relayMarked = this.mcpPrewait.relayMarked;
              let relayHold = this.mcpPrewait.relayHold;
              logEvent("tengu_sdk_mcp_update_wait_timeout", {
                budget_ms: budgetMs,
                pending_servers: pendingServers,
                relay_marked: relayMarked,
                relay_hold: relayHold,
              });
              logForDiagnosticsNoPII("warn", "sdk_mcp_update_wait_timeout", {
                budget_ms: budgetMs,
                pending_servers: pendingServers,
                relay_marked: relayMarked,
                relay_hold: relayHold,
              });
            }
          } else yield updatePromise;
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
      let claimJoin = this.takeClaimSessionStartHooks();
      if (claimJoin) {
        let startTime = performance.now();
        yield claimJoin;
        recordPhase("claim_hooks_join_ms", performance.now() - startTime, startTime);
        headlessProfilerCheckpoint("after_claimSessionStartHooks");
      }
      if (this.skillsSync) {
        let startTime = performance.now();
        yield awaitFirstSkillsList(this.skillsSync, this.skillsSyncStartedAt);
        recordPhase("skills_sync_wait_ms", performance.now() - startTime, startTime);
        if (env.CLAUDE_CODE_CCR_FOLD_FIRST_TURN_RESCAN && this.pluginStartupPending()) {
          ticketsBefore = this.pluginStateRefreshTickets().started;
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
      if (ticketsBefore !== undefined)
        if (this.pluginStateRefreshTickets().lastCompletedStart > ticketsBefore)
          recordPhase("skills_sync_commands_refresh_ms", 0);
        else {
          let startTime = performance.now();
          yield this.refreshCurrentCommands();
          recordPhase("skills_sync_commands_refresh_ms", performance.now() - startTime, startTime);
        }
      let newPluginsJoin = this.takeNewPluginsSessionStart();
      if (newPluginsJoin) {
        let startTime = performance.now();
        yield newPluginsJoin;
        recordPhase("new_plugin_hooks_join_ms", performance.now() - startTime, startTime);
      }
    } finally {
      stopLag = lagMonitor?.stop();
      this.closePluginInstallBracket();
    }
    this.backgroundRefreshEnabled = env.CLAUDE_CODE_ENABLE_BACKGROUND_PLUGIN_REFRESH;
    if (firstReadAt !== undefined && cpuStart && stopLag !== undefined) {
      recordPhase("first_message_handle_ms", performance.now() - firstReadAt, firstReadAt);
      let cpu = process.cpuUsage(cpuStart);
      recordPhase("first_message_handle_cpu_ms", (cpu.user + cpu.system) / 1000);
      recordPhase("first_message_handle_loop_lag_ms", stopLag);
    }
  }
  sdkUpdateWaitBudgetMs() {
    let connectTimeoutMs = getConnectTimeoutMs();
    let relayDeadline =
      this.mcpPrewait.relayHold && !this.firstCommandTaken
        ? this.mcpPrewait.freshWaitDeadlineMs?.()
        : undefined;
    return relayDeadline === undefined ? connectTimeoutMs : Math.max(connectTimeoutMs, relayDeadline);
  }
  async loopTop() {
    let lateForwardedInstallNeedsRefresh = this.lateForwardedInstallNeedsRefresh;
    let organizationAsk = getPluginRegistry().organizationAsk;
    if (organizationAsk.isCommandHeld && marketplaceNameAnswerState() === "unanswered") {
      let wasWaiting = organizationAsk.answerWait !== null;
      await waitForOrganizationAnswer();
      if (wasWaiting) askOrganizationOnce();
    }
    let marketplaceHeld = organizationAsk.isCommandHeld && marketplaceNameAnswerState() !== "unanswered";
    let isRefillLanded = this.isRefillLanded;
    let sourceReleased = marketplaceHeld || isRefillLanded;
    if (
      ((this.backgroundRefreshEnabled && this.backgroundInstall?.needsRefresh) ||
        this.pluginsSyncNeedsRefresh ||
        lateForwardedInstallNeedsRefresh ||
        sourceReleased) &&
      !this.isReloadHeldByHost()
    ) {
      if (this.backgroundInstall) this.backgroundInstall.needsRefresh = false;
      let pluginsSyncNeedsRefresh = this.pluginsSyncNeedsRefresh;
      this.pluginsSyncNeedsRefresh = false;
      this.lateForwardedInstallNeedsRefresh = false;
      let roundOutcome = this.landedRoundAtLoopTop();
      let changesReloaded = 0;
      try {
        let syncedPluginReloadDebt = getSyncedPluginReloadDebt();
        let reloadsCompleted = syncedPluginReloadDebt.reloadsCompleted;
        changesReloaded = syncedPluginReloadDebt.changesReloaded;
        let ownedNames =
          pluginsSyncNeedsRefresh && !lateForwardedInstallNeedsRefresh
            ? await this.serverNamesOwnedBeforePluginsSync()
            : undefined;
        await this.refreshPluginState();
        organizationAsk.isCommandHeld &&= !marketplaceHeld;
        this.isRefillLanded &&= !isRefillLanded;
        if (marketplaceHeld && organizationAsk.isMarketplaceHeld) {
          organizationAsk.isMarketplaceHeld = false;
          this.refillMarketplaces().then((landed) => {
            this.isRefillLanded ||= landed;
          }, logError);
        }
        let hadOwnNames = lateForwardedInstallNeedsRefresh || ownedNames !== undefined;
        let diffFailed = false;
        if (lateForwardedInstallNeedsRefresh)
          diffFailed = await this.applyPluginMcpDiff(
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
        else if (ownedNames)
          diffFailed = await this.applyPluginMcpDiff(ownedNames, "plugins_sync").then(
            () => false,
            (error) => {
              logForDebugging(`late plugins sync: applyPluginMcpDiff failed: ${errorMessage(error)}`, {
                level: "error",
              });
              return true;
            },
          );
        else if (roundOutcome === "due")
          diffFailed = await this.applyPluginMcpDiff(
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
        else if (roundOutcome === "waiting") {
          this.accountPluginsNeedReload = true;
          this.accountPluginsFreshness.reloadLeftToNextTry();
        }
        if (sourceReleased && !hadOwnNames)
          await this.applyPluginMcpDiff(this.connectedNonDynamicMcpServerNames(), "plugins_sync").catch(
            (error) => {
              logForDebugging(`released command source: applyPluginMcpDiff failed: ${errorMessage(error)}`, {
                level: "error",
              });
            },
          );
        if (roundOutcome === "due" || (roundOutcome === "waiting" && hadOwnNames)) {
          let reloadOk = diffFailed || syncedPluginReloadDebt.reloadsCompleted === reloadsCompleted;
          this.accountPluginsNeedReload = reloadOk;
          this.accountPluginsFreshness.reloadEnded(reloadOk, changesReloaded);
        }
        let hooks = (pluginsSyncNeedsRefresh || sourceReleased) && this.runSessionStartHooksOfNewPlugins();
        if (hooks) await hooks;
      } catch (error) {
        logError(error);
        let failed = roundOutcome !== "none";
        if (failed) {
          this.accountPluginsNeedReload = true;
          try {
            this.accountPluginsFreshness.reloadEnded(failed, changesReloaded);
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
  accountPluginsJoin(skipCheck) {
    try {
      let unwaitedAccountPluginsCheck = this.isPastFirstTake ? this.unwaitedAccountPluginsCheck : undefined;
      if (
        unwaitedAccountPluginsCheck === undefined &&
        this.isPastFirstTake &&
        this.accountPluginsFreshness.isCheckDue() &&
        !skipCheck()
      ) {
        let startUnwaited = () => {
          let unwaited = this.accountPluginsFreshness.atTurnStart(false)?.then(
            (needed) => {
              this.accountPluginsNeedReload ||= needed;
              return needed;
            },
            (error) => {
              logForDebugging(`account plugins freshness: unwaited check failed: ${errorMessage(error)}`, {
                level: "error",
              });
              return false;
            },
          );
          if (unwaited === undefined) return;
          this.unwaitedAccountPluginsCheck = unwaited;
          unwaited.finally(() => {
            if (this.unwaitedAccountPluginsCheck === unwaited) this.unwaitedAccountPluginsCheck = undefined;
          });
        };
        if (!this.isAccountPluginsReloadOwed()) {
          startUnwaited();
          return null;
        }
        return this.reloadChangedAccountPlugins(false)
          .then(startUnwaited)
          .catch((error) =>
            logForDebugging(`account plugins freshness: join failed: ${errorMessage(error)}`, {
              level: "error",
            }),
          );
      }
      let dueCheck =
        unwaitedAccountPluginsCheck === undefined && this.isPastFirstTake
          ? this.accountPluginsFreshness.atTurnStart()
          : undefined;
      let check =
        unwaitedAccountPluginsCheck !== undefined && skipCheck() ? unwaitedAccountPluginsCheck : dueCheck;
      this.isPastFirstTake = true;
      if (check === undefined && !this.isAccountPluginsReloadOwed()) return null;
      return (
        check === undefined
          ? Promise.resolve(false)
          : withDeadline(
              check.then((needed) => {
                this.accountPluginsNeedReload ||= needed;
                return needed;
              }),
              ACCOUNT_PLUGINS_RETRY_MS,
              (fn, delay) => this.session.host.clock.setTimeout(fn, delay),
            ).then((finished) => {
              if (finished === undefined) {
                if (
                  unwaitedAccountPluginsCheck !== undefined &&
                  this.unwaitedAccountPluginsCheck === unwaitedAccountPluginsCheck
                )
                  this.unwaitedAccountPluginsCheck = undefined;
                logForDiagnosticsNoPII("warn", "plugins_sync_turn_start_check_wait_timeout", {
                  waited_ms: ACCOUNT_PLUGINS_RETRY_MS,
                });
              }
              return finished === true;
            })
      )
        .then((needed) => this.reloadChangedAccountPlugins(needed))
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
  async reloadChangedAccountPlugins(force) {
    let shouldReload = force || this.isAccountPluginsReloadOwed();
    if (this.isReloadHeldByHost() || !shouldReload) return;
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
    let reloadRacedOut = false;
    this.isAccountPluginsReloadRunning = true;
    this.triesSkippedForRunningReload = 0;
    let reloadTicket = ++this.accountPluginsReloadsStarted;
    let reloadPromise = this.reloadAccountPlugins()
      .then((changed) => {
        this.isAccountPluginsReloadRunning &&= this.accountPluginsReloadsStarted !== reloadTicket;
        let racedOut = reloadRacedOut && !changed;
        this.accountPluginsNeedReload = racedOut ? false : this.accountPluginsNeedReload || changed;
        if (!reloadRacedOut || !changed) this.accountPluginsFreshness.reloadEnded(changed, changesReloaded);
        return true;
      })
      .catch((error) => {
        logForDebugging(`account plugins freshness: reload not recorded: ${errorMessage(error)}`, {
          level: "error",
        });
        return true;
      });
    if (
      (await withDeadline(reloadPromise, ACCOUNT_PLUGINS_CHECK_TIMEOUT_MS, (fn, delay) =>
        this.session.host.clock.setTimeout(fn, delay),
      )) !== true
    ) {
      reloadRacedOut = true;
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
    let failed = false;
    try {
      await this.refreshPluginState();
    } catch (error) {
      failed = true;
      logError(error);
    }
    if (!failed)
      try {
        await this.applyPluginMcpDiff(
          this.connectedNonDynamicMcpServerNames(),
          "plugins_sync",
          "account_plugins",
        );
      } catch (error) {
        failed = true;
        logForDebugging(`account plugins freshness: MCP diff failed: ${errorMessage(error)}`, {
          level: "error",
        });
      }
    return failed || syncedPluginReloadDebt.reloadsCompleted === reloadsCompleted;
  }
  *firstCommand() {
    let pending = this.pendingPluginRefresh();
    if (pending) {
      let startTime = performance.now();
      yield pending;
      this.pluginRefreshJoined();
      recordPhase("registry_refresh_join_ms", performance.now() - startTime, startTime);
    }
    headlessProfilerCheckpoint("before_mcp_prewait");
    this.enterPhase("mcp_prewait");
    let startTime = performance.now();
    let policy = this.mcpPrewait.policyAtFirstCommand();
    let { waitForDeferrable, firstTurnHold } = policy;
    let skipNames = this.mcpPrewait.serversToSkipNow(policy.skipFullyDeferredServers);
    let deferring = waitForDeferrable && !this.mcpPrewait.waitForDeferrable;
    let lapsed =
      !this.firstCommandTaken &&
      this.store
        .getState()
        .mcp.clients.some(
          (client) =>
            client.type === "pending" &&
            this.mcpPrewait.skippedAtKick.has(client.name) &&
            !skipNames.has(client.name),
        );
    let requiredNames =
      waitForDeferrable || this.firstCommandTaken ? undefined : this.mcpPrewait.requiredServersNow();
    let pendingRequired =
      requiredNames === undefined
        ? []
        : this.store
            .getState()
            .mcp.clients.filter(
              (client) => client.type === "pending" && requiredNames.has(getPrefixServerKey(client.name)),
            );
    let requiredNew =
      !this.mcpPrewait.waitForDeferrable &&
      pendingRequired.some((client) => !this.mcpPrewait.requiredAtKick.has(getPrefixServerKey(client.name)));
    let clientsGrew = this.store.getState().mcp.clients.length > this.mcpClientCountAtKick;
    let startedSinceKick = new Set(this.serversStartedSinceKick);
    this.serversStartedSinceKick.clear();
    let deadlineMs = this.mcpPrewait.deadlineMs;
    if (clientsGrew || deferring || lapsed || requiredNew || startedSinceKick.size > 0) {
      let laterWakes = this.firstCommandTaken ? this.mcpPrewait.laterWakes : undefined;
      deadlineMs = laterWakes
        ? laterWakes.deadlineMs
        : (this.mcpPrewait.freshWaitDeadlineMs?.() ??
          (deferring ? policy.deadlineMs : this.mcpPrewait.deadlineMs));
      yield this.waitForPendingMcp(deadlineMs, {
        skipTelemetry:
          this.mcpClientCountAtKick > 0 &&
          !deferring &&
          !lapsed &&
          !requiredNew &&
          startedSinceKick.size === 0,
        waitForDeferrable,
        firstTurnHold,
        requiredServerNames: requiredNames,
        ...(startedSinceKick.size > 0 && {
          alsoWaitFor: startedSinceKick,
        }),
        ...(skipNames.size > 0 && {
          skipServerNames: skipNames,
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
          deferring
            ? "hold_since_kick"
            : requiredNew
              ? "required_since_kick"
              : lapsed
                ? "skip_lapsed_since_kick"
                : clientsGrew
                  ? "clients_grew"
                  : startedSinceKick.size > 0
                    ? "started_since_kick"
                    : "none",
        ),
        pendingRequiredBeforeJoin: pendingRequired.length,
        pendingAfterJoin: count(this.store.getState().mcp.clients, (client) => client.type === "pending"),
        relayMarked: this.mcpPrewait.relayMarked,
        relayHold: this.mcpPrewait.relayHold,
        relayHoldFollowsBootVerdict: this.mcpPrewait.relayHoldFollowsBootVerdict,
        deadlineMs: deadlineMs ?? TRANSPORT_FALLBACK_TIMEOUT_MS,
      });
    this.firstCommandTaken = true;
    recordPhase("mcp_prewait_ms", performance.now() - startTime, startTime);
    headlessProfilerCheckpoint("after_mcp_prewait");
    this.enterPhase("first_command");
    let mountJoin = this.firstCommandMountJoin(performance.now() - startTime);
    if (mountJoin) yield mountJoin;
  }
  sdkToolRelistJoin(command) {
    if (command.shouldQuery === false || this.sdkMcpBackgroundRetry || !this.sdkToolRelistPending())
      return null;
    let budgetMs = this.sdkUpdateWaitBudgetMs();
    let startTime = performance.now();
    let update = this.updateSdkMcp("skip");
    return withDeadline(
      update.then(() => true),
      budgetMs,
    )
      .then((finished) => {
        let timedOut = finished !== true;
        if (timedOut) update.catch(logError);
        logForDiagnosticsNoPII(timedOut ? "warn" : "info", "sdk_mcp_relist_wait", {
          budget_ms: budgetMs,
          waited_ms: Math.round(performance.now() - startTime),
          timed_out: timedOut,
          tools_change_still_pending: this.sdkToolRelistPending(),
        });
      })
      .catch(logError);
  }
  wireTurn() {
    let state = this.store.getState();
    let clients = this.allMcpClients(state);
    this.registerElicitationHandlers(clients);
    for (let client of clients) this.registerChannelHandler(client);
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
  async restore(context, storageV5) {
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
    let disabled = new Set(normalizeServerNameList(restoredWorkerState.internal?.disabled_mcp_servers));
    if (disabled.size === 0) return;
    try {
      switchOffMcpServers([...disabled], storageV5);
    } catch (error) {
      if (error instanceof NoProjectDirectoryError)
        logForDebugging("[MCP] no directory to restore switched-off servers in");
      else logError(toError(error));
      logFeatureSad("mcp_switched_off_record", "save_failed");
      return;
    }
    for (let name of disabled) this.switchedOffByThisWorker.add(name);
    let replyReady = {
      ...context,
      replyNow: null,
    };
    let state = context.engineState();
    let timedOut = new Set();
    await Promise.all(
      state.mcp.clients
        .filter((client) => disabled.has(client.name) && client.type !== "disabled")
        .map(async (client) => {
          let finished = false;
          try {
            await withDeadline(
              (async () =>
                reconnectMcpServerByName(
                  replyReady,
                  EMPTY_MCP_WIRING,
                  client.name,
                  client.config,
                  state,
                  () => this.switchedOffByThisWorker.has(client.name),
                ))().finally(() => {
                finished = true;
              }),
              SDK_MCP_WAIT_MS,
            );
          } catch (error) {
            logError(toError(error));
          }
          if (!finished) timedOut.add(client.name);
        }),
    );
    let filtered = context
      .engineState()
      .mcp.clients.filter((client) => disabled.has(client.name) && client.type !== "disabled");
    for (let client of filtered) markServerDisabled_2(replyReady, EMPTY_MCP_WIRING, client.name);
    if (filtered.length === 0) {
      logFeatureOk("mcp_switched_off_record", {
        server_count: disabled.size,
      });
      return;
    }
    if (filtered.some((client) => timedOut.has(client.name)))
      logFeatureSad("mcp_switched_off_record", "close_timed_out");
    if (filtered.some((client) => !timedOut.has(client.name)))
      logFeatureSad("mcp_switched_off_record", "close_failed");
  }
  switchSaved(serverName, enabled) {
    if (!this.isKept) return;
    this.switchedOffByThisWorker.delete(serverName);
    if (enabled) this.foundLate.delete(serverName);
    else if (getSwitchedOffMcpServers().includes(serverName)) this.switchedOffByThisWorker.add(serverName);
    if (!this.isUnread) {
      this.write();
      return;
    }
    if (enabled) this.switchedOnWhileUnread.add(serverName);
    else this.switchedOnWhileUnread.delete(serverName);
    this.readThenWrite();
  }
  async readThenWrite() {
    let state = await this.io.rereadWorkerState().catch(() => null);
    if (state === null || state.readFailed === true) {
      logFeatureSad("mcp_switched_off_record", "unread_at_switch");
      return;
    }
    if (this.isUnread) {
      this.isUnread = false;
      for (let name of normalizeServerNameList(state.internal?.disabled_mcp_servers))
        if (!this.switchedOnWhileUnread.has(name)) this.foundLate.add(name);
      this.switchedOnWhileUnread.clear();
    }
    this.write();
  }
  write() {
    try {
      let names = normalizeServerNameList([
        ...this.foundLate,
        ...getSwitchedOffMcpServers(),
        ...this.switchedOffByThisWorker,
      ]);
      this.io.sessionState.notifyInternalMetadataChanged({
        disabled_mcp_servers: names.length > 0 ? names : null,
      });
    } catch (error) {
      logError(toError(error));
      logFeatureSad("mcp_switched_off_record", "write_failed");
    }
  }
}
//@ chunk-tyg7f3ek.js:214082-214252 placement
function normalizeServerNameList(disabledMcpServers) {
  let list = Array.isArray(disabledMcpServers) ? disabledMcpServers : [];
  let names = new Set();
  for (let name of list)
    if (
      typeof name === "string" &&
      name.length > 0 &&
      name.length <= MAX_SERVER_NAME_LENGTH &&
      !isClaudeInChromeMCPServer(name)
    ) {
      names.delete(name);
      names.add(name);
    }
  return [...names].slice(-MAX_PREWAIT_SERVERS);
}
//@ chunk-tyg7f3ek.js:214252-214647 placement
function retirementPromptRows({ sessionId, prompt, listed, retirementRows, othersToCome }) {
  let rows = [];
  try {
    rows = retirementRows
      .filter((row) => row.type === "user")
      .flatMap((row) => Array.from(normalizeMessage(row)))
      .map((row) => ({
        ...row,
        session_id: sessionId,
      }));
  } catch (error) {
    logError(error);
  }
  return [
    ...rows,
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
function parseTaskNumber(id) {
  let number = Number(id);
  return /^\d+$/.test(id) && number <= MAX_TASK_NUMBER ? number : undefined;
}
//@ chunk-tyg7f3ek.js:214747-215311 placement
/**
 * 任务工具记录提取辅助：从 tool_use/tool_result 输入里取字段、拼出任务创建/更新参数与结果文本。
 */
var taskToolInputFields = (input, key) => (isPlainObject_2(input) ? input[key] : undefined);
var taskToolInputForTelemetry = (use) =>
  (use.name === TASK_CREATE_TOOL_NAME
    ? coerceTaskCreateInput(use.input)
    : normalizeTaskInputAliases(use.input)
  )?.input ?? use.input;
var taskInputFieldNames = (task) => {
  let readStringField = (fieldName) => {
    let fields = taskToolInputFields(task, fieldName);
    return typeof fields === "string" ? fields : undefined;
  };
  let readField = (id) => {
    let fields = taskToolInputFields(task, id);
    return Array.isArray(fields) ? fields.filter((field) => typeof field === "string") : undefined;
  };
  let metadataFields = taskToolInputFields(task, "metadata");
  return {
    subject: readStringField("subject"),
    description: readStringField("description"),
    activeForm: readStringField("activeForm"),
    status: readStringField("status"),
    owner: readStringField("owner"),
    metadata: isPlainObject_2(metadataFields) ? metadataFields : undefined,
    addBlocks: readField("addBlocks"),
    addBlockedBy: readField("addBlockedBy"),
  };
};
var toolResultText = (task) =>
  typeof task.content === "string"
    ? task.content
    : Array.isArray(task.content)
      ? extractTextContent_2(task.content)
      : "";
//@ chunk-tyg7f3ek.js:215311-216137 placement
function* taskToolCallsInTranscript(messages, askedEarlier = () => false) {
  let indexByUuid = new Map();
  for (let [index, row] of messages.entries())
    if (row.type === "assistant") {
      let response = row.message.id ?? row.uuid ?? `row ${index}`;
      for (let block of row.message.content)
        if (
          block.type === "tool_use" &&
          (block.name === TASK_CREATE_TOOL_NAME || block.name === TASK_UPDATE_TOOL_NAME)
        )
          indexByUuid.set(block.id, {
            use: block,
            response,
            askedEarlier: askedEarlier(row, index),
          });
    }
  for (let [index, row] of messages.entries())
    if (row.type === "user" && typeof row.message.content !== "string")
      for (let block of row.message.content) {
        if (block.type !== "tool_result") continue;
        let call = indexByUuid.get(block.tool_use_id);
        if (call === undefined) continue;
        indexByUuid.delete(block.tool_use_id);
        if (block.is_error === true) continue;
        let text = toolResultText(block);
        let input = taskToolInputForTelemetry(call.use);
        if (call.use.name === TASK_CREATE_TOOL_NAME) {
          let taskId = text.match(TASK_CREATED_RE)?.[1];
          if (taskId !== undefined)
            yield {
              kind: "create",
              taskId,
              named: taskInputFieldNames(input),
              result: block,
              answeredEarlier: askedEarlier(row, index),
              ...call,
            };
        } else if (text.startsWith(TASK_UPDATE_PREFIX)) {
          let taskId = taskToolInputFields(input, "taskId");
          yield {
            kind: "update",
            taskId: typeof taskId === "string" ? taskId : "",
            named: taskInputFieldNames(input),
            result: block,
            answeredEarlier: askedEarlier(row, index),
            ...call,
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
