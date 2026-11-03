/**
 * plugins/functionHooks/interfaceCalls.ts
 *
 * 2.1.316 新增：插件之间 interface.call 与 state.get/set 的宿主检查
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (12)
 * attribution: placement 12
 */
import { AsyncLocalStorage } from "async_hooks";
import { runDispatchFrame } from "./hookDispatch.js";
import { isOriginFromEnvironment, reportDroppedApiCall } from "./apiCatalog.js";
import { isPlainObject as isPlainObject_5 } from "../../utils/isPlainObject.js";
import { isReservedHookName, stateAtomKey } from "./eventPatterns.js";
import { UI_INPUT_EVENTS, judgeHookInput } from "./dispatch/inputJudging.js";
import { wellFormedLeaves } from "./ui/validateTree.js";
import {
  refuseUnadmittedApiCall,
  staleAdmittingList,
  returnValue,
  streamHookedApiCall,
  policyChangedRefusal,
  submitWaitHazard,
  trackPluginOp,
  buildHookEnvironment,
  cwdFromOrCall,
} from "./apiDispatch.js";
import { isClockMethod } from "./api/operations.js";
import { envGetForPlugin } from "./envApi.js";
import { HooksError } from "./hooksErrors.js";
import { isUiEventName } from "./api/agentToolOps.js";
import { resolveRaisedPath } from "./sites/promptContextSites.js";
import { isPluginDefinedEvent, isHookApiCall } from "./hookApiSurface.js";
import { currentDispatch, hasCurrentDispatch, forwardAbort } from "./dispatch/chain.js";

//@ chunk-e6aww6q8.js:4033627-4033643 placement
/**
 * 接口调用 ALS
 */
var interfaceCallStorage = new AsyncLocalStorage();
//@ chunk-e6aww6q8.js:4033643-4033683 placement
/**
 * 接口调用未结束
 */
var isInterfaceCallOpen = () => interfaceCallStorage.getStore()?.isOver === false;
//@ chunk-e6aww6q8.js:4033683-4033707 placement
/**
 * 在调用帧里执行接口调用
 */
var runInterfaceCall = (e) => runDispatchFrame(interfaceCallStorage, e);
//@ chunk-e6aww6q8.js:4033707-4033916 placement
/**
 * 根据调用来源链求根事件（有 session.start 时取之，否则取第一个匹配的环境的根事件）。
 */
function rootEventForOrigin(e, n, r) {
  if (e.hookOrigin === undefined || e.hookOrigin.length === 0) return e.event;
  let mapped = [...n].filter((y) => isOriginFromEnvironment(y, e, r)).map((y) => y.rootEvent);
  return mapped.includes("session.start") ? "session.start" : (mapped[0] ?? e.event);
}
//@ chunk-e6aww6q8.js:4033916-4034024 placement
function interfaceCallLabel(e, n) {
  if (e === "interface.call") {
    let r = n;
    return `${String(r?.name)}.${String(r?.method)}`;
  }
  return e;
}
//@ chunk-e6aww6q8.js:4034024-4034186 placement
function toOwnDataObject(e) {
  if (!isPlainObject_5(e)) return e;
  let n = {};
  for (let key of Object.keys(e))
    Object.defineProperty(n, key, {
      value: e[key],
      enumerable: true,
      writable: true,
      configurable: true,
    });
  return n;
}
//@ chunk-e6aww6q8.js:4034186-4034692 placement
/**
 * $.state.get/set 必须引用扫描时列出的 {plugin, key}，否则返回宿主规则说明。
 */
