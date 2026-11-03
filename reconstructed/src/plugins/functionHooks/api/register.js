/**
 * plugins/functionHooks/api/register.ts
 *
 * 函数钩子 register()/on()/.catch() 注册流程（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4121qate.js (18)
 * attribution: placement 18
 */
import { isEventPattern, matchesEventForPlugin, jeo, isBuiltinSuffixed } from "../eventPatterns.js";
import { HOOK_EVENTS, isStreamingHookEvent, Beo } from "../hookApiSurface.js";
import { Nae } from "../sites/siteRules.js";
import { HooksError } from "../hooksErrors.js";
import {
  gxt,
  kos,
  findImpossibleObjectMatcher,
  pd,
  impossibleMatcherMessage,
  validateObjectMatcher,
  Q5e,
} from "../../../utils/hooks/functionHookMatchers.js";
import { lookupPathTable } from "../../../utils/pathTable.js";
import { freezeHookCall, CAn, nfr, hookCallContext, freezeApiObject, NH } from "../dispatch/chain.js";
import { createInterfaceHost } from "./interfaces.js";
import { MCP_OPS } from "./agentToolOps.js";
import { getRegisterExport } from "./operations.js";

/**
 * 登记一条 on(pattern, hook) 子句；有 matcher 时先按匹配到的每个事件校验 matcher，不合法抛 HooksError。
 */
//@ chunk-4121qate.js:296923-297166 placement
function addHookClause(e, o) {
  let { pattern: pattern, matcher: matcher } = o;
  if (matcher !== void 0) {
    let s = isEventPattern(pattern),
      i = s ? HOOK_EVENTS.filter((p) => matchesEventForPlugin(pattern, p, e)) : [pattern];
    for (let p of i) {
      let f = Nae(p).checkMatcher?.(matcher, s);
      if (f !== void 0) throw new HooksError(`${e.pluginName}: ${p}: ${f}`);
    }
  }
  e.clauses = [...e.clauses, o];
}
//@ chunk-4121qate.js:297166-297329 placement
function createClauseRunner(
  { engine: engine, interfaces: interfaces, invoke: invoke },
  { pattern: pattern, hook: hook },
  i,
) {
  let p = i === "engine.create",
    f = isEventPattern(pattern) ? pattern : void 0;
  return p ? interfaces.wrap(hook, f) : async (a, m) => await invoke(hook, [engine, a, m]);
}
//@ chunk-4121qate.js:297329-297504 placement
function createClauseCatcher({ engine: engine, invoke: invoke, stamped: stamped }, n, s) {
  let { matcher: matcher } = n,
    p = n.catch;
  if (p === void 0) return;
  return async (f, a) =>
    matcher === void 0 || stamped(() => gxt(matcher, f, lookupPathTable(s)))
      ? await invoke(p, [engine, f, a])
      : void 0;
}
//@ chunk-4121qate.js:297504-297678 placement
var hasMatchingCatch = (e, { event: event, e: r, leftOut: leftOut }) =>
  e.clauses.some(
    (clause, i) =>
      clause.catch !== void 0 &&
      !leftOut.includes(i) &&
      matchesEventForPlugin(clause.pattern, event, e) &&
      (clause.matcher === void 0 || e.stamped(() => gxt(clause.matcher, r, lookupPathTable(event)))),
  );
//@ chunk-4121qate.js:297678-297692 placement
var il = (e) => e;
//@ chunk-4121qate.js:297692-297882 placement
var createPassedHookCall = (e, o, r) =>
  freezeHookCall({
    call: e((n) => CAn(n, o, r)),
    to: e((n, ...s) => CAn(n, o, [...s, ...r])),
    signal: o.signal,
    is: o.is,
    event: o.event,
    origin: o.origin,
    trace: () => o.trace,
    budget: () => o.budget,
    caught: nfr(o),
  });
//@ chunk-4121qate.js:297882-297947 placement
function al(e) {
  if (e.error !== void 0) throw e.error;
  return e.answer;
}
/**
 * 把外层与内层子句组合为一个处理器：外层的 next 进入内层；catch 先问外层（未处理且未调用 next 时再问内层）；matcher 两者都有才保留。
 */
