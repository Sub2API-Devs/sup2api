/**
 * plugins/functionHooks/dispatch/streamChain.ts
 *
 * 流式钩子链与站点总表绑定（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-j8f885h1.js (22)
 * attribution: placement 22
 */
import { HooksError, isPlainDataError, PlainDataError } from "../hooksErrors.js";
import {
  UNLIMITED_BUDGET,
  forwardAbort,
  freezeHookCall,
  hookCallContext,
  forwardNext,
  errorTextOf,
  nextAfterSettledError,
  handlerTier,
  maybeBypassHandler,
  freezeUnlessFrozen,
  isCoreOrManaged,
  emptyEntryState,
  resolveNextTier,
  makeHookCall,
  eventPatternMatcher,
  traceOfRun,
  isAbortOf,
  abortErrorFor,
  scrubErrorText,
  withHookPrefix,
  watchOverrun,
  failedClosedText,
  FAILED_CLOSED,
  attempt,
  INTERRUPTED_LEFT_OUT,
  SKIPPED_LAST_NEXT,
  LEFT_MID_STREAM,
  SKIPPED_BELOW_RAN,
  reportHandlerFailure,
  freezeEntry,
  ENGINE,
  missingImplementation,
  ENGINE_ORIGIN,
  NO_FLOORS,
  forwardAbortWith,
  errorSummary,
} from "./chain.js";
import {
  LINGER_GRACE_MS,
  VALUE_NODE_SLACK,
  budgetPauseStorage,
  normalizeNextArgument,
} from "./valueSizing.js";
import { identity } from "../../../utils/identity.js";
import { createValueSlot } from "../../../utils/valueSlot.js";
import { sleep } from "../../../utils/sleep.js";
import { matcherLog } from "../../../utils/hooks/functionHookMatchers.js";
import { reportPluginHookWithoutNext } from "./slowHookReports.js";
import { normalizeCaseForComparison_2 } from "../../../utils/permissions/filesystem.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-j8f885h1.js:199258-199657 placement
/**
 * 可暂停的钩子预算计时器：到期以 HooksError 拒绝 expired，支持 pause/resume/rearm、剩余毫秒查询。
 */
function createPausableBudget(budgetMs, reason) {
  let remaining = budgetMs;
  let now = Date.now();
  let timer;
  let expiredFlag = false;
  let paused = false;
  let rejectFn = () => {};
  let expired = swallowRejection(
    new Promise((resolve, reject) => {
      rejectFn = reject;
    }),
  );
  function onTimeout() {
    expiredFlag = true;
    rejectFn(new HooksError(reason));
  }
  function arm() {
    now = Date.now();
    paused = true;
    timer = setTimeout(onTimeout, remaining);
  }
  let remainingMs = () => (paused ? Math.max(0, remaining - (Date.now() - now)) : remaining);
  arm();
  return {
    expired,
    isExpired: () => expiredFlag,
    remainingMs: () => (expiredFlag ? 0 : remainingMs()),
    pause() {
      clearTimeout(timer);
      remaining = remainingMs();
      paused = false;
    },
    resume: arm,
    clear: () => clearTimeout(timer),
    rearm() {
      if (expiredFlag) return;
      remaining = budgetMs;
      clearTimeout(timer);
      if (paused) arm();
    },
  };
}
//@ chunk-j8f885h1.js:199657-199697 placement
/**
 * 吞掉 rejection
 */
