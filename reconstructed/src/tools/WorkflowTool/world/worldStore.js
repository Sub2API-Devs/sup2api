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
import {
  looseObject,
  string,
  lazy,
  union,
  E,
  M,
  zg,
  array,
  record,
} from "../../../../vendor/zod/v4/classic/schemas.js";
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
  let h = typeof e.name === "string" ? "_named" : "";
  let k = Array.isArray(w) ? "args_json_string_to_array" : "args_json_string_to_object";
  if (!r)
    return {
      input: e,
      shapeClass: `${k}${h}_detect_only`,
    };
  return {
    input: {
      ...e,
      args: w,
    },
    shapeClass: `${k}${h}`,
  };
}
//@ chunk-y1shfdfm.js:14329-14383 placement
var ROW_STATUSES = ["live", "pending", "done", "failed", "retracted"];
//@ chunk-y1shfdfm.js:14383-14392 placement
var HOST_SCOPE = -1;
//@ chunk-y1shfdfm.js:14392-14489 placement
/**
 * 判断对象是否为 {$var: name} 形式的模式变量。
 */
function isPatternVariable(e) {
  return e !== null && typeof e === "object" && !Array.isArray(e) && typeof e.$var === "string";
}
//@ chunk-y1shfdfm.js:14489-14590 placement
function isAtLeastPattern(e) {
  return e !== null && typeof e === "object" && !Array.isArray(e) && typeof e.$atleast === "number";
}
//@ chunk-y1shfdfm.js:14590-14795 placement
function parsePattern(e) {
  let r = worldFactSchema().safeParse(e);
  if (!r.success || isAtLeastPattern(r.data))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      'a pattern must be a JSON object (nested objects as subsets, arrays exact, v("x") binds)',
      "world: not a pattern",
    );
  return r.data;
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
    return {
      $atleast,
      of: parsePattern(e.of),
    };
  }
  return parsePattern(e);
}
//@ chunk-y1shfdfm.js:15012-15111 placement
/**
 * 事实里不允许使用的保留键（addr、by、status、at、in）。
 */
var RESERVED_FACT_KEYS = new Set(["addr", "by", "status", "at", "in"]);
var RULE_ROW_STATUSES = new Set(["live", "done"]);
var MAX_WORLD_ROWS = 1e5;
var MAX_ROWS_PER_SCOPE = 20000;
var YIELD_EVERY_N = 32;
//@ chunk-y1shfdfm.js:15111-15150 placement
/**
 * 是否为数组（模式解析时区分数组与对象）。
 */
function isArrayValue(e) {
  return Array.isArray(e);
}
//@ chunk-y1shfdfm.js:15150-15189 placement
/**
 * 是否为数组（读取参数时把单值包成数组）。
 */
function isArrayOrSingle(e) {
  return Array.isArray(e);
}
//@ chunk-y1shfdfm.js:15189-15241 placement
/**
 * 判断两个值是否相等（原始值相等或 JSON 序列化后相同）。
 */
function sameValue(e, r) {
  return Object.is(e, r) || jsonStringify(e) === jsonStringify(r);
}
//@ chunk-y1shfdfm.js:15241-15766 placement
/**
 * 把 world 模式（含 $atleast 等特殊项）与事实做结构匹配，返回绑定。
 */
