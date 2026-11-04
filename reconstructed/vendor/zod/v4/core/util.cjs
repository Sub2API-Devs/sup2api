/**
 * zod/v4/core/util.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_core } from "./core.cjs";

//@ chunk-1ny7cxrt.js:89659-104048 cjs-fingerprint
var require_util = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.CONSTANT_CATCH =
    cjsExports.Class =
    cjsExports.BIGINT_FORMAT_RANGES =
    cjsExports.NUMBER_FORMAT_RANGES =
    cjsExports.primitiveTypes =
    cjsExports.propertyKeyTypes =
    cjsExports.getParsedType =
    cjsExports.allowsEval =
    cjsExports.captureStackTrace =
      undefined;
  cjsExports.assertEqual = assertEqual;
  cjsExports.assertNotEqual = assertNotEqual;
  cjsExports.toZod = toZod;
  cjsExports.assertIs = assertIs;
  cjsExports.assertNever = assertNever;
  cjsExports.assert = assert;
  cjsExports.getEnumValues = getEnumValues;
  cjsExports.joinValues = joinValues;
  cjsExports.jsonStringifyReplacer = jsonStringifyReplacer;
  cjsExports.cached = cached;
  cjsExports.nullish = nullish;
  cjsExports.cleanRegex = cleanRegex;
  cjsExports.floatSafeRemainder = floatSafeRemainder;
  cjsExports.defineLazy = defineLazy;
  cjsExports.objectClone = objectClone;
  cjsExports.assignProp = assignProp;
  cjsExports.rawShape = rawShape;
  cjsExports.mergeDefs = mergeDefs;
  cjsExports.cloneDef = cloneDef;
  cjsExports.getElementAtPath = getElementAtPath;
  cjsExports.promiseAllObject = promiseAllObject;
  cjsExports.randomString = randomString;
  cjsExports.esc = esc;
  cjsExports.slugify = slugify;
  cjsExports.isObject = isObject;
  cjsExports.isPlainObject = isPlainObject;
  cjsExports.shallowClone = shallowClone;
  cjsExports.numKeys = numKeys;
  cjsExports.escapeRegex = escapeRegex;
  cjsExports.clone = clone;
  cjsExports.normalizeParams = normalizeParams;
  cjsExports.createTransparentProxy = createTransparentProxy;
  cjsExports.stringifyPrimitive = stringifyPrimitive;
  cjsExports.optionalKeys = optionalKeys;
  cjsExports.pick = pick;
  cjsExports.omit = omit;
  cjsExports.extend = extend;
  cjsExports.safeExtend = safeExtend;
  cjsExports.merge = merge;
  cjsExports.partial = partial;
  cjsExports.required = required;
  cjsExports.aborted = aborted;
  cjsExports.explicitlyAborted = explicitlyAborted;
  cjsExports.prefixIssues = prefixIssues;
  cjsExports.unwrapMessage = unwrapMessage;
  cjsExports.attachSchema = attachSchema;
  cjsExports.finalizeIssue = finalizeIssue;
  cjsExports.getSizableOrigin = getSizableOrigin;
  cjsExports.codePointLength = codePointLength;
  cjsExports.getLengthableOrigin = getLengthableOrigin;
  cjsExports.parsedType = parsedType;
  cjsExports.issue = issue;
  cjsExports.cleanEnum = cleanEnum;
  cjsExports.base64ToUint8Array = base64ToUint8Array;
  cjsExports.uint8ArrayToBase64 = uint8ArrayToBase64;
  cjsExports.base64urlToUint8Array = base64urlToUint8Array;
  cjsExports.uint8ArrayToBase64url = uint8ArrayToBase64url;
  cjsExports.hexToUint8Array = hexToUint8Array;
  cjsExports.uint8ArrayToHex = uint8ArrayToHex;
  cjsExports.members = members;
  cjsExports.own = own;
  cjsExports.hide = hide;
  cjsExports.derived = derived;
  cjsExports.defineLazyInternal = defineLazyInternal;
  cjsExports.installLazyProp = installLazyProp;
  cjsExports.constantCatch = constantCatch;
  var core_js_1 = require_core();
  function assertEqual(val) {
    return val;
  }
  function assertNotEqual(val) {
    return val;
  }
  function toZod() {
    return (schema) => schema;
  }
  function assertIs(_arg) {}
  function assertNever(_x) {
    throw Error("Unexpected value in exhaustive check");
  }
  function assert(_) {}
  function getEnumValues(entries) {
    let numericValues = Object.values(entries).filter((v) => typeof v === "number");
    return Object.entries(entries)
      .filter(([k, _]) => numericValues.indexOf(+k) === -1)
      .map(([_, value]) => value);
  }
  function joinValues(array, separator = "|") {
    return array.map((val) => stringifyPrimitive(val)).join(separator);
  }
  function jsonStringifyReplacer(_, value) {
    if (typeof value === "bigint") return value.toString();
    return value;
  }
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
  function cached(getter) {
    return new Cached(getter);
  }
  function nullish(input) {
    return input === null || input === undefined;
  }
  function cleanRegex(source) {
    let start = source.startsWith("^") ? 1 : 0;
    let end = source.endsWith("$") ? source.length - 1 : source.length;
    return source.slice(start, end);
  }
  function floatSafeRemainder(val, step) {
    let ratio = val / step;
    let roundedRatio = Math.round(ratio);
    let tolerance = 4 * Number.EPSILON * Math.max(Math.abs(ratio), 1);
    if (Math.abs(ratio - roundedRatio) < tolerance) return 0;
    return ratio - roundedRatio;
  }
  var EVALUATING = Symbol("evaluating");
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
  function objectClone(obj) {
    return Object.create(Object.getPrototypeOf(obj), Object.getOwnPropertyDescriptors(obj));
  }
  function assignProp(target, prop, value) {
    Object.defineProperty(target, prop, {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }
  function rawShape(def) {
    let desc = Object.getOwnPropertyDescriptor(def, "shape");
    return desc?.get ? desc.get.raw : desc?.value;
  }
  function sourceShape(schema) {
    return rawShape(schema._zod.def) ?? schema._zod.def.shape;
  }
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
  function putProp(target, key, value) {
    if (key in target) assignProp(target, key, value);
    else target[key] = value;
  }
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
  function mirrorProps(target, source) {
    for (let key of Reflect.ownKeys(source)) {
      let desc = Object.getOwnPropertyDescriptor(source, key);
      if (!desc.enumerable) continue;
      if (desc.get) deferProp(target, key, () => source[key]);
      else putProp(target, key, desc.value);
    }
  }
  function mergeDefs(...defs) {
    let mergedDescriptors = {};
    for (let def of defs) {
      let descriptors = Object.getOwnPropertyDescriptors(def);
      Object.assign(mergedDescriptors, descriptors);
    }
    return Object.defineProperties({}, mergedDescriptors);
  }
  function cloneDef(schema) {
    return mergeDefs(schema._zod.def);
  }
  function getElementAtPath(obj, path) {
    if (!path) return obj;
    return path.reduce((acc, key) => acc?.[key], obj);
  }
  function promiseAllObject(promisesObj) {
    let keys = Object.keys(promisesObj);
    let promises = keys.map((key) => promisesObj[key]);
    return Promise.all(promises).then((results) => {
      let resolvedObj = {};
      for (let i = 0; i < keys.length; i++) resolvedObj[keys[i]] = results[i];
      return resolvedObj;
    });
  }
  function randomString(length = 10) {
    let str = "";
    for (let i = 0; i < length; i++) str += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
    return str;
  }
  function esc(str) {
    return JSON.stringify(str);
  }
  function slugify(input) {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  cjsExports.captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {};
  function isObject(data) {
    return typeof data === "object" && data !== null && !Array.isArray(data);
  }
  cjsExports.allowsEval = cached(() => {
    if (core_js_1.globalConfig.jitless) return false;
    if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) return false;
    try {
      new Function("");
      return true;
    } catch (_) {
      return false;
    }
  });
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
  function numKeys(data) {
    let keyCount = 0;
    for (let key in data) if (Object.prototype.hasOwnProperty.call(data, key)) keyCount++;
    return keyCount;
  }
  var getParsedType = (data) => {
    let dataType = typeof data;
    switch (dataType) {
      case "undefined":
        return "undefined";
      case "string":
        return "string";
      case "number":
        return Number.isNaN(data) ? "nan" : "number";
      case "boolean":
        return "boolean";
      case "function":
        return "function";
      case "bigint":
        return "bigint";
      case "symbol":
        return "symbol";
      case "object":
        if (Array.isArray(data)) return "array";
        if (data === null) return "null";
        if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function")
          return "promise";
        if (typeof Map !== "undefined" && data instanceof Map) return "map";
        if (typeof Set !== "undefined" && data instanceof Set) return "set";
        if (typeof Date !== "undefined" && data instanceof Date) return "date";
        if (typeof File !== "undefined" && data instanceof File) return "file";
        return "object";
      default:
        throw Error(`Unknown data type: ${dataType}`);
    }
  };
  cjsExports.getParsedType = getParsedType;
  cjsExports.propertyKeyTypes = new Set(["string", "number", "symbol"]);
  cjsExports.primitiveTypes = new Set(["string", "number", "bigint", "boolean", "symbol", "undefined"]);
  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function clone(inst, def, params) {
    let cl = new inst._zod.constr(def ?? inst._zod.def);
    if (!def || params?.parent) cl._zod.parent = inst;
    return cl;
  }
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
  function createTransparentProxy(getter) {
    let target;
    return new Proxy(
      {},
      {
        get(_, prop, receiver) {
          target ?? (target = getter());
          return Reflect.get(target, prop, receiver);
        },
        set(_, prop, value, receiver) {
          target ?? (target = getter());
          return Reflect.set(target, prop, value, receiver);
        },
        has(_, prop) {
          target ?? (target = getter());
          return Reflect.has(target, prop);
        },
        deleteProperty(_, prop) {
          target ?? (target = getter());
          return Reflect.deleteProperty(target, prop);
        },
        ownKeys(_) {
          target ?? (target = getter());
          return Reflect.ownKeys(target);
        },
        getOwnPropertyDescriptor(_, prop) {
          target ?? (target = getter());
          return Reflect.getOwnPropertyDescriptor(target, prop);
        },
        defineProperty(_, prop, descriptor) {
          target ?? (target = getter());
          return Reflect.defineProperty(target, prop, descriptor);
        },
      },
    );
  }
  function stringifyPrimitive(value) {
    if (typeof value === "bigint") return value.toString() + "n";
    if (typeof value === "string") return `"${value}"`;
    return `${value}`;
  }
  function optionalKeys(shape) {
    return Object.keys(shape).filter(
      (k) => shape[k]._zod.optin !== undefined && shape[k]._zod.optout === "optional",
    );
  }
  cjsExports.NUMBER_FORMAT_RANGES = (() => ({
    safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
    int32: [-2147483648, 2147483647],
    uint32: [0, 4294967295],
    float32: [-340282346638528860000000000000000000000, 340282346638528860000000000000000000000],
    float64: [-Number.MAX_VALUE, Number.MAX_VALUE],
  }))();
  cjsExports.BIGINT_FORMAT_RANGES = {
    int64: [BigInt("-9223372036854775808"), BigInt("9223372036854775807")],
    uint64: [BigInt(0), BigInt("18446744073709551615")],
  };
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
  function extended(schema, shape) {
    let newShape = {};
    mirrorShape(newShape, schema, Reflect.ownKeys(sourceShape(schema)));
    mirrorProps(newShape, shape);
    return newShape;
  }
  function safeExtend(schema, shape) {
    if (!isPlainObject(shape)) throw Error("Invalid input to safeExtend: expected a plain object");
    return clone(
      schema,
      mergeDefs(schema._zod.def, {
        shape: extended(schema, shape),
      }),
    );
  }
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
  function aborted(x, startIndex = 0) {
    if (x.aborted === true) return true;
    for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue !== true) return true;
    return false;
  }
  function explicitlyAborted(x, startIndex = 0) {
    if (x.aborted === true) return true;
    for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue === false) return true;
    return false;
  }
  function prefixIssues(path, issues) {
    return issues.map((iss) => {
      var _a;
      (_a = iss).path ?? (_a.path = []);
      iss.path.unshift(path);
      return iss;
    });
  }
  function unwrapMessage(message) {
    return typeof message === "string" ? message : message?.message;
  }
  function attachSchema(issues, start, inst) {
    var _a;
    for (let i = start; i < issues.length; i++) (_a = issues[i]).schema ?? (_a.schema = inst);
  }
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
  function getSizableOrigin(input) {
    if (input instanceof Set) return "set";
    if (input instanceof Map) return "map";
    if (input instanceof File) return "file";
    return "unknown";
  }
  var highSurrogate = /[\uD800-\uDBFF]/;
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
  function getLengthableOrigin(input) {
    if (Array.isArray(input)) return "array";
    if (typeof input === "string") return "string";
    return "unknown";
  }
  function parsedType(data) {
    let dataType = typeof data;
    switch (dataType) {
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
    return dataType;
  }
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
  function cleanEnum(obj) {
    return Object.entries(obj)
      .filter(([k, _]) => Number.isNaN(Number.parseInt(k, 10)))
      .map((el) => el[1]);
  }
  function base64ToUint8Array(base64) {
    let binaryString = atob(base64);
    let bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  }
  function uint8ArrayToBase64(bytes) {
    let binaryString = "";
    for (let i = 0; i < bytes.length; i++) binaryString += String.fromCharCode(bytes[i]);
    return btoa(binaryString);
  }
  function base64urlToUint8Array(base64url) {
    let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
    let padding = "=".repeat((4 - (base64.length % 4)) % 4);
    return base64ToUint8Array(base64 + padding);
  }
  function uint8ArrayToBase64url(bytes) {
    return uint8ArrayToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }
  function hexToUint8Array(hex) {
    let cleanHex = hex.replace(/^0x/, "");
    if (cleanHex.length % 2 !== 0) throw Error("Invalid hex string length");
    let bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) bytes[i / 2] = Number.parseInt(cleanHex.slice(i, i + 2), 16);
    return bytes;
  }
  function uint8ArrayToHex(bytes) {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  class Class {
    constructor(..._args) {}
  }
  cjsExports.Class = Class;
  function members(proto, table) {
    for (let key in table) {
      let desc = Object.getOwnPropertyDescriptor(table, key);
      if (desc.get)
        Object.defineProperty(proto, key, {
          ...desc,
          enumerable: false,
        });
      else defineBound(proto, key, desc.value);
    }
    for (let sym of Object.getOwnPropertySymbols(table)) defineBound(proto, sym, table[sym]);
  }
  function own(inst, key, value, enumerable = true) {
    Object.defineProperty(inst, key, {
      configurable: true,
      writable: true,
      enumerable,
      value,
    });
    return value;
  }
  function hide(inst, key, value) {
    return own(inst, key, value, false);
  }
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
  function defineBound(proto, key, fn) {
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
  function claim(inst, sentinel) {
    let proto = Object.getPrototypeOf(inst);
    return sentinel in proto ? undefined : proto;
  }
  var installing;
  var broke = false;
  var breaker = {
    configurable: true,
    get() {
      broke = true;
      return;
    },
  };
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
  cjsExports.CONSTANT_CATCH = "~constantCatch";
  function constantCatch(value) {
    let fn = () => value;
    fn[cjsExports.CONSTANT_CATCH] = true;
    return fn;
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
export { require_util };
