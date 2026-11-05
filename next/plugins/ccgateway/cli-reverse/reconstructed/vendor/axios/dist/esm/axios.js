/**
 * axios/dist/esm/axios.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: axios@1.15.2
 * pieces: chunk-0yw3taqg.js (1), chunk-ww9agm6g.js (107)
 * attribution: esm-fingerprint 82, esm-layout 26
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __export, __toESM } from "../../../../runtime/bun-runtime.js";
import {
  hasBrowserEnv,
  hasStandardBrowserEnv,
  hasStandardBrowserWebWorkerEnv,
  _navigator,
  origin,
  platform,
  AxiosHeaders_default,
  buildFullPath,
  settle,
  progressEventReducer,
  CanceledError_default,
  parseProtocol,
  progressEventDecorator,
  isFunctionAlias,
  transformData,
  defaults_default,
  isCancel_2,
  VERSION,
  toFormDataNode$1,
} from "../node/axios.cjs";
import { require_form_data } from "../../../form-data/lib/form_data.js";
import { http_default } from "../../lib/adapters/http.js";
import { deferInit, runDeferredInits } from "../../../../runtime/deferred-init.js";

//@ chunk-ww9agm6g.js:45969-45979 esm-layout
var platformNamespace = {};
//@ chunk-ww9agm6g.js:45979-46107 esm-fingerprint
__export(platformNamespace, {
  hasBrowserEnv: () => hasBrowserEnv,
  hasStandardBrowserEnv: () => hasStandardBrowserEnv,
  hasStandardBrowserWebWorkerEnv: () => hasStandardBrowserWebWorkerEnv,
  navigator: () => _navigator,
  origin: () => origin,
});
//@ chunk-ww9agm6g.js:46107-46171 esm-layout
function bind(fn, thisArg) {
  return function () {
    return fn.apply(thisArg, arguments);
  };
}
//@ chunk-ww9agm6g.js:46171-46478 esm-fingerprint
var { toString: axiosUtilsHead } = Object.prototype;
var { getPrototypeOf } = Object;
var { iterator, toStringTag } = Symbol;
var kindOf = ((cache) => (thing) => {
  let str = axiosUtilsHead.call(thing);
  return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
})(Object.create(null));
var kindOfTest = (type) => {
  type = type.toLowerCase();
  return (thing) => kindOf(thing) === type;
};
var typeOfTest = (type) => (thing) => typeof thing === type;
var { isArray } = Array;
var isUndefined = typeOfTest("undefined");
//@ chunk-ww9agm6g.js:46478-46613 esm-fingerprint
function isBuffer(val) {
  return (
    val !== null &&
    !isUndefined(val) &&
    val.constructor !== null &&
    !isUndefined(val.constructor) &&
    isFunction(val.constructor.isBuffer) &&
    val.constructor.isBuffer(val)
  );
}
//@ chunk-ww9agm6g.js:46613-46638 esm-fingerprint
var isArrayBuffer; // deferred: uses axiosUtilsHead of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:46613", () => {
  isArrayBuffer = kindOfTest("ArrayBuffer");
});
//@ chunk-ww9agm6g.js:46638-46771 esm-fingerprint
function isArrayBufferView(val) {
  let result;
  if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView) result = ArrayBuffer.isView(val);
  else result = val && val.buffer && isArrayBuffer(val.buffer);
  return result;
}
//@ chunk-ww9agm6g.js:46771-47319 esm-layout
var isString; // deferred: uses axiosUtilsHead of its import cycle while loading; runs once the cycle is complete
var isFunction;
var isNumber;
var isObject;
var isBoolean;
var isPlainObject;
var isEmptyObject;
var isDate;
var isFile;
var isReactNativeBlob;
var isReactNative;
var isBlob;
var isFileList;
var isStream;
deferInit("chunk-ww9agm6g.js:46771", () => {
  isString = typeOfTest("string");
  isFunction = typeOfTest("function");
  isNumber = typeOfTest("number");
  isObject = (thing) => thing !== null && typeof thing === "object";
  isBoolean = (thing) => thing === true || thing === false;
  isPlainObject = (val) => {
    if (kindOf(val) !== "object") return false;
    let prototype = getPrototypeOf(val);
    return (
      (prototype === null || prototype === Object.prototype || Object.getPrototypeOf(prototype) === null) &&
      !(toStringTag in val) &&
      !(iterator in val)
    );
  };
  isEmptyObject = (val) => {
    if (!isObject(val) || isBuffer(val)) return false;
    try {
      return Object.keys(val).length === 0 && Object.getPrototypeOf(val) === Object.prototype;
    } catch (e) {
      return false;
    }
  };
  isDate = kindOfTest("Date");
  isFile = kindOfTest("File");
  isReactNativeBlob = (value) => !!(value && typeof value.uri !== "undefined");
  isReactNative = (formData) => formData && typeof formData.getParts !== "undefined";
  isBlob = kindOfTest("Blob");
  isFileList = kindOfTest("FileList");
  isStream = (val) => isObject(val) && isFunction(val.pipe);
});
//@ chunk-ww9agm6g.js:47319-47486 esm-layout
function getGlobal() {
  if (typeof globalThis !== "undefined") return globalThis;
  if (typeof self !== "undefined") return self;
  if (typeof window !== "undefined") return window;
  if (typeof global !== "undefined") return global;
  return {};
}
//@ chunk-ww9agm6g.js:47486-47945 esm-layout
var G; // deferred: uses getGlobal of its import cycle while loading; runs once the cycle is complete
var FormDataCtor;
var isFormData;
var isURLSearchParams;
var isReadableStream;
var isRequest;
var isResponse;
var isHeaders;
var trim;
deferInit("chunk-ww9agm6g.js:47486", () => {
  G = getGlobal();
  FormDataCtor = typeof G.FormData !== "undefined" ? G.FormData : undefined;
  isFormData = (thing) => {
    if (!thing) return false;
    if (FormDataCtor && thing instanceof FormDataCtor) return true;
    let proto = getPrototypeOf(thing);
    if (!proto || proto === Object.prototype) return false;
    if (!isFunction(thing.append)) return false;
    let kind = kindOf(thing);
    return (
      kind === "formdata" ||
      (kind === "object" && isFunction(thing.toString) && thing.toString() === "[object FormData]")
    );
  };
  isURLSearchParams = kindOfTest("URLSearchParams");
  [isReadableStream, isRequest, isResponse, isHeaders] = [
    "ReadableStream",
    "Request",
    "Response",
    "Headers",
  ].map(kindOfTest);
  trim = (str) => (str.trim ? str.trim() : str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, ""));
});
//@ chunk-ww9agm6g.js:47945-48244 esm-fingerprint
function forEach(obj, fn, { allOwnKeys = false } = {}) {
  if (obj === null || typeof obj === "undefined") return;
  let i_2;
  let l;
  if (typeof obj !== "object") obj = [obj];
  if (isArray(obj)) for (i_2 = 0, l = obj.length; i_2 < l; i_2++) fn.call(null, obj[i_2], i_2, obj);
  else {
    if (isBuffer(obj)) return;
    let keys = allOwnKeys ? Object.getOwnPropertyNames(obj) : Object.keys(obj);
    let len = keys.length;
    let key;
    for (i_2 = 0; i_2 < len; i_2++) {
      key = keys[i_2];
      fn.call(null, obj[key], key, obj);
    }
  }
}
//@ chunk-ww9agm6g.js:48244-48398 esm-fingerprint
function findKey(obj, key) {
  if (isBuffer(obj)) return null;
  key = key.toLowerCase();
  let keys = Object.keys(obj);
  let i = keys.length;
  let _key;
  while (i-- > 0) {
    _key = keys[i];
    if (key === _key.toLowerCase()) return _key;
  }
  return null;
}
//@ chunk-ww9agm6g.js:48398-48541 esm-layout
var _global; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var isContextDefined;
deferInit("chunk-ww9agm6g.js:48398", () => {
  _global = (() => {
    if (typeof globalThis !== "undefined") return globalThis;
    return typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : global;
  })();
  isContextDefined = (context) => !isUndefined(context) && context !== _global;
});
//@ chunk-ww9agm6g.js:48541-48903 esm-fingerprint
function merge() {
  let { caseless, skipUndefined } = (isContextDefined(this) && this) || {};
  let result = {};
  let assignValue = (val, key) => {
    if (key === "__proto__" || key === "constructor" || key === "prototype") return;
    let targetKey = (caseless && findKey(result, key)) || key;
    if (isPlainObject(result[targetKey]) && isPlainObject(val))
      result[targetKey] = merge(result[targetKey], val);
    else if (isPlainObject(val)) result[targetKey] = merge({}, val);
    else if (isArray(val)) result[targetKey] = val.slice();
    else if (!skipUndefined || !isUndefined(val)) result[targetKey] = val;
  };
  for (let i = 0, l = arguments.length; i < l; i++) if (arguments[i]) forEach(arguments[i], assignValue);
  return result;
}
//@ chunk-ww9agm6g.js:48903-50931 esm-fingerprint
var extend; // deferred: uses axiosUtilsHead of its import cycle while loading; runs once the cycle is complete
var stripBOM;
var inherits;
var toFlatObject;
var endsWith;
var toArray;
var isTypedArray;
var forEachEntry;
var matchAll;
var isHTMLForm;
var toCamelCase;
var hasOwnProperty;
var isRegExp;
var reduceDescriptors;
var freezeMethods;
var toObjectSet;
var noop;
var toFiniteNumber;
deferInit("chunk-ww9agm6g.js:48903", () => {
  extend = (a, b, thisArg, { allOwnKeys } = {}) => {
    forEach(
      b,
      (val, key) => {
        if (thisArg && isFunction(val))
          Object.defineProperty(a, key, {
            value: bind(val, thisArg),
            writable: true,
            enumerable: true,
            configurable: true,
          });
        else
          Object.defineProperty(a, key, {
            value: val,
            writable: true,
            enumerable: true,
            configurable: true,
          });
      },
      {
        allOwnKeys,
      },
    );
    return a;
  };
  stripBOM = (content) => {
    if (content.charCodeAt(0) === 65279) content = content.slice(1);
    return content;
  };
  inherits = (constructor, superConstructor, props, descriptors) => {
    constructor.prototype = Object.create(superConstructor.prototype, descriptors);
    Object.defineProperty(constructor.prototype, "constructor", {
      value: constructor,
      writable: true,
      enumerable: false,
      configurable: true,
    });
    Object.defineProperty(constructor, "super", {
      value: superConstructor.prototype,
    });
    if (props) Object.assign(constructor.prototype, props);
  };
  toFlatObject = (sourceObj, destObj, filter, propFilter) => {
    let props;
    let i_2;
    let prop;
    let merged = {};
    destObj = destObj || {};
    if (sourceObj == null) return destObj;
    do {
      props = Object.getOwnPropertyNames(sourceObj);
      i_2 = props.length;
      while (i_2-- > 0) {
        prop = props[i_2];
        if ((!propFilter || propFilter(prop, sourceObj, destObj)) && !merged[prop]) {
          destObj[prop] = sourceObj[prop];
          merged[prop] = true;
        }
      }
      sourceObj = filter !== false && getPrototypeOf(sourceObj);
    } while (sourceObj && (!filter || filter(sourceObj, destObj)) && sourceObj !== Object.prototype);
    return destObj;
  };
  endsWith = (str, searchString, position) => {
    str = String(str);
    if (position === undefined || position > str.length) position = str.length;
    position -= searchString.length;
    let lastIndex = str.indexOf(searchString, position);
    return lastIndex !== -1 && lastIndex === position;
  };
  toArray = (thing) => {
    if (!thing) return null;
    if (isArray(thing)) return thing;
    let i = thing.length;
    if (!isNumber(i)) return null;
    let arr = Array(i);
    while (i-- > 0) arr[i] = thing[i];
    return arr;
  };
  isTypedArray = (
    (TypedArray) => (thing) =>
      TypedArray && thing instanceof TypedArray
  )(typeof Uint8Array !== "undefined" && getPrototypeOf(Uint8Array));
  forEachEntry = (obj, fn) => {
    let generator = (obj && obj[iterator]).call(obj);
    let result;
    while ((result = generator.next()) && !result.done) {
      let pair = result.value;
      fn.call(obj, pair[0], pair[1]);
    }
  };
  matchAll = (regExp, str) => {
    let matches;
    let arr = [];
    while ((matches = regExp.exec(str)) !== null) arr.push(matches);
    return arr;
  };
  isHTMLForm = kindOfTest("HTMLFormElement");
  toCamelCase = (str) =>
    str.toLowerCase().replace(/[-_\s]([a-z\d])(\w*)/g, function (m, p1, p2) {
      return p1.toUpperCase() + p2;
    });
  hasOwnProperty = (
    ({ hasOwnProperty }) =>
    (obj, prop) =>
      hasOwnProperty.call(obj, prop)
  )(Object.prototype);
  isRegExp = kindOfTest("RegExp");
  reduceDescriptors = (obj, reducer) => {
    let descriptors = Object.getOwnPropertyDescriptors(obj);
    let reducedDescriptors = {};
    forEach(descriptors, (descriptor, name) => {
      let ret;
      if ((ret = reducer(descriptor, name, obj)) !== false) reducedDescriptors[name] = ret || descriptor;
    });
    Object.defineProperties(obj, reducedDescriptors);
  };
  freezeMethods = (obj) => {
    reduceDescriptors(obj, (descriptor, name) => {
      if (isFunction(obj) && ["arguments", "caller", "callee"].indexOf(name) !== -1) return false;
      let value = obj[name];
      if (!isFunction(value)) return;
      descriptor.enumerable = false;
      if ("writable" in descriptor) {
        descriptor.writable = false;
        return;
      }
      if (!descriptor.set)
        descriptor.set = () => {
          throw Error("Can not rewrite read-only method '" + name + "'");
        };
    });
  };
  toObjectSet = (arrayOrString, delimiter) => {
    let obj = {};
    let define = (arr) => {
      arr.forEach((value) => {
        obj[value] = true;
      });
    };
    if (isArray(arrayOrString)) define(arrayOrString);
    else define(String(arrayOrString).split(delimiter));
    return obj;
  };
  noop = () => {};
  toFiniteNumber = (value, defaultValue) =>
    value != null && Number.isFinite((value = +value)) ? value : defaultValue;
});
//@ chunk-ww9agm6g.js:50931-50998 esm-fingerprint
function isSpecCompliantForm(thing) {
  return !!(thing && isFunction(thing.append) && thing[toStringTag] === "FormData" && thing[iterator]);
}
//@ chunk-ww9agm6g.js:50998-52549 esm-fingerprint
var toJSONObject; // deferred: uses axiosUtilsHead of its import cycle while loading; runs once the cycle is complete
var isAsyncFn;
var isThenable;
var _setImmediate;
var asap;
var isIterable;
var utils$1;
deferInit("chunk-ww9agm6g.js:50998", () => {
  toJSONObject = (obj) => {
    let stack = [, , , , , , , , , ,];
    let visit = (source, i_2) => {
      if (isObject(source)) {
        if (stack.indexOf(source) >= 0) return;
        if (isBuffer(source)) return source;
        if (!("toJSON" in source)) {
          stack[i_2] = source;
          let target = isArray(source) ? [] : {};
          forEach(source, (value, key) => {
            let reducedValue = visit(value, i_2 + 1);
            if (!isUndefined(reducedValue)) target[key] = reducedValue;
          });
          stack[i_2] = undefined;
          return target;
        }
      }
      return source;
    };
    return visit(obj, 0);
  };
  isAsyncFn = kindOfTest("AsyncFunction");
  isThenable = (thing) =>
    thing && (isObject(thing) || isFunction(thing)) && isFunction(thing.then) && isFunction(thing.catch);
  _setImmediate = ((setImmediateSupported, postMessageSupported) => {
    if (setImmediateSupported) return setImmediate;
    return postMessageSupported
      ? ((token, callbacks) => {
          _global.addEventListener(
            "message",
            ({ source, data }) => {
              if (source === _global && data === token) {
                if (callbacks.length) callbacks.shift()();
              }
            },
            false,
          );
          return (cb) => {
            callbacks.push(cb);
            _global.postMessage(token, "*");
          };
        })(`axios@${Math.random()}`, [])
      : (cb) => setTimeout(cb);
  })(typeof setImmediate === "function", isFunction(_global.postMessage));
  asap =
    typeof queueMicrotask !== "undefined"
      ? queueMicrotask.bind(_global)
      : (typeof process !== "undefined" && process.nextTick) || _setImmediate;
  isIterable = (thing) => thing != null && isFunction(thing[iterator]);
  utils$1 = {
    isArray,
    isArrayBuffer,
    isBuffer,
    isFormData,
    isArrayBufferView,
    isString,
    isNumber,
    isBoolean,
    isObject,
    isPlainObject,
    isEmptyObject,
    isReadableStream,
    isRequest,
    isResponse,
    isHeaders,
    isUndefined,
    isDate,
    isFile,
    isReactNativeBlob,
    isReactNative,
    isBlob,
    isRegExp,
    isFunction,
    isStream,
    isURLSearchParams,
    isTypedArray,
    isFileList,
    forEach,
    merge,
    extend,
    trim,
    stripBOM,
    inherits,
    toFlatObject,
    kindOf,
    kindOfTest,
    endsWith,
    toArray,
    forEachEntry,
    matchAll,
    isHTMLForm,
    hasOwnProperty,
    hasOwnProp: hasOwnProperty,
    reduceDescriptors,
    freezeMethods,
    toObjectSet,
    toCamelCase,
    noop,
    toFiniteNumber,
    findKey,
    global: _global,
    isContextDefined,
    isSpecCompliantForm,
    toJSONObject,
    isAsyncFn,
    isThenable,
    setImmediate: _setImmediate,
    asap,
    isIterable,
  };
});
//@ chunk-ww9agm6g.js:52549-53275 esm-fingerprint
class AxiosError$1_2 extends Error {
  static from(error, code, config, request, response, customProps) {
    let axiosError = new AxiosError$1_2(error.message, code || error.code, config, request, response);
    axiosError.cause = error;
    axiosError.name = error.name;
    if (error.status != null && axiosError.status == null) axiosError.status = error.status;
    if (customProps) Object.assign(axiosError, customProps);
    return axiosError;
  }
  constructor(message, code, config, request, response) {
    super(message);
    Object.defineProperty(this, "message", {
      value: message,
      enumerable: true,
      writable: true,
      configurable: true,
    });
    this.name = "AxiosError";
    this.isAxiosError = true;
    if (code) this.code = code;
    if (config) this.config = config;
    if (request) this.request = request;
    if (response) {
      this.response = response;
      this.status = response.status;
    }
  }
  toJSON() {
    return {
      message: this.message,
      name: this.name,
      description: this.description,
      number: this.number,
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      config: utils$1.toJSONObject(this.config),
      code: this.code,
      status: this.status,
    };
  }
}
//@ chunk-ww9agm6g.js:53275-53321 esm-fingerprint
// deferred: uses AxiosError$1_2 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:53275", () => {
  AxiosError$1_2.ERR_BAD_OPTION_VALUE = "ERR_BAD_OPTION_VALUE";
});
//@ chunk-ww9agm6g.js:53321-53355 esm-fingerprint
// deferred: uses AxiosError$1_2 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:53321", () => {
  AxiosError$1_2.ERR_BAD_OPTION = "ERR_BAD_OPTION";
});
//@ chunk-ww9agm6g.js:53355-53385 esm-fingerprint
// deferred: uses AxiosError$1_2 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:53355", () => {
  AxiosError$1_2.ECONNABORTED = "ECONNABORTED";
});
//@ chunk-ww9agm6g.js:53385-53409 esm-fingerprint
// deferred: uses AxiosError$1_2 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:53385", () => {
  AxiosError$1_2.ETIMEDOUT = "ETIMEDOUT";
});
//@ chunk-ww9agm6g.js:53409-53437 esm-fingerprint
// deferred: uses AxiosError$1_2 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:53409", () => {
  AxiosError$1_2.ERR_NETWORK = "ERR_NETWORK";
});
//@ chunk-ww9agm6g.js:53437-53493 esm-fingerprint
// deferred: uses AxiosError$1_2 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:53437", () => {
  AxiosError$1_2.ERR_FR_TOO_MANY_REDIRECTS = "ERR_FR_TOO_MANY_REDIRECTS";
});
//@ chunk-ww9agm6g.js:53493-53527 esm-fingerprint
// deferred: uses AxiosError$1_2 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:53493", () => {
  AxiosError$1_2.ERR_DEPRECATED = "ERR_DEPRECATED";
});
//@ chunk-ww9agm6g.js:53527-53565 esm-fingerprint
// deferred: uses AxiosError$1_2 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:53527", () => {
  AxiosError$1_2.ERR_BAD_RESPONSE = "ERR_BAD_RESPONSE";
});
//@ chunk-ww9agm6g.js:53565-53601 esm-fingerprint
// deferred: uses AxiosError$1_2 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:53565", () => {
  AxiosError$1_2.ERR_BAD_REQUEST = "ERR_BAD_REQUEST";
});
//@ chunk-ww9agm6g.js:53601-53631 esm-fingerprint
// deferred: uses AxiosError$1_2 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:53601", () => {
  AxiosError$1_2.ERR_CANCELED = "ERR_CANCELED";
});
//@ chunk-ww9agm6g.js:53631-53667 esm-fingerprint
// deferred: uses AxiosError$1_2 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:53631", () => {
  AxiosError$1_2.ERR_NOT_SUPPORT = "ERR_NOT_SUPPORT";
});
//@ chunk-ww9agm6g.js:53667-53703 esm-fingerprint
// deferred: uses AxiosError$1_2 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:53667", () => {
  AxiosError$1_2.ERR_INVALID_URL = "ERR_INVALID_URL";
});
//@ chunk-ww9agm6g.js:53703-53765 esm-fingerprint
// deferred: uses AxiosError$1_2 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:53703", () => {
  AxiosError$1_2.ERR_FORM_DATA_DEPTH_EXCEEDED = "ERR_FORM_DATA_DEPTH_EXCEEDED";
});
//@ chunk-ww9agm6g.js:53765-53773 esm-layout
var AxiosError$1 = AxiosError$1_2;
//@ chunk-ww9agm6g.js:53773-53805 esm-layout
var import_form_data; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var FormData$1;
deferInit("chunk-ww9agm6g.js:53773", () => {
  import_form_data = __toESM(require_form_data(), 1);
  FormData$1 = import_form_data.default;
});
//@ chunk-ww9agm6g.js:53805-53860 esm-fingerprint
function isVisitable(thing) {
  return utils$1.isPlainObject(thing) || utils$1.isArray(thing);
}
//@ chunk-ww9agm6g.js:53860-53917 esm-fingerprint
function removeBrackets(key) {
  return utils$1.endsWith(key, "[]") ? key.slice(0, -2) : key;
}
//@ chunk-ww9agm6g.js:53917-54038 esm-fingerprint
function renderKey(path, key, dots) {
  if (!path) return key;
  return path
    .concat(key)
    .map(function (token, i) {
      token = removeBrackets(token);
      return !dots && i ? "[" + token + "]" : token;
    })
    .join(dots ? "." : "");
}
//@ chunk-ww9agm6g.js:54038-54086 esm-fingerprint
function isFlatArray(arr) {
  return utils$1.isArray(arr) && !arr.some(isVisitable);
}
//@ chunk-ww9agm6g.js:54086-54157 esm-fingerprint
var predicates; // deferred: uses toJSONObject of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:54086", () => {
  predicates = utils$1.toFlatObject(utils$1, {}, null, function (prop) {
    return /^is[A-Z]/.test(prop);
  });
});
//@ chunk-ww9agm6g.js:54157-55895 esm-fingerprint
function toFormData(obj, formData, options) {
  if (!utils$1.isObject(obj)) throw TypeError("target must be an object");
  formData = formData || new (FormData$1 || FormData)();
  options = utils$1.toFlatObject(
    options,
    {
      metaTokens: true,
      dots: false,
      indexes: false,
    },
    false,
    function (option, source) {
      return !utils$1.isUndefined(source[option]);
    },
  );
  let metaTokens = options.metaTokens;
  let visitor = options.visitor || defaultVisitor;
  let dots = options.dots;
  let indexes = options.indexes;
  let _Blob = options.Blob || (typeof Blob !== "undefined" && Blob);
  let maxDepth = options.maxDepth === undefined ? 100 : options.maxDepth;
  let useBlob = _Blob && utils$1.isSpecCompliantForm(formData);
  if (!utils$1.isFunction(visitor)) throw TypeError("visitor must be a function");
  function convertValue(value) {
    if (value === null) return "";
    if (utils$1.isDate(value)) return value.toISOString();
    if (utils$1.isBoolean(value)) return value.toString();
    if (!useBlob && utils$1.isBlob(value))
      throw new AxiosError$1("Blob is not supported. Use a Buffer instead.");
    if (utils$1.isArrayBuffer(value) || utils$1.isTypedArray(value))
      return useBlob && typeof Blob === "function" ? new Blob([value]) : Buffer.from(value);
    return value;
  }
  function defaultVisitor(value, key, path) {
    let arr = value;
    if (utils$1.isReactNative(formData) && utils$1.isReactNativeBlob(value)) {
      formData.append(renderKey(path, key, dots), convertValue(value));
      return false;
    }
    if (value && !path && typeof value === "object") {
      if (utils$1.endsWith(key, "{}")) {
        key = metaTokens ? key : key.slice(0, -2);
        value = JSON.stringify(value);
      } else if (
        (utils$1.isArray(value) && isFlatArray(value)) ||
        ((utils$1.isFileList(value) || utils$1.endsWith(key, "[]")) && (arr = utils$1.toArray(value)))
      ) {
        key = removeBrackets(key);
        arr.forEach(function (el, index) {
          if (!(utils$1.isUndefined(el) || el === null))
            formData.append(
              indexes === true ? renderKey([key], index, dots) : indexes === null ? key : key + "[]",
              convertValue(el),
            );
        });
        return false;
      }
    }
    if (isVisitable(value)) return true;
    formData.append(renderKey(path, key, dots), convertValue(value));
    return false;
  }
  let stack = [];
  let merged = Object.assign(predicates, {
    defaultVisitor,
    convertValue,
    isVisitable,
  });
  function build(value, path, depth = 0) {
    if (utils$1.isUndefined(value)) return;
    if (depth > maxDepth)
      throw new AxiosError$1(
        "Object is too deeply nested (" + depth + " levels). Max depth: " + maxDepth,
        AxiosError$1.ERR_FORM_DATA_DEPTH_EXCEEDED,
      );
    if (stack.indexOf(value) !== -1) throw Error("Circular reference detected in " + path.join("."));
    stack.push(value);
    utils$1.forEach(value, function (el, key) {
      if (
        (!(utils$1.isUndefined(el) || el === null) &&
          visitor.call(formData, el, utils$1.isString(key) ? key.trim() : key, path, merged)) === true
      )
        build(el, path ? path.concat(key) : [key], depth + 1);
    });
    stack.pop();
  }
  if (!utils$1.isObject(obj)) throw TypeError("data must be an object");
  build(obj);
  return formData;
}
//@ chunk-ww9agm6g.js:55895-55905 esm-layout
var toFormData$1 = toFormData;
//@ chunk-ww9agm6g.js:55905-56066 esm-fingerprint
function encode$1(str) {
  let charMap = {
    "!": "%21",
    "'": "%27",
    "(": "%28",
    ")": "%29",
    "~": "%7E",
    "%20": "+",
  };
  return encodeURIComponent(str).replace(/[!'()~]|%20/g, function (match) {
    return charMap[match];
  });
}
//@ chunk-ww9agm6g.js:56066-56114 esm-fingerprint
function AxiosURLSearchParams(params, options) {
  this._pairs = [];
  if (params) toFormData$1(params, this, options);
}
//@ chunk-ww9agm6g.js:56114-56134 esm-layout
var prototype; // deferred: uses AxiosURLSearchParams of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:56114", () => {
  prototype = AxiosURLSearchParams.prototype;
});
//@ chunk-ww9agm6g.js:56134-56183 esm-fingerprint
// deferred: uses prototype of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:56134", () => {
  prototype.append = function (name, value) {
    this._pairs.push([name, value]);
  };
});
//@ chunk-ww9agm6g.js:56183-56334 esm-fingerprint
// deferred: uses prototype of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:56183", () => {
  prototype.toString = function (encoder) {
    let _encode = encoder
      ? function (value) {
          return encoder.call(this, value, encode$1);
        }
      : encode$1;
    return this._pairs
      .map(function (pair) {
        return _encode(pair[0]) + "=" + _encode(pair[1]);
      }, "")
      .join("&");
  };
});
//@ chunk-ww9agm6g.js:56334-56344 esm-layout
var AxiosURLSearchParams_default = AxiosURLSearchParams;
//@ chunk-ww9agm6g.js:56344-56470 esm-fingerprint
function encode(val) {
  return encodeURIComponent(val)
    .replace(/%3A/gi, ":")
    .replace(/%24/g, "$")
    .replace(/%2C/gi, ",")
    .replace(/%20/g, "+");
}
//@ chunk-ww9agm6g.js:56470-56756 esm-fingerprint
function buildURL(url, params, options) {
  if (!params) return url;
  let _encode = (options && options.encode) || encode;
  let _options = utils$1.isFunction(options)
    ? {
        serialize: options,
      }
    : options;
  let serializeFn = _options && _options.serialize;
  let serializedParams;
  if (serializeFn) serializedParams = serializeFn(params, _options);
  else
    serializedParams = utils$1.isURLSearchParams(params)
      ? params.toString()
      : new AxiosURLSearchParams_default(params, _options).toString(_encode);
  if (serializedParams) {
    let hashmarkIndex = url.indexOf("#");
    if (hashmarkIndex !== -1) url = url.slice(0, hashmarkIndex);
    url += (url.indexOf("?") === -1 ? "?" : "&") + serializedParams;
  }
  return url;
}
//@ chunk-ww9agm6g.js:56756-57098 esm-fingerprint
class InterceptorManager {
  constructor() {
    this.handlers = [];
  }
  use(fulfilled, rejected, options) {
    this.handlers.push({
      fulfilled,
      rejected,
      synchronous: options ? options.synchronous : false,
      runWhen: options ? options.runWhen : null,
    });
    return this.handlers.length - 1;
  }
  eject(id) {
    if (this.handlers[id]) this.handlers[id] = null;
  }
  clear() {
    if (this.handlers) this.handlers = [];
  }
  forEach(fn) {
    utils$1.forEach(this.handlers, function (h) {
      if (h !== null) fn(h);
    });
  }
}
//@ chunk-ww9agm6g.js:57098-57108 esm-layout
var InterceptorManager_2 = InterceptorManager;
//@ chunk-ww9agm6g.js:57108-57217 esm-fingerprint
var transitionalDefaults = {
  silentJSONParsing: true,
  forcedJSONParsing: true,
  clarifyTimeoutError: false,
  legacyInterceptorReqResOrdering: true,
};
//@ chunk-ww9agm6g.js:85236-85453 esm-fingerprint
var isURLSameOrigin; // deferred: uses platform (../node/axios.cjs) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:85236", () => {
  isURLSameOrigin = platform.hasStandardBrowserEnv
    ? ((origin, isMSIE) => (url) => {
        url = new URL(url, platform.origin);
        return (
          origin.protocol === url.protocol && origin.host === url.host && (isMSIE || origin.port === url.port)
        );
      })(new URL(platform.origin), platform.navigator && /(msie|trident)/i.test(platform.navigator.userAgent))
    : () => true;
});
//@ chunk-ww9agm6g.js:85453-86058 esm-fingerprint
var cookies; // deferred: uses platform (../node/axios.cjs) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:85453", () => {
  cookies = platform.hasStandardBrowserEnv
    ? {
        write(name, value, expires, path, domain, secure, sameSite) {
          if (typeof document === "undefined") return;
          let cookie = [`${name}=${encodeURIComponent(value)}`];
          if (utils$1.isNumber(expires)) cookie.push(`expires=${new Date(expires).toUTCString()}`);
          if (utils$1.isString(path)) cookie.push(`path=${path}`);
          if (utils$1.isString(domain)) cookie.push(`domain=${domain}`);
          if (secure === true) cookie.push("secure");
          if (utils$1.isString(sameSite)) cookie.push(`SameSite=${sameSite}`);
          document.cookie = cookie.join("; ");
        },
        read(name) {
          if (typeof document === "undefined") return null;
          let match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
          return match ? decodeURIComponent(match[1]) : null;
        },
        remove(name) {
          this.write(name, "", Date.now() - 86400000, "/");
        },
      }
    : {
        write() {},
        read() {
          return null;
        },
        remove() {},
      };
});
//@ chunk-ww9agm6g.js:86058-86094 esm-layout
var headersToObject = (thing) =>
  thing instanceof AxiosHeaders_default
    ? {
        ...thing,
      }
    : thing;
//@ chunk-ww9agm6g.js:86094-87568 esm-fingerprint
function mergeConfig$1(config1, config2) {
  config2 = config2 || {};
  let config = Object.create(null);
  Object.defineProperty(config, "hasOwnProperty", {
    value: Object.prototype.hasOwnProperty,
    enumerable: false,
    writable: true,
    configurable: true,
  });
  function getMergedValue(target, source, prop, caseless) {
    if (utils$1.isPlainObject(target) && utils$1.isPlainObject(source))
      return utils$1.merge.call(
        {
          caseless,
        },
        target,
        source,
      );
    else if (utils$1.isPlainObject(source)) return utils$1.merge({}, source);
    else if (utils$1.isArray(source)) return source.slice();
    return source;
  }
  function mergeDeepProperties(a, b, prop, caseless) {
    if (!utils$1.isUndefined(b)) return getMergedValue(a, b, prop, caseless);
    else if (!utils$1.isUndefined(a)) return getMergedValue(undefined, a, prop, caseless);
  }
  function valueFromConfig2(a, b) {
    if (!utils$1.isUndefined(b)) return getMergedValue(undefined, b);
  }
  function defaultToConfig2(a, b) {
    if (!utils$1.isUndefined(b)) return getMergedValue(undefined, b);
    else if (!utils$1.isUndefined(a)) return getMergedValue(undefined, a);
  }
  function mergeDirectKeys(a, b, prop) {
    if (utils$1.hasOwnProp(config2, prop)) return getMergedValue(a, b);
    else if (utils$1.hasOwnProp(config1, prop)) return getMergedValue(undefined, a);
  }
  let mergeMap = {
    url: valueFromConfig2,
    method: valueFromConfig2,
    data: valueFromConfig2,
    baseURL: defaultToConfig2,
    transformRequest: defaultToConfig2,
    transformResponse: defaultToConfig2,
    paramsSerializer: defaultToConfig2,
    timeout: defaultToConfig2,
    timeoutMessage: defaultToConfig2,
    withCredentials: defaultToConfig2,
    withXSRFToken: defaultToConfig2,
    adapter: defaultToConfig2,
    responseType: defaultToConfig2,
    xsrfCookieName: defaultToConfig2,
    xsrfHeaderName: defaultToConfig2,
    onUploadProgress: defaultToConfig2,
    onDownloadProgress: defaultToConfig2,
    decompress: defaultToConfig2,
    maxContentLength: defaultToConfig2,
    maxBodyLength: defaultToConfig2,
    beforeRedirect: defaultToConfig2,
    transport: defaultToConfig2,
    httpAgent: defaultToConfig2,
    httpsAgent: defaultToConfig2,
    cancelToken: defaultToConfig2,
    socketPath: defaultToConfig2,
    allowedSocketPaths: defaultToConfig2,
    responseEncoding: defaultToConfig2,
    validateStatus: mergeDirectKeys,
    headers: (a, b, prop) => mergeDeepProperties(headersToObject(a), headersToObject(b), prop, true),
  };
  utils$1.forEach(
    Object.keys({
      ...config1,
      ...config2,
    }),
    function (prop) {
      if (prop === "__proto__" || prop === "constructor" || prop === "prototype") return;
      let merge = utils$1.hasOwnProp(mergeMap, prop) ? mergeMap[prop] : mergeDeepProperties;
      let a = utils$1.hasOwnProp(config1, prop) ? config1[prop] : undefined;
      let config2Value = utils$1.hasOwnProp(config2, prop) ? config2[prop] : undefined;
      let configValue = merge(a, config2Value, prop);
      if (!(utils$1.isUndefined(configValue) && merge !== mergeDirectKeys)) config[prop] = configValue;
    },
  );
  return config;
}
//@ chunk-ww9agm6g.js:87568-88394 esm-fingerprint
var resolveConfig = (config) => {
  let newConfig = mergeConfig$1({}, config);
  let own = (key) => (utils$1.hasOwnProp(newConfig, key) ? newConfig[key] : undefined);
  let data = own("data");
  let withXSRFToken = own("withXSRFToken");
  let xsrfHeaderName = own("xsrfHeaderName");
  let xsrfCookieName = own("xsrfCookieName");
  let headers = own("headers");
  let auth = own("auth");
  let baseURL = own("baseURL");
  let allowAbsoluteUrls = own("allowAbsoluteUrls");
  let url = own("url");
  newConfig.headers = headers = AxiosHeaders_default.from(headers);
  newConfig.url = buildURL(
    buildFullPath(baseURL, url, allowAbsoluteUrls),
    config.params,
    config.paramsSerializer,
  );
  if (auth)
    headers.set(
      "Authorization",
      "Basic " +
        btoa(
          (auth.username || "") + ":" + (auth.password ? unescape(encodeURIComponent(auth.password)) : ""),
        ),
    );
  if (utils$1.isFormData(data)) {
    if (platform.hasStandardBrowserEnv || platform.hasStandardBrowserWebWorkerEnv)
      headers.setContentType(undefined);
    else if (utils$1.isFunction(data.getHeaders)) {
      let formHeaders = data.getHeaders();
      let allowedHeaders = ["content-type", "content-length"];
      Object.entries(formHeaders).forEach(([key, val]) => {
        if (allowedHeaders.includes(key.toLowerCase())) headers.set(key, val);
      });
    }
  }
  if (platform.hasStandardBrowserEnv) {
    if (utils$1.isFunction(withXSRFToken)) withXSRFToken = withXSRFToken(newConfig);
    if (withXSRFToken === true || (withXSRFToken == null && isURLSameOrigin(newConfig.url))) {
      let xsrfValue = xsrfHeaderName && xsrfCookieName && cookies.read(xsrfCookieName);
      if (xsrfValue) headers.set(xsrfHeaderName, xsrfValue);
    }
  }
  return newConfig;
};
//@ chunk-ww9agm6g.js:88394-90487 esm-layout
var isXHRAdapterSupported = typeof XMLHttpRequest !== "undefined";
var xhrAdapter =
  isXHRAdapterSupported &&
  function (config) {
    return new Promise(function (resolve, reject) {
      let _config = resolveConfig(config);
      let requestData = _config.data;
      let requestHeaders = AxiosHeaders_default.from(_config.headers).normalize();
      let { responseType, onUploadProgress, onDownloadProgress } = _config;
      let onCanceled;
      let uploadThrottled;
      let downloadThrottled;
      let flushUpload;
      let flushDownload;
      function done() {
        if (flushUpload) flushUpload();
        if (flushDownload) flushDownload();
        if (_config.cancelToken) _config.cancelToken.unsubscribe(onCanceled);
        if (_config.signal) _config.signal.removeEventListener("abort", onCanceled);
      }
      let request = new XMLHttpRequest();
      request.open(_config.method.toUpperCase(), _config.url, true);
      request.timeout = _config.timeout;
      function onloadend() {
        if (!request) return;
        let responseHeaders = AxiosHeaders_default.from(
          "getAllResponseHeaders" in request && request.getAllResponseHeaders(),
        );
        let response = {
          data:
            !responseType || responseType === "text" || responseType === "json"
              ? request.responseText
              : request.response,
          status: request.status,
          statusText: request.statusText,
          headers: responseHeaders,
          config,
          request,
        };
        settle(
          function (value) {
            resolve(value);
            done();
          },
          function (err) {
            reject(err);
            done();
          },
          response,
        );
        request = null;
      }
      if ("onloadend" in request) request.onloadend = onloadend;
      else
        request.onreadystatechange = function () {
          if (!request || request.readyState !== 4) return;
          if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf("file:") === 0))
            return;
          setTimeout(onloadend);
        };
      request.onabort = function () {
        if (!request) return;
        reject(new AxiosError$1("Request aborted", AxiosError$1.ECONNABORTED, config, request));
        request = null;
      };
      request.onerror = function (event) {
        let msg = event && event.message ? event.message : "Network Error";
        let err = new AxiosError$1(msg, AxiosError$1.ERR_NETWORK, config, request);
        err.event = event || null;
        reject(err);
        request = null;
      };
      request.ontimeout = function () {
        let timeoutErrorMessage = _config.timeout
          ? "timeout of " + _config.timeout + "ms exceeded"
          : "timeout exceeded";
        let transitional = _config.transitional || transitionalDefaults;
        if (_config.timeoutErrorMessage) timeoutErrorMessage = _config.timeoutErrorMessage;
        reject(
          new AxiosError$1(
            timeoutErrorMessage,
            transitional.clarifyTimeoutError ? AxiosError$1.ETIMEDOUT : AxiosError$1.ECONNABORTED,
            config,
            request,
          ),
        );
        request = null;
      };
      if (requestData === undefined) requestHeaders.setContentType(null);
      if ("setRequestHeader" in request)
        utils$1.forEach(requestHeaders.toJSON(), function (val, key) {
          request.setRequestHeader(key, val);
        });
      if (!utils$1.isUndefined(_config.withCredentials)) request.withCredentials = !!_config.withCredentials;
      if (responseType && responseType !== "json") request.responseType = _config.responseType;
      if (onDownloadProgress) {
        [downloadThrottled, flushDownload] = progressEventReducer(onDownloadProgress, true);
        request.addEventListener("progress", downloadThrottled);
      }
      if (onUploadProgress && request.upload) {
        [uploadThrottled, flushUpload] = progressEventReducer(onUploadProgress);
        request.upload.addEventListener("progress", uploadThrottled);
        request.upload.addEventListener("loadend", flushUpload);
      }
      if (_config.cancelToken || _config.signal) {
        onCanceled = (cancel) => {
          if (!request) return;
          reject(!cancel || cancel.type ? new CanceledError_default(null, config, request) : cancel);
          request.abort();
          request = null;
        };
        if (_config.cancelToken) _config.cancelToken.subscribe(onCanceled);
        if (_config.signal) {
          if (_config.signal.aborted) onCanceled();
          else _config.signal.addEventListener("abort", onCanceled);
        }
      }
      let protocol = parseProtocol(_config.url);
      if (protocol && platform.protocols.indexOf(protocol) === -1) {
        reject(
          new AxiosError$1("Unsupported protocol " + protocol + ":", AxiosError$1.ERR_BAD_REQUEST, config),
        );
        return;
      }
      request.send(requestData || null);
    });
  };
//@ chunk-ww9agm6g.js:90487-91031 esm-fingerprint
var composeSignals = (signals, timeout) => {
  let { length } = (signals = signals ? signals.filter(Boolean) : []);
  if (timeout || length) {
    let controller = new AbortController();
    let aborted;
    let onabort = function (reason) {
      if (!aborted) {
        aborted = true;
        unsubscribe();
        let err = reason instanceof Error ? reason : this.reason;
        controller.abort(
          err instanceof AxiosError$1
            ? err
            : new CanceledError_default(err instanceof Error ? err.message : err),
        );
      }
    };
    let timer =
      timeout &&
      setTimeout(() => {
        timer = null;
        onabort(new AxiosError$1(`timeout of ${timeout}ms exceeded`, AxiosError$1.ETIMEDOUT));
      }, timeout);
    let unsubscribe = () => {
      if (signals) {
        if (timer) clearTimeout(timer);
        timer = null;
        signals.forEach((signal) => {
          if (signal.unsubscribe) signal.unsubscribe(onabort);
          else signal.removeEventListener("abort", onabort);
        });
        signals = null;
      }
    };
    signals.forEach((signal) => signal.addEventListener("abort", onabort));
    let { signal } = controller;
    signal.unsubscribe = () => utils$1.asap(unsubscribe);
    return signal;
  }
};
var composeSignals$1 = composeSignals;
//@ chunk-ww9agm6g.js:91031-91711 esm-fingerprint
var streamChunk = function* (chunk, chunkSize) {
  let len = chunk.byteLength;
  if (!chunkSize || len < chunkSize) {
    yield chunk;
    return;
  }
  let pos = 0;
  let end;
  while (pos < len) {
    end = pos + chunkSize;
    yield chunk.slice(pos, end);
    pos = end;
  }
};
var readBytes = async function* (iterable, chunkSize) {
  for await (let chunk of readStream(iterable)) yield* streamChunk(chunk, chunkSize);
};
var readStream = async function* (stream) {
  if (stream[Symbol.asyncIterator]) {
    yield* stream;
    return;
  }
  let reader = stream.getReader();
  try {
    for (;;) {
      let { done, value } = await reader.read();
      if (done) break;
      yield value;
    }
  } finally {
    await reader.cancel();
  }
};
var trackStream = (stream, chunkSize, onProgress, onFinish) => {
  let iterator = readBytes(stream, chunkSize);
  let bytes = 0;
  let done;
  let _onFinish = (e) => {
    if (!done) {
      done = true;
      if (onFinish) onFinish(e);
    }
  };
  return new ReadableStream(
    {
      async pull(controller) {
        try {
          let { done, value } = await iterator.next();
          if (done) {
            _onFinish();
            controller.close();
            return;
          }
          let len = value.byteLength;
          if (onProgress) {
            let loadedBytes = (bytes += len);
            onProgress(loadedBytes);
          }
          controller.enqueue(new Uint8Array(value));
        } catch (err) {
          _onFinish(err);
          throw err;
        }
      },
      cancel(reason) {
        _onFinish(reason);
        return iterator.return();
      },
    },
    {
      highWaterMark: 2,
    },
  );
};
//@ chunk-ww9agm6g.js:91711-94922 esm-layout
var DEFAULT_CHUNK_SIZE; // deferred: uses toJSONObject of its import cycle while loading; runs once the cycle is complete
var isFunction_2;
var globalFetchAPI;
var ReadableStream$1;
var TextEncoderCtor;
var test;
var factory;
var seedCache;
var getFetch;
var getFetch$1;
deferInit("chunk-ww9agm6g.js:91711", () => {
  DEFAULT_CHUNK_SIZE = 65536;
  ({ isFunction: isFunction_2 } = utils$1);
  globalFetchAPI = (({ Request: RequestCtor, Response: ResponseCtor }) => ({
    Request: RequestCtor,
    Response: ResponseCtor,
  }))(utils$1.global);
  ({ ReadableStream: ReadableStream$1, TextEncoder: TextEncoderCtor } = utils$1.global);
  test = (fn, ...args) => {
    try {
      return !!fn(...args);
    } catch (error) {
      return false;
    }
  };
  factory = (env) => {
    env = utils$1.merge.call(
      {
        skipUndefined: true,
      },
      globalFetchAPI,
      env,
    );
    let { fetch: envFetch, Request: RequestCtor, Response: ResponseCtor } = env;
    let isFetchSupported = envFetch ? isFunction_2(envFetch) : typeof fetch === "function";
    let isRequestSupported = isFunction_2(RequestCtor);
    let isResponseSupported = isFunction_2(ResponseCtor);
    if (!isFetchSupported) return false;
    let isReadableStreamSupported = isFetchSupported && isFunction_2(ReadableStream$1);
    let encodeText =
      isFetchSupported &&
      (typeof TextEncoderCtor === "function"
        ? (
            (encoder) => (str) =>
              encoder.encode(str)
          )(new TextEncoderCtor())
        : async (str) => new Uint8Array(await new RequestCtor(str).arrayBuffer()));
    let supportsRequestStream =
      isRequestSupported &&
      isReadableStreamSupported &&
      test(() => {
        let duplexAccessed = false;
        let request = new RequestCtor(platform.origin, {
          body: new ReadableStream$1(),
          method: "POST",
          get duplex() {
            duplexAccessed = true;
            return "half";
          },
        });
        let hasContentType = request.headers.has("Content-Type");
        if (request.body != null) request.body.cancel();
        return duplexAccessed && !hasContentType;
      });
    let supportsResponseStream =
      isResponseSupported &&
      isReadableStreamSupported &&
      test(() => utils$1.isReadableStream(new ResponseCtor("").body));
    let resolvers = {
      stream: supportsResponseStream && ((res) => res.body),
    };
    if (isFetchSupported)
      (() => {
        ["text", "arrayBuffer", "blob", "formData", "stream"].forEach((type) => {
          if (!resolvers[type])
            resolvers[type] = (res, config) => {
              let method = res && res[type];
              if (method) return method.call(res);
              throw new AxiosError$1(
                `Response type '${type}' is not supported`,
                AxiosError$1.ERR_NOT_SUPPORT,
                config,
              );
            };
        });
      })();
    let getBodyLength = async (body) => {
      if (body == null) return 0;
      if (utils$1.isBlob(body)) return body.size;
      if (utils$1.isSpecCompliantForm(body))
        return (
          await new RequestCtor(platform.origin, {
            method: "POST",
            body,
          }).arrayBuffer()
        ).byteLength;
      if (utils$1.isArrayBufferView(body) || utils$1.isArrayBuffer(body)) return body.byteLength;
      if (utils$1.isURLSearchParams(body)) body = body + "";
      if (utils$1.isString(body)) return (await encodeText(body)).byteLength;
    };
    let resolveBodyLength = async (headers, body) => {
      let length = utils$1.toFiniteNumber(headers.getContentLength());
      return length == null ? getBodyLength(body) : length;
    };
    return async (config) => {
      let {
        url,
        method,
        data,
        signal,
        cancelToken,
        timeout,
        onDownloadProgress,
        onUploadProgress,
        responseType,
        headers,
        withCredentials = "same-origin",
        fetchOptions,
      } = resolveConfig(config);
      let _fetch = envFetch || fetch;
      responseType = responseType ? (responseType + "").toLowerCase() : "text";
      let composedSignal = composeSignals$1([signal, cancelToken && cancelToken.toAbortSignal()], timeout);
      let request = null;
      let unsubscribe =
        composedSignal &&
        composedSignal.unsubscribe &&
        (() => {
          composedSignal.unsubscribe();
        });
      let requestContentLength;
      try {
        if (
          onUploadProgress &&
          supportsRequestStream &&
          method !== "get" &&
          method !== "head" &&
          (requestContentLength = await resolveBodyLength(headers, data)) !== 0
        ) {
          let _request = new RequestCtor(url, {
            method: "POST",
            body: data,
            duplex: "half",
          });
          let contentTypeHeader;
          if (utils$1.isFormData(data) && (contentTypeHeader = _request.headers.get("content-type")))
            headers.setContentType(contentTypeHeader);
          if (_request.body) {
            let [onProgress, flush] = progressEventDecorator(
              requestContentLength,
              progressEventReducer(isFunctionAlias(onUploadProgress)),
            );
            data = trackStream(_request.body, DEFAULT_CHUNK_SIZE, onProgress, flush);
          }
        }
        if (!utils$1.isString(withCredentials)) withCredentials = withCredentials ? "include" : "omit";
        let isCredentialsSupported = isRequestSupported && "credentials" in RequestCtor.prototype;
        if (utils$1.isFormData(data)) {
          let contentType = headers.getContentType();
          if (contentType && /^multipart\/form-data/i.test(contentType) && !/boundary=/i.test(contentType))
            headers.delete("content-type");
        }
        let resolvedOptions = {
          ...fetchOptions,
          signal: composedSignal,
          method: method.toUpperCase(),
          headers: headers.normalize().toJSON(),
          body: data,
          duplex: "half",
          credentials: isCredentialsSupported ? withCredentials : undefined,
        };
        request = isRequestSupported && new RequestCtor(url, resolvedOptions);
        let response = await (isRequestSupported
          ? _fetch(request, fetchOptions)
          : _fetch(url, resolvedOptions));
        let isStreamResponse =
          supportsResponseStream && (responseType === "stream" || responseType === "response");
        if (supportsResponseStream && (onDownloadProgress || (isStreamResponse && unsubscribe))) {
          let options = {};
          ["status", "statusText", "headers"].forEach((prop) => {
            options[prop] = response[prop];
          });
          let responseContentLength = utils$1.toFiniteNumber(response.headers.get("content-length"));
          let [onProgress, flush] =
            (onDownloadProgress &&
              progressEventDecorator(
                responseContentLength,
                progressEventReducer(isFunctionAlias(onDownloadProgress), true),
              )) ||
            [];
          response = new ResponseCtor(
            trackStream(response.body, DEFAULT_CHUNK_SIZE, onProgress, () => {
              if (flush) flush();
              if (unsubscribe) unsubscribe();
            }),
            options,
          );
        }
        responseType = responseType || "text";
        let responseData = await resolvers[utils$1.findKey(resolvers, responseType) || "text"](
          response,
          config,
        );
        if (!isStreamResponse && unsubscribe) unsubscribe();
        return await new Promise((resolve, reject) => {
          settle(resolve, reject, {
            data: responseData,
            headers: AxiosHeaders_default.from(response.headers),
            status: response.status,
            statusText: response.statusText,
            config,
            request,
          });
        });
      } catch (err) {
        if (unsubscribe) unsubscribe();
        if (err && err.name === "TypeError" && /Load failed|fetch/i.test(err.message))
          throw Object.assign(
            new AxiosError$1("Network Error", AxiosError$1.ERR_NETWORK, config, request, err && err.response),
            {
              cause: err.cause || err,
            },
          );
        throw AxiosError$1.from(err, err && err.code, config, request, err && err.response);
      }
    };
  };
  seedCache = new Map();
  getFetch = (config) => {
    let env = (config && config.env) || {};
    let { fetch: fetchFn, Request: RequestCtor, Response: ResponseCtor } = env;
    let seeds = [RequestCtor, ResponseCtor, fetchFn];
    let len = seeds.length;
    let i = len;
    let seed;
    let target;
    let map = seedCache;
    while (i--) {
      seed = seeds[i];
      target = map.get(seed);
      if (target === undefined) map.set(seed, (target = i ? new Map() : factory(env)));
      map = target;
    }
    return target;
  };
  getFetch$1 = getFetch();
});
//@ chunk-ww9agm6g.js:94922-94961 esm-fingerprint
var knownAdapters; // deferred: uses isHttpAdapterSupported (../../lib/adapters/http.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:94922", () => {
  knownAdapters = {
    http: http_default,
    xhr: xhrAdapter,
    fetch: {
      get: getFetch,
    },
  };
});
//@ chunk-ww9agm6g.js:94961-95096 esm-fingerprint
// deferred: uses toJSONObject of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:94961", () => {
  utils$1.forEach(knownAdapters, (fn, value) => {
    if (fn) {
      try {
        Object.defineProperty(fn, "name", {
          value,
        });
      } catch (e) {}
      Object.defineProperty(fn, "adapterName", {
        value,
      });
    }
  });
});
//@ chunk-ww9agm6g.js:95096-95159 esm-layout
var renderReason = (reason) => `- ${reason}`;
var isResolvedHandle = (adapter) => utils$1.isFunction(adapter) || adapter === null || adapter === false;
//@ chunk-ww9agm6g.js:95159-95738 esm-fingerprint
function getAdapter$1(adapters, config) {
  adapters = utils$1.isArray(adapters) ? adapters : [adapters];
  let { length } = adapters;
  let nameOrAdapter;
  let adapter;
  let rejectedReasons = {};
  for (let adapterIndex = 0; adapterIndex < length; adapterIndex++) {
    nameOrAdapter = adapters[adapterIndex];
    let id;
    adapter = nameOrAdapter;
    if (!isResolvedHandle(nameOrAdapter)) {
      adapter = knownAdapters[(id = String(nameOrAdapter)).toLowerCase()];
      if (adapter === undefined) throw new AxiosError$1(`Unknown adapter '${id}'`);
    }
    if (adapter && (utils$1.isFunction(adapter) || (adapter = adapter.get(config)))) break;
    rejectedReasons[id || "#" + adapterIndex] = adapter;
  }
  if (!adapter) {
    let reasons = Object.entries(rejectedReasons).map(
      ([id, state]) =>
        `adapter ${id} ` +
        (state === false ? "is not supported by the environment" : "is not available in the build"),
    );
    let s = length
      ? reasons.length > 1
        ? `since :
` +
          reasons.map(renderReason).join(`
`)
        : " " + renderReason(reasons[0])
      : "as no adapter specified";
    throw new AxiosError$1("There is no suitable adapter to dispatch the request " + s, "ERR_NOT_SUPPORT");
  }
  return adapter;
}
//@ chunk-ww9agm6g.js:95738-95773 esm-fingerprint
var adapters; // deferred: uses knownAdapters of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:95738", () => {
  adapters = {
    getAdapter: getAdapter$1,
    adapters: knownAdapters,
  };
});
//@ chunk-ww9agm6g.js:95773-95888 esm-fingerprint
function throwIfCancellationRequested(config) {
  if (config.cancelToken) config.cancelToken.throwIfRequested();
  if (config.signal && config.signal.aborted) throw new CanceledError_default(null, config);
}
//@ chunk-ww9agm6g.js:95888-96415 esm-fingerprint
function dispatchRequest(config) {
  throwIfCancellationRequested(config);
  config.headers = AxiosHeaders_default.from(config.headers);
  config.data = transformData.call(config, config.transformRequest);
  if (["post", "put", "patch"].indexOf(config.method) !== -1)
    config.headers.setContentType("application/x-www-form-urlencoded", false);
  return adapters
    .getAdapter(
      config.adapter || defaults_default.adapter,
      config,
    )(config)
    .then(
      function (response) {
        throwIfCancellationRequested(config);
        response.data = transformData.call(config, config.transformResponse, response);
        response.headers = AxiosHeaders_default.from(response.headers);
        return response;
      },
      function (reason) {
        if (!isCancel_2(reason)) {
          throwIfCancellationRequested(config);
          if (reason && reason.response) {
            reason.response.data = transformData.call(config, config.transformResponse, reason.response);
            reason.response.headers = AxiosHeaders_default.from(reason.response.headers);
          }
        }
        return Promise.reject(reason);
      },
    );
}
//@ chunk-ww9agm6g.js:96415-96425 esm-layout
var validators$1 = {};
//@ chunk-ww9agm6g.js:96425-96563 esm-fingerprint
// deferred: uses validators$1 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:96425", () => {
  ["object", "boolean", "number", "function", "string", "symbol"].forEach((type, i) => {
    validators$1[type] = function (thing) {
      return typeof thing === type || "a" + (i < 1 ? "n " : " ") + type;
    };
  });
});
//@ chunk-ww9agm6g.js:96563-96573 esm-layout
var deprecatedWarnings = {};
//@ chunk-ww9agm6g.js:96573-96925 esm-fingerprint
// deferred: uses validators$1 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:96573", () => {
  validators$1.transitional = function (validator, version, message) {
    function formatMessage(opt, desc) {
      return (
        "[Axios v" + VERSION + "] Transitional option '" + opt + "'" + desc + (message ? ". " + message : "")
      );
    }
    return (value, opt, opts) => {
      if (validator === false)
        throw new AxiosError$1(
          formatMessage(opt, " has been removed" + (version ? " in " + version : "")),
          AxiosError$1.ERR_DEPRECATED,
        );
      if (version && !deprecatedWarnings[opt]) {
        deprecatedWarnings[opt] = true;
        console.warn(
          formatMessage(
            opt,
            " has been deprecated since v" + version + " and will be removed in the near future",
          ),
        );
      }
      return validator ? validator(value, opt, opts) : true;
    };
  };
});
//@ chunk-ww9agm6g.js:96925-97021 esm-fingerprint
// deferred: uses validators$1 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:96925", () => {
  validators$1.spelling = function (correctSpelling) {
    return (value, opt) => {
      console.warn(`${opt} is likely a misspelling of ${correctSpelling}`);
      return true;
    };
  };
});
//@ chunk-ww9agm6g.js:97021-97422 esm-fingerprint
function assertOptions(options, schema, allowUnknown) {
  if (typeof options !== "object")
    throw new AxiosError$1("options must be an object", AxiosError$1.ERR_BAD_OPTION_VALUE);
  let keys = Object.keys(options);
  let i_2 = keys.length;
  while (i_2-- > 0) {
    let opt = keys[i_2];
    let validator = Object.prototype.hasOwnProperty.call(schema, opt) ? schema[opt] : undefined;
    if (validator) {
      let value = options[opt];
      let result = value === undefined || validator(value, opt, options);
      if (result !== true)
        throw new AxiosError$1("option " + opt + " must be " + result, AxiosError$1.ERR_BAD_OPTION_VALUE);
      continue;
    }
    if (allowUnknown !== true) throw new AxiosError$1("Unknown option " + opt, AxiosError$1.ERR_BAD_OPTION);
  }
}
//@ chunk-ww9agm6g.js:97422-97462 esm-fingerprint
var validator = {
  assertOptions,
  validators: validators$1,
};
//@ chunk-ww9agm6g.js:97462-97483 esm-fingerprint
var validators; // deferred: uses validator of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:97462", () => {
  validators = validator.validators;
});
//@ chunk-ww9agm6g.js:97483-99847 esm-fingerprint
class Axios {
  constructor(instanceConfig) {
    this.defaults = instanceConfig || {};
    this.interceptors = {
      request: new InterceptorManager_2(),
      response: new InterceptorManager_2(),
    };
  }
  async request(configOrUrl, config) {
    try {
      return await this._request(configOrUrl, config);
    } catch (err) {
      if (err instanceof Error) {
        let dummy = {};
        if (Error.captureStackTrace) Error.captureStackTrace(dummy);
        else dummy = Error();
        let stack = (() => {
          if (!dummy.stack) return "";
          let firstNewlineIndex = dummy.stack.indexOf(`
`);
          return firstNewlineIndex === -1 ? "" : dummy.stack.slice(firstNewlineIndex + 1);
        })();
        try {
          if (!err.stack) err.stack = stack;
          else if (stack) {
            let firstNewlineIndex = stack.indexOf(`
`);
            let secondNewlineIndex =
              firstNewlineIndex === -1
                ? -1
                : stack.indexOf(
                    `
`,
                    firstNewlineIndex + 1,
                  );
            let stackWithoutTwoTopLines =
              secondNewlineIndex === -1 ? "" : stack.slice(secondNewlineIndex + 1);
            if (!String(err.stack).endsWith(stackWithoutTwoTopLines))
              err.stack +=
                `
` + stack;
          }
        } catch (e) {}
      }
      throw err;
    }
  }
  _request(configOrUrl, config) {
    if (typeof configOrUrl === "string") {
      config = config || {};
      config.url = configOrUrl;
    } else config = configOrUrl || {};
    config = mergeConfig$1(this.defaults, config);
    let { transitional, paramsSerializer, headers } = config;
    if (transitional !== undefined)
      validator.assertOptions(
        transitional,
        {
          silentJSONParsing: validators.transitional(validators.boolean),
          forcedJSONParsing: validators.transitional(validators.boolean),
          clarifyTimeoutError: validators.transitional(validators.boolean),
          legacyInterceptorReqResOrdering: validators.transitional(validators.boolean),
        },
        false,
      );
    if (paramsSerializer != null)
      if (utils$1.isFunction(paramsSerializer))
        config.paramsSerializer = {
          serialize: paramsSerializer,
        };
      else
        validator.assertOptions(
          paramsSerializer,
          {
            encode: validators.function,
            serialize: validators.function,
          },
          true,
        );
    if (config.allowAbsoluteUrls !== undefined);
    else if (this.defaults.allowAbsoluteUrls !== undefined)
      config.allowAbsoluteUrls = this.defaults.allowAbsoluteUrls;
    else config.allowAbsoluteUrls = true;
    validator.assertOptions(
      config,
      {
        baseUrl: validators.spelling("baseURL"),
        withXsrfToken: validators.spelling("withXSRFToken"),
      },
      true,
    );
    config.method = (config.method || this.defaults.method || "get").toLowerCase();
    let contextHeaders = headers && utils$1.merge(headers.common, headers[config.method]);
    if (headers)
      utils$1.forEach(["delete", "get", "head", "post", "put", "patch", "common"], (method) => {
        delete headers[method];
      });
    config.headers = AxiosHeaders_default.concat(contextHeaders, headers);
    let requestInterceptorChain = [];
    let synchronousRequestInterceptors = true;
    this.interceptors.request.forEach(function (interceptor) {
      if (typeof interceptor.runWhen === "function" && interceptor.runWhen(config) === false) return;
      synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;
      let transitional = config.transitional || transitionalDefaults;
      if (transitional && transitional.legacyInterceptorReqResOrdering)
        requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
      else requestInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
    });
    let responseInterceptorChain = [];
    this.interceptors.response.forEach(function (interceptor) {
      responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
    });
    let promise;
    let i = 0;
    let len;
    if (!synchronousRequestInterceptors) {
      let chain = [dispatchRequest.bind(this), undefined];
      chain.unshift(...requestInterceptorChain);
      chain.push(...responseInterceptorChain);
      len = chain.length;
      promise = Promise.resolve(config);
      while (i < len) promise = promise.then(chain[i++], chain[i++]);
      return promise;
    }
    len = requestInterceptorChain.length;
    let newConfig = config;
    while (i < len) {
      let onFulfilled = requestInterceptorChain[i++];
      let onRejected = requestInterceptorChain[i++];
      try {
        newConfig = onFulfilled(newConfig);
      } catch (error) {
        onRejected.call(this, error);
        break;
      }
    }
    try {
      promise = dispatchRequest.call(this, newConfig);
    } catch (error) {
      return Promise.reject(error);
    }
    i = 0;
    len = responseInterceptorChain.length;
    while (i < len) promise = promise.then(responseInterceptorChain[i++], responseInterceptorChain[i++]);
    return promise;
  }
  getUri(config) {
    config = mergeConfig$1(this.defaults, config);
    let fullPath = buildFullPath(config.baseURL, config.url, config.allowAbsoluteUrls);
    return buildURL(fullPath, config.params, config.paramsSerializer);
  }
}
//@ chunk-ww9agm6g.js:99847-100002 esm-fingerprint
// deferred: uses toJSONObject of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:99847", () => {
  utils$1.forEach(["delete", "get", "head", "options"], function (method) {
    Axios.prototype[method] = function (url, config) {
      return this.request(
        mergeConfig$1(config || {}, {
          method,
          url,
          data: (config || {}).data,
        }),
      );
    };
  });
});
//@ chunk-ww9agm6g.js:100002-100243 esm-fingerprint
// deferred: uses toJSONObject of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:100002", () => {
  utils$1.forEach(["post", "put", "patch"], function (method) {
    function generateHTTPMethod(isForm) {
      return function (url, data, config) {
        return this.request(
          mergeConfig$1(config || {}, {
            method,
            headers: isForm
              ? {
                  "Content-Type": "multipart/form-data",
                }
              : {},
            url,
            data,
          }),
        );
      };
    }
    Axios.prototype[method] = generateHTTPMethod();
    Axios.prototype[method + "Form"] = generateHTTPMethod(true);
  });
});
//@ chunk-ww9agm6g.js:100243-100253 esm-layout
var Axios$1 = Axios;
//@ chunk-ww9agm6g.js:100253-101232 esm-fingerprint
class CancelToken {
  constructor(executor) {
    if (typeof executor !== "function") throw TypeError("executor must be a function.");
    let resolvePromise;
    this.promise = new Promise(function (resolve) {
      resolvePromise = resolve;
    });
    let token = this;
    this.promise.then((cancel) => {
      if (!token._listeners) return;
      let i = token._listeners.length;
      while (i-- > 0) token._listeners[i](cancel);
      token._listeners = null;
    });
    this.promise.then = (onfulfilled) => {
      let _resolve;
      let promise = new Promise((resolve) => {
        token.subscribe(resolve);
        _resolve = resolve;
      }).then(onfulfilled);
      promise.cancel = function () {
        token.unsubscribe(_resolve);
      };
      return promise;
    };
    executor(function (message, config, request) {
      if (token.reason) return;
      token.reason = new CanceledError_default(message, config, request);
      resolvePromise(token.reason);
    });
  }
  throwIfRequested() {
    if (this.reason) throw this.reason;
  }
  subscribe(listener) {
    if (this.reason) {
      listener(this.reason);
      return;
    }
    if (this._listeners) this._listeners.push(listener);
    else this._listeners = [listener];
  }
  unsubscribe(listener) {
    if (!this._listeners) return;
    let index = this._listeners.indexOf(listener);
    if (index !== -1) this._listeners.splice(index, 1);
  }
  toAbortSignal() {
    let controller = new AbortController();
    let abort = (err) => {
      controller.abort(err);
    };
    this.subscribe(abort);
    controller.signal.unsubscribe = () => this.unsubscribe(abort);
    return controller.signal;
  }
  static source() {
    let cancel;
    return {
      token: new CancelToken(function (resolvePromise) {
        cancel = resolvePromise;
      }),
      cancel,
    };
  }
}
//@ chunk-ww9agm6g.js:101232-101242 esm-layout
var CancelToken$1 = CancelToken;
//@ chunk-ww9agm6g.js:101242-101300 esm-layout
function spread$1(callback) {
  return function (arr) {
    return callback.apply(null, arr);
  };
}
//@ chunk-ww9agm6g.js:101300-101357 esm-fingerprint
function isAxiosError$1(payload) {
  return utils$1.isObject(payload) && payload.isAxiosError === true;
}
//@ chunk-ww9agm6g.js:101357-102695 esm-fingerprint
var HttpStatusCode$1 = {
  Continue: 100,
  SwitchingProtocols: 101,
  Processing: 102,
  EarlyHints: 103,
  Ok: 200,
  Created: 201,
  Accepted: 202,
  NonAuthoritativeInformation: 203,
  NoContent: 204,
  ResetContent: 205,
  PartialContent: 206,
  MultiStatus: 207,
  AlreadyReported: 208,
  ImUsed: 226,
  MultipleChoices: 300,
  MovedPermanently: 301,
  Found: 302,
  SeeOther: 303,
  NotModified: 304,
  UseProxy: 305,
  Unused: 306,
  TemporaryRedirect: 307,
  PermanentRedirect: 308,
  BadRequest: 400,
  Unauthorized: 401,
  PaymentRequired: 402,
  Forbidden: 403,
  NotFound: 404,
  MethodNotAllowed: 405,
  NotAcceptable: 406,
  ProxyAuthenticationRequired: 407,
  RequestTimeout: 408,
  Conflict: 409,
  Gone: 410,
  LengthRequired: 411,
  PreconditionFailed: 412,
  PayloadTooLarge: 413,
  UriTooLong: 414,
  UnsupportedMediaType: 415,
  RangeNotSatisfiable: 416,
  ExpectationFailed: 417,
  ImATeapot: 418,
  MisdirectedRequest: 421,
  UnprocessableEntity: 422,
  Locked: 423,
  FailedDependency: 424,
  TooEarly: 425,
  UpgradeRequired: 426,
  PreconditionRequired: 428,
  TooManyRequests: 429,
  RequestHeaderFieldsTooLarge: 431,
  UnavailableForLegalReasons: 451,
  InternalServerError: 500,
  NotImplemented: 501,
  BadGateway: 502,
  ServiceUnavailable: 503,
  GatewayTimeout: 504,
  HttpVersionNotSupported: 505,
  VariantAlsoNegotiates: 506,
  InsufficientStorage: 507,
  LoopDetected: 508,
  NotExtended: 510,
  NetworkAuthenticationRequired: 511,
  WebServerIsDown: 521,
  ConnectionTimedOut: 522,
  OriginIsUnreachable: 523,
  TimeoutOccurred: 524,
  SslHandshakeFailed: 525,
  InvalidSslCertificate: 526,
};
//@ chunk-ww9agm6g.js:102695-102742 esm-fingerprint
// deferred: uses HttpStatusCode$1 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:102695", () => {
  Object.entries(HttpStatusCode$1).forEach(([key, value]) => {
    HttpStatusCode$1[value] = key;
  });
});
//@ chunk-ww9agm6g.js:102742-102752 esm-layout
var HttpStatusCode = HttpStatusCode$1;
//@ chunk-ww9agm6g.js:102752-102940 esm-fingerprint
/**
 * axios 的 createInstance（第三方）。
 */
