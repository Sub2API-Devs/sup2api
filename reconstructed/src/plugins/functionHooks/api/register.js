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
import {
  isEventPattern,
  matchesEventForPlugin,
  eventPatternError,
  isBuiltinSuffixed,
} from "../eventPatterns.js";
import { HOOK_EVENTS_2, isStreamingHookEvent, STREAMING_EVENTS } from "../hookApiSurface.js";
import { envSiteRuleFor } from "../sites/siteRules.js";
import { HooksError } from "../hooksErrors.js";
import {
  matchesRegExpMatcher,
  MAX_SERIALIZED_MATCHER_CHARS,
  findImpossibleObjectMatcher,
  matcherLog,
  impossibleMatcherMessage,
  validateObjectMatcher,
  deepFreezeInPlace,
} from "../../../utils/hooks/functionHookMatchers.js";
import { lookupPathTable } from "../../../utils/pathTable.js";
import {
  freezeHookCall,
  callNextWith,
  pickErrorState,
  hookCallContext,
  freezeApiObject,
  nullPrototypeFunction,
} from "../dispatch/chain.js";
import { createInterfaceHost } from "./interfaces.js";
import { MCP_OPS } from "./agentToolOps.js";
import { getRegisterExport } from "./operations.js";

//@ chunk-4121qate.js:296923-297166 placement
/**
 * 登记一条 on(pattern, hook) 子句；有 matcher 时先按匹配到的每个事件校验 matcher，不合法抛 HooksError。
 */
function addHookClause(e, o) {
  let { pattern, matcher } = o;
  if (matcher !== undefined) {
    let s = isEventPattern(pattern);
    let i = s ? HOOK_EVENTS_2.filter((p) => matchesEventForPlugin(pattern, p, e)) : [pattern];
    for (let p of i) {
      let f = envSiteRuleFor(p).checkMatcher?.(matcher, s);
      if (f !== undefined) throw new HooksError(`${e.pluginName}: ${p}: ${f}`);
    }
  }
  e.clauses = [...e.clauses, o];
}
//@ chunk-4121qate.js:297166-297329 placement
function createClauseRunner({ engine, interfaces, invoke }, { pattern, hook }, event) {
  let p = event === "engine.create";
  let f = isEventPattern(pattern) ? pattern : undefined;
  return p ? interfaces.wrap(hook, f) : async (a, m) => await invoke(hook, [engine, a, m]);
}
//@ chunk-4121qate.js:297329-297504 placement
function createClauseCatcher({ engine, invoke, stamped }, clause, event) {
  let { matcher } = clause;
  let p = clause.catch;
  if (p === undefined) return;
  return async (f, a) =>
    matcher === undefined || stamped(() => matchesRegExpMatcher(matcher, f, lookupPathTable(event)))
      ? await invoke(p, [engine, f, a])
      : undefined;
}
//@ chunk-4121qate.js:297504-297678 placement
var hasMatchingCatch = (e, { event, e: r, leftOut }) =>
  e.clauses.some(
    (clause, i) =>
      clause.catch !== undefined &&
      !leftOut.includes(i) &&
      matchesEventForPlugin(clause.pattern, event, e) &&
      (clause.matcher === undefined ||
        e.stamped(() => matchesRegExpMatcher(clause.matcher, r, lookupPathTable(event)))),
  );
//@ chunk-4121qate.js:297678-297692 placement
/**
 * 原样返回
 */
var passThroughFn = (e) => e;
//@ chunk-4121qate.js:297692-297882 placement
var createPassedHookCall = (wrapMethod, o, r) =>
  freezeHookCall({
    call: wrapMethod((n) => callNextWith(n, o, r)),
    to: wrapMethod((n, ...s) => callNextWith(n, o, [...s, ...r])),
    signal: o.signal,
    is: o.is,
    event: o.event,
    origin: o.origin,
    trace: () => o.trace,
    budget: () => o.budget,
    caught: pickErrorState(o),
  });
//@ chunk-4121qate.js:297882-297947 placement
/**
 * 取答案或抛错误
 */
