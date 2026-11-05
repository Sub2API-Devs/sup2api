/**
 * services/mcp/claudeaiCachedInit.ts
 *
 * 2.1.316 新增：claude.ai MCP 缓存的 initialize/discover 结果，本地应答握手。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-sywnjtqb.js (10)
 * attribution: placement 10
 */
import { isStatelessSkipInitEnabled, discoverProjectionPrior } from "./mcpClientCapabilities.js";
import {
  InitializeResultSchema,
  DiscoverResultSchema,
} from "../../../vendor/@modelcontextprotocol/core/dist/auth-CUe6YdwF.mjs";
import { logForDebugging } from "../../utils/debug.js";
import {
  SUPPORTED_PROTOCOL_VERSIONS as SUPPORTED_PROTOCOL_VERSIONS_2,
  PARSE_ERROR,
} from "../../../vendor/@modelcontextprotocol/core/dist/schemas-lGLjBX8n.cjs";
import { sanitizeCallMark, MCP_PROTOCOL_NEXT } from "./mcpCallConstants.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { looseObject, literal, numberSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  isJSONRPCRequest,
  isJSONRPCNotification,
} from "../../../vendor/@modelcontextprotocol/client/dist/src-D_zzAWoS.mjs";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-sywnjtqb.js:43115-43188 placement
/**
 * isStatelessClaudeAiProxy：claudeai-proxy 配置 stateless=true 且开关打开。
 */
function isStatelessClaudeAiProxy_2(serverRef) {
  return serverRef.type === "claudeai-proxy" && serverRef.stateless === true && isStatelessSkipInitEnabled();
}
//@ chunk-sywnjtqb.js:43188-43697 placement
/**
 * getCachedInitializeResult：stateless 代理的 cached_init_response 校验（InitializeResult、协议版本受支持），否则真实 initialize。
 */
function getCachedInitializeResult_2(serverRef) {
  if (!isStatelessClaudeAiProxy_2(serverRef) || serverRef.type !== "claudeai-proxy") return;
  if (serverRef.cachedInitResponse == null) return;
  let parsed = InitializeResultSchema.safeParse(serverRef.cachedInitResponse);
  if (!parsed.success) {
    logForDebugging(
      `[claudeai-mcp] cached_init_response for ${serverRef.id} failed InitializeResult validation \u2014 falling back to real initialize`,
    );
    return;
  }
  if (!SUPPORTED_PROTOCOL_VERSIONS_2.includes(parsed.data.protocolVersion)) {
    logForDebugging(
      `[claudeai-mcp] cached_init_response for ${serverRef.id} carries unsupported protocolVersion ${sanitizeCallMark(parsed.data.protocolVersion)} \u2014 falling back to real initialize`,
    );
    return;
  }
  return parsed.data;
}
//@ chunk-sywnjtqb.js:43697-43761 placement
/**
 * 缓存的 discover 结果 schema（cacheScope=public、ttlMs 为正）。
 */
var cachedDiscoverResponseSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-sywnjtqb.js:43697", () => {
  cachedDiscoverResponseSchema = DoctorLazy(() =>
    looseObject({
      cacheScope: literal("public"),
      ttlMs: numberSchema().positive(),
    }),
  );
});
//@ chunk-sywnjtqb.js:43761-44516 placement
/**
 * getCachedDiscoverResult：cached_discover_response 校验（DiscoverResult、含 2026-07-28、cacheScope public 且 ttlMs>0）。
 */
function getCachedDiscoverResult(serverRef) {
  if (serverRef.cachedDiscoverResponse == null) return;
  let parsed = DiscoverResultSchema.safeParse(serverRef.cachedDiscoverResponse);
  if (!parsed.success) {
    logForDebugging(
      `[claudeai-mcp] cached_discover_response for ${serverRef.id} failed DiscoverResult validation \u2014 ignoring it and connecting as if no discover body had been projected`,
    );
    return;
  }
  if (!parsed.data.supportedVersions.includes(MCP_PROTOCOL_NEXT)) {
    logForDebugging(
      `[claudeai-mcp] cached_discover_response for ${serverRef.id} does not list protocol version ${MCP_PROTOCOL_NEXT} \u2014 ignoring it and connecting as if no discover body had been projected`,
    );
    return;
  }
  if (!cachedDiscoverResponseSchema().safeParse(serverRef.cachedDiscoverResponse).success) {
    logForDebugging(
      `[claudeai-mcp] cached_discover_response for ${serverRef.id} is not declared publicly cacheable \u2014 ignoring it and connecting as if no discover body had been projected`,
    );
    return;
  }
  return parsed.data;
}
//@ chunk-sywnjtqb.js:44516-44765 placement
/**
 * getLocalDiscoverAnswer：stateless 代理 discoverSupport=legacy → 本地回 method-not-found；supported 且开关为 all → 本地回缓存的 DiscoverResult。
 */
