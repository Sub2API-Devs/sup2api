/**
 * tools/WorkflowTool/world/worldStore.ts
 *
 * 2.1.316 新增：工作流 world 存储（事实、模式匹配、规则触发）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-kgbsr4tm.js (22)
 * attribution: placement 22
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
  stringSchema,
  lazy,
  union,
  numberSchema,
  booleanSchema,
  nullSchema,
  array,
  record,
} from "../../../../vendor/zod/v4/classic/schemas.js";
import { truncateMiddle } from "../../../memdir/memoryTool.js";
import { logForDebugging } from "../../../utils/debug.js";

//@ chunk-kgbsr4tm.js:15076-15545 placement
function parseWorkflowArgs(rawInput, { apply }) {
  if (!isPlainObject(rawInput)) return null;
  let args = rawInput.args;
  if (typeof args !== "string") return null;
  let firstChar = args.trimStart()[0];
  if (firstChar !== "{" && firstChar !== "[") return null;
  let parsedArgs;
  try {
    parsedArgs = stripProtoKeys(jsonParse(args)).stripped;
  } catch {
    return null;
  }
  if (parsedArgs === null || typeof parsedArgs !== "object") return null;
  let namedSuffix = typeof rawInput.name === "string" ? "_named" : "";
  let shapeClass = Array.isArray(parsedArgs) ? "args_json_string_to_array" : "args_json_string_to_object";
  if (!apply)
    return {
      input: rawInput,
      shapeClass: `${shapeClass}${namedSuffix}_detect_only`,
    };
  return {
    input: {
      ...rawInput,
      args: parsedArgs,
    },
    shapeClass: `${shapeClass}${namedSuffix}`,
  };
}
//@ chunk-kgbsr4tm.js:15545-15599 placement
var ROW_STATUSES = ["live", "pending", "done", "failed", "retracted"];
//@ chunk-kgbsr4tm.js:15599-15608 placement
var HOST_SCOPE = -1;
//@ chunk-kgbsr4tm.js:15608-15705 placement
/**
 * 判断对象是否为 {$var: name} 形式的模式变量。
 */
function isPatternVariable(value) {
  return (
    value !== null && typeof value === "object" && !Array.isArray(value) && typeof value.$var === "string"
  );
}
//@ chunk-kgbsr4tm.js:15705-15806 placement
function isAtLeastPattern(value) {
  return (
    value !== null && typeof value === "object" && !Array.isArray(value) && typeof value.$atleast === "number"
  );
}
//@ chunk-kgbsr4tm.js:15806-16011 placement
function parsePattern(pattern) {
  let parsed = worldFactSchema().safeParse(pattern);
  if (!parsed.success || isAtLeastPattern(parsed.data))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      'a pattern must be a JSON object (nested objects as subsets, arrays exact, v("x") binds)',
      "world: not a pattern",
    );
  return parsed.data;
}
//@ chunk-kgbsr4tm.js:16011-16228 placement
function parseAtLeastPattern(pattern) {
  if (isAtLeastPattern(pattern)) {
    let $atleast = pattern.$atleast;
    if (!Number.isSafeInteger($atleast) || $atleast < 0)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "atleast(N, pattern): N must be a non-negative integer",
        "world: bad threshold count",
      );
    return {
      $atleast,
      of: parsePattern(pattern.of),
    };
  }
  return parsePattern(pattern);
}
//@ chunk-kgbsr4tm.js:16228-16327 placement
/**
 * 事实里不允许使用的保留键（addr、by、status、at、in）。
 */
var RESERVED_FACT_KEYS = new Set(["addr", "by", "status", "at", "in"]);
var RULE_ROW_STATUSES = new Set(["live", "done"]);
var MAX_WORLD_ROWS = 1e5;
var MAX_ROWS_PER_SCOPE = 20000;
var YIELD_EVERY_N = 32;
//@ chunk-kgbsr4tm.js:16327-16366 placement
/**
 * 是否为数组（模式解析时区分数组与对象）。
 */
function isArrayValue(value) {
  return Array.isArray(value);
}
//@ chunk-kgbsr4tm.js:16366-16405 placement
/**
 * 是否为数组（读取参数时把单值包成数组）。
 */
