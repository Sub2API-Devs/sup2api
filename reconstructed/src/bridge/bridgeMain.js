/**
 * bridge/bridgeMain.ts
 *
 * Remote Control 独立桥主循环（环境注册、轮询工作、派生会话）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/bridgeMain.ts
 * pieces: chunk-0knprqgt.js (1), chunk-3nztfxrw.js (1), chunk-b30925fy.js (14), chunk-wbbfk060.js (51)
 * attribution: fingerprint 19, placement 11, layout 22, sole-consumer 15
 */
import { join, resolve, basename } from "path";
import { lstat } from "fs/promises";
import { hostname } from "os";
import { randomUUID } from "crypto";
import { DoctorLazy } from "../cli/handlers/util.js";
import { o, u, T } from "../../vendor/zod/v4/classic/schemas.js";
import { logError } from "../utils/log.js";
import { logForDebugging } from "../utils/debug.js";
import { sleep, backoffDelayMs, Aa } from "../utils/sleep.js";
import { SSEFrameBuffer } from "../cli/transports/SSETransport.js";
import { jsonParseRaw } from "../utils/slowOperations.js";
import { BoundedUUIDSet } from "./bridgeMessaging.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum, fromEnumOpt, lit } from "../services/analytics/safeMetadata.js";
import {
  logFeatureOk,
  logFeatureBad,
  logFeatureSad,
  logFeatureBadAsync,
} from "../services/analytics/featureTelemetry.js";
import {
  isBridgeRcChildRestartResumeEnabled,
  isBridgeEnvReregisterEnabled,
  isBridgeEnvReregisterOn401Enabled,
  isBridgeEnvSecretProactiveRenewalEnabled,
  isBridgeServerSessionConfigEnabled,
  getBridgeRcChildIdleExitMs,
  isCcrV2SessionCrudEnabled,
  isBridgeProjectsHintEnabled,
} from "./bridgeGates.js";
import { sessionIdBody, toInfraSessionId, toCompatSessionId, validateBridgeId } from "./sessionIdCompat.js";
import { MAX_POINTER_ACTIVE_SESSION_IDS } from "./bridgePointer.js";
import { BridgeFatalError, isExpiredErrorType, createBridgeApiClient } from "./bridgeApi.js";
import {
  errorMessage,
  withTelemetryMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  sanitizeErrorName,
  classifyAxiosError,
  sanitizedOAuthErrorTypeForTelemetry,
  isENOENT,
  getErrnoCode,
} from "../utils/errors.js";
import { $Je, fetchBridgeSessionTags } from "./sessionTags.js";
import { createCapacityWake } from "./capacityWake.js";
import { getPollIntervalConfig } from "./pollConfig.js";
import { createTokenRefreshScheduler } from "./jwtUtils.js";
import { logForDiagnosticsNoPII } from "../utils/diagLogs.js";
import { formatDuration, truncateToWidth } from "../utils/format.js";
import { plural } from "../utils/stringUtils.js";
import { connectedBridgePolicyRefusal } from "./bridgeEntitlement.js";
import { isLovelyUmbrellaOn } from "../utils/settings/settingsSourceTrust.js";
import { onPolicyVerdictChanged } from "../services/policyLimits/policyState.js";
import {
  BRIDGE_LOGIN_INSTRUCTION,
  WORK_STATE_QUEUED,
  SANDBOX_SETTING_HINT,
  BRIDGE_LOGIN_ERROR,
} from "./types.js";
import {
  isBridgeFirstParty,
  classifyBridgeSessionRoles,
  machineLaneVersionRefusal,
  isMachineLaneWork,
  machineLaneVersionRefusalAfterHold,
  hasBridgeChildFeatureEnabled,
} from "./bridgeEnabled.js";
import { isEssentialTrafficOnly, getEssentialTrafficOnlyReason } from "../utils/privacyLevel.js";
import { hashIdForLog, describeAxiosError } from "./debugUtils.js";
import { decodeWorkSecret, buildCCRv2SdkUrl, registerWorker, sameSessionId } from "./workSecret.js";
import { hasWorktreeCreateHook } from "../utils/hooks/worktreeHooks.js";
import { findGitRootRecheckingNegative } from "../utils/git.js";
import {
  createAgentWorktree,
  getAgentWorktreeChanges,
  unlockAgentWorktree,
  removeAgentWorktree,
} from "../utils/worktree.js";
import { safeFilenameId, createSessionSpawner } from "./sessionRunner.js";
import { applyBridgeServerConfig, carriedModelArgs, cleanupServerConfigDir } from "./bridgeServerConfig.js";
import { createTitleWriteCoalescer } from "./titleWrite.js";
import { ye } from "../utils/startupMarks.js";
import { isEvalBuild, parseIntLoose } from "../utils/envUtils.js";
import { cooAttributes } from "../utils/telemetry/cooAttributes.js";
import { claudeTempDir } from "../utils/tempDir.js";
import { getRemoteSessionUrl } from "../constants/product.js";
import { normalizePermissionModeAlias } from "../types/permissions.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import {
  getBridgeAccessTokenAsync,
  getBridgeAccessToken,
  getBridgeSessionNamePrefix,
} from "./bridgeConfig.js";
import {
  getTrustedDeviceToken,
  withUntrustedDeviceRecovery,
  getAttestationFilterPolicy,
  recoverFromUntrustedDevice,
  sayHeldAutomaticEnrollmentNoticeOnStderr,
  untrustedDeviceHint,
} from "./trustedDevice.js";
import { printRemoteControlHelp, SPAWN_SESSIONS_DEFAULT } from "./remoteControlHelp.js";
import { processWrapperError } from "../utils/processWrapper.js";
import { lockCurrentVersion } from "../utils/nativeInstaller/installer.js";
import { setAttestationFilterPolicy } from "./deviceAttestation.js";
import { env } from "../utils/env.js";
import { collectHostProfileIfShared, filterSharedEnvironment } from "../utils/toolchainDetection.js";
import { createBridgeLogger } from "./bridgeUI.js";
import { wrapAnsi } from "../ink/wrapAnsi.js";
import { Gg } from "../utils/permissions/autoModeRulesPrompt.js";
import { sequential } from "../utils/sequential.js";
import { resolveDaemonOwner } from "./ownerPin.js";
import { getLaunchCommand } from "../utils/deepLink/registerProtocol.js";
import { setRawModeSafe } from "../ink/setRawModeSafe.js";
import { randomWordSlug } from "../utils/words.js";
import { REMOTE_CONTROL_CLI, REMOTE_CONTROL_AUTO } from "./sessionOrigins.js";
import { drainRegisteredWriteQueues } from "../utils/settings/writeQueues.js";
import { processChdir } from "../utils/fsOperations.js";
import { REMOTE_CONTROL_DISABLED_BY_POLICY_MESSAGE } from "./remoteControlPolicy.js";
import { hr } from "../utils/invisibleChars.js";
import { En } from "../../vendor/lodash-es/_inlinedHelpers.js";

//@ chunk-wbbfk060.js:19719-19899 sole-consumer
var BRIDGE_WATCH_DEADLINE_MS = 210000,
  Br = 30000,
  Wr = 15000,
  lr = 60000,
  Nr = 30000,
  jr = 20000,
  Hn = 45000,
  Fr = 15000,
  Gn = 360000,
  Ur = 540000,
  Lr = 3,
  cr = 3600000,
  Hr = 900000,
  qr = 30000,
  Gr = 600000,
  Vr = 1048576,
  PRINTABLE_TOKEN_RE = /^[\x21-\x7e]{1,4096}$/;
//@ chunk-wbbfk060.js:19899-19962 sole-consumer
function Ht(e) {
  return { wall: e.now(), monotonic: e.monotonicNow() };
}
/**
 * 桥会话响应 schema（字符串长度上限、可空字段）。
 */
//@ chunk-wbbfk060.js:19962-20308 sole-consumer
var BoundedStringSchema = DoctorLazy(() => o().max(256)),
  OptionalBoundedString = DoctorLazy(() =>
    BoundedStringSchema()
      .nullish()
      .transform((e) => e ?? void 0),
  ),
  BridgeSessionSchema = DoctorLazy(() =>
    u({
      id: BoundedStringSchema().min(1),
      environment_id: OptionalBoundedString(),
      status: OptionalBoundedString(),
      worker_status: OptionalBoundedString(),
      last_event_at: OptionalBoundedString(),
      external_metadata: u({
        tool_host_status: u({
          state: T("requested"),
          environment_id: BoundedStringSchema().min(1),
          requested_at: BoundedStringSchema().min(1),
        })
          .optional()
          .catch(void 0),
      })
        .optional()
        .catch(void 0),
    }),
  );
/**
 * 维护 off/连接中/已连接等状态，状态变化回调 onStateChange；每次尝试带代号与中止控制器， 失败按 HTTP 状态决定结束或在退避后重试；用墙钟与单调钟的差检测休眠。
 */
//@ chunk-wbbfk060.js:20308-24495 sole-consumer
function createBridgeWatcher(e) {
  let { api: api, clock: clock, random: random } = e,
    watchState = "off",
    attemptGeneration = 0,
    attemptAbort,
    j,
    ne,
    W,
    Q = { wall: 0, monotonic: 0 },
    me = Q,
    se = -1 / 0,
    Z;
  function elapsedSince(E) {
    return Math.max(clock.now() - E.wall, clock.monotonicNow() - E.monotonic);
  }
  let be = Gn,
    Oe = 0,
    G = 0;
  function callSafely(E) {
    try {
      E();
    } catch (error) {
      logError(error);
    }
  }
  function q(E, B) {
    if (E !== watchState)
      (logForDebugging(`[bridge:watch] ${watchState} -> ${E}${B ? ` after ${B}` : ""}`),
        (watchState = E),
        callSafely(() => e.onStateChange(E, B)));
  }
  function cancelAttempt() {
    (attemptGeneration++, attemptAbort?.abort(), (attemptAbort = void 0), j?.(), ne?.(), (j = ne = void 0));
  }
  function scheduleNextAttempt(E) {
    let B = Number.isFinite(E) ? E : lr;
    (logForDebugging(`[bridge:watch] next attempt in ${Math.round(B / 1000)}s`),
      (ne = clock.setTimeout(X, B, { unref: !0 })));
  }
  function X() {
    cancelAttempt();
    let E = attemptGeneration,
      abortController = new AbortController();
    ((attemptAbort = abortController),
      (Q = me = Ht(clock)),
      (be = Gn + random() * (Ur - Gn)),
      K(E),
      Be(E, abortController.signal)
        .catch((ee) => {
          if (E !== attemptGeneration) return { end: "network" };
          return (
            logForDebugging(
              `[bridge:watch] attempt threw ${ee instanceof Error ? ee.name : typeof ee} ${ee !== null && typeof ee === "object" && "code" in ee ? String(ee.code) : ""}`,
              { level: "error" },
            ),
            { end: "network" }
          );
        })
        .then((ee) => {
          if (E === attemptGeneration) Ee(ee);
        })
        .catch(logError),
      q("connecting"));
  }
  function K(E) {
    j = clock.setTimeout(
      () => {
        if (E !== attemptGeneration) return;
        let B = elapsedSince(Q);
        if (B > 2 * Hn) Ee({ end: "slept" });
        else if (B > Hn) Ee({ end: watchState === "connected" ? "silent" : "connect_timeout" });
        else if (elapsedSince(me) > be) Ee({ end: "no_sync" });
        else K(E);
      },
      Fr,
      { unref: !0 },
    );
  }
  async function Be(E, B) {
    let ee = { end: "network" },
      accessToken = await e.getAccessToken();
    if (E !== attemptGeneration) return ee;
    if (!accessToken) return { end: "auth" };
    let Re = W === void 0 ? 1 / 0 : clock.now() - W.at;
    if (!(Re >= 0 && Re < BRIDGE_WATCH_DEADLINE_MS)) {
      let h = se - clock.monotonicNow();
      if (h > 0) await sleep(h, B, { clock: clock });
      if (E !== attemptGeneration) return ee;
      ((Q = Ht(clock)), (W = void 0), (se = clock.monotonicNow() + Br * (1 + 0.5 * random())));
      let mintResumeToken = await api.mintResumeToken(accessToken, B);
      if (E !== attemptGeneration) return ee;
      if (mintResumeToken.status !== 200)
        return mintResumeToken.status === 404 || mintResumeToken.status === 410
          ? { end: "http_unexpected" }
          : classifyWatchHttpStatus(mintResumeToken.status, mintResumeToken.retryAfterMs);
      if (mintResumeToken.resumeToken === void 0 || !PRINTABLE_TOKEN_RE.test(mintResumeToken.resumeToken))
        return { end: "resume_token_unusable" };
      W = { value: mintResumeToken.resumeToken, at: clock.now() };
    }
    if (W === void 0) return ee;
    let open = await api.open(accessToken, W.value, B);
    if (E !== attemptGeneration) return (open.body?.destroy(), ee);
    if (open.status !== 200)
      return open.status === 410 && clock.now() - W.at < 30000
        ? { end: "http_unexpected" }
        : classifyWatchHttpStatus(open.status, open.retryAfterMs);
    return open.body === void 0 ? { end: "not_event_stream" } : fe(open.body, B, E);
  }
  function fe(E, B, ee) {
    return new Promise((ce) => {
      let Re = new SSEFrameBuffer(),
        le = () => {
          E.destroy();
        },
        h = (L) => {
          (B.removeEventListener("abort", le), E.destroy(), ce({ end: L }));
        };
      (B.addEventListener("abort", le, { once: !0 }),
        E.on("data", (L) => {
          if (ee !== attemptGeneration) return;
          Q = Ht(clock);
          for (let te of Re.push(L)) {
            if (ee !== attemptGeneration) return;
            if (te.event === "sync") ze(te.id);
            else if (te.event === "added" || te.event === "changed") Ke(te.data);
          }
          if (Re.pendingChars > Vr) h("oversized_frame");
        }),
        E.on("error", () => h("network")),
        E.on("end", () => h("closed")),
        E.on("close", () => h("closed")));
    });
  }
  function ze(E) {
    if (E === void 0 || !PRINTABLE_TOKEN_RE.test(E)) {
      callSafely(e.onDroppedFrame);
      return;
    }
    if (((me = Ht(clock)), (W = { value: E, at: me.wall }), watchState !== "connected"))
      ((Z = clock.monotonicNow()), (G = 0), q("connected"));
  }
  function Ke(E) {
    let B;
    try {
      B = jsonParseRaw(E ?? "");
    } catch {
      B = void 0;
    }
    let safeParse = BridgeSessionSchema().safeParse(B);
    if (!safeParse.success) {
      callSafely(e.onDroppedFrame);
      return;
    }
    let {
        status: status,
        worker_status: worker_status,
        last_event_at: last_event_at,
        external_metadata: external_metadata,
      } = safeParse.data,
      L = external_metadata?.tool_host_status,
      te = {
        sessionId: safeParse.data.id,
        environmentId: safeParse.data.environment_id,
        archived: /(^|_)archived$/i.test(status ?? ""),
        fingerprint: `${status} ${worker_status} ${last_event_at}`,
        ...(L && { toolHostRequest: { environmentId: L.environment_id, requestedAt: L.requested_at } }),
      };
    callSafely(() => e.onFrame(te));
  }
  function Ee(E) {
    let B = watchState === "connected" && Z !== void 0 ? clock.monotonicNow() - Z : void 0,
      ce =
        (E.end === "closed" || E.end === "network") && elapsedSince(Q) > 2 * Hn
          ? "slept"
          : E.end === "closed" && B === void 0
            ? "closed_before_sync"
            : E.end,
      Re = B !== void 0 && B >= Nr;
    if ((cancelAttempt(), Re)) Oe = 0;
    let le;
    switch (ce) {
      case "not_offered":
        return He(ce, cr);
      case "auth":
        return He(ce, Hr);
      case "http_unexpected":
      case "resume_token_unusable":
      case "not_event_stream":
      case "oversized_frame":
        if (((W = void 0), ++G >= Lr)) return He(ce, cr);
        le = x(!0);
        break;
      case "slept":
        le = 0;
        break;
      case "closed":
      case "network":
      case "silent":
      case "no_sync":
        le = Re ? random() * jr : x();
        break;
      case "token_expired":
        ((W = void 0), (le = x()));
        break;
      case "rate_limited":
      case "closed_before_sync":
      case "connect_timeout":
      case "http_retryable":
        le = x();
        break;
    }
    let h = E.retryAfterMs || (ce === "rate_limited" ? qr : 0);
    (scheduleNextAttempt(Math.max(le, Math.min(h, Gr) * (1 + 0.5 * random()))), q("backoff", ce));
  }
  function He(E, B) {
    (scheduleNextAttempt(B * (0.5 + random())), q("parked", E));
  }
  function x(E = !1) {
    if (!E) Oe++;
    return backoffDelayMs({
      attempt: E ? 1 / 0 : Oe,
      baseMs: Wr,
      capMs: lr,
      jitter: { kind: "symmetric", ratio: 0.5 },
      random: random,
    });
  }
  return {
    start() {
      if (watchState === "off") X();
    },
    stop() {
      (cancelAttempt(), q("off"));
    },
    get state() {
      return watchState;
    },
  };
}
//@ chunk-wbbfk060.js:24495-24769 sole-consumer
function classifyWatchHttpStatus(e, s) {
  switch (e) {
    case 401:
    case 403:
      return { end: "auth" };
    case 404:
      return { end: "not_offered" };
    case 410:
      return { end: "token_expired" };
    case 429:
      return { end: "rate_limited", retryAfterMs: s };
    default:
      return { end: e >= 500 || e === 408 ? "http_retryable" : "http_unexpected", retryAfterMs: s };
  }
}
//@ chunk-wbbfk060.js:24769-24919 sole-consumer
var POLL_BACKOFF_LADDER_MS = [300, 1300, 4300, 15000, 30000, 60000],
  ASK_BASE_WAIT_MS = 30000,
  ASK_MAX_WAIT_MS = 16 * ASK_BASE_WAIT_MS,
  gr = 15000,
  Xr = 30000,
  In = 0.25,
  Kr = 30000,
  Qr = 3600000,
  Jr = 256,
  SLEEP_GAP_WINDOW = { from: 290000, to: 305000, retry: 4500 };
//@ chunk-wbbfk060.js:24919-25026 sole-consumer
function isSleepGap(e, s) {
  return (
    e !== void 0 &&
    [s.wall - e.wall, s.monotonic - e.monotonic].some(
      (S) => S >= SLEEP_GAP_WINDOW.from && S < SLEEP_GAP_WINDOW.to,
    )
  );
}
//@ chunk-wbbfk060.js:25026-25088 sole-consumer
var wr = { frame: "nudge", own: "own_request", free: "start_or_wake" };
/**
 * 轮询统计计数器初值。
 */
//@ chunk-wbbfk060.js:25088-25746 sole-consumer
function createPollCounters() {
  return {
    polls_nudge: 0,
    polls_own_request: 0,
    polls_start_or_wake: 0,
    polls_after_work: 0,
    polls_after_session_end: 0,
    polls_connected: 0,
    polls_fallback: 0,
    polls_with_work_nudge: 0,
    polls_with_work_own_request: 0,
    polls_with_work_start_or_wake: 0,
    polls_with_work_after_work: 0,
    polls_with_work_after_session_end: 0,
    polls_with_work_connected: 0,
    polls_with_work_fallback: 0,
    failed_other: 0,
    failed_timed_out: 0,
    failed_unreachable: 0,
    ladders_nudge: 0,
    ladders_own_request: 0,
    ladders_start_or_wake: 0,
    frames_this_environment: 0,
    frames_tool_host_request: 0,
    frames_dropped: 0,
    asks_too_soon_nudge: 0,
    asks_too_soon_own_request: 0,
    connect_attempts: 0,
    connects: 0,
    fallbacks: 0,
    connected_ms: 0,
  };
}
//@ chunk-wbbfk060.js:25746-26020 sole-consumer
function createAskBackoff(e) {
  let s = () => ({ waitMs: ASK_BASE_WAIT_MS, startedAt: -1 / 0 }),
    S = { frame: s(), own: s() };
  return {
    mayStart: (P) => e() - S[P].startedAt >= S[P].waitMs,
    started(P) {
      S[P].startedAt = e();
    },
    endedBarren(P) {
      S[P].waitMs = Math.min(2 * S[P].waitMs, ASK_MAX_WAIT_MS);
    },
    forgive(P) {
      S[P].waitMs = ASK_BASE_WAIT_MS;
    },
    reset() {
      S = { frame: s(), own: s() };
    },
  };
}
/**
 * 已连接（或最近连上）用 connectedMs，否则 fallbackMs，提供工具主机时上限 30 秒； 外部事件可把下次轮询提前并唤醒，记录各原因的轮询与有工作次数。
 */
//@ chunk-wbbfk060.js:26020-29796 sole-consumer
function createWorkPoller(e) {
  let { random: random } = e,
    S = () => e.clock.monotonicNow(),
    pollerState = "off",
    U,
    w,
    H,
    j = !1,
    ne = !1,
    W = -1 / 0,
    Q = "start_or_wake",
    me = -1 / 0,
    se,
    Z,
    askBackoff = createAskBackoff(S),
    be = new Map(),
    seenWorkIds = new BoundedUUIDSet(64),
    counters = createPollCounters(),
    ve = S();
  function isWithin(x, E) {
    return x !== void 0 && S() - x < E;
  }
  function isConnectedRecently() {
    return pollerState === "connected" || isWithin(H, Xr);
  }
  function pollIntervalMs() {
    let { connectedMs: connectedMs, fallbackMs: fallbackMs } = e.intervals(),
      B = isConnectedRecently() ? connectedMs : fallbackMs;
    return e.servesToolHosts() ? Math.min(B, Kr) : B;
  }
  function setNextPoll(x, E) {
    ((W = x), (Q = E));
  }
  function pullNextPollEarlier(x, E) {
    if (x < W) (setNextPoll(x, E), e.wake());
  }
  function Be(x, E) {
    if (W <= S()) W = 1 / 0;
    pullNextPollEarlier(x, E);
  }
  function fe() {
    let x = S(),
      { baseMs: baseMs, afterSessionEndWindowMs: afterSessionEndWindowMs } = e.intervals();
    if (isWithin(se, afterSessionEndWindowMs)) setNextPoll(x + Math.max(gr, baseMs), "after_session_end");
    else
      setNextPoll(
        x + Math.max(pollIntervalMs() * (1 - In + 2 * In * random()), baseMs),
        isConnectedRecently() ? "connected" : "fallback",
      );
  }
  function ze() {
    let x = Z?.startedAt ?? -1 / 0,
      found = POLL_BACKOFF_LADDER_MS.find((B) => x + B > S());
    return found === void 0 ? void 0 : x + found;
  }
  function Ke(x) {
    if (pollerState === "off") return;
    if (!e.hasRoom()) {
      Z = void 0;
      return;
    }
    if (Z !== void 0 && (Z.source !== "free" || x === "free")) return;
    if (x !== "free") {
      if (!askBackoff.mayStart(x)) {
        let ce = `asks_too_soon_${wr[x]}`;
        counters[ce]++;
        return;
      }
      askBackoff.started(x);
    }
    let E = wr[x],
      B = `ladders_${E}`;
    (counters[B]++,
      (Z = { startedAt: S(), source: x, cause: E }),
      Be(Z.startedAt + (POLL_BACKOFF_LADDER_MS[0] ?? 0), E));
  }
  function Ee(x) {
    if (x && Z !== void 0 && Z.source !== "free") askBackoff.endedBarren(Z.source);
    Z = void 0;
  }
  function He(x) {
    let E = S();
    if (w !== void 0) ((counters.connected_ms += E - w), (w = E));
    let B = U;
    if (
      (logEvent("tengu_bridge_watch_summary", {
        ...counters,
        connected_ms: Math.round(counters.connected_ms),
        window_ms: Math.round(E - ve),
        state: fromEnum(x),
        last_end: fromEnumOpt(B),
      }),
      (counters = createPollCounters()),
      (ve = E),
      x === "connected")
    )
      U = void 0;
  }
  return {
    governs() {
      return pollerState !== "off";
    },
    onWatchState(x, E) {
      let B = S(),
        ee = pollerState;
      if (((pollerState = x), (U = E ?? U), w !== void 0)) ((counters.connected_ms += B - w), (w = void 0));
      switch (x) {
        case "connected":
          if ((counters.connects++, (w = B), (H = void 0), j || !ne)) logFeatureOk("bridge_sessions_watch");
          ((j = !1), (ne = !0));
          break;
        case "connecting":
          if (ee === "connected" || ee === "off") H = B;
          if (ee === "off") ((counters = createPollCounters()), (ve = B), Ke("free"));
          counters.connect_attempts++;
          break;
        case "backoff":
          if (ee === "connected") H = B;
          if (E === "slept") ((Z = void 0), askBackoff.reset(), Ke("free"));
          break;
        case "parked":
          ((H = void 0), logFeatureBad("bridge_sessions_watch", E ?? "unknown"));
          break;
        case "off":
          (He(ee), (H = se = Z = U = void 0), askBackoff.reset(), (j = !1), e.wake());
          break;
      }
    },
    onFrame(x) {
      let toolHostRequest = x.toolHostRequest,
        B = `${x.sessionId} ${toolHostRequest?.requestedAt}`;
      if (e.servesToolHosts() && toolHostRequest?.environmentId === e.environmentId && !seenWorkIds.has(B))
        (counters.frames_tool_host_request++, seenWorkIds.add(B), Ke("frame"));
      if (x.environmentId !== e.environmentId) return;
      counters.frames_this_environment++;
      let ee = be.get(x.sessionId) === x.fingerprint;
      (be.delete(x.sessionId), be.set(x.sessionId, x.fingerprint));
      for (let ce of be.keys()) {
        if (be.size <= Jr) break;
        be.delete(ce);
      }
      if (!ee && !x.archived && !e.isRunningHere(x.sessionId)) Ke("frame");
    },
    onDroppedFrame() {
      counters.frames_dropped++;
    },
    expectWork() {
      Ke("own");
    },
    noteSessionEnd(x) {
      if (pollerState === "off") return;
      if (((se = S()), ze() === void 0)) Z = void 0;
      let E = se + random() * Math.max(gr, e.intervals().baseMs);
      if (Q === "after_session_end" && W > se) return;
      if (x) Be(E, "after_session_end");
      else pullNextPollEarlier(E, "after_session_end");
      let B = ze();
      if (Z !== void 0 && B !== void 0) pullNextPollEarlier(B, Z.cause);
    },
    noteHeartbeatOk() {
      askBackoff.forgive("own");
    },
    pollCause() {
      if (!isWithin(ve, Qr)) He(pollerState);
      if (!j && !isConnectedRecently()) {
        if (((j = !0), counters.fallbacks++, pollerState !== "parked"))
          logFeatureSad("bridge_sessions_watch", U ?? "never_connected");
        pullNextPollEarlier(
          Math.max(S() + random() * pollIntervalMs(), me + pollIntervalMs() * (1 - In)),
          "fallback",
        );
      }
      if (W > S()) return;
      return Q;
    },
    polled(x, E) {
      let B = S();
      me = B;
      let ee = `polls_${x}`;
      switch ((counters[ee]++, logForDebugging(`[bridge:watch] poll (${x}): ${E}`), E)) {
        case "new_work":
        case "redelivery":
        case "other_work": {
          let Re = `polls_with_work_${x}`;
          if ((counters[Re]++, x === "connected" && pollerState === "connected" && Z === void 0))
            logEvent("tengu_bridge_watch_miss", { work: fromEnum(E) });
          if (E === "new_work") {
            if ((askBackoff.reset(), Z !== void 0)) Z.source = "free";
          } else Ee(!0);
          setNextPoll(B, "after_work");
          return;
        }
        case "refused":
        case "timed_out":
          (counters[E === "refused" ? "failed_other" : "failed_timed_out"]++, Ee(!0));
          break;
        case "unreachable":
          counters.failed_unreachable++;
          break;
        case "empty":
          break;
      }
      if ((fe(), Z === void 0)) return;
      let ce = ze();
      if (ce === void 0) Ee(!0);
      else if (ce < W) setNextPoll(ce, Z.cause);
    },
    msUntilDue() {
      return Math.max(0, W - S());
    },
    longestGapMs() {
      return Math.ceil(Math.max(pollIntervalMs() * (1 + In), e.intervals().baseMs));
    },
  };
}
//@ chunk-wbbfk060.js:29796-29823 sole-consumer
function St() {
  return isBridgeRcChildRestartResumeEnabled();
}
//@ chunk-wbbfk060.js:29823-30032 sole-consumer
function projectThreadPointer(e, s) {
  if (e.size === 0 && s.size === 0) return;
  let S = new Set([...e].map(sessionIdBody));
  return {
    projectThreadSessionIds: [...e].slice(0, MAX_POINTER_ACTIVE_SESSION_IDS),
    parkedProjectThreadSessionIds: [...s]
      .filter((P) => !S.has(sessionIdBody(P)))
      .slice(0, MAX_POINTER_ACTIVE_SESSION_IDS),
  };
}
//@ chunk-wbbfk060.js:30032-30050 sole-consumer
var es = 4,
  br = 60000;
