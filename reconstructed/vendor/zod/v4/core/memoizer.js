/**
 * zod/v4/core/memoizer.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-7vp249v4.js (11)
 * attribution: esm-fingerprint 7, esm-layout 4
 */
import { rawShape } from "./util.js";

//@ chunk-7vp249v4.js:44335-44472 esm-fingerprint
class $ZodCyclicError extends Error {
  constructor() {
    super("Cannot parse a reference cycle that closes through a transform");
    this.name = "ZodCyclicError";
  }
}
//@ chunk-7vp249v4.js:44472-44493 esm-fingerprint
var STATE = "~memo";
var NO_ISSUES = [];
//@ chunk-7vp249v4.js:44493-44570 esm-fingerprint
function isRef(value) {
  return value !== null && (typeof value === "object" || typeof value === "function");
}
//@ chunk-7vp249v4.js:44570-44645 esm-fingerprint
function cloneIssues(issues) {
  return issues.map((iss) =>
    iss.path
      ? {
          ...iss,
          path: iss.path.slice(),
        }
      : {
          ...iss,
        },
  );
}
//@ chunk-7vp249v4.js:44645-44677 esm-layout
var recursive = new WeakMap();
var NONE = 0;
var ASSUMED = 1;
var PROVEN = 2;
//@ chunk-7vp249v4.js:44677-46254 esm-fingerprint
function isRecursive(inst, stack, resolve) {
  let cached = recursive.get(inst);
  if (cached !== undefined) return cached ? PROVEN : NONE;
  if (stack.has(inst)) return PROVEN;
  stack.add(inst);
  let result = NONE;
  let check = (child) => {
    if (result !== PROVEN && child?._zod) {
      let answer = isRecursive(child, stack, resolve);
      if (answer > result) result = answer;
    }
  };
  let shape = (sh, spread) => {
    let answer = NONE;
    for (let key of Reflect.ownKeys(sh)) {
      let desc = Object.getOwnPropertyDescriptor(sh, key);
      if (spread && !desc.enumerable) continue;
      let child = desc.get ? ASSUMED : desc.value?._zod ? isRecursive(desc.value, stack, resolve) : NONE;
      if (child > answer) answer = child;
    }
    return answer;
  };
  let merge = (answer) => {
    if (answer > result) result = answer;
  };
  let def = inst._zod.def;
  let kind = def.type;
  switch (kind) {
    case "object": {
      let raw = rawShape(def);
      merge(raw ? shape(raw, true) : ASSUMED);
      check(def.catchall);
      break;
    }
    case "properties":
      merge(shape(def.shape, false));
      break;
    case "array":
      check(def.element);
      break;
    case "tuple":
      for (let el of def.items) check(el);
      check(def.rest);
      break;
    case "record":
    case "map":
      check(def.keyType);
      check(def.valueType);
      break;
    case "set":
      check(def.valueType);
      break;
    case "union":
      for (let el of def.options) check(el);
      break;
    case "intersection":
      check(def.left);
      check(def.right);
      break;
    case "optional":
    case "nullable":
    case "default":
    case "prefault":
    case "catch":
    case "readonly":
    case "nonoptional":
    case "promise":
    case "success":
      check(def.innerType);
      break;
    case "pipe":
      check(def.in);
      check(def.out);
      break;
    case "function":
      check(def.input);
      check(def.output);
      break;
    case "lazy": {
      let inner = def._cachedInner ?? (resolve ? inst._zod.innerType : undefined);
      merge(inner ? isRecursive(inner, stack, false) : ASSUMED);
      break;
    }
    case "template_literal":
    case "string":
    case "number":
    case "int":
    case "boolean":
    case "bigint":
    case "symbol":
    case "undefined":
    case "null":
    case "void":
    case "never":
    case "any":
    case "unknown":
    case "date":
    case "nan":
    case "enum":
    case "literal":
    case "file":
    case "transform":
    case "custom":
      break;
    default:
      for (let key in def) {
        let desc = Object.getOwnPropertyDescriptor(def, key);
        if (!desc || desc.get) continue;
        let value = desc.value;
        if (!value || typeof value !== "object") continue;
        if (value._zod) check(value);
        else if (Array.isArray(value)) for (let el of value) check(el);
      }
  }
  stack.delete(inst);
  return settle(inst, result);
}
//@ chunk-7vp249v4.js:46254-46306 esm-layout
function settle(inst, answer) {
  if (answer !== ASSUMED) recursive.set(inst, answer === PROVEN);
  return answer;
}
//@ chunk-7vp249v4.js:46306-46394 esm-fingerprint
function bucketFor(state, inst) {
  let bucket = state.buckets.get(inst);
  if (!bucket) {
    bucket = new WeakMap();
    state.buckets.set(inst, bucket);
  }
  return bucket;
}
//@ chunk-7vp249v4.js:46394-47625 esm-layout
var handoff;
var open = [];
var memo = {
  alloc(_inst, payload, empty) {
    let bucket = handoff;
    if (!bucket) return empty;
    handoff = undefined;
    let entry = {
      value: empty,
      issues: null,
    };
    bucket.set(payload.value, entry);
    open.push(entry);
    return empty;
  },
  guard(inst) {
    var _a;
    (_a = inst._zod).deferred ?? (_a.deferred = []);
    inst._zod.deferred.push(() => {
      let base = inst._zod.parse;
      let wrapped = (payload, ctx) => {
        if (ctx.direction !== "backward" && isBackEdge(ctx, payload.value)) throw new $ZodCyclicError();
        return base(payload, ctx);
      };
      inst._zod.parse = wrapped;
      if (inst._zod.run === base) inst._zod.run = wrapped;
    });
  },
  attach(inst) {
    var _a;
    let isRecursiveInst;
    let rechecked = false;
    let lastCtx;
    let lastBucket;
    (_a = inst._zod).deferred ?? (_a.deferred = []);
    inst._zod.deferred.push(() => {
      let base = inst._zod.parse;
      let wrapped = (payload, ctx) => {
        if (isRecursiveInst === undefined) {
          let walked = isRecursive(inst, new Set(), false);
          if (walked === NONE) {
            inst._zod.parse = base;
            if (inst._zod.run === wrapped) inst._zod.run = base;
            return base(payload, ctx);
          }
          if (walked === PROVEN || rechecked) isRecursiveInst = true;
          else rechecked = true;
        }
        let input = payload.value;
        if (!isRef(input)) return base(payload, ctx);
        let state = ctx[STATE];
        if (!state) {
          state = {
            buckets: new WeakMap(),
            backEdges: undefined,
          };
          ctx[STATE] = state;
        }
        let bucket;
        if (lastCtx === ctx) bucket = lastBucket;
        else {
          bucket = bucketFor(state, inst);
          lastCtx = ctx;
          lastBucket = bucket;
        }
        let hit = bucket.get(input);
        if (hit) {
          payload.value = hit.value;
          if (hit.issues) {
            if (hit.issues.length) payload.issues.push(...cloneIssues(hit.issues));
          } else {
            payload.memo = true;
            state.backEdges ?? (state.backEdges = new WeakSet());
            state.backEdges.add(hit.value);
          }
          return payload;
        }
        handoff = bucket;
        let depth = open.length;
        let result = base(payload, ctx);
        handoff = undefined;
        let entry = open.length > depth ? open.pop() : undefined;
        if (result instanceof Promise)
          return result.then((r) => {
            if (entry) entry.issues = r.issues.length ? cloneIssues(r.issues) : NO_ISSUES;
            return r;
          });
        if (entry) entry.issues = result.issues.length ? cloneIssues(result.issues) : NO_ISSUES;
        return result;
      };
      inst._zod.parse = wrapped;
      if (inst._zod.run === base) inst._zod.run = wrapped;
    });
  },
};
//@ chunk-7vp249v4.js:47625-47649 esm-layout
function yn() {
  return memo;
}
//@ chunk-7vp249v4.js:47649-47724 esm-fingerprint
function isBackEdge(ctx, value) {
  let backEdges = ctx[STATE]?.backEdges;
  return backEdges !== undefined && isRef(value) && backEdges.has(value);
}
export { yn };
