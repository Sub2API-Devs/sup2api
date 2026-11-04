/**
 * plugins/functionHooks/vm/moduleLoader.ts
 *
 * 钩子模块加载、链接与 engine.create 调用（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4121qate.js (43)
 * attribution: placement 43
 */
import "vm";
import * as vmModule_2 from "vm";
import "vm";
import "vm";
import "vm";
import "vm";
import "vm";
import "vm";
import "vm";
import "vm";
import "vm";
import "vm";
import "vm";
import "vm";
import { pathToFileURL } from "url";
import { dirname, resolve, relative } from "path";
import { types } from "util";
import {
  forwardGenerator,
  teeGeneratorResult,
  getStreamResultPromise,
  onGeneratorReturn,
} from "../dispatch/streamChain.js";
import {
  HooksError,
  isAbortSignalLike,
  addWeakSetTag,
  envUnloadedError,
  answerNotPlainData,
  argsNotPlainData,
  nextNotPlainData,
  tagError,
  tagPayload,
} from "../hooksErrors.js";
import {
  uiElementKey,
  nullPrototypeFunction,
  createWithheldElementWarner,
  pickErrorState,
  forwardAbort,
  freezeHookCall,
  callNextWith,
  makeHookCall,
  forwardNext,
} from "../dispatch/chain.js";
import { elementBuildersFor, isElementType_2, buildElementTable } from "../ui/elements.js";
import {
  STAMP_CURRENT_CALL_SLOT,
  STAMP_ENVIRONMENT_SLOT,
  VM_ELEMENT_TABLE_SOURCE,
  valueKindOf,
  markScrollActivity,
  runTimerCallback,
  fireTimerOnce,
  clearTimerHandle,
  createVmConsole,
  createVmContext,
  nullPrototypeObject,
  patchErrorHasInstance,
  patchProtoSetter,
  VM_HOST_CALL_WRAPPER_SOURCE,
  STAMP_CALLER_STACK_START,
} from "./vmGlobals.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { isUiElementTypeName } from "../ui/renderSites.js";
import { withUseStrict, functionNameMarks } from "./vmBootstrapSource.js";
import { clone } from "../../../utils/slowOperations.js";
import { errorMessage } from "../../../utils/errors.js";
import {
  STACK_NESTING_TOO_DEEP_MESSAGE,
  STACK_OVERFLOW_MESSAGES,
} from "../../../utils/structuredCloneLimits.js";
import { isUntrustedObject } from "../../../utils/untrustedValues.js";
import { probeHookCallback, STATE_RESOURCE, matchesEventPattern } from "../eventPatterns.js";
import { isFiniteNonNegativeNumber } from "../api/operations.js";
import { registerHooksModule } from "../api/register.js";
import {
  deepFreezeInPlace,
  MAX_MATCHER_CHARS,
  testRegExpMatcher,
  matchesMatcher,
} from "../../../utils/hooks/functionHookMatchers.js";
import {
  CLAUDE_CODE,
  isDotRelativePath,
  bareImportError,
  resolveHooksImport,
  transpileHooksSource,
} from "../moduleLoader.js";
import { rewriteClientModulePaths } from "../clientSurfaceScan.js";
import { refuseDynamicImport, scanHooksFile } from "../moduleScan.js";
import { identity } from "../../../utils/identity.js";
import { createValueSlot } from "../../../utils/valueSlot.js";
import { SubAgentContext } from "../../../components/CtrlOToExpand.js";
import { createVmRealm, NO_IMPORT_OPTIONS } from "./vmRealm.js";
import { lookupPathTable } from "../../../utils/pathTable.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-4121qate.js:303344-303523 placement
function createArgumentTracker(cloneIn) {
  let weakSet = new WeakSet();
  return {
    argumentFor: (value) => {
      let clone = cloneIn(value);
      if (typeof clone === "object" && clone !== null) weakSet.add(clone);
      return clone;
    },
    isDelivered: (value) => typeof value === "object" && value !== null && weakSet.has(value),
  };
}
//@ chunk-4121qate.js:303523-303590 placement
/**
 * 转发的流式操作
 */
var forwardedStreamOps = (request, send) =>
  forwardGenerator({
    next: () => send(request, "next"),
    return: () => send(request, "return"),
  });
//@ chunk-4121qate.js:303590-303711 placement
/**
 * 环境缺少宿主流式操作时，返回一个立即抛错的流式结果。
 */
var noStreamingOps = (apiName) =>
  teeGeneratorResult(
    (async function* () {
      throw new HooksError(`$.${apiName}: this environment was made without the host's streaming ops`);
    })(),
  );
//@ chunk-4121qate.js:303711-303782 placement
/**
 * 缓存的 ui.resolve 答案
 */
function cachedResolveAnswer(weakMap, request) {
  return typeof request === "object" && request !== null ? weakMap.get(request) : undefined;
}
//@ chunk-4121qate.js:303782-304112 placement
/**
 * 按 (surface, component) 缓存 ui.resolve 答案的 VM 副本，未命中时按 surface 构造默认值。
 */
