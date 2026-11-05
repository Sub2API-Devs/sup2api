/**
 * utils/hooks/sessionHooks.ts
 *
 * 已有模块；g2 补充放置声明
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/hooks/sessionHooks.ts
 * pieces: chunk-7jxyna5q.js (2), chunk-9mafwvrf.js (4), chunk-q1gbn2mn.js (7)
 * attribution: affinity 2, callgraph-fingerprint 2, placement 3, sole-consumer 1, fingerprint 2, layout 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isHookEqual } from "./hooksSettings.js";
import { emitHookStoresChanged, onProcessRootHost } from "../../bootstrap/state.js";
import { logForDebugging } from "../debug.js";
import { HOOK_EVENTS } from "../../entrypoints/sdk/coreSchemas.js";
import { HostScoped } from "../hostScoped.js";
import { propagateAbort, liveWeakRefs } from "../diagLogs.js";
import { collectAllHookSnapshots } from "./hookEventSets.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-9mafwvrf.js:191-209 placement
var weakMap; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-9mafwvrf.js:191", () => {
  weakMap = new WeakMap();
});
//@ chunk-9mafwvrf.js:209-231 placement
/**
 * 从弱映射取会话钩子的来源标记。
 */
var hookSourceOf = (hook) => weakMap.get(hook);
//@ chunk-9mafwvrf.js:231-375 placement
function getSessionFunctionHooks(hooks) {
  let flattened = Object.values(hooks ?? {}).flatMap((sessionMatchers) =>
    (sessionMatchers ?? []).flatMap((sm) => (sm.hooks ?? []).map(hookSourceOf)),
  );
  let [firstSource] = flattened;
  return flattened.every((source) => source === firstSource) ? firstSource : undefined;
}
//@ chunk-9mafwvrf.js:375-499 callgraph-fingerprint (2.1.88 match: removeSessionHook, 0.173)
/**
 * 记录每个钩子对象的来源（WeakMap），供后续判定归属。
 */
function tagHooksWithSource(hooks, source) {
  if (source === undefined) return;
  for (let matchers of Object.values(hooks))
    for (let sessionMatcher of matchers ?? [])
      for (let hook of sessionMatcher.hooks ?? []) weakMap.set(hook, source);
}
//@ chunk-q1gbn2mn.js:4992-5202 sole-consumer (2.1.88 match: convertToHookMatchers, 0.769)
function convertToHookMatchers(sessionMatchers) {
  return sessionMatchers.map((sm) => ({
    matcher: sm.matcher,
    skillRoot: sm.skillRoot,
    ...(sm.personal === true && {
      personal: true,
    }),
    ...(sm.checkout === true && {
      checkout: true,
    }),
    hooks: sm.hooks.map((hook) => hook.hook).filter((hook) => hook.type !== "function"),
  }));
}
//@ chunk-q1gbn2mn.js:5202-5352 affinity (2.1.88 match: convertToHookMatchers, 0.839)
function convertToHookMatchers_2(sessionMatchers) {
  return sessionMatchers
    .map((sm) => ({
      matcher: sm.matcher,
      hooks: sm.hooks.map((hook) => hook.hook).filter((hook) => hook.type === "function"),
    }))
    .filter((m) => m.hooks.length > 0);
}
//@ chunk-q1gbn2mn.js:5352-7523 fingerprint (2.1.88 match: addHookToSession, 0.47)
/**
 * 会话钩子注册表：按会话 id、事件、matcher（+skillRoot/personal/checkout）存放钩子；add/addFunctionHook/remove/clear/get/getFunctionHooks/getEntry/has。旧版名 addHookToSession 配错（那是方法名）。
 */
