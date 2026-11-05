/**
 * services/artifacts/frameRelay.ts
 *
 * 2.1.316 新增：Artifact frame 请求中继：经启动中继族发送请求与回包处理。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-he38vqx2.js (71)
 * attribution: placement 71
 */
import {
  isPlainRecord,
  gzipPublishBody,
  toResponseFacts,
  getFrameTunnelRoute,
  isProxyOrConnectRefusal,
  GZIP_JSON_HEADERS,
} from "./framePublish.js";
import { logGzipSent, handleFrameGzipRejection } from "../api/gzipRequestBody.js";
import { pickByHelper } from "../../utils/git/gitSafeEnv.js";
import { lit, fromEnum } from "../analytics/safeMetadata.js";
import { countWhere } from "../../utils/collections.js";
import {
  isRemoteEnvironmentAny,
  isRemoteManagedEnvironment,
  isByocEnvironment,
} from "../../utils/remoteEnvironment.js";
import {
  getFrameHostOverride,
  apiClient,
  UPLOAD_TIMEOUT_MS,
  frameBaseUrl,
  hashCredential,
  claudeAiBearerDigest,
  hasApiClient,
} from "../routines/routinesApi.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import {
  hasUsableRemoteSdkUrl,
  isActingAsBot,
  isAgentSessionWorker,
  isServiceAgentSession,
  isUserIngressToken,
  getAgentProxyFramePath,
} from "../ccrAgentProxy/agentProxy.js";
import { isDiskless } from "../../bootstrap/state.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { ARTIFACT_MOUNT } from "./artifactMount.js";
import { isCancel } from "../../../vendor/axios/dist/esm/axios.js";
import { env } from "../../utils/env.js";
import { mcpRowFor, sendOverMcp } from "./artifactMcpWire.js";
import { classifyArtifactSocketError } from "./frameApi.js";
import { checkAndRefreshOAuthTokenIfNeeded } from "../../utils/auth.js";
import { findProxyError } from "../../utils/proxy.js";
import { parseRetryAfterMs } from "../../bridge/debugUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-he38vqx2.js:3791-4306 placement
/**
 * 发送 frame 请求：请求体是普通对象且决定压缩时以 gzip 发送，服务端不支持压缩时回退为未压缩重发；否则直接发送。
 */
async function sendWithOptionalGzip({ url: options, body, storageV5, signal, send, onEncoding }) {
  if (!isPlainRecord(body)) return send(null);
  let { gzipped, encoding, jsonChars } = await gzipPublishBody({
    url: options,
    body,
    storageV5,
  });
  if (encoding !== undefined) onEncoding?.(encoding);
  if (gzipped === null || encoding === undefined) return send(null);
  logGzipSent("frame_publish");
  let answer = await send(gzipped);
  return handleFrameGzipRejection({
    answer,
    facts: toResponseFacts,
    resendIdentity: () => {
      onEncoding?.({
        json_bytes: encoding.json_bytes,
        wire_bytes: encoding.json_bytes,
        body_gzip: false,
        gzip_fallback_status: answer.ok ? answer.status : 0,
      });
      return send(null);
    },
    aborted: () => signal?.aborted === true,
    bodyChars: jsonChars,
    storageV5,
    rollout: "frame_publish",
  });
}
//@ chunk-he38vqx2.js:4306-4399 placement
function isRelayUnsent(relayResult) {
  return (
    !relayResult.ok &&
    (relayResult.reason === "relay-unavailable" || relayResult.reason === "relay-not-served")
  );
}
//@ chunk-he38vqx2.js:4399-4508 placement
/**
 * 中继请求的两个头 x-ccr-relay-upstream、x-ccr-sandbox-egress 与沙箱出网档位取值。
 */
var X_CCR_RELAY_UPSTREAM; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var X_CCR_SANDBOX_EGRESS;
var SANDBOX_EGRESS_MODES;
deferInit("chunk-he38vqx2.js:4399", () => {
  X_CCR_RELAY_UPSTREAM = "x-ccr-relay-upstream";
  X_CCR_SANDBOX_EGRESS = "x-ccr-sandbox-egress";
  SANDBOX_EGRESS_MODES = new Set(["disabled", "restricted", "unrestricted"]);
});
//@ chunk-he38vqx2.js:4508-4645 placement
function sandboxEgressOf(result) {
  if (!result.ok || result.route !== "relay" || !fromUpstream(result)) return;
  let egress = result.response.headers?.[X_CCR_SANDBOX_EGRESS];
  return typeof egress === "string" && SANDBOX_EGRESS_MODES.has(egress) ? egress : undefined;
}
//@ chunk-he38vqx2.js:4645-4682 placement
var CCR_CREDENTIAL_REFUSED_PREFIX = "forbidden: CCR agent tokens";
//@ chunk-he38vqx2.js:4682-4810 placement
function isFrameNotFoundBody(body) {
  if (typeof body === "string") return body.trim() === "not found";
  return typeof body === "object" && body !== null && body.error === "not_found";
}
//@ chunk-he38vqx2.js:4810-4878 placement
function isFrameNoVersionBody(body) {
  return typeof body === "string" && body.trim() === "no version";
}
//@ chunk-he38vqx2.js:4878-5105 placement
/**
 * 组织网络策略拒绝 artifact 存储读取/写入的服务端消息集合。
 */