function getLocalDiscoverAnswer(serverRef) {
  if (!isStatelessClaudeAiProxy_2(serverRef) || serverRef.type !== "claudeai-proxy") return;
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
//@ chunk-sywnjtqb.js:44765-45288 placement
/**
 * answerHandshakeLocally：包装 transport.send，在本地应答 server/discover（结果或 -32601）与 initialize（缓存结果），吞掉 notifications/initialized，不发到线上。
 */
function answerHandshakeLocally_2(transport, cachedInitialize, discoverAnswer) {
  let sendBase = transport.send.bind(transport);
  transport.send = async (message, options) => {
    if (
      isJSONRPCRequest(message) &&
      message.method === "server/discover" &&
      (discoverAnswer !== undefined || cachedInitialize !== undefined)
    ) {
      let discoverReply =
        discoverAnswer !== undefined && discoverAnswer !== "method-not-found"
          ? {
              jsonrpc: "2.0",
              id: message.id,
              result: discoverAnswer.result,
            }
          : {
              jsonrpc: "2.0",
              id: message.id,
              error: {
                code: PARSE_ERROR,
                message: "Method not found",
              },
            };
      queueMicrotask(() => transport.onmessage?.(discoverReply));
      return;
    }
    if (cachedInitialize !== undefined && isJSONRPCRequest(message) && message.method === "initialize") {
      let initializeReply = {
        jsonrpc: "2.0",
        id: message.id,
        result: cachedInitialize,
      };
      queueMicrotask(() => transport.onmessage?.(initializeReply));
      return;
    }
    if (isJSONRPCNotification(message) && message.method === "notifications/initialized") return;
    return sendBase(message, options);
  };
}
//@ chunk-sywnjtqb.js:45288-45577 placement
/**
 * answerGetStreamLocally：GET 通知流请求本地回 405（stateless 或禁用 GET 流的连接器）。
 */
function answerGetStreamLocally_2(originalFetch, url) {
  let href = new URL(url).href;
  return async (input, init) => {
    if ((init?.method ?? "GET").toUpperCase() !== "GET") return originalFetch(input, init);
    let requestHref =
      typeof input === "object" && input !== null && "url" in input ? input.url : String(input);
    if (new URL(requestHref).href === href)
      return new Response(null, {
        status: 405,
        statusText: "Method Not Allowed",
      });
    return originalFetch(input, init);
  };
}
//@ chunk-sywnjtqb.js:45577-45649 placement
function incrementCallsInProgress(transportErrorState) {
  if (transportErrorState !== undefined)
    transportErrorState.callsInProgress = (transportErrorState.callsInProgress ?? 0) + 1;
}
//@ chunk-sywnjtqb.js:45649-45802 placement
function decrementCallsInProgress(transportErrorState) {
  if (transportErrorState === undefined) return;
  transportErrorState.callsInProgress = (transportErrorState.callsInProgress ?? 1) - 1;
  if (transportErrorState.callsInProgress === 0) {
    let onCallsIdle = transportErrorState.onCallsIdle;
    transportErrorState.onCallsIdle = undefined;
    onCallsIdle?.();
  }
}
//@ chunk-sywnjtqb.js:45802-45876 placement
function trackCallInProgress(transportErrorState) {
  incrementCallsInProgress(transportErrorState);
  let isTracked = true;
  return {
    [Symbol.dispose]() {
      if (isTracked) {
        isTracked = false;
        decrementCallsInProgress(transportErrorState);
      }
    },
  };
}
export {
  getCachedDiscoverResult,
  isStatelessClaudeAiProxy_2,
  answerGetStreamLocally_2,
  getCachedInitializeResult_2,
  getLocalDiscoverAnswer,
  answerHandshakeLocally_2,
  trackCallInProgress,
  incrementCallsInProgress,
  decrementCallsInProgress,
};
