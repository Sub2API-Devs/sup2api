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
import { HOOK_EVENT_NAMES, WS } from "./hookEventSets.js";
import { HostScoped } from "../hostScoped.js";
import { onProcessRootHost, onHookStoresChanged } from "../../bootstrap/state.js";
import { KSr, releasePidFromCgroup } from "../toolCgroup.js";
import { logForDebugging } from "../debug.js";

//@ chunk-s61vbvea.js:306943-307241 placement
function isMcpServerBackingToolHook(e) {
  for (let { event: event, hook: hook } of getAllSessionHookEntries())
    if (!HOOK_EVENT_NAMES.has(event) && hook.type === "mcp_tool" && hook.server === e) return !0;
  for (let n of WS()) {
    if (!n) continue;
    for (let [r, s] of Object.entries(n)) {
      if (HOOK_EVENT_NAMES.has(r) || !s) continue;
      for (let h of s) for (let y of h.hooks ?? []) if (y.type === "mcp_tool" && y.server === e) return !0;
    }
  }
  return !1;
}
//@ chunk-s61vbvea.js:307241-307251 placement
var FD = 64;
//@ chunk-s61vbvea.js:307251-307360 placement
class KS {
  servers = [];
  unsubscribe = void 0;
  clear() {
    ((this.servers = []), this.unsubscribe?.(), (this.unsubscribe = void 0));
  }
}
//@ chunk-s61vbvea.js:307360-307385 placement
var HD = new HostScoped(() => new KS());
//@ chunk-s61vbvea.js:307385-307413 placement
function df() {
  return onProcessRootHost(HD);
}
//@ chunk-s61vbvea.js:307413-307807 placement
function releaseMcpToolCgroup(e, n, r = KSr) {
  try {
    let s = df();
    s.unsubscribe ??= onHookStoresChanged(recheckMcpCgroupRelease);
    let starttime = r.readStarttime(n);
    if (starttime === void 0) return;
    if ((ff(s), isMcpServerBackingToolHook(e) && releasePidFromCgroup(n, starttime, r))) return;
    if (s.servers.length >= FD) {
      let y = releasePidFromCgroup(n, starttime, r);
      logForDebugging(
        `tool cgroup: mcp pid ${n} not tracked (full); ${y ? "released instead" : "release refused"}`,
      );
      return;
    }
    s.servers.push({ name: e, pid: n, starttime: starttime, fs: r });
  } catch (error) {
    logForDebugging(`tool cgroup: mcp pid ${n} not tracked (${error})`);
  }
}
//@ chunk-s61vbvea.js:307807-307982 placement
function recheckMcpCgroupRelease() {
  try {
    let e = df();
    (ff(e),
      (e.servers = e.servers.filter(
        (server) =>
          !(
            isMcpServerBackingToolHook(server.name) &&
            releasePidFromCgroup(server.pid, server.starttime, server.fs)
          ),
      )));
  } catch (error) {
    logForDebugging(`tool cgroup: mcp release recheck skipped (${error})`);
  }
}
/**
 * 在 hook 触发时释放对应 MCP 服务器占用的 cgroup。
 */
//@ chunk-s61vbvea.js:307982-308373 placement
function releaseMcpCgroupAtHookFire(e, n) {
  if (HOOK_EVENT_NAMES.has(n)) return;
  try {
    let r = df();
    if (!r.servers.some((server) => server.name === e)) return;
    (ff(r),
      (r.servers = r.servers.filter((server) => {
        if (server.name !== e) return !0;
        let h = releasePidFromCgroup(server.pid, server.starttime, server.fs);
        return (
          logForDebugging(
            `tool cgroup: mcp server backing a ${n} hook was still capped at fire time; ${h ? "released now" : "release refused"}`,
          ),
          !h
        );
      })));
  } catch (error) {
    logForDebugging(`tool cgroup: mcp release at hook fire skipped (${error})`);
  }
}
//@ chunk-s61vbvea.js:308373-308461 placement
function ff(e) {
  e.servers = e.servers.filter((server) => server.fs.readStarttime(server.pid) === server.starttime);
}

export { isMcpServerBackingToolHook, releaseMcpToolCgroup, releaseMcpCgroupAtHookFire };