/**
 * 通过 bridge/reconnect 重新排队项目线程会话（超时、致命错误丢弃）。
 */
//@ chunk-wbbfk060.js:30050-30893 sole-consumer
async function requeueProjectThreadSessions(e, s, S, P) {
  let U = { requeued: 0, dropped: 0, deferred: 0 },
    w = [],
    H = P ? AbortSignal.any([P, AbortSignal.timeout(br)]) : AbortSignal.timeout(br),
    j = 0;
  async function ne() {
    while (j < S.length) {
      let W = S[j++];
      if (H.aborted) {
        w.push(W);
        continue;
      }
      let Q = toInfraSessionId(W),
        me = Q === W ? [W] : [W, Q],
        se = [],
        Z = !1;
      for (let M of me)
        try {
          (await e.reconnectSession(s, M, H), (Z = !0));
          break;
        } catch (error) {
          se.push(error);
        }
      if (Z)
        (U.requeued++,
          logForDebugging(`[bridge:init] project thread session ${W} re-queued via bridge/reconnect`));
      else if (se.every((M) => M instanceof BridgeFatalError))
        (U.dropped++,
          logForDebugging(
            `[bridge:init] project thread session ${W} no longer resumable: ${errorMessage(se[0])}`,
          ));
      else
        (U.deferred++,
          logForDebugging(
            `[bridge:init] project thread session ${W} reconnect transient failure; the server re-queues it on the member's next message`,
            { level: "warn" },
          ));
    }
  }
  return (await Promise.all(Array.from({ length: Math.min(es, S.length) }, ne)), { ...U, unattempted: w });
}
/**
 * 轮询退避默认值（连接错误 2s 起、上限 120s、10 分钟放弃；一般错误 0.5s 起、上限 30s、10 分钟放弃）及若干常量（registerWorker 重试 5 次等）。
 */
//@ chunk-wbbfk060.js:30893-31061 fingerprint = DEFAULT_BACKOFF (1)
var SHUTDOWN_GRACE_MS = 15000,
  DEFAULT_BACKOFF = {
    connInitialMs: 2000,
    connCapMs: 120000,
    connGiveUpMs: 600000,
    generalInitialMs: 500,
    generalCapMs: 30000,
    generalGiveUpMs: 600000,
  },
  REGISTER_WORKER_MAX_ATTEMPTS = 5,
  WORKER_RETRY_BASE_MS = 1000,
  STATUS_UPDATE_INTERVAL_MS = 120000,
  POLL_RETRY_FLOOR_MS = 3000;
/**
 * 判定"系统睡眠"的阈值：两次轮询错误间隔超过 connCapMs 的两倍即重置错误预算。
 */
//@ chunk-wbbfk060.js:31061-31097 fingerprint = pollSleepDetectionThresholdMs (1)
function pollSleepDetectionThresholdMs(backoff) {
  return backoff.connCapMs * 2;
}
/**
 * 在致命错误文案末尾补上"重新运行 claude remote-control 以重连"。
 */
//@ chunk-wbbfk060.js:31097-31198 layout
function withReconnectHint(message) {
  return `${message.replace(/[.!?]?\s*$/, ".")} Re-run \`claude remote-control\` to reconnect.`;
}
/**
 * 错误是否表示 environment 已不存在（BridgeFatalError 404/410，或消息匹配 environment … not found）。
 */
//@ chunk-wbbfk060.js:31198-31315 layout
function isEnvironmentGoneError(error) {
  if (error instanceof BridgeFatalError) return error.status === 404 || error.status === 410;
  return /environment .* not found/i.test(errorMessage(error));
}
/**
 * 调 sessionSpawner.spawn 派生子会话；抛错时记录日志并返回错误字符串。
 */
//@ chunk-wbbfk060.js:31315-31454 fingerprint = safeSpawn (0.733)
function safeSpawn(spawner, opts, dir) {
  try {
    return spawner.spawn(opts, dir);
  } catch (err) {
    let errMsg = errorMessage(err);
    return (
      logError(withTelemetryMessage(Error(`Session spawn failed: ${errMsg}`), "Session spawn failed")),
      errMsg
    );
  }
}
/**
 * 把 expires_in 秒数换成绝对过期时间戳（非正数返回 undefined）。
 */
//@ chunk-wbbfk060.js:31454-31546 layout
function expiresInToDeadline(expiresInSeconds) {
  return typeof expiresInSeconds === "number" && Number.isFinite(expiresInSeconds) && expiresInSeconds > 0
    ? Date.now() + expiresInSeconds * 1000
    : void 0;
}
/**
 * 主轮询循环：按容量选轮询间隔（满载/部分/空闲，或由 sessions watch 调度器决定）调用 pollForWork；对每个 work 解码 work secret、ack、registerWorker 取 epoch、
 * safeSpawn 子 CLI（--sdk-url 指向 /v1/code/sessions/{id}）；维护活动会话、心跳（heartbeatWork）、超时、工作树清理与 stopWork；连接/一般错误分别指数退避，检测系统睡眠重置预算，
 * environment 丢失时重新注册；environment secret 临期时续期；退出时停止全部会话、按需重排队并注销 environment。
 */
