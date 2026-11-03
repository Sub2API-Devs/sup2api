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
import {
  AsyncLocalStorage,
  AsyncLocalStorage as AsyncLocalStorage_2,
  AsyncLocalStorage as AsyncLocalStorage_3,
  AsyncLocalStorage as AsyncLocalStorage_4,
  AsyncLocalStorage as AsyncLocalStorage_5,
  AsyncLocalStorage as AsyncLocalStorage_6,
  AsyncLocalStorage as AsyncLocalStorage_7,
  AsyncLocalStorage as AsyncLocalStorage_8,
} from "async_hooks";
import { TYr } from "./hookDispatch.js";
import { isOriginFromEnvironment, reportDroppedApiCall } from "./apiCatalog.js";
import { isPlainObject as isPlainObject_4 } from "../../utils/isPlainObject.js";
import { isReservedHookName, stateAtomKey } from "./eventPatterns.js";
import { UI_INPUT_EVENTS, judgeHookInput } from "./dispatch/inputJudging.js";
import { wellFormedLeaves } from "./ui/validateTree.js";
import {
  refuseUnadmittedApiCall,
  staleAdmittingList,
  returnValue_2,
  streamHookedApiCall,
  policyChangedRefusal,
  submitWaitHazard,
  trackPluginOp,
  buildHookEnvironment,
  aY,
} from "./apiDispatch.js";
import { xUe } from "./api/operations.js";
import { envGetForPlugin } from "./envApi.js";
import { HooksError } from "./hooksErrors.js";
import { y3t } from "./api/agentToolOps.js";
import { resolveRaisedPath } from "./sites/promptContextSites.js";
import { isPluginDefinedEvent, pos } from "./hookApiSurface.js";
import { hZr, jme, forwardAbort } from "./dispatch/chain.js";

//@ chunk-e6aww6q8.js:4033627-4033643 placement
var WMe = new AsyncLocalStorage_8();
//@ chunk-e6aww6q8.js:4033643-4033683 placement
var NZr = () => WMe.getStore()?.isOver === !1;
//@ chunk-e6aww6q8.js:4033683-4033707 placement
var VHn = (e) => TYr(WMe, e);
/**
 * 根据调用来源链求根事件（有 session.start 时取之，否则取第一个匹配的环境的根事件）。
 */
//@ chunk-e6aww6q8.js:4033707-4033916 placement
function rootEventForOrigin(e, n, r) {
  if (e.hookOrigin === void 0 || e.hookOrigin.length === 0) return e.event;
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
  if (!isPlainObject_4(e)) return e;
  let n = {};
  for (let r of Object.keys(e))
    Object.defineProperty(n, r, { value: e[r], enumerable: !0, writable: !0, configurable: !0 });
  return n;
}
/**
 * $.state.get/set 必须引用扫描时列出的 {plugin, key}，否则返回宿主规则说明。
 */
//@ chunk-e6aww6q8.js:4034186-4034692 placement
function checkStateCallScanned(e, n, r) {
  if (!isReservedHookName(n)) return;
  let s = isPlainObject_4(r) ? r.plugin : void 0,
    h = isPlainObject_4(r) ? r.key : void 0;
  if (typeof s !== "string" || typeof h !== "string")
    return `it carries no reference a $.${n}({ plugin, key }) call passes`;
  let y = n === "state.get",
    S = (y ? e.state?.reads : e.state?.writes) ?? [],
    any = S.some((G) => G.plugin === s && G.key === h),
    L = S.map(stateAtomKey).join(", ") || "nothing";
  return any
    ? void 0
    : `its hooks module does not refer to ${stateAtomKey({ plugin: s, key: h })} in a $.${n}({ plugin, key }) call (host rule; the scan lists ${y ? "reads" : "writes"} of ${L})`;
}
/**
 * 插件之间的 interface.call：宿主检查调用方与目标后转发。
 */
//@ chunk-e6aww6q8.js:4034692-4035502 placement
async function interfaceCallForPlugin(e, { op: op, args: args, caller: caller }) {
  let h = e.ops[op],
    y = isReservedHookName(op) ? toOwnDataObject(args) : args,
    S = UI_INPUT_EVENTS.has(op) ? wellFormedLeaves(y) : y,
    w = interfaceCallLabel(op, S),
    L = refuseUnadmittedApiCall(e, { spelling: w, caller: caller, isClock: xUe(op) }),
    { scan: scan } = L,
    q = { ...caller, admitted: L },
    Z = envGetForPlugin(scan, op, S) ?? checkStateCallScanned(scan, op, S);
  if (Z !== void 0) throw new HooksError(`${q.plugin}: $.${w} refused: ${Z}`);
  let Se = h.check?.(S, q);
  if (Se !== void 0 && y3t(op)) reportDroppedApiCall(q.plugin, w, Se);
  if (Se !== void 0) throw new HooksError(`${q.plugin}: ${w}: ${Se} (host check)`);
  let we = h.raise?.(q),
    Ee = we ? resolveRaisedPath(we, S) : S,
    Ae = h.stamp ? h.stamp(Ee, q) : Ee;
  if (op === "interface.call" && isPluginDefinedEvent(w)) {
    let We = S,
      ze = e.ops["interface.call"];
    return judgeHookInput({
      event: w,
      args: We.args[0] ?? {},
      caller: q,
      bottom: { run: (lt) => ze.run({ ...We, args: [lt] }, q) },
      among: staleAdmittingList(e.state, q),
    });
  }
  let Me = hZr();
  return Me
    ? Me({ op: op, args: Ae, caller: q }, we, scan)
    : pos(op)
      ? judgeHookInput({
          event: op,
          args: Ae,
          caller: q,
          bottom: h,
          raise: we,
          among: staleAdmittingList(e.state, q),
        })
      : h.run(Ae, q);
}
/**
 * 执行插件的流式宿主操作：先做准入与参数检查，再经钩子链（可能有底层实现）流式返回，结束时检查策略变化。
 */
