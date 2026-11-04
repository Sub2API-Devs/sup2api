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
import { CLOUD_UNAVAILABLE_IN_EVAL_TEXT } from "../../commands/review/ultrareviewPreconditions.js";
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

//@ chunk-63n281q4.js:999-2906 placement
/**
 * 读不到控制台凭据时的说明文案。
 */
var CLOUD_SESSION_READ_LIMITS = 25000;
var MAX_TRANSCRIPT_INFLIGHT = 4;
var DEFAULT_TRANSCRIPT_TIMEOUT_MS = 15000;
var SESSIONS_PAGE_LIMIT = 200;
var MAX_SESSIONS_RESPONSE_BYTES = 8000000;
var MAX_EVENTS_RESPONSE_BYTES = 1e6;
var MAX_SESSION_ID_CHARS = 128;
var PROOF_REREAD_INTERVAL_MS = 60000;
var SIGN_IN_HINT = "Run `claude auth login` (or /login in a local session), then try again.";
var UNAVAILABLE_TEXT = {
  started_by_session:
    "Cloud sessions cannot be read from a program that was started inside a Claude Code session. Start it outside the session and try again.",
  provider:
    "Cloud sessions aren't available with this API provider. They run on Anthropic's infrastructure and require an Anthropic account.",
  evaluation_run: CLOUD_UNAVAILABLE_IN_EVAL_TEXT,
  nonessential_traffic:
    "Cloud sessions are unavailable while CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC is set.",
  policy: "Cloud sessions are disabled by your organization's policy.",
  policy_unverified:
    "Your organization's policy could not be read, so cloud sessions are unavailable. Try again in a moment.",
  not_signed_in: `Cloud sessions need a sign-in with a Claude account. ${SIGN_IN_HINT}`,
  sign_in_expired: `Your sign-in was not accepted. ${SIGN_IN_HINT}`,
  not_found: "That cloud session was not found for this sign-in.",
  forbidden:
    "The service did not allow this sign-in to read cloud sessions from this computer. Try Claude Code on the web instead.",
  temporarily_unavailable: "Cloud sessions could not be read right now. Try again in a moment.",
  failed: "Cloud sessions could not be read.",
};
var UNVERIFIED_POLICY_TEXT =
  "Cloud sessions are disabled for the rest of this session because an organization with a restricted policy was signed in earlier. Restart Claude Code to check again.";
var POLICY_UNVERIFIED_TEXT =
  "Your organization's policy could not be loaded: the request for it got a 404, which usually means that a proxy or gateway does not forward it. Ask your network admin to forward it; `claude doctor` shows which host was asked.";
var NOT_SIGNED_IN_TEXT = `Cloud sessions aren't available with this Console sign-in. They need a sign-in with a Claude account. ${SIGN_IN_HINT}`;
var NOT_LDR_TEXT = "Cloud sessions can't be read with this Console sign-in.";
var CONSOLE_PROFILE_TEXT =
  "Cloud sessions can't be read with your Console sign-in in this process. This is a bug in Claude Code; please report it.";
//@ chunk-63n281q4.js:2906-6313 placement
/**
 * 读取云会话（转写、元数据）的客户端，处理登录、组织策略与非必要流量关闭等拒绝。
 */
