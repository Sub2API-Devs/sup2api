/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/emitted-connection.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (13)
 * attribution: esm-fingerprint 9, esm-layout 4
 */
import { createServer as createServer_2 } from "http";

//@ chunk-fq0cr76a.js:643133-643180 esm-fingerprint
function runsOnBun() {
  return typeof globalThis.Bun !== "undefined";
}
//@ chunk-fq0cr76a.js:643180-643187 esm-layout
var probeOverride;
//@ chunk-fq0cr76a.js:643187-643251 esm-fingerprint
function servesEmittedConnections() {
  return probeOverride?.() ?? createServer_2().listenerCount("connection") > 0;
}
//@ chunk-fq0cr76a.js:643251-643283 esm-layout
function i3() {
  return "Bun 1.4.4";
}
//@ chunk-fq0cr76a.js:643283-643390 esm-fingerprint
function assertTlsTerminationSupported() {
  if (servesEmittedConnections()) return;
  throw Error(`tlsTerminate needs Node, or Bun 1.4 or later (this is ${i3()})`);
}
//@ chunk-fq0cr76a.js:643390-644021 esm-fingerprint
function keepFlushedHeaderBatches(sock) {
  let parser = sock.parser;
  if (typeof parser !== "object" || parser === null) return;
  let slots = parser;
  let s = parser.constructor;
  if (
    typeof s.kOnHeaders !== "number" ||
    typeof s.kOnHeadersComplete !== "number" ||
    typeof s.kOnMessageComplete !== "number"
  )
    return;
  let { kOnHeaders: onHeaders, kOnHeadersComplete, kOnMessageComplete } = s;
  let complete = slots[kOnHeadersComplete];
  let messageComplete = slots[kOnMessageComplete];
  if (
    typeof slots[onHeaders] === "function" ||
    typeof complete !== "function" ||
    typeof messageComplete !== "function"
  )
    return;
  let headers = [];
  let url = "";
  slots[onHeaders] = (batch, part) => {
    headers = headers.concat(batch);
    url += part;
  };
  slots[kOnHeadersComplete] = function (...args) {
    if (headers.length > 0 || url !== "") {
      args[2] = Array.isArray(args[2]) ? headers.concat(args[2]) : headers;
      args[4] = url + (typeof args[4] === "string" ? args[4] : "");
      headers = [];
      url = "";
    }
    return complete.apply(this, args);
  };
  slots[kOnMessageComplete] = function (...args) {
    headers = [];
    url = "";
    return messageComplete.apply(this, args);
  };
}
//@ chunk-fq0cr76a.js:644021-644075 esm-fingerprint
function writeHeadsAsLatin1(sock) {
  if (runsOnBun()) sock.setDefaultEncoding("latin1");
}
//@ chunk-fq0cr76a.js:644075-644129 esm-fingerprint
function createByteBudget(limit) {
  return {
    limit,
    used: 0,
    waiters: new Set(),
  };
}
//@ chunk-fq0cr76a.js:644129-644249 esm-fingerprint
function adjustByteBudget(budget, delta) {
  budget.used += delta;
  if (delta >= 0 || budget.waiters.size === 0) return;
  let woken = [...budget.waiters];
  budget.waiters.clear();
  for (let wake of woken) wake();
}
//@ chunk-fq0cr76a.js:644249-644513 esm-fingerprint
function gateSocketOnBufferedBody(req, cap, budget) {
  let socket = req.socket;
  let counted = 0;
  let check = () => {
    let held = req.readableLength;
    if (budget) adjustByteBudget(budget, held - counted);
    counted = held;
    if (held > cap || (budget !== undefined && budget.used > budget.limit && held > 0)) socket.pause();
  };
  let release = () => {
    socket.off("data", check);
    socket.off("close", release);
    if (budget) adjustByteBudget(budget, -counted);
    counted = 0;
  };
  socket.on("data", check);
  req.once("end", release);
  req.once("close", release);
  socket.once("close", release);
}
//@ chunk-fq0cr76a.js:644513-644532 esm-layout
var endsGracefully = new WeakSet();
//@ chunk-fq0cr76a.js:644532-644557 esm-layout
function rT(socket) {
  endsGracefully.add(socket);
}
//@ chunk-fq0cr76a.js:644557-644729 esm-fingerprint
/**
 * 启动 GrowthBook 周期刷新，退出时清理。
 */
function endRequestAfterResponse(req) {
  let socket = req.socket;
  if (!endsGracefully.has(socket) || socket.destroyed) {
    req.destroy();
    return;
  }
  socket.end();
  let backstop = setTimeout(() => req.destroy(), 1000);
  backstop.unref?.();
  socket.once("close", () => clearTimeout(backstop));
}
export {
  endRequestAfterResponse,
  runsOnBun,
  gateSocketOnBufferedBody,
  rT,
  writeHeadsAsLatin1,
  keepFlushedHeaderBatches,
  adjustByteBudget,
  assertTlsTerminationSupported,
  createByteBudget,
};