function isArrayOrSingle(value) {
  return Array.isArray(value);
}
//@ chunk-kgbsr4tm.js:16405-16457 placement
/**
 * 判断两个值是否相等（原始值相等或 JSON 序列化后相同）。
 */
function sameValue(left, right) {
  return Object.is(left, right) || jsonStringify(left) === jsonStringify(right);
}
//@ chunk-kgbsr4tm.js:16457-16982 placement
/**
 * 把 world 模式（含 $atleast 等特殊项）与事实做结构匹配，返回绑定。
 */
function matchPattern(pattern, value, bindings = {}) {
  if (pattern === null || typeof pattern !== "object")
    return Object.is(pattern, value) ? bindings : undefined;
  if (isPatternVariable(pattern)) {
    if (value === undefined) return;
    if (Object.hasOwn(bindings, pattern.$var))
      return sameValue(bindings[pattern.$var], value) ? bindings : undefined;
    return {
      ...bindings,
      [pattern.$var]: value,
    };
  }
  if (isArrayValue(pattern)) {
    if (!Array.isArray(value) || value.length !== pattern.length) return;
    let nextBindings = bindings;
    for (let j = 0; j < pattern.length && nextBindings; j++)
      nextBindings = matchPattern(pattern[j], value[j], nextBindings);
    return nextBindings;
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) return;
  let patternObject = pattern;
  let currentBindings = bindings;
  for (let key of Object.keys(patternObject)) {
    if (key === "__proto__") continue;
    let childValue = Object.hasOwn(value, key) ? value[key] : undefined;
    currentBindings = matchPattern(patternObject[key], childValue, currentBindings);
    if (!currentBindings) return;
  }
  return currentBindings;
}
//@ chunk-kgbsr4tm.js:16982-17109 placement
function rowToFact(row) {
  return {
    ...row.fact,
    addr: row.addr,
    by: row.by,
    in: row.in,
    status: row.status,
    ...(row.kind === "eval" && {
      value: row.value,
      error: row.error,
    }),
  };
}
//@ chunk-kgbsr4tm.js:17109-17244 placement
function hasPatternVariable(value) {
  if (value === null || typeof value !== "object") return false;
  if (isPatternVariable(value)) return true;
  if (isArrayValue(value)) return value.some(hasPatternVariable);
  return Object.values(value).some(hasPatternVariable);
}
//@ chunk-kgbsr4tm.js:17244-17289 placement
/**
 * 判断行是否匹配给定模式。
 */
function rowMatchesPattern(pattern, row) {
  return matchPattern(pattern, rowToFact(row)) !== undefined;
}
//@ chunk-kgbsr4tm.js:17289-17360 placement
/**
 * 判断对象是否有 status 自有属性。
 */
function hasStatusField(pattern) {
  return Object.prototype.hasOwnProperty.call(pattern, "status");
}
//@ chunk-kgbsr4tm.js:17360-17401 placement
/**
 * 行是否匹配模式（布尔形式）。
 */
function rowMatches(pattern, row) {
  return matchPatternOrUndefined(pattern, row) !== undefined;
}
//@ chunk-kgbsr4tm.js:17401-17473 placement
/**
 * 行匹配模式时返回绑定结果，否则 undefined。
 */
function matchPatternOrUndefined(pattern, row) {
  if (!hasStatusField(pattern) && !RULE_ROW_STATUSES.has(row.status)) return;
  return matchPattern(pattern, rowToFact(row));
}
//@ chunk-kgbsr4tm.js:17473-17689 placement
/**
 * world 事实的 schema（topic 必填且不得含保留键）。
 */
