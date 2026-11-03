/**
 * services/artifacts/frameRelay.ts
 *
 * 2.1.316 新增：Artifact frame 请求中继：经启动中继族发送请求与回包处理。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-sh3bk7pt.js (71)
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
import { count } from "../../utils/collections.js";
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

//@ chunk-sh3bk7pt.js:3791-4306 placement
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
//@ chunk-sh3bk7pt.js:4306-4399 placement
function isRelayUnsent(frameWithRetry) {
  return (
    !frameWithRetry.ok &&
    (frameWithRetry.reason === "relay-unavailable" || frameWithRetry.reason === "relay-not-served")
  );
}
//@ chunk-sh3bk7pt.js:4399-4508 placement
/**
 * 中继请求的两个头 x-ccr-relay-upstream、x-ccr-sandbox-egress 与沙箱出网档位取值。
 */
var X_CCR_RELAY_UPSTREAM = "x-ccr-relay-upstream";
var X_CCR_SANDBOX_EGRESS = "x-ccr-sandbox-egress";
var SANDBOX_EGRESS_MODES = new Set(["disabled", "restricted", "unrestricted"]);
//@ chunk-sh3bk7pt.js:4508-4645 placement
function sandboxEgressOf(e) {
  if (!e.ok || e.route !== "relay" || !fromUpstream(e)) return;
  let n = e.response.headers?.[X_CCR_SANDBOX_EGRESS];
  return typeof n === "string" && SANDBOX_EGRESS_MODES.has(n) ? n : undefined;
}
//@ chunk-sh3bk7pt.js:4645-4682 placement
var CCR_CREDENTIAL_REFUSED_PREFIX = "forbidden: CCR agent tokens";
//@ chunk-sh3bk7pt.js:4682-4810 placement
function isFrameNotFoundBody(e) {
  if (typeof e === "string") return e.trim() === "not found";
  return typeof e === "object" && e !== null && e.error === "not_found";
}
//@ chunk-sh3bk7pt.js:4810-4878 placement
function isFrameNoVersionBody(e) {
  return typeof e === "string" && e.trim() === "no version";
}
//@ chunk-sh3bk7pt.js:4878-5105 placement
/**
 * 组织网络策略拒绝 artifact 存储读取/写入的服务端消息集合。
 */
var RELAY_FALLBACK_STATUSES = new Set([401, 403, 404, 413]);
var STORE_READ_POLICY_DENIALS = new Set([
  "organization network policy denies artifact storage reads for this session",
  "organization network policy could not be determined for this session; artifact storage reads denied",
]);
//@ chunk-sh3bk7pt.js:5105-5304 placement
var STORE_WRITE_POLICY_DENIALS = new Set([
  "organization network policy denies artifact storage writes for this session",
  "organization network policy could not be determined for this session; artifact storage writes denied",
]);
//@ chunk-sh3bk7pt.js:5304-5440 placement
function isStorePolicyDenial(e) {
  if (!e.ok || fromUpstream(e) || e.status !== 403 || typeof e.data !== "string") return false;
  let trimmed = e.data.trim();
  return (
    STORE_READ_POLICY_DENIALS.has(trimmed) || (relayIsOnlyRoute() && STORE_WRITE_POLICY_DENIALS.has(trimmed))
  );
}
//@ chunk-sh3bk7pt.js:5440-5534 placement
var RELAY_APPROVAL_REQUIRED_TEXT =
  "relay approval required: this change was not approved by the person for this session";
//@ chunk-sh3bk7pt.js:5534-5631 placement
function isRelayApprovalRequired(e) {
  return (
    e.ok &&
    !fromUpstream(e) &&
    e.status === 403 &&
    typeof e.data === "string" &&
    e.data.trim() === RELAY_APPROVAL_REQUIRED_TEXT
  );
}
//@ chunk-sh3bk7pt.js:5631-5962 placement
/**
 * 组织网络策略拒绝或无法确定 artifact 读取时的服务端消息集合，以及云会话网络关闭时挂载读取的说明。
 */
var READ_POLICY_DENIALS = new Set([
  "organization network policy denies artifact reads for this session",
  "organization network policy could not be determined for this session",
]);
var MOUNT_NETWORK_OFF_WORDS =
  "this cloud session's network access is turned off for the organization, or could not be confirmed, so the session gateway does not serve artifact pages or files to it";
