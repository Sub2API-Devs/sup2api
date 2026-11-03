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
import { HooksError, BSi, fEe } from "../hooksErrors.js";
import {
  UNLIMITED_BUDGET,
  forwardAbort,
  freezeHookCall,
  hookCallContext,
  mrs,
  Re,
  nextAfterSettledError,
  handlerTier,
  maybeBypassHandler,
  os,
  Se,
  ko,
  resolveNextTier,
  makeHookCall,
  Zn,
  traceOfRun,
  _Ue,
  abortErrorFor,
  lr,
  Kt,
  watchOverrun,
  ha,
  prs,
  QJ,
  dr,
  Ea,
  Vg,
  Sa,
  reportHandlerFailure,
  Wt,
  ENGINE,
  grs,
  freeze_6,
  freeze_4,
  Ra,
  xt,
} from "./chain.js";
import { H5e, Dt, TAn, normalizeNextArgument } from "./valueSizing.js";
import { ge } from "../../../utils/identity.js";
import { to } from "../../../utils/valueSlot.js";
import { sleep } from "../../../utils/sleep.js";
import { pd } from "../../../utils/hooks/functionHookMatchers.js";
import { reportPluginHookWithoutNext } from "./slowHookReports.js";
import { uniq } from "../../../utils/collections.js";

/**
 * 可暂停的钩子预算计时器：到期以 HooksError 拒绝 expired，支持 pause/resume/rearm、剩余毫秒查询。
 */
//@ chunk-4121qate.js:218073-218472 placement
function createPausableBudget(e, o) {
  let r = e,
    now = Date.now(),
    s,
    i = !1,
    p = !1,
    f = () => {},
    a = Sp(
      new Promise((l, y) => {
        f = y;
      }),
    );
  function m() {
    ((i = !0), f(new HooksError(o)));
  }
  function c() {
    ((now = Date.now()), (p = !0), (s = setTimeout(m, r)));
  }
  let u = () => (p ? Math.max(0, r - (Date.now() - now)) : r);
  return (
    c(),
    {
      expired: a,
      isExpired: () => i,
      remainingMs: () => (i ? 0 : u()),
      pause() {
        (clearTimeout(s), (r = u()), (p = !1));
      },
      resume: c,
      clear: () => clearTimeout(s),
      rearm() {
        if (i) return;
        if (((r = e), clearTimeout(s), p)) c();
      },
    }
  );
}
//@ chunk-4121qate.js:218472-218512 placement
function Sp(e) {
  return (e.catch(() => {}), e);
}
//@ chunk-4121qate.js:218512-219398 placement
function describeStreamHookOverrun(e, o, r) {
  let n = () => (r === void 0 ? Number.POSITIVE_INFINITY : Math.max(0, r - Date.now())),
    min = Math.min(e <= 0 ? Number.POSITIVE_INFINITY : e, n());
  if (e <= 0)
    return {
      expired: void 0,
      isExpired: () => !1,
      reading: () => (r === void 0 ? UNLIMITED_BUDGET : Object.freeze({ ms: min, remainingMs: n() })),
      hasGraceExpired: () => !1,
      pause() {},
      resume() {},
      clear() {},
      rearm() {},
    };
  let i = 0,
    p = !1,
    f,
    a = createPausableBudget(e, `exceeded ${e}ms budget`),
    withResolvers = Promise.withResolvers();
  function c() {
    if (((f = createPausableBudget(H5e, `did not settle within ${H5e}ms of its signal aborting`)), i > 0))
      f.pause();
    f.expired.catch(withResolvers.reject);
  }
  let u = forwardAbort(o, { abort: c });
  return {
    expired: Sp(Promise.race([a.expired, withResolvers.promise])),
    isExpired: () => a.isExpired(),
    reading: () => Object.freeze({ ms: min, remainingMs: Math.min(a.remainingMs(), n()) }),
    hasGraceExpired: () => f?.isExpired() ?? !1,
    pause() {
      if (i++ === 0) (a.pause(), f?.pause());
    },
    resume() {
      if (--i === 0 && !p) (a.resume(), f?.resume());
    },
    clear() {
      ((p = !0), a.clear(), f?.clear(), u());
    },
    rearm() {
      if (!p) a.rearm();
    },
  };
}
//@ chunk-4121qate.js:219398-219410 placement
var cEe = 1e4;
//@ chunk-4121qate.js:219410-219445 placement
var Oa = ge(to(), (e) => e.set(void 0));
//@ chunk-4121qate.js:219445-219640 placement = returnValue (0.765)
async function* forwardGenerator(as) {
  let o = !1;
  try {
    while (!0) {
      let r = await as.next().catch((n) => {
        throw ((o = !0), n);
      });
      if (r.done === !0) return ((o = !0), r.value);
      yield r.value;
    }
  } finally {
    if (!o)
      await as.return().catch(() => {
        return;
      });
  }
}
/**
 * 包装异步生成器：照常 yield，同时把生成器的 return 值放进一个 promise；生成器在完成前被关闭时 promise 以“stream was closed before its result”reject。
 */
