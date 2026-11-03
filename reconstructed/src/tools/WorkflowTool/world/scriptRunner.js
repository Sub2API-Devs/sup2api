/**
 * tools/WorkflowTool/world/scriptRunner.ts
 *
 * 2.1.316 新增：工作流脚本运行器（VM 宿主 API、world 绑定、运行生命周期）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-y1shfdfm.js (14)
 * attribution: placement 14
 */
import * as vmModule from "vm";
import * as vmModule_2 from "vm";
import { B5e, createSealedError, createVmErrorDescriber } from "../../../plugins/functionHooks/vm/vmRealm.js";
import { sin, compileWorkflowScript, createVmTimers, lCo } from "../../../services/workflow/scriptSandbox.js";
import { logForDebugging } from "../../../utils/debug.js";
import { summarizeError, truncateMiddle } from "../../../memdir/memoryTool.js";
import { clone, jsonParse, jsonStringify } from "../../../utils/slowOperations.js";
import { HOST_SCOPE, parseFact, parsePattern, parseAtLeastPattern } from "./worldStore.js";
import {
  makeChildPhaseNamer,
  resolveChildWorkflow,
  createChildVmContext,
  rejectNestedWorkflow,
} from "../../../services/workflow/childWorkflows.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../../utils/errors.js";
import { wrapHostFnForVm } from "../../../plugins/functionHooks/vm/boundaryCopy.js";
import { SMALL_TRIANGLE_RIGHT } from "../../../constants/figures.js";
import { sanitizeAndLogError } from "../../../components/Feedback.js";
import { truncateToLength } from "../../../utils/stringUtils.js";
import { iin } from "../../../services/workflow/localFileJournal.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../../../services/analytics/featureTelemetry.js";
import { fromEnum, lit } from "../../../services/analytics/safeMetadata.js";
import { count } from "../../../utils/collections.js";
import { logError } from "../../../utils/log.js";
import { finiteOrZero, hasErrorField, isAgentEvalRow } from "./runRegistry.js";
import { sleep } from "../../../utils/sleep.js";
import { createWorkflowVmContext } from "../../../services/workflow/runScript.js";

//@ chunk-y1shfdfm.js:25123-25172 placement
var STOP_REASONS = ["user", "model", "stop", "runaway", "pause"];
//@ chunk-y1shfdfm.js:25194-25857 placement
async function runScriptInContext(e, r) {
  let n;
  try {
    let runInContext = e.runInContext(r.vmContext, B5e(sin));
    n = await r.settle(runInContext);
  } catch (error) {
    let errorInfo = r.errorInfo(error);
    if (errorInfo.stack)
      logForDebugging(
        `Workflow v2 script error stack:
${errorInfo.stack}`,
        { level: "error" },
      );
    return { error: summarizeError(errorInfo), thrown: errorInfo };
  }
  let s = n.v;
  if (typeof s === "function") return { error: "workflow result cannot be a function" };
  if (s === null || typeof s !== "object") {
    if (typeof s === "bigint" || typeof s === "symbol")
      return { error: `workflow result is not JSON-serializable (a ${typeof s})` };
    return { value: s };
  }
  let sanitize = r.sanitize(s);
  try {
    let w;
    try {
      w = clone(sanitize);
    } catch {
      w = jsonParse(jsonStringify(sanitize) ?? "null");
    }
    return (jsonStringify(w), { value: w });
  } catch {
    return { error: "workflow result is not JSON-serializable (a circular reference?)" };
  }
}
//@ chunk-y1shfdfm.js:25857-26040 placement
function isInsideChildWorkflow(e, r, n) {
  let s = e.rows[r]?.in ?? HOST_SCOPE;
  while (s !== HOST_SCOPE && s !== n) {
    let i = e.rows[s];
    if (!i) return !1;
    if (i.kind === "eval" && i.fact.topic === "workflow" && i.fact.child === !0) return !0;
    s = i.in;
  }
  return !1;
}
//@ chunk-y1shfdfm.js:26040-26249 placement
function resolveRuleOrigin(e, r, n) {
  let { addr: addr, by: by } = r;
  for (;;) {
    if (!by.startsWith("rule:")) return addr;
    let w = Number(by.slice(5));
    if (!Number.isSafeInteger(w) || w < 0 || w >= addr || !e.within(w, n)) return;
    let h = e.rows[w];
    if (!h) return;
    ((addr = w), (by = h.by));
  }
}
//@ chunk-y1shfdfm.js:26249-26310 placement
function pr(e, r, n) {
  return !isInsideChildWorkflow(e, r.addr, n) && resolveRuleOrigin(e, r, n) !== void 0;
}
/**
 * 为工作流脚本 VM 构建宿主 API（agent/spawn/world 操作等），处理跨 VM 边界的克隆与包装。
 */
