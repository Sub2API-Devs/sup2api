/**
 * utils/hooks/mcpToolHookCgroup.ts
 *
 * MCP 工具钩子 cgroup 释放（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (9)
 * attribution: placement 9
 */
import { getAllSessionHookEntries } from "./sessionHooks.js";
import { HOOK_EVENT_NAMES, collectAllHookSnapshots } from "./hookEventSets.js";
import { HostScoped } from "../hostScoped.js";
import { onProcessRootHost, onHookStoresChanged } from "../../bootstrap/state.js";
import { CGROUP_IO_DEPS, releasePidFromCgroup } from "../toolCgroup.js";
import { logForDebugging } from "../debug.js";

//@ chunk-s61vbvea.js:306943-307241 placement
function isMcpServerBackingToolHook(name) {
  for (let { event, hook } of getAllSessionHookEntries())
    if (!HOOK_EVENT_NAMES.has(event) && hook.type === "mcp_tool" && hook.server === name) return true;
  for (let n of collectAllHookSnapshots()) {
    if (!n) continue;
    for (let [key, value] of Object.entries(n)) {
      if (HOOK_EVENT_NAMES.has(key) || !value) continue;
      for (let h of value)
        for (let y of h.hooks ?? []) if (y.type === "mcp_tool" && y.server === name) return true;
    }
  }
  return false;
}
//@ chunk-s61vbvea.js:307241-307251 placement
var MAX_TRACKED_MCP_SERVERS = 64;
//@ chunk-s61vbvea.js:307251-307360 placement
class McpCgroupState {
  servers = [];
  unsubscribe = undefined;
  clear() {
    this.servers = [];
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }
}
//@ chunk-s61vbvea.js:307360-307385 placement
var mcpCgroupRegistry = new HostScoped(() => new McpCgroupState());
//@ chunk-s61vbvea.js:307385-307413 placement
function currentMcpCgroupState() {
  return onProcessRootHost(mcpCgroupRegistry);
}
//@ chunk-s61vbvea.js:307413-307807 placement
function releaseMcpToolCgroup(name, pid, r = CGROUP_IO_DEPS) {
  try {
    let s = currentMcpCgroupState();
    s.unsubscribe ??= onHookStoresChanged(recheckMcpCgroupRelease);
    let starttime = r.readStarttime(pid);
    if (starttime === undefined) return;
    pruneDeadServers(s);
    if (isMcpServerBackingToolHook(name) && releasePidFromCgroup(pid, starttime, r)) return;
    if (s.servers.length >= MAX_TRACKED_MCP_SERVERS) {
      let y = releasePidFromCgroup(pid, starttime, r);
      logForDebugging(
        `tool cgroup: mcp pid ${pid} not tracked (full); ${y ? "released instead" : "release refused"}`,
      );
      return;
    }
    s.servers.push({
      name,
      pid,
      starttime,
      fs: r,
    });
  } catch (error) {
    logForDebugging(`tool cgroup: mcp pid ${pid} not tracked (${error})`);
  }
}
//@ chunk-s61vbvea.js:307807-307982 placement
function recheckMcpCgroupRelease() {
  try {
    let e = currentMcpCgroupState();
    pruneDeadServers(e);
    e.servers = e.servers.filter(
      (server) =>
        !(
          isMcpServerBackingToolHook(server.name) &&
          releasePidFromCgroup(server.pid, server.starttime, server.fs)
        ),
    );
  } catch (error) {
    logForDebugging(`tool cgroup: mcp release recheck skipped (${error})`);
  }
}
//@ chunk-s61vbvea.js:307982-308373 placement
/**
 * 在 hook 触发时释放对应 MCP 服务器占用的 cgroup。
 */
function releaseMcpCgroupAtHookFire(server, hookEvent) {
  if (HOOK_EVENT_NAMES.has(hookEvent)) return;
  try {
    let r = currentMcpCgroupState();
    if (!r.servers.some((server_2) => server_2.name === server)) return;
    pruneDeadServers(r);
    r.servers = r.servers.filter((server_2) => {
      if (server_2.name !== server) return true;
      let h = releasePidFromCgroup(server_2.pid, server_2.starttime, server_2.fs);
      logForDebugging(
        `tool cgroup: mcp server backing a ${hookEvent} hook was still capped at fire time; ${h ? "released now" : "release refused"}`,
      );
      return !h;
    });
  } catch (error) {
    logForDebugging(`tool cgroup: mcp release at hook fire skipped (${error})`);
  }
}
//@ chunk-s61vbvea.js:308373-308461 placement
function pruneDeadServers(e) {
  e.servers = e.servers.filter((server) => server.fs.readStarttime(server.pid) === server.starttime);
}
export { isMcpServerBackingToolHook, releaseMcpToolCgroup, releaseMcpCgroupAtHookFire };
