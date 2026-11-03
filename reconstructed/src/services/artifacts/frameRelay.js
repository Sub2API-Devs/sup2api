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
import { PEn, handleFrameGzipRejection } from "../api/gzipRequestBody.js";
import { Do } from "../../utils/git/gitSafeEnv.js";
import { lit, fromEnum } from "../analytics/safeMetadata.js";
import { count } from "../../utils/collections.js";
import { uC, mn, op } from "../../utils/remoteEnvironment.js";
import {
  getFrameHostOverride,
  apiClient,
  UPLOAD_TIMEOUT_MS,
  Tgr,
  hashCredential,
  Agr,
  hasApiClient,
} from "../routines/routinesApi.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import {
  Wwi,
  isActingAsBot,
  isAgentSessionWorker,
  isServiceAgentSession,
  isUserIngressToken,
  Kwi,
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

/**
 * 发送 frame 请求：请求体是普通对象且决定压缩时以 gzip 发送，服务端不支持压缩时回退为未压缩重发；否则直接发送。
 */
//@ chunk-sh3bk7pt.js:3791-4306 placement
async function sendWithOptionalGzip({
  url: options,
  body: body,
  storageV5: storageV5,
  signal: signal,
  send: send,
  onEncoding: onEncoding,
}) {
  if (!isPlainRecord(body)) return send(null);
  let {
    gzipped: gzipped,
    encoding: encoding,
    jsonChars: jsonChars,
  } = await gzipPublishBody({ url: options, body: body, storageV5: storageV5 });
  if (encoding !== void 0) onEncoding?.(encoding);
  if (gzipped === null || encoding === void 0) return send(null);
  PEn("frame_publish");
  let answer = await send(gzipped);
  return handleFrameGzipRejection({
    answer: answer,
    facts: toResponseFacts,
    resendIdentity: () => (
      onEncoding?.({
        json_bytes: encoding.json_bytes,
        wire_bytes: encoding.json_bytes,
        body_gzip: !1,
        gzip_fallback_status: answer.ok ? answer.status : 0,
      }),
      send(null)
    ),
    aborted: () => signal?.aborted === !0,
    bodyChars: jsonChars,
    storageV5: storageV5,
    rollout: "frame_publish",
  });
}
//@ chunk-sh3bk7pt.js:4306-4399 placement
function isRelayUnsent(e) {
  return !e.ok && (e.reason === "relay-unavailable" || e.reason === "relay-not-served");
}
//@ chunk-sh3bk7pt.js:4399-4508 placement
var X_CCR_RELAY_UPSTREAM = "x-ccr-relay-upstream",
  X_CCR_SANDBOX_EGRESS = "x-ccr-sandbox-egress",
  Ye = new Set(["disabled", "restricted", "unrestricted"]);
