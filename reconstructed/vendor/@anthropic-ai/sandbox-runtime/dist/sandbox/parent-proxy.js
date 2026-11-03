/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/parent-proxy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-078pp0rm.js (19)
 * attribution: esm-fingerprint 18, esm-layout 1
 */
import { URL as x } from "url";
import { BlockList, BlockList as BlockList_2, isIP, isIP as isIP_2, isIP as isIP_3, connect } from "net";
import { connect as connect_2 } from "tls";
import { At } from "../utils/debug.js";
import { Pqt, M3r, CTt, m } from "./address.js";

//@ chunk-078pp0rm.js:2133-2291 esm-fingerprint
var I = 30000,
  B = new Set([
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "proxy-connection",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
  ]);
//@ chunk-078pp0rm.js:2291-2891 esm-fingerprint
function p8o(e) {
  let t = e?.http ?? process.env.HTTP_PROXY ?? process.env.http_proxy ?? void 0,
    r = e?.https ?? process.env.HTTPS_PROXY ?? process.env.https_proxy ?? t,
    n = e?.noProxy ?? process.env.NO_PROXY ?? process.env.no_proxy ?? "";
  if (!t && !r) return;
  let o = (s) => {
      if (!s) return;
      let f = /^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `http://${s}`;
      try {
        let l = new x(f);
        if ((l.protocol !== "http:" && l.protocol !== "https:") || !l.hostname)
          throw Error("unsupported scheme or empty host");
        return l;
      } catch {
        At(`Invalid parent proxy URL, ignoring: ${R(s)}`, { level: "error" });
        return;
      }
    },
    i = o(t),
    c = o(r);
  if (!i && !c) return;
  return { httpUrl: i, httpsUrl: c, noProxy: _(n) };
}
//@ chunk-078pp0rm.js:2891-3321 esm-fingerprint
function _(e) {
  let t = { all: !1, suffixes: [], cidr: new BlockList() };
  for (let r of e.split(",")) {
    if (((r = r.trim()), !r)) continue;
    if (r === "*") {
      t.all = !0;
      continue;
    }
    if (r.includes("/")) {
      Pqt(t.cidr, r);
      continue;
    }
    let lower = r.toLowerCase(),
      match = /^\[([^\]]+)\](?::\d+)?$/.exec(lower);
    if (match) lower = match[1];
    if (lower.startsWith("*.")) lower = lower.slice(1);
    if (!isIP_2(lower)) {
      let index = lower.lastIndexOf(":");
      if (index !== -1 && /^\d+$/.test(lower.slice(index + 1))) lower = lower.slice(0, index);
    } else if (Pqt(t.cidr, lower)) continue;
    t.suffixes.push(lower);
  }
  return t;
}
//@ chunk-078pp0rm.js:3321-3627 esm-fingerprint
function rsr(e, t) {
  let r = W$e(t.toLowerCase().replace(/\.$/, ""));
  if (r === "localhost" || M3r(r)) return !0;
  if (e.noProxy.all) return !0;
  if (CTt(e.noProxy.cidr, r)) return !0;
  for (let suffixe of e.noProxy.suffixes)
    if (suffixe.startsWith(".")) {
      if (r === suffixe.slice(1) || r.endsWith(suffixe)) return !0;
    } else if (r === suffixe || r.endsWith("." + suffixe)) return !0;
  return !1;
}
//@ chunk-078pp0rm.js:3627-3704 esm-fingerprint
function osr(e, t) {
  if (t.isHttps) return e.httpsUrl ?? e.httpUrl;
  return e.httpUrl;
}
//@ chunk-078pp0rm.js:3704-4882 esm-fingerprint
function m8o(e) {
  let { destHost: destHost, destPort: destPort } = e,
    n = W$e(destHost);
  if (!Twn(n))
    return Promise.reject(Error(`Invalid destination host for CONNECT: ${JSON.stringify(destHost)}`));
  if (!Number.isInteger(destPort) || destPort < 1 || destPort > 65535)
    return Promise.reject(Error(`Invalid destination port: ${destPort}`));
  let o = isIP_2(n) === 6 ? `[${n}]:${destPort}` : `${n}:${destPort}`;
  return new Promise((i, c) => {
    let dial = e.dial(),
      a = !1,
      f = (d) => {
        if (a) return;
        ((a = !0), dial.destroy(), c(d));
      },
      l = () => f(Error("Proxy closed during CONNECT handshake"));
    (dial.setTimeout(e.timeoutMs ?? I, () => f(Error("CONNECT handshake timed out"))),
      dial.once("error", f),
      dial.once("close", l),
      dial.once(e.readyEvent, () => {
        dial.write(
          `CONNECT ${o} HTTP/1.1\r
Host: ${o}\r
` +
            (e.authHeader
              ? `Proxy-Authorization: ${e.authHeader}\r
`
              : "") +
            `\r
`,
        );
        let d = "",
          w = (L) => {
            d += L.toString("latin1");
            let index = d.indexOf(`\r
\r
`);
            if (index === -1) {
              if (d.length > 16384) f(Error("CONNECT response header too large"));
              return;
            }
            (dial.pause(), dial.removeListener("data", w));
            let sliced = d.slice(
              0,
              d.indexOf(`\r
`),
            );
            if (!/^HTTP\/1\.[01] 2\d\d(?:\s|$)/.test(sliced))
              return f(Error(`Proxy refused CONNECT: ${sliced.trim()}`));
            let sliced_2 = d.slice(index + 4);
            if (sliced_2.length) dial.unshift(Buffer.from(sliced_2, "latin1"));
            ((a = !0),
              dial.setTimeout(0),
              dial.removeListener("error", f),
              dial.removeListener("close", l),
              i(dial));
          };
        dial.on("data", w);
      }));
  });
}
//@ chunk-078pp0rm.js:4882-5153 esm-fingerprint
function D3r(e, t, r) {
  let n = W$e(e.hostname),
    o = Number(e.port) || (e.protocol === "https:" ? 443 : 80),
    i = e.protocol === "https:";
  return m8o({
    destHost: t,
    destPort: r,
    authHeader: g8o(e),
    readyEvent: i ? "secureConnect" : "connect",
    dial: () =>
      i ? connect_2({ host: n, port: o, ...(isIP_2(n) ? {} : { servername: n }) }) : connect(o, n),
  });
}
//@ chunk-078pp0rm.js:5153-5429 esm-fingerprint
function g8o(e) {
  if (!e.username && !e.password) return;
  try {
    let t = `${decodeURIComponent(e.username)}:${decodeURIComponent(e.password)}`;
    return `Basic ${Buffer.from(t).toString("base64")}`;
  } catch {
    let t = `${e.username}:${e.password}`;
    return `Basic ${Buffer.from(t).toString("base64")}`;
  }
}
//@ chunk-078pp0rm.js:5429-5821 esm-fingerprint
function kwn(e, t, r = Wot(t.headers)) {
  try {
    return (e.writeHead(t.statusCode ?? 502, r), !0);
  } catch (error) {
    if (
      (At(
        `Invalid upstream response head (status ${t.statusCode}): ${error instanceof Error ? error.message : String(error)}`,
        { level: "error" },
      ),
      t.destroy(),
      e.headersSent)
    )
      return (e.destroy(), !1);
    for (let o of e.getHeaderNames()) e.removeHeader(o);
    return (e.writeHead(502, { "Content-Type": "text/plain" }), e.end("Bad Gateway"), !1);
  }
}
//@ chunk-078pp0rm.js:5821-5992 esm-fingerprint
function L3r(e, t) {
  let r;
  (e.once("response", (n) => {
    r = n;
  }),
    e.on("error", (n) => {
      if (r?.complete) {
        At(`Upstream connection failed after a whole answer: ${n.message}`);
        return;
      }
      t(n);
    }));
}
//@ chunk-078pp0rm.js:5992-6271 esm-fingerprint
function Wot(e, { folded: t = !1 } = {}) {
  let r = (c) => {
      let lower = c.trim().toLowerCase();
      return t ? lower.replace(/[_.]/g, "-") : lower;
    },
    n = new Set(),
    connection = e.connection;
  if (connection) for (let c of String(connection).split(",")) n.add(r(c));
  let i = {};
  for (let [c, s] of Object.entries(e)) {
    let a = r(c);
    if (!B.has(a) && !n.has(a)) i[c] = s;
  }
  return i;
}
//@ chunk-078pp0rm.js:6271-6345 esm-fingerprint
function W$e(e) {
  return e.startsWith("[") && e.endsWith("]") ? e.slice(1, -1) : e;
}
//@ chunk-078pp0rm.js:6345-6487 esm-fingerprint
function h8o(e) {
  if (!e) return "-";
  if (!e.username && !e.password) return e.href;
  let t = new x(e.href);
  return ((t.username = "***"), (t.password = "***"), t.href);
}
//@ chunk-078pp0rm.js:6487-6546 esm-fingerprint
function R(e) {
  return e.replace(/\/\/[^@/]*@/, "//***:***@");
}
//@ chunk-078pp0rm.js:6546-6683 esm-fingerprint
function Twn(e) {
  if (!e || e.length > 255) return !1;
  let t = W$e(e);
  if (t.includes("%")) return !1;
  if (isIP_2(t)) return !0;
  return /^[A-Za-z0-9._-]+$/.test(t);
}
//@ chunk-078pp0rm.js:6683-6833 esm-fingerprint
function JF(e) {
  try {
    let t = W$e(e),
      r = isIP_2(t) === 6 ? `[${t}]` : t,
      n = W$e(new x(`http://${r}/`).hostname);
    return isIP_2(n) === 6 ? (m(n) ?? n) : n.replace(/\.$/, "");
  } catch {
    return;
  }
}
//@ chunk-078pp0rm.js:6833-6906 esm-layout
function RTt(e, t, r) {
  let n = isIP_2(e) === 6 ? `[${e}]` : e;
  return t === r ? n : `${n}:${t}`;
}
//@ chunk-078pp0rm.js:6906-7129 esm-fingerprint
async function H3r(e, t, r, n) {
  let o = e;
  if (r && !isIP_2(e)) {
    let i = await ssr(e, t, r);
    if (((o = i.remoteAddress ?? ""), i.destroy(), !o)) throw Error(`connect ${e}:${t}: no peer address`);
  }
  return { host: o, port: t, ...(n && !isIP_2(e) ? { servername: e } : {}), agent: !1 };
}
//@ chunk-078pp0rm.js:7129-7450 esm-fingerprint
function ssr(e, t, r, n = I) {
  return new Promise((o, i) => {
    let c = connect({ port: t, host: e, lookup: r }),
      s = !1,
      a = (f) => {
        if (s) return;
        if (((s = !0), c.setTimeout(0), f)) (c.destroy(), i(f));
        else o(c);
      };
    (c.setTimeout(n, () => a(Error("connect timed out"))),
      c.once("connect", () => a()),
      c.once("error", a),
      c.once("close", () => a(Error("socket closed before connect"))));
  });
}

export { JF, W$e, RTt, H3r, Wot, kwn, L3r, rsr, osr, m8o, D3r, ssr, g8o, Twn, p8o, h8o };
