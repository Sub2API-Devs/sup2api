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
function addHookClause(state, clause) {
  let { pattern, matcher } = clause;
  if (matcher !== undefined) {
    let isPattern = isEventPattern(pattern);
    let events = isPattern
      ? HOOK_EVENTS_2.filter((eventName) => matchesEventForPlugin(pattern, eventName, state))
      : [pattern];
    for (let eventName of events) {
      let problem = envSiteRuleFor(eventName).checkMatcher?.(matcher, isPattern);
      if (problem !== undefined) throw new HooksError(`${state.pluginName}: ${eventName}: ${problem}`);
    }
  }
  state.clauses = [...state.clauses, clause];
}
//@ chunk-4121qate.js:297166-297329 placement
function createClauseRunner({ engine, interfaces, invoke }, { pattern, hook }, event) {
  let isEngineCreate = event === "engine.create";
  let patternText = isEventPattern(pattern) ? pattern : undefined;
  return isEngineCreate
    ? interfaces.wrap(hook, patternText)
    : async (args, ctx) => await invoke(hook, [engine, args, ctx]);
}
//@ chunk-4121qate.js:297329-297504 placement
function createClauseCatcher({ engine, invoke, stamped }, clause, event) {
  let { matcher } = clause;
  let catchHook = clause.catch;
  if (catchHook === undefined) return;
  return async (args, ctx) =>
    matcher === undefined || stamped(() => matchesRegExpMatcher(matcher, args, lookupPathTable(event)))
      ? await invoke(catchHook, [engine, args, ctx])
      : undefined;
}
//@ chunk-4121qate.js:297504-297678 placement
var hasMatchingCatch = (registrationState, { event, e, leftOut }) =>
  registrationState.clauses.some(
    (clause, index) =>
      clause.catch !== undefined &&
      !leftOut.includes(index) &&
      matchesEventForPlugin(clause.pattern, event, registrationState) &&
      (clause.matcher === undefined ||
        registrationState.stamped(() => matchesRegExpMatcher(clause.matcher, e, lookupPathTable(event)))),
  );
//@ chunk-4121qate.js:297678-297692 placement
/**
 * 原样返回
 */
var passThroughFn = (value) => value;
//@ chunk-4121qate.js:297692-297882 placement
var createPassedHookCall = (wrapMethod, ctx, rest) =>
  freezeHookCall({
    call: wrapMethod((value) => callNextWith(value, ctx, rest)),
    to: wrapMethod((value, ...args) => callNextWith(value, ctx, [...args, ...rest])),
    signal: ctx.signal,
    is: ctx.is,
    event: ctx.event,
    origin: ctx.origin,
    trace: () => ctx.trace,
    budget: () => ctx.budget,
    caught: pickErrorState(ctx),
  });
//@ chunk-4121qate.js:297882-297947 placement
/**
 * 取答案或抛错误
 */
function unwrapAnswer(answer) {
  if (answer.error !== undefined) throw answer.error;
  return answer.answer;
}
//@ chunk-4121qate.js:297947-298809 placement
/**
 * 把外层与内层子句组合为一个处理器：外层的 next 进入内层；catch 先问外层（未处理且未调用 next 时再问内层）；matcher 两者都有才保留。
 */
