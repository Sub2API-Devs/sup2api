/**
 * services/api/apiAuthWarm.ts
 *
 * 2.1.316 新增：回合开始前预热 API 认证。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-xx1vmpsq.js (6)
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

//@ chunk-xx1vmpsq.js:32409-32616 placement
/**
 * 回合前预热 API 认证的常量与共享状态：3 s 超时、60 s 退避、2 s 宽限，以及在途去重与事件信号。
 */
var API_AUTH_WARM_TIMEOUT_MS = 3000;
var AUTH_WARM_TIMEOUT_TEXT = "auth warm timed out";
var AUTH_WARM_BACKOFF_MS = 60000;
var AUTH_WARM_OWNER_GRACE_MS = 60000;
var AUTH_WARM_LAPSE_DELAY_MS = 2000;
var authWarmState = identity(
  {
    inFlight: false,
    backOffUntil: 0,
    scheduled: undefined,
  },
  (e) => {
    e.inFlight = false;
    e.backOffUntil = 0;
    clearTimeout(e.scheduled);
    e.scheduled = undefined;
  },
);
var authWarmEvents = createSignal();
//@ chunk-xx1vmpsq.js:32616-32750 placement
function emitAuthWarmReported(e) {
  try {
    authWarmEvents.emit(e);
  } catch (error) {
    logForDebugging(
      `[apiAuthWarm] a subscriber to authWarmReported threw; the request is unaffected: ${errorMessage(error)}`,
    );
  }
}
//@ chunk-xx1vmpsq.js:32750-32809 placement
function runScheduledWarm(e, s) {
  authWarmState.scheduled = undefined;
  maybeWarmApiAuth(e, s, "lapse_timer");
}
//@ chunk-xx1vmpsq.js:32809-33519 placement
/**
 * 回合开始前按需预热 API 认证（/v1/me）：第一方/网关、退避与在途去重，结果供后续请求使用。
 */
function maybeWarmApiAuth(credentials, storageV5, n = "turn_start") {
  try {
    let now = Date.now();
    let r = (verdict, lastFullCheckAt) =>
      emitAuthWarmReported({
        kind: "decided",
        trigger: n,
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
      r("off");
      return;
    }
    let T = msSinceLastFullCheck(now);
    if (authWarmState.inFlight) {
      r("in_flight", T);
      return;
    }
    if (now < authWarmState.backOffUntil) {
      r("paused", T);
      return;
    }
    let elapsedSinceFullCheck = getElapsedSinceFullCheck(now);
    if (elapsedSinceFullCheck !== undefined && elapsedSinceFullCheck < tenantLifetimeMs) {
      let I = tenantLifetimeMs - elapsedSinceFullCheck;
      if (n !== "owner_present" || I > AUTH_WARM_OWNER_GRACE_MS) {
        r("fresh", T);
        return;
      }
      if (authWarmState.scheduled === undefined) {
        authWarmState.scheduled = setTimeout(
          runScheduledWarm,
          I + AUTH_WARM_LAPSE_DELAY_MS,
          credentials,
          storageV5,
        );
        authWarmState.scheduled.unref?.();
      }
      r("scheduled", T);
      return;
    }
    noteFullCheckAt(now, tenantLifetimeMs);
    authWarmState.inFlight = true;
    r("fired", T);
    warmApiAuth(now, elapsedSinceFullCheck, n, credentials, storageV5)
      .finally(() => {
        authWarmState.inFlight = false;
      })
      .catch(() => {});
  } catch (error) {
    logForDebugging(`[apiAuthWarm] gate check threw, no warm: ${errorMessage(error)}`);
  }
}
//@ chunk-xx1vmpsq.js:33519-34645 placement
async function warmApiAuth(e, elapsedSinceFullCheck, n, credentials, storageV5) {
  let startTime = performance.now();
  let T = AbortSignal.timeout(API_AUTH_WARM_TIMEOUT_MS);
  let C;
  let I;
  try {
    await withTimeout(
      getAnthropicClient({
        maxRetries: 0,
        agentContext: mainAgentContext(),
        credentials,
        storageV5,
      }).then((anthropicClient) => {
        C = Math.round(performance.now() - startTime);
        T.throwIfAborted();
        return anthropicClient.get("/v1/me", {
          signal: T,
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
      T.aborted ||
      error instanceof APIConnectionTimeoutError ||
      error instanceof APIUserAbortError ||
      (error instanceof Error && error.message === AUTH_WARM_TIMEOUT_TEXT)
    )
      I = "timeout";
    else if (error instanceof APIError && error.status !== undefined) I = `http_${error.status}`;
    else if (error instanceof APIConnectionError || error instanceof TypeError) I = "connection";
    else if (
      error instanceof OAuthRefreshDeadError ||
      error instanceof OAuthAccountOnHoldError ||
      error instanceof StoredLoginHeldBackError
    )
      I = "auth";
    else {
      I = "other";
      logError(error);
    }
  }
  let rounded = Math.round(performance.now() - startTime);
  let R = (getLastLiveMainThreadRequestAt() ?? 0) > e;
  let E = {
    total_ms: rounded,
    ...(C !== undefined && {
      client_build_ms: C,
    }),
    ...(elapsedSinceFullCheck !== undefined && {
      since_full_auth_check_s: Math.round(elapsedSinceFullCheck / 1000),
    }),
    model_call_during_warm: R,
    trigger: fromEnum(n),
  };
  let A = I === undefined || I === "http_404";
  let now = Date.now();
  if (A) advanceFullCheckMark(e, now);
  else if (n !== "turn_start" && !R) clearFullCheckMarkIf(e);
  emitAuthWarmReported({
    kind: "settled",
    sentAt: e,
    answeredAt: now,
    totalMs: rounded,
    checked: A,
    modelCallDuringWarm: R,
  });
  if (I === undefined) logFeatureOk("api_auth_warm", E);
  else if (I === "http_404") logFeatureSad("api_auth_warm", I, E);
  else {
    authWarmState.backOffUntil = Date.now() + AUTH_WARM_BACKOFF_MS;
    logFeatureBad("api_auth_warm", I, E);
  }
}
//@ chunk-xx1vmpsq.js:34645-34727 placement
var authWarmNoticeStateSlot = new SessionRootSlot(() => ({
  noticed: false,
  countedClear: false,
  countedStop: false,
  countedNotice: false,
}));
export { authWarmNoticeStateSlot, maybeWarmApiAuth };
