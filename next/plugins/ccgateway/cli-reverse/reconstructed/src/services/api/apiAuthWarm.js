/**
 * services/api/apiAuthWarm.ts
 *
 * 2.1.316 新增：回合开始前预热 API 认证。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-pwdsqzsj.js (6)
 * attribution: placement 6
 */
import { identity } from "../../utils/identity.js";
import { createSignal } from "../../utils/signal.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import {
  getTenantLifetimeMs,
  msSinceLastFullCheck,
  getElapsedSinceFullCheck,
  noteFullCheckAt,
  advanceFullCheckMark,
  clearFullCheckMarkIf,
} from "./clientHelpers.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { getForcedLoginMethod, adminPolicyUnreadable, isClaudeAISubscriber } from "../../utils/auth.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { isPolicyAllowed } from "../policyLimits/policyEvidence.js";
import { withTimeout } from "../../utils/sleep.js";
import { getAnthropicClient } from "./client.js";
import { mainAgentContext } from "../../utils/agentContext.js";
import { OAUTH_BETA_HEADER } from "../../constants/oauth.js";
import {
  APIConnectionTimeoutError,
  APIUserAbortError,
  APIError,
  APIConnectionError,
} from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { OAuthRefreshDeadError } from "../oauth/errors.js";
import { OAuthAccountOnHoldError } from "../oauth/oauthErrors.js";
import { StoredLoginHeldBackError } from "../oauth/storedLoginRefusal.js";
import { logError } from "../../utils/log.js";
import { getLastLiveMainThreadRequestAt } from "../../bootstrap/state.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-pwdsqzsj.js:32999-33206 placement
/**
 * 回合前预热 API 认证的常量与共享状态：3 s 超时、60 s 退避、2 s 宽限，以及在途去重与事件信号。
 */
var API_AUTH_WARM_TIMEOUT_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var AUTH_WARM_TIMEOUT_TEXT;
var AUTH_WARM_BACKOFF_MS;
var AUTH_WARM_OWNER_GRACE_MS;
var AUTH_WARM_LAPSE_DELAY_MS;
var authWarmState;
var authWarmEvents;
deferInit("chunk-pwdsqzsj.js:32999", () => {
  API_AUTH_WARM_TIMEOUT_MS = 3000;
  AUTH_WARM_TIMEOUT_TEXT = "auth warm timed out";
  AUTH_WARM_BACKOFF_MS = 60000;
  AUTH_WARM_OWNER_GRACE_MS = 60000;
  AUTH_WARM_LAPSE_DELAY_MS = 2000;
  authWarmState = identity(
    {
      inFlight: false,
      backOffUntil: 0,
      scheduled: undefined,
    },
    (state) => {
      state.inFlight = false;
      state.backOffUntil = 0;
      clearTimeout(state.scheduled);
      state.scheduled = undefined;
    },
  );
  authWarmEvents = createSignal();
});
//@ chunk-pwdsqzsj.js:33206-33340 placement
function emitAuthWarmReported(report) {
  try {
    authWarmEvents.emit(report);
  } catch (error) {
    logForDebugging(
      `[apiAuthWarm] a subscriber to authWarmReported threw; the request is unaffected: ${errorMessage(error)}`,
    );
  }
}
//@ chunk-pwdsqzsj.js:33340-33399 placement
function runScheduledWarm(credentials, storageV5) {
  authWarmState.scheduled = undefined;
  maybeWarmApiAuth(credentials, storageV5, "lapse_timer");
}
//@ chunk-pwdsqzsj.js:33399-34109 placement
/**
 * 回合开始前按需预热 API 认证（/v1/me）：第一方/网关、退避与在途去重，结果供后续请求使用。
 */