function swallowRejection(promise) {
  promise.catch(() => {});
  return promise;
}
//@ chunk-j8f885h1.js:199697-200583 placement
function describeStreamHookOverrun(budgetMs, signal, cutAt) {
  let remainingToCut = () =>
    cutAt === undefined ? Number.POSITIVE_INFINITY : Math.max(0, cutAt - Date.now());
  let ms = Math.min(budgetMs <= 0 ? Number.POSITIVE_INFINITY : budgetMs, remainingToCut());
  if (budgetMs <= 0)
    return {
      expired: undefined,
      isExpired: () => false,
      reading: () =>
        cutAt === undefined
          ? UNLIMITED_BUDGET
          : Object.freeze({
              ms,
              remainingMs: remainingToCut(),
            }),
      hasGraceExpired: () => false,
      pause() {},
      resume() {},
      clear() {},
      rearm() {},
    };
  let pauses = 0;
  let resumed = false;
  let grace;
  let pausableBudget = createPausableBudget(budgetMs, `exceeded ${budgetMs}ms budget`);
  let deferred = Promise.withResolvers();
  function startGrace() {
    grace = createPausableBudget(
      LINGER_GRACE_MS,
      `did not settle within ${LINGER_GRACE_MS}ms of its signal aborting`,
    );
    if (pauses > 0) grace.pause();
    grace.expired.catch(deferred.reject);
  }
  let secondBudget = forwardAbort(signal, {
    abort: startGrace,
  });
  return {
    expired: swallowRejection(Promise.race([pausableBudget.expired, deferred.promise])),
    isExpired: () => pausableBudget.isExpired(),
    reading: () =>
      Object.freeze({
        ms,
        remainingMs: Math.min(pausableBudget.remainingMs(), remainingToCut()),
      }),
    hasGraceExpired: () => grace?.isExpired() ?? false,
    pause() {
      if (pauses++ === 0) {
        pausableBudget.pause();
        grace?.pause();
      }
    },
    resume() {
      if (--pauses === 0 && !resumed) {
        pausableBudget.resume();
        grace?.resume();
      }
    },
    clear() {
      resumed = true;
      pausableBudget.clear();
      grace?.clear();
      secondBudget();
    },
    rearm() {
      if (!resumed) pausableBudget.rearm();
    },
  };
}
//@ chunk-j8f885h1.js:200583-200595 placement
/**
 * 钩子调用与分发的默认超时 10 秒：单次调用等待应答、分发预算、环境存活期都取这个默认值。
 */
var DEFAULT_HOOK_TIMEOUT_MS = 1e4;
//@ chunk-j8f885h1.js:200595-200630 placement
/**
 * 流式链槽
 */
var streamChainSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-j8f885h1.js:200595", () => {
  streamChainSlot = identity(createValueSlot(), (slot) => slot.set(undefined));
});
//@ chunk-j8f885h1.js:200630-200825 placement (2.1.88 match: returnValue, 0.765)
async function* forwardGenerator(as) {
  let done = false;
  try {
    while (true) {
      let step = await as.next().catch((error) => {
        done = true;
        throw error;
      });
      if (step.done === true) {
        done = true;
        return step.value;
      }
      yield step.value;
    }
  } finally {
    if (!done)
      await as.return().catch(() => {
        return;
      });
  }
}
//@ chunk-j8f885h1.js:200825-201185 placement
/**
 * 包装异步生成器：照常 yield，同时把生成器的 return 值放进一个 promise；生成器在完成前被关闭时 promise 以“stream was closed before its result”reject。
 */
function teeGeneratorResult(source) {
  let deferred = Promise.withResolvers();
  deferred.promise.catch(() => {});
  let done = false;
  async function* generator() {
    let iterable = typeof source === "function" ? source() : source;
    try {
      let result = yield* iterable;
      done = true;
      deferred.resolve(result);
      return result;
    } catch (error) {
      done = true;
      deferred.reject(error);
      throw error;
    } finally {
      if (!done) deferred.reject(new HooksError("the stream was closed before its result"));
    }
  }
  return Object.defineProperty(generator(), "result", {
    value: deferred.promise,
    enumerable: true,
  });
}
//@ chunk-j8f885h1.js:201185-201375 placement
function getStreamResultPromise(stream) {
  let result = Reflect.get(stream, "result");
  return typeof result === "object" &&
    result !== null &&
    "then" in result &&
    typeof result.then === "function"
    ? result
    : Promise.reject(new HooksError("the stream carries no result of its own"));
}
//@ chunk-j8f885h1.js:201375-201464 placement
var streamClosedBeforeNextError = (stream) =>
  new HooksError(`${stream.name}: the stream was closed before next() returned its result`);
