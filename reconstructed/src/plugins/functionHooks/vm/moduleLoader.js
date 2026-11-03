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
import { createVmRealm, vUe } from "./vmRealm.js";
import { lookupPathTable } from "../../../utils/pathTable.js";

//@ chunk-4121qate.js:303344-303523 placement
function createArgumentTracker(cloneIn) {
  let weakSet = new WeakSet();
  return {
    argumentFor: (r) => {
      let n = cloneIn(r);
      if (typeof n === "object" && n !== null) weakSet.add(n);
      return n;
    },
    isDelivered: (r) => typeof r === "object" && r !== null && weakSet.has(r),
  };
}
//@ chunk-4121qate.js:303523-303590 placement
/**
 * 转发的流式操作
 */
var forwardedStreamOps = (e, o) =>
  forwardGenerator({
    next: () => o(e, "next"),
    return: () => o(e, "return"),
  });
//@ chunk-4121qate.js:303590-303711 placement
/**
 * 环境缺少宿主流式操作时，返回一个立即抛错的流式结果。
 */
var noStreamingOps = (e) =>
  teeGeneratorResult(
    (async function* () {
      throw new HooksError(`$.${e}: this environment was made without the host's streaming ops`);
    })(),
  );
//@ chunk-4121qate.js:303711-303782 placement
/**
 * 缓存的 ui.resolve 答案
 */
function cachedResolveAnswer(weakMap, o) {
  return typeof o === "object" && o !== null ? weakMap.get(o) : undefined;
}
//@ chunk-4121qate.js:303782-304112 placement
/**
 * 按 (surface, component) 缓存 ui.resolve 答案的 VM 副本，未命中时按 surface 构造默认值。
 */
function createSurfaceAnswerCache(e) {
  let o = new Map();
  let r = new Map();
  return {
    read(n) {
      let s = o.get(uiElementKey(n));
      if (s !== undefined) return s;
      let i = r.get(n.surface) ?? e(elementBuildersFor(n.surface), n.surface);
      r.set(n.surface, i);
      return i;
    },
    store(n) {
      let s = new Map();
      o.clear();
      for (let { surface, component, answer } of n) {
        let a = s.get(answer) ?? e(answer, surface);
        s.set(answer, a);
        o.set(
          uiElementKey({
            surface,
            component,
          }),
          a,
        );
      }
    },
  };
}
//@ chunk-4121qate.js:304112-304264 placement
var stampEnvironmentAcrossAwait =
  (stamp, o = () => stamp?.environmentId ?? 0) =>
  async (r) => {
    function n() {
      if (stamp) Atomics.store(stamp.view, STAMP_CURRENT_CALL_SLOT, o());
    }
    n();
    queueMicrotask(n);
    try {
      return await r;
    } finally {
      n();
    }
  };
//@ chunk-4121qate.js:304264-304514 placement
var createSignalRelay = (pluginName, makers) => (r) => {
  if (r === undefined || r === null) return;
  if (!isAbortSignalLike(r)) throw new HooksError(`${pluginName}: options.signal must be an AbortSignal`);
  let abortController = new AbortController();
  let unlink = makers.relaySignal(
    r,
    nullPrototypeFunction((name, p) => {
      let f = new HooksError(p);
      f.name = name;
      abortController.abort(f);
    }),
  );
  return {
    signal: abortController.signal,
    unlink,
  };
};
//@ chunk-4121qate.js:304514-304756 placement
var runWithEnvironmentStamp =
  (stamp, o = () => stamp?.environmentId ?? 0) =>
  (r) => {
    if (!stamp) return r();
    let { view, environmentId } = stamp;
    let i = Atomics.load(view, STAMP_ENVIRONMENT_SLOT);
    Atomics.store(view, STAMP_ENVIRONMENT_SLOT, environmentId);
    Atomics.store(view, STAMP_CURRENT_CALL_SLOT, o());
    try {
      return r();
    } finally {
      Atomics.store(view, STAMP_ENVIRONMENT_SLOT, i);
      Atomics.store(view, STAMP_CURRENT_CALL_SLOT, i === 0 ? o() : i);
    }
  };
