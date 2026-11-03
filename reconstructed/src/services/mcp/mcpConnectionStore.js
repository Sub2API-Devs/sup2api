/**
 * services/mcp/mcpConnectionStore.ts
 *
 * 2.1.316 新增：MCP 连接状态存储。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kvr3v8w9.js (13)
 * attribution: placement 13
 */
import { oa } from "../../types/ids.js";
import { zj } from "../../../vendor/lodash-es/reject.js";
import { commandBelongsToServer, excludeStalePluginClients } from "./utils.js";
import { omitKeys } from "../../utils/hooks/hookCommandResolution.js";
import { wIe } from "../../state/sliceHelpers.js";
import {
  markClientNeedsAuth,
  setMcpClientInAppState,
  redecorateTools,
  replaceServerTools,
  withMcpConfig,
} from "./mcpClientState.js";
import { withConfigScope, decorateMcpTools, stampToolScope } from "./mcpToolDecoration.js";
import { ir } from "./client.js";
import { isMcpServerDisabled, mcpDialBlockCause, suppressedConnectorsEqual } from "./config.js";
import { logMCPDebug } from "../../utils/log.js";
import { getMcpPrefix, isToolFromMcpServer } from "./mcpStringUtils.js";
import { isRemoteMcpTransport } from "./discoveryIdentity.js";
import { isConnectedOrCached } from "../../skills/bundled/scheduleRemoteAgents.js";
import { mcpGateError } from "./mcpToggleMessages.js";
import { fd } from "./mcpAccountKey.js";
import { checkMcpServerHealth_2 } from "../../cli/handlers/mcp.js";
import { SS } from "../../../vendor/lodash-es/_inlinedHelpers.js";

//@ chunk-kvr3v8w9.js:646-715 placement
function f() {
  return require("./chunk-asne9cp8.js").mcpClientModule();
}
//@ chunk-kvr3v8w9.js:715-809 placement
function v(n) {
  ((oa(n.client).onclose = void 0),
    f()
      .clearServerCache(n.name, n.config)
      .catch(() => {}));
}
//@ chunk-kvr3v8w9.js:809-989 placement
function withoutServerEntries(n, t, i) {
  return {
    tools: zj(n.tools, (e) => e.name?.startsWith(i)),
    commands: zj(n.commands, (e) => commandBelongsToServer(e, t)),
    resources: omitKeys(n.resources, t),
    resourceTemplates: omitKeys(n.resourceTemplates, t),
  };
}
/**
 * AppState.mcp 的连接状态存储：标记/清除 needs-auth、收编连接结果（检查同名配置、禁用、策略阻止）、替换工具列表、维护被抑制的连接器与保留名拒绝、加入待连接服务器、按配置调和、身份边界时重置受影响服务器，以及批量应用排队的连接结果。
 */
