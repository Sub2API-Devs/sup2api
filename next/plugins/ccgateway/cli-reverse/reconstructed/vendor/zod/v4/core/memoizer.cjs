/**
 * zod/v4/core/memoizer.cjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1hnjmk23.js (1), chunk-m4y44r15.js (1)
 * attribution: cjs-fingerprint 1, esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { globalConfig, config } from "./core.js";
import { createMemoizer } from "./memoizer.js";
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_util } from "./util.cjs";

//@ chunk-m4y44r15.js:79897-79949 esm-fingerprint
function initMemoizer() {
  if (!globalConfig.memoizer)
    config({
      memoizer: createMemoizer(),
    });
}
//@ chunk-1hnjmk23.js:181771-186402 cjs-fingerprint
var require_memoizer = __commonJS(function (cjsExports) {
  var __createBinding =
    (cjsExports && cjsExports.__createBinding) ||
    (Object.create
      ? function (o_2, m, k, k2) {
          if (k2 === undefined) k2 = k;
          var desc = Object.getOwnPropertyDescriptor(m, k);
          if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable))
            desc = {
              enumerable: true,
              get: function () {
                return m[k];
              },
            };
          Object.defineProperty(o_2, k2, desc);
        }
      : function (o_2, m, k, k2) {
          if (k2 === undefined) k2 = k;
          o_2[k2] = m[k];
        });
  var __setModuleDefault =
    (cjsExports && cjsExports.__setModuleDefault) ||
    (Object.create
      ? function (o, v) {
          Object.defineProperty(o, "default", {
            enumerable: true,
            value: v,
          });
        }
      : function (o, v) {
          o.default = v;
        });
  var __importStar =
    (cjsExports && cjsExports.__importStar) ||
    function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod)
          if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
            __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.$ZodCyclicError = undefined;
  cjsExports.isRecursiveSchema = isRecursiveSchema;
  cjsExports.memoizer = memoizer;
  cjsExports.isBackEdge = isBackEdge;
  var util = __importStar(require_util());
  class $ZodCyclicError extends Error {
    constructor() {
      super("Cannot parse a reference cycle that closes through a transform");
      this.name = "ZodCyclicError";
    }
  }
  cjsExports.$ZodCyclicError = $ZodCyclicError;
  var STATE = "~memo";
  var NO_ISSUES = [];
  function isRef(value) {
    return value !== null && (typeof value === "object" || typeof value === "function");
  }
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
  var recursive = new WeakMap();
  var NONE = 0;
  var ASSUMED = 1;
  var PROVEN = 2;
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
        let raw = util.rawShape(def);
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
  function settle(inst, answer) {
    if (answer !== ASSUMED) recursive.set(inst, answer === PROVEN);
    return answer;
  }
  function isRecursiveSchema(inst) {
    return isRecursive(inst, new Set(), true) !== NONE;
  }
  function bucketFor(state, inst) {
    let bucket = state.buckets.get(inst);
    if (!bucket) {
      bucket = new WeakMap();
      state.buckets.set(inst, bucket);
    }
    return bucket;
  }
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
  function memoizer() {
    return memo;
  }
  function isBackEdge(ctx, value) {
    let backEdges = ctx[STATE]?.backEdges;
    return backEdges !== undefined && isRef(value) && backEdges.has(value);
  }
  (function () {
    var keys = Object.getOwnPropertyNames(cjsExports);
    for (var i = 0; i < keys.length; i++) {
      var desc = Object.getOwnPropertyDescriptor(cjsExports, keys[i]);
      if (!desc || !desc.get || !desc.configurable) continue;
      var value;
      try {
        value = desc.get();
      } catch (e) {
        continue;
      }
      if (value === undefined) continue;
      Object.defineProperty(cjsExports, keys[i], {
        value,
        writable: false,
        enumerable: desc.enumerable,
        configurable: false,
      });
    }
    Object.freeze(cjsExports);
  })();
});
export { require_memoizer, initMemoizer };