//@ chunk-4121qate.js:304756-304980 placement
/**
 * 把宿主异步迭代器桥接为 VM 内的流对象（next/return/result 都经包装与克隆）。
 */
function createVmStreamBridge({ vmStream, wrapMethod, cloneIn }, n = (s) => s) {
  let s = (i) =>
    cloneIn({
      done: i.done === true,
      value: i.value,
    });
  return (i) =>
    vmStream(
      wrapMethod(async () => s(await n(i.next()))),
      wrapMethod(async () => s(await n(i.return(undefined)))),
      wrapMethod(async () => cloneIn(await n(getStreamResultPromise(i)))),
    );
}
//@ chunk-4121qate.js:304980-305044 placement
/**
 * 取参数里的 surface
 */
function surfaceOfArg(e) {
  let surface = (isPlainObject(e) ? e : {}).surface;
  return isUiElementTypeName(surface) ? surface : undefined;
}
//@ chunk-4121qate.js:305066-305414 placement
/**
 * 在 VM 中创建元素构造器表（包装宿主构造器并标记名字）。
 */
function createVmElementTable(e) {
  let { context, wrapMethod, cloneIn, pluginName, vmClone } = e;
  let p = vmModule_2.runInContext(withUseStrict(VM_ELEMENT_TABLE_SOURCE), context);
  let withheldElementWarner = createWithheldElementWarner(pluginName);
  return (a, m) => {
    if (!isPlainObject(a)) return vmClone(a);
    let filtered = Object.keys(a)
      .filter(isElementType_2)
      .filter((key) => functionNameMarks.nameOf(a[key]) === key);
    let u = p(
      Object.entries(buildElementTable(a, (l) => wrapMethod((y) => cloneIn(l(y))), withheldElementWarner(m))),
      filtered,
    );
    for (let l of filtered) {
      let y = u[l];
      if (typeof y === "function") functionNameMarks.mark(y, l);
    }
    return u;
  };
}
//@ chunk-4121qate.js:305414-305428 placement
/**
 * 原样返回
 */
var keepValueFn = (e) => e;
//@ chunk-4121qate.js:305428-305940 placement
/**
 * 创建钩子轨迹克隆器：把轨迹条目克隆到 VM 中（缓存并冻结）。
 */
function createTraceCloner(e) {
  let { vmClone, cloneIn } = e;
  let n = Object.freeze(vmClone([]));
  let weakMap = new WeakMap();
  function i(p) {
    let f = weakMap.get(p);
    if (f !== undefined) return f;
    let { index, plugin, tier, event, outcome, reason, ms } = p;
    let x = Object.freeze(
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
          received: cloneIn(p.received),
          returned: p.returned === undefined ? undefined : cloneIn(p.returned),
        },
      ),
    );
    weakMap.set(p, x);
    return x;
  }
  return (p) => {
    if (p.length === 0) return n;
    let f = vmClone([]);
    for (let [a, m] of p.entries()) f[a] = i(m);
    return Object.freeze(f);
  };
}
//@ chunk-4121qate.js:305940-305997 placement
/**
 * 克隆失败时的文本
 */
function cloneErrorText(e) {
  try {
    clone(e);
    return "";
  } catch (error) {
    return errorMessage(error);
  }
}
//@ chunk-4121qate.js:305997-306109 placement
/**
 * 检查值能否离开 VM 边界，不能则抛 HooksError（特定拒绝标记为栈溢出类）。
 */
function checkLeavingValue(bare, o, r) {
  let n = bare.leavingRefusal(o);
  if (n !== undefined) {
    let s = new HooksError(r(n));
    throw n === STACK_NESTING_TOO_DEEP_MESSAGE ? addWeakSetTag(s) : s;
  }
  return o;
}
//@ chunk-4121qate.js:306109-306691 placement
/**
 * 按所有者逐项复制对象条目到 VM。
 */