function checkStateCallScanned(scan, n, r) {
  if (!isReservedHookName(n)) return;
  let plugin = isPlainObject_5(r) ? r.plugin : undefined;
  let key = isPlainObject_5(r) ? r.key : undefined;
  if (typeof plugin !== "string" || typeof key !== "string")
    return `it carries no reference a $.${n}({ plugin, key }) call passes`;
  let y = n === "state.get";
  let S = (y ? scan.state?.reads : scan.state?.writes) ?? [];
  let any = S.some((G) => G.plugin === plugin && G.key === key);
  let L = S.map(stateAtomKey).join(", ") || "nothing";
  return any
    ? undefined
    : `its hooks module does not refer to ${stateAtomKey({
        plugin,
        key,
      })} in a $.${n}({ plugin, key }) call (host rule; the scan lists ${y ? "reads" : "writes"} of ${L})`;
}
//@ chunk-e6aww6q8.js:4034692-4035502 placement
/**
 * 插件之间的 interface.call：宿主检查调用方与目标后转发。
 */
async function interfaceCallForPlugin(host, { op, args, caller }) {
  let h = host.ops[op];
  let y = isReservedHookName(op) ? toOwnDataObject(args) : args;
  let S = UI_INPUT_EVENTS.has(op) ? wellFormedLeaves(y) : y;
  let w = interfaceCallLabel(op, S);
  let L = refuseUnadmittedApiCall(host, {
    spelling: w,
    caller,
    isClock: isClockMethod(op),
  });
  let { scan } = L;
  let q = {
    ...caller,
    admitted: L,
  };
  let Z = envGetForPlugin(scan, op, S) ?? checkStateCallScanned(scan, op, S);
  if (Z !== undefined) throw new HooksError(`${q.plugin}: $.${w} refused: ${Z}`);
  let Se = h.check?.(S, q);
  if (Se !== undefined && isUiEventName(op)) reportDroppedApiCall(q.plugin, w, Se);
  if (Se !== undefined) throw new HooksError(`${q.plugin}: ${w}: ${Se} (host check)`);
  let we = h.raise?.(q);
  let Ee = we ? resolveRaisedPath(we, S) : S;
  let Ae = h.stamp ? h.stamp(Ee, q) : Ee;
  if (op === "interface.call" && isPluginDefinedEvent(w)) {
    let We = S;
    let ze = host.ops["interface.call"];
    return judgeHookInput({
      event: w,
      args: We.args[0] ?? {},
      caller: q,
      bottom: {
        run: (lt) =>
          ze.run(
            {
              ...We,
              args: [lt],
            },
            q,
          ),
      },
      among: staleAdmittingList(host.state, q),
    });
  }
  let Me = currentDispatch();
  return Me
    ? Me(
        {
          op,
          args: Ae,
          caller: q,
        },
        we,
        scan,
      )
    : isHookApiCall(op)
      ? judgeHookInput({
          event: op,
          args: Ae,
          caller: q,
          bottom: h,
          raise: we,
          among: staleAdmittingList(host.state, q),
        })
      : h.run(Ae, q);
}
//@ chunk-e6aww6q8.js:4035502-4035786 placement
/**
 * 执行插件的流式宿主操作：先做准入与参数检查，再经钩子链（可能有底层实现）流式返回，结束时检查策略变化。
 */
function streamOpForPlugin(host, { op, args, caller }) {
  let h = host.streamOps[op];
  let admitted = refuseUnadmittedApiCall(host, {
    spelling: op,
    caller,
    isClock: false,
  });
  let S = {
    ...caller,
    admitted,
  };
  let w = h.check?.(args, S);
  if (w !== undefined) throw new HooksError(`${S.plugin}: ${op}: ${w} (host check)`);
  return returnValue(
    streamHookedApiCall({
      event: op,
      args,
      caller: S,
      ...(!hasCurrentDispatch() && {
        bottom: h,
      }),
    }),
    () => policyChangedRefusal(S, op),
  );
}
//@ chunk-e6aww6q8.js:4035786-4036032 placement
/**
 * 判断某调用是否处于持有当前回合的钩子之中，返回相应事件（用于 submit 死锁提示）。
 */
