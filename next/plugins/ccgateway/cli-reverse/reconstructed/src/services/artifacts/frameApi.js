/**
 * services/artifacts/frameApi.ts
 *
 * 2.1.316 新增：Artifact（frame）接口请求头（X-Frame-*）、拒绝响应解析与套接字重试分类
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-57tfkp5n.js (19)
 * attribution: placement 19
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { Agent } from "http";
import { baseIterateeAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
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

//@ chunk-57tfkp5n.js:1019-1127 placement
function sumBy(list, iteratee) {
  var sum;
  var index = -1;
  var length = list.length;
  while (++index < length) {
    var value = iteratee(list[index]);
    if (value !== undefined) sum = sum === undefined ? value : sum + value;
  }
  return sum;
}
//@ chunk-57tfkp5n.js:1127-1138 placement
var sumByAlias = sumBy;
//@ chunk-57tfkp5n.js:1138-1191 placement
function sumByField(list, field) {
  return list && list.length ? sumByAlias(list, baseIterateeAlias(field, 2)) : 0;
}
//@ chunk-57tfkp5n.js:1191-1202 placement
/**
 * 导出常量或表 `sumByAliasField`：值为 ye。
 */
var sumByAliasField = sumByField;
//@ chunk-57tfkp5n.js:1202-1262 placement
/**
 * frame API 的响应大小上限 20 MB 与拒绝响应的 content-type。
 */
var MAX_FRAME_RESPONSE_BYTES = 20971520;
var FRAME_REFUSAL_CONTENT_TYPE = "application/vnd.ant.frame-refusal+json";
//@ chunk-57tfkp5n.js:1262-1944 placement
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
      VERSION: "2.1.318",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-11-03T18:52:53Z",
      GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION,
    "X-Frame-Session-Id": frameSessionId() ?? getSessionId(),
  };
}
//@ chunk-57tfkp5n.js:1944-1993 placement
var FRAME_SESSION_ID_RE = /^(?:session_|cse_)[A-Za-z0-9_-]{1,184}$/;
//@ chunk-57tfkp5n.js:1993-2083 placement
/**
 * 导出函数 `frameSessionId`：返回 e && he.test(e) ? e : void 0。
 */
function frameSessionId() {
  let sessionId = env.CLAUDE_CODE_REMOTE_SESSION_ID ?? getRemoteControlSessionCompatId();
  return sessionId && FRAME_SESSION_ID_RE.test(sessionId) ? sessionId : undefined;
}
//@ chunk-57tfkp5n.js:2083-2119 placement
var REQUEST_ID_RE = /^req_[A-Za-z0-9_-]{4,128}$/;
//@ chunk-57tfkp5n.js:2119-2183 placement
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
//@ chunk-57tfkp5n.js:2183-2303 placement
/**
 * 创建确认查询参数、对应的 MCP _meta 键，以及识别"未知字段/未在允许列表"的错误正则。
 */
var CREATE_CONFIRMED_QUERY = "create_confirmed=1";
var ANTHROPIC_FRAMECREATECONFIRMED = "anthropic/frameCreateConfirmed";
var UNKNOWN_FIELD_ERROR_RE = /unknown field|not a recognized|not allowlisted/i;
//@ chunk-57tfkp5n.js:2303-2529 placement
/**
 * 把 frame 接口的错误响应体格式化成文字：字符串原样，带 error（附 [reason]）的对象取 error，其他对象转 JSON。
 */
function formatFrameErrorBody(body) {
  if (typeof body === "string") return body;
  if (body && typeof body === "object") {
    if ("error" in body && typeof body.error === "string") {
      let reasonSuffix = "reason" in body && typeof body.reason === "string" ? ` [${body.reason}]` : "";
      return body.error + reasonSuffix;
    }
    return jsonStringify(body) ?? "";
  }
  return "";
}
//@ chunk-57tfkp5n.js:2529-2614 placement
/**
 * 导出函数 `mentionsField`：参数 e, r，返回 e.includes(`'${r}'`) || new RegExp(`"${r}"(?!\\??:)`).test(e)。
 */
