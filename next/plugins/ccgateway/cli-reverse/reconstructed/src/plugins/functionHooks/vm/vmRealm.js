/**
 * plugins/functionHooks/vm/vmRealm.ts
 *
 * 创建隔离 VM realm 与宿主函数包装（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hmaqgh0x.js (18)
 * attribution: placement 18
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import * as vmModule from "vm";
import { CLONE_DEPTH_THRESHOLD } from "../../../utils/structuredCloneLimits.js";
import { copyAcrossVmBoundary } from "./boundaryCopy.js";
import { sanitizeAndLogError } from "../../../components/Feedback.js";
import { SubAgentContext } from "../../../components/CtrlOToExpand.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-hmaqgh0x.js:507-600 placement
/**
 * 无 import 钩子标记
 */
var NO_IMPORT_HOOK; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var NO_IMPORT_OPTIONS;
deferInit("chunk-hmaqgh0x.js:507", () => {
  NO_IMPORT_HOOK = Symbol("compile with no import() hook");
  NO_IMPORT_OPTIONS = Object.freeze({
    importModuleDynamically: NO_IMPORT_HOOK,
  });
});
//@ chunk-hmaqgh0x.js:600-936 placement
/**
 * 校验 VM 编译选项：importModuleDynamically 必须是函数或"无 import 钩子"标记，后者返回 undefined。
 */
function vmImportOptions(options) {
  let importModuleDynamically = options?.importModuleDynamically;
  if (importModuleDynamically === NO_IMPORT_HOOK) return;
  if (typeof importModuleDynamically !== "function")
    throw TypeError(
      "The options argument of hardenVMIntrinsics and createVMIntakeWalkers must be either { importModuleDynamically: <function> } or COMPILE_WITHOUT_IMPORT_HOOK, which src/utils/vmHardening.ts exports",
    );
  return {
    importModuleDynamically,
  };
}
//@ chunk-hmaqgh0x.js:936-1001 placement
/**
 * 构造 timeout 选项
 */
function timeoutOption(timeout, override) {
  if (override != null)
    return {
      timeout: override,
    };
  return {
    timeout,
  };
}
//@ chunk-hmaqgh0x.js:1001-7494 placement
/**
 * 创建钩子运行用的隔离 VM realm，装入全局与宿主函数包装
 */