function unwrapAnswer(e) {
  if (e.error !== undefined) throw e.error;
  return e.answer;
}
//@ chunk-4121qate.js:297947-298809 placement
/**
 * 把外层与内层子句组合为一个处理器：外层的 next 进入内层；catch 先问外层（未处理且未调用 next 时再问内层）；matcher 两者都有才保留。
 */
function composeClauses({ pluginName, wrapMethod }, { outer, inner, pattern }) {
  let i = outer.matcher === undefined || inner.matcher === undefined;
  let p = outer.catch === undefined && inner.catch === undefined;
  let weakMap = new WeakMap();
  async function a({ e: u, passed }, y) {
    weakMap.set(u, passed);
    let g = await inner.run(passed, y);
    if (!g) throw new HooksError(`${pluginName}: the on("${pattern}") hook returned no result`);
    return g;
  }
  let m = (u, l) =>
    freezeHookCall({
      ...hookCallContext(u),
      call: wrapMethod((y) => {
        l();
        return u(y);
      }),
      to: wrapMethod((y, ...g) => {
        l();
        return callNextWith(y, u, g);
      }),
    });
  async function c(u, l) {
    let y = false;
    let g = m(l, () => {
      y = true;
    });
    let x = await Promise.resolve(outer.catch?.(u, g)).then(
      (answer) => ({
        answer,
        error: undefined,
      }),
      (error) => ({
        answer: undefined,
        error,
      }),
    );
    if (x.answer !== undefined || y) return unwrapAnswer(x);
    let T = await inner.catch?.(weakMap.get(u) ?? u, l);
    if (T === undefined && x.error !== undefined) throw x.error;
    return T;
  }
  return {
    run: (u, l) =>
      outer.run(
        u,
        freezeHookCall({
          ...hookCallContext(l),
          call: wrapMethod((passed) =>
            a(
              {
                e: u,
                passed,
              },
              l,
            ),
          ),
          to: wrapMethod((passed, ...g) =>
            a(
              {
                e: u,
                passed,
              },
              createPassedHookCall(wrapMethod, l, g),
            ),
          ),
        }),
      ),
    matcher: i ? undefined : [outer.matcher, inner.matcher],
    ...(p
      ? {}
      : {
          catch: c,
        }),
  };
}
//@ chunk-4121qate.js:298809-299103 placement
/**
 * matcher 不匹配时直接走 next；前若干次不匹配时检查是否因路径不存在等原因，按路径去重打印一次警告。
 */
function createMatcherGate(e, { matcher, event, run }) {
  let s = new Set();
  let i = {
    count: 0,
  };
  return (p, f) => {
    if (e.stamped(() => matchesRegExpMatcher(matcher, p, lookupPathTable(event)))) return run(p, f);
    if (i.count >= MAX_SERIALIZED_MATCHER_CHARS) return f(p);
    i.count += 1;
    let m = e.stamped(() => findImpossibleObjectMatcher(matcher, p));
    if (m !== undefined && !s.has(m.path)) {
      s.add(m.path);
      matcherLog().log(impossibleMatcherMessage(e.pluginName, event, m), "warn");
    }
    return f(p);
  };
}
//@ chunk-4121qate.js:299103-299407 placement
/**
 * 为某事件把一条子句构造成 {run, matcher?, catch?}：engine.create 走接口包装，其他事件在 framed(registration) 下调用钩子。
 */
function buildClauseHandler(e, { clause, event, registration }) {
  let clauseRunner = createClauseRunner(e, clause, event);
  let run = (u, l) => e.framed(registration, () => clauseRunner(u, l));
  let { matcher } = clause;
  let a = event === "engine.create" ? undefined : createClauseCatcher(e, clause, event);
  let m = a === undefined ? undefined : (u, l) => e.framed(registration, () => a(u, l));
  let c =
    matcher === undefined
      ? {
          run,
        }
      : {
          run: createMatcherGate(e, {
            matcher,
            event,
            run,
          }),
          matcher,
        };
  return m === undefined
    ? c
    : {
        ...c,
        catch: m,
      };
}
//@ chunk-4121qate.js:299407-299630 placement
/**
 * 把某事件匹配到的全部子句（排除 leftOut）依次组合成一个处理器。
 */
