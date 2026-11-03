/**
 * plugins/functionHooks/httpApi.ts
 *
 * 2.1.316 新增：插件 $.http.fetch 接口（带授权句柄与请求体大小限制）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (34)
 * attribution: placement 34
 */
import { isAbsolute } from "path";
import { HooksError } from "./hooksErrors.js";
import { jsonStringify, alwaysTrue as alwaysTrue_2, jsonParse } from "../../utils/slowOperations.js";
import { isNetworkOrDevicePath } from "./ui/imageSource.js";
import { forwardAbort } from "./dispatch/chain.js";
import { getProxyFetchOptions } from "../../utils/proxy.js";
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { splitPluginId, officialPluginId } from "../../utils/plugins/pluginIdentifier.js";
import { env } from "../../utils/env.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { policyDeniedReason } from "../../services/policyLimits/policyEvidence.js";
import { ALLOW_WEB_FETCH } from "../../tools/WebFetchTool/prompt.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  u,
  array,
  string,
  unknown,
  looseObject,
  union,
  E,
  M,
  zg,
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

//@ chunk-e6aww6q8.js:3732425-3732889 placement
/**
 * 校验 $.http.fetch 的 socketPath：必须是绝对路径、无 NUL、非网络位置，且本构建支持 Unix 套接字。
 */
function checkSocketPath(socketPath, pluginName, r) {
  if (!(typeof socketPath === "string" && socketPath !== "" && isAbsolute(socketPath)))
    throw new HooksError(
      `${pluginName}: ${r}: socketPath ${String(socketPath)} refused: takes an absolute path`,
    );
  if (socketPath.includes("\x00"))
    throw new HooksError(
      `${pluginName}: ${r}: socketPath ${jsonStringify(socketPath)} refused: a NUL byte in the path`,
    );
  if (isNetworkOrDevicePath(socketPath))
    throw new HooksError(
      `${pluginName}: ${r}: socketPath ${socketPath} refused: a network location is not reached from here`,
    );
  if (!alwaysTrue_2())
    throw new HooksError(
      `${pluginName}: ${r}: socketPath ${socketPath} refused: no Unix socket transport in this build`,
    );
  return socketPath;
}
//@ chunk-e6aww6q8.js:3732889-3732954 placement
/**
 * accept/content-type/user-agent
 */
var ALLOWED_FETCH_HEADERS = ["accept", "accept-language", "content-type", "user-agent"];
//@ chunk-e6aww6q8.js:3732954-3732968 placement
/**
 * 30000
 */
var FETCH_TIMEOUT_MS_2 = 30000;
//@ chunk-e6aww6q8.js:3732968-3732990 placement
/**
 * "$.http.fetch"
 */
var HTTP_FETCH_LABEL = "$.http.fetch";
//@ chunk-e6aww6q8.js:3732990-3733160 placement
/**
 * 带超时的 AbortController：转发外部中止，超时后中止并可查询 timedOut，release 清理。
 */
function createTimeoutController(e, n = FETCH_TIMEOUT_MS_2) {
  let abortController = new AbortController();
  let s = forwardAbort(e, abortController);
  let h = false;
  let timer = setTimeout(() => {
    h = true;
    abortController.abort();
  }, n);
  return {
    controller: abortController,
    timedOut: () => h,
    release: () => {
      clearTimeout(timer);
      s();
    },
  };
}
//@ chunk-e6aww6q8.js:3733160-3733189 placement
/**
 * 数组包含
 */
var includesValue = (e, n) => e.includes(n);
//@ chunk-e6aww6q8.js:3733189-3733219 placement
/**
 * 301/302/303/307/308
 */
var REDIRECT_STATUSES = [301, 302, 303, 307, 308];
//@ chunk-e6aww6q8.js:3733219-3733243 placement
/**
 * 是否重定向
 */
var isRedirectStatus = (status) => includesValue(REDIRECT_STATUSES, status);
//@ chunk-e6aww6q8.js:3733243-3733265 placement
/**
 * 204/205/304
 */
