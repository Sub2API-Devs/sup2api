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
import "vm";
import * as vmModule_2 from "vm";
import {
  timeoutOption,
  createSealedError,
  createVmErrorDescriber,
} from "../../../plugins/functionHooks/vm/vmRealm.js";
import {
  VM_ABORT_TIMEOUT_MS,
  compileWorkflowScript,
  createVmTimers,
  WORKFLOW_VM_WORDS,
} from "../../../services/workflow/scriptSandbox.js";
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
import { WorkflowJournalStub } from "../../../services/workflow/localFileJournal.js";
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
    let w = e.runInContext(r.vmContext, timeoutOption(VM_ABORT_TIMEOUT_MS));
    n = await r.settle(w);
  } catch (error) {
    let h = r.errorInfo(error);
    if (h.stack)
      logForDebugging(
        `Workflow v2 script error stack:
${h.stack}`,
        {
          level: "error",
        },
      );
    return {
      error: summarizeError(h),
      thrown: h,
    };
  }
  let s = n.v;
  if (typeof s === "function")
    return {
      error: "workflow result cannot be a function",
    };
  if (s === null || typeof s !== "object") {
    if (typeof s === "bigint" || typeof s === "symbol")
      return {
        error: `workflow result is not JSON-serializable (a ${typeof s})`,
      };
    return {
      value: s,
    };
  }
  let i = r.sanitize(s);
  try {
    let w;
    try {
      w = clone(i);
    } catch {
      w = jsonParse(jsonStringify(i) ?? "null");
    }
    jsonStringify(w);
    return {
      value: w,
    };
  } catch {
    return {
      error: "workflow result is not JSON-serializable (a circular reference?)",
    };
  }
}
//@ chunk-y1shfdfm.js:25857-26040 placement
function isInsideChildWorkflow(e, r, n) {
  let s = e.rows[r]?.in ?? HOST_SCOPE;
  while (s !== HOST_SCOPE && s !== n) {
    let i = e.rows[s];
    if (!i) return false;
    if (i.kind === "eval" && i.fact.topic === "workflow" && i.fact.child === true) return true;
    s = i.in;
  }
  return false;
}
//@ chunk-y1shfdfm.js:26040-26249 placement
function resolveRuleOrigin(e, r, n) {
  let { addr, by } = r;
  for (;;) {
    if (!by.startsWith("rule:")) return addr;
    let w = Number(by.slice(5));
    if (!Number.isSafeInteger(w) || w < 0 || w >= addr || !e.within(w, n)) return;
    let h = e.rows[w];
    if (!h) return;
    addr = w;
    by = h.by;
  }
}
//@ chunk-y1shfdfm.js:26249-26310 placement
/**
 * 判断某行是否属于当前脚本可触发的规则（不在子工作流内且能解析来源）。
 */
function isValidRuleRow(world, r, n) {
  return !isInsideChildWorkflow(world, r.addr, n) && resolveRuleOrigin(world, r, n) !== undefined;
}
//@ chunk-y1shfdfm.js:26310-30512 placement
/**
 * 为工作流脚本 VM 构建宿主 API（agent/spawn/world 操作等），处理跨 VM 边界的克隆与包装。
 */