//@ chunk-4121qate.js:219640-220000 placement
function teeGeneratorResult(e) {
  let withResolvers = Promise.withResolvers();
  withResolvers.promise.catch(() => {});
  let r = !1;
  async function* n() {
    let s = typeof e === "function" ? e() : e;
    try {
      let i = yield* s;
      return ((r = !0), withResolvers.resolve(i), i);
    } catch (error) {
      throw ((r = !0), withResolvers.reject(error), error);
    } finally {
      if (!r) withResolvers.reject(new HooksError("the stream was closed before its result"));
    }
  }
  return Object.defineProperty(n(), "result", { value: withResolvers.promise, enumerable: !0 });
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
  let { run: run, catch: r, hop: hop, ...s } = e,
    i = (p) =>
      async function* (a, m, c) {
        let u = [],
          l,
          y = !1,
          g = (R) =>
            new Promise((I, V) => {
              if (y) {
                (R.return(void 0).catch(() => {
                  return;
                }),
                  V(streamClosedBeforeNextError(e)));
                return;
              }
              ((u = [...u, { stream: R, resolve: I, reject: V }]), l?.());
            }),
          x = freezeHookCall({
            ...hookCallContext(m),
            call: (R) => g(c.open(R)),
            to: (R, ...I) => g(mrs(R, m, I)),
          }),
          T = p(a, x).then(
            (R) => ({ result: R, error: void 0, isThrown: !1 }),
            (R) => ({ result: void 0, error: R, isThrown: !0 }),
          ),
          h;
        T.then((R) => {
          ((h = R), l?.());
        });
        let v;
        try {
          while (!0) {
            if ((([v, ...u] = u), v === void 0 && h !== void 0)) break;
            if (v === void 0) {
              (await new Promise((R) => {
                l = R;
              }),
                (l = void 0));
              continue;
            }
            try {
              while (h === void 0) {
                let winner = await Promise.race([v.stream.next(), T]);
                if (!("done" in winner)) break;
                if (winner.done === !0) {
                  (v.resolve(winner.value), (v = void 0));
                  break;
                }
                yield winner.value;
              }
            } catch (error) {
              (v?.reject(error), (v = void 0));
            }
          }
        } finally {
          y = !0;
          for (let R of [...(v ? [v] : []), ...u])
            (R.reject(streamClosedBeforeNextError(e)),
              R.stream.return(void 0).catch(() => {
                return;
              }));
          u = [];
        }
        if (h.isThrown) throw h.error;
        return h.result;
      };
  return {
    ...s,
    run: i((p, f) => run(p, f, { call: (a) => f(a), floors: [], cutAt: void 0 })),
    ...(r !== void 0 && { catch: i((p, f) => r(p, f)) }),
  };
}
/**
 * 静默关闭生成器：调用 return() 并吞掉其错误。
 */
//@ chunk-4121qate.js:221286-221489 placement
async function closeGeneratorQuietly(e) {
  let abortController = new AbortController(),
    r = Promise.resolve()
      .then(() => e.return?.(void 0))
      .then(
        () => {
          return;
        },
        () => {
          return;
        },
      );
  try {
    await Promise.race([r, sleep(H5e, abortController.signal, { unref: !0 })]);
  } finally {
    abortController.abort();
  }
}
//@ chunk-4121qate.js:221489-221728 placement = returnValue (0.765)
async function* forwardGeneratorWithErrorHook(e, o = () => {}) {
  let r = !1;
  async function n() {
    try {
      return await e.next();
    } catch (error) {
      throw ((r = !0), error);
    }
  }
  try {
    while (!0) {
      let s = await n();
      if (s.done === !0) return ((r = !0), s.value);
      (o(s.value), yield s.value);
    }
  } finally {
    if (!r) await e.return?.(void 0);
  }
}
//@ chunk-4121qate.js:221728-221857 placement
function describeStreamFailure(e, o, r) {
  let n = !e || r !== void 0,
    s = Re(e ? r : o);
  return Object.freeze({ kind: e ? "timeout" : "throw", ...(n && { message: s }), budget: Dt });
}
//@ chunk-4121qate.js:221857-221928 placement
var Tc = () => ({ done: !1, result: void 0, closed: !1, revoked: !1, threw: void 0 });
/**
 * 流式钩子链的读取器：拉取下一块（可被中止）、统计块数与字节、逐块回调。
 */