//@ chunk-kvr3v8w9.js:989-6346 placement
class McpConnectionStore {
  #e;
  constructor(n) {
    this.#e = n;
  }
  static over(n) {
    return new McpConnectionStore(wIe(n.getState, n.setState, "mcp"));
  }
  get() {
    return this.#e.get();
  }
  markNeedsAuth(n) {
    this.#e.set((t) => markClientNeedsAuth(t, n));
  }
  async clearNeedsAuth(n) {
    let found = this.get().clients.find((client) => client.name === n);
    if (found?.type !== "needs-auth") return;
    let peekSettledConnection = await f().peekSettledConnection(n, found.config);
    if (peekSettledConnection?.type !== "connected") return;
    this.#e.set((e) => ({
      ...e,
      clients: e.clients.map((client) =>
        client === found ? withConfigScope(peekSettledConnection, found.config) : client,
      ),
    }));
  }
  adoptServer(n, t, i) {
    let e = "adopted";
    return (
      this.#e.set((s) => {
        if (i?.asked === !0) return setMcpClientInAppState({ mcp: s }, n, t).mcp;
        let found = s.clients.find((client) => client.name === n);
        if (((e = adoptRefusal(found, t) ?? "adopted"), found === void 0)) return s;
        if (e !== "adopted") return applyRefusalToRow(s, found, e);
        return setMcpClientInAppState({ mcp: s }, n, rebindAdoption(found, t), { appendIfAbsent: !1 }).mcp;
      }),
      e
    );
  }
  markReconnectDiscarded(n, t) {
    this.#e.set((i) => {
      let found = i.clients.find((client) => client.name === n);
      if (found === void 0 || ir(n, found.config) !== ir(n, t)) return i;
      if (isMcpServerDisabled(n)) return applyRefusalToRow(i, found, "disabled");
      if (mcpDialBlockCause(n, found.config) !== null) return applyRefusalToRow(i, found, "policy-blocked");
      if (found.type !== "connected") return i;
      return {
        ...i,
        clients: i.clients.map((client) =>
          client === found
            ? {
                name: n,
                type: "failed",
                config: found.config,
                error: "Its connection was closed while signing in again",
              }
            : client,
        ),
        ...withoutServerItems(i, n),
      };
    });
  }
  swapServerTools(n, t, i) {
    let e = !1;
    return (
      this.#e.set((s) => {
        let r = redecorateTools(
          s.clients.find((client) => client.name === n),
          t,
          i,
        );
        if (r === void 0)
          return (logMCPDebug(n, "A re-queried tool list was not applied: another server holds the name"), s);
        let c = replaceServerTools({ mcp: s }, n, r);
        return ((e = c.mcp !== s), c.mcp);
      }),
      e
    );
  }
  setSuppressedClaudeAiConnectors(n) {
    this.#e.set((t) =>
      suppressedConnectorsEqual(t.suppressedClaudeAiConnectors ?? [], n)
        ? t
        : { ...t, suppressedClaudeAiConnectors: n },
    );
  }
  setReservedNameRefusals(n) {
    this.#e.set((t) => {
      let i = t.reservedNameRefusals ?? [];
      return i.length === n.length && i.every((s, r) => s.scope === n[r]?.scope && s.name === n[r]?.name)
        ? t
        : { ...t, reservedNameRefusals: n };
    });
  }
  addPendingServers(n) {
    this.#e.set((t) => {
      let i = pendingRowsFor(t, n);
      if (i.length === 0) return t;
      return { ...t, clients: [...t.clients, ...i] };
    });
  }
  reconcileConfiguredServers(n, t, i) {
    this.#e.set((e) => {
      let { stale: stale, ...r } = excludeStalePluginClients(e, n, t);
      i(stale);
      let c = pendingRowsFor(r, n);
      if (c.length === 0 && stale.length === 0) {
        if (e.clientsInitialized) return e;
        return { ...e, clientsInitialized: !0 };
      }
      return { ...e, ...r, clientsInitialized: !0, clients: [...r.clients, ...c] };
    });
  }
  applyIdentityBoundary(n, t) {
    let i = [...n, ...t];
    if (i.length === 0) return;
    this.#e.set((e) => {
      let mapped = i.map((c) => [c, getMcpPrefix(c)]),
        r = (c) => mapped.some(([l, u]) => isToolFromMcpServer(c, l, u));
      return {
        ...e,
        clients: e.clients.flatMap((client) =>
          t.has(client.name)
            ? []
            : n.has(client.name)
              ? [{ name: client.name, type: "pending", config: client.config }]
              : [client],
        ),
        tools: zj(e.tools, r),
        commands: zj(e.commands, (c) => i.some((l) => commandBelongsToServer(c, l))),
        resources: omitKeys(e.resources, i),
        resourceTemplates: omitKeys(e.resourceTemplates, i),
      };
    });
  }
  applyQueuedUpdates(n, t) {
    this.#e.set((i) => {
      let e = i;
      for (let s of n) {
        if (s.epoch !== t.currentEpoch && isRemoteMcpTransport(s.config)) {
          if (s.type === "connected") f().detachAndCloseConnection(s);
          continue;
        }
        let found = e.clients.find((client) => client.name === s.name),
          c = rowRelation(found, s),
          l = c === "stands" && found !== void 0 ? rebindToRowConfig(found, s) : s,
          {
            tools: tools,
            commands: commands,
            resources: resources,
            resourceTemplates: resourceTemplates,
            replaceOnly: replaceOnly,
            epoch: epoch,
            asked: asked,
            superseded: superseded,
            ...U
          } = l,
          o = U,
          h = o.type === "disabled" || o.type === "failed",
          b = h ? (tools ?? []) : tools,
          T = h ? (commands ?? []) : commands,
          C = h ? (resources ?? []) : resources,
          y = h ? (resourceTemplates ?? []) : resourceTemplates,
          M = getMcpPrefix(o.name),
          index = e.clients.findIndex((client) => client.name === o.name),
          a = index !== -1 ? e.clients[index] : void 0,
          Q = o.type === "connected" && a?.type === "connected" && a.client === o.client,
          R = isConnectedOrCached(o) && mcpDialBlockCause(o.name, o.config) === "managed-policy";
        if (o.type !== "disabled" && !Q && isMcpServerDisabled(o.name) && !(R && a?.type !== "disabled")) {
          if (R) t.onDoorDenied(o.name);
          if (o.type === "connected") v(o);
          if (
            (t.onOrphanedDisable(o.name),
            a && a.type !== "disabled" && (a.type !== "connected" || !isConnectedOrCached(o)))
          )
            e = {
              ...e,
              clients: e.clients.map((client) =>
                client.name === o.name
                  ? { name: o.name, type: "disabled", config: c === "elsewhere" ? client.config : o.config }
                  : client,
              ),
              ...withoutServerEntries(e, o.name, M),
            };
          continue;
        }
        if (c === "elsewhere" && a !== void 0) {
          if (o.type !== "disabled") {
            if (o.type === "connected") v(o);
            logMCPDebug(o.name, `A late ${o.type} result was dropped: another server holds the name`);
            continue;
          }
          if (a.type === "connected") v(a);
          o = { name: o.name, type: "disabled", config: a.config };
        }
        let k = isConnectedOrCached(o) ? mcpDialBlockCause(o.name, o.config) : null;
        if (k) {
          t.onDoorDenied(o.name);
          let config = o.config;
          if (o.type === "connected") oa(o.client).onclose = void 0;
          else if (a?.type === "connected") ((oa(a.client).onclose = void 0), (config = a.config));
          if (
            (f()
              .clearServerCache(o.name, config)
              .catch(() => {}),
            index === -1)
          )
            continue;
          e = {
            ...e,
            clients: e.clients.map((client) =>
              client.name === o.name
                ? { name: o.name, type: "failed", config: o.config, ...mcpGateError(k, o.name, o.config) }
                : client,
            ),
            ...withoutServerEntries(e, o.name, M),
          };
          continue;
        }
        if (
          replaceOnly &&
          index !== -1 &&
          (e.clients[index]?.type === "needs-auth" || e.clients[index]?.type === "disabled")
        ) {
          if (o.type === "connected")
            ((oa(o.client).onclose = void 0),
              f()
                .clearServerCache(o.name, o.config)
                .catch(() => {}));
          continue;
        }
        if (index === -1 && (replaceOnly || (c === "nowhere" && !superseded))) {
          if (o.type === "connected")
            ((oa(o.client).onclose = void 0),
              f()
                .clearServerCache(o.name, o.config)
                .catch(() => {}));
          if (!replaceOnly)
            (t.onOrphanedDisable(o.name),
              logMCPDebug(o.name, `A late ${o.type} result was dropped: no row holds the name`));
          continue;
        }
        if (
          replaceOnly &&
          fd() &&
          index !== -1 &&
          ir(o.name, e.clients[index].config) !== ir(o.name, o.config)
        ) {
          if (o.type === "connected") f().detachAndCloseConnection(o);
          continue;
        }
        if (index !== -1 && !checkMcpServerHealth_2(e.clients[index], o)) {
          if (c === "asked") e = refreshRowConfig(e, o);
          continue;
        }
        let j =
            index === -1
              ? [...e.clients, o]
              : e.clients.map((client) => (client.name === o.name ? o : client)),
          B = b === void 0 ? e.tools : [...zj(e.tools, (d) => d.name?.startsWith(M)), ...b],
          E = T === void 0 ? e.commands : [...zj(e.commands, (d) => commandBelongsToServer(d, o.name)), ...T],
          F =
            C === void 0
              ? e.resources
              : C.length > 0
                ? { ...e.resources, [o.name]: C }
                : omitKeys(e.resources, o.name),
          z =
            y === void 0
              ? e.resourceTemplates
              : y.length > 0
                ? { ...e.resourceTemplates, [o.name]: y }
                : omitKeys(e.resourceTemplates, o.name);
        e = { ...e, clients: j, tools: B, commands: E, resources: F, resourceTemplates: z };
      }
      return e;
    });
  }
}
//@ chunk-kvr3v8w9.js:6346-6520 placement
function pendingRowsFor(n, t) {
  let i = new Set(n.clients.map((client) => client.name));
  return Object.entries(t)
    .filter(([e]) => !i.has(e))
    .map(([e, s]) => ({ name: e, type: isMcpServerDisabled(e) ? "disabled" : "pending", config: s }));
}
//@ chunk-kvr3v8w9.js:6520-6609 placement = getToolNameForPermissionCheck (1)
function getToolNameForPermissionCheck(n, t) {
  return n.mcpInfo?.serverName === void 0 ? commandBelongsToServer(n, t) : n.mcpInfo.serverName === t;
}
//@ chunk-kvr3v8w9.js:6609-6788 placement
function withoutServerItems(n, t) {
  let i = getMcpPrefix(t);
  return {
    tools: zj(n.tools, (e) => isToolFromMcpServer(e, t, i)),
    commands: zj(n.commands, (e) => getToolNameForPermissionCheck(e, t)),
    resources: omitKeys(n.resources, t),
    resourceTemplates: omitKeys(n.resourceTemplates, t),
  };
}
//@ chunk-kvr3v8w9.js:6788-6934 placement
function rowRelation(n, t) {
  if (t.asked === !0) return "asked";
  if (n === void 0) return "nowhere";
  return ir(t.name, n.config) === ir(t.name, t.config) ? "stands" : "elsewhere";
}
//@ chunk-kvr3v8w9.js:6934-7109 placement
function rebindToRowConfig(n, t) {
  let i = { name: t.name, config: n.config };
  return {
    ...withMcpConfig(t, n.config),
    ...(t.tools !== void 0 && { tools: decorateMcpTools(i, t.tools) }),
    ...(t.commands !== void 0 && { commands: stampToolScope(i, t.commands) }),
  };
}
/**
 * 配置的非身份字段变化时，更新连接行的配置并重新装饰其工具与命令。
 */
