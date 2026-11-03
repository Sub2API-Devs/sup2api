/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/request-filter.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (33)
 * attribution: esm-fingerprint 31, esm-layout 2
 */
import { PassThrough, Readable } from "stream";
import { METHODS } from "http";
import { isIP, isIP as isIP_2, isIP as isIP_3, isIP as isIP_4, isIP as isIP_5 } from "net";
import { tu } from "./emitted-connection.js";
import { At } from "../utils/debug.js";
import { vm } from "./sandbox-violation-store.js";
import { ol } from "./resolved-address-guard.js";

//@ chunk-fq0cr76a.js:654888-654989 esm-fingerprint
var gE = new Set(["GET", "HEAD", "OPTIONS"]),
  b5 = new Set(["TRACE", "TRACK"]),
  MC = "denied by sandbox policy";
//@ chunk-fq0cr76a.js:654989-655161 esm-fingerprint
function S5(e, n) {
  if (n.destroyed) {
    e.destroy();
    return;
  }
  if (n.writableFinished) {
    tu(e);
    return;
  }
  (n.once("finish", () => tu(e)),
    n.once("close", () => {
      if (!n.writableFinished) e.destroy();
    }));
}
//@ chunk-fq0cr76a.js:655161-656511 esm-fingerprint
async function Cm(e, n, r, s, h, y, b, S, w = !0) {
  let R = n.method ?? "GET",
    D,
    O = n,
    L,
    V = Boolean(n.headers["content-length"] || n.headers["transfer-encoding"]),
    K = gE.has(R);
  if (!K || V) {
    let ie = new PassThrough();
    ((L = ie), ie.on("error", () => {}), n.pipe(ie));
    let toWeb = Readable.toWeb(ie),
      [Se, ue] = toWeb.tee();
    ((D = Se), (O = Readable.fromWeb(ue)));
    let me = O;
    (me.on("error", () => {}),
      n.on("error", (Ne) => {
        (ie.end(), me.destroy(Ne));
      }));
  }
  if (b5.has(R.toUpperCase())) {
    let ie = `the ${R} method is not forwarded`;
    return (
      y?.(R, s, ie),
      mE(r, { action: "deny", status: 405, reason: ie, mark: "method_refused" }, S),
      D?.cancel().catch(() => {}),
      pE(n, r, O, L),
      null
    );
  }
  let q;
  try {
    let ie = D && !K ? { body: D, duplex: "half" } : {};
    q = new Request(s, { method: R, headers: R5(n), signal: h, ...ie });
  } catch (error) {
    let ae = `malformed request: ${error.message}`;
    return (
      y?.(R, s, ae),
      mE(r, { action: "deny", reason: ae, mark: "bad_request" }, S),
      D?.cancel().catch(() => {}),
      pE(n, r, O, L),
      null
    );
  }
  let Z;
  try {
    Z = await e(q, D && K ? { ...b, unshownBody: E5(n, D) } : b);
  } catch (error) {
    Z = { action: "deny", reason: `sandbox policy check failed: ${error.message}` };
  }
  let J = _5(Z);
  if (J !== void 0) Z = { action: "deny", reason: `malformed filterRequest decision: ${J}` };
  if (!w && Z.action === "allow" && (Z.setHeaders?.length ?? 0) > 0)
    Z = { action: "deny", reason: x5, mark: "plaintext_header_set" };
  if (D && !q.bodyUsed) D.cancel().catch(() => {});
  if (Z.action === "allow") return (At(`[request-filter] allow ${R} ${s}`), { body: O, decision: Z });
  return (y?.(R, s, Z.reason ?? MC), mE(r, Z, S), pE(n, r, O, L), null);
}
//@ chunk-fq0cr76a.js:656511-656608 esm-fingerprint
function pE(e, n, r, s) {
  if (s !== void 0) (e.unpipe(s), s.pause(), e.resume());
  if (r !== e) r.destroy();
  S5(e, n);
}
//@ chunk-fq0cr76a.js:656608-656891 esm-fingerprint
function E5(e, n) {
  let r,
    s = async () => {
      if (!e.headers["transfer-encoding"] && Number(e.headers["content-length"]) > 0) return !0;
      let reader = n.getReader();
      try {
        for (;;) {
          let { done: y, value: b } = await reader.read();
          if (y) return !1;
          if (b.byteLength > 0) return !0;
        }
      } finally {
        reader.cancel().catch(() => {});
      }
    };
  return () => r ?? (r = s());
}
//@ chunk-fq0cr76a.js:656891-657079 esm-layout
var x5 =
    "the allow decision sets headers, and headers are not set on plain-HTTP requests unless plaintext header sets are enabled; nothing was forwarded",
  hE = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
