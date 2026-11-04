/**
 * tools/WaitForMcpServersTool/WaitForMcpServersTool.ts
 *
 * 2.1.316 新增：等待 MCP 服务器连接完成的工具
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (11), chunk-qaeygs3y.js (2)
 * attribution: placement 13
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, array, stringSchema, booleanSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { getMcpClientsFromAccessor, getRootSession } from "../../bootstrap/state.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { createSignal } from "../../utils/signal.js";
import {
  isToolSearchEnabledOptimistic,
  modelSupportsToolReference,
  isVertexModelWithoutToolSearch,
} from "../../utils/toolSearch.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { normalizeNameForMCP } from "../../services/mcp/normalization.js";
import { internalKey } from "../../services/mcp/serverIdentity.js";
import { sleep } from "../../utils/sleep.js";
import { isUnconfiguredFailure } from "../../services/mcp/redactMcpErrors.js";
import { logForDebugging } from "../../utils/debug.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { getNeedsAuthServers } from "../../services/tools/toolErrorCodes.js";
import { isHiddenReplyServer, appToolServerUnavailableText } from "../../services/mcp/appToolServerErrors.js";
import { isArtifactMountMode } from "../../services/artifacts/artifactMount.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-qaeygs3y.js:191-218 placement
var WAITFORMCPSERVERS = "WaitForMcpServers";
//@ chunk-qaeygs3y.js:218-949 placement
/**
 * WaitForMcpServers 工具的提示词：等待仍在连接的 MCP 服务器，就绪后其工具会出现在工具列表中，无需征求用户确认。
 */
function waitForMcpServersPrompt() {
  return [
    "Wait for MCP servers that are still connecting and whose tools are not",
    "yet in your tool list. Pass `servers` to wait for specific ones, or omit",
    "it to wait for all pending servers (once none is pending, a call without",
    "`servers` reports any server that failed to connect or is not configured).",
    "",
    ...[
      "If the user's request needs tools from a still-connecting server, call this",
      "tool to wait for it. Once it connects, its tools will be added to your tool",
      "list and you can use them directly. Returns ready=true when servers are",
      "ready, ready=false if they failed to connect, need authentication, or are",
      "disabled.",
    ],
    "",
    "You do not need to ask the user for confirmation to use this tool.",
  ].join(`
`);
}
//@ chunk-e6aww6q8.js:2499615-2499917 placement
/**
 * WaitForMcpServers 工具的等待超时与输入/输出 schema（等待的服务器名单；就绪、已连接、缓存、失败、待定、需认证、禁用、未配置、未知）。
 */
var MCP_WAIT_TIMEOUT_MS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var waitForMcpInputSchema;
var waitForMcpOutputSchema;
deferInit("chunk-e6aww6q8.js:2499615", () => {
  MCP_WAIT_TIMEOUT_MS = 5000;
  waitForMcpInputSchema = DoctorLazy(() =>
    objectSchema({
      servers: array(stringSchema()).optional().describe("Server names to wait for (default: all pending)"),
    }),
  );
  waitForMcpOutputSchema = DoctorLazy(() =>
    objectSchema({
      ready: booleanSchema(),
      connected: array(stringSchema()),
      cached: array(stringSchema()).optional(),
      failed: array(stringSchema()),
      stillPending: array(stringSchema()),
      needsAuth: array(stringSchema()),
      disabled: array(stringSchema()),
      unconfigured: array(stringSchema()).optional(),
      ...{},
      unknown: array(stringSchema()),
    }),
  );
});
//@ chunk-e6aww6q8.js:2499917-2499991 placement
/**
 * 返回仍处于连接中状态的 MCP 服务器名。
 */
function pendingMcpServerNames(setDeclared) {
  return setDeclared.filter((declared) => declared.type === "pending").map((servers) => servers.name);
}
//@ chunk-e6aww6q8.js:2499991-2500036 placement
/**
 * 判断当前是否有连接中的 MCP 服务器。
 */
function hasPendingMcpClients() {
  return pendingMcpServerNames(getMcpClientsFromAccessor() ?? []).length > 0;
}
//@ chunk-e6aww6q8.js:2500036-2500084 placement
/**
 * 按宿主记录“已声明等待 MCP 服务器”的状态与变更信号。
 */
var declaredByHost; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:2500036", () => {
  declaredByHost = new HostScoped(() => ({
    declared: false,
    changed: createSignal(),
  }));
});
//@ chunk-e6aww6q8.js:2500084-2500173 placement
/**
 * 设置某宿主的已声明状态并通知变更。
 */