//@ chunk-4121qate.js:297947-298809 placement
function composeClauses(
  { pluginName: pluginName, wrapMethod: wrapMethod },
  { outer: outer, inner: inner, pattern: pattern },
) {
  let i = outer.matcher === void 0 || inner.matcher === void 0,
    p = outer.catch === void 0 && inner.catch === void 0,
    weakMap = new WeakMap();
  async function a({ e: u, passed: passed }, y) {
    weakMap.set(u, passed);
    let run = await inner.run(passed, y);
    if (!run) throw new HooksError(`${pluginName}: the on("${pattern}") hook returned no result`);
    return run;
  }
  let m = (u, l) =>
    freezeHookCall({
      ...hookCallContext(u),
      call: wrapMethod((y) => (l(), u(y))),
      to: wrapMethod((y, ...g) => (l(), CAn(y, u, g))),
    });
  async function c(u, l) {
    let y = !1,
      g = m(l, () => {
        y = !0;
      }),
      x = await Promise.resolve(outer.catch?.(u, g)).then(
        (h) => ({ answer: h, error: void 0 }),
        (h) => ({ answer: void 0, error: h }),
      );
    if (x.answer !== void 0 || y) return al(x);
    let T = await inner.catch?.(weakMap.get(u) ?? u, l);
    if (T === void 0 && x.error !== void 0) throw x.error;
    return T;
  }
  return {
    run: (u, l) =>
      outer.run(
        u,
        freezeHookCall({
          ...hookCallContext(l),
          call: wrapMethod((y) => a({ e: u, passed: y }, l)),
          to: wrapMethod((y, ...g) => a({ e: u, passed: y }, createPassedHookCall(wrapMethod, l, g))),
        }),
      ),
    matcher: i ? void 0 : [outer.matcher, inner.matcher],
    ...(p ? {} : { catch: c }),
  };
}
/**
 * matcher 不匹配时直接走 next；前若干次不匹配时检查是否因路径不存在等原因，按路径去重打印一次警告。
 */
//@ chunk-4121qate.js:298809-299103 placement
function createMatcherGate(e, { matcher: matcher, event: event, run: run }) {
  let s = new Set(),
    i = { count: 0 };
  return (p, f) => {
    if (e.stamped(() => gxt(matcher, p, lookupPathTable(event)))) return run(p, f);
    if (i.count >= kos) return f(p);
    i.count += 1;
    let stamped = e.stamped(() => findImpossibleObjectMatcher(matcher, p));
    if (stamped !== void 0 && !s.has(stamped.path))
      (s.add(stamped.path), pd().log(impossibleMatcherMessage(e.pluginName, event, stamped), "warn"));
    return f(p);
  };
}
/**
 * 为某事件把一条子句构造成 {run, matcher?, catch?}：engine.create 走接口包装，其他事件在 framed(registration) 下调用钩子。
 */
//@ chunk-4121qate.js:299103-299407 placement
function buildClauseHandler(e, { clause: clause, event: event, registration: registration }) {
  let s = createClauseRunner(e, clause, event),
    i = (u, l) => e.framed(registration, () => s(u, l)),
    { matcher: matcher } = clause,
    a = event === "engine.create" ? void 0 : createClauseCatcher(e, clause, event),
    m = a === void 0 ? void 0 : (u, l) => e.framed(registration, () => a(u, l)),
    c =
      matcher === void 0
        ? { run: i }
        : { run: createMatcherGate(e, { matcher: matcher, event: event, run: i }), matcher: matcher };
  return m === void 0 ? c : { ...c, catch: m };
}
/**
 * 把某事件匹配到的全部子句（排除 leftOut）依次组合成一个处理器。
 */
//@ chunk-4121qate.js:299407-299630 placement
function composeEventHandler(e, o, r) {
  let n;
  for (let [s, i] of e.clauses.entries()) {
    if (!(matchesEventForPlugin(i.pattern, o, e) && !r.includes(s))) continue;
    let f = buildClauseHandler(e, { clause: i, event: o, registration: s });
    n = n === void 0 ? f : composeClauses(e, { outer: n, inner: f, pattern: i.pattern });
  }
  return n;
}
/**
 * 为流式事件的注册子句构造处理器：按 matcher 过滤，迭代钩子返回的异步生成器并逐块转发。
 */