//@ chunk-wbbfk060.js:31546-67919 fingerprint = runBridgeLoop (0.603)
async function runBridgeLoop(
  config,
  environmentId,
  environmentSecret,
  api,
  sessionSpawner,
  logger,
  parentSignal,
  backoff = DEFAULT_BACKOFF,
  initialSessionId,
  getAccessToken,
  initialSessionTitle,
  secretExpiresIn,
  pollOptions,
) {
  let controller = new AbortController();
  if (parentSignal.aborted) controller.abort();
  else parentSignal.addEventListener("abort", () => controller.abort(), { once: !0 });
  let loopSignal = controller.signal;
  async function fetchSessionRecordWithRetry(n) {
    let A = { baseUrl: config.apiBaseUrl, getAccessToken: getAccessToken },
      _ = await $Je(n, A);
    if (_ !== null || loopSignal.aborted) return _;
    if ((await sleep(2000, loopSignal), loopSignal.aborted)) return null;
    return $Je(n, A);
  }
  let Oe = { inFlight: void 0 },
    currentEnvironmentSecret = environmentSecret,
    secretRenewAt = computeSecretRenewAt(secretExpiresIn),
    secretExpiresAt = expiresInToDeadline(secretExpiresIn),
    re = !1,
    N = 0,
    X = !1,
    reregisterAttempts = 0,
    Be,
    pendingCleanups = [],
    ze,
    Ke = !1,
    Ee = !1,
    He = 0,
    activeSessions = new Map();
  function E(n) {
    ((currentEnvironmentSecret = n.environmentSecret),
      (secretRenewAt = computeSecretRenewAt(n.environmentSecretExpiresIn)),
      (secretExpiresAt = expiresInToDeadline(n.environmentSecretExpiresIn)),
      (Ee = !0),
      (He = reregisterAttempts));
    let A = new Map(activeSessions);
    activeSessions.clear();
    for (let pendingRequeue of n.pendingRequeues)
      activeSessions.set(pendingRequeue, (A.get(pendingRequeue) ?? 0) + 1);
  }
  let B = { failures: 0, notBefore: 0 },
    pendingRequeues = new Map((config.initialSessionRequeues ?? []).map((n) => [n, 0])),
    ce = !1,
    settleRequeue = (n, A) => {
      let _ = sessionIdBody(n),
        v = !1;
      for (let y of [...pendingRequeues.keys()])
        if (sessionIdBody(y) === _) (pendingRequeues.delete(y), (v = !0));
      if (!v) return;
      if (A) ce = !0;
      if (pendingRequeues.size === 0)
        if (ce) logFeatureSad("bridge_shutdown_requeue", "requeue_dropped");
        else logFeatureOk("bridge_shutdown_requeue");
    },
    le = !1,
    sessionStartTimes = new Map(),
    L = (n) => {
      let A = sessionIdBody(n);
      for (let _ of sessionStartTimes.keys()) if (sessionIdBody(_) === A) return !0;
      return !1;
    },
    sessionWorkIds = new Set(),
    sessionCompatIds = new Set(),
    parkedProjectThreadIds = new Set(config.parkedProjectThreadSessionIds),
    sessionIngressTokens = new Set(),
    Ce = new BoundedUUIDSet(64);
  for (let n of [
    ...(config.parkedProjectThreadSessionIds ?? []),
    ...(config.boundedResumeSessionIds ?? []),
    ...(config.initialSessionRequeues ?? []),
    ...(config.carriedSessionIds ?? []),
  ])
    Ce.add(sessionIdBody(n));
  let sessionTimers = new Set(),
    Ie = parkedProjectThreadIds.size > 0,
    st = new Set((config.boundedResumeSessionIds ?? []).map(sessionIdBody));
  function mt(n, A) {
    let size = sessionWorkIds.size;
    if (A) sessionWorkIds.add(n);
    else sessionWorkIds.delete(n);
    if (sessionWorkIds.size !== size) config.onBusyChange?.(sessionWorkIds.size);
  }
  let completedWorkIds = new Map(),
    sessionWorktrees = new Map(),
    timedOutSessions = new Map(),
    titledSessions = new Map(),
    completedWorkIds_2 = new Set(),
    pt = new BoundedUUIDSet(64),
    sessionHeartbeatState = new Map(),
    qe = new Set(),
    Se = new Set(),
    ke = new Set(),
    sessionTitleCandidates = new Map(),
    Ge,
    Qe = initialSessionId ? toCompatSessionId(initialSessionId) : void 0;
  if (Qe && initialSessionTitle) sessionTitleCandidates.set(Qe, new Set([initialSessionTitle]));
  let Ae = 0,
    lt = new Map(),
    capacityWake = createCapacityWake(loopSignal),
    Bt = createCapacityWake(loopSignal),
    watchScheduler = createWorkPoller({
      clock: Aa,
      random: () => Math.random(),
      environmentId: environmentId,
      isRunningHere: (n) => L(n) || sessionIdBody(n) === Xt,
      servesToolHosts: () =>
        config.toolHostHandler !== void 0 && config.getToolHostAdvert?.().kind !== "withdraw",
      hasRoom: () => sessionStartTimes.size < config.maxSessions,
      intervals: () => {
        let n = getPollIntervalConfig();
        return {
          baseMs:
            sessionStartTimes.size > 0
              ? n.multisession_poll_interval_ms_partial_capacity
              : n.multisession_poll_interval_ms_not_at_capacity,
          connectedMs: n.watch_connected_poll_interval_ms,
          fallbackMs: n.watch_fallback_poll_interval_ms,
          afterSessionEndWindowMs: n.watch_session_end_window_ms,
        };
      },
      wake: Bt.wake,
    }),
    sessionsWatcher =
      api.sessionsWatch &&
      getAccessToken &&
      createBridgeWatcher({
        api: api.sessionsWatch,
        getAccessToken: getAccessToken,
        clock: Aa,
        random: () => Math.random(),
        onFrame: watchScheduler.onFrame,
        onDroppedFrame: watchScheduler.onDroppedFrame,
        onStateChange: watchScheduler.onWatchState,
      });
  loopSignal.addEventListener("abort", () => sessionsWatcher?.stop(), { once: !0 });
  let trackedApi = {
    ...api,
    async reconnectSession(...n) {
      try {
        await api.reconnectSession(...n);
      } finally {
        watchScheduler.expectWork();
      }
    },
  };
  function Gt(n) {
    return watchScheduler.governs() ? Math.max(n, watchScheduler.msUntilDue()) : n;
  }
  function vt(n) {
    if (!n) return "empty";
    let A = n.data?.id;
    if (typeof n.id !== "string" || typeof A !== "string") return "refused";
    if (n.data.type !== "session") return "other_work";
    if (L(A)) return "redelivery";
    Xt = sessionIdBody(A);
    let _ = recentWorkIds.has(n.id);
    (recentWorkIds.delete(n.id), recentWorkIds.set(n.id, Aa.monotonicNow()));
    for (let v of recentWorkIds.keys()) {
      if (recentWorkIds.size <= 256) break;
      recentWorkIds.delete(v);
    }
    return _ ? "redelivery" : "new_work";
  }
  async function Ct(n = 0, A) {
    let _ = !1,
      v = !1,
      y = !1,
      R = [];
    for (let [r, F] of sessionStartTimes) {
      let workId = sessionWorktrees.get(r),
        accessToken = F.accessToken;
      if (!workId || !accessToken) continue;
      if (n > 0 && !Wt(r, n)) continue;
      if (A !== void 0 && !A.has(r)) continue;
      let Pe = Ht(Aa);
      try {
        (await trackedApi.heartbeatWork(environmentId, workId, accessToken),
          (_ = !0),
          heartbeatTokens.set(r, Pe));
      } catch (err) {
        if (
          (logForDebugging(
            `[bridge:heartbeat] Failed for sessionId=${r} workId=${workId}: ${errorMessage(err)}`,
          ),
          err instanceof BridgeFatalError)
        )
          if (
            (logEvent("tengu_bridge_heartbeat_error", {
              status: err.status,
              error_type: lit(err.status === 401 || err.status === 403 ? "auth_failed" : "fatal"),
            }),
            err.status === 401 || err.status === 403)
          )
            R.push(r);
          else y = !0;
        else v = !0;
      }
    }
    for (let sessionId of R) {
      let F = cn.get(sessionId) ?? -1 / 0;
      if (watchScheduler.governs() && Aa.monotonicNow() - F < REGISTER_RETRY_DEFAULT_MS) continue;
      (cn.set(sessionId, Aa.monotonicNow()),
        logger.logVerbose(`Session ${sessionId} token expired \u2014 re-queuing via bridge/reconnect`));
      try {
        (await trackedApi.reconnectSession(environmentId, sessionId),
          logForDebugging(`[bridge:heartbeat] Re-queued sessionId=${sessionId} via bridge/reconnect`));
      } catch (err) {
        if (isEnvironmentGoneError(err)) {
          logForDebugging(
            `[bridge:heartbeat] reconnectSession(${sessionId}) skipped \u2014 resource gone: ${errorMessage(err)}`,
          );
          continue;
        }
        (logger.logError(`Failed to refresh session ${sessionId} token: ${errorMessage(err)}`),
          logForDebugging(`[bridge:heartbeat] reconnectSession(${sessionId}) failed: ${errorMessage(err)}`, {
            level: "error",
          }));
      }
    }
    if (y) return "fatal";
    if (R.length > 0) return "auth_failed";
    if (_) watchScheduler.noteHeartbeatOk();
    if (!_ || (v && watchScheduler.governs())) return "failed";
    return "ok";
  }
  async function Vt(n = 0, A) {
    if (((Ft = Aa.monotonicNow()), A === void 0)) Ve = Ft;
    let _ = await Ct(n, A);
    return ((jt = _ !== "ok"), _);
  }
  function Wt(n, A) {
    return Date.now() - (heartbeatTokens.get(n)?.wall ?? 0) >= A;
  }
  function dn() {
    return getPollIntervalConfig().non_exclusive_heartbeat_interval_ms > 0 || oe > 0;
  }
  async function Nt() {
    if ((await Vt()) === "ok") oe = Date.now();
  }
  async function zt() {
    for (let [n, A] of pendingRequeues) {
      if (loopSignal.aborted) return;
      if (L(n)) {
        settleRequeue(n, !1);
        continue;
      }
      let _ = await describeReregisterOutcome(trackedApi, environmentId, n, loopSignal);
      if (_ === "aborted") return;
      if (_ === "done") settleRequeue(n, !1);
      else if (A + 1 >= RENEW_FAILURE_LIMIT)
        (logForDebugging(
          `[bridge:poll] Giving up startup re-queue of sessionId=${n} after ${RENEW_FAILURE_LIMIT} attempts`,
          { level: "warn" },
        ),
          settleRequeue(n, !0));
      else pendingRequeues.set(n, A + 1);
    }
    for (let [n, A] of activeSessions) {
      if (loopSignal.aborted) return;
      if (!sessionStartTimes.has(n)) {
        activeSessions.delete(n);
        continue;
      }
      let _ = await describeReregisterOutcome(trackedApi, environmentId, n, loopSignal);
      if (_ === "aborted") return;
      if (_ === "done") activeSessions.delete(n);
      else if (A + 1 >= RENEW_FAILURE_LIMIT)
        (activeSessions.delete(n),
          logForDebugging(
            `[bridge:poll] Giving up re-queuing sessionId=${n} after ${RENEW_FAILURE_LIMIT} attempts; left to token refresh`,
            { level: "warn" },
          ),
          logEvent("tengu_bridge_env_reregister", {
            requeue_attempts: A + 1,
            outcome: lit("requeue_dropped"),
            trigger: Be,
          }),
          logFeatureSad("bridge_env_reregister", "requeue_dropped"));
      else activeSessions.set(n, A + 1);
    }
  }
  let Qt = getAccessToken
      ? createTokenRefreshScheduler({
          getAccessToken: getAccessToken,
          onRefresh: (sessionId, oauthToken) => {
            if (!sessionStartTimes.get(sessionId)) return;
            (logger.logVerbose(`Refreshing session ${sessionId} token via bridge/reconnect`),
              trackedApi.reconnectSession(environmentId, sessionId).catch((err) => {
                (logger.logError(`Failed to refresh session ${sessionId} token: ${errorMessage(err)}`),
                  logForDebugging(
                    `[bridge:token] reconnectSession(${sessionId}) failed: ${errorMessage(err)}`,
                    { level: "error" },
                  ));
              }));
          },
          label: "bridge",
        })
      : null,
    loopStartTime = Date.now(),
    pendingCleanups_2 = new Set(),
    Dt = 0;
  async function trackCleanup(n) {
    let {
        non_exclusive_heartbeat_interval_ms: non_exclusive_heartbeat_interval_ms,
        multisession_poll_interval_ms_at_capacity: _,
      } = n,
      signal = capacityWake.signal();
    if (non_exclusive_heartbeat_interval_ms > 0) {
      if (Date.now() >= Dt) (await Ct(), (Dt = Date.now() + non_exclusive_heartbeat_interval_ms));
      let y = _ > 0 ? Math.min(Dt, Date.now() + _) : Dt;
      await sleep(Math.max(0, y - Date.now()), signal.signal);
    } else if (_ > 0) await sleep(_, signal.signal);
    signal.cleanup();
  }
  function trackBackgroundOp(n) {
    (pendingCleanups_2.add(n), n.finally(() => pendingCleanups_2.delete(n)));
  }
  let connBackoffMs = 0,
    generalBackoffMs = 0,
    connErrorStart = null,
    generalErrorStart = null,
    lastPollErrorTime = null,
    heartbeatTokens = new Map(),
    oe = 0,
    jt = !1,
    Ft = -1 / 0,
    Ve = -1 / 0,
    cn = new Map(),
    recentWorkIds = new Map(),
    Xt,
    statusUpdateTimer = null,
    Je = !1,
    gaveUp = !1,
    un;
  if (
    (logForDebugging(
      `[bridge:work] Starting poll loop spawnMode=${config.spawnMode} maxSessions=${config.maxSessions} environmentId=${environmentId}`,
    ),
    logForDiagnosticsNoPII("info", "bridge_loop_started", {
      max_sessions: config.maxSessions,
      spawn_mode: config.spawnMode,
    }),
    logger.printBanner(config, environmentId),
    logger.updateSessionCount(0, config.maxSessions, config.spawnMode),
    initialSessionId)
  )
    logger.setAttached(initialSessionId);
  function updateStatusDisplay() {
    logger.updateSessionCount(sessionStartTimes.size, config.maxSessions, config.spawnMode);
    for (let [r, F] of sessionStartTimes) {
      let act = F.currentActivity;
      if (act) logger.updateSessionActivity(timedOutSessions.get(r) ?? r, act);
    }
    if (sessionStartTimes.size === 0) {
      if (!Je) ((Je = !0), logger.updateIdleStatus());
      return;
    }
    Je = !1;
    let [n, A] = [...sessionStartTimes.entries()].pop(),
      startTime = completedWorkIds.get(n);
    if (!startTime) return;
    let activity = A.currentActivity;
    if (!activity || activity.type === "result" || activity.type === "error") {
      if (config.maxSessions > 1) logger.refreshDisplay();
      return;
    }
    let elapsed = formatDuration(Date.now() - startTime),
      trail = A.activities
        .filter((activity) => activity.type === "tool_start")
        .slice(-5)
        .map((r) => r.summary);
    logger.updateSessionStatus(n, elapsed, activity, trail);
  }
  function startStatusUpdates() {
    (stopStatusUpdates(),
      updateStatusDisplay(),
      (statusUpdateTimer = setInterval(updateStatusDisplay, WORKER_RETRY_BASE_MS)));
  }
  function stopStatusUpdates() {
    if (statusUpdateTimer) (clearInterval(statusUpdateTimer), (statusUpdateTimer = null));
  }
  function onSessionDone(sessionId, startTime, handle) {
    return (rawStatus) => {
      let workId = sessionWorktrees.get(sessionId),
        R = sessionCompatIds.has(sessionId);
      if (
        (sessionStartTimes.delete(sessionId), sessionCompatIds.delete(sessionId), R && rawStatus === "idle")
      )
        parkedProjectThreadIds.add(sessionId);
      (mt(sessionId, !1),
        completedWorkIds.delete(sessionId),
        sessionWorktrees.delete(sessionId),
        titledSessions.get(sessionId)?.stop(),
        titledSessions.delete(sessionId));
      let r = timedOutSessions.get(sessionId) ?? sessionId;
      if (
        (timedOutSessions.delete(sessionId),
        logger.removeSession(r),
        ke.delete(r),
        Ge?.forget(r),
        r === Qe && initialSessionTitle)
      )
        sessionTitleCandidates.set(r, new Set([initialSessionTitle]));
      else sessionTitleCandidates.delete(r);
      (lt.delete(sessionId), Qt?.cancel(sessionId), capacityWake.wake(), cn.delete(sessionId));
      let timer = recentWorkIds.get(workId ?? "");
      if (timer === void 0 || Aa.monotonicNow() - timer >= REGISTER_RETRY_MAX_MS)
        (recentWorkIds.delete(workId ?? ""),
          watchScheduler.noteSessionEnd(sessionStartTimes.size + 1 >= config.maxSessions));
      let D = Date.now() - startTime;
      (logForDebugging(
        `[bridge:session] sessionId=${sessionId} workId=${workId ?? "unknown"} exited status=${rawStatus} duration=${formatDuration(D)}`,
      ),
        logEvent("tengu_bridge_session_done", {
          status: fromEnum(rawStatus),
          duration_ms: D,
          project_thread: R,
        }),
        logForDiagnosticsNoPII("info", "bridge_session_done", { status: rawStatus, duration_ms: D }),
        logger.clearStatus(),
        stopStatusUpdates());
      let ae =
          handle.lastStderr.length > 0
            ? handle.lastStderr.join(`
`)
            : void 0,
        Pe;
      switch (rawStatus) {
        case "completed":
          logger.logSessionComplete(sessionId, D);
          break;
        case "failed":
          if (!loopSignal.aborted)
            if (
              ((Pe = ae ?? "Process exited with error"),
              logger.logSessionFailed(sessionId, Pe),
              !ae || Pe.includes("transport closed"))
            )
              logForDebugging(`Bridge session failed: ${Pe}`, { level: "error" });
            else
              logError(withTelemetryMessage(Error(`Bridge session failed: ${Pe}`), "Bridge session failed"));
          break;
        case "interrupted":
          logger.logVerbose(`Session ${sessionId} interrupted`);
          break;
        case "idle":
          logger.logVerbose(`Session ${sessionId} parked idle; the server re-queues it on the next message`);
          break;
      }
      if (rawStatus !== "interrupted" && workId)
        (completedWorkIds_2.add(workId),
          trackBackgroundOp(
            stopWorkWithRetry(
              trackedApi,
              environmentId,
              workId,
              currentEnvironmentSecret,
              logger,
              backoff.stopWorkBaseDelayMs,
            ),
          ));
      let De = rawStatus === "failed" && !loopSignal.aborted && !gaveUp;
      if (De) (qe.add(sessionId), (le = !0));
      let wt = sessionHeartbeatState.get(sessionId);
      if (wt)
        if ((sessionHeartbeatState.delete(sessionId), rawStatus === "idle"))
          logger.logStatus(`kept worktree ${wt.worktreePath} \xB7 session idle`);
        else if (De) {
          if (
            (logger.logStatus(`kept worktree ${wt.worktreePath} \xB7 session crashed`),
            Pe?.includes("transport closed"))
          )
            Se.add(wt.worktreePath);
        } else
          trackBackgroundOp(
            cleanupSessionWorktree(wt, logger, {
              storageV5: config.storageV5,
              readDeadlineMs: loopSignal.aborted ? POLL_RETRY_FLOOR_MS : void 0,
            }),
          );
      if (rawStatus !== "interrupted" && !loopSignal.aborted)
        if (config.spawnMode !== "single-session") {
          if (rawStatus === "completed")
            trackBackgroundOp(
              trackedApi
                .archiveSession(r)
                .catch((err) =>
                  logger.logVerbose(`Failed to archive session ${sessionId}: ${errorMessage(err)}`),
                ),
            );
          logForDebugging(`[bridge:session] Session ${rawStatus}, returning to idle (multi-session mode)`);
        } else {
          (logForDebugging(
            `[bridge:session] Session ${rawStatus}, aborting poll loop to tear down environment`,
          ),
            controller.abort());
          return;
        }
      if (!loopSignal.aborted && !gaveUp) startStatusUpdates();
    };
  }
  if (!initialSessionId) startStatusUpdates();
  function Sn() {
    let size = qe.size;
    if (
      (logger.logStatus(
        size > 0
          ? `${size} ${plural(size, "session")} ended while this machine was offline \u2014 the environment was cleaned up on the server and can't be resumed.`
          : "This environment was cleaned up while the machine was offline and can't be resumed.",
      ),
      Se.size > 0)
    )
      logger.logStatus(`Your work is safe \u2014 worktrees kept: ${[...Se].join(", ")}`);
    logger.logStatus("Run `claude remote-control` to start a fresh environment.");
  }
  function pn(err) {
    if (
      err.status === 404 &&
      !isExpiredErrorType(err.errorType) &&
      !(le && sessionStartTimes.size === 0) &&
      isBridgeEnvReregisterEnabled()
    )
      return "poll_404";
    if (err.status === 401 && isBridgeEnvReregisterEnabled() && isBridgeEnvReregisterOn401Enabled())
      return "poll_401";
    return;
  }
  let { startBackgroundPolling: startBackgroundPolling } = await import("./chunk-qchbrsbw.js");
  startBackgroundPolling();
  let It = () => {
      if (loopSignal.aborted || gaveUp) return;
      let n = connectedBridgePolicyRefusal(!1);
      if (n === null) return;
      ((un = n), (gaveUp = !0), controller.abort());
      try {
        (logger.logStatus(n.detail),
          logForDebugging(
            `[bridge:policy] Org policy now refuses Remote Control (${n.policy}: ${n.kind}); shutting down`,
          ),
          logEvent("tengu_bridge_policy_teardown", {
            lane: lit("standalone"),
            policy: fromEnum(n.policy),
            deny_kind: fromEnum(n.kind),
            outbound_only: !1,
          }));
      } catch (error) {
        (logForDebugging(`[bridge:policy] Policy shutdown notice failed: ${errorMessage(error)}`, {
          level: "error",
        }),
          logError(error));
      }
    },
    vn = isLovelyUmbrellaOn()
      ? () => {}
      : onPolicyVerdictChanged(() => {
          queueMicrotask(It);
        });
  if (!isLovelyUmbrellaOn()) It();
  function nn() {
    return (
      !re &&
      secretRenewAt !== void 0 &&
      Date.now() >= secretRenewAt &&
      isBridgeEnvReregisterEnabled() &&
      isBridgeEnvSecretProactiveRenewalEnabled()
    );
  }
  async function kn() {
    if ((N++, X)) ((X = !1), pollOptions?.forgetTokenReads());
    logger.logVerbose("Renewing this computer's Remote Control credential before it expires");
    let n = await reregisterEnvironment({
      api: trackedApi,
      config: config,
      environmentId: environmentId,
      activeSessions: sessionStartTimes,
      attempt: N,
      trigger: "proactive",
      signal: loopSignal,
    });
    if (n.outcome === "reregistered") {
      ((currentEnvironmentSecret = n.environmentSecret),
        (secretRenewAt = computeSecretRenewAt(n.environmentSecretExpiresIn)),
        (secretExpiresAt = expiresInToDeadline(n.environmentSecretExpiresIn)),
        (Be = lit("proactive")),
        (Ee = !0),
        (He = N),
        logger.logVerbose("Remote Control credential renewed."));
      return;
    }
    if (loopSignal.aborted) return;
    let A =
        n.outcome === "fatal" && n.reason === "register_rejected" && n.message === BRIDGE_LOGIN_INSTRUCTION,
      _ =
        n.outcome === "fatal" &&
        n.reason === "register_rejected" &&
        n.status === 401 &&
        (A || pollOptions?.classifyFailedOAuthRefresh() === "unreachable");
    if (n.outcome === "transient" || ((n.reason === "replaced" || _) && N < RENEW_RETRY_LIMIT)) {
      let max = Math.max(
        RENEW_RETRY_MIN_MS,
        Math.min(n.outcome === "transient" ? (n.retryAfterMs ?? 0) : 0, RENEW_RETRY_MAX_MS),
      );
      ((secretRenewAt = Date.now() + max * (1 + 0.25 * Math.random())),
        (X = A),
        logger.logVerbose(
          `Could not renew the Remote Control credential yet. The current one still works; trying again in about ${Math.ceil((secretRenewAt - Date.now()) / 60000)} minutes.`,
        ));
      return;
    }
    if (((secretRenewAt = void 0), !(n.reason === "register_rejected" && n.status === 401 && (A || !_))))
      logger.logVerbose(
        "Could not renew the Remote Control credential. It keeps working until it expires, and Remote Control will try again then.",
      );
    else {
      let R = A || !pollOptions ? void 0 : await pollOptions.tokenOrigin(),
        r = "claude.ai did not accept the sign-in it uses",
        F = "Run `claude /login` to sign in again.";
      if (A) ((r = "it could not read a saved sign-in"), (F = "If you are signed out, run `claude /login`."));
      else if (R === void 0) F = "If you are signed out, run `claude /login`.";
      else if (R === "env" || R === "fd") F = "Start Remote Control again with a valid sign-in token.";
      else if (R === "none") r = "its saved sign-in was refused or could not be read";
      let D;
      if (secretExpiresAt !== void 0 && secretExpiresAt <= Date.now())
        D = "The connection's credential has already expired, so it stops unless the next try can sign in.";
      else {
        let ae = secretExpiresAt === void 0 ? void 0 : Math.round((secretExpiresAt - Date.now()) / 60000),
          Pe;
        if (ae === void 0) Pe = "until its credential expires";
        else if (ae < 5) Pe = "for a few more minutes";
        else if (ae < 90) Pe = `for about ${ae} minutes`;
        else Pe = `for about ${Math.round(ae / 60)} hours`;
        D = `The connection keeps working ${Pe}; if it still cannot sign in then, it stops.`;
      }
      logger.logWarning(`Remote Control could not renew this computer's connection: ${r}. ${F} ${D}`);
    }
    let y;
    if (n.reason === "replaced") y = "server kept returning a different environment id";
    else if (_) y = "register got a 401 that did not prove the login dead";
    else y = `register refused with ${n.status}`;
    logForDebugging(
      `[bridge:poll] Giving up the planned renewal of the environment secret (${y}); the current secret works until it expires, then the poll-401 lane handles it`,
      { level: "warn" },
    );
  }
  let xt = !1;
  while (!loopSignal.aborted) {
    ((Xt = void 0), startBackgroundPolling());
    let pollConfig = getPollIntervalConfig();
    try {
      if (
        pollConfig.watch_sessions &&
        isBridgeFirstParty() &&
        !isEssentialTrafficOnly() &&
        connectedBridgePolicyRefusal(!1) === null
      )
        sessionsWatcher?.start();
      else sessionsWatcher?.stop();
      xt = !1;
    } catch (error) {
      if ((sessionsWatcher?.stop(), !xt)) ((xt = !0), logError(error));
    }
    if (nn()) {
      await kn();
      continue;
    }
    try {
      let A = watchScheduler.governs() && sessionStartTimes.size < config.maxSessions,
        _ = A
          ? watchScheduler.longestGapMs()
          : sessionStartTimes.size >= config.maxSessions
            ? pollConfig.multisession_poll_interval_ms_at_capacity
            : sessionStartTimes.size > 0
              ? pollConfig.multisession_poll_interval_ms_partial_capacity
              : pollConfig.multisession_poll_interval_ms_not_at_capacity,
        v = A ? watchScheduler.pollCause() : void 0,
        y = !A || v !== void 0,
        R = null;
      if (y) {
        jt = !1;
        let I = (Ne) => {
          if (v !== void 0 && !loopSignal.aborted) watchScheduler.polled(v, Ne);
        };
        try {
          R = await trackedApi.pollForWork(
            environmentId,
            currentEnvironmentSecret,
            loopSignal,
            pollConfig.reclaim_older_than_ms,
            _,
          );
        } catch (error) {
          throw (I(classifyConnectFailure(error)), error);
        }
        I(vt(R));
      }
      let r = R;
      if (y) {
        if (connErrorStart !== null || generalErrorStart !== null) {
          let Ne = Date.now() - (connErrorStart ?? generalErrorStart ?? Date.now());
          (logger.logReconnected(Ne),
            logForDebugging(`[bridge:poll] Reconnected after ${formatDuration(Ne)}`),
            logEvent("tengu_bridge_reconnected", { disconnected_ms: Ne }),
            (Je = !1));
        }
        if (
          ((connBackoffMs = 0),
          (generalBackoffMs = 0),
          (connErrorStart = null),
          (generalErrorStart = null),
          (lastPollErrorTime = null),
          (le = !1),
          Ee)
        )
          ((Ee = !1),
            logEvent("tengu_bridge_env_reregister", { attempt: He, outcome: lit("recovered"), trigger: Be }),
            logFeatureOk("bridge_env_reregister"),
            (N = 0));
        ((reregisterAttempts = 0), (Ke = !1), (re = !1));
      }
      if (!r) {
        for (let xe of heartbeatTokens.keys()) if (!sessionStartTimes.has(xe)) heartbeatTokens.delete(xe);
        if (y && (activeSessions.size > 0 || pendingRequeues.size > 0)) await zt();
        let I = await describeAdvertChange({
          api: trackedApi,
          config: config,
          environmentId: environmentId,
          activeSessions: sessionStartTimes,
          pacing: B,
          signal: loopSignal,
        });
        if (I) ((Be = lit("tool_host_advert_changed")), E(I), watchScheduler.expectWork());
        if (sessionStartTimes.size >= config.maxSessions) {
          let atCapMs = pollConfig.multisession_poll_interval_ms_at_capacity;
          if (pollConfig.non_exclusive_heartbeat_interval_ms > 0) {
            logEvent("tengu_bridge_heartbeat_mode_entered", {
              active_sessions: sessionStartTimes.size,
              heartbeat_interval_ms: pollConfig.non_exclusive_heartbeat_interval_ms,
            });
            let ue = atCapMs > 0 ? Date.now() + atCapMs : null,
              hbResult = "ok",
              kt = 0;
            while (
              !loopSignal.aborted &&
              sessionStartTimes.size >= config.maxSessions &&
              (ue === null || Date.now() < ue) &&
              !nn()
            ) {
              let hbConfig = getPollIntervalConfig();
              if (hbConfig.non_exclusive_heartbeat_interval_ms <= 0) break;
              let cap = capacityWake.signal();
              if (Date.now() >= Dt) {
                if (((hbResult = await Ct()), hbResult === "auth_failed" || hbResult === "fatal")) {
                  cap.cleanup();
                  break;
                }
                ((Dt = Date.now() + hbConfig.non_exclusive_heartbeat_interval_ms), kt++);
              }
              let min = Math.min(
                Dt,
                ue ?? 1 / 0,
                secretRenewAt !== void 0 && secretRenewAt > Date.now() ? secretRenewAt : 1 / 0,
              );
              (await sleep(Math.max(0, min - Date.now()), cap.signal), cap.cleanup());
            }
            let yt =
              hbResult === "auth_failed" || hbResult === "fatal"
                ? hbResult
                : loopSignal.aborted
                  ? "shutdown"
                  : sessionStartTimes.size < config.maxSessions
                    ? "capacity_changed"
                    : ue !== null && Date.now() >= ue
                      ? "poll_due"
                      : nn()
                        ? "secret_renewal_due"
                        : "config_disabled";
            if (
              (logEvent("tengu_bridge_heartbeat_mode_exited", {
                reason: fromEnum(yt),
                heartbeat_cycles: kt,
                active_sessions: sessionStartTimes.size,
              }),
              yt === "poll_due")
            )
              logForDebugging(
                `[bridge:poll] Heartbeat poll_due after ${kt} cycles \u2014 falling through to pollForWork`,
              );
            if (hbResult === "auth_failed" || hbResult === "fatal") {
              let cap = capacityWake.signal();
              (await sleep(
                atCapMs > 0 ? atCapMs : pollConfig.non_exclusive_heartbeat_interval_ms,
                cap.signal,
              ),
                cap.cleanup());
            }
          } else if (atCapMs > 0) {
            let cap = capacityWake.signal();
            (await sleep(atCapMs, cap.signal), cap.cleanup());
          }
        } else {
          let non_exclusive_heartbeat_interval_ms = pollConfig.non_exclusive_heartbeat_interval_ms,
            ue =
              non_exclusive_heartbeat_interval_ms > 0
                ? non_exclusive_heartbeat_interval_ms
                : oe > 0
                  ? 60000
                  : 0,
            Ze = oe > 0,
            kt = Ht(Aa),
            filtered = [...sessionStartTimes.keys()].filter((at) =>
              Ze ? Wt(at, ue) : Date.now() - oe >= ue,
            ),
            Et =
              jt && kt.monotonic - Ve < REGISTER_RETRY_MIN_MS
                ? filtered.filter((at) => isSleepGap(heartbeatTokens.get(at), kt))
                : filtered;
          if (ue > 0 && Et.length > 0 && (!jt || kt.monotonic - Ft >= SLEEP_GAP_WINDOW.retry)) {
            let at = Ze && Et.length < filtered.length ? new Set(Et) : void 0,
              sn = await Vt(Ze ? ue : 0, at);
            if (
              at !== void 0 &&
              sn === "ok" &&
              [...sessionStartTimes.keys()].some((En) => !at.has(En) && Wt(En, ue))
            )
              await Vt(ue);
            if (sn === "ok" && !Ze) oe = Date.now();
          }
          let Lt =
            sessionStartTimes.size > 0
              ? pollConfig.multisession_poll_interval_ms_partial_capacity
              : pollConfig.multisession_poll_interval_ms_not_at_capacity;
          if (watchScheduler.governs()) {
            let cap = Bt.signal();
            (await sleep(Math.min(Lt, watchScheduler.msUntilDue()), cap.signal), cap.cleanup());
          } else await sleep(Lt, loopSignal);
        }
        continue;
      }
      let F = sessionStartTimes.size >= config.maxSessions,
        D = async () => {
          if (F) await trackCleanup(pollConfig);
        };
      if (r.data?.mode != null) {
        if (config.toolHostHandler !== void 0 && r.data.mode === "tool_use") {
          try {
            await config.toolHostHandler.handle(r, {
              environmentId: environmentId,
              environmentSecret: currentEnvironmentSecret,
              signal: loopSignal,
            });
          } catch (error) {
            logError(
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `tool-host handler threw (${sanitizeErrorName(error) ?? typeof error})`,
                "tool-host handler threw",
              ),
            );
          }
          if (!F) await sleep(1000, loopSignal);
        } else if (!pt.has(r.id)) {
          pt.add(r.id);
          let I = hashIdForLog(r.id);
          (logForDebugging(
            `[bridge:work] Stopping work item with an unsupported mode workId=${I} sessionId=${hashIdForLog(r.data.id)}`,
          ),
            logEvent("tengu_bridge_work_mode_unsupported", {}),
            trackBackgroundOp(
              stopWorkWithRetry(
                trackedApi,
                environmentId,
                r.id,
                currentEnvironmentSecret,
                logger,
                backoff.stopWorkBaseDelayMs,
                I,
              ),
            ));
        } else if (!F) await sleep(1000, loopSignal);
        await D();
        continue;
      }
      if (completedWorkIds_2.has(r.id) && r.state === WORK_STATE_QUEUED && !sessionTimers.has(r.id))
        (completedWorkIds_2.delete(r.id),
          logForDebugging(
            `[bridge:work] Previously completed workId=${r.id} was re-queued by the server, handling as new work`,
          ));
      if (completedWorkIds_2.has(r.id)) {
        if ((logForDebugging(`[bridge:work] Skipping already-completed workId=${r.id} state=${r.state}`), F))
          await trackCleanup(pollConfig);
        else await sleep(1000, loopSignal);
        continue;
      }
      let ae;
      try {
        ae = decodeWorkSecret(r.secret);
      } catch (err) {
        let errMsg = errorMessage(err);
        if (
          (logger.logError(`Failed to decode work secret for workId=${r.id}: ${errMsg}`),
          logEvent("tengu_bridge_work_secret_failed", {}),
          r.data.type === "session")
        )
          logFeatureBad("bridge_work_pickup", "secret_decode_failed");
        (completedWorkIds_2.add(r.id),
          trackBackgroundOp(
            stopWorkWithRetry(
              trackedApi,
              environmentId,
              r.id,
              currentEnvironmentSecret,
              logger,
              backoff.stopWorkBaseDelayMs,
            ),
          ),
          await D());
        continue;
      }
      let ackWork = async () => {
          logForDebugging(`[bridge:work] Acknowledging workId=${r.id}`);
          try {
            await trackedApi.acknowledgeWork(environmentId, r.id, ae.session_ingress_token);
          } catch (err) {
            logForDebugging(`[bridge:work] Acknowledge failed workId=${r.id}: ${errorMessage(err)}`);
          }
        },
        De = (I) => {
          if (pollConfig.non_exclusive_heartbeat_interval_ms <= 0 && oe === 0) return;
          let Ne = Ht(Aa);
          (heartbeatTokens.set(I, Ne),
            (oe = Date.now()),
            trackBackgroundOp(
              trackedApi
                .heartbeatWork(environmentId, r.id, ae.session_ingress_token)
                .then(() => logFeatureOk("bridge_work_heartbeat"))
                .catch((xe) => {
                  if (
                    (logFeatureSad("bridge_work_heartbeat", "initial_failed"),
                    logForDebugging(
                      `[bridge:work] Initial heartbeat failed workId=${r.id}: ${errorMessage(xe)}`,
                    ),
                    !(xe instanceof BridgeFatalError) && heartbeatTokens.get(I) === Ne)
                  )
                    heartbeatTokens.delete(I);
                }),
            ));
        },
        workType = r.data.type;
      switch (r.data.type) {
        case "healthcheck":
          (await ackWork(),
            logForDebugging("[bridge:work] Healthcheck received"),
            logger.logVerbose("Healthcheck received"));
          break;
        case "session": {
          let sessionId = r.data.id;
          try {
            validateBridgeId(sessionId, "session_id");
          } catch {
            (await ackWork(),
              logger.logError(`Invalid session_id received: ${sessionId}`),
              logFeatureBad("bridge_work_pickup", "invalid_session_id"));
            break;
          }
          let existingHandle = sessionStartTimes.get(sessionId);
          if (existingHandle) {
            (activeSessions.delete(sessionId),
              settleRequeue(sessionId, !1),
              existingHandle.updateAccessToken(ae.session_ingress_token),
              titledSessions.get(sessionId)?.updateAccessToken(ae.session_ingress_token),
              sessionWorktrees.set(sessionId, r.id),
              Qt?.schedule(sessionId, ae.session_ingress_token),
              logForDebugging(
                `[bridge:work] Updated access token for existing sessionId=${sessionId} workId=${r.id}`,
              ),
              await ackWork(),
              De(sessionId));
            break;
          }
          if (sessionStartTimes.size >= config.maxSessions) {
            logForDebugging(
              `[bridge:work] At capacity (${sessionStartTimes.size}/${config.maxSessions}), cannot spawn new session for workId=${r.id}`,
            );
            let pe = !1;
            if (!sessionIngressTokens.has(r.id)) {
              let ge = toCompatSessionId(sessionId),
                dt = !Ce.has(sessionIdBody(sessionId)),
                nt = dt
                  ? await fetchBridgeSessionTags(ge, {
                      baseUrl: config.apiBaseUrl,
                      getAccessToken: getAccessToken,
                    })
                  : null;
              if (!dt || nt !== null) sessionIngressTokens.add(r.id);
              let ft = nt?.createdAtMs === void 0 ? void 0 : Date.now() - nt.createdAtMs;
              if (loopSignal.aborted);
              else if (sessionStartTimes.size < config.maxSessions) pe = !0;
              else if (
                nt !== null &&
                ft !== void 0 &&
                ft >= 0 &&
                ft < STATUS_UPDATE_INTERVAL_MS &&
                classifyBridgeSessionRoles(nt.tags).projectThreadChild
              )
                (logger.logError(
                  `Declined session ${ge}: already running ${sessionStartTimes.size} of ${config.maxSessions} sessions.`,
                ),
                  logFeatureBad("bridge_work_pickup", "at_capacity_declined"),
                  sessionTimers.add(r.id),
                  completedWorkIds_2.add(r.id),
                  trackBackgroundOp(
                    stopWorkWithRetry(
                      trackedApi,
                      environmentId,
                      r.id,
                      currentEnvironmentSecret,
                      logger,
                      backoff.stopWorkBaseDelayMs,
                    )
                      .then(() => Promise.all([import("./chunk-3eyvtwsv.js"), getAccessToken?.()]))
                      .then(([{ markBridgeSessionRefusedAtCapacity: wt }, Kt]) =>
                        wt(ge, config.machineName, {
                          baseUrl: config.apiBaseUrl,
                          ...(Kt && { getAccessToken: () => Kt }),
                        }),
                      )
                      .then((wt) => (wt === "landed" ? trackedApi.archiveSession(ge) : void 0))
                      .catch((wt) =>
                        logger.logVerbose(`Could not end declined session ${ge}: ${errorMessage(wt)}`),
                      )
                      .finally(() => sessionTimers.delete(r.id)),
                  ));
              else
                logFeatureSad("bridge_work_pickup", "at_capacity", {
                  active_sessions: sessionStartTimes.size,
                  max_sessions: config.maxSessions,
                });
            }
            if (!pe) break;
          }
          (await ackWork(), De(sessionId), sessionIngressTokens.delete(r.id));
          let spawnStartTime = Date.now(),
            ue = toCompatSessionId(sessionId),
            Ze;
          if (machineLaneVersionRefusal() !== null) {
            let pe = await fetchSessionRecordWithRetry(ue);
            if (pe === null && loopSignal.aborted) break;
            let ge = machineLaneVersionRefusal();
            if (ge?.reason === "floor_unanswered" && isMachineLaneWork(pe, ge)) {
              if (
                (logForDebugging(
                  `[bridge:work] Holding sessionId=${sessionId} workId=${r.id}: version floor not received, refreshing flags`,
                ),
                (ge = await machineLaneVersionRefusalAfterHold(ge, loopSignal, Oe)),
                loopSignal.aborted)
              ) {
                (completedWorkIds_2.add(r.id),
                  trackBackgroundOp(
                    stopWorkWithRetry(
                      trackedApi,
                      environmentId,
                      r.id,
                      currentEnvironmentSecret,
                      logger,
                      backoff.stopWorkBaseDelayMs,
                    ),
                  ));
                break;
              }
              if (
                (logForDebugging(
                  `[bridge:work] Held sessionId=${sessionId} workId=${r.id}: ${ge?.reason ?? "admitted"}`,
                ),
                ge === null)
              )
                logFeatureSad("bridge_machine_lane_floor", "held_then_admitted");
            }
            if (ge !== null && isMachineLaneWork(pe, ge)) {
              (logger.logError(
                pe === null
                  ? `Declined session ${ue}: its record could not be read. ${ge.message}`
                  : `Declined session ${ue}: ${ge.message}`,
              ),
                logFeatureBad(
                  "bridge_machine_lane_floor",
                  pe === null ? `session_unread_${ge.reason}` : ge.reason,
                ),
                logFeatureBad("bridge_work_pickup", "version_floor"),
                completedWorkIds_2.add(r.id),
                trackBackgroundOp(
                  stopWorkWithRetry(
                    trackedApi,
                    environmentId,
                    r.id,
                    currentEnvironmentSecret,
                    logger,
                    backoff.stopWorkBaseDelayMs,
                  ),
                ));
              break;
            }
            Ze = pe;
          }
          let kt = buildCCRv2SdkUrl(config.apiBaseUrl, sessionId),
            yt;
          for (let attempt = 1; attempt <= REGISTER_WORKER_MAX_ATTEMPTS; attempt++)
            try {
              ((yt = await registerWorker(kt, ae.session_ingress_token)),
                logForDebugging(
                  `[bridge:session] CCR v2: registered worker sessionId=${sessionId} epoch=${yt} attempt=${attempt}`,
                ),
                logFeatureOk("bridge_register_worker", { attempt: attempt }));
              break;
            } catch (err) {
              let errMsg = errorMessage(err),
                { kind: kind, status: status } = classifyAxiosError(err),
                wt = status === void 0 || status === 408 || status === 429 || status >= 500;
              if (attempt < REGISTER_WORKER_MAX_ATTEMPTS && wt && !loopSignal.aborted) {
                if (
                  (logForDebugging(
                    `[bridge:session] CCR v2: registerWorker attempt ${attempt} failed, retrying: ${errMsg}`,
                  ),
                  attempt === 1 && sessionStartTimes.size > 0 && dn())
                )
                  await Nt();
                if (
                  (await sleep(
                    backoffDelayMs({
                      attempt: attempt,
                      baseMs: 2000,
                      jitter: { kind: "proportional", ratio: 0.25 },
                    }),
                    loopSignal,
                  ),
                  !loopSignal.aborted)
                )
                  continue;
              }
              if (loopSignal.aborted) {
                (completedWorkIds_2.add(r.id),
                  trackBackgroundOp(
                    stopWorkWithRetry(
                      trackedApi,
                      environmentId,
                      r.id,
                      currentEnvironmentSecret,
                      logger,
                      backoff.stopWorkBaseDelayMs,
                    ),
                  ));
                break;
              }
              if (
                (logger.logError(`CCR v2 worker registration failed for session ${sessionId}: ${errMsg}`),
                logFeatureBad("bridge_register_worker", "request_failed"),
                logFeatureBad("bridge_work_pickup", "register_worker_failed"),
                kind !== "other" && ((status ?? 0) < 500 || status === 503))
              )
                logForDebugging(`registerWorker failed: ${errMsg}`, { level: "error" });
              else
                logError(
                  withTelemetryMessage(Error(`registerWorker failed: ${errMsg}`), "registerWorker failed"),
                );
              (completedWorkIds_2.add(r.id),
                trackBackgroundOp(
                  stopWorkWithRetry(
                    trackedApi,
                    environmentId,
                    r.id,
                    currentEnvironmentSecret,
                    logger,
                    backoff.stopWorkBaseDelayMs,
                  ),
                ));
              break;
            }
          if (yt === void 0) break;
          let spawnModeAtDecision = config.spawnMode,
            Et = isBridgeServerSessionConfigEnabled(),
            Lt = Et && ae.worktree === !0,
            at = spawnModeAtDecision === "worktree";
          if (Lt && !at) {
            if (((at = hasWorktreeCreateHook() || findGitRootRecheckingNegative(config.dir) !== null), !at))
              logger.logStatus(
                `session ${sessionId} asked for a worktree \xB7 ${config.dir} is not a git repository, running there`,
              );
          }
          let sessionDir = config.dir,
            En = !1,
            xn = 0;
          if (at && (initialSessionId === void 0 || !sameSessionId(sessionId, initialSessionId))) {
            let wtStart = Date.now();
            try {
              let ge = await createAgentWorktree(`bridge-${safeFilenameId(sessionId)}`, {
                storageV5: config.storageV5,
              });
              ((xn = Date.now() - wtStart),
                sessionHeartbeatState.set(sessionId, {
                  worktreePath: ge.worktreePath,
                  worktreeBranch: ge.worktreeBranch,
                  gitRoot: ge.gitRoot,
                  hookBased: ge.hookBased,
                  headCommit: ge.headCommit,
                  baseChangeset: ge.baseChangeset,
                  sessionDir: ge.sessionDir,
                }),
                (sessionDir = ge.worktreePath),
                (En = !ge.hookBased),
                logForDebugging(
                  `[bridge:session] Created worktree for sessionId=${sessionId} at ${ge.worktreePath}`,
                ));
            } catch (err) {
              let errMsg = errorMessage(err);
              (logger.logError(`Failed to create worktree for session ${sessionId}: ${errMsg}`),
                logForDebugging(`Worktree creation failed for session ${sessionId}: ${errMsg}`, {
                  level: "error",
                }),
                logFeatureBad("bridge_work_pickup", "worktree_create_failed"),
                completedWorkIds_2.add(r.id),
                trackBackgroundOp(
                  stopWorkWithRetry(
                    trackedApi,
                    environmentId,
                    r.id,
                    currentEnvironmentSecret,
                    logger,
                    backoff.stopWorkBaseDelayMs,
                  ),
                ));
              break;
            }
          }
          let Zn;
          logForDebugging(`[bridge:session] Spawning sessionId=${sessionId} sdkUrl=${kt}`);
          let On = ++Ae;
          lt.set(sessionId, On);
          let Tn = 0,
            Bn = !1,
            er = !1;
          if (((er = St()), config.spawnMode !== "single-session")) Tn = getBridgeRcChildIdleExitMs();
          Bn = Boolean(ae.auto_mode_environment?.length) && Et;
          let tr = hasBridgeChildFeatureEnabled("spawn") || Tn > 0 || er || Bn,
            Wn = tr ? (Ze !== void 0 ? Ze : await fetchSessionRecordWithRetry(ue)) : null;
          if (tr && Wn === null && loopSignal.aborted) {
            (completedWorkIds_2.add(r.id),
              trackBackgroundOp(
                stopWorkWithRetry(
                  trackedApi,
                  environmentId,
                  r.id,
                  currentEnvironmentSecret,
                  logger,
                  backoff.stopWorkBaseDelayMs,
                ),
              ));
            break;
          }
          let compatSessionId = classifyBridgeSessionRoles(Wn),
            { rcChild: rcChild, projectThreadChild: projectThreadChild } = compatSessionId,
            Cr = Tn > 0 && projectThreadChild ? Tn : 0,
            rr;
          if (Bn && !projectThreadChild) rr = Wn === null ? "session_tags_unread" : "session_untagged";
          let Nn = await applyBridgeServerConfig(ae, {
              sessionId: sessionId,
              apiBaseUrl: config.apiBaseUrl,
              enabled: Et,
              dropAutoModeEnvironment: rr,
            }),
            Dr = Nn === void 0 ? carriedModelArgs(ae.claude_code_args) : [],
            sr = st.has(sessionIdBody(sessionId)),
            spawnResult = safeSpawn(
              sessionSpawner,
              {
                sessionId: sessionId,
                sdkUrl: kt,
                accessToken: ae.session_ingress_token,
                workerEpoch: yt,
                serverConfig: Nn,
                modelArgs: Dr,
                roles: compatSessionId,
                boundResumedTurn: sr,
                idleExitAfterMs: Cr,
                ...(Zn !== void 0 && { sourceDir: Zn }),
                onActivity: (text) => {
                  switch (text.type) {
                    case "tool_start":
                    case "text":
                      mt(sessionId, !0);
                      break;
                    case "result":
                    case "error":
                      mt(sessionId, !1);
                      break;
                  }
                },
                onFirstUserMessage: (err) => {
                  if (ke.has(ue)) return;
                  ke.add(ue);
                  let ge = truncateToWidth(err.replace(/\s+/g, " ").trim(), TITLE_MAX_CHARS);
                  (logger.setSessionTitle(ue, ge),
                    logForDebugging(`[bridge:title] derived title for ${ue}: ${ge}`),
                    import("./chunk-3eyvtwsv.js")
                      .then(async ({ getBridgeSession: getBridgeSession }) => {
                        Ge ??= createTitleWriteCoalescer({
                          isOwnTitle: (wt, Kt) => sessionTitleCandidates.get(wt)?.has(Kt) ?? !1,
                          onRemoteTitleAdopted: (wt, Kt) => logger.setSessionTitle(wt, Kt),
                        });
                        let nt = await getBridgeSession(ue, { baseUrl: config.apiBaseUrl });
                        if (nt === null || lt.get(sessionId) !== On) return;
                        let wt = sessionTitleCandidates.get(ue);
                        if (nt.title && !wt?.has(nt.title) && !Ge.hasSent(ue, nt.title)) {
                          (logger.setSessionTitle(ue, nt.title),
                            Ge.noteRemoteTitle(ue, nt.title),
                            logForDebugging(`[bridge:title] remote rename for ${ue}: ${nt.title}`));
                          return;
                        }
                        (sessionTitleCandidates.set(ue, (wt ?? new Set()).add(ge)),
                          await Ge.update(ue, ge, { baseUrl: config.apiBaseUrl }));
                      })
                      .catch((err) =>
                        logForDebugging(`[bridge:title] failed to update title for ${ue}: ${err}`, {
                          level: "error",
                        }),
                      ));
                },
              },
              sessionDir,
            );
          if (typeof spawnResult === "string") {
            (logger.logError(`Failed to spawn session ${sessionId}: ${spawnResult}`),
              logFeatureBad("bridge_work_pickup", "spawn_failed"),
              trackBackgroundOp(cleanupServerConfigDir(Nn)));
            let pe = sessionHeartbeatState.get(sessionId);
            if (pe)
              (sessionHeartbeatState.delete(sessionId),
                trackBackgroundOp(
                  cleanupSessionWorktree(pe, logger, { force: !0, storageV5: config.storageV5 }),
                ));
            (completedWorkIds_2.add(r.id),
              trackBackgroundOp(
                stopWorkWithRetry(
                  trackedApi,
                  environmentId,
                  r.id,
                  currentEnvironmentSecret,
                  logger,
                  backoff.stopWorkBaseDelayMs,
                ),
              ));
            break;
          }
          let Fn = spawnResult,
            or = Date.now() - spawnStartTime;
          (logFeatureOk("bridge_work_pickup"),
            logEvent("tengu_bridge_session_started", {
              ccr_session_id: ye(toInfraSessionId(sessionId)),
              active_sessions: sessionStartTimes.size,
              spawn_mode: fromEnum(spawnModeAtDecision),
              in_worktree: sessionHeartbeatState.has(sessionId),
              worktree_requested: Lt,
              spawn_duration_ms: or,
              worktree_create_ms: xn,
              rc_child: rcChild,
              project_thread: projectThreadChild,
              resumed_turn: sr,
              inProtectedNamespace: isEvalBuild(),
              ...cooAttributes(),
            }),
            logForDiagnosticsNoPII("info", "bridge_session_started", {
              spawn_mode: spawnModeAtDecision,
              in_worktree: sessionHeartbeatState.has(sessionId),
              worktree_requested: Lt,
              spawn_duration_ms: or,
              worktree_create_ms: xn,
            }),
            sessionStartTimes.set(sessionId, Fn),
            Ce.add(sessionIdBody(sessionId)));
          for (let pe of parkedProjectThreadIds)
            if (sessionIdBody(pe) === sessionIdBody(sessionId)) parkedProjectThreadIds.delete(pe);
          if (projectThreadChild) (sessionCompatIds.add(sessionId), (Ie = !0));
          (settleRequeue(sessionId, !1),
            config.onSessionServiced?.(sessionId),
            sessionWorktrees.set(sessionId, r.id),
            timedOutSessions.set(sessionId, ue),
            qe.delete(sessionId),
            Se.delete(sessionDir));
          let startTime = Date.now();
          (completedWorkIds.set(sessionId, startTime),
            logger.logSessionStart(sessionId, `Session ${sessionId}`));
          let safeId = safeFilenameId(sessionId),
            gn;
          if (config.debugFile) {
            let ext = config.debugFile.lastIndexOf(".");
            if (ext > 0) gn = `${config.debugFile.slice(0, ext)}-${safeId}${config.debugFile.slice(ext)}`;
            else gn = `${config.debugFile}-${safeId}`;
          } else if (config.verbose) gn = join(claudeTempDir(), `bridge-session-${safeId}.log`);
          if (gn) logger.logVerbose(`Debug log: ${gn}`);
          (logger.addSession(ue, getRemoteSessionUrl(ue, config.sessionIngressUrl, { from: "cli" })),
            startStatusUpdates(),
            logger.setAttached(ue),
            fetchSessionTitle(ue, config.apiBaseUrl)
              .then((title) => {
                if (title && lt.get(sessionId) === On && !ke.has(ue)) {
                  if (
                    (logger.setSessionTitle(ue, title),
                    logForDebugging(`[bridge:title] server title for ${ue}: ${title}`),
                    !sessionTitleCandidates.get(ue)?.has(title))
                  )
                    ke.add(ue);
                }
              })
              .catch((err) =>
                logForDebugging(`[bridge:title] failed to fetch title for ${ue}: ${err}`, { level: "error" }),
              ),
            Qt?.schedule(sessionId, ae.session_ingress_token),
            Fn.done.then(onSessionDone(sessionId, startTime, Fn)));
          break;
        }
        default:
          (await ackWork(), logForDebugging(`[bridge:work] Unknown work type: ${workType}, skipping`));
          break;
      }
      if (F) await trackCleanup(pollConfig);
    } catch (error) {
      if (loopSignal.aborted) break;
      if (error instanceof BridgeFatalError) {
        let v = pn(error),
          y;
        if (v !== void 0) {
          ((Be = fromEnum(v)), (re = !0));
          let now = Date.now();
          while (pendingCleanups.length > 0 && pendingCleanups[0] < now - 3600000) pendingCleanups.shift();
          while (pendingCleanups.length > 0 && pendingCleanups.at(-1) > now) pendingCleanups.pop();
          if (
            v === "poll_401" &&
            reregisterAttempts < RENEW_MAX_ATTEMPTS &&
            pendingCleanups.length >= RENEW_MAX_JITTER_PCT
          ) {
            let F = pendingCleanups[0] + 3600000 + Math.random() * backoff.connCapMs;
            if (ze === void 0 || now - ze >= 3600000) {
              ze = now;
              let max = Math.max(1, Math.ceil((F - now) / 60000)),
                ae = max === 1 ? "minute" : "minutes";
              (logForDebugging(
                `[bridge:poll] Pausing re-registration of environment ${environmentId}: ${pendingCleanups.length} re-registrations after poll 401s in the last hour (the hourly cap); resuming in about ${max} ${ae}`,
                { level: "warn" },
              ),
                logger.logWarning(
                  `The server keeps rejecting this computer's Remote Control credential, so Remote Control will wait about ${max} ${ae} before renewing it again. New sessions can't start here until the server accepts it.`,
                ),
                logEvent("tengu_bridge_env_reregister", {
                  attempt: reregisterAttempts,
                  outcome: lit("paused"),
                  trigger: fromEnum(v),
                }),
                logFeatureSad("bridge_env_reregister", "paused"));
            }
            if (sessionStartTimes.size > 0 && dn()) await Nt();
            await sleep(
              jitterDelay(Math.min(Math.max(F - now, backoff.connInitialMs), backoff.connCapMs)),
              loopSignal,
            );
            continue;
          }
          if (reregisterAttempts < RENEW_MAX_ATTEMPTS) {
            if ((reregisterAttempts++, v === "poll_401")) pendingCleanups.push(now);
            logger.logVerbose(
              `${v === "poll_401" ? "This environment's Remote Control credential expired or was rejected; renewing it" : "Server no longer has this environment \u2014 re-registering"} (attempt ${reregisterAttempts}/${RENEW_MAX_ATTEMPTS})`,
            );
            let F = await reregisterEnvironment({
              api: trackedApi,
              config: config,
              environmentId: environmentId,
              activeSessions: sessionStartTimes,
              attempt: reregisterAttempts,
              trigger: v,
              signal: loopSignal,
            });
            if (F.outcome === "reregistered") E(F);
            if (loopSignal.aborted) break;
            if (F.outcome === "fatal") y = F;
            else {
              if (F.outcome === "transient") Ke = !0;
              if (
                (logger.logVerbose(
                  F.outcome === "reregistered"
                    ? "Environment re-registered; resuming poll."
                    : "Re-registration failed; retrying after backoff.",
                ),
                v === "poll_401" && sessionStartTimes.size > 0 && dn())
              )
                await Nt();
              (watchScheduler.expectWork(),
                await sleep(
                  Math.max(
                    jitterDelay(
                      (v === "poll_401"
                        ? Math.max(
                            backoff.connInitialMs,
                            backoff.reregister401BackoffFloorMs ?? SHUTDOWN_GRACE_MS,
                          )
                        : backoff.connInitialMs) * reregisterAttempts,
                    ),
                    Math.min(F.outcome === "transient" ? (F.retryAfterMs ?? 0) : 0, backoff.connCapMs),
                  ),
                  loopSignal,
                ));
              continue;
            }
          } else
            (logForDebugging(
              `[bridge:poll] Giving up on re-registering environment ${environmentId} after ${reregisterAttempts} consecutive attempts`,
              { level: "error" },
            ),
              logEvent("tengu_bridge_env_reregister", {
                attempt: reregisterAttempts,
                outcome: lit("gave_up"),
                trigger: fromEnum(v),
              }),
              logFeatureBad("bridge_env_reregister", "gave_up"),
              (y = { reason: "gave_up", preserve: v === "poll_401" && Ke }));
        }
        let R = y?.reason === "gave_up" && y.preserve;
        if (((gaveUp = !R), R)) controller.abort();
        if (error.status !== 401 && isExpiredErrorType(error.errorType))
          logger.logStatus(withReconnectHint(error.message));
        else if (
          v === "poll_401" &&
          y !== void 0 &&
          !(y.reason === "register_rejected" && y.status === 401)
        ) {
          let r;
          switch (y.reason) {
            case "register_rejected":
              r = `Remote Control stopped: the server refused to reconnect this computer. ${y.message}`;
              break;
            case "replaced":
              r =
                "Remote Control could not renew this environment's credential: the server issued a new environment instead. Restart `claude remote-control` to start fresh.";
              break;
            case "gave_up":
              r = `Remote Control could not renew this environment's credential after repeated attempts.${R && config.preserveOnShutdown ? "" : " Restart `claude remote-control` to start fresh."}`;
              break;
          }
          (logger.logError(r),
            logForDebugging(`[bridge:work] Fatal bridge error: ${error.message}`, { level: "error" }));
        } else if (isSuppressibleError(error))
          logForDebugging(`[bridge:work] Suppressed 403 error: ${error.message}`);
        else if (isEnvironmentGoneError(error) && qe.size > 0) Sn();
        else
          (logger.logError(error.message),
            logForDebugging(`[bridge:work] Fatal bridge error: ${error.message}`, { level: "error" }));
        (logEvent("tengu_bridge_fatal_error", {
          status: error.status,
          error_type:
            error.errorType === void 0 ? void 0 : sanitizedOAuthErrorTypeForTelemetry(error.errorType),
        }),
          logForDiagnosticsNoPII(
            isExpiredErrorType(error.errorType) ? "info" : "error",
            "bridge_fatal_error",
            { status: error.status, error_type: error.errorType },
          ));
        break;
      }
      let errMsg = describeAxiosError(error);
      if (isConnectionError(error) || isServerError(error)) {
        let now = Date.now();
        if (lastPollErrorTime !== null && now - lastPollErrorTime > pollSleepDetectionThresholdMs(backoff))
          (logForDebugging(
            `[bridge:work] Detected system sleep (${Math.round((now - lastPollErrorTime) / 1000)}s gap), resetting error budget`,
          ),
            logForDiagnosticsNoPII("info", "bridge_poll_sleep_detected", { gapMs: now - lastPollErrorTime }),
            (connErrorStart = null),
            (connBackoffMs = 0),
            (generalErrorStart = null),
            (generalBackoffMs = 0));
        if (((lastPollErrorTime = now), !connErrorStart)) connErrorStart = now;
        let y = now - connErrorStart,
          R = Ie && St();
        if (y >= backoff.connGiveUpMs && R)
          logger.logVerbose(
            `Server unreachable for ${Math.round(y / 60000)} minutes; still retrying while a project thread session is being served`,
          );
        if (y >= backoff.connGiveUpMs && !R) {
          (logger.logError(`Server unreachable for ${Math.round(y / 60000)} minutes, giving up.`),
            logEvent("tengu_bridge_poll_give_up", { error_type: lit("connection"), elapsed_ms: y }),
            logForDiagnosticsNoPII("error", "bridge_poll_give_up", {
              error_type: "connection",
              elapsed_ms: y,
            }),
            (gaveUp = !0));
          break;
        }
        ((generalErrorStart = null),
          (generalBackoffMs = 0),
          (connBackoffMs = connBackoffMs
            ? Math.min(connBackoffMs * 2, backoff.connCapMs)
            : backoff.connInitialMs));
        let delay = jitterDelay(connBackoffMs);
        if (
          (logger.logVerbose(
            `Connection error, retrying in ${formatMs(Gt(delay))} (${Math.round(y / 1000)}s elapsed): ${errMsg}`,
          ),
          logger.updateReconnectingStatus(formatMs(Gt(delay)), formatDuration(y)),
          getPollIntervalConfig().non_exclusive_heartbeat_interval_ms > 0)
        )
          await Vt();
        await sleep(delay, loopSignal);
      } else {
        let now = Date.now();
        if (lastPollErrorTime !== null && now - lastPollErrorTime > pollSleepDetectionThresholdMs(backoff))
          (logForDebugging(
            `[bridge:work] Detected system sleep (${Math.round((now - lastPollErrorTime) / 1000)}s gap), resetting error budget`,
          ),
            logForDiagnosticsNoPII("info", "bridge_poll_sleep_detected", { gapMs: now - lastPollErrorTime }),
            (connErrorStart = null),
            (connBackoffMs = 0),
            (generalErrorStart = null),
            (generalBackoffMs = 0));
        if (((lastPollErrorTime = now), !generalErrorStart)) generalErrorStart = now;
        let y = now - generalErrorStart,
          R = Ie && St();
        if (y >= backoff.generalGiveUpMs && R)
          logger.logVerbose(
            `Persistent errors for ${Math.round(y / 60000)} minutes; still retrying while a project thread session is being served`,
          );
        if (y >= backoff.generalGiveUpMs && !R) {
          (logger.logError(`Persistent errors for ${Math.round(y / 60000)} minutes, giving up.`),
            logEvent("tengu_bridge_poll_give_up", { error_type: lit("general"), elapsed_ms: y }),
            logForDiagnosticsNoPII("error", "bridge_poll_give_up", { error_type: "general", elapsed_ms: y }),
            (gaveUp = !0));
          break;
        }
        ((connErrorStart = null),
          (connBackoffMs = 0),
          (generalBackoffMs = generalBackoffMs
            ? Math.min(generalBackoffMs * 2, backoff.generalCapMs)
            : backoff.generalInitialMs));
        let delay = jitterDelay(generalBackoffMs);
        if (
          (logger.logVerbose(
            `Poll failed, retrying in ${formatMs(Gt(delay))} (${Math.round(y / 1000)}s elapsed): ${errMsg}`,
          ),
          logger.updateReconnectingStatus(formatMs(Gt(delay)), formatDuration(y)),
          getPollIntervalConfig().non_exclusive_heartbeat_interval_ms > 0)
        )
          await Vt();
        await sleep(delay, loopSignal);
      }
    }
  }
  (vn(), sessionsWatcher?.stop(), stopStatusUpdates(), logger.clearStatus({ final: !0 }));
  let mn = Date.now() - loopStartTime;
  (logEvent("tengu_bridge_shutdown", { active_sessions: sessionStartTimes.size, loop_duration_ms: mn }),
    logForDiagnosticsNoPII("info", "bridge_shutdown", {
      active_sessions: sessionStartTimes.size,
      loop_duration_ms: mn,
    }));
  let sessionsToArchive = new Set(sessionStartTimes.keys());
  if (initialSessionId && ![...qe].some((n) => sameSessionId(n, initialSessionId)))
    sessionsToArchive.add(initialSessionId);
  let compatIdSnapshot = new Map(timedOutSessions);
  if (
    (await (async () => {
      if (sessionStartTimes.size === 0 && pendingRequeues.size === 0) return;
      let n =
        config.persistActiveSessionsOnShutdown && config.preserveOnShutdown && !gaveUp && config.ownsPointer
          ? await config.awaitShutdownCause?.()
          : null;
      if (n !== "upgrade" && n !== "reload" && n !== "yield") return;
      let {
        readBridgePointer: readBridgePointer,
        writeBridgePointer: writeBridgePointer,
        MAX_POINTER_ACTIVE_SESSION_IDS: MAX_POINTER_ACTIVE_SESSION_IDS,
        PERSISTED_SESSION_RESUME_WINDOW_MS: PERSISTED_SESSION_RESUME_WINDOW_MS,
        isPersistedStampFresh: isPersistedStampFresh,
      } = await import("./chunk-8z86ydvk.js");
      await (config.enqueuePointerWrite ?? ((F) => F()))(async () => {
        let F = await readBridgePointer(config.dir, { noClear: !0 }, config.storageV5);
        if (!F) return;
        let { ageMs: ageMs, ...ae } = F,
          Pe = [...sessionStartTimes.keys()],
          now = Date.now(),
          initialSessionRequeuesPersistedAt = config.initialSessionRequeuesPersistedAt,
          Ne =
            initialSessionRequeuesPersistedAt !== void 0 &&
            isPersistedStampFresh(initialSessionRequeuesPersistedAt, now, PERSISTED_SESSION_RESUME_WINDOW_MS)
              ? [...pendingRequeues.keys()].filter((xe) => !L(xe))
              : [];
        await writeBridgePointer(
          config.dir,
          {
            ...ae,
            activeSessionIds: [
              ...Pe.filter((xe) => sessionWorkIds.has(xe)),
              ...Ne,
              ...Pe.filter((xe) => !sessionWorkIds.has(xe)),
            ].slice(0, MAX_POINTER_ACTIVE_SESSION_IDS),
            activeSessionIdsPersistedAt:
              Ne.length > 0 && initialSessionRequeuesPersistedAt !== void 0
                ? Math.min(now, initialSessionRequeuesPersistedAt)
                : now,
          },
          config.storageV5,
        );
      });
    })(),
    config.preserveOnShutdown && !gaveUp && config.ownsPointer && St())
  ) {
    let n =
      projectThreadPointer(sessionCompatIds, parkedProjectThreadIds) ??
      (config.parkedProjectThreadSessionIds
        ? { projectThreadSessionIds: [], parkedProjectThreadSessionIds: [] }
        : void 0);
    if (n !== void 0) {
      let { readBridgePointer: readBridgePointer, writeBridgePointer: writeBridgePointer } =
          await import("./chunk-8z86ydvk.js"),
        v = config.enqueuePointerWrite ?? ((r) => r()),
        R =
          config.parkedProjectThreadSessionIdsPersistedAt !== void 0 &&
          (config.parkedProjectThreadSessionIds ?? []).some((r) => parkedProjectThreadIds.has(r))
            ? config.parkedProjectThreadSessionIdsPersistedAt
            : Date.now();
      (await v(async () => {
        let r = await readBridgePointer(config.dir, { noClear: !0, ignoreTtl: !0 }, config.storageV5);
        if (!r) return;
        let { ageMs: ageMs, ...D } = r;
        await writeBridgePointer(
          config.dir,
          {
            ...D,
            ...(n.projectThreadSessionIds.length > 0 && {
              projectThreadSessionIds: n.projectThreadSessionIds,
              projectThreadSessionIdsPersistedAt: Date.now(),
            }),
            parkedProjectThreadSessionIds: n.parkedProjectThreadSessionIds,
            parkedProjectThreadSessionIdsPersistedAt: R,
          },
          config.storageV5,
        );
      }),
        logForDebugging(
          `[bridge:shutdown] remembered ${n.projectThreadSessionIds.length} live and ${n.parkedProjectThreadSessionIds.length} parked project thread session(s) for the next run`,
        ));
    }
  }
  if (sessionStartTimes.size > 0) {
    (logForDebugging(`[bridge:shutdown] Shutting down ${sessionStartTimes.size} active session(s)`),
      logger.logStatus(`Shutting down ${sessionStartTimes.size} active session(s)\u2026`));
    let shutdownWorkIds = new Map(sessionWorktrees);
    for (let [v, y] of sessionStartTimes.entries())
      (logForDebugging(`[bridge:shutdown] Sending SIGTERM to sessionId=${v}`), y.kill());
    let settled = Promise.allSettled(
        [...shutdownWorkIds.entries()].map(([v, y]) =>
          trackedApi
            .stopWork(environmentId, y, currentEnvironmentSecret, !0)
            .then(() => logFeatureOk("bridge_work_stop"))
            .catch((R) => {
              if (isEnvironmentGoneError(R)) logFeatureSad("bridge_work_stop", "env_gone");
              else
                logFeatureBad(
                  "bridge_work_stop",
                  R instanceof BridgeFatalError && R.status === 403 ? "shutdown_403" : "shutdown_failed",
                );
              logger.logVerbose(`Failed to stop work ${y} for session ${v}: ${errorMessage(R)}`);
            }),
        ),
      ),
      timeout = new AbortController();
    (await Promise.race([
      Promise.allSettled([...sessionStartTimes.values()].map((v) => v.done)),
      sleep(backoff.shutdownGraceMs ?? 30000, timeout.signal),
    ]),
      timeout.abort());
    for (let [v, y] of sessionStartTimes.entries())
      (logForDebugging(`[bridge:shutdown] Force-killing stuck sessionId=${v}`), y.forceKill());
    if ((Qt?.cancelAll(), sessionHeartbeatState.size > 0)) {
      let remainingWorktrees = [...sessionHeartbeatState.values()];
      (sessionHeartbeatState.clear(),
        logForDebugging(`[bridge:shutdown] Cleaning up ${remainingWorktrees.length} worktree(s)`),
        await Promise.allSettled(
          remainingWorktrees.map((wt) =>
            cleanupSessionWorktree(wt, logger, {
              storageV5: config.storageV5,
              readDeadlineMs: POLL_RETRY_FLOOR_MS,
            }),
          ),
        ));
    }
    await settled;
  }
  if (pendingCleanups_2.size > 0) await Promise.allSettled([...pendingCleanups_2]);
  if (config.preserveOnShutdown && !gaveUp) {
    (logger.logStatus(
      config.spawnMode === "single-session" && initialSessionId
        ? `Resume this session by running \`claude remote-control ${config.ownsPointer ? "--continue" : `--session-id ${initialSessionId}`}\``
        : "Environment preserved. Restart `claude remote-control` to reconnect existing sessions.",
    ),
      logForDebugging(
        `[bridge:shutdown] Skipping archive+deregister to allow resume (env ${environmentId}, spawnMode ${config.spawnMode})`,
      ));
    let n = await config.awaitShutdownCause?.();
    if (n !== "upgrade" && n !== "reload")
      try {
        (await trackedApi.markEnvironmentOffline(environmentId, currentEnvironmentSecret),
          logForDebugging("[bridge:shutdown] Environment marked offline"));
      } catch (error) {
        logger.logVerbose(
          error instanceof BridgeFatalError && error.status === 401
            ? "Failed to mark environment offline: the environment credential was rejected"
            : `Failed to mark environment offline: ${errorMessage(error)}`,
        );
      }
    return;
  }
  if (sessionsToArchive.size > 0)
    (logForDebugging(`[bridge:shutdown] Archiving ${sessionsToArchive.size} session(s)`),
      await Promise.allSettled(
        [...sessionsToArchive].map((err) =>
          trackedApi
            .archiveSession(compatIdSnapshot.get(err) ?? toCompatSessionId(err))
            .catch((sessionId) =>
              logger.logVerbose(`Failed to archive session ${err}: ${errorMessage(sessionId)}`),
            ),
        ),
      ));
  try {
    (await trackedApi.deregisterEnvironment(environmentId),
      logForDebugging("[bridge:shutdown] Environment deregistered, bridge offline"),
      logger.logVerbose("Environment deregistered."));
  } catch (err) {
    logger.logVerbose(`Failed to deregister environment: ${errorMessage(err)}`);
  }
  if (config.ownsPointer) {
    let { clearBridgePointer: clearBridgePointer } = await import("./chunk-8z86ydvk.js");
    await (config.enqueuePointerWrite ?? ((_) => _()))(async () => {
      ((config.pointerCleared = !0), await clearBridgePointer(config.dir, config.storageV5));
    });
  }
  return (logger.logVerbose("Environment offline."), un);
}
/**
 * 视为"连不上服务器"的 Node 错误码集合（ECONNREFUSED、ECONNRESET、ETIMEDOUT…ERR_PROXY_TUNNEL）。
 */
