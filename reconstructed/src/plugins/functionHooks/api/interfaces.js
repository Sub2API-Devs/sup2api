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
import { probeHookCallback, removedByPluginText, topWithholder, CORE_ORIGIN } from "../eventPatterns.js";
import { HooksError } from "../hooksErrors.js";
import { freezeApiObject, callNextWith, freezeHookCall } from "../dispatch/chain.js";
import { matcherLog } from "../../../utils/hooks/functionHookMatchers.js";
import { errorMessage } from "../../../utils/errors.js";

//@ chunk-4121qate.js:270537-270801 placement
function createInterfaceState({
  engine,
  core,
  pluginName,
  callInterface,
  invoke,
  wrapMethod,
  blamedWalk = probeHookCallback,
}) {
  let f = engine;
  return {
    engine,
    slots: f,
    identity: new Set(Object.keys(f)),
    local: core,
    own: new Map(),
    isFinalized: false,
    pluginName,
    callInterface,
    invoke,
    wrapMethod,
    blamedWalk,
  };
}
//@ chunk-4121qate.js:270801-271133 placement
/**
 * 列出插件接口对象中的方法；值不是方法对象时抛 HooksError。
 */
function listInterfaceMethods(pluginName, o, r) {
  if (typeof r !== "object" || !r)
    throw new HooksError(`${pluginName}: $.${o} must be an object of methods, not ${typeof r}`);
  let n = [];
  for (let [key, value] of Object.entries(r)) {
    if (typeof value !== "function")
      throw new HooksError(
        `${pluginName}: $.${o}.${key} is not a function; an interface is an object of methods (a value another plugin can call)`,
      );
    n.push(key);
  }
  return n;
}
//@ chunk-4121qate.js:271133-271763 placement
/**
 * 校验 engine.create 返回的 $ 是否保留了上游的名词
 */
