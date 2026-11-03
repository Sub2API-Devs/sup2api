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
import {
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
  isAbsolute as isAbsolute_16,
  isAbsolute as isAbsolute_17,
  isAbsolute as isAbsolute_18,
  isAbsolute as isAbsolute_19,
  isAbsolute as isAbsolute_20,
  isAbsolute as isAbsolute_21,
  isAbsolute as isAbsolute_22,
  isAbsolute as isAbsolute_23,
  isAbsolute as isAbsolute_24,
  isAbsolute as isAbsolute_25,
  isAbsolute as isAbsolute_26,
  isAbsolute as isAbsolute_27,
  isAbsolute as isAbsolute_28,
  isAbsolute as isAbsolute_29,
  isAbsolute as isAbsolute_30,
  isAbsolute as isAbsolute_31,
  isAbsolute as isAbsolute_32,
  isAbsolute as isAbsolute_33,
  isAbsolute as isAbsolute_34,
  isAbsolute as isAbsolute_35,
  isAbsolute as isAbsolute_36,
  isAbsolute as isAbsolute_37,
  isAbsolute as isAbsolute_38,
  isAbsolute as isAbsolute_39,
  isAbsolute as isAbsolute_40,
  isAbsolute as isAbsolute_42,
  isAbsolute as isAbsolute_43,
  isAbsolute as isAbsolute_44,
  isAbsolute as isAbsolute_45,
  isAbsolute as isAbsolute_46,
  isAbsolute as isAbsolute_47,
  isAbsolute as isAbsolute_48,
  isAbsolute as isAbsolute_49,
  isAbsolute as isAbsolute_50,
  isAbsolute as isAbsolute_51,
  isAbsolute as isAbsolute_52,
  isAbsolute as isAbsolute_53,
  isAbsolute as isAbsolute_54,
  isAbsolute as isAbsolute_55,
  isAbsolute as isAbsolute_56,
  isAbsolute as isAbsolute_57,
} from "path";
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
import { u, A, o, oe, kt, Ue, E, M, zg, pe } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  CONFIDENTIAL_MODEL_ID,
  maskModelIdForTelemetry,
} from "../../utils/model/modelCatalog/catalogEntries.js";
import { tyn } from "../../services/analytics/sink.js";
import { hydrateMaskedIds } from "../../utils/model/modelCatalog/maskedIds.js";
import { isBuiltinSuffixed } from "./eventPatterns.js";
import { isHipaaMode } from "../../services/analytics/privacyLevel.js";
import { filterEventsForPrivacy } from "../../services/analytics/eventSerialization.js";
import { m0t } from "./sessionApi.js";
import { cY } from "./audioApi.js";
import { filterEntriesToNullProto } from "../../utils/hooks/functionHookMatchers.js";
import { logForDebugging } from "../../utils/debug.js";
import { getErrnoCode, errorMessage } from "../../utils/errors.js";

/**
 * 校验 $.http.fetch 的 socketPath：必须是绝对路径、无 NUL、非网络位置，且本构建支持 Unix 套接字。
 */
//@ chunk-e6aww6q8.js:3732425-3732889 placement
function checkSocketPath(e, n, r) {
  if (!(typeof e === "string" && e !== "" && isAbsolute_50(e)))
    throw new HooksError(`${n}: ${r}: socketPath ${String(e)} refused: takes an absolute path`);
  if (e.includes("\x00"))
    throw new HooksError(`${n}: ${r}: socketPath ${jsonStringify(e)} refused: a NUL byte in the path`);
  if (isNetworkOrDevicePath(e))
    throw new HooksError(`${n}: ${r}: socketPath ${e} refused: a network location is not reached from here`);
  if (!alwaysTrue_2())
    throw new HooksError(`${n}: ${r}: socketPath ${e} refused: no Unix socket transport in this build`);
  return e;
}
//@ chunk-e6aww6q8.js:3732889-3732954 placement
var fDn = ["accept", "accept-language", "content-type", "user-agent"];
//@ chunk-e6aww6q8.js:3732954-3732968 placement
var Vxe = 30000;
//@ chunk-e6aww6q8.js:3732968-3732990 placement
var pw = "$.http.fetch";
/**
 * 带超时的 AbortController：转发外部中止，超时后中止并可查询 timedOut，release 清理。
 */