var NO_BODY_STATUSES = [204, 205, 304];
//@ chunk-e6aww6q8.js:3733265-3733283 placement
/**
 * 301/302
 */
var PRESERVED_METHOD_REDIRECTS = [301, 302];
//@ chunk-e6aww6q8.js:3733283-3733295 placement
/**
 * 303
 */
var SEE_OTHER_STATUS = 303;
//@ chunk-e6aww6q8.js:3733295-3733629 placement
/**
 * 发起 fetch（手动处理重定向）：应用代理选项，或经 Unix 套接字（凭证请求强制校验证书、禁用 keepalive）。
 */
async function fetchManualRedirect(e, n) {
  let proxyFetchOptions = getProxyFetchOptions({
    url: e.href,
  });
  let { socket } = n;
  let y =
    socket === undefined
      ? proxyFetchOptions
      : {
          ...Uo(proxyFetchOptions, "proxy"),
          unix: socket.path,
          ...(socket.isCredentialed && {
            tls: {
              ...proxyFetchOptions.tls,
              rejectUnauthorized: true,
            },
            keepalive: false,
          }),
        };
  return fetch(e.href, {
    ...y,
    method: n.method,
    ...(n.headers !== undefined && {
      headers: n.headers,
    }),
    ...(n.body !== undefined && {
      body: n.body,
    }),
    redirect: "manual",
    signal: n.signal,
  });
}
//@ chunk-e6aww6q8.js:3733629-3733697 placement
/**
 * 非必要流量已禁用
 */
var NONESSENTIAL_TRAFFIC_TEXT = "nonessential network traffic is disabled for this session";
//@ chunk-e6aww6q8.js:3733697-3733790 placement
/**
 * 是否官方插件引用
 */
function isOfficialPluginRef(e) {
  let { name: n, marketplace } = splitPluginId(e);
  return n === "" || (marketplace ?? "") === "" || officialPluginId(e) !== undefined;
}
//@ chunk-e6aww6q8.js:3733790-3733915 placement
function networkRefusalReason(pluginStorageId) {
  return env.CLAUDE_CODE_EVAL_CONFINED === true ||
    (isEssentialTrafficOnly() && isOfficialPluginRef(pluginStorageId))
    ? NONESSENTIAL_TRAFFIC_TEXT
    : (policyDeniedReason(ALLOW_WEB_FETCH, "Network access from plugins", "is") ?? undefined);
}
//@ chunk-e6aww6q8.js:3733915-3734035 placement
function parseUrlArg(e, pluginName, r) {
  try {
    return e instanceof URL ? e : new URL(e);
  } catch {
    throw new HooksError(`${pluginName}: ${r}: not a URL: ${String(e)}`);
  }
}
//@ chunk-e6aww6q8.js:3734035-3734400 placement
/**
 * 校验插件网络请求的 URL：受会话策略（仅必要流量、禁止 web fetch）限制，只允许 http/https 且不得包含凭证。
 */
function checkPluginFetchUrl(url, { pluginName, pluginStorageId }, s) {
  let h = networkRefusalReason(pluginStorageId);
  if (h !== undefined) throw new HooksError(`${pluginName}: ${s}: refused: ${h}`);
  let urlArg = parseUrlArg(url, pluginName, s);
  if (urlArg.protocol !== "https:" && urlArg.protocol !== "http:")
    throw new HooksError(`${pluginName}: ${s}: ${urlArg.href} refused: http or https only`);
  if (urlArg.username !== "" || urlArg.password !== "")
    throw new HooksError(`${pluginName}: ${s}: ${urlArg.host} refused: credentials in the URL`);
  return urlArg;
}
//@ chunk-e6aww6q8.js:3734400-3734471 placement
/**
 * 凭证被扣下的说明
 */
var credentialWithheldText = () =>
  isEssentialTrafficOnly() ? `the session's credential is withheld: ${NONESSENTIAL_TRAFFIC_TEXT}` : undefined;
//@ chunk-e6aww6q8.js:3734471-3734481 placement
/**
 * 5
 */