function maybeWarmApiAuth(credentials, storageV5, trigger = "turn_start") {
  try {
    let now = Date.now();
    let reportVerdict = (verdict, lastFullCheckAt) =>
      emitAuthWarmReported({
        kind: "decided",
        trigger,
        verdict,
        at: now,
        lastFullCheckAt,
      });
    let tenantLifetimeMs = getTenantLifetimeMs();
    if (
      tenantLifetimeMs === undefined ||
      getAPIProvider() !== "firstParty" ||
      getForcedLoginMethod() === "gateway" ||
      adminPolicyUnreadable() ||
      isEssentialTrafficOnly() ||
      !isPolicyAllowed("allow_api_auth_warm") ||
      !isClaudeAISubscriber()
    ) {
      reportVerdict("off");
      return;
    }
    let msSinceFullCheck = msSinceLastFullCheck(now);
    if (authWarmState.inFlight) {
      reportVerdict("in_flight", msSinceFullCheck);
      return;
    }
    if (now < authWarmState.backOffUntil) {
      reportVerdict("paused", msSinceFullCheck);
      return;
    }
    let elapsedSinceFullCheck = getElapsedSinceFullCheck(now);
    if (elapsedSinceFullCheck !== undefined && elapsedSinceFullCheck < tenantLifetimeMs) {
      let msUntilLapse = tenantLifetimeMs - elapsedSinceFullCheck;
      if (trigger !== "owner_present" || msUntilLapse > AUTH_WARM_OWNER_GRACE_MS) {
        reportVerdict("fresh", msSinceFullCheck);
        return;
      }
      if (authWarmState.scheduled === undefined) {
        authWarmState.scheduled = setTimeout(
          runScheduledWarm,
          msUntilLapse + AUTH_WARM_LAPSE_DELAY_MS,
          credentials,
          storageV5,
        );
        authWarmState.scheduled.unref?.();
      }
      reportVerdict("scheduled", msSinceFullCheck);
      return;
    }
    noteFullCheckAt(now, tenantLifetimeMs);
    authWarmState.inFlight = true;
    reportVerdict("fired", msSinceFullCheck);
    warmApiAuth(now, elapsedSinceFullCheck, trigger, credentials, storageV5)
      .finally(() => {
        authWarmState.inFlight = false;
      })
      .catch(() => {});
  } catch (error) {
    logForDebugging(`[apiAuthWarm] gate check threw, no warm: ${errorMessage(error)}`);
  }
}
//@ chunk-pwdsqzsj.js:34109-35235 placement
async function warmApiAuth(sentAt, elapsedSinceFullCheck, trigger, credentials, storageV5) {
  let startTime = performance.now();
  let abortSignal = AbortSignal.timeout(API_AUTH_WARM_TIMEOUT_MS);
  let clientBuildMs;
  let failureKind;
  try {
    await withTimeout(
      getAnthropicClient({
        maxRetries: 0,
        agentContext: mainAgentContext(),
        credentials,
        storageV5,
      }).then((anthropicClient) => {
        clientBuildMs = Math.round(performance.now() - startTime);
        abortSignal.throwIfAborted();
        return anthropicClient.get("/v1/me", {
          signal: abortSignal,
          headers: {
            "anthropic-beta": OAUTH_BETA_HEADER,
          },
        });
      }),
      API_AUTH_WARM_TIMEOUT_MS,
      AUTH_WARM_TIMEOUT_TEXT,
    );
  } catch (error) {
    if (
      abortSignal.aborted ||
      error instanceof APIConnectionTimeoutError ||
      error instanceof APIUserAbortError ||
      (error instanceof Error && error.message === AUTH_WARM_TIMEOUT_TEXT)
    )
      failureKind = "timeout";
    else if (error instanceof APIError && error.status !== undefined) failureKind = `http_${error.status}`;
    else if (error instanceof APIConnectionError || error instanceof TypeError) failureKind = "connection";
    else if (
      error instanceof OAuthRefreshDeadError ||
      error instanceof OAuthAccountOnHoldError ||
      error instanceof StoredLoginHeldBackError
    )
      failureKind = "auth";
    else {
      failureKind = "other";
      logError(error);
    }
  }
  let rounded = Math.round(performance.now() - startTime);
  let modelCallDuringWarm = (getLastLiveMainThreadRequestAt() ?? 0) > sentAt;
  let featureProps = {
    total_ms: rounded,
    ...(clientBuildMs !== undefined && {
      client_build_ms: clientBuildMs,
    }),
    ...(elapsedSinceFullCheck !== undefined && {
      since_full_auth_check_s: Math.round(elapsedSinceFullCheck / 1000),
    }),
    model_call_during_warm: modelCallDuringWarm,
    trigger: fromEnum(trigger),
  };
  let checked = failureKind === undefined || failureKind === "http_404";
  let now = Date.now();
  if (checked) advanceFullCheckMark(sentAt, now);
  else if (trigger !== "turn_start" && !modelCallDuringWarm) clearFullCheckMarkIf(sentAt);
  emitAuthWarmReported({
    kind: "settled",
    sentAt,
    answeredAt: now,
    totalMs: rounded,
    checked,
    modelCallDuringWarm,
  });
  if (failureKind === undefined) logFeatureOk("api_auth_warm", featureProps);
  else if (failureKind === "http_404") logFeatureSad("api_auth_warm", failureKind, featureProps);
  else {
    authWarmState.backOffUntil = Date.now() + AUTH_WARM_BACKOFF_MS;
    logFeatureBad("api_auth_warm", failureKind, featureProps);
  }
}
//@ chunk-pwdsqzsj.js:35235-35335 placement
var authWarmNoticeStateSlot; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-pwdsqzsj.js:35235", () => {
  authWarmNoticeStateSlot = new SessionRootSlot(() => ({
    noticed: false,
    countedClear: false,
    countedStop: false,
    countedNotice: false,
    countedHostOff: false,
  }));
});
export { authWarmNoticeStateSlot, maybeWarmApiAuth };
