/**
 * bridge/bridgeMain.ts
 *
 * Remote Control 独立桥主循环（环境注册、轮询工作、派生会话）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/bridgeMain.ts
 * pieces: chunk-18851qev.js (54), chunk-a3r2kq46.js (1), chunk-v3wm90pf.js (14)
 * attribution: sole-consumer 18, fingerprint 17, layout 23, placement 11
 */
import { stat, realpath, lstat } from "fs/promises";
import { dirname, basename, join, resolve } from "path";
import { hostname } from "os";
import { randomUUID } from "crypto";
import { BridgeFatalError, isExpiredErrorType, createBridgeApiClient } from "./bridgeApi.js";
import {
  BRIDGE_LOGIN_INSTRUCTION,
  WORK_STATE_QUEUED,
  SANDBOX_SETTING_HINT,
  BRIDGE_LOGIN_ERROR,
} from "./types.js";
import { logForDebugging } from "../utils/debug.js";
import { filterSharedEnvironment, collectHostProfileIfShared } from "../utils/toolchainDetection.js";
import {
  errorMessage,
  isPathAbsent,
  withTelemetryMessage,
  toError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  sanitizeErrorName,
  classifyAxiosError,
  sanitizedOAuthErrorTypeForTelemetry,
  isENOENT,
  getErrnoCode,
} from "../utils/errors.js";
import { logEvent } from "../services/analytics/index.js";
import { lit, fromEnum, fromEnumOpt } from "../services/analytics/safeMetadata.js";
import {
  logFeatureSad,
  logFeatureBad,
  logFeatureOk,
  logFeatureBadAsync,
} from "../services/analytics/featureTelemetry.js";
import { logForDiagnosticsNoPII } from "../utils/diagLogs.js";
import { logError } from "../utils/log.js";
import { import_sortedIndex_2 } from "../../vendor/lodash-es/_inlinedHelpers.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { stringSchema, objectSchema, literal } from "../../vendor/zod/v4/classic/schemas.js";
import { sleep, backoffDelayMs, systemClock } from "../utils/sleep.js";
import { SSEFrameBuffer } from "../cli/transports/SSETransport.js";
import { jsonParseRaw } from "../utils/slowOperations.js";
import { BoundedUUIDSet } from "./bridgeMessaging.js";
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
import {
  claudeBinPath,
  withProcessWrapper,
  resolveLaunchTarget,
  getLaunchCommand,
} from "../utils/deepLink/registerProtocol.js";
import { getNativeVersionsDir } from "../utils/xdg.js";
import { isSemverVersion } from "../utils/model/modelCatalog/catalogCapabilities.js";
import { isNewerBuild } from "../services/daemon/reapJobs.js";
import { processWrapperError } from "../utils/processWrapper.js";
import { onceExport } from "../../vendor/lodash-es/once.js";
import { readBridgeSessionTags, fetchBridgeSessionTags } from "./sessionTags.js";
import { createCapacityWake } from "./capacityWake.js";
import { getPollIntervalConfig } from "./pollConfig.js";
import { createTokenRefreshScheduler } from "./jwtUtils.js";
import { formatDuration, truncateToWidth } from "../utils/format.js";
import { plural } from "../utils/stringUtils.js";
import { connectedBridgePolicyRefusal } from "./bridgeEntitlement.js";
import { isLovelyUmbrellaOn } from "../utils/settings/settingsSourceTrust.js";
import { onPolicyVerdictChanged } from "../services/policyLimits/policyState.js";
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
import { lockCurrentVersion } from "../utils/nativeInstaller/installer.js";
import { setAttestationFilterPolicy } from "./deviceAttestation.js";
import { env } from "../utils/env.js";
import { createBridgeLogger } from "./bridgeUI.js";
import { wrapAnsi } from "../ink/wrapAnsi.js";
import { WARNING_GLYPH } from "../constants/figures.js";
import { sequential } from "../utils/sequential.js";
import { resolveDaemonOwner } from "./ownerPin.js";
import { setRawModeSafe } from "../ink/setRawModeSafe.js";
import { randomWordSlug } from "../utils/words.js";
import { REMOTE_CONTROL_CLI, REMOTE_CONTROL_AUTO } from "./sessionOrigins.js";
import { drainRegisteredWriteQueues } from "../utils/settings/writeQueues.js";
import { processChdir } from "../utils/fsOperations.js";
import { REMOTE_CONTROL_DISABLED_BY_POLICY_MESSAGE } from "./remoteControlPolicy.js";
import { stripInvisibleChars } from "../utils/invisibleChars.js";

//@ chunk-a3r2kq46.js:45143-45277 fingerprint (2.1.88 match: formatDelay, 0.486)
function formatDelay(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms % 60000 === 0) return `${ms / 60000}min`;
  return ms % 1000 === 0 ? `${ms / 1000}s` : `${(ms / 1000).toFixed(1)}s`;
}
//@ chunk-v3wm90pf.js:10731-10769 placement
/**
 * 错误是否标记为可抑制（suppressible）。
 */