//@ chunk-fq0cr76a.js:657079-658193 esm-fingerprint
function _5(e) {
  if (typeof e !== "object" || e === null) return "not an object";
  let n = e;
  if (n.action !== "allow" && n.action !== "deny") return "unknown action";
  if (n.reason !== void 0 && typeof n.reason !== "string") return "reason is not a string";
  if (n.status !== void 0 && typeof n.status !== "number") return "status is not a number";
  if (n.mark !== void 0 && (typeof n.mark !== "string" || !hE.test(n.mark)))
    return "mark is not a reason code";
  if (n.action === "deny") return;
  if (n.onResponse !== void 0 && typeof n.onResponse !== "function") return "onResponse is not a function";
  let removeHeaders = n.removeHeaders;
  if (removeHeaders !== void 0) {
    if (!Array.isArray(removeHeaders)) return "removeHeaders is not an array";
    for (let h of removeHeaders)
      if (typeof h !== "string" || !hE.test(h)) return "removeHeaders holds an invalid header name";
  }
  let setHeaders = n.setHeaders;
  if (setHeaders !== void 0) {
    if (!Array.isArray(setHeaders)) return "setHeaders is not an array";
    for (let h of setHeaders) {
      if (!Array.isArray(h) || h.length !== 2)
        return "setHeaders holds an entry that is not a [name, value] pair";
      let [y, b] = h;
      if (typeof y !== "string" || !hE.test(y)) return "setHeaders holds an invalid header name";
      if (typeof b !== "string" || !v5(b)) return "setHeaders holds an invalid header value";
    }
  }
  return;
}
//@ chunk-fq0cr76a.js:658193-658307 esm-fingerprint
function v5(e) {
  for (let n = 0; n < e.length; n++) {
    let code = e.charCodeAt(n);
    if ((code < 32 && code !== 9) || code === 127 || code > 255) return !1;
  }
  return !0;
}
//@ chunk-fq0cr76a.js:658307-658468 esm-fingerprint
function mE(e, n, r) {
  let status = n.status,
    h = status !== void 0 && Number.isInteger(status) && status >= 400 && status <= 599 ? status : 403;
  Ks(e, n.reason ?? MC, r !== void 0 ? { name: r, value: n.mark ?? "denied" } : void 0, h);
}
/**
 * 把 WebSocket URL（或相对路径）换成对应的 HTTP POST URL。
 */
//@ chunk-fq0cr76a.js:658468-658718 esm-fingerprint
function w5(e, n) {
  if (e === "*") return n === "OPTIONS" ? e : void 0;
  let r;
  try {
    r = new URL(e.startsWith("/") ? `http://origin.invalid${e}` : e);
  } catch {
    return;
  }
  if (r.protocol !== "http:" && r.protocol !== "https:") return;
  return `${r.pathname.replace(/^\/{2,}/, "/")}${r.search}`;
}
//@ chunk-fq0cr76a.js:658718-659048 esm-fingerprint
var wm = "malformed request-target",
  $C = `ambiguous request-target: as spelled and normalized it names different paths (a dot segment, leading slashes or "\\"); nothing was forwarded (network.ambiguousRequestTarget in the sandbox's configuration is "refuse")`,
  LC = (e) => Buffer.from(e).toString("hex").toUpperCase().replace(/../g, "%$&");
