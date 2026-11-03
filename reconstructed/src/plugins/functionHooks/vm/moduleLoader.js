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
import * as vmModule from "vm";
import * as vmModule_2 from "vm";
import * as vmModule_3 from "vm";
import * as vmModule_4 from "vm";
import * as vmModule_5 from "vm";
import * as vmModule_6 from "vm";
import * as vmModule_7 from "vm";
import * as vmModule_8 from "vm";
import * as vmModule_9 from "vm";
import * as vmModule_10 from "vm";
import * as vmModule_11 from "vm";
import * as vmModule_12 from "vm";
import * as vmModule_13 from "vm";
import * as vmModule_14 from "vm";
import { pathToFileURL } from "url";
import {
  dirname,
  dirname as dirname_2,
  resolve,
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  relative,
} from "path";
import { types } from "util";
import {
  forwardGenerator,
  teeGeneratorResult,
  getStreamResultPromise,
  onGeneratorReturn,
} from "../dispatch/streamChain.js";
import { HooksError, isAbortSignalLike, apr, SIe, eBi, Xeo, A3t, _xt, lpr } from "../hooksErrors.js";
import {
  oa,
  NH,
  createWithheldElementWarner,
  nfr,
  forwardAbort,
  freezeHookCall,
  CAn,
  makeHookCall,
  mrs,
} from "../dispatch/chain.js";
import { Gbi, Dy, buildElementTable } from "../ui/elements.js";
import {
  ixt,
  axt,
  VM_ELEMENT_TABLE_SOURCE,
  valueKindOf,
  markScrollActivity,
  runTimerCallback,
  JP,
  Cc,
  createVmConsole,
  createVmContext,
  Mc,
  patchErrorHasInstance,
  patchProtoSetter,
  VM_HOST_CALL_WRAPPER_SOURCE,
  ZAn,
} from "./vmGlobals.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { W5e } from "../ui/renderSites.js";
import { BT, dfr } from "./vmBootstrapSource.js";
import { clone } from "../../../utils/slowOperations.js";
import { errorMessage } from "../../../utils/errors.js";
import {
  STACK_NESTING_TOO_DEEP_MESSAGE,
  STACK_OVERFLOW_MESSAGES,
} from "../../../utils/structuredCloneLimits.js";
import { Pf } from "../../../utils/untrustedValues.js";
import { probeHookCallback, Weo, matchesEventPattern } from "../eventPatterns.js";
import { Aeo } from "../api/operations.js";
import { registerHooksModule } from "../api/register.js";
import { Q5e, npr, testRegExpMatcher, matchesMatcher } from "../../../utils/hooks/functionHookMatchers.js";
import {
  CLAUDE_CODE,
  isDotRelativePath,
  bareImportError,
  resolveHooksImport,
  transpileHooksSource,
} from "../moduleLoader.js";
import { rewriteClientModulePaths } from "../clientSurfaceScan.js";
import { refuseDynamicImport, scanHooksFile } from "../moduleScan.js";
import { ge } from "../../../utils/identity.js";
import { to } from "../../../utils/valueSlot.js";
import { SubAgentContext } from "../../../components/CtrlOToExpand.js";
import { createVmRealm, freeze } from "./vmRealm.js";
import { lookupPathTable } from "../../../utils/pathTable.js";

//@ chunk-4121qate.js:303344-303523 placement
function createArgumentTracker(e) {
  let weakSet = new WeakSet();
  return {
    argumentFor: (r) => {
      let n = e(r);
      if (typeof n === "object" && n !== null) weakSet.add(n);
      return n;
    },
    isDelivered: (r) => typeof r === "object" && r !== null && weakSet.has(r),
  };
}
//@ chunk-4121qate.js:303523-303590 placement
var wl = (e, o) => forwardGenerator({ next: () => o(e, "next"), return: () => o(e, "return") });
/**
 * 环境缺少宿主流式操作时，返回一个立即抛错的流式结果。
 */
//@ chunk-4121qate.js:303590-303711 placement
var noStreamingOps = (e) =>
  teeGeneratorResult(
    (async function* () {
      throw new HooksError(`$.${e}: this environment was made without the host's streaming ops`);
    })(),
  );