function setDeclaredByHost(session, declared) {
  let state = declaredByHost.of(session);
  if (state.declared === declared) return;
  state.declared = declared;
  state.changed.emit();
}
//@ chunk-e6aww6q8.js:2500173-2500205 placement
/**
 * 标记当前宿主已声明。
 */
function markDeclared() {
  setDeclaredByHost(getRootSession().host, true);
}
//@ chunk-e6aww6q8.js:2500205-2500253 placement
/**
 * 当前宿主是否已声明等待。
 */
function isDeclared() {
  return declaredByHost.of(getRootSession().host).declared;
}
//@ chunk-e6aww6q8.js:2500253-2500279 placement
/**
 * 清除某宿主的已声明状态。
 */
function clearDeclared(session) {
  setDeclaredByHost(session, false);
}
//@ chunk-e6aww6q8.js:2500279-2500340 placement
/**
 * 订阅已声明状态的变更。
 */
function onDeclaredChange(refreshOnNextMicrotask) {
  return declaredByHost.of(getRootSession().host).changed.subscribe(refreshOnNextMicrotask);
}
//@ chunk-e6aww6q8.js:2500340-2500426 placement
/**
 * 工具搜索可用（且非旧 Vertex 模型）时关闭该工具，否则有连接中的 MCP 服务器或已声明时启用。
 */
function isWaitForMcpServersEnabled(mainLoopModel, mcpClients) {
  if (
    isToolSearchEnabledOptimistic() &&
    modelSupportsToolReference(mainLoopModel) &&
    !isVertexModelWithoutToolSearch(getCanonicalName(mainLoopModel))
  )
    return false;
  return pendingMcpServerNames(mcpClients).length > 0 || isDeclared();
}
//@ chunk-e6aww6q8.js:2500426-2503901 placement
/**
 * WaitForMcpServers 工具：isEnabled=Lmr —— 工具搜索可用（Oh 且模型支持 tool_reference 且非 Vertex 旧模型）时关闭；否则有连接中的 MCP 服务器（或 ftt()）时启用，用来等待它们就绪。getTools 只在工具搜索相关条件下追加它。
 */
