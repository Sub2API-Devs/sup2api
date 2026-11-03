/**
 * services/api/gzipRequestBody.ts
 *
 * 2.1.316 新增：API 请求体 gzip 压缩：按大小与开关决定是否压缩并设置头。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hwmsct5x.js (17), chunk-nmregrje.js (39), chunk-rbe666af.js (23)
 * attribution: placement 78, affinity 1
 */
import { deflateRawSync, inflateRawSync, deflateRaw, inflateRaw, constants, gunzip } from "zlib";
import { promisify } from "util";
import { env } from "../../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { getUsableProxyUrl, shouldBypassProxy } from "../../utils/proxy.js";
import { getMTLSConfig } from "../../utils/mtls.js";
import { getLatchedPreSettingsEnvSnapshot } from "../../utils/managedEnvApply.js";
import { mn } from "../../utils/remoteEnvironment.js";
import { Ws } from "./streamFallbackWarning.js";
import { isFirstPartyAnthropicHost } from "../../utils/model/providers.js";
import { alwaysTrue, jsonParse } from "../../utils/slowOperations.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, T, o, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";
import { ANT_KEY_PFX } from "../teamMemorySync/secretScanner.js";
import { appendWatermark, Iki } from "../analytics/eventSerialization.js";
import { put } from "../../utils/truncateGraphemes.js";
import { getErrnoCode, sanitizeErrnoForTelemetry } from "../../utils/errors.js";
import { pMap } from "../../../vendor/p-map/index.js";
import { requestMethodAndUrl } from "../../utils/testNetworkGuard.js";
import { Aa } from "../../utils/sleep.js";
import { CLIENT_REQUEST_ID_HEADER } from "./client.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { logError } from "../../utils/log.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { Ot } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { getRootSession } from "../../bootstrap/state.js";
import { modelApiFetch, Wb } from "./clientHelpers.js";

//@ chunk-nmregrje.js:685-772 placement
var TENGU_GENTLE_HAMMOCK = "tengu_gentle_hammock",
  TENGU_GOLDEN_POPCORN = "tengu_golden_popcorn",
  M = 4096,
  N = 1024,
  U = 604800000,
  W = 8192;
/**
 * 读取 gzip 压缩等级覆盖值（环境变量或开关，1–9 有效）。
 */
//@ chunk-nmregrje.js:772-887 placement
function gzipLevelOverride() {
  let e =
    env.CLAUDE_CODE_GZIP_REQUEST_BODY_LEVEL ?? getFeatureValue_CACHED_MAY_BE_STALE(TENGU_GOLDEN_POPCORN, 0);
  return Number.isInteger(e) && e >= 1 && e <= 9 ? e : void 0;
}
//@ chunk-nmregrje.js:887-997 placement
function gzipEnvSwitch(e) {
  return e === "ccr_worker" ? env.CLAUDE_CODE_GZIP_CCR_REQUEST_BODIES : env.CLAUDE_CODE_GZIP_REQUEST_BODIES;
}
//@ chunk-nmregrje.js:997-1039 placement
function H(e) {
  return e === "ccr_worker" ? N : M;
}
/**
 * 判断当前传输方式是否会阻碍请求体 gzip：Unix socket、代理、mTLS 或自定义 CA。
 */
//@ chunk-nmregrje.js:1039-1361 placement
function gzipBlockingTransport(e) {
  if (env.ANTHROPIC_UNIX_SOCKET) return "unix_socket";
  if (getUsableProxyUrl() !== void 0 && !shouldBypassProxy(e)) return "proxy";
  let n = getMTLSConfig();
  if (n?.cert !== void 0 || n?.key !== void 0) return "mtls";
  if (env.NODE_EXTRA_CA_CERTS) {
    let r = getLatchedPreSettingsEnvSnapshot();
    if (!(
      mn() ||
      (env.CLAUDE_CODE_ENTRYPOINT === "local-agent" && (r === void 0 || r.NODE_EXTRA_CA_CERTS !== void 0))
    ))
      return "custom_ca";
  }
  return;
}
//@ chunk-nmregrje.js:1361-1456 placement
function Ast(e) {
  return Buffer.isBuffer(e) && Ws().gzipRequestBody.serialisedBodies.has(e.buffer);
}
//@ chunk-nmregrje.js:1456-1555 placement
function x(e) {
  return Buffer.isBuffer(e) ? Ws().gzipRequestBody.serialisedBodies.get(e.buffer) : void 0;
}
/**
 * 生成请求体复用遥测字段：复用的字符数与是否与 SDK 序列化结果核对过。
 */
//@ chunk-nmregrje.js:1555-1677 placement
function reuseTelemetry(e) {
  let n = x(e);
  return n === void 0 ? {} : { requestBodyReusedChars: n.keptChars, requestBodyComparedWithSdk: n.checked };
}
//@ chunk-nmregrje.js:1677-1741 affinity
function Dir(e) {
  return typeof e === "string" ? e.length : x(e)?.chars;
}
//@ chunk-nmregrje.js:1805-1857 placement
function zci(e, n, r) {
  return isFirstPartyAnthropicHost(e) && decideGzip(e, 1 / 0, n, r).gzip;
}
/**
 * 判定请求体是否 gzip：env 关闭、非 Bun、非字符串、太小时不压；env 强开时只看本进程是否被拒过；unix socket/代理/mTLS/自定义 CA 时不压；ccr_worker 需开关；已锁存关闭时不压。返回 {gzip, reason, bodyChars}。
 */
//@ chunk-nmregrje.js:1857-2481 placement
function decideGzip(url, bodyChars, storage, rollout) {
  let d = gzipEnvSwitch(rollout);
  if (d === !1) return { gzip: !1, reason: "env_off", bodyChars: bodyChars };
  if (!alwaysTrue()) return { gzip: !1, reason: "not_bun_runtime", bodyChars: bodyChars };
  if (bodyChars === void 0) return { gzip: !1, reason: "non_string_body", bodyChars: bodyChars };
  if (bodyChars < H(rollout)) return { gzip: !1, reason: "below_min_size", bodyChars: bodyChars };
  if (d === !0)
    return Ws().gzipRequestBody.rejectedThisProcess
      ? { gzip: !1, reason: "latched_off", bodyChars: bodyChars }
      : { gzip: !0, bodyChars: bodyChars };
  let l = gzipBlockingTransport(url);
  if (l !== void 0) return { gzip: !1, reason: l, bodyChars: bodyChars };
  if (rollout === "ccr_worker" && !getFeatureValue_CACHED_MAY_BE_STALE(TENGU_GENTLE_HAMMOCK, !1))
    return { gzip: !1, reason: "flag_off", bodyChars: bodyChars };
  if (isGzipLatchedOff(storage)) return { gzip: !1, reason: "latched_off", bodyChars: bodyChars };
  return { gzip: !0, bodyChars: bodyChars };
}
/**
 * gzip 请求体相关的结构与常量：API 错误结构、闩锁记录、拒绝原因、表示服务端无法解析 JSON 的消息与正则。
 */