function createWorkflowHostApi(e) {
  let { ctx, world, killSignal } = e;
  let childWorkflow = ctx.childWorkflow;
  let { clone } = ctx.vmBoundary;
  let childPhaseNamer = makeChildPhaseNamer();
  let k = new Map();
  let y = new Map();
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
          await world.whenIdle(P);
          if (killSignal.aborted) throw R();
          if (world.rows[P]?.status === "retracted") return null;
          let mapped = world
            .read(
              {
                topic: "result",
              },
              {
                in: P,
              },
            )
            .filter((Z) => isValidRuleRow(world, Z, P))
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
  function x(error, B) {
    if (error instanceof Error)
      return {
        name: error.name,
        message: error.message,
      };
    let L = (B ?? e.errorInfo)(error);
    return {
      name: L.name,
      message: L.message,
    };
  }
  function V(P) {
    let B = y.get(P);
    if (B) {
      B.cutRequested = true;
      return;
    }
    world.retract(P);
  }
  async function G(P, B, L) {
    if (childWorkflow.abortSignal?.aborted) return new Promise(() => {});
    let H = {
      in: P.in,
    };
    let by = P.by;
    if (world.isRetractedScope(H.in)) {
      if (killSignal.aborted) throw R();
      return null;
    }
    let re;
    let me;
    try {
      re = childWorkflow.intakeClone(B);
    } catch (error) {
      me = {
        error,
      };
    }
    let fact = parseFact({
      topic: "workflow",
      ...(typeof re === "string"
        ? {
            name: re,
          }
        : re !== null && typeof re === "object" && "scriptPath" in re && typeof re.scriptPath === "string"
          ? {
              scriptPath: re.scriptPath,
            }
          : {}),
      founding: true,
      child: true,
    });
    let abortController = new AbortController();
    let ee = world.rows.length;
    let ke = world.subscribe((j) => {
      if (j.kind === "retracted" && j.row.addr === ee) {
        ke();
        y.delete(ee);
        abortController.abort();
      }
    });
    y.set(ee, {
      cutRequested: false,
    });
    async function O() {
      let j;
      let childName;
      let phase;
      let _e;
      let X;
      try {
        if (me) throw me.error;
        let childWorkflow_2 = await resolveChildWorkflow(childWorkflow, re);
        if (abortController.signal.aborted) return;
        let ve = compileWorkflowScript(childWorkflow_2.scriptBody);
        if (!ve.ok) {
          let xe = `workflow('${childWorkflow_2.childName}'): ${ve.error}`;
          throw Error(xe);
        }
        childName = childWorkflow_2.childName;
        _e = ve.vmScript;
        phase = childPhaseNamer(childName);
        let timers = createVmTimers(
          childWorkflow.abortSignal
            ? AbortSignal.any([childWorkflow.abortSignal, abortController.signal])
            : abortController.signal,
        );
        e.registerTimers(timers);
        X = createChildVmContext(childWorkflow, childName, phase, timers);
        j = X.errorInfo;
        timers.bindVMInvoke(vmModule_2.runInContext("(fn => { fn() })", X.childCtx));
        for (let [xe, tr] of [
          ["parallel", childWorkflow.hooks.parallel],
          ["pipeline", childWorkflow.hooks.pipeline],
        ]) {
          let Ee = tr;
          let Ae = (...He) => (abortController.signal.aborted ? new Promise(() => {}) : Ee(...He));
          Object.defineProperty(X.childCtx, xe, {
            value: X.asyncWrap(wrapHostFnForVm(Ae)),
            writable: true,
            enumerable: true,
            configurable: true,
          });
        }
        Object.defineProperty(X.childCtx, "args", {
          value: L === undefined ? undefined : X.clone(L),
          writable: true,
          enumerable: true,
          configurable: true,
        });
        let Se = y.get(ee)?.cutRequested === true;
        y.delete(ee);
        if (Se) {
          world.retract(ee);
          return;
        }
        childWorkflow.hooks.reservePhase(phase, "child");
        childWorkflow.hooks.log(`${SMALL_TRIANGLE_RIGHT} running dynamic workflow ${childName}`);
        let Ke = {
          vmContext: X.childCtx,
          hooks: {
            ...childWorkflow.hooks,
            agent: X.agent,
          },
          childSpawnMemoRef: {},
          vmToStr: X.toStr,
          vmOwnString: X.ownString,
          vmStringify: X.stringify,
          timers,
          vmBoundary: {
            clone: X.clone,
            call: X.call,
            settle: X.settle,
            sanitize: X.sanitize,
            asyncWrap: X.asyncWrap,
            syncWrap: X.syncWrap,
          },
          childWorkflow,
        };
        e.installWords(Ke, ee, abortController.signal, P.spawnMemo);
      } catch (error) {
        y.delete(ee);
        abortController.abort();
        let { name: ve, message } = x(error, j);
        let Se = truncateMiddle(message);
        k.set(ee, {
          name: ve,
          message: Se,
          rendered: `${ve}: ${Se}`,
        });
        childWorkflow.hooks.log(`${SMALL_TRIANGLE_RIGHT} workflow() failed to start: ${Se}`);
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          Se,
          "workflow v2: child workflow failed to start",
        );
      }
      let ce = await runScriptInContext(_e, {
        vmContext: X.childCtx,
        settle: X.settle,
        sanitize: X.sanitize,
        errorInfo: X.errorInfo,
      });
      if (abortController.signal.aborted) return;
      if (ce.thrown) {
        k.set(ee, {
          name: ce.thrown.name,
          message: truncateMiddle(ce.thrown.message),
          rendered: ce.error,
        });
        childWorkflow.hooks.log(`${SMALL_TRIANGLE_RIGHT} ${childName} failed: ${ce.error}`);
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          ce.error,
          "workflow v2: child workflow script failed",
        );
      }
      if (ce.error !== undefined) {
        childWorkflow.hooks.log(`${SMALL_TRIANGLE_RIGHT} ${childName} failed: ${ce.error}`);
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          ce.error,
          "workflow v2: child workflow result refused",
        );
      }
      childWorkflow.hooks.log(`${SMALL_TRIANGLE_RIGHT} ${childName} done`);
      return ce.value;
    }
    let le;
    try {
      le = world.eval(
        fact,
        (j) => {
          j.addEventListener("abort", () => abortController.abort(), {
            once: true,
          });
          return O();
        },
        by,
        H,
      );
    } catch (error) {
      ke();
      y.delete(ee);
      if (!world.isRetractedScope(H.in)) {
        let { message } = x(error, undefined);
        let we =
          typeof fact.name === "string"
            ? fact.name
            : typeof fact.scriptPath === "string"
              ? `workflow(${fact.scriptPath})`
              : "workflow()";
        childWorkflow.hooks.recordFailure(`${SMALL_TRIANGLE_RIGHT} ${we}: ${truncateMiddle(message)}`);
        childWorkflow.hooks.log(
          `${SMALL_TRIANGLE_RIGHT} workflow() failed to start: ${truncateMiddle(message)}`,
        );
      }
      throw error;
    }
    if (le !== ee) {
      ke();
      y.delete(ee);
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `child workflow row landed at ${le}, expected ${ee}`,
        "workflow v2: child founding address mismatch",
      );
    }
    return I(le);
  }
  return {
    workflow: G,
    cut: V,
  };
}
//@ chunk-y1shfdfm.js:30534-30573 placement
/**
 * 是否为数组（辅助判断）。
 */
