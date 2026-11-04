/**
 * zod/v4/core/util.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-t7zrjgp6.js (62)
 * attribution: esm-fingerprint 54, esm-layout 8
 */
import { globalConfig } from "./core.js";
import { deferInit, beginDeferredInits } from "../../../../runtime/deferred-init.js";

// This module is the first evaluated of an import cycle of 2 modules closed by ./core.js;
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("vendor/zod/v4/core/core.js");
// This module is the first evaluated of an import cycle of 2 modules closed by ./core.js (in the hooks worker thread);
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("worker:vendor/zod/v4/core/core.js");
//@ chunk-t7zrjgp6.js:191-340 esm-fingerprint
function getEnumValues(entries) {
  let numericValues = Object.values(entries).filter((v) => typeof v === "number");
  return Object.entries(entries)
    .filter(([k, _]) => numericValues.indexOf(+k) === -1)
    .map(([_, value]) => value);
}
//@ chunk-t7zrjgp6.js:340-396 esm-fingerprint
function joinValues(array, separator = "|") {
  return array.map((val) => stringifyPrimitive(val)).join(separator);
}
//@ chunk-t7zrjgp6.js:396-466 esm-fingerprint
function jsonStringifyReplacer(_, value) {
  if (typeof value === "bigint") return value.toString();
  return value;
}
//@ chunk-t7zrjgp6.js:466-624 esm-fingerprint
class Cached {
  constructor(getter) {
    this._getter = getter;
    this._value = undefined;
  }
  get value() {
    let getter = this._getter;
    if (getter !== undefined) {
      this._value = getter();
      this._getter = undefined;
    }
    return this._value;
  }
}
//@ chunk-t7zrjgp6.js:624-656 esm-layout
function cached(getter) {
  return new Cached(getter);
}
//@ chunk-t7zrjgp6.js:656-700 esm-layout
function nullish(input) {
  return input === null || input === undefined;
}
//@ chunk-t7zrjgp6.js:700-802 esm-fingerprint
function cleanRegex(source) {
  let start = source.startsWith("^") ? 1 : 0;
  let end = source.endsWith("$") ? source.length - 1 : source.length;
  return source.slice(start, end);
}
//@ chunk-t7zrjgp6.js:802-928 esm-fingerprint
function floatSafeRemainder(val, step) {
  let ratio = val / step;
  let roundedRatio = Math.round(ratio);
  let tolerance = 4 * Number.EPSILON * Math.max(Math.abs(ratio), 1);
  if (Math.abs(ratio - roundedRatio) < tolerance) return 0;
  return ratio - roundedRatio;
}
//@ chunk-t7zrjgp6.js:928-955 esm-fingerprint
var EVALUATING = Symbol("evaluating");
//@ chunk-t7zrjgp6.js:955-1134 esm-fingerprint
function defineLazy(object, key, getter) {
  let value = undefined;
  Object.defineProperty(object, key, {
    get() {
      if (value === EVALUATING) return;
      if (value === undefined) {
        value = EVALUATING;
        value = getter();
      }
      return value;
    },
    set(v) {
      Object.defineProperty(object, key, {
        value: v,
      });
    },
    configurable: true,
  });
}
//@ chunk-t7zrjgp6.js:1134-1233 esm-fingerprint
function assignProp(target, prop, value) {
  Object.defineProperty(target, prop, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  });
}
//@ chunk-t7zrjgp6.js:1233-1331 esm-fingerprint
function rawShape(def) {
  let desc = Object.getOwnPropertyDescriptor(def, "shape");
  return desc?.get ? desc.get.raw : desc?.value;
}
//@ chunk-t7zrjgp6.js:1331-1386 esm-fingerprint
function sourceShape(schema) {
  return rawShape(schema._zod.def) ?? schema._zod.def.shape;
}
//@ chunk-t7zrjgp6.js:1386-1503 esm-fingerprint
function deferProp(target, key, getter) {
  Object.defineProperty(target, key, {
    get() {
      let value = getter();
      assignProp(this, key, value);
      return value;
    },
    enumerable: true,
    configurable: true,
  });
}
//@ chunk-t7zrjgp6.js:1503-1554 esm-layout
function putProp(target, key, value) {
  if (key in target) assignProp(target, key, value);
  else target[key] = value;
}
//@ chunk-t7zrjgp6.js:1554-1772 esm-fingerprint
function mirrorShape(target, source, keys, wrap) {
  let raw = sourceShape(source);
  for (let key of keys) {
    let desc = Object.getOwnPropertyDescriptor(raw, key);
    if (!desc.enumerable) continue;
    if (desc.get)
      deferProp(target, key, () => {
        let value = source._zod.def.shape[key];
        return wrap ? wrap(value, key) : value;
      });
    else putProp(target, key, wrap ? wrap(desc.value, key) : desc.value);
  }
}
//@ chunk-t7zrjgp6.js:1772-1936 esm-fingerprint
function mirrorProps(target, source) {
  for (let key of Reflect.ownKeys(source)) {
    let desc = Object.getOwnPropertyDescriptor(source, key);
    if (!desc.enumerable) continue;
    if (desc.get) deferProp(target, key, () => source[key]);
    else putProp(target, key, desc.value);
  }
}
//@ chunk-t7zrjgp6.js:1936-2078 esm-fingerprint
function mergeDefs(...defs) {
  let mergedDescriptors = {};
  for (let def of defs) {
    let descriptors = Object.getOwnPropertyDescriptors(def);
    Object.assign(mergedDescriptors, descriptors);
  }
  return Object.defineProperties({}, mergedDescriptors);
}
//@ chunk-t7zrjgp6.js:2078-2119 esm-layout
function cloneDef(key) {
  return JSON.stringify(key);
}
//@ chunk-t7zrjgp6.js:2119-2236 esm-fingerprint
function slugify(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
//@ chunk-t7zrjgp6.js:2236-2307 esm-fingerprint
var captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {};
//@ chunk-t7zrjgp6.js:2307-2379 esm-fingerprint
function isObject(data) {
  return typeof data === "object" && data !== null && !Array.isArray(data);
}
//@ chunk-t7zrjgp6.js:2379-2551 esm-fingerprint
var allowsEval; // deferred: uses cached of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-t7zrjgp6.js:2379", () => {
  allowsEval = cached(() => {
    if (globalConfig.jitless) return false;
    if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) return false;
    try {
      new Function("");
      return true;
    } catch (_) {
      return false;
    }
  });
});
//@ chunk-t7zrjgp6.js:2551-2792 esm-fingerprint
function isPlainObject(o) {
  if (isObject(o) === false) return false;
  let ctor = o.constructor;
  if (ctor === undefined) return true;
  if (typeof ctor !== "function") return true;
  let prot = ctor.prototype;
  if (isObject(prot) === false) return false;
  if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) return false;
  return true;
}
//@ chunk-t7zrjgp6.js:2792-2949 esm-layout
function shallowClone(o) {
  if (isPlainObject(o))
    return {
      ...o,
    };
  if (Array.isArray(o)) return [...o];
  if (o instanceof Map) return new Map(o);
  if (o instanceof Set) return new Set(o);
  return o;
}
//@ chunk-t7zrjgp6.js:2949-2995 esm-fingerprint
var propertyKeyTypes; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-t7zrjgp6.js:2949", () => {
  propertyKeyTypes = new Set(["string", "number", "symbol"]);
});
//@ chunk-t7zrjgp6.js:2995-3058 esm-fingerprint
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
//@ chunk-t7zrjgp6.js:3058-3159 esm-fingerprint
function clone(inst, def, params) {
  let cl = new inst._zod.constr(def ?? inst._zod.def);
  if (!def || params?.parent) cl._zod.parent = inst;
  return cl;
}
//@ chunk-t7zrjgp6.js:3159-3453 esm-fingerprint
function normalizeParams(_params) {
  let params = _params;
  if (!params) return {};
  if (typeof params === "string")
    return {
      error: () => params,
    };
  if (params?.message !== undefined) {
    if (params?.error !== undefined) throw Error("Cannot specify both `message` and `error` params");
    params.error = params.message;
  }
  delete params.message;
  if (typeof params.error === "string")
    return {
      ...params,
      error: () => params.error,
    };
  return params;
}
//@ chunk-t7zrjgp6.js:3453-3567 esm-fingerprint
function stringifyPrimitive(value) {
  if (typeof value === "bigint") return value.toString() + "n";
  if (typeof value === "string") return `"${value}"`;
  return `${value}`;
}
//@ chunk-t7zrjgp6.js:3567-3674 esm-fingerprint
function optionalKeys(shape) {
  return Object.keys(shape).filter(
    (k) => shape[k]._zod.optin !== undefined && shape[k]._zod.optout === "optional",
  );
}
//@ chunk-t7zrjgp6.js:3674-4066 esm-fingerprint
var NUMBER_FORMAT_RANGES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var BIGINT_FORMAT_RANGES;
deferInit("chunk-t7zrjgp6.js:3674", () => {
  NUMBER_FORMAT_RANGES = (() => ({
    safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
    int32: [-2147483648, 2147483647],
    uint32: [0, 4294967295],
    float32: [-340282346638528860000000000000000000000, 340282346638528860000000000000000000000],
    float64: [-Number.MAX_VALUE, Number.MAX_VALUE],
  }))();
  BIGINT_FORMAT_RANGES = {
    int64: [BigInt("-9223372036854775808"), BigInt("9223372036854775807")],
    uint64: [BigInt(0), BigInt("18446744073709551615")],
  };
});
//@ chunk-t7zrjgp6.js:4066-4272 esm-fingerprint
function pick(schema, mask) {
  let currDef = schema._zod.def;
  let checks = currDef.checks;
  if (checks && checks.length > 0)
    throw Error(".pick() cannot be used on object schemas containing refinements");
  let newShape = {};
  mirrorShape(newShape, schema, maskedKeys(schema, mask));
  return clone(
    schema,
    mergeDefs(currDef, {
      shape: newShape,
      checks: [],
    }),
  );
}
//@ chunk-t7zrjgp6.js:4272-4465 esm-fingerprint
function maskedKeys(schema, mask) {
  let raw = sourceShape(schema);
  let keys = [];
  for (let key of Reflect.ownKeys(mask)) {
    if (!Object.getOwnPropertyDescriptor(raw, key)?.enumerable)
      throw Error(`Unrecognized key: "${String(key)}"`);
    if (mask[key]) keys.push(key);
  }
  return keys;
}
//@ chunk-t7zrjgp6.js:4465-4727 esm-fingerprint
function omit(schema, mask) {
  let currDef = schema._zod.def;
  let checks = currDef.checks;
  if (checks && checks.length > 0)
    throw Error(".omit() cannot be used on object schemas containing refinements");
  let omitted = new Set(maskedKeys(schema, mask));
  let newShape = {};
  mirrorShape(
    newShape,
    schema,
    Reflect.ownKeys(sourceShape(schema)).filter((key) => !omitted.has(key)),
  );
  return clone(
    schema,
    mergeDefs(currDef, {
      shape: newShape,
      checks: [],
    }),
  );
}
//@ chunk-t7zrjgp6.js:4727-5107 esm-fingerprint
function extend(schema, shape) {
  if (!isPlainObject(shape)) throw Error("Invalid input to extend: expected a plain object");
  let checks = schema._zod.def.checks;
  if (checks && checks.length > 0) {
    let existingShape = sourceShape(schema);
    for (let key of Reflect.ownKeys(shape))
      if (Object.getOwnPropertyDescriptor(existingShape, key) !== undefined)
        throw Error(
          "Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.",
        );
  }
  return clone(
    schema,
    mergeDefs(schema._zod.def, {
      shape: extended(schema, shape),
    }),
  );
}
//@ chunk-t7zrjgp6.js:5107-5177 esm-fingerprint
function extended(schema, shape) {
  let newShape = {};
  mirrorShape(newShape, schema, Reflect.ownKeys(sourceShape(schema)));
  mirrorProps(newShape, shape);
  return newShape;
}
//@ chunk-t7zrjgp6.js:5177-5319 esm-fingerprint
function safeExtend(schema, shape) {
  if (!isPlainObject(shape)) throw Error("Invalid input to safeExtend: expected a plain object");
  return clone(
    schema,
    mergeDefs(schema._zod.def, {
      shape: extended(schema, shape),
    }),
  );
}
//@ chunk-t7zrjgp6.js:5319-5785 esm-fingerprint
function merge(a, b) {
  if (!b?._zod?.def)
    throw Error(
      "Invalid input to merge: expected an object schema. To merge a plain shape, use `.extend()`.",
    );
  if (a._zod.def.checks?.length)
    throw Error(
      ".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.",
    );
  let newShape = {};
  mirrorShape(newShape, a, Reflect.ownKeys(sourceShape(a)));
  mirrorShape(newShape, b, Reflect.ownKeys(sourceShape(b)));
  let def = mergeDefs(a._zod.def, {
    shape: newShape,
    get catchall() {
      return b._zod.def.catchall;
    },
    checks: b._zod.def.checks ?? [],
  });
  return clone(a, def);
}
//@ chunk-t7zrjgp6.js:5785-6116 esm-fingerprint
function partial(Class, schema, mask, name = "partial") {
  let checks = schema._zod.def.checks;
  if (checks && checks.length > 0)
    throw Error(`.${name}() cannot be used on object schemas containing refinements`);
  let selected = mask ? new Set(maskedKeys(schema, mask)) : undefined;
  let newShape = {};
  mirrorShape(
    newShape,
    schema,
    Reflect.ownKeys(sourceShape(schema)),
    Class &&
      ((value, key) =>
        selected && !selected.has(key)
          ? value
          : new Class({
              type: "optional",
              innerType: value,
            })),
  );
  return clone(
    schema,
    mergeDefs(schema._zod.def, {
      shape: newShape,
      checks: [],
    }),
  );
}
//@ chunk-t7zrjgp6.js:6116-6303 esm-fingerprint
function required(Class, schema, mask) {
  let selected = mask ? new Set(maskedKeys(schema, mask)) : undefined;
  let newShape = {};
  mirrorShape(newShape, schema, Reflect.ownKeys(sourceShape(schema)), (value, key) =>
    selected && !selected.has(key)
      ? value
      : new Class({
          type: "nonoptional",
          innerType: value,
        }),
  );
  return clone(
    schema,
    mergeDefs(schema._zod.def, {
      shape: newShape,
    }),
  );
}
//@ chunk-t7zrjgp6.js:6303-6432 esm-fingerprint
function aborted(x, startIndex = 0) {
  if (x.aborted === true) return true;
  for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue !== true) return true;
  return false;
}
//@ chunk-t7zrjgp6.js:6432-6561 esm-fingerprint
function explicitlyAborted(x, startIndex = 0) {
  if (x.aborted === true) return true;
  for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue === false) return true;
  return false;
}
//@ chunk-t7zrjgp6.js:6561-6656 esm-fingerprint
function prefixIssues(path, issues) {
  return issues.map((iss) => {
    var _a;
    (_a = iss).path ?? (_a.path = []);
    iss.path.unshift(path);
    return iss;
  });
}
//@ chunk-t7zrjgp6.js:6656-6710 esm-fingerprint
function unwrapMessage(message) {
  return typeof message === "string" ? message : message?.message;
}
//@ chunk-t7zrjgp6.js:6710-6793 esm-fingerprint
function attachSchema(issues, start, inst) {
  var _a;
  for (let i = start; i < issues.length; i++) (_a = issues[i]).schema ?? (_a.schema = inst);
}
//@ chunk-t7zrjgp6.js:6793-7348 esm-fingerprint
function finalizeIssue(iss, ctx, config) {
  var _a;
  let traits = iss.inst?._zod?.traits;
  if (traits?.has("$ZodType"))
    if (traits.has("$ZodCheck")) (_a = iss).schema ?? (_a.schema = iss.inst);
    else iss.schema = iss.inst;
  let schemaError = iss.schema !== iss.inst ? iss.schema?._zod.def?.error : undefined;
  let message = iss.message
    ? iss.message
    : (unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ??
      unwrapMessage(schemaError?.(iss)) ??
      unwrapMessage(ctx?.error?.(iss)) ??
      unwrapMessage(config.customError?.(iss)) ??
      unwrapMessage(config.localeError?.(iss)) ??
      "Invalid input");
  let full = {};
  for (let k of Object.keys(iss)) {
    if (k === "inst" || k === "schema" || k === "continue" || k === "input" || k === "__proto__") continue;
    full[k] = iss[k];
  }
  full.path ?? (full.path = []);
  full.message = message;
  if (ctx?.reportInput) full.input = iss.input;
  return full;
}
//@ chunk-t7zrjgp6.js:7348-7372 esm-fingerprint
var highSurrogate = /[\uD800-\uDBFF]/;
//@ chunk-t7zrjgp6.js:7372-7543 esm-fingerprint
function codePointLength(str) {
  let units = str.length;
  if (!highSurrogate.test(str)) return units;
  let count = units;
  for (let i = 0; i < units - 1; i++)
    if ((str.charCodeAt(i) & 64512) === 55296 && (str.charCodeAt(i + 1) & 64512) === 56320) {
      count--;
      i++;
    }
  return count;
}
//@ chunk-t7zrjgp6.js:7543-7647 esm-fingerprint
function getLengthableOrigin(input) {
  if (Array.isArray(input)) return "array";
  if (typeof input === "string") return "string";
  return "unknown";
}
//@ chunk-t7zrjgp6.js:7647-7940 esm-fingerprint
function parsedType(data) {
  let getParsedType = typeof data;
  switch (getParsedType) {
    case "number":
      return Number.isNaN(data) ? "nan" : "number";
    case "object": {
      if (data === null) return "null";
      if (Array.isArray(data)) return "array";
      let obj = data;
      if (obj && Object.getPrototypeOf(obj) !== Object.prototype && "constructor" in obj && obj.constructor)
        return obj.constructor.name;
    }
  }
  return getParsedType;
}
//@ chunk-t7zrjgp6.js:7940-8055 esm-fingerprint
function issue(...args) {
  let [iss, input, inst] = args;
  if (typeof iss === "string")
    return {
      message: iss,
      code: "custom",
      input,
      inst,
    };
  return {
    ...iss,
  };
}
//@ chunk-t7zrjgp6.js:8055-8264 esm-fingerprint
function members(proto, table) {
  for (let key in table) {
    let desc = Object.getOwnPropertyDescriptor(table, key);
    if (desc.get)
      Object.defineProperty(proto, key, {
        ...desc,
        enumerable: false,
      });
    else defineLazyProperty(proto, key, desc.value);
  }
  for (let sym of Object.getOwnPropertySymbols(table)) defineLazyProperty(proto, sym, table[sym]);
}
//@ chunk-t7zrjgp6.js:8264-8376 esm-fingerprint
function own(inst, key, value, enumerable = true) {
  Object.defineProperty(inst, key, {
    configurable: true,
    writable: true,
    enumerable,
    value,
  });
  return value;
}
//@ chunk-t7zrjgp6.js:8376-8417 esm-layout
function hide(inst, key, value) {
  return own(inst, key, value, false);
}
//@ chunk-t7zrjgp6.js:8417-8586 esm-fingerprint
function derived(computes, table) {
  for (let key in computes) {
    let compute = computes[key];
    Object.defineProperty(table, key, {
      configurable: true,
      enumerable: true,
      get() {
        return own(this, key, compute(this));
      },
      set(value) {
        own(this, key, value);
      },
    });
  }
  return table;
}
//@ chunk-t7zrjgp6.js:8586-8723 esm-fingerprint
function defineLazyProperty(proto, key, fn) {
  Object.defineProperty(proto, key, {
    configurable: true,
    get() {
      return this == null ? fn : own(this, key, fn.bind(this));
    },
    set(value) {
      own(this, key, value);
    },
  });
}
//@ chunk-t7zrjgp6.js:8723-8793 esm-layout
function claim(inst, sentinel) {
  let proto = Object.getPrototypeOf(inst);
  return sentinel in proto ? undefined : proto;
}
//@ chunk-t7zrjgp6.js:8793-8843 esm-layout
var installing;
var broke = false;
var breaker = {
  configurable: true,
  get() {
    broke = true;
    return;
  },
};
//@ chunk-t7zrjgp6.js:8843-9286 esm-fingerprint
function defineLazyInternal(inst, key, compute) {
  let proto = Object.getPrototypeOf(inst._zod);
  if (key in proto && installing !== inst._zod) {
    installing = undefined;
    return;
  }
  installing = inst._zod;
  Object.defineProperty(proto, key, {
    configurable: true,
    get() {
      Object.defineProperty(this, key, breaker);
      let outer = broke;
      broke = false;
      try {
        let value = compute(this);
        if (broke) delete this[key];
        else
          Object.defineProperty(this, key, {
            configurable: true,
            writable: true,
            value,
          });
        broke = broke || outer;
        return value;
      } catch (err) {
        delete this[key];
        broke = broke || outer;
        throw err;
      }
    },
    set(value) {
      Object.defineProperty(this, key, {
        configurable: true,
        writable: true,
        value,
      });
    },
  });
}
//@ chunk-t7zrjgp6.js:9286-9632 esm-fingerprint
function installLazyProp(inst, key, make, enumerable) {
  let proto = claim(inst, key);
  if (!proto) return;
  Object.defineProperty(proto, key, {
    configurable: true,
    get() {
      let desc = {
        configurable: true,
        writable: true,
        enumerable,
        value: undefined,
      };
      Object.defineProperty(this, key, desc);
      desc.value = make(this);
      Object.defineProperty(this, key, desc);
      return desc.value;
    },
    set(value) {
      Object.defineProperty(this, key, {
        configurable: true,
        writable: true,
        enumerable,
        value,
      });
    },
  });
}
//@ chunk-t7zrjgp6.js:9632-9655 esm-fingerprint
var CONSTANT_CATCH = "~constantCatch";
export {
  jsonStringifyReplacer,
  finalizeIssue,
  captureStackTrace,
  nullish,
  floatSafeRemainder,
  NUMBER_FORMAT_RANGES,
  codePointLength,
  getLengthableOrigin,
  escapeRegex,
  aborted,
  explicitlyAborted,
  attachSchema,
  hide,
  own,
  prefixIssues,
  optionalKeys,
  cached,
  defineLazyInternal,
  assignProp,
  isObject,
  cloneDef,
  allowsEval,
  cleanRegex,
  rawShape,
  isPlainObject,
  getEnumValues,
  propertyKeyTypes,
  defineLazy,
  issue,
  parsedType,
  stringifyPrimitive,
  joinValues,
  normalizeParams,
  slugify,
  mergeDefs,
  clone,
  derived,
  installLazyProp,
  extend,
  safeExtend,
  merge,
  pick,
  omit,
  partial,
  required,
  shallowClone,
  BIGINT_FORMAT_RANGES,
  CONSTANT_CATCH,
  members,
};