//@ chunk-j8f885h1.js:201464-202471 placement
function createStreamOperators(options) {
  let { run, catch: catchHook, hop, ...rest } = options;
  let makeOp = (handler) =>
    async function* (e, ctx, descent) {
      let pending = [];
      let signal;
      let closed = false;
      let openStream = (stream) =>
        new Promise((resolve, reject) => {
          if (closed) {
            stream.return(undefined).catch(() => {
              return;
            });
            reject(streamClosedBeforeNextError(options));
            return;
          }
          pending = [
            ...pending,
            {
              stream,
              resolve,
              reject,
            },
          ];
          signal?.();
        });
      let hookCall = freezeHookCall({
        ...hookCallContext(ctx),
        call: (value) => openStream(descent.open(value)),
        to: (value, ...rest) => openStream(forwardNext(value, ctx, rest)),
      });
      let runResult = handler(e, hookCall).then(
        (result) => ({
          result,
          error: undefined,
          isThrown: false,
        }),
        (error) => ({
          result: undefined,
          error,
          isThrown: true,
        }),
      );
      let progress;
      runResult.then((entry) => {
        progress = entry;
        signal?.();
      });
      let secondEntry;
      try {
        while (true) {
          [secondEntry, ...pending] = pending;
          if (secondEntry === undefined && progress !== undefined) break;
          if (secondEntry === undefined) {
            await new Promise((resolve) => {
              signal = resolve;
            });
            signal = undefined;
            continue;
          }
          try {
            while (progress === undefined) {
              let winner = await Promise.race([secondEntry.stream.next(), runResult]);
              if (!("done" in winner)) break;
              if (winner.done === true) {
                secondEntry.resolve(winner.value);
                secondEntry = undefined;
                break;
              }
              yield winner.value;
            }
          } catch (error) {
            secondEntry?.reject(error);
            secondEntry = undefined;
          }
        }
      } finally {
        closed = true;
        for (let entry of [...(secondEntry ? [secondEntry] : []), ...pending]) {
          entry.reject(streamClosedBeforeNextError(options));
          entry.stream.return(undefined).catch(() => {
            return;
          });
        }
        pending = [];
      }
      if (progress.isThrown) throw progress.error;
      return progress.result;
    };
  return {
    ...rest,
    run: makeOp((thirdEntry, ms) =>
      run(thirdEntry, ms, {
        call: (chunks) => ms(chunks),
        floors: [],
        cutAt: undefined,
      }),
    ),
    ...(catchHook !== undefined && {
      catch: makeOp((chunk, secondChunk) => catchHook(chunk, secondChunk)),
    }),
  };
}
//@ chunk-j8f885h1.js:202471-202674 placement
/**
 * 静默关闭生成器：调用 return() 并吞掉其错误。
 */
async function closeGeneratorQuietly(generator) {
  let abortController = new AbortController();
  let closing = Promise.resolve()
    .then(() => generator.return?.(undefined))
    .then(
      () => {
        return;
      },
      () => {
        return;
      },
    );
  try {
    await Promise.race([
      closing,
      sleep(LINGER_GRACE_MS, abortController.signal, {
        unref: true,
      }),
    ]);
  } finally {
    abortController.abort();
  }
}
//@ chunk-j8f885h1.js:202674-202913 placement (2.1.88 match: returnValue, 0.765)
async function* forwardGeneratorWithErrorHook(source, onValue = () => {}) {
  let done = false;
  async function next() {
    try {
      return await source.next();
    } catch (error) {
      done = true;
      throw error;
    }
  }
  try {
    while (true) {
      let step = await next();
      if (step.done === true) {
        done = true;
        return step.value;
      }
      onValue(step.value);
      yield step.value;
    }
  } finally {
    if (!done) await source.return?.(undefined);
  }
}
//@ chunk-j8f885h1.js:202913-203042 placement
function describeStreamFailure(isTimeout, thrown, error) {
  let hasMessage = !isTimeout || error !== undefined;
  let message = errorTextOf(isTimeout ? error : thrown);
  return Object.freeze({
    kind: isTimeout ? "timeout" : "throw",
    ...(hasMessage && {
      message,
    }),
    budget: VALUE_NODE_SLACK,
  });
}
//@ chunk-j8f885h1.js:203042-203113 placement
/**
 * 流式链的初始状态
 */
