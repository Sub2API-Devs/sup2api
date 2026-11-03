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
import { isStatelessSkipInitEnabled, discoverProjectionPrior } from "./mcpClientCapabilities.js";
import {
  InitializeResultSchema,
  SUPPORTED_PROTOCOL_VERSIONS as SUPPORTED_PROTOCOL_VERSIONS_2,
  DiscoverResultSchema,
  PARSE_ERROR,
} from "../../../vendor/@modelcontextprotocol/core/dist/auth-CUe6YdwF.mjs";
import { logForDebugging } from "../../utils/debug.js";
import { sanitizeCallMark, MCP_PROTOCOL_NEXT } from "./mcpCallConstants.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { looseObject, literal, E } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  isJSONRPCRequest,
  isJSONRPCNotification,
} from "../../../vendor/@modelcontextprotocol/client/dist/src-D_zzAWoS.mjs";

//@ chunk-8t8n4kdh.js:43097-43170 placement
/**
 * isStatelessClaudeAiProxy：claudeai-proxy 配置 stateless=true 且开关打开。
 */
function isStatelessClaudeAiProxy(serverRef) {
  return serverRef.type === "claudeai-proxy" && serverRef.stateless === true && isStatelessSkipInitEnabled();
}
//@ chunk-8t8n4kdh.js:43170-43679 placement
/**
 * getCachedInitializeResult：stateless 代理的 cached_init_response 校验（InitializeResult、协议版本受支持），否则真实 initialize。
 */
function getCachedInitializeResult(serverRef) {
  if (!isStatelessClaudeAiProxy(serverRef) || serverRef.type !== "claudeai-proxy") return;
  if (serverRef.cachedInitResponse == null) return;
  let n = InitializeResultSchema.safeParse(serverRef.cachedInitResponse);
  if (!n.success) {
    logForDebugging(
      `[claudeai-mcp] cached_init_response for ${serverRef.id} failed InitializeResult validation \u2014 falling back to real initialize`,
    );
    return;
  }
  if (!SUPPORTED_PROTOCOL_VERSIONS_2.includes(n.data.protocolVersion)) {
    logForDebugging(
      `[claudeai-mcp] cached_init_response for ${serverRef.id} carries unsupported protocolVersion ${sanitizeCallMark(n.data.protocolVersion)} \u2014 falling back to real initialize`,
    );
    return;
  }
  return n.data;
}
//@ chunk-8t8n4kdh.js:43679-43743 placement
/**
 * 缓存的 discover 结果 schema（cacheScope=public、ttlMs 为正）。
 */
var cachedDiscoverResponseSchema = DoctorLazy(() =>
  looseObject({
    cacheScope: literal("public"),
    ttlMs: E().positive(),
  }),
);
//@ chunk-8t8n4kdh.js:43743-44498 placement
/**
 * getCachedDiscoverResult：cached_discover_response 校验（DiscoverResult、含 2026-07-28、cacheScope public 且 ttlMs>0）。
 */
function getCachedDiscoverResult(e) {
  if (e.cachedDiscoverResponse == null) return;
  let n = DiscoverResultSchema.safeParse(e.cachedDiscoverResponse);
  if (!n.success) {
    logForDebugging(
      `[claudeai-mcp] cached_discover_response for ${e.id} failed DiscoverResult validation \u2014 ignoring it and connecting as if no discover body had been projected`,
    );
    return;
  }
  if (!n.data.supportedVersions.includes(MCP_PROTOCOL_NEXT)) {
    logForDebugging(
      `[claudeai-mcp] cached_discover_response for ${e.id} does not list protocol version ${MCP_PROTOCOL_NEXT} \u2014 ignoring it and connecting as if no discover body had been projected`,
    );
    return;
  }
  if (!cachedDiscoverResponseSchema().safeParse(e.cachedDiscoverResponse).success) {
    logForDebugging(
      `[claudeai-mcp] cached_discover_response for ${e.id} is not declared publicly cacheable \u2014 ignoring it and connecting as if no discover body had been projected`,
    );
    return;
  }
  return n.data;
}
//@ chunk-8t8n4kdh.js:44498-44747 placement
/**
 * getLocalDiscoverAnswer：stateless 代理 discoverSupport=legacy → 本地回 method-not-found；supported 且开关为 all → 本地回缓存的 DiscoverResult。
 */