function createSurfaceAnswerCache(build) {
  let byKey = new Map();
  let bySurface = new Map();
  return {
    read(request) {
      let cached = byKey.get(uiElementKey(request));
      if (cached !== undefined) return cached;
      let builders =
        bySurface.get(request.surface) ?? build(elementBuildersFor(request.surface), request.surface);
      bySurface.set(request.surface, builders);
      return builders;
    },
    store(entries) {
      let byAnswer = new Map();
      byKey.clear();
      for (let { surface, component, answer } of entries) {
        let built = byAnswer.get(answer) ?? build(answer, surface);
        byAnswer.set(answer, built);
        byKey.set(
          uiElementKey({
            surface,
            component,
          }),
          built,
        );
      }
    },
  };
}
//@ chunk-4121qate.js:304112-304264 placement
var stampEnvironmentAcrossAwait =
  (stamp, current = () => stamp?.environmentId ?? 0) =>
  async (promise) => {
    function storeStamp() {
      if (stamp) Atomics.store(stamp.view, STAMP_CURRENT_CALL_SLOT, current());
    }
    storeStamp();
    queueMicrotask(storeStamp);
    try {
      return await promise;
    } finally {
      storeStamp();
    }
  };
//@ chunk-4121qate.js:304264-304514 placement
var createSignalRelay = (pluginName, makers) => (signal) => {
  if (signal === undefined || signal === null) return;
  if (!isAbortSignalLike(signal))
    throw new HooksError(`${pluginName}: options.signal must be an AbortSignal`);
  let abortController = new AbortController();
  let unlink = makers.relaySignal(
    signal,
    nullPrototypeFunction((name, errorName) => {
      let error = new HooksError(errorName);
      error.name = name;
      abortController.abort(error);
    }),
  );
  return {
    signal: abortController.signal,
    unlink,
  };
};
//@ chunk-4121qate.js:304514-304756 placement
var runWithEnvironmentStamp =
  (stamp, current = () => stamp?.environmentId ?? 0) =>
  (fn) => {
    if (!stamp) return fn();
    let { view, environmentId } = stamp;
    let previousEnvironment = Atomics.load(view, STAMP_ENVIRONMENT_SLOT);
    Atomics.store(view, STAMP_ENVIRONMENT_SLOT, environmentId);
    Atomics.store(view, STAMP_CURRENT_CALL_SLOT, current());
    try {
      return fn();
    } finally {
      Atomics.store(view, STAMP_ENVIRONMENT_SLOT, previousEnvironment);
      Atomics.store(
        view,
        STAMP_CURRENT_CALL_SLOT,
        previousEnvironment === 0 ? current() : previousEnvironment,
      );
    }
  };
//@ chunk-4121qate.js:304756-304980 placement
/**
 * 把宿主异步迭代器桥接为 VM 内的流对象（next/return/result 都经包装与克隆）。
 */
function createVmStreamBridge({ vmStream, wrapMethod, cloneIn }, unwrap = (step) => step) {
  let cloneStep = (step) =>
    cloneIn({
      done: step.done === true,
      value: step.value,
    });
  return (generator) =>
    vmStream(
      wrapMethod(async () => cloneStep(await unwrap(generator.next()))),
      wrapMethod(async () => cloneStep(await unwrap(generator.return(undefined)))),
      wrapMethod(async () => cloneIn(await unwrap(getStreamResultPromise(generator)))),
    );
}
//@ chunk-4121qate.js:304980-305044 placement
/**
 * 取参数里的 surface
 */
function surfaceOfArg(arg) {
  let surface = (isPlainObject(arg) ? arg : {}).surface;
  return isUiElementTypeName(surface) ? surface : undefined;
}
//@ chunk-4121qate.js:305066-305414 placement
/**
 * 在 VM 中创建元素构造器表（包装宿主构造器并标记名字）。
 */
function createVmElementTable(options) {
  let { context, wrapMethod, cloneIn, pluginName, vmClone } = options;
  let buildTable = vmModule_2.runInContext(withUseStrict(VM_ELEMENT_TABLE_SOURCE), context);
  let withheldElementWarner = createWithheldElementWarner(pluginName);
  return (table, pluginName) => {
    if (!isPlainObject(table)) return vmClone(table);
    let filtered = Object.keys(table)
      .filter(isElementType_2)
      .filter((key) => functionNameMarks.nameOf(table[key]) === key);
    let built = buildTable(
      Object.entries(
        buildElementTable(
          table,
          (builder) => wrapMethod((props) => cloneIn(builder(props))),
          withheldElementWarner(pluginName),
        ),
      ),
      filtered,
    );
    for (let typeName of filtered) {
      let builder = built[typeName];
      if (typeof builder === "function") functionNameMarks.mark(builder, typeName);
    }
    return built;
  };
}
//@ chunk-4121qate.js:305414-305428 placement
/**
 * 原样返回
 */
