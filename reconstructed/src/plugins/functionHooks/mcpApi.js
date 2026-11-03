/**
 * plugins/functionHooks/mcpApi.ts
 *
 * 2.1.316 新增：插件 $.mcp.call/connect 接口
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (18)
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
import { Reo } from "./api/operations.js";

//@ chunk-e6aww6q8.js:3976788-3977609 placement
/**
 * 插件 $.mcp.call：调用已连接 MCP 服务器上的工具，找不到时列出可用服务器。
 */
async function mcpCallForPlugin({ server, tool, args }, s) {
  let h = requireBoundSession(s.plugin, "$.mcp.call");
  let y = mcpToolNameVariants(server, tool);
  let S = h.tools();
  let found = S.find((Se) => y.has(Se.name));
  if (!found) {
    let Se = listServersInToolNames(S.map((ke) => ke.name));
    logForDebugging(
      `$.mcp.call (${s.plugin}): no tool "${tool}" on a server named "${server}"; servers with tools: ${Se}`,
    );
    throw new HooksError(
      `${s.plugin}: $.mcp.call: no connected MCP tool "${tool}" on a server named "${server}"`,
    );
  }
  let now = Date.now();
  logForDebugging(`$.mcp.call (${s.plugin}): ${found.name} (${Object.keys(args).join(", ") || "no args"})`);
  let G = await toolCallForPlugin(toolCallEventNoAgent(found.name, args), s);
  if (G.deny !== undefined)
    throw new HooksError(`${s.plugin}: $.mcp.call(${server}, ${tool}) refused: ${G.deny}`);
  let Z = Array.isArray(G.result)
    ? G.result
    : [
        {
          type: "text",
          text: G.text ?? "",
        },
      ];
  logForDebugging(
    `$.mcp.call (${s.plugin}): ${found.name} answered in ${Date.now() - now}ms: ${Z.length} block(s)${G.isError ? ", isError" : ""}`,
  );
  return {
    content: Z,
    isError: G.isError === true,
  };
}
//@ chunk-e6aww6q8.js:3977609-3977663 placement
/**
 * MCP 连接失败结果
 */
var mcpConnectRefusal = (refused, message) => ({
  isConnected: false,
  refused,
  message,
});
//@ chunk-e6aww6q8.js:3977663-3978088 placement
/**
 * 把 MCP 连接行的状态映射为 $.mcp.connect 结果：connected/cached 成功，pending 未定，needs-auth/failed/disabled 给出拒绝原因与说明。
 */
function mcpConnectOutcome(e) {
  switch (e.type) {
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
        `The MCP server "${e.name}" needs you to sign in; run /mcp to authenticate.`,
      );
    case "failed":
      return mcpConnectRefusal(
        "failed",
        `The MCP server "${e.name}" did not connect: ${e.error ?? "no reason given"}.`,
      );
    case "disabled":
      return mcpConnectRefusal("failed", `The MCP server "${e.name}" is turned off in this session.`);
  }
}
//@ chunk-e6aww6q8.js:3978088-3978098 placement
/**
 * 3
 */
var CONNECT_TIMEOUT_FACTOR = 3;
//@ chunk-e6aww6q8.js:3978098-3978136 placement
/**
 * 连接等待时长
 */
var connectWaitMs = () =>
  Math.min(getConnectionTimeoutMs() + getConnectionTimeoutMs() * CONNECT_TIMEOUT_FACTOR, MAX_TIMER_DELAY_MS);
//@ chunk-e6aww6q8.js:3978136-3978370 placement
/**
 * 订阅 MCP 连接行，直到指定服务器的行满足条件或超时，返回是否满足。
 */
function waitForMcpRow({ rows, subscribe, name: r, isSettled, timeoutMs }) {
  let y = () => rows().find((S) => S.name === r);
  return new Promise((resolve) => {
    let w = () => {};
    let timer = setTimeout(() => {
      w();
      resolve(false);
    }, timeoutMs);
    function G() {
      if (isSettled(y())) {
        clearTimeout(timer);
        w();
        resolve(true);
      }
    }
    w = subscribe(G);
    G();
  });
}
//@ chunk-e6aww6q8.js:3978370-3978458 placement
/**
 * 等待 MCP 行
 */
var mcpWaitRequest = (e, name, isSettled) => ({
  rows: e.rows,
  subscribe: e.subscribe,
  name,
  isSettled,
  timeoutMs: connectWaitMs(),
});
//@ chunk-e6aww6q8.js:3978458-3978604 placement
async function dropFailedMcpServer(e, n) {
  e.drop(n.name);
  await waitForMcpRow(mcpWaitRequest(e, n.name, (s) => s !== n));
  if (!e.rows().some((s) => s.name === n.name)) await e.forget(n.name, n.config);
}
//@ chunk-e6aww6q8.js:3978604-3979040 placement
/**
 * 插件请求连接 MCP 服务器：失败且由插件持有的先移除，已存在则返回状态，否则添加并等待结果（超时仍保留在会话中）。
 */
async function connectMcpServerForPlugin(e, name, r) {
  let found = e.rows().find((L) => L.name === name);
  let h = found?.type === "failed" && e.holds(name);
  if (found !== undefined && h) await dropFailedMcpServer(e, found);
  let found_2 = e.rows().find((L) => L.name === name);
  let S = found_2 && mcpConnectOutcome(found_2);
  if (S !== undefined) return S;
  if (found_2 === undefined) e.add(name, r);
  await waitForMcpRow(mcpWaitRequest(e, name, (L) => L !== undefined && L.type !== "pending"));
  let found_3 = e.rows().find((L) => L.name === name);
  return (
    (found_3 && mcpConnectOutcome(found_3)) ??
    mcpConnectRefusal(
      "failed",
      `The MCP server "${name}" is still connecting after ${connectWaitMs()}ms; it stays in the session.`,
    )
  );
}
//@ chunk-e6aww6q8.js:3979040-3979342 placement
/**
 * MCP 连接登记：合并同一服务器的并发连接请求，并记录插件持有的服务器。
 */
