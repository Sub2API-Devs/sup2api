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
import { string, u, literal } from "../../vendor/zod/v4/classic/schemas.js";
import { logError } from "../utils/log.js";
import { logForDebugging } from "../utils/debug.js";
import { sleep, backoffDelayMs, systemClock } from "../utils/sleep.js";
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
import { readBridgeSessionTags, fetchBridgeSessionTags } from "./sessionTags.js";
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
import { sanitizeMarkName } from "../utils/startupMarks.js";
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
import { WARNING_GLYPH } from "../utils/permissions/autoModeRulesPrompt.js";
import { sequential } from "../utils/sequential.js";
import { resolveDaemonOwner } from "./ownerPin.js";
import { getLaunchCommand } from "../utils/deepLink/registerProtocol.js";
import { setRawModeSafe } from "../ink/setRawModeSafe.js";
import { randomWordSlug } from "../utils/words.js";
import { REMOTE_CONTROL_CLI, REMOTE_CONTROL_AUTO } from "./sessionOrigins.js";
import { drainRegisteredWriteQueues } from "../utils/settings/writeQueues.js";
import { processChdir } from "../utils/fsOperations.js";
import { REMOTE_CONTROL_DISABLED_BY_POLICY_MESSAGE } from "./remoteControlPolicy.js";
import { stripInvisibleChars } from "../utils/invisibleChars.js";
import { En } from "../../vendor/lodash-es/_inlinedHelpers.js";

//@ chunk-wbbfk060.js:19719-19899 sole-consumer
var BRIDGE_WATCH_DEADLINE_MS = 210000;
var WATCH_CONNECT_DEADLINE_MS = 30000;
var WATCH_BACKOFF_BASE_MS = 15000;
var WATCH_BACKOFF_CAP_MS = 60000;
var WATCH_HEALTHY_SESSION_MS = 30000;
var WATCH_JITTER_AFTER_HEALTHY_MS = 20000;
var WATCH_SILENCE_TIMEOUT_MS = 45000;
var WATCH_TICK_INTERVAL_MS = 15000;
var WATCH_SESSION_LIFETIME_MIN_MS = 360000;
var WATCH_SESSION_LIFETIME_MAX_MS = 540000;
var WATCH_MAX_START_FAILURES = 3;
var WATCH_PARK_FALLBACK_MS = 3600000;
var WATCH_PARK_AUTH_FAILED_MS = 900000;
var WATCH_RATE_LIMIT_RETRY_MS = 30000;
var WATCH_RETRY_AFTER_CAP_MS = 600000;
var WATCH_MAX_PENDING_SSE_CHARS = 1048576;
var PRINTABLE_TOKEN_RE = /^[\x21-\x7e]{1,4096}$/;
//@ chunk-wbbfk060.js:19899-19962 sole-consumer
function clockSnapshot(e) {
  return {
    wall: e.now(),
    monotonic: e.monotonicNow(),
  };
}
//@ chunk-wbbfk060.js:19962-20308 sole-consumer
/**
 * 桥会话响应 schema（字符串长度上限、可空字段）。
 */
var BoundedStringSchema = DoctorLazy(() => string().max(256));
var OptionalBoundedString = DoctorLazy(() =>
  BoundedStringSchema()
    .nullish()
    .transform((e) => e ?? undefined),
);
var BridgeSessionSchema = DoctorLazy(() =>
  u({
    id: BoundedStringSchema().min(1),
    environment_id: OptionalBoundedString(),
    status: OptionalBoundedString(),
    worker_status: OptionalBoundedString(),
    last_event_at: OptionalBoundedString(),
    external_metadata: u({
      tool_host_status: u({
        state: literal("requested"),
        environment_id: BoundedStringSchema().min(1),
        requested_at: BoundedStringSchema().min(1),
      })
        .optional()
        .catch(undefined),
    })
      .optional()
      .catch(undefined),
  }),
);
//@ chunk-wbbfk060.js:20308-24495 sole-consumer
/**
 * 维护 off/连接中/已连接等状态，状态变化回调 onStateChange；每次尝试带代号与中止控制器， 失败按 HTTP 状态决定结束或在退避后重试；用墙钟与单调钟的差检测休眠。
 */
function createBridgeWatcher(e) {
  let { api, clock, random } = e;
  let watchState = "off";
  let attemptGeneration = 0;
  let attemptAbort;
  let j;
  let ne;
  let W;
  let Q = {
    wall: 0,
    monotonic: 0,
  };
  let me = Q;
  let se = -1 / 0;
  let Z;
  function elapsedSince(E) {
    return Math.max(clock.now() - E.wall, clock.monotonicNow() - E.monotonic);
  }
  let be = WATCH_SESSION_LIFETIME_MIN_MS;
  let Oe = 0;
  let G = 0;
  function callSafely(onDroppedFrame) {
    try {
      onDroppedFrame();
    } catch (error) {
      logError(error);
    }
  }
  function q(E, B) {
    if (E !== watchState) {
      logForDebugging(`[bridge:watch] ${watchState} -> ${E}${B ? ` after ${B}` : ""}`);
      watchState = E;
      callSafely(() => e.onStateChange(E, B));
    }
  }
  function cancelAttempt() {
    attemptGeneration++;
    attemptAbort?.abort();
    attemptAbort = undefined;
    j?.();
    ne?.();
    j = ne = undefined;
  }
  function scheduleNextAttempt(E) {
    let B = Number.isFinite(E) ? E : WATCH_BACKOFF_CAP_MS;
    logForDebugging(`[bridge:watch] next attempt in ${Math.round(B / 1000)}s`);
    ne = clock.setTimeout(X, B, {
      unref: true,
    });
  }
  function X() {
    cancelAttempt();
    let E = attemptGeneration;
    let abortController = new AbortController();
    attemptAbort = abortController;
    Q = me = clockSnapshot(clock);
    be =
      WATCH_SESSION_LIFETIME_MIN_MS +
      random() * (WATCH_SESSION_LIFETIME_MAX_MS - WATCH_SESSION_LIFETIME_MIN_MS);
    K(E);
    Be(E, abortController.signal)
      .catch((error) => {
        if (E !== attemptGeneration)
          return {
            end: "network",
          };
        logForDebugging(
          `[bridge:watch] attempt threw ${error instanceof Error ? error.name : typeof error} ${error !== null && typeof error === "object" && "code" in error ? String(error.code) : ""}`,
          {
            level: "error",
          },
        );
        return {
          end: "network",
        };
      })
      .then((ee) => {
        if (E === attemptGeneration) Ee(ee);
      })
      .catch(logError);
    q("connecting");
  }
  function K(E) {
    j = clock.setTimeout(
      () => {
        if (E !== attemptGeneration) return;
        let B = elapsedSince(Q);
        if (B > 2 * WATCH_SILENCE_TIMEOUT_MS)
          Ee({
            end: "slept",
          });
        else if (B > WATCH_SILENCE_TIMEOUT_MS)
          Ee({
            end: watchState === "connected" ? "silent" : "connect_timeout",
          });
        else if (elapsedSince(me) > be)
          Ee({
            end: "no_sync",
          });
        else K(E);
      },
      WATCH_TICK_INTERVAL_MS,
      {
        unref: true,
      },
    );
  }
  async function Be(E, signal) {
    let ee = {
      end: "network",
    };
    let accessToken = await e.getAccessToken();
    if (E !== attemptGeneration) return ee;
    if (!accessToken)
      return {
        end: "auth",
      };
    let Re = W === undefined ? 1 / 0 : clock.now() - W.at;
    if (!(Re >= 0 && Re < BRIDGE_WATCH_DEADLINE_MS)) {
      let h = se - clock.monotonicNow();
      if (h > 0)
        await sleep(h, signal, {
          clock,
        });
      if (E !== attemptGeneration) return ee;
      Q = clockSnapshot(clock);
      W = undefined;
      se = clock.monotonicNow() + WATCH_CONNECT_DEADLINE_MS * (1 + 0.5 * random());
      let L = await api.mintResumeToken(accessToken, signal);
      if (E !== attemptGeneration) return ee;
      if (L.status !== 200)
        return L.status === 404 || L.status === 410
          ? {
              end: "http_unexpected",
            }
          : classifyWatchHttpStatus(L.status, L.retryAfterMs);
      if (L.resumeToken === undefined || !PRINTABLE_TOKEN_RE.test(L.resumeToken))
        return {
          end: "resume_token_unusable",
        };
      W = {
        value: L.resumeToken,
        at: clock.now(),
      };
    }
    if (W === undefined) return ee;
    let le = await api.open(accessToken, W.value, signal);
    if (E !== attemptGeneration) {
      le.body?.destroy();
      return ee;
    }
    if (le.status !== 200)
      return le.status === 410 && clock.now() - W.at < 30000
        ? {
            end: "http_unexpected",
          }
        : classifyWatchHttpStatus(le.status, le.retryAfterMs);
    return le.body === undefined
      ? {
          end: "not_event_stream",
        }
      : fe(le.body, signal, E);
  }
  function fe(body, B, ee) {
    return new Promise((resolve) => {
      let Re = new SSEFrameBuffer();
      let le = () => {
        body.destroy();
      };
      let h = (end) => {
        B.removeEventListener("abort", le);
        body.destroy();
        resolve({
          end,
        });
      };
      B.addEventListener("abort", le, {
        once: true,
      });
      body.on("data", (L) => {
        if (ee !== attemptGeneration) return;
        Q = clockSnapshot(clock);
        for (let te of Re.push(L)) {
          if (ee !== attemptGeneration) return;
          if (te.event === "sync") ze(te.id);
          else if (te.event === "added" || te.event === "changed") Ke(te.data);
        }
        if (Re.pendingChars > WATCH_MAX_PENDING_SSE_CHARS) h("oversized_frame");
      });
      body.on("error", () => h("network"));
      body.on("end", () => h("closed"));
      body.on("close", () => h("closed"));
    });
  }
  function ze(id) {
    if (id === undefined || !PRINTABLE_TOKEN_RE.test(id)) {
      callSafely(e.onDroppedFrame);
      return;
    }
    me = clockSnapshot(clock);
    W = {
      value: id,
      at: me.wall,
    };
    if (watchState !== "connected") {
      Z = clock.monotonicNow();
      G = 0;
      q("connected");
    }
  }
  function Ke(E) {
    let B;
    try {
      B = jsonParseRaw(E ?? "");
    } catch {
      B = undefined;
    }
    let ee = BridgeSessionSchema().safeParse(B);
    if (!ee.success) {
      callSafely(e.onDroppedFrame);
      return;
    }
    let {
      status,
      worker_status: workerStatus,
      last_event_at: lastEventAt,
      external_metadata: externalMetadata,
    } = ee.data;
    let toolHostStatus = externalMetadata?.tool_host_status;
    let te = {
      sessionId: ee.data.id,
      environmentId: ee.data.environment_id,
      archived: /(^|_)archived$/i.test(status ?? ""),
      fingerprint: `${status} ${workerStatus} ${lastEventAt}`,
      ...(toolHostStatus && {
        toolHostRequest: {
          environmentId: toolHostStatus.environment_id,
          requestedAt: toolHostStatus.requested_at,
        },
      }),
    };
    callSafely(() => e.onFrame(te));
  }
  function Ee(E) {
    let B = watchState === "connected" && Z !== undefined ? clock.monotonicNow() - Z : undefined;
    let ce =
      (E.end === "closed" || E.end === "network") && elapsedSince(Q) > 2 * WATCH_SILENCE_TIMEOUT_MS
        ? "slept"
        : E.end === "closed" && B === undefined
          ? "closed_before_sync"
          : E.end;
    let Re = B !== undefined && B >= WATCH_HEALTHY_SESSION_MS;
    cancelAttempt();
    if (Re) Oe = 0;
    let le;
    switch (ce) {
      case "not_offered":
        return He(ce, WATCH_PARK_FALLBACK_MS);
      case "auth":
        return He(ce, WATCH_PARK_AUTH_FAILED_MS);
      case "http_unexpected":
      case "resume_token_unusable":
      case "not_event_stream":
      case "oversized_frame":
        W = undefined;
        if (++G >= WATCH_MAX_START_FAILURES) return He(ce, WATCH_PARK_FALLBACK_MS);
        le = x(true);
        break;
      case "slept":
        le = 0;
        break;
      case "closed":
      case "network":
      case "silent":
      case "no_sync":
        le = Re ? random() * WATCH_JITTER_AFTER_HEALTHY_MS : x();
        break;
      case "token_expired":
        W = undefined;
        le = x();
        break;
      case "rate_limited":
      case "closed_before_sync":
      case "connect_timeout":
      case "http_retryable":
        le = x();
        break;
    }
    let h = E.retryAfterMs || (ce === "rate_limited" ? WATCH_RATE_LIMIT_RETRY_MS : 0);
    scheduleNextAttempt(Math.max(le, Math.min(h, WATCH_RETRY_AFTER_CAP_MS) * (1 + 0.5 * random())));
    q("backoff", ce);
  }
  function He(E, B) {
    scheduleNextAttempt(B * (0.5 + random()));
    q("parked", E);
  }
  function x(E = false) {
    if (!E) Oe++;
    return backoffDelayMs({
      attempt: E ? 1 / 0 : Oe,
      baseMs: WATCH_BACKOFF_BASE_MS,
      capMs: WATCH_BACKOFF_CAP_MS,
      jitter: {
        kind: "symmetric",
        ratio: 0.5,
      },
      random,
    });
  }
  return {
    start() {
      if (watchState === "off") X();
    },
    stop() {
      cancelAttempt();
      q("off");
    },
    get state() {
      return watchState;
    },
  };
}
//@ chunk-wbbfk060.js:24495-24769 sole-consumer
function classifyWatchHttpStatus(status, retryAfterMs) {
  switch (status) {
    case 401:
    case 403:
      return {
        end: "auth",
      };
    case 404:
      return {
        end: "not_offered",
      };
    case 410:
      return {
        end: "token_expired",
      };
    case 429:
      return {
        end: "rate_limited",
        retryAfterMs,
      };
    default:
      return {
        end: status >= 500 || status === 408 ? "http_retryable" : "http_unexpected",
        retryAfterMs,
      };
  }
}
//@ chunk-wbbfk060.js:24769-24919 sole-consumer
var POLL_BACKOFF_LADDER_MS = [300, 1300, 4300, 15000, 30000, 60000];
var ASK_BASE_WAIT_MS = 30000;
var ASK_MAX_WAIT_MS = 16 * ASK_BASE_WAIT_MS;
var POLL_MIN_INTERVAL_MS = 15000;
var CONNECTED_GRACE_MS = 30000;
var POLL_JITTER_RATIO = 0.25;
var TOOL_HOST_POLL_MAX_MS = 30000;
var LONG_IDLE_RESET_MS = 3600000;
var MAX_QUEUED_WORK_ITEMS = 256;
var SLEEP_GAP_WINDOW = {
  from: 290000,
  to: 305000,
  retry: 4500,
};
//@ chunk-wbbfk060.js:24919-25026 sole-consumer
function isSleepGap(e, s) {
  return (
    e !== undefined &&
    [s.wall - e.wall, s.monotonic - e.monotonic].some(
      (S) => S >= SLEEP_GAP_WINDOW.from && S < SLEEP_GAP_WINDOW.to,
    )
  );
}
//@ chunk-wbbfk060.js:25026-25088 sole-consumer
var ASK_OUTCOME_COUNTER_NAMES = {
  frame: "nudge",
  own: "own_request",
  free: "start_or_wake",
};
//@ chunk-wbbfk060.js:25088-25746 sole-consumer
/**
 * 轮询统计计数器初值。
 */
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
  let s = () => ({
    waitMs: ASK_BASE_WAIT_MS,
    startedAt: -1 / 0,
  });
  let S = {
    frame: s(),
    own: s(),
  };
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
      S = {
        frame: s(),
        own: s(),
      };
    },
  };
}
//@ chunk-wbbfk060.js:26020-29796 sole-consumer
/**
 * 已连接（或最近连上）用 connectedMs，否则 fallbackMs，提供工具主机时上限 30 秒； 外部事件可把下次轮询提前并唤醒，记录各原因的轮询与有工作次数。
 */