function composeClauses({ pluginName, wrapMethod }, { outer, inner, pattern }) {
  let mergesMatchers = outer.matcher === undefined || inner.matcher === undefined;
  let mergesCatches = outer.catch === undefined && inner.catch === undefined;
  let weakMap = new WeakMap();
  async function runInner({ e, passed }, ctx) {
    weakMap.set(e, passed);
    let result = await inner.run(passed, ctx);
    if (!result) throw new HooksError(`${pluginName}: the on("${pattern}") hook returned no result`);
    return result;
  }
  let makeHookCall = (ctx, onCalled) =>
    freezeHookCall({
      ...hookCallContext(ctx),
      call: wrapMethod((value) => {
        onCalled();
        return ctx(value);
      }),
      to: wrapMethod((value, ...args) => {
        onCalled();
        return callNextWith(value, ctx, args);
      }),
    });
  async function runOuterCatch(e, ctx) {
    let called = false;
    let hookCall = makeHookCall(ctx, () => {
      called = true;
    });
    let answer = await Promise.resolve(outer.catch?.(e, hookCall)).then(
      (answer) => ({
        answer,
        error: undefined,
      }),
      (error) => ({
        answer: undefined,
        error,
      }),
    );
    if (answer.answer !== undefined || called) return unwrapAnswer(answer);
    let runInnerChain = await inner.catch?.(weakMap.get(e) ?? e, ctx);
    if (runInnerChain === undefined && answer.error !== undefined) throw answer.error;
    return runInnerChain;
  }
  return {
    run: (result, ctx) =>
      outer.run(
        result,
        freezeHookCall({
          ...hookCallContext(ctx),
          call: wrapMethod((passed) =>
            runInner(
              {
                e: result,
                passed,
              },
              ctx,
            ),
          ),
          to: wrapMethod((passed, ...answer) =>
            runInner(
              {
                e: result,
                passed,
              },
              createPassedHookCall(wrapMethod, ctx, answer),
            ),
          ),
        }),
      ),
    matcher: mergesMatchers ? undefined : [outer.matcher, inner.matcher],
    ...(mergesCatches
      ? {}
      : {
          catch: runOuterCatch,
        }),
  };
}
//@ chunk-4121qate.js:298809-299103 placement
/**
 * matcher 不匹配时直接走 next；前若干次不匹配时检查是否因路径不存在等原因，按路径去重打印一次警告。
 */
function createMatcherGate(state, { matcher, event, run }) {
  let warnedPaths = new Set();
  let counter = {
    count: 0,
  };
  return (args, next) => {
    if (state.stamped(() => matchesRegExpMatcher(matcher, args, lookupPathTable(event))))
      return run(args, next);
    if (counter.count >= MAX_SERIALIZED_MATCHER_CHARS) return next(args);
    counter.count += 1;
    let impossible = state.stamped(() => findImpossibleObjectMatcher(matcher, args));
    if (impossible !== undefined && !warnedPaths.has(impossible.path)) {
      warnedPaths.add(impossible.path);
      matcherLog().log(impossibleMatcherMessage(state.pluginName, event, impossible), "warn");
    }
    return next(args);
  };
}
//@ chunk-4121qate.js:299103-299407 placement
/**
 * 为某事件把一条子句构造成 {run, matcher?, catch?}：engine.create 走接口包装，其他事件在 framed(registration) 下调用钩子。
 */
function buildClauseHandler(state, { clause, event, registration }) {
  let clauseRunner = createClauseRunner(state, clause, event);
  let run = (value, next) => state.framed(registration, () => clauseRunner(value, next));
  let { matcher } = clause;
  let catcher = event === "engine.create" ? undefined : createClauseCatcher(state, clause, event);
  let framedCatch =
    catcher === undefined
      ? undefined
      : (value, next) => state.framed(registration, () => catcher(value, next));
  let handler =
    matcher === undefined
      ? {
          run,
        }
      : {
          run: createMatcherGate(state, {
            matcher,
            event,
            run,
          }),
          matcher,
        };
  return framedCatch === undefined
    ? handler
    : {
        ...handler,
        catch: framedCatch,
      };
}
//@ chunk-4121qate.js:299407-299630 placement
/**
 * 把某事件匹配到的全部子句（排除 leftOut）依次组合成一个处理器。
 */
