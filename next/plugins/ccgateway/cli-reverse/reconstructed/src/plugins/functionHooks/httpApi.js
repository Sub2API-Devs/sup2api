/**
 * plugins/functionHooks/httpApi.ts
 *
 * 2.1.316 新增：插件 $.http.fetch 接口（带授权句柄与请求体大小限制）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (34)
 * attribution: placement 34
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isAbsolute } from "path";
import { HooksError } from "./hooksErrors.js";
import { jsonStringify, alwaysTrue as alwaysTrue_2, jsonParse } from "../../utils/slowOperations.js";
import { isNetworkOrDevicePath } from "./ui/imageSource.js";
import { forwardAbort } from "./dispatch/chain.js";
import { getProxyFetchOptions } from "../../utils/proxy.js";
import { omitAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { splitPluginId, officialPluginId } from "../../utils/plugins/pluginIdentifier.js";
import { env } from "../../utils/env.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { policyDeniedReason } from "../../services/policyLimits/policyEvidence.js";
import { ALLOW_WEB_FETCH } from "../../tools/WebFetchTool/prompt.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  array,
  stringSchema,
  unknown,
  looseObject,
  union,
  numberSchema,
  booleanSchema,
  nullSchema,
  record,
} from "../../../vendor/zod/v4/classic/schemas.js";
import {
  CONFIDENTIAL_MODEL_ID,
  maskModelIdForTelemetry,
} from "../../utils/model/modelCatalog/catalogEntries.js";
import { maskModelFields } from "../../services/analytics/sink.js";
import { hydrateMaskedIds } from "../../utils/model/modelCatalog/maskedIds.js";
import { isBuiltinSuffixed } from "./eventPatterns.js";
import { isHipaaMode } from "../../services/analytics/privacyLevel.js";
import { filterEventsForPrivacy } from "../../services/analytics/eventSerialization.js";
import { authHandleRegistry } from "./sessionApi.js";
import { MAX_AUDIO_FILE_BYTES } from "./audioApi.js";
import { filterEntriesToNullProto } from "../../utils/hooks/functionHookMatchers.js";
import { logForDebugging } from "../../utils/debug.js";
import { getErrnoCode, errorMessage } from "../../utils/errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:3828159-3828623 placement
/**
 * 校验 $.http.fetch 的 socketPath：必须是绝对路径、无 NUL、非网络位置，且本构建支持 Unix 套接字。
 */
function checkSocketPath(socketPath, pluginName, label) {
  if (!(typeof socketPath === "string" && socketPath !== "" && isAbsolute(socketPath)))
    throw new HooksError(
      `${pluginName}: ${label}: socketPath ${String(socketPath)} refused: takes an absolute path`,
    );
  if (socketPath.includes("\x00"))
    throw new HooksError(
      `${pluginName}: ${label}: socketPath ${jsonStringify(socketPath)} refused: a NUL byte in the path`,
    );
  if (isNetworkOrDevicePath(socketPath))
    throw new HooksError(
      `${pluginName}: ${label}: socketPath ${socketPath} refused: a network location is not reached from here`,
    );
  if (!alwaysTrue_2())
    throw new HooksError(
      `${pluginName}: ${label}: socketPath ${socketPath} refused: no Unix socket transport in this build`,
    );
  return socketPath;
}
//@ chunk-5xgkngpb.js:3828623-3828688 placement
/**
 * accept/content-type/user-agent
 */
var ALLOWED_FETCH_HEADERS = ["accept", "accept-language", "content-type", "user-agent"];
//@ chunk-5xgkngpb.js:3828688-3828702 placement
/**
 * 30000
 */
var FETCH_TIMEOUT_MS_2 = 30000;
//@ chunk-5xgkngpb.js:3828702-3828724 placement
/**
 * "$.http.fetch"
 */
var HTTP_FETCH_LABEL = "$.http.fetch";
//@ chunk-5xgkngpb.js:3828724-3828894 placement
/**
 * 带超时的 AbortController：转发外部中止，超时后中止并可查询 timedOut，release 清理。
 */
function createTimeoutController(signal, ms = FETCH_TIMEOUT_MS_2) {
  let abortController = new AbortController();
  let unforward = forwardAbort(signal, abortController);
  let didTimeout = false;
  let timer = setTimeout(() => {
    didTimeout = true;
    abortController.abort();
  }, ms);
  return {
    controller: abortController,
    timedOut: () => didTimeout,
    release: () => {
      clearTimeout(timer);
      unforward();
    },
  };
}
//@ chunk-5xgkngpb.js:3828894-3828923 placement
/**
 * 数组包含
 */