var RELAY_FALLBACK_STATUSES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var STORE_READ_POLICY_DENIALS;
deferInit("chunk-he38vqx2.js:4878", () => {
  RELAY_FALLBACK_STATUSES = new Set([401, 403, 404, 413]);
  STORE_READ_POLICY_DENIALS = new Set([
    "organization network policy denies artifact storage reads for this session",
    "organization network policy could not be determined for this session; artifact storage reads denied",
  ]);
});
//@ chunk-he38vqx2.js:5105-5304 placement
var STORE_WRITE_POLICY_DENIALS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-he38vqx2.js:5105", () => {
  STORE_WRITE_POLICY_DENIALS = new Set([
    "organization network policy denies artifact storage writes for this session",
    "organization network policy could not be determined for this session; artifact storage writes denied",
  ]);
});
//@ chunk-he38vqx2.js:5304-5440 placement
function isStorePolicyDenial(body) {
  if (!body.ok || fromUpstream(body) || body.status !== 403 || typeof body.data !== "string") return false;
  let trimmed = body.data.trim();
  return (
    STORE_READ_POLICY_DENIALS.has(trimmed) || (relayIsOnlyRoute() && STORE_WRITE_POLICY_DENIALS.has(trimmed))
  );
}
//@ chunk-he38vqx2.js:5440-5534 placement
var RELAY_APPROVAL_REQUIRED_TEXT =
  "relay approval required: this change was not approved by the person for this session";
//@ chunk-he38vqx2.js:5534-5631 placement
function isRelayApprovalRequired(body) {
  return (
    body.ok &&
    !fromUpstream(body) &&
    body.status === 403 &&
    typeof body.data === "string" &&
    body.data.trim() === RELAY_APPROVAL_REQUIRED_TEXT
  );
}
//@ chunk-he38vqx2.js:5631-5962 placement
/**
 * 组织网络策略拒绝或无法确定 artifact 读取时的服务端消息集合，以及云会话网络关闭时挂载读取的说明。
 */
var READ_POLICY_DENIALS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MOUNT_NETWORK_OFF_WORDS;
deferInit("chunk-he38vqx2.js:5631", () => {
  READ_POLICY_DENIALS = new Set([
    "organization network policy denies artifact reads for this session",
    "organization network policy could not be determined for this session",
  ]);
  MOUNT_NETWORK_OFF_WORDS =
    "this cloud session's network access is turned off for the organization, or could not be confirmed, so the session gateway does not serve artifact pages or files to it";
});
//@ chunk-he38vqx2.js:5962-6074 placement
function isMountNetworkOffRefusal(status, body) {
  return (
    status === 403 &&
    body !== undefined &&
    body.byteLength <= 256 &&
    READ_POLICY_DENIALS.has(Buffer.from(body).toString("utf8").trim())
  );
}
//@ chunk-he38vqx2.js:6074-6205 placement
/**
 * 中继相关常量：直连被拒/隧道拒绝的冷却时长、探测超时与大小、记录集合，以及允许透传的请求头正则（x-frame-*、x-ccr-relay-*、accept、if-match）。
 */
var DIRECT_REFUSAL_TTL_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var RELAY_PROBE_TIMEOUT_MS;
var RELAY_PROBE_MAX_BYTES;
var weakSet;
var weakMap;
var RELAYABLE_HEADER_RE;
deferInit("chunk-he38vqx2.js:6074", () => {
  DIRECT_REFUSAL_TTL_MS = 300000;
  RELAY_PROBE_TIMEOUT_MS = 15000;
  RELAY_PROBE_MAX_BYTES = 65536;
  weakSet = new WeakSet();
  weakMap = new WeakMap();
  RELAYABLE_HEADER_RE = /^(?:x-frame-[a-z0-9-]+|x-ccr-relay-[a-z0-9-]+|accept|if-match)$/i;
});
//@ chunk-he38vqx2.js:6205-6266 placement
function filterRelayableHeaders(headers) {
  if (!headers) return headers;
  return pickByHelper(headers, (value, name) => RELAYABLE_HEADER_RE.test(name));
}
//@ chunk-he38vqx2.js:6266-7688 placement
/**
 * 通过会话中继转发 artifact 请求的路由族与具体路由表：boot/blobs/comments/subscriptions/types/type_create/db/sharing/publish/frames_external 各自的 method+path。
 */