function createWorkPoller(e) {
  let { random } = e;
  let S = () => e.clock.monotonicNow();
  let pollerState = "off";
  let U;
  let w;
  let H;
  let j = false;
  let ne = false;
  let W = -1 / 0;
  let Q = "start_or_wake";
  let me = -1 / 0;
  let se;
  let Z;
  let askBackoff = createAskBackoff(S);
  let be = new Map();
  let seenWorkIds = new BoundedUUIDSet(64);
  let counters = createPollCounters();
  let ve = S();
  function isWithin(x, E) {
    return x !== undefined && S() - x < E;
  }
  function isConnectedRecently() {
    return pollerState === "connected" || isWithin(H, CONNECTED_GRACE_MS);
  }
  function pollIntervalMs() {
    let { connectedMs, fallbackMs } = e.intervals();
    let B = isConnectedRecently() ? connectedMs : fallbackMs;
    return e.servesToolHosts() ? Math.min(B, TOOL_HOST_POLL_MAX_MS) : B;
  }
  function setNextPoll(x, E) {
    W = x;
    Q = E;
  }
  function pullNextPollEarlier(x, E) {
    if (x < W) {
      setNextPoll(x, E);
      e.wake();
    }
  }
  function Be(x, E) {
    if (W <= S()) W = 1 / 0;
    pullNextPollEarlier(x, E);
  }
  function fe() {
    let x = S();
    let { baseMs, afterSessionEndWindowMs } = e.intervals();
    if (isWithin(se, afterSessionEndWindowMs))
      setNextPoll(x + Math.max(POLL_MIN_INTERVAL_MS, baseMs), "after_session_end");
    else
      setNextPoll(
        x + Math.max(pollIntervalMs() * (1 - POLL_JITTER_RATIO + 2 * POLL_JITTER_RATIO * random()), baseMs),
        isConnectedRecently() ? "connected" : "fallback",
      );
  }
  function ze() {
    let x = Z?.startedAt ?? -1 / 0;
    let found = POLL_BACKOFF_LADDER_MS.find((B) => x + B > S());
    return found === undefined ? undefined : x + found;
  }
  function Ke(x) {
    if (pollerState === "off") return;
    if (!e.hasRoom()) {
      Z = undefined;
      return;
    }
    if (Z !== undefined && (Z.source !== "free" || x === "free")) return;
    if (x !== "free") {
      if (!askBackoff.mayStart(x)) {
        let ce = `asks_too_soon_${ASK_OUTCOME_COUNTER_NAMES[x]}`;
        counters[ce]++;
        return;
      }
      askBackoff.started(x);
    }
    let E = ASK_OUTCOME_COUNTER_NAMES[x];
    let B = `ladders_${E}`;
    counters[B]++;
    Z = {
      startedAt: S(),
      source: x,
      cause: E,
    };
    Be(Z.startedAt + (POLL_BACKOFF_LADDER_MS[0] ?? 0), E);
  }
  function Ee(x) {
    if (x && Z !== undefined && Z.source !== "free") askBackoff.endedBarren(Z.source);
    Z = undefined;
  }
  function He(x) {
    let E = S();
    if (w !== undefined) {
      counters.connected_ms += E - w;
      w = E;
    }
    let B = U;
    logEvent("tengu_bridge_watch_summary", {
      ...counters,
      connected_ms: Math.round(counters.connected_ms),
      window_ms: Math.round(E - ve),
      state: fromEnum(x),
      last_end: fromEnumOpt(B),
    });
    counters = createPollCounters();
    ve = E;
    if (x === "connected") U = undefined;
  }
  return {
    governs() {
      return pollerState !== "off";
    },
    onWatchState(x, E) {
      let B = S();
      let ee = pollerState;
      pollerState = x;
      U = E ?? U;
      if (w !== undefined) {
        counters.connected_ms += B - w;
        w = undefined;
      }
      switch (x) {
        case "connected":
          counters.connects++;
          w = B;
          H = undefined;
          if (j || !ne) logFeatureOk("bridge_sessions_watch");
          j = false;
          ne = true;
          break;
        case "connecting":
          if (ee === "connected" || ee === "off") H = B;
          if (ee === "off") {
            counters = createPollCounters();
            ve = B;
            Ke("free");
          }
          counters.connect_attempts++;
          break;
        case "backoff":
          if (ee === "connected") H = B;
          if (E === "slept") {
            Z = undefined;
            askBackoff.reset();
            Ke("free");
          }
          break;
        case "parked":
          H = undefined;
          logFeatureBad("bridge_sessions_watch", E ?? "unknown");
          break;
        case "off":
          He(ee);
          H = se = Z = U = undefined;
          askBackoff.reset();
          j = false;
          e.wake();
          break;
      }
    },
    onFrame(x) {
      let toolHostRequest = x.toolHostRequest;
      let B = `${x.sessionId} ${toolHostRequest?.requestedAt}`;
      if (e.servesToolHosts() && toolHostRequest?.environmentId === e.environmentId && !seenWorkIds.has(B)) {
        counters.frames_tool_host_request++;
        seenWorkIds.add(B);
        Ke("frame");
      }
      if (x.environmentId !== e.environmentId) return;
      counters.frames_this_environment++;
      let ee = be.get(x.sessionId) === x.fingerprint;
      be.delete(x.sessionId);
      be.set(x.sessionId, x.fingerprint);
      for (let key of be.keys()) {
        if (be.size <= MAX_QUEUED_WORK_ITEMS) break;
        be.delete(key);
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
      se = S();
      if (ze() === undefined) Z = undefined;
      let E = se + random() * Math.max(POLL_MIN_INTERVAL_MS, e.intervals().baseMs);
      if (Q === "after_session_end" && W > se) return;
      if (x) Be(E, "after_session_end");
      else pullNextPollEarlier(E, "after_session_end");
      let B = ze();
      if (Z !== undefined && B !== undefined) pullNextPollEarlier(B, Z.cause);
    },
    noteHeartbeatOk() {
      askBackoff.forgive("own");
    },
    pollCause() {
      if (!isWithin(ve, LONG_IDLE_RESET_MS)) He(pollerState);
      if (!j && !isConnectedRecently()) {
        j = true;
        counters.fallbacks++;
        if (pollerState !== "parked") logFeatureSad("bridge_sessions_watch", U ?? "never_connected");
        pullNextPollEarlier(
          Math.max(S() + random() * pollIntervalMs(), me + pollIntervalMs() * (1 - POLL_JITTER_RATIO)),
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
          counters[Re]++;
          if (x === "connected" && pollerState === "connected" && Z === undefined)
            logEvent("tengu_bridge_watch_miss", {
              work: fromEnum(E),
            });
          if (E === "new_work") {
            askBackoff.reset();
            if (Z !== undefined) Z.source = "free";
          } else Ee(true);
          setNextPoll(B, "after_work");
          return;
        }
        case "refused":
        case "timed_out":
          counters[E === "refused" ? "failed_other" : "failed_timed_out"]++;
          Ee(true);
          break;
        case "unreachable":
          counters.failed_unreachable++;
          break;
        case "empty":
          break;
      }
      fe();
      if (Z === undefined) return;
      let ce = ze();
      if (ce === undefined) Ee(true);
      else if (ce < W) setNextPoll(ce, Z.cause);
    },
    msUntilDue() {
      return Math.max(0, W - S());
    },
    longestGapMs() {
      return Math.ceil(Math.max(pollIntervalMs() * (1 + POLL_JITTER_RATIO), e.intervals().baseMs));
    },
  };
}
//@ chunk-wbbfk060.js:29796-29823 sole-consumer
function isRcChildRestartResumeEnabled() {
  return isBridgeRcChildRestartResumeEnabled();
}
//@ chunk-wbbfk060.js:29823-30032 sole-consumer
function projectThreadPointer(sessionCompatIds, parkedProjectThreadIds) {
  if (sessionCompatIds.size === 0 && parkedProjectThreadIds.size === 0) return;
  let S = new Set([...sessionCompatIds].map(sessionIdBody));
  return {
    projectThreadSessionIds: [...sessionCompatIds].slice(0, MAX_POINTER_ACTIVE_SESSION_IDS),
    parkedProjectThreadSessionIds: [...parkedProjectThreadIds]
      .filter((P) => !S.has(sessionIdBody(P)))
      .slice(0, MAX_POINTER_ACTIVE_SESSION_IDS),
  };
}
//@ chunk-wbbfk060.js:30032-30050 sole-consumer
var MAX_PROJECT_THREAD_REQUEUES = 4;
var PROJECT_THREAD_REQUEUE_TIMEOUT_MS = 60000;
//@ chunk-wbbfk060.js:30050-30893 sole-consumer
/**
 * 通过 bridge/reconnect 重新排队项目线程会话（超时、致命错误丢弃）。
 */
async function requeueProjectThreadSessions(e, environmentId, S, signal) {
  let U = {
    requeued: 0,
    dropped: 0,
    deferred: 0,
  };
  let w = [];
  let H = signal
    ? AbortSignal.any([signal, AbortSignal.timeout(PROJECT_THREAD_REQUEUE_TIMEOUT_MS)])
    : AbortSignal.timeout(PROJECT_THREAD_REQUEUE_TIMEOUT_MS);
  let j = 0;
  async function ne() {
    while (j < S.length) {
      let W = S[j++];
      if (H.aborted) {
        w.push(W);
        continue;
      }
      let infraSessionId = toInfraSessionId(W);
      let me = infraSessionId === W ? [W] : [W, infraSessionId];
      let se = [];
      let Z = false;
      for (let M of me)
        try {
          await e.reconnectSession(environmentId, M, H);
          Z = true;
          break;
        } catch (error) {
          se.push(error);
        }
      if (Z) {
        U.requeued++;
        logForDebugging(`[bridge:init] project thread session ${W} re-queued via bridge/reconnect`);
      } else if (se.every((M) => M instanceof BridgeFatalError)) {
        U.dropped++;
        logForDebugging(
          `[bridge:init] project thread session ${W} no longer resumable: ${errorMessage(se[0])}`,
        );
      } else {
        U.deferred++;
        logForDebugging(
          `[bridge:init] project thread session ${W} reconnect transient failure; the server re-queues it on the member's next message`,
          {
            level: "warn",
          },
        );
      }
    }
  }
  await Promise.all(
    Array.from(
      {
        length: Math.min(MAX_PROJECT_THREAD_REQUEUES, S.length),
      },
      ne,
    ),
  );
  return {
    ...U,
    unattempted: w,
  };
}
//@ chunk-wbbfk060.js:30893-31061 fingerprint = DEFAULT_BACKOFF (1)
/**
 * 轮询退避默认值（连接错误 2s 起、上限 120s、10 分钟放弃；一般错误 0.5s 起、上限 30s、10 分钟放弃）及若干常量（registerWorker 重试 5 次等）。
 */
var SHUTDOWN_GRACE_MS = 15000;
var DEFAULT_BACKOFF = {
  connInitialMs: 2000,
  connCapMs: 120000,
  connGiveUpMs: 600000,
  generalInitialMs: 500,
  generalCapMs: 30000,
  generalGiveUpMs: 600000,
};
var REGISTER_WORKER_MAX_ATTEMPTS = 5;
var WORKER_RETRY_BASE_MS = 1000;
var STATUS_UPDATE_INTERVAL_MS = 120000;
var POLL_RETRY_FLOOR_MS = 3000;
//@ chunk-wbbfk060.js:31061-31097 fingerprint = pollSleepDetectionThresholdMs (1)
/**
 * 判定"系统睡眠"的阈值：两次轮询错误间隔超过 connCapMs 的两倍即重置错误预算。
 */
function pollSleepDetectionThresholdMs(backoff) {
  return backoff.connCapMs * 2;
}
//@ chunk-wbbfk060.js:31097-31198 layout
/**
 * 在致命错误文案末尾补上"重新运行 claude remote-control 以重连"。
 */
function withReconnectHint(message) {
  return `${message.replace(/[.!?]?\s*$/, ".")} Re-run \`claude remote-control\` to reconnect.`;
}
//@ chunk-wbbfk060.js:31198-31315 layout
/**
 * 错误是否表示 environment 已不存在（BridgeFatalError 404/410，或消息匹配 environment … not found）。
 */
function isEnvironmentGoneError(error) {
  if (error instanceof BridgeFatalError) return error.status === 404 || error.status === 410;
  return /environment .* not found/i.test(errorMessage(error));
}
//@ chunk-wbbfk060.js:31315-31454 fingerprint = safeSpawn (0.733)
/**
 * 调 sessionSpawner.spawn 派生子会话；抛错时记录日志并返回错误字符串。
 */
function safeSpawn(spawner, opts, dir) {
  try {
    return spawner.spawn(opts, dir);
  } catch (err) {
    let errMsg = errorMessage(err);
    logError(withTelemetryMessage(Error(`Session spawn failed: ${errMsg}`), "Session spawn failed"));
    return errMsg;
  }
}
//@ chunk-wbbfk060.js:31454-31546 layout
/**
 * 把 expires_in 秒数换成绝对过期时间戳（非正数返回 undefined）。
 */
function expiresInToDeadline(expiresInSeconds) {
  return typeof expiresInSeconds === "number" && Number.isFinite(expiresInSeconds) && expiresInSeconds > 0
    ? Date.now() + expiresInSeconds * 1000
    : undefined;
}
//@ chunk-wbbfk060.js:31546-67919 fingerprint = runBridgeLoop (0.603)
/**
 * 主轮询循环：按容量选轮询间隔（满载/部分/空闲，或由 sessions watch 调度器决定）调用 pollForWork；对每个 work 解码 work secret、ack、registerWorker 取 epoch、
 * safeSpawn 子 CLI（--sdk-url 指向 /v1/code/sessions/{id}）；维护活动会话、心跳（heartbeatWork）、超时、工作树清理与 stopWork；连接/一般错误分别指数退避，检测系统睡眠重置预算，
 * environment 丢失时重新注册；environment secret 临期时续期；退出时停止全部会话、按需重排队并注销 environment。
 */
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
  else
    parentSignal.addEventListener("abort", () => controller.abort(), {
      once: true,
    });
  let loopSignal = controller.signal;
  async function fetchSessionRecordWithRetry(n) {
    let A = {
      baseUrl: config.apiBaseUrl,
      getAccessToken,
    };
    let bridgeSessionTags = await readBridgeSessionTags(n, A);
    if (bridgeSessionTags !== null || loopSignal.aborted) return bridgeSessionTags;
    await sleep(2000, loopSignal);
    if (loopSignal.aborted) return null;
    return readBridgeSessionTags(n, A);
  }
  let Oe = {
    inFlight: undefined,
  };
  let currentEnvironmentSecret = environmentSecret;
  let secretRenewAt = computeSecretRenewAt(secretExpiresIn);
  let secretExpiresAt = expiresInToDeadline(secretExpiresIn);
  let re = false;
  let N = 0;
  let X = false;
  let reregisterAttempts = 0;
  let Be;
  let pendingCleanups = [];
  let ze;
  let Ke = false;
  let Ee = false;
  let He = 0;
  let activeSessions = new Map();
  function E(n) {
    currentEnvironmentSecret = n.environmentSecret;
    secretRenewAt = computeSecretRenewAt(n.environmentSecretExpiresIn);
    secretExpiresAt = expiresInToDeadline(n.environmentSecretExpiresIn);
    Ee = true;
    He = reregisterAttempts;
    let A = new Map(activeSessions);
    activeSessions.clear();
    for (let pendingRequeue of n.pendingRequeues)
      activeSessions.set(pendingRequeue, (A.get(pendingRequeue) ?? 0) + 1);
  }
  let pacing = {
    failures: 0,
    notBefore: 0,
  };
  let pendingRequeues = new Map((config.initialSessionRequeues ?? []).map((n) => [n, 0]));
  let ce = false;
  let settleRequeue = (n, A) => {
    let _ = sessionIdBody(n);
    let v = false;
    for (let key of [...pendingRequeues.keys()])
      if (sessionIdBody(key) === _) {
        pendingRequeues.delete(key);
        v = true;
      }
    if (!v) return;
    if (A) ce = true;
    if (pendingRequeues.size === 0)
      if (ce) logFeatureSad("bridge_shutdown_requeue", "requeue_dropped");
      else logFeatureOk("bridge_shutdown_requeue");
  };
  let le = false;
  let sessionStartTimes = new Map();
  let L = (n) => {
    let A = sessionIdBody(n);
    for (let key of sessionStartTimes.keys()) if (sessionIdBody(key) === A) return true;
    return false;
  };
  let sessionWorkIds = new Set();
  let sessionCompatIds = new Set();
  let parkedProjectThreadIds = new Set(config.parkedProjectThreadSessionIds);
  let sessionIngressTokens = new Set();
  let Ce = new BoundedUUIDSet(64);
  for (let n of [
    ...(config.parkedProjectThreadSessionIds ?? []),
    ...(config.boundedResumeSessionIds ?? []),
    ...(config.initialSessionRequeues ?? []),
    ...(config.carriedSessionIds ?? []),
  ])
    Ce.add(sessionIdBody(n));
  let sessionTimers = new Set();
  let Ie = parkedProjectThreadIds.size > 0;
  let st = new Set((config.boundedResumeSessionIds ?? []).map(sessionIdBody));
  function mt(sessionId, A) {
    let size = sessionWorkIds.size;
    if (A) sessionWorkIds.add(sessionId);
    else sessionWorkIds.delete(sessionId);
    if (sessionWorkIds.size !== size) config.onBusyChange?.(sessionWorkIds.size);
  }
  let completedWorkIds = new Map();
  let sessionWorktrees = new Map();
  let timedOutSessions = new Map();
  let titledSessions = new Map();
  let completedWorkIds_2 = new Set();
  let pt = new BoundedUUIDSet(64);
  let sessionHeartbeatState = new Map();
  let qe = new Set();
  let Se = new Set();
  let ke = new Set();
  let sessionTitleCandidates = new Map();
  let Ge;
  let Qe = initialSessionId ? toCompatSessionId(initialSessionId) : undefined;
  if (Qe && initialSessionTitle) sessionTitleCandidates.set(Qe, new Set([initialSessionTitle]));
  let Ae = 0;
  let lt = new Map();
  let capacityWake = createCapacityWake(loopSignal);
  let capacityWake_2 = createCapacityWake(loopSignal);
  let watchScheduler = createWorkPoller({
    clock: systemClock,
    random: () => Math.random(),
    environmentId,
    isRunningHere: (n) => L(n) || sessionIdBody(n) === Xt,
    servesToolHosts: () =>
      config.toolHostHandler !== undefined && config.getToolHostAdvert?.().kind !== "withdraw",
    hasRoom: () => sessionStartTimes.size < config.maxSessions,
    intervals: () => {
      let pollIntervalConfig = getPollIntervalConfig();
      return {
        baseMs:
          sessionStartTimes.size > 0
            ? pollIntervalConfig.multisession_poll_interval_ms_partial_capacity
            : pollIntervalConfig.multisession_poll_interval_ms_not_at_capacity,
        connectedMs: pollIntervalConfig.watch_connected_poll_interval_ms,
        fallbackMs: pollIntervalConfig.watch_fallback_poll_interval_ms,
        afterSessionEndWindowMs: pollIntervalConfig.watch_session_end_window_ms,
      };
    },
    wake: capacityWake_2.wake,
  });
  let sessionsWatcher =
    api.sessionsWatch &&
    getAccessToken &&
    createBridgeWatcher({
      api: api.sessionsWatch,
      getAccessToken,
      clock: systemClock,
      random: () => Math.random(),
      onFrame: watchScheduler.onFrame,
      onDroppedFrame: watchScheduler.onDroppedFrame,
      onStateChange: watchScheduler.onWatchState,
    });
  loopSignal.addEventListener("abort", () => sessionsWatcher?.stop(), {
    once: true,
  });
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
  function Gt(delay) {
    return watchScheduler.governs() ? Math.max(delay, watchScheduler.msUntilDue()) : delay;
  }
  function vt(n) {
    if (!n) return "empty";
    let id = n.data?.id;
    if (typeof n.id !== "string" || typeof id !== "string") return "refused";
    if (n.data.type !== "session") return "other_work";
    if (L(id)) return "redelivery";
    Xt = sessionIdBody(id);
    let _ = recentWorkIds.has(n.id);
    recentWorkIds.delete(n.id);
    recentWorkIds.set(n.id, systemClock.monotonicNow());
    for (let key of recentWorkIds.keys()) {
      if (recentWorkIds.size <= 256) break;
      recentWorkIds.delete(key);
    }
    return _ ? "redelivery" : "new_work";
  }
  async function heartbeatActiveWorkItems(n = 0, A) {
    let _ = false;
    let v = false;
    let y = false;
    let authFailedSessions = [];
    for (let [sessionId, F] of sessionStartTimes) {
      let workId = sessionWorktrees.get(sessionId);
      let ingressToken = F.accessToken;
      if (!workId || !ingressToken) continue;
      if (n > 0 && !Wt(sessionId, n)) continue;
      if (A !== undefined && !A.has(sessionId)) continue;
      let Pe = clockSnapshot(systemClock);
      try {
        await trackedApi.heartbeatWork(environmentId, workId, ingressToken);
        _ = true;
        heartbeatTokens.set(sessionId, Pe);
      } catch (err) {
        logForDebugging(
          `[bridge:heartbeat] Failed for sessionId=${sessionId} workId=${workId}: ${errorMessage(err)}`,
        );
        if (err instanceof BridgeFatalError) {
          logEvent("tengu_bridge_heartbeat_error", {
            status: err.status,
            error_type: lit(err.status === 401 || err.status === 403 ? "auth_failed" : "fatal"),
          });
          if (err.status === 401 || err.status === 403) authFailedSessions.push(sessionId);
          else y = true;
        } else v = true;
      }
    }
    for (let sessionId of authFailedSessions) {
      let F = cn.get(sessionId) ?? -1 / 0;
      if (watchScheduler.governs() && systemClock.monotonicNow() - F < REGISTER_RETRY_DEFAULT_MS) continue;
      cn.set(sessionId, systemClock.monotonicNow());
      logger.logVerbose(`Session ${sessionId} token expired \u2014 re-queuing via bridge/reconnect`);
      try {
        await trackedApi.reconnectSession(environmentId, sessionId);
        logForDebugging(`[bridge:heartbeat] Re-queued sessionId=${sessionId} via bridge/reconnect`);
      } catch (err) {
        if (isEnvironmentGoneError(err)) {
          logForDebugging(
            `[bridge:heartbeat] reconnectSession(${sessionId}) skipped \u2014 resource gone: ${errorMessage(err)}`,
          );
          continue;
        }
        logger.logError(`Failed to refresh session ${sessionId} token: ${errorMessage(err)}`);
        logForDebugging(`[bridge:heartbeat] reconnectSession(${sessionId}) failed: ${errorMessage(err)}`, {
          level: "error",
        });
      }
    }
    if (y) return "fatal";
    if (authFailedSessions.length > 0) return "auth_failed";
    if (_) watchScheduler.noteHeartbeatOk();
    if (!_ || (v && watchScheduler.governs())) return "failed";
    return "ok";
  }
  async function Vt(n = 0, A) {
    Ft = systemClock.monotonicNow();
    if (A === undefined) Ve = Ft;
    let _ = await heartbeatActiveWorkItems(n, A);
    jt = _ !== "ok";
    return _;
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
        settleRequeue(n, false);
        continue;
      }
      let _ = await describeReregisterOutcome(trackedApi, environmentId, n, loopSignal);
      if (_ === "aborted") return;
      if (_ === "done") settleRequeue(n, false);
      else if (A + 1 >= RENEW_FAILURE_LIMIT) {
        logForDebugging(
          `[bridge:poll] Giving up startup re-queue of sessionId=${n} after ${RENEW_FAILURE_LIMIT} attempts`,
          {
            level: "warn",
          },
        );
        settleRequeue(n, true);
      } else pendingRequeues.set(n, A + 1);
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
      else if (A + 1 >= RENEW_FAILURE_LIMIT) {
        activeSessions.delete(n);
        logForDebugging(
          `[bridge:poll] Giving up re-queuing sessionId=${n} after ${RENEW_FAILURE_LIMIT} attempts; left to token refresh`,
          {
            level: "warn",
          },
        );
        logEvent("tengu_bridge_env_reregister", {
          requeue_attempts: A + 1,
          outcome: lit("requeue_dropped"),
          trigger: Be,
        });
        logFeatureSad("bridge_env_reregister", "requeue_dropped");
      } else activeSessions.set(n, A + 1);
    }
  }
  let tokenRefresh = getAccessToken
    ? createTokenRefreshScheduler({
        getAccessToken,
        onRefresh: (sessionId, oauthToken) => {
          if (!sessionStartTimes.get(sessionId)) return;
          logger.logVerbose(`Refreshing session ${sessionId} token via bridge/reconnect`);
          trackedApi.reconnectSession(environmentId, sessionId).catch((err) => {
            logger.logError(`Failed to refresh session ${sessionId} token: ${errorMessage(err)}`);
            logForDebugging(`[bridge:token] reconnectSession(${sessionId}) failed: ${errorMessage(err)}`, {
              level: "error",
            });
          });
        },
        label: "bridge",
      })
    : null;
  let loopStartTime = Date.now();
  let pendingCleanups_2 = new Set();
  let Dt = 0;
  async function trackCleanup(pollConfig) {
    let {
      non_exclusive_heartbeat_interval_ms: nonExclusiveHeartbeatIntervalMs,
      multisession_poll_interval_ms_at_capacity: multisessionPollIntervalMsAtCapacity,
    } = pollConfig;
    let v = capacityWake.signal();
    if (nonExclusiveHeartbeatIntervalMs > 0) {
      if (Date.now() >= Dt) {
        await heartbeatActiveWorkItems();
        Dt = Date.now() + nonExclusiveHeartbeatIntervalMs;
      }
      let y =
        multisessionPollIntervalMsAtCapacity > 0
          ? Math.min(Dt, Date.now() + multisessionPollIntervalMsAtCapacity)
          : Dt;
      await sleep(Math.max(0, y - Date.now()), v.signal);
    } else if (multisessionPollIntervalMsAtCapacity > 0)
      await sleep(multisessionPollIntervalMsAtCapacity, v.signal);
    v.cleanup();
  }
  function trackBackgroundOp(n) {
    pendingCleanups_2.add(n);
    n.finally(() => pendingCleanups_2.delete(n));
  }
  let connBackoffMs = 0;
  let generalBackoffMs = 0;
  let connErrorStart = null;
  let generalErrorStart = null;
  let lastPollErrorTime = null;
  let heartbeatTokens = new Map();
  let oe = 0;
  let jt = false;
  let Ft = -1 / 0;
  let Ve = -1 / 0;
  let cn = new Map();
  let recentWorkIds = new Map();
  let Xt;
  let statusUpdateTimer = null;
  let Je = false;
  let gaveUp = false;
  let un;
  logForDebugging(
    `[bridge:work] Starting poll loop spawnMode=${config.spawnMode} maxSessions=${config.maxSessions} environmentId=${environmentId}`,
  );
  logForDiagnosticsNoPII("info", "bridge_loop_started", {
    max_sessions: config.maxSessions,
    spawn_mode: config.spawnMode,
  });
  logger.printBanner(config, environmentId);
  logger.updateSessionCount(0, config.maxSessions, config.spawnMode);
  if (initialSessionId) logger.setAttached(initialSessionId);
  function updateStatusDisplay() {
    logger.updateSessionCount(sessionStartTimes.size, config.maxSessions, config.spawnMode);
    for (let [sid, handle] of sessionStartTimes) {
      let act = handle.currentActivity;
      if (act) logger.updateSessionActivity(timedOutSessions.get(sid) ?? sid, act);
    }
    if (sessionStartTimes.size === 0) {
      if (!Je) {
        Je = true;
        logger.updateIdleStatus();
      }
      return;
    }
    Je = false;
    let [sessionId, handle] = [...sessionStartTimes.entries()].pop();
    let startTime = completedWorkIds.get(sessionId);
    if (!startTime) return;
    let activity = handle.currentActivity;
    if (!activity || activity.type === "result" || activity.type === "error") {
      if (config.maxSessions > 1) logger.refreshDisplay();
      return;
    }
    let elapsed = formatDuration(Date.now() - startTime);
    let trail = handle.activities
      .filter((activity) => activity.type === "tool_start")
      .slice(-5)
      .map((activity) => activity.summary);
    logger.updateSessionStatus(sessionId, elapsed, activity, trail);
  }
  function startStatusUpdates() {
    stopStatusUpdates();
    updateStatusDisplay();
    statusUpdateTimer = setInterval(updateStatusDisplay, WORKER_RETRY_BASE_MS);
  }
  function stopStatusUpdates() {
    if (statusUpdateTimer) {
      clearInterval(statusUpdateTimer);
      statusUpdateTimer = null;
    }
  }
  function onSessionDone(sessionId, startTime, handle) {
    return (rawStatus) => {
      let workId = sessionWorktrees.get(sessionId);
      let R = sessionCompatIds.has(sessionId);
      sessionStartTimes.delete(sessionId);
      sessionCompatIds.delete(sessionId);
      if (R && rawStatus === "idle") parkedProjectThreadIds.add(sessionId);
      mt(sessionId, false);
      completedWorkIds.delete(sessionId);
      sessionWorktrees.delete(sessionId);
      titledSessions.get(sessionId)?.stop();
      titledSessions.delete(sessionId);
      let r = timedOutSessions.get(sessionId) ?? sessionId;
      timedOutSessions.delete(sessionId);
      logger.removeSession(r);
      ke.delete(r);
      Ge?.forget(r);
      if (r === Qe && initialSessionTitle) sessionTitleCandidates.set(r, new Set([initialSessionTitle]));
      else sessionTitleCandidates.delete(r);
      lt.delete(sessionId);
      tokenRefresh?.cancel(sessionId);
      capacityWake.wake();
      cn.delete(sessionId);
      let timer = recentWorkIds.get(workId ?? "");
      if (timer === undefined || systemClock.monotonicNow() - timer >= REGISTER_RETRY_MAX_MS) {
        recentWorkIds.delete(workId ?? "");
        watchScheduler.noteSessionEnd(sessionStartTimes.size + 1 >= config.maxSessions);
      }
      let durationMs = Date.now() - startTime;
      logForDebugging(
        `[bridge:session] sessionId=${sessionId} workId=${workId ?? "unknown"} exited status=${rawStatus} duration=${formatDuration(durationMs)}`,
      );
      logEvent("tengu_bridge_session_done", {
        status: fromEnum(rawStatus),
        duration_ms: durationMs,
        project_thread: R,
      });
      logForDiagnosticsNoPII("info", "bridge_session_done", {
        status: rawStatus,
        duration_ms: durationMs,
      });
      logger.clearStatus();
      stopStatusUpdates();
      let ae =
        handle.lastStderr.length > 0
          ? handle.lastStderr.join(`
`)
          : undefined;
      let Pe;
      switch (rawStatus) {
        case "completed":
          logger.logSessionComplete(sessionId, durationMs);
          break;
        case "failed":
          if (!loopSignal.aborted) {
            Pe = ae ?? "Process exited with error";
            logger.logSessionFailed(sessionId, Pe);
            if (!ae || Pe.includes("transport closed"))
              logForDebugging(`Bridge session failed: ${Pe}`, {
                level: "error",
              });
            else
              logError(withTelemetryMessage(Error(`Bridge session failed: ${Pe}`), "Bridge session failed"));
          }
          break;
        case "interrupted":
          logger.logVerbose(`Session ${sessionId} interrupted`);
          break;
        case "idle":
          logger.logVerbose(`Session ${sessionId} parked idle; the server re-queues it on the next message`);
          break;
      }
      if (rawStatus !== "interrupted" && workId) {
        completedWorkIds_2.add(workId);
        trackBackgroundOp(
          stopWorkWithRetry(
            trackedApi,
            environmentId,
            workId,
            currentEnvironmentSecret,
            logger,
            backoff.stopWorkBaseDelayMs,
          ),
        );
      }
      let De = rawStatus === "failed" && !loopSignal.aborted && !gaveUp;
      if (De) {
        qe.add(sessionId);
        le = true;
      }
      let wt = sessionHeartbeatState.get(sessionId);
      if (wt) {
        sessionHeartbeatState.delete(sessionId);
        if (rawStatus === "idle") logger.logStatus(`kept worktree ${wt.worktreePath} \xB7 session idle`);
        else if (De) {
          logger.logStatus(`kept worktree ${wt.worktreePath} \xB7 session crashed`);
          if (Pe?.includes("transport closed")) Se.add(wt.worktreePath);
        } else
          trackBackgroundOp(
            cleanupSessionWorktree(wt, logger, {
              storageV5: config.storageV5,
              readDeadlineMs: loopSignal.aborted ? POLL_RETRY_FLOOR_MS : undefined,
            }),
          );
      }
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
          logForDebugging(
            `[bridge:session] Session ${rawStatus}, aborting poll loop to tear down environment`,
          );
          controller.abort();
          return;
        }
      if (!loopSignal.aborted && !gaveUp) startStatusUpdates();
    };
  }
  if (!initialSessionId) startStatusUpdates();
  function Sn() {
    let size = qe.size;
    logger.logStatus(
      size > 0
        ? `${size} ${plural(size, "session")} ended while this machine was offline \u2014 the environment was cleaned up on the server and can't be resumed.`
        : "This environment was cleaned up while the machine was offline and can't be resumed.",
    );
    if (Se.size > 0) logger.logStatus(`Your work is safe \u2014 worktrees kept: ${[...Se].join(", ")}`);
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
  let { startBackgroundPolling } = await import("./chunk-qchbrsbw.js");
  startBackgroundPolling();
  let It = () => {
    if (loopSignal.aborted || gaveUp) return;
    let n = connectedBridgePolicyRefusal(false);
    if (n === null) return;
    un = n;
    gaveUp = true;
    controller.abort();
    try {
      logger.logStatus(n.detail);
      logForDebugging(
        `[bridge:policy] Org policy now refuses Remote Control (${n.policy}: ${n.kind}); shutting down`,
      );
      logEvent("tengu_bridge_policy_teardown", {
        lane: lit("standalone"),
        policy: fromEnum(n.policy),
        deny_kind: fromEnum(n.kind),
        outbound_only: false,
      });
    } catch (error) {
      logForDebugging(`[bridge:policy] Policy shutdown notice failed: ${errorMessage(error)}`, {
        level: "error",
      });
      logError(error);
    }
  };
  let vn = isLovelyUmbrellaOn()
    ? () => {}
    : onPolicyVerdictChanged(() => {
        queueMicrotask(It);
      });
  if (!isLovelyUmbrellaOn()) It();
  function nn() {
    return (
      !re &&
      secretRenewAt !== undefined &&
      Date.now() >= secretRenewAt &&
      isBridgeEnvReregisterEnabled() &&
      isBridgeEnvSecretProactiveRenewalEnabled()
    );
  }
  async function kn() {
    N++;
    if (X) {
      X = false;
      pollOptions?.forgetTokenReads();
    }
    logger.logVerbose("Renewing this computer's Remote Control credential before it expires");
    let n = await reregisterEnvironment({
      api: trackedApi,
      config,
      environmentId,
      activeSessions: sessionStartTimes,
      attempt: N,
      trigger: "proactive",
      signal: loopSignal,
    });
    if (n.outcome === "reregistered") {
      currentEnvironmentSecret = n.environmentSecret;
      secretRenewAt = computeSecretRenewAt(n.environmentSecretExpiresIn);
      secretExpiresAt = expiresInToDeadline(n.environmentSecretExpiresIn);
      Be = lit("proactive");
      Ee = true;
      He = N;
      logger.logVerbose("Remote Control credential renewed.");
      return;
    }
    if (loopSignal.aborted) return;
    let A =
      n.outcome === "fatal" && n.reason === "register_rejected" && n.message === BRIDGE_LOGIN_INSTRUCTION;
    let _ =
      n.outcome === "fatal" &&
      n.reason === "register_rejected" &&
      n.status === 401 &&
      (A || pollOptions?.classifyFailedOAuthRefresh() === "unreachable");
    if (n.outcome === "transient" || ((n.reason === "replaced" || _) && N < RENEW_RETRY_LIMIT)) {
      let max = Math.max(
        RENEW_RETRY_MIN_MS,
        Math.min(n.outcome === "transient" ? (n.retryAfterMs ?? 0) : 0, RENEW_RETRY_MAX_MS),
      );
      secretRenewAt = Date.now() + max * (1 + 0.25 * Math.random());
      X = A;
      logger.logVerbose(
        `Could not renew the Remote Control credential yet. The current one still works; trying again in about ${Math.ceil((secretRenewAt - Date.now()) / 60000)} minutes.`,
      );
      return;
    }
    secretRenewAt = undefined;
    if (!(n.reason === "register_rejected" && n.status === 401 && (A || !_)))
      logger.logVerbose(
        "Could not renew the Remote Control credential. It keeps working until it expires, and Remote Control will try again then.",
      );
    else {
      let R = A || !pollOptions ? undefined : await pollOptions.tokenOrigin();
      let r = "claude.ai did not accept the sign-in it uses";
      let F = "Run `claude /login` to sign in again.";
      if (A) {
        r = "it could not read a saved sign-in";
        F = "If you are signed out, run `claude /login`.";
      } else if (R === undefined) F = "If you are signed out, run `claude /login`.";
      else if (R === "env" || R === "fd") F = "Start Remote Control again with a valid sign-in token.";
      else if (R === "none") r = "its saved sign-in was refused or could not be read";
      let D;
      if (secretExpiresAt !== undefined && secretExpiresAt <= Date.now())
        D = "The connection's credential has already expired, so it stops unless the next try can sign in.";
      else {
        let ae =
          secretExpiresAt === undefined ? undefined : Math.round((secretExpiresAt - Date.now()) / 60000);
        let Pe;
        if (ae === undefined) Pe = "until its credential expires";
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
      {
        level: "warn",
      },
    );
  }
  let xt = false;
  while (!loopSignal.aborted) {
    Xt = undefined;
    startBackgroundPolling();
    let pollConfig = getPollIntervalConfig();
    try {
      if (
        pollConfig.watch_sessions &&
        isBridgeFirstParty() &&
        !isEssentialTrafficOnly() &&
        connectedBridgePolicyRefusal(false) === null
      )
        sessionsWatcher?.start();
      else sessionsWatcher?.stop();
      xt = false;
    } catch (error) {
      sessionsWatcher?.stop();
      if (!xt) {
        xt = true;
        logError(error);
      }
    }
    if (nn()) {
      await kn();
      continue;
    }
    try {
      let A = watchScheduler.governs() && sessionStartTimes.size < config.maxSessions;
      let _ = A
        ? watchScheduler.longestGapMs()
        : sessionStartTimes.size >= config.maxSessions
          ? pollConfig.multisession_poll_interval_ms_at_capacity
          : sessionStartTimes.size > 0
            ? pollConfig.multisession_poll_interval_ms_partial_capacity
            : pollConfig.multisession_poll_interval_ms_not_at_capacity;
      let v = A ? watchScheduler.pollCause() : undefined;
      let y = !A || v !== undefined;
      let R = null;
      if (y) {
        jt = false;
        let I = (Ne) => {
          if (v !== undefined && !loopSignal.aborted) watchScheduler.polled(v, Ne);
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
          I(classifyConnectFailure(error));
          throw error;
        }
        I(vt(R));
      }
      let r = R;
      if (y) {
        if (connErrorStart !== null || generalErrorStart !== null) {
          let disconnectedMs = Date.now() - (connErrorStart ?? generalErrorStart ?? Date.now());
          logger.logReconnected(disconnectedMs);
          logForDebugging(`[bridge:poll] Reconnected after ${formatDuration(disconnectedMs)}`);
          logEvent("tengu_bridge_reconnected", {
            disconnected_ms: disconnectedMs,
          });
          Je = false;
        }
        connBackoffMs = 0;
        generalBackoffMs = 0;
        connErrorStart = null;
        generalErrorStart = null;
        lastPollErrorTime = null;
        le = false;
        if (Ee) {
          Ee = false;
          logEvent("tengu_bridge_env_reregister", {
            attempt: He,
            outcome: lit("recovered"),
            trigger: Be,
          });
          logFeatureOk("bridge_env_reregister");
          N = 0;
        }
        reregisterAttempts = 0;
        Ke = false;
        re = false;
      }
      if (!r) {
        for (let key of heartbeatTokens.keys()) if (!sessionStartTimes.has(key)) heartbeatTokens.delete(key);
        if (y && (activeSessions.size > 0 || pendingRequeues.size > 0)) await zt();
        let I = await describeAdvertChange({
          api: trackedApi,
          config,
          environmentId,
          activeSessions: sessionStartTimes,
          pacing,
          signal: loopSignal,
        });
        if (I) {
          Be = lit("tool_host_advert_changed");
          E(I);
          watchScheduler.expectWork();
        }
        if (sessionStartTimes.size >= config.maxSessions) {
          let atCapMs = pollConfig.multisession_poll_interval_ms_at_capacity;
          if (pollConfig.non_exclusive_heartbeat_interval_ms > 0) {
            logEvent("tengu_bridge_heartbeat_mode_entered", {
              active_sessions: sessionStartTimes.size,
              heartbeat_interval_ms: pollConfig.non_exclusive_heartbeat_interval_ms,
            });
            let pollDeadline = atCapMs > 0 ? Date.now() + atCapMs : null;
            let hbResult = "ok";
            let kt = 0;
            while (
              !loopSignal.aborted &&
              sessionStartTimes.size >= config.maxSessions &&
              (pollDeadline === null || Date.now() < pollDeadline) &&
              !nn()
            ) {
              let hbConfig = getPollIntervalConfig();
              if (hbConfig.non_exclusive_heartbeat_interval_ms <= 0) break;
              let cap = capacityWake.signal();
              if (Date.now() >= Dt) {
                hbResult = await heartbeatActiveWorkItems();
                if (hbResult === "auth_failed" || hbResult === "fatal") {
                  cap.cleanup();
                  break;
                }
                Dt = Date.now() + hbConfig.non_exclusive_heartbeat_interval_ms;
                kt++;
              }
              let min = Math.min(
                Dt,
                pollDeadline ?? 1 / 0,
                secretRenewAt !== undefined && secretRenewAt > Date.now() ? secretRenewAt : 1 / 0,
              );
              await sleep(Math.max(0, min - Date.now()), cap.signal);
              cap.cleanup();
            }
            let exitReason =
              hbResult === "auth_failed" || hbResult === "fatal"
                ? hbResult
                : loopSignal.aborted
                  ? "shutdown"
                  : sessionStartTimes.size < config.maxSessions
                    ? "capacity_changed"
                    : pollDeadline !== null && Date.now() >= pollDeadline
                      ? "poll_due"
                      : nn()
                        ? "secret_renewal_due"
                        : "config_disabled";
            logEvent("tengu_bridge_heartbeat_mode_exited", {
              reason: fromEnum(exitReason),
              heartbeat_cycles: kt,
              active_sessions: sessionStartTimes.size,
            });
            if (exitReason === "poll_due")
              logForDebugging(
                `[bridge:poll] Heartbeat poll_due after ${kt} cycles \u2014 falling through to pollForWork`,
              );
            if (hbResult === "auth_failed" || hbResult === "fatal") {
              let cap = capacityWake.signal();
              await sleep(atCapMs > 0 ? atCapMs : pollConfig.non_exclusive_heartbeat_interval_ms, cap.signal);
              cap.cleanup();
            }
          } else if (atCapMs > 0) {
            let cap = capacityWake.signal();
            await sleep(atCapMs, cap.signal);
            cap.cleanup();
          }
        } else {
          let nonExclusiveHeartbeatIntervalMs = pollConfig.non_exclusive_heartbeat_interval_ms;
          let ue = nonExclusiveHeartbeatIntervalMs > 0 ? nonExclusiveHeartbeatIntervalMs : oe > 0 ? 60000 : 0;
          let Ze = oe > 0;
          let kt = clockSnapshot(systemClock);
          let filtered = [...sessionStartTimes.keys()].filter((key) =>
            Ze ? Wt(key, ue) : Date.now() - oe >= ue,
          );
          let Et =
            jt && kt.monotonic - Ve < REGISTER_RETRY_MIN_MS
              ? filtered.filter((at) => isSleepGap(heartbeatTokens.get(at), kt))
              : filtered;
          if (ue > 0 && Et.length > 0 && (!jt || kt.monotonic - Ft >= SLEEP_GAP_WINDOW.retry)) {
            let at = Ze && Et.length < filtered.length ? new Set(Et) : undefined;
            let sn = await Vt(Ze ? ue : 0, at);
            if (
              at !== undefined &&
              sn === "ok" &&
              [...sessionStartTimes.keys()].some((key) => !at.has(key) && Wt(key, ue))
            )
              await Vt(ue);
            if (sn === "ok" && !Ze) oe = Date.now();
          }
          let Lt =
            sessionStartTimes.size > 0
              ? pollConfig.multisession_poll_interval_ms_partial_capacity
              : pollConfig.multisession_poll_interval_ms_not_at_capacity;
          if (watchScheduler.governs()) {
            let cap = capacityWake_2.signal();
            await sleep(Math.min(Lt, watchScheduler.msUntilDue()), cap.signal);
            cap.cleanup();
          } else await sleep(Lt, loopSignal);
        }
        continue;
      }
      let F = sessionStartTimes.size >= config.maxSessions;
      let D = async () => {
        if (F) await trackCleanup(pollConfig);
      };
      if (r.data?.mode != null) {
        if (config.toolHostHandler !== undefined && r.data.mode === "tool_use") {
          try {
            await config.toolHostHandler.handle(r, {
              environmentId,
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
          logForDebugging(
            `[bridge:work] Stopping work item with an unsupported mode workId=${I} sessionId=${hashIdForLog(r.data.id)}`,
          );
          logEvent("tengu_bridge_work_mode_unsupported", {});
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
          );
        } else if (!F) await sleep(1000, loopSignal);
        await D();
        continue;
      }
      if (completedWorkIds_2.has(r.id) && r.state === WORK_STATE_QUEUED && !sessionTimers.has(r.id)) {
        completedWorkIds_2.delete(r.id);
        logForDebugging(
          `[bridge:work] Previously completed workId=${r.id} was re-queued by the server, handling as new work`,
        );
      }
      if (completedWorkIds_2.has(r.id)) {
        logForDebugging(`[bridge:work] Skipping already-completed workId=${r.id} state=${r.state}`);
        if (F) await trackCleanup(pollConfig);
        else await sleep(1000, loopSignal);
        continue;
      }
      let ae;
      try {
        ae = decodeWorkSecret(r.secret);
      } catch (err) {
        let errMsg = errorMessage(err);
        logger.logError(`Failed to decode work secret for workId=${r.id}: ${errMsg}`);
        logEvent("tengu_bridge_work_secret_failed", {});
        if (r.data.type === "session") logFeatureBad("bridge_work_pickup", "secret_decode_failed");
        completedWorkIds_2.add(r.id);
        trackBackgroundOp(
          stopWorkWithRetry(
            trackedApi,
            environmentId,
            r.id,
            currentEnvironmentSecret,
            logger,
            backoff.stopWorkBaseDelayMs,
          ),
        );
        await D();
        continue;
      }
      let ackWork = async () => {
        logForDebugging(`[bridge:work] Acknowledging workId=${r.id}`);
        try {
          await trackedApi.acknowledgeWork(environmentId, r.id, ae.session_ingress_token);
        } catch (err) {
          logForDebugging(`[bridge:work] Acknowledge failed workId=${r.id}: ${errorMessage(err)}`);
        }
      };
      let De = (sessionId) => {
        if (pollConfig.non_exclusive_heartbeat_interval_ms <= 0 && oe === 0) return;
        let Ne = clockSnapshot(systemClock);
        heartbeatTokens.set(sessionId, Ne);
        oe = Date.now();
        trackBackgroundOp(
          trackedApi
            .heartbeatWork(environmentId, r.id, ae.session_ingress_token)
            .then(() => logFeatureOk("bridge_work_heartbeat"))
            .catch((error) => {
              logFeatureSad("bridge_work_heartbeat", "initial_failed");
              logForDebugging(
                `[bridge:work] Initial heartbeat failed workId=${r.id}: ${errorMessage(error)}`,
              );
              if (!(error instanceof BridgeFatalError) && heartbeatTokens.get(sessionId) === Ne)
                heartbeatTokens.delete(sessionId);
            }),
        );
      };
      let workType = r.data.type;
      switch (r.data.type) {
        case "healthcheck":
          await ackWork();
          logForDebugging("[bridge:work] Healthcheck received");
          logger.logVerbose("Healthcheck received");
          break;
        case "session": {
          let sessionId = r.data.id;
          try {
            validateBridgeId(sessionId, "session_id");
          } catch {
            await ackWork();
            logger.logError(`Invalid session_id received: ${sessionId}`);
            logFeatureBad("bridge_work_pickup", "invalid_session_id");
            break;
          }
          let existingHandle = sessionStartTimes.get(sessionId);
          if (existingHandle) {
            activeSessions.delete(sessionId);
            settleRequeue(sessionId, false);
            existingHandle.updateAccessToken(ae.session_ingress_token);
            titledSessions.get(sessionId)?.updateAccessToken(ae.session_ingress_token);
            sessionWorktrees.set(sessionId, r.id);
            tokenRefresh?.schedule(sessionId, ae.session_ingress_token);
            logForDebugging(
              `[bridge:work] Updated access token for existing sessionId=${sessionId} workId=${r.id}`,
            );
            await ackWork();
            De(sessionId);
            break;
          }
          if (sessionStartTimes.size >= config.maxSessions) {
            logForDebugging(
              `[bridge:work] At capacity (${sessionStartTimes.size}/${config.maxSessions}), cannot spawn new session for workId=${r.id}`,
            );
            let pe = false;
            if (!sessionIngressTokens.has(r.id)) {
              let sessionId_2 = toCompatSessionId(sessionId);
              let dt = !Ce.has(sessionIdBody(sessionId));
              let nt = dt
                ? await fetchBridgeSessionTags(sessionId_2, {
                    baseUrl: config.apiBaseUrl,
                    getAccessToken,
                  })
                : null;
              if (!dt || nt !== null) sessionIngressTokens.add(r.id);
              let ft = nt?.createdAtMs === undefined ? undefined : Date.now() - nt.createdAtMs;
              if (loopSignal.aborted);
              else if (sessionStartTimes.size < config.maxSessions) pe = true;
              else if (
                nt !== null &&
                ft !== undefined &&
                ft >= 0 &&
                ft < STATUS_UPDATE_INTERVAL_MS &&
                classifyBridgeSessionRoles(nt.tags).projectThreadChild
              ) {
                logger.logError(
                  `Declined session ${sessionId_2}: already running ${sessionStartTimes.size} of ${config.maxSessions} sessions.`,
                );
                logFeatureBad("bridge_work_pickup", "at_capacity_declined");
                sessionTimers.add(r.id);
                completedWorkIds_2.add(r.id);
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
                      wt(sessionId_2, config.machineName, {
                        baseUrl: config.apiBaseUrl,
                        ...(Kt && {
                          getAccessToken: () => Kt,
                        }),
                      }),
                    )
                    .then((wt) => (wt === "landed" ? trackedApi.archiveSession(sessionId_2) : undefined))
                    .catch((error) =>
                      logger.logVerbose(
                        `Could not end declined session ${sessionId_2}: ${errorMessage(error)}`,
                      ),
                    )
                    .finally(() => sessionTimers.delete(r.id)),
                );
              } else
                logFeatureSad("bridge_work_pickup", "at_capacity", {
                  active_sessions: sessionStartTimes.size,
                  max_sessions: config.maxSessions,
                });
            }
            if (!pe) break;
          }
          await ackWork();
          De(sessionId);
          sessionIngressTokens.delete(r.id);
          let spawnStartTime = Date.now();
          let compatSessionId = toCompatSessionId(sessionId);
          let Ze;
          if (machineLaneVersionRefusal() !== null) {
            let sessionRecordWithRetry = await fetchSessionRecordWithRetry(compatSessionId);
            if (sessionRecordWithRetry === null && loopSignal.aborted) break;
            let ge = machineLaneVersionRefusal();
            if (ge?.reason === "floor_unanswered" && isMachineLaneWork(sessionRecordWithRetry, ge)) {
              logForDebugging(
                `[bridge:work] Holding sessionId=${sessionId} workId=${r.id}: version floor not received, refreshing flags`,
              );
              ge = await machineLaneVersionRefusalAfterHold(ge, loopSignal, Oe);
              if (loopSignal.aborted) {
                completedWorkIds_2.add(r.id);
                trackBackgroundOp(
                  stopWorkWithRetry(
                    trackedApi,
                    environmentId,
                    r.id,
                    currentEnvironmentSecret,
                    logger,
                    backoff.stopWorkBaseDelayMs,
                  ),
                );
                break;
              }
              logForDebugging(
                `[bridge:work] Held sessionId=${sessionId} workId=${r.id}: ${ge?.reason ?? "admitted"}`,
              );
              if (ge === null) logFeatureSad("bridge_machine_lane_floor", "held_then_admitted");
            }
            if (ge !== null && isMachineLaneWork(sessionRecordWithRetry, ge)) {
              logger.logError(
                sessionRecordWithRetry === null
                  ? `Declined session ${compatSessionId}: its record could not be read. ${ge.message}`
                  : `Declined session ${compatSessionId}: ${ge.message}`,
              );
              logFeatureBad(
                "bridge_machine_lane_floor",
                sessionRecordWithRetry === null ? `session_unread_${ge.reason}` : ge.reason,
              );
              logFeatureBad("bridge_work_pickup", "version_floor");
              completedWorkIds_2.add(r.id);
              trackBackgroundOp(
                stopWorkWithRetry(
                  trackedApi,
                  environmentId,
                  r.id,
                  currentEnvironmentSecret,
                  logger,
                  backoff.stopWorkBaseDelayMs,
                ),
              );
              break;
            }
            Ze = sessionRecordWithRetry;
          }
          let sessionUrl = buildCCRv2SdkUrl(config.apiBaseUrl, sessionId);
          let yt;
          for (let attempt = 1; attempt <= REGISTER_WORKER_MAX_ATTEMPTS; attempt++)
            try {
              yt = await registerWorker(sessionUrl, ae.session_ingress_token);
              logForDebugging(
                `[bridge:session] CCR v2: registered worker sessionId=${sessionId} epoch=${yt} attempt=${attempt}`,
              );
              logFeatureOk("bridge_register_worker", {
                attempt,
              });
              break;
            } catch (err) {
              let errMsg = errorMessage(err);
              let { kind, status } = classifyAxiosError(err);
              let wt = status === undefined || status === 408 || status === 429 || status >= 500;
              if (attempt < REGISTER_WORKER_MAX_ATTEMPTS && wt && !loopSignal.aborted) {
                logForDebugging(
                  `[bridge:session] CCR v2: registerWorker attempt ${attempt} failed, retrying: ${errMsg}`,
                );
                if (attempt === 1 && sessionStartTimes.size > 0 && dn()) await Nt();
                await sleep(
                  backoffDelayMs({
                    attempt,
                    baseMs: 2000,
                    jitter: {
                      kind: "proportional",
                      ratio: 0.25,
                    },
                  }),
                  loopSignal,
                );
                if (!loopSignal.aborted) continue;
              }
              if (loopSignal.aborted) {
                completedWorkIds_2.add(r.id);
                trackBackgroundOp(
                  stopWorkWithRetry(
                    trackedApi,
                    environmentId,
                    r.id,
                    currentEnvironmentSecret,
                    logger,
                    backoff.stopWorkBaseDelayMs,
                  ),
                );
                break;
              }
              logger.logError(`CCR v2 worker registration failed for session ${sessionId}: ${errMsg}`);
              logFeatureBad("bridge_register_worker", "request_failed");
              logFeatureBad("bridge_work_pickup", "register_worker_failed");
              if (kind !== "other" && ((status ?? 0) < 500 || status === 503))
                logForDebugging(`registerWorker failed: ${errMsg}`, {
                  level: "error",
                });
              else
                logError(
                  withTelemetryMessage(Error(`registerWorker failed: ${errMsg}`), "registerWorker failed"),
                );
              completedWorkIds_2.add(r.id);
              trackBackgroundOp(
                stopWorkWithRetry(
                  trackedApi,
                  environmentId,
                  r.id,
                  currentEnvironmentSecret,
                  logger,
                  backoff.stopWorkBaseDelayMs,
                ),
              );
              break;
            }
          if (yt === undefined) break;
          let spawnModeAtDecision = config.spawnMode;
          let Et = isBridgeServerSessionConfigEnabled();
          let Lt = Et && ae.worktree === true;
          let at = spawnModeAtDecision === "worktree";
          if (Lt && !at) {
            at = hasWorktreeCreateHook() || findGitRootRecheckingNegative(config.dir) !== null;
            if (!at)
              logger.logStatus(
                `session ${sessionId} asked for a worktree \xB7 ${config.dir} is not a git repository, running there`,
              );
          }
          let sessionDir = config.dir;
          let En = false;
          let worktreeCreateMs = 0;
          if (at && (initialSessionId === undefined || !sameSessionId(sessionId, initialSessionId))) {
            let wtStart = Date.now();
            try {
              let agentWorktree = await createAgentWorktree(`bridge-${safeFilenameId(sessionId)}`, {
                storageV5: config.storageV5,
              });
              worktreeCreateMs = Date.now() - wtStart;
              sessionHeartbeatState.set(sessionId, {
                worktreePath: agentWorktree.worktreePath,
                worktreeBranch: agentWorktree.worktreeBranch,
                gitRoot: agentWorktree.gitRoot,
                hookBased: agentWorktree.hookBased,
                headCommit: agentWorktree.headCommit,
                baseChangeset: agentWorktree.baseChangeset,
                sessionDir: agentWorktree.sessionDir,
              });
              sessionDir = agentWorktree.worktreePath;
              En = !agentWorktree.hookBased;
              logForDebugging(
                `[bridge:session] Created worktree for sessionId=${sessionId} at ${agentWorktree.worktreePath}`,
              );
            } catch (err) {
              let errMsg = errorMessage(err);
              logger.logError(`Failed to create worktree for session ${sessionId}: ${errMsg}`);
              logForDebugging(`Worktree creation failed for session ${sessionId}: ${errMsg}`, {
                level: "error",
              });
              logFeatureBad("bridge_work_pickup", "worktree_create_failed");
              completedWorkIds_2.add(r.id);
              trackBackgroundOp(
                stopWorkWithRetry(
                  trackedApi,
                  environmentId,
                  r.id,
                  currentEnvironmentSecret,
                  logger,
                  backoff.stopWorkBaseDelayMs,
                ),
              );
              break;
            }
          }
          let Zn;
          logForDebugging(`[bridge:session] Spawning sessionId=${sessionId} sdkUrl=${sessionUrl}`);
          let On = ++Ae;
          lt.set(sessionId, On);
          let Tn = 0;
          let Bn = false;
          let er = false;
          er = isRcChildRestartResumeEnabled();
          if (config.spawnMode !== "single-session") Tn = getBridgeRcChildIdleExitMs();
          Bn = Boolean(ae.auto_mode_environment?.length) && Et;
          let tr = hasBridgeChildFeatureEnabled("spawn") || Tn > 0 || er || Bn;
          let Wn = tr ? (Ze !== undefined ? Ze : await fetchSessionRecordWithRetry(compatSessionId)) : null;
          if (tr && Wn === null && loopSignal.aborted) {
            completedWorkIds_2.add(r.id);
            trackBackgroundOp(
              stopWorkWithRetry(
                trackedApi,
                environmentId,
                r.id,
                currentEnvironmentSecret,
                logger,
                backoff.stopWorkBaseDelayMs,
              ),
            );
            break;
          }
          let compatSessionId_2 = classifyBridgeSessionRoles(Wn);
          let { rcChild, projectThreadChild } = compatSessionId_2;
          let idleExitAfterMs = Tn > 0 && projectThreadChild ? Tn : 0;
          let dropAutoModeEnvironment;
          if (Bn && !projectThreadChild)
            dropAutoModeEnvironment = Wn === null ? "session_tags_unread" : "session_untagged";
          let Nn = await applyBridgeServerConfig(ae, {
            sessionId,
            apiBaseUrl: config.apiBaseUrl,
            enabled: Et,
            dropAutoModeEnvironment,
          });
          let modelArgs = Nn === undefined ? carriedModelArgs(ae.claude_code_args) : [];
          let sr = st.has(sessionIdBody(sessionId));
          let spawnResult = safeSpawn(
            sessionSpawner,
            {
              sessionId,
              sdkUrl: sessionUrl,
              accessToken: ae.session_ingress_token,
              workerEpoch: yt,
              serverConfig: Nn,
              modelArgs,
              roles: compatSessionId_2,
              boundResumedTurn: sr,
              idleExitAfterMs,
              ...(Zn !== undefined && {
                sourceDir: Zn,
              }),
              onActivity: (text) => {
                switch (text.type) {
                  case "tool_start":
                  case "text":
                    mt(sessionId, true);
                    break;
                  case "result":
                  case "error":
                    mt(sessionId, false);
                    break;
                }
              },
              onFirstUserMessage: (text) => {
                if (ke.has(compatSessionId)) return;
                ke.add(compatSessionId);
                let ge = truncateToWidth(text.replace(/\s+/g, " ").trim(), TITLE_MAX_CHARS);
                logger.setSessionTitle(compatSessionId, ge);
                logForDebugging(`[bridge:title] derived title for ${compatSessionId}: ${ge}`);
                import("./chunk-3eyvtwsv.js")
                  .then(async ({ getBridgeSession }) => {
                    Ge ??= createTitleWriteCoalescer({
                      isOwnTitle: (wt, Kt) => sessionTitleCandidates.get(wt)?.has(Kt) ?? false,
                      onRemoteTitleAdopted: (wt, Kt) => logger.setSessionTitle(wt, Kt),
                    });
                    let bridgeSession = await getBridgeSession(compatSessionId, {
                      baseUrl: config.apiBaseUrl,
                    });
                    if (bridgeSession === null || lt.get(sessionId) !== On) return;
                    let wt = sessionTitleCandidates.get(compatSessionId);
                    if (
                      bridgeSession.title &&
                      !wt?.has(bridgeSession.title) &&
                      !Ge.hasSent(compatSessionId, bridgeSession.title)
                    ) {
                      logger.setSessionTitle(compatSessionId, bridgeSession.title);
                      Ge.noteRemoteTitle(compatSessionId, bridgeSession.title);
                      logForDebugging(
                        `[bridge:title] remote rename for ${compatSessionId}: ${bridgeSession.title}`,
                      );
                      return;
                    }
                    sessionTitleCandidates.set(compatSessionId, (wt ?? new Set()).add(ge));
                    await Ge.update(compatSessionId, ge, {
                      baseUrl: config.apiBaseUrl,
                    });
                  })
                  .catch((err) =>
                    logForDebugging(`[bridge:title] failed to update title for ${compatSessionId}: ${err}`, {
                      level: "error",
                    }),
                  );
              },
            },
            sessionDir,
          );
          if (typeof spawnResult === "string") {
            logger.logError(`Failed to spawn session ${sessionId}: ${spawnResult}`);
            logFeatureBad("bridge_work_pickup", "spawn_failed");
            trackBackgroundOp(cleanupServerConfigDir(Nn));
            let worktree = sessionHeartbeatState.get(sessionId);
            if (worktree) {
              sessionHeartbeatState.delete(sessionId);
              trackBackgroundOp(
                cleanupSessionWorktree(worktree, logger, {
                  force: true,
                  storageV5: config.storageV5,
                }),
              );
            }
            completedWorkIds_2.add(r.id);
            trackBackgroundOp(
              stopWorkWithRetry(
                trackedApi,
                environmentId,
                r.id,
                currentEnvironmentSecret,
                logger,
                backoff.stopWorkBaseDelayMs,
              ),
            );
            break;
          }
          let handle = spawnResult;
          let spawnDurationMs = Date.now() - spawnStartTime;
          logFeatureOk("bridge_work_pickup");
          logEvent("tengu_bridge_session_started", {
            ccr_session_id: sanitizeMarkName(toInfraSessionId(sessionId)),
            active_sessions: sessionStartTimes.size,
            spawn_mode: fromEnum(spawnModeAtDecision),
            in_worktree: sessionHeartbeatState.has(sessionId),
            worktree_requested: Lt,
            spawn_duration_ms: spawnDurationMs,
            worktree_create_ms: worktreeCreateMs,
            rc_child: rcChild,
            project_thread: projectThreadChild,
            resumed_turn: sr,
            inProtectedNamespace: isEvalBuild(),
            ...cooAttributes(),
          });
          logForDiagnosticsNoPII("info", "bridge_session_started", {
            spawn_mode: spawnModeAtDecision,
            in_worktree: sessionHeartbeatState.has(sessionId),
            worktree_requested: Lt,
            spawn_duration_ms: spawnDurationMs,
            worktree_create_ms: worktreeCreateMs,
          });
          sessionStartTimes.set(sessionId, handle);
          Ce.add(sessionIdBody(sessionId));
          for (let parkedProjectThreadId of parkedProjectThreadIds)
            if (sessionIdBody(parkedProjectThreadId) === sessionIdBody(sessionId))
              parkedProjectThreadIds.delete(parkedProjectThreadId);
          if (projectThreadChild) {
            sessionCompatIds.add(sessionId);
            Ie = true;
          }
          settleRequeue(sessionId, false);
          config.onSessionServiced?.(sessionId);
          sessionWorktrees.set(sessionId, r.id);
          timedOutSessions.set(sessionId, compatSessionId);
          qe.delete(sessionId);
          Se.delete(sessionDir);
          let startTime = Date.now();
          completedWorkIds.set(sessionId, startTime);
          logger.logSessionStart(sessionId, `Session ${sessionId}`);
          let safeId = safeFilenameId(sessionId);
          let sessionDebugFile;
          if (config.debugFile) {
            let ext = config.debugFile.lastIndexOf(".");
            if (ext > 0)
              sessionDebugFile = `${config.debugFile.slice(0, ext)}-${safeId}${config.debugFile.slice(ext)}`;
            else sessionDebugFile = `${config.debugFile}-${safeId}`;
          } else if (config.verbose) sessionDebugFile = join(claudeTempDir(), `bridge-session-${safeId}.log`);
          if (sessionDebugFile) logger.logVerbose(`Debug log: ${sessionDebugFile}`);
          logger.addSession(
            compatSessionId,
            getRemoteSessionUrl(compatSessionId, config.sessionIngressUrl, {
              from: "cli",
            }),
          );
          startStatusUpdates();
          logger.setAttached(compatSessionId);
          fetchSessionTitle(compatSessionId, config.apiBaseUrl)
            .then((title) => {
              if (title && lt.get(sessionId) === On && !ke.has(compatSessionId)) {
                logger.setSessionTitle(compatSessionId, title);
                logForDebugging(`[bridge:title] server title for ${compatSessionId}: ${title}`);
                if (!sessionTitleCandidates.get(compatSessionId)?.has(title)) ke.add(compatSessionId);
              }
            })
            .catch((err) =>
              logForDebugging(`[bridge:title] failed to fetch title for ${compatSessionId}: ${err}`, {
                level: "error",
              }),
            );
          tokenRefresh?.schedule(sessionId, ae.session_ingress_token);
          handle.done.then(onSessionDone(sessionId, startTime, handle));
          break;
        }
        default:
          await ackWork();
          logForDebugging(`[bridge:work] Unknown work type: ${workType}, skipping`);
          break;
      }
      if (F) await trackCleanup(pollConfig);
    } catch (error) {
      if (loopSignal.aborted) break;
      if (error instanceof BridgeFatalError) {
        let v = pn(error);
        let y;
        if (v !== undefined) {
          Be = fromEnum(v);
          re = true;
          let now = Date.now();
          while (pendingCleanups.length > 0 && pendingCleanups[0] < now - 3600000) pendingCleanups.shift();
          while (pendingCleanups.length > 0 && pendingCleanups.at(-1) > now) pendingCleanups.pop();
          if (
            v === "poll_401" &&
            reregisterAttempts < RENEW_MAX_ATTEMPTS &&
            pendingCleanups.length >= RENEW_MAX_JITTER_PCT
          ) {
            let F = pendingCleanups[0] + 3600000 + Math.random() * backoff.connCapMs;
            if (ze === undefined || now - ze >= 3600000) {
              ze = now;
              let max = Math.max(1, Math.ceil((F - now) / 60000));
              let ae = max === 1 ? "minute" : "minutes";
              logForDebugging(
                `[bridge:poll] Pausing re-registration of environment ${environmentId}: ${pendingCleanups.length} re-registrations after poll 401s in the last hour (the hourly cap); resuming in about ${max} ${ae}`,
                {
                  level: "warn",
                },
              );
              logger.logWarning(
                `The server keeps rejecting this computer's Remote Control credential, so Remote Control will wait about ${max} ${ae} before renewing it again. New sessions can't start here until the server accepts it.`,
              );
              logEvent("tengu_bridge_env_reregister", {
                attempt: reregisterAttempts,
                outcome: lit("paused"),
                trigger: fromEnum(v),
              });
              logFeatureSad("bridge_env_reregister", "paused");
            }
            if (sessionStartTimes.size > 0 && dn()) await Nt();
            await sleep(
              jitterDelay(Math.min(Math.max(F - now, backoff.connInitialMs), backoff.connCapMs)),
              loopSignal,
            );
            continue;
          }
          if (reregisterAttempts < RENEW_MAX_ATTEMPTS) {
            reregisterAttempts++;
            if (v === "poll_401") pendingCleanups.push(now);
            logger.logVerbose(
              `${v === "poll_401" ? "This environment's Remote Control credential expired or was rejected; renewing it" : "Server no longer has this environment \u2014 re-registering"} (attempt ${reregisterAttempts}/${RENEW_MAX_ATTEMPTS})`,
            );
            let F = await reregisterEnvironment({
              api: trackedApi,
              config,
              environmentId,
              activeSessions: sessionStartTimes,
              attempt: reregisterAttempts,
              trigger: v,
              signal: loopSignal,
            });
            if (F.outcome === "reregistered") E(F);
            if (loopSignal.aborted) break;
            if (F.outcome === "fatal") y = F;
            else {
              if (F.outcome === "transient") Ke = true;
              logger.logVerbose(
                F.outcome === "reregistered"
                  ? "Environment re-registered; resuming poll."
                  : "Re-registration failed; retrying after backoff.",
              );
              if (v === "poll_401" && sessionStartTimes.size > 0 && dn()) await Nt();
              watchScheduler.expectWork();
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
              );
              continue;
            }
          } else {
            logForDebugging(
              `[bridge:poll] Giving up on re-registering environment ${environmentId} after ${reregisterAttempts} consecutive attempts`,
              {
                level: "error",
              },
            );
            logEvent("tengu_bridge_env_reregister", {
              attempt: reregisterAttempts,
              outcome: lit("gave_up"),
              trigger: fromEnum(v),
            });
            logFeatureBad("bridge_env_reregister", "gave_up");
            y = {
              reason: "gave_up",
              preserve: v === "poll_401" && Ke,
            };
          }
        }
        let preserve = y?.reason === "gave_up" && y.preserve;
        gaveUp = !preserve;
        if (preserve) controller.abort();
        if (error.status !== 401 && isExpiredErrorType(error.errorType))
          logger.logStatus(withReconnectHint(error.message));
        else if (
          v === "poll_401" &&
          y !== undefined &&
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
              r = `Remote Control could not renew this environment's credential after repeated attempts.${preserve && config.preserveOnShutdown ? "" : " Restart `claude remote-control` to start fresh."}`;
              break;
          }
          logger.logError(r);
          logForDebugging(`[bridge:work] Fatal bridge error: ${error.message}`, {
            level: "error",
          });
        } else if (isSuppressibleError(error))
          logForDebugging(`[bridge:work] Suppressed 403 error: ${error.message}`);
        else if (isEnvironmentGoneError(error) && qe.size > 0) Sn();
        else {
          logger.logError(error.message);
          logForDebugging(`[bridge:work] Fatal bridge error: ${error.message}`, {
            level: "error",
          });
        }
        logEvent("tengu_bridge_fatal_error", {
          status: error.status,
          error_type:
            error.errorType === undefined ? undefined : sanitizedOAuthErrorTypeForTelemetry(error.errorType),
        });
        logForDiagnosticsNoPII(isExpiredErrorType(error.errorType) ? "info" : "error", "bridge_fatal_error", {
          status: error.status,
          error_type: error.errorType,
        });
        break;
      }
      let errMsg = describeAxiosError(error);
      if (isConnectionError(error) || isServerError(error)) {
        let now = Date.now();
        if (lastPollErrorTime !== null && now - lastPollErrorTime > pollSleepDetectionThresholdMs(backoff)) {
          logForDebugging(
            `[bridge:work] Detected system sleep (${Math.round((now - lastPollErrorTime) / 1000)}s gap), resetting error budget`,
          );
          logForDiagnosticsNoPII("info", "bridge_poll_sleep_detected", {
            gapMs: now - lastPollErrorTime,
          });
          connErrorStart = null;
          connBackoffMs = 0;
          generalErrorStart = null;
          generalBackoffMs = 0;
        }
        lastPollErrorTime = now;
        if (!connErrorStart) connErrorStart = now;
        let elapsed = now - connErrorStart;
        let R = Ie && isRcChildRestartResumeEnabled();
        if (elapsed >= backoff.connGiveUpMs && R)
          logger.logVerbose(
            `Server unreachable for ${Math.round(elapsed / 60000)} minutes; still retrying while a project thread session is being served`,
          );
        if (elapsed >= backoff.connGiveUpMs && !R) {
          logger.logError(`Server unreachable for ${Math.round(elapsed / 60000)} minutes, giving up.`);
          logEvent("tengu_bridge_poll_give_up", {
            error_type: lit("connection"),
            elapsed_ms: elapsed,
          });
          logForDiagnosticsNoPII("error", "bridge_poll_give_up", {
            error_type: "connection",
            elapsed_ms: elapsed,
          });
          gaveUp = true;
          break;
        }
        generalErrorStart = null;
        generalBackoffMs = 0;
        connBackoffMs = connBackoffMs
          ? Math.min(connBackoffMs * 2, backoff.connCapMs)
          : backoff.connInitialMs;
        let delay = jitterDelay(connBackoffMs);
        logger.logVerbose(
          `Connection error, retrying in ${formatMs(Gt(delay))} (${Math.round(elapsed / 1000)}s elapsed): ${errMsg}`,
        );
        logger.updateReconnectingStatus(formatMs(Gt(delay)), formatDuration(elapsed));
        if (getPollIntervalConfig().non_exclusive_heartbeat_interval_ms > 0) await Vt();
        await sleep(delay, loopSignal);
      } else {
        let now = Date.now();
        if (lastPollErrorTime !== null && now - lastPollErrorTime > pollSleepDetectionThresholdMs(backoff)) {
          logForDebugging(
            `[bridge:work] Detected system sleep (${Math.round((now - lastPollErrorTime) / 1000)}s gap), resetting error budget`,
          );
          logForDiagnosticsNoPII("info", "bridge_poll_sleep_detected", {
            gapMs: now - lastPollErrorTime,
          });
          connErrorStart = null;
          connBackoffMs = 0;
          generalErrorStart = null;
          generalBackoffMs = 0;
        }
        lastPollErrorTime = now;
        if (!generalErrorStart) generalErrorStart = now;
        let elapsed = now - generalErrorStart;
        let R = Ie && isRcChildRestartResumeEnabled();
        if (elapsed >= backoff.generalGiveUpMs && R)
          logger.logVerbose(
            `Persistent errors for ${Math.round(elapsed / 60000)} minutes; still retrying while a project thread session is being served`,
          );
        if (elapsed >= backoff.generalGiveUpMs && !R) {
          logger.logError(`Persistent errors for ${Math.round(elapsed / 60000)} minutes, giving up.`);
          logEvent("tengu_bridge_poll_give_up", {
            error_type: lit("general"),
            elapsed_ms: elapsed,
          });
          logForDiagnosticsNoPII("error", "bridge_poll_give_up", {
            error_type: "general",
            elapsed_ms: elapsed,
          });
          gaveUp = true;
          break;
        }
        connErrorStart = null;
        connBackoffMs = 0;
        generalBackoffMs = generalBackoffMs
          ? Math.min(generalBackoffMs * 2, backoff.generalCapMs)
          : backoff.generalInitialMs;
        let delay = jitterDelay(generalBackoffMs);
        logger.logVerbose(
          `Poll failed, retrying in ${formatMs(Gt(delay))} (${Math.round(elapsed / 1000)}s elapsed): ${errMsg}`,
        );
        logger.updateReconnectingStatus(formatMs(Gt(delay)), formatDuration(elapsed));
        if (getPollIntervalConfig().non_exclusive_heartbeat_interval_ms > 0) await Vt();
        await sleep(delay, loopSignal);
      }
    }
  }
  vn();
  sessionsWatcher?.stop();
  stopStatusUpdates();
  logger.clearStatus({
    final: true,
  });
  let loopDurationMs = Date.now() - loopStartTime;
  logEvent("tengu_bridge_shutdown", {
    active_sessions: sessionStartTimes.size,
    loop_duration_ms: loopDurationMs,
  });
  logForDiagnosticsNoPII("info", "bridge_shutdown", {
    active_sessions: sessionStartTimes.size,
    loop_duration_ms: loopDurationMs,
  });
  let sessionsToArchive = new Set(sessionStartTimes.keys());
  if (initialSessionId && ![...qe].some((n) => sameSessionId(n, initialSessionId)))
    sessionsToArchive.add(initialSessionId);
  let compatIdSnapshot = new Map(timedOutSessions);
  await (async () => {
    if (sessionStartTimes.size === 0 && pendingRequeues.size === 0) return;
    let n =
      config.persistActiveSessionsOnShutdown && config.preserveOnShutdown && !gaveUp && config.ownsPointer
        ? await config.awaitShutdownCause?.()
        : null;
    if (n !== "upgrade" && n !== "reload" && n !== "yield") return;
    let {
      readBridgePointer,
      writeBridgePointer,
      MAX_POINTER_ACTIVE_SESSION_IDS,
      PERSISTED_SESSION_RESUME_WINDOW_MS,
      isPersistedStampFresh,
    } = await import("./chunk-8z86ydvk.js");
    await (config.enqueuePointerWrite ?? ((F) => F()))(async () => {
      let bridgePointer = await readBridgePointer(
        config.dir,
        {
          noClear: true,
        },
        config.storageV5,
      );
      if (!bridgePointer) return;
      let { ageMs, ...ae } = bridgePointer;
      let Pe = [...sessionStartTimes.keys()];
      let now = Date.now();
      let initialSessionRequeuesPersistedAt = config.initialSessionRequeuesPersistedAt;
      let Ne =
        initialSessionRequeuesPersistedAt !== undefined &&
        isPersistedStampFresh(initialSessionRequeuesPersistedAt, now, PERSISTED_SESSION_RESUME_WINDOW_MS)
          ? [...pendingRequeues.keys()].filter((key) => !L(key))
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
            Ne.length > 0 && initialSessionRequeuesPersistedAt !== undefined
              ? Math.min(now, initialSessionRequeuesPersistedAt)
              : now,
        },
        config.storageV5,
      );
    });
  })();
  if (config.preserveOnShutdown && !gaveUp && config.ownsPointer && isRcChildRestartResumeEnabled()) {
    let n =
      projectThreadPointer(sessionCompatIds, parkedProjectThreadIds) ??
      (config.parkedProjectThreadSessionIds
        ? {
            projectThreadSessionIds: [],
            parkedProjectThreadSessionIds: [],
          }
        : undefined);
    if (n !== undefined) {
      let { readBridgePointer, writeBridgePointer } = await import("./chunk-8z86ydvk.js");
      let v = config.enqueuePointerWrite ?? ((r) => r());
      let parkedProjectThreadSessionIdsPersistedAt =
        config.parkedProjectThreadSessionIdsPersistedAt !== undefined &&
        (config.parkedProjectThreadSessionIds ?? []).some((r) => parkedProjectThreadIds.has(r))
          ? config.parkedProjectThreadSessionIdsPersistedAt
          : Date.now();
      await v(async () => {
        let bridgePointer = await readBridgePointer(
          config.dir,
          {
            noClear: true,
            ignoreTtl: true,
          },
          config.storageV5,
        );
        if (!bridgePointer) return;
        let { ageMs, ...D } = bridgePointer;
        await writeBridgePointer(
          config.dir,
          {
            ...D,
            ...(n.projectThreadSessionIds.length > 0 && {
              projectThreadSessionIds: n.projectThreadSessionIds,
              projectThreadSessionIdsPersistedAt: Date.now(),
            }),
            parkedProjectThreadSessionIds: n.parkedProjectThreadSessionIds,
            parkedProjectThreadSessionIdsPersistedAt,
          },
          config.storageV5,
        );
      });
      logForDebugging(
        `[bridge:shutdown] remembered ${n.projectThreadSessionIds.length} live and ${n.parkedProjectThreadSessionIds.length} parked project thread session(s) for the next run`,
      );
    }
  }
  if (sessionStartTimes.size > 0) {
    logForDebugging(`[bridge:shutdown] Shutting down ${sessionStartTimes.size} active session(s)`);
    logger.logStatus(`Shutting down ${sessionStartTimes.size} active session(s)\u2026`);
    let shutdownWorkIds = new Map(sessionWorktrees);
    for (let [sessionId, handle] of sessionStartTimes.entries()) {
      logForDebugging(`[bridge:shutdown] Sending SIGTERM to sessionId=${sessionId}`);
      handle.kill();
    }
    let settled = Promise.allSettled(
      [...shutdownWorkIds.entries()].map(([sessionId, workId]) =>
        trackedApi
          .stopWork(environmentId, workId, currentEnvironmentSecret, true)
          .then(() => logFeatureOk("bridge_work_stop"))
          .catch((error) => {
            if (isEnvironmentGoneError(error)) logFeatureSad("bridge_work_stop", "env_gone");
            else
              logFeatureBad(
                "bridge_work_stop",
                error instanceof BridgeFatalError && error.status === 403
                  ? "shutdown_403"
                  : "shutdown_failed",
              );
            logger.logVerbose(
              `Failed to stop work ${workId} for session ${sessionId}: ${errorMessage(error)}`,
            );
          }),
      ),
    );
    let timeout = new AbortController();
    await Promise.race([
      Promise.allSettled([...sessionStartTimes.values()].map((v) => v.done)),
      sleep(backoff.shutdownGraceMs ?? 30000, timeout.signal),
    ]);
    timeout.abort();
    for (let [sid, handle] of sessionStartTimes.entries()) {
      logForDebugging(`[bridge:shutdown] Force-killing stuck sessionId=${sid}`);
      handle.forceKill();
    }
    tokenRefresh?.cancelAll();
    if (sessionHeartbeatState.size > 0) {
      let remainingWorktrees = [...sessionHeartbeatState.values()];
      sessionHeartbeatState.clear();
      logForDebugging(`[bridge:shutdown] Cleaning up ${remainingWorktrees.length} worktree(s)`);
      await Promise.allSettled(
        remainingWorktrees.map((wt) =>
          cleanupSessionWorktree(wt, logger, {
            storageV5: config.storageV5,
            readDeadlineMs: POLL_RETRY_FLOOR_MS,
          }),
        ),
      );
    }
    await settled;
  }
  if (pendingCleanups_2.size > 0) await Promise.allSettled([...pendingCleanups_2]);
  if (config.preserveOnShutdown && !gaveUp) {
    logger.logStatus(
      config.spawnMode === "single-session" && initialSessionId
        ? `Resume this session by running \`claude remote-control ${config.ownsPointer ? "--continue" : `--session-id ${initialSessionId}`}\``
        : "Environment preserved. Restart `claude remote-control` to reconnect existing sessions.",
    );
    logForDebugging(
      `[bridge:shutdown] Skipping archive+deregister to allow resume (env ${environmentId}, spawnMode ${config.spawnMode})`,
    );
    let n = await config.awaitShutdownCause?.();
    if (n !== "upgrade" && n !== "reload")
      try {
        await trackedApi.markEnvironmentOffline(environmentId, currentEnvironmentSecret);
        logForDebugging("[bridge:shutdown] Environment marked offline");
      } catch (error) {
        logger.logVerbose(
          error instanceof BridgeFatalError && error.status === 401
            ? "Failed to mark environment offline: the environment credential was rejected"
            : `Failed to mark environment offline: ${errorMessage(error)}`,
        );
      }
    return;
  }
  if (sessionsToArchive.size > 0) {
    logForDebugging(`[bridge:shutdown] Archiving ${sessionsToArchive.size} session(s)`);
    await Promise.allSettled(
      [...sessionsToArchive].map((sessionId) =>
        trackedApi
          .archiveSession(compatIdSnapshot.get(sessionId) ?? toCompatSessionId(sessionId))
          .catch((err) => logger.logVerbose(`Failed to archive session ${sessionId}: ${errorMessage(err)}`)),
      ),
    );
  }
  try {
    await trackedApi.deregisterEnvironment(environmentId);
    logForDebugging("[bridge:shutdown] Environment deregistered, bridge offline");
    logger.logVerbose("Environment deregistered.");
  } catch (err) {
    logger.logVerbose(`Failed to deregister environment: ${errorMessage(err)}`);
  }
  if (config.ownsPointer) {
    let { clearBridgePointer } = await import("./chunk-8z86ydvk.js");
    await (config.enqueuePointerWrite ?? ((_) => _()))(async () => {
      config.pointerCleared = true;
      await clearBridgePointer(config.dir, config.storageV5);
    });
  }
  logger.logVerbose("Environment offline.");
  return un;
}
//@ chunk-wbbfk060.js:67919-68060 fingerprint = CONNECTION_ERROR_CODES (0.751)
/**
 * 视为"连不上服务器"的 Node 错误码集合（ECONNREFUSED、ECONNRESET、ETIMEDOUT…ERR_PROXY_TUNNEL）。
 */
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
//@ chunk-wbbfk060.js:68060-68173 layout = isConnectionError (1)
/**
 * 错误码是否属于 CONNECTION_ERROR_CODES。
 */
