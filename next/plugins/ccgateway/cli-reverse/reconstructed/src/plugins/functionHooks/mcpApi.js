/**
 * plugins/functionHooks/mcpApi.ts
 *
 * 2.1.316 新增：插件 $.mcp.call/connect 接口
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (18)
 * attribution: placement 18
 */
import { requireBoundSession } from "./sessionApi.js";
import { mcpToolNameVariants, listServersInToolNames, toolCallForPlugin } from "./toolApi.js";
import { logForDebugging } from "../../utils/debug.js";
import { HooksError } from "./hooksErrors.js";
import { toolCallEventNoAgent } from "./sites/toolSites.js";
import { getConnectionTimeoutMs } from "../../services/mcp/client.js";
import { MAX_TIMER_DELAY_MS } from "../../utils/timerDelayClamp.js";
import { identity as identity_2 } from "../../utils/identity.js";
import { currentSurfaceBinding } from "./surfaceBinding.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { pluginStorageIdOf } from "./commandHooks.js";
import { moduleUnadmittedListener } from "../../utils/hooks.js";
import { loadedModuleArgs } from "../hooksModules/loadedModuleFilters.js";
import { errorMessage } from "../../utils/errors.js";
import { ZERO_TOKEN_USAGE } from "./api/operations.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:4079025-4079849 placement
/**
 * 插件 $.mcp.call：调用已连接 MCP 服务器上的工具，找不到时列出可用服务器。
 */
async function mcpCallForPlugin({ server, tool, args }, caller) {
  let session = requireBoundSession(caller.plugin, "$.mcp.call");
  let nameVariants = mcpToolNameVariants(server, tool);
  let tools = session.tools();
  let found = tools.find((toolInfo) => nameVariants.has(toolInfo.name));
  if (!found) {
    let serverList = listServersInToolNames(tools.map((toolInfo) => toolInfo.name));
    logForDebugging(
      `$.mcp.call (${caller.plugin}): no tool "${tool}" on a server named "${server}"; servers with tools: ${serverList}`,
    );
    throw new HooksError(
      `${caller.plugin}: $.mcp.call: no connected MCP tool "${tool}" on a server named "${server}"`,
    );
  }
  let now = Date.now();
  logForDebugging(
    `$.mcp.call (${caller.plugin}): ${found.name} (${Object.keys(args).join(", ") || "no args"})`,
  );
  let outcome = await toolCallForPlugin(toolCallEventNoAgent(found.name, args), caller);
  if (outcome.deny !== undefined)
    throw new HooksError(`${caller.plugin}: $.mcp.call(${server}, ${tool}) refused: ${outcome.deny}`);
  let contentBlocks = Array.isArray(outcome.result)
    ? outcome.result
    : [
        {
          type: "text",
          text: outcome.text ?? "",
        },
      ];
  logForDebugging(
    `$.mcp.call (${caller.plugin}): ${found.name} answered in ${Date.now() - now}ms: ${contentBlocks.length} block(s)${outcome.isError ? ", isError" : ""}`,
  );
  return {
    content: contentBlocks,
    isError: outcome.isError === true,
  };
}
//@ chunk-5xgkngpb.js:4079849-4079903 placement
/**
 * MCP 连接失败结果
 */
var mcpConnectRefusal = (refused, message) => ({
  isConnected: false,
  refused,
  message,
});
//@ chunk-5xgkngpb.js:4079903-4080328 placement
/**
 * 把 MCP 连接行的状态映射为 $.mcp.connect 结果：connected/cached 成功，pending 未定，needs-auth/failed/disabled 给出拒绝原因与说明。
 */
function mcpConnectOutcome(outcome) {
  switch (outcome.type) {
    case "connected":
    case "cached":
      return {
        isConnected: true,
      };
    case "pending":
      return;
    case "needs-auth":
      return mcpConnectRefusal(
        "auth",
        `The MCP server "${outcome.name}" needs you to sign in; run /mcp to authenticate.`,
      );
    case "failed":
      return mcpConnectRefusal(
        "failed",
        `The MCP server "${outcome.name}" did not connect: ${outcome.error ?? "no reason given"}.`,
      );
    case "disabled":
      return mcpConnectRefusal("failed", `The MCP server "${outcome.name}" is turned off in this session.`);
  }
}
//@ chunk-5xgkngpb.js:4080328-4080338 placement
/**
 * 3
 */
var CONNECT_TIMEOUT_FACTOR = 3;
//@ chunk-5xgkngpb.js:4080338-4080376 placement
/**
 * 连接等待时长
 */