var BOOT_RELAY_FAMILY; // deferred: uses parseRelayRoutes of its import cycle while loading; runs once the cycle is complete
var BLOBS_RELAY_FAMILY;
var COMMENTS_RELAY_FAMILY;
var SUBSCRIPTIONS_RELAY_FAMILY;
var TYPES_RELAY_FAMILY;
var TYPE_FILES_RELAY_FAMILY;
var TYPE_CREATE_RELAY_FAMILY;
var DB_RELAY_FAMILY;
var SHARING_RELAY_FAMILY;
var PUBLISH_RELAY_FAMILY;
var FRAMES_EXTERNAL_RELAY_FAMILY;
var ARTIFACTS_LISTING_RELAY_FAMILY;
var RELAY_FAMILY_SET;
var TENGU_COBALT_PLINTH_BURNET;
var SORTED_RELAY_ROUTES;
deferInit("chunk-he38vqx2.js:6266", () => {
  BOOT_RELAY_FAMILY = lit("boot");
  BLOBS_RELAY_FAMILY = lit("blobs");
  COMMENTS_RELAY_FAMILY = lit("comments");
  SUBSCRIPTIONS_RELAY_FAMILY = lit("subscriptions");
  TYPES_RELAY_FAMILY = lit("types");
  TYPE_FILES_RELAY_FAMILY = lit("type_files");
  TYPE_CREATE_RELAY_FAMILY = lit("type_create");
  DB_RELAY_FAMILY = lit("db");
  SHARING_RELAY_FAMILY = lit("sharing");
  PUBLISH_RELAY_FAMILY = lit("publish");
  FRAMES_EXTERNAL_RELAY_FAMILY = lit("frames_external");
  ARTIFACTS_LISTING_RELAY_FAMILY = lit("artifacts_listing");
  RELAY_FAMILY_SET = new Set([
    COMMENTS_RELAY_FAMILY,
    SUBSCRIPTIONS_RELAY_FAMILY,
    BOOT_RELAY_FAMILY,
    FRAMES_EXTERNAL_RELAY_FAMILY,
    TYPES_RELAY_FAMILY,
    TYPE_FILES_RELAY_FAMILY,
    TYPE_CREATE_RELAY_FAMILY,
    DB_RELAY_FAMILY,
    PUBLISH_RELAY_FAMILY,
    BLOBS_RELAY_FAMILY,
    ...[],
  ]);
  TENGU_COBALT_PLINTH_BURNET = "tengu_cobalt_plinth_burnet";
  SORTED_RELAY_ROUTES = [
    ...parseRelayRoutes(BOOT_RELAY_FAMILY, [
      "GET /{slug}",
      "GET /versions/{slug}",
      "GET /frames",
      "POST /track",
    ]),
    ...parseRelayRoutes(FRAMES_EXTERNAL_RELAY_FAMILY, ["GET /frames/external"]),
    ...parseRelayRoutes(ARTIFACTS_LISTING_RELAY_FAMILY, ["GET /artifacts"]),
    ...parseRelayRoutes(PUBLISH_RELAY_FAMILY, [
      "POST /deploy/direct",
      "POST /deploy/prepare",
      "POST /upload",
      "GET /contract/latest",
      "GET /contract/{v}",
      "GET /contract/{v}/{file}",
      "GET /contract/{v}/prompt",
      "GET /read/{slug}",
    ]),
    ...parseRelayRoutes(COMMENTS_RELAY_FAMILY, [
      "GET /comments/{slug}",
      "POST /comments/{slug}/{thread}",
      "POST /comments/{slug}/{thread}/resolve",
      "POST /comments/{slug}/{thread}/summon-status",
    ]),
    ...parseRelayRoutes(DB_RELAY_FAMILY, ["POST /db/agent"]),
    ...parseRelayRoutes(TYPES_RELAY_FAMILY, ["GET /types", "GET /types/{slug}"]),
    ...parseRelayRoutes(TYPE_CREATE_RELAY_FAMILY, ["POST /types/{slug}/create"]),
    ...parseRelayRoutes(lit("type_instances"), ["GET /types/{slug}/instances"]),
    ...parseRelayRoutes(TYPE_FILES_RELAY_FAMILY, [
      "GET /types/{slug}/files/{a}",
      "GET /types/{slug}/files/{a}/{b}",
      "GET /types/{slug}/files/{a}/{b}/{c}",
      "GET /types/{slug}/files/{a}/{b}/{c}/{d}",
      "GET /types/{slug}/files/{a}/{b}/{c}/{d}/{e}",
    ]),
    ...parseRelayRoutes(SUBSCRIPTIONS_RELAY_FAMILY, ["POST /subscribe/{slug}", "POST /unsubscribe/{slug}"]),
    ...parseRelayRoutes(lit("delete"), ["DELETE /{slug}"]),
    ...parseRelayRoutes(SHARING_RELAY_FAMILY, ["GET /perm/{slug}", "PATCH /perm/{slug}"]),
    ...parseRelayRoutes(lit("favorites"), ["POST /favorite/{slug}", "DELETE /favorite/{slug}"]),
    ...[],
  ].sort((a, b) => countPlaceholders(a) - countPlaceholders(b));
});
//@ chunk-he38vqx2.js:7688-7794 placement
function parseRelayRoutes(family, familyName) {
  return familyName.map((route) => {
    let [method, path] = route.split(" ");
    return {
      method,
      pattern: path.split("/"),
      family,
    };
  });
}
//@ chunk-he38vqx2.js:7794-7852 placement
function countPlaceholders(route) {
  return countWhere(route.pattern, (segment) => segment.startsWith("{"));
}
//@ chunk-he38vqx2.js:7852-8061 placement
function relayFamily(family, route) {
  let parts = route
    .slice(10)
    .replace(/[?#].*$/s, "")
    .split("/");
  return (
    SORTED_RELAY_ROUTES.find(
      (route) =>
        route.method === family &&
        route.pattern.length === parts.length &&
        route.pattern.every((segment, index) =>
          segment.startsWith("{") ? parts[index] !== "" : segment === parts[index],
        ),
    )?.family ?? null
  );
}
//@ chunk-he38vqx2.js:8061-8098 placement
var RUNNER_RELAY_FLAG = "tengu_cobalt_plinth_madder";
//@ chunk-he38vqx2.js:8098-8249 placement
function frameRelayActive() {
  if (!isRemoteEnvironmentAny()) return false;
  if (getFrameHostOverride() !== undefined) return false;
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_sorrel", true)) return false;
  if (!isRemoteManagedEnvironment() && !getFeatureValue_CACHED_MAY_BE_STALE(RUNNER_RELAY_FLAG, true))
    return false;
  return hasUsableRemoteSdkUrl();
}
//@ chunk-he38vqx2.js:8249-8274 placement
function relayIsOnlyRoute() {
  return isDiskless();
}
//@ chunk-he38vqx2.js:8274-8315 placement
function frameVerbRelayActive(family = null) {
  return frameRelayActive() && !isBotContextUnserved(family);
}
//@ chunk-he38vqx2.js:8315-8524 placement
function isBotContextUnserved(family) {
  if (!isActingAsBot() && !isAgentSessionWorkerRelay()) return false;
  if (family !== null && accountBotMayRelay(family)) return false;
  let frameRelay = getLiveState().frameRelay;
  if (!frameRelay.botContextNoted) {
    frameRelay.botContextNoted = true;
    logFeatureSad("artifact_frame_relay", "bot_context_not_served", {
      hosted: isRemoteManagedEnvironment(),
    });
  }
  return true;
}
//@ chunk-he38vqx2.js:8524-8558 placement
function frameRelayBinds() {
  return isRemoteManagedEnvironment() && frameRelayActive();
}
//@ chunk-he38vqx2.js:8558-8594 placement
var TENGU_COBALT_PLINTH_MEDLAR = "tengu_cobalt_plinth_medlar";
//@ chunk-he38vqx2.js:8594-8637 placement
function isAgentSessionWorkerRelay() {
  return (
    isByocEnvironment() &&
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_COBALT_PLINTH_MEDLAR, false) &&
    isAgentSessionWorker()
  );
}
//@ chunk-he38vqx2.js:8637-8692 placement
function accountlessAgentSession() {
  if (isRemoteManagedEnvironment()) return isActingAsBot() && isServiceAgentSession();
  return isAgentSessionWorkerRelay();
}
//@ chunk-he38vqx2.js:8692-8762 placement
function agentSessionMaySendDirect() {
  return (
    isRemoteEnvironmentAny() &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_fennel", false) &&
    accountlessAgentSession()
  );
}
//@ chunk-he38vqx2.js:8762-8799 placement
var TENGU_COBALT_PLINTH_COMFREY = "tengu_cobalt_plinth_comfrey";
//@ chunk-he38vqx2.js:8799-8843 placement
function runnerAgentMayReadFilesDirect() {
  return (
    isByocEnvironment() &&
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_COBALT_PLINTH_COMFREY, false) &&
    agentSessionMaySendDirect()
  );
}
//@ chunk-he38vqx2.js:8843-8899 placement
function accountBotMayRelay(family) {
  return (
    RELAY_FAMILY_SET.has(family) &&
    isRemoteManagedEnvironment() &&
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_COBALT_PLINTH_BURNET, false) &&
    isUserIngressToken()
  );
}
//@ chunk-he38vqx2.js:8899-8973 placement
function relayDeclined(family) {
  return (getLiveState().frameRelay.declinedUntil.get(family) ?? 0) > Date.now();
}
//@ chunk-he38vqx2.js:8973-9119 placement
function declineRelay(family, silent = false) {
  let frameRelay = getLiveState().frameRelay;
  let until = Date.now() + DIRECT_REFUSAL_TTL_MS;
  frameRelay.declinedUntil.set(family, until);
  if (silent) frameRelay.hopFailedUntil.set(family, until);
  else frameRelay.hopFailedUntil.delete(family);
}
//@ chunk-he38vqx2.js:9119-9195 placement
function relayHopFailed(family) {
  return (getLiveState().frameRelay.hopFailedUntil.get(family) ?? 0) > Date.now();
}
//@ chunk-he38vqx2.js:9195-9268 placement
function relayServed(family) {
  return (getLiveState().frameRelay.servedUntil.get(family) ?? 0) > Date.now();
}
//@ chunk-he38vqx2.js:9268-9383 placement
function markRelayServed(state) {
  let frameRelay = getLiveState().frameRelay;
  frameRelay.declinedUntil.delete(state);
  frameRelay.servedUntil.set(state, Date.now() + DIRECT_REFUSAL_TTL_MS);
  frameRelay.vouched.add(state);
}
//@ chunk-he38vqx2.js:9383-9437 placement
function relayVouched(state) {
  return getLiveState().frameRelay.vouched.has(state);
}
//@ chunk-he38vqx2.js:9437-9487 placement
function clearRelayVouch(state) {
  getLiveState().frameRelay.vouched.delete(state);
}
//@ chunk-he38vqx2.js:9487-9566 placement
function isDirectRefused(state) {
  return (getLiveState().frameRelay.directRefusedUntil.get(state) ?? 0) > Date.now();
}
//@ chunk-he38vqx2.js:9566-9623 placement
function isCredentialRefusal(error) {
  return error.ok && error.status === 403 && isCredentialRefusalBody(error.data);
}
//@ chunk-he38vqx2.js:9623-9696 placement
function isCredentialRefusalBody(body) {
  return typeof body === "string" && body.trimStart().startsWith(CCR_CREDENTIAL_REFUSED_PREFIX);
}
//@ chunk-he38vqx2.js:9696-9820 placement
function noteDirectRefusal(family, familyKey) {
  if (!familyKey.ok) return;
  let { directRefusedUntil } = getLiveState().frameRelay;
  if (isCredentialRefusal(familyKey)) directRefusedUntil.set(family, Date.now() + DIRECT_REFUSAL_TTL_MS);
  else directRefusedUntil.delete(family);
}
//@ chunk-he38vqx2.js:9820-9942 placement
function mountDeclinedForRunner(status) {
  if (frameRelayBinds() || !(status === 401 || status === 403 || status === 404)) return false;
  if (relayVouched(ARTIFACT_MOUNT)) {
    if (status !== 404) clearRelayVouch(ARTIFACT_MOUNT);
    return false;
  }
  declineRelay(ARTIFACT_MOUNT);
  return true;
}
//@ chunk-he38vqx2.js:9942-10017 placement
function mountHopFailedForRunner(status) {
  if (frameRelayBinds() || relayVouched(ARTIFACT_MOUNT)) return;
  if (status === undefined || status === 499) declineRelay(ARTIFACT_MOUNT, true);
}
//@ chunk-he38vqx2.js:10017-10031 placement
var alwaysTrue = () => true;
//@ chunk-he38vqx2.js:10031-10180 placement
function noteTunnelDeclined(family, status, status_2) {
  getLiveState().frameRelay.tunnelDeclinedUntil.set(family, Date.now() + DIRECT_REFUSAL_TTL_MS);
  logFeatureSad("artifact_frame_relay", "tunnel_declined", {
    family,
    cause: fromEnum(status),
    status: status_2,
  });
}
//@ chunk-he38vqx2.js:10180-10199 placement
var weakSet_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-he38vqx2.js:10180", () => {
  weakSet_2 = new WeakSet();
});
//@ chunk-he38vqx2.js:10199-10262 placement
function isFirstPartyFetchRequest(error) {
  return typeof error === "object" && error !== null && weakSet_2.has(error);
}
//@ chunk-he38vqx2.js:10262-10852 placement
async function sendRelayed(method, path, body, options, family) {
  let tunnelRoute =
    (getLiveState().frameRelay.tunnelDeclinedUntil.get(family) ?? 0) > Date.now()
      ? undefined
      : getFrameTunnelRoute();
  if (tunnelRoute !== undefined) {
    let status = 0;
    try {
      let res = await sendByMethod(method, path, body, {
        ...options,
        host: "frame",
        auth: "session-jwt",
        frameTunnel: tunnelRoute,
        maxRedirects: 0,
      });
      if (!res.ok || fromUpstream(res))
        return {
          res,
          tunnelled: true,
        };
      status = res.status;
      if (status >= 500 || status === 499) {
        noteTunnelDeclined(family, "hop_failed", status);
        return {
          res,
          tunnelled: true,
        };
      }
    } catch (error) {
      if (isCancel(error)) throw error;
      if (!isProxyOrConnectRefusal(error)) {
        noteTunnelDeclined(family, "threw", 0);
        if (typeof error === "object" && error !== null) weakSet_2.add(error);
        throw error;
      }
    }
    noteTunnelDeclined(family, status === 0 ? "never_opened" : "refused", status);
  }
  return {
    res: await sendByMethod(method, getAgentProxyFramePath(path), body, {
      ...options,
      host: "ccr-gateway",
      auth: "session-jwt",
      maxRedirects: 0,
    }),
    tunnelled: false,
  };
}
//@ chunk-he38vqx2.js:10852-11017 placement
function sendByMethod(method, path, pathArg, init) {
  switch (method) {
    case "GET":
      return apiClient.get(path, init);
    case "POST":
      return apiClient.post(path, pathArg, init);
    case "PATCH":
      return apiClient.patch(path, pathArg, init);
    case "DELETE":
      return apiClient.delete(path, pathArg, init);
  }
}
//@ chunk-he38vqx2.js:11017-11223 placement
async function withMcpFallback(direct, options) {
  let outcome = "answered";
  try {
    let answered = await direct();
    if (answered !== null)
      return {
        ...answered,
        mcpWire: outcome,
      };
    outcome = "stood_aside";
    return {
      ...(await options()),
      mcpWire: outcome,
    };
  } catch (error) {
    if (typeof error === "object" && error !== null) weakMap.set(error, outcome);
    throw error;
  }
}
//@ chunk-he38vqx2.js:11223-12093 placement
/**
 * 直连 frame 接口：可选经 MCP 线路发送（失败则回退 HTTP），否则通过带套接字错误分类与超时的 HTTP 请求；POST 带 gzip 选项时按 sendWithOptionalGzip 压缩。
 */
