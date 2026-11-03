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
import { LUi } from "./sites/toolSites.js";
import { getConnectionTimeoutMs } from "../../services/mcp/client.js";
import { ec } from "../../utils/timerDelayClamp.js";
import { ge } from "../../utils/identity.js";
import { lp } from "./surfaceBinding.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { JC } from "./commandHooks.js";
import { moduleUnadmittedListener } from "../../utils/hooks.js";
import { IT } from "../hooksModules/loadedModuleFilters.js";
import { errorMessage } from "../../utils/errors.js";
import { freeze_10 as freeze_10_2 } from "./api/operations.js";

/**
 * 插件 $.mcp.call：调用已连接 MCP 服务器上的工具，找不到时列出可用服务器。
 */
//@ chunk-e6aww6q8.js:3976788-3977609 placement
async function mcpCallForPlugin({ server: server, tool: tool, args: args }, s) {
  let h = requireBoundSession(s.plugin, "$.mcp.call"),
    y = mcpToolNameVariants(server, tool),
    tools = h.tools(),
    found = tools.find((Se) => y.has(Se.name));
  if (!found) {
    let Se = listServersInToolNames(tools.map((ke) => ke.name));
    throw (
      logForDebugging(
        `$.mcp.call (${s.plugin}): no tool "${tool}" on a server named "${server}"; servers with tools: ${Se}`,
      ),
      new HooksError(`${s.plugin}: $.mcp.call: no connected MCP tool "${tool}" on a server named "${server}"`)
    );
  }
  let now = Date.now();
  logForDebugging(`$.mcp.call (${s.plugin}): ${found.name} (${Object.keys(args).join(", ") || "no args"})`);
  let G = await toolCallForPlugin(LUi(found.name, args), s);
  if (G.deny !== void 0)
    throw new HooksError(`${s.plugin}: $.mcp.call(${server}, ${tool}) refused: ${G.deny}`);
  let Z = Array.isArray(G.result) ? G.result : [{ type: "text", text: G.text ?? "" }];
  return (
    logForDebugging(
      `$.mcp.call (${s.plugin}): ${found.name} answered in ${Date.now() - now}ms: ${Z.length} block(s)${G.isError ? ", isError" : ""}`,
    ),
    { content: Z, isError: G.isError === !0 }
  );
}
//@ chunk-e6aww6q8.js:3977609-3977663 placement
var _fe = (e, n) => ({ isConnected: !1, refused: e, message: n });
/**
 * 把 MCP 连接行的状态映射为 $.mcp.connect 结果：connected/cached 成功，pending 未定，needs-auth/failed/disabled 给出拒绝原因与说明。
 */
//@ chunk-e6aww6q8.js:3977663-3978088 placement
function mcpConnectOutcome(e) {
  switch (e.type) {
    case "connected":
    case "cached":
      return { isConnected: !0 };
    case "pending":
      return;
    case "needs-auth":
      return _fe("auth", `The MCP server "${e.name}" needs you to sign in; run /mcp to authenticate.`);
    case "failed":
      return _fe("failed", `The MCP server "${e.name}" did not connect: ${e.error ?? "no reason given"}.`);
    case "disabled":
      return _fe("failed", `The MCP server "${e.name}" is turned off in this session.`);
  }
}
//@ chunk-e6aww6q8.js:3978088-3978098 placement
var s0n = 3;
//@ chunk-e6aww6q8.js:3978098-3978136 placement
var WY = () => Math.min(getConnectionTimeoutMs() + getConnectionTimeoutMs() * s0n, ec);
/**
 * 订阅 MCP 连接行，直到指定服务器的行满足条件或超时，返回是否满足。
 */
//@ chunk-e6aww6q8.js:3978136-3978370 placement
function waitForMcpRow({
  rows: rows,
  subscribe: subscribe,
  name: r,
  isSettled: isSettled,
  timeoutMs: timeoutMs,
}) {
  let y = () => rows().find((S) => S.name === r);
  return new Promise((S) => {
    let w = () => {},
      L = setTimeout(() => {
        (w(), S(!1));
      }, timeoutMs);
    function G() {
      if (isSettled(y())) (clearTimeout(L), w(), S(!0));
    }
    ((w = subscribe(G)), G());
  });
}
//@ chunk-e6aww6q8.js:3978370-3978458 placement
var zY = (e, n, r) => ({ rows: e.rows, subscribe: e.subscribe, name: n, isSettled: r, timeoutMs: WY() });
//@ chunk-e6aww6q8.js:3978458-3978604 placement
async function dropFailedMcpServer(e, n) {
  if (
    (e.drop(n.name),
    await waitForMcpRow(zY(e, n.name, (s) => s !== n)),
    !e.rows().some((s) => s.name === n.name))
  )
    await e.forget(n.name, n.config);
}
/**
 * 插件请求连接 MCP 服务器：失败且由插件持有的先移除，已存在则返回状态，否则添加并等待结果（超时仍保留在会话中）。
 */
//@ chunk-e6aww6q8.js:3978604-3979040 placement
async function connectMcpServerForPlugin(e, n, r) {
  let found = e.rows().find((L) => L.name === n),
    h = found?.type === "failed" && e.holds(n);
  if (found !== void 0 && h) await dropFailedMcpServer(e, found);
  let found_2 = e.rows().find((L) => L.name === n),
    S = found_2 && mcpConnectOutcome(found_2);
  if (S !== void 0) return S;
  if (found_2 === void 0) e.add(n, r);
  await waitForMcpRow(zY(e, n, (L) => L !== void 0 && L.type !== "pending"));
  let found_3 = e.rows().find((L) => L.name === n);
  return (
    (found_3 && mcpConnectOutcome(found_3)) ??
    _fe("failed", `The MCP server "${n}" is still connecting after ${WY()}ms; it stays in the session.`)
  );
}
/**
 * MCP 连接登记：合并同一服务器的并发连接请求，并记录插件持有的服务器。
 */