//@ chunk-4121qate.js:221928-222655 placement
function createStreamReader({ source: source, name: o, away: away, carry: carry, onChunk: onChunk }) {
  let i = Tc(),
    p = 0,
    f = 0,
    a,
    m;
  async function c() {
    let y = a ?? source.next();
    a = y;
    try {
      return await away(() => y);
    } catch (error) {
      throw ((i.done = !0), (i.threw ??= { error: error }), error);
    } finally {
      if (a === y) a = void 0;
    }
  }
  function u() {
    if (i.threw !== void 0) throw i.threw.error;
    return i.result;
  }
  function l(y = "link") {
    p += 1;
    let g = p;
    f = g;
    let x = () => f !== g || (y === "hook" && i.revoked);
    function T(h) {
      if (((m ??= h), y === "hook")) throw nextAfterSettledError(o);
      return i.result;
    }
    return (async function* () {
      while (!0) {
        if (x()) return T(void 0);
        let h;
        if (m !== void 0) ((h = m), (m = void 0));
        else if (i.done) return u();
        else {
          if (((h = await c()), x())) return T(h);
          if (m === h) m = void 0;
        }
        if (h.done === !0) return ((i.done = !0), (i.result = carry(h.value)), i.result);
        (onChunk(h.value), yield h.value);
      }
    })();
  }
  return { source: source, progress: i, readOn: l };
}
/**
 * 预算计时的所有权计数：有持有者时计时运行，全部释放时暂停并累计耗时。
 */
