/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/request-filter.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (33)
 * attribution: esm-fingerprint 31, esm-layout 2
 */
import { PassThrough, Readable } from "stream";
import { METHODS } from "http";
import { isIP } from "net";
import { endRequestAfterResponse } from "./emitted-connection.js";
import { logForDebugging as logForDebugging_2 } from "../utils/debug.js";
import { sanitizeDenialReason } from "./sandbox-violation-store.js";
import { ol } from "./resolved-address-guard.js";

//@ chunk-fq0cr76a.js:654888-654989 esm-fingerprint
var BODYLESS_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
var ECHO_METHODS = new Set(["TRACE", "TRACK"]);
var DEFAULT_DENY_REASON = "denied by sandbox policy";
//@ chunk-fq0cr76a.js:654989-655161 esm-fingerprint
function destroyAfterResponse(req, res) {
  if (res.destroyed) {
    req.destroy();
    return;
  }
  if (res.writableFinished) {
    endRequestAfterResponse(req);
    return;
  }
  res.once("finish", () => endRequestAfterResponse(req));
  res.once("close", () => {
    if (!res.writableFinished) req.destroy();
  });
}
//@ chunk-fq0cr76a.js:655161-656511 esm-fingerprint
async function decideAndRespond(
  filterRequest,
  req,
  res,
  url,
  signal,
  onDeny,
  info,
  denyHeader,
  canSetHeaders = true,
) {
  let method = req.method ?? "GET";
  let forCallback;
  let forUpstream = req;
  let shim;
  let declaresBody = Boolean(req.headers["content-length"] || req.headers["transfer-encoding"]);
  let bodylessMethod = BODYLESS_METHODS.has(method);
  if (!bodylessMethod || declaresBody) {
    let teeSource = new PassThrough();
    shim = teeSource;
    teeSource.on("error", () => {});
    req.pipe(teeSource);
    let web = Readable.toWeb(teeSource);
    let [a, b] = web.tee();
    forCallback = a;
    forUpstream = Readable.fromWeb(b);
    let upstreamBranch = forUpstream;
    upstreamBranch.on("error", () => {});
    req.on("error", (err) => {
      teeSource.end();
      upstreamBranch.destroy(err);
    });
  }
  if (ECHO_METHODS.has(method.toUpperCase())) {
    let reason = `the ${method} method is not forwarded`;
    onDeny?.(method, url, reason);
    deny(
      res,
      {
        action: "deny",
        status: 405,
        reason,
        mark: "method_refused",
      },
      denyHeader,
    );
    forCallback?.cancel().catch(() => {});
    endDeniedBody(req, res, forUpstream, shim);
    return null;
  }
  let webReq;
  try {
    let callbackBody =
      forCallback && !bodylessMethod
        ? {
            body: forCallback,
            duplex: "half",
          }
        : {};
    webReq = new Request(url, {
      method,
      headers: incomingHeaders(req),
      signal,
      ...callbackBody,
    });
  } catch (err) {
    let reason = `malformed request: ${err.message}`;
    onDeny?.(method, url, reason);
    deny(
      res,
      {
        action: "deny",
        reason,
        mark: "bad_request",
      },
      denyHeader,
    );
    forCallback?.cancel().catch(() => {});
    endDeniedBody(req, res, forUpstream, shim);
    return null;
  }
  let decision;
  try {
    decision = await filterRequest(
      webReq,
      forCallback && bodylessMethod
        ? {
            ...info,
            unshownBody: unshownBodyProbe(req, forCallback),
          }
        : info,
    );
  } catch (err) {
    decision = {
      action: "deny",
      reason: `sandbox policy check failed: ${err.message}`,
    };
  }
  let malformed = malformedDecisionReason(decision);
  if (malformed !== undefined)
    decision = {
      action: "deny",
      reason: `malformed filterRequest decision: ${malformed}`,
    };
  if (!canSetHeaders && decision.action === "allow" && (decision.setHeaders?.length ?? 0) > 0)
    decision = {
      action: "deny",
      reason: PLAINTEXT_HEADER_SET_REASON,
      mark: "plaintext_header_set",
    };
  if (forCallback && !webReq.bodyUsed) forCallback.cancel().catch(() => {});
  if (decision.action === "allow") {
    logForDebugging_2(`[request-filter] allow ${method} ${url}`);
    return {
      body: forUpstream,
      decision,
    };
  }
  onDeny?.(method, url, decision.reason ?? DEFAULT_DENY_REASON);
  deny(res, decision, denyHeader);
  endDeniedBody(req, res, forUpstream, shim);
  return null;
}
//@ chunk-fq0cr76a.js:656511-656608 esm-fingerprint
function endDeniedBody(req, res, forUpstream, shim) {
  if (shim !== undefined) {
    req.unpipe(shim);
    shim.pause();
    req.resume();
  }
  if (forUpstream !== req) forUpstream.destroy();
  destroyAfterResponse(req, res);
}
//@ chunk-fq0cr76a.js:656608-656891 esm-fingerprint
function unshownBodyProbe(req, branch) {
  let answer;
  let probe = async () => {
    if (!req.headers["transfer-encoding"] && Number(req.headers["content-length"]) > 0) return true;
    let reader = branch.getReader();
    try {
      for (;;) {
        let { done, value } = await reader.read();
        if (done) return false;
        if (value.byteLength > 0) return true;
      }
    } finally {
      reader.cancel().catch(() => {});
    }
  };
  return () => answer ?? (answer = probe());
}
//@ chunk-fq0cr76a.js:656891-657079 esm-layout
var PLAINTEXT_HEADER_SET_REASON =
  "the allow decision sets headers, and headers are not set on plain-HTTP requests unless plaintext header sets are enabled; nothing was forwarded";
