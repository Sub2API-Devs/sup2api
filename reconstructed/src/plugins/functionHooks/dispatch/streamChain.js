/**
 * plugins/functionHooks/dispatch/streamChain.ts
 *
 * 流式钩子链与站点总表绑定（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4121qate.js (22)
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
  N5e,
  Y6t,
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
import { uniq } from "../../../utils/collections.js";

//@ chunk-4121qate.js:218073-218472 placement
/**
 * 可暂停的钩子预算计时器：到期以 HooksError 拒绝 expired，支持 pause/resume/rearm、剩余毫秒查询。
 */
function createPausableBudget(e, o) {
  let r = e;
  let now = Date.now();
  let s;
  let i = false;
  let p = false;
  let f = () => {};
  let expired = swallowRejection(
    new Promise((resolve, reject) => {
      f = reject;
    }),
  );
  function m() {
    i = true;
    f(new HooksError(o));
  }
  function c() {
    now = Date.now();
    p = true;
    s = setTimeout(m, r);
  }
  let u = () => (p ? Math.max(0, r - (Date.now() - now)) : r);
  c();
  return {
    expired,
    isExpired: () => i,
    remainingMs: () => (i ? 0 : u()),
    pause() {
      clearTimeout(s);
      r = u();
      p = false;
    },
    resume: c,
    clear: () => clearTimeout(s),
    rearm() {
      if (i) return;
      r = e;
      clearTimeout(s);
      if (p) c();
    },
  };
}
//@ chunk-4121qate.js:218472-218512 placement
/**
 * 吞掉 rejection
 */
function swallowRejection(e) {
  e.catch(() => {});
  return e;
}
//@ chunk-4121qate.js:218512-219398 placement
function describeStreamHookOverrun(budgetMs, o, cutAt) {
  let n = () => (cutAt === undefined ? Number.POSITIVE_INFINITY : Math.max(0, cutAt - Date.now()));
  let ms = Math.min(budgetMs <= 0 ? Number.POSITIVE_INFINITY : budgetMs, n());
  if (budgetMs <= 0)
    return {
      expired: undefined,
      isExpired: () => false,
      reading: () =>
        cutAt === undefined
          ? UNLIMITED_BUDGET
          : Object.freeze({
              ms,
              remainingMs: n(),
            }),
      hasGraceExpired: () => false,
      pause() {},
      resume() {},
      clear() {},
      rearm() {},
    };
  let i = 0;
  let p = false;
  let f;
  let pausableBudget = createPausableBudget(budgetMs, `exceeded ${budgetMs}ms budget`);
  let deferred = Promise.withResolvers();
  function c() {
    f = createPausableBudget(
      LINGER_GRACE_MS,
      `did not settle within ${LINGER_GRACE_MS}ms of its signal aborting`,
    );
    if (i > 0) f.pause();
    f.expired.catch(deferred.reject);
  }
  let u = forwardAbort(o, {
    abort: c,
  });
  return {
    expired: swallowRejection(Promise.race([pausableBudget.expired, deferred.promise])),
    isExpired: () => pausableBudget.isExpired(),
    reading: () =>
      Object.freeze({
        ms,
        remainingMs: Math.min(pausableBudget.remainingMs(), n()),
      }),
    hasGraceExpired: () => f?.isExpired() ?? false,
    pause() {
      if (i++ === 0) {
        pausableBudget.pause();
        f?.pause();
      }
    },
    resume() {
      if (--i === 0 && !p) {
        pausableBudget.resume();
        f?.resume();
      }
    },
    clear() {
      p = true;
      pausableBudget.clear();
      f?.clear();
      u();
    },
    rearm() {
      if (!p) pausableBudget.rearm();
    },
  };
}
//@ chunk-4121qate.js:219398-219410 placement
/**
 * 钩子调用与分发的默认超时 10 秒：单次调用等待应答、分发预算、环境存活期都取这个默认值。
 */
