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
import { ge } from "../../utils/identity.js";
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
import { fT, Lf, Ot, ef } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { OAuthRefreshDeadError } from "../oauth/errors.js";
import { OAuthAccountOnHoldError } from "../oauth/oauthErrors.js";
import { StoredLoginHeldBackError } from "../oauth/storedLoginRefusal.js";
import { logError } from "../../utils/log.js";
import { getLastLiveMainThreadRequestAt } from "../../bootstrap/state.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";

//@ chunk-xx1vmpsq.js:32409-32616 placement
var API_AUTH_WARM_TIMEOUT_MS = 3000,
  gn = "auth warm timed out",
  Er = 60000,
  vr = 60000,
  Fr = 2000,
  Lt = ge({ inFlight: !1, backOffUntil: 0, scheduled: void 0 }, (e) => {
    ((e.inFlight = !1), (e.backOffUntil = 0), clearTimeout(e.scheduled), (e.scheduled = void 0));
  }),
  Ur = createSignal();
//@ chunk-xx1vmpsq.js:32616-32750 placement
function emitAuthWarmReported(e) {
  try {
    Ur.emit(e);
  } catch (error) {
    logForDebugging(
      `[apiAuthWarm] a subscriber to authWarmReported threw; the request is unaffected: ${errorMessage(error)}`,
    );
  }
}
//@ chunk-xx1vmpsq.js:32750-32809 placement
function Dr(e, s) {
  ((Lt.scheduled = void 0), maybeWarmApiAuth(e, s, "lapse_timer"));
}
/**
 * 回合开始前按需预热 API 认证（/v1/me）：第一方/网关、退避与在途去重，结果供后续请求使用。
 */
//@ chunk-xx1vmpsq.js:32809-33519 placement
function maybeWarmApiAuth(e, s, n = "turn_start") {
  try {
    let now = Date.now(),
      r = (I, M) =>
        emitAuthWarmReported({ kind: "decided", trigger: n, verdict: I, at: now, lastFullCheckAt: M }),
      w = getTenantLifetimeMs();
    if (
      w === void 0 ||
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
    if (Lt.inFlight) {
      r("in_flight", T);
      return;
    }
    if (now < Lt.backOffUntil) {
      r("paused", T);
      return;
    }
    let C = getElapsedSinceFullCheck(now);
    if (C !== void 0 && C < w) {
      let I = w - C;
      if (n !== "owner_present" || I > vr) {
        r("fresh", T);
        return;
      }
      if (Lt.scheduled === void 0) ((Lt.scheduled = setTimeout(Dr, I + Fr, e, s)), Lt.scheduled.unref?.());
      r("scheduled", T);
      return;
    }
    (noteFullCheckAt(now, w),
      (Lt.inFlight = !0),
      r("fired", T),
      warmApiAuth(now, C, n, e, s)
        .finally(() => {
          Lt.inFlight = !1;
        })
        .catch(() => {}));
  } catch (error) {
    logForDebugging(`[apiAuthWarm] gate check threw, no warm: ${errorMessage(error)}`);
  }
}
//@ chunk-xx1vmpsq.js:33519-34645 placement
async function warmApiAuth(e, s, n, y, r) {
  let startTime = performance.now(),
    timeout = AbortSignal.timeout(API_AUTH_WARM_TIMEOUT_MS),
    C,
    I;
  try {
    await withTimeout(
      getAnthropicClient({
        maxRetries: 0,
        agentContext: mainAgentContext(),
        credentials: y,
        storageV5: r,
      }).then(
        (U) => (
          (C = Math.round(performance.now() - startTime)),
          timeout.throwIfAborted(),
          U.get("/v1/me", { signal: timeout, headers: { "anthropic-beta": OAUTH_BETA_HEADER } })
        ),
      ),
      API_AUTH_WARM_TIMEOUT_MS,
      gn,
    );
  } catch (error) {
    if (
      timeout.aborted ||
      error instanceof fT ||
      error instanceof Lf ||
      (error instanceof Error && error.message === gn)
    )
      I = "timeout";
    else if (error instanceof Ot && error.status !== void 0) I = `http_${error.status}`;
    else if (error instanceof ef || error instanceof TypeError) I = "connection";
    else if (
      error instanceof OAuthRefreshDeadError ||
      error instanceof OAuthAccountOnHoldError ||
      error instanceof StoredLoginHeldBackError
    )
      I = "auth";
    else ((I = "other"), logError(error));
  }
  let rounded = Math.round(performance.now() - startTime),
    R = (getLastLiveMainThreadRequestAt() ?? 0) > e,
    E = {
      total_ms: rounded,
      ...(C !== void 0 && { client_build_ms: C }),
      ...(s !== void 0 && { since_full_auth_check_s: Math.round(s / 1000) }),
      model_call_during_warm: R,
      trigger: fromEnum(n),
    },
    A = I === void 0 || I === "http_404",
    now = Date.now();
  if (A) advanceFullCheckMark(e, now);
  else if (n !== "turn_start" && !R) clearFullCheckMarkIf(e);
  if (
    (emitAuthWarmReported({
      kind: "settled",
      sentAt: e,
      answeredAt: now,
      totalMs: rounded,
      checked: A,
      modelCallDuringWarm: R,
    }),
    I === void 0)
  )
    logFeatureOk("api_auth_warm", E);
  else if (I === "http_404") logFeatureSad("api_auth_warm", I, E);
  else ((Lt.backOffUntil = Date.now() + Er), logFeatureBad("api_auth_warm", I, E));
}
//@ chunk-xx1vmpsq.js:34645-34727 placement
var Lr = new SessionRootSlot(() => ({ noticed: !1, countedClear: !1, countedStop: !1, countedNotice: !1 }));

export { Lr, maybeWarmApiAuth };