function isConnectionError(err) {
  if (
    err &&
    typeof err === "object" &&
    "code" in err &&
    typeof err.code === "string" &&
    CONNECTION_ERROR_CODES.has(err.code)
  )
    return true;
  return false;
}
//@ chunk-wbbfk060.js:68173-68250 layout
/**
 * 连接失败分类：timed_out / unreachable / refused（用于 watch 调度器统计）。
 */
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
//@ chunk-wbbfk060.js:68500-68613 fingerprint = isServerError (1)
/**
 * 是否是 axios ERR_BAD_RESPONSE（5xx）。
 */
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
var REGISTER_RETRY_MIN_MS = 30000;
var REGISTER_RETRY_MAX_MS = 300000;
var REGISTER_RETRY_DEFAULT_MS = 60000;
//@ chunk-wbbfk060.js:68645-68708 layout
/**
 * 给延迟加 ±25% 随机抖动。
 */
function jitterDelay(ms) {
  return Math.max(0, ms + ms * 0.25 * (2 * Math.random() - 1));
}
//@ chunk-wbbfk060.js:68708-68785 layout
function formatMs(ms) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}
//@ chunk-wbbfk060.js:68785-68808 layout
var REREGISTER_MIN_BACKOFF_MS = 60000;
var REREGISTER_MAX_BACKOFF_MS = 300000;
//@ chunk-wbbfk060.js:68808-69183 layout
/**
 * 注册 environment（失败不抛出）：失败时调 onFailure，非交互模式按 retry-after（上限 5 分钟、至少约 1 分钟抖动）等待后返回 undefined。
 */