var keepValueFn = (fn) => fn;
//@ chunk-4121qate.js:305428-305940 placement
/**
 * 创建钩子轨迹克隆器：把轨迹条目克隆到 VM 中（缓存并冻结）。
 */
function createTraceCloner(options) {
  let { vmClone, cloneIn } = options;
  let emptyTrace = Object.freeze(vmClone([]));
  let weakMap = new WeakMap();
  function cloneStep(step) {
    let clonedStep = weakMap.get(step);
    if (clonedStep !== undefined) return clonedStep;
    let { index, plugin, tier, event, outcome, reason, ms } = step;
    let cloned = Object.freeze(
      Object.assign(
        vmClone({
          index,
          plugin,
          tier,
          event,
          outcome,
          ...(reason === undefined
            ? {}
            : {
                reason,
              }),
          ms,
        }),
        {
          received: cloneIn(step.received),
          returned: step.returned === undefined ? undefined : cloneIn(step.returned),
        },
      ),
    );
    weakMap.set(step, cloned);
    return cloned;
  }
  return (steps) => {
    if (steps.length === 0) return emptyTrace;
    let out = vmClone([]);
    for (let [index, step] of steps.entries()) out[index] = cloneStep(step);
    return Object.freeze(out);
  };
}
//@ chunk-4121qate.js:305940-305997 placement
/**
 * 克隆失败时的文本
 */
function cloneErrorText(value) {
  try {
    clone(value);
    return "";
  } catch (error) {
    return errorMessage(error);
  }
}
//@ chunk-4121qate.js:305997-306109 placement
/**
 * 检查值能否离开 VM 边界，不能则抛 HooksError（特定拒绝标记为栈溢出类）。
 */
function checkLeavingValue(bare, value, message) {
  let refusal = bare.leavingRefusal(value);
  if (refusal !== undefined) {
    let error = new HooksError(message(refusal));
    throw refusal === STACK_NESTING_TOO_DEEP_MESSAGE ? addWeakSetTag(error) : error;
  }
  return value;
}
//@ chunk-4121qate.js:306109-306691 placement
/**
 * 按所有者逐项复制对象条目到 VM。
 */
function copyOwnedEntries(entries, vmClone, blamedWalk) {
  if (!(
    typeof entries === "object" &&
    entries !== null &&
    !isUntrustedObject(entries) &&
    !Array.isArray(entries)
  ))
    return vmClone(entries);
  let record = entries;
  let keys = Object.keys(record);
  let mapped = keys.map((key) => Reflect.getOwnPropertyDescriptor(record, key));
  if (!mapped.every((descriptor) => descriptor !== undefined && "value" in descriptor))
    return vmClone(entries);
  let out = Object(vmClone({}));
  blamedWalk((descend, visit, finish) => {
    for (let [index, key] of keys.entries()) {
      let value = mapped[index]?.value;
      let owner =
        typeof value === "object" && value !== null && !isUntrustedObject(value)
          ? Reflect.getOwnPropertyDescriptor(value, "owner")?.value
          : undefined;
      if (key !== "__proto__")
        visit(owner, () => {
          let ownPropertyDescriptor = Reflect.getOwnPropertyDescriptor(
            Object(
              vmClone({
                entry: value,
              }),
            ),
            "entry",
          );
          if (ownPropertyDescriptor !== undefined) Reflect.defineProperty(out, key, ownPropertyDescriptor);
          return ownPropertyDescriptor?.value;
        });
    }
    finish(() => out);
  });
  return out;
}
//@ chunk-4121qate.js:306691-307138 placement
/**
 * 逐项复制 record 条目到 VM。
 */
function copyRecordEntries(record, leavingAnswer, blamedWalk) {
  let isRecord = blamedWalk(record) && valueKindOf(record) === "record";
  let keys = isRecord ? Object.keys(record) : [];
  let mapped = keys.map((key) => Reflect.getOwnPropertyDescriptor(record, key));
  if (!(isRecord && mapped.every((descriptor) => descriptor !== undefined && "value" in descriptor)))
    return leavingAnswer(record);
  let out = Object(leavingAnswer({}));
  for (let [index, key] of keys.entries()) {
    let value = mapped[index]?.value;
    blamedWalk(typeof value === "object" && value !== null ? value : undefined);
    let answer = Object(
      leavingAnswer({
        [key]: value,
      }),
    );
    if (typeof answer === "function") return answer;
    let ownPropertyDescriptor = Reflect.getOwnPropertyDescriptor(answer, key);
    if (ownPropertyDescriptor !== undefined) Reflect.defineProperty(out, key, ownPropertyDescriptor);
  }
  return out;
}
//@ chunk-4121qate.js:307138-311328 placement
/**
 * 加载钩子模块并调用 engine.create，装配 $ 与计时器
 */