function composeEventHandler(e, o, r) {
  let n;
  for (let [s, i] of e.clauses.entries()) {
    if (!(matchesEventForPlugin(i.pattern, o, e) && !r.includes(s))) continue;
    let clauseHandler = buildClauseHandler(e, {
      clause: i,
      event: o,
      registration: s,
    });
    n =
      n === undefined
        ? clauseHandler
        : composeClauses(e, {
            outer: n,
            inner: clauseHandler,
            pattern: i.pattern,
          });
  }
  return n;
}
//@ chunk-4121qate.js:299630-299937 placement
/**
 * 为流式事件的注册子句构造处理器：按 matcher 过滤，迭代钩子返回的异步生成器并逐块转发。
 */
function buildStreamClause(e, { clause, registration }) {
  let { engine, invoke, iterate, stamped, framed } = e;
  let { matcher } = clause;
  let m = (l) => matcher === undefined || stamped(() => matchesRegExpMatcher(matcher, l));
  let c = (l) => async (y, g) =>
    iterate(m(y) ? await framed(registration, () => invoke(l, [engine, y, g])) : g(y));
  let u = clause.catch;
  return {
    kind: "generator",
    registration,
    matcher,
    open: c(clause.hook),
    ...(u !== undefined && {
      catch: c(u),
    }),
  };
}
//@ chunk-4121qate.js:299937-300164 placement
var listStreamClauses = (e, o, r) =>
  e.clauses.flatMap((clause, s) => {
    if (!(matchesEventForPlugin(clause.pattern, o, e) && !r.includes(s))) return [];
    return isStreamingHookEvent(clause.pattern)
      ? [
          buildStreamClause(e, {
            clause,
            registration: s,
          }),
        ]
      : [
          {
            kind: "value",
            registration: s,
            hook: buildClauseHandler(e, {
              clause,
              event: o,
              registration: s,
            }),
          },
        ];
  });
//@ chunk-4121qate.js:300164-300869 placement
/**
 * 为一个 hooks 模块建立注册状态：子句列表、按 (事件, 排除项) 缓存组合处理器的 registrations（get/catches/streamClauses/registered），以及调用、迭代、包装等运行时函数。
 */
function createRegistrationState(
  { pluginName, isBuiltin, engine, interfaces },
  { invoke, iterate, streamIn, isGeneratorHook, wrapMethod, copyMatcher, stamped, framed },
) {
  let l = new Map();
  let y = passThroughFn({
    pluginName,
    isBuiltin,
    engine,
    interfaces,
    clauses: [],
    once: new Set(),
    registrations: {
      get registered() {
        return y.clauses.map((clause) => ({
          pattern: clause.pattern,
          ...(clause.matcher !== undefined && {
            matcher: clause.matcher,
          }),
          ...(clause.catch !== undefined && {
            caught: true,
          }),
        }));
      },
      get(g, x = []) {
        let T = `${g}\x00${x.join(",")}`;
        if (!l.has(T)) l.set(T, composeEventHandler(y, g, x));
        return l.get(T);
      },
      catches: (event, x, leftOut = []) =>
        hasMatchingCatch(y, {
          event,
          e: x,
          leftOut,
        }),
      streamClauses: (g, x = []) => listStreamClauses(y, g, x),
    },
    isRegistered: false,
    invoke,
    iterate,
    streamIn,
    isGeneratorHook,
    wrapMethod,
    copyMatcher,
    stamped,
    framed,
  });
  return y;
}
//@ chunk-4121qate.js:300869-301228 placement
/**
 * 校验钩子形态与事件是否匹配：流式事件要求 async generator，非流式事件不接受 generator；不匹配返回说明文本。
 */