var DEFAULT_HOOK_TIMEOUT_MS = 1e4;
//@ chunk-4121qate.js:219410-219445 placement
/**
 * 流式链槽
 */
var streamChainSlot = identity(createValueSlot(), (e) => e.set(undefined));
//@ chunk-4121qate.js:219445-219640 placement = returnValue (0.765)
async function* forwardGenerator(as) {
  let o = false;
  try {
    while (true) {
      let r = await as.next().catch((error) => {
        o = true;
        throw error;
      });
      if (r.done === true) {
        o = true;
        return r.value;
      }
      yield r.value;
    }
  } finally {
    if (!o)
      await as.return().catch(() => {
        return;
      });
  }
}
//@ chunk-4121qate.js:219640-220000 placement
/**
 * 包装异步生成器：照常 yield，同时把生成器的 return 值放进一个 promise；生成器在完成前被关闭时 promise 以“stream was closed before its result”reject。
 */
function teeGeneratorResult(e) {
  let deferred = Promise.withResolvers();
  deferred.promise.catch(() => {});
  let r = false;
  async function* n() {
    let s = typeof e === "function" ? e() : e;
    try {
      let i = yield* s;
      r = true;
      deferred.resolve(i);
      return i;
    } catch (error) {
      r = true;
      deferred.reject(error);
      throw error;
    } finally {
      if (!r) deferred.reject(new HooksError("the stream was closed before its result"));
    }
  }
  return Object.defineProperty(n(), "result", {
    value: deferred.promise,
    enumerable: true,
  });
}
//@ chunk-4121qate.js:220000-220190 placement
function getStreamResultPromise(e) {
  let o = Reflect.get(e, "result");
  return typeof o === "object" && o !== null && "then" in o && typeof o.then === "function"
    ? o
    : Promise.reject(new HooksError("the stream carries no result of its own"));
}
//@ chunk-4121qate.js:220190-220279 placement
var streamClosedBeforeNextError = (e) =>
  new HooksError(`${e.name}: the stream was closed before next() returned its result`);
//@ chunk-4121qate.js:220279-221286 placement
function createStreamOperators(e) {
  let { run, catch: r, hop, ...s } = e;
  let i = (p) =>
    async function* (a, m, c) {
      let u = [];
      let l;
      let y = false;
      let g = (R) =>
        new Promise((resolve, reject) => {
          if (y) {
            R.return(undefined).catch(() => {
              return;
            });
            reject(streamClosedBeforeNextError(e));
            return;
          }
          u = [
            ...u,
            {
              stream: R,
              resolve,
              reject,
            },
          ];
          l?.();
        });
      let x = freezeHookCall({
        ...hookCallContext(m),
        call: (R) => g(c.open(R)),
        to: (R, ...I) => g(forwardNext(R, m, I)),
      });
      let T = p(a, x).then(
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
      let h;
      T.then((R) => {
        h = R;
        l?.();
      });
      let v;
      try {
        while (true) {
          [v, ...u] = u;
          if (v === undefined && h !== undefined) break;
          if (v === undefined) {
            await new Promise((resolve) => {
              l = resolve;
            });
            l = undefined;
            continue;
          }
          try {
            while (h === undefined) {
              let winner = await Promise.race([v.stream.next(), T]);
              if (!("done" in winner)) break;
              if (winner.done === true) {
                v.resolve(winner.value);
                v = undefined;
                break;
              }
              yield winner.value;
            }
          } catch (error) {
            v?.reject(error);
            v = undefined;
          }
        }
      } finally {
        y = true;
        for (let R of [...(v ? [v] : []), ...u]) {
          R.reject(streamClosedBeforeNextError(e));
          R.stream.return(undefined).catch(() => {
            return;
          });
        }
        u = [];
      }
      if (h.isThrown) throw h.error;
      return h.result;
    };
  return {
    ...s,
    run: i((p, f) =>
      run(p, f, {
        call: (a) => f(a),
        floors: [],
        cutAt: undefined,
      }),
    ),
    ...(r !== undefined && {
      catch: i((p, f) => r(p, f)),
    }),
  };
}
//@ chunk-4121qate.js:221286-221489 placement
/**
 * 静默关闭生成器：调用 return() 并吞掉其错误。
 */
async function closeGeneratorQuietly(e) {
  let abortController = new AbortController();
  let r = Promise.resolve()
    .then(() => e.return?.(undefined))
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
      r,
      sleep(LINGER_GRACE_MS, abortController.signal, {
        unref: true,
      }),
    ]);
  } finally {
    abortController.abort();
  }
}
//@ chunk-4121qate.js:221489-221728 placement = returnValue (0.765)
async function* forwardGeneratorWithErrorHook(e, o = () => {}) {
  let r = false;
  async function n() {
    try {
      return await e.next();
    } catch (error) {
      r = true;
      throw error;
    }
  }
  try {
    while (true) {
      let s = await n();
      if (s.done === true) {
        r = true;
        return s.value;
      }
      o(s.value);
      yield s.value;
    }
  } finally {
    if (!r) await e.return?.(undefined);
  }
}
//@ chunk-4121qate.js:221728-221857 placement
function describeStreamFailure(e, o, error) {
  let n = !e || error !== undefined;
  let message = errorTextOf(e ? error : o);
  return Object.freeze({
    kind: e ? "timeout" : "throw",
    ...(n && {
      message,
    }),
    budget: VALUE_NODE_SLACK,
  });
}
//@ chunk-4121qate.js:221857-221928 placement
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
//@ chunk-4121qate.js:221928-222655 placement
/**
 * 流式钩子链的读取器：拉取下一块（可被中止）、统计块数与字节、逐块回调。
 */