//@ chunk-nmregrje.js:2481-2824 placement
var API_ERROR_SCHEMA = DoctorLazy(() => u({ type: T("error"), error: u({ type: o(), message: o() }) })),
  LATCH_SCHEMA = DoctorLazy(() => u({ latchedAt: E().finite(), status: E() })),
  PROXY_ERROR_SCHEMA = DoctorLazy(() => u({ error: o(), reason: o() })),
  INVALID_JSON_MESSAGES = [
    "The request body is not valid JSON",
    "Failed to parse request: could not parse request body as JSON",
  ],
  BAD_JSON_PATTERN = /^bad json: (?:invalid character |unexpected EOF$|unexpected end of JSON input$|EOF$)/;
//@ chunk-nmregrje.js:2824-2917 placement
function q(e) {
  return { status: e.status, header: (n) => e.headers.get(n) ?? void 0, bodyText: () => readBodyPrefix(e) };
}
//@ chunk-nmregrje.js:2917-3015 placement
function Z(e) {
  return (e.header("request-id")?.startsWith("req_") ?? !1) || e.header("cf-ray") !== void 0;
}
//@ chunk-nmregrje.js:3015-3291 placement
async function readBodyPrefix(e) {
  let n = e.clone().body?.getReader();
  if (!n) return "";
  let textDecoder = new TextDecoder(),
    s = "",
    d = W;
  try {
    while (d > 0) {
      let { done: l, value: y } = await n.read();
      if (l) break;
      let chunk = y.subarray(0, d);
      ((d -= chunk.byteLength), (s += textDecoder.decode(chunk, { stream: !0 })));
    }
  } catch {
  } finally {
    n.cancel().catch(() => {});
  }
  return s;
}
//@ chunk-nmregrje.js:3291-3537 placement
function isInvalidJsonRejection(e) {
  let n;
  try {
    n = jsonParse(e);
  } catch {
    return BAD_JSON_PATTERN.test(e.trimEnd());
  }
  let safeParse = API_ERROR_SCHEMA().safeParse(n);
  if (safeParse.success) return INVALID_JSON_MESSAGES.some((d) => safeParse.data.error.message.startsWith(d));
  let safeParse_2 = PROXY_ERROR_SCHEMA().safeParse(n);
  return (
    safeParse_2.success &&
    safeParse_2.data.reason === "bad_json" &&
    BAD_JSON_PATTERN.test(safeParse_2.data.error)
  );
}
//@ chunk-nmregrje.js:3537-3744 placement
async function classifyGzipRejection(e) {
  if (e.status !== 400 && e.status !== 403 && e.status !== 415) return null;
  if (!Z(e)) return "non_anthropic_rejection";
  if (e.status === 400 && isInvalidJsonRejection(await e.bodyText())) return "invalid_json_at_origin";
  return null;
}
//@ chunk-nmregrje.js:3744-3801 placement
async function JXo(e) {
  if (e.ok) return null;
  return classifyGzipRejection(q(e));
}
//@ chunk-nmregrje.js:3801-3950 placement
async function classifyResend(e) {
  if ((await classifyGzipRejection(e)) !== null) return "same_rejection";
  return e.header("request-id")?.startsWith("req_") ? "api_response" : "not_api_response";
}
//@ chunk-nmregrje.js:3950-4115 placement
function readPersistedLatch() {
  let e;
  try {
    e = getGlobalConfig().gzipRequestBodiesLatchedOff;
  } catch {
    return "unavailable";
  }
  if (e === void 0) return;
  let safeParse = LATCH_SCHEMA().safeParse(e);
  return safeParse.success ? safeParse.data : "malformed";
}
//@ chunk-nmregrje.js:4115-4317 placement
function clearPersistedLatch(e, n) {
  saveGlobalConfig((r) => {
    let safeParse = LATCH_SCHEMA().safeParse(r.gzipRequestBodiesLatchedOff);
    return (safeParse.success ? safeParse.data.latchedAt === e : r.gzipRequestBodiesLatchedOff !== void 0)
      ? { ...r, gzipRequestBodiesLatchedOff: void 0 }
      : r;
  }, n);
}
/**
 * 检查 gzip 是否已锁存关闭：本进程已关则是；否则读一次全局配置里的持久锁存，未过期则生效，格式错误或过期则清除并记事件。
 */
//@ chunk-nmregrje.js:4317-4899 placement
function isGzipLatchedOff(storage) {
  let gzipRequestBody = Ws().gzipRequestBody;
  if (gzipRequestBody.latchedOff) return !0;
  if (gzipRequestBody.persistedLatchChecked) return !1;
  let r = readPersistedLatch();
  if (r === "unavailable") return !1;
  if (((gzipRequestBody.persistedLatchChecked = !0), r === void 0)) return !1;
  if (r === "malformed")
    return (
      clearPersistedLatch(void 0, storage),
      logEvent("tengu_gzip_request_body_latch_cleared", { reason: fromEnum("malformed") }),
      !1
    );
  let s = Date.now() - r.latchedAt;
  if (s >= 0 && s < U)
    return ((gzipRequestBody.latchedOff = !0), (gzipRequestBody.persistedLatchInEffect = !0), !0);
  return (
    clearPersistedLatch(r.latchedAt, storage),
    logEvent("tengu_gzip_request_body_latch_cleared", {
      reason: s < 0 ? fromEnum("malformed") : fromEnum("expired"),
      latchedStatus: r.status,
      latchedAgeHours: Math.max(0, Math.round(s / 3600000)),
    }),
    !1
  );
}
//@ chunk-nmregrje.js:4899-5007 placement
function latchOffThisProcess() {
  let gzipRequestBody = Ws().gzipRequestBody;
  ((gzipRequestBody.latchedOff = !0),
    (gzipRequestBody.rejectedThisProcess = !0),
    (gzipRequestBody.persistedLatchChecked = !0));
}
//@ chunk-nmregrje.js:5007-5304 placement
function latchGzipOff({ persist: persist, status: status, storageV5: storageV5, rollout: rollout = "api" }) {
  latchOffThisProcess();
  let gzipRequestBody = Ws().gzipRequestBody;
  if (persist && !gzipRequestBody.persistedLatchInEffect && gzipEnvSwitch(rollout) !== !0)
    ((gzipRequestBody.persistedLatchInEffect = !0),
      saveGlobalConfig(
        (l) => ({ ...l, gzipRequestBodiesLatchedOff: { latchedAt: Date.now(), status: status } }),
        storageV5,
      ));
  return gzipRequestBody.persistedLatchInEffect ? "persisted" : "process";
}
/**
 * 按投放范围（api、ccr_worker、frame_publish）记录 gzip 请求体特性结果：回退记一次负面，成功每进程只记一次。
 */