//@ chunk-4121qate.js:299630-299937 placement
function buildStreamClause(e, { clause: clause, registration: registration }) {
  let { engine: engine, invoke: invoke, iterate: iterate, stamped: stamped, framed: framed } = e,
    { matcher: matcher } = clause,
    m = (l) => matcher === void 0 || stamped(() => gxt(matcher, l)),
    c = (l) => async (y, g) =>
      iterate(m(y) ? await framed(registration, () => invoke(l, [engine, y, g])) : g(y)),
    u = clause.catch;
  return {
    kind: "generator",
    registration: registration,
    matcher: matcher,
    open: c(clause.hook),
    ...(u !== void 0 && { catch: c(u) }),
  };
}
//@ chunk-4121qate.js:299937-300164 placement
var listStreamClauses = (e, o, r) =>
  e.clauses.flatMap((clause, s) => {
    if (!(matchesEventForPlugin(clause.pattern, o, e) && !r.includes(s))) return [];
    return isStreamingHookEvent(clause.pattern)
      ? [buildStreamClause(e, { clause: clause, registration: s })]
      : [
          {
            kind: "value",
            registration: s,
            hook: buildClauseHandler(e, { clause: clause, event: o, registration: s }),
          },
        ];
  });
/**
 * 为一个 hooks 模块建立注册状态：子句列表、按 (事件, 排除项) 缓存组合处理器的 registrations（get/catches/streamClauses/registered），以及调用、迭代、包装等运行时函数。
 */
//@ chunk-4121qate.js:300164-300869 placement
function createRegistrationState(
  { pluginName: pluginName, isBuiltin: isBuiltin, engine: engine, interfaces: interfaces },
  {
    invoke: invoke,
    iterate: iterate,
    streamIn: streamIn,
    isGeneratorHook: isGeneratorHook,
    wrapMethod: wrapMethod,
    copyMatcher: copyMatcher,
    stamped: stamped,
    framed: framed,
  },
) {
  let l = new Map(),
    y = il({
      pluginName: pluginName,
      isBuiltin: isBuiltin,
      engine: engine,
      interfaces: interfaces,
      clauses: [],
      once: new Set(),
      registrations: {
        get registered() {
          return y.clauses.map((clause) => ({
            pattern: clause.pattern,
            ...(clause.matcher !== void 0 && { matcher: clause.matcher }),
            ...(clause.catch !== void 0 && { caught: !0 }),
          }));
        },
        get(g, x = []) {
          let T = `${g}\x00${x.join(",")}`;
          if (!l.has(T)) l.set(T, composeEventHandler(y, g, x));
          return l.get(T);
        },
        catches: (g, x, T = []) => hasMatchingCatch(y, { event: g, e: x, leftOut: T }),
        streamClauses: (g, x = []) => listStreamClauses(y, g, x),
      },
      isRegistered: !1,
      invoke: invoke,
      iterate: iterate,
      streamIn: streamIn,
      isGeneratorHook: isGeneratorHook,
      wrapMethod: wrapMethod,
      copyMatcher: copyMatcher,
      stamped: stamped,
      framed: framed,
    });
  return y;
}
/**
 * 校验钩子形态与事件是否匹配：流式事件要求 async generator，非流式事件不接受 generator；不匹配返回说明文本。
 */