async function createHooksEngine({ bare, args, host, bounds = {}, loaded, isInstallingGlobals }) {
  let { pluginName } = args;
  let {
    stamp,
    signal,
    framed = (request, run) => run(),
    hostStream = noStreamingOps,
    blamedFor,
    blamedWalk = probeHookCallback,
  } = bounds;
  let isUnloaded = false;
  let currentEntry = () => blamedFor?.() ?? stamp?.environmentId ?? 0;
  let stamped = runWithEnvironmentStamp(stamp, currentEntry);
  let stampedAcrossAwait = stampEnvironmentAcrossAwait(stamp, currentEntry);
  let timers = new Map();
  let timerId = 0;
  let {
    globals,
    context,
    vmCall,
    vmApply,
    vmSettle,
    vmOwns,
    copyMatcher,
    vmClone,
    cloneIn,
    leavingCopy,
    leavingAnswer,
    freezeOwn,
    vmAsyncWrap,
    makers,
    fromEnvironment,
    intoEnvironment,
    wrapMethod,
    vmIterate,
    isGeneratorHook,
  } = bare;
  async function iterateOnce(generator, value, arg) {
    if (isUnloaded) throw envUnloadedError(pluginName);
    try {
      let step = await stamped(() => vmIterate(generator, value, arg));
      return {
        ...step,
        value: vmClone(step.value),
      };
    } catch (error) {
      throw fromEnvironment(error);
    }
  }
  let iterate = (generator) => forwardedStreamOps(generator, iterateOnce);
  let copiesLeaving = args.isLeavingUncopied !== true;
  let { argumentFor, isDelivered } = createArgumentTracker(cloneIn);
  let copyLeaving = (value) => (copiesLeaving ? stamped(() => leavingCopy(value)) : value);
  function copyAnswer(value, event) {
    let record =
      event === "engine.create" && stamp !== undefined && typeof value === "object" && value !== null
        ? value
        : undefined;
    return record === undefined
      ? leavingAnswer(value)
      : blamedWalk((walk) => copyRecordEntries(record, leavingAnswer, walk));
  }
  let leaving = (value, event) =>
    copiesLeaving
      ? checkLeavingValue(
          bare,
          stamped(() => copyAnswer(value, event)),
          answerNotPlainData,
        )
      : value;
  let copyForArguments = (op, value) =>
    checkLeavingValue(bare, copyLeaving(value), (text) => argsNotPlainData(op, text));
  function copyForNext(value) {
    if (!copiesLeaving || isDelivered(value)) return value;
    let copied = checkLeavingValue(bare, copyLeaving(value), nextNotPlainData);
    if (typeof copied === "function" && typeof value !== "function")
      throw new HooksError(nextNotPlainData(cloneErrorText(copied)));
    stamped(() => freezeOwn(value));
    return copied;
  }
  let vmStreamBridge = createVmStreamBridge(bare, stampedAcrossAwait);
  function invokeSync(fn, arg) {
    if (isUnloaded) throw envUnloadedError(pluginName);
    try {
      return stamped(() => cloneIn(vmCall(fn, cloneIn(arg))));
    } catch (error) {
      throw fromEnvironment(error);
    }
  }
  function applySync(fn, thisArg, ...args) {
    if (isUnloaded) throw envUnloadedError(pluginName);
    try {
      return stamped(() => vmApply(fn, thisArg, ...args));
    } catch (error) {
      throw fromEnvironment(error);
    }
  }
  let invokeAsync = async (fn, args, thisArg) => {
    if (isUnloaded) throw envUnloadedError(pluginName);
    let result;
    try {
      result = stamped(() => (thisArg === undefined ? vmCall(fn, ...args) : vmApply(thisArg, fn, ...args)));
    } catch (error) {
      throw fromEnvironment(error);
    }
    try {
      return (await vmSettle(result)).v;
    } catch (error) {
      throw fromEnvironment(error);
    }
  };
  let signalRelay = createSignalRelay(pluginName, makers);
  let build = createVmElementTable({
    context,
    wrapMethod,
    cloneIn,
    pluginName,
    vmClone,
  });
  let traceCloner = createTraceCloner({
    vmClone,
    cloneIn,
  });
  let surfaceAnswerCache = createSurfaceAnswerCache(build);
  let weakMap = new WeakMap();
  function toHostError(op, error) {
    let hostError = intoEnvironment(error);
    if (typeof hostError !== "object" || !hostError) return hostError;
    weakMap.set(hostError, {
      plugin: pluginName,
      op,
      message: errorMessage(error),
    });
    return isUnloaded ? tagError(hostError, weakMap.get(hostError)) : hostError;
  }
  let host_2 = vmAsyncWrap(async (...args) => {
    let [op, arg, signal] = args;
    let relayed;
    try {
      relayed = signalRelay(signal);
      return vmClone(await stampedAcrossAwait(host(op, copyForArguments(op, arg), relayed?.signal)));
    } catch (error) {
      throw toHostError(op, error);
    } finally {
      relayed?.unlink();
    }
  });
  let hostStream_2 = (...args) => {
    let [op, arg, signal] = args;
    let relayed = signalRelay(signal);
    let sourceStream = hostStream(op, copyForArguments(op, arg), relayed?.signal);
    async function* forwarded() {
      try {
        return yield* sourceStream;
      } catch (error) {
        throw isUnloaded ? tagError(error, tagPayload(pluginName, op, errorMessage(error))) : error;
      } finally {
        relayed?.unlink();
      }
    }
    return vmStreamBridge(
      onGeneratorReturn(teeGeneratorResult(forwarded), () => {
        sourceStream.return(undefined).catch(() => {
          return;
        });
      }),
    );
  };
  function makeTimer(isRepeating) {
    let apiName = isRepeating ? "setInterval" : "setTimeout";
    return nullPrototypeFunction(
      wrapMethod((fn, delayMs, ...args) => {
        if (typeof fn !== "function") throw new HooksError(`${pluginName}: ${apiName} takes a function`);
        if (isUnloaded) throw new HooksError(`${pluginName}: ${apiName}: its environment was unloaded`);
        let delay = isFiniteNonNegativeNumber(delayMs) ? delayMs : 0;
        let id = ++timerId;
        let timer = keepValueFn({
          pluginName,
          api: apiName,
          invoke: (fn, args) => {
            markScrollActivity(stamp?.view);
            return invokeAsync(fn, args);
          },
          fn,
          args,
        });
        let handle = isRepeating
          ? setInterval(runTimerCallback, delay, timer)
          : setTimeout(fireTimerOnce, delay, {
              timers,
              id,
              fire: timer,
            });
        timers.set(id, {
          handle,
          repeat: isRepeating,
        });
        return id;
      }),
    );
  }
  let clearTimer = nullPrototypeFunction(
    wrapMethod((id) => {
      if (typeof id !== "number") return;
      let timer = timers.get(id);
      if (timer) {
        timers.delete(id);
        clearTimerHandle(timer);
      }
    }),
  );
  if (isInstallingGlobals)
    Object.assign(globals, {
      setTimeout: makeTimer(false),
      setInterval: makeTimer(true),
      clearTimeout: clearTimer,
      clearInterval: clearTimer,
      console: createVmConsole(wrapMethod, `[${pluginName}]`),
    });
  let args_2 = {
    ...args,
    options: vmClone(args.options),
  };
  signal?.addEventListener("abort", markUnloaded, {
    once: true,
  });
  let activation;
  try {
    activation = await registerHooksModule({
      loaded: await loaded(stamped),
      args: args_2,
      host: host_2,
      hostStream: hostStream_2,
      resolvedTable: surfaceAnswerCache.read,
      invoke: invokeAsync,
      iterate,
      streamIn: vmStreamBridge,
      isGeneratorHook,
      wrapMethod,
      blamedWalk,
      signalFrom: signalRelay,
      makeSignal: () => {
        let { signal, abort } = makers.makeSignal();
        return {
          signal,
          abort: (reason) => stamped(() => abort(intoEnvironment(reason))),
        };
      },
      copyMatcher,
      stamped,
      framed,
    });
    if (signal?.aborted === true) throw new HooksError(`${pluginName}: unloaded while its module loaded`);
  } catch (error) {
    markUnloaded();
    throw error;
  }
  function markUnloaded() {
    isUnloaded = true;
    for (let timer of timers.values()) clearTimerHandle(timer);
    timers.clear();
  }
  function hookCallFor(input) {
    let errorState = pickErrorState(input);
    let { signal, abort } = makers.makeSignal();
    forwardAbort(input.signal, {
      abort: (reason) => stamped(() => abort(intoEnvironment(reason))),
    });
    return {
      signal,
      is: nullPrototypeFunction(wrapMethod(input.is)),
      event: input.event,
      origin: cloneIn(input.origin),
      trace: wrapMethod(() => traceCloner(input.trace)),
      budget: wrapMethod(() => cloneIn(input.budget)),
      caught: errorState && {
        ...errorState,
        error: cloneIn(errorState.error),
      },
    };
  }
  return {
    activation,
    invoke: invokeAsync,
    invokeSync,
    applyIn: applySync,
    cloneIn,
    argumentFor,
    freezeForNext: deepFreezeInPlace,
    leaving,
    nextFor: (next, event) => {
      let isResolve = event === "ui.resolve";
      let copyAnswer =
        event === "engine.create" && stamp !== undefined
          ? (value) => stamped(() => copyOwnedEntries(value, vmClone, blamedWalk))
          : vmClone;
      let finishCopy = (value, event) => (isResolve ? build(value, surfaceOfArg(event)) : copyAnswer(value));
      return freezeHookCall({
        ...hookCallFor(next),
        call: wrapMethod(async (value) => {
          let copied = copyForNext(value);
          return finishCopy(await stampedAcrossAwait(next(copied)), copied);
        }),
        to: wrapMethod(async (value, ...args) => {
          let copied = copyForNext(value);
          return finishCopy(await stampedAcrossAwait(callNextWith(copied, next, args.map(vmClone))), copied);
        }),
      });
    },
    streamNextFor: (stream) =>
      makeHookCall({
        ...hookCallFor(stream),
        call: wrapMethod((value) => vmStreamBridge(stream(vmClone(value)))),
        to: wrapMethod((value, ...args) =>
          vmStreamBridge(forwardNext(vmClone(value), stream, args.map(vmClone))),
        ),
      }),
    storeResolved: surfaceAnswerCache.store,
    dispose: () => {
      markUnloaded();
      activation.dispose();
    },
    opFailureOf: (error) => cachedResolveAnswer(weakMap, error),
    ownsValue: vmOwns,
  };
}
//@ chunk-4121qate.js:311496-311544 placement
/**
 * 文件模块引用
 */