//@ chunk-nmregrje.js:5304-5848 placement
function logGzipFeature(rollout, outcome) {
  switch (rollout) {
    case "api":
      if (outcome === "fell_back") logFeatureSad("api_gzip_request_body", "fell_back");
      else if (Ws().once("gzip_request_body_ok")) logFeatureOk("api_gzip_request_body");
      return;
    case "ccr_worker":
      if (outcome === "fell_back") logFeatureSad("ccr_worker_gzip_request_body", "fell_back");
      else if (Ws().once("ccr_worker_gzip_request_body_ok")) logFeatureOk("ccr_worker_gzip_request_body");
      return;
    case "frame_publish":
      if (outcome === "fell_back") logFeatureSad("artifact_publish_gzip_request_body", "fell_back");
      else if (Ws().once("artifact_publish_gzip_request_body_ok"))
        logFeatureOk("artifact_publish_gzip_request_body");
      return;
  }
}
//@ chunk-nmregrje.js:5848-5882 placement
function PEn(e = "api") {
  logGzipFeature(e, "sent");
}
//@ chunk-nmregrje.js:5882-6122 placement
function logCcrSkipReason(e, n) {
  if (e !== "ccr_worker") return;
  let ccrWorkerSkipReasonsLogged = Ws().gzipRequestBody.ccrWorkerSkipReasonsLogged;
  if (ccrWorkerSkipReasonsLogged.has(n.reason)) return;
  (ccrWorkerSkipReasonsLogged.add(n.reason),
    logEvent("tengu_gzip_request_body_skipped", {
      rollout: fromEnum(e),
      reason: fromEnum(n.reason),
      requestBodyChars: n.bodyChars,
    }));
}
/**
 * 记录 gzip 请求体被拒后回退为未压缩重发的情况：调试日志与 tengu_gzip_request_body_fallback 遥测（拒绝类别、状态码、重发结果、是否闩锁关闭）。
 */
//@ chunk-nmregrje.js:6122-6601 placement
function logGzipFallback({
  rejection: rejection,
  status: status,
  viaCloudflare: viaCloudflare,
  retryOutcome: retryOutcome,
  retryStatus: retryStatus,
  latched: latched,
  bodyChars: bodyChars,
  rollout: rollout = "api",
}) {
  (logGzipFeature(rollout, "fell_back"),
    logForDebugging(
      `[API REQUEST] gzip request body rejected (rollout=${rollout} status=${status} kind=${rejection}); re-sent uncompressed \u2192 ${retryOutcome}${retryStatus !== void 0 ? ` status=${retryStatus}` : ""}; gzip latched off: ${latched}`,
      { level: "warn" },
    ),
    logEvent("tengu_gzip_request_body_fallback", {
      rollout: fromEnum(rollout),
      rejection: fromEnum(rejection),
      status: status,
      viaCloudflare: viaCloudflare,
      retryOutcome: fromEnum(retryOutcome),
      retryStatus: retryStatus,
      latched: fromEnum(latched),
      requestBodyChars: bodyChars,
    }));
}
/**
 * gzip 请求被拒后以未压缩方式重发：记录拒绝原因与重发结果，必要时持久锁存关闭（非 Anthropic 拒绝且重发成功），返回重发响应。
 */
//@ chunk-nmregrje.js:6601-7182 placement
async function resendUncompressed({
  rejection: rejection,
  first: first,
  resend: resend,
  facts: facts,
  aborted: aborted,
  bodyChars: bodyChars,
  storageV5: storageV5,
  rollout: rollout,
}) {
  let _ = {
      rejection: rejection,
      status: first.status,
      viaCloudflare: first.header("cf-ray") !== void 0,
      bodyChars: bodyChars,
      rollout: rollout,
    },
    m;
  try {
    m = await resend();
  } catch (error) {
    throw (
      logGzipFallback({
        ..._,
        retryOutcome: aborted() ? "aborted" : "network_error",
        retryStatus: void 0,
        latched: latchGzipOff({ persist: !1, status: first.status, storageV5: storageV5, rollout: rollout }),
      }),
      error
    );
  }
  let R = facts(m),
    z = await classifyResend(R),
    I = latchGzipOff({
      persist: rollout !== "ccr_worker" && rejection === "non_anthropic_rejection" && z === "api_response",
      status: first.status,
      storageV5: storageV5,
      rollout: rollout,
    });
  return (logGzipFallback({ ..._, retryOutcome: z, retryStatus: R.status, latched: I }), m);
}
/**
 * 检查 gzip 请求的响应是否为拒绝：是则锁存关闭、取消原响应、更新遥测，并以原始请求体重发。
 */
//@ chunk-nmregrje.js:7182-7798 placement
async function retryRejectedGzipRequest({
  res: res,
  dispatch: dispatch,
  finalInit: finalInit,
  identityBody: identityBody,
  clientRequestId: clientRequestId,
  storageV5: storageV5,
  rollout: rollout = "api",
}) {
  let B = await JXo(res);
  if (B === null) return res;
  (latchOffThisProcess(), res.body?.cancel().catch(() => {}));
  let { compress: compress, ...m } = finalInit,
    R = { ...m, body: identityBody };
  if (clientRequestId !== void 0) {
    let z = Ws().gzipRequestBody.telemetryByClientRequestId.get(clientRequestId);
    ZXo(clientRequestId, {
      requestBodyEncoding: "identity",
      requestBodyChars: Dir(identityBody) ?? identityBody.length,
      gzipFallbackStatus: res.status,
      ...(z !== void 0 && "gzipBlocks" in z && { gzipBlocks: z.gzipBlocks }),
      ...reuseTelemetry(identityBody),
    });
  }
  return resendUncompressed({
    rejection: B,
    first: q(res),
    resend: () => dispatch(R),
    facts: q,
    aborted: () => finalInit.signal?.aborted === !0,
    bodyChars: Dir(identityBody) ?? identityBody.length,
    storageV5: storageV5,
    rollout: rollout,
  });
}
/**
 * Artifact 帧发布时检查 gzip 是否被拒，被拒则以未压缩身份重发并处理闩锁，否则原样返回响应。
 */