var newStreamState = () => ({
  done: false,
  result: undefined,
  closed: false,
  revoked: false,
  threw: undefined,
});
//@ chunk-j8f885h1.js:203113-203840 placement
/**
 * 流式钩子链的读取器：拉取下一块（可被中止）、统计块数与字节、逐块回调。
 */
function createStreamReader({ source, name, away, carry, onChunk }) {
  let streamState = newStreamState();
  let chunks = 0;
  let pullSeq = 0;
  let inFlight;
  let secondState;
  async function pull() {
    let stepPromise = inFlight ?? source.next();
    inFlight = stepPromise;
    try {
      return await away(() => stepPromise);
    } catch (error) {
      streamState.done = true;
      streamState.threw ??= {
        error,
      };
      throw error;
    } finally {
      if (inFlight === stepPromise) inFlight = undefined;
    }
  }
  function result() {
    if (streamState.threw !== undefined) throw streamState.threw.error;
    return streamState.result;
  }
  function readOn(mode = "link") {
    chunks += 1;
    let consumer = chunks;
    pullSeq = consumer;
    let blocked = () => pullSeq !== consumer || (mode === "hook" && streamState.revoked);
    function chunk(thirdChunk) {
      secondState ??= thirdChunk;
      if (mode === "hook") throw nextAfterSettledError(name);
      return streamState.result;
    }
    return (async function* () {
      while (true) {
        if (blocked()) return chunk(undefined);
        let secondChunk;
        if (secondState !== undefined) {
          secondChunk = secondState;
          secondState = undefined;
        } else if (streamState.done) return result();
        else {
          secondChunk = await pull();
          if (blocked()) return chunk(secondChunk);
          if (secondState === secondChunk) secondState = undefined;
        }
        if (secondChunk.done === true) {
          streamState.done = true;
          streamState.result = carry(secondChunk.value);
          return streamState.result;
        }
        onChunk(secondChunk.value);
        yield secondChunk.value;
      }
    })();
  }
  return {
    source,
    progress: streamState,
    readOn,
  };
}
//@ chunk-j8f885h1.js:203840-204173 placement
/**
 * 预算计时的所有权计数：有持有者时计时运行，全部释放时暂停并累计耗时。
 */
function createBudgetOwnership(budget) {
  let pendingCount = 0;
  let resumedAt = 0;
  let pausedMs = 0;
  budget.pause();
  function start() {
    if (pendingCount++ === 0) {
      resumedAt = performance.now();
      budget.resume();
    }
  }
  function stop() {
    if (--pendingCount === 0) {
      pausedMs += performance.now() - resumedAt;
      budget.pause();
    }
  }
  return {
    async own(fn) {
      start();
      try {
        return await budgetPauseStorage.run(budget, fn);
      } finally {
        stop();
      }
    },
    async away(fn) {
      if (!(pendingCount > 0)) return fn();
      stop();
      try {
        return await fn();
      } finally {
        start();
      }
    },
    ms: () => (pendingCount > 0 ? pausedMs + (performance.now() - resumedAt) : pausedMs),
  };
}
//@ chunk-j8f885h1.js:204173-209947 placement
/**
 * 流式钩子链：拉取 next() 流、处理下层拒绝与提前关闭
 */