//@ chunk-4121qate.js:303711-303782 placement
function Oeo(e, o) {
  return typeof o === "object" && o !== null ? e.get(o) : void 0;
}
/**
 * 按 (surface, component) 缓存 ui.resolve 答案的 VM 副本，未命中时按 surface 构造默认值。
 */
//@ chunk-4121qate.js:303782-304112 placement
function createSurfaceAnswerCache(e) {
  let o = new Map(),
    r = new Map();
  return {
    read(n) {
      let s = o.get(oa(n));
      if (s !== void 0) return s;
      let i = r.get(n.surface) ?? e(Gbi(n.surface), n.surface);
      return (r.set(n.surface, i), i);
    },
    store(n) {
      let s = new Map();
      o.clear();
      for (let { surface: surface, component: component, answer: answer } of n) {
        let a = s.get(answer) ?? e(answer, surface);
        (s.set(answer, a), o.set(oa({ surface: surface, component: component }), a));
      }
    },
  };
}
//@ chunk-4121qate.js:304112-304264 placement
var stampEnvironmentAcrossAwait =
  (e, o = () => e?.environmentId ?? 0) =>
  async (r) => {
    function n() {
      if (e) Atomics.store(e.view, ixt, o());
    }
    (n(), queueMicrotask(n));
    try {
      return await r;
    } finally {
      n();
    }
  };
//@ chunk-4121qate.js:304264-304514 placement
var createSignalRelay = (e, o) => (r) => {
  if (r === void 0 || r === null) return;
  if (!isAbortSignalLike(r)) throw new HooksError(`${e}: options.signal must be an AbortSignal`);
  let abortController = new AbortController(),
    relaySignal = o.relaySignal(
      r,
      NH((i, p) => {
        let f = new HooksError(p);
        ((f.name = i), abortController.abort(f));
      }),
    );
  return { signal: abortController.signal, unlink: relaySignal };
};
//@ chunk-4121qate.js:304514-304756 placement
var runWithEnvironmentStamp =
  (e, o = () => e?.environmentId ?? 0) =>
  (r) => {
    if (!e) return r();
    let { view: view, environmentId: environmentId } = e,
      load = Atomics.load(view, axt);
    (Atomics.store(view, axt, environmentId), Atomics.store(view, ixt, o()));
    try {
      return r();
    } finally {
      (Atomics.store(view, axt, load), Atomics.store(view, ixt, load === 0 ? o() : load));
    }
  };
/**
 * 把宿主异步迭代器桥接为 VM 内的流对象（next/return/result 都经包装与克隆）。
 */
//@ chunk-4121qate.js:304756-304980 placement
function createVmStreamBridge(
  { vmStream: vmStream, wrapMethod: wrapMethod, cloneIn: cloneIn },
  n = (s) => s,
) {
  let s = (i) => cloneIn({ done: i.done === !0, value: i.value });
  return (i) =>
    vmStream(
      wrapMethod(async () => s(await n(i.next()))),
      wrapMethod(async () => s(await n(i.return(void 0)))),
      wrapMethod(async () => cloneIn(await n(getStreamResultPromise(i)))),
    );
}
//@ chunk-4121qate.js:304980-305044 placement
function El(e) {
  let surface = (isPlainObject(e) ? e : {}).surface;
  return W5e(surface) ? surface : void 0;
}
/**
 * 在 VM 中创建元素构造器表（包装宿主构造器并标记名字）。
 */
//@ chunk-4121qate.js:305066-305414 placement
function createVmElementTable(e) {
  let {
      context: context,
      wrapMethod: wrapMethod,
      cloneIn: cloneIn,
      pluginName: pluginName,
      vmClone: vmClone,
    } = e,
    runInContext = vmModule_11.runInContext(BT(VM_ELEMENT_TABLE_SOURCE), context),
    f = createWithheldElementWarner(pluginName);
  return (a, m) => {
    if (!isPlainObject(a)) return vmClone(a);
    let filtered = Object.keys(a)
        .filter(Dy)
        .filter((l) => dfr.nameOf(a[l]) === l),
      u = runInContext(
        Object.entries(buildElementTable(a, (l) => wrapMethod((y) => cloneIn(l(y))), f(m))),
        filtered,
      );
    for (let l of filtered) {
      let y = u[l];
      if (typeof y === "function") dfr.mark(y, l);
    }
    return u;
  };
}
//@ chunk-4121qate.js:305414-305428 placement
var Al = (e) => e;
/**
 * 创建钩子轨迹克隆器：把轨迹条目克隆到 VM 中（缓存并冻结）。
 */