//@ chunk-e6aww6q8.js:3732990-3733160 placement
function createTimeoutController(e, n = Vxe) {
  let abortController = new AbortController(),
    s = forwardAbort(e, abortController),
    h = !1,
    y = setTimeout(() => {
      ((h = !0), abortController.abort());
    }, n);
  return {
    controller: abortController,
    timedOut: () => h,
    release: () => {
      (clearTimeout(y), s());
    },
  };
}
//@ chunk-e6aww6q8.js:3733160-3733189 placement
var boe = (e, n) => e.includes(n);
//@ chunk-e6aww6q8.js:3733189-3733219 placement
var hDn = [301, 302, 303, 307, 308];
//@ chunk-e6aww6q8.js:3733219-3733243 placement
var e0r = (e) => boe(hDn, e);
//@ chunk-e6aww6q8.js:3733243-3733265 placement
var t0r = [204, 205, 304];
//@ chunk-e6aww6q8.js:3733265-3733283 placement
var n0r = [301, 302];
//@ chunk-e6aww6q8.js:3733283-3733295 placement
var o0r = 303;
/**
 * 发起 fetch（手动处理重定向）：应用代理选项，或经 Unix 套接字（凭证请求强制校验证书、禁用 keepalive）。
 */
//@ chunk-e6aww6q8.js:3733295-3733629 placement
async function fetchManualRedirect(e, n) {
  let r = getProxyFetchOptions({ url: e.href }),
    { socket: socket } = n,
    y =
      socket === void 0
        ? r
        : {
            ...Uo(r, "proxy"),
            unix: socket.path,
            ...(socket.isCredentialed && { tls: { ...r.tls, rejectUnauthorized: !0 }, keepalive: !1 }),
          };
  return fetch(e.href, {
    ...y,
    method: n.method,
    ...(n.headers !== void 0 && { headers: n.headers }),
    ...(n.body !== void 0 && { body: n.body }),
    redirect: "manual",
    signal: n.signal,
  });
}
//@ chunk-e6aww6q8.js:3733629-3733697 placement
var Yxe = "nonessential network traffic is disabled for this session";
//@ chunk-e6aww6q8.js:3733697-3733790 placement
function TDn(e) {
  let { name: n, marketplace: marketplace } = splitPluginId(e);
  return n === "" || (marketplace ?? "") === "" || officialPluginId(e) !== void 0;
}
//@ chunk-e6aww6q8.js:3733790-3733915 placement
function networkRefusalReason(e) {
  return env.CLAUDE_CODE_EVAL_CONFINED === !0 || (isEssentialTrafficOnly() && TDn(e))
    ? Yxe
    : (policyDeniedReason(ALLOW_WEB_FETCH, "Network access from plugins", "is") ?? void 0);
}
//@ chunk-e6aww6q8.js:3733915-3734035 placement
function parseUrlArg(e, n, r) {
  try {
    return e instanceof URL ? e : new URL(e);
  } catch {
    throw new HooksError(`${n}: ${r}: not a URL: ${String(e)}`);
  }
}
/**
 * 校验插件网络请求的 URL：受会话策略（仅必要流量、禁止 web fetch）限制，只允许 http/https 且不得包含凭证。
 */
//@ chunk-e6aww6q8.js:3734035-3734400 placement
function checkPluginFetchUrl(e, { pluginName: pluginName, pluginStorageId: pluginStorageId }, s) {
  let h = networkRefusalReason(pluginStorageId);
  if (h !== void 0) throw new HooksError(`${pluginName}: ${s}: refused: ${h}`);
  let y = parseUrlArg(e, pluginName, s);
  if (y.protocol !== "https:" && y.protocol !== "http:")
    throw new HooksError(`${pluginName}: ${s}: ${y.href} refused: http or https only`);
  if (y.username !== "" || y.password !== "")
    throw new HooksError(`${pluginName}: ${s}: ${y.host} refused: credentials in the URL`);
  return y;
}
//@ chunk-e6aww6q8.js:3734400-3734471 placement
var p0r = () => (isEssentialTrafficOnly() ? `the session's credential is withheld: ${Yxe}` : void 0);
//@ chunk-e6aww6q8.js:3734471-3734481 placement
var ADn = 5;
//@ chunk-e6aww6q8.js:3734481-3734547 placement
var xDn = DoctorLazy(() => u({ events: A(u({ event_type: o(), event_data: oe() })) }));
//@ chunk-e6aww6q8.js:3734547-3734585 placement
var Zxe = "/api/event_logging/v2/batch";
/**
 * 判断路径（多次解码规范化后）是否指向事件上报批量接口，用于防止绕过隐私过滤。
 */