var runHookStreamChain =
  ({ handler, index, below, site, budgetMs, origin, nothingBelow }) =>
  (e, ctx, descent) =>
    teeGeneratorResult(async function* () {
      let { run, floors } = descent;
      let tier = handlerTier(handler);
      let skipped = maybeBypassHandler({
        handler,
        tier,
        index,
        site,
        e,
        descent,
      });
      if (skipped !== undefined) return yield* below(e, ctx, skipped);
      let frozen = freezeUnlessFrozen(e);
      let abortController = new AbortController();
      let offDownstream = forwardAbort(ctx, abortController);
      let abortController_2 = new AbortController();
      let offCtx = forwardAbort(ctx, abortController_2);
      let budgetMs_2 = handler.budgetMs ?? budgetMs;
      let budget = describeStreamHookOverrun(budgetMs_2, ctx);
      let rearmOnPull = site.budgetSpan === "pull" ? budget.rearm : () => {};
      let { own, ms, ...ownership } = createBudgetOwnership(budget);
      let secondOwnership = ownership;
      let away = (fn) => secondOwnership.away(fn);
      let readers = [];
      let weakSet = new WeakSet();
      let secondIsCoreOrManaged = isCoreOrManaged(handler);
      let chunkChecker = secondIsCoreOrManaged ? undefined : site.chunkChecker?.();
      let settled = false;
      let noNextRead = false;
      let chunkCount = 0;
      let outcome = "rejected";
      let returned;
      let shape;
      let runResult;
      let phase = "none";
      let countChunk = () => {
        chunkCount += 1;
      };
      function raceExpiry(value, secondBudget = budget) {
        let { expired } = secondBudget;
        return expired === undefined ? value : Promise.race([value, expired]);
      }
      function warnBelowRejected(error) {
        matcherLog().log(
          `${handler.name}: its next() stream rejected below it (${site.event}); the rejection passes up`,
        );
        return error;
      }
      function openBelow(value, ctx, floors) {
        let raised = site.raiseArgument?.(value) ?? value;
        let abortController = new AbortController();
        forwardAbort(abortController_2.signal, abortController);
        forwardAbort(ctx, abortController);
        let beneathRun = emptyEntryState();
        if (!abortController_2.signal.aborted) run.beneath = beneathRun;
        let { carry } = site;
        let streamReader = createStreamReader({
          source: below(raised, abortController.signal, {
            run: beneathRun,
            floors,
          }),
          name: handler.name,
          away,
          carry: (value) => (carry === undefined ? value : carry(value, raised, e)),
          onChunk: (chunk) => {
            if (typeof chunk === "object" && chunk !== null) weakSet.add(chunk);
            chunkChecker?.pulled(chunk);
            rearmOnPull();
          },
        });
        readers.push(streamReader);
        return streamReader;
      }
      let tee = (reader) =>
        teeGeneratorResult(async function* () {
          try {
            return yield* reader.readOn("hook");
          } finally {
            if (!reader.progress.done) reader.progress.closed = true;
          }
        });
      let next = (value, ctx, floors_2 = floors) => {
        let normalized = normalizeNextArgument(
          {
            handler,
            site,
            e,
          },
          value,
        );
        if (settled) throw nextAfterSettledError(handler.name);
        closeFinished();
        return tee(openBelow(normalized, ctx, floors_2));
      };
      function closeFinished() {
        for (let reader of readers)
          if (reader.progress.closed && !reader.progress.done) {
            reader.progress.done = true;
            closeGeneratorQuietly(reader.source);
          }
      }
      let tierFloors = (to) =>
        resolveNextTier(floors, to, {
          plugin: handler.name,
          tier,
        });
      let hookCall = makeHookCall({
        call: next,
        to: (value, ...rest) => next(value, undefined, tierFloors(rest)),
        signal: abortController.signal,
        is: eventPatternMatcher(site.event),
        event: site.event,
        origin,
        trace: () => traceOfRun(run.beneath),
        budget: () => budget.reading(),
      });
      function settleAnswer(value) {
        let settle = site.settle;
        let isPlainSite = secondIsCoreOrManaged || settle === undefined;
        try {
          let settled = isPlainSite ? value : settle(value);
          let problem = secondIsCoreOrManaged
            ? undefined
            : site.check?.(
                settled,
                e,
                readers.flatMap((reader) => (reader.progress.done ? [reader.progress.result] : [])),
              );
          return {
            settled,
            problem,
          };
        } catch (error) {
          let problem = `a result the site cannot read (${errorTextOf(error)})`;
          return {
            settled: value,
            problem,
          };
        }
      }
      function guardChunk(chunk) {
        let fromHook = typeof chunk === "object" && chunk !== null && weakSet.has(chunk);
        let problem = chunkChecker?.yielded(chunk, fromHook);
        if (problem !== undefined) {
          shape = `a chunk with ${problem}`;
          throw new HooksError(`yielded a chunk with ${problem}`);
        }
        return chunk;
      }
      function takeResult(value) {
        let last = readers.at(-1);
        if (value === undefined) {
          if (last?.progress.done === true) {
            outcome = "passed";
            return last.progress.result;
          }
          shape = "no result";
          throw new HooksError("returned no result (and read no next() stream to its end)");
        }
        let { settled, problem } = settleAnswer(value);
        if (problem !== undefined) {
          shape = problem;
          throw new HooksError(`returned ${problem}`);
        }
        outcome = readers.some((reader) => reader.progress.done && reader.progress.result === value)
          ? "passed"
          : "returned";
        noNextRead = readers.length === 0 && !secondIsCoreOrManaged && handler.isHop !== true;
        return settled;
      }
      function lastLiveReader() {
        let last = readers.at(-1);
        return last !== undefined && last.progress.threw === undefined ? last : undefined;
      }
      async function* runCatch(thrown, isTimeout) {
        let catchHook = handler.catch;
        if (catchHook === undefined || ctx.aborted)
          return {
            answered: false,
            problem: undefined,
          };
        let grace = describeStreamHookOverrun(VALUE_NODE_SLACK, ctx);
        let budgetOwnership = createBudgetOwnership(grace);
        secondOwnership = budgetOwnership;
        let abortController = new AbortController();
        let offAbort = forwardAbort(ctx, abortController);
        let threw = readers.at(-1)?.progress.threw;
        let cached;
        let replayNext = (value, ctx, floors_2 = floors) => {
          let normalized = normalizeNextArgument(
            {
              handler,
              site,
              e,
            },
            value,
          );
          if (cached !== undefined) return cached;
          cached = teeGeneratorResult((lastLiveReader() ?? openBelow(normalized, ctx, floors_2)).readOn());
          return cached;
        };
        let hookCall = makeHookCall({
          call: replayNext,
          to: (value, ...rest) => replayNext(value, undefined, tierFloors(rest)),
          signal: abortController.signal,
          is: eventPatternMatcher(site.event),
          event: site.event,
          origin,
          trace: () => traceOfRun(run.beneath),
          budget: () => grace.reading(),
          caught: {
            error: describeStreamFailure(isTimeout, thrown, threw?.error),
            called: readers.length > 0,
          },
        });
        let catchStream;
        let closed = false;
        try {
          catchStream = await budgetOwnership.own(() =>
            raceExpiry(
              Promise.resolve(
                catchHook(frozen, hookCall, {
                  open: replayNext,
                  floors,
                }),
              ),
              grace,
            ),
          );
          closed = true;
          while (true) {
            let stream = catchStream;
            let step = await budgetOwnership.own(() => raceExpiry(stream.next(), grace));
            if (step.done === true) {
              closed = false;
              if (step.value === undefined)
                return {
                  answered: false,
                  problem: undefined,
                };
              let { settled, problem } = settleAnswer(step.value);
              if (problem === undefined)
                return {
                  answered: true,
                  result: settled,
                };
              return {
                answered: false,
                problem: `its .catch returned ${problem}`,
              };
            }
            let chunk = guardChunk(step.value);
            countChunk();
            yield chunk;
          }
        } catch (error) {
          if (isAbortOf(error, ctx)) throw abortErrorFor(ctx, error);
          return {
            answered: false,
            problem: `its .catch ${grace.isExpired() ? `ran past its ${VALUE_NODE_SLACK}ms grace` : `threw ${scrubErrorText(error)}`}`,
          };
        } finally {
          secondOwnership = ownership;
          grace.clear();
          offAbort();
          if (closed && catchStream !== undefined) {
            abortController.abort(new HooksError(`${handler.name}: .catch left`));
            closeGeneratorQuietly(catchStream);
          }
        }
      }
      async function* onError(error) {
        let isExpired = budget.isExpired();
        let prefix = withHookPrefix(handler, errorTextOf(error));
        let threw = isExpired ? undefined : readers.at(-1)?.progress.threw;
        if (threw !== undefined && handler.catch === undefined) throw warnBelowRejected(threw.error);
        settled = true;
        for (let reader of readers) reader.progress.revoked = true;
        if (runResult !== undefined && phase !== "done") {
          let runStream = runResult;
          if (isExpired) {
            abortController.abort(new HooksError(prefix));
            watchOverrun(
              Promise.resolve()
                .then(() => runStream.return(undefined))
                .catch(() => {
                  return;
                }),
              handler,
              site,
            );
          } else await closeGeneratorQuietly(runStream);
          phase = "done";
        }
        let caught = yield* runCatch(error, isExpired);
        if (caught.answered) {
          matcherLog().log(failedClosedText(handler.name, error, site.event), "warn");
          matcherLog().hookFailed({
            plugin: handler.name,
            environmentId: handler.environmentId,
            event: site.event,
            reason: prefix,
            effect: FAILED_CLOSED,
            hasOverrun: false,
          });
          outcome = "caught";
          return caught.result;
        }
        if (threw !== undefined) throw warnBelowRejected(threw.error);
        let lastLive = lastLiveReader();
        let isDone = lastLive?.progress.done === true;
        let midStream = chunkCount > 0 || lastLive !== undefined;
        let isInterrupted = readers.length > 0 && ctx.aborted && attempt(ctx, isPlainDataError) !== true;
        let effect = isInterrupted
          ? INTERRUPTED_LEFT_OUT
          : isDone
            ? SKIPPED_LAST_NEXT
            : midStream
              ? LEFT_MID_STREAM
              : SKIPPED_BELOW_RAN;
        reportHandlerFailure({
          error,
          handler,
          site,
          effect,
          cause: {
            expiredMs: isExpired ? budgetMs_2 : undefined,
            lingeredMs: budget.hasGraceExpired() ? LINGER_GRACE_MS : undefined,
            shape,
            caught: caught.problem,
          },
        });
        if (isInterrupted) throw abortErrorFor(ctx);
        if (lastLive?.progress.done === true) {
          outcome = isExpired ? "expired" : "kept";
          return lastLive.progress.result;
        }
        if (lastLive !== undefined) {
          outcome = isExpired ? "expired" : "kept";
          return yield* forwardGeneratorWithErrorHook(lastLive.readOn(), countChunk);
        }
        if (nothingBelow) throw error;
        outcome = isExpired ? "expired" : "skipped";
        return yield* forwardGeneratorWithErrorHook(openBelow(e, undefined, floors).readOn(), countChunk);
      }
      try {
        try {
          phase = "running";
          runResult = await own(() =>
            raceExpiry(
              Promise.resolve(
                handler.run(frozen, hookCall, {
                  open: next,
                  floors,
                }),
              ),
            ),
          );
          if (!(
            typeof runResult === "object" &&
            runResult !== null &&
            typeof runResult.next === "function"
          )) {
            phase = "done";
            shape = "no stream";
            throw new HooksError(
              "returned no stream: a hook on a streaming event is an async generator, async function* ($, e, next) {}",
            );
          }
          while (true) {
            phase = "running";
            rearmOnPull();
            let stream = runResult;
            let step = await own(() => raceExpiry(stream.next())).catch((error) => {
              if (!budget.isExpired()) phase = "done";
              throw error;
            });
            if (step.done === true) {
              phase = "done";
              returned = takeResult(step.value);
              return returned;
            }
            phase = "suspended";
            let chunk = guardChunk(step.value);
            countChunk();
            yield chunk;
          }
        } catch (error) {
          if (isAbortOf(error, ctx)) throw abortErrorFor(ctx, error);
          returned = yield* onError(error);
          return returned;
        }
      } finally {
        settled = true;
        budget.clear();
        offDownstream();
        if (runResult !== undefined && phase === "suspended") await closeGeneratorQuietly(runResult);
        if (readers.some((reader) => !reader.progress.done))
          abortController_2.abort(new PlainDataError(`${handler.name} settled the call`));
        for (let reader of readers)
          if (!reader.progress.done) {
            reader.progress.done = true;
            await closeGeneratorQuietly(reader.source);
          }
        offCtx();
        let ms_2 = ms();
        freezeEntry(run, {
          index,
          plugin: handler.isCore === true ? ENGINE : handler.name,
          tier,
          event: site.event,
          outcome,
          ms: ms_2,
          chunks: chunkCount,
          received: e,
          returned,
        });
        if (noNextRead)
          reportPluginHookWithoutNext({
            plugin: handler.name,
            tier,
            event: site.event,
            ms: ms_2,
          });
      }
    });