//@ chunk-y1shfdfm.js:26310-30512 placement
function createWorkflowHostApi(e) {
  let { ctx: ctx, world: world, killSignal: killSignal } = e,
    childWorkflow = ctx.childWorkflow,
    { clone: clone } = ctx.vmBoundary,
    h = makeChildPhaseNamer(),
    k = new Map(),
    y = new Map();
  function R() {
    return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "Workflow aborted",
      "workflow v2: child workflow retracted by kill",
    );
  }
  function I(P) {
    return world.settled(P).then(async (B) => {
      let L = k.get(P);
      switch ((k.delete(P), B.status)) {
        case "done": {
          if ((await world.whenIdle(P), killSignal.aborted)) throw R();
          if (world.rows[P]?.status === "retracted") return null;
          let mapped = world
            .read({ topic: "result" }, { in: P })
            .filter((Z) => pr(world, Z, P))
            .map((Z) => Z.fact);
          return mapped.length > 0 ? clone(mapped) : clone(B.value);
        }
        case "failed": {
          if (L) throw createSealedError(L.message, L.name, L.rendered);
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            B.error ?? "child workflow failed",
            "workflow v2: awaited child workflow failed",
          );
        }
        case "retracted":
          if (killSignal.aborted) throw R();
          return null;
        default:
          return null;
      }
    });
  }
  function x(P, B) {
    if (P instanceof Error) return { name: P.name, message: P.message };
    let L = (B ?? e.errorInfo)(P);
    return { name: L.name, message: L.message };
  }
  function V(P) {
    let B = y.get(P);
    if (B) {
      B.cutRequested = !0;
      return;
    }
    world.retract(P);
  }
  async function G(P, B, L) {
    if (childWorkflow.abortSignal?.aborted) return new Promise(() => {});
    let H = { in: P.in },
      by = P.by;
    if (world.isRetractedScope(H.in)) {
      if (killSignal.aborted) throw R();
      return null;
    }
    let re, me;
    try {
      re = childWorkflow.intakeClone(B);
    } catch (error) {
      me = { error: error };
    }
    let he = parseFact({
        topic: "workflow",
        ...(typeof re === "string"
          ? { name: re }
          : re !== null && typeof re === "object" && "scriptPath" in re && typeof re.scriptPath === "string"
            ? { scriptPath: re.scriptPath }
            : {}),
        founding: !0,
        child: !0,
      }),
      abortController = new AbortController(),
      ee = world.rows.length,
      subscribe = world.subscribe((j) => {
        if (j.kind === "retracted" && j.row.addr === ee) (subscribe(), y.delete(ee), abortController.abort());
      });
    y.set(ee, { cutRequested: !1 });
    async function O() {
      let j, q, we, _e, X;
      try {
        if (me) throw me.error;
        let be = await resolveChildWorkflow(childWorkflow, re);
        if (abortController.signal.aborted) return;
        let ve = compileWorkflowScript(be.scriptBody);
        if (!ve.ok) {
          let xe = `workflow('${be.childName}'): ${ve.error}`;
          throw Error(xe);
        }
        ((q = be.childName), (_e = ve.vmScript), (we = h(q)));
        let Re = createVmTimers(
          childWorkflow.abortSignal
            ? AbortSignal.any([childWorkflow.abortSignal, abortController.signal])
            : abortController.signal,
        );
        (e.registerTimers(Re),
          (X = createChildVmContext(childWorkflow, q, we, Re)),
          (j = X.errorInfo),
          Re.bindVMInvoke(vmModule.runInContext("(fn => { fn() })", X.childCtx)));
        for (let [xe, tr] of [
          ["parallel", childWorkflow.hooks.parallel],
          ["pipeline", childWorkflow.hooks.pipeline],
        ]) {
          let Ee = tr,
            Ae = (...He) => (abortController.signal.aborted ? new Promise(() => {}) : Ee(...He));
          Object.defineProperty(X.childCtx, xe, {
            value: X.asyncWrap(wrapHostFnForVm(Ae)),
            writable: !0,
            enumerable: !0,
            configurable: !0,
          });
        }
        Object.defineProperty(X.childCtx, "args", {
          value: L === void 0 ? void 0 : X.clone(L),
          writable: !0,
          enumerable: !0,
          configurable: !0,
        });
        let Se = y.get(ee)?.cutRequested === !0;
        if ((y.delete(ee), Se)) {
          world.retract(ee);
          return;
        }
        (childWorkflow.hooks.reservePhase(we, "child"),
          childWorkflow.hooks.log(`${SMALL_TRIANGLE_RIGHT} running dynamic workflow ${q}`));
        let Ke = {
          vmContext: X.childCtx,
          hooks: { ...childWorkflow.hooks, agent: X.agent },
          childSpawnMemoRef: {},
          vmToStr: X.toStr,
          vmOwnString: X.ownString,
          vmStringify: X.stringify,
          timers: Re,
          vmBoundary: {
            clone: X.clone,
            call: X.call,
            settle: X.settle,
            sanitize: X.sanitize,
            asyncWrap: X.asyncWrap,
            syncWrap: X.syncWrap,
          },
          childWorkflow: childWorkflow,
        };
        e.installWords(Ke, ee, abortController.signal, P.spawnMemo);
      } catch (error) {
        (y.delete(ee), abortController.abort());
        let { name: ve, message: message } = x(error, j),
          Se = truncateMiddle(message);
        throw (
          k.set(ee, { name: ve, message: Se, rendered: `${ve}: ${Se}` }),
          childWorkflow.hooks.log(`${SMALL_TRIANGLE_RIGHT} workflow() failed to start: ${Se}`),
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            Se,
            "workflow v2: child workflow failed to start",
          )
        );
      }
      let ce = await runScriptInContext(_e, {
        vmContext: X.childCtx,
        settle: X.settle,
        sanitize: X.sanitize,
        errorInfo: X.errorInfo,
      });
      if (abortController.signal.aborted) return;
      if (ce.thrown)
        throw (
          k.set(ee, { name: ce.thrown.name, message: truncateMiddle(ce.thrown.message), rendered: ce.error }),
          childWorkflow.hooks.log(`${SMALL_TRIANGLE_RIGHT} ${q} failed: ${ce.error}`),
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            ce.error,
            "workflow v2: child workflow script failed",
          )
        );
      if (ce.error !== void 0)
        throw (
          childWorkflow.hooks.log(`${SMALL_TRIANGLE_RIGHT} ${q} failed: ${ce.error}`),
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            ce.error,
            "workflow v2: child workflow result refused",
          )
        );
      return (childWorkflow.hooks.log(`${SMALL_TRIANGLE_RIGHT} ${q} done`), ce.value);
    }
    let le;
    try {
      le = world.eval(
        he,
        (j) => (j.addEventListener("abort", () => abortController.abort(), { once: !0 }), O()),
        by,
        H,
      );
    } catch (error) {
      if ((subscribe(), y.delete(ee), !world.isRetractedScope(H.in))) {
        let { message: message } = x(error, void 0),
          we =
            typeof he.name === "string"
              ? he.name
              : typeof he.scriptPath === "string"
                ? `workflow(${he.scriptPath})`
                : "workflow()";
        (childWorkflow.hooks.recordFailure(`${SMALL_TRIANGLE_RIGHT} ${we}: ${truncateMiddle(message)}`),
          childWorkflow.hooks.log(
            `${SMALL_TRIANGLE_RIGHT} workflow() failed to start: ${truncateMiddle(message)}`,
          ));
      }
      throw error;
    }
    if (le !== ee)
      throw (
        subscribe(),
        y.delete(ee),
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `child workflow row landed at ${le}, expected ${ee}`,
          "workflow v2: child founding address mismatch",
        )
      );
    return I(le);
  }
  return { workflow: G, cut: V };
}
//@ chunk-y1shfdfm.js:30534-30573 placement
function Tt(e) {
  return Array.isArray(e);
}
//@ chunk-y1shfdfm.js:30573-30672 placement
function De(e) {
  return { addr: e.addr, by: e.by, status: e.status, value: e.value, error: e.error, fact: e.fact };
}
//@ chunk-y1shfdfm.js:30672-31090 placement
function parsePlacementOptions(e) {
  if (e === void 0 || e === null) return !1;
  if (typeof e !== "object" || Array.isArray(e))
    throw TypeError("placement options must be an object: {top: true} or nothing");
  let r = e;
  if (Object.keys(r).some((n) => n !== "top"))
    throw TypeError("unknown placement option \u2014 the only one is top (a boolean)");
  if (r.top !== void 0 && typeof r.top !== "boolean")
    throw TypeError("placement option top must be a boolean");
  return r.top === !0;
}
/**
 * 为脚本提供 world（put/retract/read/rule 等）绑定，带作用域信号与 spawn 记忆。
 */