//@ chunk-4121qate.js:305428-305940 placement
function createTraceCloner(e) {
  let { vmClone: vmClone, cloneIn: cloneIn } = e,
    freeze = Object.freeze(vmClone([])),
    weakMap = new WeakMap();
  function i(p) {
    let f = weakMap.get(p);
    if (f !== void 0) return f;
    let {
        index: index,
        plugin: plugin,
        tier: tier,
        event: event,
        outcome: outcome,
        reason: reason,
        ms: ms,
      } = p,
      freeze = Object.freeze(
        Object.assign(
          vmClone({
            index: index,
            plugin: plugin,
            tier: tier,
            event: event,
            outcome: outcome,
            ...(reason === void 0 ? {} : { reason: reason }),
            ms: ms,
          }),
          { received: cloneIn(p.received), returned: p.returned === void 0 ? void 0 : cloneIn(p.returned) },
        ),
      );
    return (weakMap.set(p, freeze), freeze);
  }
  return (p) => {
    if (p.length === 0) return freeze;
    let f = vmClone([]);
    for (let [a, m] of p.entries()) f[a] = i(m);
    return Object.freeze(f);
  };
}
//@ chunk-4121qate.js:305940-305997 placement
function _l(e) {
  try {
    return (clone(e), "");
  } catch (error) {
    return errorMessage(error);
  }
}
/**
 * 检查值能否离开 VM 边界，不能则抛 HooksError（特定拒绝标记为栈溢出类）。
 */
//@ chunk-4121qate.js:305997-306109 placement
function checkLeavingValue(e, o, r) {
  let leavingRefusal = e.leavingRefusal(o);
  if (leavingRefusal !== void 0) {
    let s = new HooksError(r(leavingRefusal));
    throw leavingRefusal === STACK_NESTING_TOO_DEEP_MESSAGE ? apr(s) : s;
  }
  return o;
}
/**
 * 按所有者逐项复制对象条目到 VM。
 */
//@ chunk-4121qate.js:306109-306691 placement
function copyOwnedEntries(e, o, r) {
  if (!(typeof e === "object" && e !== null && !Pf(e) && !Array.isArray(e))) return o(e);
  let s = e,
    keys = Object.keys(s),
    mapped = keys.map((m) => Reflect.getOwnPropertyDescriptor(s, m));
  if (!mapped.every((m) => m !== void 0 && "value" in m)) return o(e);
  let a = Object(o({}));
  return (
    r((m, c, u) => {
      for (let [l, y] of keys.entries()) {
        let g = mapped[l]?.value,
          T =
            typeof g === "object" && g !== null && !Pf(g)
              ? Reflect.getOwnPropertyDescriptor(g, "owner")?.value
              : void 0;
        if (y !== "__proto__")
          c(T, () => {
            let ownPropertyDescriptor = Reflect.getOwnPropertyDescriptor(Object(o({ entry: g })), "entry");
            if (ownPropertyDescriptor !== void 0) Reflect.defineProperty(a, y, ownPropertyDescriptor);
            return ownPropertyDescriptor?.value;
          });
      }
      u(() => a);
    }),
    a
  );
}
/**
 * 逐项复制 record 条目到 VM。
 */
//@ chunk-4121qate.js:306691-307138 placement
function copyRecordEntries(e, o, r) {
  let n = r(e) && valueKindOf(e) === "record",
    s = n ? Object.keys(e) : [],
    mapped = s.map((a) => Reflect.getOwnPropertyDescriptor(e, a));
  if (!(n && mapped.every((a) => a !== void 0 && "value" in a))) return o(e);
  let f = Object(o({}));
  for (let [a, m] of s.entries()) {
    let c = mapped[a]?.value;
    r(typeof c === "object" && c !== null ? c : void 0);
    let u = Object(o({ [m]: c }));
    if (typeof u === "function") return u;
    let ownPropertyDescriptor = Reflect.getOwnPropertyDescriptor(u, m);
    if (ownPropertyDescriptor !== void 0) Reflect.defineProperty(f, m, ownPropertyDescriptor);
  }
  return f;
}
/**
 * 加载钩子模块并调用 engine.create，装配 $ 与计时器
 */