//@ chunk-fq0cr76a.js:659048-659597 esm-fingerprint
function Rm(e, n, r) {
  let replaced = e.replace(/#.*/s, ""),
    replaced_2 = replaced.replace(/[^\0-\x7f]+/g, LC),
    y = w5(replaced_2, n),
    replaced_3 = replaced_2.replace(/^https?:\/\/[^/?#\\]+/i, "");
  if (replaced_3 === "" || replaced_3.startsWith("?")) replaced_3 = "/" + replaced_3;
  if (y === void 0 || !/^(?:\*|\/[!-~]*)$/.test(replaced_3)) return { refusal: wm };
  if (/[\ufffd\ud800-\udfff]/u.test(replaced))
    return { spelled: replaced_3, refusal: `${wm}: it holds bytes that are not UTF-8, or U+FFFD` };
  let [S, w] = [replaced_3, y].map((O) => O.replace(/["'<>^`{}]/g, LC)),
    R = S !== w && S !== w + "?",
    D = r === "normalize" ? y : r === "asSpelled" || !R ? replaced_3 : void 0;
  return {
    spelled: replaced_3,
    normalized: y,
    ambiguous: R,
    forwarded: D,
    refusal: D === void 0 ? $C : void 0,
  };
}
//@ chunk-fq0cr76a.js:659597-659720 esm-fingerprint
function Nm(e, n = wm, r) {
  return (
    At(`[proxy] ${n}`, { level: "warn" }),
    Ks(e, n, r ?? (n === $C ? "ambiguous-request-target" : void 0), 400),
    n
  );
}
//@ chunk-fq0cr76a.js:659720-659731 esm-layout
var T5 = 200;
//@ chunk-fq0cr76a.js:659731-660741 esm-fingerprint
function VC(e, n, r, s = BLOCKED_BY_SANDBOX_RUNTIME) {
  let { code: code, rawPacket: rawPacket, bytesParsed: bytesParsed } = e;
  if (typeof code !== "string" || !code.startsWith("HPE_") || code === "HPE_INVALID_EOF_STATE") {
    n.destroy();
    return;
  }
  if (n.writableEnded) return;
  let S = { method: "-", target: "", reason: `malformed request (${e.message})` };
  if (code === "HPE_INVALID_URL") {
    if (
      ((S.reason = `${wm}: percent-encode its bytes outside printable ASCII`),
      Buffer.isBuffer(rawPacket) && typeof bytesParsed === "number")
    ) {
      let str = rawPacket.toString("latin1"),
        O = /([A-Z-]+) (\/[^ \r\n]*) HTTP\/1\.[01]\r?\n/y;
      O.lastIndex =
        str.slice(0, bytesParsed).lastIndexOf(`
`) + 1;
      let [, L, V] = O.exec(str) ?? [];
      if (L !== void 0 && METHODS.includes(L))
        ((S.method = L),
          (S.target = V.slice(0, T5).replace(
            /[^!-~]/g,
            (K) => `%${K.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`,
          )));
    }
  }
  if ((At(`[proxy] ${S.reason}`, { level: "warn" }), !r || !n.writable)) return (n.destroy(), S);
  n.on("error", () => {});
  let [w, R] = bE(s);
  return (
    n.end(`HTTP/1.1 400 Bad Request\r
Content-Type: text/plain\r
${w}: ${R}\r
Content-Length: ${S.reason.length + 1}\r
Connection: close\r
\r
${S.reason}
`),
    setTimeout(() => n.destroy(), 1000).unref?.(),
    S
  );
}
//@ chunk-fq0cr76a.js:660741-661070 esm-fingerprint
function km(e, { absolute: n = !1 } = {}) {
  let r = e;
  if (n) {
    let match = /^https?:\/\/[^/?#]*/i.exec(e);
    if (!match) return;
    if (((r = e.slice(match[0].length)), r === "" || r.startsWith("?"))) r = "/" + r;
  }
  if (!r.startsWith("/") || r.startsWith("//")) return;
  if (r.startsWith("/\\")) return;
  for (let s = 0; s < r.length; s++) {
    let code = r.charCodeAt(s);
    if (code <= 32 || code === 127 || code === 35) return;
  }
  return r;
}
//@ chunk-fq0cr76a.js:661070-661129 esm-fingerprint
function Am(e) {
  return e.toLowerCase().replace(/[_.]/g, "-");
}
//@ chunk-fq0cr76a.js:661129-661261 esm-fingerprint
var BC = new Set([
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
function pc(e, n) {
  let r = new Set();
  for (let s of n) r.add(Am(s));
  if (r.size === 0) return;
  for (let s of Object.keys(e)) if (r.has(Am(s))) delete e[s];
}
//@ chunk-fq0cr76a.js:661397-661753 esm-fingerprint
function Dm(e, n) {
  let r = new Map();
  for (let [h, y] of n.setHeaders ?? []) {
    let b = Am(h);
    if (BC.has(b)) continue;
    let S = r.get(b) ?? { name: h.toLowerCase(), values: [] };
    if (!/[\r\n\0]/.test(y)) S.values.push(y);
    r.set(b, S);
  }
  let filtered = (n.removeHeaders ?? []).filter((h) => !BC.has(Am(h)));
  pc(e, [...filtered, ...r.keys()]);
  for (let { name: h, values: values } of r.values())
    if (values.length > 0) e[h] = values.length === 1 ? values[0] : values;
}
/**
 * invokeRequestFilterOnResponse：调用 request-filter 插件的 onResponse 回调（参数拷贝），同步或异步异常都只记日志。
 */
//@ chunk-fq0cr76a.js:661753-661941 esm-fingerprint
function invokeRequestFilterOnResponse(e, n, r) {
  if (!e?.onResponse) return;
  let s = {};
  for (let [h, y] of Object.entries(r)) s[h] = Array.isArray(y) ? [...y] : y;
  try {
    let onResponse = e.onResponse(n, s);
    if (isThenable(onResponse)) onResponse.then(void 0, logRequestFilterError);
  } catch (error) {
    logRequestFilterError(error);
  }
}
//@ chunk-fq0cr76a.js:661941-662021 esm-fingerprint
function isThenable(e) {
  return typeof e === "object" && e !== null && typeof e.then === "function";
}
//@ chunk-fq0cr76a.js:662021-662119 esm-fingerprint
function logRequestFilterError(e) {
  At(`[request-filter] onResponse failed: ${e?.message ?? String(e)}`, { level: "error" });
}
//@ chunk-fq0cr76a.js:662119-662228 esm-fingerprint
function Pf(e) {
  let n = [];
  for (let r = 0; r + 1 < e.length; r += 2) if (e[r].toLowerCase() === "host") n.push(e[r + 1]);
  return n;
}
//@ chunk-fq0cr76a.js:662228-662615 esm-fingerprint
function Om(e, n, r, s) {
  let lower = r.hostname.toLowerCase();
  if (n !== void 0 && n.toLowerCase() !== lower) return "TLS server name does not match the request target";
  if (s !== void 0 && !FC(s, lower, r)) return "request-target authority does not match the request target";
  if (e.length === 0) return;
  if (e.length > 1) return "more than one Host header";
  if (!FC(e[0], lower, r)) return "Host header does not match the request target";
  return;
}
//@ chunk-fq0cr76a.js:662615-662761 esm-fingerprint
function FC(e, n, r) {
  let s = C5(e);
  if (s === void 0 || s.host.toLowerCase() !== n) return !1;
  return s.port === "" ? r.port === r.defaultPort : s.port === String(r.port);
}
//@ chunk-fq0cr76a.js:662761-663103 esm-fingerprint
function C5(e) {
  let n = e,
    r = "";
  if (e.startsWith("[")) {
    let index = e.indexOf("]");
    if (index < 0) return;
    if (((n = e.slice(1, index)), (r = e.slice(index + 1)), isIP_2(n) !== 6)) return;
  } else {
    let index = e.indexOf(":");
    if (index >= 0) ((n = e.slice(0, index)), (r = e.slice(index)));
    if (/[[\]]/.test(n)) return;
  }
  if (r === "") return { host: n, port: "" };
  let sliced = r.slice(1);
  if (r[0] !== ":" || sliced === "" || /[[\]:]/.test(sliced)) return;
  return { host: n, port: sliced };
}
//@ chunk-fq0cr76a.js:663103-663139 esm-fingerprint
var BLOCKED_BY_SANDBOX_RUNTIME = "blocked-by-sandbox-runtime";
//@ chunk-fq0cr76a.js:663139-663218 esm-fingerprint
function bE(e) {
  return typeof e === "string" ? ["X-Proxy-Error", e] : [e.name, e.value];
}
//@ chunk-fq0cr76a.js:663218-663377 esm-fingerprint
function Pm(e, n = BLOCKED_BY_SANDBOX_RUNTIME, r = "Forbidden") {
  let [s, h] = bE(n);
  return (
    `HTTP/1.1 403 ${vm(String(r)).replace(/[^ -~]/gu, "?")}\r
Content-Type: text/plain\r
${s}: ${h}\r
\r
` + e
  );
}
//@ chunk-fq0cr76a.js:663377-663572 esm-fingerprint
function Ks(e, n, r = BLOCKED_BY_SANDBOX_RUNTIME, s = 403) {
  if ((At(`[proxy] deny: ${n}`), e.headersSent || e.destroyed)) {
    e.destroy();
    return;
  }
  let [h, y] = bE(r);
  (e.writeHead(s, { "Content-Type": "text/plain", [h]: y }),
    e.end(
      Buffer.from(
        n +
          `
`,
      ),
    ));
}
//@ chunk-fq0cr76a.js:663572-663779 esm-fingerprint
function Lf(e, n, r) {
  if (ol(n)) Ks(e, n.message, r !== void 0 ? { name: r, value: "address_not_allowed" } : void 0);
  else if (!e.headersSent) (e.writeHead(502, { "Content-Type": "text/plain" }), e.end("Bad Gateway"));
  else e.destroy();
}
//@ chunk-fq0cr76a.js:663779-663954 esm-fingerprint
function R5(e) {
  let headers = new Headers();
  for (let [r, s] of Object.entries(e.headers)) {
    if (s === void 0) continue;
    if (Array.isArray(s)) for (let h of s) headers.append(r, h);
    else headers.append(r, s);
  }
  return headers;
}

export { gE, VC, Lf, Rm, km, Nm, Pf, Ks, Om, Cm, Dm, invokeRequestFilterOnResponse, pc, Pm };
