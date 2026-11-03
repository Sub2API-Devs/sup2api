/**
 * utils/hooks/sessionHooks.ts
 *
 * 已有模块；g2 补充放置声明
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/hooks/sessionHooks.ts
 * pieces: chunk-f9asxqh1.js (7), chunk-gvva3ecm.js (4), chunk-s61vbvea.js (2)
 * attribution: sole-consumer 1, affinity 2, fingerprint 2, layout 3, placement 3, callgraph-fingerprint 2
 */
import { isHookEqual } from "./hooksSettings.js";
import { emitHookStoresChanged, onProcessRootHost } from "../../bootstrap/state.js";
import { logForDebugging } from "../debug.js";
import { HOOK_EVENTS } from "../../entrypoints/sdk/coreSchemas.js";
import { HostScoped } from "../hostScoped.js";
import { propagateAbort, liveWeakRefs } from "../diagLogs.js";
import { WS } from "./hookEventSets.js";

//@ chunk-f9asxqh1.js:4888-5098 sole-consumer = convertToHookMatchers (0.77)
function convertToHookMatchers(sessionMatchers) {
  return sessionMatchers.map((sm) => ({
    matcher: sm.matcher,
    skillRoot: sm.skillRoot,
    ...(sm.personal === !0 && { personal: !0 }),
    ...(sm.checkout === !0 && { checkout: !0 }),
    hooks: sm.hooks.map((hook) => hook.hook).filter((s) => s.type !== "function"),
  }));
}
//@ chunk-f9asxqh1.js:5098-5248 affinity = convertToHookMatchers (0.839)
function convertToHookMatchers_2(sessionMatchers) {
  return sessionMatchers
    .map((sm) => ({
      matcher: sm.matcher,
      hooks: sm.hooks.map((hook) => hook.hook).filter((s) => s.type === "function"),
    }))
    .filter((n) => n.hooks.length > 0);
}
/**
 * 会话钩子注册表：按会话 id、事件、matcher（+skillRoot/personal/checkout）存放钩子；add/addFunctionHook/remove/clear/get/getFunctionHooks/getEntry/has。旧版名 addHookToSession 配错（那是方法名）。
 */
//@ chunk-f9asxqh1.js:5248-7419 fingerprint = addHookToSession (0.467)
class SessionHooksRegistry {
  sessions = new Map();
  draws = new Map();
  skillDraws(e) {
    let n = this.draws.get(e) ?? new Map();
    return (this.draws.set(e, n), n);
  }
  add(e, n, s, r, f) {
    this.addEntry(e, n, s, r, f?.onHookSuccess, f?.skillRoot, f?.personal === !0, f?.checkout === !0);
  }
  addFunctionHook(e, n, s, r, f, y) {
    let S = y?.id || `function-hook-${Date.now()}-${Math.random()}`,
      h = { type: "function", id: S, timeout: y?.timeout || 5000, callback: r, errorMessage: f };
    return (this.addEntry(e, n, s, h, void 0, void 0, !1, !1), S);
  }
  addEntry(e, n, s, r, f, y, S, h) {
    let w = this.sessions.get(e) ?? { hooks: {} },
      b = w.hooks[n] || [],
      index = b.findIndex(
        (H) => H.matcher === s && H.skillRoot === y && (H.personal === !0) === S && (H.checkout === !0) === h,
      ),
      C;
    if (index >= 0) {
      C = [...b];
      let H = C[index],
        index_2 = H.hooks.findIndex((hook) =>
          r.type === "function"
            ? Boolean(r.id) && hook.hook.type === "function" && hook.hook.id === r.id
            : isHookEqual(hook.hook, r),
        ),
        O =
          index_2 >= 0
            ? H.hooks.with(index_2, { ...H.hooks[index_2], hook: r })
            : [...H.hooks, { hook: r, onHookSuccess: f }];
      C[index] = { ...H, hooks: O };
    } else
      C = [
        ...b,
        {
          matcher: s,
          skillRoot: y,
          ...(S && { personal: !0 }),
          ...(h && { checkout: !0 }),
          hooks: [{ hook: r, onHookSuccess: f }],
        },
      ];
    (this.sessions.set(e, { hooks: { ...w.hooks, [n]: C } }),
      trackSessionHookRegistry(this.sessions),
      emitHookStoresChanged(),
      logForDebugging(`Added session hook for event ${n} in session ${e}`));
  }
  remove(e, n, s, r) {
    let f = this.sessions.get(e);
    if (f) {
      let filtered = (f.hooks[n] || [])
          .map((w) => {
            if (r !== void 0 && w.skillRoot !== r.skillRoot) return w;
            let filtered = w.hooks.filter((hook) => !isHookEqual(hook.hook, s));
            return filtered.length > 0 ? { ...w, hooks: filtered } : null;
          })
          .filter((w) => w !== null),
        h = filtered.length > 0 ? { ...f.hooks, [n]: filtered } : { ...f.hooks };
      if (filtered.length === 0) delete h[n];
      (this.sessions.set(e, { ...f, hooks: h }), emitHookStoresChanged());
    }
    logForDebugging(`Removed session hook for event ${n} in session ${e}`);
  }
  clear(e) {
    (this.sessions.delete(e),
      this.draws.delete(e),
      emitHookStoresChanged(),
      logForDebugging(`Cleared all session hooks for session ${e}`));
  }
  get(e, n) {
    let s = new Map(),
      r = this.sessions.get(e);
    if (!r) return s;
    for (let f of n ? [n] : HOOK_EVENTS) {
      let y = r.hooks[f];
      if (y) s.set(f, convertToHookMatchers(y));
    }
    return s;
  }
  getFunctionHooks(e, n) {
    let s = new Map(),
      r = this.sessions.get(e);
    if (!r) return s;
    for (let f of n ? [n] : HOOK_EVENTS) {
      let y = r.hooks[f];
      if (y) {
        let S = convertToHookMatchers_2(y);
        if (S.length > 0) s.set(f, S);
      }
    }
    return s;
  }
  getEntry(e, n, s, r, f) {
    let y = this.sessions.get(e)?.hooks[n];
    if (!y) return;
    for (let S of y)
      if ((S.matcher === s || s === "") && S.skillRoot === f.skillRoot) {
        let found = S.hooks.find((hook) => isHookEqual(hook.hook, r));
        if (found) return found;
      }
    return;
  }
  has(e, n) {
    return this.sessions.get(e)?.hooks[n] !== void 0;
  }
}
//@ chunk-f9asxqh1.js:7419-7445 layout
var sessionHookRegistriesByHost = new HostScoped(() => new Set());
//@ chunk-f9asxqh1.js:7445-7472 layout
function getSessionHookRegistries() {
  return onProcessRootHost(sessionHookRegistriesByHost);
}
//@ chunk-f9asxqh1.js:7472-7498 layout
function trackSessionHookRegistry(e) {
  propagateAbort(getSessionHookRegistries(), e);
}
/**
 * 遍历所有会话注册表，列出全部非 function 会话钩子 {event, hook, skillRoot}。
 */