var includesValue = (list, value) => list.includes(value);
//@ chunk-5xgkngpb.js:3828923-3828953 placement
/**
 * 301/302/303/307/308
 */
var REDIRECT_STATUSES = [301, 302, 303, 307, 308];
//@ chunk-5xgkngpb.js:3828953-3828977 placement
/**
 * 是否重定向
 */
var isRedirectStatus = (status) => includesValue(REDIRECT_STATUSES, status);
//@ chunk-5xgkngpb.js:3828977-3828999 placement
/**
 * 204/205/304
 */
var NO_BODY_STATUSES = [204, 205, 304];
//@ chunk-5xgkngpb.js:3828999-3829017 placement
/**
 * 301/302
 */
var PRESERVED_METHOD_REDIRECTS = [301, 302];
//@ chunk-5xgkngpb.js:3829017-3829029 placement
/**
 * 303
 */
var SEE_OTHER_STATUS = 303;
//@ chunk-5xgkngpb.js:3829029-3829363 placement
/**
 * 发起 fetch（手动处理重定向）：应用代理选项，或经 Unix 套接字（凭证请求强制校验证书、禁用 keepalive）。
 */
async function fetchManualRedirect(url, options) {
  let proxyFetchOptions = getProxyFetchOptions({
    url: url.href,
  });
  let { socket } = options;
  let secondSocket =
    socket === undefined
      ? proxyFetchOptions
      : {
          ...omitAlias(proxyFetchOptions, "proxy"),
          unix: socket.path,
          ...(socket.isCredentialed && {
            tls: {
              ...proxyFetchOptions.tls,
              rejectUnauthorized: true,
            },
            keepalive: false,
          }),
        };
  return fetch(url.href, {
    ...secondSocket,
    method: options.method,
    ...(options.headers !== undefined && {
      headers: options.headers,
    }),
    ...(options.body !== undefined && {
      body: options.body,
    }),
    redirect: "manual",
    signal: options.signal,
  });
}
//@ chunk-5xgkngpb.js:3829363-3829431 placement
/**
 * 非必要流量已禁用
 */
var NONESSENTIAL_TRAFFIC_TEXT = "nonessential network traffic is disabled for this session";
//@ chunk-5xgkngpb.js:3829431-3829524 placement
/**
 * 是否官方插件引用
 */
function isOfficialPluginRef(pluginId) {
  let { name, marketplace } = splitPluginId(pluginId);
  return name === "" || (marketplace ?? "") === "" || officialPluginId(pluginId) !== undefined;
}
//@ chunk-5xgkngpb.js:3829524-3829649 placement
function networkRefusalReason(pluginId) {
  return env.CLAUDE_CODE_EVAL_CONFINED === true || (isEssentialTrafficOnly() && isOfficialPluginRef(pluginId))
    ? NONESSENTIAL_TRAFFIC_TEXT
    : (policyDeniedReason(ALLOW_WEB_FETCH, "Network access from plugins", "is") ?? undefined);
}
//@ chunk-5xgkngpb.js:3829649-3829769 placement
function parseUrlArg(value, pluginName, label) {
  try {
    return value instanceof URL ? value : new URL(value);
  } catch {
    throw new HooksError(`${pluginName}: ${label}: not a URL: ${String(value)}`);
  }
}
//@ chunk-5xgkngpb.js:3829769-3830134 placement
/**
 * 校验插件网络请求的 URL：受会话策略（仅必要流量、禁止 web fetch）限制，只允许 http/https 且不得包含凭证。
 */
function checkPluginFetchUrl(url, { pluginName, pluginStorageId }, label) {
  let refused = networkRefusalReason(pluginStorageId);
  if (refused !== undefined) throw new HooksError(`${pluginName}: ${label}: refused: ${refused}`);
  let urlArg = parseUrlArg(url, pluginName, label);
  if (urlArg.protocol !== "https:" && urlArg.protocol !== "http:")
    throw new HooksError(`${pluginName}: ${label}: ${urlArg.href} refused: http or https only`);
  if (urlArg.username !== "" || urlArg.password !== "")
    throw new HooksError(`${pluginName}: ${label}: ${urlArg.host} refused: credentials in the URL`);
  return urlArg;
}
//@ chunk-5xgkngpb.js:3830134-3830205 placement
/**
 * 凭证被扣下的说明
 */
var credentialWithheldText = () =>
  isEssentialTrafficOnly() ? `the session's credential is withheld: ${NONESSENTIAL_TRAFFIC_TEXT}` : undefined;