//@ chunk-wbbfk060.js:67919-68060 fingerprint = CONNECTION_ERROR_CODES (0.751)
var CONNECTION_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNABORTED",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "ERR_SOCKET_CLOSED",
  "ERR_PROXY_TUNNEL",
]);
/**
 * 错误码是否属于 CONNECTION_ERROR_CODES。
 */
//@ chunk-wbbfk060.js:68060-68173 layout = isConnectionError (1)
function isConnectionError(err) {
  if (
    err &&
    typeof err === "object" &&
    "code" in err &&
    typeof err.code === "string" &&
    CONNECTION_ERROR_CODES.has(err.code)
  )
    return !0;
  return !1;
}
/**
 * 连接失败分类：timed_out / unreachable / refused（用于 watch 调度器统计）。
 */
//@ chunk-wbbfk060.js:68173-68250 layout
function classifyConnectFailure(error) {
  return isTimeoutError(error)
    ? "timed_out"
    : isConnectionError(error) || isNetworkUnreachableError(error)
      ? "unreachable"
      : "refused";
}
//@ chunk-wbbfk060.js:68250-68357 layout
function isTimeoutError(error) {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT")
  );
}
//@ chunk-wbbfk060.js:68357-68500 layout
function isNetworkUnreachableError(error) {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    (error.code === "ENOTFOUND" ||
      error.code === "EAI_AGAIN" ||
      error.code === "ENETDOWN" ||
      error.code === "EPIPE")
  );
}
/**
 * 是否是 axios ERR_BAD_RESPONSE（5xx）。
 */