function createInstance(defaultConfig) {
  let context = new Axios$1(defaultConfig);
  let instance = bind(Axios$1.prototype.request, context);
  utils$1.extend(instance, Axios$1.prototype, context, {
    allOwnKeys: true,
  });
  utils$1.extend(instance, context, null, {
    allOwnKeys: true,
  });
  instance.create = function (instanceConfig) {
    return createInstance(mergeConfig$1(defaultConfig, instanceConfig));
  };
  return instance;
}
//@ chunk-ww9agm6g.js:102940-102953 esm-layout
var axios; // deferred: uses createInstance of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:102940", () => {
  axios = createInstance(defaults_default);
});
//@ chunk-ww9agm6g.js:102953-102964 esm-fingerprint
// deferred: uses axios of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:102953", () => {
  axios.Axios = Axios$1;
});
//@ chunk-ww9agm6g.js:102964-102982 esm-fingerprint
// deferred: uses axios of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:102964", () => {
  axios.CanceledError = CanceledError_default;
});
//@ chunk-ww9agm6g.js:102982-102999 esm-fingerprint
// deferred: uses axios of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:102982", () => {
  axios.CancelToken = CancelToken$1;
});
//@ chunk-ww9agm6g.js:102999-103013 esm-fingerprint
// deferred: uses axios of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:102999", () => {
  axios.isCancel = isCancel_2;
});
//@ chunk-ww9agm6g.js:103013-103026 esm-fingerprint
// deferred: uses axios of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:103013", () => {
  axios.VERSION = VERSION;
});
//@ chunk-ww9agm6g.js:103026-103042 esm-fingerprint
// deferred: uses axios of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:103026", () => {
  axios.toFormData = toFormData$1;
});
//@ chunk-ww9agm6g.js:103042-103057 esm-fingerprint
// deferred: uses axios of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:103042", () => {
  axios.AxiosError = AxiosError$1;
});
//@ chunk-ww9agm6g.js:103057-103082 esm-fingerprint
// deferred: uses axios of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:103057", () => {
  axios.Cancel = axios.CanceledError;
});
//@ chunk-ww9agm6g.js:103082-103123 esm-layout
// deferred: uses axios of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:103082", () => {
  axios.all = function (promises) {
    return Promise.all(promises);
  };
});
//@ chunk-ww9agm6g.js:103123-103135 esm-fingerprint
// deferred: uses axios of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:103123", () => {
  axios.spread = spread$1;
});
//@ chunk-ww9agm6g.js:103135-103153 esm-fingerprint
// deferred: uses axios of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:103135", () => {
  axios.isAxiosError = isAxiosError$1;
});
//@ chunk-ww9agm6g.js:103153-103170 esm-fingerprint
// deferred: uses axios of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:103153", () => {
  axios.mergeConfig = mergeConfig$1;
});
//@ chunk-ww9agm6g.js:103170-103187 esm-fingerprint
// deferred: uses axios of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:103170", () => {
  axios.AxiosHeaders = AxiosHeaders_default;
});
//@ chunk-ww9agm6g.js:103187-103243 esm-fingerprint
// deferred: uses axios of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:103187", () => {
  axios.formToJSON = (thing) => toFormDataNode$1(utils$1.isHTMLForm(thing) ? new FormData(thing) : thing);
});
//@ chunk-ww9agm6g.js:103243-103270 esm-fingerprint
// deferred: uses axios of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:103243", () => {
  axios.getAdapter = adapters.getAdapter;
});
//@ chunk-ww9agm6g.js:103270-103290 esm-fingerprint
// deferred: uses axios of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:103270", () => {
  axios.HttpStatusCode = HttpStatusCode;
});
//@ chunk-ww9agm6g.js:103290-103302 esm-layout
// deferred: uses axios of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:103290", () => {
  axios.default = axios;
});
//@ chunk-ww9agm6g.js:103302-103311 esm-layout
var axios_default; // deferred: uses axios of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ww9agm6g.js:103302", () => {
  axios_default = axios;
});
//@ chunk-ww9agm6g.js:103311-103533 esm-fingerprint
var Axios_2; // deferred: uses axios_default of its import cycle while loading; runs once the cycle is complete
var AxiosError;
var CanceledError;
var isCancel;
var CancelToken_2;
var VERSION_2;
var all;
var Cancel;
var isAxiosError;
var spread;
var toFormData_2;
var AxiosHeaders;
var HttpStatusCode_2;
var formToJSON;
var getAdapter;
var mergeConfig;
deferInit("chunk-ww9agm6g.js:103311", () => {
  ({
    Axios: Axios_2,
    AxiosError,
    CanceledError,
    isCancel,
    CancelToken: CancelToken_2,
    VERSION: VERSION_2,
    all,
    Cancel,
    isAxiosError,
    spread,
    toFormData: toFormData_2,
    AxiosHeaders,
    HttpStatusCode: HttpStatusCode_2,
    formToJSON,
    getAdapter,
    mergeConfig,
  } = axios_default);
});
//@ chunk-0yw3taqg.js:414456-414844 esm-fingerprint
function stringLength(str, max) {
  if (str.length + 2 > max) return str.length + 2;
  let size = 2;
  for (let j = 0; j < str.length; j++) {
    let code = str.charCodeAt(j);
    if (code === 34 || code === 92) size += 2;
    else if (code < 32) size += code === 8 || code === 9 || code === 10 || code === 12 || code === 13 ? 2 : 6;
    else if (code < 128) size += 1;
    else if (code < 2048) size += 2;
    else if (code >= 55296 && code <= 56319) {
      let next = str.charCodeAt(j + 1);
      if (next >= 56320 && next <= 57343) {
        size += 4;
        j++;
      } else size += 6;
    } else if (code >= 56320 && code <= 57343) size += 6;
    else size += 3;
    if (size > max) return size;
  }
  return size;
}

// The import cycle this module closes (3 modules) is complete: run the load-time work its statements
// marked "deferred" waited for, in the official build's order (runtime/deferred-init.js).
runDeferredInits("vendor/axios/dist/esm/axios.js");
runDeferredInits("worker:vendor/axios/dist/esm/axios.js");
export {
  axios_default,
  isAxiosError,
  stringLength,
  AxiosHeaders,
  isCancel,
  AxiosError,
  FormData$1,
  platformNamespace,
  toFormData$1,
  utils$1,
  transitionalDefaults,
  AxiosError$1,
  buildURL,
};
