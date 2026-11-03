/**
 * services/artifacts/frameApi.ts
 *
 * 2.1.316 新增：Artifact（frame）接口请求头（X-Frame-*）、拒绝响应解析与套接字重试分类
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5nrcp6t7.js (19)
 * attribution: placement 19
 */
import { Agent } from "http";
import { nz } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { isHostEntrypoint } from "../../utils/entrypointKinds.js";
import { getSessionId } from "../../bootstrap/state.js";
import { env } from "../../utils/env.js";
import { getRemoteControlSessionCompatId } from "../../bridge/replBridgeHandle.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { sanitizedConnectionCodeForTelemetry, sanitizedErrCodeForTelemetry } from "../../utils/errors.js";
import { extractConnectionErrorDetails, SOCKET_CLOSED_CODES } from "../api/errorUtils.js";
import { isTransportError } from "../http/externalHttp.js";
import { isAxiosError, isCancel } from "../../../vendor/axios/dist/esm/axios.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { logError } from "../../utils/log.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-5nrcp6t7.js:1019-1127 placement
function sumBy(e, r) {
  var s;
  var n = -1;
  var a = e.length;
  while (++n < a) {
    var y = r(e[n]);
    if (y !== undefined) s = s === undefined ? y : s + y;
  }
  return s;
}
//@ chunk-5nrcp6t7.js:1127-1137 placement
var sumByAlias = sumBy;
//@ chunk-5nrcp6t7.js:1137-1189 placement
function sumByField(e, r) {
  return e && e.length ? sumByAlias(e, nz(r, 2)) : 0;
}
//@ chunk-5nrcp6t7.js:1189-1200 placement
/**
 * 导出常量或表 `sumByAliasField`：值为 ye。
 */
var sumByAliasField = sumByField;
//@ chunk-5nrcp6t7.js:1200-1260 placement
/**
 * frame API 的响应大小上限 20 MB 与拒绝响应的 content-type。
 */