function createVmRealm(context, importHook) {
  vmModule.runInContext(
    `(() => {
    Object.defineProperty(Error, 'prepareStackTrace', {
      value: (err) => { const s = err.stack; return typeof s === 'string' ? s : '' },
      writable: false, configurable: false,
    });
    for (const g of ['ShadowRealm', 'WebAssembly', 'FinalizationRegistry',
                     'WeakRef', 'Atomics', 'SharedArrayBuffer',
                     'queueMicrotask',
                     // JSC debug/shell globals \u2014 present only if
                     // JSC_useDollarVM=1 or similar, but $vm is a full
                     // escape (createGlobalObject, addressOf, runScript).
                     '$vm', 'gc', 'edenGC', 'fullGC', 'print', 'readFile',
                     'Loader']) {
      delete globalThis[g];
    }
    // SES-style enable-property-override: convert common shadowed data props
    // to accessors whose setter defineProperty's onto the receiver. Otherwise
    // freezing makes them non-writable, and [[Set]] on an instance (e.g.
    // "this.name='X'" in an Error subclass ctor) throws in strict / no-ops in
    // sloppy \u2014 the TC39 "override mistake".
    function enableOverride(proto, key) {
      const d = Object.getOwnPropertyDescriptor(proto, key);
      if (!d || 'get' in d) return;
      const v = d.value;
      Object.defineProperty(proto, key, {
        get() { return v },
        set(nv) {
          if (this === proto) return;
          Object.defineProperty(this, key, { value: nv, writable: true, enumerable: true, configurable: true });
        },
        enumerable: d.enumerable, configurable: true,
      });
    }
    const errorCtors = [Error, EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError, AggregateError, globalThis.SuppressedError].filter(Boolean);
    const errorProtos = errorCtors.map(C => C.prototype);
    for (const [proto, keys] of [
      // All Object.prototype data props \u2014 Object.assign({}, {propertyIsEnumerable:x})
      // and friends would otherwise throw post-freeze. Accessor props (__proto__,
      // __define/lookupGetter__) are skipped by the 'get' in d guard above.
      [Object.prototype, Object.getOwnPropertyNames(Object.prototype)],
      [Function.prototype, ['toString', 'constructor', 'name', 'length']],
      [Array.prototype, ['toString', 'constructor']],
      [Date.prototype, ['toString', 'toLocaleString', 'valueOf', 'constructor']],
      ...errorProtos.map(p => [p, ['name', 'message', 'toString', 'constructor']]),
    ]) for (const k of keys) enableOverride(proto, k);
    // Error subclasses each have their own .prototype; freezing only Error
    // leaves TypeError.prototype.then etc. writable. SuppressedError is
    // from the explicit-resource-management proposal (bun/JSC ship it).
    for (const C of [Promise, Object, Array, Function, globalThis.Iterator,
                     Map, Set, WeakMap, WeakSet,
                     String, Number, Boolean, Symbol, BigInt,
                     Date, RegExp, ArrayBuffer, DataView,
                     ...errorCtors,
                     typeof URL !== 'undefined' ? URL : undefined,
                    ].filter(Boolean)) {
      Object.freeze(C);
      Object.freeze(C.prototype);
    }
    // %TypedArray% (shared prototype of all typed arrays) + each concrete.
    for (const C of [Object.getPrototypeOf(Int8Array),
                     Int8Array, Uint8Array, Uint8ClampedArray,
                     Int16Array, Uint16Array, Int32Array, Uint32Array,
                     globalThis.Float16Array, Float32Array, Float64Array,
                     BigInt64Array, BigUint64Array].filter(Boolean)) {
      Object.freeze(C);
      Object.freeze(C.prototype);
    }
    // %AsyncFunction%, %GeneratorFunction%, %AsyncGeneratorFunction% and
    // their .prototype are not reachable as globals \u2014 walk from instances.
    for (const f of [async()=>{}, function*(){}, async function*(){}]) {
      Object.freeze(f.constructor);
      Object.freeze(f.constructor.prototype);
    }
    for (const C of [globalThis.DisposableStack, globalThis.AsyncDisposableStack,
                     globalThis.Intl].filter(Boolean)) {
      Object.freeze(C);
      if (C.prototype) Object.freeze(C.prototype);
    }
    // Namespace objects (no .prototype) \u2014 VM code could otherwise set
    // JSON.then/Math.then/Reflect.then and any host await on the namespace
    // object (or on a VM value that aliases it) becomes a thenable escape.
    // Proxy has no .prototype but freeze closes Proxy.revocable tampering.
    for (const ns of [JSON, Math, Reflect, Proxy]) Object.freeze(ns);
    Object.defineProperty(globalThis, 'then', {
      value: undefined, writable: false, configurable: false,
    });
    Object.defineProperty(globalThis, 'Error', {
      value: Error, writable: false, enumerable: false, configurable: false,
    });
    // Intl.* sub-constructors each have their own .prototype \u2014 freezing the
    // Intl namespace above does NOT freeze Intl.Collator.prototype etc.
    // Same own-property-.then escape shape as Promise.prototype.then if any
    // host code ever awaits an Intl.* instance.
    if (typeof Intl !== 'undefined') {
      for (const k of Object.getOwnPropertyNames(Intl)) {
        const C = Intl[k];
        if (typeof C === 'function') {
          Object.freeze(C);
          if (C.prototype) Object.freeze(C.prototype);
        }
      }
    }
    for (const it of [
      [][Symbol.iterator](),
      ''[Symbol.iterator](),
      new Map()[Symbol.iterator](),
      new Set()[Symbol.iterator](),
      'a'.matchAll(/a/g),
      // Iterator helpers (map/from) are stage-4 but guard for older runtimes.
      ...(typeof Iterator !== 'undefined' && Iterator.from ? [
        [].values().map(x=>x),
        // %WrapForValidIteratorPrototype% \u2014 Iterator.from(non-Iterator) wraps
        // via a distinct intrinsic prototype not reachable from any other path.
        Iterator.from({next:()=>({done:true})}),
      ] : []),
      (function*(){})(),
      (async function*(){})(),
      // %SegmentsPrototype% + %SegmentIteratorPrototype% \u2014 host for..of on a
      // VM Segments object would otherwise see a writable .then on the chain.
      ...(typeof Intl !== 'undefined' && Intl.Segmenter ? (s => [s, s[Symbol.iterator]()])(new Intl.Segmenter().segment('a')) : []),
    ]) {
      for (let p = Object.getPrototypeOf(it); p; p = Object.getPrototypeOf(p)) {
        Object.freeze(p);
      }
    }
    })()`,
    context,
    vmImportOptions(importHook),
  );
}
//@ chunk-hmaqgh0x.js:7494-7575 placement
/**
 * 删除 Error.captureStackTrace
 */