//@ chunk-j8f885h1.js:209947-210053 placement
/**
 * 包装生成器的 return()：调用时先执行回调。
 */
function onGeneratorReturn(iterator, onReturn) {
  let secondReturn = iterator.return.bind(iterator);
  return Object.defineProperty(iterator, "return", {
    value: (value) => {
      onReturn();
      return secondReturn(value);
    },
  });
}
//@ chunk-j8f885h1.js:210053-210288 placement
var createStreamHopHandler = (hop, members) => ({
  name: members.map((handler) => handler.name).join("+"),
  tier: members[0]?.tier,
  tiers: normalizeCaseForComparison_2(members.map(handlerTier)),
  plugins: members.map((handler) => handler.name),
  budgetMs: 0,
  isHop: true,
  run: (e, ctx, { open, floors }) =>
    hop.run({
      members,
      e,
      open,
      signal: ctx.signal,
      origin: ctx.origin,
      floors,
    }),
});
//@ chunk-j8f885h1.js:210288-210525 placement
function groupStreamHops(handlers) {
  let hops = [];
  let members = [];
  function flush() {
    let [first] = members;
    let hop = first?.hop;
    if (first !== undefined && hop !== undefined) hops.push(createStreamHopHandler(hop, members));
    members = [];
  }
  for (let handler of handlers) {
    if (!(handler.hop !== undefined && handler.hop.key === members[0]?.hop?.key)) flush();
    if (handler.hop === undefined) {
      hops.push(handler);
      continue;
    }
    members.push(handler);
  }
  flush();
  return hops;
}
//@ chunk-j8f885h1.js:210525-210810 placement
var createStreamBottomStep =
  (fallbackBottom, index, event) =>
  (e, ctx, { run, floors }) =>
    teeGeneratorResult(async function* () {
      let startTime = performance.now();
      let outcome = "rejected";
      let returned;
      let chunks = 0;
      try {
        returned = yield* forwardGeneratorWithErrorHook(fallbackBottom(e, ctx, floors), () => {
          chunks += 1;
        });
        outcome = "returned";
        return returned;
      } finally {
        freezeEntry(run, {
          index,
          plugin: ENGINE,
          tier: "core",
          event,
          outcome,
          ms: performance.now() - startTime,
          chunks,
          received: e,
          returned,
        });
      }
    });