//@ chunk-nmregrje.js:7798-8040 placement
async function handleFrameGzipRejection({
  answer: answer,
  facts: facts,
  resendIdentity: resendIdentity,
  aborted: aborted,
  bodyChars: bodyChars,
  storageV5: storageV5,
  rollout: rollout,
}) {
  let B = facts(answer),
    _ = await classifyGzipRejection(B);
  if (_ === null) return answer;
  return (
    latchOffThisProcess(),
    resendUncompressed({
      rejection: _,
      first: B,
      resend: resendIdentity,
      facts: facts,
      aborted: aborted,
      bodyChars: bodyChars,
      storageV5: storageV5,
      rollout: rollout,
    })
  );
}
/**
 * 生成带 gzip 压缩的 fetch 包装：符合条件时压缩请求体并加水印，被拒时自动回退重发。
 */
//@ chunk-nmregrje.js:8040-8326 placement
function createGzipFetchWrapper(rollout, storage) {
  return async (r, s, d) => {
    let l = ANT_KEY_PFX(r, s.body, storage, rollout);
    if (!l?.gzip) {
      if (l !== void 0) logCcrSkipReason(rollout, l);
      return d(s);
    }
    PEn(rollout);
    let y = { ...s, compress: "gzip", body: appendWatermark(s.body) },
      B = await d(y);
    return retryRejectedGzipRequest({
      res: B,
      dispatch: d,
      finalInit: y,
      identityBody: s.body,
      clientRequestId: void 0,
      storageV5: storage,
      rollout: rollout,
    });
  };
}
//@ chunk-nmregrje.js:8326-8401 placement
function ZXo(e, n) {
  Ws().gzipRequestBody.telemetryByClientRequestId.set(e, n);
}
/**
 * 请求体按块 gzip 被拒时，把该请求的遥测记录标记为 rejected。
 */
//@ chunk-nmregrje.js:8401-8647 placement
function markGzipBlocksRejected(e, n) {
  if (e === null) return;
  let telemetryByClientRequestId = Ws().gzipRequestBody.telemetryByClientRequestId,
    s = telemetryByClientRequestId.get(e);
  if (s?.requestBodyEncoding !== "gzip") return;
  telemetryByClientRequestId.set(e, {
    ...s,
    gzipBlocks: s.gzipBlocks?.outcome === "as_blocks" ? { ...s.gzipBlocks, outcome: "rejected" } : n,
  });
}
//@ chunk-nmregrje.js:8647-8723 placement
function Vci(e, n) {
  Ws().gzipRequestBody.dispatchAtByClientRequestId.set(e, n);
}
/**
 * 取出并删除某个客户端请求 id 记录的分派时间。
 */
//@ chunk-nmregrje.js:8723-8847 placement
function takeDispatchAt(e) {
  if (e === void 0) return;
  let dispatchAtByClientRequestId = Ws().gzipRequestBody.dispatchAtByClientRequestId,
    r = dispatchAtByClientRequestId.get(e);
  return (dispatchAtByClientRequestId.delete(e), r);
}
/**
 * 取出并删除某个客户端请求 id 的 gzip 遥测记录。
 */
//@ chunk-nmregrje.js:8847-8970 placement
function takeGzipTelemetry(e) {
  if (e === void 0) return;
  let telemetryByClientRequestId = Ws().gzipRequestBody.telemetryByClientRequestId,
    r = telemetryByClientRequestId.get(e);
  return (telemetryByClientRequestId.delete(e), r);
}
/**
 * 把 gzip 请求体遥测（编码、字符数、级别、准备耗时、块复用、跳过原因、回退状态等）展开为日志字段。
 */
//@ chunk-nmregrje.js:8970-10369 placement
function gzipTelemetryFields(telemetry) {
  if (telemetry === void 0) return {};
  return {
    requestBodyEncoding: fromEnum(telemetry.requestBodyEncoding),
    requestBodyChars: telemetry.requestBodyChars,
    ...(telemetry.requestBodyEncoding === "gzip" &&
      telemetry.requestBodyGzipLevel !== void 0 && { requestBodyGzipLevel: telemetry.requestBodyGzipLevel }),
    ...("requestPrepareMs" in telemetry &&
      telemetry.requestPrepareMs !== void 0 && { requestPrepareMs: telemetry.requestPrepareMs }),
    ...("requestBodyReusedChars" in telemetry &&
      telemetry.requestBodyReusedChars !== void 0 && {
        requestBodyReusedChars: telemetry.requestBodyReusedChars,
      }),
    ...("requestBodyComparedWithSdk" in telemetry &&
      telemetry.requestBodyComparedWithSdk !== void 0 && {
        requestBodyComparedWithSdk: telemetry.requestBodyComparedWithSdk,
      }),
    ...("gzipBlocks" in telemetry &&
      telemetry.gzipBlocks !== void 0 && {
        requestBodyGzipBlocksMode: telemetry.gzipBlocks.mode,
        requestBodyGzipBlocksOutcome: fromEnum(telemetry.gzipBlocks.outcome),
        ...(telemetry.gzipBlocks.planned !== void 0 && {
          requestBodyGzipBlockCount: telemetry.gzipBlocks.planned.blockCount,
          requestBodyGzipReusedBlockCount: telemetry.gzipBlocks.planned.reusedBlockCount,
          requestBodyGzipReusedBytes: telemetry.gzipBlocks.planned.reusedBytes,
          requestBodyGzipBlocksMs: telemetry.gzipBlocks.planned.spentMs,
          ...(telemetry.gzipBlocks.planned.gzippedBytes !== void 0 && {
            requestBodyGzippedBytes: telemetry.gzipBlocks.planned.gzippedBytes,
          }),
          requestBodyGzipStoredBytes: telemetry.gzipBlocks.planned.storedBytes,
          requestBodyGzipEvictedBlockCount: telemetry.gzipBlocks.planned.evictedForSpaceCount,
        }),
      }),
    ...("gzipSkipReason" in telemetry && { gzipSkipReason: fromEnum(telemetry.gzipSkipReason) }),
    ...("gzipFallbackStatus" in telemetry && {
      gzipFallback: !0,
      gzipFallbackStatus: telemetry.gzipFallbackStatus,
    }),
  };
}
//@ chunk-nmregrje.js:10369-10378 placement
Iki(ANT_KEY_PFX);
//@ chunk-rbe666af.js:1909-2047 placement
var GZIP_BLOCK_BYTES = 131072,
  GZIP_DICTIONARY_BYTES = 32768,
  Y = 4 * GZIP_BLOCK_BYTES,
  Z_rbe6 = 32,
  X = 2,
  Q = put,
  BLOCK_IDLE_DROP_MS = 210000,
  J = 256,
  BODY_SPLIT_MARKERS = { messages: '"messages":[', system: '],"system":', endOfSystemBlock: '"},{' },
  MAX_SYSTEM_TAIL_GAP = 1024;