//@ chunk-kvr3v8w9.js:7109-7504 placement
function refreshRowConfig(n, t) {
  let found = n.clients.find((client) => client.name === t.name);
  if (found === void 0 || ir(t.name, found.config) !== ir(t.name, t.config)) return n;
  let e = withMcpConfig(found, t.config);
  if (e === found) return n;
  let s = { name: t.name, config: t.config },
    r = getMcpPrefix(t.name),
    [c, l] = SS(n.tools, (m) => isToolFromMcpServer(m, t.name, r)),
    [u, S] = SS(n.commands, (m) => getToolNameForPermissionCheck(m, t.name));
  return {
    ...n,
    clients: n.clients.map((client) => (client === found ? e : client)),
    tools: [...l, ...decorateMcpTools(s, c)],
    commands: [...S, ...stampToolScope(s, u)],
  };
}
//@ chunk-kvr3v8w9.js:7504-7716 placement
function adoptRefusal(n, t) {
  let { name: i } = t.client;
  if (n === void 0) return "no-row";
  if (ir(i, n.config) !== ir(i, t.client.config)) return "another-server";
  if (isMcpServerDisabled(i)) return "disabled";
  if (mcpDialBlockCause(i, n.config) !== null) return "policy-blocked";
  return;
}
/**
 * 把禁用或策略拦截的结果应用到连接行：标记为 disabled，或为策略拦截生成带原因的 failed 状态，并移除其条目。
 */
//@ chunk-kvr3v8w9.js:7716-8039 placement
function applyRefusalToRow(n, t, i) {
  if (i !== "disabled" && i !== "policy-blocked") return n;
  let { name: e, config: config } = t,
    r = i === "policy-blocked" ? mcpDialBlockCause(e, config) : null;
  if (r === null && t.type === "disabled") return n;
  let c =
    r === null
      ? { name: e, type: "disabled", config: config }
      : { name: e, type: "failed", config: config, ...mcpGateError(r, e, config) };
  return {
    ...n,
    clients: n.clients.map((client) => (client === t ? c : client)),
    ...withoutServerItems(n, e),
  };
}
//@ chunk-kvr3v8w9.js:8039-8181 placement
function rebindAdoption(n, t) {
  let i = { name: n.name, config: n.config };
  return {
    ...t,
    client: withMcpConfig(t.client, n.config),
    tools: decorateMcpTools(i, t.tools),
    commands: stampToolScope(i, t.commands),
  };
}

export { McpConnectionStore, getToolNameForPermissionCheck };
