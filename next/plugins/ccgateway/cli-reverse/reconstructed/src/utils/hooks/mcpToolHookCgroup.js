/**
 * utils/hooks/mcpToolHookCgroup.ts
 *
 * MCP 工具钩子 cgroup 释放（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (9)
 * attribution: placement 9
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getAllSessionHookEntries } from "./sessionHooks.js";
import { HOOK_EVENT_NAMES, collectAllHookSnapshots } from "./hookEventSets.js";
import { HostScoped } from "../hostScoped.js";
import { onProcessRootHost, onHookStoresChanged } from "../../bootstrap/state.js";
import { CGROUP_IO_DEPS, releasePidFromCgroup } from "../toolCgroup.js";
import { logForDebugging } from "../debug.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-7jxyna5q.js:230370-230668 placement
function isMcpServerBackingToolHook(name) {
  for (let { event, hook } of getAllSessionHookEntries())
    if (!HOOK_EVENT_NAMES.has(event) && hook.type === "mcp_tool" && hook.server === name) return true;
  for (let snapshot of collectAllHookSnapshots()) {
    if (!snapshot) continue;
    for (let [key, value] of Object.entries(snapshot)) {
      if (HOOK_EVENT_NAMES.has(key) || !value) continue;
      for (let matchers of value)
        for (let hook of matchers.hooks ?? [])
          if (hook.type === "mcp_tool" && hook.server === name) return true;
    }
  }
  return false;
}
//@ chunk-7jxyna5q.js:230668-230678 placement
var MAX_TRACKED_MCP_SERVERS = 64;
//@ chunk-7jxyna5q.js:230678-230787 placement
class McpCgroupState {
  servers = [];
  unsubscribe = undefined;
  clear() {
    this.servers = [];
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }
}
//@ chunk-7jxyna5q.js:230787-230812 placement
var mcpCgroupRegistry; // deferred: uses McpCgroupState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7jxyna5q.js:230787", () => {
  mcpCgroupRegistry = new HostScoped(() => new McpCgroupState());
});
//@ chunk-7jxyna5q.js:230812-230840 placement
function currentMcpCgroupState() {
  return onProcessRootHost(mcpCgroupRegistry);
}
//@ chunk-7jxyna5q.js:230840-231234 placement
function releaseMcpToolCgroup(name, pid, deps = CGROUP_IO_DEPS) {
  try {
    let state = currentMcpCgroupState();
    state.unsubscribe ??= onHookStoresChanged(recheckMcpCgroupRelease);
    let starttime = deps.readStarttime(pid);
    if (starttime === undefined) return;
    pruneDeadServers(state);
    if (isMcpServerBackingToolHook(name) && releasePidFromCgroup(pid, starttime, deps)) return;
    if (state.servers.length >= MAX_TRACKED_MCP_SERVERS) {
      let released = releasePidFromCgroup(pid, starttime, deps);
      logForDebugging(
        `tool cgroup: mcp pid ${pid} not tracked (full); ${released ? "released instead" : "release refused"}`,
      );
      return;
    }
    state.servers.push({
      name,
      pid,
      starttime,
      fs: deps,
    });
  } catch (error) {
    logForDebugging(`tool cgroup: mcp pid ${pid} not tracked (${error})`);
  }
}
//@ chunk-7jxyna5q.js:231234-231409 placement
function recheckMcpCgroupRelease() {
  try {
    let state = currentMcpCgroupState();
    pruneDeadServers(state);
    state.servers = state.servers.filter(
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
//@ chunk-7jxyna5q.js:231409-231800 placement
/**
 * 在 hook 触发时释放对应 MCP 服务器占用的 cgroup。
 */
function releaseMcpCgroupAtHookFire(server, hook) {
  if (HOOK_EVENT_NAMES.has(hook)) return;
  try {
    let state = currentMcpCgroupState();
    if (!state.servers.some((server_2) => server_2.name === server)) return;
    pruneDeadServers(state);
    state.servers = state.servers.filter((server_2) => {
      if (server_2.name !== server) return true;
      let released = releasePidFromCgroup(server_2.pid, server_2.starttime, server_2.fs);
      logForDebugging(
        `tool cgroup: mcp server backing a ${hook} hook was still capped at fire time; ${released ? "released now" : "release refused"}`,
      );
      return !released;
    });
  } catch (error) {
    logForDebugging(`tool cgroup: mcp release at hook fire skipped (${error})`);
  }
}
//@ chunk-7jxyna5q.js:231800-231888 placement
function pruneDeadServers(state) {
  state.servers = state.servers.filter((server) => server.fs.readStarttime(server.pid) === server.starttime);
}
export { isMcpServerBackingToolHook, releaseMcpToolCgroup, releaseMcpCgroupAtHookFire };
