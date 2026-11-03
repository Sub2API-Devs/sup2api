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
import { isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";
import { streamFallbackWarning } from "./streamFallbackWarning.js";
import { isFirstPartyAnthropicHost } from "../../utils/model/providers.js";
import { alwaysTrue, jsonParse } from "../../utils/slowOperations.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, literal, string, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";
import { ANT_KEY_PFX } from "../teamMemorySync/secretScanner.js";
import { appendWatermark, swapWatermark } from "../analytics/eventSerialization.js";
import { MAX_REQUEST_BYTES } from "../../utils/truncateGraphemes.js";
import { getErrnoCode, sanitizeErrnoForTelemetry } from "../../utils/errors.js";
import { pMap } from "../../../vendor/p-map/index.js";
import { requestMethodAndUrl } from "../../utils/testNetworkGuard.js";
import { systemClock } from "../../utils/sleep.js";
import { CLIENT_REQUEST_ID_HEADER } from "./client.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { logError } from "../../utils/log.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { APIError } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { getRootSession } from "../../bootstrap/state.js";
import { modelApiFetch, isAbortedWithoutStreamError } from "./clientHelpers.js";

//@ chunk-nmregrje.js:685-772 placement
/**
 * 请求体 gzip 的两个开关（gentle_hammock / golden_popcorn）与尺寸/时窗常量：最小 4096 字符（ccr_worker 1024）、块遥测保留 7 天、序列化尾部 8192。
 */
var TENGU_GENTLE_HAMMOCK = "tengu_gentle_hammock";
var TENGU_GOLDEN_POPCORN = "tengu_golden_popcorn";
var MIN_BODY_CHARS = 4096;
var MIN_BODY_CHARS_CCR = 1024;
var BLOCK_TELEMETRY_TTL_MS = 604800000;
var MAX_SERIALISED_TAIL = 8192;
//@ chunk-nmregrje.js:772-887 placement
/**
 * 读取 gzip 压缩等级覆盖值（环境变量或开关，1–9 有效）。
 */
function gzipLevelOverride() {
  let e =
    env.CLAUDE_CODE_GZIP_REQUEST_BODY_LEVEL ?? getFeatureValue_CACHED_MAY_BE_STALE(TENGU_GOLDEN_POPCORN, 0);
  return Number.isInteger(e) && e >= 1 && e <= 9 ? e : undefined;
}
//@ chunk-nmregrje.js:887-997 placement
function gzipEnvSwitch(rollout) {
  return rollout === "ccr_worker"
    ? env.CLAUDE_CODE_GZIP_CCR_REQUEST_BODIES
    : env.CLAUDE_CODE_GZIP_REQUEST_BODIES;
}
//@ chunk-nmregrje.js:997-1039 placement
function minBodyCharsFor(rollout) {
  return rollout === "ccr_worker" ? MIN_BODY_CHARS_CCR : MIN_BODY_CHARS;
}
//@ chunk-nmregrje.js:1039-1361 placement
/**
 * 判断当前传输方式是否会阻碍请求体 gzip：Unix socket、代理、mTLS 或自定义 CA。
 */
function gzipBlockingTransport(url) {
  if (env.ANTHROPIC_UNIX_SOCKET) return "unix_socket";
  if (getUsableProxyUrl() !== undefined && !shouldBypassProxy(url)) return "proxy";
  let mtlsConfig = getMTLSConfig();
  if (mtlsConfig?.cert !== undefined || mtlsConfig?.key !== undefined) return "mtls";
  if (env.NODE_EXTRA_CA_CERTS) {
    let latchedPreSettingsEnvSnapshot = getLatchedPreSettingsEnvSnapshot();
    if (!(
      isRemoteManagedEnvironment() ||
      (env.CLAUDE_CODE_ENTRYPOINT === "local-agent" &&
        (latchedPreSettingsEnvSnapshot === undefined ||
          latchedPreSettingsEnvSnapshot.NODE_EXTRA_CA_CERTS !== undefined))
    ))
      return "custom_ca";
  }
  return;
}
//@ chunk-nmregrje.js:1361-1456 placement
/**
 * 导出函数 `isSerialisedBody`：参数 e，返回 Buffer.isBuffer(e) && Ws().gzipRequestBody.serialisedBodies.has(e.buffer)。
 */
function isSerialisedBody(body) {
  return Buffer.isBuffer(body) && streamFallbackWarning().gzipRequestBody.serialisedBodies.has(body.buffer);
}
//@ chunk-nmregrje.js:1456-1555 placement
function serialisedBodyInfo(e) {
  return Buffer.isBuffer(e)
    ? streamFallbackWarning().gzipRequestBody.serialisedBodies.get(e.buffer)
    : undefined;
}
//@ chunk-nmregrje.js:1555-1677 placement
/**
 * 生成请求体复用遥测字段：复用的字符数与是否与 SDK 序列化结果核对过。
 */
function reuseTelemetry(e) {
  let n = serialisedBodyInfo(e);
  return n === undefined
    ? {}
    : {
        requestBodyReusedChars: n.keptChars,
        requestBodyComparedWithSdk: n.checked,
      };
}
//@ chunk-nmregrje.js:1677-1741 affinity
/**
 * 导出函数 `bodyCharCount`：参数 e，返回 typeof e === "string" ? e.length : x(e)?.chars。
 */
function bodyCharCount(e) {
  return typeof e === "string" ? e.length : serialisedBodyInfo(e)?.chars;
}
//@ chunk-nmregrje.js:1805-1857 placement
/**
 * 导出函数 `wouldGzipForHost`：参数 e, n, r，返回 isFirstPartyAnthropicHost(e) && decideGzip(e, 1 / 0, n, r).gzip。
 */
function wouldGzipForHost(url, storage, rollout) {
  return isFirstPartyAnthropicHost(url) && decideGzip(url, 1 / 0, storage, rollout).gzip;
}
//@ chunk-nmregrje.js:1857-2481 placement
/**
 * 判定请求体是否 gzip：env 关闭、非 Bun、非字符串、太小时不压；env 强开时只看本进程是否被拒过；unix socket/代理/mTLS/自定义 CA 时不压；ccr_worker 需开关；已锁存关闭时不压。返回 {gzip, reason, bodyChars}。
 */
function decideGzip(url, bodyChars, storage, rollout) {
  let d = gzipEnvSwitch(rollout);
  if (d === false)
    return {
      gzip: false,
      reason: "env_off",
      bodyChars,
    };
  if (!alwaysTrue())
    return {
      gzip: false,
      reason: "not_bun_runtime",
      bodyChars,
    };
  if (bodyChars === undefined)
    return {
      gzip: false,
      reason: "non_string_body",
      bodyChars,
    };
  if (bodyChars < minBodyCharsFor(rollout))
    return {
      gzip: false,
      reason: "below_min_size",
      bodyChars,
    };
  if (d === true)
    return streamFallbackWarning().gzipRequestBody.rejectedThisProcess
      ? {
          gzip: false,
          reason: "latched_off",
          bodyChars,
        }
      : {
          gzip: true,
          bodyChars,
        };
  let l = gzipBlockingTransport(url);
  if (l !== undefined)
    return {
      gzip: false,
      reason: l,
      bodyChars,
    };
  if (rollout === "ccr_worker" && !getFeatureValue_CACHED_MAY_BE_STALE(TENGU_GENTLE_HAMMOCK, false))
    return {
      gzip: false,
      reason: "flag_off",
      bodyChars,
    };
  if (isGzipLatchedOff(storage))
    return {
      gzip: false,
      reason: "latched_off",
      bodyChars,
    };
  return {
    gzip: true,
    bodyChars,
  };
}
//@ chunk-nmregrje.js:2481-2824 placement
/**
 * gzip 请求体相关的结构与常量：API 错误结构、闩锁记录、拒绝原因、表示服务端无法解析 JSON 的消息与正则。
 */
var API_ERROR_SCHEMA = DoctorLazy(() =>
  u({
    type: literal("error"),
    error: u({
      type: string(),
      message: string(),
    }),
  }),
);
var LATCH_SCHEMA = DoctorLazy(() =>
  u({
    latchedAt: E().finite(),
    status: E(),
  }),
);
var PROXY_ERROR_SCHEMA = DoctorLazy(() =>
  u({
    error: string(),
    reason: string(),
  }),
);
var INVALID_JSON_MESSAGES = [
  "The request body is not valid JSON",
  "Failed to parse request: could not parse request body as JSON",
];
var BAD_JSON_PATTERN = /^bad json: (?:invalid character |unexpected EOF$|unexpected end of JSON input$|EOF$)/;
//@ chunk-nmregrje.js:2824-2917 placement
function responseFacts(e) {
  return {
    status: e.status,
    header: (n) => e.headers.get(n) ?? undefined,
    bodyText: () => readBodyPrefix(e),
  };
}
//@ chunk-nmregrje.js:2917-3015 placement
function isAnthropicRejection(e) {
  return (e.header("request-id")?.startsWith("req_") ?? false) || e.header("cf-ray") !== undefined;
}
//@ chunk-nmregrje.js:3015-3291 placement
async function readBodyPrefix(e) {
  let reader = e.clone().body?.getReader();
  if (!reader) return "";
  let textDecoder = new TextDecoder();
  let s = "";
  let d = MAX_SERIALISED_TAIL;
  try {
    while (d > 0) {
      let { done: l, value: y } = await reader.read();
      if (l) break;
      let chunk = y.subarray(0, d);
      d -= chunk.byteLength;
      s += textDecoder.decode(chunk, {
        stream: true,
      });
    }
  } catch {
  } finally {
    reader.cancel().catch(() => {});
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
  let r = API_ERROR_SCHEMA().safeParse(n);
  if (r.success) return INVALID_JSON_MESSAGES.some((d) => r.data.error.message.startsWith(d));
  let s = PROXY_ERROR_SCHEMA().safeParse(n);
  return s.success && s.data.reason === "bad_json" && BAD_JSON_PATTERN.test(s.data.error);
}
//@ chunk-nmregrje.js:3537-3744 placement
async function classifyGzipRejection(e) {
  if (e.status !== 400 && e.status !== 403 && e.status !== 415) return null;
  if (!isAnthropicRejection(e)) return "non_anthropic_rejection";
  if (e.status === 400 && isInvalidJsonRejection(await e.bodyText())) return "invalid_json_at_origin";
  return null;
}
//@ chunk-nmregrje.js:3744-3801 placement
/**
 * 导出函数 `classifyRejectionOf`：参数 e，返回 null; return classifyGzipRejection(q(e))。
 */
async function classifyRejectionOf(e) {
  if (e.ok) return null;
  return classifyGzipRejection(responseFacts(e));
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
  if (e === undefined) return;
  let n = LATCH_SCHEMA().safeParse(e);
  return n.success ? n.data : "malformed";
}
//@ chunk-nmregrje.js:4115-4317 placement
function clearPersistedLatch(e, storage) {
  saveGlobalConfig((r) => {
    let s = LATCH_SCHEMA().safeParse(r.gzipRequestBodiesLatchedOff);
    return (s.success ? s.data.latchedAt === e : r.gzipRequestBodiesLatchedOff !== undefined)
      ? {
          ...r,
          gzipRequestBodiesLatchedOff: undefined,
        }
      : r;
  }, storage);
}
//@ chunk-nmregrje.js:4317-4899 placement
/**
 * 检查 gzip 是否已锁存关闭：本进程已关则是；否则读一次全局配置里的持久锁存，未过期则生效，格式错误或过期则清除并记事件。
 */
function isGzipLatchedOff(storage) {
  let gzipRequestBody = streamFallbackWarning().gzipRequestBody;
  if (gzipRequestBody.latchedOff) return true;
  if (gzipRequestBody.persistedLatchChecked) return false;
  let persistedLatch = readPersistedLatch();
  if (persistedLatch === "unavailable") return false;
  gzipRequestBody.persistedLatchChecked = true;
  if (persistedLatch === undefined) return false;
  if (persistedLatch === "malformed") {
    clearPersistedLatch(undefined, storage);
    logEvent("tengu_gzip_request_body_latch_cleared", {
      reason: fromEnum("malformed"),
    });
    return false;
  }
  let s = Date.now() - persistedLatch.latchedAt;
  if (s >= 0 && s < BLOCK_TELEMETRY_TTL_MS) {
    gzipRequestBody.latchedOff = true;
    gzipRequestBody.persistedLatchInEffect = true;
    return true;
  }
  clearPersistedLatch(persistedLatch.latchedAt, storage);
  logEvent("tengu_gzip_request_body_latch_cleared", {
    reason: s < 0 ? fromEnum("malformed") : fromEnum("expired"),
    latchedStatus: persistedLatch.status,
    latchedAgeHours: Math.max(0, Math.round(s / 3600000)),
  });
  return false;
}
//@ chunk-nmregrje.js:4899-5007 placement
function latchOffThisProcess() {
  let gzipRequestBody = streamFallbackWarning().gzipRequestBody;
  gzipRequestBody.latchedOff = true;
  gzipRequestBody.rejectedThisProcess = true;
  gzipRequestBody.persistedLatchChecked = true;
}
//@ chunk-nmregrje.js:5007-5304 placement
function latchGzipOff({ persist, status, storageV5, rollout = "api" }) {
  latchOffThisProcess();
  let gzipRequestBody = streamFallbackWarning().gzipRequestBody;
  if (persist && !gzipRequestBody.persistedLatchInEffect && gzipEnvSwitch(rollout) !== true) {
    gzipRequestBody.persistedLatchInEffect = true;
    saveGlobalConfig(
      (l) => ({
        ...l,
        gzipRequestBodiesLatchedOff: {
          latchedAt: Date.now(),
          status,
        },
      }),
      storageV5,
    );
  }
  return gzipRequestBody.persistedLatchInEffect ? "persisted" : "process";
}
//@ chunk-nmregrje.js:5304-5848 placement
/**
 * 按投放范围（api、ccr_worker、frame_publish）记录 gzip 请求体特性结果：回退记一次负面，成功每进程只记一次。
 */
function logGzipFeature(rollout, outcome) {
  switch (rollout) {
    case "api":
      if (outcome === "fell_back") logFeatureSad("api_gzip_request_body", "fell_back");
      else if (streamFallbackWarning().once("gzip_request_body_ok")) logFeatureOk("api_gzip_request_body");
      return;
    case "ccr_worker":
      if (outcome === "fell_back") logFeatureSad("ccr_worker_gzip_request_body", "fell_back");
      else if (streamFallbackWarning().once("ccr_worker_gzip_request_body_ok"))
        logFeatureOk("ccr_worker_gzip_request_body");
      return;
    case "frame_publish":
      if (outcome === "fell_back") logFeatureSad("artifact_publish_gzip_request_body", "fell_back");
      else if (streamFallbackWarning().once("artifact_publish_gzip_request_body_ok"))
        logFeatureOk("artifact_publish_gzip_request_body");
      return;
  }
}
//@ chunk-nmregrje.js:5848-5882 placement
/**
 * 导出函数 `logGzipSent`：参数 e = "api"。
 */
function logGzipSent(rollout = "api") {
  logGzipFeature(rollout, "sent");
}
//@ chunk-nmregrje.js:5882-6122 placement
function logCcrSkipReason(rollout, n) {
  if (rollout !== "ccr_worker") return;
  let ccrWorkerSkipReasonsLogged = streamFallbackWarning().gzipRequestBody.ccrWorkerSkipReasonsLogged;
  if (ccrWorkerSkipReasonsLogged.has(n.reason)) return;
  ccrWorkerSkipReasonsLogged.add(n.reason);
  logEvent("tengu_gzip_request_body_skipped", {
    rollout: fromEnum(rollout),
    reason: fromEnum(n.reason),
    requestBodyChars: n.bodyChars,
  });
}
//@ chunk-nmregrje.js:6122-6601 placement
/**
 * 记录 gzip 请求体被拒后回退为未压缩重发的情况：调试日志与 tengu_gzip_request_body_fallback 遥测（拒绝类别、状态码、重发结果、是否闩锁关闭）。
 */
function logGzipFallback({
  rejection,
  status,
  viaCloudflare,
  retryOutcome,
  retryStatus,
  latched,
  bodyChars,
  rollout = "api",
}) {
  logGzipFeature(rollout, "fell_back");
  logForDebugging(
    `[API REQUEST] gzip request body rejected (rollout=${rollout} status=${status} kind=${rejection}); re-sent uncompressed \u2192 ${retryOutcome}${retryStatus !== undefined ? ` status=${retryStatus}` : ""}; gzip latched off: ${latched}`,
    {
      level: "warn",
    },
  );
  logEvent("tengu_gzip_request_body_fallback", {
    rollout: fromEnum(rollout),
    rejection: fromEnum(rejection),
    status,
    viaCloudflare,
    retryOutcome: fromEnum(retryOutcome),
    retryStatus,
    latched: fromEnum(latched),
    requestBodyChars: bodyChars,
  });
}
//@ chunk-nmregrje.js:6601-7182 placement
/**
 * gzip 请求被拒后以未压缩方式重发：记录拒绝原因与重发结果，必要时持久锁存关闭（非 Anthropic 拒绝且重发成功），返回重发响应。
 */
async function resendUncompressed({
  rejection,
  first,
  resend,
  facts,
  aborted,
  bodyChars,
  storageV5,
  rollout,
}) {
  let _ = {
    rejection,
    status: first.status,
    viaCloudflare: first.header("cf-ray") !== undefined,
    bodyChars,
    rollout,
  };
  let m;
  try {
    m = await resend();
  } catch (error) {
    logGzipFallback({
      ..._,
      retryOutcome: aborted() ? "aborted" : "network_error",
      retryStatus: undefined,
      latched: latchGzipOff({
        persist: false,
        status: first.status,
        storageV5,
        rollout,
      }),
    });
    throw error;
  }
  let R = facts(m);
  let z = await classifyResend(R);
  let latched = latchGzipOff({
    persist: rollout !== "ccr_worker" && rejection === "non_anthropic_rejection" && z === "api_response",
    status: first.status,
    storageV5,
    rollout,
  });
  logGzipFallback({
    ..._,
    retryOutcome: z,
    retryStatus: R.status,
    latched,
  });
  return m;
}
//@ chunk-nmregrje.js:7182-7798 placement
/**
 * 检查 gzip 请求的响应是否为拒绝：是则锁存关闭、取消原响应、更新遥测，并以原始请求体重发。
 */
async function retryRejectedGzipRequest({
  res,
  dispatch,
  finalInit,
  identityBody,
  clientRequestId,
  storageV5,
  rollout = "api",
}) {
  let B = await classifyRejectionOf(res);
  if (B === null) return res;
  latchOffThisProcess();
  res.body?.cancel().catch(() => {});
  let { compress, ...m } = finalInit;
  let R = {
    ...m,
    body: identityBody,
  };
  if (clientRequestId !== undefined) {
    let z = streamFallbackWarning().gzipRequestBody.telemetryByClientRequestId.get(clientRequestId);
    recordGzipBlockTelemetry(clientRequestId, {
      requestBodyEncoding: "identity",
      requestBodyChars: bodyCharCount(identityBody) ?? identityBody.length,
      gzipFallbackStatus: res.status,
      ...(z !== undefined &&
        "gzipBlocks" in z && {
          gzipBlocks: z.gzipBlocks,
        }),
      ...reuseTelemetry(identityBody),
    });
  }
  return resendUncompressed({
    rejection: B,
    first: responseFacts(res),
    resend: () => dispatch(R),
    facts: responseFacts,
    aborted: () => finalInit.signal?.aborted === true,
    bodyChars: bodyCharCount(identityBody) ?? identityBody.length,
    storageV5,
    rollout,
  });
}
//@ chunk-nmregrje.js:7798-8040 placement
/**
 * Artifact 帧发布时检查 gzip 是否被拒，被拒则以未压缩身份重发并处理闩锁，否则原样返回响应。
 */
async function handleFrameGzipRejection({
  answer,
  facts,
  resendIdentity,
  aborted,
  bodyChars,
  storageV5,
  rollout,
}) {
  let B = facts(answer);
  let _ = await classifyGzipRejection(B);
  if (_ === null) return answer;
  latchOffThisProcess();
  return resendUncompressed({
    rejection: _,
    first: B,
    resend: resendIdentity,
    facts,
    aborted,
    bodyChars,
    storageV5,
    rollout,
  });
}
//@ chunk-nmregrje.js:8040-8326 placement
/**
 * 生成带 gzip 压缩的 fetch 包装：符合条件时压缩请求体并加水印，被拒时自动回退重发。
 */
function createGzipFetchWrapper(rollout, storage) {
  return async (r, s, d) => {
    let l = ANT_KEY_PFX(r, s.body, storage, rollout);
    if (!l?.gzip) {
      if (l !== undefined) logCcrSkipReason(rollout, l);
      return d(s);
    }
    logGzipSent(rollout);
    let y = {
      ...s,
      compress: "gzip",
      body: appendWatermark(s.body),
    };
    let res = await d(y);
    return retryRejectedGzipRequest({
      res,
      dispatch: d,
      finalInit: y,
      identityBody: s.body,
      clientRequestId: undefined,
      storageV5: storage,
      rollout,
    });
  };
}
//@ chunk-nmregrje.js:8326-8401 placement
/**
 * 导出函数 `recordGzipBlockTelemetry`：参数 e, n。
 */
function recordGzipBlockTelemetry(e, n) {
  streamFallbackWarning().gzipRequestBody.telemetryByClientRequestId.set(e, n);
}
//@ chunk-nmregrje.js:8401-8647 placement
/**
 * 请求体按块 gzip 被拒时，把该请求的遥测记录标记为 rejected。
 */
function markGzipBlocksRejected(e, n) {
  if (e === null) return;
  let telemetryByClientRequestId = streamFallbackWarning().gzipRequestBody.telemetryByClientRequestId;
  let s = telemetryByClientRequestId.get(e);
  if (s?.requestBodyEncoding !== "gzip") return;
  telemetryByClientRequestId.set(e, {
    ...s,
    gzipBlocks:
      s.gzipBlocks?.outcome === "as_blocks"
        ? {
            ...s.gzipBlocks,
            outcome: "rejected",
          }
        : n,
  });
}
//@ chunk-nmregrje.js:8647-8723 placement
/**
 * 导出函数 `takeDispatchAtGzip`：参数 e, n。
 */
function takeDispatchAtGzip(e, n) {
  streamFallbackWarning().gzipRequestBody.dispatchAtByClientRequestId.set(e, n);
}
//@ chunk-nmregrje.js:8723-8847 placement
/**
 * 取出并删除某个客户端请求 id 记录的分派时间。
 */
function takeDispatchAt(e) {
  if (e === undefined) return;
  let dispatchAtByClientRequestId = streamFallbackWarning().gzipRequestBody.dispatchAtByClientRequestId;
  let r = dispatchAtByClientRequestId.get(e);
  dispatchAtByClientRequestId.delete(e);
  return r;
}
//@ chunk-nmregrje.js:8847-8970 placement
/**
 * 取出并删除某个客户端请求 id 的 gzip 遥测记录。
 */
function takeGzipTelemetry(e) {
  if (e === undefined) return;
  let telemetryByClientRequestId = streamFallbackWarning().gzipRequestBody.telemetryByClientRequestId;
  let r = telemetryByClientRequestId.get(e);
  telemetryByClientRequestId.delete(e);
  return r;
}
//@ chunk-nmregrje.js:8970-10369 placement
/**
 * 把 gzip 请求体遥测（编码、字符数、级别、准备耗时、块复用、跳过原因、回退状态等）展开为日志字段。
 */
function gzipTelemetryFields(telemetry) {
  if (telemetry === undefined) return {};
  return {
    requestBodyEncoding: fromEnum(telemetry.requestBodyEncoding),
    requestBodyChars: telemetry.requestBodyChars,
    ...(telemetry.requestBodyEncoding === "gzip" &&
      telemetry.requestBodyGzipLevel !== undefined && {
        requestBodyGzipLevel: telemetry.requestBodyGzipLevel,
      }),
    ...("requestPrepareMs" in telemetry &&
      telemetry.requestPrepareMs !== undefined && {
        requestPrepareMs: telemetry.requestPrepareMs,
      }),
    ...("requestBodyReusedChars" in telemetry &&
      telemetry.requestBodyReusedChars !== undefined && {
        requestBodyReusedChars: telemetry.requestBodyReusedChars,
      }),
    ...("requestBodyComparedWithSdk" in telemetry &&
      telemetry.requestBodyComparedWithSdk !== undefined && {
        requestBodyComparedWithSdk: telemetry.requestBodyComparedWithSdk,
      }),
    ...("gzipBlocks" in telemetry &&
      telemetry.gzipBlocks !== undefined && {
        requestBodyGzipBlocksMode: telemetry.gzipBlocks.mode,
        requestBodyGzipBlocksOutcome: fromEnum(telemetry.gzipBlocks.outcome),
        ...(telemetry.gzipBlocks.planned !== undefined && {
          requestBodyGzipBlockCount: telemetry.gzipBlocks.planned.blockCount,
          requestBodyGzipReusedBlockCount: telemetry.gzipBlocks.planned.reusedBlockCount,
          requestBodyGzipReusedBytes: telemetry.gzipBlocks.planned.reusedBytes,
          requestBodyGzipBlocksMs: telemetry.gzipBlocks.planned.spentMs,
          ...(telemetry.gzipBlocks.planned.gzippedBytes !== undefined && {
            requestBodyGzippedBytes: telemetry.gzipBlocks.planned.gzippedBytes,
          }),
          requestBodyGzipStoredBytes: telemetry.gzipBlocks.planned.storedBytes,
          requestBodyGzipEvictedBlockCount: telemetry.gzipBlocks.planned.evictedForSpaceCount,
        }),
      }),
    ...("gzipSkipReason" in telemetry && {
      gzipSkipReason: fromEnum(telemetry.gzipSkipReason),
    }),
    ...("gzipFallbackStatus" in telemetry && {
      gzipFallback: true,
      gzipFallbackStatus: telemetry.gzipFallbackStatus,
    }),
  };
}
//@ chunk-nmregrje.js:10369-10378 placement
swapWatermark(ANT_KEY_PFX);
//@ chunk-rbe666af.js:1909-2047 placement
/**
 * gzip 分块请求体的常量：块 128 KB、字典 32 KB、最多保留 4 块、缓存上限 32、空闲丢弃 210 s、CTC BLOCK 头 256 字节、正文切分标记与系统块尾部间隙 1024。
 */
var GZIP_BLOCK_BYTES = 131072;
var GZIP_DICTIONARY_BYTES = 32768;
var MAX_REUSE_BODY_BYTES = 4 * GZIP_BLOCK_BYTES;
var Z = 32;
var MIN_BLOCK_CONCURRENCY = 2;
var DEFAULT_BLOCK_BUDGET = MAX_REQUEST_BYTES;
var BLOCK_IDLE_DROP_MS = 210000;
var BLOCK_OVERHEAD_BYTES = 256;
var BODY_SPLIT_MARKERS = {
  messages: '"messages":[',
  system: '],"system":',
  endOfSystemBlock: '"},{',
};
var MAX_SYSTEM_TAIL_GAP = 1024;
//@ chunk-rbe666af.js:2047-2227 placement
function N(maxStoredBytes = DEFAULT_BLOCK_BUDGET) {
  return {
    blocks: new Map(),
    storedBytes: 0,
    maxStoredBytes,
    evictedForSpaceCount: 0,
    generation: 0,
    keptBody: undefined,
    cancelIdleDrop: undefined,
    pooledCompression: Promise.resolve(),
  };
}
//@ chunk-rbe666af.js:2227-2354 placement
/**
 * 清空 gzip 块缓存：取消空闲清理、清空块与保留的请求体、递增世代。
 */
function clearGzipBlockStore(blockStore) {
  blockStore.cancelIdleDrop?.();
  blockStore.cancelIdleDrop = undefined;
  blockStore.blocks.clear();
  blockStore.storedBytes = 0;
  blockStore.keptBody = undefined;
  blockStore.generation++;
}
//@ chunk-rbe666af.js:2354-2787 placement
/**
 * 规划分块 gzip：在 messages/system 边界处把请求体切成固定大小块（带字典窗口），计算每块的键并从缓存中取出可复用的压缩结果，统计复用块数与字节。
 */
function planGzipBlocks({ body, level, store, clock }) {
  let s = splitBodyBlocks(body);
  let { keys, carriedDigestCount } = blockDigestKeys(
    body,
    s,
    level,
    body.buffer === store.keptBody?.memory.buffer && body.byteOffset === 0 ? store.keptBody : undefined,
  );
  let lastUsedAt = clock.monotonicNow();
  let d = 0;
  let reusedBytes = 0;
  let reused = s.map((y, S) => {
    let g = takeCachedBlock(store, keys[S], lastUsedAt);
    if (g !== undefined) {
      d++;
      reusedBytes += y.end - y.start;
    }
    return g;
  });
  if (store.blocks.size > 0) scheduleIdleDrop(store, clock);
  return {
    body,
    level,
    blocks: s,
    keys,
    reused,
    reusedBlockCount: d,
    reusedBytes,
    carriedDigestCount,
    generation: store.generation,
  };
}
//@ chunk-rbe666af.js:2787-2867 placement
/**
 * 导出函数 `needsBodyAssembly`：参数 { keys: keys, reused: reused }，返回 keys.some((n, r) => n !== void 0 && reused[r] === void 0)。
 */
function needsBodyAssembly({ keys, reused }) {
  return keys.some((key, r) => key !== undefined && reused[r] === undefined);
}
//@ chunk-rbe666af.js:2867-3107 placement
/**
 * 组装完整的 gzip 请求体：gzip 头、各压缩块与包含 CRC32 和长度的尾部。
 */
async function assembleGzipBody(e, blockStore, n, r) {
  let s = await gzipRequestBody(e, blockStore, n, r);
  let buffer = Buffer.from([31, 139, 8, 0, 0, 0, 0, 0, 0, 255]);
  let o = Buffer.alloc(10);
  o[0] = 3;
  o.writeUInt32LE(Bun.hash.crc32(e.body), 2);
  o.writeUInt32LE(e.body.length % 4294967296, 6);
  return Buffer.concat([buffer, ...s, o]);
}
//@ chunk-rbe666af.js:3107-3240 placement
class GzipBlockCheckError extends Error {
  fault;
  constructor(fault, t) {
    super("Request body gzip: a newly compressed block failed its check", t);
    this.fault = fault;
  }
}
//@ chunk-rbe666af.js:3240-3321 placement
/**
 * 导出函数 `zlibErrorCode`：参数 e，返回 t === "Z_DATA_ERROR" || t === "Z_BUF_ERROR" ? t : void 0。
 */
function zlibErrorCode(e) {
  let errnoCode = getErrnoCode(e);
  return errnoCode === "Z_DATA_ERROR" || errnoCode === "Z_BUF_ERROR" ? errnoCode : undefined;
}
//@ chunk-rbe666af.js:3321-4394 placement
/**
 * 压缩请求体并校验每个压缩块
 */
async function gzipRequestBody(e, t, n, { signal: r, stopIf: s, inBackground: i = false } = {}) {
  let { body, level, blocks, keys, reused, generation } = e;
  let S;
  if (!i && body.length - e.reusedBytes <= MAX_REUSE_BODY_BYTES)
    S = blocks.map((block, R) => {
      let h = reused[R];
      if (h !== undefined) return h;
      let chunk = body.subarray(block.start, block.end);
      let _ = x(body, block, level);
      let f = deflateRawSync(chunk, _);
      try {
        verifyInflatedBlock(chunk, f, inflateRawSync(f, _));
      } catch (error) {
        throw toGzipCheckError(error);
      }
      return f;
    });
  else {
    let R = (i ? Promise.resolve() : t.pooledCompression).then(() => {
      r?.throwIfAborted();
      let lastUsedAt = n.monotonicNow();
      return pMap(
        blocks,
        async (p, _) => {
          if (s?.()) throw Error("Request body gzip: compression stopped");
          if (reused[_] !== undefined) return reused[_];
          let f = t.generation === generation ? takeCachedBlock(t, keys[_], lastUsedAt) : undefined;
          if (f !== undefined) {
            e.reusedBlockCount++;
            e.reusedBytes += p.end - p.start;
            return f;
          }
          let chunk = body.subarray(p.start, p.end);
          let m = x(body, p, level);
          let b = await deflateChunkAsync(chunk, m);
          try {
            verifyInflatedBlock(chunk, b, await inflateChunkAsync(b, m));
          } catch (error) {
            throw toGzipCheckError(error);
          }
          return b;
        },
        {
          concurrency: i ? MIN_BLOCK_CONCURRENCY : Z,
          signal: r,
        },
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
  let lastUsedAt = n.monotonicNow();
  S.forEach((l, R) => {
    let h = keys[R];
    if (h !== undefined && !t.blocks.has(h)) {
      let p = l.buffer.byteLength === l.length;
      storeBlock(t, h, p ? l : Buffer.copyBytesFrom(l), lastUsedAt);
    }
  });
  evictGzipBlocks(t, lastUsedAt);
  scheduleIdleDrop(t, n);
  return S;
}
//@ chunk-rbe666af.js:4394-4689 placement
function splitBodyBlocks(body) {
  let index = body.lastIndexOf(BODY_SPLIT_MARKERS.system);
  let n = index === -1 ? -1 : body.indexOf(BODY_SPLIT_MARKERS.endOfSystemBlock, index);
  let r = [
    body.indexOf(BODY_SPLIT_MARKERS.messages),
    index,
    n !== -1 && n - index <= MAX_SYSTEM_TAIL_GAP ? n + 2 : -1,
    body.length,
  ];
  let s = [];
  let i = 0;
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
/**
 * 按块计算 gzip 请求体各块摘要并复用上次摘要（carriedDigestCount），用于块缓存键。
 */
function blockDigestKeys(body, t, level, r) {
  let s = 0;
  let mapped = t.map((o) => {
    if (o.end - o.start !== GZIP_BLOCK_BYTES) return;
    let a = r?.blockDigests.get(o.start);
    if (r !== undefined && a?.end === o.end && o.end <= r.digestedBytes) {
      s++;
      return a.digest;
    }
    return Bun.SHA256.hash(body.subarray(o.start, o.end), "base64");
  });
  if (r !== undefined) {
    r.blockDigests = new Map(
      t.flatMap((o, a) => {
        let d = mapped[a];
        return d === undefined
          ? []
          : [
              [
                o.start,
                {
                  end: o.end,
                  digest: d,
                },
              ],
            ];
      }),
    );
    r.digestedBytes = r.length;
  }
  return {
    carriedDigestCount: s,
    keys: t.map((o, a) => {
      let d = mapped[a];
      let c = o.dictionaryStart < o.start ? mapped[a - 1] : "none";
      return d === undefined || c === undefined ? undefined : `${level}:${c}:${d}`;
    }),
  };
}
//@ chunk-rbe666af.js:5235-5269 placement
function deflateChunkAsync(e, t) {
  return promisify(deflateRaw)(e, t);
}
//@ chunk-rbe666af.js:5269-5303 placement
function inflateChunkAsync(e, t) {
  return promisify(inflateRaw)(e, t);
}
//@ chunk-rbe666af.js:5303-5457 placement
function x(body, t, level) {
  return {
    level,
    finishFlush: constants.Z_SYNC_FLUSH,
    chunkSize: GZIP_BLOCK_BYTES,
    ...(t.dictionaryStart < t.start && {
      dictionary: body.subarray(t.dictionaryStart, t.start),
    }),
  };
}
//@ chunk-rbe666af.js:5457-5525 placement
function toGzipCheckError(error) {
  let fault = zlibErrorCode(error);
  return fault === undefined
    ? error
    : new GzipBlockCheckError(fault, {
        cause: error,
      });
}
//@ chunk-rbe666af.js:5525-5538 placement
var Z_SYNC_FLUSH_MARKER = 65535;
//@ chunk-rbe666af.js:5538-5693 placement
function verifyInflatedBlock(e, t, n) {
  if (!n.equals(e)) throw new GzipBlockCheckError("inflates_to_other_bytes");
  if (t.length < 4 || t.readUInt32BE(t.length - 4) !== Z_SYNC_FLUSH_MARKER)
    throw new GzipBlockCheckError("no_flush_marker");
}
//@ chunk-rbe666af.js:5693-5878 placement
function takeCachedBlock(e, t, lastUsedAt) {
  let r = t === undefined ? undefined : e.blocks.get(t);
  if (t === undefined || r === undefined) return;
  e.blocks.delete(t);
  e.blocks.set(t, {
    compressed: r.compressed,
    lastUsedAt,
  });
  return r.compressed;
}
//@ chunk-rbe666af.js:5878-5971 placement
function storeBlock(e, t, compressed, lastUsedAt) {
  let s = {
    compressed,
    lastUsedAt,
  };
  e.blocks.set(t, s);
  e.storedBytes += blockStoredSize(s);
}
//@ chunk-rbe666af.js:5971-6151 placement
function evictGzipBlocks(e, t) {
  for (let [n, r] of e.blocks) {
    let s = e.storedBytes > e.maxStoredBytes;
    if (!s && t - r.lastUsedAt < BLOCK_IDLE_DROP_MS) return;
    e.blocks.delete(n);
    e.storedBytes -= blockStoredSize(r);
    if (s) e.evictedForSpaceCount++;
  }
}
//@ chunk-rbe666af.js:6151-6298 placement
/**
 * 安排空闲一段时间后清空 gzip 块缓存（弱引用，不阻止退出）。
 */
function scheduleIdleDrop(e, t) {
  let weakRef = new WeakRef(e);
  e.cancelIdleDrop?.();
  e.cancelIdleDrop = t.setTimeout(
    () => {
      let r = weakRef.deref();
      if (r !== undefined) clearGzipBlockStore(r);
    },
    BLOCK_IDLE_DROP_MS,
    {
      unref: true,
    },
  );
}
//@ chunk-rbe666af.js:6298-6341 placement
function blockStoredSize(e) {
  return BLOCK_OVERHEAD_BYTES + e.compressed.length;
}
//@ chunk-rbe666af.js:6341-6373 placement
function newWeakMap() {
  return new WeakMap();
}
//@ chunk-hwmsct5x.js:241035-241246 placement
/**
 * 请求体 gzip/复用校验按块进行所需的最小体积（512 KB）、大响应体标记与开关参数（gzip 等级 6、块并发 1000、不压的查询来源、抽样率 0.1）。
 */
var TENGU_BUZZING_PIKE = "tengu_buzzing_pike";
var MIN_CHARS_FOR_REUSE_CHECK = 524288;
var LARGE_BODY_MARKERS = ['"thread":{"type":"create"}', '"thread":{"type":"continue",', '"speed":"fast"'];
var MARKER_SEARCH_TAIL_CHARS = 4096;
var DEFAULT_GZIP_LEVEL = 6;
var BLOCK_CONCURRENCY = 1000;
var NO_GZIP_QUERY_SOURCES = new Set(["extract_memories", "prompt_suggestion", "compact"]);
var REUSE_MISMATCH_SAMPLE_RATE = 0.1;
//@ chunk-hwmsct5x.js:241246-241389 placement
function gzipTelemetryExtras(e) {
  return {
    incremental_request_body: e.incrementalRequestBody === true,
    ...(e.carriedDigests !== undefined && {
      carried_digests: e.carriedDigests,
    }),
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
    return new URL(requestMethodAndUrl(e, undefined).url).pathname.endsWith("/v1/messages");
  } catch {
    return false;
  }
}
//@ chunk-hwmsct5x.js:241585-241774 placement
function shouldGzipRequestBody(e) {
  let body = e?.body;
  return (
    gzipLevelOf(e?.compress) !== undefined &&
    (typeof body === "string" || isSerialisedBody(body)) &&
    (bodyCharCount(body) ?? 0) >= MIN_CHARS_FOR_REUSE_CHECK &&
    !LARGE_BODY_MARKERS.some((r) =>
      body.includes(
        r,
        Math.max(0, body.length - MARKER_SEARCH_TAIL_CHARS * (typeof body === "string" ? 1 : 3)),
      ),
    )
  );
}
//@ chunk-hwmsct5x.js:241774-243558 placement
/**
 * 请求体 gzip 分块压缩：按会话开关决定整体/分块/关闭，构建增量块存储并在响应后自检。
 */
async function prepareGzipRequestBody(e, n = systemClock) {
  let level = gzipLevelOf(e?.compress);
  if (
    e === undefined ||
    level === undefined ||
    !(typeof e.body === "string" || isSerialisedBody(e.body)) ||
    !shouldGzipRequestBody(e)
  )
    return {
      init: e,
    };
  let body = e.body;
  let h =
    typeof body === "string"
      ? {}
      : {
          incrementalRequestBody: true,
        };
  let y = h;
  let w = streamFallbackWarning();
  let gzipRequestBody = w.gzipRequestBody;
  let blockStore = gzipRequestBody.blockStore;
  let headers = new Headers(e.headers);
  let L = headers.get(CLIENT_REQUEST_ID_HEADER);
  let gzipRequestBodyBlocksMode = getGzipRequestBodyBlocksMode();
  if (gzipRequestBodyBlocksMode === 0 || gzipRequestBody.blocksSwitchedOff) {
    markGzipBlocksRejected(L, {
      mode: gzipRequestBodyBlocksMode,
      outcome: gzipRequestBodyBlocksMode === 0 ? "off" : "switched_off",
    });
    return {
      init: e,
    };
  }
  let M = L === null ? undefined : gzipRequestBody.telemetryByClientRequestId.get(L);
  let P = !(
    M?.requestBodyEncoding === "gzip" &&
    M.querySource !== undefined &&
    NO_GZIP_QUERY_SOURCES.has(M.querySource)
  );
  if (gzipRequestBodyBlocksMode === 1 && blockStore.blocks.size === 0) {
    markGzipBlocksRejected(L, {
      mode: gzipRequestBodyBlocksMode,
      outcome: "by_runtime",
    });
    return {
      init: e,
      ...(P && {
        afterResponse: onGzipBlocksBuilt(gzipRequestBody, n, body, level, h),
      }),
    };
  }
  let H = () => {
    markGzipBlocksRejected(L, {
      mode: gzipRequestBodyBlocksMode,
      outcome: "switched_off",
    });
    return {
      init: e,
    };
  };
  let startTime = performance.now();
  try {
    let z = planGzipBlocks({
      body: typeof body === "string" ? Buffer.from(body) : body,
      level,
      store: blockStore,
      clock: n,
    });
    if (h.incrementalRequestBody)
      y = {
        ...h,
        carriedDigests: z.carriedDigestCount,
      };
    let G = z.reusedBytes * 2 < z.body.length;
    let q =
      gzipRequestBodyBlocksMode === 1 && G
        ? undefined
        : await assembleGzipBody(z, blockStore, n, {
            signal: e.signal ?? undefined,
            stopIf: () => gzipRequestBody.blocksSwitchedOff !== false,
          });
    if (gzipRequestBody.blocksSwitchedOff) return H();
    markGzipBlocksRejected(L, {
      mode: gzipRequestBodyBlocksMode,
      outcome: q === undefined ? "by_runtime" : "as_blocks",
      planned: {
        blockCount: z.blocks.length,
        reusedBlockCount: z.reusedBlockCount,
        reusedBytes: z.reusedBytes,
        spentMs: Math.round(performance.now() - startTime),
        gzippedBytes: q?.length,
        storedBytes: blockStore.storedBytes,
        evictedForSpaceCount: blockStore.evictedForSpaceCount,
      },
    });
    if (q === undefined)
      return {
        init: e,
        ...(P &&
          needsBodyAssembly(z) && {
            afterResponse: onGzipBlocksBuilt(gzipRequestBody, n, body, level, h),
          }),
      };
    if (w.once("gzip_request_body_blocks_ok")) logFeatureOk("api_gzip_request_body_blocks");
    headers.set("Content-Encoding", "gzip");
    let { compress, ...Z } = e;
    return {
      init: {
        ...Z,
        headers,
        body: q,
      },
      afterResponse: scheduleGzipSelfCheck(gzipRequestBody, n, q, y),
    };
  } catch (error) {
    if (e.signal?.aborted)
      return {
        init: e,
      };
    if (gzipRequestBody.blocksSwitchedOff && !(error instanceof GzipBlockCheckError)) return H();
    reportGzipBlockFailure(error, gzipRequestBody, "failed", y);
    markGzipBlocksRejected(L, {
      mode: gzipRequestBodyBlocksMode,
      outcome: "failed",
    });
    return {
      init: e,
    };
  }
}
//@ chunk-hwmsct5x.js:243558-244092 placement
async function handleGzipRejectedResponse(e, n) {
  let gzipRequestBody = streamFallbackWarning().gzipRequestBody;
  let s = gzipRequestBody.blockGzippedResponses.get(e);
  if (s === undefined) return e;
  let h = await classifyRejectionOf(e);
  if (h === null) return e;
  switchOffGzipBlocks(gzipRequestBody, "for_the_session", `rejected (status=${e.status} kind=${h})`);
  e.body?.cancel().catch(() => {});
  let y;
  try {
    y = await n();
    return y;
  } finally {
    logFeatureSad("api_gzip_request_body_blocks", "rejected", {
      status: e.status,
      rejection: fromEnum(h),
      ...(y !== undefined && {
        resendStatus: y.status,
      }),
      ...s,
    });
    logForDiagnosticsNoPII("warn", "api_gzip_request_body_blocks_rejected", {
      status: e.status,
      rejection: h,
      ...(y !== undefined && {
        resend_status: y.status,
      }),
      ...gzipTelemetryExtras(s),
    });
  }
}
//@ chunk-hwmsct5x.js:244092-244287 placement
function switchOffGzipBlocks(e, blocksSwitchedOff, r) {
  if (e.blocksSwitchedOff !== "for_the_session") e.blocksSwitchedOff = blocksSwitchedOff;
  clearGzipBlockStore(e.blockStore);
  logForDebugging(`[API REQUEST] gzip in blocks switched off (${e.blocksSwitchedOff}): ${r}`, {
    level: "warn",
  });
}
//@ chunk-hwmsct5x.js:244287-244693 placement
function reportGzipBlockFailure(error, n, r, s) {
  logError(error);
  if (error instanceof GzipBlockCheckError) {
    switchOffGzipBlocks(n, "for_the_session", `a new block failed its check (${error.fault})`);
    logFeatureSad("api_gzip_request_body_blocks", "piece_check_failed", {
      fault: fromEnum(error.fault),
      ...s,
    });
    logForDiagnosticsNoPII("warn", "api_gzip_request_body_blocks_piece_check_failed", {
      fault: error.fault,
      ...gzipTelemetryExtras(s),
    });
  } else {
    switchOffGzipBlocks(n, "until_next_conversation", "compression threw");
    logFeatureSad("api_gzip_request_body_blocks", r, ...(s.incrementalRequestBody ? [s] : []));
  }
}
//@ chunk-hwmsct5x.js:244693-245303 placement
function onGzipBlocksBuilt(gzipRequestBody_2, n, body, level, h) {
  let blockStore = gzipRequestBody_2.blockStore;
  let { generation } = blockStore;
  return (S) => {
    if (!S?.ok || gzipRequestBody_2.blocksBuildGeneration === generation) return;
    let E =
      typeof body !== "string" && body.buffer === blockStore.keptBody?.memory.buffer
        ? Buffer.from(body)
        : body;
    gzipRequestBody_2.blocksBuildGeneration = generation;
    n.setTimeout(
      async () => {
        try {
          if (
            !gzipRequestBody_2.blocksSwitchedOff &&
            getGzipRequestBodyBlocksMode() !== 0 &&
            blockStore.generation === generation
          )
            await gzipRequestBody(
              planGzipBlocks({
                body: typeof E === "string" ? Buffer.from(E) : E,
                level,
                store: blockStore,
                clock: n,
              }),
              blockStore,
              n,
              {
                inBackground: true,
                stopIf: () => gzipRequestBody_2.blocksSwitchedOff !== false,
              },
            );
        } catch (error) {
          if (!gzipRequestBody_2.blocksSwitchedOff || error instanceof GzipBlockCheckError)
            reportGzipBlockFailure(error, gzipRequestBody_2, "build_failed", h);
        } finally {
          if (gzipRequestBody_2.blocksBuildGeneration === generation)
            gzipRequestBody_2.blocksBuildGeneration = undefined;
        }
      },
      BLOCK_CONCURRENCY,
      {
        unref: true,
      },
    );
  };
}
//@ chunk-hwmsct5x.js:245303-245888 placement
function scheduleGzipSelfCheck(gzipRequestBody, n, r, s) {
  return (h) => {
    if (h !== undefined) gzipRequestBody.blockGzippedResponses.set(h, s);
    if (!isTransientFailure(h) && true && Math.random() >= REUSE_MISMATCH_SAMPLE_RATE) return;
    n.setTimeout(
      () =>
        promisify(gunzip)(r, {
          chunkSize: 1048576,
        }).catch((error) => {
          let w = sanitizeErrnoForTelemetry(error);
          let S = {
            ...(w !== undefined && {
              code: w,
            }),
            ...s,
          };
          let E = zlibErrorCode(error) !== undefined;
          switchOffGzipBlocks(
            gzipRequestBody,
            E ? "for_the_session" : "until_next_conversation",
            `the check of a sent body ended in ${getErrnoCode(error) ?? "an error"}`,
          );
          if (E) {
            logFeatureBad("api_gzip_request_body_blocks", "self_check_wrong_bytes", S);
            logForDiagnosticsNoPII("error", "api_gzip_request_body_blocks_self_check_wrong_bytes", {
              code: w,
              ...gzipTelemetryExtras(s),
            });
          } else logFeatureSad("api_gzip_request_body_blocks", "self_check_could_not_run", S);
        }),
      BLOCK_CONCURRENCY,
      {
        unref: true,
      },
    );
  };
}
//@ chunk-hwmsct5x.js:245888-245982 placement
function isTransientFailure(e) {
  return e === undefined || (e.status >= 400 && e.status < 500 && e.status !== 401 && e.status !== 429);
}
//@ chunk-hwmsct5x.js:245982-246098 placement
function gzipLevelOf(compress) {
  if (compress === "gzip") return DEFAULT_GZIP_LEVEL;
  return typeof compress === "object" && compress !== null && compress.encoding === "gzip"
    ? (compress.level ?? DEFAULT_GZIP_LEVEL)
    : undefined;
}
//@ chunk-hwmsct5x.js:246098-246171 placement
var routeFinalAnswerState = new HostScoped(() => ({
  route: undefined,
}));
var X_CLAUDE_CODE_ROUTE_FINAL_ANSWER = "x-claude-code-route-final-answer";
//@ chunk-hwmsct5x.js:246171-246242 placement
function isRoutedFinalAnswerError(error) {
  return (
    error instanceof APIError &&
    error.headers?.has(X_CLAUDE_CODE_ROUTE_FINAL_ANSWER) === true &&
    hasFinalAnswerRoute()
  );
}
//@ chunk-hwmsct5x.js:246242-246295 placement
function hasFinalAnswerRoute() {
  return routeFinalAnswerState.of(getRootSession().host).route !== undefined;
}
//@ chunk-hwmsct5x.js:246295-246577 placement
/**
 * API 客户端 fetch 包装：优先走注入的 route，再按需对请求体做 gzip 分块压缩。
 */
async function fetchWithRequestBodyCompression(e, init) {
  let r = routeFinalAnswerState.of(getRootSession().host).route?.(e, init, modelApiFetch);
  if (r !== undefined) return r;
  if (!shouldGzipRequestBody(init) || !isMessagesEndpoint(e)) return modelApiFetch(e, init);
  let { init: init_2, afterResponse } = await prepareGzipRequestBody(init).catch((error) => {
    logError(error);
    return {
      init,
    };
  });
  let y;
  try {
    y = await modelApiFetch(e, init_2);
    return y;
  } finally {
    if (y !== undefined || !isAbortedWithoutStreamError(init?.signal))
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
  bodyCharCount,
  takeDispatchAtGzip,
  fetchWithRequestBodyCompression,
  clearGzipBlockStore,
  isRoutedFinalAnswerError,
  isMessagesEndpoint,
  isSerialisedBody,
  takeDispatchAt,
  gzipLevelOverride,
  logGzipSent,
  reuseTelemetry,
  recordGzipBlockTelemetry,
  handleGzipRejectedResponse,
  retryRejectedGzipRequest,
  gzipTelemetryFields,
  takeGzipTelemetry,
  getGzipRequestBodyBlocksMode,
  hasFinalAnswerRoute,
  scheduleIdleDrop,
  newWeakMap,
  N,
  handleFrameGzipRejection,
  wouldGzipForHost,
};