function removeCaptureStackTrace(context) {
  vmModule.runInContext("'use strict'; delete Error.captureStackTrace", context);
}
//@ chunk-hmaqgh0x.js:7575-7663 placement
/**
 * 空原型包装 await
 */
function awaitAsNullProto(vmContext) {
  return vmModule.runInContext("(async v => ({__proto__: null, v: await v}))", vmContext);
}
//@ chunk-hmaqgh0x.js:7663-7737 placement
/**
 * 直接调用函数
 */
function callWithArgs(context) {
  return vmModule.runInContext("((fn, ...args) => fn(...args))", context);
}
//@ chunk-hmaqgh0x.js:7737-8398 placement
/**
 * 在 VM 上下文中创建读取抛出值 name/message/stack 的函数（各字段独立 try，取不到时用默认值）。
 */
function createVmErrorDescriber(vmContext) {
  return vmModule.runInContext(
    `(e => {
      let name = 'Error', message = '', stack = ''
      try { const v = e?.name; if (typeof v === 'string') name = v } catch {}
      try {
        const v = e?.message
        if (typeof v === 'string') message = v
        else if (typeof e === 'string') message = e
        else if (typeof e === 'number' || typeof e === 'boolean' || typeof e === 'bigint') {
          const s = \`\${e}\`
          if (typeof s === 'string') message = s
        }
      } catch {}
      try { const v = e?.stack; if (typeof v === 'string') stack = v } catch {}
      return { __proto__: null, name, message, stack }
    })`,
    vmContext,
  );
}
//@ chunk-hmaqgh0x.js:8398-8641 placement
/**
 * 在 VM 上下文中创建把值复制进 VM 的 copy 函数（数组长度上限、原型键处理）。
 */
function createVmInboundCopier(
  context,
  { arrayLengthCap, protoKey } = {
    arrayLengthCap: CLONE_DEPTH_THRESHOLD,
    protoKey: "left-out",
  },
) {
  return vmModule.runInContext(
    `(() => {
      'use strict';
      ${copyAcrossVmBoundary({
        arrayLengthCap,
        isLeaving: false,
        isListSeenFirst: false,
        protoKey,
      })}
      return copy
    })()`,
    context,
  );
}
//@ chunk-hmaqgh0x.js:8641-9228 placement
/**
 * 把抛出值重新封装为冻结纯错误对象的源码。
 */
var RESEAL_ERROR_SOURCE = `(e) => {
  let name = 'Error', message = '', stack
  try { const v = e?.name; if (typeof v === 'string') name = v } catch {}
  try {
    const v = e?.message
    if (typeof v === 'string') message = v
    else if (typeof e === 'string') message = e
  } catch {}
  try { const v = e?.stack; if (typeof v === 'string') stack = v } catch {}
  const toStr = () => name + ': ' + message
  _setProto(toStr, null)
  _freeze(toStr)
  return _freeze({
    __proto__: null,
    name,
    message,
    stack: stack === undefined ? name + ': ' + message : stack,
    toString: toStr,
  })
}`;
//@ chunk-hmaqgh0x.js:9228-9550 placement
/**
 * 在 VM 上下文中创建宿主函数包装：同步抛错重新封装为冻结的纯错误对象。
 */
function createVmHostFnWrapper(context) {
  return vmModule.runInContext(
    `(() => {
      const _freeze = Object.freeze
      const _setProto = Object.setPrototypeOf
      const reseal = ${RESEAL_ERROR_SOURCE}
      return (hostFn) => (...args) => {
        try {
          return hostFn(...args)
        } catch (e) {
          throw reseal(e)
        }
      }
    })()`,
    context,
  );
}
//@ chunk-hmaqgh0x.js:9550-11264 placement
function VM_HOST_FN_WRAPPER(context) {
  return vmModule.runInContext(
    `(() => {
      const _freeze = Object.freeze
      const _setProto = Object.setPrototypeOf
      const _getProto = Object.getPrototypeOf
      const _ObjectProto = Object.prototype
      const reseal = ${RESEAL_ERROR_SOURCE}
      // Prebuilt at build time (full stack headroom): the last-resort reason
      // when laundering itself throws at the stack ceiling. Throwing it
      // allocates nothing and calls nothing.
      const SENTINEL = reseal({
        name: 'Error',
        message: 'host call failed at the VM boundary (details unavailable)',
      })
      // true only for an object whose prototype chain reaches this realm's
      // Object.prototype within 64 hops (far beyond any real chain; the cap
      // stops a Proxy whose getPrototypeOf trap returns a fresh object each
      // hop from spinning this microtask forever). A null-terminated, foreign,
      // throwing or over-long chain is not this realm's.
      const ownRealm = e => {
        let p = e
        for (let i = 0; i < 64; i++) {
          p = _getProto(p)
          if (p === _ObjectProto) return true
          if (p === null) return false
        }
        return false
      }
      const launder = e => {
        if (e === null || (typeof e !== 'object' && typeof e !== 'function')) return e
        try { if (ownRealm(e)) return e } catch {}
        return reseal(e)
      }
      return (hostFn) => async (...a) => {
        try {
          return await hostFn(...a)
        } catch (e) {
          // No call or allocation between a failed launder and the throw.
          let reason = SENTINEL
          try { reason = launder(e) } catch {}
          throw reason
        }
      }
    })()`,
    context,
  );
}
//@ chunk-hmaqgh0x.js:11264-11654 placement
/**
 * 在 VM 上下文中创建函数包装：调用返回的 Promise 被拒绝时把原因交给日志回调。
 */