function sendDirect(method, path, body, options, allowMcp = true) {
  if (relayIsOnlyRoute()) throw Error("frameApi: this session may not make the direct call");
  let { recoverOAuth401, gzipBody, httpOnly, ...rest } = options;
  let requestOptions = {
    ...rest,
    host: "frame",
    auth: "claude-ai-oauth",
    maxRedirects: 0,
    validateStatus: alwaysTrue,
    ...(recoverOAuth401 &&
      !env.CLAUDE_CODE_REMOTE &&
      !env.CLAUDE_CODE_REMOTE_SESSION_ID && {
        recoverOAuth401,
      }),
  };
  let mcpRow = allowMcp && !httpOnly ? mcpRowFor(method, path) : null;
  if (mcpRow)
    return withMcpFallback(
      () => sendOverMcp(mcpRow, path, body, requestOptions, gzipBody?.onEncoding),
      () => sendDirect(method, path, body, options, false),
    );
  let { streamUpload } = rest;
  return classifyArtifactSocketError({
    isRead: method === "GET",
    wire: "http",
    signal: rest.signal,
    timeoutMs: requestOptions.timeout ?? UPLOAD_TIMEOUT_MS,
    send: (url, init) => {
      let request = {
        ...requestOptions,
        ...(url && {
          freshConnection: url,
        }),
        ...(init !== undefined && {
          timeout: init,
        }),
      };
      if (method !== "POST" || gzipBody === undefined || streamUpload === undefined)
        return sendByMethod(method, path, body, request);
      return sendWithOptionalGzip({
        url: `${frameBaseUrl()}${path}`,
        body,
        storageV5: rest.storageV5,
        signal: rest.signal,
        onEncoding: gzipBody.onEncoding,
        send: (options) =>
          options === null
            ? sendByMethod(method, path, body, request)
            : sendByMethod(method, path, options, {
                ...request,
                headers: {
                  ...request.headers,
                  ...GZIP_JSON_HEADERS,
                },
                streamUpload: {
                  ...streamUpload,
                  tailFloorMs: () => gzipBody.tailFloorMs,
                },
              }),
      });
    },
  });
}
//@ chunk-he38vqx2.js:12093-12170 placement
function artifactsApiTokenOverride() {
  return getFrameHostOverride() !== undefined ? env.CLAUDE_CODE_ARTIFACTS_API_TOKEN : undefined;
}
//@ chunk-he38vqx2.js:12170-12240 placement
function directAuthFingerprint() {
  let tokenOverride = artifactsApiTokenOverride();
  if (tokenOverride) return hashCredential(`Bearer ${tokenOverride}`);
  return claudeAiBearerDigest();
}
//@ chunk-he38vqx2.js:12240-12317 placement
async function settleDirectAuth(credentials) {
  if (!hasApiClient()) return;
  try {
    await checkAndRefreshOAuthTokenIfNeeded({
      credentials,
    });
  } catch {}
}
//@ chunk-he38vqx2.js:12317-12379 placement
function fromUpstream(upstream) {
  return upstream.ok && upstream.response.headers?.[X_CCR_RELAY_UPSTREAM] !== undefined;
}
//@ chunk-he38vqx2.js:12379-12431 placement
function isRelayFallbackStatus(status) {
  return status.ok && !fromUpstream(status) && RELAY_FALLBACK_STATUSES.has(status.status);
}
//@ chunk-he38vqx2.js:12431-12502 placement
function classifyGatewayAnswer(answer) {
  return {
    refused: isRelayFallbackStatus(answer),
    vouched: fromUpstream(answer) || (answer.ok && answer.status < 300),
  };
}
//@ chunk-he38vqx2.js:12502-12537 placement
function frameRelayOffered() {
  return frameRelayActive() && !isRemoteManagedEnvironment();
}
//@ chunk-he38vqx2.js:12537-13029 placement
/**
 * 决定一次 frame 请求走哪条路：relay（经会话网关）、direct（直连）、unsent（不应发出）或 not-served（机器人上下文不服务）；考虑中继模式、路由家族、是否只能中继、中继是否已被拒。
 */