var connectWaitMs = () =>
  Math.min(getConnectionTimeoutMs() + getConnectionTimeoutMs() * CONNECT_TIMEOUT_FACTOR, MAX_TIMER_DELAY_MS);
//@ chunk-5xgkngpb.js:4080376-4080610 placement
/**
 * 订阅 MCP 连接行，直到指定服务器的行满足条件或超时，返回是否满足。
 */
function waitForMcpRow({ rows, subscribe, name, isSettled, timeoutMs }) {
  let findRow = () => rows().find((row) => row.name === name);
  return new Promise((resolve) => {
    let unsubscribe = () => {};
    let timer = setTimeout(() => {
      unsubscribe();
      resolve(false);
    }, timeoutMs);
    function checkSettled() {
      if (isSettled(findRow())) {
        clearTimeout(timer);
        unsubscribe();
        resolve(true);
      }
    }
    unsubscribe = subscribe(checkSettled);
    checkSettled();
  });
}
//@ chunk-5xgkngpb.js:4080610-4080698 placement
/**
 * 等待 MCP 行
 */
var mcpWaitRequest = (connection, name, isSettled) => ({
  rows: connection.rows,
  subscribe: connection.subscribe,
  name,
  isSettled,
  timeoutMs: connectWaitMs(),
});
//@ chunk-5xgkngpb.js:4080698-4080844 placement
async function dropFailedMcpServer(connection, server) {
  connection.drop(server.name);
  await waitForMcpRow(mcpWaitRequest(connection, server.name, (row) => row !== server));
  if (!connection.rows().some((remainingRow) => remainingRow.name === server.name))
    await connection.forget(server.name, server.config);
}
//@ chunk-5xgkngpb.js:4080844-4081280 placement
/**
 * 插件请求连接 MCP 服务器：失败且由插件持有的先移除，已存在则返回状态，否则添加并等待结果（超时仍保留在会话中）。
 */
async function connectMcpServerForPlugin(connection, name, config) {
  let server = connection.rows().find((row) => row.name === name);
  let isHeldFailed = server?.type === "failed" && connection.holds(name);
  if (server !== undefined && isHeldFailed) await dropFailedMcpServer(connection, server);
  let found = connection.rows().find((rowAfterDrop) => rowAfterDrop.name === name);
  let outcome = found && mcpConnectOutcome(found);
  if (outcome !== undefined) return outcome;
  if (found === undefined) connection.add(name, config);
  await waitForMcpRow(mcpWaitRequest(connection, name, (row) => row !== undefined && row.type !== "pending"));
  let found_2 = connection.rows().find((finalRow) => finalRow.name === name);
  return (
    (found_2 && mcpConnectOutcome(found_2)) ??
    mcpConnectRefusal(
      "failed",
      `The MCP server "${name}" is still connecting after ${connectWaitMs()}ms; it stays in the session.`,
    )
  );
}
//@ chunk-5xgkngpb.js:4081280-4081582 placement
/**
 * MCP 连接登记：合并同一服务器的并发连接请求，并记录插件持有的服务器。
 */
function createMcpConnectRegistry() {
  let joinsByServer = new Map();
  let ownersByPlugin = new Map();
  return {
    join: (server, connect) => {
      let existing = joinsByServer.get(server);
      if (existing !== undefined) return existing;
      let joinPromise = connect().finally(() => joinsByServer.delete(server));
      joinsByServer.set(server, joinPromise);
      return joinPromise;
    },
    own: (plugin, server) => {
      let servers = ownersByPlugin.get(plugin) ?? new Set();
      servers.add(server);
      ownersByPlugin.set(plugin, servers);
    },
    forget: (plugin) => {
      let servers = [...(ownersByPlugin.get(plugin) ?? [])];
      ownersByPlugin.delete(plugin);
      return servers;
    },
    clear: () => {
      joinsByServer.clear();
      ownersByPlugin.clear();
    },
  };
}
//@ chunk-5xgkngpb.js:4081582-4081617 placement
/**
 * MCP 连接登记表
 */
var mcpConnectRegistry; // deferred: uses createMcpConnectRegistry of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:4081582", () => {
  mcpConnectRegistry = identity_2(createMcpConnectRegistry(), (registry) => {
    registry.clear();
  });
});
//@ chunk-5xgkngpb.js:4081617-4081684 placement
/**
 * 忘掉插件建立的 MCP 服务器
 */