var MAX_FRAME_RESPONSE_BYTES = 20971520;
var FRAME_REFUSAL_CONTENT_TYPE = "application/vnd.ant.frame-refusal+json";
//@ chunk-5nrcp6t7.js:1260-1942 placement
function buildFrameHeaders() {
  return {
    Accept: `application/json, ${FRAME_REFUSAL_CONTENT_TYPE}`,
    "X-Frame-CP": "go",
    "X-Frame-Surface": "code",
    "X-Frame-Platform": isHostEntrypoint() ? "desktop" : "cli",
    "X-Frame-Client-Version": {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION,
    "X-Frame-Session-Id": frameSessionId() ?? getSessionId(),
  };
}
//@ chunk-5nrcp6t7.js:1942-1991 placement
var FRAME_SESSION_ID_RE = /^(?:session_|cse_)[A-Za-z0-9_-]{1,184}$/;
//@ chunk-5nrcp6t7.js:1991-2081 placement
/**
 * 导出函数 `frameSessionId`：返回 e && he.test(e) ? e : void 0。
 */
function frameSessionId() {
  let e = env.CLAUDE_CODE_REMOTE_SESSION_ID ?? getRemoteControlSessionCompatId();
  return e && FRAME_SESSION_ID_RE.test(e) ? e : undefined;
}
//@ chunk-5nrcp6t7.js:2081-2117 placement
var REQUEST_ID_RE = /^req_[A-Za-z0-9_-]{4,128}$/;
//@ chunk-5nrcp6t7.js:2117-2181 placement
/**
 * 导出函数 `requestIdMeta`：参数 e，返回 e !== void 0 && be.test(e) ? { request_id: e } : {}。
 */
function requestIdMeta(requestId) {
  return requestId !== undefined && REQUEST_ID_RE.test(requestId)
    ? {
        request_id: requestId,
      }
    : {};
}
//@ chunk-5nrcp6t7.js:2181-2301 placement
/**
 * 创建确认查询参数、对应的 MCP _meta 键，以及识别"未知字段/未在允许列表"的错误正则。
 */
var CREATE_CONFIRMED_QUERY = "create_confirmed=1";
var ANTHROPIC_FRAMECREATECONFIRMED = "anthropic/frameCreateConfirmed";
var UNKNOWN_FIELD_ERROR_RE = /unknown field|not a recognized|not allowlisted/i;
//@ chunk-5nrcp6t7.js:2301-2527 placement
/**
 * 把 frame 接口的错误响应体格式化成文字：字符串原样，带 error（附 [reason]）的对象取 error，其他对象转 JSON。
 */
function formatFrameErrorBody(e) {
  if (typeof e === "string") return e;
  if (e && typeof e === "object") {
    if ("error" in e && typeof e.error === "string") {
      let r = "reason" in e && typeof e.reason === "string" ? ` [${e.reason}]` : "";
      return e.error + r;
    }
    return jsonStringify(e) ?? "";
  }
  return "";
}
//@ chunk-5nrcp6t7.js:2527-2612 placement
/**
 * 导出函数 `mentionsField`：参数 e, r，返回 e.includes(`'${r}'`) || new RegExp(`"${r}"(?!\\??:)`).test(e)。
 */
function mentionsField(e, r) {
  return e.includes(`'${r}'`) || new RegExp(`"${r}"(?!\\??:)`).test(e);
}
//@ chunk-5nrcp6t7.js:2612-2671 placement
/**
 * 导出函数 `isUnknownFieldErrorFor`：参数 e, r，返回 UNKNOWN_FIELD_ERROR_RE.test(s) && STt(s, r)。
 */
function isUnknownFieldErrorFor(e, r) {
  let s = formatFrameErrorBody(e);
  return UNKNOWN_FIELD_ERROR_RE.test(s) && mentionsField(s, r);
}
//@ chunk-5nrcp6t7.js:2671-2702 placement
/**
 * 导出常量或表 `SAFE_ERROR_CODE_RE`：值为 /^[A-Za-z0-9_-]{1,64}$/。
 */
var SAFE_ERROR_CODE_RE = /^[A-Za-z0-9_-]{1,64}$/;
//@ chunk-5nrcp6t7.js:2732-2874 placement
/**
 * 构造请求失败的打点字段：是否传输层错误、规范化的错误码、耗时（毫秒）。
 */
function getTransportErrorProps(error, r) {
  let s =
    sanitizedConnectionCodeForTelemetry(extractConnectionErrorDetails(error)?.code) ??
    sanitizedErrCodeForTelemetry(error);
  return {
    transport: isTransportError(error),
    ...(s !== undefined && {
      err_code: s,
    }),
    elapsed_ms: Math.round(performance.now() - r),
  };
}
//@ chunk-5nrcp6t7.js:2874-3007 placement
function isStaleSocketError(error) {
  if (!isTransportError(error) || !isAxiosError(error)) return false;
  let code = extractConnectionErrorDetails(error)?.code;
  return (
    code !== undefined &&
    SOCKET_CLOSED_CODES.has(code) &&
    isPlainObject(error.request) &&
    error.request.reusedSocket === true
  );
}
//@ chunk-5nrcp6t7.js:3007-3369 placement
/**
 * 请求在复用的空闲连接上失败后，销毁 HTTP Agent 中同一 host:port 的所有空闲 socket。
 */
function destroyIdleSockets(error) {
  if (!isAxiosError(error) || !isPlainObject(error.request)) return;
  let { agent } = error.request;
  let s = URL.parse(error.config?.url ?? "", error.config?.baseURL);
  if (!(agent instanceof Agent) || s === null) return;
  let n = s.port || (s.protocol === "https:" ? "443" : "80");
  let y = `${s.hostname.replace(/^\[(.*)\]$/, "$1")}:${n}:`;
  for (let [key, value] of Object.entries(agent.freeSockets))
    if (key.startsWith(y)) for (let w of value?.slice() ?? []) w.destroy();
}
//@ chunk-5nrcp6t7.js:3369-4144 placement
async function classifyArtifactSocketError({ isRead, wire, send, signal, timeoutMs }) {
  let startTime = performance.now();
  try {
    return await send(false);
  } catch (error) {
    if (!isStaleSocketError(error)) throw error;
    try {
      destroyIdleSockets(error);
    } catch (error) {
      logError(error);
    }
    let S = {
      ...getTransportErrorProps(error, startTime),
      wire: fromEnum(wire),
    };
    if (!isRead || signal?.aborted) {
      logFeatureSad("artifact_stale_socket", isRead ? "read_cancelled" : "write_not_resent", S);
      throw error;
    }
    let w =
      timeoutMs === undefined || !Number.isFinite(timeoutMs) || timeoutMs <= 0
        ? undefined
        : timeoutMs - (performance.now() - startTime);
    if (w !== undefined && w < 1) {
      logFeatureBad("artifact_stale_socket", "no_time_to_resend", S);
      throw error;
    }
    logForDebugging(
      "[artifact] a read-only request failed because the server had already closed its reused connection \u2014 sending it once more on a new connection",
    );
    try {
      let h = await send(true, w === undefined ? undefined : Math.floor(w));
      logFeatureOk("artifact_stale_socket", S);
      return h;
    } catch (error) {
      if (!isCancel(error))
        logFeatureBad("artifact_stale_socket", "resend_failed", {
          ...getTransportErrorProps(error, startTime),
          wire: fromEnum(wire),
        });
      throw error;
    }
  }
}
export {
  formatFrameErrorBody,
  UNKNOWN_FIELD_ERROR_RE,
  mentionsField,
  buildFrameHeaders,
  requestIdMeta,
  getTransportErrorProps,
  CREATE_CONFIRMED_QUERY,
  isUnknownFieldErrorFor,
  MAX_FRAME_RESPONSE_BYTES,
  SAFE_ERROR_CODE_RE,
  sumByAliasField,
  classifyArtifactSocketError,
  ANTHROPIC_FRAMECREATECONFIRMED,
  frameSessionId,
};