//@ chunk-rbe666af.js:2047-2227 placement
function N_rbe6(e = Q) {
  return {
    blocks: new Map(),
    storedBytes: 0,
    maxStoredBytes: e,
    evictedForSpaceCount: 0,
    generation: 0,
    keptBody: void 0,
    cancelIdleDrop: void 0,
    pooledCompression: Promise.resolve(),
  };
}
/**
 * 清空 gzip 块缓存：取消空闲清理、清空块与保留的请求体、递增世代。
 */
//@ chunk-rbe666af.js:2227-2354 placement
function clearGzipBlockStore(e) {
  (e.cancelIdleDrop?.(),
    (e.cancelIdleDrop = void 0),
    e.blocks.clear(),
    (e.storedBytes = 0),
    (e.keptBody = void 0),
    e.generation++);
}
/**
 * 规划分块 gzip：在 messages/system 边界处把请求体切成固定大小块（带字典窗口），计算每块的键并从缓存中取出可复用的压缩结果，统计复用块数与字节。
 */
//@ chunk-rbe666af.js:2354-2787 placement
function planGzipBlocks({ body: body, level: level, store: store, clock: clock }) {
  let s = splitBodyBlocks(body),
    { keys: keys, carriedDigestCount: carriedDigestCount } = ne(
      body,
      s,
      level,
      body.buffer === store.keptBody?.memory.buffer && body.byteOffset === 0 ? store.keptBody : void 0,
    ),
    monotonicNow = clock.monotonicNow(),
    d = 0,
    c = 0,
    mapped = s.map((y, S) => {
      let g = takeCachedBlock(store, keys[S], monotonicNow);
      if (g !== void 0) (d++, (c += y.end - y.start));
      return g;
    });
  if (store.blocks.size > 0) scheduleIdleDrop(store, clock);
  return {
    body: body,
    level: level,
    blocks: s,
    keys: keys,
    reused: mapped,
    reusedBlockCount: d,
    reusedBytes: c,
    carriedDigestCount: carriedDigestCount,
    generation: store.generation,
  };
}
//@ chunk-rbe666af.js:2787-2867 placement
function Mhi({ keys: keys, reused: reused }) {
  return keys.some((n, r) => n !== void 0 && reused[r] === void 0);
}
/**
 * 组装完整的 gzip 请求体：gzip 头、各压缩块与包含 CRC32 和长度的尾部。
 */
//@ chunk-rbe666af.js:2867-3107 placement
async function assembleGzipBody(e, t, n, r) {
  let s = await gzipRequestBody(e, t, n, r),
    buffer = Buffer.from([31, 139, 8, 0, 0, 0, 0, 0, 0, 255]),
    alloc = Buffer.alloc(10);
  return (
    (alloc[0] = 3),
    alloc.writeUInt32LE(Bun.hash.crc32(e.body), 2),
    alloc.writeUInt32LE(e.body.length % 4294967296, 6),
    Buffer.concat([buffer, ...s, alloc])
  );
}
//@ chunk-rbe666af.js:3107-3240 placement
class GzipBlockCheckError extends Error {
  fault;
  constructor(e, t) {
    super("Request body gzip: a newly compressed block failed its check", t);
    this.fault = e;
  }
}
//@ chunk-rbe666af.js:3240-3321 placement
function ses(e) {
  let t = getErrnoCode(e);
  return t === "Z_DATA_ERROR" || t === "Z_BUF_ERROR" ? t : void 0;
}
/**
 * 压缩请求体并校验每个压缩块
 */