function forgetMcpConnectsFor(plugin) {
  for (let server of mcpConnectRegistry.forget(plugin)) currentSurfaceBinding()?.removeMcpServer(server);
}
//@ chunk-5xgkngpb.js:4081684-4081737 placement
/**
 * 连接失败结果
 */
var mcpConnectFailure = (reason, message) => ({
  isConnected: false,
  reason,
  message,
});
//@ chunk-5xgkngpb.js:4081737-4081919 placement
function mcpConnectRefused(caller, refused, message) {
  if (refused === "failed") logFeatureBad("plugin_function_hooks_mcp_connect", "failed");
  else logFeatureSad("plugin_function_hooks_mcp_connect", refused);
  logForDebugging(`$.mcp.connect (${caller.plugin}): ${refused}: ${message}`);
  return mcpConnectFailure(refused, message);
}
//@ chunk-5xgkngpb.js:4081919-4082945 placement
/**
 * 插件 $.mcp.connect：以插件身份连接 MCP 服务器并记录遥测。
 */
async function mcpConnectForPlugin({ server }, caller) {
  let session = requireBoundSession(caller.plugin, "$.mcp.connect");
  try {
    let mcpServer = await session.resolveMcpServer({
      pluginId: pluginStorageIdOf(caller.plugin),
      key: server,
    });
    if (!mcpServer.isListed) return mcpConnectRefused(caller, mcpServer.refused, mcpServer.message);
    if (mcpServer.isTwin) {
      logForDebugging(`$.mcp.connect (${caller.plugin}): ${server}: runs as its twin ${mcpServer.name}`);
      let twinServer = await session.settledMcpServer(mcpServer.name);
      if (!twinServer.isConnected) return mcpConnectRefused(caller, twinServer.refused, twinServer.message);
      logFeatureOk("plugin_function_hooks_mcp_connect");
      return {
        isConnected: true,
        server: mcpServer.name,
      };
    }
    let { name: serverName, config } = mcpServer;
    let now = Date.now();
    logForDebugging(`$.mcp.connect (${caller.plugin}): ${serverName}: connecting`);
    mcpConnectRegistry.own(caller.plugin, serverName);
    moduleUnadmittedListener.set(forgetMcpConnectsFor);
    let joined = await mcpConnectRegistry.join(serverName, () =>
      session.connectMcpServer(serverName, config),
    );
    if (!joined.isConnected) return mcpConnectRefused(caller, joined.refused, joined.message);
    if (loadedModuleArgs(caller.plugin) === undefined) {
      session.removeMcpServer(serverName);
      return mcpConnectRefused(
        caller,
        "failed",
        `The MCP server "${serverName}" was taken out: its plugin unloaded while it connected.`,
      );
    }
    logFeatureOk("plugin_function_hooks_mcp_connect");
    logForDebugging(`$.mcp.connect (${caller.plugin}): ${serverName}: connected after ${Date.now() - now}ms`);
    return {
      isConnected: true,
      server: serverName,
    };
  } catch (error) {
    return mcpConnectRefused(
      caller,
      "failed",
      `The MCP server "${server}" did not connect: ${errorMessage(error)}.`,
    );
  }
}
//@ chunk-5xgkngpb.js:4082945-4083215 placement
/**
 * 等待指定 MCP 服务器结束 pending 状态并返回连接结果（不存在或超时时给出说明）。
 */
async function awaitMcpServerConnected(connection, name) {
  await waitForMcpRow(mcpWaitRequest(connection, name, (row) => row === undefined || row.type !== "pending"));
  let found = connection.rows().find((row) => row.name === name);
  let isMissing = found === undefined;
  return (
    (found && mcpConnectOutcome(found)) ??
    mcpConnectRefusal(
      "failed",
      isMissing
        ? `The MCP server "${name}" is not in this session.`
        : `The MCP server "${name}" did not connect within ${connectWaitMs()}ms.`,
    )
  );
}
//@ chunk-5xgkngpb.js:4083215-4083304 placement
/**
 * API 错误转结果
 */
var modelApiError = (failure) => ({
  isAnswered: false,
  reason: "api-error",
  status: failure.status,
  error: failure.kind,
  usage: ZERO_TOKEN_USAGE,
});
//@ chunk-5xgkngpb.js:4083304-4083317 placement
/**
 * 1024
 */
var MAX_ERROR_TEXT = 1024;
export {
  awaitMcpServerConnected,
  mcpConnectRefusal,
  mcpConnectOutcome,
  forgetMcpConnectsFor,
  mcpCallForPlugin,
  mcpConnectForPlugin,
  modelApiError,
  MAX_ERROR_TEXT,
  connectMcpServerForPlugin,
};