//@ chunk-wbbfk060.js:68500-68613 fingerprint = isServerError (1)
function isServerError(err) {
  return (
    !!err &&
    typeof err === "object" &&
    "code" in err &&
    typeof err.code === "string" &&
    err.code === "ERR_BAD_RESPONSE"
  );
}
//@ chunk-wbbfk060.js:68613-68645 layout
var REGISTER_RETRY_MIN_MS = 30000,
  REGISTER_RETRY_MAX_MS = 300000,
  REGISTER_RETRY_DEFAULT_MS = 60000;
/**
 * 给延迟加 ±25% 随机抖动。
 */
//@ chunk-wbbfk060.js:68645-68708 layout
function jitterDelay(ms) {
  return Math.max(0, ms + ms * 0.25 * (2 * Math.random() - 1));
}
//@ chunk-wbbfk060.js:68708-68785 layout
function formatMs(ms) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}
//@ chunk-wbbfk060.js:68785-68808 layout
var REREGISTER_MIN_BACKOFF_MS = 60000,
  REREGISTER_MAX_BACKOFF_MS = 300000;
/**
 * 注册 environment（失败不抛出）：失败时调 onFailure，非交互模式按 retry-after（上限 5 分钟、至少约 1 分钟抖动）等待后返回 undefined。
 */
//@ chunk-wbbfk060.js:68808-69183 layout
async function tryRegisterEnvironment({
  register: register,
  interactive: interactive,
  onFailure: onFailure,
}) {
  try {
    return await register();
  } catch (error) {
    let U =
        typeof error === "object" && error !== null && "status" in error && typeof error.status === "number"
          ? error.status
          : void 0,
      w =
        typeof error === "object" &&
        error !== null &&
        "retryAfterMs" in error &&
        typeof error.retryAfterMs === "number"
          ? error.retryAfterMs
          : 0,
      H =
        !interactive && U !== void 0
          ? Math.max(Math.min(w, REREGISTER_MAX_BACKOFF_MS), jitterDelay(REREGISTER_MIN_BACKOFF_MS))
          : 0;
    if ((await onFailure(error, H), H > 0)) await sleep(H);
    return;
  }
}
/**
 * 停止 work：最多 3 次，指数退避；BridgeFatalError 时按 403 可忽略 / environment 已失效 / 其他致命分别记录并立即放弃。
 */
//@ chunk-wbbfk060.js:69183-70242 fingerprint = stopWorkWithRetry (0.552)
async function stopWorkWithRetry(
  api,
  environmentId,
  workId,
  environmentSecret,
  logger,
  baseDelayMs = 1000,
  displayWorkId = workId,
) {
  for (let attempt = 1; attempt <= 3; attempt++)
    try {
      (await api.stopWork(environmentId, workId, environmentSecret, !1, displayWorkId),
        logForDebugging(
          `[bridge:work] stopWork succeeded for workId=${displayWorkId} on attempt ${attempt}/3`,
        ),
        logFeatureOk("bridge_work_stop"));
      return;
    } catch (err) {
      let errMsg = errorMessage(err);
      if (displayWorkId !== workId)
        errMsg =
          err instanceof BridgeFatalError
            ? `status ${err.status}`
            : err instanceof Error
              ? err.name
              : "unknown error";
      if (err instanceof BridgeFatalError) {
        if (isSuppressibleError(err))
          (logForDebugging(`[bridge:work] Suppressed stopWork 403 for ${displayWorkId}: ${errMsg}`),
            logFeatureSad("bridge_work_stop", "fatal_403"));
        else if (isEnvironmentGoneError(err))
          (logForDebugging(
            `[bridge:work] stopWork skipped for ${displayWorkId} \u2014 environment gone: ${errMsg}`,
          ),
            logFeatureSad("bridge_work_stop", "env_gone"));
        else
          (logger.logError(`Failed to stop work ${displayWorkId}: ${errMsg}`),
            logFeatureBad(
              "bridge_work_stop",
              err.status === 401 ? "fatal_401" : err.status === 403 ? "fatal_403" : "fatal_other",
            ));
        logForDiagnosticsNoPII("error", "bridge_stop_work_failed", { attempts: attempt, fatal: !0 });
        return;
      }
      if (attempt < 3) {
        let delay = jitterDelay(baseDelayMs * Math.pow(2, attempt - 1));
        (logger.logVerbose(
          `Failed to stop work ${displayWorkId} (attempt ${attempt}/3), retrying in ${formatMs(delay)}: ${errMsg}`,
        ),
          await sleep(delay));
      } else
        (logger.logError(`Failed to stop work ${displayWorkId} after 3 attempts: ${errMsg}`),
          logForDiagnosticsNoPII("error", "bridge_stop_work_failed", { attempts: 3 }),
          logFeatureBad("bridge_work_stop", "retries_exhausted"));
    }
}
/**
 * 会话结束后清理 worktree：有未提交改动、领先提交或 checkout 移动时保留并提示，否则移除（removed / left_in_place / failed）。
 */
//@ chunk-wbbfk060.js:70242-71424 layout
async function cleanupSessionWorktree(worktree, logger, options) {
  let P = { dirty: !1, commitsAhead: 0, gitError: !1 },
    changeState;
  if (options?.force) changeState = P;
  else if (worktree.hookBased && worktree.headCommit === void 0)
    changeState = (await lstat(join(worktree.worktreePath, ".git")).then(
      () => !0,
      (se) => !(isENOENT(se) || getErrnoCode(se) === "ENOTDIR"),
    ))
      ? { dirty: !0, commitsAhead: 0, gitError: !0 }
      : P;
  else changeState = await getAgentWorktreeChanges(worktree.worktreePath, worktree.headCommit);
  let {
    dirty: dirty,
    commitsAhead: commitsAhead,
    gitError: gitError,
    checkoutMoved: checkoutMoved,
    checkFailed: checkFailed,
  } = changeState;
  if (dirty || commitsAhead > 0 || checkoutMoved === !0) {
    let me = `${commitsAhead} ${plural(commitsAhead, "commit")}`,
      se = gitError
        ? "git error checking changes"
        : checkFailed
          ? "could not check for changes"
          : dirty && commitsAhead > 0
            ? `uncommitted changes \xB7 ${me}`
            : dirty
              ? "uncommitted changes"
              : me;
    if (worktree.gitRoot) await unlockAgentWorktree(worktree.worktreePath, worktree.gitRoot);
    (logger.logStatus(`kept worktree ${worktree.worktreePath} \xB7 ${se}`),
      logForDebugging(
        `[bridge:worktree] kept ${worktree.worktreePath} dirty=${dirty} commitsAhead=${commitsAhead} gitError=${!!gitError} checkFailed=${!!checkFailed}`,
      ));
    return;
  }
  switch (
    (
      await removeAgentWorktree(
        worktree.worktreePath,
        worktree.worktreeBranch,
        worktree.gitRoot,
        worktree.hookBased,
        "bridge",
        void 0,
        void 0,
        { storageV5: options?.storageV5 },
      )
    ).outcome
  ) {
    case "removed":
      logger.logStatus(`removed worktree ${worktree.worktreePath}`);
      break;
    case "left_in_place":
      logger.logStatus(`worktree directory left at ${worktree.worktreePath} (git no longer recognized it)`);
      break;
    case "failed":
      logger.logStatus(`worktree removal failed, kept: ${worktree.worktreePath}`);
      break;
  }
}
//@ chunk-wbbfk060.js:71424-71465 fingerprint = SPAWN_FLAG_VALUES (1)
var SPAWN_FLAG_VALUES = ["session", "same-dir", "worktree"];
//@ chunk-wbbfk060.js:71465-71665 fingerprint = parseSpawnValue (1)
function parseSpawnValue(raw) {
  if (raw === "session") return "single-session";
  if (raw === "same-dir") return "same-dir";
  if (raw === "worktree") return "worktree";
  return `--spawn requires one of: ${SPAWN_FLAG_VALUES.join(", ")} (got: ${raw ?? "<missing>"})`;
}
//@ chunk-wbbfk060.js:71665-71805 fingerprint = parseCapacityValue (1)
function parseCapacityValue(raw) {
  let s = raw === void 0 ? NaN : parseIntLoose(raw);
  if (isNaN(s) || s < 1) return `--capacity requires a positive integer (got: ${raw ?? "<missing>"})`;
  return s;
}
/**
 * 解析 --preview-port（1024–65535），错误返回提示字符串。
 */
//@ chunk-wbbfk060.js:71805-71986 layout
function parsePreviewPortValue(raw) {
  let s = raw === void 0 ? NaN : Number(raw);
  if (!Number.isInteger(s) || s < 1024 || s > 65535)
    return `--preview-port requires an integer in [1024, 65535] (got: ${raw ?? "<missing>"})`;
  return s;
}
/**
 * 解析 claude remote-control 参数：--name、--remote-control-session-name-prefix、-c/--continue、--session-id、--permission-mode、--[no-]chrome、--spawn、--capacity、
 * --[no-]create-session-in-dir、--allow-unattended-tool-calls、--debug-file、-v；拒绝 --sandbox，并校验互斥组合；--enable-live-preview/--preview-port 在此构建不可用。
 */
//@ chunk-wbbfk060.js:71986-75709 fingerprint = parseArgs (0.734)
function parseArgs(args) {
  let verbose = !1,
    debugFile,
    permissionMode,
    chrome,
    name,
    project,
    sessionNamePrefix,
    help = !1,
    spawnMode,
    capacity,
    createSessionInDir,
    sessionId,
    continueSession = !1,
    enableLivePreview = !1,
    previewPorts = [],
    allowUnattendedToolCalls = !1,
    guest,
    testVm;
  for (let re = 0; re < args.length; re++) {
    let arg = args[re];
    if (arg === "--help" || arg === "-h") help = !0;
    else if (arg === "--verbose" || arg === "-v") verbose = !0;
    else if (arg === "--sandbox" || arg === "--no-sandbox")
      return makeError(
        `${arg} is not supported by claude remote-control. The flag had no effect and was removed. ${arg === "--sandbox" ? SANDBOX_SETTING_HINT : "Remove it from the command."}`,
      );
    else if (arg === "--debug-file" && re + 1 < args.length) debugFile = resolve(args[++re]);
    else if (arg.startsWith("--debug-file=")) debugFile = resolve(arg.slice(13));
    else if (arg === "--debug" || arg === "-d" || arg.startsWith("--debug="));
    else if (arg === "--permission-mode" && re + 1 < args.length)
      permissionMode = normalizePermissionModeAlias(args[++re]);
    else if (arg.startsWith("--permission-mode="))
      permissionMode = normalizePermissionModeAlias(arg.slice(18));
    else if (arg === "--chrome") chrome = !0;
    else if (arg === "--no-chrome") chrome = !1;
    else if (arg === "--name" && re + 1 < args.length) name = args[++re];
    else if (arg.startsWith("--name=")) name = arg.slice(7);
    else if (arg === "--remote-control-session-name-prefix" && re + 1 < args.length)
      sessionNamePrefix = args[++re];
    else if (arg.startsWith("--remote-control-session-name-prefix=")) sessionNamePrefix = arg.slice(37);
    else if (arg === "--session-id" && re + 1 < args.length) {
      if (((sessionId = args[++re]), !sessionId)) return makeError("--session-id requires a value");
    } else if (arg.startsWith("--session-id=")) {
      if (((sessionId = arg.slice(13)), !sessionId)) return makeError("--session-id requires a value");
    } else if (arg === "--continue" || arg === "-c") continueSession = !0;
    else if (arg === "--spawn" || arg.startsWith("--spawn=")) {
      if (spawnMode !== void 0) return makeError("--spawn may only be specified once");
      let X = arg.startsWith("--spawn=") ? arg.slice(8) : args[++re],
        K = parseSpawnValue(X);
      if (K === "single-session" || K === "same-dir" || K === "worktree") spawnMode = K;
      else return makeError(K);
    } else if (arg === "--capacity" || arg.startsWith("--capacity=")) {
      if (capacity !== void 0) return makeError("--capacity may only be specified once");
      let X = arg.startsWith("--capacity=") ? arg.slice(11) : args[++re],
        K = parseCapacityValue(X);
      if (typeof K === "number") capacity = K;
      else return makeError(K);
    } else if (arg === "--create-session-in-dir") createSessionInDir = !0;
    else if (arg === "--no-create-session-in-dir") createSessionInDir = !1;
    else if (arg === "--enable-live-preview") enableLivePreview = !0;
    else if (arg === "--allow-unattended-tool-calls") allowUnattendedToolCalls = !0;
    else if (arg === "--preview-port" || arg.startsWith("--preview-port=")) {
      let X = arg.startsWith("--preview-port=") ? arg.slice(15) : args[++re],
        K = parsePreviewPortValue(X);
      if (typeof K === "number") previewPorts.push(K);
      else return makeError(K);
    } else
      return makeError(`Unknown argument: ${arg}
Run 'claude remote-control --help' for usage.`);
  }
  if (spawnMode === "single-session" && capacity !== void 0)
    return makeError(
      "--capacity cannot be used with --spawn=session (single-session mode has fixed capacity 1).",
    );
  if (
    (sessionId || continueSession) &&
    (spawnMode !== void 0 || capacity !== void 0 || createSessionInDir !== void 0)
  )
    return makeError(
      "--session-id and --continue cannot be used with --spawn, --capacity, or --create-session-in-dir.",
    );
  if (sessionId && continueSession) return makeError("--session-id and --continue cannot be used together.");
  if (allowUnattendedToolCalls && (sessionId || continueSession || spawnMode === "single-session"))
    return makeError(
      "--allow-unattended-tool-calls cannot be used with --spawn=session, --session-id, or --continue.",
    );
  if (enableLivePreview || previewPorts.length > 0)
    return makeError("--enable-live-preview and --preview-port are not available in this build.");
  if (isEssentialTrafficOnly() && (enableLivePreview || previewPorts.length > 0))
    return makeError(
      `--enable-live-preview is unavailable while nonessential network traffic is disabled (${getEssentialTrafficOnlyReason() ?? "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC"} is set).`,
    );
  if (enableLivePreview && previewPorts.length === 0)
    return makeError("--enable-live-preview requires at least one --preview-port <port>.");
  if (!enableLivePreview && previewPorts.length > 0)
    return makeError("--preview-port requires --enable-live-preview (the tunnel is off by default).");
  return {
    verbose: verbose,
    debugFile: debugFile,
    permissionMode: permissionMode,
    chrome: chrome,
    name: name,
    project: project,
    sessionNamePrefix: sessionNamePrefix,
    spawnMode: spawnMode,
    capacity: capacity,
    createSessionInDir: createSessionInDir,
    sessionId: sessionId,
    continueSession: continueSession,
    enableLivePreview: enableLivePreview,
    previewPorts: previewPorts,
    allowUnattendedToolCalls: allowUnattendedToolCalls,
    ...(guest !== void 0 && { guest: guest }),
    ...(testVm !== void 0 && { testVm: testVm }),
    help: help,
  };
  function makeError(error) {
    return {
      verbose: verbose,
      debugFile: debugFile,
      permissionMode: permissionMode,
      chrome: chrome,
      name: name,
      project: project,
      sessionNamePrefix: sessionNamePrefix,
      spawnMode: spawnMode,
      capacity: capacity,
      createSessionInDir: createSessionInDir,
      sessionId: sessionId,
      continueSession: continueSession,
      enableLivePreview: enableLivePreview,
      previewPorts: previewPorts,
      allowUnattendedToolCalls: allowUnattendedToolCalls,
      help: help,
      error: error,
    };
  }
}
//@ chunk-wbbfk060.js:75709-75719 layout
var TITLE_MAX_CHARS = 80;
/**
 * 取恢复会话所需的认证上下文：access token、是否用 v2 会话 CRUD、组织 UUID（v1 时）、trusted device token。
 */
//@ chunk-wbbfk060.js:75719-75998 layout
async function getUnarchiveAuthContext(credentials) {
  let s =
    isStorageV5Enabled() && credentials !== void 0
      ? await getBridgeAccessTokenAsync(credentials)
      : getBridgeAccessToken();
  if (!s) return null;
  let S = isCcrV2SessionCrudEnabled(),
    P;
  if (!S) {
    let { getOrganizationUUID: getOrganizationUUID } = await import("./chunk-appaeyg7.js");
    P = (await getOrganizationUUID()) ?? void 0;
  }
  let U = await getTrustedDeviceToken().catch(() => {
    return;
  });
  return { accessToken: s, useV2: S, orgUUID: P, trustedDeviceToken: U };
}
//@ chunk-wbbfk060.js:75998-76070 layout
function firstByte(data) {
  return typeof data === "string" ? Buffer.from(data, "utf8")[0] : data[0];
}
/**
 * 重连前解档被回收的会话（tengu_bridge_unarchive_on_resume）：untrusted_device 时注册设备后重试；2xx 记成功、409 视为已活跃、其余保持旧行为。
 */