function matchPattern(e, r, n = {}) {
  if (e === null || typeof e !== "object") return Object.is(e, r) ? n : undefined;
  if (isPatternVariable(e)) {
    if (r === undefined) return;
    if (Object.hasOwn(n, e.$var)) return sameValue(n[e.$var], r) ? n : undefined;
    return {
      ...n,
      [e.$var]: r,
    };
  }
  if (isArrayValue(e)) {
    if (!Array.isArray(r) || r.length !== e.length) return;
    let w = n;
    for (let j = 0; j < e.length && w; j++) w = matchPattern(e[j], r[j], w);
    return w;
  }
  if (r === null || typeof r !== "object" || Array.isArray(r)) return;
  let s = e;
  let i = n;
  for (let key of Object.keys(s)) {
    if (key === "__proto__") continue;
    let h = Object.hasOwn(r, key) ? r[key] : undefined;
    i = matchPattern(s[key], h, i);
    if (!i) return;
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
    ...(e.kind === "eval" && {
      value: e.value,
      error: e.error,
    }),
  };
}
//@ chunk-y1shfdfm.js:15893-16028 placement
function hasPatternVariable(e) {
  if (e === null || typeof e !== "object") return false;
  if (isPatternVariable(e)) return true;
  if (isArrayValue(e)) return e.some(hasPatternVariable);
  return Object.values(e).some(hasPatternVariable);
}
//@ chunk-y1shfdfm.js:16028-16073 placement
/**
 * 判断行是否匹配给定模式。
 */
function rowMatchesPattern(e, r) {
  return matchPattern(e, rowToFact(r)) !== undefined;
}
//@ chunk-y1shfdfm.js:16073-16144 placement
/**
 * 判断对象是否有 status 自有属性。
 */
function hasStatusField(e) {
  return Object.prototype.hasOwnProperty.call(e, "status");
}
//@ chunk-y1shfdfm.js:16144-16185 placement
/**
 * 行是否匹配模式（布尔形式）。
 */
function rowMatches(e, r) {
  return matchPatternOrUndefined(e, r) !== undefined;
}
//@ chunk-y1shfdfm.js:16185-16257 placement
/**
 * 行匹配模式时返回绑定结果，否则 undefined。
 */
function matchPatternOrUndefined(e, r) {
  if (!hasStatusField(e) && !RULE_ROW_STATUSES.has(r.status)) return;
  return matchPattern(e, rowToFact(r));
}
//@ chunk-y1shfdfm.js:16257-16473 placement
/**
 * world 事实的 schema（topic 必填且不得含保留键）。
 */
