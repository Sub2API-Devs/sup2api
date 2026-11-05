/**
 * plugins/functionHooks/interfaceCalls.ts
 *
 * 2.1.316 新增：插件之间 interface.call 与 state.get/set 的宿主检查
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (12)
 * attribution: placement 12
 */
import { AsyncLocalStorage } from "async_hooks";
import { runDispatchFrame } from "./hookDispatch.js";
import { isOriginFromEnvironment, reportDroppedApiCall } from "./apiCatalog.js";
import { isPlainObject as isPlainObject_6 } from "../../utils/isPlainObject.js";
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
  cwdFromOrCall,
} from "./apiDispatch.js";
import { isClockMethod } from "./api/operations.js";
import { envGetForPlugin } from "./envApi.js";
import { HooksError } from "./hooksErrors.js";
import { isUiEventName } from "./api/agentToolOps.js";
import { resolveRaisedPath } from "./sites/promptContextSites.js";
import { isPluginDefinedEvent, isHookApiCall } from "./hookApiSurface.js";
import { currentDispatch, hasCurrentDispatch, forwardAbort } from "./dispatch/chain.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:4139447-4139463 placement
/**
 * 接口调用 ALS
 */
var interfaceCallStorage; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:4139447", () => {
  interfaceCallStorage = new AsyncLocalStorage();
});
//@ chunk-5xgkngpb.js:4139463-4139503 placement
/**
 * 接口调用未结束
 */
var isInterfaceCallOpen = () => interfaceCallStorage.getStore()?.isOver === false;
//@ chunk-5xgkngpb.js:4139503-4139527 placement
/**
 * 在调用帧里执行接口调用
 */
var runInterfaceCall = (fn) => runDispatchFrame(interfaceCallStorage, fn);
//@ chunk-5xgkngpb.js:4139527-4139736 placement
/**
 * 根据调用来源链求根事件（有 session.start 时取之，否则取第一个匹配的环境的根事件）。
 */
function rootEventForOrigin(call, callers, lookup) {
  if (call.hookOrigin === undefined || call.hookOrigin.length === 0) return call.event;
  let mapped = [...callers]
    .filter((caller) => isOriginFromEnvironment(caller, call, lookup))
    .map((caller) => caller.rootEvent);
  return mapped.includes("session.start") ? "session.start" : (mapped[0] ?? call.event);
}
//@ chunk-5xgkngpb.js:4139736-4139844 placement
function interfaceCallLabel(op, args) {
  if (op === "interface.call") {
    let request = args;
    return `${String(request?.name)}.${String(request?.method)}`;
  }
  return op;
}
//@ chunk-5xgkngpb.js:4139844-4140006 placement
function toOwnDataObject(value) {
  if (!isPlainObject_6(value)) return value;
  let dataObject = {};
  for (let key of Object.keys(value))
    Object.defineProperty(dataObject, key, {
      value: value[key],
      enumerable: true,
      writable: true,
      configurable: true,
    });
  return dataObject;
}
//@ chunk-5xgkngpb.js:4140006-4140512 placement
/**
 * $.state.get/set 必须引用扫描时列出的 {plugin, key}，否则返回宿主规则说明。
 */
function checkStateCallScanned(scan, op, args) {
  if (!isReservedHookName(op)) return;
  let plugin = isPlainObject_6(args) ? args.plugin : undefined;
  let key = isPlainObject_6(args) ? args.key : undefined;
  if (typeof plugin !== "string" || typeof key !== "string")
    return `it carries no reference a $.${op}({ plugin, key }) call passes`;
  let isRead = op === "state.get";
  let atoms = (isRead ? scan.state?.reads : scan.state?.writes) ?? [];
  let any = atoms.some((atom) => atom.plugin === plugin && atom.key === key);
  let atomKeysText = atoms.map(stateAtomKey).join(", ") || "nothing";
  return any
    ? undefined
    : `its hooks module does not refer to ${stateAtomKey({
        plugin,
        key,
      })} in a $.${op}({ plugin, key }) call (host rule; the scan lists ${isRead ? "reads" : "writes"} of ${atomKeysText})`;
}
//@ chunk-5xgkngpb.js:4140512-4141325 placement
/**
 * 插件之间的 interface.call：宿主检查调用方与目标后转发。
 */