//@ chunk-4121qate.js:307138-311328 placement
async function createHooksEngine({
  bare: bare,
  args: args,
  host: host,
  bounds: bounds = {},
  loaded: loaded,
  isInstallingGlobals: isInstallingGlobals,
}) {
  let { pluginName: pluginName } = args,
    {
      stamp: stamp,
      signal: signal,
      framed: framed = (w, A) => A(),
      hostStream: hostStream = noStreamingOps,
      blamedFor: blamedFor,
      blamedWalk: blamedWalk = probeHookCallback,
    } = bounds,
    y = !1,
    g = () => blamedFor?.() ?? stamp?.environmentId ?? 0,
    x = runWithEnvironmentStamp(stamp, g),
    T = stampEnvironmentAcrossAwait(stamp, g),
    h = new Map(),
    v = 0,
    {
      globals: globals,
      context: context,
      vmCall: vmCall,
      vmApply: vmApply,
      vmSettle: vmSettle,
      vmOwns: vmOwns,
      copyMatcher: copyMatcher,
      vmClone: vmClone,
      cloneIn: cloneIn,
      leavingCopy: leavingCopy,
      leavingAnswer: leavingAnswer,
      freezeOwn: freezeOwn,
      vmAsyncWrap: vmAsyncWrap,
      makers: makers,
      fromEnvironment: fromEnvironment,
      intoEnvironment: intoEnvironment,
      wrapMethod: wrapMethod,
      vmIterate: vmIterate,
      isGeneratorHook: isGeneratorHook,
    } = bare;
  async function Te(w, A, F) {
    if (y) throw SIe(pluginName);
    try {
      let se = await x(() => vmIterate(w, A, F));
      return { ...se, value: vmClone(se.value) };
    } catch (error) {
      throw fromEnvironment(error);
    }
  }
  let ee = (w) => wl(w, Te),
    Y = args.isLeavingUncopied !== !0,
    { argumentFor: argumentFor, isDelivered: isDelivered } = createArgumentTracker(cloneIn),
    fe = (w) => (Y ? x(() => leavingCopy(w)) : w);
  function Ee(w, A) {
    let se = A === "engine.create" && stamp !== void 0 && typeof w === "object" && w !== null ? w : void 0;
    return se === void 0 ? leavingAnswer(w) : blamedWalk((_e) => copyRecordEntries(se, leavingAnswer, _e));
  }
  let ke = (w, A) =>
      Y
        ? checkLeavingValue(
            bare,
            x(() => Ee(w, A)),
            eBi,
          )
        : w,
    Pe = (w, A) => checkLeavingValue(bare, fe(A), (F) => Xeo(w, F));
  function Oe(w) {
    if (!Y || isDelivered(w)) return w;
    let A = checkLeavingValue(bare, fe(w), A3t);
    if (typeof A === "function" && typeof w !== "function") throw new HooksError(A3t(_l(A)));
    return (x(() => freezeOwn(w)), A);
  }
  let be = createVmStreamBridge(bare, T);
  function De(w, A) {
    if (y) throw SIe(pluginName);
    try {
      return x(() => cloneIn(vmCall(w, cloneIn(A))));
    } catch (error) {
      throw fromEnvironment(error);
    }
  }
  function ft(w, A, ...F) {
    if (y) throw SIe(pluginName);
    try {
      return x(() => vmApply(w, A, ...F));
    } catch (error) {
      throw fromEnvironment(error);
    }
  }
  let yt = async (w, A, F) => {
      if (y) throw SIe(pluginName);
      let se;
      try {
        se = x(() => (F === void 0 ? vmCall(w, ...A) : vmApply(F, w, ...A)));
      } catch (error) {
        throw fromEnvironment(error);
      }
      try {
        return (await vmSettle(se)).v;
      } catch (error) {
        throw fromEnvironment(error);
      }
    },
    gt = createSignalRelay(pluginName, makers),
    G = createVmElementTable({
      context: context,
      wrapMethod: wrapMethod,
      cloneIn: cloneIn,
      pluginName: pluginName,
      vmClone: vmClone,
    }),
    k = createTraceCloner({ vmClone: vmClone, cloneIn: cloneIn }),
    C = createSurfaceAnswerCache(G),
    weakMap = new WeakMap();
  function W(w, A) {
    let F = intoEnvironment(A);
    if (typeof F !== "object" || !F) return F;
    return (
      weakMap.set(F, { plugin: pluginName, op: w, message: errorMessage(A) }),
      y ? _xt(F, weakMap.get(F)) : F
    );
  }
  let re = vmAsyncWrap(async (...w) => {
      let [A, F, se] = w,
        ue;
      try {
        return ((ue = gt(se)), vmClone(await T(host(A, Pe(A, F), ue?.signal))));
      } catch (error) {
        throw W(A, error);
      } finally {
        ue?.unlink();
      }
    }),
    oe = (...w) => {
      let [A, F, se] = w,
        ue = gt(se),
        _e = hostStream(A, Pe(A, F), ue?.signal);
      async function* Fe() {
        try {
          return yield* _e;
        } catch (error) {
          throw y ? _xt(error, lpr(pluginName, A, errorMessage(error))) : error;
        } finally {
          ue?.unlink();
        }
      }
      return be(
        onGeneratorReturn(teeGeneratorResult(Fe), () => {
          _e.return(void 0).catch(() => {
            return;
          });
        }),
      );
    };
  function Be(w) {
    let A = w ? "setInterval" : "setTimeout";
    return NH(
      wrapMethod((F, se, ...ue) => {
        if (typeof F !== "function") throw new HooksError(`${pluginName}: ${A} takes a function`);
        if (y) throw new HooksError(`${pluginName}: ${A}: its environment was unloaded`);
        let _e = Aeo(se) ? se : 0,
          Fe = ++v,
          Ue = Al({
            pluginName: pluginName,
            api: A,
            invoke: (Gl, Vl) => (markScrollActivity(stamp?.view), yt(Gl, Vl)),
            fn: F,
            args: ue,
          }),
          or = w
            ? setInterval(runTimerCallback, _e, Ue)
            : setTimeout(JP, _e, { timers: h, id: Fe, fire: Ue });
        return (h.set(Fe, { handle: or, repeat: w }), Fe);
      }),
    );
  }
  let le = NH(
    wrapMethod((w) => {
      if (typeof w !== "number") return;
      let A = h.get(w);
      if (A) (h.delete(w), Cc(A));
    }),
  );
  if (isInstallingGlobals)
    Object.assign(globals, {
      setTimeout: Be(!1),
      setInterval: Be(!0),
      clearTimeout: le,
      clearInterval: le,
      console: createVmConsole(wrapMethod, `[${pluginName}]`),
    });
  let ye = { ...args, options: vmClone(args.options) };
  signal?.addEventListener("abort", ze, { once: !0 });
  let Xe;
  try {
    if (
      ((Xe = await registerHooksModule({
        loaded: await loaded(x),
        args: ye,
        host: re,
        hostStream: oe,
        resolvedTable: C.read,
        invoke: yt,
        iterate: ee,
        streamIn: be,
        isGeneratorHook: isGeneratorHook,
        wrapMethod: wrapMethod,
        blamedWalk: blamedWalk,
        signalFrom: gt,
        makeSignal: () => {
          let { signal: signal, abort: abort } = makers.makeSignal();
          return { signal: signal, abort: (F) => x(() => abort(intoEnvironment(F))) };
        },
        copyMatcher: copyMatcher,
        stamped: x,
        framed: framed,
      })),
      signal?.aborted === !0)
    )
      throw new HooksError(`${pluginName}: unloaded while its module loaded`);
  } catch (error) {
    throw (ze(), error);
  }
  function ze() {
    y = !0;
    for (let w of h.values()) Cc(w);
    h.clear();
  }
  function Je(w) {
    let A = nfr(w),
      { signal: signal, abort: abort } = makers.makeSignal();
    return (
      forwardAbort(w.signal, { abort: (ue) => x(() => abort(intoEnvironment(ue))) }),
      {
        signal: signal,
        is: NH(wrapMethod(w.is)),
        event: w.event,
        origin: cloneIn(w.origin),
        trace: wrapMethod(() => k(w.trace)),
        budget: wrapMethod(() => cloneIn(w.budget)),
        caught: A && { ...A, error: cloneIn(A.error) },
      }
    );
  }
  return {
    activation: Xe,
    invoke: yt,
    invokeSync: De,
    applyIn: ft,
    cloneIn: cloneIn,
    argumentFor: argumentFor,
    freezeForNext: Q5e,
    leaving: ke,
    nextFor: (w, A) => {
      let F = A === "ui.resolve",
        ue =
          A === "engine.create" && stamp !== void 0
            ? (Fe) => x(() => copyOwnedEntries(Fe, vmClone, blamedWalk))
            : vmClone,
        _e = (Fe, Ue) => (F ? G(Fe, El(Ue)) : ue(Fe));
      return freezeHookCall({
        ...Je(w),
        call: wrapMethod(async (Fe) => {
          let Ue = Oe(Fe);
          return _e(await T(w(Ue)), Ue);
        }),
        to: wrapMethod(async (Fe, ...Ue) => {
          let or = Oe(Fe);
          return _e(await T(CAn(or, w, Ue.map(vmClone))), or);
        }),
      });
    },
    streamNextFor: (w) =>
      makeHookCall({
        ...Je(w),
        call: wrapMethod((A) => be(w(vmClone(A)))),
        to: wrapMethod((A, ...F) => be(mrs(vmClone(A), w, F.map(vmClone)))),
      }),
    storeResolved: C.store,
    dispose: () => {
      (ze(), Xe.dispose());
    },
    opFailureOf: (w) => Oeo(weakMap, w),
    ownsValue: vmOwns,
  };
}
//@ chunk-4121qate.js:311496-311544 placement
var Il = (e) => ({ url: pathToFileURL(e).href, dir: dirname_2(e), file: e });
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
var fSi = (e) => vmModule_13.runInContext(BT(IMPORT_REFUSAL_SOURCE), e);
//@ chunk-4121qate.js:311890-311939 placement
var Nn = (e, o) => `${o.length}:${o}${e.length}:${e}`;
//@ chunk-4121qate.js:311971-312038 placement
var Ll = (e) => new Map(e.map((o) => [Nn(o.spelled, resolve_9(o.from)), o.file]));
//@ chunk-4121qate.js:312038-312089 placement
var jl = (e) => new Map(e.map((o) => [o.file, o.source]));
/**
 * 链接钩子模块及其导入（处理栈溢出、错误状态）
 */