var MAX_REDIRECTS_2 = 5;
//@ chunk-e6aww6q8.js:3734481-3734547 placement
/**
 * 事件批量请求体 schema
 */
var EVENT_BATCH_BODY_SCHEMA = DoctorLazy(() =>
  u({
    events: array(
      u({
        event_type: string(),
        event_data: unknown(),
      }),
    ),
  }),
);
//@ chunk-e6aww6q8.js:3734547-3734585 placement
/**
 * /api/event_logging/v2/batch
 */
var EVENT_LOG_PATH = "/api/event_logging/v2/batch";
//@ chunk-e6aww6q8.js:3734585-3735009 placement
/**
 * 判断路径（多次解码规范化后）是否指向事件上报批量接口，用于防止绕过隐私过滤。
 */
function isEventLoggingPath(pathname) {
  let n;
  try {
    n = decodeURIComponent(pathname);
  } catch {
    return true;
  }
  for (let r = pathname; ;) {
    let replaced = n
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
    if (n === r) return false;
    r = n;
    n = n.replaceAll(/(?:%[0-9a-f]{2})+/gi, (y) => {
      try {
        return decodeURIComponent(y);
      } catch {
        return y;
      }
    });
  }
}
//@ chunk-e6aww6q8.js:3735009-3735108 placement
/**
 * 模型元数据请求体 schema
 */
var MODEL_METADATA_BODY_SCHEMA = DoctorLazy(() =>
  looseObject({
    events: array(
      looseObject({
        event_data: looseObject({
          model: string(),
          additional_metadata: string().optional(),
        }),
      }),
    ),
  }),
);
//@ chunk-e6aww6q8.js:3735108-3735158 placement
/**
 * 是否该形状
 */
function isModelMetadataBody(e) {
  return MODEL_METADATA_BODY_SCHEMA().safeParse(e).success;
}
//@ chunk-e6aww6q8.js:3735158-3735232 placement
/**
 * 工具结果请求体 schema
 */
var TOOL_RESULT_BODY_SCHEMA = DoctorLazy(() => {
  let e = union([string(), E(), M(), zg()]);
  return record(string(), union([e, array(e)]));
});
//@ chunk-e6aww6q8.js:3735232-3735282 placement
/**
 * 是否该形状
 */
function isToolResultBody(e) {
  return TOOL_RESULT_BODY_SCHEMA().safeParse(e).success;
}
//@ chunk-e6aww6q8.js:3735282-3735329 placement
/**
 * 纯数据校验
 */