//@ chunk-e6aww6q8.js:3979040-3979342 placement
function createMcpConnectRegistry() {
  let e = new Map(),
    n = new Map();
  return {
    join: (r, s) => {
      let h = e.get(r);
      if (h !== void 0) return h;
      let y = s().finally(() => e.delete(r));
      return (e.set(r, y), y);
    },
    own: (r, s) => {
      let h = n.get(r) ?? new Set();
      (h.add(s), n.set(r, h));
    },
    forget: (r) => {
      let s = [...(n.get(r) ?? [])];
      return (n.delete(r), s);
    },
    clear: () => {
      (e.clear(), n.clear());
    },
  };
}
//@ chunk-e6aww6q8.js:3979342-3979377 placement
var Noe = ge(createMcpConnectRegistry(), (e) => {
  e.clear();
});
//@ chunk-e6aww6q8.js:3979377-3979444 placement
function qY(e) {
  for (let n of Noe.forget(e)) lp()?.removeMcpServer(n);
}
//@ chunk-e6aww6q8.js:3979444-3979497 placement
var d0n = (e, n) => ({ isConnected: !1, reason: e, message: n });
//@ chunk-e6aww6q8.js:3979497-3979679 placement
function mcpConnectRefused(e, n, r) {
  return (
    n === "failed"
      ? logFeatureBad("plugin_function_hooks_mcp_connect", "failed")
      : logFeatureSad("plugin_function_hooks_mcp_connect", n),
    logForDebugging(`$.mcp.connect (${e.plugin}): ${n}: ${r}`),
    d0n(n, r)
  );
}
/**
 * 插件 $.mcp.connect：以插件身份连接 MCP 服务器并记录遥测。
 */
//@ chunk-e6aww6q8.js:3979679-3980705 placement
async function mcpConnectForPlugin({ server: server }, n) {
  let r = requireBoundSession(n.plugin, "$.mcp.connect");
  try {
    let mcpServer = await r.resolveMcpServer({ pluginId: JC(n.plugin), key: server });
    if (!mcpServer.isListed) return mcpConnectRefused(n, mcpServer.refused, mcpServer.message);
    if (mcpServer.isTwin) {
      logForDebugging(`$.mcp.connect (${n.plugin}): ${server}: runs as its twin ${mcpServer.name}`);
      let settledMcpServer = await r.settledMcpServer(mcpServer.name);
      if (!settledMcpServer.isConnected)
        return mcpConnectRefused(n, settledMcpServer.refused, settledMcpServer.message);
      return (logFeatureOk("plugin_function_hooks_mcp_connect"), { isConnected: !0, server: mcpServer.name });
    }
    let { name: h, config: config } = mcpServer,
      now = Date.now();
    (logForDebugging(`$.mcp.connect (${n.plugin}): ${h}: connecting`),
      Noe.own(n.plugin, h),
      moduleUnadmittedListener.set(qY));
    let joined = await Noe.join(h, () => r.connectMcpServer(h, config));
    if (!joined.isConnected) return mcpConnectRefused(n, joined.refused, joined.message);
    if (IT(n.plugin) === void 0)
      return (
        r.removeMcpServer(h),
        mcpConnectRefused(
          n,
          "failed",
          `The MCP server "${h}" was taken out: its plugin unloaded while it connected.`,
        )
      );
    return (
      logFeatureOk("plugin_function_hooks_mcp_connect"),
      logForDebugging(`$.mcp.connect (${n.plugin}): ${h}: connected after ${Date.now() - now}ms`),
      { isConnected: !0, server: h }
    );
  } catch (error) {
    return mcpConnectRefused(
      n,
      "failed",
      `The MCP server "${server}" did not connect: ${errorMessage(error)}.`,
    );
  }
}
/**
 * 等待指定 MCP 服务器结束 pending 状态并返回连接结果（不存在或超时时给出说明）。
 */
//@ chunk-e6aww6q8.js:3980705-3980975 placement
async function awaitMcpServerConnected(e, n) {
  await waitForMcpRow(zY(e, n, (h) => h === void 0 || h.type !== "pending"));
  let found = e.rows().find((h) => h.name === n),
    s = found === void 0;
  return (
    (found && mcpConnectOutcome(found)) ??
    _fe(
      "failed",
      s
        ? `The MCP server "${n}" is not in this session.`
        : `The MCP server "${n}" did not connect within ${WY()}ms.`,
    )
  );
}
//@ chunk-e6aww6q8.js:3980975-3981064 placement
var c0n = (e) => ({
  isAnswered: !1,
  reason: "api-error",
  status: e.status,
  error: e.kind,
  usage: freeze_10_2,
});
//@ chunk-e6aww6q8.js:3981064-3981077 placement
var RXr = 1024;

export {
  awaitMcpServerConnected,
  _fe,
  connectMcpServerForPlugin,
  c0n,
  RXr,
  qY,
  mcpCallForPlugin,
  mcpConnectForPlugin,
  mcpConnectOutcome,
};