//@ chunk-sh3bk7pt.js:5962-6074 placement
function isMountNetworkOffRefusal(status, n) {
  return (
    status === 403 &&
    n !== undefined &&
    n.byteLength <= 256 &&
    READ_POLICY_DENIALS.has(Buffer.from(n).toString("utf8").trim())
  );
}
//@ chunk-sh3bk7pt.js:6074-6205 placement
/**
 * 中继相关常量：直连被拒/隧道拒绝的冷却时长、探测超时与大小、记录集合，以及允许透传的请求头正则（x-frame-*、x-ccr-relay-*、accept、if-match）。
 */
var DIRECT_REFUSAL_TTL_MS = 300000;
var RELAY_PROBE_TIMEOUT_MS = 15000;
var RELAY_PROBE_MAX_BYTES = 65536;
var weakSet = new WeakSet();
var weakMap = new WeakMap();
var RELAYABLE_HEADER_RE = /^(?:x-frame-[a-z0-9-]+|x-ccr-relay-[a-z0-9-]+|accept|if-match)$/i;
//@ chunk-sh3bk7pt.js:6205-6266 placement
function filterRelayableHeaders(headers) {
  if (!headers) return headers;
  return pickByHelper(headers, (n, r) => RELAYABLE_HEADER_RE.test(r));
}
//@ chunk-sh3bk7pt.js:6266-7634 placement
/**
 * 通过会话中继转发 artifact 请求的路由族与具体路由表：boot/blobs/comments/subscriptions/types/type_create/db/sharing/publish/frames_external 各自的 method+path。
 */