//@ chunk-wbbfk060.js:76070-77203 layout
async function unarchiveBridgeSessionIfNeeded(sessionId, baseUrl, credentials) {
  try {
    let { getFeatureValue_CACHED_MAY_BE_STALE: getFeatureValue_CACHED_MAY_BE_STALE } =
      await import("./chunk-6df1d6re.js");
    if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_unarchive_on_resume", !0)) return !1;
    let U = await getUnarchiveAuthContext(credentials);
    if (!U) return !1;
    let {
        accessToken: accessToken,
        useV2: useV2,
        orgUUID: orgUUID,
        trustedDeviceToken: trustedDeviceToken,
      } = U,
      { unarchiveCodeSession: unarchiveCodeSession } = await import("./chunk-g9dw262t.js"),
      Q = await unarchiveCodeSession(baseUrl, accessToken, sessionId, 1e4, {
        useV2: useV2,
        orgUUID: orgUUID,
        trustedDeviceToken: trustedDeviceToken,
      });
    if (Q === "untrusted_device") {
      let me = await withUntrustedDeviceRecovery(
        trustedDeviceToken,
        (se) =>
          unarchiveCodeSession(baseUrl, accessToken, sessionId, 1e4, {
            useV2: useV2,
            orgUUID: orgUUID,
            trustedDeviceToken: se,
          }),
        credentials,
      );
      if (me !== void 0) Q = me;
    }
    if (typeof Q === "number" && Q < 300)
      return (
        logFeatureOk("bridge_session_unarchive"),
        logForDebugging(
          `[bridge:init] Unarchived reaped session ${sessionId} before reattach (status=${String(Q)})`,
        ),
        !0
      );
    if (Q === 409)
      return (
        logForDebugging(
          `[bridge:init] Session ${sessionId} already active (unarchived by another client) \u2014 resuming without a mutation to compensate`,
        ),
        !1
      );
    return (
      logFeatureBad("bridge_session_unarchive", typeof Q === "number" ? `http_${Q}` : Q),
      logForDebugging(
        `[bridge:init] Unarchive of reaped session ${sessionId} failed (status=${String(Q)}) \u2014 keeping prior reattach behavior`,
        { level: "warn" },
      ),
      !1
    );
  } catch (error) {
    return (
      logForDebugging(
        `[bridge:init] unarchiveBridgeSessionIfNeeded(${sessionId}) failed: ${errorMessage(error)}`,
        { level: "warn" },
      ),
      !1
    );
  }
}
//@ chunk-wbbfk060.js:77203-77332 fingerprint = fetchSessionTitle (0.67)
async function fetchSessionTitle(compatSessionId, baseUrl) {
  let { getBridgeSession: getBridgeSession } = await import("./chunk-3eyvtwsv.js");
  return (await getBridgeSession(compatSessionId, { baseUrl: baseUrl }))?.title || void 0;
}
/**
 * 每小时刷新一次 bridge pointer 文件（续 mtime，清理过期的 activeSessionIds），定时器 unref。
 */
//@ chunk-wbbfk060.js:77332-77761 layout
function startPointerRefreshTimer(e, s, S, P, U, w, H, j, ne, W) {
  let Q = setInterval(
    (me, se, Z, M, be, Oe, G, ve, q, re) =>
      void se().then((N) =>
        G(() => {
          if (Oe.aborted || re()) return Promise.resolve(!1);
          if (
            M.activeSessionIds !== void 0 &&
            (M.activeSessionIdsPersistedAt === void 0 || !q(M.activeSessionIdsPersistedAt, Date.now(), ve))
          )
            (delete M.activeSessionIds, delete M.activeSessionIdsPersistedAt);
          return me(Z, { ...M, procStart: N }, be);
        }),
      ),
    3600000,
    e,
    s,
    S,
    P,
    U,
    w,
    H,
    j,
    ne,
    W,
  );
  return (Q.unref?.(), Q);
}
/**
 * claude remote-control 入口：解析参数→launcher/工作区信任/Chrome 策略/登录检查→读取 bridge pointer（--continue / --session-id / 崩溃恢复）→询问 spawn 模式→
 * 创建 API 客户端并注册 environment→（可选）预创建会话、写 bridge pointer→注册信号与键盘（空格 QR、w 切换 spawn 模式）→runBridgeLoop→退出清理。
 */