//@ chunk-5xgkngpb.js:3830205-3830215 placement
/**
 * 5
 */
var MAX_REDIRECTS_2 = 5;
//@ chunk-5xgkngpb.js:3830215-3830281 placement
/**
 * 事件批量请求体 schema
 */
var EVENT_BATCH_BODY_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:3830215", () => {
  EVENT_BATCH_BODY_SCHEMA = DoctorLazy(() =>
    objectSchema({
      events: array(
        objectSchema({
          event_type: stringSchema(),
          event_data: unknown(),
        }),
      ),
    }),
  );
});
//@ chunk-5xgkngpb.js:3830281-3830319 placement
/**
 * /api/event_logging/v2/batch
 */
var EVENT_LOG_PATH = "/api/event_logging/v2/batch";
//@ chunk-5xgkngpb.js:3830319-3830743 placement
/**
 * 判断路径（多次解码规范化后）是否指向事件上报批量接口，用于防止绕过隐私过滤。
 */
function isEventLoggingPath(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return true;
  }
  for (let normalized = pathname; ;) {
    let replaced = decoded
      .replaceAll("%", "%25")
      .replaceAll("?", "%3F")
      .replaceAll("#", "%23")
      .replaceAll("\\", "/")
      .replaceAll(/\/+/g, "/");
    if (
      new URL(replaced, "http://ingest.invalid").pathname.replace(/\/+$/, "").toLowerCase() ===
      EVENT_LOG_PATH.toLowerCase()
    )
      return true;
    if (decoded === normalized) return false;
    normalized = decoded;
    decoded = decoded.replaceAll(/(?:%[0-9a-f]{2})+/gi, (problem) => {
      try {
        return decodeURIComponent(problem);
      } catch {
        return problem;
      }
    });
  }
}
//@ chunk-5xgkngpb.js:3830743-3830842 placement
/**
 * 模型元数据请求体 schema
 */
var MODEL_METADATA_BODY_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:3830743", () => {
  MODEL_METADATA_BODY_SCHEMA = DoctorLazy(() =>
    looseObject({
      events: array(
        looseObject({
          event_data: looseObject({
            model: stringSchema(),
            additional_metadata: stringSchema().optional(),
          }),
        }),
      ),
    }),
  );
});
//@ chunk-5xgkngpb.js:3830842-3830892 placement
/**
 * 是否该形状
 */
function isModelMetadataBody(body) {
  return MODEL_METADATA_BODY_SCHEMA().safeParse(body).success;
}
//@ chunk-5xgkngpb.js:3830892-3830966 placement
/**
 * 工具结果请求体 schema
 */
var TOOL_RESULT_BODY_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:3830892", () => {
  TOOL_RESULT_BODY_SCHEMA = DoctorLazy(() => {
    let valueSchema = union([stringSchema(), numberSchema(), booleanSchema(), nullSchema()]);
    return record(stringSchema(), union([valueSchema, array(valueSchema)]));
  });
});
//@ chunk-5xgkngpb.js:3830966-3831016 placement
/**
 * 是否该形状
 */
function isToolResultBody(body) {
  return TOOL_RESULT_BODY_SCHEMA().safeParse(body).success;
}
//@ chunk-5xgkngpb.js:3831016-3831063 placement
/**
 * 纯数据校验
 */
function plainDataOrThrow(text) {
  try {
    return jsonParse(text);
  } catch {
    return;
  }
}
//@ chunk-5xgkngpb.js:3831063-3831287 placement (2.1.88 match: base64URLEncode, 0.789)
function base64URLEncode(buffer) {
  let decoded = plainDataOrThrow(Buffer.from(buffer, "base64").toString("utf8"));
  if (!isToolResultBody(decoded)) return;
  let filtered = Object.fromEntries(
    Object.entries(decoded).filter(([, value]) => value !== CONFIDENTIAL_MODEL_ID),
  );
  let encoded = maskModelFields(filtered);
  return encoded === filtered
    ? buffer
    : Buffer.from(
        jsonStringify({
          ...decoded,
          ...encoded,
        }),
      ).toString("base64");
}
//@ chunk-5xgkngpb.js:3831287-3831326 placement
/**
 * 模型名脱敏
 */