function chooseRelayLeg(method, path, mode, relayOnCredentialRefusal = false) {
  let allowsFallback = mode !== "fallback";
  let strictRemote = mode === "strict" && isRemoteEnvironmentAny();
  let relayOnly = relayIsOnlyRoute();
  let relayActive = frameRelayActive();
  let family = relayActive ? relayFamily(method, path) : null;
  if (relayActive && isBotContextUnserved(family))
    return relayOnly || strictRemote || (mode === "only" && isRemoteManagedEnvironment())
      ? {
          leg: "not-served",
          relaying: false,
          family: null,
        }
      : {
          leg: "direct",
          relaying: false,
          family: null,
        };
  let active = relayActive;
  if (family === null)
    return {
      leg:
        relayOnly || strictRemote || (allowsFallback && isRemoteManagedEnvironment() && active)
          ? "unsent"
          : "direct",
      relaying: active,
      family,
    };
  let mayDirect =
    (mode === "fallback" || (mode === "bound" && !relayIsOnlyRouteFor(family))) &&
    !(relayOnCredentialRefusal && isRemoteManagedEnvironment() && isDirectRefused(family));
  if (
    !relayOnly &&
    relayDeclined(family) &&
    (mayDirect || (!isRemoteManagedEnvironment() && !strictRemote && relayHopFailed(family)))
  )
    return {
      leg: "direct",
      relaying: active,
      family,
    };
  return {
    leg: "relay",
    relaying: true,
    family,
  };
}
//@ chunk-he38vqx2.js:13029-13083 placement
function relayIsOnlyRouteFor(route) {
  return (
    relayIsOnlyRoute() || (isRemoteManagedEnvironment() && (route === null || !accountBotMayRelay(route)))
  );
}
//@ chunk-he38vqx2.js:13083-13208 placement
function isRelayRequired(mode, relayMode) {
  switch (mode) {
    case "strict":
      return isRemoteEnvironmentAny();
    case "only":
      return isRemoteManagedEnvironment();
    case "bound":
      return relayIsOnlyRouteFor(relayMode);
    case "fallback":
      return false;
  }
}
//@ chunk-he38vqx2.js:13208-13293 placement
function plannedRoute(route, mode, fallbackMode = "fallback") {
  return relayIsOnlyRoute() || chooseRelayLeg(route, mode, fallbackMode).leg === "relay" ? "relay" : "direct";
}
//@ chunk-he38vqx2.js:13293-16610 placement
/**
 * 发送 frame 接口请求的总入口：按路由选择直连或经中继；中继前可探测、中继不可用时按模式回退直连或返回 relay-unavailable；直连遭凭据拒绝且允许时改走中继；全程打点。
 */