var factSchema = DoctorLazy(() =>
  looseObject({
    topic: string().min(1),
  }).refine((e) => !Object.keys(e).some((key) => RESERVED_FACT_KEYS.has(key)), {
    message: "a fact may not carry a reserved key",
  }),
);
var worldFactSchema = DoctorLazy(() => {
  let e = lazy(() => union([string(), E(), M(), zg(), array(e), record(string(), e)]));
  return record(string(), e);
});
//@ chunk-y1shfdfm.js:16473-16841 placement
function parseFact(e) {
  let r = factSchema().safeParse(e);
  if (r.success) return r.data;
  let n =
    e !== null && typeof e === "object"
      ? Object.keys(e).find((key) => RESERVED_FACT_KEYS.has(key))
      : undefined;
  if (n !== undefined)
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
/**
 * 把世界操作错误转成简短文本（无法转成字符串时给占位）。
 */
function describeWorldError(error) {
  try {
    return truncateMiddle(errorMessage(error));
  } catch {
    return "non-stringifiable error";
  }
}
//@ chunk-y1shfdfm.js:16915-25123 placement
/**
 * 工作流 world 存储：行、规则、触发、评估控制器与父子关系，实现 put/retract/read 与规则触发。
 */
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
    this.maxRows = e.maxRows ?? MAX_WORLD_ROWS;
    this.maxRowsPerScope = e.maxRowsPerScope ?? MAX_ROWS_PER_SCOPE;
    this.schedule = e.schedule ?? ((r) => this.yieldingSchedule(r));
  }
  sinceYield = 0;
  yieldWatch = false;
  backlog;
  yieldingSchedule(e) {
    if (this.backlog !== undefined) {
      this.backlog.push(e);
      return;
    }
    if (!this.yieldWatch) {
      this.yieldWatch = true;
      setImmediate(() => {
        this.yieldWatch = false;
        this.sinceYield = 0;
      });
    }
    if (++this.sinceYield < YIELD_EVERY_N) {
      queueMicrotask(e);
      return;
    }
    this.backlog = [e];
    setImmediate(() => this.drainBacklog());
  }
  drainBacklog() {
    let backlog = this.backlog;
    if (backlog === undefined) return;
    let r = backlog.splice(0, YIELD_EVERY_N);
    this.sinceYield = r.length;
    if (!this.yieldWatch) {
      this.yieldWatch = true;
      setImmediate(() => {
        this.yieldWatch = false;
        this.sinceYield = 0;
      });
    }
    if (backlog.length === 0) this.backlog = undefined;
    else setImmediate(() => this.drainBacklog());
    for (let n of r) n();
  }
  subscribe(e) {
    this.listeners.add(e);
    return () => {
      this.listeners.delete(e);
    };
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
    if (r === HOST_SCOPE) return true;
    let n = e;
    while (n !== HOST_SCOPE) {
      if (n === r) return true;
      n = this.rows[n]?.in ?? HOST_SCOPE;
    }
    return false;
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
      this.rows.push(r);
      this.topOf.push(r.in === HOST_SCOPE ? r.addr : this.topOf[r.in]);
      let n = this.childrenOf.get(r.in);
      if (n) n.push(r.addr);
      else this.childrenOf.set(r.in, [r.addr]);
      let s = this.topScopeOf(r.in);
      if (s !== HOST_SCOPE) this.rowsUnder.set(s, (this.rowsUnder.get(s) ?? 0) + 1);
    }
  }
  put(e, r, n = {}) {
    return this.append(e, r, "live", "put", this.writeScopeOf(n)).addr;
  }
  read(e, r = {}) {
    let n = this.scopeOf(r);
    return this.rows.filter((s) => this.within(s.addr, n) && rowMatches(e, s));
  }
  on(e, fn, n, s = {}) {
    let i = this.writeScopeOf(s);
    let w = this.append(
      {
        topic: "sub",
        pattern: e,
      },
      n,
      "live",
      "sub",
      i,
    );
    if (w.status === "retracted") return w.addr;
    let h = {
      addr: w.addr,
      pattern: e,
      in: i,
      fn,
    };
    this.rules.set(w.addr, h);
    if (isAtLeastPattern(e)) {
      this.maybeFireThreshold(h, e);
      return w.addr;
    }
    let k = this.rows.length;
    for (let j = 0; j < k; j++) {
      if (!this.rules.has(h.addr)) break;
      this.maybeFire(h, this.rows[j]);
    }
    return w.addr;
  }
  retract(e) {
    let r = this.rows[e];
    if (!r || r.status === "retracted") return false;
    let n = [];
    let s = [];
    let i = [
      {
        at: e,
        underEval: false,
      },
    ];
    while (i.length > 0) {
      let { at, underEval } = i.pop();
      let k = this.rows[at];
      let y = underEval ? this.firingsInFlight.get(at) : undefined;
      let R = false;
      if (y) {
        for (let G of y) {
          if (G.heldAt !== undefined) {
            let P = this.rows[G.heldAt];
            if (P !== undefined && !this.isRetractedScope(P.in)) continue;
          }
          G.released = true;
          y.delete(G);
          R = true;
          this.adjustPending(at, -1);
        }
        if (y.size === 0) this.firingsInFlight.delete(at);
      }
      if (k.status === "retracted") {
        if (underEval) {
          if (R) s.push(at);
          for (let at_2 of this.childrenOf.get(at) ?? [])
            i.push({
              at: at_2,
              underEval: true,
            });
        }
        continue;
      }
      k.status = "retracted";
      this.rules.delete(at);
      let I = this.evalControllers.get(at);
      let wasInFlight = I !== undefined;
      if (I) {
        this.evalControllers.delete(at);
        I.abort();
        this.adjustPending(at, -1);
      }
      wasInFlight ||= R || (y?.size ?? 0) > 0;
      n.push({
        row: k,
        wasInFlight,
      });
      let underEval_2 = underEval || k.kind === "eval";
      for (let at_2 of this.childrenOf.get(at) ?? [])
        i.push({
          at: at_2,
          underEval: underEval_2,
        });
    }
    for (let j = n.length - 1; j >= 0; j--) {
      let { row, wasInFlight } = n[j];
      this.emit({
        kind: "retracted",
        row,
      });
      this.deliver(row);
      if (wasInFlight) s.push(row.addr);
    }
    for (let w of s) this.wakeIdle(w);
    return true;
  }
  eval(e, r, n, s = {}) {
    let i = this.append(e, n, "pending", "eval", this.writeScopeOf(s));
    if (i.status !== "pending") return i.addr;
    let abortController = new AbortController();
    this.evalControllers.set(i.addr, abortController);
    this.adjustPending(i.addr, 1);
    let h;
    try {
      h = Promise.resolve(r(abortController.signal));
    } catch (error) {
      h = Promise.reject(error);
    }
    h.then(
      (value) =>
        this.settle(i, {
          value,
        }),
      (error) =>
        this.settle(i, {
          error: describeWorldError(error),
        }),
    );
    return i.addr;
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
    return new Promise((resolve) => {
      let s = this.subscribe((i) => {
        if ((i.kind === "settled" || i.kind === "retracted") && i.row.addr === e) {
          s();
          resolve(i.row);
        }
      });
    });
  }
  whenIdle(e = HOST_SCOPE) {
    if (this.isIdle(e)) return Promise.resolve();
    return new Promise((resolve) => {
      let n = this.idleWaiters.get(e);
      if (n) n.push(resolve);
      else this.idleWaiters.set(e, [resolve]);
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
    let r = this.scopeOf(e);
    if (this.isRetractedScope(r))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `row ${r} is retracted; nothing can be placed inside it`,
        "world: placement inside a retracted scope",
      );
    return r;
  }
  isRetractedScope(e) {
    let r = e;
    while (r !== HOST_SCOPE) {
      let n = this.rows[r];
      if (!n) return false;
      if (n.status === "retracted") return true;
      r = n.in;
    }
    return false;
  }
  append(fact, by, status, kind, i) {
    if (this.rows.length >= this.maxRows)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `world full (${this.maxRows} rows) \u2014 a rule is probably putting the fact it fires on`,
        "world: full",
      );
    let w = {
      addr: this.rows.length,
      kind,
      fact,
      by,
      in: i,
      at: Date.now(),
      status,
    };
    this.rows.push(w);
    this.topOf.push(i === HOST_SCOPE ? w.addr : this.topOf[i]);
    let h = this.childrenOf.get(i);
    if (h) h.push(w.addr);
    else this.childrenOf.set(i, [w.addr]);
    this.emit({
      kind: "put",
      row: w,
    });
    let k = this.topScopeOf(i);
    if (k !== HOST_SCOPE) {
      let y = (this.rowsUnder.get(k) ?? 0) + 1;
      this.rowsUnder.set(k, y);
      if (y > this.maxRowsPerScope) {
        logForDebugging(
          `world: scope ${k} exceeded ${this.maxRowsPerScope} rows \u2014 a rule is probably putting the fact it fires on; retracting it`,
          {
            level: "warn",
          },
        );
        this.emit({
          kind: "runaway",
          scope: k,
        });
        if (this.rows[k].status !== "retracted") this.retract(k);
      }
    }
    this.deliver(w);
    return w;
  }
  topOf = [];
  topScopeOf(e) {
    return e === HOST_SCOPE ? HOST_SCOPE : this.topOf[e];
  }
  settle(e, r) {
    if (e.status !== "pending") return;
    this.evalControllers.delete(e.addr);
    if ("error" in r) {
      e.status = "failed";
      e.error = r.error;
    } else {
      e.status = "done";
      e.value = r.value;
    }
    this.adjustPending(e.addr, -1);
    this.emit({
      kind: "settled",
      row: e,
    });
    this.deliver(e);
    this.wakeIdle(e.addr);
  }
  deliver(e) {
    for (let rule of Array.from(this.rules.values())) if (this.rules.has(rule.addr)) this.maybeFire(rule, e);
  }
  maybeFire(e, r) {
    if (isAtLeastPattern(e.pattern)) {
      if (this.within(r.addr, e.in) && rowMatchesPattern(e.pattern.of, r))
        this.maybeFireThreshold(e, e.pattern);
      return;
    }
    if (!this.within(r.addr, e.in)) return;
    let n = matchPatternOrUndefined(e.pattern, r);
    if (!n) return;
    let s = `${e.addr}:${r.addr}:${r.status}`;
    if (this.fired.has(s)) return;
    this.fired.add(s);
    this.fire(e, r, n, r.addr);
  }
  maybeFireThreshold(e, r) {
    let n = new Map();
    for (let s of this.rows) {
      if (!this.within(s.addr, e.in)) continue;
      let i = matchPatternOrUndefined(r.of, s);
      if (!i) continue;
      let w = jsonStringify(i) ?? "";
      let h = n.get(w);
      if (h) h.rows.push(s);
      else
        n.set(w, {
          bindings: i,
          rows: [s],
        });
    }
    if (n.size === 0 && !hasPatternVariable(r.of))
      n.set("{}", {
        bindings: {},
        rows: [],
      });
    for (let [s, i] of n) {
      if (i.rows.length < r.$atleast) continue;
      let w = `${e.addr}:group:${s}`;
      if (this.fired.has(w)) continue;
      this.fired.add(w);
      this.fire(e, i.rows, i.bindings, i.rows[0]?.addr ?? -1);
    }
  }
  supportOf(e, r) {
    let n = isArrayOrSingle(r) ? r : [r];
    if (n.length === 0) return e.in;
    let s = new Set();
    for (let addr = n[0].addr; addr !== e.in && addr !== HOST_SCOPE; addr = this.rows[addr].in) s.add(addr);
    s.add(e.in);
    let addr = n[0].addr;
    for (let j = 1; j < n.length; j++) {
      let addr_2 = n[j].addr;
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
    let i = {
      released: false,
      heldAt: undefined,
    };
    let w = {
      keep: (heldAt) => {
        i.heldAt = heldAt;
      },
    };
    let h = this.firingsInFlight.get(e.addr);
    if (h) h.add(i);
    else this.firingsInFlight.set(e.addr, new Set([i]));
    let k = isArrayOrSingle(r) ? undefined : r;
    let status = k?.status;
    new Promise((resolve) => this.schedule(resolve))
      .then(() => {
        if (k !== undefined && k.status !== status) return;
        return e.fn(r, n, this.supportOf(e, r), w);
      })
      .catch((error) => {
        let I = describeWorldError(error);
        logForDebugging(`world rule ${e.addr} threw on row ${s}: ${I}`, {
          level: "warn",
        });
        if (!this.isRetractedScope(e.in))
          try {
            this.append(
              {
                topic: "error",
                kind: "rule",
                rule: e.addr,
                on: s,
                message: I,
              },
              "host",
              "live",
              "put",
              e.in,
            );
          } catch {}
      })
      .finally(() => {
        if (i.released) return;
        i.released = true;
        let R = this.firingsInFlight.get(e.addr);
        if (R) {
          R.delete(i);
          if (R.size === 0) this.firingsInFlight.delete(e.addr);
        }
        this.adjustPending(e.addr, -1);
        this.wakeIdle(e.addr);
      });
  }
  adjustPending(e, r) {
    let n = e;
    for (;;) {
      this.pendingIn.set(n, (this.pendingIn.get(n) ?? 0) + r);
      if (n === HOST_SCOPE) return;
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
        logForDebugging(`world listener threw: ${errorMessage(error)}`, {
          level: "warn",
        });
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