//@ chunk-e6aww6q8.js:4035502-4035786 placement
function streamOpForPlugin(e, { op: op, args: args, caller: caller }) {
  let h = e.streamOps[op],
    y = refuseUnadmittedApiCall(e, { spelling: op, caller: caller, isClock: !1 }),
    S = { ...caller, admitted: y },
    w = h.check?.(args, S);
  if (w !== void 0) throw new HooksError(`${S.plugin}: ${op}: ${w} (host check)`);
  return returnValue_2(
    streamHookedApiCall({ event: op, args: args, caller: S, ...(!jme() && { bottom: h }) }),
    () => policyChangedRefusal(S, op),
  );
}
/**
 * 判断某调用是否处于持有当前回合的钩子之中，返回相应事件（用于 submit 死锁提示）。
 */
//@ chunk-e6aww6q8.js:4035786-4036032 placement
function turnHeldEventFor(e, n, r) {
  let { event: event, hookOrigin: hookOrigin } = e,
    S = submitWaitHazard(event) !== void 0 ? event : void 0;
  if (event === "prompt.submit" || hookOrigin === void 0 || hookOrigin.length === 0) return S;
  let L = !1;
  for (let G of n) {
    if (!isOriginFromEnvironment(G, e, r)) continue;
    if (G.turnHeld !== void 0) return G.turnHeld;
    L = !0;
  }
  return L ? void 0 : S;
}
/**
 * 同线程宿主执行插件发起的宿主操作：拷贝参数、绑定中止与分发、记工作计数，在钩子环境中调用 interfaceCallForPlugin。
 */
//@ chunk-e6aww6q8.js:4036032-4036467 placement
function runHostOpSameThread(e, n) {
  let { host: host, state: state, copy: copy } = e,
    { environmentId: environmentId, op: op, args: args, signal: signal, dispatchId: dispatchId } = n,
    q = copy(args, `${op} arguments`),
    abortController = new AbortController(),
    Se = forwardAbort(signal, abortController),
    ke = state.opControllers.get(environmentId) ?? new Set();
  (state.opControllers.set(environmentId, ke), ke.add(abortController));
  let we = dispatchId === void 0 ? void 0 : state.dispatches.get(dispatchId),
    Ee = forwardAbort(we?.signal, abortController),
    Ae = trackPluginOp(state.work, environmentId, op),
    Ie = buildHookEnvironment(e, n, abortController.signal);
  return VHn(() => aY(Ie, () => interfaceCallForPlugin(host, { op: op, args: q, caller: Ie }))).finally(
    () => {
      (Se(), Ee(), ke.delete(abortController), Ae());
    },
  );
}
/**
 * 同线程宿主执行插件的流式宿主操作：拷贝参数与每个块，放弃时中止并关闭底层流。
 */
//@ chunk-e6aww6q8.js:4036467-4037205 placement
var runHostStreamOpSameThread = (e, n) =>
  (async function* () {
    let { state: state, copy: copy } = e,
      { environmentId: environmentId, op: op, args: args, signal: signal, dispatchId: dispatchId } = n,
      G = copy(args, `${op} arguments`),
      abortController = new AbortController(),
      Z = forwardAbort(signal, abortController),
      Se = state.opControllers.get(environmentId) ?? new Set();
    (state.opControllers.set(environmentId, Se), Se.add(abortController));
    let ke = dispatchId === void 0 ? void 0 : state.dispatches.get(dispatchId),
      we = forwardAbort(ke?.signal, abortController),
      Ee = !1;
    try {
      let Me = function (We) {
          throw ((Ee = !0), We);
        },
        Ae = buildHookEnvironment(e, n, abortController.signal),
        Ie = aY(Ae, () => streamOpForPlugin(e.host, { op: op, args: G, caller: Ae }));
      try {
        while (!0) {
          let We = trackPluginOp(state.work, environmentId, op),
            ze = await aY(Ae, () => Ie.next())
              .catch(Me)
              .finally(We);
          if (ze.done === !0) return ((Ee = !0), copy(ze.value, `${op} result`));
          yield copy(ze.value, `${op} chunk`);
        }
      } finally {
        if (!Ee)
          (abortController.abort(new HooksError(`${op}: stream let go`)),
            await aY(Ae, () => Ie.return(void 0)).catch(() => {
              return;
            }));
      }
    } finally {
      (Z(), we(), Se.delete(abortController));
    }
  })();

export {
  runHostOpSameThread,
  runHostStreamOpSameThread,
  NZr,
  streamOpForPlugin,
  VHn,
  interfaceCallForPlugin,
  rootEventForOrigin,
  turnHeldEventFor,
};