function maskModelForLog(model) {
  return model === CONFIDENTIAL_MODEL_ID ? model : maskModelIdForTelemetry(model);
}
//@ chunk-5xgkngpb.js:3831326-3831594 placement
function maskEventFields(event) {
  let { model, additional_metadata: additionalMetadata } = event.event_data;
  let maskedModel = maskModelForLog(model);
  if (additionalMetadata === undefined)
    return maskedModel === model
      ? event
      : {
          ...event,
          event_data: {
            ...event.event_data,
            model: maskedModel,
          },
        };
  let masked = base64URLEncode(additionalMetadata);
  if (masked === undefined) return;
  return maskedModel === model && masked === additionalMetadata
    ? event
    : {
        ...event,
        event_data: {
          ...event.event_data,
          model: maskedModel,
          additional_metadata: masked,
        },
      };
}
//@ chunk-5xgkngpb.js:3831594-3831794 placement
async function maskEventBatch(body) {
  if (!isModelMetadataBody(body)) return;
  await hydrateMaskedIds();
  body.events.forEach((event) => maskEventFields(event));
  let mapped = body.events.map((event) => maskEventFields(event));
  if (mapped.includes(undefined)) return;
  return mapped.every((event, index) => event === body.events[index])
    ? body
    : {
        ...body,
        events: mapped,
      };
}
//@ chunk-5xgkngpb.js:3831794-3832184 placement
/**
 * 插件向事件上报接口发送数据时：内置插件掩码模型与元数据，HIPAA 模式下按隐私规则过滤事件，否则原样发送。
 */
async function redactEventBatchBody(url, text, { pluginName, pluginStorageId }, label) {
  let text_2 = isBuiltinSuffixed(pluginStorageId);
  if (!(text !== undefined && (text_2 || isHipaaMode()) && isEventLoggingPath(url.pathname))) return text;
  let masked = plainDataOrThrow(text);
  let event = text_2 ? await maskEventBatch(masked) : masked;
  if (event !== undefined && !isHipaaMode()) return event === masked ? text : jsonStringify(event);
  let encoded = EVENT_BATCH_BODY_SCHEMA().safeParse(event);
  if (!encoded.success)
    throw new HooksError(
      `${pluginName}: ${label}: ${url.origin}${EVENT_LOG_PATH} refused: the body is not an event batch, so it cannot be redacted`,
    );
  return jsonStringify({
    events: filterEventsForPrivacy(encoded.data.events),
  });
}
//@ chunk-5xgkngpb.js:3832184-3832534 placement
/**
 * 读取响应体至多 n 字节（超出则截断并取消），返回 UTF-8 文本。
 */