async function interfaceCallForPlugin(runtime, { op, args, caller }) {
  let catalogOp = runtime.ops[op];
  let callArgs = isReservedHookName(op) ? toOwnDataObject(args) : args;
  let checkedArgs = UI_INPUT_EVENTS.has(op) ? wellFormedLeaves(callArgs) : callArgs;
  let label = interfaceCallLabel(op, checkedArgs);
  let admission = refuseUnadmittedApiCall(runtime, {
    spelling: label,
    caller,
    isClock: isClockMethod(op),
  });
  let { scan } = admission;
  let admittedCaller = {
    ...caller,
    admitted: admission,
  };
  let refusal = envGetForPlugin(scan, op, checkedArgs) ?? checkStateCallScanned(scan, op, checkedArgs);
  if (refusal !== undefined) throw new HooksError(`${admittedCaller.plugin}: $.${label} refused: ${refusal}`);
  let checkMessage = catalogOp.check?.(checkedArgs, admittedCaller);
  if (checkMessage !== undefined && isUiEventName(op))
    reportDroppedApiCall(admittedCaller.plugin, label, checkMessage);
  if (checkMessage !== undefined)
    throw new HooksError(`${admittedCaller.plugin}: ${label}: ${checkMessage} (host check)`);
  let raised = catalogOp.raise?.(admittedCaller);
  let raisedArgs = raised ? resolveRaisedPath(raised, checkedArgs) : checkedArgs;
  let stampedArgs = catalogOp.stamp ? catalogOp.stamp(raisedArgs, admittedCaller) : raisedArgs;
  if (op === "interface.call" && isPluginDefinedEvent(label)) {
    let callValue = checkedArgs;
    let interfaceCallOp = runtime.ops["interface.call"];
    return judgeHookInput({
      event: label,
      args: callValue.args[0] ?? {},
      caller: admittedCaller,
      bottom: {
        run: (bottomArg) =>
          interfaceCallOp.run(
            {
              ...callValue,
              args: [bottomArg],
            },
            admittedCaller,
          ),
      },
      among: staleAdmittingList(runtime.state, admittedCaller),
    });
  }
  let currentDispatchFn = currentDispatch();
  return currentDispatchFn
    ? currentDispatchFn(
        {
          op,
          args: stampedArgs,
          caller: admittedCaller,
        },
        raised,
        scan,
      )
    : isHookApiCall(op)
      ? judgeHookInput({
          event: op,
          args: stampedArgs,
          caller: admittedCaller,
          bottom: catalogOp,
          raise: raised,
          among: staleAdmittingList(runtime.state, admittedCaller),
        })
      : catalogOp.run(stampedArgs, admittedCaller);
}
//@ chunk-5xgkngpb.js:4141325-4141609 placement
/**
 * 执行插件的流式宿主操作：先做准入与参数检查，再经钩子链（可能有底层实现）流式返回，结束时检查策略变化。
 */
function streamOpForPlugin(runtime, { op, args, caller }) {
  let streamOp = runtime.streamOps[op];
  let admitted = refuseUnadmittedApiCall(runtime, {
    spelling: op,
    caller,
    isClock: false,
  });
  let admittedCaller = {
    ...caller,
    admitted,
  };
  let checkMessage = streamOp.check?.(args, admittedCaller);
  if (checkMessage !== undefined)
    throw new HooksError(`${admittedCaller.plugin}: ${op}: ${checkMessage} (host check)`);
  return returnValue_2(
    streamHookedApiCall({
      event: op,
      args,
      caller: admittedCaller,
      ...(!hasCurrentDispatch() && {
        bottom: streamOp,
      }),
    }),
    () => policyChangedRefusal(admittedCaller, op),
  );
}
//@ chunk-5xgkngpb.js:4141609-4141855 placement
/**
 * 判断某调用是否处于持有当前回合的钩子之中，返回相应事件（用于 submit 死锁提示）。
 */