async function tryRegisterEnvironment({ register, interactive, onFailure }) {
  try {
    return await register();
  } catch (error) {
    let status =
      typeof error === "object" && error !== null && "status" in error && typeof error.status === "number"
        ? error.status
        : undefined;
    let retryAfterMs =
      typeof error === "object" &&
      error !== null &&
      "retryAfterMs" in error &&
      typeof error.retryAfterMs === "number"
        ? error.retryAfterMs
        : 0;
    let H =
      !interactive && status !== undefined
        ? Math.max(Math.min(retryAfterMs, REREGISTER_MAX_BACKOFF_MS), jitterDelay(REREGISTER_MIN_BACKOFF_MS))
        : 0;
    await onFailure(error, H);
    if (H > 0) await sleep(H);
    return;
  }
}
//@ chunk-wbbfk060.js:69183-70242 fingerprint = stopWorkWithRetry (0.552)
/**
 * 停止 work：最多 3 次，指数退避；BridgeFatalError 时按 403 可忽略 / environment 已失效 / 其他致命分别记录并立即放弃。
 */
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
      await api.stopWork(environmentId, workId, environmentSecret, false, displayWorkId);
      logForDebugging(`[bridge:work] stopWork succeeded for workId=${displayWorkId} on attempt ${attempt}/3`);
      logFeatureOk("bridge_work_stop");
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
        if (isSuppressibleError(err)) {
          logForDebugging(`[bridge:work] Suppressed stopWork 403 for ${displayWorkId}: ${errMsg}`);
          logFeatureSad("bridge_work_stop", "fatal_403");
        } else if (isEnvironmentGoneError(err)) {
          logForDebugging(
            `[bridge:work] stopWork skipped for ${displayWorkId} \u2014 environment gone: ${errMsg}`,
          );
          logFeatureSad("bridge_work_stop", "env_gone");
        } else {
          logger.logError(`Failed to stop work ${displayWorkId}: ${errMsg}`);
          logFeatureBad(
            "bridge_work_stop",
            err.status === 401 ? "fatal_401" : err.status === 403 ? "fatal_403" : "fatal_other",
          );
        }
        logForDiagnosticsNoPII("error", "bridge_stop_work_failed", {
          attempts: attempt,
          fatal: true,
        });
        return;
      }
      if (attempt < 3) {
        let delay = jitterDelay(baseDelayMs * Math.pow(2, attempt - 1));
        logger.logVerbose(
          `Failed to stop work ${displayWorkId} (attempt ${attempt}/3), retrying in ${formatMs(delay)}: ${errMsg}`,
        );
        await sleep(delay);
      } else {
        logger.logError(`Failed to stop work ${displayWorkId} after 3 attempts: ${errMsg}`);
        logForDiagnosticsNoPII("error", "bridge_stop_work_failed", {
          attempts: 3,
        });
        logFeatureBad("bridge_work_stop", "retries_exhausted");
      }
    }
}
//@ chunk-wbbfk060.js:70242-71424 layout
/**
 * 会话结束后清理 worktree：有未提交改动、领先提交或 checkout 移动时保留并提示，否则移除（removed / left_in_place / failed）。
 */