class CloudSessionReads {
  inFlight = 0;
  reported = new Set();
  proofRereadAt = Number.NEGATIVE_INFINITY;
  async pageWasRefused() {
    if (Date.now() - this.proofRereadAt < PROOF_REREAD_INTERVAL_MS) return;
    this.proofRereadAt = Date.now();
    try {
      let { clearTrustedDeviceTokenCache } = await import("../../bridge/trustedDevice.js");
      clearTrustedDeviceTokenCache();
    } catch (error) {
      logForDebugging(
        `[cloud-sessions] the kept read of the trusted-device proof was not cleared: ${sanitizeErrorName(error) ?? "error"}`,
        {
          level: "error",
        },
      );
    }
  }
  async answer(request, context) {
    if (request.subtype === "get_cloud_session") requireCloudSessionId(request.subtype, request.session_id);
    let result = await this.bounded(request.subtype, context, async (signal) => {
      let isBackground = request.subtype === "list_cloud_sessions" && request.user_initiated !== true;
      let refusal = await refusalBeforeAnyRequest(!isBackground);
      if (refusal !== null) return refusal;
      let useCcrV2 = isCcrV2SessionCrudEnabled();
      if (request.subtype === "list_cloud_sessions") {
        let listResult = await getFromSessionApi(
          useCcrV2 ? `/v1/code/sessions?limit=${SESSIONS_PAGE_LIMIT}` : "/v1/sessions",
          {
            signal,
            context,
            maxResponseBytes: MAX_SESSIONS_RESPONSE_BYTES,
            olderApi: !useCcrV2,
            isBackground,
          },
        );
        let failure =
          listResult.ok && listResult.status === 404
            ? unavailable("failed")
            : unavailableForResult(listResult, isBackground);
        if (failure !== null) return failure;
        let body = listResult.ok ? listResult.data : undefined;
        if (!isPlainObject(body) || !Array.isArray(body.data)) return unavailable("failed");
        return {
          status: "ok",
          sessions: body.data.flatMap((rawSession) => {
            if (!isPlainObject(rawSession) || typeof rawSession.id !== "string") return [];
            let compatSessionId = toCompatSessionId_2(rawSession.id);
            let found = [rawSession.updated_at, rawSession.last_event_at, rawSession.created_at].find(
              (timestamp) => typeof timestamp === "string",
            );
            if (
              compatSessionId.length > MAX_SESSION_ID_CHARS ||
              !CCR_SESSION_ID_RE.test(compatSessionId) ||
              typeof found !== "string"
            )
              return [];
            let status;
            switch (rawSession.session_status) {
              case "running":
              case "idle":
              case "requires_action":
              case "archived":
              case "pending":
              case "failed":
                status = rawSession.session_status;
                break;
              default:
                status = toDisplaySessionStatus({
                  status: typeof rawSession.status === "string" ? rawSession.status : undefined,
                  worker_status:
                    typeof rawSession.worker_status === "string" ? rawSession.worker_status : undefined,
                  connection_status:
                    typeof rawSession.connection_status === "string"
                      ? rawSession.connection_status
                      : undefined,
                });
            }
            let found_2 = getSessionConfigArray(rawSession, "sources").find(
              (source) => isPlainObject(source) && source.type === "git_repository",
            );
            let [owner, name] =
              isPlainObject(found_2) && typeof found_2.url === "string"
                ? (parseGitHubRepository(found_2.url)?.split("/") ?? [])
                : [];
            let repository =
              owner && name
                ? {
                    owner,
                    name,
                  }
                : undefined;
            let branch = firstOutcomeBranch(rawSession);
            return [
              {
                id: compatSessionId,
                title: typeof rawSession.title === "string" ? rawSession.title : "",
                updated_at: found,
                status,
                ...(isKnownWorkerState(rawSession.environment_kind) && {
                  environment_kind: rawSession.environment_kind,
                }),
                ...(repository !== undefined && {
                  repository,
                }),
                ...(branch !== undefined && {
                  branch,
                }),
              },
            ];
          }),
          truncated: useCcrV2
            ? typeof body.next_cursor === "string" && body.next_cursor !== ""
            : body.has_more === true,
        };
      }
      let sessionResult = await getFromSessionApi(
        useCcrV2 ? `/v1/code/sessions/${request.session_id}` : `/v1/sessions/${request.session_id}`,
        {
          signal,
          context,
          maxResponseBytes: MAX_EVENTS_RESPONSE_BYTES,
          olderApi: !useCcrV2,
          isBackground,
        },
      );
      let failure = unavailableForResult(sessionResult, isBackground);
      if (failure !== null) return failure;
      let body = sessionResult.ok ? sessionResult.data : undefined;
      let session = useCcrV2 ? extractSessionFromResponse(body) : body;
      if (!isPlainObject(session)) return unavailable("not_found");
      let branch = firstOutcomeBranch(session);
      return {
        status: "ok",
        ...(typeof session.title === "string" &&
          session.title !== "" && {
            title: session.title,
          }),
        ...(branch !== undefined && {
          branch,
        }),
        ...(isKnownWorkerState(session.environment_kind) && {
          environment_kind: session.environment_kind,
        }),
      };
    });
    let failureReason = result.status === "unavailable" ? (result.reason ?? "failed") : undefined;
    switch (request.subtype) {
      case "list_cloud_sessions":
        if (failureReason === undefined) logFeatureOk("sdk_list_cloud_sessions");
        else logFeatureBad("sdk_list_cloud_sessions", failureReason);
        break;
      case "get_cloud_session":
        if (failureReason === undefined) logFeatureOk("sdk_get_cloud_session");
        else logFeatureBad("sdk_get_cloud_session", failureReason);
        break;
    }
    return result;
  }
  async bounded(subtype, context, readBody) {
    if (this.inFlight >= MAX_TRANSCRIPT_INFLIGHT) return unavailable("temporarily_unavailable");
    this.inFlight++;
    let childAbortController = createChildAbortController(context.abortController);
    try {
      let deadlineResult = await withDeadline(
        readBody(childAbortController.signal),
        CLOUD_SESSION_READ_LIMITS,
      );
      if (deadlineResult !== undefined) return deadlineResult;
      childAbortController.abort();
      return unavailable("temporarily_unavailable");
    } catch (error) {
      let { kind, status } = classifyAxiosError(error);
      let errorName = sanitizeErrorName(error) ?? "error";
      logForDebugging(`[cloud-sessions] ${subtype} failed: ${errorName} ${kind} ${status ?? "no status"}`, {
        level: "error",
      });
      if (
        kind === "other" &&
        !childAbortController.signal.aborted &&
        !isMaxContentLengthError(error) &&
        !this.reported.has(errorName)
      ) {
        this.reported.add(errorName);
        logError(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `[cloud-sessions] ${subtype} failed: ${errorName}`,
            "a cloud-session read failed with an internal error",
          ),
        );
      }
      let timedOut = kind !== "other" && status === undefined && !isMaxContentLengthError(error);
      return unavailable(
        childAbortController.signal.aborted || timedOut ? "temporarily_unavailable" : "failed",
      );
    } finally {
      this.inFlight--;
    }
  }
}
//@ chunk-63n281q4.js:6313-6439 placement
function requireCloudSessionId(subtype, sessionId) {
  if (
    typeof sessionId !== "string" ||
    sessionId.length > MAX_SESSION_ID_CHARS ||
    !CCR_SESSION_ID_RE.test(sessionId)
  )
    throw new WireSafeControlError(`${subtype}: session_id is not a cloud session id`);
}
//@ chunk-63n281q4.js:6439-7112 placement
async function refusalBeforeAnyRequest(fromSession) {
  if ((await refusedFromSession()) !== undefined) return unavailable("started_by_session");
  if (getAPIProvider() !== "firstParty") return unavailable("provider");
  if (env.CLAUDE_CODE_EVAL_CONFINED) return unavailable("evaluation_run");
  if (isEssentialTrafficOnly()) return unavailable("nonessential_traffic");
  await waitForPolicyLimitsToLoad();
  if (cloudSessionsUnavailableReason() !== null)
    switch (isPolicyRouteMissing() ? "route_missing" : policyDenyKind(CLOUD_SESSIONS_POLICY.policy)) {
      case "org_denied":
        if (fromSession) await logOrgPolicyDeniedAsync("allow_remote_sessions", "cloud_session");
        return unavailable("policy");
      case "latched":
        return unavailable("policy", UNVERIFIED_POLICY_TEXT);
      case "route_missing":
        return unavailable("policy_unverified", POLICY_UNVERIFIED_TEXT);
      default:
        return unavailable("policy_unverified");
    }
  if (isConsoleProfileSessionsCredential()) {
    if (!consoleProfileCredentialProviderLoaded()) return unavailable("failed", CONSOLE_PROFILE_TEXT);
    let orgLabel = consoleProfileOrganizationLabel();
    if (orgLabel === "unknown") return unavailable("policy_unverified");
    return unavailable("not_signed_in", orgLabel === "not_ldr" ? NOT_SIGNED_IN_TEXT : NOT_LDR_TEXT);
  }
  return null;
}
//@ chunk-63n281q4.js:7112-7627 placement
async function getFromSessionApi(path, opts) {
  opts.signal.throwIfAborted();
  let deviceToken = opts.withDeviceProof
    ? (await trustedDeviceHeaders())["X-Trusted-Device-Token"]
    : undefined;
  let extraHeaders = {
    ...(opts.olderApi && {
      "anthropic-beta": CCR_BYOC_BETA,
    }),
    ...(deviceToken !== undefined && {
      "X-Trusted-Device-Token": deviceToken,
    }),
  };
  opts.signal.throwIfAborted();
  return apiClient.get(path, {
    auth: "teleport-org",
    ...(Object.keys(extraHeaders).length > 0 && {
      headers: extraHeaders,
    }),
    maxRedirects: 0,
    validateStatus: () => true,
    timeout: opts.timeoutMs ?? DEFAULT_TRANSCRIPT_TIMEOUT_MS,
    maxContentLength: opts.maxResponseBytes,
    signal: opts.signal,
    isBackground: opts.isBackground,
    credentials: opts.context.credentials,
    storageV5: opts.context.storageV5,
  });
}
//@ chunk-63n281q4.js:7627-8101 placement
function unavailableForResult(result, authFailed) {
  if (!result.ok)
    switch (result.reason) {
      case "data-residency":
        return unavailable("provider");
      case "essential-traffic-only":
        return unavailable("nonessential_traffic");
      case "no-auth":
        return unavailable("not_signed_in");
    }
  switch (result.status) {
    case 200:
      return null;
    case 401:
      return unavailable(authFailed ? "temporarily_unavailable" : "sign_in_expired");
    case 403:
      return unavailable("forbidden");
    case 404:
      return unavailable("not_found");
    case 429:
      return unavailable("temporarily_unavailable");
    default:
      return unavailable(result.status >= 500 ? "temporarily_unavailable" : "failed");
  }
}
//@ chunk-63n281q4.js:8101-8171 placement
function unavailable(reason, message = UNAVAILABLE_TEXT[reason]) {
  return {
    status: "unavailable",
    reason,
    message,
  };
}
//@ chunk-63n281q4.js:8171-8282 placement
function getSessionConfigArray(session, key) {
  let config = isPlainObject(session.config) ? session.config : session.session_context;
  let value = isPlainObject(config) ? config[key] : undefined;
  return Array.isArray(value) ? value : [];
}
//@ chunk-63n281q4.js:8282-8488 placement
/**
 * 取会话结果中的首个 git 分支
 */
function firstOutcomeBranch(session) {
  let found = getSessionConfigArray(session, "outcomes").find(
    (outcome) => isPlainObject(outcome) && outcome.type === "git_repository",
  );
  let gitInfo = isPlainObject(found) ? found.git_info : undefined;
  let branch = isPlainObject(gitInfo) && Array.isArray(gitInfo.branches) ? gitInfo.branches[0] : undefined;
  return typeof branch === "string" && branch !== "" ? branch : undefined;
}
export {
  requireCloudSessionId,
  refusalBeforeAnyRequest,
  getFromSessionApi,
  unavailableForResult,
  unavailable,
  CloudSessionReads,
};