function plainDataOrThrow(e) {
  try {
    return jsonParse(e);
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:3735329-3735553 placement = base64URLEncode (0.79)
function base64URLEncode(buffer) {
  let n = plainDataOrThrow(Buffer.from(buffer, "base64").toString("utf8"));
  if (!isToolResultBody(n)) return;
  let r = Object.fromEntries(Object.entries(n).filter(([, value]) => value !== CONFIDENTIAL_MODEL_ID));
  let s = maskModelFields(r);
  return s === r
    ? buffer
    : Buffer.from(
        jsonStringify({
          ...n,
          ...s,
        }),
      ).toString("base64");
}
//@ chunk-e6aww6q8.js:3735553-3735592 placement
/**
 * 模型名脱敏
 */
function maskModelForLog(model) {
  return model === CONFIDENTIAL_MODEL_ID ? model : maskModelIdForTelemetry(model);
}
//@ chunk-e6aww6q8.js:3735592-3735860 placement
function maskEventFields(event) {
  let { model, additional_metadata: additionalMetadata } = event.event_data;
  let s = maskModelForLog(model);
  if (additionalMetadata === undefined)
    return s === model
      ? event
      : {
          ...event,
          event_data: {
            ...event.event_data,
            model: s,
          },
        };
  let h = base64URLEncode(additionalMetadata);
  if (h === undefined) return;
  return s === model && h === additionalMetadata
    ? event
    : {
        ...event,
        event_data: {
          ...event.event_data,
          model: s,
          additional_metadata: h,
        },
      };
}
//@ chunk-e6aww6q8.js:3735860-3736060 placement
async function maskEventBatch(e) {
  if (!isModelMetadataBody(e)) return;
  await hydrateMaskedIds();
  e.events.forEach((event) => maskEventFields(event));
  let mapped = e.events.map((event) => maskEventFields(event));
  if (mapped.includes(undefined)) return;
  return mapped.every((r, s) => r === e.events[s])
    ? e
    : {
        ...e,
        events: mapped,
      };
}
//@ chunk-e6aww6q8.js:3736060-3736450 placement
/**
 * 插件向事件上报接口发送数据时：内置插件掩码模型与元数据，HIPAA 模式下按隐私规则过滤事件，否则原样发送。
 */
async function redactEventBatchBody(e, body, { pluginName, pluginStorageId }, h) {
  let y = isBuiltinSuffixed(pluginStorageId);
  if (!(body !== undefined && (y || isHipaaMode()) && isEventLoggingPath(e.pathname))) return body;
  let w = plainDataOrThrow(body);
  let L = y ? await maskEventBatch(w) : w;
  if (L !== undefined && !isHipaaMode()) return L === w ? body : jsonStringify(L);
  let G = EVENT_BATCH_BODY_SCHEMA().safeParse(L);
  if (!G.success)
    throw new HooksError(
      `${pluginName}: ${h}: ${e.origin}${EVENT_LOG_PATH} refused: the body is not an event batch, so it cannot be redacted`,
    );
  return jsonStringify({
    events: filterEventsForPrivacy(G.data.events),
  });
}
//@ chunk-e6aww6q8.js:3736450-3736800 placement
/**
 * 读取响应体至多 n 字节（超出则截断并取消），返回 UTF-8 文本。
 */
async function readBodyCapped(e, n, signal) {
  let body = e.body;
  if (body === null) return "";
  let reader = body.getReader();
  let y = [];
  let S = 0;
  try {
    for (;;) {
      signal?.throwIfAborted();
      let { done: w, value: L } = await reader.read();
      if (w) break;
      let G = n - S;
      if (L.byteLength >= G) {
        y.push(L.subarray(0, G));
        S += G;
        await reader.cancel();
        break;
      }
      y.push(L);
      S += L.byteLength;
    }
  } finally {
    reader.releaseLock();
  }
  return new TextDecoder().decode(Buffer.concat(y));
}
//@ chunk-e6aww6q8.js:3736800-3739084 placement
/**
 * 插件 $.http.fetch：校验授权句柄与请求体大小上限后发起请求。
 */
async function httpFetchForPlugin({ url, init }, r, signal) {
  let { pluginName } = r;
  let y = checkPluginFetchUrl(url, r, HTTP_FETCH_LABEL);
  let auth = init?.auth;
  let w = auth === undefined;
  let L = w ? undefined : credentialWithheldText();
  if (L !== undefined) throw new HooksError(`${pluginName}: ${HTTP_FETCH_LABEL}: refused: ${L}`);
  let G = w ? undefined : authHandleRegistry.resolve(pluginName, auth);
  if (init?.auth !== undefined && G === undefined)
    throw new HooksError(
      `${pluginName}: ${HTTP_FETCH_LABEL}: unknown auth handle; $.session.authorize() mints one`,
    );
  if (init?.body !== undefined && init.body.length > MAX_AUDIO_FILE_BYTES)
    throw new HooksError(
      `${pluginName}: ${HTTP_FETCH_LABEL}: ${y.href} refused: a request body of ${init.body.length} characters is over the ${MAX_AUDIO_FILE_BYTES}-character limit`,
    );
  let Se =
    init?.socketPath === undefined
      ? undefined
      : checkSocketPath(init.socketPath, pluginName, HTTP_FETCH_LABEL);
  let ke = Se === undefined ? "" : ` over ${Se}`;
  let origin = y.origin;
  let Ee = G !== undefined && y.protocol === "https:" && y.host === G.host;
  let upper = (init?.method ?? "GET").toUpperCase();
  let Ie = init?.headers && filterEntriesToNullProto(init.headers, (Je, nt) => nt.toLowerCase() !== "host");
  let body = init?.body;
  let timeoutController = createTimeoutController(signal);
  let now = Date.now();
  logForDebugging(`${HTTP_FETCH_LABEL} (${pluginName}): ${upper} ${y.href}${ke}`);
  let lt;
  try {
    for (let idx = 0; ; idx++) {
      body = await redactEventBatchBody(y, body, r, HTTP_FETCH_LABEL);
      let gt = Ee && G !== undefined && y.protocol === "https:" && y.host === G.host;
      lt = await fetchManualRedirect(y, {
        method: upper,
        headers: gt
          ? {
              ...Ie,
              ...G.headers,
            }
          : Ie,
        body,
        signal: timeoutController.controller.signal,
        ...(Se !== undefined && {
          socket: {
            path: Se,
            isCredentialed: gt,
          },
        }),
      });
      let At = lt.headers.get("location");
      if (!isRedirectStatus(lt.status) || At === null) break;
      await lt.body?.cancel();
      if (idx + 1 > MAX_REDIRECTS_2)
        throw new HooksError(
          `${pluginName}: ${HTTP_FETCH_LABEL}: more than ${MAX_REDIRECTS_2} redirects from ${url}`,
        );
      y = checkPluginFetchUrl(new URL(At, y), r, HTTP_FETCH_LABEL);
      if (
        lt.status === SEE_OTHER_STATUS ||
        (includesValue(PRESERVED_METHOD_REDIRECTS, lt.status) && upper === "POST")
      ) {
        upper = "GET";
        body = undefined;
      }
      if (G !== undefined && (y.protocol !== "https:" || y.host !== G.host)) Ee = false;
      if (y.origin !== origin && Ie !== undefined)
        Ie = filterEntriesToNullProto(Ie, (qt, Zt) => includesValue(ALLOWED_FETCH_HEADERS, Zt.toLowerCase()));
      logForDebugging(`${HTTP_FETCH_LABEL} (${pluginName}): redirect ${lt.status} to ${y.href}`);
    }
    let Je = Number(lt.headers.get("content-length"));
    if (
      upper !== "HEAD" &&
      !includesValue(NO_BODY_STATUSES, lt.status) &&
      Number.isFinite(Je) &&
      Je > MAX_AUDIO_FILE_BYTES
    ) {
      await lt.body?.cancel();
      throw new HooksError(
        `${pluginName}: ${HTTP_FETCH_LABEL}: ${y.href} refused: body of ${Je} bytes is over the ${MAX_AUDIO_FILE_BYTES}-byte limit`,
      );
    }
    let bodyCapped = await readBodyCapped(lt, MAX_AUDIO_FILE_BYTES, timeoutController.controller.signal);
    let Et = {};
    lt.headers.forEach((header, gt) => {
      Et[gt.toLowerCase()] = header;
    });
    logForDebugging(
      `${HTTP_FETCH_LABEL} (${pluginName}): ${lt.status} in ${Date.now() - now}ms, ${bodyCapped.length} chars`,
    );
    return {
      status: lt.status,
      ok: lt.ok,
      headers: Et,
      text: bodyCapped,
    };
  } catch (error) {
    if (error instanceof HooksError) throw error;
    if (timeoutController.timedOut())
      throw new HooksError(
        `${pluginName}: ${HTTP_FETCH_LABEL}(${y.href})${ke} aborted: no complete answer within ${FETCH_TIMEOUT_MS_2}ms`,
      );
    let errnoCode = getErrnoCode(error);
    let pt = errnoCode !== undefined;
    throw new HooksError(
      `${pluginName}: ${HTTP_FETCH_LABEL}(${y.href})${ke} failed: ${pt ? `${errnoCode}: ` : ""}${errorMessage(error)}`,
    );
  } finally {
    timeoutController.release();
  }
}
export { httpFetchForPlugin, checkPluginFetchUrl, fetchManualRedirect, createTimeoutController };