var WaitForMcpServersTool; // deferred: uses buildTool (../../services/tools/permissionCheckGuard.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:2500426", () => {
  WaitForMcpServersTool = buildTool({
    isEnabled() {
      return isWaitForMcpServersEnabled(getMainLoopModel(), getMcpClientsFromAccessor() ?? []);
    },
    isConcurrencySafe() {
      return false;
    },
    isReadOnly() {
      return true;
    },
    name: WAITFORMCPSERVERS,
    backgrounding: "never",
    maxResultSizeChars: 1e4,
    async description() {
      return waitForMcpServersPrompt();
    },
    async prompt() {
      return waitForMcpServersPrompt();
    },
    get inputSchema() {
      return waitForMcpInputSchema();
    },
    get outputSchema() {
      return waitForMcpOutputSchema();
    },
    create(toolContext) {
      return {
        async call(input, callOptions) {
          let clients = toolContext.mcpClients();
          let pendingNames = pendingMcpServerNames(clients);
          let requestedNames = input.servers?.length
            ? input.servers
            : pendingNames.length > 0
              ? pendingNames
              : clients.filter((client) => client.type === "failed").map((client) => client.name);
          let requestedKeys = new Set(
            requestedNames.map((serverName) => normalizeNameForMCP(internalKey(serverName))),
          );
          let matchingClients = () =>
            toolContext
              .mcpClients()
              .filter(
                (client) =>
                  requestedNames.includes(client.name) || requestedKeys.has(normalizeNameForMCP(client.name)),
              );
          let now = Date.now();
          let deadlineMs = now + MCP_WAIT_TIMEOUT_MS;
          while (
            matchingClients().some((client) => client.type === "pending") &&
            Date.now() < deadlineMs &&
            !callOptions.signal.aborted
          )
            await sleep(50, callOptions.signal);
          let waitedMs = Date.now() - now;
          let matchedClients = matchingClients();
          let connected = [];
          let cached = [];
          let failed = [];
          let stillPending = [];
          let needsAuth = [];
          let disabled = [];
          let unconfigured = [];
          for (let client of matchedClients)
            switch (client.type) {
              case "connected":
                connected.push(client.name);
                break;
              case "cached":
                cached.push(client.name);
                break;
              case "failed":
                if (isUnconfiguredFailure(client)) unconfigured.push(client.name);
                else failed.push(client.name);
                break;
              case "pending":
                stillPending.push(client.name);
                break;
              case "needs-auth":
                needsAuth.push(client.name);
                break;
              case "disabled":
                disabled.push(client.name);
                break;
              default:
            }
          let matchedKeys = new Set(matchedClients.map((client) => normalizeNameForMCP(client.name)));
          let filtered = requestedNames.filter(
            (requestedName) =>
              !matchedKeys.has(normalizeNameForMCP(requestedName)) &&
              !matchedKeys.has(normalizeNameForMCP(internalKey(requestedName))),
          );
          let ready =
            stillPending.length === 0 &&
            failed.length === 0 &&
            needsAuth.length === 0 &&
            disabled.length === 0 &&
            filtered.length === 0;
          logForDebugging(
            `[WaitForMcpServers] waited=${waitedMs}ms connected=${connected.join(",")} cached=${cached.join(",")} failed=${failed.join(",")} pending=${stillPending.join(",")} needsAuth=${needsAuth.join(",")} disabled=${disabled.join(",")} unconfigured=${unconfigured.join(",")} unknown=${filtered.join(",")}`,
          );
          logEvent("tengu_mcp_pending_call", {
            requestedCount: requestedNames.length,
            connectedCount: connected.length,
            cachedCount: cached.length,
            failedCount: failed.length,
            pendingCount: stillPending.length,
            needsAuthCount: needsAuth.length,
            disabledCount: disabled.length,
            unconfiguredCount: unconfigured.length,
            unknownCount: filtered.length,
            waitMs: waitedMs,
            matched: ready,
            matchType: lit_2("wait"),
            success: ready,
          });
          let remedy =
            getNeedsAuthServers(matchedClients) ??
            (disabled.length > 0
              ? {
                  kind: "mcp_disabled",
                  servers: disabled,
                }
              : undefined);
          return {
            ...(remedy !== undefined && {
              remedy,
            }),
            data: {
              ready,
              connected,
              cached,
              failed,
              stillPending,
              needsAuth,
              disabled,
              unconfigured,
              unknown: filtered,
              ...false,
            },
          };
        },
      };
    },
    renderToolUseMessage(input) {
      let joined = input.servers?.join(", ");
      return joined
        ? `Wait for MCP servers to connect: ${joined}`
        : "Wait for pending MCP servers to connect";
    },
    userFacingName() {
      return "MCP Wait For Servers";
    },
    mapToolResultToToolResultBlockParam(result, toolUseId) {
      let filtered = result.failed.filter((name) => !isHiddenReplyServer(name));
      let filtered_2 = result.needsAuth.filter((name) => !isHiddenReplyServer(name));
      let filtered_3 = [
        `ready: ${result.ready}`,
        result.connected.length
          ? `Connected (their tools are now available \u2014 call them directly): ${result.connected.join(", ")}`
          : "",
        result.cached?.length
          ? `Cached (their tools are available now; connects on first call): ${result.cached.join(", ")}`
          : "",
        filtered.length ? `Failed to connect: ${filtered.join(", ")}` : "",
        result.stillPending.length
          ? `Still connecting (try again or proceed without): ${result.stillPending.join(", ")}`
          : "",
        filtered_2.length ? `Needs authentication (ask the user to run /mcp): ${filtered_2.join(", ")}` : "",
        filtered.length < result.failed.length
          ? appToolServerUnavailableText("failed")
          : filtered_2.length < result.needsAuth.length
            ? appToolServerUnavailableText("needs_auth")
            : "",
        result.disabled.length
          ? isArtifactMountMode()
            ? `Disabled for this project (the user can turn these servers back on by running /mcp in this project, in a terminal where this session runs): ${result.disabled.join(", ")}`
            : `Disabled (ask the user to enable via /mcp): ${result.disabled.join(", ")}`
          : "",
        result.unconfigured?.length
          ? `Not configured (no URL set \u2014 retrying will not help; the user must configure the server first): ${result.unconfigured.join(", ")}`
          : "",
        result.unknown.length
          ? `Unknown (no MCP server with this name is configured): ${result.unknown.join(", ")}`
          : "",
      ].filter(Boolean);
      return {
        type: "tool_result",
        tool_use_id: toolUseId,
        content: filtered_3.join(`
`),
        is_error: !result.ready,
      };
    },
  });
});
export {
  WAITFORMCPSERVERS,
  onDeclaredChange,
  isDeclared,
  clearDeclared,
  markDeclared,
  WaitForMcpServersTool,
  hasPendingMcpClients,
};