class SessionHooksRegistry {
  sessions = new Map();
  draws = new Map();
  skillDraws(skillRoot) {
    let drawsBySkillRoot = this.draws.get(skillRoot) ?? new Map();
    this.draws.set(skillRoot, drawsBySkillRoot);
    return drawsBySkillRoot;
  }
  add(setAppState, sessionId, event, hook, options) {
    this.addEntry(
      setAppState,
      sessionId,
      event,
      hook,
      options?.onHookSuccess,
      options?.skillRoot,
      options?.personal === true,
      options?.checkout === true,
    );
  }
  addFunctionHook(setAppState, sessionId, event, callback, errorMessage, options) {
    let id = options?.id || `function-hook-${Date.now()}-${Math.random()}`;
    let hook = {
      type: "function",
      id,
      timeout: options?.timeout || 5000,
      callback,
      errorMessage,
    };
    this.addEntry(setAppState, sessionId, event, hook, undefined, undefined, false, false);
    return id;
  }
  addEntry(setAppState, sessionId, event, hook, onHookSuccess, skillRoot, personal, checkout) {
    let sessionHooks = this.sessions.get(setAppState) ?? {
      hooks: {},
    };
    let matchers = sessionHooks.hooks[sessionId] || [];
    let index = matchers.findIndex(
      (matcherEntry) =>
        matcherEntry.matcher === event &&
        matcherEntry.skillRoot === skillRoot &&
        (matcherEntry.personal === true) === personal &&
        (matcherEntry.checkout === true) === checkout,
    );
    let nextMatchers;
    if (index >= 0) {
      nextMatchers = [...matchers];
      let matcherEntry = nextMatchers[index];
      let index_2 = matcherEntry.hooks.findIndex((hook_2) =>
        hook.type === "function"
          ? Boolean(hook.id) && hook_2.hook.type === "function" && hook_2.hook.id === hook.id
          : isHookEqual(hook_2.hook, hook),
      );
      let hooks =
        index_2 >= 0
          ? matcherEntry.hooks.with(index_2, {
              ...matcherEntry.hooks[index_2],
              hook,
            })
          : [
              ...matcherEntry.hooks,
              {
                hook,
                onHookSuccess,
              },
            ];
      nextMatchers[index] = {
        ...matcherEntry,
        hooks,
      };
    } else
      nextMatchers = [
        ...matchers,
        {
          matcher: event,
          skillRoot,
          ...(personal && {
            personal: true,
          }),
          ...(checkout && {
            checkout: true,
          }),
          hooks: [
            {
              hook,
              onHookSuccess,
            },
          ],
        },
      ];
    this.sessions.set(setAppState, {
      hooks: {
        ...sessionHooks.hooks,
        [sessionId]: nextMatchers,
      },
    });
    trackSessionHookRegistry(this.sessions);
    emitHookStoresChanged();
    logForDebugging(`Added session hook for event ${sessionId} in session ${setAppState}`);
  }
  remove(setAppState, sessionId, event, match) {
    let sessionHooks = this.sessions.get(setAppState);
    if (sessionHooks) {
      let filtered = (sessionHooks.hooks[sessionId] || [])
        .map((matcher) => {
          if (match !== undefined && matcher.skillRoot !== match.skillRoot) return matcher;
          let updatedHooks = matcher.hooks.filter((hook) => !isHookEqual(hook.hook, event));
          return updatedHooks.length > 0
            ? {
                ...matcher,
                hooks: updatedHooks,
              }
            : null;
        })
        .filter((matcherEntry) => matcherEntry !== null);
      let hooks =
        filtered.length > 0
          ? {
              ...sessionHooks.hooks,
              [sessionId]: filtered,
            }
          : {
              ...sessionHooks.hooks,
            };
      if (filtered.length === 0) delete hooks[sessionId];
      this.sessions.set(setAppState, {
        ...sessionHooks,
        hooks,
      });
      emitHookStoresChanged();
    }
    logForDebugging(`Removed session hook for event ${sessionId} in session ${setAppState}`);
  }
  clear(setAppState) {
    this.sessions.delete(setAppState);
    this.draws.delete(setAppState);
    emitHookStoresChanged();
    logForDebugging(`Cleared all session hooks for session ${setAppState}`);
  }
  get(setAppState, event) {
    let result = new Map();
    let sessionHooks = this.sessions.get(setAppState);
    if (!sessionHooks) return result;
    for (let hookEvent of event ? [event] : HOOK_EVENTS) {
      let sessionMatchers = sessionHooks.hooks[hookEvent];
      if (sessionMatchers) result.set(hookEvent, convertToHookMatchers(sessionMatchers));
    }
    return result;
  }
  getFunctionHooks(setAppState, event) {
    let result = new Map();
    let sessionHooks = this.sessions.get(setAppState);
    if (!sessionHooks) return result;
    for (let hookEvent of event ? [event] : HOOK_EVENTS) {
      let sessionMatchers = sessionHooks.hooks[hookEvent];
      if (sessionMatchers) {
        let functionMatchers = convertToHookMatchers_2(sessionMatchers);
        if (functionMatchers.length > 0) result.set(hookEvent, functionMatchers);
      }
    }
    return result;
  }
  getEntry(setAppState, sessionId, matcher, hook, match) {
    let matchers = this.sessions.get(setAppState)?.hooks[sessionId];
    if (!matchers) return;
    for (let matcherEntry of matchers)
      if (
        (matcherEntry.matcher === matcher || matcher === "") &&
        matcherEntry.skillRoot === match.skillRoot
      ) {
        let hookEntry = matcherEntry.hooks.find((hook_2) => isHookEqual(hook_2.hook, hook));
        if (hookEntry) return hookEntry;
      }
    return;
  }
  has(setAppState, sessionId) {
    return this.sessions.get(setAppState)?.hooks[sessionId] !== undefined;
  }
}
//@ chunk-q1gbn2mn.js:7523-7549 layout
var sessionHookRegistriesByHost; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-q1gbn2mn.js:7523", () => {
  sessionHookRegistriesByHost = new HostScoped(() => new Set());
});
//@ chunk-q1gbn2mn.js:7549-7577 layout
function getSessionHookRegistries() {
  return onProcessRootHost(sessionHookRegistriesByHost);
}
//@ chunk-q1gbn2mn.js:7577-7604 layout
function trackSessionHookRegistry(weakChild) {
  propagateAbort(getSessionHookRegistries(), weakChild);
}
//@ chunk-q1gbn2mn.js:7604-7824 fingerprint (2.1.88 match: convertToHookMatchers, 0.853)
/**
 * 遍历所有会话注册表，列出全部非 function 会话钩子 {event, hook, skillRoot}。
 */