function checkEngineCreateResult(e, o, weakMap) {
  if (typeof o !== "object" || !o)
    throw new HooksError(
      `${e.pluginName}: engine.create must return $ ({ ...await next(e), <noun>: { <event>() {} } }), not ${typeof o}`,
    );
  let n = Object.create(null);
  e.blamedWalk((s, i, p) => {
    for (let [key, value] of Object.entries(o)) {
      if (e.identity.has(key)) {
        if (value === e.slots[key]) continue;
        throw new HooksError(
          `${e.pluginName}: engine.create returned $.${key} changed; it is this plugin's identity, not a noun`,
        );
      }
      let c = typeof value === "object" && value !== null ? weakMap.get(value) : undefined;
      if (c && c.name === key) {
        s(c.descriptor);
        n[key] = c.descriptor;
        continue;
      }
      n[key] = p(() => ({
        owner: e.pluginName,
        methods: listInterfaceMethods(e.pluginName, key, value),
      }));
      e.own.set(key, value);
    }
    p(() => n);
  });
  return n;
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
/**
 * 合法方法名
 */
var isMethodName = (e) => typeof e === "string" && !NON_METHOD_PROPERTY_NAMES.has(e);
//@ chunk-4121qate.js:272175-272322 placement
function createRemoteInterface(e, name, r) {
  let n = {};
  for (let method of r.methods)
    n[method] = e.wrapMethod((...i) =>
      e.callInterface({
        owner: r.owner,
        name,
        method,
        args: i,
      }),
    );
  return freezeApiObject(n);
}
//@ chunk-4121qate.js:272322-272364 placement
var co = Object.freeze(Object.create(null));
//@ chunk-4121qate.js:272364-272496 placement
function createMissingInterfaceProxy(e, o, wrapMethod) {
  let n = (s) => wrapMethod(() => Promise.reject(new HooksError(removedByPluginText(`${e}.${s}`, o))));
  return new Proxy(co, {
    get: (s, i) => (isMethodName(i) ? n(i) : undefined),
  });
}
//@ chunk-4121qate.js:272496-272753 placement
function resolveInterface(e, name, r) {
  let n = topWithholder(r);
  if (n !== undefined) return createMissingInterfaceProxy(name, n, e.wrapMethod);
  if (r.owner === CORE_ORIGIN) {
    let s = e.local[name];
    if (!s)
      throw new HooksError(
        `${e.pluginName}: the interface table names core as the owner of $.${name}, which core does not provide`,
      );
    return s;
  }
  return createRemoteInterface(e, name, r);
}
//@ chunk-4121qate.js:272753-273010 placement
function buildEngineSlots(e, { table, beneath, isObserving }) {
  let merged = Object.assign(Object.create(null), e.slots);
  e.blamedWalk((i) => {
    for (let [key, value] of Object.entries(table)) {
      i(value);
      let m =
        isObserving && value.withheldBy === undefined
          ? createObservingInterfaceStub(e, key, value)
          : resolveInterface(e, key, value);
      merged[key] = m;
      beneath.set(m, {
        name: key,
        descriptor: value,
      });
    }
  });
  return merged;
}
//@ chunk-4121qate.js:273010-273074 placement
/**
 * 缺失接口的代理
 */
var missingInterfaceProxy = (e, wrapMethod) =>
  new Proxy(co, {
    get: (r, n) => (isMethodName(n) ? createMissingInterfaceProxy(n, e, wrapMethod) : undefined),
  });
//@ chunk-4121qate.js:273074-273500 placement
/**
 * 生成 finalize(table, declared)：按接口表填好各名词槽位，为声明但未提供的名词建缺失代理，"*" 设为原型兜底，然后冻结 $。
 */
var createInterfaceFinalizer = (interfaceState) => (o, r) => {
  if (interfaceState.isFinalized) throw new HooksError(`${interfaceState.pluginName}: $ is already built`);
  interfaceState.blamedWalk((s, i) => {
    for (let [key, value] of Object.entries(o))
      i(value.owner, () => {
        interfaceState.slots[key] = resolveInterface(interfaceState, key, value);
      });
  });
  for (let [key, value] of Object.entries(r ?? {}))
    if (key !== "*" && !Object.hasOwn(o, key) && !interfaceState.identity.has(key))
      interfaceState.slots[key] = createMissingInterfaceProxy(key, value, interfaceState.wrapMethod);
  let n = r?.["*"];
  if (n !== undefined)
    Object.setPrototypeOf(interfaceState.engine, missingInterfaceProxy(n, interfaceState.wrapMethod));
  Object.freeze(interfaceState.engine);
  interfaceState.isFinalized = true;
};
//@ chunk-4121qate.js:273500-274124 placement
/**
 * 生成 engine.create 钩子包装：调用插件步骤时传入可继续的 call/to，结果按接口表构建 $；on("*") 观察者失败时回退到下游结果。
 */
var createEngineCreateWrapper = (interfaceState) => (o, r) => async (n, s) => {
  let i = r !== undefined;
  let weakMap = new WeakMap();
  let f;
  function a(g) {
    f = g;
    return buildEngineSlots(interfaceState, {
      table: f,
      beneath: weakMap,
      isObserving: i,
    });
  }
  let m = async (g) => a(await s(g));
  let c = async (g, ...x) => a(await callNextWith(g, s, x));
  async function u(error) {
    matcherLog().log(
      `hooks module ${interfaceState.pluginName}: the on("${r}") hook failed at engine.create (${errorMessage(error)}); passed on`,
      "warn",
    );
    if (f) return f;
    if (s.signal.aborted) throw error;
    return await s(n);
  }
  let l = freezeHookCall({
    call: interfaceState.wrapMethod(m),
    to: interfaceState.wrapMethod(c),
    signal: s.signal,
    is: s.is,
    event: s.event,
    origin: s.origin,
    trace: () => s.trace,
    budget: () => s.budget,
  });
  let y;
  try {
    y = await interfaceState.invoke(o, [co, n, l]);
  } catch (error) {
    if (!i) throw error;
    return u(error);
  }
  return checkEngineCreateResult(interfaceState, y, weakMap);
};
//@ chunk-4121qate.js:274124-274474 placement
/**
 * 插件接口宿主：wrap 包装 engine.create 步骤、finalize 定稿 $，call 调用本插件提供的接口方法。
 */
function createInterfaceHost(e) {
  let interfaceState = createInterfaceState(e);
  return {
    get isFinalized() {
      return interfaceState.isFinalized;
    },
    wrap: createEngineCreateWrapper(interfaceState),
    finalize: createInterfaceFinalizer(interfaceState),
    call: (r, n, s) => {
      let i = interfaceState.own.get(r);
      if (!i)
        return Promise.reject(
          new HooksError(`${interfaceState.pluginName} provides no interface named ${r}`),
        );
      let p = i[n];
      return typeof p === "function"
        ? interfaceState.invoke(p, s, i)
        : Promise.reject(new HooksError(`$.${r} (${interfaceState.pluginName}) has no method ${n}`));
    },
  };
}
//@ chunk-4121qate.js:274474-274533 placement
/**
 * 抛“不是操作”
 */
function coreNotAnOperation() {
  throw new HooksError("core table: not an operation");
}
//@ chunk-4121qate.js:274533-274600 placement
/**
 * flag.value 接口
 */
var flagValueApi = (host) =>
  freezeApiObject({
    value: (name, fallback) =>
      host("flag.value", {
        name,
        fallback,
      }),
  });
export { flagValueApi, coreNotAnOperation, createInterfaceHost };