//@ chunk-sh3bk7pt.js:4508-4645 placement
function sandboxEgressOf(e) {
  if (!e.ok || e.route !== "relay" || !fromUpstream(e)) return;
  let n = e.response.headers?.[X_CCR_SANDBOX_EGRESS];
  return typeof n === "string" && Ye.has(n) ? n : void 0;
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
/**
 * 组织网络策略拒绝 artifact 存储读取/写入的服务端消息集合。
 */
//@ chunk-sh3bk7pt.js:4878-5105 placement
var RELAY_FALLBACK_STATUSES = new Set([401, 403, 404, 413]),
  STORE_READ_POLICY_DENIALS = new Set([
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
  if (!e.ok || fromUpstream(e) || e.status !== 403 || typeof e.data !== "string") return !1;
  let trimmed = e.data.trim();
  return (
    STORE_READ_POLICY_DENIALS.has(trimmed) || (relayIsOnlyRoute() && STORE_WRITE_POLICY_DENIALS.has(trimmed))
  );
}
//@ chunk-sh3bk7pt.js:5440-5534 placement
var We = "relay approval required: this change was not approved by the person for this session";
//@ chunk-sh3bk7pt.js:5534-5631 placement
function se(e) {
  return e.ok && !fromUpstream(e) && e.status === 403 && typeof e.data === "string" && e.data.trim() === We;
}
/**
 * 组织网络策略拒绝或无法确定 artifact 读取时的服务端消息集合，以及云会话网络关闭时挂载读取的说明。
 */
//@ chunk-sh3bk7pt.js:5631-5962 placement
var READ_POLICY_DENIALS = new Set([
    "organization network policy denies artifact reads for this session",
    "organization network policy could not be determined for this session",
  ]),
  MOUNT_NETWORK_OFF_WORDS =
    "this cloud session's network access is turned off for the organization, or could not be confirmed, so the session gateway does not serve artifact pages or files to it";
//@ chunk-sh3bk7pt.js:5962-6074 placement
function isMountNetworkOffRefusal(e, n) {
  return (
    e === 403 &&
    n !== void 0 &&
    n.byteLength <= 256 &&
    READ_POLICY_DENIALS.has(Buffer.from(n).toString("utf8").trim())
  );
}
/**
 * 中继相关常量：直连被拒/隧道拒绝的冷却时长、探测超时与大小、记录集合，以及允许透传的请求头正则（x-frame-*、x-ccr-relay-*、accept、if-match）。
 */
//@ chunk-sh3bk7pt.js:6074-6205 placement
var DIRECT_REFUSAL_TTL_MS = 300000,
  RELAY_PROBE_TIMEOUT_MS = 15000,
  RELAY_PROBE_MAX_BYTES = 65536,
  weakSet = new WeakSet(),
  weakMap = new WeakMap(),
  RELAYABLE_HEADER_RE = /^(?:x-frame-[a-z0-9-]+|x-ccr-relay-[a-z0-9-]+|accept|if-match)$/i;
//@ chunk-sh3bk7pt.js:6205-6266 placement
function qe(e) {
  if (!e) return e;
  return Do(e, (n, r) => RELAYABLE_HEADER_RE.test(r));
}
//@ chunk-sh3bk7pt.js:6266-7634 placement
var BOOT_RELAY_FAMILY = lit("boot"),
  BLOBS_RELAY_FAMILY = lit("blobs"),
  COMMENTS_RELAY_FAMILY = lit("comments"),
  SUBSCRIPTIONS_RELAY_FAMILY = lit("subscriptions"),
  ce = lit("types"),
  ye = lit("type_files"),
  TYPE_CREATE_RELAY_FAMILY = lit("type_create"),
  pe = lit("db"),
  SHARING_RELAY_FAMILY = lit("sharing"),
  me = lit("publish"),
  ge = lit("frames_external"),
  Ke = new Set([
    COMMENTS_RELAY_FAMILY,
    SUBSCRIPTIONS_RELAY_FAMILY,
    BOOT_RELAY_FAMILY,
    ge,
    ce,
    ye,
    TYPE_CREATE_RELAY_FAMILY,
    pe,
    me,
    BLOBS_RELAY_FAMILY,
    ...[],
  ]),
  TENGU_COBALT_PLINTH_BURNET = "tengu_cobalt_plinth_burnet",
  sorted = [
    ...parseRelayRoutes(BOOT_RELAY_FAMILY, [
      "GET /{slug}",
      "GET /versions/{slug}",
      "GET /frames",
      "POST /track",
    ]),
    ...parseRelayRoutes(ge, ["GET /frames/external"]),
    ...parseRelayRoutes(me, [
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
    ...parseRelayRoutes(pe, ["POST /db/agent"]),
    ...parseRelayRoutes(ce, ["GET /types", "GET /types/{slug}"]),
    ...parseRelayRoutes(TYPE_CREATE_RELAY_FAMILY, ["POST /types/{slug}/create"]),
    ...parseRelayRoutes(lit("type_instances"), ["GET /types/{slug}/instances"]),
    ...parseRelayRoutes(ye, [
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
  ].sort((e, n) => ie(e) - ie(n));
//@ chunk-sh3bk7pt.js:7634-7740 placement
function parseRelayRoutes(e, n) {
  return n.map((r) => {
    let [a, l] = r.split(" ");
    return { method: a, pattern: l.split("/"), family: e };
  });
}
//@ chunk-sh3bk7pt.js:7740-7798 placement
function ie(e) {
  return count(e.pattern, (n) => n.startsWith("{"));
}
//@ chunk-sh3bk7pt.js:7798-8007 placement
function relayFamily(e, n) {
  let parts = n
    .slice(10)
    .replace(/[?#].*$/s, "")
    .split("/");
  return (
    sorted.find(
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
  if (!uC()) return !1;
  if (getFrameHostOverride() !== void 0) return !1;
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_sorrel", !0)) return !1;
  if (!mn() && !getFeatureValue_CACHED_MAY_BE_STALE(RUNNER_RELAY_FLAG, !0)) return !1;
  return Wwi();
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
  if (!isActingAsBot() && !_e()) return !1;
  if (e !== null && accountBotMayRelay(e)) return !1;
  let frameRelay = getLiveState().frameRelay;
  if (!frameRelay.botContextNoted)
    ((frameRelay.botContextNoted = !0),
      logFeatureSad("artifact_frame_relay", "bot_context_not_served", { hosted: mn() }));
  return !0;
}
//@ chunk-sh3bk7pt.js:8470-8504 placement
function frameRelayBinds() {
  return mn() && frameRelayActive();
}
//@ chunk-sh3bk7pt.js:8504-8540 placement
var TENGU_COBALT_PLINTH_MEDLAR = "tengu_cobalt_plinth_medlar";
//@ chunk-sh3bk7pt.js:8540-8583 placement
function _e() {
  return (
    op() && getFeatureValue_CACHED_MAY_BE_STALE(TENGU_COBALT_PLINTH_MEDLAR, !1) && isAgentSessionWorker()
  );
}
//@ chunk-sh3bk7pt.js:8583-8638 placement
function accountlessAgentSession() {
  if (mn()) return isActingAsBot() && isServiceAgentSession();
  return _e();
}
//@ chunk-sh3bk7pt.js:8638-8708 placement
function agentSessionMaySendDirect() {
  return (
    uC() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_fennel", !1) && accountlessAgentSession()
  );
}
//@ chunk-sh3bk7pt.js:8708-8745 placement
var TENGU_COBALT_PLINTH_COMFREY = "tengu_cobalt_plinth_comfrey";
//@ chunk-sh3bk7pt.js:8745-8789 placement
function runnerAgentMayReadFilesDirect() {
  return (
    op() &&
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_COBALT_PLINTH_COMFREY, !1) &&
    agentSessionMaySendDirect()
  );
}
//@ chunk-sh3bk7pt.js:8789-8845 placement
function accountBotMayRelay(e) {
  return (
    Ke.has(e) &&
    mn() &&
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_COBALT_PLINTH_BURNET, !1) &&
    isUserIngressToken()
  );
}
//@ chunk-sh3bk7pt.js:8845-8919 placement
function relayDeclined(e) {
  return (getLiveState().frameRelay.declinedUntil.get(e) ?? 0) > Date.now();
}
//@ chunk-sh3bk7pt.js:8919-9065 placement
function declineRelay(e, n = !1) {
  let frameRelay = getLiveState().frameRelay,
    a = Date.now() + DIRECT_REFUSAL_TTL_MS;
  if ((frameRelay.declinedUntil.set(e, a), n)) frameRelay.hopFailedUntil.set(e, a);
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
  (frameRelay.declinedUntil.delete(e),
    frameRelay.servedUntil.set(e, Date.now() + DIRECT_REFUSAL_TTL_MS),
    frameRelay.vouched.add(e));
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
function tt(e) {
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
function noteDirectRefusal(e, n) {
  if (!n.ok) return;
  let { directRefusedUntil: directRefusedUntil } = getLiveState().frameRelay;
  if (isCredentialRefusal(n)) directRefusedUntil.set(e, Date.now() + DIRECT_REFUSAL_TTL_MS);
  else directRefusedUntil.delete(e);
}
//@ chunk-sh3bk7pt.js:9766-9888 placement
function mountDeclinedForRunner(e) {
  if (frameRelayBinds() || !(e === 401 || e === 403 || e === 404)) return !1;
  if (relayVouched(ARTIFACT_MOUNT)) {
    if (e !== 404) clearRelayVouch(ARTIFACT_MOUNT);
    return !1;
  }
  return (declineRelay(ARTIFACT_MOUNT), !0);
}
//@ chunk-sh3bk7pt.js:9888-9963 placement
function mountHopFailedForRunner(e) {
  if (frameRelayBinds() || relayVouched(ARTIFACT_MOUNT)) return;
  if (e === void 0 || e === 499) declineRelay(ARTIFACT_MOUNT, !0);
}
//@ chunk-sh3bk7pt.js:9963-9977 placement
var be = () => !0;
//@ chunk-sh3bk7pt.js:9977-10126 placement
function noteTunnelDeclined(e, n, r) {
  (getLiveState().frameRelay.tunnelDeclinedUntil.set(e, Date.now() + DIRECT_REFUSAL_TTL_MS),
    logFeatureSad("artifact_frame_relay", "tunnel_declined", { family: e, cause: fromEnum(n), status: r }));
}
//@ chunk-sh3bk7pt.js:10126-10145 placement
var weakSet_2 = new WeakSet();
//@ chunk-sh3bk7pt.js:10145-10208 placement
function ue(e) {
  return typeof e === "object" && e !== null && weakSet_2.has(e);
}
//@ chunk-sh3bk7pt.js:10208-10798 placement
async function sendRelayed(e, n, r, a, l) {
  let d =
    (getLiveState().frameRelay.tunnelDeclinedUntil.get(l) ?? 0) > Date.now() ? void 0 : getFrameTunnelRoute();
  if (d !== void 0) {
    let u = 0;
    try {
      let s = await sendByMethod(e, n, r, {
        ...a,
        host: "frame",
        auth: "session-jwt",
        frameTunnel: d,
        maxRedirects: 0,
      });
      if (!s.ok || fromUpstream(s)) return { res: s, tunnelled: !0 };
      if (((u = s.status), u >= 500 || u === 499))
        return (noteTunnelDeclined(l, "hop_failed", u), { res: s, tunnelled: !0 });
    } catch (error) {
      if (isCancel(error)) throw error;
      if (!isProxyOrConnectRefusal(error)) {
        if ((noteTunnelDeclined(l, "threw", 0), typeof error === "object" && error !== null))
          weakSet_2.add(error);
        throw error;
      }
    }
    noteTunnelDeclined(l, u === 0 ? "never_opened" : "refused", u);
  }
  return {
    res: await sendByMethod(e, Kwi(n), r, {
      ...a,
      host: "ccr-gateway",
      auth: "session-jwt",
      maxRedirects: 0,
    }),
    tunnelled: !1,
  };
}
//@ chunk-sh3bk7pt.js:10798-10963 placement
function sendByMethod(e, n, r, a) {
  switch (e) {
    case "GET":
      return apiClient.get(n, a);
    case "POST":
      return apiClient.post(n, r, a);
    case "PATCH":
      return apiClient.patch(n, r, a);
    case "DELETE":
      return apiClient.delete(n, r, a);
  }
}
//@ chunk-sh3bk7pt.js:10963-11169 placement
async function withMcpFallback(e, n) {
  let r = "answered";
  try {
    let a = await e();
    if (a !== null) return { ...a, mcpWire: r };
    return ((r = "stood_aside"), { ...(await n()), mcpWire: r });
  } catch (error) {
    if (typeof error === "object" && error !== null) weakMap.set(error, r);
    throw error;
  }
}
/**
 * 直连 frame 接口：可选经 MCP 线路发送（失败则回退 HTTP），否则通过带套接字错误分类与超时的 HTTP 请求；POST 带 gzip 选项时按 sendWithOptionalGzip 压缩。
 */
//@ chunk-sh3bk7pt.js:11169-12039 placement
function sendDirect(method, path, body, options, allowMcp = !0) {
  if (relayIsOnlyRoute()) throw Error("frameApi: this session may not make the direct call");
  let { recoverOAuth401: recoverOAuth401, gzipBody: gzipBody, httpOnly: httpOnly, ...rest } = options,
    requestOptions = {
      ...rest,
      host: "frame",
      auth: "claude-ai-oauth",
      maxRedirects: 0,
      validateStatus: be,
      ...(recoverOAuth401 &&
        !env.CLAUDE_CODE_REMOTE &&
        !env.CLAUDE_CODE_REMOTE_SESSION_ID && { recoverOAuth401: recoverOAuth401 }),
    },
    R = allowMcp && !httpOnly ? mcpRowFor(method, path) : null;
  if (R)
    return withMcpFallback(
      () => sendOverMcp(R, path, body, requestOptions, gzipBody?.onEncoding),
      () => sendDirect(method, path, body, options, !1),
    );
  let { streamUpload: streamUpload } = rest;
  return classifyArtifactSocketError({
    isRead: method === "GET",
    wire: "http",
    signal: rest.signal,
    timeoutMs: requestOptions.timeout ?? UPLOAD_TIMEOUT_MS,
    send: (L, P) => {
      let O = { ...requestOptions, ...(L && { freshConnection: L }), ...(P !== void 0 && { timeout: P }) };
      if (method !== "POST" || gzipBody === void 0 || streamUpload === void 0)
        return sendByMethod(method, path, body, O);
      return sendWithOptionalGzip({
        url: `${Tgr()}${path}`,
        body: body,
        storageV5: rest.storageV5,
        signal: rest.signal,
        onEncoding: gzipBody.onEncoding,
        send: (p) =>
          p === null
            ? sendByMethod(method, path, body, O)
            : sendByMethod(method, path, p, {
                ...O,
                headers: { ...O.headers, ...GZIP_JSON_HEADERS },
                streamUpload: { ...streamUpload, tailFloorMs: () => gzipBody.tailFloorMs },
              }),
      });
    },
  });
}
//@ chunk-sh3bk7pt.js:12039-12116 placement
function rt() {
  return getFrameHostOverride() !== void 0 ? env.CLAUDE_CODE_ARTIFACTS_API_TOKEN : void 0;
}
//@ chunk-sh3bk7pt.js:12116-12186 placement
function directAuthFingerprint() {
  let e = rt();
  if (e) return hashCredential(`Bearer ${e}`);
  return Agr();
}
//@ chunk-sh3bk7pt.js:12186-12263 placement
async function settleDirectAuth(e) {
  if (!hasApiClient()) return;
  try {
    await checkAndRefreshOAuthTokenIfNeeded({ credentials: e });
  } catch {}
}
//@ chunk-sh3bk7pt.js:12263-12325 placement
function fromUpstream(e) {
  return e.ok && e.response.headers?.[X_CCR_RELAY_UPSTREAM] !== void 0;
}
//@ chunk-sh3bk7pt.js:12325-12377 placement
function j(e) {
  return e.ok && !fromUpstream(e) && RELAY_FALLBACK_STATUSES.has(e.status);
}
//@ chunk-sh3bk7pt.js:12377-12448 placement
function classifyGatewayAnswer(e) {
  return { refused: j(e), vouched: fromUpstream(e) || (e.ok && e.status < 300) };
}
//@ chunk-sh3bk7pt.js:12448-12483 placement
function frameRelayOffered() {
  return frameRelayActive() && !mn();
}
/**
 * 决定一次 frame 请求走哪条路：relay（经会话网关）、direct（直连）、unsent（不应发出）或 not-served（机器人上下文不服务）；考虑中继模式、路由家族、是否只能中继、中继是否已被拒。
 */
//@ chunk-sh3bk7pt.js:12483-12975 placement
function chooseRelayLeg(e, n, r, a = !1) {
  let l = r !== "fallback",
    y = r === "strict" && uC(),
    d = relayIsOnlyRoute(),
    S = frameRelayActive(),
    u = S ? relayFamily(e, n) : null;
  if (S && isBotContextUnserved(u))
    return d || y || (r === "only" && mn())
      ? { leg: "not-served", relaying: !1, family: null }
      : { leg: "direct", relaying: !1, family: null };
  let s = S;
  if (u === null) return { leg: d || y || (l && mn() && s) ? "unsent" : "direct", relaying: s, family: u };
  let R = (r === "fallback" || (r === "bound" && !Ee(u))) && !(a && mn() && tt(u));
  if (!d && relayDeclined(u) && (R || (!mn() && !y && relayHopFailed(u))))
    return { leg: "direct", relaying: s, family: u };
  return { leg: "relay", relaying: !0, family: u };
}
//@ chunk-sh3bk7pt.js:12975-13029 placement
function Ee(e) {
  return relayIsOnlyRoute() || (mn() && (e === null || !accountBotMayRelay(e)));
}
//@ chunk-sh3bk7pt.js:13029-13154 placement
function isRelayRequired(e, n) {
  switch (e) {
    case "strict":
      return uC();
    case "only":
      return mn();
    case "bound":
      return Ee(n);
    case "fallback":
      return !1;
  }
}
//@ chunk-sh3bk7pt.js:13154-13239 placement
function plannedRoute(e, n, r = "fallback") {
  return relayIsOnlyRoute() || chooseRelayLeg(e, n, r).leg === "relay" ? "relay" : "direct";
}
/**
 * 发送 frame 接口请求的总入口：按路由选择直连或经中继；中继前可探测、中继不可用时按模式回退直连或返回 relay-unavailable；直连遭凭据拒绝且允许时改走中继；全程打点。
 */
//@ chunk-sh3bk7pt.js:13239-16556 placement
async function sendFrameRequest(method, path, body, options, mode = "fallback") {
  let y = relayIsOnlyRoute() || isRelayRequired(mode, relayFamily(method, path)),
    { relayProbe: relayProbe, relayOnCredentialRefusal: relayOnCredentialRefusal, ...u } = options,
    s = async () => ({ ...(await sendDirect(method, path, body, u)), route: "direct", fromFrame: !0 }),
    leg = chooseRelayLeg(method, path, mode, relayOnCredentialRefusal),
    w = leg.relaying && !mn(),
    L = (o, h) =>
      mode === "fallback"
        ? {
            ok: !1,
            reason: "no-auth",
            detail: `its artifact connection did not carry the request${h ? ` (HTTP ${h})` : ""}, so nothing was sent${o === "relay-unavailable" ? "; one retry is safe" : ""}`,
            route: "relay",
            fromFrame: !1,
          }
        : { ok: !1, reason: o, status: h, route: "relay", fromFrame: !1 },
    P = (o, h) => (
      logFeatureSad("artifact_frame_relay", "relay_only_unavailable", {
        ...(leg.family !== null && { family: leg.family }),
        status: o,
        probed: h,
        ...(w && { runner: !0 }),
      }),
      L("relay-unavailable", o)
    );
  if (leg.leg === "not-served") return L("relay-not-served", 0);
  if (leg.leg === "unsent") return P(0, !1);
  let O, family;
  if (leg.leg === "relay") family = leg.family;
  else {
    let o = await s();
    if (leg.family === null || !mn()) return o;
    if ((noteDirectRefusal(leg.family, o), !o.ok || !isCredentialRefusal(o))) return o;
    if (
      (logFeatureSad("artifact_frame_relay", "direct_refused", {
        family: leg.family,
        status: o.status,
        reoffered: relayOnCredentialRefusal === !0,
      }),
      !relayOnCredentialRefusal)
    )
      return o;
    ((family = leg.family), (O = o));
  }
  let G = !1,
    x = () => ({
      ...(w && { runner: !0 }),
      ...(G && { tunnel: !0 }),
      ...(O !== void 0 && { reoffered: !0 }),
    }),
    U = async () => {
      if (O !== void 0) return O;
      let o = await s();
      if (!w) {
        if ((noteDirectRefusal(family, o), o.ok && isCredentialRefusal(o)))
          logFeatureSad("artifact_frame_relay", "direct_refused", {
            family: family,
            status: o.status,
            reoffered: !1,
          });
      }
      return o;
    },
    {
      refreshOAuth: refreshOAuth,
      isBackground: isBackground,
      credentials: credentials,
      recoverOAuth401: recoverOAuth401,
      gzipBody: gzipBody,
      httpOnly: httpOnly,
      ...H
    } = u,
    V = async (o, h, D, M) => {
      let Z = await sendRelayed(o, h, D, { ...M, headers: qe(M.headers), validateStatus: be }, family);
      return ((G = Z.tunnelled), Z.res);
    },
    N = async (o, h) => {
      if ((declineRelay(family, o === 0 || o >= 500), y)) return P(o, h);
      let D;
      try {
        let M = await U();
        return ((D = M.ok ? M.status : void 0), { ...M, gatewayDeclined: o });
      } finally {
        logFeatureSad("artifact_frame_relay", "relay_unavailable", {
          family: family,
          status: o,
          probed: h,
          ...(D !== void 0 && { direct_status: D }),
          ...x(),
        });
      }
    };
  if (relayProbe !== void 0 && !relayServed(family)) {
    let o;
    try {
      o = await V("GET", relayProbe, void 0, {
        signal: H.signal,
        timeout: RELAY_PROBE_TIMEOUT_MS,
        maxContentLength: RELAY_PROBE_MAX_BYTES,
      });
    } catch (error) {
      if (isCancel(error)) throw error;
      return ((G = ue(error)), N(0, !0));
    }
    if (!o.ok) return y ? P(0, !0) : U();
    if (isStorePolicyDenial(o))
      logFeatureSad("artifact_frame_relay", "relay_policy_refused", {
        family: family,
        status: o.status,
        probed: !0,
        ...x(),
      });
    else if (j(o) || (!fromUpstream(o) && (o.status >= 500 || o.status === 499))) return N(o.status, !0);
    else if (!fromUpstream(o) && o.status >= 300) return y ? P(o.status, !0) : U();
    markRelayServed(family);
  }
  let T;
  try {
    T = await V(method, path, body, H);
  } catch (error) {
    if (!isCancel(error)) {
      if (((G = ue(error)), findProxyError(error) !== void 0)) return N(0, !1);
      if (
        (declineRelay(family, !0),
        logFeatureBad("artifact_frame_relay", "request_error", { family: family, ...x() }),
        typeof error === "object" && error !== null)
      )
        weakSet.add(error);
    }
    throw error;
  }
  if (!T.ok) return y ? P(0, !1) : U();
  if (isStorePolicyDenial(T) || se(T)) {
    let o = se(T);
    return (
      markRelayServed(family),
      logFeatureSad("artifact_frame_relay", o ? "relay_approval_refused" : "relay_policy_refused", {
        family: family,
        status: T.status,
        ...x(),
      }),
      { ...T, route: "relay", fromFrame: !1, gatewayPolicy: o ? "unapproved" : "network-off" }
    );
  }
  if (j(T)) return N(T.status, !1);
  let q = fromUpstream(T),
    K = q || T.status < 300;
  if (K)
    (markRelayServed(family),
      logFeatureOk("artifact_frame_relay", { family: family, status: T.status, upstream: q, ...x() }));
  else if (T.status >= 500 || T.status === 499) {
    let o = mode !== "fallback" && T.status === 503 ? T.response.headers?.["retry-after"] : void 0,
      h = parseRetryAfterMs(typeof o === "string" ? o : void 0);
    if (h !== void 0)
      return (
        logFeatureSad("artifact_frame_relay", "relay_busy", {
          family: family,
          status: T.status,
          retry_after_ms: h,
          ...x(),
        }),
        { ...T, route: "relay", fromFrame: !1, gatewayRetryAfterMs: h }
      );
    (declineRelay(family, !0),
      logFeatureBad("artifact_frame_relay", "relay_error", { family: family, status: T.status, ...x() }));
  } else logFeatureSad("artifact_frame_relay", "relay_refused", { family: family, status: T.status, ...x() });
  return { ...T, route: "relay", fromFrame: K };
}
//@ chunk-sh3bk7pt.js:16556-16619 placement
function threwOnRelayLeg(e) {
  return typeof e === "object" && e !== null && weakSet.has(e);
}
//@ chunk-sh3bk7pt.js:16619-16749 placement
function toWireTelemetry(e) {
  switch (e) {
    case "answered":
      return lit("mcp");
    case "stood_aside":
      return lit("http_fallback");
    case void 0:
      return lit("http");
  }
}
//@ chunk-sh3bk7pt.js:16749-16815 placement
function wireOf(e) {
  return e.route === "relay" ? lit("relay") : toWireTelemetry(e.mcpWire);
}
//@ chunk-sh3bk7pt.js:16815-16916 placement
function wireOfThrow(e) {
  if (threwOnRelayLeg(e)) return lit("relay");
  return toWireTelemetry(typeof e === "object" && e !== null ? weakMap.get(e) : void 0);
}
//@ chunk-sh3bk7pt.js:16916-17381 placement
var frameApi = {
  get(e, n) {
    return sendFrameRequest("GET", e, void 0, n);
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
    return sendFrameRequest("GET", e, void 0, n, "only");
  },
  postRelayBound(e, n, r) {
    return sendFrameRequest("POST", e, n, r, "bound");
  },
  getRelayBound(e, n) {
    return sendFrameRequest("GET", e, void 0, n, "bound");
  },
  patchRelayOnly(e, n, r) {
    return sendFrameRequest("PATCH", e, n, r, "only");
  },
  deleteRelayOnly(e, n) {
    return sendFrameRequest("DELETE", e, void 0, n, "only");
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
