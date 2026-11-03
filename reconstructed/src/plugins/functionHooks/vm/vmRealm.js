/**
 * plugins/functionHooks/vm/vmRealm.ts
 *
 * 创建隔离 VM realm 与宿主函数包装（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4121qate.js (18)
 * attribution: placement 18
 */
import * as vmModule from "vm";
import * as vmModule_2 from "vm";
import * as vmModule_3 from "vm";
import * as vmModule_4 from "vm";
import * as vmModule_5 from "vm";
import * as vmModule_6 from "vm";
import * as vmModule_7 from "vm";
import * as vmModule_8 from "vm";
import * as vmModule_9 from "vm";
import * as vmModule_10 from "vm";
import * as vmModule_11 from "vm";
import * as vmModule_12 from "vm";
import * as vmModule_13 from "vm";
import * as vmModule_14 from "vm";
import { CLONE_DEPTH_THRESHOLD } from "../../../utils/structuredCloneLimits.js";
import { copyAcrossVmBoundary } from "./boundaryCopy.js";
import { sanitizeAndLogError } from "../../../components/Feedback.js";
import { SubAgentContext } from "../../../components/CtrlOToExpand.js";

//@ chunk-4121qate.js:49745-49840 placement
var Yp = Symbol("compile with no import() hook"),
  freeze = Object.freeze({ importModuleDynamically: Yp });
/**
 * 校验 VM 编译选项：importModuleDynamically 必须是函数或"无 import 钩子"标记，后者返回 undefined。
 */
//@ chunk-4121qate.js:49840-50178 placement
function vmImportOptions(e) {
  let o = e?.importModuleDynamically;
  if (o === Yp) return;
  if (typeof o !== "function")
    throw TypeError(
      "The options argument of hardenVMIntrinsics and createVMIntakeWalkers must be either { importModuleDynamically: <function> } or COMPILE_WITHOUT_IMPORT_HOOK, which src/utils/vmHardening.ts exports",
    );
  return { importModuleDynamically: o };
}
//@ chunk-4121qate.js:50178-50243 placement
function B5e(e, o) {
  if (o != null) return { timeout: o };
  return { timeout: e };
}
/**
 * 创建钩子运行用的隔离 VM realm，装入全局与宿主函数包装
 */
//@ chunk-4121qate.js:50243-56738 placement
function createVmRealm(e, o) {
  vmModule_2.runInContext(
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
    e,
    vmImportOptions(o),
  );
}
//@ chunk-4121qate.js:56738-56820 placement
function cfr(e) {
  vmModule_2.runInContext("'use strict'; delete Error.captureStackTrace", e);
}
//@ chunk-4121qate.js:56820-56909 placement
function $An(e) {
  return vmModule_2.runInContext("(async v => ({__proto__: null, v: await v}))", e);
}
//@ chunk-4121qate.js:56909-56984 placement
function FAn(e) {
  return vmModule_2.runInContext("((fn, ...args) => fn(...args))", e);
}
/**
 * 在 VM 上下文中创建读取抛出值 name/message/stack 的函数（各字段独立 try，取不到时用默认值）。
 */
//@ chunk-4121qate.js:56984-57646 placement
function createVmErrorDescriber(e) {
  return vmModule_2.runInContext(
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
    e,
  );
}
/**
 * 在 VM 上下文中创建把值复制进 VM 的 copy 函数（数组长度上限、原型键处理）。
 */
//@ chunk-4121qate.js:57646-57891 placement
function createVmInboundCopier(
  e,
  { arrayLengthCap: o, protoKey: r } = { arrayLengthCap: CLONE_DEPTH_THRESHOLD, protoKey: "left-out" },
) {
  return vmModule_2.runInContext(
    `(() => {
      'use strict';
      ${copyAcrossVmBoundary({ arrayLengthCap: o, isLeaving: !1, isListSeenFirst: !1, protoKey: r })}
      return copy
    })()`,
    e,
  );
}
/**
 * 把抛出值重新封装为冻结纯错误对象的源码。
 */
//@ chunk-4121qate.js:57891-58479 placement
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
/**
 * 在 VM 上下文中创建宿主函数包装：同步抛错重新封装为冻结的纯错误对象。
 */
//@ chunk-4121qate.js:58479-58803 placement
function createVmHostFnWrapper(e) {
  return vmModule_2.runInContext(
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
    e,
  );
}
//@ chunk-4121qate.js:58803-60519 placement
function VM_HOST_FN_WRAPPER(e) {
  return vmModule_2.runInContext(
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
    e,
  );
}
/**
 * 在 VM 上下文中创建函数包装：调用返回的 Promise 被拒绝时把原因交给日志回调。
 */
//@ chunk-4121qate.js:60519-60910 placement
function createVmRejectionWatcher(e, o) {
  return vmModule_2.runInContext(
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
    e,
  )(sanitizeAndLogError(o));
}
/**
 * 创建冻结的纯错误对象（name、message、stack、toString），可安全跨越 VM 边界抛出。
 */
//@ chunk-4121qate.js:60910-61097 placement
function createSealedError(e, o = "Error", r) {
  let n = () => `${o}: ${e}`;
  return (
    Object.setPrototypeOf(n, null),
    Object.freeze(n),
    Object.freeze({ __proto__: null, name: o, message: e, stack: r ?? `${o}: ${e}`, toString: n })
  );
}
//@ chunk-4121qate.js:61097-61104 placement
var Ln;
/**
 * 获取（懒创建）在隔离 VM 中读取抛出值 msg/name/stack 的函数。
 */
//@ chunk-4121qate.js:61104-61903 placement
function getThrownValueDescriber() {
  if (!Ln) {
    let e = SubAgentContext({ __proto__: null }, { codeGeneration: { strings: !1, wasm: !1 } });
    (cfr(e),
      createVmRealm(e, freeze),
      (Ln = vmModule_2.runInContext(
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
        e,
      )));
  }
  return Ln;
}
//@ chunk-4121qate.js:61903-62161 placement
function describeThrownValue(e) {
  try {
    let o = getThrownValueDescriber()(e);
    return {
      msg: typeof o.msg === "string" ? o.msg : "<unprintable thrown value>",
      name: typeof o.name === "string" ? o.name : "Error",
      stack: typeof o.stack === "string" ? o.stack : void 0,
    };
  } catch {
    return { msg: "<unprintable thrown value>", name: "Error" };
  }
}
/**
 * 日志参数文本：原始值转字符串，对象与函数给 "[类型]"。
 */
//@ chunk-4121qate.js:62161-62271 placement
function describeLogArg(e) {
  if (e == null || (typeof e !== "object" && typeof e !== "function")) return String(e);
  return `[${typeof e}]`;
}

export {
  describeLogArg,
  describeThrownValue,
  createSealedError,
  vmImportOptions,
  createVmInboundCopier,
  createVmRealm,
  freeze,
  FAn,
  createVmErrorDescriber,
  VM_HOST_FN_WRAPPER,
  createVmRejectionWatcher,
  cfr,
  createVmHostFnWrapper,
  $An,
  B5e,
};