function getLocalDiscoverAnswer(serverRef) {
  if (!isStatelessClaudeAiProxy(serverRef) || serverRef.type !== "claudeai-proxy") return;
  let projectionPrior = discoverProjectionPrior();
  if (projectionPrior === "off") return;
  if (serverRef.discoverSupport === "legacy") return "method-not-found";
  if (serverRef.discoverSupport !== "supported" || projectionPrior !== "all") return;
  let cachedDiscoverResult = getCachedDiscoverResult(serverRef);
  return cachedDiscoverResult === undefined
    ? undefined
    : {
        result: cachedDiscoverResult,
      };
}
//@ chunk-8t8n4kdh.js:44747-45268 placement
/**
 * answerHandshakeLocally：包装 transport.send，在本地应答 server/discover（结果或 -32601）与 initialize（缓存结果），吞掉 notifications/initialized，不发到线上。
 */
function answerHandshakeLocally(transport, cachedInitialize, discoverAnswer) {
  let s = transport.send.bind(transport);
  transport.send = async (h, y) => {
    if (
      isJSONRPCRequest(h) &&
      h.method === "server/discover" &&
      (discoverAnswer !== undefined || cachedInitialize !== undefined)
    ) {
      let S =
        discoverAnswer !== undefined && discoverAnswer !== "method-not-found"
          ? {
              jsonrpc: "2.0",
              id: h.id,
              result: discoverAnswer.result,
            }
          : {
              jsonrpc: "2.0",
              id: h.id,
              error: {
                code: PARSE_ERROR,
                message: "Method not found",
              },
            };
      queueMicrotask(() => transport.onmessage?.(S));
      return;
    }
    if (cachedInitialize !== undefined && isJSONRPCRequest(h) && h.method === "initialize") {
      let S = {
        jsonrpc: "2.0",
        id: h.id,
        result: cachedInitialize,
      };
      queueMicrotask(() => transport.onmessage?.(S));
      return;
    }
    if (isJSONRPCNotification(h) && h.method === "notifications/initialized") return;
    return s(h, y);
  };
}
//@ chunk-8t8n4kdh.js:45268-45557 placement
/**
 * answerGetStreamLocally：GET 通知流请求本地回 405（stateless 或禁用 GET 流的连接器）。
 */
function answerGetStreamLocally(e, n) {
  let href = new URL(n).href;
  return async (s, h) => {
    if ((h?.method ?? "GET").toUpperCase() !== "GET") return e(s, h);
    let y = typeof s === "object" && s !== null && "url" in s ? s.url : String(s);
    if (new URL(y).href === href)
      return new Response(null, {
        status: 405,
        statusText: "Method Not Allowed",
      });
    return e(s, h);
  };
}
//@ chunk-8t8n4kdh.js:45557-45629 placement
function incrementCallsInProgress(e) {
  if (e !== undefined) e.callsInProgress = (e.callsInProgress ?? 0) + 1;
}
//@ chunk-8t8n4kdh.js:45629-45782 placement
function decrementCallsInProgress(e) {
  if (e === undefined) return;
  e.callsInProgress = (e.callsInProgress ?? 1) - 1;
  if (e.callsInProgress === 0) {
    let onCallsIdle = e.onCallsIdle;
    e.onCallsIdle = undefined;
    onCallsIdle?.();
  }
}
//@ chunk-8t8n4kdh.js:45782-45856 placement
function trackCallInProgress(transportErrorState) {
  incrementCallsInProgress(transportErrorState);
  let n = true;
  return {
    [Symbol.dispose]() {
      if (n) {
        n = false;
        decrementCallsInProgress(transportErrorState);
      }
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