//@ chunk-rbe666af.js:3321-4394 placement
async function gzipRequestBody(e, t, n, { signal: r, stopIf: s, inBackground: i = !1 } = {}) {
  let { body: body, level: level, blocks: blocks, keys: keys, reused: reused, generation: generation } = e,
    S;
  if (!i && body.length - e.reusedBytes <= Y)
    S = blocks.map((l, R) => {
      let h = reused[R];
      if (h !== void 0) return h;
      let chunk = body.subarray(l.start, l.end),
        _ = x_rbe6(body, l, level),
        f = deflateRawSync(chunk, _);
      try {
        O(chunk, f, inflateRawSync(f, _));
      } catch (error) {
        throw A(error);
      }
      return f;
    });
  else {
    let R = (i ? Promise.resolve() : t.pooledCompression).then(() => {
      r?.throwIfAborted();
      let monotonicNow = n.monotonicNow();
      return pMap(
        blocks,
        async (p, _) => {
          if (s?.()) throw Error("Request body gzip: compression stopped");
          if (reused[_] !== void 0) return reused[_];
          let f = t.generation === generation ? takeCachedBlock(t, keys[_], monotonicNow) : void 0;
          if (f !== void 0) return (e.reusedBlockCount++, (e.reusedBytes += p.end - p.start), f);
          let chunk = body.subarray(p.start, p.end),
            m = x_rbe6(body, p, level),
            b = await re(chunk, m);
          try {
            O(chunk, b, await oe(b, m));
          } catch (error) {
            throw A(error);
          }
          return b;
        },
        { concurrency: i ? X : Z_rbe6, signal: r },
      );
    });
    if (!i)
      t.pooledCompression = R.then(
        () => {},
        () => {},
      );
    S = await R;
  }
  if (t.generation !== generation) return S;
  let monotonicNow = n.monotonicNow();
  return (
    S.forEach((l, R) => {
      let h = keys[R];
      if (h !== void 0 && !t.blocks.has(h)) {
        let p = l.buffer.byteLength === l.length;
        ie(t, h, p ? l : Buffer.copyBytesFrom(l), monotonicNow);
      }
    }),
    evictGzipBlocks(t, monotonicNow),
    scheduleIdleDrop(t, n),
    S
  );
}
//@ chunk-rbe666af.js:4394-4689 placement
function splitBodyBlocks(body) {
  let index = body.lastIndexOf(BODY_SPLIT_MARKERS.system),
    n = index === -1 ? -1 : body.indexOf(BODY_SPLIT_MARKERS.endOfSystemBlock, index),
    r = [
      body.indexOf(BODY_SPLIT_MARKERS.messages),
      index,
      n !== -1 && n - index <= MAX_SYSTEM_TAIL_GAP ? n + 2 : -1,
      body.length,
    ],
    s = [],
    i = 0;
  for (let o of r) {
    if (o <= i) continue;
    for (let a = i; a < o; a += GZIP_BLOCK_BYTES)
      s.push({
        start: a,
        end: Math.min(a + GZIP_BLOCK_BYTES, o),
        dictionaryStart: Math.max(a - GZIP_DICTIONARY_BYTES, i),
      });
    i = o;
  }
  return s;
}
//@ chunk-rbe666af.js:4689-5235 placement
function ne(e, t, n, r) {
  let s = 0,
    mapped = t.map((o) => {
      if (o.end - o.start !== GZIP_BLOCK_BYTES) return;
      let a = r?.blockDigests.get(o.start);
      if (r !== void 0 && a?.end === o.end && o.end <= r.digestedBytes) return (s++, a.digest);
      return Bun.SHA256.hash(e.subarray(o.start, o.end), "base64");
    });
  if (r !== void 0)
    ((r.blockDigests = new Map(
      t.flatMap((o, a) => {
        let d = mapped[a];
        return d === void 0 ? [] : [[o.start, { end: o.end, digest: d }]];
      }),
    )),
      (r.digestedBytes = r.length));
  return {
    carriedDigestCount: s,
    keys: t.map((o, a) => {
      let d = mapped[a],
        c = o.dictionaryStart < o.start ? mapped[a - 1] : "none";
      return d === void 0 || c === void 0 ? void 0 : `${n}:${c}:${d}`;
    }),
  };
}
//@ chunk-rbe666af.js:5235-5269 placement
function re(e, t) {
  return promisify(deflateRaw)(e, t);
}
//@ chunk-rbe666af.js:5269-5303 placement
function oe(e, t) {
  return promisify(inflateRaw)(e, t);
}
//@ chunk-rbe666af.js:5303-5457 placement
function x_rbe6(e, t, n) {
  return {
    level: n,
    finishFlush: constants.Z_SYNC_FLUSH,
    chunkSize: GZIP_BLOCK_BYTES,
    ...(t.dictionaryStart < t.start && { dictionary: e.subarray(t.dictionaryStart, t.start) }),
  };
}
//@ chunk-rbe666af.js:5457-5525 placement
function A(e) {
  let t = ses(e);
  return t === void 0 ? e : new GzipBlockCheckError(t, { cause: e });
}
//@ chunk-rbe666af.js:5525-5538 placement
var se = 65535;
//@ chunk-rbe666af.js:5538-5693 placement
function O(e, t, n) {
  if (!n.equals(e)) throw new GzipBlockCheckError("inflates_to_other_bytes");
  if (t.length < 4 || t.readUInt32BE(t.length - 4) !== se) throw new GzipBlockCheckError("no_flush_marker");
}
//@ chunk-rbe666af.js:5693-5878 placement
function takeCachedBlock(e, t, n) {
  let r = t === void 0 ? void 0 : e.blocks.get(t);
  if (t === void 0 || r === void 0) return;
  return (e.blocks.delete(t), e.blocks.set(t, { compressed: r.compressed, lastUsedAt: n }), r.compressed);
}
//@ chunk-rbe666af.js:5878-5971 placement
function ie(e, t, n, r) {
  let s = { compressed: n, lastUsedAt: r };
  (e.blocks.set(t, s), (e.storedBytes += z(s)));
}
//@ chunk-rbe666af.js:5971-6151 placement
function evictGzipBlocks(e, t) {
  for (let [n, r] of e.blocks) {
    let s = e.storedBytes > e.maxStoredBytes;
    if (!s && t - r.lastUsedAt < BLOCK_IDLE_DROP_MS) return;
    if ((e.blocks.delete(n), (e.storedBytes -= z(r)), s)) e.evictedForSpaceCount++;
  }
}
/**
 * 安排空闲一段时间后清空 gzip 块缓存（弱引用，不阻止退出）。
 */
//@ chunk-rbe666af.js:6151-6298 placement
function scheduleIdleDrop(e, t) {
  let weakRef = new WeakRef(e);
  (e.cancelIdleDrop?.(),
    (e.cancelIdleDrop = t.setTimeout(
      () => {
        let deref = weakRef.deref();
        if (deref !== void 0) clearGzipBlockStore(deref);
      },
      BLOCK_IDLE_DROP_MS,
      { unref: !0 },
    )));
}
//@ chunk-rbe666af.js:6298-6341 placement
function z(e) {
  return J + e.compressed.length;
}
//@ chunk-rbe666af.js:6341-6373 placement
function G() {
  return new WeakMap();
}
//@ chunk-hwmsct5x.js:241035-241246 placement
var TENGU_BUZZING_PIKE = "tengu_buzzing_pike",
  Fb = 524288,
  Db = ['"thread":{"type":"create"}', '"thread":{"type":"continue",', '"speed":"fast"'],
  Ub = 4096,
  Xc = 6,
  Qc = 1000,
  Nb = new Set(["extract_memories", "prompt_suggestion", "compact"]),
  Bb = 0.1;