function createStreamReader({ source, name: o, away, carry, onChunk }) {
  let streamState = newStreamState();
  let p = 0;
  let f = 0;
  let a;
  let m;
  async function c() {
    let y = a ?? source.next();
    a = y;
    try {
      return await away(() => y);
    } catch (error) {
      streamState.done = true;
      streamState.threw ??= {
        error,
      };
      throw error;
    } finally {
      if (a === y) a = undefined;
    }
  }
  function u() {
    if (streamState.threw !== undefined) throw streamState.threw.error;
    return streamState.result;
  }
  function l(y = "link") {
    p += 1;
    let g = p;
    f = g;
    let x = () => f !== g || (y === "hook" && streamState.revoked);
    function T(h) {
      m ??= h;
      if (y === "hook") throw nextAfterSettledError(o);
      return streamState.result;
    }
    return (async function* () {
      while (true) {
        if (x()) return T(undefined);
        let h;
        if (m !== undefined) {
          h = m;
          m = undefined;
        } else if (streamState.done) return u();
        else {
          h = await c();
          if (x()) return T(h);
          if (m === h) m = undefined;
        }
        if (h.done === true) {
          streamState.done = true;
          streamState.result = carry(h.value);
          return streamState.result;
        }
        onChunk(h.value);
        yield h.value;
      }
    })();
  }
  return {
    source,
    progress: streamState,
    readOn: l,
  };
}
//@ chunk-4121qate.js:222655-222988 placement
/**
 * 预算计时的所有权计数：有持有者时计时运行，全部释放时暂停并累计耗时。
 */
function createBudgetOwnership(e) {
  let o = 0;
  let r = 0;
  let n = 0;
  e.pause();
  function s() {
    if (o++ === 0) {
      r = performance.now();
      e.resume();
    }
  }
  function i() {
    if (--o === 0) {
      n += performance.now() - r;
      e.pause();
    }
  }
  return {
    async own(p) {
      s();
      try {
        return await budgetPauseStorage.run(e, p);
      } finally {
        i();
      }
    },
    async away(p) {
      if (!(o > 0)) return p();
      i();
      try {
        return await p();
      } finally {
        s();
      }
    },
    ms: () => (o > 0 ? n + (performance.now() - r) : n),
  };
}
//@ chunk-4121qate.js:222988-228754 placement
/**
 * 流式钩子链：拉取 next() 流、处理下层拒绝与提前关闭
 */