var HEADER_NAME = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
//@ chunk-fq0cr76a.js:657079-658193 esm-fingerprint
function malformedDecisionReason(decision) {
  if (typeof decision !== "object" || decision === null) return "not an object";
  let d = decision;
  if (d.action !== "allow" && d.action !== "deny") return "unknown action";
  if (d.reason !== undefined && typeof d.reason !== "string") return "reason is not a string";
  if (d.status !== undefined && typeof d.status !== "number") return "status is not a number";
  if (d.mark !== undefined && (typeof d.mark !== "string" || !HEADER_NAME.test(d.mark)))
    return "mark is not a reason code";
  if (d.action === "deny") return;
  if (d.onResponse !== undefined && typeof d.onResponse !== "function") return "onResponse is not a function";
  let removals = d.removeHeaders;
  if (removals !== undefined) {
    if (!Array.isArray(removals)) return "removeHeaders is not an array";
    for (let name of removals)
      if (typeof name !== "string" || !HEADER_NAME.test(name))
        return "removeHeaders holds an invalid header name";
  }
  let sets = d.setHeaders;
  if (sets !== undefined) {
    if (!Array.isArray(sets)) return "setHeaders is not an array";
    for (let entry of sets) {
      if (!Array.isArray(entry) || entry.length !== 2)
        return "setHeaders holds an entry that is not a [name, value] pair";
      let [name, value] = entry;
      if (typeof name !== "string" || !HEADER_NAME.test(name))
        return "setHeaders holds an invalid header name";
      if (typeof value !== "string" || !isValidHeaderValue(value))
        return "setHeaders holds an invalid header value";
    }
  }
  return;
}
//@ chunk-fq0cr76a.js:658193-658307 esm-fingerprint
function isValidHeaderValue(value) {
  for (let i = 0; i < value.length; i++) {
    let code = value.charCodeAt(i);
    if ((code < 32 && code !== 9) || code === 127 || code > 255) return false;
  }
  return true;
}
//@ chunk-fq0cr76a.js:658307-658468 esm-fingerprint
function deny(res, decision, denyHeader) {
  let status = decision.status;
  let status_2 =
    status !== undefined && Number.isInteger(status) && status >= 400 && status <= 599 ? status : 403;
  respondDenied(
    res,
    decision.reason ?? DEFAULT_DENY_REASON,
    denyHeader !== undefined
      ? {
          name: denyHeader,
          value: decision.mark ?? "denied",
        }
      : undefined,
    status_2,
  );
}
//@ chunk-fq0cr76a.js:658468-658718 esm-fingerprint
/**
 * 把 WebSocket URL（或相对路径）换成对应的 HTTP POST URL。
 */