//@ chunk-y1shfdfm.js:31090-36466 placement
function createWorldBindings(e, r, n, s, { scopeSignal: i, inheritedSpawnMemo: w } = {}) {
  let {
      clone: clone,
      call: k,
      settle: settle,
      sanitize: sanitize,
      asyncWrap: asyncWrap,
      syncWrap: syncWrap,
    } = e.vmBoundary,
    { vmContext: vmContext, hooks: hooks } = e,
    P = (v) => syncWrap(sanitizeAndLogError(v)),
    B = createVmErrorDescriber(vmContext),
    L = { by: "script", in: n, memo: "chain" },
    H = L;
  function Z(v, S) {
    let W = H;
    H = v;
    try {
      return v.memo === "none" ? e.hooks.withLanesInert(S) : S();
    } finally {
      H = W;
    }
  }
  let re = { in: n },
    me = (v, S) => (parsePlacementOptions(S) ? re : { in: v.in }),
    runInContext = vmModule_2.runInContext(
      "(() => { const freeze = Object.freeze; return (put, read, on, retract, agent, workflow) => freeze({ put, read, on, retract, agent, workflow }) })()",
      vmContext,
    );
  function ae(v) {
    let S;
    try {
      S = settle(v());
    } catch (error) {
      return Promise.reject(ee(error));
    }
    return S.then(
      (W) => O(W.v),
      (W) => {
        throw ee(W);
      },
    );
  }
  function ee(v) {
    return ke(B(v));
  }
  function ke(v) {
    return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      v.message ? `${v.name}: ${v.message}` : v.name,
      "workflow v2: VM code threw",
    );
  }
  function O(v) {
    let S = sanitize(v);
    if (S === null || typeof S !== "object") return S;
    let W = jsonStringify(S);
    return W === void 0 ? void 0 : jsonParse(W);
  }
  function le(v, S) {
    if (typeof v !== "function")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        S,
        "workflow v2: word expected a function",
      );
  }
  let j = () => s.aborted || i?.aborted === !0,
    q = (v) => v.memo === "chain" && r.rows[n]?.status !== "pending",
    we = P((v) => {
      if (j()) return clone([]);
      let S = parsePattern(O(v) ?? {});
      return clone(r.read(S, re).map(De));
    });
  function _e(v) {
    return j() || (r.isRetractedScope(v.in) && !Re(v));
  }
  function X(v) {
    return P((S, W) => {
      let Q = v();
      if (_e(Q)) return -1;
      let de = me(Q, O(W));
      if (r.isRetractedScope(de.in)) return -1;
      return r.put(parseFact(O(S)), Q.by, de);
    });
  }
  function ce(v) {
    return P((S, W, Q) => {
      let de = v();
      if (_e(de)) return -1;
      let se = parseAtLeastPattern(O(S) ?? {});
      le(W, "on() expects a function");
      let Ie = me(de, O(Q));
      if (r.isRetractedScope(Ie.in)) return -1;
      let Pe = -1;
      return (
        (Pe = r.on(
          se,
          (Le, or, Je, qe) => {
            let sr = Tt(Le) ? Le.map(De) : De(Le),
              ze = { by: `rule:${Pe}`, in: Je, memo: "none" };
            weakMap_2.set(ze, qe);
            let Oe = Wr(ze);
            return Z(ze, () => ae(() => k(W, clone(sr), clone(or), Oe)));
          },
          de.by,
          Ie,
        )),
        Pe
      );
    });
  }
  let weakMap = new WeakMap(),
    weakMap_2 = new WeakMap();
  function Re(v) {
    let S = weakMap.get(v);
    if (S === void 0) return !1;
    let W = r.rows[S];
    return W !== void 0 && !r.isRetractedScope(W.in);
  }
  function Se(v) {
    return P((S) => {
      if (typeof S !== "number" || !Number.isSafeInteger(S))
        throw TypeError("retract() expects an address (a number)");
      if (j() || S === n || !r.within(S, n)) return !1;
      let W = v();
      if (!Re(W) && r.isRetractedScope(W.in)) return !1;
      let within = r.within(W.in, S),
        de = within ? weakMap_2.get(W) : void 0,
        se = within ? weakMap.get(W) : void 0;
      de?.keep(S);
      let retract = r.retract(S);
      if (within && retract) {
        if (se === void 0 || r.within(se, S)) weakMap.set(W, S);
        de?.keep(weakMap.get(W));
      } else if (within) de?.keep(se);
      return retract;
    });
  }
  let Ke = new Set(),
    xe = new Map();
  function tr(v) {
    return r.settled(v).then((S) => {
      switch (S.status) {
        case "done":
          return clone(S.value);
        case "failed": {
          if (Ke.has(v)) return null;
          let W = xe.get(v);
          if (W) throw createSealedError(W.message, W.name);
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            S.error ?? "agent failed",
            "workflow v2: awaited agent failed",
          );
        }
        case "retracted":
          if (s.aborted)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              "Workflow aborted",
              "workflow v2: awaited agent retracted by kill",
            );
          if (i?.aborted) return new Promise(() => {});
          return null;
        default:
          return null;
      }
    });
  }
  let Ee = asyncWrap(wrapHostFnForVm(async (v) => v)),
    runInContext_2 = vmModule_2.runInContext(
      "(() => { const P = Promise; return () => new P(() => {}) })()",
      vmContext,
    );
  function He(v) {
    return P((S, W) => {
      if (j()) return k(runInContext_2);
      let Q = v();
      if (q(Q)) return k(runInContext_2);
      if (!Re(Q) && r.isRetractedScope(Q.in)) return k(Ee, null);
      let de = O(W),
        se = de !== null && typeof de === "object" && !Array.isArray(de) ? de : {},
        vmToStr = e.vmToStr(S),
        Pe =
          typeof se.label === "string" ? se.label : truncateToLength(vmToStr, 60).replace(/\s+/g, " ").trim(),
        Le = se.fact !== null && typeof se.fact === "object" && !Array.isArray(se.fact) ? se.fact : {},
        or = parseFact({
          ...Le,
          topic: "agent",
          label: Pe,
          ...(typeof se.phase === "string" && { phase: se.phase }),
        }),
        Je = me(Q, se.top === void 0 ? void 0 : { top: se.top });
      if (r.isRetractedScope(Je.in)) return k(Ee, null);
      let qe = r.rows.length,
        sr = r.eval(
          or,
          (ze) =>
            hooks.agent(S, W, ze, nr(Q), i).then(
              (Oe) => {
                if (Oe === null || Oe === void 0)
                  throw (
                    Ke.add(qe),
                    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                      "agent produced no result (skipped, blocked, or gave up after retries)",
                      "workflow v2: agent resolved without a result",
                    )
                  );
                return O(Oe);
              },
              (Oe) => {
                let xr = B(Oe);
                throw (xe.set(qe, xr), ke(xr));
              },
            ),
          Q.by,
          Je,
        );
      return k(Ee, tr(sr));
    });
  }
  function nr(v) {
    if (v.memo === "none") return new iin();
    if (w !== void 0) return w;
    let S = r.rows[n];
    return S === void 0 || S.status === "pending" ? void 0 : new iin();
  }
  let $e = () => H;
  e.childSpawnMemoRef.get = () => nr(H);
  let ft = X($e),
    pt = ce($e),
    mt = Se($e),
    wt = He($e);
  function Wr(v) {
    let S = () => (H === L ? v : H);
    return runInContext(X(S), we, ce(S), Se(S), He(S), Tr(S));
  }
  let ht = P((v) => {
      if (typeof v !== "string" || v === "")
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          "v(name) expects a non-empty string",
          "workflow v2: v() expects a name",
        );
      return clone({ $var: v });
    }),
    gt = P((v, S) => {
      let W = parsePattern(O(S) ?? {});
      if (typeof v !== "number" || !Number.isSafeInteger(v) || v < 0)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          "atleast(N, pattern) expects a non-negative integer",
          "workflow v2: atleast() expects a count",
        );
      return clone({ $atleast: v, of: W });
    });
  for (let [v, S] of [
    ["put", ft],
    ["read", we],
    ["on", pt],
    ["retract", mt],
    ["agent", wt],
    ["v", ht],
    ["atleast", gt],
    [lCo, P(() => Wr(H))],
  ])
    Object.defineProperty(vmContext, v, { value: S, writable: !1, enumerable: !0, configurable: !1 });
  let Cr = new Set(),
    { workflow: workflow, cut: cut } = i
      ? { workflow: () => rejectNestedWorkflow(), cut: () => {} }
      : createWorkflowHostApi({
          ctx: e,
          world: r,
          killSignal: s,
          installWords: (v, S, W, Q) => {
            createWorldBindings(v, r, S, s, { scopeSignal: W, inheritedSpawnMemo: Q });
          },
          registerTimers: (v) => {
            Cr.add(v);
          },
          errorInfo: B,
        });
  function Tr(v) {
    return P((S, W) => {
      if (j()) return k(runInContext_2);
      let Q = v();
      if (q(Q)) return k(runInContext_2);
      if (_e(Q)) return k(Ee, null);
      let de = { in: Q.in, by: Q.by, spawnMemo: nr(Q) },
        se = asyncWrap(wrapHostFnForVm((Ie, Pe) => workflow(de, Ie, Pe)));
      return k(se, S, W);
    });
  }
  return (
    Object.defineProperty(vmContext, "workflow", {
      value: Tr($e),
      writable: !1,
      enumerable: !0,
      configurable: !1,
    }),
    vmModule_2.runInContext("delete globalThis.eval", vmContext),
    {
      as(v, S) {
        return Z({ by: v, in: n, memo: "none" }, S);
      },
      clearChildTimers() {
        for (let v of Cr) v.clear();
      },
      cutChild: cut,
    }
  );
}
//@ chunk-y1shfdfm.js:36466-36740 placement
var MAX_RUN_LOGS = 1000,
  At = 5000,
  MODEL = "model",
  Br =
    "killed (runaway): the run exceeded the per-run row cap \u2014 usually a rule putting the fact it fires on. Its facts are readable with read {status:'retracted'}; fix the rule (or split a genuinely larger workload) before launching again.";
