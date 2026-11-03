/**
 * utils/agentNameRegistry.ts
 *
 * 2.1.316 新增：子代理名称登记
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1jczmbs0.js (5)
 * attribution: placement 5
 */
import { isInProcessTeammateTask } from "../tasks/InProcessTeammateTask/types.js";
import { isTerminalTaskStatus } from "../tasks/taskStatus.js";
import { isWaitingOnChildren, FLAG_IDLE_WINDOW } from "../tasks/LocalAgentTask/keepalive.js";
import { LD } from "./sessionAddresses.js";
import { logForDebugging } from "./debug.js";
import { En } from "../../vendor/lodash-es/_inlinedHelpers.js";

//@ chunk-1jczmbs0.js:409-533 placement
function findAgentRecord(r, i) {
  if (Object.hasOwn(r, i)) return r[i];
  return Object.values(r).find((n) => isInProcessTeammateTask(n) && n.identity.resumableAgentId === i);
}
//@ chunk-1jczmbs0.js:533-763 placement
function liveAgentNames(r, i) {
  return new Map(
    [...r].filter(([, n]) => {
      let e = findAgentRecord(i, n);
      if (e === void 0) return !1;
      if (!isTerminalTaskStatus(e.status)) return !0;
      return (
        isWaitingOnChildren(e) &&
        "keepaliveReasons" in e &&
        e.keepaliveReasons !== void 0 &&
        [...e.keepaliveReasons].some((s) => s !== FLAG_IDLE_WINDOW)
      );
    }),
  );
}
//@ chunk-1jczmbs0.js:763-906 placement
var NOOP_AGENT_NAME_REGISTRY = {
  markTypeInvoked() {},
  registerName() {},
  allocateName(r) {
    return r;
  },
  nameOf() {
    return;
  },
  clearTodos() {},
  setTeammate() {},
  setSendMessagePin() {},
};
/**
 * 子代理名称登记：分配不冲突的名称、记录已调用的代理类型。
 */
//@ chunk-1jczmbs0.js:906-2338 placement
function createAgentNameRegistry(r, i) {
  return {
    markTypeInvoked(n) {
      i((e) =>
        e.agentTypesInvokedThisSession.has(n)
          ? e
          : { ...e, agentTypesInvokedThisSession: new Set(e.agentTypesInvokedThisSession).add(n) },
      );
    },
    registerName(n, e) {
      if (LD(n)) {
        logForDebugging(`[registerName] refused reserved or agent-id-shaped name "${n}" for ${e}`);
        return;
      }
      i((s) => {
        if (s.agentNameRegistry.get(n) === e) return s;
        let a = new Map(s.agentNameRegistry);
        return (a.set(n, e), { ...s, agentNameRegistry: a });
      });
    },
    allocateName(n) {
      let e = sanitizeAgentName(n),
        s = r(),
        agentNameRegistry = s.agentNameRegistry,
        g = new Set(Object.values(s.teamContext?.teammates ?? {}).map((o) => o.name));
      for (let o = 1; ; o++) {
        let m = o === 1 ? e : `${e}-${o}`;
        if (LD(m) || g.has(m)) continue;
        let d = agentNameRegistry.get(m);
        if (d === void 0 || findAgentRecord(s.tasks, d) === void 0) return m;
      }
    },
    nameOf(n) {
      for (let [e, s] of r().agentNameRegistry) if (s === n) return e;
      return;
    },
    clearTodos(n) {
      i((e) => {
        if (!(n in e.todos)) return e;
        let { [n]: s, ...a } = e.todos;
        return { ...e, todos: a };
      });
    },
    setSendMessagePin(n, e) {
      i((s) => {
        let a = Object.hasOwn(s.sendMessagePins, n) ? s.sendMessagePins[n] : void 0;
        if (En(a, e)) return s;
        return { ...s, sendMessagePins: { ...s.sendMessagePins, [n]: e } };
      });
    },
    setTeammate(n, e) {
      if (e !== void 0 && LD(e.name)) {
        logForDebugging(
          `[setTeammate] refused reserved or agent-id-shaped teammate name "${e.name}" for ${n}`,
        );
        return;
      }
      i((s) => {
        let teamContext = s.teamContext;
        if (!teamContext) return s;
        let g = teamContext.teammates?.[n];
        if (e === void 0) {
          if (!g) return s;
          let { [n]: o, ...m } = teamContext.teammates;
          return { ...s, teamContext: { ...teamContext, teammates: m } };
        }
        if (g === e) return s;
        return { ...s, teamContext: { ...teamContext, teammates: { ...teamContext.teammates, [n]: e } } };
      });
    },
  };
}
//@ chunk-1jczmbs0.js:2338-2450 placement
function sanitizeAgentName(r) {
  let sliced = r
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, 64);
  return sliced.length > 0 ? sliced : "agent";
}

export { liveAgentNames, NOOP_AGENT_NAME_REGISTRY, createAgentNameRegistry };