function normalizeRequestTarget(raw, method) {
  if (raw === "*") return method === "OPTIONS" ? raw : undefined;
  let url;
  try {
    url = new URL(raw.startsWith("/") ? `http://origin.invalid${raw}` : raw);
  } catch {
    return;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  return `${url.pathname.replace(/^\/{2,}/, "/")}${url.search}`;
}
//@ chunk-fq0cr76a.js:658718-659048 esm-fingerprint
var MALFORMED_TARGET = "malformed request-target";
var AMBIGUOUS_TARGET = `ambiguous request-target: as spelled and normalized it names different paths (a dot segment, leading slashes or "\\"); nothing was forwarded (network.ambiguousRequestTarget in the sandbox's configuration is "refuse")`;
var percentEncoded = (text) => Buffer.from(text).toString("hex").toUpperCase().replace(/../g, "%$&");
//@ chunk-fq0cr76a.js:659048-659597 esm-fingerprint
function readRequestTarget(raw, method, mode) {
  let target = raw.replace(/#.*/s, "");
  let ascii = target.replace(/[^\0-\x7f]+/g, percentEncoded);
  let normalized = normalizeRequestTarget(ascii, method);
  let spelled = ascii.replace(/^https?:\/\/[^/?#\\]+/i, "");
  if (spelled === "" || spelled.startsWith("?")) spelled = "/" + spelled;
  if (normalized === undefined || !/^(?:\*|\/[!-~]*)$/.test(spelled))
    return {
      refusal: MALFORMED_TARGET,
    };
  if (/[\ufffd\ud800-\udfff]/u.test(target))
    return {
      spelled,
      refusal: `${MALFORMED_TARGET}: it holds bytes that are not UTF-8, or U+FFFD`,
    };
  let [a, b] = [spelled, normalized].map((t) => t.replace(/["'<>^`{}]/g, percentEncoded));
  let ambiguous = a !== b && a !== b + "?";
  let forwarded =
    mode === "normalize" ? normalized : mode === "asSpelled" || !ambiguous ? spelled : undefined;
  return {
    spelled,
    normalized,
    ambiguous,
    forwarded,
    refusal: forwarded === undefined ? AMBIGUOUS_TARGET : undefined,
  };
}
//@ chunk-fq0cr76a.js:659597-659720 esm-fingerprint
function respondRefusedTarget(res, refusal = MALFORMED_TARGET, mark) {
  logForDebugging_2(`[proxy] ${refusal}`, {
    level: "warn",
  });
  respondDenied(
    res,
    refusal,
    mark ?? (refusal === AMBIGUOUS_TARGET ? "ambiguous-request-target" : undefined),
    400,
  );
  return refusal;
}
//@ chunk-fq0cr76a.js:659720-659731 esm-layout
var MAX_REPORTED_TARGET_LENGTH = 200;
//@ chunk-fq0cr76a.js:659731-660741 esm-fingerprint
function refuseUnparsedRequest(err, socket, mayAnswer, mark = DEFAULT_DENY_TAG) {
  let { code, rawPacket, bytesParsed } = err;
  if (typeof code !== "string" || !code.startsWith("HPE_") || code === "HPE_INVALID_EOF_STATE") {
    socket.destroy();
    return;
  }
  if (socket.writableEnded) return;
  let refused = {
    method: "-",
    target: "",
    reason: `malformed request (${err.message})`,
  };
  if (code === "HPE_INVALID_URL") {
    refused.reason = `${MALFORMED_TARGET}: percent-encode its bytes outside printable ASCII`;
    if (Buffer.isBuffer(rawPacket) && typeof bytesParsed === "number") {
      let text = rawPacket.toString("latin1");
      let line = /([A-Z-]+) (\/[^ \r\n]*) HTTP\/1\.[01]\r?\n/y;
      line.lastIndex =
        text.slice(0, bytesParsed).lastIndexOf(`
`) + 1;
      let [, method, target] = line.exec(text) ?? [];
      if (method !== undefined && METHODS.includes(method)) {
        refused.method = method;
        refused.target = target
          .slice(0, MAX_REPORTED_TARGET_LENGTH)
          .replace(/[^!-~]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`);
      }
    }
  }
  logForDebugging_2(`[proxy] ${refused.reason}`, {
    level: "warn",
  });
  if (!mayAnswer || !socket.writable) {
    socket.destroy();
    return refused;
  }
  socket.on("error", () => {});
  let [name, value] = denyMarkHeader(mark);
  socket.end(`HTTP/1.1 400 Bad Request\r
Content-Type: text/plain\r
${name}: ${value}\r
Content-Length: ${refused.reason.length + 1}\r
Connection: close\r
\r
${refused.reason}
`);
  setTimeout(() => socket.destroy(), 1000).unref?.();
  return refused;
}
//@ chunk-fq0cr76a.js:660741-661070 esm-fingerprint
function requestTargetAsSpelled(raw, { absolute = false } = {}) {
  let target = raw;
  if (absolute) {
    let m = /^https?:\/\/[^/?#]*/i.exec(raw);
    if (!m) return;
    target = raw.slice(m[0].length);
    if (target === "" || target.startsWith("?")) target = "/" + target;
  }
  if (!target.startsWith("/") || target.startsWith("//")) return;
  if (target.startsWith("/\\")) return;
  for (let i = 0; i < target.length; i++) {
    let c = target.charCodeAt(i);
    if (c <= 32 || c === 127 || c === 35) return;
  }
  return target;
}
//@ chunk-fq0cr76a.js:661070-661129 esm-fingerprint
function foldHeaderName(name) {
  return name.toLowerCase().replace(/[_.]/g, "-");
}
//@ chunk-fq0cr76a.js:661129-661261 esm-fingerprint
var UNSETTABLE_HEADERS = new Set([
  "host",
  "connection",
  "keep-alive",
  "proxy-connection",
  "transfer-encoding",
  "te",
  "trailer",
  "upgrade",
  "content-length",
]);
//@ chunk-fq0cr76a.js:661261-661397 esm-fingerprint
function removeHeadersFolded(headers, names) {
  let drop = new Set();
  for (let n of names) drop.add(foldHeaderName(n));
  if (drop.size === 0) return;
  for (let k of Object.keys(headers)) if (drop.has(foldHeaderName(k))) delete headers[k];
}
//@ chunk-fq0cr76a.js:661397-661753 esm-fingerprint
function applyHeaderEdits(headers, decision) {
  let sets = new Map();
  for (let [name, value] of decision.setHeaders ?? []) {
    let folded = foldHeaderName(name);
    if (UNSETTABLE_HEADERS.has(folded)) continue;
    let entry = sets.get(folded) ?? {
      name: name.toLowerCase(),
      values: [],
    };
    if (!/[\r\n\0]/.test(value)) entry.values.push(value);
    sets.set(folded, entry);
  }
  let removals = (decision.removeHeaders ?? []).filter((n) => !UNSETTABLE_HEADERS.has(foldHeaderName(n)));
  removeHeadersFolded(headers, [...removals, ...sets.keys()]);
  for (let { name, values } of sets.values())
    if (values.length > 0) headers[name] = values.length === 1 ? values[0] : values;
}
//@ chunk-fq0cr76a.js:661753-661941 esm-fingerprint
/**
 * invokeRequestFilterOnResponse：调用 request-filter 插件的 onResponse 回调（参数拷贝），同步或异步异常都只记日志。
 */
function invokeRequestFilterOnResponse(decision, status, headers) {
  if (!decision?.onResponse) return;
  let copy = {};
  for (let [name, value] of Object.entries(headers)) copy[name] = Array.isArray(value) ? [...value] : value;
  try {
    let returned = decision.onResponse(status, copy);
    if (isThenable(returned)) returned.then(undefined, logRequestFilterError);
  } catch (err) {
    logRequestFilterError(err);
  }
}
//@ chunk-fq0cr76a.js:661941-662021 esm-fingerprint
function isThenable(value) {
  return typeof value === "object" && value !== null && typeof value.then === "function";
}
//@ chunk-fq0cr76a.js:662021-662119 esm-fingerprint
function logRequestFilterError(err) {
  logForDebugging_2(`[request-filter] onResponse failed: ${err?.message ?? String(err)}`, {
    level: "error",
  });
}
//@ chunk-fq0cr76a.js:662119-662228 esm-fingerprint
function hostHeaderValues(rawHeaders) {
  let out = [];
  for (let i = 0; i + 1 < rawHeaders.length; i += 2)
    if (rawHeaders[i].toLowerCase() === "host") out.push(rawHeaders[i + 1]);
  return out;
}
//@ chunk-fq0cr76a.js:662228-662615 esm-fingerprint
function hostMismatch(hostHeaders, serverName, target, requestTargetAuthority) {
  let want = target.hostname.toLowerCase();
  if (serverName !== undefined && serverName.toLowerCase() !== want)
    return "TLS server name does not match the request target";
  if (requestTargetAuthority !== undefined && !namesTarget(requestTargetAuthority, want, target))
    return "request-target authority does not match the request target";
  if (hostHeaders.length === 0) return;
  if (hostHeaders.length > 1) return "more than one Host header";
  if (!namesTarget(hostHeaders[0], want, target)) return "Host header does not match the request target";
  return;
}
//@ chunk-fq0cr76a.js:662615-662761 esm-fingerprint
function namesTarget(authority, want, target) {
  let parsed = hostAndPort(authority);
  if (parsed === undefined || parsed.host.toLowerCase() !== want) return false;
  return parsed.port === "" ? target.port === target.defaultPort : parsed.port === String(target.port);
}
//@ chunk-fq0cr76a.js:662761-663103 esm-fingerprint
function hostAndPort(h_2) {
  let host = h_2;
  let rest = "";
  if (h_2.startsWith("[")) {
    let end = h_2.indexOf("]");
    if (end < 0) return;
    host = h_2.slice(1, end);
    rest = h_2.slice(end + 1);
    if (isIP(host) !== 6) return;
  } else {
    let i = h_2.indexOf(":");
    if (i >= 0) {
      host = h_2.slice(0, i);
      rest = h_2.slice(i);
    }
    if (/[[\]]/.test(host)) return;
  }
  if (rest === "")
    return {
      host,
      port: "",
    };
  let port = rest.slice(1);
  if (rest[0] !== ":" || port === "" || /[[\]:]/.test(port)) return;
  return {
    host,
    port,
  };
}
//@ chunk-fq0cr76a.js:663103-663139 esm-fingerprint
var DEFAULT_DENY_TAG = "blocked-by-sandbox-runtime";
//@ chunk-fq0cr76a.js:663139-663218 esm-fingerprint
function denyMarkHeader(mark) {
  return typeof mark === "string" ? ["X-Proxy-Error", mark] : [mark.name, mark.value];
}
//@ chunk-fq0cr76a.js:663218-663377 esm-fingerprint
function Pm(reason, tag = DEFAULT_DENY_TAG, phrase = "Forbidden") {
  let [name, value] = denyMarkHeader(tag);
  return (
    `HTTP/1.1 403 ${sanitizeDenialReason(String(phrase)).replace(/[^ -~]/gu, "?")}\r
Content-Type: text/plain\r
${name}: ${value}\r
\r
` + reason
  );
}
//@ chunk-fq0cr76a.js:663377-663572 esm-fingerprint
function respondDenied(res, reason, tag = DEFAULT_DENY_TAG, status = 403) {
  logForDebugging_2(`[proxy] deny: ${reason}`);
  if (res.headersSent || res.destroyed) {
    res.destroy();
    return;
  }
  let [name, value] = denyMarkHeader(tag);
  res.writeHead(status, {
    "Content-Type": "text/plain",
    [name]: value,
  });
  res.end(
    Buffer.from(
      reason +
        `
`,
    ),
  );
}
//@ chunk-fq0cr76a.js:663572-663779 esm-fingerprint
function respondUpstreamError(res, err, denyHeader) {
  if (ol(err))
    respondDenied(
      res,
      err.message,
      denyHeader !== undefined
        ? {
            name: denyHeader,
            value: "address_not_allowed",
          }
        : undefined,
    );
  else if (!res.headersSent) {
    res.writeHead(502, {
      "Content-Type": "text/plain",
    });
    res.end("Bad Gateway");
  } else res.destroy();
}
//@ chunk-fq0cr76a.js:663779-663954 esm-fingerprint
function incomingHeaders(req) {
  let h_2 = new Headers();
  for (let [k, v] of Object.entries(req.headers)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) for (let vv of v) h_2.append(k, vv);
    else h_2.append(k, v);
  }
  return h_2;
}
export {
  BODYLESS_METHODS,
  refuseUnparsedRequest,
  respondUpstreamError,
  readRequestTarget,
  requestTargetAsSpelled,
  respondRefusedTarget,
  hostHeaderValues,
  respondDenied,
  hostMismatch,
  decideAndRespond,
  applyHeaderEdits,
  invokeRequestFilterOnResponse,
  removeHeadersFolded,
  Pm,
};