function composeEventHandler(state, event, leftOut) {
  let composed;
  for (let [index, clause] of state.clauses.entries()) {
    if (!(matchesEventForPlugin(clause.pattern, event, state) && !leftOut.includes(index))) continue;
    let clauseHandler = buildClauseHandler(state, {
      clause,
      event,
      registration: index,
    });
    composed =
      composed === undefined
        ? clauseHandler
        : composeClauses(state, {
            outer: composed,
            inner: clauseHandler,
            pattern: clause.pattern,
          });
  }
  return composed;
}
//@ chunk-4121qate.js:299630-299937 placement
/**
 * 为流式事件的注册子句构造处理器：按 matcher 过滤，迭代钩子返回的异步生成器并逐块转发。
 */
function buildStreamClause(state, { clause, registration }) {
  let { engine, invoke, iterate, stamped, framed } = state;
  let { matcher } = clause;
  let matches = (args) => matcher === undefined || stamped(() => matchesRegExpMatcher(matcher, args));
  let makeOpen = (hook) => async (args, next) =>
    iterate(
      matches(args) ? await framed(registration, () => invoke(hook, [engine, args, next])) : next(args),
    );
  let catchHook = clause.catch;
  return {
    kind: "generator",
    registration,
    matcher,
    open: makeOpen(clause.hook),
    ...(catchHook !== undefined && {
      catch: makeOpen(catchHook),
    }),
  };
}
//@ chunk-4121qate.js:299937-300164 placement
var listStreamClauses = (state, event, leftOut) =>
  state.clauses.flatMap((clause, index) => {
    if (!(matchesEventForPlugin(clause.pattern, event, state) && !leftOut.includes(index))) return [];
    return isStreamingHookEvent(clause.pattern)
      ? [
          buildStreamClause(state, {
            clause,
            registration: index,
          }),
        ]
      : [
          {
            kind: "value",
            registration: index,
            hook: buildClauseHandler(state, {
              clause,
              event,
              registration: index,
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
  let handlerCache = new Map();
  let state = passThroughFn({
    pluginName,
    isBuiltin,
    engine,
    interfaces,
    clauses: [],
    once: new Set(),
    registrations: {
      get registered() {
        return state.clauses.map((clause) => ({
          pattern: clause.pattern,
          ...(clause.matcher !== undefined && {
            matcher: clause.matcher,
          }),
          ...(clause.catch !== undefined && {
            caught: true,
          }),
        }));
      },
      get(event, leftOut = []) {
        let cacheKey = `${event}\x00${leftOut.join(",")}`;
        if (!handlerCache.has(cacheKey))
          handlerCache.set(cacheKey, composeEventHandler(state, event, leftOut));
        return handlerCache.get(cacheKey);
      },
      catches: (event, payload, leftOut = []) =>
        hasMatchingCatch(state, {
          event,
          e: payload,
          leftOut,
        }),
      streamClauses: (event, leftOut = []) => listStreamClauses(state, event, leftOut),
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
  return state;
}
//@ chunk-4121qate.js:300869-301228 placement
/**
 * 校验钩子形态与事件是否匹配：流式事件要求 async generator，非流式事件不接受 generator；不匹配返回说明文本。
 */
function checkHookShape(state, event, hook) {
  let isStreaming = isStreamingHookEvent(event);
  let isGenerator = state.isGeneratorHook(hook);
  if (isStreaming && !isGenerator)
    return `takes an async generator, async function* ($, e, next) { ... }: ${event} streams, its hook yields the chunks and returns the result`;
  return !isStreaming && isGenerator
    ? `takes ($, e, next) => result, not an async generator: only a streaming event named as itself (${STREAMING_EVENTS.join(", ")}) takes the generator form`
    : undefined;
}
//@ chunk-4121qate.js:301228-301800 placement
function hookCatch(state, clause) {
  let { pattern } = clause;
  let label = `${state.pluginName}: on("${pattern}").catch()`;
  return freezeApiObject({
    catch: state.wrapMethod((hook) => {
      if (state.isRegistered)
        throw new HooksError(`${label} after register() returned: .catch() is for register()`);
      if (typeof hook !== "function") throw new HooksError(`${label} takes a function, ($, e, next)`);
      let problem = checkHookShape(state, pattern, hook);
      if (problem !== undefined) throw new HooksError(`${label} ${problem}`);
      if (clause.catch !== undefined)
        throw new HooksError(`${label} called twice: a registration takes one .catch`);
      if (pattern === "engine.create")
        throw new HooksError(
          `${label}: an engine.create hook has no budget and its failure fails the load; .catch does not apply`,
        );
      clause.catch = hook;
    }),
  });
}
//@ chunk-4121qate.js:301800-302563 placement
var registerHook = (state) =>
  nullPrototypeFunction(
    state.wrapMethod((pattern, ...rest) => {
      let { pluginName } = state;
      let [matcher, hook] = rest.length === 1 ? [undefined, rest[0]] : rest;
      if (state.isRegistered)
        throw new HooksError(
          `${pluginName}: on("${pattern}") after register() returned: on() is for register(); a hook may not register hooks`,
        );
      let problem = eventPatternError(pattern);
      if (problem !== undefined) throw new HooksError(`${pluginName}: on(): ${problem}`);
      if (typeof hook !== "function")
        throw new HooksError(
          `${pluginName}: on("${pattern}") takes (pattern, hook) or (pattern, matcher, hook); the hook must be a function`,
        );
      let secondProblem = checkHookShape(state, pattern, hook);
      if (secondProblem !== undefined)
        throw new HooksError(`${pluginName}: on("${pattern}") ${secondProblem}`);
      let clause = matcher === undefined ? undefined : state.copyMatcher(matcher);
      if (clause !== undefined) validateObjectMatcher(clause, `${pluginName}: on("${pattern}", matcher)`);
      if (!(clause !== undefined && !isEventPattern(pattern))) {
        if (state.once.has(pattern)) throw new HooksError(`${pluginName}: on("${pattern}") registered twice`);
        state.once.add(pattern);
      }
      let secondMatcher = {
        pattern,
        hook,
        matcher: clause,
        catch: undefined,
      };
      addHookClause(state, secondMatcher);
      return hookCatch(state, secondMatcher);
    }),
  );
//@ chunk-4121qate.js:302563-303344 placement
/**
 * 加载一个 hooks 模块并执行其 register(on, options)：构建插件 $（plugin 信息 + 核心方法表 + 接口宿主），返回 registrations、finalize、callInterface 与 dispose（取消定时器）。
 */
async function registerHooksModule(options) {
  let { loaded, host, hostStream, resolvedTable, invoke, wrapMethod, blamedWalk, signalFrom, makeSignal } =
    options;
  let { modulePath, pluginName, pluginRoot } = options.args;
  let registrationState = new Set();
  let state = false;
  let str = {
    plugin: freezeApiObject({
      name: pluginName,
      root: pluginRoot,
    }),
  };
  Object.setPrototypeOf(str, null);
  let interfaceHost = createInterfaceHost({
    engine: str,
    core: MCP_OPS({
      pluginName,
      host,
      hostStream,
      resolvedTable,
      timers: registrationState,
      unloaded: () => state,
      invoke,
      wrapMethod,
      signalFrom,
      makeSignal,
    }),
    pluginName,
    callInterface: (args) => host("interface.call", args),
    invoke,
    wrapMethod,
    blamedWalk,
  });
  let registrationState_2 = createRegistrationState(
    {
      pluginName,
      isBuiltin: isBuiltinSuffixed(options.args.pluginStorageId),
      engine: str,
      interfaces: interfaceHost,
    },
    options,
  );
  await invoke(getRegisterExport(loaded, modulePath, pluginName), [
    registerHook(registrationState_2),
    deepFreezeInPlace(options.args.options),
  ]);
  registrationState_2.isRegistered = true;
  return {
    registrations: registrationState_2.registrations,
    finalize: interfaceHost.finalize,
    callInterface: interfaceHost.call,
    dispose() {
      state = true;
      for (let args of registrationState) args.cancel();
      registrationState.clear();
    },
  };
}
export { registerHooksModule };