//@ chunk-e6aww6q8.js:3734585-3735009 placement
function isEventLoggingPath(e) {
  let n;
  try {
    n = decodeURIComponent(e);
  } catch {
    return !0;
  }
  for (let r = e; ;) {
    let replaced = n
      .replaceAll("%", "%25")
      .replaceAll("?", "%3F")
      .replaceAll("#", "%23")
      .replaceAll("\\", "/")
      .replaceAll(/\/+/g, "/");
    if (
      new URL(replaced, "http://ingest.invalid").pathname.replace(/\/+$/, "").toLowerCase() ===
      Zxe.toLowerCase()
    )
      return !0;
    if (n === r) return !1;
    ((r = n),
      (n = n.replaceAll(/(?:%[0-9a-f]{2})+/gi, (y) => {
        try {
          return decodeURIComponent(y);
        } catch {
          return y;
        }
      })));
  }
}
//@ chunk-e6aww6q8.js:3735009-3735108 placement
var IDn = DoctorLazy(() =>
  kt({ events: A(kt({ event_data: kt({ model: o(), additional_metadata: o().optional() }) })) }),
);
//@ chunk-e6aww6q8.js:3735108-3735158 placement
function LDn(e) {
  return IDn().safeParse(e).success;
}
//@ chunk-e6aww6q8.js:3735158-3735232 placement
var NDn = DoctorLazy(() => {
  let e = Ue([o(), E(), M(), zg()]);
  return pe(o(), Ue([e, A(e)]));
});
//@ chunk-e6aww6q8.js:3735232-3735282 placement
function FDn(e) {
  return NDn().safeParse(e).success;
}
//@ chunk-e6aww6q8.js:3735282-3735329 placement
function ePe(e) {
  try {
    return jsonParse(e);
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:3735329-3735553 placement = base64URLEncode (0.79)
function base64URLEncode(buffer) {
  let n = ePe(Buffer.from(buffer, "base64").toString("utf8"));
  if (!FDn(n)) return;
  let fromEntries = Object.fromEntries(Object.entries(n).filter(([, h]) => h !== CONFIDENTIAL_MODEL_ID)),
    s = tyn(fromEntries);
  return s === fromEntries ? buffer : Buffer.from(jsonStringify({ ...n, ...s })).toString("base64");
}
//@ chunk-e6aww6q8.js:3735553-3735592 placement
function BDn(e) {
  return e === CONFIDENTIAL_MODEL_ID ? e : maskModelIdForTelemetry(e);
}
//@ chunk-e6aww6q8.js:3735592-3735860 placement
function maskEventFields(e) {
  let { model: model, additional_metadata: additional_metadata } = e.event_data,
    s = BDn(model);
  if (additional_metadata === void 0)
    return s === model ? e : { ...e, event_data: { ...e.event_data, model: s } };
  let h = base64URLEncode(additional_metadata);
  if (h === void 0) return;
  return s === model && h === additional_metadata
    ? e
    : { ...e, event_data: { ...e.event_data, model: s, additional_metadata: h } };
}
//@ chunk-e6aww6q8.js:3735860-3736060 placement
async function maskEventBatch(e) {
  if (!LDn(e)) return;
  (await hydrateMaskedIds(), e.events.forEach((event) => maskEventFields(event)));
  let mapped = e.events.map((event) => maskEventFields(event));
  if (mapped.includes(void 0)) return;
  return mapped.every((r, s) => r === e.events[s]) ? e : { ...e, events: mapped };
}
/**
 * 插件向事件上报接口发送数据时：内置插件掩码模型与元数据，HIPAA 模式下按隐私规则过滤事件，否则原样发送。
 */
//@ chunk-e6aww6q8.js:3736060-3736450 placement
async function redactEventBatchBody(e, n, { pluginName: pluginName, pluginStorageId: pluginStorageId }, h) {
  let y = isBuiltinSuffixed(pluginStorageId);
  if (!(n !== void 0 && (y || isHipaaMode()) && isEventLoggingPath(e.pathname))) return n;
  let w = ePe(n),
    L = y ? await maskEventBatch(w) : w;
  if (L !== void 0 && !isHipaaMode()) return L === w ? n : jsonStringify(L);
  let safeParse = xDn().safeParse(L);
  if (!safeParse.success)
    throw new HooksError(
      `${pluginName}: ${h}: ${e.origin}${Zxe} refused: the body is not an event batch, so it cannot be redacted`,
    );
  return jsonStringify({ events: filterEventsForPrivacy(safeParse.data.events) });
}
/**
 * 读取响应体至多 n 字节（超出则截断并取消），返回 UTF-8 文本。
 */
//@ chunk-e6aww6q8.js:3736450-3736800 placement
async function readBodyCapped(e, n, r) {
  let body = e.body;
  if (body === null) return "";
  let reader = body.getReader(),
    y = [],
    S = 0;
  try {
    for (;;) {
      r?.throwIfAborted();
      let { done: w, value: L } = await reader.read();
      if (w) break;
      let G = n - S;
      if (L.byteLength >= G) {
        (y.push(L.subarray(0, G)), (S += G), await reader.cancel());
        break;
      }
      (y.push(L), (S += L.byteLength));
    }
  } finally {
    reader.releaseLock();
  }
  return new TextDecoder().decode(Buffer.concat(y));
}
/**
 * 插件 $.http.fetch：校验授权句柄与请求体大小上限后发起请求。
 */
//@ chunk-e6aww6q8.js:3736800-3739084 placement
async function httpFetchForPlugin({ url: url, init: init }, r, s) {
  let { pluginName: pluginName } = r,
    y = checkPluginFetchUrl(url, r, pw),
    S = init?.auth,
    w = S === void 0,
    L = w ? void 0 : p0r();
  if (L !== void 0) throw new HooksError(`${pluginName}: ${pw}: refused: ${L}`);
  let G = w ? void 0 : m0t.resolve(pluginName, S);
  if (init?.auth !== void 0 && G === void 0)
    throw new HooksError(`${pluginName}: ${pw}: unknown auth handle; $.session.authorize() mints one`);
  if (init?.body !== void 0 && init.body.length > cY)
    throw new HooksError(
      `${pluginName}: ${pw}: ${y.href} refused: a request body of ${init.body.length} characters is over the ${cY}-character limit`,
    );
  let Se = init?.socketPath === void 0 ? void 0 : checkSocketPath(init.socketPath, pluginName, pw),
    ke = Se === void 0 ? "" : ` over ${Se}`,
    origin = y.origin,
    Ee = G !== void 0 && y.protocol === "https:" && y.host === G.host,
    upper = (init?.method ?? "GET").toUpperCase(),
    Ie = init?.headers && filterEntriesToNullProto(init.headers, (Je, nt) => nt.toLowerCase() !== "host"),
    Me = init?.body,
    We = createTimeoutController(s),
    now = Date.now();
  logForDebugging(`${pw} (${pluginName}): ${upper} ${y.href}${ke}`);
  let lt;
  try {
    for (let yt = 0; ; yt++) {
      Me = await redactEventBatchBody(y, Me, r, pw);
      let gt = Ee && G !== void 0 && y.protocol === "https:" && y.host === G.host;
      lt = await fetchManualRedirect(y, {
        method: upper,
        headers: gt ? { ...Ie, ...G.headers } : Ie,
        body: Me,
        signal: We.controller.signal,
        ...(Se !== void 0 && { socket: { path: Se, isCredentialed: gt } }),
      });
      let At = lt.headers.get("location");
      if (!e0r(lt.status) || At === null) break;
      if ((await lt.body?.cancel(), yt + 1 > ADn))
        throw new HooksError(`${pluginName}: ${pw}: more than ${ADn} redirects from ${url}`);
      if (
        ((y = checkPluginFetchUrl(new URL(At, y), r, pw)),
        lt.status === o0r || (boe(n0r, lt.status) && upper === "POST"))
      )
        ((upper = "GET"), (Me = void 0));
      if (G !== void 0 && (y.protocol !== "https:" || y.host !== G.host)) Ee = !1;
      if (y.origin !== origin && Ie !== void 0)
        Ie = filterEntriesToNullProto(Ie, (qt, Zt) => boe(fDn, Zt.toLowerCase()));
      logForDebugging(`${pw} (${pluginName}): redirect ${lt.status} to ${y.href}`);
    }
    let Je = Number(lt.headers.get("content-length"));
    if (upper !== "HEAD" && !boe(t0r, lt.status) && Number.isFinite(Je) && Je > cY)
      throw (
        await lt.body?.cancel(),
        new HooksError(
          `${pluginName}: ${pw}: ${y.href} refused: body of ${Je} bytes is over the ${cY}-byte limit`,
        )
      );
    let pt = await readBodyCapped(lt, cY, We.controller.signal),
      Et = {};
    return (
      lt.headers.forEach((header, gt) => {
        Et[gt.toLowerCase()] = header;
      }),
      logForDebugging(`${pw} (${pluginName}): ${lt.status} in ${Date.now() - now}ms, ${pt.length} chars`),
      { status: lt.status, ok: lt.ok, headers: Et, text: pt }
    );
  } catch (error) {
    if (error instanceof HooksError) throw error;
    if (We.timedOut())
      throw new HooksError(
        `${pluginName}: ${pw}(${y.href})${ke} aborted: no complete answer within ${Vxe}ms`,
      );
    let nt = getErrnoCode(error),
      pt = nt !== void 0;
    throw new HooksError(
      `${pluginName}: ${pw}(${y.href})${ke} failed: ${pt ? `${nt}: ` : ""}${errorMessage(error)}`,
    );
  } finally {
    We.release();
  }
}

export { httpFetchForPlugin, checkPluginFetchUrl, fetchManualRedirect, createTimeoutController };