//@ chunk-4121qate.js:222655-222988 placement
function createBudgetOwnership(e) {
  let o = 0,
    r = 0,
    n = 0;
  e.pause();
  function s() {
    if (o++ === 0) ((r = performance.now()), e.resume());
  }
  function i() {
    if (--o === 0) ((n += performance.now() - r), e.pause());
  }
  return {
    async own(p) {
      s();
      try {
        return await TAn.run(e, p);
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
/**
 * 流式钩子链：拉取 next() 流、处理下层拒绝与提前关闭
 */
//@ chunk-4121qate.js:222988-228754 placement
var runHookStreamChain =
  ({
    handler: handler,
    index: index,
    below: below,
    site: site,
    budgetMs: budgetMs,
    origin: origin,
    nothingBelow: nothingBelow,
  }) =>
  (f, a, m) =>
    teeGeneratorResult(async function* () {
      let { run: run, floors: floors } = m,
        l = handlerTier(handler),
        y = maybeBypassHandler({ handler: handler, tier: l, index: index, site: site, e: f, descent: m });
      if (y !== void 0) return yield* below(f, a, y);
      let g = os(f),
        abortController = new AbortController(),
        T = forwardAbort(a, abortController),
        abortController_2 = new AbortController(),
        v = forwardAbort(a, abortController_2),
        R = handler.budgetMs ?? budgetMs,
        I = describeStreamHookOverrun(R, a),
        V = site.budgetSpan === "pull" ? I.rearm : () => {},
        { own: own, ms: ms, ...L } = createBudgetOwnership(I),
        B = L,
        j = (k) => B.away(k),
        N = [],
        weakSet = new WeakSet(),
        te = Se(handler),
        Ne = te ? void 0 : site.chunkChecker?.(),
        Ve = !1,
        Me = !1,
        E = 0,
        Z = "rejected",
        z,
        Ke,
        ce,
        Te = "none",
        ee = () => {
          E += 1;
        };
      function Y(k, C = I) {
        let { expired: expired } = C;
        return expired === void 0 ? k : Promise.race([k, expired]);
      }
      function de(k) {
        return (
          pd().log(
            `${handler.name}: its next() stream rejected below it (${site.event}); the rejection passes up`,
          ),
          k
        );
      }
      function pe(k, C, U) {
        let W = site.raiseArgument?.(k) ?? k,
          abortController = new AbortController();
        (forwardAbort(abortController_2.signal, abortController), forwardAbort(C, abortController));
        let oe = ko();
        if (!abortController_2.signal.aborted) run.beneath = oe;
        let { carry: carry } = site,
          le = createStreamReader({
            source: below(W, abortController.signal, { run: oe, floors: U }),
            name: handler.name,
            away: j,
            carry: (ye) => (carry === void 0 ? ye : carry(ye, W, f)),
            onChunk: (ye) => {
              if (typeof ye === "object" && ye !== null) weakSet.add(ye);
              (Ne?.pulled(ye), V());
            },
          });
        return (N.push(le), le);
      }
      let fe = (k) =>
          teeGeneratorResult(async function* () {
            try {
              return yield* k.readOn("hook");
            } finally {
              if (!k.progress.done) k.progress.closed = !0;
            }
          }),
        Ee = (k, C, U = floors) => {
          let W = normalizeNextArgument({ handler: handler, site: site, e: f }, k);
          if (Ve) throw nextAfterSettledError(handler.name);
          return (ke(), fe(pe(W, C, U)));
        };
      function ke() {
        for (let k of N)
          if (k.progress.closed && !k.progress.done)
            ((k.progress.done = !0), closeGeneratorQuietly(k.source));
      }
      let Pe = (k) => resolveNextTier(floors, k, { plugin: handler.name, tier: l }),
        Oe = makeHookCall({
          call: Ee,
          to: (k, ...C) => Ee(k, void 0, Pe(C)),
          signal: abortController.signal,
          is: Zn(site.event),
          event: site.event,
          origin: origin,
          trace: () => traceOfRun(run.beneath),
          budget: () => I.reading(),
        });
      function be(k) {
        let settle = site.settle,
          U = te || settle === void 0;
        try {
          let W = U ? k : settle(k),
            re = te
              ? void 0
              : site.check?.(
                  W,
                  f,
                  N.flatMap((oe) => (oe.progress.done ? [oe.progress.result] : [])),
                );
          return { settled: W, problem: re };
        } catch (error) {
          let oe = `a result the site cannot read (${Re(error)})`;
          return { settled: k, problem: oe };
        }
      }
      function De(k) {
        let C = typeof k === "object" && k !== null && weakSet.has(k),
          U = Ne?.yielded(k, C);
        if (U !== void 0) throw ((Ke = `a chunk with ${U}`), new HooksError(`yielded a chunk with ${U}`));
        return k;
      }
      function ft(k) {
        let at = N.at(-1);
        if (k === void 0) {
          if (at?.progress.done === !0) return ((Z = "passed"), at.progress.result);
          throw (
            (Ke = "no result"),
            new HooksError("returned no result (and read no next() stream to its end)")
          );
        }
        let { settled: settled, problem: problem } = be(k);
        if (problem !== void 0) throw ((Ke = problem), new HooksError(`returned ${problem}`));
        return (
          (Z = N.some((oe) => oe.progress.done && oe.progress.result === k) ? "passed" : "returned"),
          (Me = N.length === 0 && !te && handler.isHop !== !0),
          settled
        );
      }
      function yt() {
        let at = N.at(-1);
        return at !== void 0 && at.progress.threw === void 0 ? at : void 0;
      }
      async function* gt(k, C) {
        let U = handler.catch;
        if (U === void 0 || a.aborted) return { answered: !1, problem: void 0 };
        let W = describeStreamHookOverrun(Dt, a),
          re = createBudgetOwnership(W);
        B = re;
        let abortController = new AbortController(),
          Be = forwardAbort(a, abortController),
          le = N.at(-1)?.progress.threw,
          ye,
          Xe = (A, F, se = floors) => {
            let ue = normalizeNextArgument({ handler: handler, site: site, e: f }, A);
            if (ye !== void 0) return ye;
            return ((ye = teeGeneratorResult((yt() ?? pe(ue, F, se)).readOn())), ye);
          },
          ze = makeHookCall({
            call: Xe,
            to: (A, ...F) => Xe(A, void 0, Pe(F)),
            signal: abortController.signal,
            is: Zn(site.event),
            event: site.event,
            origin: origin,
            trace: () => traceOfRun(run.beneath),
            budget: () => W.reading(),
            caught: { error: describeStreamFailure(C, k, le?.error), called: N.length > 0 },
          }),
          Je,
          w = !1;
        try {
          ((Je = await re.own(() => Y(Promise.resolve(U(g, ze, { open: Xe, floors: floors })), W))),
            (w = !0));
          while (!0) {
            let A = Je,
              own = await re.own(() => Y(A.next(), W));
            if (own.done === !0) {
              if (((w = !1), own.value === void 0)) return { answered: !1, problem: void 0 };
              let { settled: settled, problem: problem } = be(own.value);
              if (problem === void 0) return { answered: !0, result: settled };
              return { answered: !1, problem: `its .catch returned ${problem}` };
            }
            let se = De(own.value);
            (ee(), yield se);
          }
        } catch (error) {
          if (_Ue(error, a)) throw abortErrorFor(a, error);
          return {
            answered: !1,
            problem: `its .catch ${W.isExpired() ? `ran past its ${Dt}ms grace` : `threw ${lr(error)}`}`,
          };
        } finally {
          if (((B = L), W.clear(), Be(), w && Je !== void 0))
            (abortController.abort(new HooksError(`${handler.name}: .catch left`)),
              closeGeneratorQuietly(Je));
        }
      }
      async function* G(k) {
        let isExpired = I.isExpired(),
          U = Kt(handler, Re(k)),
          W = isExpired ? void 0 : N.at(-1)?.progress.threw;
        if (W !== void 0 && handler.catch === void 0) throw de(W.error);
        Ve = !0;
        for (let ze of N) ze.progress.revoked = !0;
        if (ce !== void 0 && Te !== "done") {
          let ze = ce;
          if (isExpired)
            (abortController.abort(new HooksError(U)),
              watchOverrun(
                Promise.resolve()
                  .then(() => ze.return(void 0))
                  .catch(() => {
                    return;
                  }),
                handler,
                site,
              ));
          else await closeGeneratorQuietly(ze);
          Te = "done";
        }
        let re = yield* gt(k, isExpired);
        if (re.answered)
          return (
            pd().log(ha(handler.name, k, site.event), "warn"),
            pd().hookFailed({
              plugin: handler.name,
              environmentId: handler.environmentId,
              event: site.event,
              reason: U,
              effect: prs,
              hasOverrun: !1,
            }),
            (Z = "caught"),
            re.result
          );
        if (W !== void 0) throw de(W.error);
        let oe = yt(),
          Be = oe?.progress.done === !0,
          le = E > 0 || oe !== void 0,
          ye = N.length > 0 && a.aborted && QJ(a, BSi) !== !0,
          Xe = ye ? dr : Be ? Ea : le ? Vg : Sa;
        if (
          (reportHandlerFailure({
            error: k,
            handler: handler,
            site: site,
            effect: Xe,
            cause: {
              expiredMs: isExpired ? R : void 0,
              lingeredMs: I.hasGraceExpired() ? H5e : void 0,
              shape: Ke,
              caught: re.problem,
            },
          }),
          ye)
        )
          throw abortErrorFor(a);
        if (oe?.progress.done === !0) return ((Z = isExpired ? "expired" : "kept"), oe.progress.result);
        if (oe !== void 0)
          return (
            (Z = isExpired ? "expired" : "kept"),
            yield* forwardGeneratorWithErrorHook(oe.readOn(), ee)
          );
        if (nothingBelow) throw k;
        return (
          (Z = isExpired ? "expired" : "skipped"),
          yield* forwardGeneratorWithErrorHook(pe(f, void 0, floors).readOn(), ee)
        );
      }
      try {
        try {
          if (
            ((Te = "running"),
            (ce = await own(() => Y(Promise.resolve(handler.run(g, Oe, { open: Ee, floors: floors }))))),
            !(typeof ce === "object" && ce !== null && typeof ce.next === "function"))
          )
            throw (
              (Te = "done"),
              (Ke = "no stream"),
              new HooksError(
                "returned no stream: a hook on a streaming event is an async generator, async function* ($, e, next) {}",
              )
            );
          while (!0) {
            ((Te = "running"), V());
            let C = ce,
              U = await own(() => Y(C.next())).catch((re) => {
                if (!I.isExpired()) Te = "done";
                throw re;
              });
            if (U.done === !0) return ((Te = "done"), (z = ft(U.value)), z);
            Te = "suspended";
            let W = De(U.value);
            (ee(), yield W);
          }
        } catch (error) {
          if (_Ue(error, a)) throw abortErrorFor(a, error);
          return ((z = yield* G(error)), z);
        }
      } finally {
        if (((Ve = !0), I.clear(), T(), ce !== void 0 && Te === "suspended")) await closeGeneratorQuietly(ce);
        if (N.some((U) => !U.progress.done))
          abortController_2.abort(new fEe(`${handler.name} settled the call`));
        for (let U of N)
          if (!U.progress.done) ((U.progress.done = !0), await closeGeneratorQuietly(U.source));
        v();
        let C = ms();
        if (
          (Wt(run, {
            index: index,
            plugin: handler.isCore === !0 ? ENGINE : handler.name,
            tier: l,
            event: site.event,
            outcome: Z,
            ms: C,
            chunks: E,
            received: f,
            returned: z,
          }),
          Me)
        )
          reportPluginHookWithoutNext({ plugin: handler.name, tier: l, event: site.event, ms: C });
      }
    });
/**
 * 包装生成器的 return()：调用时先执行回调。
 */
//@ chunk-4121qate.js:228754-228860 placement
function onGeneratorReturn(e, o) {
  let r = e.return.bind(e);
  return Object.defineProperty(e, "return", { value: (n) => (o(), r(n)) });
}
//@ chunk-4121qate.js:228860-229095 placement
var createStreamHopHandler = (e, o) => ({
  name: o.map((r) => r.name).join("+"),
  tier: o[0]?.tier,
  tiers: uniq(o.map(handlerTier)),
  plugins: o.map((r) => r.name),
  budgetMs: 0,
  isHop: !0,
  run: (r, n, { open: open, floors: floors }) =>
    e.run({ members: o, e: r, open: open, signal: n.signal, origin: n.origin, floors: floors }),
});
//@ chunk-4121qate.js:229095-229332 placement
function groupStreamHops(e) {
  let o = [],
    r = [];
  function n() {
    let [s] = r,
      i = s?.hop;
    if (s !== void 0 && i !== void 0) o.push(createStreamHopHandler(i, r));
    r = [];
  }
  for (let s of e) {
    if (!(s.hop !== void 0 && s.hop.key === r[0]?.hop?.key)) n();
    if (s.hop === void 0) {
      o.push(s);
      continue;
    }
    r.push(s);
  }
  return (n(), o);
}
//@ chunk-4121qate.js:229332-229617 placement
var createStreamBottomStep =
  (e, o, r) =>
  (n, s, { run: run, floors: floors }) =>
    teeGeneratorResult(async function* () {
      let startTime = performance.now(),
        a = "rejected",
        m,
        c = 0;
      try {
        return (
          (m = yield* forwardGeneratorWithErrorHook(e(n, s, floors), () => {
            c += 1;
          })),
          (a = "returned"),
          m
        );
      } finally {
        Wt(run, {
          index: o,
          plugin: ENGINE,
          tier: "core",
          event: r,
          outcome: a,
          ms: performance.now() - startTime,
          chunks: c,
          received: n,
          returned: m,
        });
      }
    });
//@ chunk-4121qate.js:229617-230197 placement
function reportStreamChainFailure(e) {
  let { e: o, site: site, bottom: bottom } = e,
    s = groupStreamHops(e.handlers),
    p = createStreamBottomStep(
      bottom ??
        (() =>
          (async function* () {
            return await grs(site);
          })()),
      s.length,
      site.event,
    ),
    reduceRight = s.reduceRight(
      (c, u, l) =>
        runHookStreamChain({
          handler: u,
          index: l,
          below: c,
          site: site,
          budgetMs: e.budgetMs ?? cEe,
          origin: e.origin ?? freeze_6,
          nothingBelow: bottom === void 0 && l === s.length - 1,
        }),
      p,
    ),
    a = e.signal ?? new AbortController().signal,
    m = e.floors ?? freeze_4;
  return teeGeneratorResult(async function* () {
    let abortController = new AbortController(),
      u = e.isHopFold === !0,
      l = u ? void 0 : Ra(a, abortController);
    try {
      return yield* reduceRight(o, u ? a : abortController.signal, { run: ko(), floors: m });
    } catch (error) {
      throw (pd().log(`hooks stream chain failed: ${xt(error)}`, "error"), error);
    } finally {
      l?.();
    }
  });
}

export {
  teeGeneratorResult,
  cEe,
  forwardGenerator,
  onGeneratorReturn,
  createStreamOperators,
  reportStreamChainFailure,
  Oa,
  describeStreamHookOverrun,
  getStreamResultPromise,
  closeGeneratorQuietly,
  forwardGeneratorWithErrorHook,
  createPausableBudget,
};