async function sendFrameRequest(method, path, body, options, mode = "fallback") {
  let mustRelay = relayIsOnlyRoute() || isRelayRequired(mode, relayFamily(method, path));
  let { relayProbe, relayOnCredentialRefusal, ...options_2 } = options;
  let sendDirectOnce = async () => ({
    ...(await sendDirect(method, path, body, options_2)),
    route: "direct",
    fromFrame: true,
  });
  let leg = chooseRelayLeg(method, path, mode, relayOnCredentialRefusal);
  let isRunner = leg.relaying && !isRemoteManagedEnvironment();
  let relayFailure = (reason, status) =>
    mode === "fallback"
      ? {
          ok: false,
          reason: "no-auth",
          detail: `its artifact connection did not carry the request${status ? ` (HTTP ${status})` : ""}, so nothing was sent${reason === "relay-unavailable" ? "; one retry is safe" : ""}`,
          route: "relay",
          fromFrame: false,
        }
      : {
          ok: false,
          reason,
          status,
          route: "relay",
          fromFrame: false,
        };
  let relayUnavailable = (status, probed) => {
    logFeatureSad("artifact_frame_relay", "relay_only_unavailable", {
      ...(leg.family !== null && {
        family: leg.family,
      }),
      status,
      probed,
      ...(isRunner && {
        runner: true,
      }),
    });
    return relayFailure("relay-unavailable", status);
  };
  if (leg.leg === "not-served") return relayFailure("relay-not-served", 0);
  if (leg.leg === "unsent") return relayUnavailable(0, false);
  let directResult;
  let family;
  if (leg.leg === "relay") family = leg.family;
  else {
    let res = await sendDirectOnce();
    if (leg.family === null || !isRemoteManagedEnvironment()) return res;
    noteDirectRefusal(leg.family, res);
    if (!res.ok || !isCredentialRefusal(res)) return res;
    logFeatureSad("artifact_frame_relay", "direct_refused", {
      family: leg.family,
      status: res.status,
      reoffered: relayOnCredentialRefusal === true,
    });
    if (!relayOnCredentialRefusal) return res;
    family = leg.family;
    directResult = res;
  }
  let tunnelled = false;
  let telemetryFields = () => ({
    ...(isRunner && {
      runner: true,
    }),
    ...(tunnelled && {
      tunnel: true,
    }),
    ...(directResult !== undefined && {
      reoffered: true,
    }),
  });
  let sendDirectOrCached = async () => {
    if (directResult !== undefined) return directResult;
    let res = await sendDirectOnce();
    if (!isRunner) {
      noteDirectRefusal(family, res);
      if (res.ok && isCredentialRefusal(res))
        logFeatureSad("artifact_frame_relay", "direct_refused", {
          family,
          status: res.status,
          reoffered: false,
        });
    }
    return res;
  };
  let { refreshOAuth, isBackground, credentials, recoverOAuth401, gzipBody, httpOnly, ...restOptions } =
    options_2;
  let sendViaRelay = async (method, path, body, options) => {
    let relayed = await sendRelayed(
      method,
      path,
      body,
      {
        ...options,
        headers: filterRelayableHeaders(options.headers),
        validateStatus: alwaysTrue,
      },
      family,
    );
    tunnelled = relayed.tunnelled;
    return relayed.res;
  };
  let fallBackDirect = async (status, probed) => {
    declineRelay(family, status === 0 || status >= 500);
    if (mustRelay) return relayUnavailable(status, probed);
    let directStatus;
    try {
      let directRes = await sendDirectOrCached();
      directStatus = directRes.ok ? directRes.status : undefined;
      return {
        ...directRes,
        gatewayDeclined: status,
      };
    } finally {
      logFeatureSad("artifact_frame_relay", "relay_unavailable", {
        family,
        status,
        probed,
        ...(directStatus !== undefined && {
          direct_status: directStatus,
        }),
        ...telemetryFields(),
      });
    }
  };
  if (relayProbe !== undefined && !relayServed(family)) {
    let probeResult;
    try {
      probeResult = await sendViaRelay("GET", relayProbe, undefined, {
        signal: restOptions.signal,
        timeout: RELAY_PROBE_TIMEOUT_MS,
        maxContentLength: RELAY_PROBE_MAX_BYTES,
      });
    } catch (error) {
      if (isCancel(error)) throw error;
      tunnelled = isFirstPartyFetchRequest(error);
      return fallBackDirect(0, true);
    }
    if (!probeResult.ok) return mustRelay ? relayUnavailable(0, true) : sendDirectOrCached();
    if (isStorePolicyDenial(probeResult))
      logFeatureSad("artifact_frame_relay", "relay_policy_refused", {
        family,
        status: probeResult.status,
        probed: true,
        ...telemetryFields(),
      });
    else if (
      isRelayFallbackStatus(probeResult) ||
      (!fromUpstream(probeResult) && (probeResult.status >= 500 || probeResult.status === 499))
    )
      return fallBackDirect(probeResult.status, true);
    else if (!fromUpstream(probeResult) && probeResult.status >= 300)
      return mustRelay ? relayUnavailable(probeResult.status, true) : sendDirectOrCached();
    markRelayServed(family);
  }
  let response;
  try {
    response = await sendViaRelay(method, path, body, restOptions);
  } catch (error) {
    if (!isCancel(error)) {
      tunnelled = isFirstPartyFetchRequest(error);
      if (findProxyError(error) !== undefined) return fallBackDirect(0, false);
      declineRelay(family, true);
      logFeatureBad("artifact_frame_relay", "request_error", {
        family,
        ...telemetryFields(),
      });
      if (typeof error === "object" && error !== null) weakSet.add(error);
    }
    throw error;
  }
  if (!response.ok) return mustRelay ? relayUnavailable(0, false) : sendDirectOrCached();
  if (isStorePolicyDenial(response) || isRelayApprovalRequired(response)) {
    let needsApproval = isRelayApprovalRequired(response);
    markRelayServed(family);
    logFeatureSad("artifact_frame_relay", needsApproval ? "relay_approval_refused" : "relay_policy_refused", {
      family,
      status: response.status,
      ...telemetryFields(),
    });
    return {
      ...response,
      route: "relay",
      fromFrame: false,
      gatewayPolicy: needsApproval ? "unapproved" : "network-off",
    };
  }
  if (isRelayFallbackStatus(response)) return fallBackDirect(response.status, false);
  let fromUpstreamResponse = fromUpstream(response);
  let relaySucceeded = fromUpstreamResponse || response.status < 300;
  if (relaySucceeded) {
    markRelayServed(family);
    logFeatureOk("artifact_frame_relay", {
      family,
      status: response.status,
      upstream: fromUpstreamResponse,
      ...telemetryFields(),
    });
  } else if (response.status >= 500 || response.status === 499) {
    let retryAfterHeader =
      mode !== "fallback" && response.status === 503 ? response.response.headers?.["retry-after"] : undefined;
    let retryAfterMs = parseRetryAfterMs(typeof retryAfterHeader === "string" ? retryAfterHeader : undefined);
    if (retryAfterMs !== undefined) {
      logFeatureSad("artifact_frame_relay", "relay_busy", {
        family,
        status: response.status,
        retry_after_ms: retryAfterMs,
        ...telemetryFields(),
      });
      return {
        ...response,
        route: "relay",
        fromFrame: false,
        gatewayRetryAfterMs: retryAfterMs,
      };
    }
    declineRelay(family, true);
    logFeatureBad("artifact_frame_relay", "relay_error", {
      family,
      status: response.status,
      ...telemetryFields(),
    });
  } else
    logFeatureSad("artifact_frame_relay", "relay_refused", {
      family,
      status: response.status,
      ...telemetryFields(),
    });
  return {
    ...response,
    route: "relay",
    fromFrame: relaySucceeded,
  };
}
//@ chunk-he38vqx2.js:16610-16673 placement
function threwOnRelayLeg(error) {
  return typeof error === "object" && error !== null && weakSet.has(error);
}
//@ chunk-he38vqx2.js:16673-16803 placement
function toWireTelemetry(mcpWire) {
  switch (mcpWire) {
    case "answered":
      return lit("mcp");
    case "stood_aside":
      return lit("http_fallback");
    case undefined:
      return lit("http");
  }
}
//@ chunk-he38vqx2.js:16803-16869 placement
function wireOf(value) {
  return value.route === "relay" ? lit("relay") : toWireTelemetry(value.mcpWire);
}
//@ chunk-he38vqx2.js:16869-16970 placement
function wireOfThrow(error) {
  if (threwOnRelayLeg(error)) return lit("relay");
  return toWireTelemetry(typeof error === "object" && error !== null ? weakMap.get(error) : undefined);
}
//@ chunk-he38vqx2.js:16970-17435 placement
var frameApi = {
  get(path, options) {
    return sendFrameRequest("GET", path, undefined, options);
  },
  post(path, body, options) {
    return sendFrameRequest("POST", path, body, options);
  },
  postRelayOnly(path, body, options) {
    return sendFrameRequest("POST", path, body, options, "only");
  },
  postRelayStrict(path, body, options) {
    return sendFrameRequest("POST", path, body, options, "strict");
  },
  getRelayOnly(path, options) {
    return sendFrameRequest("GET", path, undefined, options, "only");
  },
  postRelayBound(path, body, options) {
    return sendFrameRequest("POST", path, body, options, "bound");
  },
  getRelayBound(path, options) {
    return sendFrameRequest("GET", path, undefined, options, "bound");
  },
  patchRelayOnly(path, body, options) {
    return sendFrameRequest("PATCH", path, body, options, "only");
  },
  deleteRelayOnly(path, options) {
    return sendFrameRequest("DELETE", path, undefined, options, "only");
  },
};
export {
  accountlessAgentSession,
  frameApi,
  wireOfThrow,
  wireOf,
  isCredentialRefusal,
  plannedRoute,
  isRelayUnsent,
  threwOnRelayLeg,
  isFrameNotFoundBody,
  isCredentialRefusalBody,
  runnerAgentMayReadFilesDirect,
  frameRelayBinds,
  frameRelayOffered,
  relayDeclined,
  agentSessionMaySendDirect,
  frameVerbRelayActive,
  BOOT_RELAY_FAMILY,
  mountHopFailedForRunner,
  mountDeclinedForRunner,
  isMountNetworkOffRefusal,
  MOUNT_NETWORK_OFF_WORDS,
  markRelayServed,
  relayIsOnlyRoute,
  accountBotMayRelay,
  COMMENTS_RELAY_FAMILY,
  SUBSCRIPTIONS_RELAY_FAMILY,
  frameRelayActive,
  relayFamily,
  relayHopFailed,
  RUNNER_RELAY_FLAG,
  TYPE_CREATE_RELAY_FAMILY,
  CCR_CREDENTIAL_REFUSED_PREFIX,
  BLOBS_RELAY_FAMILY,
  sendRelayed,
  relayVouched,
  declineRelay,
  classifyGatewayAnswer,
  clearRelayVouch,
  fromUpstream,
  SHARING_RELAY_FAMILY,
  sandboxEgressOf,
  isFrameNoVersionBody,
  relayServed,
  directAuthFingerprint,
  settleDirectAuth,
};