var fileModuleRef = (path) => ({
  url: pathToFileURL(path).href,
  dir: dirname(path),
  file: path,
});
//@ chunk-4121qate.js:311566-311851 placement
var IMPORT_REFUSAL_SOURCE = `(() => {
  const REFUSAL = new Error(
    'import() is not available: a hooks module imports its own files ' +
      'with an import declaration',
  )
  REFUSAL.stack = String(REFUSAL.stack).split('\\n')[0]
  Object.freeze(REFUSAL)
  return () => {
    throw REFUSAL
  }
})()`;
//@ chunk-4121qate.js:311851-311890 placement
/**
 * 执行 import 拒绝源码
 */
var runImportRefusal = (context) => vmModule_2.runInContext(withUseStrict(IMPORT_REFUSAL_SOURCE), context);
//@ chunk-4121qate.js:311890-311939 placement
/**
 * 长度+内容拼接
 */
var prefixedSource = (text, prefix) => `${prefix.length}:${prefix}${text.length}:${text}`;
//@ chunk-4121qate.js:311971-312038 placement
/**
 * 导入路径 → 文件
 */
var importFileMap = (links) =>
  new Map(links.map((link) => [prefixedSource(link.spelled, resolve(link.from)), link.file]));
//@ chunk-4121qate.js:312038-312089 placement
/**
 * 文件 → 源码
 */