function isArray(e) {
  return Array.isArray(e);
}
//@ chunk-y1shfdfm.js:30573-30672 placement
/**
 * 把内部行裁剪成对外暴露的字段（地址、来源、状态、值、错误、事实）。
 */
function toPublicRow(e) {
  return {
    addr: e.addr,
    by: e.by,
    status: e.status,
    value: e.value,
    error: e.error,
    fact: e.fact,
  };
}
//@ chunk-y1shfdfm.js:30672-31090 placement
function parsePlacementOptions(e) {
  if (e === undefined || e === null) return false;
  if (typeof e !== "object" || Array.isArray(e))
    throw TypeError("placement options must be an object: {top: true} or nothing");
  let r = e;
  if (Object.keys(r).some((key) => key !== "top"))
    throw TypeError("unknown placement option \u2014 the only one is top (a boolean)");
  if (r.top !== undefined && typeof r.top !== "boolean")
    throw TypeError("placement option top must be a boolean");
  return r.top === true;
}
//@ chunk-y1shfdfm.js:31090-36466 placement
/**
 * 为脚本提供 world（put/retract/read/rule 等）绑定，带作用域信号与 spawn 记忆。
 */
function createWorldBindings(e, r, n, s, { scopeSignal: i, inheritedSpawnMemo: w } = {}) {
  let { clone, call: k, settle, sanitize, asyncWrap, syncWrap } = e.vmBoundary;
  let { vmContext, hooks } = e;
  let P = (v) => syncWrap(sanitizeAndLogError(v));
  let vmErrorDescriber = createVmErrorDescriber(vmContext);
  let L = {
    by: "script",
    in: n,
    memo: "chain",
  };
  let H = L;
  function Z(v, S) {
    let W = H;
    H = v;
    try {
      return v.memo === "none" ? e.hooks.withLanesInert(S) : S();
    } finally {
      H = W;
    }
  }
  let re = {
    in: n,
  };
  let me = (v, S) =>
    parsePlacementOptions(S)
      ? re
      : {
          in: v.in,
        };
  let he = vmModule_2.runInContext(
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
      (error) => {
        throw ee(error);
      },
    );
  }
  function ee(error) {
    return ke(vmErrorDescriber(error));
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
    return W === undefined ? undefined : jsonParse(W);
  }
  function le(v, S) {
    if (typeof v !== "function")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        S,
        "workflow v2: word expected a function",
      );
  }
  let j = () => s.aborted || i?.aborted === true;
  let q = (v) => v.memo === "chain" && r.rows[n]?.status !== "pending";
  let we = P((v) => {
    if (j()) return clone([]);
    let pattern = parsePattern(O(v) ?? {});
    return clone(r.read(pattern, re).map(toPublicRow));
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
      let atLeastPattern = parseAtLeastPattern(O(S) ?? {});
      le(W, "on() expects a function");
      let Ie = me(de, O(Q));
      if (r.isRetractedScope(Ie.in)) return -1;
      let Pe = -1;
      Pe = r.on(
        atLeastPattern,
        (Le, or, Je, qe) => {
          let sr = isArray(Le) ? Le.map(toPublicRow) : toPublicRow(Le);
          let ze = {
            by: `rule:${Pe}`,
            in: Je,
            memo: "none",
          };
          weakMap_2.set(ze, qe);
          let Oe = Wr(ze);
          return Z(ze, () => ae(() => k(W, clone(sr), clone(or), Oe)));
        },
        de.by,
        Ie,
      );
      return Pe;
    });
  }
  let weakMap = new WeakMap();
  let weakMap_2 = new WeakMap();
  function Re(v) {
    let S = weakMap.get(v);
    if (S === undefined) return false;
    let W = r.rows[S];
    return W !== undefined && !r.isRetractedScope(W.in);
  }
  function Se(v) {
    return P((S) => {
      if (typeof S !== "number" || !Number.isSafeInteger(S))
        throw TypeError("retract() expects an address (a number)");
      if (j() || S === n || !r.within(S, n)) return false;
      let W = v();
      if (!Re(W) && r.isRetractedScope(W.in)) return false;
      let Q = r.within(W.in, S);
      let de = Q ? weakMap_2.get(W) : undefined;
      let se = Q ? weakMap.get(W) : undefined;
      de?.keep(S);
      let Ie = r.retract(S);
      if (Q && Ie) {
        if (se === undefined || r.within(se, S)) weakMap.set(W, S);
        de?.keep(weakMap.get(W));
      } else if (Q) de?.keep(se);
      return Ie;
    });
  }
  let Ke = new Set();
  let xe = new Map();
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
  let Ee = asyncWrap(wrapHostFnForVm(async (v) => v));
  let Ae = vmModule_2.runInContext(
    "(() => { const P = Promise; return () => new P(() => {}) })()",
    vmContext,
  );
  function He(v) {
    return P((S, W) => {
      if (j()) return k(Ae);
      let Q = v();
      if (q(Q)) return k(Ae);
      if (!Re(Q) && r.isRetractedScope(Q.in)) return k(Ee, null);
      let de = O(W);
      let se = de !== null && typeof de === "object" && !Array.isArray(de) ? de : {};
      let Ie = e.vmToStr(S);
      let label =
        typeof se.label === "string" ? se.label : truncateToLength(Ie, 60).replace(/\s+/g, " ").trim();
      let fact = se.fact !== null && typeof se.fact === "object" && !Array.isArray(se.fact) ? se.fact : {};
      let fact_2 = parseFact({
        ...fact,
        topic: "agent",
        label,
        ...(typeof se.phase === "string" && {
          phase: se.phase,
        }),
      });
      let Je = me(
        Q,
        se.top === undefined
          ? undefined
          : {
              top: se.top,
            },
      );
      if (r.isRetractedScope(Je.in)) return k(Ee, null);
      let qe = r.rows.length;
      let sr = r.eval(
        fact_2,
        (ze) =>
          hooks.agent(S, W, ze, nr(Q), i).then(
            (Oe) => {
              if (Oe === null || Oe === undefined) {
                Ke.add(qe);
                throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  "agent produced no result (skipped, blocked, or gave up after retries)",
                  "workflow v2: agent resolved without a result",
                );
              }
              return O(Oe);
            },
            (error) => {
              let xr = vmErrorDescriber(error);
              xe.set(qe, xr);
              throw ke(xr);
            },
          ),
        Q.by,
        Je,
      );
      return k(Ee, tr(sr));
    });
  }
  function nr(v) {
    if (v.memo === "none") return new WorkflowJournalStub();
    if (w !== undefined) return w;
    let S = r.rows[n];
    return S === undefined || S.status === "pending" ? undefined : new WorkflowJournalStub();
  }
  let $e = () => H;
  e.childSpawnMemoRef.get = () => nr(H);
  let ft = X($e);
  let pt = ce($e);
  let mt = Se($e);
  let wt = He($e);
  function Wr(v) {
    let S = () => (H === L ? v : H);
    return he(X(S), we, ce(S), Se(S), He(S), Tr(S));
  }
  let ht = P((v) => {
    if (typeof v !== "string" || v === "")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "v(name) expects a non-empty string",
        "workflow v2: v() expects a name",
      );
    return clone({
      $var: v,
    });
  });
  let gt = P((v, S) => {
    let of = parsePattern(O(S) ?? {});
    if (typeof v !== "number" || !Number.isSafeInteger(v) || v < 0)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "atleast(N, pattern) expects a non-negative integer",
        "workflow v2: atleast() expects a count",
      );
    return clone({
      $atleast: v,
      of,
    });
  });
  for (let [v, S] of [
    ["put", ft],
    ["read", we],
    ["on", pt],
    ["retract", mt],
    ["agent", wt],
    ["v", ht],
    ["atleast", gt],
    [WORKFLOW_VM_WORDS, P(() => Wr(H))],
  ])
    Object.defineProperty(vmContext, v, {
      value: S,
      writable: false,
      enumerable: true,
      configurable: false,
    });
  let Cr = new Set();
  let { workflow, cut } = i
    ? {
        workflow: () => rejectNestedWorkflow(),
        cut: () => {},
      }
    : createWorkflowHostApi({
        ctx: e,
        world: r,
        killSignal: s,
        installWords: (v, S, scopeSignal, inheritedSpawnMemo) => {
          createWorldBindings(v, r, S, s, {
            scopeSignal,
            inheritedSpawnMemo,
          });
        },
        registerTimers: (v) => {
          Cr.add(v);
        },
        errorInfo: vmErrorDescriber,
      });
  function Tr(v) {
    return P((S, W) => {
      if (j()) return k(Ae);
      let Q = v();
      if (q(Q)) return k(Ae);
      if (_e(Q)) return k(Ee, null);
      let de = {
        in: Q.in,
        by: Q.by,
        spawnMemo: nr(Q),
      };
      let se = asyncWrap(wrapHostFnForVm((Ie, Pe) => workflow(de, Ie, Pe)));
      return k(se, S, W);
    });
  }
  Object.defineProperty(vmContext, "workflow", {
    value: Tr($e),
    writable: false,
    enumerable: true,
    configurable: false,
  });
  vmModule_2.runInContext("delete globalThis.eval", vmContext);
  return {
    as(by, S) {
      return Z(
        {
          by,
          in: n,
          memo: "none",
        },
        S,
      );
    },
    clearChildTimers() {
      for (let v of Cr) v.clear();
    },
    cutChild: cut,
  };
}
//@ chunk-y1shfdfm.js:36466-36740 placement
/**
 * 等待 world 落定的超时（5 秒）。
 */