//@ chunk-j8f885h1.js:210810-211390 placement
function reportStreamChainFailure(options) {
  let { e, site, bottom } = options;
  let hops = groupStreamHops(options.handlers);
  let streamBottomStep = createStreamBottomStep(
    bottom ??
      (() =>
        (async function* () {
          return await missingImplementation(site);
        })()),
    hops.length,
    site.event,
  );
  let fallbackStep = hops.reduceRight(
    (below, handler, reduced) =>
      runHookStreamChain({
        handler,
        index: reduced,
        below,
        site,
        budgetMs: options.budgetMs ?? DEFAULT_HOOK_TIMEOUT_MS,
        origin: options.origin ?? ENGINE_ORIGIN,
        nothingBelow: bottom === undefined && reduced === hops.length - 1,
      }),
    streamBottomStep,
  );
  let signal = options.signal ?? new AbortController().signal;
  let floors = options.floors ?? NO_FLOORS;
  return teeGeneratorResult(async function* () {
    let abortController = new AbortController();
    let value = options.isHopFold === true;
    let inner = value ? undefined : forwardAbortWith(signal, abortController);
    try {
      return yield* fallbackStep(e, value ? signal : abortController.signal, {
        run: emptyEntryState(),
        floors,
      });
    } catch (error) {
      matcherLog().log(`hooks stream chain failed: ${errorSummary(error)}`, "error");
      throw error;
    } finally {
      inner?.();
    }
  });
}
export {
  teeGeneratorResult,
  reportStreamChainFailure,
  closeGeneratorQuietly,
  forwardGeneratorWithErrorHook,
  DEFAULT_HOOK_TIMEOUT_MS,
  createPausableBudget,
  forwardGenerator,
  onGeneratorReturn,
  createStreamOperators,
  streamChainSlot,
  describeStreamHookOverrun,
  getStreamResultPromise,
};