//@ chunk-4121qate.js:300869-301228 placement
function checkHookShape(e, o, r) {
  let n = isStreamingHookEvent(o),
    isGeneratorHook = e.isGeneratorHook(r);
  if (n && !isGeneratorHook)
    return `takes an async generator, async function* ($, e, next) { ... }: ${o} streams, its hook yields the chunks and returns the result`;
  return !n && isGeneratorHook
    ? `takes ($, e, next) => result, not an async generator: only a streaming event named as itself (${Beo.join(", ")}) takes the generator form`
    : void 0;
}
//@ chunk-4121qate.js:301228-301800 placement
function hookCatch(e, o) {
  let { pattern: pattern } = o,
    n = `${e.pluginName}: on("${pattern}").catch()`;
  return freezeApiObject({
    catch: e.wrapMethod((s) => {
      if (e.isRegistered) throw new HooksError(`${n} after register() returned: .catch() is for register()`);
      if (typeof s !== "function") throw new HooksError(`${n} takes a function, ($, e, next)`);
      let i = checkHookShape(e, pattern, s);
      if (i !== void 0) throw new HooksError(`${n} ${i}`);
      if (o.catch !== void 0) throw new HooksError(`${n} called twice: a registration takes one .catch`);
      if (pattern === "engine.create")
        throw new HooksError(
          `${n}: an engine.create hook has no budget and its failure fails the load; .catch does not apply`,
        );
      o.catch = s;
    }),
  });
}
//@ chunk-4121qate.js:301800-302563 placement
var registerHook = (e) =>
  NH(
    e.wrapMethod((o, ...r) => {
      let { pluginName: pluginName } = e,
        [s, i] = r.length === 1 ? [void 0, r[0]] : r;
      if (e.isRegistered)
        throw new HooksError(
          `${pluginName}: on("${o}") after register() returned: on() is for register(); a hook may not register hooks`,
        );
      let p = jeo(o);
      if (p !== void 0) throw new HooksError(`${pluginName}: on(): ${p}`);
      if (typeof i !== "function")
        throw new HooksError(
          `${pluginName}: on("${o}") takes (pattern, hook) or (pattern, matcher, hook); the hook must be a function`,
        );
      let f = checkHookShape(e, o, i);
      if (f !== void 0) throw new HooksError(`${pluginName}: on("${o}") ${f}`);
      let a = s === void 0 ? void 0 : e.copyMatcher(s);
      if (a !== void 0) validateObjectMatcher(a, `${pluginName}: on("${o}", matcher)`);
      if (!(a !== void 0 && !isEventPattern(o))) {
        if (e.once.has(o)) throw new HooksError(`${pluginName}: on("${o}") registered twice`);
        e.once.add(o);
      }
      let c = { pattern: o, hook: i, matcher: a, catch: void 0 };
      return (addHookClause(e, c), hookCatch(e, c));
    }),
  );
/**
 * 加载一个 hooks 模块并执行其 register(on, options)：构建插件 $（plugin 信息 + 核心方法表 + 接口宿主），返回 registrations、finalize、callInterface 与 dispose（取消定时器）。
 */
//@ chunk-4121qate.js:302563-303344 placement
async function registerHooksModule(e) {
  let {
      loaded: loaded,
      host: host,
      hostStream: hostStream,
      resolvedTable: resolvedTable,
      invoke: invoke,
      wrapMethod: wrapMethod,
      blamedWalk: blamedWalk,
      signalFrom: signalFrom,
      makeSignal: makeSignal,
    } = e,
    { modulePath: modulePath, pluginName: pluginName, pluginRoot: pluginRoot } = e.args,
    y = new Set(),
    g = !1,
    x = { plugin: freezeApiObject({ name: pluginName, root: pluginRoot }) };
  Object.setPrototypeOf(x, null);
  let T = createInterfaceHost({
      engine: x,
      core: MCP_OPS({
        pluginName: pluginName,
        host: host,
        hostStream: hostStream,
        resolvedTable: resolvedTable,
        timers: y,
        unloaded: () => g,
        invoke: invoke,
        wrapMethod: wrapMethod,
        signalFrom: signalFrom,
        makeSignal: makeSignal,
      }),
      pluginName: pluginName,
      callInterface: (v) => host("interface.call", v),
      invoke: invoke,
      wrapMethod: wrapMethod,
      blamedWalk: blamedWalk,
    }),
    h = createRegistrationState(
      {
        pluginName: pluginName,
        isBuiltin: isBuiltinSuffixed(e.args.pluginStorageId),
        engine: x,
        interfaces: T,
      },
      e,
    );
  return (
    await invoke(getRegisterExport(loaded, modulePath, pluginName), [registerHook(h), Q5e(e.args.options)]),
    (h.isRegistered = !0),
    {
      registrations: h.registrations,
      finalize: T.finalize,
      callInterface: T.call,
      dispose() {
        g = !0;
        for (let v of y) v.cancel();
        y.clear();
      },
    }
  );
}

export { registerHooksModule };