function checkHookShape(e, o, r) {
  let n = isStreamingHookEvent(o);
  let s = e.isGeneratorHook(r);
  if (n && !s)
    return `takes an async generator, async function* ($, e, next) { ... }: ${o} streams, its hook yields the chunks and returns the result`;
  return !n && s
    ? `takes ($, e, next) => result, not an async generator: only a streaming event named as itself (${STREAMING_EVENTS.join(", ")}) takes the generator form`
    : undefined;
}
//@ chunk-4121qate.js:301228-301800 placement
function hookCatch(e, o) {
  let { pattern } = o;
  let n = `${e.pluginName}: on("${pattern}").catch()`;
  return freezeApiObject({
    catch: e.wrapMethod((s) => {
      if (e.isRegistered) throw new HooksError(`${n} after register() returned: .catch() is for register()`);
      if (typeof s !== "function") throw new HooksError(`${n} takes a function, ($, e, next)`);
      let i = checkHookShape(e, pattern, s);
      if (i !== undefined) throw new HooksError(`${n} ${i}`);
      if (o.catch !== undefined) throw new HooksError(`${n} called twice: a registration takes one .catch`);
      if (pattern === "engine.create")
        throw new HooksError(
          `${n}: an engine.create hook has no budget and its failure fails the load; .catch does not apply`,
        );
      o.catch = s;
    }),
  });
}
//@ chunk-4121qate.js:301800-302563 placement
var registerHook = (registrationState) =>
  nullPrototypeFunction(
    registrationState.wrapMethod((o, ...r) => {
      let { pluginName } = registrationState;
      let [s, i] = r.length === 1 ? [undefined, r[0]] : r;
      if (registrationState.isRegistered)
        throw new HooksError(
          `${pluginName}: on("${o}") after register() returned: on() is for register(); a hook may not register hooks`,
        );
      let p = eventPatternError(o);
      if (p !== undefined) throw new HooksError(`${pluginName}: on(): ${p}`);
      if (typeof i !== "function")
        throw new HooksError(
          `${pluginName}: on("${o}") takes (pattern, hook) or (pattern, matcher, hook); the hook must be a function`,
        );
      let f = checkHookShape(registrationState, o, i);
      if (f !== undefined) throw new HooksError(`${pluginName}: on("${o}") ${f}`);
      let a = s === undefined ? undefined : registrationState.copyMatcher(s);
      if (a !== undefined) validateObjectMatcher(a, `${pluginName}: on("${o}", matcher)`);
      if (!(a !== undefined && !isEventPattern(o))) {
        if (registrationState.once.has(o)) throw new HooksError(`${pluginName}: on("${o}") registered twice`);
        registrationState.once.add(o);
      }
      let c = {
        pattern: o,
        hook: i,
        matcher: a,
        catch: undefined,
      };
      addHookClause(registrationState, c);
      return hookCatch(registrationState, c);
    }),
  );
//@ chunk-4121qate.js:302563-303344 placement
/**
 * 加载一个 hooks 模块并执行其 register(on, options)：构建插件 $（plugin 信息 + 核心方法表 + 接口宿主），返回 registrations、finalize、callInterface 与 dispose（取消定时器）。
 */
async function registerHooksModule(e) {
  let { loaded, host, hostStream, resolvedTable, invoke, wrapMethod, blamedWalk, signalFrom, makeSignal } = e;
  let { modulePath, pluginName, pluginRoot } = e.args;
  let y = new Set();
  let g = false;
  let x = {
    plugin: freezeApiObject({
      name: pluginName,
      root: pluginRoot,
    }),
  };
  Object.setPrototypeOf(x, null);
  let interfaceHost = createInterfaceHost({
    engine: x,
    core: MCP_OPS({
      pluginName,
      host,
      hostStream,
      resolvedTable,
      timers: y,
      unloaded: () => g,
      invoke,
      wrapMethod,
      signalFrom,
      makeSignal,
    }),
    pluginName,
    callInterface: (v) => host("interface.call", v),
    invoke,
    wrapMethod,
    blamedWalk,
  });
  let registrationState = createRegistrationState(
    {
      pluginName,
      isBuiltin: isBuiltinSuffixed(e.args.pluginStorageId),
      engine: x,
      interfaces: interfaceHost,
    },
    e,
  );
  await invoke(getRegisterExport(loaded, modulePath, pluginName), [
    registerHook(registrationState),
    deepFreezeInPlace(e.args.options),
  ]);
  registrationState.isRegistered = true;
  return {
    registrations: registrationState.registrations,
    finalize: interfaceHost.finalize,
    callInterface: interfaceHost.call,
    dispose() {
      g = true;
      for (let v of y) v.cancel();
      y.clear();
    },
  };
}
export { registerHooksModule };
