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
import { deferInit } from "../../../../runtime/deferred-init.js";

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
  let slots = engine;
  return {
    engine,
    slots,
    identity: new Set(Object.keys(slots)),
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
function listInterfaceMethods(pluginName, interfaceName, value) {
  if (typeof value !== "object" || !value)
    throw new HooksError(
      `${pluginName}: $.${interfaceName} must be an object of methods, not ${typeof value}`,
    );
  let methods = [];
  for (let [key, value_2] of Object.entries(value)) {
    if (typeof value_2 !== "function")
      throw new HooksError(
        `${pluginName}: $.${interfaceName}.${key} is not a function; an interface is an object of methods (a value another plugin can call)`,
      );
    methods.push(key);
  }
  return methods;
}
//@ chunk-4121qate.js:271133-271763 placement
/**
 * 校验 engine.create 返回的 $ 是否保留了上游的名词
 */
function checkEngineCreateResult(state, result, weakMap) {
  if (typeof result !== "object" || !result)
    throw new HooksError(
      `${state.pluginName}: engine.create must return $ ({ ...await next(e), <noun>: { <event>() {} } }), not ${typeof result}`,
    );
  let descriptors = Object.create(null);
  state.blamedWalk((addMethods, name, makeDescriptor) => {
    for (let [key, value] of Object.entries(result)) {
      if (state.identity.has(key)) {
        if (value === state.slots[key]) continue;
        throw new HooksError(
          `${state.pluginName}: engine.create returned $.${key} changed; it is this plugin's identity, not a noun`,
        );
      }
      let known = typeof value === "object" && value !== null ? weakMap.get(value) : undefined;
      if (known && known.name === key) {
        addMethods(known.descriptor);
        descriptors[key] = known.descriptor;
        continue;
      }
      descriptors[key] = makeDescriptor(() => ({
        owner: state.pluginName,
        methods: listInterfaceMethods(state.pluginName, key, value),
      }));
      state.own.set(key, value);
    }
    makeDescriptor(() => descriptors);
  });
  return descriptors;
}
//@ chunk-4121qate.js:271763-272012 placement
function createObservingInterfaceStub(state, name, descriptor) {
  let stub = {};
  for (let method of descriptor.methods)
    stub[method] = state.wrapMethod(() => {
      throw new HooksError(
        `${state.pluginName}: $.${name}.${method} is not callable from an engine.create step registered through on("*"); hook engine.create by name to compose nouns`,
      );
    });
  return freezeApiObject(stub);
}
//@ chunk-4121qate.js:272012-272131 placement
var NON_METHOD_PROPERTY_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-4121qate.js:272012", () => {
  NON_METHOD_PROPERTY_NAMES = new Set([
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
});
//@ chunk-4121qate.js:272131-272175 placement
/**
 * 合法方法名
 */
var isMethodName = (key) => typeof key === "string" && !NON_METHOD_PROPERTY_NAMES.has(key);
//@ chunk-4121qate.js:272175-272322 placement
function createRemoteInterface(state, name, descriptor) {
  let methodMap = {};
  for (let method of descriptor.methods)
    methodMap[method] = state.wrapMethod((...args) =>
      state.callInterface({
        owner: descriptor.owner,
        name,
        method,
        args,
      }),
    );
  return freezeApiObject(methodMap);
}
//@ chunk-4121qate.js:272322-272364 placement
var EMPTY_INTERFACE_TARGET; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-4121qate.js:272322", () => {
  EMPTY_INTERFACE_TARGET = Object.freeze(Object.create(null));
});
//@ chunk-4121qate.js:272364-272496 placement
function createMissingInterfaceProxy(interfaceName, withheld, wrapMethod) {
  let rejectMethod = (method) =>
    wrapMethod(() =>
      Promise.reject(new HooksError(removedByPluginText(`${interfaceName}.${method}`, withheld))),
    );
  return new Proxy(EMPTY_INTERFACE_TARGET, {
    get: (target, key) => (isMethodName(key) ? rejectMethod(key) : undefined),
  });
}
//@ chunk-4121qate.js:272496-272753 placement
function resolveInterface(state, interfaceName, descriptor) {
  let withheldBy = topWithholder(descriptor);
  if (withheldBy !== undefined)
    return createMissingInterfaceProxy(interfaceName, withheldBy, state.wrapMethod);
  if (descriptor.owner === CORE_ORIGIN) {
    let localMethods = state.local[interfaceName];
    if (!localMethods)
      throw new HooksError(
        `${state.pluginName}: the interface table names core as the owner of $.${interfaceName}, which core does not provide`,
      );
    return localMethods;
  }
  return createRemoteInterface(state, interfaceName, descriptor);
}
//@ chunk-4121qate.js:272753-273010 placement
function buildEngineSlots(state, { table, beneath, isObserving }) {
  let merged = Object.assign(Object.create(null), state.slots);
  state.blamedWalk((visit) => {
    for (let [key, value] of Object.entries(table)) {
      visit(value);
      let method =
        isObserving && value.withheldBy === undefined
          ? createObservingInterfaceStub(state, key, value)
          : resolveInterface(state, key, value);
      merged[key] = method;
      beneath.set(method, {
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
var missingInterfaceProxy = (withheld, wrapMethod) =>
  new Proxy(EMPTY_INTERFACE_TARGET, {
    get: (target, key) =>
      isMethodName(key) ? createMissingInterfaceProxy(key, withheld, wrapMethod) : undefined,
  });
//@ chunk-4121qate.js:273074-273500 placement
/**
 * 生成 finalize(table, declared)：按接口表填好各名词槽位，为声明但未提供的名词建缺失代理，"*" 设为原型兜底，然后冻结 $。
 */
var createInterfaceFinalizer = (state) => (table, beneath) => {
  if (state.isFinalized) throw new HooksError(`${state.pluginName}: $ is already built`);
  state.blamedWalk((visit, withOwner) => {
    for (let [key, value] of Object.entries(table))
      withOwner(value.owner, () => {
        state.slots[key] = resolveInterface(state, key, value);
      });
  });
  for (let [key, value] of Object.entries(beneath ?? {}))
    if (key !== "*" && !Object.hasOwn(table, key) && !state.identity.has(key))
      state.slots[key] = createMissingInterfaceProxy(key, value, state.wrapMethod);
  let wildcard = beneath?.["*"];
  if (wildcard !== undefined)
    Object.setPrototypeOf(state.engine, missingInterfaceProxy(wildcard, state.wrapMethod));
  Object.freeze(state.engine);
  state.isFinalized = true;
};
//@ chunk-4121qate.js:273500-274124 placement
/**
 * 生成 engine.create 钩子包装：调用插件步骤时传入可继续的 call/to，结果按接口表构建 $；on("*") 观察者失败时回退到下游结果。
 */
var createEngineCreateWrapper = (state) => (name, hookName) => async (args, ctx) => {
  let isObserving = hookName !== undefined;
  let weakMap = new WeakMap();
  let lastTable;
  function useTable(table) {
    lastTable = table;
    return buildEngineSlots(state, {
      table: lastTable,
      beneath: weakMap,
      isObserving,
    });
  }
  let runWithValue = async (value) => useTable(await ctx(value));
  let nextWithArgs = async (nextHandler, ...rest) => useTable(await callNextWith(nextHandler, ctx, rest));
  async function onError(error) {
    matcherLog().log(
      `hooks module ${state.pluginName}: the on("${hookName}") hook failed at engine.create (${errorMessage(error)}); passed on`,
      "warn",
    );
    if (lastTable) return lastTable;
    if (ctx.signal.aborted) throw error;
    return await ctx(args);
  }
  let hookCall = freezeHookCall({
    call: state.wrapMethod(runWithValue),
    to: state.wrapMethod(nextWithArgs),
    signal: ctx.signal,
    is: ctx.is,
    event: ctx.event,
    origin: ctx.origin,
    trace: () => ctx.trace,
    budget: () => ctx.budget,
  });
  let result;
  try {
    result = await state.invoke(name, [EMPTY_INTERFACE_TARGET, args, hookCall]);
  } catch (error) {
    if (!isObserving) throw error;
    return onError(error);
  }
  return checkEngineCreateResult(state, result, weakMap);
};
//@ chunk-4121qate.js:274124-274474 placement
/**
 * 插件接口宿主：wrap 包装 engine.create 步骤、finalize 定稿 $，call 调用本插件提供的接口方法。
 */
function createInterfaceHost(options) {
  let interfaceState = createInterfaceState(options);
  return {
    get isFinalized() {
      return interfaceState.isFinalized;
    },
    wrap: createEngineCreateWrapper(interfaceState),
    finalize: createInterfaceFinalizer(interfaceState),
    call: (name, method, args) => {
      let localMethods = interfaceState.own.get(name);
      if (!localMethods)
        return Promise.reject(
          new HooksError(`${interfaceState.pluginName} provides no interface named ${name}`),
        );
      let fn = localMethods[method];
      return typeof fn === "function"
        ? interfaceState.invoke(fn, args, localMethods)
        : Promise.reject(new HooksError(`$.${name} (${interfaceState.pluginName}) has no method ${method}`));
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