//@ chunk-wbbfk060.js:77761-99405 fingerprint = bridgeMain (0.576)
async function bridgeMain(e, storageV5, credentials) {
  let parsed = parseArgs(e);
  if (parsed.help) {
    await printRemoteControlHelp();
    return;
  }
  if (parsed.error) (console.error(`Error: ${parsed.error}`), process.exit(1));
  let U = processWrapperError();
  if (U) {
    (logFeatureBad("agent_launcher", "remote_control_refused"),
      console.error(
        `Error: ${U} \u2014 Remote Control sessions are not started unwrapped; fix the launcher, then retry`,
      ));
    let { exitAfterAnalyticsFlush: exitAfterAnalyticsFlush } = await import("./chunk-kahpc3cs.js");
    return exitAfterAnalyticsFlush(1);
  }
  (lockCurrentVersion(), setAttestationFilterPolicy(getAttestationFilterPolicy));
  let {
    verbose: verbose,
    debugFile: debugFile,
    permissionMode: permissionMode,
    chrome: chrome,
    name: name,
    project: project,
    sessionNamePrefix: sessionNamePrefix,
    spawnMode: parsedSpawnMode,
    capacity: parsedCapacity,
    createSessionInDir: parsedCreateSessionInDir,
    sessionId: parsedSessionId,
    continueSession: continueSession,
    enableLivePreview: enableLivePreview,
    previewPorts: previewPorts,
    allowUnattendedToolCalls: allowUnattendedToolCalls,
    guest: guest,
    testVm: testVm,
  } = parsed;
  if (sessionNamePrefix) process.env.CLAUDE_REMOTE_CONTROL_SESSION_NAME_PREFIX = sessionNamePrefix;
  let resumeSessionId = parsedSessionId,
    pointerDir,
    Be = [];
  if (permissionMode !== void 0) {
    let { PERMISSION_MODES: PERMISSION_MODES, PERMISSION_MODE_MANUAL_ALIAS: PERMISSION_MODE_MANUAL_ALIAS } =
      await import("./chunk-k6t7e4cb.js");
    if (!PERMISSION_MODES.includes(permissionMode)) {
      let mapped = PERMISSION_MODES.map((r) => (r === "default" ? PERMISSION_MODE_MANUAL_ALIAS : r));
      (console.error(`Error: Invalid permission mode '${permissionMode}'. Valid modes: ${mapped.join(", ")}`),
        process.exit(1));
    }
  }
  if (
    allowUnattendedToolCalls &&
    (process.stdin.isTTY !== !0 || process.stdout.isTTY !== !0 || env.CLAUDE_CODE_CHILD_SESSION === !0)
  )
    (console.error(
      "Error: --allow-unattended-tool-calls needs you at a terminal: it cannot start from a script, a pipe, or a Claude Code session.",
    ),
      process.exit(1));
  let dir = resolve("."),
    { enableConfigs: enableConfigs, checkHasTrustDialogAccepted: checkHasTrustDialogAccepted } =
      await import("./chunk-eesswvbz.js");
  await enableConfigs();
  let { initSinks: initSinks } = await import("./chunk-19b0wnnf.js");
  initSinks();
  let {
    setOriginalCwd: setOriginalCwd,
    setCwdState: setCwdState,
    isHomeDirectorySession: isHomeDirectorySession,
  } = await import("./chunk-nj7t53r7.js");
  if ((setOriginalCwd(dir), setCwdState(dir), !checkHasTrustDialogAccepted())) {
    let {
        canPromptForWorkspaceTrust: canPromptForWorkspaceTrust,
        offerBridgeWorkspaceTrust: offerBridgeWorkspaceTrust,
      } = await import("./chunk-p3rkx9n6.js"),
      y = await offerBridgeWorkspaceTrust({
        dir: dir,
        isHomeDir: isHomeDirectorySession(),
        canPrompt: canPromptForWorkspaceTrust(),
        storageV5: storageV5,
      });
    if (!y.trusted) (console.error(y.message), process.exit(1));
    let { resetGrowthBook: resetGrowthBook, initializeGrowthBook: initializeGrowthBook } =
      await import("./chunk-6df1d6re.js");
    (resetGrowthBook({ preservePendingExposures: !0 }),
      initializeGrowthBook().catch((F) => {
        logForDebugging(
          `[bridge:init] GrowthBook re-init after the trust prompt failed: ${F instanceof Error ? F.name : typeof F}`,
          { level: "error" },
        );
      }));
  }
  if (chrome === !0) {
    let { getChromeServerPolicyRefusal: getChromeServerPolicyRefusal } = await import("./chunk-5t6stktg.js"),
      v = getChromeServerPolicyRefusal();
    if (v !== null) (console.error(`Error: ${v} Start Remote Control without --chrome.`), process.exit(1));
  }
  let {
      clearOAuthTokenCache: clearOAuthTokenCache,
      checkAndRefreshOAuthTokenIfNeeded: checkAndRefreshOAuthTokenIfNeeded,
      waitForInFlightOAuthRefresh: waitForInFlightOAuthRefresh,
      OAUTH_REFRESH_EXIT_WAIT_CAP_MS: OAUTH_REFRESH_EXIT_WAIT_CAP_MS,
    } = await import("./chunk-7v0gj88m.js"),
    {
      getBridgeAccessToken: getBridgeAccessToken,
      getBridgeAccessTokenAsync: getBridgeAccessTokenAsync,
      getBridgeBaseUrl: getBridgeBaseUrl,
    } = await import("./chunk-prxvet9q.js"),
    useAsyncAuth = isStorageV5Enabled() && credentials !== void 0;
  if (!(useAsyncAuth ? await getBridgeAccessTokenAsync(credentials) : getBridgeAccessToken()))
    (console.error(BRIDGE_LOGIN_ERROR), process.exit(1));
  let {
    getGlobalConfig: getGlobalConfig,
    saveGlobalConfig: saveGlobalConfig,
    getCurrentProjectConfig: getCurrentProjectConfig,
    saveCurrentProjectConfig: saveCurrentProjectConfig,
  } = await import("./chunk-eesswvbz.js");
  if (!getGlobalConfig().remoteDialogSeen) {
    let readline = await import("readline"),
      rl = readline.createInterface({ input: process.stdin, output: process.stdout }),
      y = isBridgeProjectsHintEnabled()
        ? `Open the Code tab in the Claude mobile app, visit claude.ai/code in a browser,
or ask Claude to work in this folder from one of your projects on claude.ai.`
        : "Open the Code tab in the Claude mobile app, or visit claude.ai/code in a browser.";
    console.log(`
Take this session with you and pick up right where you left off on any device.
${y}

The session keeps running on this machine. Use your other devices as a remote
control. Press Ctrl+C to stop.
`);
    let answer = await new Promise((resolve) => {
      rl.question("Enable Remote Control? (y/n) ", resolve);
    });
    if ((rl.close(), answer.toLowerCase() !== "y" && answer.toLowerCase() !== "yes")) process.exit(0);
    await saveGlobalConfig((current) => {
      if (current.remoteDialogSeen) return current;
      return { ...current, remoteDialogSeen: !0 };
    }, storageV5);
  }
  if (continueSession) {
    let {
        readBridgePointerAcrossWorktrees: readBridgePointerAcrossWorktrees,
        BRIDGE_POINTER_TTL_MS: BRIDGE_POINTER_TTL_MS,
      } = await import("./chunk-8z86ydvk.js"),
      y = await readBridgePointerAcrossWorktrees(dir, storageV5, { projectThreadResume: St() });
    if (!y)
      (console.error(
        "Error: No recent session found in this directory or its worktrees. Run `claude remote-control` to start a new one.",
      ),
        process.exit(1));
    let { pointer: pointer, dir: pointerDir_2 } = y,
      ageMin = Math.round(pointer.ageMs / 60000),
      D = ageMin < 60 ? `${ageMin}m` : `${Math.round(ageMin / 60)}h`,
      ae = pointerDir_2 !== dir ? ` from worktree ${pointerDir_2}` : "";
    if (
      (console.error(`Resuming session ${pointer.sessionId} (${D} ago)${ae}\u2026`),
      (resumeSessionId = pointer.sessionId),
      pointer.ageMs > BRIDGE_POINTER_TTL_MS)
    )
      Be.push(pointer.sessionId);
    pointerDir = pointerDir_2;
  }
  let baseUrl = getBridgeBaseUrl();
  if (baseUrl.startsWith("http://") && !baseUrl.includes("localhost") && !baseUrl.includes("127.0.0.1"))
    (console.error("Error: Remote Control base URL uses HTTP. Only HTTPS or localhost HTTP is allowed."),
      process.exit(1));
  let st = baseUrl,
    {
      snapshotGitEvidenceForBridge: snapshotGitEvidenceForBridge,
      findGitRoot: findGitRoot,
      redactGitRemoteCredentials: redactGitRemoteCredentials,
    } = await import("./chunk-rqvep8jc.js"),
    { hasWorktreeCreateHook: hasWorktreeCreateHook } = await import("./chunk-zpcme3sa.js"),
    Ot = findGitRoot(dir) !== null,
    worktreeAvailable = hasWorktreeCreateHook() || Ot,
    remoteControlSpawnMode = getCurrentProjectConfig().remoteControlSpawnMode;
  if (remoteControlSpawnMode === "worktree" && !worktreeAvailable)
    (console.error(
      "Warning: Saved spawn mode is worktree but this directory is not a git repository. Falling back to same-dir.",
    ),
      (remoteControlSpawnMode = void 0),
      await saveCurrentProjectConfig((current) => {
        if (current.remoteControlSpawnMode === void 0) return current;
        return { ...current, remoteControlSpawnMode: void 0 };
      }, storageV5));
  if (
    !remoteControlSpawnMode &&
    worktreeAvailable &&
    parsedSpawnMode === void 0 &&
    !resumeSessionId &&
    process.stdin.isTTY
  ) {
    let readline = await import("readline"),
      rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log(
      `
Remote Control is launching in spawn mode, which lets you start new sessions in this project from claude.ai/code or the Claude mobile app. Learn more: https://code.claude.com/docs/en/remote-control

Spawn mode for this project:
` +
        `  [1] same-dir \u2014 sessions share the current directory (default)
` +
        `  [2] worktree \u2014 each session gets an isolated git worktree

` +
        `This can be changed later or explicitly set with --spawn=same-dir or --spawn=worktree.
`,
    );
    let answer = await new Promise((resolve) => {
      rl.question("Choose [1/2] (default: 1): ", resolve);
    });
    rl.close();
    let R = answer.trim() === "2" ? "worktree" : "same-dir";
    ((remoteControlSpawnMode = R),
      logEvent("tengu_bridge_spawn_mode_chosen", { spawn_mode: fromEnum(R) }),
      await saveCurrentProjectConfig((current) => {
        if (current.remoteControlSpawnMode === R) return current;
        return { ...current, remoteControlSpawnMode: R };
      }, storageV5));
  }
  let resumeKind, effectiveSpawnMode;
  if (resumeSessionId) ((effectiveSpawnMode = "single-session"), (resumeKind = "resume"));
  else if (parsedSpawnMode !== void 0) ((effectiveSpawnMode = parsedSpawnMode), (resumeKind = "flag"));
  else if (remoteControlSpawnMode !== void 0)
    ((effectiveSpawnMode = remoteControlSpawnMode), (resumeKind = "saved"));
  else ((effectiveSpawnMode = "same-dir"), (resumeKind = "gate_default"));
  if (resumeKind === "saved" && worktreeAvailable)
    console.log(
      `Spawn mode: ${effectiveSpawnMode} (saved for this folder${process.stdin.isTTY === !0 ? "; press w to change" : ""})`,
    );
  let maxSessions = effectiveSpawnMode === "single-session" ? 1 : (parsedCapacity ?? SPAWN_SESSIONS_DEFAULT),
    createSessionInDir = parsedCreateSessionInDir ?? !0,
    _e,
    Ge,
    Qe,
    Ae,
    lt,
    ct = [],
    Bt,
    Ue,
    Mt,
    Te = !1,
    Gt = !1,
    vt,
    Ct = !1;
  if (!resumeSessionId && createSessionInDir) {
    let {
        readBridgePointer: readBridgePointer,
        PERSISTED_SESSION_RESUME_WINDOW_MS: PERSISTED_SESSION_RESUME_WINDOW_MS,
        BRIDGE_POINTER_TTL_MS: BRIDGE_POINTER_TTL_MS,
        isPersistedStampFresh: isPersistedStampFresh,
        freshProjectThreadSessionIds: freshProjectThreadSessionIds,
        freshParkedProjectThreadSessionIds: freshParkedProjectThreadSessionIds,
      } = await import("./chunk-8z86ydvk.js"),
      D = await readBridgePointer(dir, { projectThreadResume: St() }, storageV5);
    if (D) {
      let { isProcessRunning: isProcessRunning, isSameProcessAsync: isSameProcessAsync } =
        await import("./chunk-v19g02mx.js");
      if (
        D.pid !== void 0 &&
        D.pid !== process.pid &&
        isProcessRunning(D.pid) &&
        (await isSameProcessAsync(D.pid, D.procStart))
      )
        ((Ct = !0),
          logForDebugging(
            `[bridge:init] Pointer writer pid ${D.pid} still running; registering a fresh env and deferring pointer write`,
          ));
      else if (D.source === "standalone") {
        if (((_e = D.environmentId), D.ageMs <= BRIDGE_POINTER_TTL_MS)) Ge = D.sessionId;
        if (
          D.activeSessionIdsPersistedAt !== void 0 &&
          isPersistedStampFresh(D.activeSessionIdsPersistedAt, Date.now(), PERSISTED_SESSION_RESUME_WINDOW_MS)
        )
          ((Qe = D.activeSessionIds), (Ae = D.activeSessionIdsPersistedAt));
        if (St())
          ((lt = freshProjectThreadSessionIds(D, Date.now())),
            (ct = freshParkedProjectThreadSessionIds(D, Date.now())),
            (Bt = D.parkedProjectThreadSessionIdsPersistedAt));
        logForDebugging(
          `[bridge:init] Found prior environment ${_e} in pointer (ageMs=${D.ageMs}); requesting reuse on registration`,
        );
      }
    }
  }
  if (effectiveSpawnMode === "worktree" && !worktreeAvailable)
    (console.error(
      "Error: Worktree mode requires a git repository or WorktreeCreate hooks configured. Use --spawn=session for single-session mode.",
    ),
      process.exit(1));
  let Vt = collectHostProfileIfShared(),
    Wt = allowUnattendedToolCalls
      ? await (await import("./chunk-vpsq1tp7.js")).writeUnattendedRunGrant()
      : void 0;
  if (allowUnattendedToolCalls && Wt === void 0)
    (console.error(
      "Error: --allow-unattended-tool-calls could not write to ~/.claude/state. Start it from your own terminal; a sandbox cannot write there.",
    ),
      process.exit(1));
  let dn =
      effectiveSpawnMode === "single-session"
        ? void 0
        : import("./chunk-qh5wq2v1.js")
            .then(({ startForegroundToolHost: startForegroundToolHost }) =>
              startForegroundToolHost({
                dir: dir,
                credentials: credentials,
                hasAccessToken: () => Boolean(getBridgeAccessToken()),
                unattendedGrant: Wt?.token,
                ...(guest !== void 0 && { guest: guest }),
                ...(testVm !== void 0 && { testVm: testVm }),
                verbose: verbose,
                keys: process.stdin.isTTY === !0,
              }),
            )
            .catch((_) => {
              if (
                (logError(
                  new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                    `tool hosting could not be started (${sanitizeErrorName(_) ?? typeof _})`,
                    "tool hosting could not be started",
                  ),
                ),
                logFeatureSad("bridge_tool_host_foreground", "start_failed"),
                Wt?.remove(),
                allowUnattendedToolCalls)
              )
                console.error(
                  "Cloud sessions cannot use this folder: --allow-unattended-tool-calls could not start. Remote Control runs without it.",
                );
              return;
            }),
    {
      branch: branch,
      gitRepoUrl: gitRepoUrl,
      defaultBranch: defaultBranch,
    } = await snapshotGitEvidenceForBridge(),
    machineName = hostname(),
    { getOrCreateRemoteControlMachineId: getOrCreateRemoteControlMachineId } =
      await import("./chunk-eesswvbz.js"),
    Dt = await getOrCreateRemoteControlMachineId(storageV5),
    bridgeId = randomUUID(),
    {
      handleOAuth401Error: handleOAuth401Error,
      getClaudeAIOAuthTokenOriginAsync: getClaudeAIOAuthTokenOriginAsync,
    } = await import("./chunk-7v0gj88m.js"),
    { classifyFailedOAuthRefresh: classifyFailedOAuthRefresh } = await import("./chunk-h0sbtey6.js"),
    api = createBridgeApiClient({
      baseUrl: baseUrl,
      getAccessToken: getBridgeAccessToken,
      runnerVersion: {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION,
      onDebug: logForDebugging,
      onAuth401: (_) => handleOAuth401Error(_, credentials, storageV5),
      getTrustedDeviceToken: getTrustedDeviceToken,
      untrustedDevice: {
        recover: async (_) => {
          let v = await recoverFromUntrustedDevice(_, credentials);
          return (sayHeldAutomaticEnrollmentNoticeOnStderr(), v);
        },
        hint: untrustedDeviceHint,
      },
      useCcrV2SessionCrud: isCcrV2SessionCrudEnabled,
    }),
    Le = _e,
    tt;
  if (resumeSessionId) {
    let {
        readBridgePointer: readBridgePointer,
        PERSISTED_SESSION_RESUME_WINDOW_MS: PERSISTED_SESSION_RESUME_WINDOW_MS,
        isPersistedStampFresh: isPersistedStampFresh,
        freshProjectThreadSessionIds: freshProjectThreadSessionIds,
        freshParkedProjectThreadSessionIds: freshParkedProjectThreadSessionIds,
      } = await import("./chunk-8z86ydvk.js"),
      F = pointerDir ?? dir,
      D = await readBridgePointer(F, { noClear: !0, projectThreadResume: St() }, storageV5);
    if (D?.pid !== void 0 && D.pid !== process.pid) {
      let { isProcessRunning: isProcessRunning, isSameProcessAsync: isSameProcessAsync } =
        await import("./chunk-v19g02mx.js");
      if (isProcessRunning(D.pid) && (await isSameProcessAsync(D.pid, D.procStart))) {
        if (sameSessionId(D.sessionId, resumeSessionId))
          (console.error(
            `Error: Session ${resumeSessionId} is already being served by another \`claude remote-control\` instance (pid ${D.pid}) in ${F}. Use that terminal, or stop it first.`,
          ),
            process.exit(1));
        ((Ct = !0), (tt = D));
      }
    }
    if (
      !Ct &&
      D?.source === "standalone" &&
      D.activeSessionIds?.length &&
      D.activeSessionIdsPersistedAt !== void 0 &&
      isPersistedStampFresh(D.activeSessionIdsPersistedAt, Date.now(), PERSISTED_SESSION_RESUME_WINDOW_MS) &&
      F === dir
    )
      ((_e = D.environmentId), (Qe = D.activeSessionIds), (Ae = D.activeSessionIdsPersistedAt));
    if (!Ct && D?.source === "standalone" && F === dir && St())
      ((lt = freshProjectThreadSessionIds(D, Date.now())),
        (ct = freshParkedProjectThreadSessionIds(D, Date.now())),
        (Bt = D.parkedProjectThreadSessionIdsPersistedAt),
        (Ue = D.projectThreadSessionIdsPersistedAt),
        (Mt = D.environmentId));
    try {
      validateBridgeId(resumeSessionId, "sessionId");
    } catch {
      (console.error(
        `Error: Invalid session ID "${resumeSessionId}". Session IDs must not contain unsafe characters.`,
      ),
        process.exit(1));
    }
    (await checkAndRefreshOAuthTokenIfNeeded({ credentials: credentials, storageV5: storageV5 }),
      clearOAuthTokenCache());
    let { getBridgeSessionOrStatus: getBridgeSessionOrStatus } = await import("./chunk-3eyvtwsv.js"),
      Pe = useAsyncAuth ? await getBridgeAccessTokenAsync(credentials) : void 0,
      { session: session, notFound: notFound } = await getBridgeSessionOrStatus(resumeSessionId, {
        baseUrl: baseUrl,
        getAccessToken: useAsyncAuth ? () => Pe : getBridgeAccessToken,
        credentials: credentials,
      });
    if (!session) {
      if (notFound && pointerDir) {
        let { clearBridgePointer: clearBridgePointer } = await import("./chunk-8z86ydvk.js");
        await clearBridgePointer(pointerDir, storageV5);
      }
      (console.error(
        notFound
          ? `Error: Session ${resumeSessionId} not found. It may have been archived or expired.`
          : `Error: Could not reach the server to look up session ${resumeSessionId}. Check your network or run \`claude /login\`, then try again.`,
      ),
        process.exit(1));
    }
    if (!session.environment_id) {
      if (pointerDir) {
        let { clearBridgePointer: clearBridgePointer } = await import("./chunk-8z86ydvk.js");
        await clearBridgePointer(pointerDir, storageV5);
      }
      (console.error(
        `Error: Session ${resumeSessionId} has no environment_id. It may never have been attached to a bridge.`,
      ),
        process.exit(1));
    }
    if (((Le = session.environment_id), tt && Le === tt.environmentId))
      (console.error(
        `Error: Environment ${Le} is already being served by another \`claude remote-control\` instance (pid ${tt.pid}) in ${pointerDir ?? dir}. Use that terminal, or stop it first.`,
      ),
        process.exit(1));
    ((Te = session.status === "archived"),
      logForDebugging(`[bridge:init] Resuming session ${resumeSessionId} on environment ${Le}`));
  }
  let toolHostSetup = await dn;
  logForDebugging(
    `[bridge:init] offering this folder to cloud sessions: ${toolHostSetup?.getToolHostAdvert().kind ?? "not started"}`,
  );
  let bridgeConfig = {
    dir: dir,
    machineName: machineName,
    machineId: Dt,
    branch: branch,
    gitRepoUrl: gitRepoUrl,
    maxSessions: maxSessions,
    spawnMode: effectiveSpawnMode,
    verbose: verbose,
    bridgeId: bridgeId,
    workerType: "claude_code",
    environmentId: randomUUID(),
    reuseEnvironmentId: Le,
    hostProfile: await Vt,
    apiBaseUrl: baseUrl,
    sessionIngressUrl: st,
    debugFile: debugFile,
    livePreviewPorts: enableLivePreview ? new Set(previewPorts) : void 0,
    storageV5: storageV5,
    getToolHostAdvert: toolHostSetup?.getToolHostAdvert,
  };
  if (
    (logForDebugging(
      `[bridge:init] bridgeId=${bridgeId}${Le ? ` reuseEnvironmentId=${Le}` : ""} dir=${dir} branch=${branch} gitRepoUrl=${redactGitRemoteCredentials(gitRepoUrl)} machine=${machineName}`,
    ),
    logForDebugging(`[bridge:init] apiBaseUrl=${baseUrl} sessionIngressUrl=${st}`),
    debugFile)
  )
    logForDebugging(`[bridge:init] debugFile=${debugFile}`);
  let jt = bridgeConfig.getToolHostAdvert?.(),
    Ft = await tryRegisterEnvironment({
      register: () =>
        api.registerBridgeEnvironment({ ...bridgeConfig, ...(jt && { getToolHostAdvert: () => jt }) }),
      interactive: process.stdin.isTTY === !0,
      onFailure: async (_, v) => {
        (logEvent("tengu_bridge_registration_failed", {
          status: _ instanceof BridgeFatalError ? _.status : void 0,
        }),
          await logFeatureBadAsync("remote_control_entry", "registration_failed"));
        let y =
          _ instanceof BridgeFatalError && _.status === 404
            ? "Remote Control environments are not available for your account."
            : _ instanceof BridgeFatalError && _.status !== 401 && isExpiredErrorType(_.errorType)
              ? `Error: ${withReconnectHint(_.message)}`
              : `Error: ${errorMessage(_)}`;
        console.error(
          v > 0
            ? `${y}
Exiting in about ${Math.round(v / 1000)} seconds.`
            : y,
        );
        let { flushAnalyticsBeforeExit: flushAnalyticsBeforeExit } = await import("./chunk-kahpc3cs.js");
        await flushAnalyticsBeforeExit();
      },
    });
  if (!Ft) process.exit(1);
  let {
    environment_id: environment_id,
    environment_secret: environment_secret,
    environment_secret_expires_in: environment_secret_expires_in,
  } = Ft;
  if ((classifyAdvertChange(bridgeConfig, jt, environment_id === Le), _e && !resumeSessionId))
    if (environment_id !== _e) {
      (logForDebugging(`Bridge env reuse mismatch: requested ${_e}, backend returned ${environment_id}.`, {
        level: "warn",
      }),
        console.warn(
          "Warning: Could not reuse the previous environment. Existing claude.ai/code sessions from the previous run will not reconnect.",
        ));
      let { clearBridgePointer: clearBridgePointer } = await import("./chunk-8z86ydvk.js");
      await clearBridgePointer(dir, storageV5);
    } else {
      let { writeBridgePointer: writeBridgePointer, readBridgePointer: readBridgePointer } =
          await import("./chunk-8z86ydvk.js"),
        { ownProcStartAsync: ownProcStartAsync } = await import("./chunk-v19g02mx.js");
      if (
        ((bridgeConfig.preserveOnShutdown = await writeBridgePointer(
          dir,
          {
            sessionId: Ge ?? "",
            environmentId: environment_id,
            source: "standalone",
            pid: process.pid,
            procStart: await ownProcStartAsync(),
            ...(Qe?.length && { activeSessionIds: Qe, activeSessionIdsPersistedAt: Ae }),
            ...(ct.length > 0 && {
              parkedProjectThreadSessionIds: ct,
              parkedProjectThreadSessionIdsPersistedAt: Bt,
            }),
          },
          storageV5,
        )),
        (bridgeConfig.ownsPointer = bridgeConfig.preserveOnShutdown),
        bridgeConfig.preserveOnShutdown)
      ) {
        let R = await readBridgePointer(dir, { noClear: !0 }, storageV5);
        if (R && R.pid !== void 0 && R.pid !== process.pid)
          (logForDebugging(`[bridge:init] Lost pointer write race to pid ${R.pid}; backing off`, {
            level: "error",
          }),
            console.error(
              `Error: Another \`claude remote-control\` instance (pid ${R.pid}) is already running in this directory. Exiting to avoid a split-brain conflict.`,
            ),
            process.exit(1));
      }
      if (((vt = Ge), vt)) {
        let R = toInfraSessionId(vt),
          r = R === vt ? [vt] : [vt, R],
          F = !1,
          D = [];
        for (let ae of r)
          try {
            (await api.reconnectSession(environment_id, ae),
              logForDebugging(`[bridge:init] Adopted session ${ae} re-queued via bridge/reconnect`),
              (F = !0));
            break;
          } catch (err) {
            (D.push(err),
              logForDebugging(`[bridge:init] reconnectSession(${ae}) failed: ${errorMessage(err)}`));
          }
        if (!F)
          if (D.length > 0 && D.every((ae) => ae instanceof BridgeFatalError)) vt = void 0;
          else
            logForDebugging(
              "[bridge:init] reconnectSession transient failure; session will be picked up passively once its lease expires",
              { level: "warn" },
            );
      }
      if (lt?.length) {
        Be.push(...lt);
        let R = await requeueProjectThreadSessions(api, environment_id, lt);
        logForDebugging(
          `[bridge:init] project thread sessions: ${R.requeued} re-queued, ${R.dropped} ended, ${R.deferred} left to the next message`,
        );
      }
    }
  bridgeConfig.boundedResumeSessionIds = Be;
  let Xt;
  if (resumeSessionId)
    if (Le && environment_id !== Le)
      (logForDebugging(
        `Bridge resume env mismatch: requested ${Le}, backend returned ${environment_id}. Falling back to fresh session.`,
        { level: "error" },
      ),
        console.warn(
          `Warning: Could not resume session ${resumeSessionId} \u2014 its environment has expired. Creating a fresh session instead.`,
        ));
    else {
      if (Te) Gt = await unarchiveBridgeSessionIfNeeded(resumeSessionId, baseUrl, credentials);
      let infraResumeId = toInfraSessionId(resumeSessionId),
        v = infraResumeId === resumeSessionId ? [resumeSessionId] : [resumeSessionId, infraResumeId],
        y = !1,
        R;
      for (let candidateId of v)
        try {
          (await api.reconnectSession(environment_id, candidateId),
            logForDebugging(`[bridge:init] Session ${candidateId} re-queued via bridge/reconnect`),
            (Xt = resumeSessionId),
            (y = !0),
            (bridgeConfig.preserveOnShutdown = !0),
            (bridgeConfig.ownsPointer = !1));
          break;
        } catch (err) {
          ((R = err),
            logForDebugging(`[bridge:init] reconnectSession(${candidateId}) failed: ${errorMessage(err)}`));
        }
      if (!y) {
        let r = R,
          F = r instanceof BridgeFatalError;
        if (Gt && F) await logFeatureBadAsync("bridge_session_unarchive", "abandoned_after_fatal_reconnect");
        if (pointerDir && F) {
          let { clearBridgePointer: clearBridgePointer } = await import("./chunk-8z86ydvk.js");
          await clearBridgePointer(pointerDir, storageV5);
        }
        console.error(
          F
            ? r instanceof BridgeFatalError && r.status !== 401 && isExpiredErrorType(r.errorType)
              ? `Error: ${withReconnectHint(r.message)}`
              : `Error: ${errorMessage(r)}`
            : `Error: Failed to reconnect session ${resumeSessionId}: ${errorMessage(r)}
The session may still be resumable \u2014 try running the same command again.`,
        );
        let { exitAfterAnalyticsFlush: exitAfterAnalyticsFlush } = await import("./chunk-kahpc3cs.js");
        await exitAfterAnalyticsFlush(1);
      }
    }
  logForDebugging(`[bridge:init] Registered, server environmentId=${environment_id}`);
  let startupPollConfig = getPollIntervalConfig();
  (logEvent("tengu_bridge_started", {
    max_sessions: bridgeConfig.maxSessions,
    has_debug_file: !!bridgeConfig.debugFile,
    verbose: bridgeConfig.verbose,
    heartbeat_interval_ms: startupPollConfig.non_exclusive_heartbeat_interval_ms,
    spawn_mode: fromEnum(bridgeConfig.spawnMode),
    spawn_mode_source: fromEnum(resumeKind),
    pre_create_session: createSessionInDir,
    worktree_available: worktreeAvailable,
    headless: !1,
    tool_host: fromEnum(toolHostSetup?.getToolHostAdvert().kind ?? "not_started"),
    tool_host_blocker: fromEnum(toolHostSetup?.blocker() ?? "none"),
    tool_host_without_git: toolHostSetup?.offeredWithoutGit() ?? !1,
    allow_unattended_tool_calls: allowUnattendedToolCalls,
  }),
    logFeatureOk("remote_control_entry"),
    logForDiagnosticsNoPII("info", "bridge_started", {
      max_sessions: bridgeConfig.maxSessions,
      spawn_mode: bridgeConfig.spawnMode,
    }));
  let spawner = createBridgeLogger({ verbose: verbose, projectsHint: isBridgeProjectsHintEnabled });
  if (toolHostSetup !== void 0) {
    bridgeConfig.toolHostHandler = toolHostSetup.createHandler({ api: api, logger: spawner });
    let startupNotice = await toolHostSetup.startupNotice();
    if (startupNotice !== void 0) {
      let v = wrapAnsi(
        startupNotice.unattended ? `${Gg}  ${startupNotice.text}` : startupNotice.text,
        process.stdout.columns || 80,
      );
      console.log(`${startupNotice.unattended ? sequential.yellow(v) : v}
`);
    }
    if (bridgeConfig.toolHostHandler === void 0)
      logFeatureSad("bridge_tool_host_foreground", "handler_failed");
    else logFeatureOk("bridge_tool_host_foreground");
  }
  let ht = await resolveDaemonOwner(getBridgeAccessToken),
    un = getLaunchCommand({ pinToCurrentBinary: !0 }),
    _n = createSessionSpawner({
      execPath: un.cmd,
      scriptArgs: un.prefixArgs,
      env: process.env,
      verbose: verbose,
      debugFile: debugFile,
      permissionMode: permissionMode,
      chrome: chrome,
      onDebug: logForDebugging,
      onActivity: (sessionId, activity) => {
        logForDebugging(`[bridge:activity] sessionId=${sessionId} ${activity.type} ${activity.summary}`);
      },
      onChildWarning: (_, v) => spawner.logWarning(`${v} (${_})`),
      ownerIdentity: ht,
    }),
    { parseGitHubRepository: parseGitHubRepository } = await import("./chunk-zqrznfbt.js"),
    tn = gitRepoUrl ? parseGitHubRepository(gitRepoUrl) : null,
    Dn = tn ? tn.split("/").pop() : basename(dir);
  spawner.setRepoInfo(Dn, Ot ? branch : "");
  let Sn = effectiveSpawnMode !== "single-session" && worktreeAvailable;
  if (Sn) spawner.setSpawnModeDisplay(effectiveSpawnMode);
  let onStdinData = (data) => {
      let v = firstByte(data);
      if (v === 3 || v === 4) {
        process.emit("SIGINT");
        return;
      }
      if (v === 120) {
        toolHostSetup?.disconnectKey();
        return;
      }
      if ((toolHostSetup?.cancelDisconnect(), v === 32)) {
        spawner.toggleQr();
        return;
      }
      if (v === 119) {
        if (!Sn) return;
        let y = bridgeConfig.spawnMode === "same-dir" ? "worktree" : "same-dir";
        ((bridgeConfig.spawnMode = y),
          logEvent("tengu_bridge_spawn_mode_toggled", { spawn_mode: fromEnum(y) }),
          spawner.logStatus(
            `Spawn mode: ${y === "worktree" ? "worktree (new sessions get isolated git worktrees)" : "same-dir (new sessions share the current directory)"}. Saved for this folder; w switches back.`,
          ),
          spawner.setSpawnModeDisplay(y),
          spawner.refreshDisplay(),
          saveCurrentProjectConfig((current) => {
            if (current.remoteControlSpawnMode === y) return current;
            return { ...current, remoteControlSpawnMode: y };
          }, storageV5));
        return;
      }
    },
    { markPrintModeSignalHandlersRegistered: markPrintModeSignalHandlersRegistered } =
      await import("./chunk-r3wdn2dp.js");
  if (process.stdin.isTTY)
    (setRawModeSafe(process.stdin, !0), process.stdin.resume(), process.stdin.on("data", onStdinData));
  let controller = new AbortController();
  controller.signal.addEventListener("abort", () => void toolHostSetup?.stopHelpers(), { once: !0 });
  let onSigint = () => {
      (logForDebugging("[bridge:shutdown] SIGINT received, shutting down"), controller.abort());
    },
    onSigterm = () => {
      (logForDebugging("[bridge:shutdown] SIGTERM received, shutting down"), controller.abort());
    },
    kn = () => {
      (logForDebugging("[bridge:shutdown] SIGHUP received, shutting down"),
        spawner.detachTerminal(),
        process.stdin.off("data", onStdinData),
        process.stdin.pause(),
        controller.abort());
    };
  (markPrintModeSignalHandlersRegistered(),
    process.on("SIGINT", onSigint),
    process.on("SIGTERM", onSigterm),
    process.on("SIGHUP", kn));
  let initialSessionId = Xt ?? vt ?? null,
    initialSessionTitle;
  if (createSessionInDir && !Xt && !vt) {
    let _ = name ?? `${getBridgeSessionNamePrefix()}-${randomWordSlug()}`,
      { createBridgeSession: createBridgeSession } = await import("./chunk-3eyvtwsv.js");
    try {
      let y = useAsyncAuth ? await getBridgeAccessTokenAsync(credentials) : void 0;
      if (
        ((initialSessionId = await createBridgeSession({
          environmentId: environment_id,
          title: _,
          gitRepoUrl: gitRepoUrl,
          branch: branch,
          defaultBranch: defaultBranch,
          signal: controller.signal,
          baseUrl: baseUrl,
          getAccessToken: useAsyncAuth ? () => y : getBridgeAccessToken,
          credentials: credentials,
          permissionMode: permissionMode,
          tags: [REMOTE_CONTROL_CLI],
        })),
        initialSessionId)
      ) {
        if (!name) initialSessionTitle = _;
        logForDebugging(`[bridge:init] Created initial session ${initialSessionId}`);
      }
    } catch (err) {
      logForDebugging(`[bridge:init] Session creation failed (non-fatal): ${errorMessage(err)}`);
    }
  }
  let pointerRefreshTimer = null,
    yn = initialSessionId ?? (bridgeConfig.preserveOnShutdown ? (Ge ?? "") : createSessionInDir ? "" : null);
  if (ct.length > 0 && environment_id === (resumeSessionId ? Mt : _e))
    ((bridgeConfig.parkedProjectThreadSessionIds = ct),
      (bridgeConfig.parkedProjectThreadSessionIdsPersistedAt = Bt));
  let pointerRecord = null;
  if (yn !== null && !Ct) {
    let {
        writeBridgePointer: writeBridgePointer,
        createBridgePointerWriteQueue: createBridgePointerWriteQueue,
        PERSISTED_SESSION_RESUME_WINDOW_MS: PERSISTED_SESSION_RESUME_WINDOW_MS,
        isPersistedStampFresh: isPersistedStampFresh,
      } = await import("./chunk-8z86ydvk.js"),
      { ownProcStartAsync: ownProcStartAsync } = await import("./chunk-v19g02mx.js"),
      F = createBridgePointerWriteQueue();
    if (
      ((bridgeConfig.enqueuePointerWrite = F),
      (pointerRecord = {
        sessionId: yn,
        environmentId: environment_id,
        source: "standalone",
        pid: process.pid,
        procStart: await ownProcStartAsync(),
        ...(environment_id === _e && Qe?.length && { activeSessionIds: Qe, activeSessionIdsPersistedAt: Ae }),
        ...(resumeSessionId &&
          environment_id === Mt &&
          lt?.length && { projectThreadSessionIds: lt, projectThreadSessionIdsPersistedAt: Ue }),
        ...(bridgeConfig.parkedProjectThreadSessionIds && {
          parkedProjectThreadSessionIds: bridgeConfig.parkedProjectThreadSessionIds,
          parkedProjectThreadSessionIdsPersistedAt: bridgeConfig.parkedProjectThreadSessionIdsPersistedAt,
        }),
      }),
      await writeBridgePointer(bridgeConfig.dir, pointerRecord, storageV5))
    )
      ((bridgeConfig.preserveOnShutdown = !0),
        (bridgeConfig.ownsPointer = !0),
        (pointerRefreshTimer = startPointerRefreshTimer(
          writeBridgePointer,
          ownProcStartAsync,
          bridgeConfig.dir,
          pointerRecord,
          storageV5,
          controller.signal,
          F,
          PERSISTED_SESSION_RESUME_WINDOW_MS,
          isPersistedStampFresh,
          () => bridgeConfig.pointerCleared === !0,
        )));
  }
  let n = bridgeConfig.enqueuePointerWrite ?? ((_) => _());
  if (bridgeConfig.ownsPointer && pointerRecord !== null && environment_id === _e && Qe?.length) {
    let _ = pointerRecord,
      v = Qe,
      { writeBridgePointer: writeBridgePointer } = await import("./chunk-8z86ydvk.js");
    bridgeConfig.onSessionServiced = (R) => {
      if (_.activeSessionIds === void 0) {
        v = [];
        return;
      }
      let r = sessionIdBody(R),
        filtered = v.filter((ae) => sessionIdBody(ae) !== r);
      if (filtered.length === v.length) return;
      if (((v = filtered), filtered.length > 0)) _.activeSessionIds = filtered;
      else (delete _.activeSessionIds, delete _.activeSessionIdsPersistedAt);
      let D = { ..._ };
      n(() => writeBridgePointer(bridgeConfig.dir, D, storageV5));
    };
  }
  try {
    await runBridgeLoop(
      bridgeConfig,
      environment_id,
      environment_secret,
      api,
      _n,
      toolHostSetup === void 0
        ? spawner
        : {
            ...spawner,
            printBanner: (_, v) => {
              (spawner.printBanner(_, v), toolHostSetup.bannerDrawn());
            },
          },
      controller.signal,
      void 0,
      initialSessionId ?? void 0,
      async () => (
        clearOAuthTokenCache(),
        await checkAndRefreshOAuthTokenIfNeeded({ credentials: credentials, storageV5: storageV5 }),
        useAsyncAuth ? await getBridgeAccessTokenAsync(credentials) : getBridgeAccessToken()
      ),
      initialSessionTitle,
      environment_secret_expires_in,
      {
        classifyFailedOAuthRefresh: classifyFailedOAuthRefresh,
        tokenOrigin: async () => {
          try {
            return await getClaudeAIOAuthTokenOriginAsync(credentials);
          } catch (error) {
            return (
              logForDebugging(
                `[bridge:poll] Could not read where the sign-in token came from: ${errorMessage(error)}`,
                { level: "warn" },
              ),
              "none"
            );
          }
        },
        forgetTokenReads: clearOAuthTokenCache,
      },
    );
  } finally {
    if (
      (await toolHostSetup?.stopHelpers(),
      toolHostSetup?.stop(),
      await Wt?.remove(),
      pointerRefreshTimer !== null)
    )
      clearInterval(pointerRefreshTimer);
    if (
      (process.off("SIGINT", onSigint),
      process.off("SIGTERM", onSigterm),
      process.off("SIGHUP", kn),
      process.stdin.off("data", onStdinData),
      process.stdin.isTTY)
    )
      setRawModeSafe(process.stdin, !1);
    process.stdin.pause();
  }
  (await waitForInFlightOAuthRefresh(OAUTH_REFRESH_EXIT_WAIT_CAP_MS), await drainRegisteredWriteQueues());
  let { flushAnalyticsBeforeExit: flushAnalyticsBeforeExit } = await import("./chunk-kahpc3cs.js");
  await flushAnalyticsBeforeExit({ waitForOAuthRefresh: !1 });
  try {
    process.exit(0);
  } catch (error) {
    process.kill(process.pid, "SIGKILL");
  }
}
//@ chunk-wbbfk060.js:99405-99494 fingerprint = BridgeHeadlessPermanentError (1)
class BridgeHeadlessPermanentError extends Error {
  constructor(e) {
    super(e);
    this.name = "BridgeHeadlessPermanentError";
  }
}
/**
 * 把 Remote Control 策略拒绝原因转成错误：org_denied → 永久错误；latched / route_missing / 其他 → 可重试的遥测安全错误。
 */
//@ chunk-wbbfk060.js:99494-99936 layout
function policyDenialError(kind, detail) {
  if (!kind) return null;
  let S = detail ?? "Remote Control is disabled by your organization's policy.";
  if (kind === "org_denied") return new BridgeHeadlessPermanentError(S);
  if (kind === "latched")
    return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      S,
      "Remote Control denied: HIPAA latch from an earlier organization (transient, re-evaluated on respawn)",
    );
  if (kind === "route_missing")
    return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      S,
      "Remote Control denied: policy route not served (404)",
    );
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    S,
    "Remote Control denied: policy cache miss (transient)",
  );
}
/**
 * 宿主（桌面/守护进程）托管的无头 Remote Control：与 bridgeMain 相同的检查与注册流程，但不交互、用回调日志，失败抛 BridgeHeadlessPermanentError 或可重试错误，最后调用 runBridgeLoop。
 */