var fileSourceMap = (linked) => new Map(linked.map((file) => [file.file, file.source]));
//@ chunk-4121qate.js:312089-314364 placement
/**
 * 链接钩子模块及其导入（处理栈溢出、错误状态）
 */
function linkHooksModule(options) {
  let { args, context, stamped, evaluateOptions, isScanned } = options;
  let { pluginName, pluginRoot } = args;
  let resolvedPluginRoot = resolve(pluginRoot);
  let modules = new Map();
  let sources = new Map();
  let loadedFiles = new Set();
  let importModuleDynamically = runImportRefusal(context);
  let stateModule = new vmModule_2.SourceTextModule(STATE_RESOURCE, {
    context,
    identifier: CLAUDE_CODE,
    importModuleDynamically,
  });
  let sourcesByFile = fileSourceMap(args.linked);
  let filesByImportKey = importFileMap(args.links);
  async function moduleFor(specifier, referent) {
    if (specifier === CLAUDE_CODE) return stateModule;
    let virtual = options.virtual?.get(specifier);
    if (virtual) return virtual;
    if (!isDotRelativePath(specifier))
      throw bareImportError(
        pluginName,
        specifier,
        relative(resolvedPluginRoot, referent.identifier) || referent.identifier,
      );
    let linkedFile = filesByImportKey.get(prefixedSource(specifier, resolve(referent.identifier)));
    let linkedSource = linkedFile === undefined ? undefined : sourcesByFile.get(linkedFile);
    if (linkedFile !== undefined && linkedSource !== undefined)
      return moduleForFile(linkedFile, linkedSource);
    if (args.sealed === true)
      throw bareImportError(
        pluginName,
        specifier,
        relative(resolvedPluginRoot, referent.identifier) || referent.identifier,
      );
    let hooksImport = await resolveHooksImport(
      {
        spelled: specifier,
        importer: referent.identifier,
        root: resolvedPluginRoot,
        pluginName,
      },
      sourcesByFile,
      new Map(),
    );
    sourcesByFile.set(hooksImport.file, hooksImport.source);
    loadedFiles.add(hooksImport.file);
    return moduleForFile(hooksImport.file, hooksImport.source);
  }
  let evaluations = new Map();
  function evaluateModule(sourceModule) {
    if (sourceModule.status === "unlinked")
      evaluations.set(
        sourceModule.identifier,
        linkModule(sourceModule).then(() => stamped(() => sourceModule.evaluate(evaluateOptions))),
      );
    return evaluations.get(sourceModule.identifier);
  }
  async function linkModule(sourceModule) {
    let seenIdentifiers = new Set([sourceModule.identifier]);
    try {
      await sourceModule.link(async (specifier, referrer) => {
        let imported = await moduleFor(specifier, referrer);
        seenIdentifiers.add(imported.identifier);
        return imported;
      });
    } catch (error) {
      if (!isStackOverflowError(error)) throw error;
      let stackStub = new vmModule_2.SyntheticModule(
        [],
        () => {
          return;
        },
        {
          context,
        },
      );
      for (let [file, source] of sources)
        try {
          if (seenIdentifiers.has(file))
            await new vmModule_2.SourceTextModule(source, {
              context,
            }).link(() => stackStub);
        } catch (error_2) {
          if (isStackOverflowError(error_2))
            throw stackExhaustedError(pluginName, resolvedPluginRoot, file, error);
        }
      throw new HooksError(
        `${pluginName}: ${relative(resolvedPluginRoot, sourceModule.identifier)}: the engine ran out of stack linking the file and its imports (code nested too deep, or a chain of imports too long): ${error.message}`,
      );
    }
  }
  function evaluateLinked(sourceModule) {
    if (sourceModule.status === "errored") throw sourceModule.error;
    if (sourceModule.status === "linked") {
      let evaluation = stamped(() => sourceModule.evaluate(evaluateOptions));
      evaluations.set(sourceModule.identifier, evaluation);
      return evaluation;
    }
    return;
  }
  let moduleForFile = (file, source) => modules.get(file) ?? buildModule(file, source);
  function buildModule(file, sourceText) {
    let shouldScan = !isScanned || loadedFiles.has(file);
    let transpiled;
    try {
      transpiled = transpileHooksSource(file, sourceText);
    } catch (error) {
      throw !shouldScan && error instanceof HooksError
        ? new HooksError(
            `${pluginName}: ${relative(resolvedPluginRoot, file)} does not compile: ` + error.message,
          )
        : error;
    }
    let rewritten = rewriteClientModulePaths(transpiled, file, resolvedPluginRoot);
    let refusal = shouldScan ? refuseDynamicImport(scanHooksFile(file, rewritten, pluginName)) : undefined;
    if (refusal !== undefined) throw refusal;
    try {
      let sourceModule = new vmModule_2.SourceTextModule(rewritten, {
        context,
        identifier: file,
        initializeImportMeta: (importMeta) => {
          Object.assign(importMeta, fileModuleRef(file));
        },
        importModuleDynamically,
      });
      modules.set(file, sourceModule);
      sources.set(file, rewritten);
      return sourceModule;
    } catch (error) {
      throw isStackOverflowError(error)
        ? stackExhaustedError(pluginName, resolvedPluginRoot, file, error)
        : error;
    }
  }
  return {
    async load(path, source) {
      let file = resolve(path);
      sourcesByFile.set(file, source);
      let entryModule = moduleForFile(file, source);
      await evaluateModule(entryModule);
      await evaluateLinked(entryModule);
      let namespace = entryModule.namespace;
      if (Reflect.ownKeys(namespace).includes("then"))
        throw new HooksError(
          `${pluginName}: ${relative(resolvedPluginRoot, file)} exports the name "then" (its own, or through an export *), which no entry module may: rename the export`,
        );
      return namespace;
    },
  };
}
//@ chunk-4121qate.js:314364-314459 placement
/**
 * 是否栈溢出
 */