//@ chunk-y1shfdfm.js:36740-36793 placement
function Ft(e) {
  return STOP_REASONS.find((r) => r === e) ?? "unknown";
}
/**
 * 一次工作流脚本运行：持有 VM 脚本、world、控制器与日志，负责启动、终止与收尾。
 */
//@ chunk-y1shfdfm.js:36793-48223 placement
class WorkflowScriptRun {
  runId;
  vmScript;
  world;
  controller = new AbortController();
  ctx;
  words;
  vmErrorInfo;
  logs = [];
  log(e) {
    if (this.logs.length < MAX_RUN_LOGS) this.logs.push(truncateMiddle(e));
  }
  sink;
  killed = !1;
  killedSize;
  foreignArtifactContentAtKill = !1;
  toolsUsedAtKill = [];
  scope = -1;
  priorScopes = [];
  retractPriorLives() {
    for (let priorScope of this.priorScopes) this.world.retract(priorScope);
  }
  reportedRows = 0;
  reportedLogs = 0;
  reportedFailures = 0;
  reopen;
  onUnfounded;
  constructor(e, r, n) {
    this.runId = e;
    this.vmScript = r;
    this.world = n;
  }
  static lost(e, r, n, s = []) {
    let i = new WorkflowScriptRun(e, void 0, r);
    ((i.scope = n), (i.priorScopes = s), i.retractPriorLives(), (i.lostOnResume = !0));
    let killRecord = i.killRecord();
    if (killRecord !== void 0 || r.isRetractedScope(n)) {
      if ((i.kill("stop"), killRecord !== void 0)) i.killedSize = killRecord;
    }
    return i;
  }
  lostOnResume = !1;
  get isLost() {
    return this.lostOnResume;
  }
  get founded() {
    return this.scope >= 0;
  }
  get isKilled() {
    return this.killed;
  }
  get carriedForeignArtifactContent() {
    return this.foreignArtifactContentAtKill || this.ctx?.hooks.getForeignArtifactContent() === !0;
  }
  get isActive() {
    return this.scope >= 0 && !this.world.isIdle(this.scope);
  }
  state() {
    if (this.killed) return "killed";
    if (this.lostOnResume) return "lost";
    return this.isActive ? "open" : "settled";
  }
  get wasSteered() {
    return this.steered;
  }
  steered = !1;
  afterKillReported = !1;
  noteCallAfterKill(e) {
    if (!this.killed || this.lostOnResume || this.afterKillReported || this.killedSize === void 0) return;
    ((this.afterKillReported = !0),
      logFeatureOk("workflow_after_kill", {
        next_action: fromEnum(e),
        seconds_since_kill: Math.round((Date.now() - this.killedSize.at) / 1000),
      }));
  }
  msSinceLaunch() {
    let e = this.world.rows[this.scope];
    return e ? Date.now() - e.at : 0;
  }
  get pending() {
    return this.scope < 0 ? 0 : this.world.pending(this.scope);
  }
  status() {
    if (this.scope < 0) return { rows: 0, pending: 0 };
    return { rows: this.world.read({}, { in: this.scope }).length, pending: this.pending };
  }
  kill(e) {
    if (
      ((this.killed = !0),
      this.controller.abort(),
      this.scope >= 0 && !this.world.isRetractedScope(this.scope))
    ) {
      let status = this.status();
      if (
        ((this.killedSize = {
          at: Date.now(),
          reason: e,
          ...status,
          rules: count(this.world.read({ topic: "sub" }, { in: this.scope }), (i) => i.kind === "sub"),
          agents: this.ctx?.hooks.getAgentCount() ?? 0,
        }),
        !this.lostOnResume)
      )
        logFeatureOk("workflow_kill", {
          reason: fromEnum(e),
          rows: status.rows,
          agents: this.killedSize.agents,
          ms_since_launch: this.msSinceLaunch(),
        });
      this.world.retract(this.scope);
      let { at: at, ...s } = this.killedSize;
      try {
        if (this.killRecord() === void 0)
          this.world.put({ topic: "run", runId: this.runId, killed: !0, ...s }, "host", { in: HOST_SCOPE });
      } catch (error) {
        if (this.world.isFull)
          logForDebugging(`workflow v2: kill record for ${this.runId} skipped \u2014 the world is full`);
        else logError(error);
      }
    }
    ((this.foreignArtifactContentAtKill = this.carriedForeignArtifactContent),
      (this.toolsUsedAtKill = this.ctx?.hooks.getToolsUsed() ?? []),
      (this.ctx = void 0),
      (this.words = void 0));
  }
  killRecord() {
    let killRecordRow = this.killRecordRow();
    if (!killRecordRow) return;
    return {
      at: finiteOrZero(killRecordRow.at),
      reason: Ft(killRecordRow.fact.reason),
      rows: finiteOrZero(killRecordRow.fact.rows),
      pending: finiteOrZero(killRecordRow.fact.pending),
      rules: finiteOrZero(killRecordRow.fact.rules),
      agents: finiteOrZero(killRecordRow.fact.agents),
    };
  }
  cutUnawaitedScriptChildren() {
    let words = this.words;
    if (!words) return;
    for (let row of this.world.rows) {
      if (
        row.status === "retracted" ||
        row.by !== "script" ||
        row.in !== this.scope ||
        row.kind !== "eval" ||
        row.fact.topic !== "workflow" ||
        row.fact.child !== !0
      )
        continue;
      if (row.status === "pending" || this.childHasOwnWork(row.addr)) words.cutChild(row.addr);
    }
  }
  childHasOwnWork(e) {
    if (this.world.isIdle(e)) return !1;
    let rows = this.world.rows;
    for (let n = e + 1; n < rows.length; n++) {
      let s = rows[n];
      if (
        !(s.status === "pending" || (s.kind === "sub" && !this.world.isIdle(s.addr))) ||
        !this.world.within(s.addr, e) ||
        !pr(this.world, s, e)
      )
        continue;
      return !0;
    }
    return !1;
  }
  killRecordRow() {
    return this.world
      .read({ topic: "run", runId: this.runId, killed: !0 }, { in: HOST_SCOPE })
      .find((e) => e.in === HOST_SCOPE && e.kind === "put" && e.by === "host");
  }
  async run(e, r, n, s) {
    this.sink = n;
    let now = Date.now();
    if (this.scope < 0)
      try {
        let O;
        try {
          O = s.journal ? await s.journal.load() : void 0;
        } catch (error) {
          throw (
            logFeatureBad("workflow_run", "journal_load_failed", { duration_ms: Date.now() - now }),
            error
          );
        }
        if (this.killed) {
          let le = Date.now() - now;
          return (
            logFeatureSad("workflow_run", "killed", {
              agents: 0,
              rows: 0,
              duration_ms: le,
              reopened: !1,
              error_results: 0,
            }),
            { result: [], agentCount: 0, logs: [], failures: [], durationMs: le }
          );
        }
        try {
          this.found(e, r, s, O);
        } catch (error) {
          throw (
            (this.scope = -1),
            (this.priorScopes = []),
            (this.ctx = void 0),
            (this.words = void 0),
            logFeatureBad("workflow_run", "founding_failed", { duration_ms: Date.now() - now }),
            error
          );
        }
      } finally {
        if (this.scope < 0) this.onUnfounded?.();
        this.onUnfounded = void 0;
      }
    (await Promise.race([this.world.whenIdle(this.scope), this.aborted()]),
      this.ctx?.timers.clear(),
      this.words?.clearChildTimers());
    let reportedRows = this.reportedRows;
    this.reportedRows = this.world.rows.length;
    let h = this.world.rows[this.scope],
      k =
        h?.status === "failed" && this.scope >= reportedRows
          ? h.error
          : this.killedSize?.reason === "runaway" && !this.reportedRunaway
            ? Br
            : void 0,
      y = k === Br;
    if (y) this.reportedRunaway = !0;
    let R = { in: this.scope },
      I = (O) => O.addr >= reportedRows && this.ownRow(O),
      sliced = this.logs.slice(this.reportedLogs);
    this.reportedLogs = this.logs.length;
    let V = this.ctx?.hooks.getFailures() ?? [],
      filtered = this.world
        .read({ topic: "script", status: "failed" }, R)
        .filter((O) => I(O) && O.addr !== this.scope),
      sorted = [
        ...this.world.read({ topic: "workflow", status: "failed" }, R),
        ...this.world.read({ topic: "workflow", status: "retracted" }, R),
      ]
        .filter(
          (O) => O.addr >= reportedRows && O.kind === "eval" && O.fact.child === !0 && O.error !== void 0,
        )
        .sort((O, le) => O.addr - le.addr),
      B = [
        ...V.slice(this.reportedFailures),
        ...this.world
          .read({ topic: "error" }, R)
          .filter(I)
          .map((O) => truncateMiddle(`error: ${jsonStringify(O.fact)}`)),
        ...filtered.map((O) => truncateMiddle(`script error: ${O.error ?? ""}`)),
        ...sorted.map((O) =>
          truncateMiddle(
            `${SMALL_TRIANGLE_RIGHT} ${typeof O.fact.name === "string" ? O.fact.name : typeof O.fact.scriptPath === "string" ? `workflow(${O.fact.scriptPath})` : "workflow()"}: ${O.error ?? ""}`,
          ),
        ),
      ];
    this.reportedFailures = V.length;
    let mapped = this.world
        .read({ topic: "result" }, R)
        .filter(I)
        .map((O) => O.fact),
      H = mapped.length === 0 && h?.status === "done" && this.scope >= reportedRows,
      Z = H ? h.value : void 0,
      re = H ? Z : mapped.length === 0 && k !== void 0 ? null : mapped,
      me = H ? (Array.isArray(Z) ? Z : Z === void 0 || Z === null ? [] : [Z]) : mapped,
      he = H && Array.isArray(Z) && Z.length === 0 ? 1 : me.length,
      ae = this.killedSize?.agents ?? this.ctx?.hooks.getAgentCount() ?? 0,
      ee = this.ctx?.hooks.getToolsUsed() ?? this.toolsUsedAtKill,
      ke = Date.now() - now;
    return (
      this.logSettlement({
        result: he,
        errorResults: count(me, hasErrorField),
        scriptError: k === void 0 ? void 0 : y ? "runaway" : "script_failed",
        errors: count(this.world.read({ topic: "error" }, R), I) + filtered.length + sorted.length,
        agentCount: ae,
        durationMs: ke,
      }),
      {
        result: re,
        agentCount: ae,
        logs: sliced,
        failures: B,
        ...(this.carriedForeignArtifactContent && { foreignArtifactContent: !0 }),
        ...(ee.length > 0 && { toolsUsed: ee }),
        usageLimitDenial: this.ctx?.hooks.takeUsageLimitDenial(),
        durationMs: ke,
        ...(k !== void 0 && { error: k }),
      }
    );
  }
  logSettlement(e) {
    let r = {
      agents: e.agentCount,
      rows: this.killedSize?.rows ?? this.world.read({}, { in: this.scope }).length,
      duration_ms: e.durationMs,
      reopened: this.settlements > 0,
      error_results: e.errorResults,
    };
    if ((this.settlements++, e.scriptError !== void 0)) {
      logFeatureBad("workflow_run", e.scriptError, r);
      return;
    }
    if (this.killed) {
      logFeatureSad("workflow_run", "killed", r);
      return;
    }
    if (e.result > e.errorResults) {
      logFeatureOk("workflow_run", { ...r, rule_errors: e.errors });
      return;
    }
    if (e.errorResults > 0) {
      logFeatureBad("workflow_run", "error_result", r);
      return;
    }
    logFeatureSad("workflow_run", e.errors > 0 ? "rule_error" : "no_result", r);
  }
  settlements = 0;
  reportedRunaway = !1;
  requireOp(e) {
    try {
      (this.requireOpen(), this.requireFounded());
    } catch (error) {
      throw (
        logFeatureBad(
          "workflow_steer",
          this.killed ? "killed" : this.lostOnResume ? "lost_on_resume" : "not_founded",
          { verb: fromEnum(e) },
        ),
        error
      );
    }
  }
  put(e) {
    this.requireOp("put");
    let put = this.world.put(parseFact(e), MODEL, { in: this.scope });
    return ((this.steered = !0), put);
  }
  retract(e) {
    if ((this.requireOp("retract"), e === this.scope || !this.world.within(e, this.scope))) return !1;
    let retract = this.world.retract(e);
    if (retract) this.steered = !0;
    return retract;
  }
  read(e) {
    if (this.scope < 0) return [];
    let r = parsePattern(e ?? {});
    return [...this.priorScopes, this.scope].flatMap((n) => this.world.read(r, { in: n }).map(De));
  }
  markSteer() {
    let e = { rows: this.world.rows.length, retracted: 0, pendingAgents: new Set() };
    for (let r of this.rowsInRun())
      if (r.status === "retracted") e.retracted++;
      else if (r.status === "pending" && isAgentEvalRow(r)) e.pendingAgents.add(r.addr);
    return e;
  }
  reportSteer(e, r) {
    if (this.scope < 0) return;
    let n = 0,
      s = 0,
      i = 0,
      w = 0;
    for (let h of this.rowsInRun()) {
      let k = h.addr >= r.rows;
      if (k && h.kind === "put") n++;
      if (h.status === "retracted") s++;
      if (!isAgentEvalRow(h)) continue;
      if (k) i++;
      if (h.status === "retracted" && (k || r.pendingAgents.has(h.addr))) w++;
    }
    logFeatureOk("workflow_steer", {
      verb: fromEnum(e),
      rows_put: n,
      rows_retracted: s - r.retracted,
      agents_spawned: i,
      agents_aborted: w,
      ms_since_launch: this.msSinceLaunch(),
      run_state: fromEnum(this.state()),
    });
  }
  ownRow(e) {
    if (e.by === "host" && e.fact.topic === "error" && e.fact.kind === "rule") return !0;
    if (!this.inChildWorkflow(e.addr)) return !0;
    let r = resolveRuleOrigin(this.world, e, this.scope);
    return r !== void 0 && !this.inChildWorkflow(r);
  }
  inChildWorkflow(e) {
    return isInsideChildWorkflow(this.world, e, this.scope);
  }
  rowsInRun() {
    if (this.scope < 0) return [];
    return this.world.rows.filter((row) => this.world.within(row.addr, this.scope));
  }
  beginScript(e) {
    if ((this.requireOp("script"), !this.ctx || !this.words))
      return (
        logFeatureBad("workflow_steer", "no_context", { verb: lit("script") }),
        { error: "run has no context yet" }
      );
    let r = compileWorkflowScript(e, { bindWords: !0 });
    if (!r.ok)
      return (logFeatureBad("workflow_steer", "compile_failed", { verb: lit("script") }), { error: r.error });
    let evalScript = this.evalScript(
      r.vmScript,
      { topic: "script", via: MODEL },
      MODEL,
      { in: this.scope },
      MODEL,
    );
    return ((this.steered = !0), { addr: evalScript });
  }
  async awaitScript(e) {
    await Promise.race([this.world.settled(e), sleep(At)]);
    let r = this.world.rows[e];
    return r.status === "failed" ? { error: r.error } : {};
  }
  async script(e) {
    let beginScript = this.beginScript(e);
    if ("error" in beginScript) return { error: beginScript.error };
    let awaitScript = await this.awaitScript(beginScript.addr);
    return { addr: beginScript.addr, ...awaitScript };
  }
  killReason() {
    return this.killedSize?.reason ?? this.killRecord()?.reason ?? "unknown";
  }
  requireOpen() {
    if (this.killed)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `workflow run ${this.runId} was killed`,
        "workflow v2: run op on a killed run",
      );
  }
  requireFounded() {
    if (this.scope < 0)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `workflow run ${this.runId} is not founded`,
        "workflow v2: run-op on an unfounded run",
      );
    if (this.lostOnResume)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `workflow run ${this.runId} was restored from the journal on resume; its rules and work are gone \u2014 read its facts, or launch again`,
        "workflow v2: run op on a lost run",
      );
  }
  aborted() {
    let signal = this.controller.signal;
    if (signal.aborted) return Promise.resolve();
    return new Promise((r) => {
      signal.addEventListener("abort", () => r(), { once: !0 });
    });
  }
  found(e, r, n, s) {
    let i = { ...e, abortController: this.controller },
      w = createWorkflowVmContext(
        i,
        r,
        (k) => {
          if (k.type === "progress" && k.data.type === "workflow_log") this.log(k.data.message);
          this.sink?.onProgress(k);
        },
        this.runId,
        (k, y) => this.sink?.onAgentController(k, y),
        n.args,
        n.seedPhaseTitles,
        n.tokenBudget,
        n.journal,
        s,
        n.workflowName,
        n.invokingRequestId,
        n.parentPromptId,
        (k) => this.sink?.onRateLimitWait?.(k),
      );
    ((this.ctx = w),
      (this.vmErrorInfo = createVmErrorDescriber(w.vmContext)),
      (this.priorScopes = this.world.rows
        .filter((row) => isFoundingScriptRow(row) && row.fact.runId === this.runId)
        .map((k) => k.addr)),
      (this.scope = this.world.rows.length));
    let subscribe = this.world.subscribe((k) => {
      if (k.kind === "runaway" && k.scope === this.scope) (subscribe(), this.kill("runaway"));
    });
    this.controller.signal.addEventListener("abort", subscribe, { once: !0 });
    try {
      if (
        ((this.words = createWorldBindings(w, this.world, this.scope, this.controller.signal)),
        !this.vmScript)
      )
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          "a run restored from the journal cannot be founded",
          "workflow v2: found() on a lost run",
        );
      let evalScript = this.evalScript(
        this.vmScript,
        { topic: "script", founding: !0, runId: this.runId },
        "host",
        { in: HOST_SCOPE },
      );
      if (evalScript !== this.scope)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `founding row landed at ${evalScript}, expected ${this.scope}`,
          "workflow v2: founding address mismatch",
        );
      this.retractPriorLives();
      let killRecordRow = this.killRecordRow();
      if (killRecordRow !== void 0) this.world.retract(killRecordRow.addr);
      this.world.settled(this.scope).then((R) => {
        if (R.status === "retracted" || this.controller.signal.aborted) return;
        this.cutUnawaitedScriptChildren();
      });
    } catch (error) {
      throw (subscribe(), error);
    }
  }
  evalScript(e, r, n, s, i) {
    let ctx = this.ctx,
      words = this.words,
      k = {
        vmContext: ctx.vmContext,
        settle: ctx.vmBoundary.settle,
        sanitize: ctx.vmBoundary.sanitize,
        errorInfo: this.vmErrorInfo,
      },
      y = () => runScriptInContext(e, k);
    return this.world.eval(
      r,
      () =>
        (i === void 0 ? y() : words.as(i, y)).then((R) => {
          if (R.error)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              R.error,
              "workflow v2: script failed",
            );
          return R.value;
        }),
      n,
      s,
    );
  }
}
//@ chunk-y1shfdfm.js:48223-48333 placement
function isFoundingScriptRow(e) {
  return (
    e.in === HOST_SCOPE &&
    e.kind === "eval" &&
    e.by === "host" &&
    e.fact.topic === "script" &&
    e.fact.founding === !0
  );
}

export { isFoundingScriptRow, WorkflowScriptRun, STOP_REASONS };