//@ chunk-hwmsct5x.js:241246-241389 placement
function gzipTelemetryExtras(e) {
  return {
    incremental_request_body: e.incrementalRequestBody === !0,
    ...(e.carriedDigests !== void 0 && { carried_digests: e.carriedDigests }),
  };
}
//@ chunk-hwmsct5x.js:241389-241482 placement
function getGzipRequestBodyBlocksMode() {
  let e =
    env.CLAUDE_CODE_GZIP_REQUEST_BODY_BLOCKS ?? getFeatureValue_CACHED_MAY_BE_STALE(TENGU_BUZZING_PIKE, 0);
  return e === 1 || e === 2 ? e : 0;
}
//@ chunk-hwmsct5x.js:241482-241585 placement
function isMessagesEndpoint(e) {
  try {
    return new URL(requestMethodAndUrl(e, void 0).url).pathname.endsWith("/v1/messages");
  } catch {
    return !1;
  }
}
//@ chunk-hwmsct5x.js:241585-241774 placement
function shouldGzipRequestBody(e) {
  let n = e?.body;
  return (
    gzipLevelOf(e?.compress) !== void 0 &&
    (typeof n === "string" || Ast(n)) &&
    (Dir(n) ?? 0) >= Fb &&
    !Db.some((r) => n.includes(r, Math.max(0, n.length - Ub * (typeof n === "string" ? 1 : 3))))
  );
}
/**
 * 请求体 gzip 分块压缩：按会话开关决定整体/分块/关闭，构建增量块存储并在响应后自检。
 */
//@ chunk-hwmsct5x.js:241774-243558 placement
async function prepareGzipRequestBody(e, n = Aa) {
  let r = gzipLevelOf(e?.compress);
  if (
    e === void 0 ||
    r === void 0 ||
    !(typeof e.body === "string" || Ast(e.body)) ||
    !shouldGzipRequestBody(e)
  )
    return { init: e };
  let body = e.body,
    h = typeof body === "string" ? {} : { incrementalRequestBody: !0 },
    y = h,
    w = Ws(),
    gzipRequestBody = w.gzipRequestBody,
    blockStore = gzipRequestBody.blockStore,
    headers = new Headers(e.headers),
    L = headers.get(CLIENT_REQUEST_ID_HEADER),
    O = getGzipRequestBodyBlocksMode();
  if (O === 0 || gzipRequestBody.blocksSwitchedOff)
    return (markGzipBlocksRejected(L, { mode: O, outcome: O === 0 ? "off" : "switched_off" }), { init: e });
  let M = L === null ? void 0 : gzipRequestBody.telemetryByClientRequestId.get(L),
    P = !(M?.requestBodyEncoding === "gzip" && M.querySource !== void 0 && Nb.has(M.querySource));
  if (O === 1 && blockStore.blocks.size === 0)
    return (
      markGzipBlocksRejected(L, { mode: O, outcome: "by_runtime" }),
      { init: e, ...(P && { afterResponse: onGzipBlocksBuilt(gzipRequestBody, n, body, r, h) }) }
    );
  let H = () => (markGzipBlocksRejected(L, { mode: O, outcome: "switched_off" }), { init: e }),
    startTime = performance.now();
  try {
    let z = planGzipBlocks({
      body: typeof body === "string" ? Buffer.from(body) : body,
      level: r,
      store: blockStore,
      clock: n,
    });
    if (h.incrementalRequestBody) y = { ...h, carriedDigests: z.carriedDigestCount };
    let G = z.reusedBytes * 2 < z.body.length,
      q =
        O === 1 && G
          ? void 0
          : await assembleGzipBody(z, blockStore, n, {
              signal: e.signal ?? void 0,
              stopIf: () => gzipRequestBody.blocksSwitchedOff !== !1,
            });
    if (gzipRequestBody.blocksSwitchedOff) return H();
    if (
      (markGzipBlocksRejected(L, {
        mode: O,
        outcome: q === void 0 ? "by_runtime" : "as_blocks",
        planned: {
          blockCount: z.blocks.length,
          reusedBlockCount: z.reusedBlockCount,
          reusedBytes: z.reusedBytes,
          spentMs: Math.round(performance.now() - startTime),
          gzippedBytes: q?.length,
          storedBytes: blockStore.storedBytes,
          evictedForSpaceCount: blockStore.evictedForSpaceCount,
        },
      }),
      q === void 0)
    )
      return {
        init: e,
        ...(P && Mhi(z) && { afterResponse: onGzipBlocksBuilt(gzipRequestBody, n, body, r, h) }),
      };
    if (w.once("gzip_request_body_blocks_ok")) logFeatureOk("api_gzip_request_body_blocks");
    headers.set("Content-Encoding", "gzip");
    let { compress: compress, ...Z } = e;
    return {
      init: { ...Z, headers: headers, body: q },
      afterResponse: scheduleGzipSelfCheck(gzipRequestBody, n, q, y),
    };
  } catch (error) {
    if (e.signal?.aborted) return { init: e };
    if (gzipRequestBody.blocksSwitchedOff && !(error instanceof GzipBlockCheckError)) return H();
    return (
      reportGzipBlockFailure(error, gzipRequestBody, "failed", y),
      markGzipBlocksRejected(L, { mode: O, outcome: "failed" }),
      { init: e }
    );
  }
}
//@ chunk-hwmsct5x.js:243558-244092 placement
async function handleGzipRejectedResponse(e, n) {
  let gzipRequestBody = Ws().gzipRequestBody,
    s = gzipRequestBody.blockGzippedResponses.get(e);
  if (s === void 0) return e;
  let h = await JXo(e);
  if (h === null) return e;
  (switchOffGzipBlocks(gzipRequestBody, "for_the_session", `rejected (status=${e.status} kind=${h})`),
    e.body?.cancel().catch(() => {}));
  let y;
  try {
    return ((y = await n()), y);
  } finally {
    (logFeatureSad("api_gzip_request_body_blocks", "rejected", {
      status: e.status,
      rejection: fromEnum(h),
      ...(y !== void 0 && { resendStatus: y.status }),
      ...s,
    }),
      logForDiagnosticsNoPII("warn", "api_gzip_request_body_blocks_rejected", {
        status: e.status,
        rejection: h,
        ...(y !== void 0 && { resend_status: y.status }),
        ...gzipTelemetryExtras(s),
      }));
  }
}
//@ chunk-hwmsct5x.js:244092-244287 placement
function switchOffGzipBlocks(e, n, r) {
  if (e.blocksSwitchedOff !== "for_the_session") e.blocksSwitchedOff = n;
  (clearGzipBlockStore(e.blockStore),
    logForDebugging(`[API REQUEST] gzip in blocks switched off (${e.blocksSwitchedOff}): ${r}`, {
      level: "warn",
    }));
}
//@ chunk-hwmsct5x.js:244287-244693 placement
function reportGzipBlockFailure(e, n, r, s) {
  if ((logError(e), e instanceof GzipBlockCheckError))
    (switchOffGzipBlocks(n, "for_the_session", `a new block failed its check (${e.fault})`),
      logFeatureSad("api_gzip_request_body_blocks", "piece_check_failed", { fault: fromEnum(e.fault), ...s }),
      logForDiagnosticsNoPII("warn", "api_gzip_request_body_blocks_piece_check_failed", {
        fault: e.fault,
        ...gzipTelemetryExtras(s),
      }));
  else
    (switchOffGzipBlocks(n, "until_next_conversation", "compression threw"),
      logFeatureSad("api_gzip_request_body_blocks", r, ...(s.incrementalRequestBody ? [s] : [])));
}
//@ chunk-hwmsct5x.js:244693-245303 placement
function onGzipBlocksBuilt(e, n, r, s, h) {
  let blockStore = e.blockStore,
    { generation: generation } = blockStore;
  return (S) => {
    if (!S?.ok || e.blocksBuildGeneration === generation) return;
    let E = typeof r !== "string" && r.buffer === blockStore.keptBody?.memory.buffer ? Buffer.from(r) : r;
    ((e.blocksBuildGeneration = generation),
      n.setTimeout(
        async () => {
          try {
            if (
              !e.blocksSwitchedOff &&
              getGzipRequestBodyBlocksMode() !== 0 &&
              blockStore.generation === generation
            )
              await gzipRequestBody(
                planGzipBlocks({
                  body: typeof E === "string" ? Buffer.from(E) : E,
                  level: s,
                  store: blockStore,
                  clock: n,
                }),
                blockStore,
                n,
                { inBackground: !0, stopIf: () => e.blocksSwitchedOff !== !1 },
              );
          } catch (error) {
            if (!e.blocksSwitchedOff || error instanceof GzipBlockCheckError)
              reportGzipBlockFailure(error, e, "build_failed", h);
          } finally {
            if (e.blocksBuildGeneration === generation) e.blocksBuildGeneration = void 0;
          }
        },
        Qc,
        { unref: !0 },
      ));
  };
}
//@ chunk-hwmsct5x.js:245303-245888 placement
function scheduleGzipSelfCheck(e, n, r, s) {
  return (h) => {
    if (h !== void 0) e.blockGzippedResponses.set(h, s);
    if (!$b(h) && !0 && Math.random() >= Bb) return;
    n.setTimeout(
      () =>
        promisify(gunzip)(r, { chunkSize: 1048576 }).catch((y) => {
          let w = sanitizeErrnoForTelemetry(y),
            S = { ...(w !== void 0 && { code: w }), ...s },
            E = ses(y) !== void 0;
          if (
            (switchOffGzipBlocks(
              e,
              E ? "for_the_session" : "until_next_conversation",
              `the check of a sent body ended in ${getErrnoCode(y) ?? "an error"}`,
            ),
            E)
          )
            (logFeatureBad("api_gzip_request_body_blocks", "self_check_wrong_bytes", S),
              logForDiagnosticsNoPII("error", "api_gzip_request_body_blocks_self_check_wrong_bytes", {
                code: w,
                ...gzipTelemetryExtras(s),
              }));
          else logFeatureSad("api_gzip_request_body_blocks", "self_check_could_not_run", S);
        }),
      Qc,
      { unref: !0 },
    );
  };
}
//@ chunk-hwmsct5x.js:245888-245982 placement
function $b(e) {
  return e === void 0 || (e.status >= 400 && e.status < 500 && e.status !== 401 && e.status !== 429);
}
//@ chunk-hwmsct5x.js:245982-246098 placement
function gzipLevelOf(e) {
  if (e === "gzip") return Xc;
  return typeof e === "object" && e !== null && e.encoding === "gzip" ? (e.level ?? Xc) : void 0;
}
//@ chunk-hwmsct5x.js:246098-246171 placement
var of = new HostScoped(() => ({ route: void 0 })),
  X_CLAUDE_CODE_ROUTE_FINAL_ANSWER = "x-claude-code-route-final-answer";