//@ chunk-4121qate.js:312089-314364 placement
function linkHooksModule(e) {
  let {
      args: args,
      context: context,
      stamped: stamped,
      evaluateOptions: evaluateOptions,
      isScanned: isScanned,
    } = e,
    { pluginName: pluginName, pluginRoot: pluginRoot } = args,
    a = resolve_8(pluginRoot),
    m = new Map(),
    c = new Map(),
    u = new Set(),
    l = fSi(context),
    y = new vmModule_12.SourceTextModule(Weo, {
      context: context,
      identifier: CLAUDE_CODE,
      importModuleDynamically: l,
    }),
    g = jl(args.linked),
    x = Ll(args.links);
  async function T(S, L) {
    if (S === CLAUDE_CODE) return y;
    let B = e.virtual?.get(S);
    if (B) return B;
    if (!isDotRelativePath(S))
      throw bareImportError(pluginName, S, relative(a, L.identifier) || L.identifier);
    let j = x.get(Nn(S, resolve_8(L.identifier))),
      N = j === void 0 ? void 0 : g.get(j);
    if (j !== void 0 && N !== void 0) return V(j, N);
    if (args.sealed === !0) throw bareImportError(pluginName, S, relative(a, L.identifier) || L.identifier);
    let ae = await resolveHooksImport(
      { spelled: S, importer: L.identifier, root: a, pluginName: pluginName },
      g,
      new Map(),
    );
    return (g.set(ae.file, ae.source), u.add(ae.file), V(ae.file, ae.source));
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
        return (L.add(N.identifier), N);
      });
    } catch (error) {
      if (!Up(error)) throw error;
      let j = new vmModule_12.SyntheticModule(
        [],
        () => {
          return;
        },
        { context: context },
      );
      for (let [N, ae] of c)
        try {
          if (L.has(N)) await new vmModule_12.SourceTextModule(ae, { context: context }).link(() => j);
        } catch (error_2) {
          if (Up(error_2)) throw stackExhaustedError(pluginName, a, N, error);
        }
      throw new HooksError(
        `${pluginName}: ${relative(a, S.identifier)}: the engine ran out of stack linking the file and its imports (code nested too deep, or a chain of imports too long): ${error.message}`,
      );
    }
  }
  function I(S) {
    if (S.status === "errored") throw S.error;
    if (S.status === "linked") {
      let L = stamped(() => S.evaluate(evaluateOptions));
      return (h.set(S.identifier, L), L);
    }
    return;
  }
  let V = (S, L) => m.get(S) ?? Q(S, L);
  function Q(S, L) {
    let B = !isScanned || u.has(S),
      j;
    try {
      j = transpileHooksSource(S, L);
    } catch (error) {
      throw !B && error instanceof HooksError
        ? new HooksError(`${pluginName}: ${relative(a, S)} does not compile: ` + error.message)
        : error;
    }
    let N = rewriteClientModulePaths(j, S, a),
      ae = B ? refuseDynamicImport(scanHooksFile(S, N, pluginName)) : void 0;
    if (ae !== void 0) throw ae;
    try {
      let te = new vmModule_12.SourceTextModule(N, {
        context: context,
        identifier: S,
        initializeImportMeta: (Ne) => {
          Object.assign(Ne, Il(S));
        },
        importModuleDynamically: l,
      });
      return (m.set(S, te), c.set(S, N), te);
    } catch (error) {
      throw Up(error) ? stackExhaustedError(pluginName, a, S, error) : error;
    }
  }
  return {
    async load(S, L) {
      let B = resolve_8(S);
      g.set(B, L);
      let j = V(B, L);
      (await v(j), await I(j));
      let namespace = j.namespace;
      if (Reflect.ownKeys(namespace).includes("then"))
        throw new HooksError(
          `${pluginName}: ${relative(a, B)} exports the name "then" (its own, or through an export *), which no entry module may: rename the export`,
        );
      return namespace;
    },
  };
}
//@ chunk-4121qate.js:314364-314459 placement
function Up(e) {
  return (
    types.isNativeError(e) && e.name === "RangeError" && STACK_OVERFLOW_MESSAGES.some((o) => o === e.message)
  );
}
//@ chunk-4121qate.js:314459-314597 placement
function stackExhaustedError(e, o, r, n) {
  return new HooksError(
    `${e}: ${relative(o, r)}: the engine ran out of stack loading the file (code nested too deep): ${n.message}`,
  );
}
//@ chunk-4121qate.js:314597-314655 placement
var pSi = (e) => linkHooksModule(e).load(e.args.modulePath, e.args.source);
//@ chunk-4121qate.js:314655-314691 placement
var Meo = ge(to(), (e) => e.set(void 0));
//@ chunk-4121qate.js:314691-314721 placement
var Mn = (e) => Meo.get()?.get(e);
/**
 * 为插件 hooks 模块创建环境：优先使用登记的测试工厂，否则新建 VM 上下文并加载、链接模块后创建 engine。
 */