async function readBodyCapped(response, maxBytes, signal) {
  let body = response.body;
  if (body === null) return "";
  let reader = body.getReader();
  let chunks = [];
  let total = 0;
  try {
    for (;;) {
      signal?.throwIfAborted();
      let { done, value: chunk } = await reader.read();
      if (done) break;
      let text = maxBytes - total;
      if (chunk.byteLength >= text) {
        chunks.push(chunk.subarray(0, text));
        total += text;
        await reader.cancel();
        break;
      }
      chunks.push(chunk);
      total += chunk.byteLength;
    }
  } finally {
    reader.releaseLock();
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}
//@ chunk-5xgkngpb.js:3832534-3834818 placement
/**
 * 插件 $.http.fetch：校验授权句柄与请求体大小上限后发起请求。
 */
async function httpFetchForPlugin({ url, init }, caller, signal) {
  let { pluginName } = caller;
  let parsedUrl = checkPluginFetchUrl(url, caller, HTTP_FETCH_LABEL);
  let auth = init?.auth;
  let noAuth = auth === undefined;
  let withheld = noAuth ? undefined : credentialWithheldText();
  if (withheld !== undefined)
    throw new HooksError(`${pluginName}: ${HTTP_FETCH_LABEL}: refused: ${withheld}`);
  let credential = noAuth ? undefined : authHandleRegistry.resolve(pluginName, auth);
  if (init?.auth !== undefined && credential === undefined)
    throw new HooksError(
      `${pluginName}: ${HTTP_FETCH_LABEL}: unknown auth handle; $.session.authorize() mints one`,
    );
  if (init?.body !== undefined && init.body.length > MAX_AUDIO_FILE_BYTES)
    throw new HooksError(
      `${pluginName}: ${HTTP_FETCH_LABEL}: ${parsedUrl.href} refused: a request body of ${init.body.length} characters is over the ${MAX_AUDIO_FILE_BYTES}-character limit`,
    );
  let socketPath =
    init?.socketPath === undefined
      ? undefined
      : checkSocketPath(init.socketPath, pluginName, HTTP_FETCH_LABEL);
  let overText = socketPath === undefined ? "" : ` over ${socketPath}`;
  let origin = parsedUrl.origin;
  let sendsCredential =
    credential !== undefined && parsedUrl.protocol === "https:" && parsedUrl.host === credential.host;
  let upper = (init?.method ?? "GET").toUpperCase();
  let headers =
    init?.headers &&
    filterEntriesToNullProto(init.headers, (headerValue, headerName) => headerName.toLowerCase() !== "host");
  let body = init?.body;
  let timeoutController = createTimeoutController(signal);
  let now = Date.now();
  logForDebugging(`${HTTP_FETCH_LABEL} (${pluginName}): ${upper} ${parsedUrl.href}${overText}`);
  let response;
  try {
    for (let idx = 0; ; idx++) {
      body = await redactEventBatchBody(parsedUrl, body, caller, HTTP_FETCH_LABEL);
      let isCredentialedHost =
        sendsCredential &&
        credential !== undefined &&
        parsedUrl.protocol === "https:" &&
        parsedUrl.host === credential.host;
      response = await fetchManualRedirect(parsedUrl, {
        method: upper,
        headers: isCredentialedHost
          ? {
              ...headers,
              ...credential.headers,
            }
          : headers,
        body,
        signal: timeoutController.controller.signal,
        ...(socketPath !== undefined && {
          socket: {
            path: socketPath,
            isCredentialed: isCredentialedHost,
          },
        }),
      });
      let location = response.headers.get("location");
      if (!isRedirectStatus(response.status) || location === null) break;
      await response.body?.cancel();
      if (idx + 1 > MAX_REDIRECTS_2)
        throw new HooksError(
          `${pluginName}: ${HTTP_FETCH_LABEL}: more than ${MAX_REDIRECTS_2} redirects from ${url}`,
        );
      parsedUrl = checkPluginFetchUrl(new URL(location, parsedUrl), caller, HTTP_FETCH_LABEL);
      if (
        response.status === SEE_OTHER_STATUS ||
        (includesValue(PRESERVED_METHOD_REDIRECTS, response.status) && upper === "POST")
      ) {
        upper = "GET";
        body = undefined;
      }
      if (credential !== undefined && (parsedUrl.protocol !== "https:" || parsedUrl.host !== credential.host))
        sendsCredential = false;
      if (parsedUrl.origin !== origin && headers !== undefined)
        headers = filterEntriesToNullProto(headers, (headerName, headerKey) =>
          includesValue(ALLOWED_FETCH_HEADERS, headerKey.toLowerCase()),
        );
      logForDebugging(
        `${HTTP_FETCH_LABEL} (${pluginName}): redirect ${response.status} to ${parsedUrl.href}`,
      );
    }
    let contentLength = Number(response.headers.get("content-length"));
    if (
      upper !== "HEAD" &&
      !includesValue(NO_BODY_STATUSES, response.status) &&
      Number.isFinite(contentLength) &&
      contentLength > MAX_AUDIO_FILE_BYTES
    ) {
      await response.body?.cancel();
      throw new HooksError(
        `${pluginName}: ${HTTP_FETCH_LABEL}: ${parsedUrl.href} refused: body of ${contentLength} bytes is over the ${MAX_AUDIO_FILE_BYTES}-byte limit`,
      );
    }
    let bodyCapped = await readBodyCapped(
      response,
      MAX_AUDIO_FILE_BYTES,
      timeoutController.controller.signal,
    );
    let responseHeaders = {};
    response.headers.forEach((header, headerName) => {
      responseHeaders[headerName.toLowerCase()] = header;
    });
    logForDebugging(
      `${HTTP_FETCH_LABEL} (${pluginName}): ${response.status} in ${Date.now() - now}ms, ${bodyCapped.length} chars`,
    );
    return {
      status: response.status,
      ok: response.ok,
      headers: responseHeaders,
      text: bodyCapped,
    };
  } catch (error) {
    if (error instanceof HooksError) throw error;
    if (timeoutController.timedOut())
      throw new HooksError(
        `${pluginName}: ${HTTP_FETCH_LABEL}(${parsedUrl.href})${overText} aborted: no complete answer within ${FETCH_TIMEOUT_MS_2}ms`,
      );
    let errnoCode = getErrnoCode(error);
    let isErrno = errnoCode !== undefined;
    throw new HooksError(
      `${pluginName}: ${HTTP_FETCH_LABEL}(${parsedUrl.href})${overText} failed: ${isErrno ? `${errnoCode}: ` : ""}${errorMessage(error)}`,
    );
  } finally {
    timeoutController.release();
  }
}
export { httpFetchForPlugin, checkPluginFetchUrl, fetchManualRedirect, createTimeoutController };