function mentionsField(body, field) {
  return body.includes(`'${field}'`) || new RegExp(`"${field}"(?!\\??:)`).test(body);
}
//@ chunk-57tfkp5n.js:2614-2673 placement
/**
 * 导出函数 `isUnknownFieldErrorFor`：参数 e, r，返回 UNKNOWN_FIELD_ERROR_RE.test(s) && STt(s, r)。
 */
function isUnknownFieldErrorFor(body, field) {
  let text = formatFrameErrorBody(body);
  return UNKNOWN_FIELD_ERROR_RE.test(text) && mentionsField(text, field);
}
//@ chunk-57tfkp5n.js:2673-2704 placement
/**
 * 导出常量或表 `SAFE_ERROR_CODE_RE`：值为 /^[A-Za-z0-9_-]{1,64}$/。
 */
var SAFE_ERROR_CODE_RE = /^[A-Za-z0-9_-]{1,64}$/;
//@ chunk-57tfkp5n.js:2734-2876 placement
/**
 * 构造请求失败的打点字段：是否传输层错误、规范化的错误码、耗时（毫秒）。
 */
function getTransportErrorProps(error, startTime) {
  let errCode =
    sanitizedConnectionCodeForTelemetry(extractConnectionErrorDetails(error)?.code) ??
    sanitizedErrCodeForTelemetry(error);
  return {
    transport: isTransportError(error),
    ...(errCode !== undefined && {
      err_code: errCode,
    }),
    elapsed_ms: Math.round(performance.now() - startTime),
  };
}
//@ chunk-57tfkp5n.js:2876-3009 placement
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
//@ chunk-57tfkp5n.js:3009-3371 placement
/**
 * 请求在复用的空闲连接上失败后，销毁 HTTP Agent 中同一 host:port 的所有空闲 socket。
 */
function destroyIdleSockets(error) {
  if (!isAxiosError(error) || !isPlainObject(error.request)) return;
  let { agent } = error.request;
  let targetUrl = URL.parse(error.config?.url ?? "", error.config?.baseURL);
  if (!(agent instanceof Agent) || targetUrl === null) return;
  let port = targetUrl.port || (targetUrl.protocol === "https:" ? "443" : "80");
  let socketKeyPrefix = `${targetUrl.hostname.replace(/^\[(.*)\]$/, "$1")}:${port}:`;
  for (let [key, value] of Object.entries(agent.freeSockets))
    if (key.startsWith(socketKeyPrefix)) for (let socket of value?.slice() ?? []) socket.destroy();
}
//@ chunk-57tfkp5n.js:3371-4146 placement
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
    let telemetry = {
      ...getTransportErrorProps(error, startTime),
      wire: fromEnum(wire),
    };
    if (!isRead || signal?.aborted) {
      logFeatureSad("artifact_stale_socket", isRead ? "read_cancelled" : "write_not_resent", telemetry);
      throw error;
    }
    let remainingMs =
      timeoutMs === undefined || !Number.isFinite(timeoutMs) || timeoutMs <= 0
        ? undefined
        : timeoutMs - (performance.now() - startTime);
    if (remainingMs !== undefined && remainingMs < 1) {
      logFeatureBad("artifact_stale_socket", "no_time_to_resend", telemetry);
      throw error;
    }
    logForDebugging(
      "[artifact] a read-only request failed because the server had already closed its reused connection \u2014 sending it once more on a new connection",
    );
    try {
      let response = await send(true, remainingMs === undefined ? undefined : Math.floor(remainingMs));
      logFeatureOk("artifact_stale_socket", telemetry);
      return response;
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
  frameSessionId,
  formatFrameErrorBody,
  UNKNOWN_FIELD_ERROR_RE,
  mentionsField,
  MAX_FRAME_RESPONSE_BYTES,
  SAFE_ERROR_CODE_RE,
  sumByAliasField,
  ANTHROPIC_FRAMECREATECONFIRMED,
  buildFrameHeaders,
  requestIdMeta,
  getTransportErrorProps,
  CREATE_CONFIRMED_QUERY,
  isUnknownFieldErrorFor,
  classifyArtifactSocketError,
  sumByAlias,
};
