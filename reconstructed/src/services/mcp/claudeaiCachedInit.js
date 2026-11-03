/**
 * services/mcp/claudeaiCachedInit.ts
 *
 * 2.1.316 新增：claude.ai MCP 缓存的 initialize/discover 结果，本地应答握手。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8t8n4kdh.js (10)
 * attribution: placement 10
 */
import { NSn, discoverProjectionPrior } from "./mcpClientCapabilities.js";
import {
  extend_7,
  P_t,
  extend_10,
  aYn,
} from "../../../vendor/@modelcontextprotocol/core/dist/auth-CUe6YdwF.mjs";
import { logForDebugging } from "../../utils/debug.js";
import { HPe, MCP_PROTOCOL_NEXT } from "./mcpCallConstants.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { kt, T, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { fZ, VNr } from "../../../vendor/@modelcontextprotocol/client/dist/src-D_zzAWoS.mjs";

/**
 * isStatelessClaudeAiProxy：claudeai-proxy 配置 stateless=true 且开关打开。
 */
//@ chunk-8t8n4kdh.js:43097-43170 placement
function isStatelessClaudeAiProxy(e) {
  return e.type === "claudeai-proxy" && e.stateless === !0 && NSn();
}
/**
 * getCachedInitializeResult：stateless 代理的 cached_init_response 校验（InitializeResult、协议版本受支持），否则真实 initialize。
 */
//@ chunk-8t8n4kdh.js:43170-43679 placement
function getCachedInitializeResult(e) {
  if (!isStatelessClaudeAiProxy(e) || e.type !== "claudeai-proxy") return;
  if (e.cachedInitResponse == null) return;
  let safeParse = extend_7.safeParse(e.cachedInitResponse);
  if (!safeParse.success) {
    logForDebugging(
      `[claudeai-mcp] cached_init_response for ${e.id} failed InitializeResult validation \u2014 falling back to real initialize`,
    );
    return;
  }
  if (!P_t.includes(safeParse.data.protocolVersion)) {
    logForDebugging(
      `[claudeai-mcp] cached_init_response for ${e.id} carries unsupported protocolVersion ${HPe(safeParse.data.protocolVersion)} \u2014 falling back to real initialize`,
    );
    return;
  }
  return safeParse.data;
}
//@ chunk-8t8n4kdh.js:43679-43743 placement
var Za = DoctorLazy(() => kt({ cacheScope: T("public"), ttlMs: E().positive() }));
/**
 * getCachedDiscoverResult：cached_discover_response 校验（DiscoverResult、含 2026-07-28、cacheScope public 且 ttlMs>0）。
 */
//@ chunk-8t8n4kdh.js:43743-44498 placement
function getCachedDiscoverResult(e) {
  if (e.cachedDiscoverResponse == null) return;
  let safeParse = extend_10.safeParse(e.cachedDiscoverResponse);
  if (!safeParse.success) {
    logForDebugging(
      `[claudeai-mcp] cached_discover_response for ${e.id} failed DiscoverResult validation \u2014 ignoring it and connecting as if no discover body had been projected`,
    );
    return;
  }
  if (!safeParse.data.supportedVersions.includes(MCP_PROTOCOL_NEXT)) {
    logForDebugging(
      `[claudeai-mcp] cached_discover_response for ${e.id} does not list protocol version ${MCP_PROTOCOL_NEXT} \u2014 ignoring it and connecting as if no discover body had been projected`,
    );
    return;
  }
  if (!Za().safeParse(e.cachedDiscoverResponse).success) {
    logForDebugging(
      `[claudeai-mcp] cached_discover_response for ${e.id} is not declared publicly cacheable \u2014 ignoring it and connecting as if no discover body had been projected`,
    );
    return;
  }
  return safeParse.data;
}
/**
 * getLocalDiscoverAnswer：stateless 代理 discoverSupport=legacy → 本地回 method-not-found；supported 且开关为 all → 本地回缓存的 DiscoverResult。
 */
//@ chunk-8t8n4kdh.js:44498-44747 placement
function getLocalDiscoverAnswer(e) {
  if (!isStatelessClaudeAiProxy(e) || e.type !== "claudeai-proxy") return;
  let n = discoverProjectionPrior();
  if (n === "off") return;
  if (e.discoverSupport === "legacy") return "method-not-found";
  if (e.discoverSupport !== "supported" || n !== "all") return;
  let r = getCachedDiscoverResult(e);
  return r === void 0 ? void 0 : { result: r };
}
/**
 * answerHandshakeLocally：包装 transport.send，在本地应答 server/discover（结果或 -32601）与 initialize（缓存结果），吞掉 notifications/initialized，不发到线上。
 */
//@ chunk-8t8n4kdh.js:44747-45268 placement
function answerHandshakeLocally(transport, cachedInitialize, discoverAnswer) {
  let s = transport.send.bind(transport);
  transport.send = async (h, y) => {
    if (
      fZ(h) &&
      h.method === "server/discover" &&
      (discoverAnswer !== void 0 || cachedInitialize !== void 0)
    ) {
      let S =
        discoverAnswer !== void 0 && discoverAnswer !== "method-not-found"
          ? { jsonrpc: "2.0", id: h.id, result: discoverAnswer.result }
          : { jsonrpc: "2.0", id: h.id, error: { code: aYn, message: "Method not found" } };
      queueMicrotask(() => transport.onmessage?.(S));
      return;
    }
    if (cachedInitialize !== void 0 && fZ(h) && h.method === "initialize") {
      let S = { jsonrpc: "2.0", id: h.id, result: cachedInitialize };
      queueMicrotask(() => transport.onmessage?.(S));
      return;
    }
    if (VNr(h) && h.method === "notifications/initialized") return;
    return s(h, y);
  };
}
/**
 * answerGetStreamLocally：GET 通知流请求本地回 405（stateless 或禁用 GET 流的连接器）。
 */
//@ chunk-8t8n4kdh.js:45268-45557 placement
function answerGetStreamLocally(e, n) {
  let href = new URL(n).href;
  return async (s, h) => {
    if ((h?.method ?? "GET").toUpperCase() !== "GET") return e(s, h);
    let y = typeof s === "object" && s !== null && "url" in s ? s.url : String(s);
    if (new URL(y).href === href)
      return new Response(null, { status: 405, statusText: "Method Not Allowed" });
    return e(s, h);
  };
}
//@ chunk-8t8n4kdh.js:45557-45629 placement
function incrementCallsInProgress(e) {
  if (e !== void 0) e.callsInProgress = (e.callsInProgress ?? 0) + 1;
}
//@ chunk-8t8n4kdh.js:45629-45782 placement
function decrementCallsInProgress(e) {
  if (e === void 0) return;
  if (((e.callsInProgress = (e.callsInProgress ?? 1) - 1), e.callsInProgress === 0)) {
    let onCallsIdle = e.onCallsIdle;
    ((e.onCallsIdle = void 0), onCallsIdle?.());
  }
}
//@ chunk-8t8n4kdh.js:45782-45856 placement
function trackCallInProgress(e) {
  incrementCallsInProgress(e);
  let n = !0;
  return {
    [Symbol.dispose]() {
      if (n) ((n = !1), decrementCallsInProgress(e));
    },
  };
}

export {
  getCachedDiscoverResult,
  isStatelessClaudeAiProxy,
  answerGetStreamLocally,
  getCachedInitializeResult,
  getLocalDiscoverAnswer,
  answerHandshakeLocally,
  trackCallInProgress,
  incrementCallsInProgress,
  decrementCallsInProgress,
};