function copyOwnedEntries(e, vmClone, blamedWalk) {
  if (!(typeof e === "object" && e !== null && !isUntrustedObject(e) && !Array.isArray(e))) return vmClone(e);
  let s = e;
  let keys = Object.keys(s);
  let mapped = keys.map((m) => Reflect.getOwnPropertyDescriptor(s, m));
  if (!mapped.every((m) => m !== undefined && "value" in m)) return vmClone(e);
  let a = Object(vmClone({}));
  blamedWalk((m, c, u) => {
    for (let [l, y] of keys.entries()) {
      let g = mapped[l]?.value;
      let T =
        typeof g === "object" && g !== null && !isUntrustedObject(g)
          ? Reflect.getOwnPropertyDescriptor(g, "owner")?.value
          : undefined;
      if (y !== "__proto__")
        c(T, () => {
          let ownPropertyDescriptor = Reflect.getOwnPropertyDescriptor(
            Object(
              vmClone({
                entry: g,
              }),
            ),
            "entry",
          );
          if (ownPropertyDescriptor !== undefined) Reflect.defineProperty(a, y, ownPropertyDescriptor);
          return ownPropertyDescriptor?.value;
        });
    }
    u(() => a);
  });
  return a;
}
//@ chunk-4121qate.js:306691-307138 placement
/**
 * 逐项复制 record 条目到 VM。
 */