//@ chunk-f9asxqh1.js:7498-7717 fingerprint = convertToHookMatchers (0.853)
function getAllSessionHookEntries() {
  let e = [];
  for (let n of liveWeakRefs(getSessionHookRegistries()))
    for (let s of n.values())
      for (let r of HOOK_EVENTS)
        for (let f of s.hooks[r] ?? [])
          for (let { hook: hook } of f.hooks)
            if (hook.type !== "function") e.push({ event: r, hook: hook, skillRoot: f.skillRoot });
  return e;
}
//@ chunk-gvva3ecm.js:191-209 placement
var weakMap = new WeakMap();
//@ chunk-gvva3ecm.js:209-231 placement
var n6e = (o) => weakMap.get(o);
//@ chunk-gvva3ecm.js:231-375 placement
function getSessionFunctionHooks(o) {
  let flattened = Object.values(o ?? {}).flatMap((sessionMatchers) =>
      (sessionMatchers ?? []).flatMap((sm) => (sm.hooks ?? []).map(n6e)),
    ),
    [e] = flattened;
  return flattened.every((r) => r === e) ? e : void 0;
}
/**
 * 记录每个钩子对象的来源（WeakMap），供后续判定归属。
 */
//@ chunk-gvva3ecm.js:375-499 callgraph-fingerprint = removeSessionHook (0.172)
function tagHooksWithSource(o, t) {
  if (t === void 0) return;
  for (let e of Object.values(o)) for (let r of e ?? []) for (let s of r.hooks ?? []) weakMap.set(s, t);
}
//@ chunk-s61vbvea.js:306347-306638 affinity
var MCP_TOOL_GUARD_EVENTS = new Set([
  "UserPromptSubmit",
  "UserPromptExpansion",
  "PreToolUse",
  "PermissionRequest",
  "PermissionDenied",
  "PostToolUse",
  "PostToolUseFailure",
  "PostToolBatch",
  "SubagentStart",
  "SubagentStop",
  "TaskCreated",
  "TaskCompleted",
  "Elicitation",
  "ElicitationResult",
  "WorktreeCreate",
  "WorktreeRemove",
]);
/**
 * 收集 mcp_tool 钩子引用的 MCP 服务器名（守卫类事件），会话钩子与各 settings 一起统计。
 */
//@ chunk-s61vbvea.js:306638-306943 callgraph-fingerprint = getSessionHooks (0.251)
function getMcpServersReferencedByHooks() {
  let result = new Set();
  for (let { event: event, hook: hook } of getAllSessionHookEntries())
    if (MCP_TOOL_GUARD_EVENTS.has(event) && hook.type === "mcp_tool") result.add(hook.server);
  for (let n of WS()) {
    if (!n) continue;
    for (let [r, s] of Object.entries(n)) {
      if (!MCP_TOOL_GUARD_EVENTS.has(r)) continue;
      for (let h of s ?? [])
        for (let y of h.hooks ?? []) if (y.type === "mcp_tool" && y.server) result.add(y.server);
    }
  }
  return result;
}

export {
  tagHooksWithSource,
  n6e,
  getSessionFunctionHooks,
  getSessionHookRegistries,
  SessionHooksRegistry,
  getAllSessionHookEntries,
  getMcpServersReferencedByHooks,
};