function createMcpConnectRegistry() {
  let e = new Map();
  let n = new Map();
  return {
    join: (r, s) => {
      let h = e.get(r);
      if (h !== undefined) return h;
      let y = s().finally(() => e.delete(r));
      e.set(r, y);
      return y;
    },
    own: (r, s) => {
      let h = n.get(r) ?? new Set();
      h.add(s);
      n.set(r, h);
    },
    forget: (r) => {
      let s = [...(n.get(r) ?? [])];
      n.delete(r);
      return s;
    },
    clear: () => {
      e.clear();
      n.clear();
    },
  };
}
//@ chunk-e6aww6q8.js:3979342-3979377 placement
/**
 * MCP 连接登记表
 */
var mcpConnectRegistry = identity_2(createMcpConnectRegistry(), (e) => {
  e.clear();
});
//@ chunk-e6aww6q8.js:3979377-3979444 placement
/**
 * 忘掉插件建立的 MCP 服务器
 */
function forgetMcpConnectsFor(e) {
  for (let n of mcpConnectRegistry.forget(e)) currentSurfaceBinding()?.removeMcpServer(n);
}
//@ chunk-e6aww6q8.js:3979444-3979497 placement
/**
 * 连接失败结果
 */
var mcpConnectFailure = (reason, message) => ({
  isConnected: false,
  reason,
  message,
});
//@ chunk-e6aww6q8.js:3979497-3979679 placement
function mcpConnectRefused(e, refused, message) {
  if (refused === "failed") logFeatureBad("plugin_function_hooks_mcp_connect", "failed");
  else logFeatureSad("plugin_function_hooks_mcp_connect", refused);
  logForDebugging(`$.mcp.connect (${e.plugin}): ${refused}: ${message}`);
  return mcpConnectFailure(refused, message);
}
//@ chunk-e6aww6q8.js:3979679-3980705 placement
/**
 * 插件 $.mcp.connect：以插件身份连接 MCP 服务器并记录遥测。
 */
async function mcpConnectForPlugin({ server }, n) {
  let r = requireBoundSession(n.plugin, "$.mcp.connect");
  try {
    let mcpServer = await r.resolveMcpServer({
      pluginId: pluginStorageIdOf(n.plugin),
      key: server,
    });
    if (!mcpServer.isListed) return mcpConnectRefused(n, mcpServer.refused, mcpServer.message);
    if (mcpServer.isTwin) {
      logForDebugging(`$.mcp.connect (${n.plugin}): ${server}: runs as its twin ${mcpServer.name}`);
      let L = await r.settledMcpServer(mcpServer.name);
      if (!L.isConnected) return mcpConnectRefused(n, L.refused, L.message);
      logFeatureOk("plugin_function_hooks_mcp_connect");
      return {
        isConnected: true,
        server: mcpServer.name,
      };
    }
    let { name: h, config } = mcpServer;
    let now = Date.now();
    logForDebugging(`$.mcp.connect (${n.plugin}): ${h}: connecting`);
    mcpConnectRegistry.own(n.plugin, h);
    moduleUnadmittedListener.set(forgetMcpConnectsFor);
    let joined = await mcpConnectRegistry.join(h, () => r.connectMcpServer(h, config));
    if (!joined.isConnected) return mcpConnectRefused(n, joined.refused, joined.message);
    if (loadedModuleArgs(n.plugin) === undefined) {
      r.removeMcpServer(h);
      return mcpConnectRefused(
        n,
        "failed",
        `The MCP server "${h}" was taken out: its plugin unloaded while it connected.`,
      );
    }
    logFeatureOk("plugin_function_hooks_mcp_connect");
    logForDebugging(`$.mcp.connect (${n.plugin}): ${h}: connected after ${Date.now() - now}ms`);
    return {
      isConnected: true,
      server: h,
    };
  } catch (error) {
    return mcpConnectRefused(
      n,
      "failed",
      `The MCP server "${server}" did not connect: ${errorMessage(error)}.`,
    );
  }
}
//@ chunk-e6aww6q8.js:3980705-3980975 placement
/**
 * 等待指定 MCP 服务器结束 pending 状态并返回连接结果（不存在或超时时给出说明）。
 */
async function awaitMcpServerConnected(e, name) {
  await waitForMcpRow(mcpWaitRequest(e, name, (h) => h === undefined || h.type !== "pending"));
  let found = e.rows().find((h) => h.name === name);
  let s = found === undefined;
  return (
    (found && mcpConnectOutcome(found)) ??
    mcpConnectRefusal(
      "failed",
      s
        ? `The MCP server "${name}" is not in this session.`
        : `The MCP server "${name}" did not connect within ${connectWaitMs()}ms.`,
    )
  );
}
//@ chunk-e6aww6q8.js:3980975-3981064 placement
/**
 * API 错误转结果
 */
var modelApiError = (failure) => ({
  isAnswered: false,
  reason: "api-error",
  status: failure.status,
  error: failure.kind,
  usage: Reo,
});
//@ chunk-e6aww6q8.js:3981064-3981077 placement
/**
 * 1024
 */
var MAX_ERROR_TEXT = 1024;
export {
  awaitMcpServerConnected,
  mcpConnectRefusal,
  connectMcpServerForPlugin,
  modelApiError,
  MAX_ERROR_TEXT,
  forgetMcpConnectsFor,
  mcpCallForPlugin,
  mcpConnectForPlugin,
  mcpConnectOutcome,
};
