/**
 * tools/WorkflowTool/world/worldStore.ts
 *
 * 2.1.316 新增：工作流 world 存储（事实、模式匹配、规则触发）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-y1shfdfm.js (22)
 * attribution: placement 22
 */
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { stripProtoKeys } from "../../../utils/objectSafety.js";
import { jsonParse, jsonStringify } from "../../../utils/slowOperations.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
} from "../../../utils/errors.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { kt, o, aA, Ue, E, M, zg, A, pe } from "../../../../vendor/zod/v4/classic/schemas.js";
import { truncateMiddle } from "../../../memdir/memoryTool.js";
import { logForDebugging } from "../../../utils/debug.js";

//@ chunk-y1shfdfm.js:13860-14329 placement
function parseWorkflowArgs(e, { apply: r }) {
  if (!isPlainObject(e)) return null;
  let args = e.args;
  if (typeof args !== "string") return null;
  let i = args.trimStart()[0];
  if (i !== "{" && i !== "[") return null;
  let w;
  try {
    w = stripProtoKeys(jsonParse(args)).stripped;
  } catch {
    return null;
  }
  if (w === null || typeof w !== "object") return null;
  let h = typeof e.name === "string" ? "_named" : "",
    k = Array.isArray(w) ? "args_json_string_to_array" : "args_json_string_to_object";
  if (!r) return { input: e, shapeClass: `${k}${h}_detect_only` };
  return { input: { ...e, args: w }, shapeClass: `${k}${h}` };
}
//@ chunk-y1shfdfm.js:14329-14383 placement
var ROW_STATUSES = ["live", "pending", "done", "failed", "retracted"];
//@ chunk-y1shfdfm.js:14383-14392 placement
var HOST_SCOPE = -1;
//@ chunk-y1shfdfm.js:14392-14489 placement
function Lr(e) {
  return e !== null && typeof e === "object" && !Array.isArray(e) && typeof e.$var === "string";
}
//@ chunk-y1shfdfm.js:14489-14590 placement
function isAtLeastPattern(e) {
  return e !== null && typeof e === "object" && !Array.isArray(e) && typeof e.$atleast === "number";
}
//@ chunk-y1shfdfm.js:14590-14795 placement
function parsePattern(e) {
  let safeParse = Ct().safeParse(e);
  if (!safeParse.success || isAtLeastPattern(safeParse.data))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      'a pattern must be a JSON object (nested objects as subsets, arrays exact, v("x") binds)',
      "world: not a pattern",
    );
  return safeParse.data;
}
//@ chunk-y1shfdfm.js:14795-15012 placement
function parseAtLeastPattern(e) {
  if (isAtLeastPattern(e)) {
    let $atleast = e.$atleast;
    if (!Number.isSafeInteger($atleast) || $atleast < 0)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "atleast(N, pattern): N must be a non-negative integer",
        "world: bad threshold count",
      );
    return { $atleast: $atleast, of: parsePattern(e.of) };
  }
  return parsePattern(e);
}
//@ chunk-y1shfdfm.js:15012-15111 placement
var Dr = new Set(["addr", "by", "status", "at", "in"]),
  vt = new Set(["live", "done"]),
  St = 1e5,
  It = 20000,
  Ar = 32;
//@ chunk-y1shfdfm.js:15111-15150 placement
function Nr(e) {
  return Array.isArray(e);
}
//@ chunk-y1shfdfm.js:15150-15189 placement
function Fr(e) {
  return Array.isArray(e);
}
//@ chunk-y1shfdfm.js:15189-15241 placement
function _t(e, r) {
  return Object.is(e, r) || jsonStringify(e) === jsonStringify(r);
}
/**
 * 把 world 模式（含 $atleast 等特殊项）与事实做结构匹配，返回绑定。
 */