var runHookStreamChain =
  ({ handler, index, below, site, budgetMs, origin, nothingBelow }) =>
  (f, a, m) =>
    teeGeneratorResult(async function* () {
      let { run, floors } = m;
      let tier = handlerTier(handler);
      let y = maybeBypassHandler({
        handler,
        tier,
        index,
        site,
        e: f,
        descent: m,
      });
      if (y !== undefined) return yield* below(f, a, y);
      let g = freezeUnlessFrozen(f);
      let abortController = new AbortController();
      let T = forwardAbort(a, abortController);
      let abortController_2 = new AbortController();
      let v = forwardAbort(a, abortController_2);
      let budgetMs_2 = handler.budgetMs ?? budgetMs;
      let I = describeStreamHookOverrun(budgetMs_2, a);
      let V = site.budgetSpan === "pull" ? I.rearm : () => {};
      let { own, ms, ...L } = createBudgetOwnership(I);
      let B = L;
      let away = (k) => B.away(k);
      let N = [];
      let weakSet = new WeakSet();
      let te = isCoreOrManaged(handler);
      let Ne = te ? undefined : site.chunkChecker?.();
      let Ve = false;
      let Me = false;
      let E = 0;
      let Z = "rejected";
      let z;
      let Ke;
      let ce;
      let Te = "none";
      let ee = () => {
        E += 1;
      };
      function Y(k, C = I) {
        let { expired } = C;
        return expired === undefined ? k : Promise.race([k, expired]);
      }
      function de(error) {
        matcherLog().log(
          `${handler.name}: its next() stream rejected below it (${site.event}); the rejection passes up`,
        );
        return error;
      }
      function pe(k, C, floors) {
        let W = site.raiseArgument?.(k) ?? k;
        let abortController = new AbortController();
        forwardAbort(abortController_2.signal, abortController);
        forwardAbort(C, abortController);
        let oe = emptyEntryState();
        if (!abortController_2.signal.aborted) run.beneath = oe;
        let { carry } = site;
        let streamReader = createStreamReader({
          source: below(W, abortController.signal, {
            run: oe,
            floors,
          }),
          name: handler.name,
          away,
          carry: (ye) => (carry === undefined ? ye : carry(ye, W, f)),
          onChunk: (ye) => {
            if (typeof ye === "object" && ye !== null) weakSet.add(ye);
            Ne?.pulled(ye);
            V();
          },
        });
        N.push(streamReader);
        return streamReader;
      }
      let fe = (k) =>
        teeGeneratorResult(async function* () {
          try {
            return yield* k.readOn("hook");
          } finally {
            if (!k.progress.done) k.progress.closed = true;
          }
        });
      let Ee = (k, C, floors_2 = floors) => {
        let W = normalizeNextArgument(
          {
            handler,
            site,
            e: f,
          },
          k,
        );
        if (Ve) throw nextAfterSettledError(handler.name);
        ke();
        return fe(pe(W, C, floors_2));
      };
      function ke() {
        for (let k of N)
          if (k.progress.closed && !k.progress.done) {
            k.progress.done = true;
            closeGeneratorQuietly(k.source);
          }
      }
      let Pe = (k) =>
        resolveNextTier(floors, k, {
          plugin: handler.name,
          tier,
        });
      let hookCall = makeHookCall({
        call: Ee,
        to: (k, ...C) => Ee(k, undefined, Pe(C)),
        signal: abortController.signal,
        is: eventPatternMatcher(site.event),
        event: site.event,
        origin,
        trace: () => traceOfRun(run.beneath),
        budget: () => I.reading(),
      });
      function be(k) {
        let settle = site.settle;
        let U = te || settle === undefined;
        try {
          let W = U ? k : settle(k);
          let problem = te
            ? undefined
            : site.check?.(
                W,
                f,
                N.flatMap((oe) => (oe.progress.done ? [oe.progress.result] : [])),
              );
          return {
            settled: W,
            problem,
          };
        } catch (error) {
          let problem = `a result the site cannot read (${errorTextOf(error)})`;
          return {
            settled: k,
            problem,
          };
        }
      }
      function De(k) {
        let C = typeof k === "object" && k !== null && weakSet.has(k);
        let U = Ne?.yielded(k, C);
        if (U !== undefined) {
          Ke = `a chunk with ${U}`;
          throw new HooksError(`yielded a chunk with ${U}`);
        }
        return k;
      }
      function ft(k) {
        let last = N.at(-1);
        if (k === undefined) {
          if (last?.progress.done === true) {
            Z = "passed";
            return last.progress.result;
          }
          Ke = "no result";
          throw new HooksError("returned no result (and read no next() stream to its end)");
        }
        let { settled, problem } = be(k);
        if (problem !== undefined) {
          Ke = problem;
          throw new HooksError(`returned ${problem}`);
        }
        Z = N.some((oe) => oe.progress.done && oe.progress.result === k) ? "passed" : "returned";
        Me = N.length === 0 && !te && handler.isHop !== true;
        return settled;
      }
      function yt() {
        let last = N.at(-1);
        return last !== undefined && last.progress.threw === undefined ? last : undefined;
      }
      async function* gt(k, C) {
        let U = handler.catch;
        if (U === undefined || a.aborted)
          return {
            answered: false,
            problem: undefined,
          };
        let W = describeStreamHookOverrun(VALUE_NODE_SLACK, a);
        let budgetOwnership = createBudgetOwnership(W);
        B = budgetOwnership;
        let abortController = new AbortController();
        let Be = forwardAbort(a, abortController);
        let threw = N.at(-1)?.progress.threw;
        let ye;
        let Xe = (A, F, floors_2 = floors) => {
          let ue = normalizeNextArgument(
            {
              handler,
              site,
              e: f,
            },
            A,
          );
          if (ye !== undefined) return ye;
          ye = teeGeneratorResult((yt() ?? pe(ue, F, floors_2)).readOn());
          return ye;
        };
        let hookCall = makeHookCall({
          call: Xe,
          to: (A, ...F) => Xe(A, undefined, Pe(F)),
          signal: abortController.signal,
          is: eventPatternMatcher(site.event),
          event: site.event,
          origin,
          trace: () => traceOfRun(run.beneath),
          budget: () => W.reading(),
          caught: {
            error: describeStreamFailure(C, k, threw?.error),
            called: N.length > 0,
          },
        });
        let Je;
        let w = false;
        try {
          Je = await budgetOwnership.own(() =>
            Y(
              Promise.resolve(
                U(g, hookCall, {
                  open: Xe,
                  floors,
                }),
              ),
              W,
            ),
          );
          w = true;
          while (true) {
            let A = Je;
            let F = await budgetOwnership.own(() => Y(A.next(), W));
            if (F.done === true) {
              w = false;
              if (F.value === undefined)
                return {
                  answered: false,
                  problem: undefined,
                };
              let { settled, problem } = be(F.value);
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
            let se = De(F.value);
            ee();
            yield se;
          }
        } catch (error) {
          if (isAbortOf(error, a)) throw abortErrorFor(a, error);
          return {
            answered: false,
            problem: `its .catch ${W.isExpired() ? `ran past its ${VALUE_NODE_SLACK}ms grace` : `threw ${scrubErrorText(error)}`}`,
          };
        } finally {
          B = L;
          W.clear();
          Be();
          if (w && Je !== undefined) {
            abortController.abort(new HooksError(`${handler.name}: .catch left`));
            closeGeneratorQuietly(Je);
          }
        }
      }
      async function* G(error) {
        let C = I.isExpired();
        let U = withHookPrefix(handler, errorTextOf(error));
        let threw = C ? undefined : N.at(-1)?.progress.threw;
        if (threw !== undefined && handler.catch === undefined) throw de(threw.error);
        Ve = true;
        for (let ze of N) ze.progress.revoked = true;
        if (ce !== undefined && Te !== "done") {
          let ze = ce;
          if (C) {
            abortController.abort(new HooksError(U));
            watchOverrun(
              Promise.resolve()
                .then(() => ze.return(undefined))
                .catch(() => {
                  return;
                }),
              handler,
              site,
            );
          } else await closeGeneratorQuietly(ze);
          Te = "done";
        }
        let re = yield* gt(error, C);
        if (re.answered) {
          matcherLog().log(failedClosedText(handler.name, error, site.event), "warn");
          matcherLog().hookFailed({
            plugin: handler.name,
            environmentId: handler.environmentId,
            event: site.event,
            reason: U,
            effect: FAILED_CLOSED,
            hasOverrun: false,
          });
          Z = "caught";
          return re.result;
        }
        if (threw !== undefined) throw de(threw.error);
        let oe = yt();
        let Be = oe?.progress.done === true;
        let le = E > 0 || oe !== undefined;
        let ye = N.length > 0 && a.aborted && attempt(a, isPlainDataError) !== true;
        let effect = ye
          ? INTERRUPTED_LEFT_OUT
          : Be
            ? SKIPPED_LAST_NEXT
            : le
              ? LEFT_MID_STREAM
              : SKIPPED_BELOW_RAN;
        reportHandlerFailure({
          error,
          handler,
          site,
          effect,
          cause: {
            expiredMs: C ? budgetMs_2 : undefined,
            lingeredMs: I.hasGraceExpired() ? LINGER_GRACE_MS : undefined,
            shape: Ke,
            caught: re.problem,
          },
        });
        if (ye) throw abortErrorFor(a);
        if (oe?.progress.done === true) {
          Z = C ? "expired" : "kept";
          return oe.progress.result;
        }
        if (oe !== undefined) {
          Z = C ? "expired" : "kept";
          return yield* forwardGeneratorWithErrorHook(oe.readOn(), ee);
        }
        if (nothingBelow) throw error;
        Z = C ? "expired" : "skipped";
        return yield* forwardGeneratorWithErrorHook(pe(f, undefined, floors).readOn(), ee);
      }
      try {
        try {
          Te = "running";
          ce = await own(() =>
            Y(
              Promise.resolve(
                handler.run(g, hookCall, {
                  open: Ee,
                  floors,
                }),
              ),
            ),
          );
          if (!(typeof ce === "object" && ce !== null && typeof ce.next === "function")) {
            Te = "done";
            Ke = "no stream";
            throw new HooksError(
              "returned no stream: a hook on a streaming event is an async generator, async function* ($, e, next) {}",
            );
          }
          while (true) {
            Te = "running";
            V();
            let C = ce;
            let U = await own(() => Y(C.next())).catch((error) => {
              if (!I.isExpired()) Te = "done";
              throw error;
            });
            if (U.done === true) {
              Te = "done";
              z = ft(U.value);
              return z;
            }
            Te = "suspended";
            let W = De(U.value);
            ee();
            yield W;
          }
        } catch (error) {
          if (isAbortOf(error, a)) throw abortErrorFor(a, error);
          z = yield* G(error);
          return z;
        }
      } finally {
        Ve = true;
        I.clear();
        T();
        if (ce !== undefined && Te === "suspended") await closeGeneratorQuietly(ce);
        if (N.some((U) => !U.progress.done))
          abortController_2.abort(new PlainDataError(`${handler.name} settled the call`));
        for (let U of N)
          if (!U.progress.done) {
            U.progress.done = true;
            await closeGeneratorQuietly(U.source);
          }
        v();
        let ms_2 = ms();
        freezeEntry(run, {
          index,
          plugin: handler.isCore === true ? ENGINE : handler.name,
          tier,
          event: site.event,
          outcome: Z,
          ms: ms_2,
          chunks: E,
          received: f,
          returned: z,
        });
        if (Me)
          reportPluginHookWithoutNext({
            plugin: handler.name,
            tier,
            event: site.event,
            ms: ms_2,
          });
      }
    });
//@ chunk-4121qate.js:228754-228860 placement
/**
 * 包装生成器的 return()：调用时先执行回调。
 */
function onGeneratorReturn(e, o) {
  let r = e.return.bind(e);
  return Object.defineProperty(e, "return", {
    value: (n) => {
      o();
      return r(n);
    },
  });
}
//@ chunk-4121qate.js:228860-229095 placement
var createStreamHopHandler = (e, o) => ({
  name: o.map((r) => r.name).join("+"),
  tier: o[0]?.tier,
  tiers: uniq(o.map(handlerTier)),
  plugins: o.map((r) => r.name),
  budgetMs: 0,
  isHop: true,
  run: (r, n, { open, floors }) =>
    e.run({
      members: o,
      e: r,
      open,
      signal: n.signal,
      origin: n.origin,
      floors,
    }),
});
//@ chunk-4121qate.js:229095-229332 placement
function groupStreamHops(handlers) {
  let o = [];
  let r = [];
  function n() {
    let [s] = r;
    let hop = s?.hop;
    if (s !== undefined && hop !== undefined) o.push(createStreamHopHandler(hop, r));
    r = [];
  }
  for (let s of handlers) {
    if (!(s.hop !== undefined && s.hop.key === r[0]?.hop?.key)) n();
    if (s.hop === undefined) {
      o.push(s);
      continue;
    }
    r.push(s);
  }
  n();
  return o;
}
//@ chunk-4121qate.js:229332-229617 placement
var createStreamBottomStep =
  (e, index, event) =>
  (n, s, { run, floors }) =>
    teeGeneratorResult(async function* () {
      let startTime = performance.now();
      let outcome = "rejected";
      let m;
      let chunks = 0;
      try {
        m = yield* forwardGeneratorWithErrorHook(e(n, s, floors), () => {
          chunks += 1;
        });
        outcome = "returned";
        return m;
      } finally {
        freezeEntry(run, {
          index,
          plugin: ENGINE,
          tier: "core",
          event,
          outcome,
          ms: performance.now() - startTime,
          chunks,
          received: n,
          returned: m,
        });
      }
    });
//@ chunk-4121qate.js:229617-230197 placement
function reportStreamChainFailure(e) {
  let { e: o, site, bottom } = e;
  let s = groupStreamHops(e.handlers);
  let streamBottomStep = createStreamBottomStep(
    bottom ??
      (() =>
        (async function* () {
          return await missingImplementation(site);
        })()),
    s.length,
    site.event,
  );
  let f = s.reduceRight(
    (below, handler, l) =>
      runHookStreamChain({
        handler,
        index: l,
        below,
        site,
        budgetMs: e.budgetMs ?? DEFAULT_HOOK_TIMEOUT_MS,
        origin: e.origin ?? N5e,
        nothingBelow: bottom === undefined && l === s.length - 1,
      }),
    streamBottomStep,
  );
  let signal = e.signal ?? new AbortController().signal;
  let floors = e.floors ?? Y6t;
  return teeGeneratorResult(async function* () {
    let abortController = new AbortController();
    let u = e.isHopFold === true;
    let l = u ? undefined : forwardAbortWith(signal, abortController);
    try {
      return yield* f(o, u ? signal : abortController.signal, {
        run: emptyEntryState(),
        floors,
      });
    } catch (error) {
      matcherLog().log(`hooks stream chain failed: ${errorSummary(error)}`, "error");
      throw error;
    } finally {
      l?.();
    }
  });
}
export {
  teeGeneratorResult,
  DEFAULT_HOOK_TIMEOUT_MS,
  forwardGenerator,
  onGeneratorReturn,
  createStreamOperators,
  reportStreamChainFailure,
  streamChainSlot,
  describeStreamHookOverrun,
  getStreamResultPromise,
  closeGeneratorQuietly,
  forwardGeneratorWithErrorHook,
  createPausableBudget,
};