async function cleanupSessionWorktree(worktree, logger, options) {
  let P = {
    dirty: false,
    commitsAhead: 0,
    gitError: false,
  };
  let changeState;
  if (options?.force) changeState = P;
  else if (worktree.hookBased && worktree.headCommit === undefined)
    changeState = (await lstat(join(worktree.worktreePath, ".git")).then(
      () => true,
      (error) => !(isENOENT(error) || getErrnoCode(error) === "ENOTDIR"),
    ))
      ? {
          dirty: true,
          commitsAhead: 0,
          gitError: true,
        }
      : P;
  else changeState = await getAgentWorktreeChanges(worktree.worktreePath, worktree.headCommit);
  let { dirty, commitsAhead, gitError, checkoutMoved, checkFailed } = changeState;
  if (dirty || commitsAhead > 0 || checkoutMoved === true) {
    let me = `${commitsAhead} ${plural(commitsAhead, "commit")}`;
    let se = gitError
      ? "git error checking changes"
      : checkFailed
        ? "could not check for changes"
        : dirty && commitsAhead > 0
          ? `uncommitted changes \xB7 ${me}`
          : dirty
            ? "uncommitted changes"
            : me;
    if (worktree.gitRoot) await unlockAgentWorktree(worktree.worktreePath, worktree.gitRoot);
    logger.logStatus(`kept worktree ${worktree.worktreePath} \xB7 ${se}`);
    logForDebugging(
      `[bridge:worktree] kept ${worktree.worktreePath} dirty=${dirty} commitsAhead=${commitsAhead} gitError=${!!gitError} checkFailed=${!!checkFailed}`,
    );
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
        undefined,
        undefined,
        {
          storageV5: options?.storageV5,
        },
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
  let n = raw === undefined ? NaN : parseIntLoose(raw);
  if (isNaN(n) || n < 1) return `--capacity requires a positive integer (got: ${raw ?? "<missing>"})`;
  return n;
}
//@ chunk-wbbfk060.js:71805-71986 layout
/**
 * 解析 --preview-port（1024–65535），错误返回提示字符串。
 */
function parsePreviewPortValue(raw) {
  let n = raw === undefined ? NaN : Number(raw);
  if (!Number.isInteger(n) || n < 1024 || n > 65535)
    return `--preview-port requires an integer in [1024, 65535] (got: ${raw ?? "<missing>"})`;
  return n;
}
//@ chunk-wbbfk060.js:71986-75709 fingerprint = parseArgs (0.734)
/**
 * 解析 claude remote-control 参数：--name、--remote-control-session-name-prefix、-c/--continue、--session-id、--permission-mode、--[no-]chrome、--spawn、--capacity、
 * --[no-]create-session-in-dir、--allow-unattended-tool-calls、--debug-file、-v；拒绝 --sandbox，并校验互斥组合；--enable-live-preview/--preview-port 在此构建不可用。
 */
function parseArgs(args) {
  let verbose = false;
  let debugFile;
  let permissionMode;
  let chrome;
  let name;
  let project;
  let sessionNamePrefix;
  let help = false;
  let spawnMode;
  let capacity;
  let createSessionInDir;
  let sessionId;
  let continueSession = false;
  let enableLivePreview = false;
  let previewPorts = [];
  let allowUnattendedToolCalls = false;
  let guest;
  let testVm;
  for (let i = 0; i < args.length; i++) {
    let arg = args[i];
    if (arg === "--help" || arg === "-h") help = true;
    else if (arg === "--verbose" || arg === "-v") verbose = true;
    else if (arg === "--sandbox" || arg === "--no-sandbox")
      return makeError(
        `${arg} is not supported by claude remote-control. The flag had no effect and was removed. ${arg === "--sandbox" ? SANDBOX_SETTING_HINT : "Remove it from the command."}`,
      );
    else if (arg === "--debug-file" && i + 1 < args.length) debugFile = resolve(args[++i]);
    else if (arg.startsWith("--debug-file=")) debugFile = resolve(arg.slice(13));
    else if (arg === "--debug" || arg === "-d" || arg.startsWith("--debug="));
    else if (arg === "--permission-mode" && i + 1 < args.length)
      permissionMode = normalizePermissionModeAlias(args[++i]);
    else if (arg.startsWith("--permission-mode="))
      permissionMode = normalizePermissionModeAlias(arg.slice(18));
    else if (arg === "--chrome") chrome = true;
    else if (arg === "--no-chrome") chrome = false;
    else if (arg === "--name" && i + 1 < args.length) name = args[++i];
    else if (arg.startsWith("--name=")) name = arg.slice(7);
    else if (arg === "--remote-control-session-name-prefix" && i + 1 < args.length)
      sessionNamePrefix = args[++i];
    else if (arg.startsWith("--remote-control-session-name-prefix=")) sessionNamePrefix = arg.slice(37);
    else if (arg === "--session-id" && i + 1 < args.length) {
      sessionId = args[++i];
      if (!sessionId) return makeError("--session-id requires a value");
    } else if (arg.startsWith("--session-id=")) {
      sessionId = arg.slice(13);
      if (!sessionId) return makeError("--session-id requires a value");
    } else if (arg === "--continue" || arg === "-c") continueSession = true;
    else if (arg === "--spawn" || arg.startsWith("--spawn=")) {
      if (spawnMode !== undefined) return makeError("--spawn may only be specified once");
      let raw = arg.startsWith("--spawn=") ? arg.slice(8) : args[++i];
      let v = parseSpawnValue(raw);
      if (v === "single-session" || v === "same-dir" || v === "worktree") spawnMode = v;
      else return makeError(v);
    } else if (arg === "--capacity" || arg.startsWith("--capacity=")) {
      if (capacity !== undefined) return makeError("--capacity may only be specified once");
      let raw = arg.startsWith("--capacity=") ? arg.slice(11) : args[++i];
      let v = parseCapacityValue(raw);
      if (typeof v === "number") capacity = v;
      else return makeError(v);
    } else if (arg === "--create-session-in-dir") createSessionInDir = true;
    else if (arg === "--no-create-session-in-dir") createSessionInDir = false;
    else if (arg === "--enable-live-preview") enableLivePreview = true;
    else if (arg === "--allow-unattended-tool-calls") allowUnattendedToolCalls = true;
    else if (arg === "--preview-port" || arg.startsWith("--preview-port=")) {
      let raw = arg.startsWith("--preview-port=") ? arg.slice(15) : args[++i];
      let error = parsePreviewPortValue(raw);
      if (typeof error === "number") previewPorts.push(error);
      else return makeError(error);
    } else
      return makeError(`Unknown argument: ${arg}
Run 'claude remote-control --help' for usage.`);
  }
  if (spawnMode === "single-session" && capacity !== undefined)
    return makeError(
      "--capacity cannot be used with --spawn=session (single-session mode has fixed capacity 1).",
    );
  if (
    (sessionId || continueSession) &&
    (spawnMode !== undefined || capacity !== undefined || createSessionInDir !== undefined)
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
    verbose,
    debugFile,
    permissionMode,
    chrome,
    name,
    project,
    sessionNamePrefix,
    spawnMode,
    capacity,
    createSessionInDir,
    sessionId,
    continueSession,
    enableLivePreview,
    previewPorts,
    allowUnattendedToolCalls,
    ...(guest !== undefined && {
      guest,
    }),
    ...(testVm !== undefined && {
      testVm,
    }),
    help,
  };
  function makeError(error) {
    return {
      verbose,
      debugFile,
      permissionMode,
      chrome,
      name,
      project,
      sessionNamePrefix,
      spawnMode,
      capacity,
      createSessionInDir,
      sessionId,
      continueSession,
      enableLivePreview,
      previewPorts,
      allowUnattendedToolCalls,
      help,
      error,
    };
  }
}
//@ chunk-wbbfk060.js:75709-75719 layout
var TITLE_MAX_CHARS = 80;
//@ chunk-wbbfk060.js:75719-75998 layout
/**
 * 取恢复会话所需的认证上下文：access token、是否用 v2 会话 CRUD、组织 UUID（v1 时）、trusted device token。
 */
async function getUnarchiveAuthContext(credentials) {
  let s =
    isStorageV5Enabled() && credentials !== undefined
      ? await getBridgeAccessTokenAsync(credentials)
      : getBridgeAccessToken();
  if (!s) return null;
  let S = isCcrV2SessionCrudEnabled();
  let orgUUID;
  if (!S) {
    let { getOrganizationUUID } = await import("./chunk-appaeyg7.js");
    orgUUID = (await getOrganizationUUID()) ?? undefined;
  }
  let trustedDeviceToken = await getTrustedDeviceToken().catch(() => {
    return;
  });
  return {
    accessToken: s,
    useV2: S,
    orgUUID,
    trustedDeviceToken,
  };
}
//@ chunk-wbbfk060.js:75998-76070 layout
function firstByte(data) {
  return typeof data === "string" ? Buffer.from(data, "utf8")[0] : data[0];
}
//@ chunk-wbbfk060.js:76070-77203 layout
/**
 * 重连前解档被回收的会话（tengu_bridge_unarchive_on_resume）：untrusted_device 时注册设备后重试；2xx 记成功、409 视为已活跃、其余保持旧行为。
 */
async function unarchiveBridgeSessionIfNeeded(sessionId, baseUrl, credentials) {
  try {
    let { getFeatureValue_CACHED_MAY_BE_STALE } = await import("./chunk-6df1d6re.js");
    if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_unarchive_on_resume", true)) return false;
    let unarchiveAuthContext = await getUnarchiveAuthContext(credentials);
    if (!unarchiveAuthContext) return false;
    let { accessToken, useV2, orgUUID, trustedDeviceToken } = unarchiveAuthContext;
    let { unarchiveCodeSession } = await import("./chunk-g9dw262t.js");
    let Q = await unarchiveCodeSession(baseUrl, accessToken, sessionId, 1e4, {
      useV2,
      orgUUID,
      trustedDeviceToken,
    });
    if (Q === "untrusted_device") {
      let me = await withUntrustedDeviceRecovery(
        trustedDeviceToken,
        (trustedDeviceToken) =>
          unarchiveCodeSession(baseUrl, accessToken, sessionId, 1e4, {
            useV2,
            orgUUID,
            trustedDeviceToken,
          }),
        credentials,
      );
      if (me !== undefined) Q = me;
    }
    if (typeof Q === "number" && Q < 300) {
      logFeatureOk("bridge_session_unarchive");
      logForDebugging(
        `[bridge:init] Unarchived reaped session ${sessionId} before reattach (status=${String(Q)})`,
      );
      return true;
    }
    if (Q === 409) {
      logForDebugging(
        `[bridge:init] Session ${sessionId} already active (unarchived by another client) \u2014 resuming without a mutation to compensate`,
      );
      return false;
    }
    logFeatureBad("bridge_session_unarchive", typeof Q === "number" ? `http_${Q}` : Q);
    logForDebugging(
      `[bridge:init] Unarchive of reaped session ${sessionId} failed (status=${String(Q)}) \u2014 keeping prior reattach behavior`,
      {
        level: "warn",
      },
    );
    return false;
  } catch (error) {
    logForDebugging(
      `[bridge:init] unarchiveBridgeSessionIfNeeded(${sessionId}) failed: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
    return false;
  }
}
//@ chunk-wbbfk060.js:77203-77332 fingerprint = fetchSessionTitle (0.67)
async function fetchSessionTitle(compatSessionId, baseUrl) {
  let { getBridgeSession } = await import("./chunk-3eyvtwsv.js");
  return (
    (
      await getBridgeSession(compatSessionId, {
        baseUrl,
      })
    )?.title || undefined
  );
}
//@ chunk-wbbfk060.js:77332-77761 layout
/**
 * 每小时刷新一次 bridge pointer 文件（续 mtime，清理过期的 activeSessionIds），定时器 unref。
 */
function startPointerRefreshTimer(
  writeBridgePointer,
  ownProcStartAsync,
  dir,
  P,
  storageV5,
  signal,
  H,
  j,
  isPersistedStampFresh,
  W,
) {
  let interval = setInterval(
    (me, se, Z, M, be, Oe, G, ve, q, re) =>
      void se().then((procStart) =>
        G(() => {
          if (Oe.aborted || re()) return Promise.resolve(false);
          if (
            M.activeSessionIds !== undefined &&
            (M.activeSessionIdsPersistedAt === undefined || !q(M.activeSessionIdsPersistedAt, Date.now(), ve))
          ) {
            delete M.activeSessionIds;
            delete M.activeSessionIdsPersistedAt;
          }
          return me(
            Z,
            {
              ...M,
              procStart,
            },
            be,
          );
        }),
      ),
    3600000,
    writeBridgePointer,
    ownProcStartAsync,
    dir,
    P,
    storageV5,
    signal,
    H,
    j,
    isPersistedStampFresh,
    W,
  );
  interval.unref?.();
  return interval;
}
//@ chunk-wbbfk060.js:77761-99405 fingerprint = bridgeMain (0.576)
/**
 * claude remote-control 入口：解析参数→launcher/工作区信任/Chrome 策略/登录检查→读取 bridge pointer（--continue / --session-id / 崩溃恢复）→询问 spawn 模式→
 * 创建 API 客户端并注册 environment→（可选）预创建会话、写 bridge pointer→注册信号与键盘（空格 QR、w 切换 spawn 模式）→runBridgeLoop→退出清理。
 */
async function bridgeMain(args, storageV5, credentials) {
  let parsed = parseArgs(args);
  if (parsed.help) {
    await printRemoteControlHelp();
    return;
  }
  if (parsed.error) {
    console.error(`Error: ${parsed.error}`);
    process.exit(1);
  }
  let U = processWrapperError();
  if (U) {
    logFeatureBad("agent_launcher", "remote_control_refused");
    console.error(
      `Error: ${U} \u2014 Remote Control sessions are not started unwrapped; fix the launcher, then retry`,
    );
    let { exitAfterAnalyticsFlush } = await import("./chunk-kahpc3cs.js");
    return exitAfterAnalyticsFlush(1);
  }
  lockCurrentVersion();
  setAttestationFilterPolicy(getAttestationFilterPolicy);
  let {
    verbose,
    debugFile,
    permissionMode,
    chrome,
    name,
    project,
    sessionNamePrefix,
    spawnMode: parsedSpawnMode,
    capacity: parsedCapacity,
    createSessionInDir: parsedCreateSessionInDir,
    sessionId: parsedSessionId,
    continueSession,
    enableLivePreview,
    previewPorts,
    allowUnattendedToolCalls,
    guest,
    testVm,
  } = parsed;
  if (sessionNamePrefix) process.env.CLAUDE_REMOTE_CONTROL_SESSION_NAME_PREFIX = sessionNamePrefix;
  let resumeSessionId = parsedSessionId;
  let pointerDir;
  let Be = [];
  if (permissionMode !== undefined) {
    let { PERMISSION_MODES, PERMISSION_MODE_MANUAL_ALIAS } = await import("./chunk-k6t7e4cb.js");
    if (!PERMISSION_MODES.includes(permissionMode)) {
      let mapped = PERMISSION_MODES.map((r) => (r === "default" ? PERMISSION_MODE_MANUAL_ALIAS : r));
      console.error(`Error: Invalid permission mode '${permissionMode}'. Valid modes: ${mapped.join(", ")}`);
      process.exit(1);
    }
  }
  if (
    allowUnattendedToolCalls &&
    (process.stdin.isTTY !== true || process.stdout.isTTY !== true || env.CLAUDE_CODE_CHILD_SESSION === true)
  ) {
    console.error(
      "Error: --allow-unattended-tool-calls needs you at a terminal: it cannot start from a script, a pipe, or a Claude Code session.",
    );
    process.exit(1);
  }
  let dir = resolve(".");
  let { enableConfigs, checkHasTrustDialogAccepted } = await import("./chunk-eesswvbz.js");
  await enableConfigs();
  let { initSinks } = await import("./chunk-19b0wnnf.js");
  initSinks();
  let { setOriginalCwd, setCwdState, isHomeDirectorySession } = await import("./chunk-nj7t53r7.js");
  setOriginalCwd(dir);
  setCwdState(dir);
  if (!checkHasTrustDialogAccepted()) {
    let { canPromptForWorkspaceTrust, offerBridgeWorkspaceTrust } = await import("./chunk-p3rkx9n6.js");
    let y = await offerBridgeWorkspaceTrust({
      dir,
      isHomeDir: isHomeDirectorySession(),
      canPrompt: canPromptForWorkspaceTrust(),
      storageV5,
    });
    if (!y.trusted) {
      console.error(y.message);
      process.exit(1);
    }
    let { resetGrowthBook, initializeGrowthBook } = await import("./chunk-6df1d6re.js");
    resetGrowthBook({
      preservePendingExposures: true,
    });
    initializeGrowthBook().catch((error) => {
      logForDebugging(
        `[bridge:init] GrowthBook re-init after the trust prompt failed: ${error instanceof Error ? error.name : typeof error}`,
        {
          level: "error",
        },
      );
    });
  }
  if (chrome === true) {
    let { getChromeServerPolicyRefusal } = await import("./chunk-5t6stktg.js");
    let chromeServerPolicyRefusal = getChromeServerPolicyRefusal();
    if (chromeServerPolicyRefusal !== null) {
      console.error(`Error: ${chromeServerPolicyRefusal} Start Remote Control without --chrome.`);
      process.exit(1);
    }
  }
  let {
    clearOAuthTokenCache,
    checkAndRefreshOAuthTokenIfNeeded,
    waitForInFlightOAuthRefresh,
    OAUTH_REFRESH_EXIT_WAIT_CAP_MS,
  } = await import("./chunk-7v0gj88m.js");
  let { getBridgeAccessToken, getBridgeAccessTokenAsync, getBridgeBaseUrl } =
    await import("./chunk-prxvet9q.js");
  let useAsyncAuth = isStorageV5Enabled() && credentials !== undefined;
  if (!(useAsyncAuth ? await getBridgeAccessTokenAsync(credentials) : getBridgeAccessToken())) {
    console.error(BRIDGE_LOGIN_ERROR);
    process.exit(1);
  }
  let { getGlobalConfig, saveGlobalConfig, getCurrentProjectConfig, saveCurrentProjectConfig } =
    await import("./chunk-eesswvbz.js");
  if (!getGlobalConfig().remoteDialogSeen) {
    let readline = await import("readline");
    let rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    let y = isBridgeProjectsHintEnabled()
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
    rl.close();
    if (answer.toLowerCase() !== "y" && answer.toLowerCase() !== "yes") process.exit(0);
    await saveGlobalConfig((current) => {
      if (current.remoteDialogSeen) return current;
      return {
        ...current,
        remoteDialogSeen: true,
      };
    }, storageV5);
  }
  if (continueSession) {
    let { readBridgePointerAcrossWorktrees, BRIDGE_POINTER_TTL_MS } = await import("./chunk-8z86ydvk.js");
    let found = await readBridgePointerAcrossWorktrees(dir, storageV5, {
      projectThreadResume: isRcChildRestartResumeEnabled(),
    });
    if (!found) {
      console.error(
        "Error: No recent session found in this directory or its worktrees. Run `claude remote-control` to start a new one.",
      );
      process.exit(1);
    }
    let { pointer, dir: pointerDir_2 } = found;
    let ageMin = Math.round(pointer.ageMs / 60000);
    let ageStr = ageMin < 60 ? `${ageMin}m` : `${Math.round(ageMin / 60)}h`;
    let fromWt = pointerDir_2 !== dir ? ` from worktree ${pointerDir_2}` : "";
    console.error(`Resuming session ${pointer.sessionId} (${ageStr} ago)${fromWt}\u2026`);
    resumeSessionId = pointer.sessionId;
    if (pointer.ageMs > BRIDGE_POINTER_TTL_MS) Be.push(pointer.sessionId);
    pointerDir = pointerDir_2;
  }
  let baseUrl = getBridgeBaseUrl();
  if (baseUrl.startsWith("http://") && !baseUrl.includes("localhost") && !baseUrl.includes("127.0.0.1")) {
    console.error("Error: Remote Control base URL uses HTTP. Only HTTPS or localhost HTTP is allowed.");
    process.exit(1);
  }
  let sessionIngressUrl = baseUrl;
  let { snapshotGitEvidenceForBridge, findGitRoot, redactGitRemoteCredentials } =
    await import("./chunk-rqvep8jc.js");
  let { hasWorktreeCreateHook } = await import("./chunk-zpcme3sa.js");
  let Ot = findGitRoot(dir) !== null;
  let worktreeAvailable = hasWorktreeCreateHook() || Ot;
  let savedSpawnMode = getCurrentProjectConfig().remoteControlSpawnMode;
  if (savedSpawnMode === "worktree" && !worktreeAvailable) {
    console.error(
      "Warning: Saved spawn mode is worktree but this directory is not a git repository. Falling back to same-dir.",
    );
    savedSpawnMode = undefined;
    await saveCurrentProjectConfig((current) => {
      if (current.remoteControlSpawnMode === undefined) return current;
      return {
        ...current,
        remoteControlSpawnMode: undefined,
      };
    }, storageV5);
  }
  if (
    !savedSpawnMode &&
    worktreeAvailable &&
    parsedSpawnMode === undefined &&
    !resumeSessionId &&
    process.stdin.isTTY
  ) {
    let readline = await import("readline");
    let rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
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
    let chosen = answer.trim() === "2" ? "worktree" : "same-dir";
    savedSpawnMode = chosen;
    logEvent("tengu_bridge_spawn_mode_chosen", {
      spawn_mode: fromEnum(chosen),
    });
    await saveCurrentProjectConfig((current) => {
      if (current.remoteControlSpawnMode === chosen) return current;
      return {
        ...current,
        remoteControlSpawnMode: chosen,
      };
    }, storageV5);
  }
  let resumeKind;
  let effectiveSpawnMode;
  if (resumeSessionId) {
    effectiveSpawnMode = "single-session";
    resumeKind = "resume";
  } else if (parsedSpawnMode !== undefined) {
    effectiveSpawnMode = parsedSpawnMode;
    resumeKind = "flag";
  } else if (savedSpawnMode !== undefined) {
    effectiveSpawnMode = savedSpawnMode;
    resumeKind = "saved";
  } else {
    effectiveSpawnMode = "same-dir";
    resumeKind = "gate_default";
  }
  if (resumeKind === "saved" && worktreeAvailable)
    console.log(
      `Spawn mode: ${effectiveSpawnMode} (saved for this folder${process.stdin.isTTY === true ? "; press w to change" : ""})`,
    );
  let maxSessions = effectiveSpawnMode === "single-session" ? 1 : (parsedCapacity ?? SPAWN_SESSIONS_DEFAULT);
  let createSessionInDir = parsedCreateSessionInDir ?? true;
  let _e;
  let Ge;
  let Qe;
  let Ae;
  let lt;
  let ct = [];
  let Bt;
  let projectThreadSessionIdsPersistedAt;
  let Mt;
  let Te = false;
  let Gt = false;
  let vt;
  let Ct = false;
  if (!resumeSessionId && createSessionInDir) {
    let {
      readBridgePointer,
      PERSISTED_SESSION_RESUME_WINDOW_MS,
      BRIDGE_POINTER_TTL_MS,
      isPersistedStampFresh,
      freshProjectThreadSessionIds,
      freshParkedProjectThreadSessionIds,
    } = await import("./chunk-8z86ydvk.js");
    let bridgePointer = await readBridgePointer(
      dir,
      {
        projectThreadResume: isRcChildRestartResumeEnabled(),
      },
      storageV5,
    );
    if (bridgePointer) {
      let { isProcessRunning, isSameProcessAsync } = await import("./chunk-v19g02mx.js");
      if (
        bridgePointer.pid !== undefined &&
        bridgePointer.pid !== process.pid &&
        isProcessRunning(bridgePointer.pid) &&
        (await isSameProcessAsync(bridgePointer.pid, bridgePointer.procStart))
      ) {
        Ct = true;
        logForDebugging(
          `[bridge:init] Pointer writer pid ${bridgePointer.pid} still running; registering a fresh env and deferring pointer write`,
        );
      } else if (bridgePointer.source === "standalone") {
        _e = bridgePointer.environmentId;
        if (bridgePointer.ageMs <= BRIDGE_POINTER_TTL_MS) Ge = bridgePointer.sessionId;
        if (
          bridgePointer.activeSessionIdsPersistedAt !== undefined &&
          isPersistedStampFresh(
            bridgePointer.activeSessionIdsPersistedAt,
            Date.now(),
            PERSISTED_SESSION_RESUME_WINDOW_MS,
          )
        ) {
          Qe = bridgePointer.activeSessionIds;
          Ae = bridgePointer.activeSessionIdsPersistedAt;
        }
        if (isRcChildRestartResumeEnabled()) {
          lt = freshProjectThreadSessionIds(bridgePointer, Date.now());
          ct = freshParkedProjectThreadSessionIds(bridgePointer, Date.now());
          Bt = bridgePointer.parkedProjectThreadSessionIdsPersistedAt;
        }
        logForDebugging(
          `[bridge:init] Found prior environment ${_e} in pointer (ageMs=${bridgePointer.ageMs}); requesting reuse on registration`,
        );
      }
    }
  }
  if (effectiveSpawnMode === "worktree" && !worktreeAvailable) {
    console.error(
      "Error: Worktree mode requires a git repository or WorktreeCreate hooks configured. Use --spawn=session for single-session mode.",
    );
    process.exit(1);
  }
  let hostProfileIfShared = collectHostProfileIfShared();
  let Wt = allowUnattendedToolCalls
    ? await (await import("./chunk-vpsq1tp7.js")).writeUnattendedRunGrant()
    : undefined;
  if (allowUnattendedToolCalls && Wt === undefined) {
    console.error(
      "Error: --allow-unattended-tool-calls could not write to ~/.claude/state. Start it from your own terminal; a sandbox cannot write there.",
    );
    process.exit(1);
  }
  let dn =
    effectiveSpawnMode === "single-session"
      ? undefined
      : import("./chunk-qh5wq2v1.js")
          .then(({ startForegroundToolHost }) =>
            startForegroundToolHost({
              dir,
              credentials,
              hasAccessToken: () => Boolean(getBridgeAccessToken()),
              unattendedGrant: Wt?.token,
              ...(guest !== undefined && {
                guest,
              }),
              ...(testVm !== undefined && {
                testVm,
              }),
              verbose,
              keys: process.stdin.isTTY === true,
            }),
          )
          .catch((error) => {
            logError(
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `tool hosting could not be started (${sanitizeErrorName(error) ?? typeof error})`,
                "tool hosting could not be started",
              ),
            );
            logFeatureSad("bridge_tool_host_foreground", "start_failed");
            Wt?.remove();
            if (allowUnattendedToolCalls)
              console.error(
                "Cloud sessions cannot use this folder: --allow-unattended-tool-calls could not start. Remote Control runs without it.",
              );
            return;
          });
  let { branch, gitRepoUrl, defaultBranch } = await snapshotGitEvidenceForBridge();
  let machineName = hostname();
  let { getOrCreateRemoteControlMachineId } = await import("./chunk-eesswvbz.js");
  let machineId = await getOrCreateRemoteControlMachineId(storageV5);
  let bridgeId = randomUUID();
  let { handleOAuth401Error, getClaudeAIOAuthTokenOriginAsync } = await import("./chunk-7v0gj88m.js");
  let { classifyFailedOAuthRefresh } = await import("./chunk-h0sbtey6.js");
  let api = createBridgeApiClient({
    baseUrl,
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
    getTrustedDeviceToken,
    untrustedDevice: {
      recover: async (_) => {
        let v = await recoverFromUntrustedDevice(_, credentials);
        sayHeldAutomaticEnrollmentNoticeOnStderr();
        return v;
      },
      hint: untrustedDeviceHint,
    },
    useCcrV2SessionCrud: isCcrV2SessionCrudEnabled,
  });
  let Le = _e;
  let tt;
  if (resumeSessionId) {
    let {
      readBridgePointer,
      PERSISTED_SESSION_RESUME_WINDOW_MS,
      isPersistedStampFresh,
      freshProjectThreadSessionIds,
      freshParkedProjectThreadSessionIds,
    } = await import("./chunk-8z86ydvk.js");
    let F = pointerDir ?? dir;
    let bridgePointer = await readBridgePointer(
      F,
      {
        noClear: true,
        projectThreadResume: isRcChildRestartResumeEnabled(),
      },
      storageV5,
    );
    if (bridgePointer?.pid !== undefined && bridgePointer.pid !== process.pid) {
      let { isProcessRunning, isSameProcessAsync } = await import("./chunk-v19g02mx.js");
      if (
        isProcessRunning(bridgePointer.pid) &&
        (await isSameProcessAsync(bridgePointer.pid, bridgePointer.procStart))
      ) {
        if (sameSessionId(bridgePointer.sessionId, resumeSessionId)) {
          console.error(
            `Error: Session ${resumeSessionId} is already being served by another \`claude remote-control\` instance (pid ${bridgePointer.pid}) in ${F}. Use that terminal, or stop it first.`,
          );
          process.exit(1);
        }
        Ct = true;
        tt = bridgePointer;
      }
    }
    if (
      !Ct &&
      bridgePointer?.source === "standalone" &&
      bridgePointer.activeSessionIds?.length &&
      bridgePointer.activeSessionIdsPersistedAt !== undefined &&
      isPersistedStampFresh(
        bridgePointer.activeSessionIdsPersistedAt,
        Date.now(),
        PERSISTED_SESSION_RESUME_WINDOW_MS,
      ) &&
      F === dir
    ) {
      _e = bridgePointer.environmentId;
      Qe = bridgePointer.activeSessionIds;
      Ae = bridgePointer.activeSessionIdsPersistedAt;
    }
    if (!Ct && bridgePointer?.source === "standalone" && F === dir && isRcChildRestartResumeEnabled()) {
      lt = freshProjectThreadSessionIds(bridgePointer, Date.now());
      ct = freshParkedProjectThreadSessionIds(bridgePointer, Date.now());
      Bt = bridgePointer.parkedProjectThreadSessionIdsPersistedAt;
      projectThreadSessionIdsPersistedAt = bridgePointer.projectThreadSessionIdsPersistedAt;
      Mt = bridgePointer.environmentId;
    }
    try {
      validateBridgeId(resumeSessionId, "sessionId");
    } catch {
      console.error(
        `Error: Invalid session ID "${resumeSessionId}". Session IDs must not contain unsafe characters.`,
      );
      process.exit(1);
    }
    await checkAndRefreshOAuthTokenIfNeeded({
      credentials,
      storageV5,
    });
    clearOAuthTokenCache();
    let { getBridgeSessionOrStatus } = await import("./chunk-3eyvtwsv.js");
    let Pe = useAsyncAuth ? await getBridgeAccessTokenAsync(credentials) : undefined;
    let { session, notFound } = await getBridgeSessionOrStatus(resumeSessionId, {
      baseUrl,
      getAccessToken: useAsyncAuth ? () => Pe : getBridgeAccessToken,
      credentials,
    });
    if (!session) {
      if (notFound && pointerDir) {
        let { clearBridgePointer } = await import("./chunk-8z86ydvk.js");
        await clearBridgePointer(pointerDir, storageV5);
      }
      console.error(
        notFound
          ? `Error: Session ${resumeSessionId} not found. It may have been archived or expired.`
          : `Error: Could not reach the server to look up session ${resumeSessionId}. Check your network or run \`claude /login\`, then try again.`,
      );
      process.exit(1);
    }
    if (!session.environment_id) {
      if (pointerDir) {
        let { clearBridgePointer } = await import("./chunk-8z86ydvk.js");
        await clearBridgePointer(pointerDir, storageV5);
      }
      console.error(
        `Error: Session ${resumeSessionId} has no environment_id. It may never have been attached to a bridge.`,
      );
      process.exit(1);
    }
    Le = session.environment_id;
    if (tt && Le === tt.environmentId) {
      console.error(
        `Error: Environment ${Le} is already being served by another \`claude remote-control\` instance (pid ${tt.pid}) in ${pointerDir ?? dir}. Use that terminal, or stop it first.`,
      );
      process.exit(1);
    }
    Te = session.status === "archived";
    logForDebugging(`[bridge:init] Resuming session ${resumeSessionId} on environment ${Le}`);
  }
  let toolHostSetup = await dn;
  logForDebugging(
    `[bridge:init] offering this folder to cloud sessions: ${toolHostSetup?.getToolHostAdvert().kind ?? "not started"}`,
  );
  let bridgeConfig = {
    dir,
    machineName,
    machineId,
    branch,
    gitRepoUrl,
    maxSessions,
    spawnMode: effectiveSpawnMode,
    verbose,
    bridgeId,
    workerType: "claude_code",
    environmentId: randomUUID(),
    reuseEnvironmentId: Le,
    hostProfile: await hostProfileIfShared,
    apiBaseUrl: baseUrl,
    sessionIngressUrl,
    debugFile,
    livePreviewPorts: enableLivePreview ? new Set(previewPorts) : undefined,
    storageV5,
    getToolHostAdvert: toolHostSetup?.getToolHostAdvert,
  };
  logForDebugging(
    `[bridge:init] bridgeId=${bridgeId}${Le ? ` reuseEnvironmentId=${Le}` : ""} dir=${dir} branch=${branch} gitRepoUrl=${redactGitRemoteCredentials(gitRepoUrl)} machine=${machineName}`,
  );
  logForDebugging(`[bridge:init] apiBaseUrl=${baseUrl} sessionIngressUrl=${sessionIngressUrl}`);
  if (debugFile) logForDebugging(`[bridge:init] debugFile=${debugFile}`);
  let toolHostAdvert = bridgeConfig.getToolHostAdvert?.();
  let Ft = await tryRegisterEnvironment({
    register: () =>
      api.registerBridgeEnvironment({
        ...bridgeConfig,
        ...(toolHostAdvert && {
          getToolHostAdvert: () => toolHostAdvert,
        }),
      }),
    interactive: process.stdin.isTTY === true,
    onFailure: async (_, v) => {
      logEvent("tengu_bridge_registration_failed", {
        status: _ instanceof BridgeFatalError ? _.status : undefined,
      });
      await logFeatureBadAsync("remote_control_entry", "registration_failed");
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
      let { flushAnalyticsBeforeExit } = await import("./chunk-kahpc3cs.js");
      await flushAnalyticsBeforeExit();
    },
  });
  if (!Ft) process.exit(1);
  let {
    environment_id: environmentId,
    environment_secret: environmentSecret,
    environment_secret_expires_in: environmentSecretExpiresIn,
  } = Ft;
  classifyAdvertChange(bridgeConfig, toolHostAdvert, environmentId === Le);
  if (_e && !resumeSessionId)
    if (environmentId !== _e) {
      logForDebugging(`Bridge env reuse mismatch: requested ${_e}, backend returned ${environmentId}.`, {
        level: "warn",
      });
      console.warn(
        "Warning: Could not reuse the previous environment. Existing claude.ai/code sessions from the previous run will not reconnect.",
      );
      let { clearBridgePointer } = await import("./chunk-8z86ydvk.js");
      await clearBridgePointer(dir, storageV5);
    } else {
      let { writeBridgePointer, readBridgePointer } = await import("./chunk-8z86ydvk.js");
      let { ownProcStartAsync } = await import("./chunk-v19g02mx.js");
      bridgeConfig.preserveOnShutdown = await writeBridgePointer(
        dir,
        {
          sessionId: Ge ?? "",
          environmentId,
          source: "standalone",
          pid: process.pid,
          procStart: await ownProcStartAsync(),
          ...(Qe?.length && {
            activeSessionIds: Qe,
            activeSessionIdsPersistedAt: Ae,
          }),
          ...(ct.length > 0 && {
            parkedProjectThreadSessionIds: ct,
            parkedProjectThreadSessionIdsPersistedAt: Bt,
          }),
        },
        storageV5,
      );
      bridgeConfig.ownsPointer = bridgeConfig.preserveOnShutdown;
      if (bridgeConfig.preserveOnShutdown) {
        let bridgePointer = await readBridgePointer(
          dir,
          {
            noClear: true,
          },
          storageV5,
        );
        if (bridgePointer && bridgePointer.pid !== undefined && bridgePointer.pid !== process.pid) {
          logForDebugging(`[bridge:init] Lost pointer write race to pid ${bridgePointer.pid}; backing off`, {
            level: "error",
          });
          console.error(
            `Error: Another \`claude remote-control\` instance (pid ${bridgePointer.pid}) is already running in this directory. Exiting to avoid a split-brain conflict.`,
          );
          process.exit(1);
        }
      }
      vt = Ge;
      if (vt) {
        let infraSessionId = toInfraSessionId(vt);
        let r = infraSessionId === vt ? [vt] : [vt, infraSessionId];
        let F = false;
        let D = [];
        for (let ae of r)
          try {
            await api.reconnectSession(environmentId, ae);
            logForDebugging(`[bridge:init] Adopted session ${ae} re-queued via bridge/reconnect`);
            F = true;
            break;
          } catch (err) {
            D.push(err);
            logForDebugging(`[bridge:init] reconnectSession(${ae}) failed: ${errorMessage(err)}`);
          }
        if (!F)
          if (D.length > 0 && D.every((ae) => ae instanceof BridgeFatalError)) vt = undefined;
          else
            logForDebugging(
              "[bridge:init] reconnectSession transient failure; session will be picked up passively once its lease expires",
              {
                level: "warn",
              },
            );
      }
      if (lt?.length) {
        Be.push(...lt);
        let R = await requeueProjectThreadSessions(api, environmentId, lt);
        logForDebugging(
          `[bridge:init] project thread sessions: ${R.requeued} re-queued, ${R.dropped} ended, ${R.deferred} left to the next message`,
        );
      }
    }
  bridgeConfig.boundedResumeSessionIds = Be;
  let Xt;
  if (resumeSessionId)
    if (Le && environmentId !== Le) {
      logForDebugging(
        `Bridge resume env mismatch: requested ${Le}, backend returned ${environmentId}. Falling back to fresh session.`,
        {
          level: "error",
        },
      );
      console.warn(
        `Warning: Could not resume session ${resumeSessionId} \u2014 its environment has expired. Creating a fresh session instead.`,
      );
    } else {
      if (Te) Gt = await unarchiveBridgeSessionIfNeeded(resumeSessionId, baseUrl, credentials);
      let infraResumeId = toInfraSessionId(resumeSessionId);
      let v = infraResumeId === resumeSessionId ? [resumeSessionId] : [resumeSessionId, infraResumeId];
      let reconnected = false;
      let lastReconnectErr;
      for (let candidateId of v)
        try {
          await api.reconnectSession(environmentId, candidateId);
          logForDebugging(`[bridge:init] Session ${candidateId} re-queued via bridge/reconnect`);
          Xt = resumeSessionId;
          reconnected = true;
          bridgeConfig.preserveOnShutdown = true;
          bridgeConfig.ownsPointer = false;
          break;
        } catch (err) {
          lastReconnectErr = err;
          logForDebugging(`[bridge:init] reconnectSession(${candidateId}) failed: ${errorMessage(err)}`);
        }
      if (!reconnected) {
        let r = lastReconnectErr;
        let isFatal = r instanceof BridgeFatalError;
        if (Gt && isFatal)
          await logFeatureBadAsync("bridge_session_unarchive", "abandoned_after_fatal_reconnect");
        if (pointerDir && isFatal) {
          let { clearBridgePointer } = await import("./chunk-8z86ydvk.js");
          await clearBridgePointer(pointerDir, storageV5);
        }
        console.error(
          isFatal
            ? r instanceof BridgeFatalError && r.status !== 401 && isExpiredErrorType(r.errorType)
              ? `Error: ${withReconnectHint(r.message)}`
              : `Error: ${errorMessage(r)}`
            : `Error: Failed to reconnect session ${resumeSessionId}: ${errorMessage(r)}
The session may still be resumable \u2014 try running the same command again.`,
        );
        let { exitAfterAnalyticsFlush } = await import("./chunk-kahpc3cs.js");
        await exitAfterAnalyticsFlush(1);
      }
    }
  logForDebugging(`[bridge:init] Registered, server environmentId=${environmentId}`);
  let startupPollConfig = getPollIntervalConfig();
  logEvent("tengu_bridge_started", {
    max_sessions: bridgeConfig.maxSessions,
    has_debug_file: !!bridgeConfig.debugFile,
    verbose: bridgeConfig.verbose,
    heartbeat_interval_ms: startupPollConfig.non_exclusive_heartbeat_interval_ms,
    spawn_mode: fromEnum(bridgeConfig.spawnMode),
    spawn_mode_source: fromEnum(resumeKind),
    pre_create_session: createSessionInDir,
    worktree_available: worktreeAvailable,
    headless: false,
    tool_host: fromEnum(toolHostSetup?.getToolHostAdvert().kind ?? "not_started"),
    tool_host_blocker: fromEnum(toolHostSetup?.blocker() ?? "none"),
    tool_host_without_git: toolHostSetup?.offeredWithoutGit() ?? false,
    allow_unattended_tool_calls: allowUnattendedToolCalls,
  });
  logFeatureOk("remote_control_entry");
  logForDiagnosticsNoPII("info", "bridge_started", {
    max_sessions: bridgeConfig.maxSessions,
    spawn_mode: bridgeConfig.spawnMode,
  });
  let spawner = createBridgeLogger({
    verbose,
    projectsHint: isBridgeProjectsHintEnabled,
  });
  if (toolHostSetup !== undefined) {
    bridgeConfig.toolHostHandler = toolHostSetup.createHandler({
      api,
      logger: spawner,
    });
    let _ = await toolHostSetup.startupNotice();
    if (_ !== undefined) {
      let v = wrapAnsi(_.unattended ? `${WARNING_GLYPH}  ${_.text}` : _.text, process.stdout.columns || 80);
      console.log(`${_.unattended ? sequential.yellow(v) : v}
`);
    }
    if (bridgeConfig.toolHostHandler === undefined)
      logFeatureSad("bridge_tool_host_foreground", "handler_failed");
    else logFeatureOk("bridge_tool_host_foreground");
  }
  let ownerIdentity = await resolveDaemonOwner(getBridgeAccessToken);
  let launchCommand = getLaunchCommand({
    pinToCurrentBinary: true,
  });
  let spawner_2 = createSessionSpawner({
    execPath: launchCommand.cmd,
    scriptArgs: launchCommand.prefixArgs,
    env: process.env,
    verbose,
    debugFile,
    permissionMode,
    chrome,
    onDebug: logForDebugging,
    onActivity: (sessionId, activity) => {
      logForDebugging(`[bridge:activity] sessionId=${sessionId} ${activity.type} ${activity.summary}`);
    },
    onChildWarning: (_, v) => spawner.logWarning(`${v} (${_})`),
    ownerIdentity,
  });
  let { parseGitHubRepository } = await import("./chunk-zqrznfbt.js");
  let ownerRepo = gitRepoUrl ? parseGitHubRepository(gitRepoUrl) : null;
  let repoName = ownerRepo ? ownerRepo.split("/").pop() : basename(dir);
  spawner.setRepoInfo(repoName, Ot ? branch : "");
  let toggleAvailable = effectiveSpawnMode !== "single-session" && worktreeAvailable;
  if (toggleAvailable) spawner.setSpawnModeDisplay(effectiveSpawnMode);
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
    toolHostSetup?.cancelDisconnect();
    if (v === 32) {
      spawner.toggleQr();
      return;
    }
    if (v === 119) {
      if (!toggleAvailable) return;
      let newMode = bridgeConfig.spawnMode === "same-dir" ? "worktree" : "same-dir";
      bridgeConfig.spawnMode = newMode;
      logEvent("tengu_bridge_spawn_mode_toggled", {
        spawn_mode: fromEnum(newMode),
      });
      spawner.logStatus(
        `Spawn mode: ${newMode === "worktree" ? "worktree (new sessions get isolated git worktrees)" : "same-dir (new sessions share the current directory)"}. Saved for this folder; w switches back.`,
      );
      spawner.setSpawnModeDisplay(newMode);
      spawner.refreshDisplay();
      saveCurrentProjectConfig((current) => {
        if (current.remoteControlSpawnMode === newMode) return current;
        return {
          ...current,
          remoteControlSpawnMode: newMode,
        };
      }, storageV5);
      return;
    }
  };
  let { markPrintModeSignalHandlersRegistered } = await import("./chunk-r3wdn2dp.js");
  if (process.stdin.isTTY) {
    setRawModeSafe(process.stdin, true);
    process.stdin.resume();
    process.stdin.on("data", onStdinData);
  }
  let controller = new AbortController();
  controller.signal.addEventListener("abort", () => void toolHostSetup?.stopHelpers(), {
    once: true,
  });
  let onSigint = () => {
    logForDebugging("[bridge:shutdown] SIGINT received, shutting down");
    controller.abort();
  };
  let onSigterm = () => {
    logForDebugging("[bridge:shutdown] SIGTERM received, shutting down");
    controller.abort();
  };
  let kn = () => {
    logForDebugging("[bridge:shutdown] SIGHUP received, shutting down");
    spawner.detachTerminal();
    process.stdin.off("data", onStdinData);
    process.stdin.pause();
    controller.abort();
  };
  markPrintModeSignalHandlersRegistered();
  process.on("SIGINT", onSigint);
  process.on("SIGTERM", onSigterm);
  process.on("SIGHUP", kn);
  let initialSessionId = Xt ?? vt ?? null;
  let initialSessionTitle;
  if (createSessionInDir && !Xt && !vt) {
    let _ = name ?? `${getBridgeSessionNamePrefix()}-${randomWordSlug()}`;
    let { createBridgeSession } = await import("./chunk-3eyvtwsv.js");
    try {
      let y = useAsyncAuth ? await getBridgeAccessTokenAsync(credentials) : undefined;
      initialSessionId = await createBridgeSession({
        environmentId,
        title: _,
        gitRepoUrl,
        branch,
        defaultBranch,
        signal: controller.signal,
        baseUrl,
        getAccessToken: useAsyncAuth ? () => y : getBridgeAccessToken,
        credentials,
        permissionMode,
        tags: [REMOTE_CONTROL_CLI],
      });
      if (initialSessionId) {
        if (!name) initialSessionTitle = _;
        logForDebugging(`[bridge:init] Created initial session ${initialSessionId}`);
      }
    } catch (err) {
      logForDebugging(`[bridge:init] Session creation failed (non-fatal): ${errorMessage(err)}`);
    }
  }
  let pointerRefreshTimer = null;
  let yn =
    initialSessionId ?? (bridgeConfig.preserveOnShutdown ? (Ge ?? "") : createSessionInDir ? "" : null);
  if (ct.length > 0 && environmentId === (resumeSessionId ? Mt : _e)) {
    bridgeConfig.parkedProjectThreadSessionIds = ct;
    bridgeConfig.parkedProjectThreadSessionIdsPersistedAt = Bt;
  }
  let pointerRecord = null;
  if (yn !== null && !Ct) {
    let {
      writeBridgePointer,
      createBridgePointerWriteQueue,
      PERSISTED_SESSION_RESUME_WINDOW_MS,
      isPersistedStampFresh,
    } = await import("./chunk-8z86ydvk.js");
    let { ownProcStartAsync } = await import("./chunk-v19g02mx.js");
    let bridgePointerWriteQueue = createBridgePointerWriteQueue();
    bridgeConfig.enqueuePointerWrite = bridgePointerWriteQueue;
    pointerRecord = {
      sessionId: yn,
      environmentId,
      source: "standalone",
      pid: process.pid,
      procStart: await ownProcStartAsync(),
      ...(environmentId === _e &&
        Qe?.length && {
          activeSessionIds: Qe,
          activeSessionIdsPersistedAt: Ae,
        }),
      ...(resumeSessionId &&
        environmentId === Mt &&
        lt?.length && {
          projectThreadSessionIds: lt,
          projectThreadSessionIdsPersistedAt,
        }),
      ...(bridgeConfig.parkedProjectThreadSessionIds && {
        parkedProjectThreadSessionIds: bridgeConfig.parkedProjectThreadSessionIds,
        parkedProjectThreadSessionIdsPersistedAt: bridgeConfig.parkedProjectThreadSessionIdsPersistedAt,
      }),
    };
    if (await writeBridgePointer(bridgeConfig.dir, pointerRecord, storageV5)) {
      bridgeConfig.preserveOnShutdown = true;
      bridgeConfig.ownsPointer = true;
      pointerRefreshTimer = startPointerRefreshTimer(
        writeBridgePointer,
        ownProcStartAsync,
        bridgeConfig.dir,
        pointerRecord,
        storageV5,
        controller.signal,
        bridgePointerWriteQueue,
        PERSISTED_SESSION_RESUME_WINDOW_MS,
        isPersistedStampFresh,
        () => bridgeConfig.pointerCleared === true,
      );
    }
  }
  let n = bridgeConfig.enqueuePointerWrite ?? ((_) => _());
  if (bridgeConfig.ownsPointer && pointerRecord !== null && environmentId === _e && Qe?.length) {
    let _ = pointerRecord;
    let v = Qe;
    let { writeBridgePointer } = await import("./chunk-8z86ydvk.js");
    bridgeConfig.onSessionServiced = (R) => {
      if (_.activeSessionIds === undefined) {
        v = [];
        return;
      }
      let r = sessionIdBody(R);
      let filtered = v.filter((ae) => sessionIdBody(ae) !== r);
      if (filtered.length === v.length) return;
      v = filtered;
      if (filtered.length > 0) _.activeSessionIds = filtered;
      else {
        delete _.activeSessionIds;
        delete _.activeSessionIdsPersistedAt;
      }
      let D = {
        ..._,
      };
      n(() => writeBridgePointer(bridgeConfig.dir, D, storageV5));
    };
  }
  try {
    await runBridgeLoop(
      bridgeConfig,
      environmentId,
      environmentSecret,
      api,
      spawner_2,
      toolHostSetup === undefined
        ? spawner
        : {
            ...spawner,
            printBanner: (_, v) => {
              spawner.printBanner(_, v);
              toolHostSetup.bannerDrawn();
            },
          },
      controller.signal,
      undefined,
      initialSessionId ?? undefined,
      async () => {
        clearOAuthTokenCache();
        await checkAndRefreshOAuthTokenIfNeeded({
          credentials,
          storageV5,
        });
        return useAsyncAuth ? await getBridgeAccessTokenAsync(credentials) : getBridgeAccessToken();
      },
      initialSessionTitle,
      environmentSecretExpiresIn,
      {
        classifyFailedOAuthRefresh,
        tokenOrigin: async () => {
          try {
            return await getClaudeAIOAuthTokenOriginAsync(credentials);
          } catch (error) {
            logForDebugging(
              `[bridge:poll] Could not read where the sign-in token came from: ${errorMessage(error)}`,
              {
                level: "warn",
              },
            );
            return "none";
          }
        },
        forgetTokenReads: clearOAuthTokenCache,
      },
    );
  } finally {
    await toolHostSetup?.stopHelpers();
    toolHostSetup?.stop();
    await Wt?.remove();
    if (pointerRefreshTimer !== null) clearInterval(pointerRefreshTimer);
    process.off("SIGINT", onSigint);
    process.off("SIGTERM", onSigterm);
    process.off("SIGHUP", kn);
    process.stdin.off("data", onStdinData);
    if (process.stdin.isTTY) setRawModeSafe(process.stdin, false);
    process.stdin.pause();
  }
  await waitForInFlightOAuthRefresh(OAUTH_REFRESH_EXIT_WAIT_CAP_MS);
  await drainRegisteredWriteQueues();
  let { flushAnalyticsBeforeExit } = await import("./chunk-kahpc3cs.js");
  await flushAnalyticsBeforeExit({
    waitForOAuthRefresh: false,
  });
  try {
    process.exit(0);
  } catch (error) {
    process.kill(process.pid, "SIGKILL");
  }
}
//@ chunk-wbbfk060.js:99405-99494 fingerprint = BridgeHeadlessPermanentError (1)
class BridgeHeadlessPermanentError extends Error {
  constructor(message) {
    super(message);
    this.name = "BridgeHeadlessPermanentError";
  }
}
//@ chunk-wbbfk060.js:99494-99936 layout
/**
 * 把 Remote Control 策略拒绝原因转成错误：org_denied → 永久错误；latched / route_missing / 其他 → 可重试的遥测安全错误。
 */
