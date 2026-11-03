/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/emitted-connection.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (13)
 * attribution: esm-fingerprint 9, esm-layout 4
 */
import { createServer, createServer as createServer_2, createServer as createServer_3 } from "http";

//@ chunk-fq0cr76a.js:643133-643180 esm-fingerprint
function Bh() {
  return typeof globalThis.Bun < "u";
}
//@ chunk-fq0cr76a.js:643180-643187 esm-layout
var r3;
//@ chunk-fq0cr76a.js:643187-643251 esm-fingerprint
function s3() {
  return r3?.() ?? createServer_2().listenerCount("connection") > 0;
}
//@ chunk-fq0cr76a.js:643251-643283 esm-layout
function i3() {
  return "Bun 1.4.4";
}
//@ chunk-fq0cr76a.js:643283-643390 esm-fingerprint
function Uh() {
  if (s3()) return;
  throw Error(`tlsTerminate needs Node, or Bun 1.4 or later (this is ${i3()})`);
}
//@ chunk-fq0cr76a.js:643390-644021 esm-fingerprint
function Qw(e) {
  let parser = e.parser;
  if (typeof parser !== "object" || parser === null) return;
  let r = parser,
    s = parser.constructor;
  if (
    typeof s.kOnHeaders !== "number" ||
    typeof s.kOnHeadersComplete !== "number" ||
    typeof s.kOnMessageComplete !== "number"
  )
    return;
  let {
      kOnHeaders: kOnHeaders,
      kOnHeadersComplete: kOnHeadersComplete,
      kOnMessageComplete: kOnMessageComplete,
    } = s,
    S = r[kOnHeadersComplete],
    w = r[kOnMessageComplete];
  if (typeof r[kOnHeaders] === "function" || typeof S !== "function" || typeof w !== "function") return;
  let R = [],
    D = "";
  ((r[kOnHeaders] = (O, L) => {
    ((R = R.concat(O)), (D += L));
  }),
    (r[kOnHeadersComplete] = function (...O) {
      if (R.length > 0 || D !== "")
        ((O[2] = Array.isArray(O[2]) ? R.concat(O[2]) : R),
          (O[4] = D + (typeof O[4] === "string" ? O[4] : "")),
          (R = []),
          (D = ""));
      return S.apply(this, O);
    }),
    (r[kOnMessageComplete] = function (...O) {
      return ((R = []), (D = ""), w.apply(this, O));
    }));
}
//@ chunk-fq0cr76a.js:644021-644075 esm-fingerprint
function eT(e) {
  if (Bh()) e.setDefaultEncoding("latin1");
}
//@ chunk-fq0cr76a.js:644075-644129 esm-fingerprint
function tT(e) {
  return { limit: e, used: 0, waiters: new Set() };
}
//@ chunk-fq0cr76a.js:644129-644249 esm-fingerprint
function Lh(e, n) {
  if (((e.used += n), n >= 0 || e.waiters.size === 0)) return;
  let r = [...e.waiters];
  e.waiters.clear();
  for (let s of r) s();
}
//@ chunk-fq0cr76a.js:644249-644513 esm-fingerprint
function Fh(e, n, r) {
  let socket = e.socket,
    h = 0,
    y = () => {
      let readableLength = e.readableLength;
      if (r) Lh(r, readableLength - h);
      if (
        ((h = readableLength), readableLength > n || (r !== void 0 && r.used > r.limit && readableLength > 0))
      )
        socket.pause();
    },
    b = () => {
      if ((socket.off("data", y), socket.off("close", b), r)) Lh(r, -h);
      h = 0;
    };
  (socket.on("data", y), e.once("end", b), e.once("close", b), socket.once("close", b));
}
//@ chunk-fq0cr76a.js:644513-644532 esm-layout
var weakSet = new WeakSet();
//@ chunk-fq0cr76a.js:644532-644557 esm-layout
function rT(e) {
  weakSet.add(e);
}
/**
 * 启动 GrowthBook 周期刷新，退出时清理。
 */
//@ chunk-fq0cr76a.js:644557-644729 esm-fingerprint
function tu(e) {
  let socket = e.socket;
  if (!weakSet.has(socket) || socket.destroyed) {
    e.destroy();
    return;
  }
  socket.end();
  let r = setTimeout(() => e.destroy(), 1000);
  (r.unref?.(), socket.once("close", () => clearTimeout(r)));
}

export { tu, Bh, Fh, rT, eT, Qw, Lh, Uh, tT };