function getAllSessionHookEntries() {
  let entries = [];
  for (let registry of liveWeakRefs(getSessionHookRegistries()))
    for (let hookSets of registry.values())
      for (let event of HOOK_EVENTS)
        for (let matcherEntry of hookSets.hooks[event] ?? [])
          for (let { hook } of matcherEntry.hooks)
            if (hook.type !== "function")
              entries.push({
                event,
                hook,
                skillRoot: matcherEntry.skillRoot,
              });
  return entries;
}
//@ chunk-7jxyna5q.js:229774-230065 affinity
var MCP_TOOL_GUARD_EVENTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7jxyna5q.js:229774", () => {
  MCP_TOOL_GUARD_EVENTS = new Set([
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
});
//@ chunk-7jxyna5q.js:230065-230370 callgraph-fingerprint (2.1.88 match: getSessionHooks, 0.254)
/**
 * 收集 mcp_tool 钩子引用的 MCP 服务器名（守卫类事件），会话钩子与各 settings 一起统计。
 */
function getMcpServersReferencedByHooks() {
  let result = new Set();
  for (let { event, hook } of getAllSessionHookEntries())
    if (MCP_TOOL_GUARD_EVENTS.has(event) && hook.type === "mcp_tool") result.add(hook.server);
  for (let snapshot of collectAllHookSnapshots()) {
    if (!snapshot) continue;
    for (let [key, value] of Object.entries(snapshot)) {
      if (!MCP_TOOL_GUARD_EVENTS.has(key)) continue;
      for (let matcherEntry of value ?? [])
        for (let hook of matcherEntry.hooks ?? [])
          if (hook.type === "mcp_tool" && hook.server) result.add(hook.server);
    }
  }
  return result;
}
export {
  getMcpServersReferencedByHooks,
  tagHooksWithSource,
  hookSourceOf,
  getAllSessionHookEntries,
  getSessionFunctionHooks,
  getSessionHookRegistries,
  SessionHooksRegistry,
};