function isStackOverflowError(error) {
  return (
    types.isNativeError(error) &&
    error.name === "RangeError" &&
    STACK_OVERFLOW_MESSAGES.some((message) => message === error.message)
  );
}
//@ chunk-4121qate.js:314459-314597 placement
function stackExhaustedError(pluginName, pluginRoot, path, error) {
  return new HooksError(
    `${pluginName}: ${relative(pluginRoot, path)}: the engine ran out of stack loading the file (code nested too deep): ${error.message}`,
  );
}
//@ chunk-4121qate.js:314597-314655 placement
/**
 * 链接并加载模块
 */
var linkAndLoadModule = (options) =>
  linkHooksModule(options).load(options.args.modulePath, options.args.source);
//@ chunk-4121qate.js:314655-314691 placement
/**
 * 插件环境槽
 */
var pluginEnvSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-4121qate.js:314655", () => {
  pluginEnvSlot = identity(createValueSlot(), (slot) => slot.set(undefined));
});
//@ chunk-4121qate.js:314691-314721 placement
/**
 * 取插件的环境
 */
var envForPlugin = (pluginName) => pluginEnvSlot.get()?.get(pluginName);
//@ chunk-4121qate.js:314721-314946 placement
/**
 * 为插件 hooks 模块创建环境：优先使用登记的测试工厂，否则新建 VM 上下文并加载、链接模块后创建 engine。
 */
function createHooksEnvironment(host, args, bounds = {}) {
  let customEnv = envForPlugin(args.modulePath);
  if (customEnv) return customEnv(args, host, bounds);
  let vmContext = createVmContext(args.pluginRoot);
  return createHooksEngine({
    bare: vmContext,
    args,
    host,
    bounds,
    isInstallingGlobals: true,
    loaded: (stamped) =>
      linkAndLoadModule({
        args,
        context: vmContext.context,
        isScanned: true,
        stamped,
      }),
  });
}
//@ chunk-4121qate.js:314946-315055 placement
/**
 * 执行函数并在之后恢复共享视图中的环境戳。
 */