function copyRecordEntries(e, leavingAnswer, r) {
  let n = r(e) && valueKindOf(e) === "record";
  let s = n ? Object.keys(e) : [];
  let mapped = s.map((a) => Reflect.getOwnPropertyDescriptor(e, a));
  if (!(n && mapped.every((a) => a !== undefined && "value" in a))) return leavingAnswer(e);
  let f = Object(leavingAnswer({}));
  for (let [a, m] of s.entries()) {
    let c = mapped[a]?.value;
    r(typeof c === "object" && c !== null ? c : undefined);
    let u = Object(
      leavingAnswer({
        [m]: c,
      }),
    );
    if (typeof u === "function") return u;
    let ownPropertyDescriptor = Reflect.getOwnPropertyDescriptor(u, m);
    if (ownPropertyDescriptor !== undefined) Reflect.defineProperty(f, m, ownPropertyDescriptor);
  }
  return f;
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
    framed = (w, A) => A(),
    hostStream = noStreamingOps,
    blamedFor,
    blamedWalk = probeHookCallback,
  } = bounds;
  let y = false;
  let g = () => blamedFor?.() ?? stamp?.environmentId ?? 0;
  let x = runWithEnvironmentStamp(stamp, g);
  let T = stampEnvironmentAcrossAwait(stamp, g);
  let h = new Map();
  let v = 0;
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
  async function Te(w, A, F) {
    if (y) throw envUnloadedError(pluginName);
    try {
      let se = await x(() => vmIterate(w, A, F));
      return {
        ...se,
        value: vmClone(se.value),
      };
    } catch (error) {
      throw fromEnvironment(error);
    }
  }
  let iterate = (w) => forwardedStreamOps(w, Te);
  let Y = args.isLeavingUncopied !== true;
  let { argumentFor, isDelivered } = createArgumentTracker(cloneIn);
  let fe = (w) => (Y ? x(() => leavingCopy(w)) : w);
  function Ee(w, A) {
    let se =
      A === "engine.create" && stamp !== undefined && typeof w === "object" && w !== null ? w : undefined;
    return se === undefined ? leavingAnswer(w) : blamedWalk((_e) => copyRecordEntries(se, leavingAnswer, _e));
  }
  let leaving = (w, A) =>
    Y
      ? checkLeavingValue(
          bare,
          x(() => Ee(w, A)),
          answerNotPlainData,
        )
      : w;
  let Pe = (w, A) => checkLeavingValue(bare, fe(A), (F) => argsNotPlainData(w, F));
  function Oe(w) {
    if (!Y || isDelivered(w)) return w;
    let A = checkLeavingValue(bare, fe(w), nextNotPlainData);
    if (typeof A === "function" && typeof w !== "function")
      throw new HooksError(nextNotPlainData(cloneErrorText(A)));
    x(() => freezeOwn(w));
    return A;
  }
  let vmStreamBridge = createVmStreamBridge(bare, T);
  function De(w, A) {
    if (y) throw envUnloadedError(pluginName);
    try {
      return x(() => cloneIn(vmCall(w, cloneIn(A))));
    } catch (error) {
      throw fromEnvironment(error);
    }
  }
  function ft(w, A, ...F) {
    if (y) throw envUnloadedError(pluginName);
    try {
      return x(() => vmApply(w, A, ...F));
    } catch (error) {
      throw fromEnvironment(error);
    }
  }
  let yt = async (w, A, F) => {
    if (y) throw envUnloadedError(pluginName);
    let se;
    try {
      se = x(() => (F === undefined ? vmCall(w, ...A) : vmApply(F, w, ...A)));
    } catch (error) {
      throw fromEnvironment(error);
    }
    try {
      return (await vmSettle(se)).v;
    } catch (error) {
      throw fromEnvironment(error);
    }
  };
  let signalRelay = createSignalRelay(pluginName, makers);
  let vmElementTable = createVmElementTable({
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
  let surfaceAnswerCache = createSurfaceAnswerCache(vmElementTable);
  let weakMap = new WeakMap();
  function W(op, error) {
    let F = intoEnvironment(error);
    if (typeof F !== "object" || !F) return F;
    weakMap.set(F, {
      plugin: pluginName,
      op,
      message: errorMessage(error),
    });
    return y ? tagError(F, weakMap.get(F)) : F;
  }
  let host_2 = vmAsyncWrap(async (...w) => {
    let [A, F, se] = w;
    let ue;
    try {
      ue = signalRelay(se);
      return vmClone(await T(host(A, Pe(A, F), ue?.signal)));
    } catch (error) {
      throw W(A, error);
    } finally {
      ue?.unlink();
    }
  });
  let hostStream_2 = (...w) => {
    let [A, F, se] = w;
    let ue = signalRelay(se);
    let _e = hostStream(A, Pe(A, F), ue?.signal);
    async function* Fe() {
      try {
        return yield* _e;
      } catch (error) {
        throw y ? tagError(error, tagPayload(pluginName, A, errorMessage(error))) : error;
      } finally {
        ue?.unlink();
      }
    }
    return vmStreamBridge(
      onGeneratorReturn(teeGeneratorResult(Fe), () => {
        _e.return(undefined).catch(() => {
          return;
        });
      }),
    );
  };
  function Be(w) {
    let A = w ? "setInterval" : "setTimeout";
    return nullPrototypeFunction(
      wrapMethod((F, se, ...ue) => {
        if (typeof F !== "function") throw new HooksError(`${pluginName}: ${A} takes a function`);
        if (y) throw new HooksError(`${pluginName}: ${A}: its environment was unloaded`);
        let _e = isFiniteNonNegativeNumber(se) ? se : 0;
        let Fe = ++v;
        let Ue = keepValueFn({
          pluginName,
          api: A,
          invoke: (Gl, Vl) => {
            markScrollActivity(stamp?.view);
            return yt(Gl, Vl);
          },
          fn: F,
          args: ue,
        });
        let handle = w
          ? setInterval(runTimerCallback, _e, Ue)
          : setTimeout(fireTimerOnce, _e, {
              timers: h,
              id: Fe,
              fire: Ue,
            });
        h.set(Fe, {
          handle,
          repeat: w,
        });
        return Fe;
      }),
    );
  }
  let le = nullPrototypeFunction(
    wrapMethod((w) => {
      if (typeof w !== "number") return;
      let A = h.get(w);
      if (A) {
        h.delete(w);
        clearTimerHandle(A);
      }
    }),
  );
  if (isInstallingGlobals)
    Object.assign(globals, {
      setTimeout: Be(false),
      setInterval: Be(true),
      clearTimeout: le,
      clearInterval: le,
      console: createVmConsole(wrapMethod, `[${pluginName}]`),
    });
  let args_2 = {
    ...args,
    options: vmClone(args.options),
  };
  signal?.addEventListener("abort", ze, {
    once: true,
  });
  let Xe;
  try {
    Xe = await registerHooksModule({
      loaded: await loaded(x),
      args: args_2,
      host: host_2,
      hostStream: hostStream_2,
      resolvedTable: surfaceAnswerCache.read,
      invoke: yt,
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
          abort: (F) => x(() => abort(intoEnvironment(F))),
        };
      },
      copyMatcher,
      stamped: x,
      framed,
    });
    if (signal?.aborted === true) throw new HooksError(`${pluginName}: unloaded while its module loaded`);
  } catch (error) {
    ze();
    throw error;
  }
  function ze() {
    y = true;
    for (let w of h.values()) clearTimerHandle(w);
    h.clear();
  }
  function Je(w) {
    let A = pickErrorState(w);
    let { signal, abort } = makers.makeSignal();
    forwardAbort(w.signal, {
      abort: (ue) => x(() => abort(intoEnvironment(ue))),
    });
    return {
      signal,
      is: nullPrototypeFunction(wrapMethod(w.is)),
      event: w.event,
      origin: cloneIn(w.origin),
      trace: wrapMethod(() => traceCloner(w.trace)),
      budget: wrapMethod(() => cloneIn(w.budget)),
      caught: A && {
        ...A,
        error: cloneIn(A.error),
      },
    };
  }
  return {
    activation: Xe,
    invoke: yt,
    invokeSync: De,
    applyIn: ft,
    cloneIn,
    argumentFor,
    freezeForNext: deepFreezeInPlace,
    leaving,
    nextFor: (w, A) => {
      let F = A === "ui.resolve";
      let ue =
        A === "engine.create" && stamp !== undefined
          ? (Fe) => x(() => copyOwnedEntries(Fe, vmClone, blamedWalk))
          : vmClone;
      let _e = (Fe, Ue) => (F ? vmElementTable(Fe, surfaceOfArg(Ue)) : ue(Fe));
      return freezeHookCall({
        ...Je(w),
        call: wrapMethod(async (Fe) => {
          let Ue = Oe(Fe);
          return _e(await T(w(Ue)), Ue);
        }),
        to: wrapMethod(async (Fe, ...Ue) => {
          let or = Oe(Fe);
          return _e(await T(callNextWith(or, w, Ue.map(vmClone))), or);
        }),
      });
    },
    streamNextFor: (w) =>
      makeHookCall({
        ...Je(w),
        call: wrapMethod((A) => vmStreamBridge(w(vmClone(A)))),
        to: wrapMethod((A, ...F) => vmStreamBridge(forwardNext(vmClone(A), w, F.map(vmClone)))),
      }),
    storeResolved: surfaceAnswerCache.store,
    dispose: () => {
      ze();
      Xe.dispose();
    },
    opFailureOf: (w) => cachedResolveAnswer(weakMap, w),
    ownsValue: vmOwns,
  };
}
//@ chunk-4121qate.js:311496-311544 placement
/**
 * 文件模块引用
 */