//@ chunk-hwmsct5x.js:246171-246242 placement
function isRoutedFinalAnswerError(e) {
  return e instanceof Ot && e.headers?.has(X_CLAUDE_CODE_ROUTE_FINAL_ANSWER) === !0 && hasFinalAnswerRoute();
}
//@ chunk-hwmsct5x.js:246242-246295 placement
function hasFinalAnswerRoute() {
  return of.of(getRootSession().host).route !== void 0;
}
/**
 * API 客户端 fetch 包装：优先走注入的 route，再按需对请求体做 gzip 分块压缩。
 */
//@ chunk-hwmsct5x.js:246295-246577 placement
async function fetchWithRequestBodyCompression(e, n) {
  let r = of.of(getRootSession().host).route?.(e, n, modelApiFetch);
  if (r !== void 0) return r;
  if (!shouldGzipRequestBody(n) || !isMessagesEndpoint(e)) return modelApiFetch(e, n);
  let { init: init, afterResponse: afterResponse } = await prepareGzipRequestBody(n).catch(
      (w) => (logError(w), { init: n }),
    ),
    y;
  try {
    return ((y = await modelApiFetch(e, init)), y);
  } finally {
    if (y !== void 0 || !Wb(n?.signal))
      try {
        afterResponse?.(y);
      } catch (error) {
        logError(error);
      }
  }
}

export {
  createGzipFetchWrapper,
  decideGzip,
  Dir,
  Vci,
  fetchWithRequestBodyCompression,
  clearGzipBlockStore,
  isRoutedFinalAnswerError,
  isMessagesEndpoint,
  Ast,
  takeDispatchAt,
  gzipLevelOverride,
  PEn,
  reuseTelemetry,
  ZXo,
  handleGzipRejectedResponse,
  retryRejectedGzipRequest,
  gzipTelemetryFields,
  takeGzipTelemetry,
  getGzipRequestBodyBlocksMode,
  hasFinalAnswerRoute,
  scheduleIdleDrop,
  G,
  N_rbe6,
  handleFrameGzipRejection,
  zci,
};