function isSuppressibleError(error) {
  return error.suppressible;
}
//@ chunk-v3wm90pf.js:10769-10996 placement
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
//@ chunk-v3wm90pf.js:10996-11165 placement (2.1.88 match: extractErrorTypeFromData, 1)
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
//@ chunk-v3wm90pf.js:11165-11237 layout
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
//@ chunk-v3wm90pf.js:11237-11408 layout
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
  let lifetimeMs = expiresInSeconds * 1000;
  let renewBeforeMs =
    Math.min(Math.max(lifetimeMs / 10, MIN_RENEW_BEFORE_MS), MAX_RENEW_BEFORE_MS) *
    (1 + RENEW_JITTER_FRACTION * random());
  return now + lifetimeMs - renewBeforeMs;
}
//@ chunk-v3wm90pf.js:11408-11447 layout
var RENEW_RETRY_MIN_MS = 300000;
var RENEW_RETRY_MAX_MS = 3600000;
var RENEW_RETRY_LIMIT = 3;
var RENEW_FAILURE_LIMIT = 5;
//@ chunk-v3wm90pf.js:11447-14560 placement
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
  let registeredEnvironment;
  let toolHostAdvert;
  try {
    let { hostProfile, ...configWithoutHostProfile } = config;
    let sharedHostProfile = await filterSharedEnvironment(hostProfile);
    config.hostProfile = sharedHostProfile;
    let toolHostAdvert_2 = config.getToolHostAdvert?.();
    toolHostAdvert = toolHostAdvert_2;
    registeredEnvironment = await api.registerBridgeEnvironment(
      {
        ...configWithoutHostProfile,
        ...(sharedHostProfile && {
          hostProfile: sharedHostProfile,
        }),
        ...(toolHostAdvert_2 && {
          getToolHostAdvert: () => toolHostAdvert_2,
        }),
        reuseEnvironmentId: environmentId,
      },
      signal,
    );
  } catch (error) {
    let fatalStatus =
      error instanceof Error && error.message === BRIDGE_LOGIN_INSTRUCTION ? 401 : fatalClientStatus(error);
    let isFatal = fatalStatus !== undefined;
    logForDebugging(
      `[bridge:poll] Re-registration of ${environmentId} ${isFatal ? "rejected" : "failed transiently"}: ${errorMessage(error)}`,
      {
        level: isFatal ? "error" : "warn",
      },
    );
    if (
      !isFatal &&
      toolHostAdvert !== undefined &&
      toolHostAdvert.kind !== "unknown" &&
      !isSameAdvertState(toolHostAdvert, config.registeredToolHostAdvert)
    )
      config.registeredToolHostAdvert = "unconfirmed";
    if (signal.aborted)
      return {
        outcome: "transient",
      };
    logEvent("tengu_bridge_env_reregister", {
      attempt,
      outcome: isFatal ? lit("register_rejected") : lit("register_transient"),
      trigger: fromEnum(trigger),
    });
    if (fatalStatus !== undefined) {
      if (trigger === "tool_host_advert_changed")
        logFeatureSad("bridge_env_reregister", "advert_register_rejected");
      else if (trigger === "proactive") logFeatureSad("bridge_env_reregister", "proactive_register_rejected");
      else logFeatureBad("bridge_env_reregister", "register_rejected");
      return {
        outcome: "fatal",
        reason: "register_rejected",
        status: fatalStatus,
        message: errorMessage(error),
      };
    }
    return {
      outcome: "transient",
      retryAfterMs: retryAfterMsOf(error),
    };
  }
  if (registeredEnvironment.environment_id !== environmentId) {
    logForDebugging(
      `[bridge:poll] Re-registration returned ${registeredEnvironment.environment_id}, not ${environmentId}; not adopting it`,
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
    await api.deregisterEnvironment(registeredEnvironment.environment_id).catch((error) =>
      logForDebugging(
        `[bridge:poll] Failed to delete replacement environment ${registeredEnvironment.environment_id}: ${errorMessage(error)}`,
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
  classifyAdvertChange(config, toolHostAdvert, true);
  let sessionIds = [...activeSessions.keys()];
  logEvent("tengu_bridge_env_reregister", {
    attempt,
    outcome: lit("reregistered"),
    active_sessions: sessionIds.length,
    trigger: fromEnum(trigger),
  });
  logForDiagnosticsNoPII("info", "bridge_env_reregistered", {
    attempt,
    active_sessions: sessionIds.length,
    trigger,
  });
  if (trigger === "proactive") {
    logForDebugging(`[bridge:poll] Environment ${environmentId} re-registered in place; secret renewed`, {
      level: "info",
    });
    return {
      outcome: "reregistered",
      environmentSecret: registeredEnvironment.environment_secret,
      ...(registeredEnvironment.environment_secret_expires_in !== undefined && {
        environmentSecretExpiresIn: registeredEnvironment.environment_secret_expires_in,
      }),
      pendingRequeues: [],
    };
  }
  logForDebugging(
    `[bridge:poll] Environment ${environmentId} re-registered in place; re-queuing ${sessionIds.length} session(s)`,
    {
      level: "info",
    },
  );
  let pendingRequeues = [];
  for (let sessionId of sessionIds) {
    if (signal.aborted) break;
    if (!activeSessions.has(sessionId)) continue;
    if ((await describeReregisterOutcome(api, environmentId, sessionId, signal)) !== "done")
      pendingRequeues.push(sessionId);
  }
  return {
    outcome: "reregistered",
    environmentSecret: registeredEnvironment.environment_secret,
    ...(registeredEnvironment.environment_secret_expires_in !== undefined && {
      environmentSecretExpiresIn: registeredEnvironment.environment_secret_expires_in,
    }),
    pendingRequeues,
  };
}
//@ chunk-v3wm90pf.js:14560-15121 placement
async function describeAdvertChange({ api, config, environmentId, activeSessions, pacing, signal }) {
  let outcome;
  try {
    let advert = config.getToolHostAdvert?.();
    if (advert === undefined || advert.kind === "unknown") return;
    if (isSameAdvertState(advert, config.registeredToolHostAdvert)) {
      pacing.failures = 0;
      return;
    }
    let waitMs = pacing.notBefore - Date.now();
    if (waitMs > 0 && waitMs <= RENEW_ONE_HOUR_MS) return;
    outcome = await reregisterEnvironment({
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
  let reregistered = outcome?.outcome === "reregistered" ? outcome : undefined;
  pacing.failures = reregistered ? 0 : pacing.failures + 1;
  pacing.notBefore = Date.now() + Math.min(MIN_RENEW_LEAD_MS * 2 ** pacing.failures, RENEW_ONE_HOUR_MS);
  return reregistered;
}
//@ chunk-v3wm90pf.js:15121-15422 placement
function classifyAdvertChange(config, toolHostAdvert, forceUnknown) {
  if (toolHostAdvert === undefined || (toolHostAdvert.kind === "unknown" && forceUnknown)) return;
  let registeredToolHostAdvert = config.registeredToolHostAdvert;
  let normalizedAdvert =
    toolHostAdvert.kind === "advertise"
      ? {
          kind: "advertise",
          advert: toolHostAdvert.advert,
        }
      : {
          kind: "withdraw",
        };
  config.registeredToolHostAdvert = normalizedAdvert;
  if (
    !isSameAdvertState(
      normalizedAdvert,
      registeredToolHostAdvert ?? {
        kind: "withdraw",
      },
    )
  )
    logEvent("tengu_bridge_tool_host_advert", {
      advertised: normalizedAdvert.kind === "advertise",
    });
}
//@ chunk-v3wm90pf.js:15422-15701 placement
async function describeReregisterOutcome(trackedApi, environmentId, sessionId, signal) {
  try {
    await trackedApi.reconnectSession(environmentId, sessionId, signal);
    return "done";
  } catch (error) {
    let isFatal = hasFatalClientStatus(error);
    logForDebugging(
      `[bridge:poll] reconnectSession(${sessionId}) after re-registration ${isFatal ? "rejected" : "failed transiently"}: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
    if (isFatal) return "done";
    return signal.aborted ? "aborted" : "retry";
  }
}
//@ chunk-v3wm90pf.js:15701-15847 placement
function isSameAdvertState(advert, registeredToolHostAdvert) {
  if (registeredToolHostAdvert === undefined || registeredToolHostAdvert === "unconfirmed") return false;
  return advert.kind === "advertise" && registeredToolHostAdvert.kind === "advertise"
    ? import_sortedIndex_2(advert.advert, registeredToolHostAdvert.advert)
    : advert.kind === registeredToolHostAdvert.kind;
}
//@ chunk-v3wm90pf.js:15847-15969 placement
/**
 * 错误对象中的 retryAfterMs。
 */
function retryAfterMsOf(error) {
  return error &&
    typeof error === "object" &&
    "retryAfterMs" in error &&
    typeof error.retryAfterMs === "number"
    ? error.retryAfterMs
    : undefined;
}
//@ chunk-v3wm90pf.js:15969-16006 placement
/**
 * 判断 API 错误是否带致命客户端状态（fatalClientStatus 有值即为致命，决定是否停止重试）。
 */
function hasFatalClientStatus(error) {
  return fatalClientStatus(error) !== undefined;
}
//@ chunk-v3wm90pf.js:16006-16207 placement
function fatalClientStatus(error) {
  if (error instanceof BridgeFatalError) return error.status;
  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    typeof error.status === "number" &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 408 &&
    error.status !== 429
  )
    return error.status;
  return;
}
//@ chunk-18851qev.js:21003-21183 sole-consumer
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
//@ chunk-18851qev.js:21183-21246 sole-consumer
function clockSnapshot(clock) {
  return {
    wall: clock.now(),
    monotonic: clock.monotonicNow(),
  };
}
//@ chunk-18851qev.js:21246-21592 sole-consumer
/**
 * 桥会话响应 schema（字符串长度上限、可空字段）。
 */
var BoundedStringSchema = DoctorLazy(() => stringSchema().max(256));
var OptionalBoundedString = DoctorLazy(() =>
  BoundedStringSchema()
    .nullish()
    .transform((value) => value ?? undefined),
);
var BridgeSessionSchema = DoctorLazy(() =>
  objectSchema({
    id: BoundedStringSchema().min(1),
    environment_id: OptionalBoundedString(),
    status: OptionalBoundedString(),
    worker_status: OptionalBoundedString(),
    last_event_at: OptionalBoundedString(),
    external_metadata: objectSchema({
      tool_host_status: objectSchema({
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
//@ chunk-18851qev.js:21592-25783 sole-consumer
/**
 * 维护 off/连接中/已连接等状态，状态变化回调 onStateChange；每次尝试带代号与中止控制器， 失败按 HTTP 状态决定结束或在退避后重试；用墙钟与单调钟的差检测休眠。
 */
function createBridgeWatcher(options) {
  let { api, clock, random } = options;
  let watchState = "off";
  let attemptGeneration = 0;
  let attemptAbort;
  let tickTimer;
  let attemptTimer;
  let resumeToken;
  let lastFrameAt = {
    wall: 0,
    monotonic: 0,
  };
  let lastSyncAt = lastFrameAt;
  let nextConnectAllowedAt = -1 / 0;
  let connectedAtMono;
  function elapsedSince(snapshot) {
    return Math.max(clock.now() - snapshot.wall, clock.monotonicNow() - snapshot.monotonic);
  }
  let sessionLifetimeMs = WATCH_SESSION_LIFETIME_MIN_MS;
  let backoffAttempts = 0;
  let startFailureCount = 0;
  function callSafely(onDroppedFrame) {
    try {
      onDroppedFrame();
    } catch (error) {
      logError(error);
    }
  }
  function setState(nextState, reason) {
    if (nextState !== watchState) {
      logForDebugging(`[bridge:watch] ${watchState} -> ${nextState}${reason ? ` after ${reason}` : ""}`);
      watchState = nextState;
      callSafely(() => options.onStateChange(nextState, reason));
    }
  }
  function cancelAttempt() {
    attemptGeneration++;
    attemptAbort?.abort();
    attemptAbort = undefined;
    tickTimer?.();
    attemptTimer?.();
    tickTimer = attemptTimer = undefined;
  }
  function scheduleNextAttempt(delayMs) {
    let safeDelayMs = Number.isFinite(delayMs) ? delayMs : WATCH_BACKOFF_CAP_MS;
    logForDebugging(`[bridge:watch] next attempt in ${Math.round(safeDelayMs / 1000)}s`);
    attemptTimer = clock.setTimeout(startAttempt, safeDelayMs, {
      unref: true,
    });
  }
  function startAttempt() {
    cancelAttempt();
    let generation = attemptGeneration;
    let abortController = new AbortController();
    attemptAbort = abortController;
    lastFrameAt = lastSyncAt = clockSnapshot(clock);
    sessionLifetimeMs =
      WATCH_SESSION_LIFETIME_MIN_MS +
      random() * (WATCH_SESSION_LIFETIME_MAX_MS - WATCH_SESSION_LIFETIME_MIN_MS);
    armTickTimer(generation);
    runAttempt(generation, abortController.signal)
      .catch((error) => {
        if (generation !== attemptGeneration)
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
      .then((endReason) => {
        if (generation === attemptGeneration) endAttempt(endReason);
      })
      .catch(logError);
    setState("connecting");
  }
  function armTickTimer(generation) {
    tickTimer = clock.setTimeout(
      () => {
        if (generation !== attemptGeneration) return;
        let silentMs = elapsedSince(lastFrameAt);
        if (silentMs > 2 * WATCH_SILENCE_TIMEOUT_MS)
          endAttempt({
            end: "slept",
          });
        else if (silentMs > WATCH_SILENCE_TIMEOUT_MS)
          endAttempt({
            end: watchState === "connected" ? "silent" : "connect_timeout",
          });
        else if (elapsedSince(lastSyncAt) > sessionLifetimeMs)
          endAttempt({
            end: "no_sync",
          });
        else armTickTimer(generation);
      },
      WATCH_TICK_INTERVAL_MS,
      {
        unref: true,
      },
    );
  }
  async function runAttempt(generation, signal) {
    let networkEnd = {
      end: "network",
    };
    let accessToken = await options.getAccessToken();
    if (generation !== attemptGeneration) return networkEnd;
    if (!accessToken)
      return {
        end: "auth",
      };
    let tokenAgeMs = resumeToken === undefined ? 1 / 0 : clock.now() - resumeToken.at;
    if (!(tokenAgeMs >= 0 && tokenAgeMs < BRIDGE_WATCH_DEADLINE_MS)) {
      let waitMs = nextConnectAllowedAt - clock.monotonicNow();
      if (waitMs > 0)
        await sleep(waitMs, signal, {
          clock,
        });
      if (generation !== attemptGeneration) return networkEnd;
      lastFrameAt = clockSnapshot(clock);
      resumeToken = undefined;
      nextConnectAllowedAt = clock.monotonicNow() + WATCH_CONNECT_DEADLINE_MS * (1 + 0.5 * random());
      let minted = await api.mintResumeToken(accessToken, signal);
      if (generation !== attemptGeneration) return networkEnd;
      if (minted.status !== 200)
        return minted.status === 404 || minted.status === 410
          ? {
              end: "http_unexpected",
            }
          : classifyWatchHttpStatus(minted.status, minted.retryAfterMs);
      if (minted.resumeToken === undefined || !PRINTABLE_TOKEN_RE.test(minted.resumeToken))
        return {
          end: "resume_token_unusable",
        };
      resumeToken = {
        value: minted.resumeToken,
        at: clock.now(),
      };
    }
    if (resumeToken === undefined) return networkEnd;
    let opened = await api.open(accessToken, resumeToken.value, signal);
    if (generation !== attemptGeneration) {
      opened.body?.destroy();
      return networkEnd;
    }
    if (opened.status !== 200)
      return opened.status === 410 && clock.now() - resumeToken.at < 30000
        ? {
            end: "http_unexpected",
          }
        : classifyWatchHttpStatus(opened.status, opened.retryAfterMs);
    return opened.body === undefined
      ? {
          end: "not_event_stream",
        }
      : consumeStream(opened.body, signal, generation);
  }
  function consumeStream(body, signal, generation) {
    return new Promise((resolve) => {
      let frameBuffer = new SSEFrameBuffer();
      let onAbort = () => {
        body.destroy();
      };
      let finish = (end) => {
        signal.removeEventListener("abort", onAbort);
        body.destroy();
        resolve({
          end,
        });
      };
      signal.addEventListener("abort", onAbort, {
        once: true,
      });
      body.on("data", (chunk) => {
        if (generation !== attemptGeneration) return;
        lastFrameAt = clockSnapshot(clock);
        for (let frame of frameBuffer.push(chunk)) {
          if (generation !== attemptGeneration) return;
          if (frame.event === "sync") onSync(frame.id);
          else if (frame.event === "added" || frame.event === "changed") onSessionFrame(frame.data);
        }
        if (frameBuffer.pendingChars > WATCH_MAX_PENDING_SSE_CHARS) finish("oversized_frame");
      });
      body.on("error", () => finish("network"));
      body.on("end", () => finish("closed"));
      body.on("close", () => finish("closed"));
    });
  }
  function onSync(id) {
    if (id === undefined || !PRINTABLE_TOKEN_RE.test(id)) {
      callSafely(options.onDroppedFrame);
      return;
    }
    lastSyncAt = clockSnapshot(clock);
    resumeToken = {
      value: id,
      at: lastSyncAt.wall,
    };
    if (watchState !== "connected") {
      connectedAtMono = clock.monotonicNow();
      startFailureCount = 0;
      setState("connected");
    }
  }
  function onSessionFrame(rawData) {
    let parsedJson;
    try {
      parsedJson = jsonParseRaw(rawData ?? "");
    } catch {
      parsedJson = undefined;
    }
    let parsed = BridgeSessionSchema().safeParse(parsedJson);
    if (!parsed.success) {
      callSafely(options.onDroppedFrame);
      return;
    }
    let {
      status,
      worker_status: workerStatus,
      last_event_at: lastEventAt,
      external_metadata: externalMetadata,
    } = parsed.data;
    let toolHostStatus = externalMetadata?.tool_host_status;
    let frameInfo = {
      sessionId: parsed.data.id,
      environmentId: parsed.data.environment_id,
      archived: /(^|_)archived$/i.test(status ?? ""),
      fingerprint: `${status} ${workerStatus} ${lastEventAt}`,
      ...(toolHostStatus && {
        toolHostRequest: {
          environmentId: toolHostStatus.environment_id,
          requestedAt: toolHostStatus.requested_at,
        },
      }),
    };
    callSafely(() => options.onFrame(frameInfo));
  }
  function endAttempt(result) {
    let healthyMs =
      watchState === "connected" && connectedAtMono !== undefined
        ? clock.monotonicNow() - connectedAtMono
        : undefined;
    let endKind =
      (result.end === "closed" || result.end === "network") &&
      elapsedSince(lastFrameAt) > 2 * WATCH_SILENCE_TIMEOUT_MS
        ? "slept"
        : result.end === "closed" && healthyMs === undefined
          ? "closed_before_sync"
          : result.end;
    let wasHealthy = healthyMs !== undefined && healthyMs >= WATCH_HEALTHY_SESSION_MS;
    cancelAttempt();
    if (wasHealthy) backoffAttempts = 0;
    let delayMs;
    switch (endKind) {
      case "not_offered":
        return parkWatcher(endKind, WATCH_PARK_FALLBACK_MS);
      case "auth":
        return parkWatcher(endKind, WATCH_PARK_AUTH_FAILED_MS);
      case "http_unexpected":
      case "resume_token_unusable":
      case "not_event_stream":
      case "oversized_frame":
        resumeToken = undefined;
        if (++startFailureCount >= WATCH_MAX_START_FAILURES)
          return parkWatcher(endKind, WATCH_PARK_FALLBACK_MS);
        delayMs = backoffMs(true);
        break;
      case "slept":
        delayMs = 0;
        break;
      case "closed":
      case "network":
      case "silent":
      case "no_sync":
        delayMs = wasHealthy ? random() * WATCH_JITTER_AFTER_HEALTHY_MS : backoffMs();
        break;
      case "token_expired":
        resumeToken = undefined;
        delayMs = backoffMs();
        break;
      case "rate_limited":
      case "closed_before_sync":
      case "connect_timeout":
      case "http_retryable":
        delayMs = backoffMs();
        break;
    }
    let retryAfterMs = result.retryAfterMs || (endKind === "rate_limited" ? WATCH_RATE_LIMIT_RETRY_MS : 0);
    scheduleNextAttempt(
      Math.max(delayMs, Math.min(retryAfterMs, WATCH_RETRY_AFTER_CAP_MS) * (1 + 0.5 * random())),
    );
    setState("backoff", endKind);
  }
  function parkWatcher(reason, parkMs) {
    scheduleNextAttempt(parkMs * (0.5 + random()));
    setState("parked", reason);
  }
  function backoffMs(freshStart = false) {
    if (!freshStart) backoffAttempts++;
    return backoffDelayMs({
      attempt: freshStart ? 1 / 0 : backoffAttempts,
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
      if (watchState === "off") startAttempt();
    },
    stop() {
      cancelAttempt();
      setState("off");
    },
    get state() {
      return watchState;
    },
  };
}
//@ chunk-18851qev.js:25783-26057 sole-consumer
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
//@ chunk-18851qev.js:26057-26207 sole-consumer
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
//@ chunk-18851qev.js:26207-26314 sole-consumer
function isSleepGap(previous, next) {
  return (
    previous !== undefined &&
    [next.wall - previous.wall, next.monotonic - previous.monotonic].some(
      (gap) => gap >= SLEEP_GAP_WINDOW.from && gap < SLEEP_GAP_WINDOW.to,
    )
  );
}
//@ chunk-18851qev.js:26314-26376 sole-consumer
var ASK_OUTCOME_COUNTER_NAMES = {
  frame: "nudge",
  own: "own_request",
  free: "start_or_wake",
};
//@ chunk-18851qev.js:26376-27034 sole-consumer
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
//@ chunk-18851qev.js:27034-27308 sole-consumer
function createAskBackoff(now) {
  let makeEntry = () => ({
    waitMs: ASK_BASE_WAIT_MS,
    startedAt: -1 / 0,
  });
  let entries = {
    frame: makeEntry(),
    own: makeEntry(),
  };
  return {
    mayStart: (source) => now() - entries[source].startedAt >= entries[source].waitMs,
    started(source) {
      entries[source].startedAt = now();
    },
    endedBarren(source) {
      entries[source].waitMs = Math.min(2 * entries[source].waitMs, ASK_MAX_WAIT_MS);
    },
    forgive(source) {
      entries[source].waitMs = ASK_BASE_WAIT_MS;
    },
    reset() {
      entries = {
        frame: makeEntry(),
        own: makeEntry(),
      };
    },
  };
}
//@ chunk-18851qev.js:27308-31105 sole-consumer
/**
 * 已连接（或最近连上）用 connectedMs，否则 fallbackMs，提供工具主机时上限 30 秒； 外部事件可把下次轮询提前并唤醒，记录各原因的轮询与有工作次数。
 */
function createWorkPoller(options) {
  let { random } = options;
  let now = () => options.clock.monotonicNow();
  let pollerState = "off";
  let lastWatchEnd;
  let connectedSince;
  let lastConnectedAt;
  let loggedConnected = false;
  let everConnected = false;
  let nextPollAt = -1 / 0;
  let nextPollCause = "start_or_wake";
  let lastPollAt = -1 / 0;
  let lastSessionEndAt;
  let ladder;
  let askBackoff = createAskBackoff(now);
  let lastFingerprintBySession = new Map();
  let seenWorkIds = new BoundedUUIDSet(64);
  let counters = createPollCounters();
  let countersWindowStart = now();
  function isWithin(atMs, windowMs) {
    return atMs !== undefined && now() - atMs < windowMs;
  }
  function isConnectedRecently() {
    return pollerState === "connected" || isWithin(lastConnectedAt, CONNECTED_GRACE_MS);
  }
  function pollIntervalMs() {
    let { connectedMs, fallbackMs } = options.intervals();
    let intervalMs = isConnectedRecently() ? connectedMs : fallbackMs;
    return options.servesToolHosts() ? Math.min(intervalMs, TOOL_HOST_POLL_MAX_MS) : intervalMs;
  }
  function setNextPoll(atMs, cause) {
    nextPollAt = atMs;
    nextPollCause = cause;
  }
  function pullNextPollEarlier(atMs, cause) {
    if (atMs < nextPollAt) {
      setNextPoll(atMs, cause);
      options.wake();
    }
  }
  function bumpNextPoll(atMs, cause) {
    if (nextPollAt <= now()) nextPollAt = 1 / 0;
    pullNextPollEarlier(atMs, cause);
  }
  function scheduleRegularPoll() {
    let scheduleNow = now();
    let { baseMs, afterSessionEndWindowMs } = options.intervals();
    if (isWithin(lastSessionEndAt, afterSessionEndWindowMs))
      setNextPoll(scheduleNow + Math.max(POLL_MIN_INTERVAL_MS, baseMs), "after_session_end");
    else
      setNextPoll(
        scheduleNow +
          Math.max(pollIntervalMs() * (1 - POLL_JITTER_RATIO + 2 * POLL_JITTER_RATIO * random()), baseMs),
        isConnectedRecently() ? "connected" : "fallback",
      );
  }
  function ladderDueAt() {
    let startedAt = ladder?.startedAt ?? -1 / 0;
    let found = POLL_BACKOFF_LADDER_MS.find((step) => startedAt + step > now());
    return found === undefined ? undefined : startedAt + found;
  }
  function expectPoll(source) {
    if (pollerState === "off") return;
    if (!options.hasRoom()) {
      ladder = undefined;
      return;
    }
    if (ladder !== undefined && (ladder.source !== "free" || source === "free")) return;
    if (source !== "free") {
      if (!askBackoff.mayStart(source)) {
        let tooSoonCounter = `asks_too_soon_${ASK_OUTCOME_COUNTER_NAMES[source]}`;
        counters[tooSoonCounter]++;
        return;
      }
      askBackoff.started(source);
    }
    let cause = ASK_OUTCOME_COUNTER_NAMES[source];
    let ladderCounter = `ladders_${cause}`;
    counters[ladderCounter]++;
    ladder = {
      startedAt: now(),
      source,
      cause,
    };
    bumpNextPoll(ladder.startedAt + (POLL_BACKOFF_LADDER_MS[0] ?? 0), cause);
  }
  function endLadder(barren) {
    if (barren && ladder !== undefined && ladder.source !== "free") askBackoff.endedBarren(ladder.source);
    ladder = undefined;
  }
  function flushSummary(state) {
    let flushedAt = now();
    if (connectedSince !== undefined) {
      counters.connected_ms += flushedAt - connectedSince;
      connectedSince = flushedAt;
    }
    let lastEnd = lastWatchEnd;
    logEvent("tengu_bridge_watch_summary", {
      ...counters,
      connected_ms: Math.round(counters.connected_ms),
      window_ms: Math.round(flushedAt - countersWindowStart),
      state: fromEnum(state),
      last_end: fromEnumOpt(lastEnd),
    });
    counters = createPollCounters();
    countersWindowStart = flushedAt;
    if (state === "connected") lastWatchEnd = undefined;
  }
  return {
    governs() {
      return pollerState !== "off";
    },
    onWatchState(state, reason) {
      let stateAt = now();
      let previousState = pollerState;
      pollerState = state;
      lastWatchEnd = reason ?? lastWatchEnd;
      if (connectedSince !== undefined) {
        counters.connected_ms += stateAt - connectedSince;
        connectedSince = undefined;
      }
      switch (state) {
        case "connected":
          counters.connects++;
          connectedSince = stateAt;
          lastConnectedAt = undefined;
          if (loggedConnected || !everConnected) logFeatureOk("bridge_sessions_watch");
          loggedConnected = false;
          everConnected = true;
          break;
        case "connecting":
          if (previousState === "connected" || previousState === "off") lastConnectedAt = stateAt;
          if (previousState === "off") {
            counters = createPollCounters();
            countersWindowStart = stateAt;
            expectPoll("free");
          }
          counters.connect_attempts++;
          break;
        case "backoff":
          if (previousState === "connected") lastConnectedAt = stateAt;
          if (reason === "slept") {
            ladder = undefined;
            askBackoff.reset();
            expectPoll("free");
          }
          break;
        case "parked":
          lastConnectedAt = undefined;
          logFeatureBad("bridge_sessions_watch", reason ?? "unknown");
          break;
        case "off":
          flushSummary(previousState);
          lastConnectedAt = lastSessionEndAt = ladder = lastWatchEnd = undefined;
          askBackoff.reset();
          loggedConnected = false;
          options.wake();
          break;
      }
    },
    onFrame(frame) {
      let toolHostRequest = frame.toolHostRequest;
      let workKey = `${frame.sessionId} ${toolHostRequest?.requestedAt}`;
      if (
        options.servesToolHosts() &&
        toolHostRequest?.environmentId === options.environmentId &&
        !seenWorkIds.has(workKey)
      ) {
        counters.frames_tool_host_request++;
        seenWorkIds.add(workKey);
        expectPoll("frame");
      }
      if (frame.environmentId !== options.environmentId) return;
      counters.frames_this_environment++;
      let isRepeat = lastFingerprintBySession.get(frame.sessionId) === frame.fingerprint;
      lastFingerprintBySession.delete(frame.sessionId);
      lastFingerprintBySession.set(frame.sessionId, frame.fingerprint);
      for (let key of lastFingerprintBySession.keys()) {
        if (lastFingerprintBySession.size <= MAX_QUEUED_WORK_ITEMS) break;
        lastFingerprintBySession.delete(key);
      }
      if (!isRepeat && !frame.archived && !options.isRunningHere(frame.sessionId)) expectPoll("frame");
    },
    onDroppedFrame() {
      counters.frames_dropped++;
    },
    expectWork() {
      expectPoll("own");
    },
    noteSessionEnd(bump) {
      if (pollerState === "off") return;
      lastSessionEndAt = now();
      if (ladderDueAt() === undefined) ladder = undefined;
      let nextAtMs = lastSessionEndAt + random() * Math.max(POLL_MIN_INTERVAL_MS, options.intervals().baseMs);
      if (nextPollCause === "after_session_end" && nextPollAt > lastSessionEndAt) return;
      if (bump) bumpNextPoll(nextAtMs, "after_session_end");
      else pullNextPollEarlier(nextAtMs, "after_session_end");
      let ladderAt = ladderDueAt();
      if (ladder !== undefined && ladderAt !== undefined) pullNextPollEarlier(ladderAt, ladder.cause);
    },
    noteHeartbeatOk() {
      askBackoff.forgive("own");
    },
    pollCause() {
      if (!isWithin(countersWindowStart, LONG_IDLE_RESET_MS)) flushSummary(pollerState);
      if (!loggedConnected && !isConnectedRecently()) {
        loggedConnected = true;
        counters.fallbacks++;
        if (pollerState !== "parked")
          logFeatureSad("bridge_sessions_watch", lastWatchEnd ?? "never_connected");
        pullNextPollEarlier(
          Math.max(
            now() + random() * pollIntervalMs(),
            lastPollAt + pollIntervalMs() * (1 - POLL_JITTER_RATIO),
          ),
          "fallback",
        );
      }
      if (nextPollAt > now()) return;
      return nextPollCause;
    },
    polled(state, outcome) {
      let polledAt = now();
      lastPollAt = polledAt;
      let pollCounter = `polls_${state}`;
      switch (
        (counters[pollCounter]++, logForDebugging(`[bridge:watch] poll (${state}): ${outcome}`), outcome)
      ) {
        case "new_work":
        case "redelivery":
        case "other_work": {
          let workCounter = `polls_with_work_${state}`;
          counters[workCounter]++;
          if (state === "connected" && pollerState === "connected" && ladder === undefined)
            logEvent("tengu_bridge_watch_miss", {
              work: fromEnum(outcome),
            });
          if (outcome === "new_work") {
            askBackoff.reset();
            if (ladder !== undefined) ladder.source = "free";
          } else endLadder(true);
          setNextPoll(polledAt, "after_work");
          return;
        }
        case "refused":
        case "timed_out":
          counters[outcome === "refused" ? "failed_other" : "failed_timed_out"]++;
          endLadder(true);
          break;
        case "unreachable":
          counters.failed_unreachable++;
          break;
        case "empty":
          break;
      }
      scheduleRegularPoll();
      if (ladder === undefined) return;
      let ladderAt = ladderDueAt();
      if (ladderAt === undefined) endLadder(true);
      else if (ladderAt < nextPollAt) setNextPoll(ladderAt, ladder.cause);
    },
    msUntilDue() {
      return Math.max(0, nextPollAt - now());
    },
    longestGapMs() {
      return Math.ceil(Math.max(pollIntervalMs() * (1 + POLL_JITTER_RATIO), options.intervals().baseMs));
    },
  };
}
//@ chunk-18851qev.js:31105-31132 sole-consumer
function isRcChildRestartResumeEnabled() {
  return isBridgeRcChildRestartResumeEnabled();
}
//@ chunk-18851qev.js:31132-31341 sole-consumer
function projectThreadPointer(sessionCompatIds, parkedProjectThreadIds) {
  if (sessionCompatIds.size === 0 && parkedProjectThreadIds.size === 0) return;
  let activeBodies = new Set([...sessionCompatIds].map(sessionIdBody));
  return {
    projectThreadSessionIds: [...sessionCompatIds].slice(0, MAX_POINTER_ACTIVE_SESSION_IDS),
    parkedProjectThreadSessionIds: [...parkedProjectThreadIds]
      .filter((sessionId) => !activeBodies.has(sessionIdBody(sessionId)))
      .slice(0, MAX_POINTER_ACTIVE_SESSION_IDS),
  };
}
//@ chunk-18851qev.js:31341-31359 sole-consumer
var MAX_PROJECT_THREAD_REQUEUES = 4;
var PROJECT_THREAD_REQUEUE_TIMEOUT_MS = 60000;
//@ chunk-18851qev.js:31359-32205 sole-consumer
/**
 * 通过 bridge/reconnect 重新排队项目线程会话（超时、致命错误丢弃）。
 */
async function requeueProjectThreadSessions(api, environmentId, sessionIds, signal) {
  let counts = {
    requeued: 0,
    dropped: 0,
    deferred: 0,
  };
  let unattempted = [];
  let deadlineSignal = signal
    ? AbortSignal.any([signal, AbortSignal.timeout(PROJECT_THREAD_REQUEUE_TIMEOUT_MS)])
    : AbortSignal.timeout(PROJECT_THREAD_REQUEUE_TIMEOUT_MS);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < sessionIds.length) {
      let sessionId = sessionIds[nextIndex++];
      if (deadlineSignal.aborted) {
        unattempted.push(sessionId);
        continue;
      }
      let infraSessionId = toInfraSessionId(sessionId);
      let candidateIds = infraSessionId === sessionId ? [sessionId] : [sessionId, infraSessionId];
      let errors = [];
      let reconnected = false;
      for (let candidateId of candidateIds)
        try {
          await api.reconnectSession(environmentId, candidateId, deadlineSignal);
          reconnected = true;
          break;
        } catch (error) {
          errors.push(error);
        }
      if (reconnected) {
        counts.requeued++;
        logForDebugging(`[bridge:init] project thread session ${sessionId} re-queued via bridge/reconnect`);
      } else if (errors.every((error) => error instanceof BridgeFatalError)) {
        counts.dropped++;
        logForDebugging(
          `[bridge:init] project thread session ${sessionId} no longer resumable: ${errorMessage(errors[0])}`,
        );
      } else {
        counts.deferred++;
        logForDebugging(
          `[bridge:init] project thread session ${sessionId} reconnect transient failure; the server re-queues it on the member's next message`,
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
        length: Math.min(MAX_PROJECT_THREAD_REQUEUES, sessionIds.length),
      },
      worker,
    ),
  );
  return {
    ...counts,
    unattempted,
  };
}
//@ chunk-18851qev.js:32303-32528 sole-consumer
var PROGRAM_FILE_GONE_NOTICE =
  "The program file this Remote Control started from is gone, most likely removed by an update. New sessions now run the newer version that replaced it. Remote Control itself stays on the old version until it restarts.";
//@ chunk-18851qev.js:32528-33080 sole-consumer
async function resolveRestartTarget(launch, version) {
  if (!(await stat(launch.cmd).then(() => false, isPathAbsent)))
    return {
      source: "own",
    };
  let { execTokenIsRunnable, homebrewBinLink } = await import("../services/daemon/spawnLauncher.js");
  let homebrewLink = await homebrewBinLink(launch.cmd);
  let realTarget = await realpath(homebrewLink ?? claudeBinPath()).catch(() => null);
  if (realTarget === null)
    return {
      source: "none",
    };
  let targetDir = homebrewLink === null ? realTarget : dirname(realTarget);
  let cmdDir = homebrewLink === null ? launch.cmd : dirname(launch.cmd);
  if (
    dirname(targetDir) !== dirname(cmdDir) ||
    (homebrewLink === null &&
      dirname(cmdDir) !== (await realpath(getNativeVersionsDir()).catch(() => null))) ||
    !isSemverVersion(basename(targetDir)) ||
    !isNewerBuild(basename(targetDir), version) ||
    !(await execTokenIsRunnable(realTarget, {
      rejectNpmStub: true,
    })) ||
    processWrapperError() !== null
  )
    return {
      source: "none",
    };
  return {
    source: homebrewLink === null ? "native" : "homebrew",
    invocation: withProcessWrapper({
      cmd: realTarget,
      prefixArgs: [],
      target: realTarget,
    }),
  };
}
//@ chunk-18851qev.js:33080-33993 sole-consumer
function createRestartSpawner(
  spawner,
  launchTarget = resolveLaunchTarget({
    pinToCurrentBinary: true,
  }),
  version = {
    ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
    PACKAGE_URL: "@anthropic-ai/claude-code",
    README_URL: "https://code.claude.com/docs/en/overview",
    VERSION: "2.1.318",
    FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
    BUILD_TIME: "2026-11-03T18:52:53Z",
    GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
    HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
    DD_SOURCEMAP_GROUP: "default",
  }.VERSION,
) {
  let warnOnce = onceExport(() => spawner.logWarning(PROGRAM_FILE_GONE_NOTICE));
  return async () => {
    try {
      let choice = await resolveRestartTarget(launchTarget, version);
      switch (choice.source) {
        case "own":
          return;
        case "none":
          logFeatureBad("bridge_session_stand_in", "no_stand_in");
          return;
        case "homebrew":
        case "native":
          logFeatureSad("bridge_session_stand_in", choice.source);
          warnOnce();
          return choice.invocation;
      }
    } catch (error) {
      logFeatureBad("bridge_session_stand_in", "threw");
      logError(withTelemetryMessage(toError(error), "Choosing a Remote Control session's program failed"));
      return;
    }
  };
}
//@ chunk-18851qev.js:33993-34161 fingerprint (2.1.88 match: DEFAULT_BACKOFF, 1)
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
//@ chunk-18851qev.js:34161-34197 fingerprint (2.1.88 match: pollSleepDetectionThresholdMs, 1)
/**
 * 判定"系统睡眠"的阈值：两次轮询错误间隔超过 connCapMs 的两倍即重置错误预算。
 */
function pollSleepDetectionThresholdMs(backoff) {
  return backoff.connCapMs * 2;
}
//@ chunk-18851qev.js:34197-34298 layout
/**
 * 在致命错误文案末尾补上"重新运行 claude remote-control 以重连"。
 */
function withReconnectHint(message) {
  return `${message.replace(/[.!?]?\s*$/, ".")} Re-run \`claude remote-control\` to reconnect.`;
}
//@ chunk-18851qev.js:34298-34415 layout
/**
 * 错误是否表示 environment 已不存在（BridgeFatalError 404/410，或消息匹配 environment … not found）。
 */
function isEnvironmentGoneError(error) {
  if (error instanceof BridgeFatalError) return error.status === 404 || error.status === 410;
  return /environment .* not found/i.test(errorMessage(error));
}
//@ chunk-18851qev.js:34415-34554 fingerprint (2.1.88 match: safeSpawn, 0.733)
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
//@ chunk-18851qev.js:34554-34646 layout
/**
 * 把 expires_in 秒数换成绝对过期时间戳（非正数返回 undefined）。
 */
function expiresInToDeadline(expiresInSeconds) {
  return typeof expiresInSeconds === "number" && Number.isFinite(expiresInSeconds) && expiresInSeconds > 0
    ? Date.now() + expiresInSeconds * 1000
    : undefined;
}
//@ chunk-18851qev.js:34646-71092 fingerprint (2.1.88 match: runBridgeLoop, 0.603)
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
  async function fetchSessionRecordWithRetry(sessionId) {
    let readOptions = {
      baseUrl: config.apiBaseUrl,
      getAccessToken,
    };
    let bridgeSessionTags = await readBridgeSessionTags(sessionId, readOptions);
    if (bridgeSessionTags !== null || loopSignal.aborted) return bridgeSessionTags;
    await sleep(2000, loopSignal);
    if (loopSignal.aborted) return null;
    return readBridgeSessionTags(sessionId, readOptions);
  }
  let refreshHold = {
    inFlight: undefined,
  };
  let currentEnvironmentSecret = environmentSecret;
  let secretRenewAt = computeSecretRenewAt(secretExpiresIn);
  let secretExpiresAt = expiresInToDeadline(secretExpiresIn);
  let reregisterOwnsSecret = false;
  let renewalAttempt = 0;
  let renewLoginUnreadable = false;
  let reregisterAttempts = 0;
  let reregisterTrigger;
  let pendingCleanups = [];
  let lastPauseLoggedAt;
  let reregisterTransientSeen = false;
  let pendingReregisterEvent = false;
  let reregisterEventAttempt = 0;
  let activeSessions = new Map();
  function applyReregistration(result) {
    currentEnvironmentSecret = result.environmentSecret;
    secretRenewAt = computeSecretRenewAt(result.environmentSecretExpiresIn);
    secretExpiresAt = expiresInToDeadline(result.environmentSecretExpiresIn);
    pendingReregisterEvent = true;
    reregisterEventAttempt = reregisterAttempts;
    let previousSessions = new Map(activeSessions);
    activeSessions.clear();
    for (let pendingRequeue of result.pendingRequeues)
      activeSessions.set(pendingRequeue, (previousSessions.get(pendingRequeue) ?? 0) + 1);
  }
  let pacing = {
    failures: 0,
    notBefore: 0,
  };
  let pendingRequeues = new Map((config.initialSessionRequeues ?? []).map((sessionId) => [sessionId, 0]));
  let requeueFailed = false;
  let settleRequeue = (sessionId, failed) => {
    let body = sessionIdBody(sessionId);
    let found = false;
    for (let key of [...pendingRequeues.keys()])
      if (sessionIdBody(key) === body) {
        pendingRequeues.delete(key);
        found = true;
      }
    if (!found) return;
    if (failed) requeueFailed = true;
    if (pendingRequeues.size === 0)
      if (requeueFailed) logFeatureSad("bridge_shutdown_requeue", "requeue_dropped");
      else logFeatureOk("bridge_shutdown_requeue");
  };
  let sessionFailedRecently = false;
  let sessionStartTimes = new Map();
  let hasStartedSession = (sessionId) => {
    let body = sessionIdBody(sessionId);
    for (let key of sessionStartTimes.keys()) if (sessionIdBody(key) === body) return true;
    return false;
  };
  let sessionWorkIds = new Set();
  let sessionCompatIds = new Set();
  let parkedProjectThreadIds = new Set(config.parkedProjectThreadSessionIds);
  let sessionIngressTokens = new Set();
  let knownSessionBodies = new BoundedUUIDSet(64);
  for (let sessionId of [
    ...(config.parkedProjectThreadSessionIds ?? []),
    ...(config.boundedResumeSessionIds ?? []),
    ...(config.initialSessionRequeues ?? []),
    ...(config.carriedSessionIds ?? []),
  ])
    knownSessionBodies.add(sessionIdBody(sessionId));
  let sessionTimers = new Set();
  let servesProjectThread = parkedProjectThreadIds.size > 0;
  let boundedResumeBodies = new Set((config.boundedResumeSessionIds ?? []).map(sessionIdBody));
  function markSessionBusy(sessionId, busy) {
    let size = sessionWorkIds.size;
    if (busy) sessionWorkIds.add(sessionId);
    else sessionWorkIds.delete(sessionId);
    if (sessionWorkIds.size !== size) config.onBusyChange?.(sessionWorkIds.size);
  }
  let completedWorkIds = new Map();
  let sessionWorktrees = new Map();
  let timedOutSessions = new Map();
  let titledSessions = new Map();
  let completedWorkIds_2 = new Set();
  let unsupportedModeWorkIds = new BoundedUUIDSet(64);
  let sessionHeartbeatState = new Map();
  let failedSessionIds = new Set();
  let keptWorktreePaths = new Set();
  let titleSettledSessions = new Set();
  let sessionTitleCandidates = new Map();
  let titleWriteCoalescer;
  let initialCompatSessionId = initialSessionId ? toCompatSessionId(initialSessionId) : undefined;
  if (initialCompatSessionId && initialSessionTitle)
    sessionTitleCandidates.set(initialCompatSessionId, new Set([initialSessionTitle]));
  let spawnEpochCounter = 0;
  let sessionSpawnEpochs = new Map();
  let capacityWake = createCapacityWake(loopSignal);
  let capacityWake_2 = createCapacityWake(loopSignal);
  let watchScheduler = createWorkPoller({
    clock: systemClock,
    random: () => Math.random(),
    environmentId,
    isRunningHere: (sessionId) =>
      hasStartedSession(sessionId) || sessionIdBody(sessionId) === currentPollSessionBody,
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
    async reconnectSession(...args) {
      try {
        await api.reconnectSession(...args);
      } finally {
        watchScheduler.expectWork();
      }
    },
  };
  function respectWatchDelay(delay) {
    return watchScheduler.governs() ? Math.max(delay, watchScheduler.msUntilDue()) : delay;
  }
  function classifyWork(work) {
    if (!work) return "empty";
    let id = work.data?.id;
    if (typeof work.id !== "string" || typeof id !== "string") return "refused";
    if (work.data.type !== "session") return "other_work";
    if (hasStartedSession(id)) return "redelivery";
    currentPollSessionBody = sessionIdBody(id);
    let seenBefore = recentWorkIds.has(work.id);
    recentWorkIds.delete(work.id);
    recentWorkIds.set(work.id, systemClock.monotonicNow());
    for (let key of recentWorkIds.keys()) {
      if (recentWorkIds.size <= 256) break;
      recentWorkIds.delete(key);
    }
    return seenBefore ? "redelivery" : "new_work";
  }
  async function heartbeatActiveWorkItems(minAgeMs = 0, onlySessionIds) {
    let anyOk = false;
    let anyTransient = false;
    let anyFatal = false;
    let authFailedSessions = [];
    for (let [sessionId, handle] of sessionStartTimes) {
      let workId = sessionWorktrees.get(sessionId);
      let ingressToken = handle.accessToken;
      if (!workId || !ingressToken) continue;
      if (minAgeMs > 0 && !isHeartbeatStale(sessionId, minAgeMs)) continue;
      if (onlySessionIds !== undefined && !onlySessionIds.has(sessionId)) continue;
      let heartbeatAt = clockSnapshot(systemClock);
      try {
        await trackedApi.heartbeatWork(environmentId, workId, ingressToken);
        anyOk = true;
        heartbeatTokens.set(sessionId, heartbeatAt);
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
          else anyFatal = true;
        } else anyTransient = true;
      }
    }
    for (let sessionId of authFailedSessions) {
      let lastAuthRetryAt = lastAuthRetryAtBySession.get(sessionId) ?? -1 / 0;
      if (
        watchScheduler.governs() &&
        systemClock.monotonicNow() - lastAuthRetryAt < REGISTER_RETRY_DEFAULT_MS
      )
        continue;
      lastAuthRetryAtBySession.set(sessionId, systemClock.monotonicNow());
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
    if (anyFatal) return "fatal";
    if (authFailedSessions.length > 0) return "auth_failed";
    if (anyOk) watchScheduler.noteHeartbeatOk();
    if (!anyOk || (anyTransient && watchScheduler.governs())) return "failed";
    return "ok";
  }
  async function heartbeatSessions(minAgeMs = 0, onlySessionIds) {
    lastHeartbeatAttemptAt = systemClock.monotonicNow();
    if (onlySessionIds === undefined) lastHeartbeatAttemptWall = lastHeartbeatAttemptAt;
    let result = await heartbeatActiveWorkItems(minAgeMs, onlySessionIds);
    heartbeatFailed = result !== "ok";
    return result;
  }
  function isHeartbeatStale(sessionId, minAgeMs) {
    return Date.now() - (heartbeatTokens.get(sessionId)?.wall ?? 0) >= minAgeMs;
  }
  function heartbeatsEnabled() {
    return getPollIntervalConfig().non_exclusive_heartbeat_interval_ms > 0 || lastHeartbeatOkAt > 0;
  }
  async function heartbeatNow() {
    if ((await heartbeatSessions()) === "ok") lastHeartbeatOkAt = Date.now();
  }
  async function drainRequeues() {
    for (let [sessionId, attempts] of pendingRequeues) {
      if (loopSignal.aborted) return;
      if (hasStartedSession(sessionId)) {
        settleRequeue(sessionId, false);
        continue;
      }
      let outcome = await describeReregisterOutcome(trackedApi, environmentId, sessionId, loopSignal);
      if (outcome === "aborted") return;
      if (outcome === "done") settleRequeue(sessionId, false);
      else if (attempts + 1 >= RENEW_FAILURE_LIMIT) {
        logForDebugging(
          `[bridge:poll] Giving up startup re-queue of sessionId=${sessionId} after ${RENEW_FAILURE_LIMIT} attempts`,
          {
            level: "warn",
          },
        );
        settleRequeue(sessionId, true);
      } else pendingRequeues.set(sessionId, attempts + 1);
    }
    for (let [sessionId, attempts] of activeSessions) {
      if (loopSignal.aborted) return;
      if (!sessionStartTimes.has(sessionId)) {
        activeSessions.delete(sessionId);
        continue;
      }
      let outcome = await describeReregisterOutcome(trackedApi, environmentId, sessionId, loopSignal);
      if (outcome === "aborted") return;
      if (outcome === "done") activeSessions.delete(sessionId);
      else if (attempts + 1 >= RENEW_FAILURE_LIMIT) {
        activeSessions.delete(sessionId);
        logForDebugging(
          `[bridge:poll] Giving up re-queuing sessionId=${sessionId} after ${RENEW_FAILURE_LIMIT} attempts; left to token refresh`,
          {
            level: "warn",
          },
        );
        logEvent("tengu_bridge_env_reregister", {
          requeue_attempts: attempts + 1,
          outcome: lit("requeue_dropped"),
          trigger: reregisterTrigger,
        });
        logFeatureSad("bridge_env_reregister", "requeue_dropped");
      } else activeSessions.set(sessionId, attempts + 1);
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
  let nextHeartbeatAt = 0;
  async function trackCleanup(pollConfig) {
    let {
      non_exclusive_heartbeat_interval_ms: nonExclusiveHeartbeatIntervalMs,
      multisession_poll_interval_ms_at_capacity: multisessionPollIntervalMsAtCapacity,
    } = pollConfig;
    let cap = capacityWake.signal();
    if (nonExclusiveHeartbeatIntervalMs > 0) {
      if (Date.now() >= nextHeartbeatAt) {
        await heartbeatActiveWorkItems();
        nextHeartbeatAt = Date.now() + nonExclusiveHeartbeatIntervalMs;
      }
      let wakeAt =
        multisessionPollIntervalMsAtCapacity > 0
          ? Math.min(nextHeartbeatAt, Date.now() + multisessionPollIntervalMsAtCapacity)
          : nextHeartbeatAt;
      await sleep(Math.max(0, wakeAt - Date.now()), cap.signal);
    } else if (multisessionPollIntervalMsAtCapacity > 0)
      await sleep(multisessionPollIntervalMsAtCapacity, cap.signal);
    cap.cleanup();
  }
  function trackBackgroundOp(operation) {
    pendingCleanups_2.add(operation);
    operation.finally(() => pendingCleanups_2.delete(operation));
  }
  let connBackoffMs = 0;
  let generalBackoffMs = 0;
  let connErrorStart = null;
  let generalErrorStart = null;
  let lastPollErrorTime = null;
  let heartbeatTokens = new Map();
  let lastHeartbeatOkAt = 0;
  let heartbeatFailed = false;
  let lastHeartbeatAttemptAt = -1 / 0;
  let lastHeartbeatAttemptWall = -1 / 0;
  let lastAuthRetryAtBySession = new Map();
  let recentWorkIds = new Map();
  let currentPollSessionBody;
  let statusUpdateTimer = null;
  let idleStatusShown = false;
  let gaveUp = false;
  let policyRefusal;
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
      if (!idleStatusShown) {
        idleStatusShown = true;
        logger.updateIdleStatus();
      }
      return;
    }
    idleStatusShown = false;
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
      let wasProjectThreadChild = sessionCompatIds.has(sessionId);
      sessionStartTimes.delete(sessionId);
      sessionCompatIds.delete(sessionId);
      if (wasProjectThreadChild && rawStatus === "idle") parkedProjectThreadIds.add(sessionId);
      markSessionBusy(sessionId, false);
      completedWorkIds.delete(sessionId);
      sessionWorktrees.delete(sessionId);
      titledSessions.get(sessionId)?.stop();
      titledSessions.delete(sessionId);
      let loggedSessionId = timedOutSessions.get(sessionId) ?? sessionId;
      timedOutSessions.delete(sessionId);
      logger.removeSession(loggedSessionId);
      titleSettledSessions.delete(loggedSessionId);
      titleWriteCoalescer?.forget(loggedSessionId);
      if (loggedSessionId === initialCompatSessionId && initialSessionTitle)
        sessionTitleCandidates.set(loggedSessionId, new Set([initialSessionTitle]));
      else sessionTitleCandidates.delete(loggedSessionId);
      sessionSpawnEpochs.delete(sessionId);
      tokenRefresh?.cancel(sessionId);
      capacityWake.wake();
      lastAuthRetryAtBySession.delete(sessionId);
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
        project_thread: wasProjectThreadChild,
      });
      logForDiagnosticsNoPII("info", "bridge_session_done", {
        status: rawStatus,
        duration_ms: durationMs,
      });
      logger.clearStatus();
      stopStatusUpdates();
      let lastStderr =
        handle.lastStderr.length > 0
          ? handle.lastStderr.join(`
`)
          : undefined;
      let failureMessage;
      switch (rawStatus) {
        case "completed":
          logger.logSessionComplete(sessionId, durationMs);
          break;
        case "failed":
          if (!loopSignal.aborted) {
            failureMessage = lastStderr ?? "Process exited with error";
            logger.logSessionFailed(sessionId, failureMessage);
            if (!lastStderr || failureMessage.includes("transport closed"))
              logForDebugging(`Bridge session failed: ${failureMessage}`, {
                level: "error",
              });
            else
              logError(
                withTelemetryMessage(
                  Error(`Bridge session failed: ${failureMessage}`),
                  "Bridge session failed",
                ),
              );
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
      let failedNotShuttingDown = rawStatus === "failed" && !loopSignal.aborted && !gaveUp;
      if (failedNotShuttingDown) {
        failedSessionIds.add(sessionId);
        sessionFailedRecently = true;
      }
      let wt = sessionHeartbeatState.get(sessionId);
      if (wt) {
        sessionHeartbeatState.delete(sessionId);
        if (rawStatus === "idle") logger.logStatus(`kept worktree ${wt.worktreePath} \xB7 session idle`);
        else if (failedNotShuttingDown) {
          logger.logStatus(`kept worktree ${wt.worktreePath} \xB7 session crashed`);
          if (failureMessage?.includes("transport closed")) keptWorktreePaths.add(wt.worktreePath);
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
                .archiveSession(loggedSessionId)
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
  function reportOfflineCleanup() {
    let size = failedSessionIds.size;
    logger.logStatus(
      size > 0
        ? `${size} ${plural(size, "session")} ended while this machine was offline \u2014 the environment was cleaned up on the server and can't be resumed.`
        : "This environment was cleaned up while the machine was offline and can't be resumed.",
    );
    if (keptWorktreePaths.size > 0)
      logger.logStatus(`Your work is safe \u2014 worktrees kept: ${[...keptWorktreePaths].join(", ")}`);
    logger.logStatus("Run `claude remote-control` to start a fresh environment.");
  }
  function classifyReregisterTrigger(err) {
    if (
      err.status === 404 &&
      !isExpiredErrorType(err.errorType) &&
      !(sessionFailedRecently && sessionStartTimes.size === 0) &&
      isBridgeEnvReregisterEnabled()
    )
      return "poll_404";
    if (err.status === 401 && isBridgeEnvReregisterEnabled() && isBridgeEnvReregisterOn401Enabled())
      return "poll_401";
    return;
  }
  let { startBackgroundPolling } =
    await import("../services/policyLimits/DefaultPolicyLimitsClientSlot.lazy.js");
  startBackgroundPolling();
  let shutdownOnPolicyRefusal = () => {
    if (loopSignal.aborted || gaveUp) return;
    let refusal = connectedBridgePolicyRefusal(false);
    if (refusal === null) return;
    policyRefusal = refusal;
    gaveUp = true;
    controller.abort();
    try {
      logger.logStatus(refusal.detail);
      logForDebugging(
        `[bridge:policy] Org policy now refuses Remote Control (${refusal.policy}: ${refusal.kind}); shutting down`,
      );
      logEvent("tengu_bridge_policy_teardown", {
        lane: lit("standalone"),
        policy: fromEnum(refusal.policy),
        deny_kind: fromEnum(refusal.kind),
        outbound_only: false,
      });
    } catch (error) {
      logForDebugging(`[bridge:policy] Policy shutdown notice failed: ${errorMessage(error)}`, {
        level: "error",
      });
      logError(error);
    }
  };
  let unsubscribePolicy = isLovelyUmbrellaOn()
    ? () => {}
    : onPolicyVerdictChanged(() => {
        queueMicrotask(shutdownOnPolicyRefusal);
      });
  if (!isLovelyUmbrellaOn()) shutdownOnPolicyRefusal();
  function isSecretRenewDue() {
    return (
      !reregisterOwnsSecret &&
      secretRenewAt !== undefined &&
      Date.now() >= secretRenewAt &&
      isBridgeEnvReregisterEnabled() &&
      isBridgeEnvSecretProactiveRenewalEnabled()
    );
  }
  async function renewEnvironmentSecret() {
    renewalAttempt++;
    if (renewLoginUnreadable) {
      renewLoginUnreadable = false;
      pollOptions?.forgetTokenReads();
    }
    logger.logVerbose("Renewing this computer's Remote Control credential before it expires");
    let result = await reregisterEnvironment({
      api: trackedApi,
      config,
      environmentId,
      activeSessions: sessionStartTimes,
      attempt: renewalAttempt,
      trigger: "proactive",
      signal: loopSignal,
    });
    if (result.outcome === "reregistered") {
      currentEnvironmentSecret = result.environmentSecret;
      secretRenewAt = computeSecretRenewAt(result.environmentSecretExpiresIn);
      secretExpiresAt = expiresInToDeadline(result.environmentSecretExpiresIn);
      reregisterTrigger = lit("proactive");
      pendingReregisterEvent = true;
      reregisterEventAttempt = renewalAttempt;
      logger.logVerbose("Remote Control credential renewed.");
      return;
    }
    if (loopSignal.aborted) return;
    let loginUnreadable =
      result.outcome === "fatal" &&
      result.reason === "register_rejected" &&
      result.message === BRIDGE_LOGIN_INSTRUCTION;
    let authUnreachable =
      result.outcome === "fatal" &&
      result.reason === "register_rejected" &&
      result.status === 401 &&
      (loginUnreadable || pollOptions?.classifyFailedOAuthRefresh() === "unreachable");
    if (
      result.outcome === "transient" ||
      ((result.reason === "replaced" || authUnreachable) && renewalAttempt < RENEW_RETRY_LIMIT)
    ) {
      let max = Math.max(
        RENEW_RETRY_MIN_MS,
        Math.min(result.outcome === "transient" ? (result.retryAfterMs ?? 0) : 0, RENEW_RETRY_MAX_MS),
      );
      secretRenewAt = Date.now() + max * (1 + 0.25 * Math.random());
      renewLoginUnreadable = loginUnreadable;
      logger.logVerbose(
        `Could not renew the Remote Control credential yet. The current one still works; trying again in about ${Math.ceil((secretRenewAt - Date.now()) / 60000)} minutes.`,
      );
      return;
    }
    secretRenewAt = undefined;
    if (!(
      result.reason === "register_rejected" &&
      result.status === 401 &&
      (loginUnreadable || !authUnreachable)
    ))
      logger.logVerbose(
        "Could not renew the Remote Control credential. It keeps working until it expires, and Remote Control will try again then.",
      );
    else {
      let tokenOrigin = loginUnreadable || !pollOptions ? undefined : await pollOptions.tokenOrigin();
      let failureReasonText = "claude.ai did not accept the sign-in it uses";
      let fixHint = "Run `claude /login` to sign in again.";
      if (loginUnreadable) {
        failureReasonText = "it could not read a saved sign-in";
        fixHint = "If you are signed out, run `claude /login`.";
      } else if (tokenOrigin === undefined) fixHint = "If you are signed out, run `claude /login`.";
      else if (tokenOrigin === "env" || tokenOrigin === "fd")
        fixHint = "Start Remote Control again with a valid sign-in token.";
      else if (tokenOrigin === "none")
        failureReasonText = "its saved sign-in was refused or could not be read";
      let keepWorkingText;
      if (secretExpiresAt !== undefined && secretExpiresAt <= Date.now())
        keepWorkingText =
          "The connection's credential has already expired, so it stops unless the next try can sign in.";
      else {
        let remainingMinutes =
          secretExpiresAt === undefined ? undefined : Math.round((secretExpiresAt - Date.now()) / 60000);
        let stillWorkingText;
        if (remainingMinutes === undefined) stillWorkingText = "until its credential expires";
        else if (remainingMinutes < 5) stillWorkingText = "for a few more minutes";
        else if (remainingMinutes < 90) stillWorkingText = `for about ${remainingMinutes} minutes`;
        else stillWorkingText = `for about ${Math.round(remainingMinutes / 60)} hours`;
        keepWorkingText = `The connection keeps working ${stillWorkingText}; if it still cannot sign in then, it stops.`;
      }
      logger.logWarning(
        `Remote Control could not renew this computer's connection: ${failureReasonText}. ${fixHint} ${keepWorkingText}`,
      );
    }
    let giveUpReason;
    if (result.reason === "replaced") giveUpReason = "server kept returning a different environment id";
    else if (authUnreachable) giveUpReason = "register got a 401 that did not prove the login dead";
    else giveUpReason = `register refused with ${result.status}`;
    logForDebugging(
      `[bridge:poll] Giving up the planned renewal of the environment secret (${giveUpReason}); the current secret works until it expires, then the poll-401 lane handles it`,
      {
        level: "warn",
      },
    );
  }
  let watcherStartErrorLogged = false;
  while (!loopSignal.aborted) {
    currentPollSessionBody = undefined;
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
      watcherStartErrorLogged = false;
    } catch (error) {
      sessionsWatcher?.stop();
      if (!watcherStartErrorLogged) {
        watcherStartErrorLogged = true;
        logError(error);
      }
    }
    if (isSecretRenewDue()) {
      await renewEnvironmentSecret();
      continue;
    }
    try {
      let watchGoverns = watchScheduler.governs() && sessionStartTimes.size < config.maxSessions;
      let pollIntervalMs = watchGoverns
        ? watchScheduler.longestGapMs()
        : sessionStartTimes.size >= config.maxSessions
          ? pollConfig.multisession_poll_interval_ms_at_capacity
          : sessionStartTimes.size > 0
            ? pollConfig.multisession_poll_interval_ms_partial_capacity
            : pollConfig.multisession_poll_interval_ms_not_at_capacity;
      let pollCause = watchGoverns ? watchScheduler.pollCause() : undefined;
      let shouldPoll = !watchGoverns || pollCause !== undefined;
      let polledWork = null;
      if (shouldPoll) {
        heartbeatFailed = false;
        let notePollOutcome = (outcome) => {
          if (pollCause !== undefined && !loopSignal.aborted) watchScheduler.polled(pollCause, outcome);
        };
        try {
          polledWork = await trackedApi.pollForWork(
            environmentId,
            currentEnvironmentSecret,
            loopSignal,
            pollConfig.reclaim_older_than_ms,
            pollIntervalMs,
          );
        } catch (error) {
          notePollOutcome(classifyConnectFailure(error));
          throw error;
        }
        notePollOutcome(classifyWork(polledWork));
      }
      let work = polledWork;
      if (shouldPoll) {
        if (connErrorStart !== null || generalErrorStart !== null) {
          let disconnectedMs = Date.now() - (connErrorStart ?? generalErrorStart ?? Date.now());
          logger.logReconnected(disconnectedMs);
          logForDebugging(`[bridge:poll] Reconnected after ${formatDuration(disconnectedMs)}`);
          logEvent("tengu_bridge_reconnected", {
            disconnected_ms: disconnectedMs,
          });
          idleStatusShown = false;
        }
        connBackoffMs = 0;
        generalBackoffMs = 0;
        connErrorStart = null;
        generalErrorStart = null;
        lastPollErrorTime = null;
        sessionFailedRecently = false;
        if (pendingReregisterEvent) {
          pendingReregisterEvent = false;
          logEvent("tengu_bridge_env_reregister", {
            attempt: reregisterEventAttempt,
            outcome: lit("recovered"),
            trigger: reregisterTrigger,
          });
          logFeatureOk("bridge_env_reregister");
          renewalAttempt = 0;
        }
        reregisterAttempts = 0;
        reregisterTransientSeen = false;
        reregisterOwnsSecret = false;
      }
      if (!work) {
        for (let key of heartbeatTokens.keys()) if (!sessionStartTimes.has(key)) heartbeatTokens.delete(key);
        if (shouldPoll && (activeSessions.size > 0 || pendingRequeues.size > 0)) await drainRequeues();
        let advertOutcome = await describeAdvertChange({
          api: trackedApi,
          config,
          environmentId,
          activeSessions: sessionStartTimes,
          pacing,
          signal: loopSignal,
        });
        if (advertOutcome) {
          reregisterTrigger = lit("tool_host_advert_changed");
          applyReregistration(advertOutcome);
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
            let heartbeatCycles = 0;
            while (
              !loopSignal.aborted &&
              sessionStartTimes.size >= config.maxSessions &&
              (pollDeadline === null || Date.now() < pollDeadline) &&
              !isSecretRenewDue()
            ) {
              let hbConfig = getPollIntervalConfig();
              if (hbConfig.non_exclusive_heartbeat_interval_ms <= 0) break;
              let cap = capacityWake.signal();
              if (Date.now() >= nextHeartbeatAt) {
                hbResult = await heartbeatActiveWorkItems();
                if (hbResult === "auth_failed" || hbResult === "fatal") {
                  cap.cleanup();
                  break;
                }
                nextHeartbeatAt = Date.now() + hbConfig.non_exclusive_heartbeat_interval_ms;
                heartbeatCycles++;
              }
              let min = Math.min(
                nextHeartbeatAt,
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
                      : isSecretRenewDue()
                        ? "secret_renewal_due"
                        : "config_disabled";
            logEvent("tengu_bridge_heartbeat_mode_exited", {
              reason: fromEnum(exitReason),
              heartbeat_cycles: heartbeatCycles,
              active_sessions: sessionStartTimes.size,
            });
            if (exitReason === "poll_due")
              logForDebugging(
                `[bridge:poll] Heartbeat poll_due after ${heartbeatCycles} cycles \u2014 falling through to pollForWork`,
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
          let heartbeatMinAgeMs =
            nonExclusiveHeartbeatIntervalMs > 0
              ? nonExclusiveHeartbeatIntervalMs
              : lastHeartbeatOkAt > 0
                ? 60000
                : 0;
          let useTokenAges = lastHeartbeatOkAt > 0;
          let gapSnapshot = clockSnapshot(systemClock);
          let filtered = [...sessionStartTimes.keys()].filter((key) =>
            useTokenAges
              ? isHeartbeatStale(key, heartbeatMinAgeMs)
              : Date.now() - lastHeartbeatOkAt >= heartbeatMinAgeMs,
          );
          let eligible =
            heartbeatFailed && gapSnapshot.monotonic - lastHeartbeatAttemptWall < REGISTER_RETRY_MIN_MS
              ? filtered.filter((sessionId) => isSleepGap(heartbeatTokens.get(sessionId), gapSnapshot))
              : filtered;
          if (
            heartbeatMinAgeMs > 0 &&
            eligible.length > 0 &&
            (!heartbeatFailed || gapSnapshot.monotonic - lastHeartbeatAttemptAt >= SLEEP_GAP_WINDOW.retry)
          ) {
            let onlySet = useTokenAges && eligible.length < filtered.length ? new Set(eligible) : undefined;
            let heartbeatResult = await heartbeatSessions(useTokenAges ? heartbeatMinAgeMs : 0, onlySet);
            if (
              onlySet !== undefined &&
              heartbeatResult === "ok" &&
              [...sessionStartTimes.keys()].some(
                (key) => !onlySet.has(key) && isHeartbeatStale(key, heartbeatMinAgeMs),
              )
            )
              await heartbeatSessions(heartbeatMinAgeMs);
            if (heartbeatResult === "ok" && !useTokenAges) lastHeartbeatOkAt = Date.now();
          }
          let idlePollIntervalMs =
            sessionStartTimes.size > 0
              ? pollConfig.multisession_poll_interval_ms_partial_capacity
              : pollConfig.multisession_poll_interval_ms_not_at_capacity;
          if (watchScheduler.governs()) {
            let cap = capacityWake_2.signal();
            await sleep(Math.min(idlePollIntervalMs, watchScheduler.msUntilDue()), cap.signal);
            cap.cleanup();
          } else await sleep(idlePollIntervalMs, loopSignal);
        }
        continue;
      }
      let atCapacity = sessionStartTimes.size >= config.maxSessions;
      let cleanupIfAtCapacity = async () => {
        if (atCapacity) await trackCleanup(pollConfig);
      };
      if (work.data?.mode != null) {
        if (config.toolHostHandler !== undefined && work.data.mode === "tool_use") {
          try {
            await config.toolHostHandler.handle(work, {
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
          if (!atCapacity) await sleep(1000, loopSignal);
        } else if (!unsupportedModeWorkIds.has(work.id)) {
          unsupportedModeWorkIds.add(work.id);
          let workLogId = hashIdForLog(work.id);
          logForDebugging(
            `[bridge:work] Stopping work item with an unsupported mode workId=${workLogId} sessionId=${hashIdForLog(work.data.id)}`,
          );
          logEvent("tengu_bridge_work_mode_unsupported", {});
          trackBackgroundOp(
            stopWorkWithRetry(
              trackedApi,
              environmentId,
              work.id,
              currentEnvironmentSecret,
              logger,
              backoff.stopWorkBaseDelayMs,
              workLogId,
            ),
          );
        } else if (!atCapacity) await sleep(1000, loopSignal);
        await cleanupIfAtCapacity();
        continue;
      }
      if (
        completedWorkIds_2.has(work.id) &&
        work.state === WORK_STATE_QUEUED &&
        !sessionTimers.has(work.id)
      ) {
        completedWorkIds_2.delete(work.id);
        logForDebugging(
          `[bridge:work] Previously completed workId=${work.id} was re-queued by the server, handling as new work`,
        );
      }
      if (completedWorkIds_2.has(work.id)) {
        logForDebugging(`[bridge:work] Skipping already-completed workId=${work.id} state=${work.state}`);
        if (atCapacity) await trackCleanup(pollConfig);
        else await sleep(1000, loopSignal);
        continue;
      }
      let workSecret;
      try {
        workSecret = decodeWorkSecret(work.secret);
      } catch (err) {
        let errMsg = errorMessage(err);
        logger.logError(`Failed to decode work secret for workId=${work.id}: ${errMsg}`);
        logEvent("tengu_bridge_work_secret_failed", {});
        if (work.data.type === "session") logFeatureBad("bridge_work_pickup", "secret_decode_failed");
        completedWorkIds_2.add(work.id);
        trackBackgroundOp(
          stopWorkWithRetry(
            trackedApi,
            environmentId,
            work.id,
            currentEnvironmentSecret,
            logger,
            backoff.stopWorkBaseDelayMs,
          ),
        );
        await cleanupIfAtCapacity();
        continue;
      }
      let ackWork = async () => {
        logForDebugging(`[bridge:work] Acknowledging workId=${work.id}`);
        try {
          await trackedApi.acknowledgeWork(environmentId, work.id, workSecret.session_ingress_token);
        } catch (err) {
          logForDebugging(`[bridge:work] Acknowledge failed workId=${work.id}: ${errorMessage(err)}`);
        }
      };
      let seedHeartbeat = (sessionId) => {
        if (pollConfig.non_exclusive_heartbeat_interval_ms <= 0 && lastHeartbeatOkAt === 0) return;
        let heartbeatStamp = clockSnapshot(systemClock);
        heartbeatTokens.set(sessionId, heartbeatStamp);
        lastHeartbeatOkAt = Date.now();
        trackBackgroundOp(
          trackedApi
            .heartbeatWork(environmentId, work.id, workSecret.session_ingress_token)
            .then(() => logFeatureOk("bridge_work_heartbeat"))
            .catch((error) => {
              logFeatureSad("bridge_work_heartbeat", "initial_failed");
              logForDebugging(
                `[bridge:work] Initial heartbeat failed workId=${work.id}: ${errorMessage(error)}`,
              );
              if (!(error instanceof BridgeFatalError) && heartbeatTokens.get(sessionId) === heartbeatStamp)
                heartbeatTokens.delete(sessionId);
            }),
        );
      };
      let workType = work.data.type;
      switch (work.data.type) {
        case "healthcheck":
          await ackWork();
          logForDebugging("[bridge:work] Healthcheck received");
          logger.logVerbose("Healthcheck received");
          break;
        case "session": {
          let sessionId = work.data.id;
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
            existingHandle.updateAccessToken(workSecret.session_ingress_token);
            titledSessions.get(sessionId)?.updateAccessToken(workSecret.session_ingress_token);
            sessionWorktrees.set(sessionId, work.id);
            tokenRefresh?.schedule(sessionId, workSecret.session_ingress_token);
            logForDebugging(
              `[bridge:work] Updated access token for existing sessionId=${sessionId} workId=${work.id}`,
            );
            await ackWork();
            seedHeartbeat(sessionId);
            break;
          }
          if (sessionStartTimes.size >= config.maxSessions) {
            logForDebugging(
              `[bridge:work] At capacity (${sessionStartTimes.size}/${config.maxSessions}), cannot spawn new session for workId=${work.id}`,
            );
            let capacityFreed = false;
            if (!sessionIngressTokens.has(work.id)) {
              let sessionId_2 = toCompatSessionId(sessionId);
              let tagsUnknown = !knownSessionBodies.has(sessionIdBody(sessionId));
              let sessionTags = tagsUnknown
                ? await fetchBridgeSessionTags(sessionId_2, {
                    baseUrl: config.apiBaseUrl,
                    getAccessToken,
                  })
                : null;
              if (!tagsUnknown || sessionTags !== null) sessionIngressTokens.add(work.id);
              let sessionAgeMs =
                sessionTags?.createdAtMs === undefined ? undefined : Date.now() - sessionTags.createdAtMs;
              if (loopSignal.aborted);
              else if (sessionStartTimes.size < config.maxSessions) capacityFreed = true;
              else if (
                sessionTags !== null &&
                sessionAgeMs !== undefined &&
                sessionAgeMs >= 0 &&
                sessionAgeMs < STATUS_UPDATE_INTERVAL_MS &&
                classifyBridgeSessionRoles(sessionTags.tags).projectThreadChild
              ) {
                logger.logError(
                  `Declined session ${sessionId_2}: already running ${sessionStartTimes.size} of ${config.maxSessions} sessions.`,
                );
                logFeatureBad("bridge_work_pickup", "at_capacity_declined");
                sessionTimers.add(work.id);
                completedWorkIds_2.add(work.id);
                trackBackgroundOp(
                  stopWorkWithRetry(
                    trackedApi,
                    environmentId,
                    work.id,
                    currentEnvironmentSecret,
                    logger,
                    backoff.stopWorkBaseDelayMs,
                  )
                    .then(() => Promise.all([import("./createSession.js"), getAccessToken?.()]))
                    .then(([{ markBridgeSessionRefusedAtCapacity: refuseAtCapacity }, accessToken]) =>
                      refuseAtCapacity(sessionId_2, config.machineName, {
                        baseUrl: config.apiBaseUrl,
                        ...(accessToken && {
                          getAccessToken: () => accessToken,
                        }),
                      }),
                    )
                    .then((archiveResult) =>
                      archiveResult === "landed" ? trackedApi.archiveSession(sessionId_2) : undefined,
                    )
                    .catch((error) =>
                      logger.logVerbose(
                        `Could not end declined session ${sessionId_2}: ${errorMessage(error)}`,
                      ),
                    )
                    .finally(() => sessionTimers.delete(work.id)),
                );
              } else
                logFeatureSad("bridge_work_pickup", "at_capacity", {
                  active_sessions: sessionStartTimes.size,
                  max_sessions: config.maxSessions,
                });
            }
            if (!capacityFreed) break;
          }
          await ackWork();
          seedHeartbeat(sessionId);
          sessionIngressTokens.delete(work.id);
          let spawnStartTime = Date.now();
          let compatSessionId = toCompatSessionId(sessionId);
          let sessionRecord;
          if (machineLaneVersionRefusal() !== null) {
            let tags = await fetchSessionRecordWithRetry(compatSessionId);
            if (tags === null && loopSignal.aborted) break;
            let versionRefusal = machineLaneVersionRefusal();
            if (versionRefusal?.reason === "floor_unanswered" && isMachineLaneWork(tags, versionRefusal)) {
              logForDebugging(
                `[bridge:work] Holding sessionId=${sessionId} workId=${work.id}: version floor not received, refreshing flags`,
              );
              versionRefusal = await machineLaneVersionRefusalAfterHold(
                versionRefusal,
                loopSignal,
                refreshHold,
              );
              if (loopSignal.aborted) {
                completedWorkIds_2.add(work.id);
                trackBackgroundOp(
                  stopWorkWithRetry(
                    trackedApi,
                    environmentId,
                    work.id,
                    currentEnvironmentSecret,
                    logger,
                    backoff.stopWorkBaseDelayMs,
                  ),
                );
                break;
              }
              logForDebugging(
                `[bridge:work] Held sessionId=${sessionId} workId=${work.id}: ${versionRefusal?.reason ?? "admitted"}`,
              );
              if (versionRefusal === null) logFeatureSad("bridge_machine_lane_floor", "held_then_admitted");
            }
            if (versionRefusal !== null && isMachineLaneWork(tags, versionRefusal)) {
              logger.logError(
                tags === null
                  ? `Declined session ${compatSessionId}: its record could not be read. ${versionRefusal.message}`
                  : `Declined session ${compatSessionId}: ${versionRefusal.message}`,
              );
              logFeatureBad(
                "bridge_machine_lane_floor",
                tags === null ? `session_unread_${versionRefusal.reason}` : versionRefusal.reason,
              );
              logFeatureBad("bridge_work_pickup", "version_floor");
              completedWorkIds_2.add(work.id);
              trackBackgroundOp(
                stopWorkWithRetry(
                  trackedApi,
                  environmentId,
                  work.id,
                  currentEnvironmentSecret,
                  logger,
                  backoff.stopWorkBaseDelayMs,
                ),
              );
              break;
            }
            sessionRecord = tags;
          }
          let sessionUrl = buildCCRv2SdkUrl(config.apiBaseUrl, sessionId);
          let workerEpoch;
          for (let attempt = 1; attempt <= REGISTER_WORKER_MAX_ATTEMPTS; attempt++)
            try {
              workerEpoch = await registerWorker(sessionUrl, workSecret.session_ingress_token);
              logForDebugging(
                `[bridge:session] CCR v2: registered worker sessionId=${sessionId} epoch=${workerEpoch} attempt=${attempt}`,
              );
              logFeatureOk("bridge_register_worker", {
                attempt,
              });
              break;
            } catch (err) {
              let errMsg = errorMessage(err);
              let { kind, status } = classifyAxiosError(err);
              let retryable = status === undefined || status === 408 || status === 429 || status >= 500;
              if (attempt < REGISTER_WORKER_MAX_ATTEMPTS && retryable && !loopSignal.aborted) {
                logForDebugging(
                  `[bridge:session] CCR v2: registerWorker attempt ${attempt} failed, retrying: ${errMsg}`,
                );
                if (attempt === 1 && sessionStartTimes.size > 0 && heartbeatsEnabled()) await heartbeatNow();
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
                completedWorkIds_2.add(work.id);
                trackBackgroundOp(
                  stopWorkWithRetry(
                    trackedApi,
                    environmentId,
                    work.id,
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
              completedWorkIds_2.add(work.id);
              trackBackgroundOp(
                stopWorkWithRetry(
                  trackedApi,
                  environmentId,
                  work.id,
                  currentEnvironmentSecret,
                  logger,
                  backoff.stopWorkBaseDelayMs,
                ),
              );
              break;
            }
          if (workerEpoch === undefined) break;
          let spawnModeAtDecision = config.spawnMode;
          let serverConfigEnabled = isBridgeServerSessionConfigEnabled();
          let worktreeRequestedFromServer = serverConfigEnabled && workSecret.worktree === true;
          let useWorktree = spawnModeAtDecision === "worktree";
          if (worktreeRequestedFromServer && !useWorktree) {
            useWorktree = hasWorktreeCreateHook() || findGitRootRecheckingNegative(config.dir) !== null;
            if (!useWorktree)
              logger.logStatus(
                `session ${sessionId} asked for a worktree \xB7 ${config.dir} is not a git repository, running there`,
              );
          }
          let sessionDir = config.dir;
          let usedAdHocWorktree = false;
          let worktreeCreateMs = 0;
          if (
            useWorktree &&
            (initialSessionId === undefined || !sameSessionId(sessionId, initialSessionId))
          ) {
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
              usedAdHocWorktree = !agentWorktree.hookBased;
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
              completedWorkIds_2.add(work.id);
              trackBackgroundOp(
                stopWorkWithRetry(
                  trackedApi,
                  environmentId,
                  work.id,
                  currentEnvironmentSecret,
                  logger,
                  backoff.stopWorkBaseDelayMs,
                ),
              );
              break;
            }
          }
          let sourceDir;
          logForDebugging(`[bridge:session] Spawning sessionId=${sessionId} sdkUrl=${sessionUrl}`);
          let spawnEpoch = ++spawnEpochCounter;
          sessionSpawnEpochs.set(sessionId, spawnEpoch);
          let idleExitAfterMs = 0;
          let hasAutoModeEnvironment = false;
          let rcChildRestartResume = false;
          rcChildRestartResume = isRcChildRestartResumeEnabled();
          if (config.spawnMode !== "single-session") idleExitAfterMs = getBridgeRcChildIdleExitMs();
          hasAutoModeEnvironment = Boolean(workSecret.auto_mode_environment?.length) && serverConfigEnabled;
          let needsSessionTags =
            hasBridgeChildFeatureEnabled("spawn") ||
            idleExitAfterMs > 0 ||
            rcChildRestartResume ||
            hasAutoModeEnvironment;
          let sessionRecordForRoles = needsSessionTags
            ? sessionRecord !== undefined
              ? sessionRecord
              : await fetchSessionRecordWithRetry(compatSessionId)
            : null;
          if (needsSessionTags && sessionRecordForRoles === null && loopSignal.aborted) {
            completedWorkIds_2.add(work.id);
            trackBackgroundOp(
              stopWorkWithRetry(
                trackedApi,
                environmentId,
                work.id,
                currentEnvironmentSecret,
                logger,
                backoff.stopWorkBaseDelayMs,
              ),
            );
            break;
          }
          let compatSessionId_2 = classifyBridgeSessionRoles(sessionRecordForRoles);
          let { rcChild, projectThreadChild } = compatSessionId_2;
          let idleExitAfterMs_2 = idleExitAfterMs > 0 && projectThreadChild ? idleExitAfterMs : 0;
          let dropAutoModeEnvironment;
          if (hasAutoModeEnvironment && !projectThreadChild)
            dropAutoModeEnvironment =
              sessionRecordForRoles === null ? "session_tags_unread" : "session_untagged";
          let serverConfig = await applyBridgeServerConfig(workSecret, {
            sessionId,
            apiBaseUrl: config.apiBaseUrl,
            enabled: serverConfigEnabled,
            dropAutoModeEnvironment,
          });
          let modelArgs = serverConfig === undefined ? carriedModelArgs(workSecret.claude_code_args) : [];
          let boundResumedTurn = boundedResumeBodies.has(sessionIdBody(sessionId));
          let standIn = await sessionSpawner.chooseStandIn?.();
          let spawnResult = safeSpawn(
            sessionSpawner,
            {
              sessionId,
              sdkUrl: sessionUrl,
              accessToken: workSecret.session_ingress_token,
              workerEpoch,
              serverConfig,
              modelArgs,
              roles: compatSessionId_2,
              boundResumedTurn,
              idleExitAfterMs: idleExitAfterMs_2,
              ...(sourceDir !== undefined && {
                sourceDir,
              }),
              ...(standIn !== undefined && {
                standIn,
              }),
              onActivity: (text) => {
                switch (text.type) {
                  case "tool_start":
                  case "text":
                    markSessionBusy(sessionId, true);
                    break;
                  case "result":
                  case "error":
                    markSessionBusy(sessionId, false);
                    break;
                }
              },
              onFirstUserMessage: (text) => {
                if (titleSettledSessions.has(compatSessionId)) return;
                titleSettledSessions.add(compatSessionId);
                let derivedTitle = truncateToWidth(text.replace(/\s+/g, " ").trim(), TITLE_MAX_CHARS);
                logger.setSessionTitle(compatSessionId, derivedTitle);
                logForDebugging(`[bridge:title] derived title for ${compatSessionId}: ${derivedTitle}`);
                import("./createSession.js")
                  .then(async ({ getBridgeSession }) => {
                    titleWriteCoalescer ??= createTitleWriteCoalescer({
                      isOwnTitle: (sessionId, title) =>
                        sessionTitleCandidates.get(sessionId)?.has(title) ?? false,
                      onRemoteTitleAdopted: (sessionId, title) => logger.setSessionTitle(sessionId, title),
                    });
                    let bridgeSession = await getBridgeSession(compatSessionId, {
                      baseUrl: config.apiBaseUrl,
                    });
                    if (bridgeSession === null || sessionSpawnEpochs.get(sessionId) !== spawnEpoch) return;
                    let wt = sessionTitleCandidates.get(compatSessionId);
                    if (
                      bridgeSession.title &&
                      !wt?.has(bridgeSession.title) &&
                      !titleWriteCoalescer.hasSent(compatSessionId, bridgeSession.title)
                    ) {
                      logger.setSessionTitle(compatSessionId, bridgeSession.title);
                      titleWriteCoalescer.noteRemoteTitle(compatSessionId, bridgeSession.title);
                      logForDebugging(
                        `[bridge:title] remote rename for ${compatSessionId}: ${bridgeSession.title}`,
                      );
                      return;
                    }
                    sessionTitleCandidates.set(compatSessionId, (wt ?? new Set()).add(derivedTitle));
                    await titleWriteCoalescer.update(compatSessionId, derivedTitle, {
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
            trackBackgroundOp(cleanupServerConfigDir(serverConfig));
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
            completedWorkIds_2.add(work.id);
            trackBackgroundOp(
              stopWorkWithRetry(
                trackedApi,
                environmentId,
                work.id,
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
            worktree_requested: worktreeRequestedFromServer,
            spawn_duration_ms: spawnDurationMs,
            worktree_create_ms: worktreeCreateMs,
            rc_child: rcChild,
            project_thread: projectThreadChild,
            resumed_turn: boundResumedTurn,
            inProtectedNamespace: isEvalBuild(),
            ...cooAttributes(),
          });
          logForDiagnosticsNoPII("info", "bridge_session_started", {
            spawn_mode: spawnModeAtDecision,
            in_worktree: sessionHeartbeatState.has(sessionId),
            worktree_requested: worktreeRequestedFromServer,
            spawn_duration_ms: spawnDurationMs,
            worktree_create_ms: worktreeCreateMs,
          });
          sessionStartTimes.set(sessionId, handle);
          knownSessionBodies.add(sessionIdBody(sessionId));
          for (let parkedProjectThreadId of parkedProjectThreadIds)
            if (sessionIdBody(parkedProjectThreadId) === sessionIdBody(sessionId))
              parkedProjectThreadIds.delete(parkedProjectThreadId);
          if (projectThreadChild) {
            sessionCompatIds.add(sessionId);
            servesProjectThread = true;
          }
          settleRequeue(sessionId, false);
          config.onSessionServiced?.(sessionId);
          sessionWorktrees.set(sessionId, work.id);
          timedOutSessions.set(sessionId, compatSessionId);
          failedSessionIds.delete(sessionId);
          keptWorktreePaths.delete(sessionDir);
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
              if (
                title &&
                sessionSpawnEpochs.get(sessionId) === spawnEpoch &&
                !titleSettledSessions.has(compatSessionId)
              ) {
                logger.setSessionTitle(compatSessionId, title);
                logForDebugging(`[bridge:title] server title for ${compatSessionId}: ${title}`);
                if (!sessionTitleCandidates.get(compatSessionId)?.has(title))
                  titleSettledSessions.add(compatSessionId);
              }
            })
            .catch((err) =>
              logForDebugging(`[bridge:title] failed to fetch title for ${compatSessionId}: ${err}`, {
                level: "error",
              }),
            );
          tokenRefresh?.schedule(sessionId, workSecret.session_ingress_token);
          handle.done.then(onSessionDone(sessionId, startTime, handle));
          break;
        }
        default:
          await ackWork();
          logForDebugging(`[bridge:work] Unknown work type: ${workType}, skipping`);
          break;
      }
      if (atCapacity) await trackCleanup(pollConfig);
    } catch (error) {
      if (loopSignal.aborted) break;
      if (error instanceof BridgeFatalError) {
        let fatalReregisterTrigger = classifyReregisterTrigger(error);
        let reregisterOutcome;
        if (fatalReregisterTrigger !== undefined) {
          reregisterTrigger = fromEnum(fatalReregisterTrigger);
          reregisterOwnsSecret = true;
          let now = Date.now();
          while (pendingCleanups.length > 0 && pendingCleanups[0] < now - 3600000) pendingCleanups.shift();
          while (pendingCleanups.length > 0 && pendingCleanups.at(-1) > now) pendingCleanups.pop();
          if (
            fatalReregisterTrigger === "poll_401" &&
            reregisterAttempts < RENEW_MAX_ATTEMPTS &&
            pendingCleanups.length >= RENEW_MAX_JITTER_PCT
          ) {
            let pausedUntil = pendingCleanups[0] + 3600000 + Math.random() * backoff.connCapMs;
            if (lastPauseLoggedAt === undefined || now - lastPauseLoggedAt >= 3600000) {
              lastPauseLoggedAt = now;
              let max = Math.max(1, Math.ceil((pausedUntil - now) / 60000));
              let minuteWord = max === 1 ? "minute" : "minutes";
              logForDebugging(
                `[bridge:poll] Pausing re-registration of environment ${environmentId}: ${pendingCleanups.length} re-registrations after poll 401s in the last hour (the hourly cap); resuming in about ${max} ${minuteWord}`,
                {
                  level: "warn",
                },
              );
              logger.logWarning(
                `The server keeps rejecting this computer's Remote Control credential, so Remote Control will wait about ${max} ${minuteWord} before renewing it again. New sessions can't start here until the server accepts it.`,
              );
              logEvent("tengu_bridge_env_reregister", {
                attempt: reregisterAttempts,
                outcome: lit("paused"),
                trigger: fromEnum(fatalReregisterTrigger),
              });
              logFeatureSad("bridge_env_reregister", "paused");
            }
            if (sessionStartTimes.size > 0 && heartbeatsEnabled()) await heartbeatNow();
            await sleep(
              jitterDelay(Math.min(Math.max(pausedUntil - now, backoff.connInitialMs), backoff.connCapMs)),
              loopSignal,
            );
            continue;
          }
          if (reregisterAttempts < RENEW_MAX_ATTEMPTS) {
            reregisterAttempts++;
            if (fatalReregisterTrigger === "poll_401") pendingCleanups.push(now);
            logger.logVerbose(
              `${fatalReregisterTrigger === "poll_401" ? "This environment's Remote Control credential expired or was rejected; renewing it" : "Server no longer has this environment \u2014 re-registering"} (attempt ${reregisterAttempts}/${RENEW_MAX_ATTEMPTS})`,
            );
            let reregisterResult = await reregisterEnvironment({
              api: trackedApi,
              config,
              environmentId,
              activeSessions: sessionStartTimes,
              attempt: reregisterAttempts,
              trigger: fatalReregisterTrigger,
              signal: loopSignal,
            });
            if (reregisterResult.outcome === "reregistered") applyReregistration(reregisterResult);
            if (loopSignal.aborted) break;
            if (reregisterResult.outcome === "fatal") reregisterOutcome = reregisterResult;
            else {
              if (reregisterResult.outcome === "transient") reregisterTransientSeen = true;
              logger.logVerbose(
                reregisterResult.outcome === "reregistered"
                  ? "Environment re-registered; resuming poll."
                  : "Re-registration failed; retrying after backoff.",
              );
              if (fatalReregisterTrigger === "poll_401" && sessionStartTimes.size > 0 && heartbeatsEnabled())
                await heartbeatNow();
              watchScheduler.expectWork();
              await sleep(
                Math.max(
                  jitterDelay(
                    (fatalReregisterTrigger === "poll_401"
                      ? Math.max(
                          backoff.connInitialMs,
                          backoff.reregister401BackoffFloorMs ?? SHUTDOWN_GRACE_MS,
                        )
                      : backoff.connInitialMs) * reregisterAttempts,
                  ),
                  Math.min(
                    reregisterResult.outcome === "transient" ? (reregisterResult.retryAfterMs ?? 0) : 0,
                    backoff.connCapMs,
                  ),
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
              trigger: fromEnum(fatalReregisterTrigger),
            });
            logFeatureBad("bridge_env_reregister", "gave_up");
            reregisterOutcome = {
              reason: "gave_up",
              preserve: fatalReregisterTrigger === "poll_401" && reregisterTransientSeen,
            };
          }
        }
        let preserve = reregisterOutcome?.reason === "gave_up" && reregisterOutcome.preserve;
        gaveUp = !preserve;
        if (preserve) controller.abort();
        if (error.status !== 401 && isExpiredErrorType(error.errorType))
          logger.logStatus(withReconnectHint(error.message));
        else if (
          fatalReregisterTrigger === "poll_401" &&
          reregisterOutcome !== undefined &&
          !(reregisterOutcome.reason === "register_rejected" && reregisterOutcome.status === 401)
        ) {
          let fatalMessage;
          switch (reregisterOutcome.reason) {
            case "register_rejected":
              fatalMessage = `Remote Control stopped: the server refused to reconnect this computer. ${reregisterOutcome.message}`;
              break;
            case "replaced":
              fatalMessage =
                "Remote Control could not renew this environment's credential: the server issued a new environment instead. Restart `claude remote-control` to start fresh.";
              break;
            case "gave_up":
              fatalMessage = `Remote Control could not renew this environment's credential after repeated attempts.${preserve && config.preserveOnShutdown ? "" : " Restart `claude remote-control` to start fresh."}`;
              break;
          }
          logger.logError(fatalMessage);
          logForDebugging(`[bridge:work] Fatal bridge error: ${error.message}`, {
            level: "error",
          });
        } else if (isSuppressibleError(error))
          logForDebugging(`[bridge:work] Suppressed 403 error: ${error.message}`);
        else if (isEnvironmentGoneError(error) && failedSessionIds.size > 0) reportOfflineCleanup();
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
        let keepRetryingForProjectThread = servesProjectThread && isRcChildRestartResumeEnabled();
        if (elapsed >= backoff.connGiveUpMs && keepRetryingForProjectThread)
          logger.logVerbose(
            `Server unreachable for ${Math.round(elapsed / 60000)} minutes; still retrying while a project thread session is being served`,
          );
        if (elapsed >= backoff.connGiveUpMs && !keepRetryingForProjectThread) {
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
          `Connection error, retrying in ${formatMs(respectWatchDelay(delay))} (${Math.round(elapsed / 1000)}s elapsed): ${errMsg}`,
        );
        logger.updateReconnectingStatus(formatMs(respectWatchDelay(delay)), formatDuration(elapsed));
        if (getPollIntervalConfig().non_exclusive_heartbeat_interval_ms > 0) await heartbeatSessions();
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
        let keepRetryingForProjectThread = servesProjectThread && isRcChildRestartResumeEnabled();
        if (elapsed >= backoff.generalGiveUpMs && keepRetryingForProjectThread)
          logger.logVerbose(
            `Persistent errors for ${Math.round(elapsed / 60000)} minutes; still retrying while a project thread session is being served`,
          );
        if (elapsed >= backoff.generalGiveUpMs && !keepRetryingForProjectThread) {
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
          `Poll failed, retrying in ${formatMs(respectWatchDelay(delay))} (${Math.round(elapsed / 1000)}s elapsed): ${errMsg}`,
        );
        logger.updateReconnectingStatus(formatMs(respectWatchDelay(delay)), formatDuration(elapsed));
        if (getPollIntervalConfig().non_exclusive_heartbeat_interval_ms > 0) await heartbeatSessions();
        await sleep(delay, loopSignal);
      }
    }
  }
  unsubscribePolicy();
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
  if (
    initialSessionId &&
    ![...failedSessionIds].some((failedSessionId) => sameSessionId(failedSessionId, initialSessionId))
  )
    sessionsToArchive.add(initialSessionId);
  let compatIdSnapshot = new Map(timedOutSessions);
  await (async () => {
    if (sessionStartTimes.size === 0 && pendingRequeues.size === 0) return;
    let shutdownCause =
      config.persistActiveSessionsOnShutdown && config.preserveOnShutdown && !gaveUp && config.ownsPointer
        ? await config.awaitShutdownCause?.()
        : null;
    if (shutdownCause !== "upgrade" && shutdownCause !== "reload" && shutdownCause !== "yield") return;
    let {
      readBridgePointer,
      writeBridgePointer,
      MAX_POINTER_ACTIVE_SESSION_IDS,
      PERSISTED_SESSION_RESUME_WINDOW_MS,
      isPersistedStampFresh,
    } = await import("./bridgePointer.js");
    await (config.enqueuePointerWrite ?? ((runWrite) => runWrite()))(async () => {
      let bridgePointer = await readBridgePointer(
        config.dir,
        {
          noClear: true,
        },
        config.storageV5,
      );
      if (!bridgePointer) return;
      let { ageMs, ...pointerFields } = bridgePointer;
      let sessionIds = [...sessionStartTimes.keys()];
      let now = Date.now();
      let initialSessionRequeuesPersistedAt = config.initialSessionRequeuesPersistedAt;
      let liveSessionIds =
        initialSessionRequeuesPersistedAt !== undefined &&
        isPersistedStampFresh(initialSessionRequeuesPersistedAt, now, PERSISTED_SESSION_RESUME_WINDOW_MS)
          ? [...pendingRequeues.keys()].filter((key) => !hasStartedSession(key))
          : [];
      await writeBridgePointer(
        config.dir,
        {
          ...pointerFields,
          activeSessionIds: [
            ...sessionIds.filter((sessionId) => sessionWorkIds.has(sessionId)),
            ...liveSessionIds,
            ...sessionIds.filter((sessionId) => !sessionWorkIds.has(sessionId)),
          ].slice(0, MAX_POINTER_ACTIVE_SESSION_IDS),
          activeSessionIdsPersistedAt:
            liveSessionIds.length > 0 && initialSessionRequeuesPersistedAt !== undefined
              ? Math.min(now, initialSessionRequeuesPersistedAt)
              : now,
        },
        config.storageV5,
      );
    });
  })();
  if (config.preserveOnShutdown && !gaveUp && config.ownsPointer && isRcChildRestartResumeEnabled()) {
    let result =
      projectThreadPointer(sessionCompatIds, parkedProjectThreadIds) ??
      (config.parkedProjectThreadSessionIds
        ? {
            projectThreadSessionIds: [],
            parkedProjectThreadSessionIds: [],
          }
        : undefined);
    if (result !== undefined) {
      let { readBridgePointer, writeBridgePointer } = await import("./bridgePointer.js");
      let writePointer = config.enqueuePointerWrite ?? ((runWrite) => runWrite());
      let parkedProjectThreadSessionIdsPersistedAt =
        config.parkedProjectThreadSessionIdsPersistedAt !== undefined &&
        (config.parkedProjectThreadSessionIds ?? []).some((sessionId) =>
          parkedProjectThreadIds.has(sessionId),
        )
          ? config.parkedProjectThreadSessionIdsPersistedAt
          : Date.now();
      await writePointer(async () => {
        let bridgePointer = await readBridgePointer(
          config.dir,
          {
            noClear: true,
            ignoreTtl: true,
          },
          config.storageV5,
        );
        if (!bridgePointer) return;
        let { ageMs, ...pointerFields } = bridgePointer;
        await writeBridgePointer(
          config.dir,
          {
            ...pointerFields,
            ...(result.projectThreadSessionIds.length > 0 && {
              projectThreadSessionIds: result.projectThreadSessionIds,
              projectThreadSessionIdsPersistedAt: Date.now(),
            }),
            parkedProjectThreadSessionIds: result.parkedProjectThreadSessionIds,
            parkedProjectThreadSessionIdsPersistedAt,
          },
          config.storageV5,
        );
      });
      logForDebugging(
        `[bridge:shutdown] remembered ${result.projectThreadSessionIds.length} live and ${result.parkedProjectThreadSessionIds.length} parked project thread session(s) for the next run`,
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
      Promise.allSettled([...sessionStartTimes.values()].map((sessionHandle) => sessionHandle.done)),
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
    let shutdownCause = await config.awaitShutdownCause?.();
    if (shutdownCause !== "upgrade" && shutdownCause !== "reload")
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
    let { clearBridgePointer } = await import("./bridgePointer.js");
    await (config.enqueuePointerWrite ?? ((runWrite) => runWrite()))(async () => {
      config.pointerCleared = true;
      await clearBridgePointer(config.dir, config.storageV5);
    });
  }
  logger.logVerbose("Environment offline.");
  return policyRefusal;
}
//@ chunk-18851qev.js:71092-71233 fingerprint (2.1.88 match: CONNECTION_ERROR_CODES, 0.751)
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
//@ chunk-18851qev.js:71233-71346 layout (2.1.88 match: isConnectionError, 1)
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
//@ chunk-18851qev.js:71346-71423 layout
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
//@ chunk-18851qev.js:71423-71530 layout
function isTimeoutError(error) {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT")
  );
}
//@ chunk-18851qev.js:71530-71673 layout
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
//@ chunk-18851qev.js:71673-71786 fingerprint (2.1.88 match: isServerError, 1)
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
//@ chunk-18851qev.js:71786-71818 layout
var REGISTER_RETRY_MIN_MS = 30000;
var REGISTER_RETRY_MAX_MS = 300000;
var REGISTER_RETRY_DEFAULT_MS = 60000;
//@ chunk-18851qev.js:71818-71881 layout
/**
 * 给延迟加 ±25% 随机抖动。
 */
function jitterDelay(ms) {
  return Math.max(0, ms + ms * 0.25 * (2 * Math.random() - 1));
}
//@ chunk-18851qev.js:71881-71958 layout
function formatMs(ms) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}
//@ chunk-18851qev.js:71958-71981 layout
var REREGISTER_MIN_BACKOFF_MS = 60000;
var REREGISTER_MAX_BACKOFF_MS = 300000;
//@ chunk-18851qev.js:71981-72356 layout
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
    let waitMs =
      !interactive && status !== undefined
        ? Math.max(Math.min(retryAfterMs, REREGISTER_MAX_BACKOFF_MS), jitterDelay(REREGISTER_MIN_BACKOFF_MS))
        : 0;
    await onFailure(error, waitMs);
    if (waitMs > 0) await sleep(waitMs);
    return;
  }
}
//@ chunk-18851qev.js:72356-73415 fingerprint (2.1.88 match: stopWorkWithRetry, 0.552)
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
//@ chunk-18851qev.js:73415-74597 layout
/**
 * 会话结束后清理 worktree：有未提交改动、领先提交或 checkout 移动时保留并提示，否则移除（removed / left_in_place / failed）。
 */
async function cleanupSessionWorktree(worktree, logger, options) {
  let cleanState = {
    dirty: false,
    commitsAhead: 0,
    gitError: false,
  };
  let changeState;
  if (options?.force) changeState = cleanState;
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
      : cleanState;
  else changeState = await getAgentWorktreeChanges(worktree.worktreePath, worktree.headCommit);
  let { dirty, commitsAhead, gitError, checkoutMoved, checkFailed } = changeState;
  if (dirty || commitsAhead > 0 || checkoutMoved === true) {
    let commitsText = `${commitsAhead} ${plural(commitsAhead, "commit")}`;
    let keepReason = gitError
      ? "git error checking changes"
      : checkFailed
        ? "could not check for changes"
        : dirty && commitsAhead > 0
          ? `uncommitted changes \xB7 ${commitsText}`
          : dirty
            ? "uncommitted changes"
            : commitsText;
    if (worktree.gitRoot) await unlockAgentWorktree(worktree.worktreePath, worktree.gitRoot);
    logger.logStatus(`kept worktree ${worktree.worktreePath} \xB7 ${keepReason}`);
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
//@ chunk-18851qev.js:74597-74638 fingerprint (2.1.88 match: SPAWN_FLAG_VALUES, 1)
var SPAWN_FLAG_VALUES = ["session", "same-dir", "worktree"];
//@ chunk-18851qev.js:74638-74838 fingerprint (2.1.88 match: parseSpawnValue, 1)
function parseSpawnValue(raw) {
  if (raw === "session") return "single-session";
  if (raw === "same-dir") return "same-dir";
  if (raw === "worktree") return "worktree";
  return `--spawn requires one of: ${SPAWN_FLAG_VALUES.join(", ")} (got: ${raw ?? "<missing>"})`;
}
//@ chunk-18851qev.js:74838-74978 fingerprint (2.1.88 match: parseCapacityValue, 1)
function parseCapacityValue(raw) {
  let n = raw === undefined ? NaN : parseIntLoose(raw);
  if (isNaN(n) || n < 1) return `--capacity requires a positive integer (got: ${raw ?? "<missing>"})`;
  return n;
}
//@ chunk-18851qev.js:74978-75159 layout
/**
 * 解析 --preview-port（1024–65535），错误返回提示字符串。
 */
function parsePreviewPortValue(raw) {
  let n = raw === undefined ? NaN : Number(raw);
  if (!Number.isInteger(n) || n < 1024 || n > 65535)
    return `--preview-port requires an integer in [1024, 65535] (got: ${raw ?? "<missing>"})`;
  return n;
}
//@ chunk-18851qev.js:75159-78889 fingerprint (2.1.88 match: parseArgs, 0.734)
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
//@ chunk-18851qev.js:78889-78899 layout
var TITLE_MAX_CHARS = 80;
//@ chunk-18851qev.js:78899-79178 layout
/**
 * 取恢复会话所需的认证上下文：access token、是否用 v2 会话 CRUD、组织 UUID（v1 时）、trusted device token。
 */
async function getUnarchiveAuthContext(credentials) {
  let accessToken =
    isStorageV5Enabled() && credentials !== undefined
      ? await getBridgeAccessTokenAsync(credentials)
      : getBridgeAccessToken();
  if (!accessToken) return null;
  let useV2 = isCcrV2SessionCrudEnabled();
  let orgUUID;
  if (!useV2) {
    let { getOrganizationUUID } = await import("../services/oauth/client.js");
    orgUUID = (await getOrganizationUUID()) ?? undefined;
  }
  let trustedDeviceToken = await getTrustedDeviceToken().catch(() => {
    return;
  });
  return {
    accessToken,
    useV2,
    orgUUID,
    trustedDeviceToken,
  };
}
//@ chunk-18851qev.js:79178-79250 layout
function firstByte(data) {
  return typeof data === "string" ? Buffer.from(data, "utf8")[0] : data[0];
}
//@ chunk-18851qev.js:79250-80383 layout
/**
 * 重连前解档被回收的会话（tengu_bridge_unarchive_on_resume）：untrusted_device 时注册设备后重试；2xx 记成功、409 视为已活跃、其余保持旧行为。
 */
async function unarchiveBridgeSessionIfNeeded(sessionId, baseUrl, credentials) {
  try {
    let { getFeatureValue_CACHED_MAY_BE_STALE } =
      await import("../services/analytics/ATIS_REQUEST_HEADER.lazy.js");
    if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_unarchive_on_resume", true)) return false;
    let unarchiveAuthContext = await getUnarchiveAuthContext(credentials);
    if (!unarchiveAuthContext) return false;
    let { accessToken, useV2, orgUUID, trustedDeviceToken } = unarchiveAuthContext;
    let { unarchiveCodeSession } = await import("./codeSessionApi.js");
    let unarchiveStatus = await unarchiveCodeSession(baseUrl, accessToken, sessionId, 1e4, {
      useV2,
      orgUUID,
      trustedDeviceToken,
    });
    if (unarchiveStatus === "untrusted_device") {
      let retriedStatus = await withUntrustedDeviceRecovery(
        trustedDeviceToken,
        (trustedDeviceToken) =>
          unarchiveCodeSession(baseUrl, accessToken, sessionId, 1e4, {
            useV2,
            orgUUID,
            trustedDeviceToken,
          }),
        credentials,
      );
      if (retriedStatus !== undefined) unarchiveStatus = retriedStatus;
    }
    if (typeof unarchiveStatus === "number" && unarchiveStatus < 300) {
      logFeatureOk("bridge_session_unarchive");
      logForDebugging(
        `[bridge:init] Unarchived reaped session ${sessionId} before reattach (status=${String(unarchiveStatus)})`,
      );
      return true;
    }
    if (unarchiveStatus === 409) {
      logForDebugging(
        `[bridge:init] Session ${sessionId} already active (unarchived by another client) \u2014 resuming without a mutation to compensate`,
      );
      return false;
    }
    logFeatureBad(
      "bridge_session_unarchive",
      typeof unarchiveStatus === "number" ? `http_${unarchiveStatus}` : unarchiveStatus,
    );
    logForDebugging(
      `[bridge:init] Unarchive of reaped session ${sessionId} failed (status=${String(unarchiveStatus)}) \u2014 keeping prior reattach behavior`,
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
//@ chunk-18851qev.js:80383-80512 fingerprint (2.1.88 match: fetchSessionTitle, 0.67)
async function fetchSessionTitle(compatSessionId, baseUrl) {
  let { getBridgeSession } = await import("./createSession.js");
  return (
    (
      await getBridgeSession(compatSessionId, {
        baseUrl,
      })
    )?.title || undefined
  );
}
//@ chunk-18851qev.js:80512-80943 layout
/**
 * 每小时刷新一次 bridge pointer 文件（续 mtime，清理过期的 activeSessionIds），定时器 unref。
 */
function startPointerRefreshTimer(
  writeBridgePointer,
  ownProcStartAsync,
  dir,
  record,
  storageV5,
  signal,
  queue,
  stampWindowMs,
  isPersistedStampFresh,
  isCleared,
) {
  let interval = setInterval(
    (
      writePointer,
      ownProcStart,
      pointerDir,
      pointer,
      storage,
      acSignal,
      enqueue,
      windowMs,
      isFresh,
      isClearedFn,
    ) =>
      void ownProcStart().then((procStart) =>
        enqueue(() => {
          if (acSignal.aborted || isClearedFn()) return Promise.resolve(false);
          if (
            pointer.activeSessionIds !== undefined &&
            (pointer.activeSessionIdsPersistedAt === undefined ||
              !isFresh(pointer.activeSessionIdsPersistedAt, Date.now(), windowMs))
          ) {
            delete pointer.activeSessionIds;
            delete pointer.activeSessionIdsPersistedAt;
          }
          return writePointer(
            pointerDir,
            {
              ...pointer,
              procStart,
            },
            storage,
          );
        }),
      ),
    3600000,
    writeBridgePointer,
    ownProcStartAsync,
    dir,
    record,
    storageV5,
    signal,
    queue,
    stampWindowMs,
    isPersistedStampFresh,
    isCleared,
  );
  interval.unref?.();
  return interval;
}
//@ chunk-18851qev.js:80943-102611 fingerprint (2.1.88 match: bridgeMain, 0.575)
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
  let launcherError = processWrapperError();
  if (launcherError) {
    logFeatureBad("agent_launcher", "remote_control_refused");
    console.error(
      `Error: ${launcherError} \u2014 Remote Control sessions are not started unwrapped; fix the launcher, then retry`,
    );
    let { exitAfterAnalyticsFlush } = await import("../cli/exit.js");
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
  let boundedResumeIds = [];
  if (permissionMode !== undefined) {
    let { PERMISSION_MODES, PERMISSION_MODE_MANUAL_ALIAS } = await import("../types/permissions.js");
    if (!PERMISSION_MODES.includes(permissionMode)) {
      let mapped = PERMISSION_MODES.map((mode) => (mode === "default" ? PERMISSION_MODE_MANUAL_ALIAS : mode));
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
  let { enableConfigs, checkHasTrustDialogAccepted } = await import("../utils/config.js");
  await enableConfigs();
  let { initSinks } = await import("../utils/sinks.js");
  initSinks();
  let { setOriginalCwd, setCwdState, isHomeDirectorySession } = await import("../bootstrap/state.js");
  setOriginalCwd(dir);
  setCwdState(dir);
  if (!checkHasTrustDialogAccepted()) {
    let { canPromptForWorkspaceTrust, offerBridgeWorkspaceTrust } = await import("./workspaceTrustPrompt.js");
    let trustResult = await offerBridgeWorkspaceTrust({
      dir,
      isHomeDir: isHomeDirectorySession(),
      canPrompt: canPromptForWorkspaceTrust(),
      storageV5,
    });
    if (!trustResult.trusted) {
      console.error(trustResult.message);
      process.exit(1);
    }
    let { resetGrowthBook, initializeGrowthBook } =
      await import("../services/analytics/ATIS_REQUEST_HEADER.lazy.js");
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
    let { getChromeServerPolicyRefusal } = await import("../utils/claudeInChrome/serverPolicy.js");
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
  } = await import("../utils/auth.js");
  let { getBridgeAccessToken, getBridgeAccessTokenAsync, getBridgeBaseUrl } =
    await import("./bridgeConfig.js");
  let useAsyncAuth = isStorageV5Enabled() && credentials !== undefined;
  if (!(useAsyncAuth ? await getBridgeAccessTokenAsync(credentials) : getBridgeAccessToken())) {
    console.error(BRIDGE_LOGIN_ERROR);
    process.exit(1);
  }
  let { getGlobalConfig, saveGlobalConfig, getCurrentProjectConfig, saveCurrentProjectConfig } =
    await import("../utils/config.js");
  if (!getGlobalConfig().remoteDialogSeen) {
    let readline = await import("readline");
    let rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    let projectsHint = isBridgeProjectsHintEnabled()
      ? `Open the Code tab in the Claude mobile app, visit claude.ai/code in a browser,
or ask Claude to work in this folder from one of your projects on claude.ai.`
      : "Open the Code tab in the Claude mobile app, or visit claude.ai/code in a browser.";
    console.log(`
Take this session with you and pick up right where you left off on any device.
${projectsHint}

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
    let { readBridgePointerAcrossWorktrees, BRIDGE_POINTER_TTL_MS } = await import("./bridgePointer.js");
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
    if (pointer.ageMs > BRIDGE_POINTER_TTL_MS) boundedResumeIds.push(pointer.sessionId);
    pointerDir = pointerDir_2;
  }
  let baseUrl = getBridgeBaseUrl();
  if (baseUrl.startsWith("http://") && !baseUrl.includes("localhost") && !baseUrl.includes("127.0.0.1")) {
    console.error("Error: Remote Control base URL uses HTTP. Only HTTPS or localhost HTTP is allowed.");
    process.exit(1);
  }
  let sessionIngressUrl = baseUrl;
  let { snapshotGitEvidenceForBridge, findGitRoot, redactGitRemoteCredentials } =
    await import("../utils/git.js");
  let { hasWorktreeCreateHook } = await import("../utils/hooks/worktreeHooks.js");
  let isGitRepo = findGitRoot(dir) !== null;
  let worktreeAvailable = hasWorktreeCreateHook() || isGitRepo;
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
  let requestedEnvironmentId;
  let priorSessionId;
  let carriedSessionIds;
  let carriedSessionIdsAt;
  let freshProjectThreadIds;
  let freshParkedThreadIds = [];
  let parkedThreadIdsAt;
  let projectThreadSessionIdsPersistedAt;
  let pointerEnvironmentId;
  let resumeArchived = false;
  let unarchivedOk = false;
  let adoptedSessionId;
  let pointerWriterRunning = false;
  if (!resumeSessionId && createSessionInDir) {
    let {
      readBridgePointer,
      PERSISTED_SESSION_RESUME_WINDOW_MS,
      BRIDGE_POINTER_TTL_MS,
      isPersistedStampFresh,
      freshProjectThreadSessionIds,
      freshParkedProjectThreadSessionIds,
    } = await import("./bridgePointer.js");
    let bridgePointer = await readBridgePointer(
      dir,
      {
        projectThreadResume: isRcChildRestartResumeEnabled(),
      },
      storageV5,
    );
    if (bridgePointer) {
      let { isProcessRunning, isSameProcessAsync } =
        await import("../utils/captureProcessStartTimeAsync.lazy.js");
      if (
        bridgePointer.pid !== undefined &&
        bridgePointer.pid !== process.pid &&
        isProcessRunning(bridgePointer.pid) &&
        (await isSameProcessAsync(bridgePointer.pid, bridgePointer.procStart))
      ) {
        pointerWriterRunning = true;
        logForDebugging(
          `[bridge:init] Pointer writer pid ${bridgePointer.pid} still running; registering a fresh env and deferring pointer write`,
        );
      } else if (bridgePointer.source === "standalone") {
        requestedEnvironmentId = bridgePointer.environmentId;
        if (bridgePointer.ageMs <= BRIDGE_POINTER_TTL_MS) priorSessionId = bridgePointer.sessionId;
        if (
          bridgePointer.activeSessionIdsPersistedAt !== undefined &&
          isPersistedStampFresh(
            bridgePointer.activeSessionIdsPersistedAt,
            Date.now(),
            PERSISTED_SESSION_RESUME_WINDOW_MS,
          )
        ) {
          carriedSessionIds = bridgePointer.activeSessionIds;
          carriedSessionIdsAt = bridgePointer.activeSessionIdsPersistedAt;
        }
        if (isRcChildRestartResumeEnabled()) {
          freshProjectThreadIds = freshProjectThreadSessionIds(bridgePointer, Date.now());
          freshParkedThreadIds = freshParkedProjectThreadSessionIds(bridgePointer, Date.now());
          parkedThreadIdsAt = bridgePointer.parkedProjectThreadSessionIdsPersistedAt;
        }
        logForDebugging(
          `[bridge:init] Found prior environment ${requestedEnvironmentId} in pointer (ageMs=${bridgePointer.ageMs}); requesting reuse on registration`,
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
  let unattendedGrant = allowUnattendedToolCalls
    ? await (await import("../services/remoteTools/unattendedRunGrant.js")).writeUnattendedRunGrant()
    : undefined;
  if (allowUnattendedToolCalls && unattendedGrant === undefined) {
    console.error(
      "Error: --allow-unattended-tool-calls could not write to ~/.claude/state. Start it from your own terminal; a sandbox cannot write there.",
    );
    process.exit(1);
  }
  let toolHostStartup =
    effectiveSpawnMode === "single-session"
      ? undefined
      : import("../remote/tools/startForegroundToolHost.lazy.js")
          .then(({ startForegroundToolHost }) =>
            startForegroundToolHost({
              dir,
              credentials,
              hasAccessToken: () => Boolean(getBridgeAccessToken()),
              unattendedGrant: unattendedGrant?.token,
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
            unattendedGrant?.remove();
            if (allowUnattendedToolCalls)
              console.error(
                "Cloud sessions cannot use this folder: --allow-unattended-tool-calls could not start. Remote Control runs without it.",
              );
            return;
          });
  let { branch, gitRepoUrl, defaultBranch } = await snapshotGitEvidenceForBridge();
  let machineName = hostname();
  let { getOrCreateRemoteControlMachineId } = await import("../utils/config.js");
  let machineId = await getOrCreateRemoteControlMachineId(storageV5);
  let bridgeId = randomUUID();
  let { handleOAuth401Error, getClaudeAIOAuthTokenOriginAsync } = await import("../utils/auth.js");
  let { classifyFailedOAuthRefresh } = await import("./oauthRefreshFailure.js");
  let api = createBridgeApiClient({
    baseUrl,
    getAccessToken: getBridgeAccessToken,
    runnerVersion: {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.318",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-11-03T18:52:53Z",
      GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION,
    onDebug: logForDebugging,
    onAuth401: (accessToken) => handleOAuth401Error(accessToken, credentials, storageV5),
    getTrustedDeviceToken,
    untrustedDevice: {
      recover: async (deviceToken) => {
        let recoveredToken = await recoverFromUntrustedDevice(deviceToken, credentials);
        sayHeldAutomaticEnrollmentNoticeOnStderr();
        return recoveredToken;
      },
      hint: untrustedDeviceHint,
    },
    useCcrV2SessionCrud: isCcrV2SessionCrudEnabled,
  });
  let resumeEnvironmentId = requestedEnvironmentId;
  let conflictingPointer;
  if (resumeSessionId) {
    let {
      readBridgePointer,
      PERSISTED_SESSION_RESUME_WINDOW_MS,
      isPersistedStampFresh,
      freshProjectThreadSessionIds,
      freshParkedProjectThreadSessionIds,
    } = await import("./bridgePointer.js");
    let pointerDirForResume = pointerDir ?? dir;
    let bridgePointer = await readBridgePointer(
      pointerDirForResume,
      {
        noClear: true,
        projectThreadResume: isRcChildRestartResumeEnabled(),
      },
      storageV5,
    );
    if (bridgePointer?.pid !== undefined && bridgePointer.pid !== process.pid) {
      let { isProcessRunning, isSameProcessAsync } =
        await import("../utils/captureProcessStartTimeAsync.lazy.js");
      if (
        isProcessRunning(bridgePointer.pid) &&
        (await isSameProcessAsync(bridgePointer.pid, bridgePointer.procStart))
      ) {
        if (sameSessionId(bridgePointer.sessionId, resumeSessionId)) {
          console.error(
            `Error: Session ${resumeSessionId} is already being served by another \`claude remote-control\` instance (pid ${bridgePointer.pid}) in ${pointerDirForResume}. Use that terminal, or stop it first.`,
          );
          process.exit(1);
        }
        pointerWriterRunning = true;
        conflictingPointer = bridgePointer;
      }
    }
    if (
      !pointerWriterRunning &&
      bridgePointer?.source === "standalone" &&
      bridgePointer.activeSessionIds?.length &&
      bridgePointer.activeSessionIdsPersistedAt !== undefined &&
      isPersistedStampFresh(
        bridgePointer.activeSessionIdsPersistedAt,
        Date.now(),
        PERSISTED_SESSION_RESUME_WINDOW_MS,
      ) &&
      pointerDirForResume === dir
    ) {
      requestedEnvironmentId = bridgePointer.environmentId;
      carriedSessionIds = bridgePointer.activeSessionIds;
      carriedSessionIdsAt = bridgePointer.activeSessionIdsPersistedAt;
    }
    if (
      !pointerWriterRunning &&
      bridgePointer?.source === "standalone" &&
      pointerDirForResume === dir &&
      isRcChildRestartResumeEnabled()
    ) {
      freshProjectThreadIds = freshProjectThreadSessionIds(bridgePointer, Date.now());
      freshParkedThreadIds = freshParkedProjectThreadSessionIds(bridgePointer, Date.now());
      parkedThreadIdsAt = bridgePointer.parkedProjectThreadSessionIdsPersistedAt;
      projectThreadSessionIdsPersistedAt = bridgePointer.projectThreadSessionIdsPersistedAt;
      pointerEnvironmentId = bridgePointer.environmentId;
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
    let { getBridgeSessionOrStatus } = await import("./createSession.js");
    let presetAccessToken = useAsyncAuth ? await getBridgeAccessTokenAsync(credentials) : undefined;
    let { session, notFound } = await getBridgeSessionOrStatus(resumeSessionId, {
      baseUrl,
      getAccessToken: useAsyncAuth ? () => presetAccessToken : getBridgeAccessToken,
      credentials,
    });
    if (!session) {
      if (notFound && pointerDir) {
        let { clearBridgePointer } = await import("./bridgePointer.js");
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
        let { clearBridgePointer } = await import("./bridgePointer.js");
        await clearBridgePointer(pointerDir, storageV5);
      }
      console.error(
        `Error: Session ${resumeSessionId} has no environment_id. It may never have been attached to a bridge.`,
      );
      process.exit(1);
    }
    resumeEnvironmentId = session.environment_id;
    if (conflictingPointer && resumeEnvironmentId === conflictingPointer.environmentId) {
      console.error(
        `Error: Environment ${resumeEnvironmentId} is already being served by another \`claude remote-control\` instance (pid ${conflictingPointer.pid}) in ${pointerDir ?? dir}. Use that terminal, or stop it first.`,
      );
      process.exit(1);
    }
    resumeArchived = session.status === "archived";
    logForDebugging(
      `[bridge:init] Resuming session ${resumeSessionId} on environment ${resumeEnvironmentId}`,
    );
  }
  let toolHostSetup = await toolHostStartup;
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
    reuseEnvironmentId: resumeEnvironmentId,
    hostProfile: await hostProfileIfShared,
    apiBaseUrl: baseUrl,
    sessionIngressUrl,
    debugFile,
    livePreviewPorts: enableLivePreview ? new Set(previewPorts) : undefined,
    storageV5,
    getToolHostAdvert: toolHostSetup?.getToolHostAdvert,
  };
  logForDebugging(
    `[bridge:init] bridgeId=${bridgeId}${resumeEnvironmentId ? ` reuseEnvironmentId=${resumeEnvironmentId}` : ""} dir=${dir} branch=${branch} gitRepoUrl=${redactGitRemoteCredentials(gitRepoUrl)} machine=${machineName}`,
  );
  logForDebugging(`[bridge:init] apiBaseUrl=${baseUrl} sessionIngressUrl=${sessionIngressUrl}`);
  if (debugFile) logForDebugging(`[bridge:init] debugFile=${debugFile}`);
  let toolHostAdvert = bridgeConfig.getToolHostAdvert?.();
  let registration = await tryRegisterEnvironment({
    register: () =>
      api.registerBridgeEnvironment({
        ...bridgeConfig,
        ...(toolHostAdvert && {
          getToolHostAdvert: () => toolHostAdvert,
        }),
      }),
    interactive: process.stdin.isTTY === true,
    onFailure: async (error, exitDelayMs) => {
      logEvent("tengu_bridge_registration_failed", {
        status: error instanceof BridgeFatalError ? error.status : undefined,
      });
      await logFeatureBadAsync("remote_control_entry", "registration_failed");
      let failureText =
        error instanceof BridgeFatalError && error.status === 404
          ? "Remote Control environments are not available for your account."
          : error instanceof BridgeFatalError && error.status !== 401 && isExpiredErrorType(error.errorType)
            ? `Error: ${withReconnectHint(error.message)}`
            : `Error: ${errorMessage(error)}`;
      console.error(
        exitDelayMs > 0
          ? `${failureText}
Exiting in about ${Math.round(exitDelayMs / 1000)} seconds.`
          : failureText,
      );
      let { flushAnalyticsBeforeExit } = await import("../cli/exit.js");
      await flushAnalyticsBeforeExit();
    },
  });
  if (!registration) process.exit(1);
  let {
    environment_id: environmentId,
    environment_secret: environmentSecret,
    environment_secret_expires_in: environmentSecretExpiresIn,
  } = registration;
  classifyAdvertChange(bridgeConfig, toolHostAdvert, environmentId === resumeEnvironmentId);
  if (requestedEnvironmentId && !resumeSessionId)
    if (environmentId !== requestedEnvironmentId) {
      logForDebugging(
        `Bridge env reuse mismatch: requested ${requestedEnvironmentId}, backend returned ${environmentId}.`,
        {
          level: "warn",
        },
      );
      console.warn(
        "Warning: Could not reuse the previous environment. Existing claude.ai/code sessions from the previous run will not reconnect.",
      );
      let { clearBridgePointer } = await import("./bridgePointer.js");
      await clearBridgePointer(dir, storageV5);
    } else {
      let { writeBridgePointer, readBridgePointer } = await import("./bridgePointer.js");
      let { ownProcStartAsync } = await import("../utils/captureProcessStartTimeAsync.lazy.js");
      bridgeConfig.preserveOnShutdown = await writeBridgePointer(
        dir,
        {
          sessionId: priorSessionId ?? "",
          environmentId,
          source: "standalone",
          pid: process.pid,
          procStart: await ownProcStartAsync(),
          ...(carriedSessionIds?.length && {
            activeSessionIds: carriedSessionIds,
            activeSessionIdsPersistedAt: carriedSessionIdsAt,
          }),
          ...(freshParkedThreadIds.length > 0 && {
            parkedProjectThreadSessionIds: freshParkedThreadIds,
            parkedProjectThreadSessionIdsPersistedAt: parkedThreadIdsAt,
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
      adoptedSessionId = priorSessionId;
      if (adoptedSessionId) {
        let infraSessionId = toInfraSessionId(adoptedSessionId);
        let candidateIds =
          infraSessionId === adoptedSessionId ? [adoptedSessionId] : [adoptedSessionId, infraSessionId];
        let reconnected = false;
        let reconnectErrors = [];
        for (let candidateId of candidateIds)
          try {
            await api.reconnectSession(environmentId, candidateId);
            logForDebugging(`[bridge:init] Adopted session ${candidateId} re-queued via bridge/reconnect`);
            reconnected = true;
            break;
          } catch (err) {
            reconnectErrors.push(err);
            logForDebugging(`[bridge:init] reconnectSession(${candidateId}) failed: ${errorMessage(err)}`);
          }
        if (!reconnected)
          if (
            reconnectErrors.length > 0 &&
            reconnectErrors.every((error) => error instanceof BridgeFatalError)
          )
            adoptedSessionId = undefined;
          else
            logForDebugging(
              "[bridge:init] reconnectSession transient failure; session will be picked up passively once its lease expires",
              {
                level: "warn",
              },
            );
      }
      if (freshProjectThreadIds?.length) {
        boundedResumeIds.push(...freshProjectThreadIds);
        let requeueResult = await requeueProjectThreadSessions(api, environmentId, freshProjectThreadIds);
        logForDebugging(
          `[bridge:init] project thread sessions: ${requeueResult.requeued} re-queued, ${requeueResult.dropped} ended, ${requeueResult.deferred} left to the next message`,
        );
      }
    }
  bridgeConfig.boundedResumeSessionIds = boundedResumeIds;
  let resumedSessionId;
  if (resumeSessionId)
    if (resumeEnvironmentId && environmentId !== resumeEnvironmentId) {
      logForDebugging(
        `Bridge resume env mismatch: requested ${resumeEnvironmentId}, backend returned ${environmentId}. Falling back to fresh session.`,
        {
          level: "error",
        },
      );
      console.warn(
        `Warning: Could not resume session ${resumeSessionId} \u2014 its environment has expired. Creating a fresh session instead.`,
      );
    } else {
      if (resumeArchived)
        unarchivedOk = await unarchiveBridgeSessionIfNeeded(resumeSessionId, baseUrl, credentials);
      let infraResumeId = toInfraSessionId(resumeSessionId);
      let candidates =
        infraResumeId === resumeSessionId ? [resumeSessionId] : [resumeSessionId, infraResumeId];
      let reconnected = false;
      let lastReconnectErr;
      for (let candidateId of candidates)
        try {
          await api.reconnectSession(environmentId, candidateId);
          logForDebugging(`[bridge:init] Session ${candidateId} re-queued via bridge/reconnect`);
          resumedSessionId = resumeSessionId;
          reconnected = true;
          bridgeConfig.preserveOnShutdown = true;
          bridgeConfig.ownsPointer = false;
          break;
        } catch (err) {
          lastReconnectErr = err;
          logForDebugging(`[bridge:init] reconnectSession(${candidateId}) failed: ${errorMessage(err)}`);
        }
      if (!reconnected) {
        let reconnectError = lastReconnectErr;
        let isFatal = reconnectError instanceof BridgeFatalError;
        if (unarchivedOk && isFatal)
          await logFeatureBadAsync("bridge_session_unarchive", "abandoned_after_fatal_reconnect");
        if (pointerDir && isFatal) {
          let { clearBridgePointer } = await import("./bridgePointer.js");
          await clearBridgePointer(pointerDir, storageV5);
        }
        console.error(
          isFatal
            ? reconnectError instanceof BridgeFatalError &&
              reconnectError.status !== 401 &&
              isExpiredErrorType(reconnectError.errorType)
              ? `Error: ${withReconnectHint(reconnectError.message)}`
              : `Error: ${errorMessage(reconnectError)}`
            : `Error: Failed to reconnect session ${resumeSessionId}: ${errorMessage(reconnectError)}
The session may still be resumable \u2014 try running the same command again.`,
        );
        let { exitAfterAnalyticsFlush } = await import("../cli/exit.js");
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
    let startupNotice = await toolHostSetup.startupNotice();
    if (startupNotice !== undefined) {
      let noticeText = wrapAnsi(
        startupNotice.unattended ? `${WARNING_GLYPH}  ${startupNotice.text}` : startupNotice.text,
        process.stdout.columns || 80,
      );
      console.log(`${startupNotice.unattended ? sequential.yellow(noticeText) : noticeText}
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
    chooseStandIn: createRestartSpawner(spawner),
    env: process.env,
    verbose,
    debugFile,
    permissionMode,
    chrome,
    onDebug: logForDebugging,
    onActivity: (sessionId, activity) => {
      logForDebugging(`[bridge:activity] sessionId=${sessionId} ${activity.type} ${activity.summary}`);
    },
    onChildWarning: (childName, warning) => spawner.logWarning(`${warning} (${childName})`),
    ownerIdentity,
  });
  let { parseGitHubRepository } = await import("../utils/detectRepository.js");
  let ownerRepo = gitRepoUrl ? parseGitHubRepository(gitRepoUrl) : null;
  let repoName = ownerRepo ? ownerRepo.split("/").pop() : basename(dir);
  spawner.setRepoInfo(repoName, isGitRepo ? branch : "");
  let toggleAvailable = effectiveSpawnMode !== "single-session" && worktreeAvailable;
  if (toggleAvailable) spawner.setSpawnModeDisplay(effectiveSpawnMode);
  let onStdinData = (data) => {
    let keyCode = firstByte(data);
    if (keyCode === 3 || keyCode === 4) {
      process.emit("SIGINT");
      return;
    }
    if (keyCode === 120) {
      toolHostSetup?.disconnectKey();
      return;
    }
    toolHostSetup?.cancelDisconnect();
    if (keyCode === 32) {
      spawner.toggleQr();
      return;
    }
    if (keyCode === 119) {
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
  let { markPrintModeSignalHandlersRegistered } = await import("../utils/gracefulShutdown.js");
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
  let onSighup = () => {
    logForDebugging("[bridge:shutdown] SIGHUP received, shutting down");
    spawner.detachTerminal();
    process.stdin.off("data", onStdinData);
    process.stdin.pause();
    controller.abort();
  };
  markPrintModeSignalHandlersRegistered();
  process.on("SIGINT", onSigint);
  process.on("SIGTERM", onSigterm);
  process.on("SIGHUP", onSighup);
  let initialSessionId = resumedSessionId ?? adoptedSessionId ?? null;
  let initialSessionTitle;
  if (createSessionInDir && !resumedSessionId && !adoptedSessionId) {
    let title = name ?? `${getBridgeSessionNamePrefix()}-${randomWordSlug()}`;
    let { createBridgeSession } = await import("./createSession.js");
    try {
      let presetToken = useAsyncAuth ? await getBridgeAccessTokenAsync(credentials) : undefined;
      initialSessionId = await createBridgeSession({
        environmentId,
        title,
        gitRepoUrl,
        branch,
        defaultBranch,
        signal: controller.signal,
        baseUrl,
        getAccessToken: useAsyncAuth ? () => presetToken : getBridgeAccessToken,
        credentials,
        permissionMode,
        tags: [REMOTE_CONTROL_CLI],
      });
      if (initialSessionId) {
        if (!name) initialSessionTitle = title;
        logForDebugging(`[bridge:init] Created initial session ${initialSessionId}`);
      }
    } catch (err) {
      logForDebugging(`[bridge:init] Session creation failed (non-fatal): ${errorMessage(err)}`);
    }
  }
  let pointerRefreshTimer = null;
  let pointerSessionId =
    initialSessionId ??
    (bridgeConfig.preserveOnShutdown ? (priorSessionId ?? "") : createSessionInDir ? "" : null);
  if (
    freshParkedThreadIds.length > 0 &&
    environmentId === (resumeSessionId ? pointerEnvironmentId : requestedEnvironmentId)
  ) {
    bridgeConfig.parkedProjectThreadSessionIds = freshParkedThreadIds;
    bridgeConfig.parkedProjectThreadSessionIdsPersistedAt = parkedThreadIdsAt;
  }
  let pointerRecord = null;
  if (pointerSessionId !== null && !pointerWriterRunning) {
    let {
      writeBridgePointer,
      createBridgePointerWriteQueue,
      PERSISTED_SESSION_RESUME_WINDOW_MS,
      isPersistedStampFresh,
    } = await import("./bridgePointer.js");
    let { ownProcStartAsync } = await import("../utils/captureProcessStartTimeAsync.lazy.js");
    let queue = createBridgePointerWriteQueue();
    bridgeConfig.enqueuePointerWrite = queue;
    pointerRecord = {
      sessionId: pointerSessionId,
      environmentId,
      source: "standalone",
      pid: process.pid,
      procStart: await ownProcStartAsync(),
      ...(environmentId === requestedEnvironmentId &&
        carriedSessionIds?.length && {
          activeSessionIds: carriedSessionIds,
          activeSessionIdsPersistedAt: carriedSessionIdsAt,
        }),
      ...(resumeSessionId &&
        environmentId === pointerEnvironmentId &&
        freshProjectThreadIds?.length && {
          projectThreadSessionIds: freshProjectThreadIds,
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
        queue,
        PERSISTED_SESSION_RESUME_WINDOW_MS,
        isPersistedStampFresh,
        () => bridgeConfig.pointerCleared === true,
      );
    }
  }
  let enqueueWrite = bridgeConfig.enqueuePointerWrite ?? ((task) => task());
  if (
    bridgeConfig.ownsPointer &&
    pointerRecord !== null &&
    environmentId === requestedEnvironmentId &&
    carriedSessionIds?.length
  ) {
    let record = pointerRecord;
    let carriedIds = carriedSessionIds;
    let { writeBridgePointer } = await import("./bridgePointer.js");
    bridgeConfig.onSessionServiced = (sessionId) => {
      if (record.activeSessionIds === undefined) {
        carriedIds = [];
        return;
      }
      let body = sessionIdBody(sessionId);
      let filtered = carriedIds.filter((id) => sessionIdBody(id) !== body);
      if (filtered.length === carriedIds.length) return;
      carriedIds = filtered;
      if (filtered.length > 0) record.activeSessionIds = filtered;
      else {
        delete record.activeSessionIds;
        delete record.activeSessionIdsPersistedAt;
      }
      let nextRecord = {
        ...record,
      };
      enqueueWrite(() => writeBridgePointer(bridgeConfig.dir, nextRecord, storageV5));
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
            printBanner: (config, environmentId) => {
              spawner.printBanner(config, environmentId);
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
    await unattendedGrant?.remove();
    if (pointerRefreshTimer !== null) clearInterval(pointerRefreshTimer);
    process.off("SIGINT", onSigint);
    process.off("SIGTERM", onSigterm);
    process.off("SIGHUP", onSighup);
    process.stdin.off("data", onStdinData);
    if (process.stdin.isTTY) setRawModeSafe(process.stdin, false);
    process.stdin.pause();
  }
  await waitForInFlightOAuthRefresh(OAUTH_REFRESH_EXIT_WAIT_CAP_MS);
  await drainRegisteredWriteQueues();
  let { flushAnalyticsBeforeExit } = await import("../cli/exit.js");
  await flushAnalyticsBeforeExit({
    waitForOAuthRefresh: false,
  });
  try {
    process.exit(0);
  } catch (error) {
    process.kill(process.pid, "SIGKILL");
  }
}
//@ chunk-18851qev.js:102611-102700 fingerprint (2.1.88 match: BridgeHeadlessPermanentError, 1)
class BridgeHeadlessPermanentError extends Error {
  constructor(message) {
    super(message);
    this.name = "BridgeHeadlessPermanentError";
  }
}
//@ chunk-18851qev.js:102700-103142 layout
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
//@ chunk-18851qev.js:103142-111136 fingerprint (2.1.88 match: runBridgeHeadless, 0.403)
/**
 * 宿主（桌面/守护进程）托管的无头 Remote Control：与 bridgeMain 相同的检查与注册流程，但不交互、用回调日志，失败抛 BridgeHeadlessPermanentError 或可重试错误，最后调用 runBridgeLoop。
 */
async function runBridgeHeadless(opts, signal) {
  let { dir, log } = opts;
  let launcherError = processWrapperError();
  if (launcherError)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${launcherError} \u2014 Remote Control sessions are not started unwrapped; the worker retries once the launcher is fixed`,
      "Remote Control worker refused: corporate launcher unresolvable (transient)",
    );
  processChdir(dir);
  let { setOriginalCwd, setCwdState, isHomeDirectorySession } = await import("../bootstrap/state.js");
  setOriginalCwd(dir);
  setCwdState(dir);
  let { enableConfigs, checkHasTrustDialogAccepted } = await import("../utils/config.js");
  await enableConfigs();
  let { initSinks } = await import("../utils/sinks.js");
  initSinks();
  let { getSettingsWithErrors } = await import("../utils/settings/settings.js");
  if (getSettingsWithErrors().settings.disableRemoteControl === true)
    throw new BridgeHeadlessPermanentError(REMOTE_CONTROL_DISABLED_BY_POLICY_MESSAGE);
  let { composePolicyLimitsClient, primePolicyLimitsCache } =
    await import("../services/policyLimits/DefaultPolicyLimitsClientSlot.lazy.js");
  composePolicyLimitsClient({
    storageV5: opts.storageV5,
    credentials: opts.credentials,
  });
  await primePolicyLimitsCache(opts.storageV5);
  let { loadPolicyLimits } = await import("../services/policyLimits/DefaultPolicyLimitsClientSlot.lazy.js");
  let { policyDeniedReason, policyDenyKind } =
    await import("../services/policyLimits/CLIENT_POLICY_KEYS.lazy.js");
  await loadPolicyLimits();
  let policyError = policyDenialError(
    policyDenyKind("allow_remote_control"),
    policyDeniedReason("allow_remote_control", "Remote Control", "is"),
  );
  if (policyError) throw policyError;
  if (!checkHasTrustDialogAccepted()) {
    let dirLabel = stripInvisibleChars(dir);
    throw new BridgeHeadlessPermanentError(
      isHomeDirectorySession()
        ? `Workspace not trusted: ${dirLabel} is the home directory, whose trust is never saved \u2014 running \`claude\` there first won't help. Run Remote Control from a project directory instead.`
        : `Workspace not trusted: ${dirLabel}. Run \`claude\` in that directory first to accept the trust dialog.`,
    );
  }
  if (!opts.getAccessToken()) throw Error(BRIDGE_LOGIN_ERROR);
  let { getBridgeBaseUrl } = await import("./bridgeConfig.js");
  let baseUrl = getBridgeBaseUrl();
  if (baseUrl.startsWith("http://") && !baseUrl.includes("localhost") && !baseUrl.includes("127.0.0.1"))
    throw new BridgeHeadlessPermanentError(
      "Remote Control base URL uses HTTP. Only HTTPS or localhost HTTP is allowed.",
    );
  let sessionIngressUrl = baseUrl;
  let { snapshotGitEvidenceForBridge, findGitRoot } = await import("../utils/git.js");
  let { hasWorktreeCreateHook } = await import("../utils/hooks/worktreeHooks.js");
  if (opts.spawnMode === "worktree") {
    if (!(hasWorktreeCreateHook() || findGitRoot(dir) !== null))
      throw new BridgeHeadlessPermanentError(
        `Worktree mode requires a git repository or WorktreeCreate hooks. Directory ${dir} has neither.`,
      );
  }
  let hostProfileIfShared = collectHostProfileIfShared(signal);
  let { branch, gitRepoUrl, defaultBranch } = await snapshotGitEvidenceForBridge();
  let machineName = hostname();
  let { getOrCreateRemoteControlMachineId } = await import("../utils/config.js");
  let machineId = await getOrCreateRemoteControlMachineId(opts.storageV5);
  let bridgeId = randomUUID();
  let requestedEnvironmentId;
  let pointerWriterRunning = false;
  let carriedSessionIds = [];
  let carriedSessionIdsAt;
  let freshProjectThreadIds;
  let projectThreadSessionIdsPersistedAt;
  let freshParkedThreadIds = [];
  let parkedProjectThreadSessionIdsPersistedAt;
  let carriedThreadIds = [];
  {
    let {
      readBridgePointer,
      PERSISTED_SESSION_RESUME_WINDOW_MS,
      isPersistedStampFresh,
      freshProjectThreadSessionIds,
      freshParkedProjectThreadSessionIds,
    } = await import("./bridgePointer.js");
    let pointer = await readBridgePointer(
      dir,
      {
        projectThreadResume: isRcChildRestartResumeEnabled(),
      },
      opts.storageV5,
    );
    if (pointer) {
      let { isProcessRunning, isSameProcessAsync } =
        await import("../utils/captureProcessStartTimeAsync.lazy.js");
      if (
        pointer.pid !== undefined &&
        pointer.pid !== process.pid &&
        isProcessRunning(pointer.pid) &&
        (await isSameProcessAsync(pointer.pid, pointer.procStart))
      ) {
        pointerWriterRunning = true;
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
          carriedSessionIds = pointer.activeSessionIds ?? [];
          carriedSessionIdsAt = pointer.activeSessionIdsPersistedAt;
        }
        if (isRcChildRestartResumeEnabled()) {
          freshProjectThreadIds = freshProjectThreadSessionIds(pointer, Date.now());
          freshParkedThreadIds = freshParkedProjectThreadSessionIds(pointer, Date.now());
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
      VERSION: "2.1.318",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-11-03T18:52:53Z",
      GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
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
  let unreachedCarriedIds = [];
  let retryCarriedIds = [];
  if (environmentId === requestedEnvironmentId && freshProjectThreadIds?.length) {
    let carriedBodies = new Set(carriedSessionIds.map(sessionIdBody));
    let sessionIds = freshProjectThreadIds.filter(
      (sessionId) => !carriedBodies.has(sessionIdBody(sessionId)),
    );
    bridgeConfig.boundedResumeSessionIds = sessionIds;
    let requeueResult = await requeueProjectThreadSessions(api, environmentId, sessionIds, signal);
    carriedThreadIds = requeueResult.unattempted;
    log(
      `project thread sessions: ${requeueResult.requeued} re-queued, ${requeueResult.dropped} ended, ${requeueResult.deferred} left to the next message, ${requeueResult.unattempted.length} carried`,
    );
    logEvent("tengu_bridge_project_thread_requeue", {
      requested: sessionIds.length,
      requeued: requeueResult.requeued,
      dropped: requeueResult.dropped,
      deferred: requeueResult.deferred,
      unattempted: requeueResult.unattempted.length,
    });
  }
  if (environmentId === requestedEnvironmentId && freshParkedThreadIds.length > 0) {
    bridgeConfig.parkedProjectThreadSessionIds = freshParkedThreadIds;
    bridgeConfig.parkedProjectThreadSessionIdsPersistedAt = parkedProjectThreadSessionIdsPersistedAt;
  }
  if (environmentId === requestedEnvironmentId && carriedSessionIds.length > 0) {
    bridgeConfig.carriedSessionIds = carriedSessionIds;
    log(`re-queuing ${carriedSessionIds.length} session(s) interrupted by the previous shutdown`);
    let aborted = false;
    for (let [index, sessionId] of carriedSessionIds.entries()) {
      if (signal.aborted) {
        aborted = true;
        unreachedCarriedIds = carriedSessionIds.slice(index);
        break;
      }
      let outcome = await describeReregisterOutcome(api, environmentId, sessionId, signal);
      log(`re-queue ${sessionId}: ${outcome}`);
      if (outcome === "aborted") {
        aborted = true;
        unreachedCarriedIds = carriedSessionIds.slice(index);
        break;
      }
      if (outcome === "retry") retryCarriedIds.push(sessionId);
    }
    if (!aborted && retryCarriedIds.length === 0) logFeatureOk("bridge_shutdown_requeue");
  } else if (carriedSessionIds.length > 0) logFeatureBad("bridge_shutdown_requeue", "env_reuse_declined");
  if (retryCarriedIds.length > 0 || unreachedCarriedIds.length > 0) {
    bridgeConfig.initialSessionRequeues = [...unreachedCarriedIds, ...retryCarriedIds];
    bridgeConfig.initialSessionRequeuesPersistedAt = carriedSessionIdsAt;
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
    chooseStandIn: createRestartSpawner(spawner),
    env: process.env,
    verbose: false,
    permissionMode: opts.permissionMode,
    onDebug: log,
    onChildWarning: (childName, warning) => spawner.logWarning(`${warning} (${childName})`),
    ownerIdentity,
  });
  spawner.printBanner(bridgeConfig, environmentId);
  let initialSessionId;
  if (opts.createSessionOnStart) {
    let { createBridgeSession } = await import("./createSession.js");
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
  let pointerTimer = null;
  if (!pointerWriterRunning) {
    if (requestedEnvironmentId && environmentId !== requestedEnvironmentId)
      log(
        `env reuse mismatch: requested ${requestedEnvironmentId}, backend returned ${environmentId}; existing sessions will not reconnect`,
      );
    let {
      writeBridgePointer,
      createBridgePointerWriteQueue,
      PERSISTED_SESSION_RESUME_WINDOW_MS,
      isPersistedStampFresh,
    } = await import("./bridgePointer.js");
    let { ownProcStartAsync } = await import("../utils/captureProcessStartTimeAsync.lazy.js");
    let pointerRecord = {
      sessionId: initialSessionId ?? "",
      environmentId,
      source: "standalone",
      pid: process.pid,
      procStart: await ownProcStartAsync(),
      ...(unreachedCarriedIds.length > 0 && {
        activeSessionIds: unreachedCarriedIds,
        activeSessionIdsPersistedAt: carriedSessionIdsAt,
      }),
      ...(carriedThreadIds.length > 0 && {
        projectThreadSessionIds: carriedThreadIds,
        projectThreadSessionIdsPersistedAt,
      }),
      ...(bridgeConfig.parkedProjectThreadSessionIds && {
        parkedProjectThreadSessionIds: bridgeConfig.parkedProjectThreadSessionIds,
        parkedProjectThreadSessionIdsPersistedAt: bridgeConfig.parkedProjectThreadSessionIdsPersistedAt,
      }),
    };
    bridgeConfig.preserveOnShutdown = await writeBridgePointer(dir, pointerRecord, opts.storageV5);
    bridgeConfig.ownsPointer = bridgeConfig.preserveOnShutdown;
    if (bridgeConfig.preserveOnShutdown) {
      bridgeConfig.enqueuePointerWrite = createBridgePointerWriteQueue();
      pointerTimer = startPointerRefreshTimer(
        writeBridgePointer,
        ownProcStartAsync,
        dir,
        pointerRecord,
        opts.storageV5,
        signal,
        bridgeConfig.enqueuePointerWrite,
        PERSISTED_SESSION_RESUME_WINDOW_MS,
        isPersistedStampFresh,
        () => bridgeConfig.pointerCleared === true,
      );
    }
  }
  let loopResult;
  try {
    loopResult = await runBridgeLoop(
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
    if (pointerTimer) clearInterval(pointerTimer);
  }
  let headlessPolicyError = loopResult && policyDenialError(loopResult.kind, loopResult.detail);
  if (headlessPolicyError) throw headlessPolicyError;
}
//@ chunk-18851qev.js:111136-111969 fingerprint (2.1.88 match: createHeadlessBridgeLogger, 0.953)
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
    logError: (message) => log(`error: ${message}`),
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
export {
  retryAfterMsOf,
  hasFatalClientStatus,
  formatDelay,
  classifyApiError,
  extractErrorTypeFromData,
  BridgeHeadlessPermanentError,
  bridgeMain,
  runBridgeHeadless,
};