var fileModuleRef = (e) => ({
  url: pathToFileURL(e).href,
  dir: dirname(e),
  file: e,
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
var prefixedSource = (e, o) => `${o.length}:${o}${e.length}:${e}`;
//@ chunk-4121qate.js:311971-312038 placement
/**
 * 导入路径 → 文件
 */
var importFileMap = (links) =>
  new Map(links.map((o) => [prefixedSource(o.spelled, resolve(o.from)), o.file]));
//@ chunk-4121qate.js:312038-312089 placement
/**
 * 文件 → 源码
 */
var fileSourceMap = (linked) => new Map(linked.map((o) => [o.file, o.source]));
//@ chunk-4121qate.js:312089-314364 placement
/**
 * 链接钩子模块及其导入（处理栈溢出、错误状态）
 */
function linkHooksModule(e) {
  let { args, context, stamped, evaluateOptions, isScanned } = e;
  let { pluginName, pluginRoot } = args;
  let root = resolve(pluginRoot);
  let m = new Map();
  let c = new Map();
  let u = new Set();
  let importModuleDynamically = runImportRefusal(context);
  let y = new vmModule_2.SourceTextModule(STATE_RESOURCE, {
    context,
    identifier: CLAUDE_CODE,
    importModuleDynamically,
  });
  let g = fileSourceMap(args.linked);
  let x = importFileMap(args.links);
  async function T(normalized, L) {
    if (normalized === CLAUDE_CODE) return y;
    let B = e.virtual?.get(normalized);
    if (B) return B;
    if (!isDotRelativePath(normalized))
      throw bareImportError(pluginName, normalized, relative(root, L.identifier) || L.identifier);
    let j = x.get(prefixedSource(normalized, resolve(L.identifier)));
    let N = j === undefined ? undefined : g.get(j);
    if (j !== undefined && N !== undefined) return V(j, N);
    if (args.sealed === true)
      throw bareImportError(pluginName, normalized, relative(root, L.identifier) || L.identifier);
    let hooksImport = await resolveHooksImport(
      {
        spelled: normalized,
        importer: L.identifier,
        root,
        pluginName,
      },
      g,
      new Map(),
    );
    g.set(hooksImport.file, hooksImport.source);
    u.add(hooksImport.file);
    return V(hooksImport.file, hooksImport.source);
  }
  let h = new Map();
  function v(S) {
    if (S.status === "unlinked")
      h.set(
        S.identifier,
        R(S).then(() => stamped(() => S.evaluate(evaluateOptions))),
      );
    return h.get(S.identifier);
  }
  async function R(S) {
    let L = new Set([S.identifier]);
    try {
      await S.link(async (B, j) => {
        let N = await T(B, j);
        L.add(N.identifier);
        return N;
      });
    } catch (error) {
      if (!isStackOverflowError(error)) throw error;
      let j = new vmModule_2.SyntheticModule(
        [],
        () => {
          return;
        },
        {
          context,
        },
      );
      for (let [N, ae] of c)
        try {
          if (L.has(N))
            await new vmModule_2.SourceTextModule(ae, {
              context,
            }).link(() => j);
        } catch (error_2) {
          if (isStackOverflowError(error_2)) throw stackExhaustedError(pluginName, root, N, error);
        }
      throw new HooksError(
        `${pluginName}: ${relative(root, S.identifier)}: the engine ran out of stack linking the file and its imports (code nested too deep, or a chain of imports too long): ${error.message}`,
      );
    }
  }
  function I(S) {
    if (S.status === "errored") throw S.error;
    if (S.status === "linked") {
      let L = stamped(() => S.evaluate(evaluateOptions));
      h.set(S.identifier, L);
      return L;
    }
    return;
  }
  let V = (S, L) => m.get(S) ?? Q(S, L);
  function Q(file, L) {
    let B = !isScanned || u.has(file);
    let j;
    try {
      j = transpileHooksSource(file, L);
    } catch (error) {
      throw !B && error instanceof HooksError
        ? new HooksError(`${pluginName}: ${relative(root, file)} does not compile: ` + error.message)
        : error;
    }
    let N = rewriteClientModulePaths(j, file, root);
    let ae = B ? refuseDynamicImport(scanHooksFile(file, N, pluginName)) : undefined;
    if (ae !== undefined) throw ae;
    try {
      let te = new vmModule_2.SourceTextModule(N, {
        context,
        identifier: file,
        initializeImportMeta: (Ne) => {
          Object.assign(Ne, fileModuleRef(file));
        },
        importModuleDynamically,
      });
      m.set(file, te);
      c.set(file, N);
      return te;
    } catch (error) {
      throw isStackOverflowError(error) ? stackExhaustedError(pluginName, root, file, error) : error;
    }
  }
  return {
    async load(S, L) {
      let B = resolve(S);
      g.set(B, L);
      let j = V(B, L);
      await v(j);
      await I(j);
      let namespace = j.namespace;
      if (Reflect.ownKeys(namespace).includes("then"))
        throw new HooksError(
          `${pluginName}: ${relative(root, B)} exports the name "then" (its own, or through an export *), which no entry module may: rename the export`,
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
    STACK_OVERFLOW_MESSAGES.some((o) => o === error.message)
  );
}
//@ chunk-4121qate.js:314459-314597 placement
function stackExhaustedError(pluginName, o, r, error) {
  return new HooksError(
    `${pluginName}: ${relative(o, r)}: the engine ran out of stack loading the file (code nested too deep): ${error.message}`,
  );
}
//@ chunk-4121qate.js:314597-314655 placement
/**
 * 链接并加载模块
 */
var linkAndLoadModule = (e) => linkHooksModule(e).load(e.args.modulePath, e.args.source);
//@ chunk-4121qate.js:314655-314691 placement
/**
 * 插件环境槽
 */
var pluginEnvSlot = identity(createValueSlot(), (e) => e.set(undefined));
//@ chunk-4121qate.js:314691-314721 placement
/**
 * 取插件的环境
 */
var envForPlugin = (e) => pluginEnvSlot.get()?.get(e);
//@ chunk-4121qate.js:314721-314946 placement
/**
 * 为插件 hooks 模块创建环境：优先使用登记的测试工厂，否则新建 VM 上下文并加载、链接模块后创建 engine。
 */
function createHooksEnvironment(e, o, r = {}) {
  let n = envForPlugin(o.modulePath);
  if (n) return n(o, e, r);
  let vmContext = createVmContext(o.pluginRoot);
  return createHooksEngine({
    bare: vmContext,
    args: o,
    host: e,
    bounds: r,
    isInstallingGlobals: true,
    loaded: (stamped) =>
      linkAndLoadModule({
        args: o,
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
function runPreservingStamp(stamp, o) {
  let r = stamp === undefined ? 0 : Atomics.load(stamp, STAMP_CURRENT_CALL_SLOT);
  try {
    return o();
  } finally {
    if (stamp) Atomics.store(stamp, STAMP_CURRENT_CALL_SLOT, r);
  }
}
//@ chunk-4121qate.js:315055-315083 placement
/**
 * 是否已登记环境
 */
var hasRegisteredEnv = (modulePath) => envForPlugin(modulePath) !== undefined;
//@ chunk-4121qate.js:315083-315313 placement
function rejectionMessage(e) {
  if (!e) return "a rejection that is not an Error";
  if (isUntrustedObject(e)) return "a rejection that is not plain data";
  let o = Object.getOwnPropertyDescriptor(e, "message")?.value;
  return typeof o === "string" ? o : rejectionMessage(Object.getPrototypeOf(e));
}
//@ chunk-4121qate.js:315313-315395 placement
/**
 * 拒绝值转文本
 */
function rejectionText(e) {
  return typeof e !== "object" && typeof e !== "function" ? String(e) : rejectionMessage(e);
}
//@ chunk-4121qate.js:315395-315438 placement
var Bl = Object.freeze({
  strings: false,
  wasm: false,
});
//@ chunk-4121qate.js:315438-315480 placement
var Ul = Object.freeze({
  codeGeneration: Bl,
});
//@ chunk-4121qate.js:315480-315570 placement
/**
 * 新建 VM 宿主上下文
 */
function newVmHostContext() {
  let e = nullPrototypeObject();
  let o = SubAgentContext(e, Ul);
  patchErrorHasInstance(o);
  patchProtoSetter(o);
  createVmRealm(o, vUe);
  return {
    sandbox: e,
    context: o,
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
function runWithStackStamps(stamp, o, r) {
  if (!stamp) return r();
  let n = stamp.length - STAMP_CALLER_STACK_START;
  let list = Array.from(
    {
      length: n,
    },
    (i, p) => Atomics.load(stamp, STAMP_CALLER_STACK_START + p),
  );
  for (let i = 0; i < n; i++) Atomics.store(stamp, STAMP_CALLER_STACK_START + i, o[i] ?? 0);
  try {
    return r();
  } finally {
    for (let [i, p] of list.entries()) Atomics.store(stamp, STAMP_CALLER_STACK_START + i, p);
  }
}
//@ chunk-4121qate.js:315877-316014 placement
/**
 * 未被 await 的 $ 调用失败时的消息："<插件>: $.<op> (not awaited): <原因>"。
 */
function unawaitedOpMessage(e) {
  let o = `${e.plugin}: `;
  let { message } = e;
  return `${e.plugin}: $.${e.op} (not awaited): ${message.startsWith(o) ? message.slice(o.length) : message}`;
}
//@ chunk-4121qate.js:316014-316052 placement
/**
 * 命中 user 子句
 */
var matchesUserClause = (e, o) => o.length <= MAX_MATCHER_CHARS && testRegExpMatcher(e, o);
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