//@ chunk-4121qate.js:314721-314946 placement
function createHooksEnvironment(e, o, r = {}) {
  let n = Mn(o.modulePath);
  if (n) return n(o, e, r);
  let s = createVmContext(o.pluginRoot);
  return createHooksEngine({
    bare: s,
    args: o,
    host: e,
    bounds: r,
    isInstallingGlobals: !0,
    loaded: (i) => pSi({ args: o, context: s.context, isScanned: !0, stamped: i }),
  });
}
/**
 * 执行函数并在之后恢复共享视图中的环境戳。
 */
//@ chunk-4121qate.js:314946-315055 placement
function runPreservingStamp(e, o) {
  let r = e === void 0 ? 0 : Atomics.load(e, ixt);
  try {
    return o();
  } finally {
    if (e) Atomics.store(e, ixt, r);
  }
}
//@ chunk-4121qate.js:315055-315083 placement
var eos = (e) => Mn(e) !== void 0;
//@ chunk-4121qate.js:315083-315313 placement
function rejectionMessage(e) {
  if (!e) return "a rejection that is not an Error";
  if (Pf(e)) return "a rejection that is not plain data";
  let o = Object.getOwnPropertyDescriptor(e, "message")?.value;
  return typeof o === "string" ? o : rejectionMessage(Object.getPrototypeOf(e));
}
//@ chunk-4121qate.js:315313-315395 placement
function jfr(e) {
  return typeof e !== "object" && typeof e !== "function" ? String(e) : rejectionMessage(e);
}
//@ chunk-4121qate.js:315395-315438 placement
var freeze_11 = Object.freeze({ strings: !1, wasm: !1 });
//@ chunk-4121qate.js:315438-315480 placement
var freeze_12 = Object.freeze({ codeGeneration: freeze_11 });
//@ chunk-4121qate.js:315480-315570 placement
function mSi() {
  let e = Mc(),
    o = SubAgentContext(e, freeze_12);
  return (
    patchErrorHasInstance(o),
    patchProtoSetter(o),
    createVmRealm(o, freeze),
    { sandbox: e, context: o }
  );
}
//@ chunk-4121qate.js:315592-315640 placement
var gSi = (e, o) => vmModule_14.runInContext(BT(VM_HOST_CALL_WRAPPER_SOURCE), e)(NH(o));
/**
 * 执行函数期间把调用栈戳写入共享视图，结束后恢复原值。
 */