//@ chunk-y1shfdfm.js:15241-15766 placement
function matchPattern(e, r, n = {}) {
  if (e === null || typeof e !== "object") return Object.is(e, r) ? n : void 0;
  if (Lr(e)) {
    if (r === void 0) return;
    if (Object.hasOwn(n, e.$var)) return _t(n[e.$var], r) ? n : void 0;
    return { ...n, [e.$var]: r };
  }
  if (Nr(e)) {
    if (!Array.isArray(r) || r.length !== e.length) return;
    let w = n;
    for (let h = 0; h < e.length && w; h++) w = matchPattern(e[h], r[h], w);
    return w;
  }
  if (r === null || typeof r !== "object" || Array.isArray(r)) return;
  let s = e,
    i = n;
  for (let w of Object.keys(s)) {
    if (w === "__proto__") continue;
    let h = Object.hasOwn(r, w) ? r[w] : void 0;
    if (((i = matchPattern(s[w], h, i)), !i)) return;
  }
  return i;
}
//@ chunk-y1shfdfm.js:15766-15893 placement
function rowToFact(e) {
  return {
    ...e.fact,
    addr: e.addr,
    by: e.by,
    in: e.in,
    status: e.status,
    ...(e.kind === "eval" && { value: e.value, error: e.error }),
  };
}
//@ chunk-y1shfdfm.js:15893-16028 placement
function hasPatternVariable(e) {
  if (e === null || typeof e !== "object") return !1;
  if (Lr(e)) return !0;
  if (Nr(e)) return e.some(hasPatternVariable);
  return Object.values(e).some(hasPatternVariable);
}
//@ chunk-y1shfdfm.js:16028-16073 placement
function Pt(e, r) {
  return matchPattern(e, rowToFact(r)) !== void 0;
}
//@ chunk-y1shfdfm.js:16073-16144 placement
function Ot(e) {
  return Object.prototype.hasOwnProperty.call(e, "status");
}
//@ chunk-y1shfdfm.js:16144-16185 placement
function Wt(e, r) {
  return ar(e, r) !== void 0;
}
//@ chunk-y1shfdfm.js:16185-16257 placement
function ar(e, r) {
  if (!Ot(e) && !vt.has(r.status)) return;
  return matchPattern(e, rowToFact(r));
}
//@ chunk-y1shfdfm.js:16257-16473 placement
var factSchema = DoctorLazy(() =>
    kt({ topic: o().min(1) }).refine((e) => !Object.keys(e).some((r) => Dr.has(r)), {
      message: "a fact may not carry a reserved key",
    }),
  ),
  Ct = DoctorLazy(() => {
    let e = aA(() => Ue([o(), E(), M(), zg(), A(e), pe(o(), e)]));
    return pe(o(), e);
  });
//@ chunk-y1shfdfm.js:16473-16841 placement
function parseFact(e) {
  let safeParse = factSchema().safeParse(e);
  if (safeParse.success) return safeParse.data;
  let n = e !== null && typeof e === "object" ? Object.keys(e).find((s) => Dr.has(s)) : void 0;
  if (n !== void 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `a fact may not carry \`${n}\` \u2014 the host sets it on the row`,
      "world: fact carries a reserved key",
    );
  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    "a fact must be an object with a non-empty string `topic`",
    "world: not a fact",
  );
}
//@ chunk-y1shfdfm.js:16841-16915 placement
function $r(e) {
  try {
    return truncateMiddle(errorMessage(e));
  } catch {
    return "non-stringifiable error";
  }
}
/**
 * 工作流 world 存储：行、规则、触发、评估控制器与父子关系，实现 put/retract/read 与规则触发。
 */