var BOOT_RELAY_FAMILY = lit("boot");
var BLOBS_RELAY_FAMILY = lit("blobs");
var COMMENTS_RELAY_FAMILY = lit("comments");
var SUBSCRIPTIONS_RELAY_FAMILY = lit("subscriptions");
var TYPES_RELAY_FAMILY = lit("types");
var TYPE_FILES_RELAY_FAMILY = lit("type_files");
var TYPE_CREATE_RELAY_FAMILY = lit("type_create");
var DB_RELAY_FAMILY = lit("db");
var SHARING_RELAY_FAMILY = lit("sharing");
var PUBLISH_RELAY_FAMILY = lit("publish");
var FRAMES_EXTERNAL_RELAY_FAMILY = lit("frames_external");
var RELAY_FAMILY_SET = new Set([
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
var TENGU_COBALT_PLINTH_BURNET = "tengu_cobalt_plinth_burnet";
var SORTED_RELAY_ROUTES = [
  ...parseRelayRoutes(BOOT_RELAY_FAMILY, [
    "GET /{slug}",
    "GET /versions/{slug}",
    "GET /frames",
    "POST /track",
  ]),
  ...parseRelayRoutes(FRAMES_EXTERNAL_RELAY_FAMILY, ["GET /frames/external"]),
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
].sort((e, n) => countPlaceholders(e) - countPlaceholders(n));
//@ chunk-sh3bk7pt.js:7634-7740 placement
function parseRelayRoutes(family, n) {
  return n.map((r) => {
    let [a, l] = r.split(" ");
    return {
      method: a,
      pattern: l.split("/"),
      family,
    };
  });
}
//@ chunk-sh3bk7pt.js:7740-7798 placement
function countPlaceholders(e) {
  return count(e.pattern, (n) => n.startsWith("{"));
}
//@ chunk-sh3bk7pt.js:7798-8007 placement
function relayFamily(e, n) {
  let parts = n
    .slice(10)
    .replace(/[?#].*$/s, "")
    .split("/");
  return (
    SORTED_RELAY_ROUTES.find(
      (l) =>
        l.method === e &&
        l.pattern.length === parts.length &&
        l.pattern.every((y, d) => (y.startsWith("{") ? parts[d] !== "" : y === parts[d])),
    )?.family ?? null
  );
}
//@ chunk-sh3bk7pt.js:8007-8044 placement
var RUNNER_RELAY_FLAG = "tengu_cobalt_plinth_madder";
//@ chunk-sh3bk7pt.js:8044-8195 placement
function frameRelayActive() {
  if (!isRemoteEnvironmentAny()) return false;
  if (getFrameHostOverride() !== undefined) return false;
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_sorrel", true)) return false;
  if (!isRemoteManagedEnvironment() && !getFeatureValue_CACHED_MAY_BE_STALE(RUNNER_RELAY_FLAG, true))
    return false;
  return hasUsableRemoteSdkUrl();
}
//@ chunk-sh3bk7pt.js:8195-8220 placement
function relayIsOnlyRoute() {
  return isDiskless();
}
//@ chunk-sh3bk7pt.js:8220-8261 placement
function frameVerbRelayActive(e = null) {
  return frameRelayActive() && !isBotContextUnserved(e);
}
//@ chunk-sh3bk7pt.js:8261-8470 placement
function isBotContextUnserved(e) {
  if (!isActingAsBot() && !isAgentSessionWorkerRelay()) return false;
  if (e !== null && accountBotMayRelay(e)) return false;
  let frameRelay = getLiveState().frameRelay;
  if (!frameRelay.botContextNoted) {
    frameRelay.botContextNoted = true;
    logFeatureSad("artifact_frame_relay", "bot_context_not_served", {
      hosted: isRemoteManagedEnvironment(),
    });
  }
  return true;
}
//@ chunk-sh3bk7pt.js:8470-8504 placement
function frameRelayBinds() {
  return isRemoteManagedEnvironment() && frameRelayActive();
}
//@ chunk-sh3bk7pt.js:8504-8540 placement
var TENGU_COBALT_PLINTH_MEDLAR = "tengu_cobalt_plinth_medlar";
//@ chunk-sh3bk7pt.js:8540-8583 placement
function isAgentSessionWorkerRelay() {
  return (
    isByocEnvironment() &&
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_COBALT_PLINTH_MEDLAR, false) &&
    isAgentSessionWorker()
  );
}
//@ chunk-sh3bk7pt.js:8583-8638 placement
function accountlessAgentSession() {
  if (isRemoteManagedEnvironment()) return isActingAsBot() && isServiceAgentSession();
  return isAgentSessionWorkerRelay();
}
//@ chunk-sh3bk7pt.js:8638-8708 placement
function agentSessionMaySendDirect() {
  return (
    isRemoteEnvironmentAny() &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_fennel", false) &&
    accountlessAgentSession()
  );
}
//@ chunk-sh3bk7pt.js:8708-8745 placement
var TENGU_COBALT_PLINTH_COMFREY = "tengu_cobalt_plinth_comfrey";
//@ chunk-sh3bk7pt.js:8745-8789 placement
function runnerAgentMayReadFilesDirect() {
  return (
    isByocEnvironment() &&
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_COBALT_PLINTH_COMFREY, false) &&
    agentSessionMaySendDirect()
  );
}
//@ chunk-sh3bk7pt.js:8789-8845 placement
function accountBotMayRelay(e) {
  return (
    RELAY_FAMILY_SET.has(e) &&
    isRemoteManagedEnvironment() &&
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_COBALT_PLINTH_BURNET, false) &&
    isUserIngressToken()
  );
}
//@ chunk-sh3bk7pt.js:8845-8919 placement
function relayDeclined(e) {
  return (getLiveState().frameRelay.declinedUntil.get(e) ?? 0) > Date.now();
}
//@ chunk-sh3bk7pt.js:8919-9065 placement
function declineRelay(e, n = false) {
  let frameRelay = getLiveState().frameRelay;
  let a = Date.now() + DIRECT_REFUSAL_TTL_MS;
  frameRelay.declinedUntil.set(e, a);
  if (n) frameRelay.hopFailedUntil.set(e, a);
  else frameRelay.hopFailedUntil.delete(e);
}
//@ chunk-sh3bk7pt.js:9065-9141 placement
function relayHopFailed(e) {
  return (getLiveState().frameRelay.hopFailedUntil.get(e) ?? 0) > Date.now();
}
//@ chunk-sh3bk7pt.js:9141-9214 placement
function relayServed(e) {
  return (getLiveState().frameRelay.servedUntil.get(e) ?? 0) > Date.now();
}
//@ chunk-sh3bk7pt.js:9214-9329 placement
function markRelayServed(e) {
  let frameRelay = getLiveState().frameRelay;
  frameRelay.declinedUntil.delete(e);
  frameRelay.servedUntil.set(e, Date.now() + DIRECT_REFUSAL_TTL_MS);
  frameRelay.vouched.add(e);
}
//@ chunk-sh3bk7pt.js:9329-9383 placement
function relayVouched(e) {
  return getLiveState().frameRelay.vouched.has(e);
}
//@ chunk-sh3bk7pt.js:9383-9433 placement
function clearRelayVouch(e) {
  getLiveState().frameRelay.vouched.delete(e);
}
//@ chunk-sh3bk7pt.js:9433-9512 placement
function isDirectRefused(e) {
  return (getLiveState().frameRelay.directRefusedUntil.get(e) ?? 0) > Date.now();
}
//@ chunk-sh3bk7pt.js:9512-9569 placement
function isCredentialRefusal(e) {
  return e.ok && e.status === 403 && isCredentialRefusalBody(e.data);
}
//@ chunk-sh3bk7pt.js:9569-9642 placement
function isCredentialRefusalBody(e) {
  return typeof e === "string" && e.trimStart().startsWith(CCR_CREDENTIAL_REFUSED_PREFIX);
}
//@ chunk-sh3bk7pt.js:9642-9766 placement
function noteDirectRefusal(family, n) {
  if (!n.ok) return;
  let { directRefusedUntil } = getLiveState().frameRelay;
  if (isCredentialRefusal(n)) directRefusedUntil.set(family, Date.now() + DIRECT_REFUSAL_TTL_MS);
  else directRefusedUntil.delete(family);
}
//@ chunk-sh3bk7pt.js:9766-9888 placement
function mountDeclinedForRunner(status) {
  if (frameRelayBinds() || !(status === 401 || status === 403 || status === 404)) return false;
  if (relayVouched(ARTIFACT_MOUNT)) {
    if (status !== 404) clearRelayVouch(ARTIFACT_MOUNT);
    return false;
  }
  declineRelay(ARTIFACT_MOUNT);
  return true;
}
//@ chunk-sh3bk7pt.js:9888-9963 placement
function mountHopFailedForRunner(status) {
  if (frameRelayBinds() || relayVouched(ARTIFACT_MOUNT)) return;
  if (status === undefined || status === 499) declineRelay(ARTIFACT_MOUNT, true);
}
//@ chunk-sh3bk7pt.js:9963-9977 placement
var alwaysTrue = () => true;
//@ chunk-sh3bk7pt.js:9977-10126 placement
function noteTunnelDeclined(e, n, status) {
  getLiveState().frameRelay.tunnelDeclinedUntil.set(e, Date.now() + DIRECT_REFUSAL_TTL_MS);
  logFeatureSad("artifact_frame_relay", "tunnel_declined", {
    family: e,
    cause: fromEnum(n),
    status,
  });
}
//@ chunk-sh3bk7pt.js:10126-10145 placement
var weakSet_2 = new WeakSet();
//@ chunk-sh3bk7pt.js:10145-10208 placement
function isFirstPartyFetchRequest(error) {
  return typeof error === "object" && error !== null && weakSet_2.has(error);
}
//@ chunk-sh3bk7pt.js:10208-10798 placement
async function sendRelayed(e, n, r, a, l) {
  let d =
    (getLiveState().frameRelay.tunnelDeclinedUntil.get(l) ?? 0) > Date.now()
      ? undefined
      : getFrameTunnelRoute();
  if (d !== undefined) {
    let status = 0;
    try {
      let s = await sendByMethod(e, n, r, {
        ...a,
        host: "frame",
        auth: "session-jwt",
        frameTunnel: d,
        maxRedirects: 0,
      });
      if (!s.ok || fromUpstream(s))
        return {
          res: s,
          tunnelled: true,
        };
      status = s.status;
      if (status >= 500 || status === 499) {
        noteTunnelDeclined(l, "hop_failed", status);
        return {
          res: s,
          tunnelled: true,
        };
      }
    } catch (error) {
      if (isCancel(error)) throw error;
      if (!isProxyOrConnectRefusal(error)) {
        noteTunnelDeclined(l, "threw", 0);
        if (typeof error === "object" && error !== null) weakSet_2.add(error);
        throw error;
      }
    }
    noteTunnelDeclined(l, status === 0 ? "never_opened" : "refused", status);
  }
  return {
    res: await sendByMethod(e, getAgentProxyFramePath(n), r, {
      ...a,
      host: "ccr-gateway",
      auth: "session-jwt",
      maxRedirects: 0,
    }),
    tunnelled: false,
  };
}
//@ chunk-sh3bk7pt.js:10798-10963 placement
function sendByMethod(method, path, r, a) {
  switch (method) {
    case "GET":
      return apiClient.get(path, a);
    case "POST":
      return apiClient.post(path, r, a);
    case "PATCH":
      return apiClient.patch(path, r, a);
    case "DELETE":
      return apiClient.delete(path, r, a);
  }
}
//@ chunk-sh3bk7pt.js:10963-11169 placement
async function withMcpFallback(e, n) {
  let r = "answered";
  try {
    let a = await e();
    if (a !== null)
      return {
        ...a,
        mcpWire: r,
      };
    r = "stood_aside";
    return {
      ...(await n()),
      mcpWire: r,
    };
  } catch (error) {
    if (typeof error === "object" && error !== null) weakMap.set(error, r);
    throw error;
  }
}
//@ chunk-sh3bk7pt.js:11169-12039 placement
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
  let R = allowMcp && !httpOnly ? mcpRowFor(method, path) : null;
  if (R)
    return withMcpFallback(
      () => sendOverMcp(R, path, body, requestOptions, gzipBody?.onEncoding),
      () => sendDirect(method, path, body, options, false),
    );
  let { streamUpload } = rest;
  return classifyArtifactSocketError({
    isRead: method === "GET",
    wire: "http",
    signal: rest.signal,
    timeoutMs: requestOptions.timeout ?? UPLOAD_TIMEOUT_MS,
    send: (L, P) => {
      let O = {
        ...requestOptions,
        ...(L && {
          freshConnection: L,
        }),
        ...(P !== undefined && {
          timeout: P,
        }),
      };
      if (method !== "POST" || gzipBody === undefined || streamUpload === undefined)
        return sendByMethod(method, path, body, O);
      return sendWithOptionalGzip({
        url: `${frameBaseUrl()}${path}`,
        body,
        storageV5: rest.storageV5,
        signal: rest.signal,
        onEncoding: gzipBody.onEncoding,
        send: (p) =>
          p === null
            ? sendByMethod(method, path, body, O)
            : sendByMethod(method, path, p, {
                ...O,
                headers: {
                  ...O.headers,
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
//@ chunk-sh3bk7pt.js:12039-12116 placement
function artifactsApiTokenOverride() {
  return getFrameHostOverride() !== undefined ? env.CLAUDE_CODE_ARTIFACTS_API_TOKEN : undefined;
}
//@ chunk-sh3bk7pt.js:12116-12186 placement
function directAuthFingerprint() {
  let e = artifactsApiTokenOverride();
  if (e) return hashCredential(`Bearer ${e}`);
  return claudeAiBearerDigest();
}
//@ chunk-sh3bk7pt.js:12186-12263 placement
async function settleDirectAuth(credentials) {
  if (!hasApiClient()) return;
  try {
    await checkAndRefreshOAuthTokenIfNeeded({
      credentials,
    });
  } catch {}
}
//@ chunk-sh3bk7pt.js:12263-12325 placement
function fromUpstream(e) {
  return e.ok && e.response.headers?.[X_CCR_RELAY_UPSTREAM] !== undefined;
}
//@ chunk-sh3bk7pt.js:12325-12377 placement
function isRelayFallbackStatus(e) {
  return e.ok && !fromUpstream(e) && RELAY_FALLBACK_STATUSES.has(e.status);
}
//@ chunk-sh3bk7pt.js:12377-12448 placement
function classifyGatewayAnswer(e) {
  return {
    refused: isRelayFallbackStatus(e),
    vouched: fromUpstream(e) || (e.ok && e.status < 300),
  };
}
//@ chunk-sh3bk7pt.js:12448-12483 placement
function frameRelayOffered() {
  return frameRelayActive() && !isRemoteManagedEnvironment();
}
//@ chunk-sh3bk7pt.js:12483-12975 placement
/**
 * 决定一次 frame 请求走哪条路：relay（经会话网关）、direct（直连）、unsent（不应发出）或 not-served（机器人上下文不服务）；考虑中继模式、路由家族、是否只能中继、中继是否已被拒。
 */
function chooseRelayLeg(e, n, r, relayOnCredentialRefusal = false) {
  let l = r !== "fallback";
  let y = r === "strict" && isRemoteEnvironmentAny();
  let d = relayIsOnlyRoute();
  let S = frameRelayActive();
  let u = S ? relayFamily(e, n) : null;
  if (S && isBotContextUnserved(u))
    return d || y || (r === "only" && isRemoteManagedEnvironment())
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
  let s = S;
  if (u === null)
    return {
      leg: d || y || (l && isRemoteManagedEnvironment() && s) ? "unsent" : "direct",
      relaying: s,
      family: u,
    };
  let R =
    (r === "fallback" || (r === "bound" && !relayIsOnlyRouteFor(u))) &&
    !(relayOnCredentialRefusal && isRemoteManagedEnvironment() && isDirectRefused(u));
  if (!d && relayDeclined(u) && (R || (!isRemoteManagedEnvironment() && !y && relayHopFailed(u))))
    return {
      leg: "direct",
      relaying: s,
      family: u,
    };
  return {
    leg: "relay",
    relaying: true,
    family: u,
  };
}
//@ chunk-sh3bk7pt.js:12975-13029 placement
function relayIsOnlyRouteFor(e) {
  return relayIsOnlyRoute() || (isRemoteManagedEnvironment() && (e === null || !accountBotMayRelay(e)));
}
//@ chunk-sh3bk7pt.js:13029-13154 placement
function isRelayRequired(mode, n) {
  switch (mode) {
    case "strict":
      return isRemoteEnvironmentAny();
    case "only":
      return isRemoteManagedEnvironment();
    case "bound":
      return relayIsOnlyRouteFor(n);
    case "fallback":
      return false;
  }
}
//@ chunk-sh3bk7pt.js:13154-13239 placement
function plannedRoute(e, n, r = "fallback") {
  return relayIsOnlyRoute() || chooseRelayLeg(e, n, r).leg === "relay" ? "relay" : "direct";
}
//@ chunk-sh3bk7pt.js:13239-16556 placement
/**
 * 发送 frame 接口请求的总入口：按路由选择直连或经中继；中继前可探测、中继不可用时按模式回退直连或返回 relay-unavailable；直连遭凭据拒绝且允许时改走中继；全程打点。
 */
async function sendFrameRequest(method, path, body, options, mode = "fallback") {
  let y = relayIsOnlyRoute() || isRelayRequired(mode, relayFamily(method, path));
  let { relayProbe, relayOnCredentialRefusal, ...options_2 } = options;
  let s = async () => ({
    ...(await sendDirect(method, path, body, options_2)),
    route: "direct",
    fromFrame: true,
  });
  let leg = chooseRelayLeg(method, path, mode, relayOnCredentialRefusal);
  let w = leg.relaying && !isRemoteManagedEnvironment();
  let L = (o, h) =>
    mode === "fallback"
      ? {
          ok: false,
          reason: "no-auth",
          detail: `its artifact connection did not carry the request${h ? ` (HTTP ${h})` : ""}, so nothing was sent${o === "relay-unavailable" ? "; one retry is safe" : ""}`,
          route: "relay",
          fromFrame: false,
        }
      : {
          ok: false,
          reason: o,
          status: h,
          route: "relay",
          fromFrame: false,
        };
  let P = (o, probed) => {
    logFeatureSad("artifact_frame_relay", "relay_only_unavailable", {
      ...(leg.family !== null && {
        family: leg.family,
      }),
      status: o,
      probed,
      ...(w && {
        runner: true,
      }),
    });
    return L("relay-unavailable", o);
  };
  if (leg.leg === "not-served") return L("relay-not-served", 0);
  if (leg.leg === "unsent") return P(0, false);
  let O;
  let family;
  if (leg.leg === "relay") family = leg.family;
  else {
    let o = await s();
    if (leg.family === null || !isRemoteManagedEnvironment()) return o;
    noteDirectRefusal(leg.family, o);
    if (!o.ok || !isCredentialRefusal(o)) return o;
    logFeatureSad("artifact_frame_relay", "direct_refused", {
      family: leg.family,
      status: o.status,
      reoffered: relayOnCredentialRefusal === true,
    });
    if (!relayOnCredentialRefusal) return o;
    family = leg.family;
    O = o;
  }
  let G = false;
  let x = () => ({
    ...(w && {
      runner: true,
    }),
    ...(G && {
      tunnel: true,
    }),
    ...(O !== undefined && {
      reoffered: true,
    }),
  });
  let U = async () => {
    if (O !== undefined) return O;
    let o = await s();
    if (!w) {
      noteDirectRefusal(family, o);
      if (o.ok && isCredentialRefusal(o))
        logFeatureSad("artifact_frame_relay", "direct_refused", {
          family,
          status: o.status,
          reoffered: false,
        });
    }
    return o;
  };
  let { refreshOAuth, isBackground, credentials, recoverOAuth401, gzipBody, httpOnly, ...H } = options_2;
  let V = async (o, h, D, M) => {
    let Z = await sendRelayed(
      o,
      h,
      D,
      {
        ...M,
        headers: filterRelayableHeaders(M.headers),
        validateStatus: alwaysTrue,
      },
      family,
    );
    G = Z.tunnelled;
    return Z.res;
  };
  let N = async (status, probed) => {
    declineRelay(family, status === 0 || status >= 500);
    if (y) return P(status, probed);
    let D;
    try {
      let M = await U();
      D = M.ok ? M.status : undefined;
      return {
        ...M,
        gatewayDeclined: status,
      };
    } finally {
      logFeatureSad("artifact_frame_relay", "relay_unavailable", {
        family,
        status,
        probed,
        ...(D !== undefined && {
          direct_status: D,
        }),
        ...x(),
      });
    }
  };
  if (relayProbe !== undefined && !relayServed(family)) {
    let o;
    try {
      o = await V("GET", relayProbe, undefined, {
        signal: H.signal,
        timeout: RELAY_PROBE_TIMEOUT_MS,
        maxContentLength: RELAY_PROBE_MAX_BYTES,
      });
    } catch (error) {
      if (isCancel(error)) throw error;
      G = isFirstPartyFetchRequest(error);
      return N(0, true);
    }
    if (!o.ok) return y ? P(0, true) : U();
    if (isStorePolicyDenial(o))
      logFeatureSad("artifact_frame_relay", "relay_policy_refused", {
        family,
        status: o.status,
        probed: true,
        ...x(),
      });
    else if (isRelayFallbackStatus(o) || (!fromUpstream(o) && (o.status >= 500 || o.status === 499)))
      return N(o.status, true);
    else if (!fromUpstream(o) && o.status >= 300) return y ? P(o.status, true) : U();
    markRelayServed(family);
  }
  let T;
  try {
    T = await V(method, path, body, H);
  } catch (error) {
    if (!isCancel(error)) {
      G = isFirstPartyFetchRequest(error);
      if (findProxyError(error) !== undefined) return N(0, false);
      declineRelay(family, true);
      logFeatureBad("artifact_frame_relay", "request_error", {
        family,
        ...x(),
      });
      if (typeof error === "object" && error !== null) weakSet.add(error);
    }
    throw error;
  }
  if (!T.ok) return y ? P(0, false) : U();
  if (isStorePolicyDenial(T) || isRelayApprovalRequired(T)) {
    let o = isRelayApprovalRequired(T);
    markRelayServed(family);
    logFeatureSad("artifact_frame_relay", o ? "relay_approval_refused" : "relay_policy_refused", {
      family,
      status: T.status,
      ...x(),
    });
    return {
      ...T,
      route: "relay",
      fromFrame: false,
      gatewayPolicy: o ? "unapproved" : "network-off",
    };
  }
  if (isRelayFallbackStatus(T)) return N(T.status, false);
  let q = fromUpstream(T);
  let K = q || T.status < 300;
  if (K) {
    markRelayServed(family);
    logFeatureOk("artifact_frame_relay", {
      family,
      status: T.status,
      upstream: q,
      ...x(),
    });
  } else if (T.status >= 500 || T.status === 499) {
    let o = mode !== "fallback" && T.status === 503 ? T.response.headers?.["retry-after"] : undefined;
    let retryAfterMs = parseRetryAfterMs(typeof o === "string" ? o : undefined);
    if (retryAfterMs !== undefined) {
      logFeatureSad("artifact_frame_relay", "relay_busy", {
        family,
        status: T.status,
        retry_after_ms: retryAfterMs,
        ...x(),
      });
      return {
        ...T,
        route: "relay",
        fromFrame: false,
        gatewayRetryAfterMs: retryAfterMs,
      };
    }
    declineRelay(family, true);
    logFeatureBad("artifact_frame_relay", "relay_error", {
      family,
      status: T.status,
      ...x(),
    });
  } else
    logFeatureSad("artifact_frame_relay", "relay_refused", {
      family,
      status: T.status,
      ...x(),
    });
  return {
    ...T,
    route: "relay",
    fromFrame: K,
  };
}
//@ chunk-sh3bk7pt.js:16556-16619 placement
function threwOnRelayLeg(error) {
  return typeof error === "object" && error !== null && weakSet.has(error);
}
//@ chunk-sh3bk7pt.js:16619-16749 placement
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
//@ chunk-sh3bk7pt.js:16749-16815 placement
function wireOf(e) {
  return e.route === "relay" ? lit("relay") : toWireTelemetry(e.mcpWire);
}
//@ chunk-sh3bk7pt.js:16815-16916 placement
function wireOfThrow(error) {
  if (threwOnRelayLeg(error)) return lit("relay");
  return toWireTelemetry(typeof error === "object" && error !== null ? weakMap.get(error) : undefined);
}
//@ chunk-sh3bk7pt.js:16916-17381 placement
var frameApi = {
  get(e, n) {
    return sendFrameRequest("GET", e, undefined, n);
  },
  post(e, n, r) {
    return sendFrameRequest("POST", e, n, r);
  },
  postRelayOnly(e, n, r) {
    return sendFrameRequest("POST", e, n, r, "only");
  },
  postRelayStrict(e, n, r) {
    return sendFrameRequest("POST", e, n, r, "strict");
  },
  getRelayOnly(e, n) {
    return sendFrameRequest("GET", e, undefined, n, "only");
  },
  postRelayBound(e, n, r) {
    return sendFrameRequest("POST", e, n, r, "bound");
  },
  getRelayBound(e, n) {
    return sendFrameRequest("GET", e, undefined, n, "bound");
  },
  patchRelayOnly(e, n, r) {
    return sendFrameRequest("PATCH", e, n, r, "only");
  },
  deleteRelayOnly(e, n) {
    return sendFrameRequest("DELETE", e, undefined, n, "only");
  },
};
export {
  frameApi,
  isCredentialRefusal,
  plannedRoute,
  isRelayUnsent,
  wireOf,
  wireOfThrow,
  threwOnRelayLeg,
  isFrameNotFoundBody,
  isCredentialRefusalBody,
  CCR_CREDENTIAL_REFUSED_PREFIX,
  relayIsOnlyRoute,
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
  accountBotMayRelay,
  BLOBS_RELAY_FAMILY,
  sendRelayed,
  relayVouched,
  declineRelay,
  classifyGatewayAnswer,
  clearRelayVouch,
  accountlessAgentSession,
  SUBSCRIPTIONS_RELAY_FAMILY,
  frameRelayActive,
  relayFamily,
  relayHopFailed,
  directAuthFingerprint,
  settleDirectAuth,
  COMMENTS_RELAY_FAMILY,
  fromUpstream,
  SHARING_RELAY_FAMILY,
  sandboxEgressOf,
  isFrameNoVersionBody,
  relayServed,
  RUNNER_RELAY_FLAG,
  TYPE_CREATE_RELAY_FAMILY,
};
