/**
 * plugins/functionHooks/api/interfaces.ts
 *
 * 函数钩子 engine.create 返回值与接口调用校验（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4121qate.js (17)
 * attribution: placement 17
 */
import { probeHookCallback, gos, KUi, CORE_ORIGIN } from "../eventPatterns.js";
import { HooksError } from "../hooksErrors.js";
import { freezeApiObject, CAn, freezeHookCall } from "../dispatch/chain.js";
import { pd } from "../../../utils/hooks/functionHookMatchers.js";
import { errorMessage } from "../../../utils/errors.js";

//@ chunk-4121qate.js:270537-270801 placement
function createInterfaceState({
  engine: engine,
  core: core,
  pluginName: pluginName,
  callInterface: callInterface,
  invoke: invoke,
  wrapMethod: wrapMethod,
  blamedWalk: blamedWalk = probeHookCallback,
}) {
  let f = engine;
  return {
    engine: engine,
    slots: f,
    identity: new Set(Object.keys(f)),
    local: core,
    own: new Map(),
    isFinalized: !1,
    pluginName: pluginName,
    callInterface: callInterface,
    invoke: invoke,
    wrapMethod: wrapMethod,
    blamedWalk: blamedWalk,
  };
}
/**
 * 列出插件接口对象中的方法；值不是方法对象时抛 HooksError。
 */
//@ chunk-4121qate.js:270801-271133 placement
function listInterfaceMethods(e, o, r) {
  if (typeof r !== "object" || !r)
    throw new HooksError(`${e}: $.${o} must be an object of methods, not ${typeof r}`);
  let n = [];
  for (let [s, i] of Object.entries(r)) {
    if (typeof i !== "function")
      throw new HooksError(
        `${e}: $.${o}.${s} is not a function; an interface is an object of methods (a value another plugin can call)`,
      );
    n.push(s);
  }
  return n;
}
/**
 * 校验 engine.create 返回的 $ 是否保留了上游的名词
 */
//@ chunk-4121qate.js:271133-271763 placement
function checkEngineCreateResult(e, o, r) {
  if (typeof o !== "object" || !o)
    throw new HooksError(
      `${e.pluginName}: engine.create must return $ ({ ...await next(e), <noun>: { <event>() {} } }), not ${typeof o}`,
    );
  let create = Object.create(null);
  return (
    e.blamedWalk((s, i, p) => {
      for (let [f, a] of Object.entries(o)) {
        if (e.identity.has(f)) {
          if (a === e.slots[f]) continue;
          throw new HooksError(
            `${e.pluginName}: engine.create returned $.${f} changed; it is this plugin's identity, not a noun`,
          );
        }
        let c = typeof a === "object" && a !== null ? r.get(a) : void 0;
        if (c && c.name === f) {
          (s(c.descriptor), (create[f] = c.descriptor));
          continue;
        }
        ((create[f] = p(() => ({ owner: e.pluginName, methods: listInterfaceMethods(e.pluginName, f, a) }))),
          e.own.set(f, a));
      }
      p(() => create);
    }),
    create
  );
}
//@ chunk-4121qate.js:271763-272012 placement
function createObservingInterfaceStub(e, o, r) {
  let n = {};
  for (let method of r.methods)
    n[method] = e.wrapMethod(() => {
      throw new HooksError(
        `${e.pluginName}: $.${o}.${method} is not callable from an engine.create step registered through on("*"); hook engine.create by name to compose nouns`,
      );
    });
  return freezeApiObject(n);
}
//@ chunk-4121qate.js:272012-272131 placement
var NON_METHOD_PROPERTY_NAMES = new Set([
  "then",
  "toJSON",
  "constructor",
  "valueOf",
  "toString",
  "inspect",
  "nodeType",
  "$$typeof",
  "asymmetricMatch",
]);
//@ chunk-4121qate.js:272131-272175 placement
var vn = (e) => typeof e === "string" && !NON_METHOD_PROPERTY_NAMES.has(e);
//@ chunk-4121qate.js:272175-272322 placement
function createRemoteInterface(e, o, r) {
  let n = {};
  for (let method of r.methods)
    n[method] = e.wrapMethod((...i) => e.callInterface({ owner: r.owner, name: o, method: method, args: i }));
  return freezeApiObject(n);
}
//@ chunk-4121qate.js:272322-272364 placement
var freeze_9 = Object.freeze(Object.create(null));
//@ chunk-4121qate.js:272364-272496 placement
function createMissingInterfaceProxy(e, o, r) {
  let n = (s) => r(() => Promise.reject(new HooksError(gos(`${e}.${s}`, o))));
  return new Proxy(freeze_9, { get: (s, i) => (vn(i) ? n(i) : void 0) });
}
//@ chunk-4121qate.js:272496-272753 placement
function resolveInterface(e, o, r) {
  let n = KUi(r);
  if (n !== void 0) return createMissingInterfaceProxy(o, n, e.wrapMethod);
  if (r.owner === CORE_ORIGIN) {
    let s = e.local[o];
    if (!s)
      throw new HooksError(
        `${e.pluginName}: the interface table names core as the owner of $.${o}, which core does not provide`,
      );
    return s;
  }
  return createRemoteInterface(e, o, r);
}
//@ chunk-4121qate.js:272753-273010 placement
function buildEngineSlots(e, { table: table, beneath: beneath, isObserving: isObserving }) {
  let merged = Object.assign(Object.create(null), e.slots);
  return (
    e.blamedWalk((i) => {
      for (let [p, f] of Object.entries(table)) {
        i(f);
        let m =
          isObserving && f.withheldBy === void 0
            ? createObservingInterfaceStub(e, p, f)
            : resolveInterface(e, p, f);
        ((merged[p] = m), beneath.set(m, { name: p, descriptor: f }));
      }
    }),
    merged
  );
}
//@ chunk-4121qate.js:273010-273074 placement
var aC = (e, o) =>
  new Proxy(freeze_9, { get: (r, n) => (vn(n) ? createMissingInterfaceProxy(n, e, o) : void 0) });