function turnHeldEventFor(request, dispatches, nameOfEnvironment) {
  let { event, hookOrigin } = request;
  let hazard = submitWaitHazard(event) !== undefined ? event : undefined;
  if (event === "prompt.submit" || hookOrigin === undefined || hookOrigin.length === 0) return hazard;
  let sawEnvironment = false;
  for (let dispatch of dispatches) {
    if (!isOriginFromEnvironment(dispatch, request, nameOfEnvironment)) continue;
    if (dispatch.turnHeld !== undefined) return dispatch.turnHeld;
    sawEnvironment = true;
  }
  return sawEnvironment ? undefined : hazard;
}
//@ chunk-5xgkngpb.js:4141855-4142296 placement
/**
 * 同线程宿主执行插件发起的宿主操作：拷贝参数、绑定中止与分发、记工作计数，在钩子环境中调用 interfaceCallForPlugin。
 */
function runHostOpSameThread(context, request) {
  let { host, state, copy } = context;
  let { environmentId, op, args, signal, dispatchId } = request;
  let args_2 = copy(args, `${op} arguments`);
  let abortController = new AbortController();
  let releaseSignal = forwardAbort(signal, abortController);
  let opControllers = state.opControllers.get(environmentId) ?? new Set();
  state.opControllers.set(environmentId, opControllers);
  opControllers.add(abortController);
  let dispatch = dispatchId === undefined ? undefined : state.dispatches.get(dispatchId);
  let releaseDispatchSignal = forwardAbort(dispatch?.signal, abortController);
  let endOpTracking = trackPluginOp(state.work, environmentId, op);
  let hookEnvironment = buildHookEnvironment(context, request, abortController.signal);
  return runInterfaceCall(() =>
    cwdFromOrCall(hookEnvironment, () =>
      interfaceCallForPlugin(host, {
        op,
        args: args_2,
        caller: hookEnvironment,
      }),
    ),
  ).finally(() => {
    releaseSignal();
    releaseDispatchSignal();
    opControllers.delete(abortController);
    endOpTracking();
  });
}
//@ chunk-5xgkngpb.js:4142296-4143036 placement
/**
 * 同线程宿主执行插件的流式宿主操作：拷贝参数与每个块，放弃时中止并关闭底层流。
 */
var runHostStreamOpSameThread = (context, request) =>
  (async function* () {
    let { state, copy } = context;
    let { environmentId, op, args, signal, dispatchId } = request;
    let args_2 = copy(args, `${op} arguments`);
    let abortController = new AbortController();
    let releaseSignal = forwardAbort(signal, abortController);
    let opControllers = state.opControllers.get(environmentId) ?? new Set();
    state.opControllers.set(environmentId, opControllers);
    opControllers.add(abortController);
    let dispatch = dispatchId === undefined ? undefined : state.dispatches.get(dispatchId);
    let releaseDispatchSignal = forwardAbort(dispatch?.signal, abortController);
    let threw = false;
    try {
      let rethrow = function (thrown) {
        threw = true;
        throw thrown;
      };
      let hookEnvironment = buildHookEnvironment(context, request, abortController.signal);
      let sourceIterator = cwdFromOrCall(hookEnvironment, () =>
        streamOpForPlugin(context.host, {
          op,
          args: args_2,
          caller: hookEnvironment,
        }),
      );
      try {
        while (true) {
          let endOpTracking = trackPluginOp(state.work, environmentId, op);
          let step = await cwdFromOrCall(hookEnvironment, () => sourceIterator.next())
            .catch(rethrow)
            .finally(endOpTracking);
          if (step.done === true) {
            threw = true;
            return copy(step.value, `${op} result`);
          }
          yield copy(step.value, `${op} chunk`);
        }
      } finally {
        if (!threw) {
          abortController.abort(new HooksError(`${op}: stream let go`));
          await cwdFromOrCall(hookEnvironment, () => sourceIterator.return(undefined)).catch(() => {
            return;
          });
        }
      }
    } finally {
      releaseSignal();
      releaseDispatchSignal();
      opControllers.delete(abortController);
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
