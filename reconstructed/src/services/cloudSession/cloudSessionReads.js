/**
 * services/cloudSession/cloudSessionReads.ts
 *
 * 2.1.316 新增。读取云会话（转写、元数据）的客户端，处理登录、组织策略与非必要流量关闭等拒绝。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-63n281q4.js (9)
 * attribution: placement 9
 */
import { jvt } from "../../commands/review/ultrareviewPreconditions.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  sanitizeErrorName,
  classifyAxiosError,
  isMaxContentLengthError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  WireSafeControlError,
} from "../../utils/errors.js";
import { isCcrV2SessionCrudEnabled } from "../../bridge/bridgeGates.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { toCompatSessionId_2 } from "../../bridge/bridgeHostState.js";
import { CCR_SESSION_ID_RE } from "../cloudSessions/ccrSessionList.js";
import { toDisplaySessionStatus } from "../../utils/background/remote/remoteSession.js";
import { parseGitHubRepository } from "../../utils/detectRepository.js";
import { isKnownWorkerState } from "../../utils/telemetry/memorySummary.js";
import {
  extractSessionFromResponse,
  isConsoleProfileSessionsCredential,
  consoleProfileCredentialProviderLoaded,
  consoleProfileOrganizationLabel,
  trustedDeviceHeaders,
  CCR_BYOC_BETA,
} from "../../utils/teleport/api.js";
import { logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { createChildAbortController } from "../../utils/abortController.js";
import { withDeadline } from "../../utils/sleep.js";
import { logError } from "../../utils/log.js";
import { refusedFromSession } from "../../cli/handlers/editSettingsCommands.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { env } from "../../utils/env.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { waitForPolicyLimitsToLoad } from "../policyLimits/PolicyLimitsClient.js";
import {
  cloudSessionsUnavailableReason,
  CLOUD_SESSIONS_POLICY,
} from "../cloudSessions/cloudSessionsPolicy.js";
import { isPolicyRouteMissing, policyDenyKind } from "../policyLimits/policyEvidence.js";
import { logOrgPolicyDeniedAsync } from "../policyLimits/orgPolicyDeniedEvent.js";
import { apiClient } from "../routines/routinesApi.js";

/**
 * 云会话读取的超时、大小上限与拒绝文案
 */
//@ chunk-63n281q4.js:999-2906 placement
var CLOUD_SESSION_READ_LIMITS = 25000,
  M = 4,
  G = 15000,
  B = 200,
  K = 8000000,
  U = 1e6,
  L = 128,
  Y = 60000,
  E = "Run `claude auth login` (or /login in a local session), then try again.",
  H = {
    started_by_session:
      "Cloud sessions cannot be read from a program that was started inside a Claude Code session. Start it outside the session and try again.",
    provider:
      "Cloud sessions aren't available with this API provider. They run on Anthropic's infrastructure and require an Anthropic account.",
    evaluation_run: jvt,
    nonessential_traffic:
      "Cloud sessions are unavailable while CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC is set.",
    policy: "Cloud sessions are disabled by your organization's policy.",
    policy_unverified:
      "Your organization's policy could not be read, so cloud sessions are unavailable. Try again in a moment.",
    not_signed_in: `Cloud sessions need a sign-in with a Claude account. ${E}`,
    sign_in_expired: `Your sign-in was not accepted. ${E}`,
    not_found: "That cloud session was not found for this sign-in.",
    forbidden:
      "The service did not allow this sign-in to read cloud sessions from this computer. Try Claude Code on the web instead.",
    temporarily_unavailable: "Cloud sessions could not be read right now. Try again in a moment.",
    failed: "Cloud sessions could not be read.",
  },
  V =
    "Cloud sessions are disabled for the rest of this session because an organization with a restricted policy was signed in earlier. Restart Claude Code to check again.",
  z =
    "Your organization's policy could not be loaded: the request for it got a 404, which usually means that a proxy or gateway does not forward it. Ask your network admin to forward it; `claude doctor` shows which host was asked.",
  X = `Cloud sessions aren't available with this Console sign-in. They need a sign-in with a Claude account. ${E}`,
  j = "Cloud sessions can't be read with this Console sign-in.",
  q =
    "Cloud sessions can't be read with your Console sign-in in this process. This is a bug in Claude Code; please report it.";
/**
 * 读取云会话（转写、元数据）的客户端，处理登录、组织策略与非必要流量关闭等拒绝。
 */
//@ chunk-63n281q4.js:2906-6313 placement
class CloudSessionReads {
  inFlight = 0;
  reported = new Set();
  proofRereadAt = Number.NEGATIVE_INFINITY;
  async pageWasRefused() {
    if (Date.now() - this.proofRereadAt < Y) return;
    this.proofRereadAt = Date.now();
    try {
      let { clearTrustedDeviceTokenCache: clearTrustedDeviceTokenCache } =
        await import("./chunk-3kb57csj.js");
      clearTrustedDeviceTokenCache();
    } catch (error) {
      logForDebugging(
        `[cloud-sessions] the kept read of the trusted-device proof was not cleared: ${sanitizeErrorName(error) ?? "error"}`,
        { level: "error" },
      );
    }
  }
  async answer(e, s) {
    if (e.subtype === "get_cloud_session") requireCloudSessionId(e.subtype, e.session_id);
    let bounded = await this.bounded(e.subtype, s, async (a) => {
        let u = e.subtype === "list_cloud_sessions" && e.user_initiated !== !0,
          _ = await refusalBeforeAnyRequest(!u);
        if (_ !== null) return _;
        let d = isCcrV2SessionCrudEnabled();
        if (e.subtype === "list_cloud_sessions") {
          let S = await getFromSessionApi(d ? `/v1/code/sessions?limit=${B}` : "/v1/sessions", {
              signal: a,
              context: s,
              maxResponseBytes: K,
              olderApi: !d,
              isBackground: u,
            }),
            k = S.ok && S.status === 404 ? unavailable("failed") : unavailableForResult(S, u);
          if (k !== null) return k;
          let f = S.ok ? S.data : void 0;
          if (!isPlainObject(f) || !Array.isArray(f.data)) return unavailable("failed");
          return {
            status: "ok",
            sessions: f.data.flatMap((n) => {
              if (!isPlainObject(n) || typeof n.id !== "string") return [];
              let b = toCompatSessionId_2(n.id),
                found = [n.updated_at, n.last_event_at, n.created_at].find((y) => typeof y === "string");
              if (b.length > L || !CCR_SESSION_ID_RE.test(b) || typeof found !== "string") return [];
              let h;
              switch (n.session_status) {
                case "running":
                case "idle":
                case "requires_action":
                case "archived":
                case "pending":
                case "failed":
                  h = n.session_status;
                  break;
                default:
                  h = toDisplaySessionStatus({
                    status: typeof n.status === "string" ? n.status : void 0,
                    worker_status: typeof n.worker_status === "string" ? n.worker_status : void 0,
                    connection_status: typeof n.connection_status === "string" ? n.connection_status : void 0,
                  });
              }
              let found_2 = getSessionConfigArray(n, "sources").find(
                  (y) => isPlainObject(y) && y.type === "git_repository",
                ),
                [D, T] =
                  isPlainObject(found_2) && typeof found_2.url === "string"
                    ? (parseGitHubRepository(found_2.url)?.split("/") ?? [])
                    : [],
                O = D && T ? { owner: D, name: T } : void 0,
                N = firstOutcomeBranch(n);
              return [
                {
                  id: b,
                  title: typeof n.title === "string" ? n.title : "",
                  updated_at: found,
                  status: h,
                  ...(isKnownWorkerState(n.environment_kind) && { environment_kind: n.environment_kind }),
                  ...(O !== void 0 && { repository: O }),
                  ...(N !== void 0 && { branch: N }),
                },
              ];
            }),
            truncated: d ? typeof f.next_cursor === "string" && f.next_cursor !== "" : f.has_more === !0,
          };
        }
        let p = await getFromSessionApi(
            d ? `/v1/code/sessions/${e.session_id}` : `/v1/sessions/${e.session_id}`,
            { signal: a, context: s, maxResponseBytes: U, olderApi: !d, isBackground: u },
          ),
          v = unavailableForResult(p, u);
        if (v !== null) return v;
        let A = p.ok ? p.data : void 0,
          c = d ? extractSessionFromResponse(A) : A;
        if (!isPlainObject(c)) return unavailable("not_found");
        let w = firstOutcomeBranch(c);
        return {
          status: "ok",
          ...(typeof c.title === "string" && c.title !== "" && { title: c.title }),
          ...(w !== void 0 && { branch: w }),
          ...(isKnownWorkerState(c.environment_kind) && { environment_kind: c.environment_kind }),
        };
      }),
      o = bounded.status === "unavailable" ? (bounded.reason ?? "failed") : void 0;
    switch (e.subtype) {
      case "list_cloud_sessions":
        if (o === void 0) logFeatureOk("sdk_list_cloud_sessions");
        else logFeatureBad("sdk_list_cloud_sessions", o);
        break;
      case "get_cloud_session":
        if (o === void 0) logFeatureOk("sdk_get_cloud_session");
        else logFeatureBad("sdk_get_cloud_session", o);
        break;
    }
    return bounded;
  }
  async bounded(e, s, r) {
    if (this.inFlight >= M) return unavailable("temporarily_unavailable");
    this.inFlight++;
    let o = createChildAbortController(s.abortController);
    try {
      let a = await withDeadline(r(o.signal), CLOUD_SESSION_READ_LIMITS);
      if (a !== void 0) return a;
      return (o.abort(), unavailable("temporarily_unavailable"));
    } catch (error) {
      let { kind: kind, status: status } = classifyAxiosError(error),
        d = sanitizeErrorName(error) ?? "error";
      if (
        (logForDebugging(`[cloud-sessions] ${e} failed: ${d} ${kind} ${status ?? "no status"}`, {
          level: "error",
        }),
        kind === "other" && !o.signal.aborted && !isMaxContentLengthError(error) && !this.reported.has(d))
      )
        (this.reported.add(d),
          logError(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `[cloud-sessions] ${e} failed: ${d}`,
              "a cloud-session read failed with an internal error",
            ),
          ));
      let p = kind !== "other" && status === void 0 && !isMaxContentLengthError(error);
      return unavailable(o.signal.aborted || p ? "temporarily_unavailable" : "failed");
    } finally {
      this.inFlight--;
    }
  }
}
//@ chunk-63n281q4.js:6313-6439 placement
function requireCloudSessionId(e, s) {
  if (typeof s !== "string" || s.length > L || !CCR_SESSION_ID_RE.test(s))
    throw new WireSafeControlError(`${e}: session_id is not a cloud session id`);
}
//@ chunk-63n281q4.js:6439-7112 placement
async function refusalBeforeAnyRequest(e) {
  if ((await refusedFromSession()) !== void 0) return unavailable("started_by_session");
  if (getAPIProvider() !== "firstParty") return unavailable("provider");
  if (env.CLAUDE_CODE_EVAL_CONFINED) return unavailable("evaluation_run");
  if (isEssentialTrafficOnly()) return unavailable("nonessential_traffic");
  if ((await waitForPolicyLimitsToLoad(), cloudSessionsUnavailableReason() !== null))
    switch (isPolicyRouteMissing() ? "route_missing" : policyDenyKind(CLOUD_SESSIONS_POLICY.policy)) {
      case "org_denied":
        if (e) await logOrgPolicyDeniedAsync("allow_remote_sessions", "cloud_session");
        return unavailable("policy");
      case "latched":
        return unavailable("policy", V);
      case "route_missing":
        return unavailable("policy_unverified", z);
      default:
        return unavailable("policy_unverified");
    }
  if (isConsoleProfileSessionsCredential()) {
    if (!consoleProfileCredentialProviderLoaded()) return unavailable("failed", q);
    let s = consoleProfileOrganizationLabel();
    if (s === "unknown") return unavailable("policy_unverified");
    return unavailable("not_signed_in", s === "not_ldr" ? X : j);
  }
  return null;
}
//@ chunk-63n281q4.js:7112-7627 placement
async function getFromSessionApi(e, s) {
  s.signal.throwIfAborted();
  let r = s.withDeviceProof ? (await trustedDeviceHeaders())["X-Trusted-Device-Token"] : void 0,
    o = {
      ...(s.olderApi && { "anthropic-beta": CCR_BYOC_BETA }),
      ...(r !== void 0 && { "X-Trusted-Device-Token": r }),
    };
  return (
    s.signal.throwIfAborted(),
    apiClient.get(e, {
      auth: "teleport-org",
      ...(Object.keys(o).length > 0 && { headers: o }),
      maxRedirects: 0,
      validateStatus: () => !0,
      timeout: s.timeoutMs ?? G,
      maxContentLength: s.maxResponseBytes,
      signal: s.signal,
      isBackground: s.isBackground,
      credentials: s.context.credentials,
      storageV5: s.context.storageV5,
    })
  );
}
//@ chunk-63n281q4.js:7627-8101 placement
function unavailableForResult(e, s) {
  if (!e.ok)
    switch (e.reason) {
      case "data-residency":
        return unavailable("provider");
      case "essential-traffic-only":
        return unavailable("nonessential_traffic");
      case "no-auth":
        return unavailable("not_signed_in");
    }
  switch (e.status) {
    case 200:
      return null;
    case 401:
      return unavailable(s ? "temporarily_unavailable" : "sign_in_expired");
    case 403:
      return unavailable("forbidden");
    case 404:
      return unavailable("not_found");
    case 429:
      return unavailable("temporarily_unavailable");
    default:
      return unavailable(e.status >= 500 ? "temporarily_unavailable" : "failed");
  }
}
//@ chunk-63n281q4.js:8101-8171 placement
function unavailable(e, s = H[e]) {
  return { status: "unavailable", reason: e, message: s };
}
//@ chunk-63n281q4.js:8171-8282 placement
function getSessionConfigArray(e, s) {
  let r = isPlainObject(e.config) ? e.config : e.session_context,
    o = isPlainObject(r) ? r[s] : void 0;
  return Array.isArray(o) ? o : [];
}
/**
 * 取会话结果中的首个 git 分支
 */
//@ chunk-63n281q4.js:8282-8488 placement
function firstOutcomeBranch(e) {
  let found = getSessionConfigArray(e, "outcomes").find(
      (a) => isPlainObject(a) && a.type === "git_repository",
    ),
    r = isPlainObject(found) ? found.git_info : void 0,
    o = isPlainObject(r) && Array.isArray(r.branches) ? r.branches[0] : void 0;
  return typeof o === "string" && o !== "" ? o : void 0;
}

export {
  requireCloudSessionId,
  refusalBeforeAnyRequest,
  getFromSessionApi,
  unavailableForResult,
  unavailable,
};