//@ chunk-4121qate.js:315640-315877 placement
function runWithStackStamps(e, o, r) {
  if (!e) return r();
  let n = e.length - ZAn,
    list = Array.from({ length: n }, (i, p) => Atomics.load(e, ZAn + p));
  for (let i = 0; i < n; i++) Atomics.store(e, ZAn + i, o[i] ?? 0);
  try {
    return r();
  } finally {
    for (let [i, p] of list.entries()) Atomics.store(e, ZAn + i, p);
  }
}
/**
 * 未被 await 的 $ 调用失败时的消息："<插件>: $.<op> (not awaited): <原因>"。
 */
//@ chunk-4121qate.js:315877-316014 placement
function unawaitedOpMessage(e) {
  let o = `${e.plugin}: `,
    { message: message } = e;
  return `${e.plugin}: $.${e.op} (not awaited): ${message.startsWith(o) ? message.slice(o.length) : message}`;
}
//@ chunk-4121qate.js:316014-316052 placement
var Wl = (e, o) => o.length <= npr && testRegExpMatcher(e, o);
/**
 * 判断某事件是否命中插件扫描时声明的 next.to user 子句（模式与 matcher 都匹配）。
 */
//@ chunk-4121qate.js:316052-316247 placement
function isNextToUserTarget({ clauses: clauses, scan: scan, event: event, raised: raised }) {
  try {
    return clauses.some(
      ({ pattern: pattern, matcher: matcher }) =>
        scan.toUserOn?.includes(pattern) === !0 &&
        matchesEventPattern(pattern, event) &&
        (matcher === void 0 || matchesMatcher(matcher, raised, { test: Wl, names: lookupPathTable(event) })),
    );
  } catch {
    return !1;
  }
}

export {
  createHooksEngine,
  pSi,
  Meo,
  runPreservingStamp,
  runWithStackStamps,
  isNextToUserTarget,
  createHooksEnvironment,
  eos,
  fSi,
  checkLeavingValue,
  createVmStreamBridge,
  createSurfaceAnswerCache,
  Oeo,
  noStreamingOps,
  unawaitedOpMessage,
  jfr,
  mSi,
  gSi,
  linkHooksModule,
};