function createVmRejectionWatcher(context, onRejection) {
  return vmModule.runInContext(
    `((onRejection) => {
      const _apply = Reflect.apply
      const _then = Promise.prototype.then
      const rejected = (e) => { try { onRejection(e) } catch {} }
      return (fn) => (...a) => {
        const p = _apply(fn, undefined, a)
        try { _apply(_then, p, [undefined, rejected]) } catch {}
        return p
      }
    })`,
    context,
  )(sanitizeAndLogError(onRejection));
}
//@ chunk-hmaqgh0x.js:11654-11841 placement
/**
 * 创建冻结的纯错误对象（name、message、stack、toString），可安全跨越 VM 边界抛出。
 */
function createSealedError(message, name = "Error", stack) {
  let toString = () => `${name}: ${message}`;
  Object.setPrototypeOf(toString, null);
  Object.freeze(toString);
  return Object.freeze({
    __proto__: null,
    name,
    message,
    stack: stack ?? `${name}: ${message}`,
    toString,
  });
}
//@ chunk-hmaqgh0x.js:11841-11847 placement
/**
 * 懒创建的错误读取器
 */
var lazyErrorReader;
//@ chunk-hmaqgh0x.js:11847-12640 placement
/**
 * 获取（懒创建）在隔离 VM 中读取抛出值 msg/name/stack 的函数。
 */
function getThrownValueDescriber() {
  if (!lazyErrorReader) {
    let context = SubAgentContext(
      {
        __proto__: null,
      },
      {
        codeGeneration: {
          strings: false,
          wasm: false,
        },
      },
    );
    removeCaptureStackTrace(context);
    createVmRealm(context, NO_IMPORT_OPTIONS);
    lazyErrorReader = vmModule.runInContext(
      `(e => {
        // Independent try blocks \u2014 a throwing .name getter must not discard
        // an already-validated .message (and vice versa).
        let msg, name = 'Error', stack
        try {
          const m = e?.message
          msg = typeof m === 'string' ? m : typeof e === 'string' ? e : '<non-string error>'
        } catch { msg = '<unprintable thrown value>' }
        try {
          const n = e?.name
          if (typeof n === 'string') name = n
        } catch {}
        try {
          const s = e?.stack
          if (typeof s === 'string') stack = s
        } catch {}
        return { __proto__: null, msg, name, stack }
      })`,
      context,
    );
  }
  return lazyErrorReader;
}
//@ chunk-hmaqgh0x.js:12640-12897 placement
function describeThrownValue(value) {
  try {
    let described = getThrownValueDescriber()(value);
    return {
      msg: typeof described.msg === "string" ? described.msg : "<unprintable thrown value>",
      name: typeof described.name === "string" ? described.name : "Error",
      stack: typeof described.stack === "string" ? described.stack : undefined,
    };
  } catch {
    return {
      msg: "<unprintable thrown value>",
      name: "Error",
    };
  }
}
//@ chunk-hmaqgh0x.js:12897-13007 placement
/**
 * 日志参数文本：原始值转字符串，对象与函数给 "[类型]"。
 */
function describeLogArg(value) {
  if (value == null || (typeof value !== "object" && typeof value !== "function")) return String(value);
  return `[${typeof value}]`;
}
export {
  createVmErrorDescriber,
  timeoutOption,
  describeThrownValue,
  createSealedError,
  describeLogArg,
  vmImportOptions,
  createVmInboundCopier,
  createVmRealm,
  NO_IMPORT_OPTIONS,
  callWithArgs,
  VM_HOST_FN_WRAPPER,
  createVmRejectionWatcher,
  removeCaptureStackTrace,
  createVmHostFnWrapper,
  awaitAsNullProto,
};