//@ chunk-wbbfk060.js:99936-107907 fingerprint = runBridgeHeadless (0.405)
async function runBridgeHeadless(opts, signal) {
  let { dir: dir, log: log } = opts,
    U = processWrapperError();
  if (U)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${U} \u2014 Remote Control sessions are not started unwrapped; the worker retries once the launcher is fixed`,
      "Remote Control worker refused: corporate launcher unresolvable (transient)",
    );
  processChdir(dir);
  let {
    setOriginalCwd: setOriginalCwd,
    setCwdState: setCwdState,
    isHomeDirectorySession: isHomeDirectorySession,
  } = await import("./chunk-nj7t53r7.js");
  (setOriginalCwd(dir), setCwdState(dir));
  let { enableConfigs: enableConfigs, checkHasTrustDialogAccepted: checkHasTrustDialogAccepted } =
    await import("./chunk-eesswvbz.js");
  await enableConfigs();
  let { initSinks: initSinks } = await import("./chunk-19b0wnnf.js");
  initSinks();
  let { getSettingsWithErrors: getSettingsWithErrors } = await import("./chunk-0crvnfjy.js");
  if (getSettingsWithErrors().settings.disableRemoteControl === !0)
    throw new BridgeHeadlessPermanentError(REMOTE_CONTROL_DISABLED_BY_POLICY_MESSAGE);
  let {
    composePolicyLimitsClient: composePolicyLimitsClient,
    primePolicyLimitsCache: primePolicyLimitsCache,
  } = await import("./chunk-qchbrsbw.js");
  (composePolicyLimitsClient({ storageV5: opts.storageV5, credentials: opts.credentials }),
    await primePolicyLimitsCache(opts.storageV5));
  let { loadPolicyLimits: loadPolicyLimits } = await import("./chunk-qchbrsbw.js"),
    { policyDeniedReason: policyDeniedReason, policyDenyKind: policyDenyKind } =
      await import("./chunk-sbc4zy7a.js");
  await loadPolicyLimits();
  let G = policyDenialError(
    policyDenyKind("allow_remote_control"),
    policyDeniedReason("allow_remote_control", "Remote Control", "is"),
  );
  if (G) throw G;
  if (!checkHasTrustDialogAccepted()) {
    let Se = hr(dir);
    throw new BridgeHeadlessPermanentError(
      isHomeDirectorySession()
        ? `Workspace not trusted: ${Se} is the home directory, whose trust is never saved \u2014 running \`claude\` there first won't help. Run Remote Control from a project directory instead.`
        : `Workspace not trusted: ${Se}. Run \`claude\` in that directory first to accept the trust dialog.`,
    );
  }
  if (!opts.getAccessToken()) throw Error(BRIDGE_LOGIN_ERROR);
  let { getBridgeBaseUrl: getBridgeBaseUrl } = await import("./chunk-prxvet9q.js"),
    baseUrl = getBridgeBaseUrl();
  if (baseUrl.startsWith("http://") && !baseUrl.includes("localhost") && !baseUrl.includes("127.0.0.1"))
    throw new BridgeHeadlessPermanentError(
      "Remote Control base URL uses HTTP. Only HTTPS or localhost HTTP is allowed.",
    );
  let re = baseUrl,
    { snapshotGitEvidenceForBridge: snapshotGitEvidenceForBridge, findGitRoot: findGitRoot } =
      await import("./chunk-rqvep8jc.js"),
    { hasWorktreeCreateHook: hasWorktreeCreateHook } = await import("./chunk-zpcme3sa.js");
  if (opts.spawnMode === "worktree") {
    if (!(hasWorktreeCreateHook() || findGitRoot(dir) !== null))
      throw new BridgeHeadlessPermanentError(
        `Worktree mode requires a git repository or WorktreeCreate hooks. Directory ${dir} has neither.`,
      );
  }
  let Be = collectHostProfileIfShared(signal),
    {
      branch: branch,
      gitRepoUrl: gitRepoUrl,
      defaultBranch: defaultBranch,
    } = await snapshotGitEvidenceForBridge(),
    machineName = hostname(),
    { getOrCreateRemoteControlMachineId: getOrCreateRemoteControlMachineId } =
      await import("./chunk-eesswvbz.js"),
    x = await getOrCreateRemoteControlMachineId(opts.storageV5),
    bridgeId = randomUUID(),
    requestedEnvironmentId,
    ee = !1,
    ce = [],
    Re,
    le,
    h,
    L = [],
    te,
    je = [];
  {
    let {
        readBridgePointer: readBridgePointer,
        PERSISTED_SESSION_RESUME_WINDOW_MS: PERSISTED_SESSION_RESUME_WINDOW_MS,
        isPersistedStampFresh: isPersistedStampFresh,
        freshProjectThreadSessionIds: freshProjectThreadSessionIds,
        freshParkedProjectThreadSessionIds: freshParkedProjectThreadSessionIds,
      } = await import("./chunk-8z86ydvk.js"),
      pointer = await readBridgePointer(dir, { projectThreadResume: St() }, opts.storageV5);
    if (pointer) {
      let { isProcessRunning: isProcessRunning, isSameProcessAsync: isSameProcessAsync } =
        await import("./chunk-v19g02mx.js");
      if (
        pointer.pid !== void 0 &&
        pointer.pid !== process.pid &&
        isProcessRunning(pointer.pid) &&
        (await isSameProcessAsync(pointer.pid, pointer.procStart))
      )
        ((ee = !0),
          log(
            `pointer writer pid ${pointer.pid} still running; registering fresh env, deferring pointer write`,
          ));
      else if (pointer.source === "standalone") {
        if (
          ((requestedEnvironmentId = pointer.environmentId),
          opts.persistActiveSessionsOnShutdown &&
            pointer.activeSessionIdsPersistedAt !== void 0 &&
            isPersistedStampFresh(
              pointer.activeSessionIdsPersistedAt,
              Date.now(),
              PERSISTED_SESSION_RESUME_WINDOW_MS,
            ))
        )
          ((ce = pointer.activeSessionIds ?? []), (Re = pointer.activeSessionIdsPersistedAt));
        if (St())
          ((le = freshProjectThreadSessionIds(pointer, Date.now())),
            (L = freshParkedProjectThreadSessionIds(pointer, Date.now())),
            (te = pointer.parkedProjectThreadSessionIdsPersistedAt),
            (h = pointer.projectThreadSessionIdsPersistedAt));
        log(
          `found prior environment ${requestedEnvironmentId} in pointer (ageMs=${pointer.ageMs}); requesting reuse on registration`,
        );
      }
    }
  }
  let bridgeConfig = {
      dir: dir,
      machineName: machineName,
      machineId: x,
      branch: branch,
      gitRepoUrl: gitRepoUrl,
      maxSessions: opts.capacity,
      spawnMode: opts.spawnMode,
      verbose: !1,
      bridgeId: bridgeId,
      workerType: "claude_code",
      environmentId: randomUUID(),
      reuseEnvironmentId: requestedEnvironmentId,
      hostProfile: await Be,
      apiBaseUrl: baseUrl,
      sessionIngressUrl: re,
      storageV5: opts.storageV5,
      onBusyChange: opts.onBusyChange,
      persistActiveSessionsOnShutdown: opts.persistActiveSessionsOnShutdown,
      awaitShutdownCause: opts.awaitShutdownCause,
      getToolHostAdvert: opts.getToolHostAdvert,
    },
    api = createBridgeApiClient({
      baseUrl: baseUrl,
      getAccessToken: opts.getAccessToken,
      runnerVersion: {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION,
      onDebug: log,
      onAuth401: opts.onAuth401,
      getTrustedDeviceToken: getTrustedDeviceToken,
      useCcrV2SessionCrud: isCcrV2SessionCrudEnabled,
    }),
    environmentId,
    Fe,
    Ie;
  try {
    let Se = bridgeConfig.getToolHostAdvert?.(),
      reg = await api.registerBridgeEnvironment({
        ...bridgeConfig,
        ...(Se && { getToolHostAdvert: () => Se }),
      });
    ((environmentId = reg.environment_id),
      (Fe = reg.environment_secret),
      (Ie = reg.environment_secret_expires_in),
      classifyAdvertChange(bridgeConfig, Se, environmentId === requestedEnvironmentId));
  } catch (err) {
    throw Error(`Bridge registration failed: ${errorMessage(err)}`, { cause: err });
  }
  logEvent("tengu_bridge_started", {
    max_sessions: bridgeConfig.maxSessions,
    spawn_mode: fromEnum(bridgeConfig.spawnMode),
    heartbeat_interval_ms: getPollIntervalConfig().non_exclusive_heartbeat_interval_ms,
    headless: !0,
  });
  let st = [],
    mt = [];
  if (environmentId === requestedEnvironmentId && le?.length) {
    let Se = new Set(ce.map(sessionIdBody)),
      filtered = le.filter((Ge) => !Se.has(sessionIdBody(Ge)));
    bridgeConfig.boundedResumeSessionIds = filtered;
    let _e = await requeueProjectThreadSessions(api, environmentId, filtered, signal);
    ((je = _e.unattempted),
      log(
        `project thread sessions: ${_e.requeued} re-queued, ${_e.dropped} ended, ${_e.deferred} left to the next message, ${_e.unattempted.length} carried`,
      ),
      logEvent("tengu_bridge_project_thread_requeue", {
        requested: filtered.length,
        requeued: _e.requeued,
        dropped: _e.dropped,
        deferred: _e.deferred,
        unattempted: _e.unattempted.length,
      }));
  }
  if (environmentId === requestedEnvironmentId && L.length > 0)
    ((bridgeConfig.parkedProjectThreadSessionIds = L),
      (bridgeConfig.parkedProjectThreadSessionIdsPersistedAt = te));
  if (environmentId === requestedEnvironmentId && ce.length > 0) {
    ((bridgeConfig.carriedSessionIds = ce),
      log(`re-queuing ${ce.length} session(s) interrupted by the previous shutdown`));
    let Se = !1;
    for (let [ke, _e] of ce.entries()) {
      if (signal.aborted) {
        ((Se = !0), (st = ce.slice(ke)));
        break;
      }
      let Ge = await describeReregisterOutcome(api, environmentId, _e, signal);
      if ((log(`re-queue ${_e}: ${Ge}`), Ge === "aborted")) {
        ((Se = !0), (st = ce.slice(ke)));
        break;
      }
      if (Ge === "retry") mt.push(_e);
    }
    if (!Se && mt.length === 0) logFeatureOk("bridge_shutdown_requeue");
  } else if (ce.length > 0) logFeatureBad("bridge_shutdown_requeue", "env_reuse_declined");
  if (mt.length > 0 || st.length > 0)
    ((bridgeConfig.initialSessionRequeues = [...st, ...mt]),
      (bridgeConfig.initialSessionRequeuesPersistedAt = Re));
  let spawner = createHeadlessBridgeLogger(log);
  try {
    bridgeConfig.toolHostHandler = opts.createToolHostHandler?.({ api: api, logger: spawner });
  } catch (error) {
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `tool-host handler could not be built (${sanitizeErrorName(error) ?? typeof error})`,
        "tool-host handler could not be built",
      ),
    );
  }
  let bt = await resolveDaemonOwner(opts.getAccessToken),
    logger = getLaunchCommand({ pinToCurrentBinary: !0 }),
    Ot = createSessionSpawner({
      execPath: logger.cmd,
      scriptArgs: logger.prefixArgs,
      env: process.env,
      verbose: !1,
      permissionMode: opts.permissionMode,
      onDebug: log,
      onChildWarning: (Se, ke) => spawner.logWarning(`${ke} (${Se})`),
      ownerIdentity: bt,
    });
  spawner.printBanner(bridgeConfig, environmentId);
  let $e;
  if (opts.createSessionOnStart) {
    let { createBridgeSession: createBridgeSession } = await import("./chunk-3eyvtwsv.js");
    try {
      let sid = await createBridgeSession({
        environmentId: environmentId,
        title: opts.name,
        gitRepoUrl: gitRepoUrl,
        branch: branch,
        defaultBranch: defaultBranch,
        signal: signal,
        baseUrl: baseUrl,
        getAccessToken: opts.getAccessToken,
        permissionMode: opts.permissionMode,
        tags: [REMOTE_CONTROL_AUTO],
      });
      if (sid) (($e = sid), log(`created initial session ${sid}`));
    } catch (err) {
      log(`session pre-creation failed (non-fatal): ${errorMessage(err)}`);
    }
  }
  let pt = null;
  if (!ee) {
    if (requestedEnvironmentId && environmentId !== requestedEnvironmentId)
      log(
        `env reuse mismatch: requested ${requestedEnvironmentId}, backend returned ${environmentId}; existing sessions will not reconnect`,
      );
    let {
        writeBridgePointer: writeBridgePointer,
        createBridgePointerWriteQueue: createBridgePointerWriteQueue,
        PERSISTED_SESSION_RESUME_WINDOW_MS: PERSISTED_SESSION_RESUME_WINDOW_MS,
        isPersistedStampFresh: isPersistedStampFresh,
      } = await import("./chunk-8z86ydvk.js"),
      { ownProcStartAsync: ownProcStartAsync } = await import("./chunk-v19g02mx.js"),
      Ae = {
        sessionId: $e ?? "",
        environmentId: environmentId,
        source: "standalone",
        pid: process.pid,
        procStart: await ownProcStartAsync(),
        ...(st.length > 0 && { activeSessionIds: st, activeSessionIdsPersistedAt: Re }),
        ...(je.length > 0 && { projectThreadSessionIds: je, projectThreadSessionIdsPersistedAt: h }),
        ...(bridgeConfig.parkedProjectThreadSessionIds && {
          parkedProjectThreadSessionIds: bridgeConfig.parkedProjectThreadSessionIds,
          parkedProjectThreadSessionIdsPersistedAt: bridgeConfig.parkedProjectThreadSessionIdsPersistedAt,
        }),
      };
    if (
      ((bridgeConfig.preserveOnShutdown = await writeBridgePointer(dir, Ae, opts.storageV5)),
      (bridgeConfig.ownsPointer = bridgeConfig.preserveOnShutdown),
      bridgeConfig.preserveOnShutdown)
    )
      ((bridgeConfig.enqueuePointerWrite = createBridgePointerWriteQueue()),
        (pt = startPointerRefreshTimer(
          writeBridgePointer,
          ownProcStartAsync,
          dir,
          Ae,
          opts.storageV5,
          signal,
          bridgeConfig.enqueuePointerWrite,
          PERSISTED_SESSION_RESUME_WINDOW_MS,
          isPersistedStampFresh,
          () => bridgeConfig.pointerCleared === !0,
        )));
  }
  let We;
  try {
    We = await runBridgeLoop(
      bridgeConfig,
      environmentId,
      Fe,
      api,
      Ot,
      spawner,
      signal,
      void 0,
      $e,
      async () => opts.getAccessToken(),
      void 0,
      Ie,
    );
  } finally {
    if (pt) clearInterval(pt);
  }
  let qe = We && policyDenialError(We.kind, We.detail);
  if (qe) throw qe;
}
//@ chunk-wbbfk060.js:107907-108740 fingerprint = createHeadlessBridgeLogger (0.953)
function createHeadlessBridgeLogger(log) {
  let noop = () => {};
  return {
    printBanner: (cfg, envId) =>
      log(
        `registered environmentId=${envId} dir=${cfg.dir} spawnMode=${cfg.spawnMode} capacity=${cfg.maxSessions}`,
      ),
    logSessionStart: (id, P) => log(`session start ${id}`),
    logSessionComplete: (id, ms) => log(`session complete ${id} (${ms}ms)`),
    logSessionFailed: (id, err) => log(`session failed ${id}: ${err}`),
    logStatus: log,
    logVerbose: log,
    logError: (S) => log(`error: ${S}`),
    logWarning: (ms) => log(`warning: ${ms}`),
    logReconnected: (S) => log(`reconnected after ${S}ms`),
    addSession: (id, P) => log(`session attached ${id}`),
    removeSession: (id) => log(`session detached ${id}`),
    updateIdleStatus: noop,
    updateReconnectingStatus: noop,
    updateSessionStatus: noop,
    updateSessionActivity: noop,
    updateSessionCount: noop,
    setSpawnModeDisplay: noop,
    setRepoInfo: noop,
    setDebugLogPath: noop,
    setAttached: noop,
    setSessionTitle: noop,
    clearStatus: noop,
    toggleQr: noop,
    refreshDisplay: noop,
    setCloudSessionsStatus: noop,
    detachTerminal: noop,
  };
}
/**
 * 错误是否标记为可抑制（suppressible）。
 */
//@ chunk-b30925fy.js:10731-10769 placement
function isSuppressibleError(error) {
  return error.suppressible;
}
/**
 * 错误分类给遥测：auth_failed / http_error / no_token / request_failed。
 */
//@ chunk-b30925fy.js:10769-10996 placement
function classifyApiError(error) {
  if (error instanceof BridgeFatalError) return error.status === 401 ? "auth_failed" : "http_error";
  if (error instanceof Error) {
    if (error.message === BRIDGE_LOGIN_INSTRUCTION) return "no_token";
    if ("status" in error && typeof error.status === "number") return "http_error";
  }
  return "request_failed";
}
/**
 * 取响应体里的 error.type。
 */
//@ chunk-b30925fy.js:10996-11165 placement = extractErrorTypeFromData (1)
function extractErrorTypeFromData(data) {
  if (data && typeof data === "object") {
    if (
      "error" in data &&
      data.error &&
      typeof data.error === "object" &&
      "type" in data.error &&
      typeof data.error.type === "string"
    )
      return data.error.type;
  }
  return;
}
/**
 * environment secret 续期参数：最少剩余 1 小时才续期，提前量为有效期的 1/10（夹在 15 分钟到 1 天之间）再加最多 25% 抖动。
 */
//@ chunk-b30925fy.js:11165-11237 layout
var RENEW_MAX_ATTEMPTS = 3,
  RENEW_MAX_JITTER_PCT = 20,
  MIN_RENEW_LEAD_MS = 60000,
  RENEW_ONE_HOUR_MS = 3600000,
  MIN_RENEW_BEFORE_MS = 900000,
  MAX_RENEW_BEFORE_MS = 86400000,
  RENEW_JITTER_FRACTION = 0.25,
  MIN_RENEWABLE_LIFETIME_MS = 3600000;
/**
 * 根据 expires_in 计算带抖动的续期时间点；剩余不足 1 小时返回 undefined。
 */
//@ chunk-b30925fy.js:11237-11408 fingerprint = addJitter (0.694)
function computeSecretRenewAt(expiresInSeconds, now = Date.now(), random = Math.random) {
  if (
    typeof expiresInSeconds !== "number" ||
    !Number.isFinite(expiresInSeconds) ||
    expiresInSeconds * 1000 < MIN_RENEWABLE_LIFETIME_MS
  )
    return;
  let y = expiresInSeconds * 1000,
    v =
      Math.min(Math.max(y / 10, MIN_RENEW_BEFORE_MS), MAX_RENEW_BEFORE_MS) *
      (1 + RENEW_JITTER_FRACTION * random());
  return now + y - v;
}
//@ chunk-b30925fy.js:11408-11447 layout
var RENEW_RETRY_MIN_MS = 300000,
  RENEW_RETRY_MAX_MS = 3600000,
  RENEW_RETRY_LIMIT = 3,
  RENEW_FAILURE_LIMIT = 5;
/**
 * 环境通告变化、密钥即将过期或轮询 401 时重新注册环境（[bridge:poll]）。
 */
//@ chunk-b30925fy.js:11447-14560 placement
async function reregisterEnvironment({
  api: api,
  config: config,
  environmentId: environmentId,
  activeSessions: activeSessions,
  attempt: attempt,
  trigger: trigger,
  signal: signal,
}) {
  if (trigger === "tool_host_advert_changed")
    logForDebugging(
      `[bridge:poll] What this environment advertises changed; re-registering environment ${environmentId} (attempt ${attempt})`,
    );
  else if (trigger === "proactive")
    logForDebugging(
      `[bridge:poll] Environment secret expires soon; re-registering environment ${environmentId} to renew it (attempt ${attempt})`,
      { level: "info" },
    );
  else
    logForDebugging(
      `[bridge:poll] Poll returned ${trigger === "poll_401" ? 401 : 404}; re-registering environment ${environmentId} (attempt ${attempt}/${RENEW_MAX_ATTEMPTS})`,
      { level: "warn" },
    );
  let h, R;
  try {
    let { hostProfile: hostProfile, ...i } = config,
      o = await filterSharedEnvironment(hostProfile);
    config.hostProfile = o;
    let s = config.getToolHostAdvert?.();
    ((R = s),
      (h = await api.registerBridgeEnvironment(
        {
          ...i,
          ...(o && { hostProfile: o }),
          ...(s && { getToolHostAdvert: () => s }),
          reuseEnvironmentId: environmentId,
        },
        signal,
      )));
  } catch (error) {
    let i =
        error instanceof Error && error.message === BRIDGE_LOGIN_INSTRUCTION ? 401 : fatalClientStatus(error),
      o = i !== void 0;
    if (
      (logForDebugging(
        `[bridge:poll] Re-registration of ${environmentId} ${o ? "rejected" : "failed transiently"}: ${errorMessage(error)}`,
        { level: o ? "error" : "warn" },
      ),
      !o && R !== void 0 && R.kind !== "unknown" && !isSameAdvertState(R, config.registeredToolHostAdvert))
    )
      config.registeredToolHostAdvert = "unconfirmed";
    if (signal.aborted) return { outcome: "transient" };
    if (
      (logEvent("tengu_bridge_env_reregister", {
        attempt: attempt,
        outcome: o ? lit("register_rejected") : lit("register_transient"),
        trigger: fromEnum(trigger),
      }),
      i !== void 0)
    ) {
      if (trigger === "tool_host_advert_changed")
        logFeatureSad("bridge_env_reregister", "advert_register_rejected");
      else if (trigger === "proactive") logFeatureSad("bridge_env_reregister", "proactive_register_rejected");
      else logFeatureBad("bridge_env_reregister", "register_rejected");
      return { outcome: "fatal", reason: "register_rejected", status: i, message: errorMessage(error) };
    }
    return { outcome: "transient", retryAfterMs: retryAfterMsOf(error) };
  }
  if (h.environment_id !== environmentId) {
    if (
      (logForDebugging(
        `[bridge:poll] Re-registration returned ${h.environment_id}, not ${environmentId}; not adopting it`,
        { level: "warn" },
      ),
      logEvent("tengu_bridge_env_reregister", {
        attempt: attempt,
        outcome: lit("replaced"),
        trigger: fromEnum(trigger),
      }),
      trigger === "tool_host_advert_changed")
    )
      logFeatureSad("bridge_env_reregister", "advert_replaced");
    else if (trigger === "proactive") logFeatureSad("bridge_env_reregister", "proactive_replaced");
    else logFeatureBad("bridge_env_reregister", "replaced");
    return (
      await api
        .deregisterEnvironment(h.environment_id)
        .catch((r) =>
          logForDebugging(
            `[bridge:poll] Failed to delete replacement environment ${h.environment_id}: ${errorMessage(r)}`,
            { level: "warn" },
          ),
        ),
      { outcome: "fatal", reason: "replaced" }
    );
  }
  classifyAdvertChange(config, R, !0);
  let k = [...activeSessions.keys()];
  if (
    (logEvent("tengu_bridge_env_reregister", {
      attempt: attempt,
      outcome: lit("reregistered"),
      active_sessions: k.length,
      trigger: fromEnum(trigger),
    }),
    logForDiagnosticsNoPII("info", "bridge_env_reregistered", {
      attempt: attempt,
      active_sessions: k.length,
      trigger: trigger,
    }),
    trigger === "proactive")
  )
    return (
      logForDebugging(`[bridge:poll] Environment ${environmentId} re-registered in place; secret renewed`, {
        level: "info",
      }),
      {
        outcome: "reregistered",
        environmentSecret: h.environment_secret,
        ...(h.environment_secret_expires_in !== void 0 && {
          environmentSecretExpiresIn: h.environment_secret_expires_in,
        }),
        pendingRequeues: [],
      }
    );
  logForDebugging(
    `[bridge:poll] Environment ${environmentId} re-registered in place; re-queuing ${k.length} session(s)`,
    { level: "info" },
  );
  let S = [];
  for (let r of k) {
    if (signal.aborted) break;
    if (!activeSessions.has(r)) continue;
    if ((await describeReregisterOutcome(api, environmentId, r, signal)) !== "done") S.push(r);
  }
  return {
    outcome: "reregistered",
    environmentSecret: h.environment_secret,
    ...(h.environment_secret_expires_in !== void 0 && {
      environmentSecretExpiresIn: h.environment_secret_expires_in,
    }),
    pendingRequeues: S,
  };
}
//@ chunk-b30925fy.js:14560-15121 placement
async function describeAdvertChange({
  api: api,
  config: config,
  environmentId: environmentId,
  activeSessions: activeSessions,
  pacing: pacing,
  signal: signal,
}) {
  let T;
  try {
    let R = config.getToolHostAdvert?.();
    if (R === void 0 || R.kind === "unknown") return;
    if (isSameAdvertState(R, config.registeredToolHostAdvert)) {
      pacing.failures = 0;
      return;
    }
    let k = pacing.notBefore - Date.now();
    if (k > 0 && k <= RENEW_ONE_HOUR_MS) return;
    T = await reregisterEnvironment({
      api: api,
      config: config,
      environmentId: environmentId,
      activeSessions: activeSessions,
      attempt: pacing.failures + 1,
      trigger: "tool_host_advert_changed",
      signal: signal,
    });
  } catch (error) {
    if (!signal.aborted) logError(error);
  }
  let h = T?.outcome === "reregistered" ? T : void 0;
  return (
    (pacing.failures = h ? 0 : pacing.failures + 1),
    (pacing.notBefore = Date.now() + Math.min(MIN_RENEW_LEAD_MS * 2 ** pacing.failures, RENEW_ONE_HOUR_MS)),
    h
  );
}
//@ chunk-b30925fy.js:15121-15422 placement
function classifyAdvertChange(e, n, p) {
  if (n === void 0 || (n.kind === "unknown" && p)) return;
  let registeredToolHostAdvert = e.registeredToolHostAdvert,
    u = n.kind === "advertise" ? { kind: "advertise", advert: n.advert } : { kind: "withdraw" };
  if (
    ((e.registeredToolHostAdvert = u),
    !isSameAdvertState(u, registeredToolHostAdvert ?? { kind: "withdraw" }))
  )
    logEvent("tengu_bridge_tool_host_advert", { advertised: u.kind === "advertise" });
}
//@ chunk-b30925fy.js:15422-15701 placement
async function describeReregisterOutcome(e, n, p, y) {
  try {
    return (await e.reconnectSession(n, p, y), "done");
  } catch (error) {
    let v = Mbo(error);
    if (
      (logForDebugging(
        `[bridge:poll] reconnectSession(${p}) after re-registration ${v ? "rejected" : "failed transiently"}: ${errorMessage(error)}`,
        { level: "warn" },
      ),
      v)
    )
      return "done";
    return y.aborted ? "aborted" : "retry";
  }
}
//@ chunk-b30925fy.js:15701-15847 placement
function isSameAdvertState(e, n) {
  if (n === void 0 || n === "unconfirmed") return !1;
  return e.kind === "advertise" && n.kind === "advertise" ? En(e.advert, n.advert) : e.kind === n.kind;
}
/**
 * 错误对象中的 retryAfterMs。
 */
//@ chunk-b30925fy.js:15847-15969 placement
function retryAfterMsOf(e) {
  return e && typeof e === "object" && "retryAfterMs" in e && typeof e.retryAfterMs === "number"
    ? e.retryAfterMs
    : void 0;
}
//@ chunk-b30925fy.js:15969-16006 placement
function Mbo(e) {
  return fatalClientStatus(e) !== void 0;
}
//@ chunk-b30925fy.js:16006-16207 placement
function fatalClientStatus(e) {
  if (e instanceof BridgeFatalError) return e.status;
  if (
    e &&
    typeof e === "object" &&
    "status" in e &&
    typeof e.status === "number" &&
    e.status >= 400 &&
    e.status < 500 &&
    e.status !== 408 &&
    e.status !== 429
  )
    return e.status;
  return;
}
//@ chunk-0knprqgt.js:13682-13722 fingerprint = isConnectionError (1)
function isCodeSegment(err) {
  return err.kind === "code";
}
//@ chunk-3nztfxrw.js:44430-44564 fingerprint = formatDelay (0.486)
function formatDelay(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms % 60000 === 0) return `${ms / 60000}min`;
  return ms % 1000 === 0 ? `${ms / 1000}s` : `${(ms / 1000).toFixed(1)}s`;
}

export { isCodeSegment, formatDelay, retryAfterMsOf, Mbo, classifyApiError, extractErrorTypeFromData };