var MAX_RUN_LOGS = 1000;
var WORLD_SETTLE_TIMEOUT_MS = 5000;
var MODEL = "model";
var RUNAWAY_RUN_KILLED_TEXT =
  "killed (runaway): the run exceeded the per-run row cap \u2014 usually a rule putting the fact it fires on. Its facts are readable with read {status:'retracted'}; fix the rule (or split a genuinely larger workload) before launching again.";
//@ chunk-y1shfdfm.js:36740-36793 placement
/**
 * 把停止原因规范成已知值，未知记为 unknown。
 */
function normalizeStopReason(reason) {
  return STOP_REASONS.find((r) => r === reason) ?? "unknown";
}
//@ chunk-y1shfdfm.js:36793-48223 placement
/**
 * 一次工作流脚本运行：持有 VM 脚本、world、控制器与日志，负责启动、终止与收尾。
 */
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
  killed = false;
  killedSize;
  foreignArtifactContentAtKill = false;
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
  constructor(runId, vmScript, world) {
    this.runId = runId;
    this.vmScript = vmScript;
    this.world = world;
  }
  static lost(runId, world, n, priorScopes = []) {
    let i = new WorkflowScriptRun(runId, undefined, world);
    i.scope = n;
    i.priorScopes = priorScopes;
    i.retractPriorLives();
    i.lostOnResume = true;
    let w = i.killRecord();
    if (w !== undefined || world.isRetractedScope(n)) {
      i.kill("stop");
      if (w !== undefined) i.killedSize = w;
    }
    return i;
  }
  lostOnResume = false;
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
    return this.foreignArtifactContentAtKill || this.ctx?.hooks.getForeignArtifactContent() === true;
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
  steered = false;
  afterKillReported = false;
  noteCallAfterKill(e) {
    if (!this.killed || this.lostOnResume || this.afterKillReported || this.killedSize === undefined) return;
    this.afterKillReported = true;
    logFeatureOk("workflow_after_kill", {
      next_action: fromEnum(e),
      seconds_since_kill: Math.round((Date.now() - this.killedSize.at) / 1000),
    });
  }
  msSinceLaunch() {
    let e = this.world.rows[this.scope];
    return e ? Date.now() - e.at : 0;
  }
  get pending() {
    return this.scope < 0 ? 0 : this.world.pending(this.scope);
  }
  status() {
    if (this.scope < 0)
      return {
        rows: 0,
        pending: 0,
      };
    return {
      rows: this.world.read(
        {},
        {
          in: this.scope,
        },
      ).length,
      pending: this.pending,
    };
  }
  kill(e) {
    this.killed = true;
    this.controller.abort();
    if (this.scope >= 0 && !this.world.isRetractedScope(this.scope)) {
      let r = this.status();
      this.killedSize = {
        at: Date.now(),
        reason: e,
        ...r,
        rules: count(
          this.world.read(
            {
              topic: "sub",
            },
            {
              in: this.scope,
            },
          ),
          (i) => i.kind === "sub",
        ),
        agents: this.ctx?.hooks.getAgentCount() ?? 0,
      };
      if (!this.lostOnResume)
        logFeatureOk("workflow_kill", {
          reason: fromEnum(e),
          rows: r.rows,
          agents: this.killedSize.agents,
          ms_since_launch: this.msSinceLaunch(),
        });
      this.world.retract(this.scope);
      let { at, ...s } = this.killedSize;
      try {
        if (this.killRecord() === undefined)
          this.world.put(
            {
              topic: "run",
              runId: this.runId,
              killed: true,
              ...s,
            },
            "host",
            {
              in: HOST_SCOPE,
            },
          );
      } catch (error) {
        if (this.world.isFull)
          logForDebugging(`workflow v2: kill record for ${this.runId} skipped \u2014 the world is full`);
        else logError(error);
      }
    }
    this.foreignArtifactContentAtKill = this.carriedForeignArtifactContent;
    this.toolsUsedAtKill = this.ctx?.hooks.getToolsUsed() ?? [];
    this.ctx = undefined;
    this.words = undefined;
  }
  killRecord() {
    let e = this.killRecordRow();
    if (!e) return;
    return {
      at: finiteOrZero(e.at),
      reason: normalizeStopReason(e.fact.reason),
      rows: finiteOrZero(e.fact.rows),
      pending: finiteOrZero(e.fact.pending),
      rules: finiteOrZero(e.fact.rules),
      agents: finiteOrZero(e.fact.agents),
    };
  }
  cutUnawaitedScriptChildren() {
    let words = this.words;
    if (!words) return;
    for (let r of this.world.rows) {
      if (
        r.status === "retracted" ||
        r.by !== "script" ||
        r.in !== this.scope ||
        r.kind !== "eval" ||
        r.fact.topic !== "workflow" ||
        r.fact.child !== true
      )
        continue;
      if (r.status === "pending" || this.childHasOwnWork(r.addr)) words.cutChild(r.addr);
    }
  }
  childHasOwnWork(e) {
    if (this.world.isIdle(e)) return false;
    let rows = this.world.rows;
    for (let i = e + 1; i < rows.length; i++) {
      let s = rows[i];
      if (
        !(s.status === "pending" || (s.kind === "sub" && !this.world.isIdle(s.addr))) ||
        !this.world.within(s.addr, e) ||
        !isValidRuleRow(this.world, s, e)
      )
        continue;
      return true;
    }
    return false;
  }
  killRecordRow() {
    return this.world
      .read(
        {
          topic: "run",
          runId: this.runId,
          killed: true,
        },
        {
          in: HOST_SCOPE,
        },
      )
      .find((e) => e.in === HOST_SCOPE && e.kind === "put" && e.by === "host");
  }
  async run(e, r, sink, s) {
    this.sink = sink;
    let now = Date.now();
    if (this.scope < 0)
      try {
        let O;
        try {
          O = s.journal ? await s.journal.load() : undefined;
        } catch (error) {
          logFeatureBad("workflow_run", "journal_load_failed", {
            duration_ms: Date.now() - now,
          });
          throw error;
        }
        if (this.killed) {
          let le = Date.now() - now;
          logFeatureSad("workflow_run", "killed", {
            agents: 0,
            rows: 0,
            duration_ms: le,
            reopened: false,
            error_results: 0,
          });
          return {
            result: [],
            agentCount: 0,
            logs: [],
            failures: [],
            durationMs: le,
          };
        }
        try {
          this.found(e, r, s, O);
        } catch (error) {
          this.scope = -1;
          this.priorScopes = [];
          this.ctx = undefined;
          this.words = undefined;
          logFeatureBad("workflow_run", "founding_failed", {
            duration_ms: Date.now() - now,
          });
          throw error;
        }
      } finally {
        if (this.scope < 0) this.onUnfounded?.();
        this.onUnfounded = undefined;
      }
    await Promise.race([this.world.whenIdle(this.scope), this.aborted()]);
    this.ctx?.timers.clear();
    this.words?.clearChildTimers();
    let reportedRows = this.reportedRows;
    this.reportedRows = this.world.rows.length;
    let h = this.world.rows[this.scope];
    let k =
      h?.status === "failed" && this.scope >= reportedRows
        ? h.error
        : this.killedSize?.reason === "runaway" && !this.reportedRunaway
          ? RUNAWAY_RUN_KILLED_TEXT
          : undefined;
    let y = k === RUNAWAY_RUN_KILLED_TEXT;
    if (y) this.reportedRunaway = true;
    let R = {
      in: this.scope,
    };
    let I = (O) => O.addr >= reportedRows && this.ownRow(O);
    let logs = this.logs.slice(this.reportedLogs);
    this.reportedLogs = this.logs.length;
    let V = this.ctx?.hooks.getFailures() ?? [];
    let filtered = this.world
      .read(
        {
          topic: "script",
          status: "failed",
        },
        R,
      )
      .filter((O) => I(O) && O.addr !== this.scope);
    let sorted = [
      ...this.world.read(
        {
          topic: "workflow",
          status: "failed",
        },
        R,
      ),
      ...this.world.read(
        {
          topic: "workflow",
          status: "retracted",
        },
        R,
      ),
    ]
      .filter(
        (O) => O.addr >= reportedRows && O.kind === "eval" && O.fact.child === true && O.error !== undefined,
      )
      .sort((O, le) => O.addr - le.addr);
    let failures = [
      ...V.slice(this.reportedFailures),
      ...this.world
        .read(
          {
            topic: "error",
          },
          R,
        )
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
      .read(
        {
          topic: "result",
        },
        R,
      )
      .filter(I)
      .map((O) => O.fact);
    let H = mapped.length === 0 && h?.status === "done" && this.scope >= reportedRows;
    let Z = H ? h.value : undefined;
    let result = H ? Z : mapped.length === 0 && k !== undefined ? null : mapped;
    let me = H ? (Array.isArray(Z) ? Z : Z === undefined || Z === null ? [] : [Z]) : mapped;
    let result_2 = H && Array.isArray(Z) && Z.length === 0 ? 1 : me.length;
    let agentCount = this.killedSize?.agents ?? this.ctx?.hooks.getAgentCount() ?? 0;
    let ee = this.ctx?.hooks.getToolsUsed() ?? this.toolsUsedAtKill;
    let durationMs = Date.now() - now;
    this.logSettlement({
      result: result_2,
      errorResults: count(me, hasErrorField),
      scriptError: k === undefined ? undefined : y ? "runaway" : "script_failed",
      errors:
        count(
          this.world.read(
            {
              topic: "error",
            },
            R,
          ),
          I,
        ) +
        filtered.length +
        sorted.length,
      agentCount,
      durationMs,
    });
    return {
      result,
      agentCount,
      logs,
      failures,
      ...(this.carriedForeignArtifactContent && {
        foreignArtifactContent: true,
      }),
      ...(ee.length > 0 && {
        toolsUsed: ee,
      }),
      usageLimitDenial: this.ctx?.hooks.takeUsageLimitDenial(),
      durationMs,
      ...(k !== undefined && {
        error: k,
      }),
    };
  }
  logSettlement(e) {
    let r = {
      agents: e.agentCount,
      rows:
        this.killedSize?.rows ??
        this.world.read(
          {},
          {
            in: this.scope,
          },
        ).length,
      duration_ms: e.durationMs,
      reopened: this.settlements > 0,
      error_results: e.errorResults,
    };
    this.settlements++;
    if (e.scriptError !== undefined) {
      logFeatureBad("workflow_run", e.scriptError, r);
      return;
    }
    if (this.killed) {
      logFeatureSad("workflow_run", "killed", r);
      return;
    }
    if (e.result > e.errorResults) {
      logFeatureOk("workflow_run", {
        ...r,
        rule_errors: e.errors,
      });
      return;
    }
    if (e.errorResults > 0) {
      logFeatureBad("workflow_run", "error_result", r);
      return;
    }
    logFeatureSad("workflow_run", e.errors > 0 ? "rule_error" : "no_result", r);
  }
  settlements = 0;
  reportedRunaway = false;
  requireOp(e) {
    try {
      this.requireOpen();
      this.requireFounded();
    } catch (error) {
      logFeatureBad(
        "workflow_steer",
        this.killed ? "killed" : this.lostOnResume ? "lost_on_resume" : "not_founded",
        {
          verb: fromEnum(e),
        },
      );
      throw error;
    }
  }
  put(e) {
    this.requireOp("put");
    let r = this.world.put(parseFact(e), MODEL, {
      in: this.scope,
    });
    this.steered = true;
    return r;
  }
  retract(e) {
    this.requireOp("retract");
    if (e === this.scope || !this.world.within(e, this.scope)) return false;
    let r = this.world.retract(e);
    if (r) this.steered = true;
    return r;
  }
  read(e) {
    if (this.scope < 0) return [];
    let pattern = parsePattern(e ?? {});
    return [...this.priorScopes, this.scope].flatMap((n) =>
      this.world
        .read(pattern, {
          in: n,
        })
        .map(toPublicRow),
    );
  }
  markSteer() {
    let e = {
      rows: this.world.rows.length,
      retracted: 0,
      pendingAgents: new Set(),
    };
    for (let r of this.rowsInRun())
      if (r.status === "retracted") e.retracted++;
      else if (r.status === "pending" && isAgentEvalRow(r)) e.pendingAgents.add(r.addr);
    return e;
  }
  reportSteer(e, r) {
    if (this.scope < 0) return;
    let n = 0;
    let s = 0;
    let i = 0;
    let w = 0;
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
    if (e.by === "host" && e.fact.topic === "error" && e.fact.kind === "rule") return true;
    if (!this.inChildWorkflow(e.addr)) return true;
    let ruleOrigin = resolveRuleOrigin(this.world, e, this.scope);
    return ruleOrigin !== undefined && !this.inChildWorkflow(ruleOrigin);
  }
  inChildWorkflow(e) {
    return isInsideChildWorkflow(this.world, e, this.scope);
  }
  rowsInRun() {
    if (this.scope < 0) return [];
    return this.world.rows.filter((e) => this.world.within(e.addr, this.scope));
  }
  beginScript(e) {
    this.requireOp("script");
    if (!this.ctx || !this.words) {
      logFeatureBad("workflow_steer", "no_context", {
        verb: lit("script"),
      });
      return {
        error: "run has no context yet",
      };
    }
    let r = compileWorkflowScript(e, {
      bindWords: true,
    });
    if (!r.ok) {
      logFeatureBad("workflow_steer", "compile_failed", {
        verb: lit("script"),
      });
      return {
        error: r.error,
      };
    }
    let addr = this.evalScript(
      r.vmScript,
      {
        topic: "script",
        via: MODEL,
      },
      MODEL,
      {
        in: this.scope,
      },
      MODEL,
    );
    this.steered = true;
    return {
      addr,
    };
  }
  async awaitScript(e) {
    await Promise.race([this.world.settled(e), sleep(WORLD_SETTLE_TIMEOUT_MS)]);
    let r = this.world.rows[e];
    return r.status === "failed"
      ? {
          error: r.error,
        }
      : {};
  }
  async script(e) {
    let r = this.beginScript(e);
    if ("error" in r)
      return {
        error: r.error,
      };
    let n = await this.awaitScript(r.addr);
    return {
      addr: r.addr,
      ...n,
    };
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
    return new Promise((resolve) => {
      signal.addEventListener("abort", () => resolve(), {
        once: true,
      });
    });
  }
  found(e, canUseTool, n, s) {
    let context = {
      ...e,
      abortController: this.controller,
    };
    let workflowVmContext = createWorkflowVmContext(
      context,
      canUseTool,
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
    this.ctx = workflowVmContext;
    this.vmErrorInfo = createVmErrorDescriber(workflowVmContext.vmContext);
    this.priorScopes = this.world.rows
      .filter((k) => isFoundingScriptRow(k) && k.fact.runId === this.runId)
      .map((k) => k.addr);
    this.scope = this.world.rows.length;
    let h = this.world.subscribe((k) => {
      if (k.kind === "runaway" && k.scope === this.scope) {
        h();
        this.kill("runaway");
      }
    });
    this.controller.signal.addEventListener("abort", h, {
      once: true,
    });
    try {
      this.words = createWorldBindings(workflowVmContext, this.world, this.scope, this.controller.signal);
      if (!this.vmScript)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          "a run restored from the journal cannot be founded",
          "workflow v2: found() on a lost run",
        );
      let k = this.evalScript(
        this.vmScript,
        {
          topic: "script",
          founding: true,
          runId: this.runId,
        },
        "host",
        {
          in: HOST_SCOPE,
        },
      );
      if (k !== this.scope)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `founding row landed at ${k}, expected ${this.scope}`,
          "workflow v2: founding address mismatch",
        );
      this.retractPriorLives();
      let y = this.killRecordRow();
      if (y !== undefined) this.world.retract(y.addr);
      this.world.settled(this.scope).then((R) => {
        if (R.status === "retracted" || this.controller.signal.aborted) return;
        this.cutUnawaitedScriptChildren();
      });
    } catch (error) {
      h();
      throw error;
    }
  }
  evalScript(e, r, n, s, i) {
    let ctx = this.ctx;
    let words = this.words;
    let k = {
      vmContext: ctx.vmContext,
      settle: ctx.vmBoundary.settle,
      sanitize: ctx.vmBoundary.sanitize,
      errorInfo: this.vmErrorInfo,
    };
    let y = () => runScriptInContext(e, k);
    return this.world.eval(
      r,
      () =>
        (i === undefined ? y() : words.as(i, y)).then((R) => {
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
    e.fact.founding === true
  );
}
export { isFoundingScriptRow, WorkflowScriptRun, STOP_REASONS };