var factSchema = DoctorLazy(() =>
  looseObject({
    topic: stringSchema().min(1),
  }).refine((fact) => !Object.keys(fact).some((key) => RESERVED_FACT_KEYS.has(key)), {
    message: "a fact may not carry a reserved key",
  }),
);
var worldFactSchema = DoctorLazy(() => {
  let worldValue = lazy(() =>
    union([
      stringSchema(),
      numberSchema(),
      booleanSchema(),
      nullSchema(),
      array(worldValue),
      record(stringSchema(), worldValue),
    ]),
  );
  return record(stringSchema(), worldValue);
});
//@ chunk-kgbsr4tm.js:17689-18057 placement
function parseFact(fact) {
  let parsed = factSchema().safeParse(fact);
  if (parsed.success) return parsed.data;
  let reservedKey =
    fact !== null && typeof fact === "object"
      ? Object.keys(fact).find((key) => RESERVED_FACT_KEYS.has(key))
      : undefined;
  if (reservedKey !== undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `a fact may not carry \`${reservedKey}\` \u2014 the host sets it on the row`,
      "world: fact carries a reserved key",
    );
  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    "a fact must be an object with a non-empty string `topic`",
    "world: not a fact",
  );
}
//@ chunk-kgbsr4tm.js:18057-18131 placement
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
//@ chunk-kgbsr4tm.js:18131-26339 placement
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
  constructor(options = {}) {
    this.maxRows = options.maxRows ?? MAX_WORLD_ROWS;
    this.maxRowsPerScope = options.maxRowsPerScope ?? MAX_ROWS_PER_SCOPE;
    this.schedule = options.schedule ?? ((task) => this.yieldingSchedule(task));
  }
  sinceYield = 0;
  yieldWatch = false;
  backlog;
  yieldingSchedule(task) {
    if (this.backlog !== undefined) {
      this.backlog.push(task);
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
      queueMicrotask(task);
      return;
    }
    this.backlog = [task];
    setImmediate(() => this.drainBacklog());
  }
  drainBacklog() {
    let backlog = this.backlog;
    if (backlog === undefined) return;
    let batch = backlog.splice(0, YIELD_EVERY_N);
    this.sinceYield = batch.length;
    if (!this.yieldWatch) {
      this.yieldWatch = true;
      setImmediate(() => {
        this.yieldWatch = false;
        this.sinceYield = 0;
      });
    }
    if (backlog.length === 0) this.backlog = undefined;
    else setImmediate(() => this.drainBacklog());
    for (let task of batch) task();
  }
  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  get isFull() {
    return this.rows.length >= this.maxRows;
  }
  pending(scopeAddr = HOST_SCOPE) {
    return this.pendingIn.get(scopeAddr) ?? 0;
  }
  isIdle(scopeAddr = HOST_SCOPE) {
    return this.pending(scopeAddr) === 0;
  }
  within(addr, scopeAddr) {
    if (scopeAddr === HOST_SCOPE) return true;
    let ancestor = addr;
    while (ancestor !== HOST_SCOPE) {
      if (ancestor === scopeAddr) return true;
      ancestor = this.rows[ancestor]?.in ?? HOST_SCOPE;
    }
    return false;
  }
  restore(rows) {
    if (this.rows.length > 0)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "restore() on a non-empty world",
        "world: restore on a non-empty world",
      );
    for (let row of rows) {
      if (row.addr !== this.rows.length)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `restore(): row ${row.addr} out of order`,
          "world: restore out of order",
        );
      this.rows.push(row);
      this.topOf.push(row.in === HOST_SCOPE ? row.addr : this.topOf[row.in]);
      let children = this.childrenOf.get(row.in);
      if (children) children.push(row.addr);
      else this.childrenOf.set(row.in, [row.addr]);
      let topScope = this.topScopeOf(row.in);
      if (topScope !== HOST_SCOPE) this.rowsUnder.set(topScope, (this.rowsUnder.get(topScope) ?? 0) + 1);
    }
  }
  put(fact, by, placement = {}) {
    return this.append(fact, by, "live", "put", this.writeScopeOf(placement)).addr;
  }
  read(pattern, placement = {}) {
    let scopeAddr = this.scopeOf(placement);
    return this.rows.filter((row) => this.within(row.addr, scopeAddr) && rowMatches(pattern, row));
  }
  on(pattern, fn, by, placement = {}) {
    let scopeAddr = this.writeScopeOf(placement);
    let ruleRow = this.append(
      {
        topic: "sub",
        pattern,
      },
      by,
      "live",
      "sub",
      scopeAddr,
    );
    if (ruleRow.status === "retracted") return ruleRow.addr;
    let rule = {
      addr: ruleRow.addr,
      pattern,
      in: scopeAddr,
      fn,
    };
    this.rules.set(ruleRow.addr, rule);
    if (isAtLeastPattern(pattern)) {
      this.maybeFireThreshold(rule, pattern);
      return ruleRow.addr;
    }
    let rowCount = this.rows.length;
    for (let j = 0; j < rowCount; j++) {
      if (!this.rules.has(rule.addr)) break;
      this.maybeFire(rule, this.rows[j]);
    }
    return ruleRow.addr;
  }
  retract(addr) {
    let row = this.rows[addr];
    if (!row || row.status === "retracted") return false;
    let retractedRows = [];
    let wakeAddrs = [];
    let stack = [
      {
        at: addr,
        underEval: false,
      },
    ];
    while (stack.length > 0) {
      let { at, underEval } = stack.pop();
      let node = this.rows[at];
      let firings = underEval ? this.firingsInFlight.get(at) : undefined;
      let releasedAny = false;
      if (firings) {
        for (let firing of firings) {
          if (firing.heldAt !== undefined) {
            let heldRow = this.rows[firing.heldAt];
            if (heldRow !== undefined && !this.isRetractedScope(heldRow.in)) continue;
          }
          firing.released = true;
          firings.delete(firing);
          releasedAny = true;
          this.adjustPending(at, -1);
        }
        if (firings.size === 0) this.firingsInFlight.delete(at);
      }
      if (node.status === "retracted") {
        if (underEval) {
          if (releasedAny) wakeAddrs.push(at);
          for (let at_2 of this.childrenOf.get(at) ?? [])
            stack.push({
              at: at_2,
              underEval: true,
            });
        }
        continue;
      }
      node.status = "retracted";
      this.rules.delete(at);
      let controller = this.evalControllers.get(at);
      let wasInFlight = controller !== undefined;
      if (controller) {
        this.evalControllers.delete(at);
        controller.abort();
        this.adjustPending(at, -1);
      }
      wasInFlight ||= releasedAny || (firings?.size ?? 0) > 0;
      retractedRows.push({
        row: node,
        wasInFlight,
      });
      let underEval_2 = underEval || node.kind === "eval";
      for (let at_2 of this.childrenOf.get(at) ?? [])
        stack.push({
          at: at_2,
          underEval: underEval_2,
        });
    }
    for (let j = retractedRows.length - 1; j >= 0; j--) {
      let { row, wasInFlight } = retractedRows[j];
      this.emit({
        kind: "retracted",
        row,
      });
      this.deliver(row);
      if (wasInFlight) wakeAddrs.push(row.addr);
    }
    for (let addr of wakeAddrs) this.wakeIdle(addr);
    return true;
  }
  eval(fact, body, by, placement = {}) {
    let row = this.append(fact, by, "pending", "eval", this.writeScopeOf(placement));
    if (row.status !== "pending") return row.addr;
    let abortController = new AbortController();
    this.evalControllers.set(row.addr, abortController);
    this.adjustPending(row.addr, 1);
    let evaluation;
    try {
      evaluation = Promise.resolve(body(abortController.signal));
    } catch (error) {
      evaluation = Promise.reject(error);
    }
    evaluation.then(
      (value) =>
        this.settle(row, {
          value,
        }),
      (error) =>
        this.settle(row, {
          error: describeWorldError(error),
        }),
    );
    return row.addr;
  }
  settled(addr) {
    let row = this.rows[addr];
    if (!row)
      return Promise.reject(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `no row at ${addr}`,
          "world: settled() on a missing row",
        ),
      );
    if (row.status !== "pending") return Promise.resolve(row);
    return new Promise((resolve) => {
      let unsubscribe = this.subscribe((event) => {
        if ((event.kind === "settled" || event.kind === "retracted") && event.row.addr === addr) {
          unsubscribe();
          resolve(event.row);
        }
      });
    });
  }
  whenIdle(scopeAddr = HOST_SCOPE) {
    if (this.isIdle(scopeAddr)) return Promise.resolve();
    return new Promise((resolve) => {
      let waiters = this.idleWaiters.get(scopeAddr);
      if (waiters) waiters.push(resolve);
      else this.idleWaiters.set(scopeAddr, [resolve]);
    });
  }
  scopeOf(placement) {
    let scopeAddr = placement.in ?? HOST_SCOPE;
    if (scopeAddr !== HOST_SCOPE && !this.rows[scopeAddr])
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `no row at ${scopeAddr} to place in`,
        "world: placement names a missing row",
      );
    return scopeAddr;
  }
  writeScopeOf(placement) {
    let scopeAddr = this.scopeOf(placement);
    if (this.isRetractedScope(scopeAddr))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `row ${scopeAddr} is retracted; nothing can be placed inside it`,
        "world: placement inside a retracted scope",
      );
    return scopeAddr;
  }
  isRetractedScope(addr) {
    let cursor = addr;
    while (cursor !== HOST_SCOPE) {
      let row = this.rows[cursor];
      if (!row) return false;
      if (row.status === "retracted") return true;
      cursor = row.in;
    }
    return false;
  }
  append(fact, by, status, kind, scopeAddr) {
    if (this.rows.length >= this.maxRows)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `world full (${this.maxRows} rows) \u2014 a rule is probably putting the fact it fires on`,
        "world: full",
      );
    let row = {
      addr: this.rows.length,
      kind,
      fact,
      by,
      in: scopeAddr,
      at: Date.now(),
      status,
    };
    this.rows.push(row);
    this.topOf.push(scopeAddr === HOST_SCOPE ? row.addr : this.topOf[scopeAddr]);
    let children = this.childrenOf.get(scopeAddr);
    if (children) children.push(row.addr);
    else this.childrenOf.set(scopeAddr, [row.addr]);
    this.emit({
      kind: "put",
      row,
    });
    let topScope = this.topScopeOf(scopeAddr);
    if (topScope !== HOST_SCOPE) {
      let scopeRowCount = (this.rowsUnder.get(topScope) ?? 0) + 1;
      this.rowsUnder.set(topScope, scopeRowCount);
      if (scopeRowCount > this.maxRowsPerScope) {
        logForDebugging(
          `world: scope ${topScope} exceeded ${this.maxRowsPerScope} rows \u2014 a rule is probably putting the fact it fires on; retracting it`,
          {
            level: "warn",
          },
        );
        this.emit({
          kind: "runaway",
          scope: topScope,
        });
        if (this.rows[topScope].status !== "retracted") this.retract(topScope);
      }
    }
    this.deliver(row);
    return row;
  }
  topOf = [];
  topScopeOf(scopeAddr) {
    return scopeAddr === HOST_SCOPE ? HOST_SCOPE : this.topOf[scopeAddr];
  }
  settle(row, outcome) {
    if (row.status !== "pending") return;
    this.evalControllers.delete(row.addr);
    if ("error" in outcome) {
      row.status = "failed";
      row.error = outcome.error;
    } else {
      row.status = "done";
      row.value = outcome.value;
    }
    this.adjustPending(row.addr, -1);
    this.emit({
      kind: "settled",
      row,
    });
    this.deliver(row);
    this.wakeIdle(row.addr);
  }
  deliver(row) {
    for (let rule of Array.from(this.rules.values()))
      if (this.rules.has(rule.addr)) this.maybeFire(rule, row);
  }
  maybeFire(rule, row) {
    if (isAtLeastPattern(rule.pattern)) {
      if (this.within(row.addr, rule.in) && rowMatchesPattern(rule.pattern.of, row))
        this.maybeFireThreshold(rule, rule.pattern);
      return;
    }
    if (!this.within(row.addr, rule.in)) return;
    let bindings = matchPatternOrUndefined(rule.pattern, row);
    if (!bindings) return;
    let fireKey = `${rule.addr}:${row.addr}:${row.status}`;
    if (this.fired.has(fireKey)) return;
    this.fired.add(fireKey);
    this.fire(rule, row, bindings, row.addr);
  }
  maybeFireThreshold(rule, pattern) {
    let groups = new Map();
    for (let row of this.rows) {
      if (!this.within(row.addr, rule.in)) continue;
      let bindings = matchPatternOrUndefined(pattern.of, row);
      if (!bindings) continue;
      let groupKey = jsonStringify(bindings) ?? "";
      let group = groups.get(groupKey);
      if (group) group.rows.push(row);
      else
        groups.set(groupKey, {
          bindings,
          rows: [row],
        });
    }
    if (groups.size === 0 && !hasPatternVariable(pattern.of))
      groups.set("{}", {
        bindings: {},
        rows: [],
      });
    for (let [groupKey, group] of groups) {
      if (group.rows.length < pattern.$atleast) continue;
      let fireKey = `${rule.addr}:group:${groupKey}`;
      if (this.fired.has(fireKey)) continue;
      this.fired.add(fireKey);
      this.fire(rule, group.rows, group.bindings, group.rows[0]?.addr ?? -1);
    }
  }
  supportOf(rule, matched) {
    let rows = isArrayOrSingle(matched) ? matched : [matched];
    if (rows.length === 0) return rule.in;
    let ancestors = new Set();
    for (let addr = rows[0].addr; addr !== rule.in && addr !== HOST_SCOPE; addr = this.rows[addr].in)
      ancestors.add(addr);
    ancestors.add(rule.in);
    let addr = rows[0].addr;
    for (let j = 1; j < rows.length; j++) {
      let addr_2 = rows[j].addr;
      while (!ancestors.has(addr_2)) addr_2 = this.rows[addr_2].in;
      for (let cursor = addr; cursor !== addr_2; cursor = this.rows[cursor].in) ancestors.delete(cursor);
      addr = addr_2;
    }
    let support = addr;
    while (support !== rule.in && this.rows[support].status === "retracted") support = this.rows[support].in;
    return support;
  }
  fire(rule, matched, bindings, triggerAddr) {
    this.adjustPending(rule.addr, 1);
    let firing = {
      released: false,
      heldAt: undefined,
    };
    let journalHandle = {
      keep: (heldAt) => {
        firing.heldAt = heldAt;
      },
    };
    let firings = this.firingsInFlight.get(rule.addr);
    if (firings) firings.add(firing);
    else this.firingsInFlight.set(rule.addr, new Set([firing]));
    let stableRow = isArrayOrSingle(matched) ? undefined : matched;
    let status = stableRow?.status;
    new Promise((resolve) => this.schedule(resolve))
      .then(() => {
        if (stableRow !== undefined && stableRow.status !== status) return;
        return rule.fn(matched, bindings, this.supportOf(rule, matched), journalHandle);
      })
      .catch((error) => {
        let errorText = describeWorldError(error);
        logForDebugging(`world rule ${rule.addr} threw on row ${triggerAddr}: ${errorText}`, {
          level: "warn",
        });
        if (!this.isRetractedScope(rule.in))
          try {
            this.append(
              {
                topic: "error",
                kind: "rule",
                rule: rule.addr,
                on: triggerAddr,
                message: errorText,
              },
              "host",
              "live",
              "put",
              rule.in,
            );
          } catch {}
      })
      .finally(() => {
        if (firing.released) return;
        firing.released = true;
        let firings = this.firingsInFlight.get(rule.addr);
        if (firings) {
          firings.delete(firing);
          if (firings.size === 0) this.firingsInFlight.delete(rule.addr);
        }
        this.adjustPending(rule.addr, -1);
        this.wakeIdle(rule.addr);
      });
  }
  adjustPending(addr, delta) {
    let cursor = addr;
    for (;;) {
      this.pendingIn.set(cursor, (this.pendingIn.get(cursor) ?? 0) + delta);
      if (cursor === HOST_SCOPE) return;
      cursor = this.rows[cursor]?.in ?? HOST_SCOPE;
    }
  }
  wakeIdle(addr) {
    let cursor = addr;
    for (;;) {
      if (this.isIdle(cursor)) {
        let waiters = this.idleWaiters.get(cursor);
        if (waiters) {
          this.idleWaiters.delete(cursor);
          for (let resolve of waiters) resolve();
        }
      }
      if (cursor === HOST_SCOPE) return;
      cursor = this.rows[cursor]?.in ?? HOST_SCOPE;
    }
  }
  emit(event) {
    for (let listener of this.listeners)
      try {
        listener(event);
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