function runPreservingStamp(stamp, fn) {
  let previous = stamp === undefined ? 0 : Atomics.load(stamp, STAMP_CURRENT_CALL_SLOT);
  try {
    return fn();
  } finally {
    if (stamp) Atomics.store(stamp, STAMP_CURRENT_CALL_SLOT, previous);
  }
}
//@ chunk-4121qate.js:315055-315083 placement
/**
 * 是否已登记环境
 */
var hasRegisteredEnv = (pluginName) => envForPlugin(pluginName) !== undefined;
//@ chunk-4121qate.js:315083-315313 placement
function rejectionMessage(error) {
  if (!error) return "a rejection that is not an Error";
  if (isUntrustedObject(error)) return "a rejection that is not plain data";
  let message = Object.getOwnPropertyDescriptor(error, "message")?.value;
  return typeof message === "string" ? message : rejectionMessage(Object.getPrototypeOf(error));
}
//@ chunk-4121qate.js:315313-315395 placement
/**
 * 拒绝值转文本
 */
function rejectionText(error) {
  return typeof error !== "object" && typeof error !== "function" ? String(error) : rejectionMessage(error);
}
//@ chunk-4121qate.js:315395-315438 placement
var CAPABILITY_OPTIONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-4121qate.js:315395", () => {
  CAPABILITY_OPTIONS = Object.freeze({
    strings: false,
    wasm: false,
  });
});
//@ chunk-4121qate.js:315438-315480 placement
var COMPILE_OPTIONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-4121qate.js:315438", () => {
  COMPILE_OPTIONS = Object.freeze({
    codeGeneration: CAPABILITY_OPTIONS,
  });
});
//@ chunk-4121qate.js:315480-315570 placement
/**
 * 新建 VM 宿主上下文
 */
function newVmHostContext() {
  let sandbox = nullPrototypeObject();
  let context = SubAgentContext(sandbox, COMPILE_OPTIONS);
  patchErrorHasInstance(context);
  patchProtoSetter(context);
  createVmRealm(context, NO_IMPORT_OPTIONS);
  return {
    sandbox,
    context,
  };
}
//@ chunk-4121qate.js:315592-315640 placement
/**
 * 带调用栈戳执行
 */
var runInVmWithTrace = (context, intoEnvironment) =>
  vmModule_2.runInContext(
    withUseStrict(VM_HOST_CALL_WRAPPER_SOURCE),
    context,
  )(nullPrototypeFunction(intoEnvironment));
//@ chunk-4121qate.js:315640-315877 placement
/**
 * 执行函数期间把调用栈戳写入共享视图，结束后恢复原值。
 */
function runWithStackStamps(stamp, entries, fn) {
  if (!stamp) return fn();
  let slots = stamp.length - STAMP_CALLER_STACK_START;
  let list = Array.from(
    {
      length: slots,
    },
    (unused, index) => Atomics.load(stamp, STAMP_CALLER_STACK_START + index),
  );
  for (let index = 0; index < slots; index++)
    Atomics.store(stamp, STAMP_CALLER_STACK_START + index, entries[index] ?? 0);
  try {
    return fn();
  } finally {
    for (let [index, slot] of list.entries()) Atomics.store(stamp, STAMP_CALLER_STACK_START + index, slot);
  }
}
//@ chunk-4121qate.js:315877-316014 placement
/**
 * 未被 await 的 $ 调用失败时的消息："<插件>: $.<op> (not awaited): <原因>"。
 */
function unawaitedOpMessage(payload) {
  let prefix = `${payload.plugin}: `;
  let { message } = payload;
  return `${payload.plugin}: $.${payload.op} (not awaited): ${message.startsWith(prefix) ? message.slice(prefix.length) : message}`;
}
//@ chunk-4121qate.js:316014-316052 placement
/**
 * 命中 user 子句
 */
var matchesUserClause = (pattern, clause) =>
  clause.length <= MAX_MATCHER_CHARS && testRegExpMatcher(pattern, clause);
//@ chunk-4121qate.js:316052-316247 placement
/**
 * 判断某事件是否命中插件扫描时声明的 next.to user 子句（模式与 matcher 都匹配）。
 */
function isNextToUserTarget({ clauses, scan, event, raised }) {
  try {
    return clauses.some(
      ({ pattern, matcher }) =>
        scan.toUserOn?.includes(pattern) === true &&
        matchesEventPattern(pattern, event) &&
        (matcher === undefined ||
          matchesMatcher(matcher, raised, {
            test: matchesUserClause,
            names: lookupPathTable(event),
          })),
    );
  } catch {
    return false;
  }
}
export {
  createHooksEngine,
  linkAndLoadModule,
  pluginEnvSlot,
  runPreservingStamp,
  runWithStackStamps,
  isNextToUserTarget,
  createHooksEnvironment,
  hasRegisteredEnv,
  runImportRefusal,
  checkLeavingValue,
  createVmStreamBridge,
  createSurfaceAnswerCache,
  cachedResolveAnswer,
  noStreamingOps,
  unawaitedOpMessage,
  rejectionText,
  newVmHostContext,
  runInVmWithTrace,
  linkHooksModule,
};