/**
 * 生成 finalize(table, declared)：按接口表填好各名词槽位，为声明但未提供的名词建缺失代理，"*" 设为原型兜底，然后冻结 $。
 */
//@ chunk-4121qate.js:273074-273500 placement
var createInterfaceFinalizer = (e) => (o, r) => {
  if (e.isFinalized) throw new HooksError(`${e.pluginName}: $ is already built`);
  e.blamedWalk((s, i) => {
    for (let [p, f] of Object.entries(o))
      i(f.owner, () => {
        e.slots[p] = resolveInterface(e, p, f);
      });
  });
  for (let [s, i] of Object.entries(r ?? {}))
    if (s !== "*" && !Object.hasOwn(o, s) && !e.identity.has(s))
      e.slots[s] = createMissingInterfaceProxy(s, i, e.wrapMethod);
  let n = r?.["*"];
  if (n !== void 0) Object.setPrototypeOf(e.engine, aC(n, e.wrapMethod));
  (Object.freeze(e.engine), (e.isFinalized = !0));
};
/**
 * 生成 engine.create 钩子包装：调用插件步骤时传入可继续的 call/to，结果按接口表构建 $；on("*") 观察者失败时回退到下游结果。
 */
//@ chunk-4121qate.js:273500-274124 placement
var createEngineCreateWrapper = (e) => (o, r) => async (n, s) => {
  let i = r !== void 0,
    weakMap = new WeakMap(),
    f;
  function a(g) {
    return ((f = g), buildEngineSlots(e, { table: f, beneath: weakMap, isObserving: i }));
  }
  let m = async (g) => a(await s(g)),
    c = async (g, ...x) => a(await CAn(g, s, x));
  async function u(g) {
    if (
      (pd().log(
        `hooks module ${e.pluginName}: the on("${r}") hook failed at engine.create (${errorMessage(g)}); passed on`,
        "warn",
      ),
      f)
    )
      return f;
    if (s.signal.aborted) throw g;
    return await s(n);
  }
  let l = freezeHookCall({
      call: e.wrapMethod(m),
      to: e.wrapMethod(c),
      signal: s.signal,
      is: s.is,
      event: s.event,
      origin: s.origin,
      trace: () => s.trace,
      budget: () => s.budget,
    }),
    y;
  try {
    y = await e.invoke(o, [freeze_9, n, l]);
  } catch (error) {
    if (!i) throw error;
    return u(error);
  }
  return checkEngineCreateResult(e, y, weakMap);
};
/**
 * 插件接口宿主：wrap 包装 engine.create 步骤、finalize 定稿 $，call 调用本插件提供的接口方法。
 */
//@ chunk-4121qate.js:274124-274474 placement
function createInterfaceHost(e) {
  let o = createInterfaceState(e);
  return {
    get isFinalized() {
      return o.isFinalized;
    },
    wrap: createEngineCreateWrapper(o),
    finalize: createInterfaceFinalizer(o),
    call: (r, n, s) => {
      let i = o.own.get(r);
      if (!i) return Promise.reject(new HooksError(`${o.pluginName} provides no interface named ${r}`));
      let p = i[n];
      return typeof p === "function"
        ? o.invoke(p, s, i)
        : Promise.reject(new HooksError(`$.${r} (${o.pluginName}) has no method ${n}`));
    },
  };
}
//@ chunk-4121qate.js:274474-274533 placement
function Mt() {
  throw new HooksError("core table: not an operation");
}
//@ chunk-4121qate.js:274533-274600 placement
var xC = (e) => freezeApiObject({ value: (o, r) => e("flag.value", { name: o, fallback: r }) });

export { xC, Mt, createInterfaceHost };