//@ chunk-y1shfdfm.js:16915-25123 placement
class WorldStore {
  rows = [];
  rules = new Map();
  fired = new Set();
  evalControllers = new Map();
  firingsInFlight = new Map();
  childrenOf = new Map();
  pendingIn = new Map();
  rowsUnder = new Map();
  idleWaiters = new Map();
  listeners = new Set();
  maxRows;
  maxRowsPerScope;
  schedule;
  constructor(e = {}) {
    ((this.maxRows = e.maxRows ?? St),
      (this.maxRowsPerScope = e.maxRowsPerScope ?? It),
      (this.schedule = e.schedule ?? ((r) => this.yieldingSchedule(r))));
  }
  sinceYield = 0;
  yieldWatch = !1;
  backlog;
  yieldingSchedule(e) {
    if (this.backlog !== void 0) {
      this.backlog.push(e);
      return;
    }
    if (!this.yieldWatch)
      ((this.yieldWatch = !0),
        setImmediate(() => {
          ((this.yieldWatch = !1), (this.sinceYield = 0));
        }));
    if (++this.sinceYield < Ar) {
      queueMicrotask(e);
      return;
    }
    ((this.backlog = [e]), setImmediate(() => this.drainBacklog()));
  }
  drainBacklog() {
    let backlog = this.backlog;
    if (backlog === void 0) return;
    let splice = backlog.splice(0, Ar);
    if (((this.sinceYield = splice.length), !this.yieldWatch))
      ((this.yieldWatch = !0),
        setImmediate(() => {
          ((this.yieldWatch = !1), (this.sinceYield = 0));
        }));
    if (backlog.length === 0) this.backlog = void 0;
    else setImmediate(() => this.drainBacklog());
    for (let n of splice) n();
  }
  subscribe(e) {
    return (
      this.listeners.add(e),
      () => {
        this.listeners.delete(e);
      }
    );
  }
  get isFull() {
    return this.rows.length >= this.maxRows;
  }
  pending(e = HOST_SCOPE) {
    return this.pendingIn.get(e) ?? 0;
  }
  isIdle(e = HOST_SCOPE) {
    return this.pending(e) === 0;
  }
  within(e, r) {
    if (r === HOST_SCOPE) return !0;
    let n = e;
    while (n !== HOST_SCOPE) {
      if (n === r) return !0;
      n = this.rows[n]?.in ?? HOST_SCOPE;
    }
    return !1;
  }
  restore(e) {
    if (this.rows.length > 0)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "restore() on a non-empty world",
        "world: restore on a non-empty world",
      );
    for (let r of e) {
      if (r.addr !== this.rows.length)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `restore(): row ${r.addr} out of order`,
          "world: restore out of order",
        );
      (this.rows.push(r), this.topOf.push(r.in === HOST_SCOPE ? r.addr : this.topOf[r.in]));
      let n = this.childrenOf.get(r.in);
      if (n) n.push(r.addr);
      else this.childrenOf.set(r.in, [r.addr]);
      let topScopeOf = this.topScopeOf(r.in);
      if (topScopeOf !== HOST_SCOPE)
        this.rowsUnder.set(topScopeOf, (this.rowsUnder.get(topScopeOf) ?? 0) + 1);
    }
  }
  put(e, r, n = {}) {
    return this.append(e, r, "live", "put", this.writeScopeOf(n)).addr;
  }
  read(e, r = {}) {
    let scopeOf = this.scopeOf(r);
    return this.rows.filter((row) => this.within(row.addr, scopeOf) && Wt(e, row));
  }
  on(e, r, n, s = {}) {
    let writeScopeOf = this.writeScopeOf(s),
      append = this.append({ topic: "sub", pattern: e }, n, "live", "sub", writeScopeOf);
    if (append.status === "retracted") return append.addr;
    let h = { addr: append.addr, pattern: e, in: writeScopeOf, fn: r };
    if ((this.rules.set(append.addr, h), isAtLeastPattern(e)))
      return (this.maybeFireThreshold(h, e), append.addr);
    let k = this.rows.length;
    for (let y = 0; y < k; y++) {
      if (!this.rules.has(h.addr)) break;
      this.maybeFire(h, this.rows[y]);
    }
    return append.addr;
  }
  retract(e) {
    let r = this.rows[e];
    if (!r || r.status === "retracted") return !1;
    let n = [],
      s = [],
      i = [{ at: e, underEval: !1 }];
    while (i.length > 0) {
      let { at: at, underEval: underEval } = i.pop(),
        k = this.rows[at],
        y = underEval ? this.firingsInFlight.get(at) : void 0,
        R = !1;
      if (y) {
        for (let G of y) {
          if (G.heldAt !== void 0) {
            let P = this.rows[G.heldAt];
            if (P !== void 0 && !this.isRetractedScope(P.in)) continue;
          }
          ((G.released = !0), y.delete(G), (R = !0), this.adjustPending(at, -1));
        }
        if (y.size === 0) this.firingsInFlight.delete(at);
      }
      if (k.status === "retracted") {
        if (underEval) {
          if (R) s.push(at);
          for (let G of this.childrenOf.get(at) ?? []) i.push({ at: G, underEval: !0 });
        }
        continue;
      }
      ((k.status = "retracted"), this.rules.delete(at));
      let I = this.evalControllers.get(at),
        x = I !== void 0;
      if (I) (this.evalControllers.delete(at), I.abort(), this.adjustPending(at, -1));
      ((x ||= R || (y?.size ?? 0) > 0), n.push({ row: k, wasInFlight: x }));
      let V = underEval || k.kind === "eval";
      for (let G of this.childrenOf.get(at) ?? []) i.push({ at: G, underEval: V });
    }
    for (let w = n.length - 1; w >= 0; w--) {
      let { row: row, wasInFlight: wasInFlight } = n[w];
      if ((this.emit({ kind: "retracted", row: row }), this.deliver(row), wasInFlight)) s.push(row.addr);
    }
    for (let w of s) this.wakeIdle(w);
    return !0;
  }
  eval(e, r, n, s = {}) {
    let append = this.append(e, n, "pending", "eval", this.writeScopeOf(s));
    if (append.status !== "pending") return append.addr;
    let abortController = new AbortController();
    (this.evalControllers.set(append.addr, abortController), this.adjustPending(append.addr, 1));
    let h;
    try {
      h = Promise.resolve(r(abortController.signal));
    } catch (error) {
      h = Promise.reject(error);
    }
    return (
      h.then(
        (k) => this.settle(append, { value: k }),
        (k) => this.settle(append, { error: $r(k) }),
      ),
      append.addr
    );
  }
  settled(e) {
    let r = this.rows[e];
    if (!r)
      return Promise.reject(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `no row at ${e}`,
          "world: settled() on a missing row",
        ),
      );
    if (r.status !== "pending") return Promise.resolve(r);
    return new Promise((n) => {
      let subscribe = this.subscribe((i) => {
        if ((i.kind === "settled" || i.kind === "retracted") && i.row.addr === e) (subscribe(), n(i.row));
      });
    });
  }
  whenIdle(e = HOST_SCOPE) {
    if (this.isIdle(e)) return Promise.resolve();
    return new Promise((r) => {
      let n = this.idleWaiters.get(e);
      if (n) n.push(r);
      else this.idleWaiters.set(e, [r]);
    });
  }
  scopeOf(e) {
    let r = e.in ?? HOST_SCOPE;
    if (r !== HOST_SCOPE && !this.rows[r])
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `no row at ${r} to place in`,
        "world: placement names a missing row",
      );
    return r;
  }
  writeScopeOf(e) {
    let scopeOf = this.scopeOf(e);
    if (this.isRetractedScope(scopeOf))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `row ${scopeOf} is retracted; nothing can be placed inside it`,
        "world: placement inside a retracted scope",
      );
    return scopeOf;
  }
  isRetractedScope(e) {
    let r = e;
    while (r !== HOST_SCOPE) {
      let n = this.rows[r];
      if (!n) return !1;
      if (n.status === "retracted") return !0;
      r = n.in;
    }
    return !1;
  }
  append(e, r, n, s, i) {
    if (this.rows.length >= this.maxRows)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `world full (${this.maxRows} rows) \u2014 a rule is probably putting the fact it fires on`,
        "world: full",
      );
    let w = { addr: this.rows.length, kind: s, fact: e, by: r, in: i, at: Date.now(), status: n };
    (this.rows.push(w), this.topOf.push(i === HOST_SCOPE ? w.addr : this.topOf[i]));
    let h = this.childrenOf.get(i);
    if (h) h.push(w.addr);
    else this.childrenOf.set(i, [w.addr]);
    this.emit({ kind: "put", row: w });
    let topScopeOf = this.topScopeOf(i);
    if (topScopeOf !== HOST_SCOPE) {
      let y = (this.rowsUnder.get(topScopeOf) ?? 0) + 1;
      if ((this.rowsUnder.set(topScopeOf, y), y > this.maxRowsPerScope)) {
        if (
          (logForDebugging(
            `world: scope ${topScopeOf} exceeded ${this.maxRowsPerScope} rows \u2014 a rule is probably putting the fact it fires on; retracting it`,
            { level: "warn" },
          ),
          this.emit({ kind: "runaway", scope: topScopeOf }),
          this.rows[topScopeOf].status !== "retracted")
        )
          this.retract(topScopeOf);
      }
    }
    return (this.deliver(w), w);
  }
  topOf = [];
  topScopeOf(e) {
    return e === HOST_SCOPE ? HOST_SCOPE : this.topOf[e];
  }
  settle(e, r) {
    if (e.status !== "pending") return;
    if ((this.evalControllers.delete(e.addr), "error" in r)) ((e.status = "failed"), (e.error = r.error));
    else ((e.status = "done"), (e.value = r.value));
    (this.adjustPending(e.addr, -1),
      this.emit({ kind: "settled", row: e }),
      this.deliver(e),
      this.wakeIdle(e.addr));
  }
  deliver(e) {
    for (let r of Array.from(this.rules.values())) if (this.rules.has(r.addr)) this.maybeFire(r, e);
  }
  maybeFire(e, r) {
    if (isAtLeastPattern(e.pattern)) {
      if (this.within(r.addr, e.in) && Pt(e.pattern.of, r)) this.maybeFireThreshold(e, e.pattern);
      return;
    }
    if (!this.within(r.addr, e.in)) return;
    let n = ar(e.pattern, r);
    if (!n) return;
    let s = `${e.addr}:${r.addr}:${r.status}`;
    if (this.fired.has(s)) return;
    (this.fired.add(s), this.fire(e, r, n, r.addr));
  }
  maybeFireThreshold(e, r) {
    let n = new Map();
    for (let row of this.rows) {
      if (!this.within(row.addr, e.in)) continue;
      let i = ar(r.of, row);
      if (!i) continue;
      let w = jsonStringify(i) ?? "",
        h = n.get(w);
      if (h) h.rows.push(row);
      else n.set(w, { bindings: i, rows: [row] });
    }
    if (n.size === 0 && !hasPatternVariable(r.of)) n.set("{}", { bindings: {}, rows: [] });
    for (let [s, i] of n) {
      if (i.rows.length < r.$atleast) continue;
      let w = `${e.addr}:group:${s}`;
      if (this.fired.has(w)) continue;
      (this.fired.add(w), this.fire(e, i.rows, i.bindings, i.rows[0]?.addr ?? -1));
    }
  }
  supportOf(e, r) {
    let n = Fr(r) ? r : [r];
    if (n.length === 0) return e.in;
    let s = new Set();
    for (let addr = n[0].addr; addr !== e.in && addr !== HOST_SCOPE; addr = this.rows[addr].in) s.add(addr);
    s.add(e.in);
    let addr = n[0].addr;
    for (let h = 1; h < n.length; h++) {
      let addr_2 = n[h].addr;
      while (!s.has(addr_2)) addr_2 = this.rows[addr_2].in;
      for (let y = addr; y !== addr_2; y = this.rows[y].in) s.delete(y);
      addr = addr_2;
    }
    let w = addr;
    while (w !== e.in && this.rows[w].status === "retracted") w = this.rows[w].in;
    return w;
  }
  fire(e, r, n, s) {
    this.adjustPending(e.addr, 1);
    let i = { released: !1, heldAt: void 0 },
      w = {
        keep: (R) => {
          i.heldAt = R;
        },
      },
      h = this.firingsInFlight.get(e.addr);
    if (h) h.add(i);
    else this.firingsInFlight.set(e.addr, new Set([i]));
    let k = Fr(r) ? void 0 : r,
      y = k?.status;
    new Promise((R) => this.schedule(R))
      .then(() => {
        if (k !== void 0 && k.status !== y) return;
        return e.fn(r, n, this.supportOf(e, r), w);
      })
      .catch((R) => {
        let I = $r(R);
        if (
          (logForDebugging(`world rule ${e.addr} threw on row ${s}: ${I}`, { level: "warn" }),
          !this.isRetractedScope(e.in))
        )
          try {
            this.append(
              { topic: "error", kind: "rule", rule: e.addr, on: s, message: I },
              "host",
              "live",
              "put",
              e.in,
            );
          } catch {}
      })
      .finally(() => {
        if (i.released) return;
        i.released = !0;
        let R = this.firingsInFlight.get(e.addr);
        if (R) {
          if ((R.delete(i), R.size === 0)) this.firingsInFlight.delete(e.addr);
        }
        (this.adjustPending(e.addr, -1), this.wakeIdle(e.addr));
      });
  }
  adjustPending(e, r) {
    let n = e;
    for (;;) {
      if ((this.pendingIn.set(n, (this.pendingIn.get(n) ?? 0) + r), n === HOST_SCOPE)) return;
      n = this.rows[n]?.in ?? HOST_SCOPE;
    }
  }
  wakeIdle(e) {
    let r = e;
    for (;;) {
      if (this.isIdle(r)) {
        let n = this.idleWaiters.get(r);
        if (n) {
          this.idleWaiters.delete(r);
          for (let s of n) s();
        }
      }
      if (r === HOST_SCOPE) return;
      r = this.rows[r]?.in ?? HOST_SCOPE;
    }
  }
  emit(e) {
    for (let listener of this.listeners)
      try {
        listener(e);
      } catch (error) {
        logForDebugging(`world listener threw: ${errorMessage(error)}`, { level: "warn" });
      }
  }
}

export {
  HOST_SCOPE,
  parseFact,
  parsePattern,
  parseAtLeastPattern,
  factSchema,
  ROW_STATUSES,
  WorldStore,
  parseWorkflowArgs,
};