function turnHeldEventFor(e, n, r) {
  let { event, hookOrigin } = e;
  let S = submitWaitHazard(event) !== undefined ? event : undefined;
  if (event === "prompt.submit" || hookOrigin === undefined || hookOrigin.length === 0) return S;
  let L = false;
  for (let G of n) {
    if (!isOriginFromEnvironment(G, e, r)) continue;
    if (G.turnHeld !== undefined) return G.turnHeld;
    L = true;
  }
  return L ? undefined : S;
}
//@ chunk-e6aww6q8.js:4036032-4036467 placement
/**
 * 同线程宿主执行插件发起的宿主操作：拷贝参数、绑定中止与分发、记工作计数，在钩子环境中调用 interfaceCallForPlugin。
 */
function runHostOpSameThread(e, n) {
  let { host, state, copy } = e;
  let { environmentId, op, args, signal, dispatchId } = n;
  let args_2 = copy(args, `${op} arguments`);
  let abortController = new AbortController();
  let Se = forwardAbort(signal, abortController);
  let ke = state.opControllers.get(environmentId) ?? new Set();
  state.opControllers.set(environmentId, ke);
  ke.add(abortController);
  let we = dispatchId === undefined ? undefined : state.dispatches.get(dispatchId);
  let Ee = forwardAbort(we?.signal, abortController);
  let Ae = trackPluginOp(state.work, environmentId, op);
  let hookEnvironment = buildHookEnvironment(e, n, abortController.signal);
  return runInterfaceCall(() =>
    cwdFromOrCall(hookEnvironment, () =>
      interfaceCallForPlugin(host, {
        op,
        args: args_2,
        caller: hookEnvironment,
      }),
    ),
  ).finally(() => {
    Se();
    Ee();
    ke.delete(abortController);
    Ae();
  });
}
//@ chunk-e6aww6q8.js:4036467-4037205 placement
/**
 * 同线程宿主执行插件的流式宿主操作：拷贝参数与每个块，放弃时中止并关闭底层流。
 */
var runHostStreamOpSameThread = (e, n) =>
  (async function* () {
    let { state, copy } = e;
    let { environmentId, op, args, signal, dispatchId } = n;
    let args_2 = copy(args, `${op} arguments`);
    let abortController = new AbortController();
    let Z = forwardAbort(signal, abortController);
    let Se = state.opControllers.get(environmentId) ?? new Set();
    state.opControllers.set(environmentId, Se);
    Se.add(abortController);
    let ke = dispatchId === undefined ? undefined : state.dispatches.get(dispatchId);
    let we = forwardAbort(ke?.signal, abortController);
    let Ee = false;
    try {
      let Me = function (We) {
        Ee = true;
        throw We;
      };
      let hookEnvironment = buildHookEnvironment(e, n, abortController.signal);
      let Ie = cwdFromOrCall(hookEnvironment, () =>
        streamOpForPlugin(e.host, {
          op,
          args: args_2,
          caller: hookEnvironment,
        }),
      );
      try {
        while (true) {
          let We = trackPluginOp(state.work, environmentId, op);
          let ze = await cwdFromOrCall(hookEnvironment, () => Ie.next())
            .catch(Me)
            .finally(We);
          if (ze.done === true) {
            Ee = true;
            return copy(ze.value, `${op} result`);
          }
          yield copy(ze.value, `${op} chunk`);
        }
      } finally {
        if (!Ee) {
          abortController.abort(new HooksError(`${op}: stream let go`));
          await cwdFromOrCall(hookEnvironment, () => Ie.return(undefined)).catch(() => {
            return;
          });
        }
      }
    } finally {
      Z();
      we();
      Se.delete(abortController);
    }
  })();
export {
  runHostOpSameThread,
  runHostStreamOpSameThread,
  isInterfaceCallOpen,
  streamOpForPlugin,
  runInterfaceCall,
  interfaceCallForPlugin,
  rootEventForOrigin,
  turnHeldEventFor,
};