function policyDenialError(kind, detail) {
  if (!kind) return null;
  let message = detail ?? "Remote Control is disabled by your organization's policy.";
  if (kind === "org_denied") return new BridgeHeadlessPermanentError(message);
  if (kind === "latched")
    return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      message,
      "Remote Control denied: HIPAA latch from an earlier organization (transient, re-evaluated on respawn)",
    );
  if (kind === "route_missing")
    return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      message,
      "Remote Control denied: policy route not served (404)",
    );
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    message,
    "Remote Control denied: policy cache miss (transient)",
  );
}
//@ chunk-wbbfk060.js:99936-107907 fingerprint = runBridgeHeadless (0.405)
/**
 * 宿主（桌面/守护进程）托管的无头 Remote Control：与 bridgeMain 相同的检查与注册流程，但不交互、用回调日志，失败抛 BridgeHeadlessPermanentError 或可重试错误，最后调用 runBridgeLoop。
 */
async function runBridgeHeadless(opts, signal) {
  let { dir, log } = opts;
  let U = processWrapperError();
  if (U)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${U} \u2014 Remote Control sessions are not started unwrapped; the worker retries once the launcher is fixed`,
      "Remote Control worker refused: corporate launcher unresolvable (transient)",
    );
  processChdir(dir);
  let { setOriginalCwd, setCwdState, isHomeDirectorySession } = await import("./chunk-nj7t53r7.js");
  setOriginalCwd(dir);
  setCwdState(dir);
  let { enableConfigs, checkHasTrustDialogAccepted } = await import("./chunk-eesswvbz.js");
  await enableConfigs();
  let { initSinks } = await import("./chunk-19b0wnnf.js");
  initSinks();
  let { getSettingsWithErrors } = await import("./chunk-0crvnfjy.js");
  if (getSettingsWithErrors().settings.disableRemoteControl === true)
    throw new BridgeHeadlessPermanentError(REMOTE_CONTROL_DISABLED_BY_POLICY_MESSAGE);
  let { composePolicyLimitsClient, primePolicyLimitsCache } = await import("./chunk-qchbrsbw.js");
  composePolicyLimitsClient({
    storageV5: opts.storageV5,
    credentials: opts.credentials,
  });
  await primePolicyLimitsCache(opts.storageV5);
  let { loadPolicyLimits } = await import("./chunk-qchbrsbw.js");
  let { policyDeniedReason, policyDenyKind } = await import("./chunk-sbc4zy7a.js");
  await loadPolicyLimits();
  let G = policyDenialError(
    policyDenyKind("allow_remote_control"),
    policyDeniedReason("allow_remote_control", "Remote Control", "is"),
  );
  if (G) throw G;
  if (!checkHasTrustDialogAccepted()) {
    let Se = stripInvisibleChars(dir);
    throw new BridgeHeadlessPermanentError(
      isHomeDirectorySession()
        ? `Workspace not trusted: ${Se} is the home directory, whose trust is never saved \u2014 running \`claude\` there first won't help. Run Remote Control from a project directory instead.`
        : `Workspace not trusted: ${Se}. Run \`claude\` in that directory first to accept the trust dialog.`,
    );
  }
  if (!opts.getAccessToken()) throw Error(BRIDGE_LOGIN_ERROR);
  let { getBridgeBaseUrl } = await import("./chunk-prxvet9q.js");
  let baseUrl = getBridgeBaseUrl();
  if (baseUrl.startsWith("http://") && !baseUrl.includes("localhost") && !baseUrl.includes("127.0.0.1"))
    throw new BridgeHeadlessPermanentError(
      "Remote Control base URL uses HTTP. Only HTTPS or localhost HTTP is allowed.",
    );
  let sessionIngressUrl = baseUrl;
  let { snapshotGitEvidenceForBridge, findGitRoot } = await import("./chunk-rqvep8jc.js");
  let { hasWorktreeCreateHook } = await import("./chunk-zpcme3sa.js");
  if (opts.spawnMode === "worktree") {
    if (!(hasWorktreeCreateHook() || findGitRoot(dir) !== null))
      throw new BridgeHeadlessPermanentError(
        `Worktree mode requires a git repository or WorktreeCreate hooks. Directory ${dir} has neither.`,
      );
  }
  let hostProfileIfShared = collectHostProfileIfShared(signal);
  let { branch, gitRepoUrl, defaultBranch } = await snapshotGitEvidenceForBridge();
  let machineName = hostname();
  let { getOrCreateRemoteControlMachineId } = await import("./chunk-eesswvbz.js");
  let machineId = await getOrCreateRemoteControlMachineId(opts.storageV5);
  let bridgeId = randomUUID();
  let requestedEnvironmentId;
  let ee = false;
  let ce = [];
  let Re;
  let le;
  let projectThreadSessionIdsPersistedAt;
  let L = [];
  let parkedProjectThreadSessionIdsPersistedAt;
  let je = [];
  {
    let {
      readBridgePointer,
      PERSISTED_SESSION_RESUME_WINDOW_MS,
      isPersistedStampFresh,
      freshProjectThreadSessionIds,
      freshParkedProjectThreadSessionIds,
    } = await import("./chunk-8z86ydvk.js");
    let pointer = await readBridgePointer(
      dir,
      {
        projectThreadResume: isRcChildRestartResumeEnabled(),
      },
      opts.storageV5,
    );
    if (pointer) {
      let { isProcessRunning, isSameProcessAsync } = await import("./chunk-v19g02mx.js");
      if (
        pointer.pid !== undefined &&
        pointer.pid !== process.pid &&
        isProcessRunning(pointer.pid) &&
        (await isSameProcessAsync(pointer.pid, pointer.procStart))
      ) {
        ee = true;
        log(
          `pointer writer pid ${pointer.pid} still running; registering fresh env, deferring pointer write`,
        );
      } else if (pointer.source === "standalone") {
        requestedEnvironmentId = pointer.environmentId;
        if (
          opts.persistActiveSessionsOnShutdown &&
          pointer.activeSessionIdsPersistedAt !== undefined &&
          isPersistedStampFresh(
            pointer.activeSessionIdsPersistedAt,
            Date.now(),
            PERSISTED_SESSION_RESUME_WINDOW_MS,
          )
        ) {
          ce = pointer.activeSessionIds ?? [];
          Re = pointer.activeSessionIdsPersistedAt;
        }
        if (isRcChildRestartResumeEnabled()) {
          le = freshProjectThreadSessionIds(pointer, Date.now());
          L = freshParkedProjectThreadSessionIds(pointer, Date.now());
          parkedProjectThreadSessionIdsPersistedAt = pointer.parkedProjectThreadSessionIdsPersistedAt;
          projectThreadSessionIdsPersistedAt = pointer.projectThreadSessionIdsPersistedAt;
        }
        log(
          `found prior environment ${requestedEnvironmentId} in pointer (ageMs=${pointer.ageMs}); requesting reuse on registration`,
        );
      }
    }
  }
  let bridgeConfig = {
    dir,
    machineName,
    machineId,
    branch,
    gitRepoUrl,
    maxSessions: opts.capacity,
    spawnMode: opts.spawnMode,
    verbose: false,
    bridgeId,
    workerType: "claude_code",
    environmentId: randomUUID(),
    reuseEnvironmentId: requestedEnvironmentId,
    hostProfile: await hostProfileIfShared,
    apiBaseUrl: baseUrl,
    sessionIngressUrl,
    storageV5: opts.storageV5,
    onBusyChange: opts.onBusyChange,
    persistActiveSessionsOnShutdown: opts.persistActiveSessionsOnShutdown,
    awaitShutdownCause: opts.awaitShutdownCause,
    getToolHostAdvert: opts.getToolHostAdvert,
  };
  let api = createBridgeApiClient({
    baseUrl,
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
    getTrustedDeviceToken,
    useCcrV2SessionCrud: isCcrV2SessionCrudEnabled,
  });
  let environmentId;
  let environmentSecret;
  let secretExpiresIn;
  try {
    let toolHostAdvert = bridgeConfig.getToolHostAdvert?.();
    let reg = await api.registerBridgeEnvironment({
      ...bridgeConfig,
      ...(toolHostAdvert && {
        getToolHostAdvert: () => toolHostAdvert,
      }),
    });
    environmentId = reg.environment_id;
    environmentSecret = reg.environment_secret;
    secretExpiresIn = reg.environment_secret_expires_in;
    classifyAdvertChange(bridgeConfig, toolHostAdvert, environmentId === requestedEnvironmentId);
  } catch (err) {
    throw Error(`Bridge registration failed: ${errorMessage(err)}`, {
      cause: err,
    });
  }
  logEvent("tengu_bridge_started", {
    max_sessions: bridgeConfig.maxSessions,
    spawn_mode: fromEnum(bridgeConfig.spawnMode),
    heartbeat_interval_ms: getPollIntervalConfig().non_exclusive_heartbeat_interval_ms,
    headless: true,
  });
  let st = [];
  let mt = [];
  if (environmentId === requestedEnvironmentId && le?.length) {
    let Se = new Set(ce.map(sessionIdBody));
    let filtered = le.filter((Ge) => !Se.has(sessionIdBody(Ge)));
    bridgeConfig.boundedResumeSessionIds = filtered;
    let _e = await requeueProjectThreadSessions(api, environmentId, filtered, signal);
    je = _e.unattempted;
    log(
      `project thread sessions: ${_e.requeued} re-queued, ${_e.dropped} ended, ${_e.deferred} left to the next message, ${_e.unattempted.length} carried`,
    );
    logEvent("tengu_bridge_project_thread_requeue", {
      requested: filtered.length,
      requeued: _e.requeued,
      dropped: _e.dropped,
      deferred: _e.deferred,
      unattempted: _e.unattempted.length,
    });
  }
  if (environmentId === requestedEnvironmentId && L.length > 0) {
    bridgeConfig.parkedProjectThreadSessionIds = L;
    bridgeConfig.parkedProjectThreadSessionIdsPersistedAt = parkedProjectThreadSessionIdsPersistedAt;
  }
  if (environmentId === requestedEnvironmentId && ce.length > 0) {
    bridgeConfig.carriedSessionIds = ce;
    log(`re-queuing ${ce.length} session(s) interrupted by the previous shutdown`);
    let Se = false;
    for (let [ke, _e] of ce.entries()) {
      if (signal.aborted) {
        Se = true;
        st = ce.slice(ke);
        break;
      }
      let Ge = await describeReregisterOutcome(api, environmentId, _e, signal);
      log(`re-queue ${_e}: ${Ge}`);
      if (Ge === "aborted") {
        Se = true;
        st = ce.slice(ke);
        break;
      }
      if (Ge === "retry") mt.push(_e);
    }
    if (!Se && mt.length === 0) logFeatureOk("bridge_shutdown_requeue");
  } else if (ce.length > 0) logFeatureBad("bridge_shutdown_requeue", "env_reuse_declined");
  if (mt.length > 0 || st.length > 0) {
    bridgeConfig.initialSessionRequeues = [...st, ...mt];
    bridgeConfig.initialSessionRequeuesPersistedAt = Re;
  }
  let spawner = createHeadlessBridgeLogger(log);
  try {
    bridgeConfig.toolHostHandler = opts.createToolHostHandler?.({
      api,
      logger: spawner,
    });
  } catch (error) {
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `tool-host handler could not be built (${sanitizeErrorName(error) ?? typeof error})`,
        "tool-host handler could not be built",
      ),
    );
  }
  let ownerIdentity = await resolveDaemonOwner(opts.getAccessToken);
  let logger = getLaunchCommand({
    pinToCurrentBinary: true,
  });
  let sessionSpawner = createSessionSpawner({
    execPath: logger.cmd,
    scriptArgs: logger.prefixArgs,
    env: process.env,
    verbose: false,
    permissionMode: opts.permissionMode,
    onDebug: log,
    onChildWarning: (Se, ke) => spawner.logWarning(`${ke} (${Se})`),
    ownerIdentity,
  });
  spawner.printBanner(bridgeConfig, environmentId);
  let initialSessionId;
  if (opts.createSessionOnStart) {
    let { createBridgeSession } = await import("./chunk-3eyvtwsv.js");
    try {
      let sid = await createBridgeSession({
        environmentId,
        title: opts.name,
        gitRepoUrl,
        branch,
        defaultBranch,
        signal,
        baseUrl,
        getAccessToken: opts.getAccessToken,
        permissionMode: opts.permissionMode,
        tags: [REMOTE_CONTROL_AUTO],
      });
      if (sid) {
        initialSessionId = sid;
        log(`created initial session ${sid}`);
      }
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
      writeBridgePointer,
      createBridgePointerWriteQueue,
      PERSISTED_SESSION_RESUME_WINDOW_MS,
      isPersistedStampFresh,
    } = await import("./chunk-8z86ydvk.js");
    let { ownProcStartAsync } = await import("./chunk-v19g02mx.js");
    let Ae = {
      sessionId: initialSessionId ?? "",
      environmentId,
      source: "standalone",
      pid: process.pid,
      procStart: await ownProcStartAsync(),
      ...(st.length > 0 && {
        activeSessionIds: st,
        activeSessionIdsPersistedAt: Re,
      }),
      ...(je.length > 0 && {
        projectThreadSessionIds: je,
        projectThreadSessionIdsPersistedAt,
      }),
      ...(bridgeConfig.parkedProjectThreadSessionIds && {
        parkedProjectThreadSessionIds: bridgeConfig.parkedProjectThreadSessionIds,
        parkedProjectThreadSessionIdsPersistedAt: bridgeConfig.parkedProjectThreadSessionIdsPersistedAt,
      }),
    };
    bridgeConfig.preserveOnShutdown = await writeBridgePointer(dir, Ae, opts.storageV5);
    bridgeConfig.ownsPointer = bridgeConfig.preserveOnShutdown;
    if (bridgeConfig.preserveOnShutdown) {
      bridgeConfig.enqueuePointerWrite = createBridgePointerWriteQueue();
      pt = startPointerRefreshTimer(
        writeBridgePointer,
        ownProcStartAsync,
        dir,
        Ae,
        opts.storageV5,
        signal,
        bridgeConfig.enqueuePointerWrite,
        PERSISTED_SESSION_RESUME_WINDOW_MS,
        isPersistedStampFresh,
        () => bridgeConfig.pointerCleared === true,
      );
    }
  }
  let We;
  try {
    We = await runBridgeLoop(
      bridgeConfig,
      environmentId,
      environmentSecret,
      api,
      sessionSpawner,
      spawner,
      signal,
      undefined,
      initialSessionId,
      async () => opts.getAccessToken(),
      undefined,
      secretExpiresIn,
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
    logSessionStart: (id, _prompt) => log(`session start ${id}`),
    logSessionComplete: (id, ms) => log(`session complete ${id} (${ms}ms)`),
    logSessionFailed: (id, err) => log(`session failed ${id}: ${err}`),
    logStatus: log,
    logVerbose: log,
    logError: (S) => log(`error: ${S}`),
    logWarning: (ms) => log(`warning: ${ms}`),
    logReconnected: (ms) => log(`reconnected after ${ms}ms`),
    addSession: (id, _url) => log(`session attached ${id}`),
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
//@ chunk-b30925fy.js:10731-10769 placement
/**
 * 错误是否标记为可抑制（suppressible）。
 */
function isSuppressibleError(error) {
  return error.suppressible;
}
//@ chunk-b30925fy.js:10769-10996 placement
/**
 * 错误分类给遥测：auth_failed / http_error / no_token / request_failed。
 */
function classifyApiError(error) {
  if (error instanceof BridgeFatalError) return error.status === 401 ? "auth_failed" : "http_error";
  if (error instanceof Error) {
    if (error.message === BRIDGE_LOGIN_INSTRUCTION) return "no_token";
    if ("status" in error && typeof error.status === "number") return "http_error";
  }
  return "request_failed";
}
//@ chunk-b30925fy.js:10996-11165 placement = extractErrorTypeFromData (1)
/**
 * 取响应体里的 error.type。
 */
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
//@ chunk-b30925fy.js:11165-11237 layout
/**
 * environment secret 续期参数：最少剩余 1 小时才续期，提前量为有效期的 1/10（夹在 15 分钟到 1 天之间）再加最多 25% 抖动。
 */
var RENEW_MAX_ATTEMPTS = 3;
var RENEW_MAX_JITTER_PCT = 20;
var MIN_RENEW_LEAD_MS = 60000;
var RENEW_ONE_HOUR_MS = 3600000;
var MIN_RENEW_BEFORE_MS = 900000;
var MAX_RENEW_BEFORE_MS = 86400000;
var RENEW_JITTER_FRACTION = 0.25;
var MIN_RENEWABLE_LIFETIME_MS = 3600000;
//@ chunk-b30925fy.js:11237-11408 fingerprint = addJitter (0.694)
/**
 * 根据 expires_in 计算带抖动的续期时间点；剩余不足 1 小时返回 undefined。
 */
function computeSecretRenewAt(expiresInSeconds, now = Date.now(), random = Math.random) {
  if (
    typeof expiresInSeconds !== "number" ||
    !Number.isFinite(expiresInSeconds) ||
    expiresInSeconds * 1000 < MIN_RENEWABLE_LIFETIME_MS
  )
    return;
  let y = expiresInSeconds * 1000;
  let v =
    Math.min(Math.max(y / 10, MIN_RENEW_BEFORE_MS), MAX_RENEW_BEFORE_MS) *
    (1 + RENEW_JITTER_FRACTION * random());
  return now + y - v;
}
//@ chunk-b30925fy.js:11408-11447 layout
var RENEW_RETRY_MIN_MS = 300000;
var RENEW_RETRY_MAX_MS = 3600000;
var RENEW_RETRY_LIMIT = 3;
var RENEW_FAILURE_LIMIT = 5;
//@ chunk-b30925fy.js:11447-14560 placement
/**
 * 环境通告变化、密钥即将过期或轮询 401 时重新注册环境（[bridge:poll]）。
 */
async function reregisterEnvironment({
  api,
  config,
  environmentId,
  activeSessions,
  attempt,
  trigger,
  signal,
}) {
  if (trigger === "tool_host_advert_changed")
    logForDebugging(
      `[bridge:poll] What this environment advertises changed; re-registering environment ${environmentId} (attempt ${attempt})`,
    );
  else if (trigger === "proactive")
    logForDebugging(
      `[bridge:poll] Environment secret expires soon; re-registering environment ${environmentId} to renew it (attempt ${attempt})`,
      {
        level: "info",
      },
    );
  else
    logForDebugging(
      `[bridge:poll] Poll returned ${trigger === "poll_401" ? 401 : 404}; re-registering environment ${environmentId} (attempt ${attempt}/${RENEW_MAX_ATTEMPTS})`,
      {
        level: "warn",
      },
    );
  let h;
  let R;
  try {
    let { hostProfile, ...i } = config;
    let o = await filterSharedEnvironment(hostProfile);
    config.hostProfile = o;
    let toolHostAdvert = config.getToolHostAdvert?.();
    R = toolHostAdvert;
    h = await api.registerBridgeEnvironment(
      {
        ...i,
        ...(o && {
          hostProfile: o,
        }),
        ...(toolHostAdvert && {
          getToolHostAdvert: () => toolHostAdvert,
        }),
        reuseEnvironmentId: environmentId,
      },
      signal,
    );
  } catch (error) {
    let i =
      error instanceof Error && error.message === BRIDGE_LOGIN_INSTRUCTION ? 401 : fatalClientStatus(error);
    let o = i !== undefined;
    logForDebugging(
      `[bridge:poll] Re-registration of ${environmentId} ${o ? "rejected" : "failed transiently"}: ${errorMessage(error)}`,
      {
        level: o ? "error" : "warn",
      },
    );
    if (
      !o &&
      R !== undefined &&
      R.kind !== "unknown" &&
      !isSameAdvertState(R, config.registeredToolHostAdvert)
    )
      config.registeredToolHostAdvert = "unconfirmed";
    if (signal.aborted)
      return {
        outcome: "transient",
      };
    logEvent("tengu_bridge_env_reregister", {
      attempt,
      outcome: o ? lit("register_rejected") : lit("register_transient"),
      trigger: fromEnum(trigger),
    });
    if (i !== undefined) {
      if (trigger === "tool_host_advert_changed")
        logFeatureSad("bridge_env_reregister", "advert_register_rejected");
      else if (trigger === "proactive") logFeatureSad("bridge_env_reregister", "proactive_register_rejected");
      else logFeatureBad("bridge_env_reregister", "register_rejected");
      return {
        outcome: "fatal",
        reason: "register_rejected",
        status: i,
        message: errorMessage(error),
      };
    }
    return {
      outcome: "transient",
      retryAfterMs: retryAfterMsOf(error),
    };
  }
  if (h.environment_id !== environmentId) {
    logForDebugging(
      `[bridge:poll] Re-registration returned ${h.environment_id}, not ${environmentId}; not adopting it`,
      {
        level: "warn",
      },
    );
    logEvent("tengu_bridge_env_reregister", {
      attempt,
      outcome: lit("replaced"),
      trigger: fromEnum(trigger),
    });
    if (trigger === "tool_host_advert_changed") logFeatureSad("bridge_env_reregister", "advert_replaced");
    else if (trigger === "proactive") logFeatureSad("bridge_env_reregister", "proactive_replaced");
    else logFeatureBad("bridge_env_reregister", "replaced");
    await api.deregisterEnvironment(h.environment_id).catch((error) =>
      logForDebugging(
        `[bridge:poll] Failed to delete replacement environment ${h.environment_id}: ${errorMessage(error)}`,
        {
          level: "warn",
        },
      ),
    );
    return {
      outcome: "fatal",
      reason: "replaced",
    };
  }
  classifyAdvertChange(config, R, true);
  let k = [...activeSessions.keys()];
  logEvent("tengu_bridge_env_reregister", {
    attempt,
    outcome: lit("reregistered"),
    active_sessions: k.length,
    trigger: fromEnum(trigger),
  });
  logForDiagnosticsNoPII("info", "bridge_env_reregistered", {
    attempt,
    active_sessions: k.length,
    trigger,
  });
  if (trigger === "proactive") {
    logForDebugging(`[bridge:poll] Environment ${environmentId} re-registered in place; secret renewed`, {
      level: "info",
    });
    return {
      outcome: "reregistered",
      environmentSecret: h.environment_secret,
      ...(h.environment_secret_expires_in !== undefined && {
        environmentSecretExpiresIn: h.environment_secret_expires_in,
      }),
      pendingRequeues: [],
    };
  }
  logForDebugging(
    `[bridge:poll] Environment ${environmentId} re-registered in place; re-queuing ${k.length} session(s)`,
    {
      level: "info",
    },
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
    ...(h.environment_secret_expires_in !== undefined && {
      environmentSecretExpiresIn: h.environment_secret_expires_in,
    }),
    pendingRequeues: S,
  };
}
//@ chunk-b30925fy.js:14560-15121 placement
async function describeAdvertChange({ api, config, environmentId, activeSessions, pacing, signal }) {
  let T;
  try {
    let toolHostAdvert = config.getToolHostAdvert?.();
    if (toolHostAdvert === undefined || toolHostAdvert.kind === "unknown") return;
    if (isSameAdvertState(toolHostAdvert, config.registeredToolHostAdvert)) {
      pacing.failures = 0;
      return;
    }
    let k = pacing.notBefore - Date.now();
    if (k > 0 && k <= RENEW_ONE_HOUR_MS) return;
    T = await reregisterEnvironment({
      api,
      config,
      environmentId,
      activeSessions,
      attempt: pacing.failures + 1,
      trigger: "tool_host_advert_changed",
      signal,
    });
  } catch (error) {
    if (!signal.aborted) logError(error);
  }
  let h = T?.outcome === "reregistered" ? T : undefined;
  pacing.failures = h ? 0 : pacing.failures + 1;
  pacing.notBefore = Date.now() + Math.min(MIN_RENEW_LEAD_MS * 2 ** pacing.failures, RENEW_ONE_HOUR_MS);
  return h;
}
//@ chunk-b30925fy.js:15121-15422 placement
function classifyAdvertChange(e, n, p) {
  if (n === undefined || (n.kind === "unknown" && p)) return;
  let registeredToolHostAdvert = e.registeredToolHostAdvert;
  let u =
    n.kind === "advertise"
      ? {
          kind: "advertise",
          advert: n.advert,
        }
      : {
          kind: "withdraw",
        };
  e.registeredToolHostAdvert = u;
  if (
    !isSameAdvertState(
      u,
      registeredToolHostAdvert ?? {
        kind: "withdraw",
      },
    )
  )
    logEvent("tengu_bridge_tool_host_advert", {
      advertised: u.kind === "advertise",
    });
}
//@ chunk-b30925fy.js:15422-15701 placement
async function describeReregisterOutcome(trackedApi, environmentId, p, y) {
  try {
    await trackedApi.reconnectSession(environmentId, p, y);
    return "done";
  } catch (error) {
    let v = hasFatalClientStatus(error);
    logForDebugging(
      `[bridge:poll] reconnectSession(${p}) after re-registration ${v ? "rejected" : "failed transiently"}: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
    if (v) return "done";
    return y.aborted ? "aborted" : "retry";
  }
}
//@ chunk-b30925fy.js:15701-15847 placement
function isSameAdvertState(e, registeredToolHostAdvert) {
  if (registeredToolHostAdvert === undefined || registeredToolHostAdvert === "unconfirmed") return false;
  return e.kind === "advertise" && registeredToolHostAdvert.kind === "advertise"
    ? En(e.advert, registeredToolHostAdvert.advert)
    : e.kind === registeredToolHostAdvert.kind;
}
//@ chunk-b30925fy.js:15847-15969 placement
/**
 * 错误对象中的 retryAfterMs。
 */
function retryAfterMsOf(e) {
  return e && typeof e === "object" && "retryAfterMs" in e && typeof e.retryAfterMs === "number"
    ? e.retryAfterMs
    : undefined;
}
//@ chunk-b30925fy.js:15969-16006 placement
/**
 * 判断 API 错误是否带致命客户端状态（fatalClientStatus 有值即为致命，决定是否停止重试）。
 */
function hasFatalClientStatus(e) {
  return fatalClientStatus(e) !== undefined;
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
export {
  isCodeSegment,
  formatDelay,
  retryAfterMsOf,
  hasFatalClientStatus,
  classifyApiError,
  extractErrorTypeFromData,
};
