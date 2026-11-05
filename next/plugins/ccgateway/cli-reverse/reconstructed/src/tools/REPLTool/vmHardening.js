/**
 * tools/REPLTool/vmHardening.ts
 *
 * 宿主/VM 边界密封：把宿主值重建成 VM 领值，防 constructor 逃逸（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (8)
 * attribution: placement 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import "vm";
import * as vmModule_2 from "vm";
import { types } from "util";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { runInVm } from "./vmContext.js";
import { CLONE_DEPTH_THRESHOLD } from "../../utils/structuredCloneLimits.js";
import { MCPTOOLERROR } from "./mcpTools.js";
import { UNWRITABLEARGUMENTSERROR } from "./unwritableArguments.js";
import { createVmSideCopier, hostCopy } from "../../plugins/functionHooks/vm/boundaryCopy.js";
import { isUntrustedObject } from "../../utils/untrustedValues.js";
import { payloadOf } from "./serialization.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-n51jggtb.js:115601-115620 placement
/**
 * 被钉死全局的错误集合。
 */
var weakSet; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-n51jggtb.js:115601", () => {
  weakSet = new WeakSet();
});
//@ chunk-n51jggtb.js:115620-115869 placement
/**
 * REPL 代码把受管全局改成不可配置时抛出的 VMContextPoisonedError。
 */
let VMContextPoisonedError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-n51jggtb.js:115620", () => {
  VMContextPoisonedError = class VMContextPoisonedError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    key;
    constructor(key) {
      super(
        `REPL sandbox code made the global '${key}' non-configurable; the host cannot restore it`,
        "REPL sandbox pinned a managed global non-configurable",
      );
      this.name = "VMContextPoisonedError";
      this.key = key;
      weakSet.add(this);
    }
  };
});
//@ chunk-n51jggtb.js:115869-115932 placement
/**
 * 判断错误是否为 VM 上下文污染。
 */
function isVmContextPoisoned(value) {
  return typeof value === "object" && value !== null && weakSet.has(value);
}
//@ chunk-n51jggtb.js:115932-116057 placement
/**
 * 在 VM 全局上定义可写属性，失败时抛污染错误。
 */
function defineGlobal(target, key, value) {
  try {
    Object.defineProperty(target, key, {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  } catch {
    throw new VMContextPoisonedError(key);
  }
}
//@ chunk-n51jggtb.js:116057-116162 placement
/**
 * 把对象原型置空并删除 constructor/prototype，防止逃逸。
 */
function stripPrototype(value) {
  Object.setPrototypeOf(value, null);
  try {
    delete value.constructor;
    delete value.prototype;
  } catch {}
  return value;
}
//@ chunk-n51jggtb.js:116162-116519 placement
/**
 * REPL 内 import() 的固定拒绝函数与其错误字段白名单。
 */
var IMPORT_UNAVAILABLE_SOURCE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ERROR_LIKE_KEYS;
deferInit("chunk-n51jggtb.js:116162", () => {
  IMPORT_UNAVAILABLE_SOURCE = `(() => {
  const msg = 'import() is not available in REPL code.'
  const err = Object.freeze({
    __proto__: null,
    name: 'Error',
    message: msg,
    stack: 'Error: ' + msg,
    toString: Object.freeze(() => 'Error: ' + msg),
  })
  return () => { throw err }
})()`;
  ERROR_LIKE_KEYS = new Set(["message", "name", "stack", "then", "toJSON", "toString", "valueOf"]);
});
//@ chunk-n51jggtb.js:116519-143610 placement
/**
 * VM 侧密封器：把宿主值安全重建为 VM 领值（typed array/Map/Set/Date/Error 等），并暴露 stringify/toStr 等。
 */
function createVmIsolationLayer(context, importModuleDynamically) {
  let rejectImport = vmModule_2.runInContext(IMPORT_UNAVAILABLE_SOURCE, context, {
    importModuleDynamically,
  });
  let vmApi = runInVm(
    `(() => {
      // Capture intrinsics in closure NOW (literal-eval time, pre-user-code).
      // Global identifiers inside these function bodies resolve at CALL time
      // via globalThis \u2014 hardenVMIntrinsics freezes the String/Object
      // constructor OBJECTS but the globalThis bindings stay writable, so VM
      // code can reassign globalThis.String and a call-time lookup would use
      // it (same convention as createVMClone in vmHardening.ts). The
      // value-captured members below (Err/errorNames) are immune by
      // construction, and stringify and toStr call what is captured here.
      const _String = String, _keys = Object.keys,
            _defineProperty = Object.defineProperty, _isArray = Array.isArray,
            _Error = Error, _TypeError = TypeError, _parse = JSON.parse,
            _stringify = JSON.stringify, _apply = Reflect.apply,
            _Promise = Promise
      // Intrinsics for the rebuild* builders, captured for the same reason. The
      // builders read a source through these, a typed-array index or a descriptor:
      // never a named or symbol property by Get, its prototype or its iterator.
      const _Map = Map, _Set = Set, _RegExp = RegExp, _DataView = DataView,
            _ArrayBuffer = ArrayBuffer, _Uint8Array = Uint8Array, _Date = Date,
            _WeakMap = WeakMap, _WeakSet = WeakSet,
            _AggregateError = AggregateError, _isView = ArrayBuffer.isView,
            _min = Math.min, _gOPD = Object.getOwnPropertyDescriptor,
            _getProto = Object.getPrototypeOf, _ownKeys = Reflect.ownKeys
      const _getter = (proto, key) => _gOPD(proto, key).get
      const _TypedArrayProto = _getProto(Int8Array.prototype)
      // The length getter gives 0 for a detached or out-of-bounds view.
      const _taName = _getter(_TypedArrayProto, Symbol.toStringTag),
            _taLength = _getter(_TypedArrayProto, 'length')
      const _taCtors = { __proto__: null,
        Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array,
        Int32Array, Uint32Array, Float32Array, Float64Array,
        BigInt64Array, BigUint64Array,
        ...(typeof Float16Array !== 'undefined' ? { Float16Array } : {}),
      }
      const _dvBuffer = _getter(DataView.prototype, 'buffer'),
            _dvByteOffset = _getter(DataView.prototype, 'byteOffset'),
            _dvByteLength = _getter(DataView.prototype, 'byteLength'),
            _abByteLength = _getter(ArrayBuffer.prototype, 'byteLength'),
            _dateGetTime = Date.prototype.getTime
      const _mapEntries = Map.prototype.entries,
            _mapSize = _getter(Map.prototype, 'size'),
            _mapIterNext = _getProto(new Map().entries()).next,
            _setValues = Set.prototype.values,
            _setSize = _getter(Set.prototype, 'size'),
            _setIterNext = _getProto(new Set().values()).next
      // Every built-in Error class this engine has, the same list the
      // intrinsics are frozen from (vmHardening.ts).
      const _SuppressedError = globalThis.SuppressedError
      const _errorClasses = [
        Error, EvalError, RangeError, ReferenceError, SyntaxError, TypeError,
        URIError, AggregateError, _SuppressedError,
      ].filter(C => typeof C === 'function')
      const _errorCtors = { __proto__: null }
      for (const C of _errorClasses) _errorCtors[C.name] = C
      // A copy that stopped at MAX_VM_ARRAY_LENGTH says so where the model
      // will read it: its true size, as an own property inspect prints.
      const _markTruncated = (out, size) => {
        if (size > ${CLONE_DEPTH_THRESHOLD}) {
          _defineProperty(out, 'truncatedFrom', { value: size, writable: true, enumerable: true, configurable: true })
        }
        return out
      }
      // RegExp.prototype.flags reads each flag by a property Get on the
      // instance, which an own accessor would intercept; the per-flag getters
      // read the slot. A flag this engine lacks is skipped.
      const _reSource = _getter(RegExp.prototype, 'source')
      const _reFlags = [
        ['d', 'hasIndices'], ['g', 'global'], ['i', 'ignoreCase'],
        ['m', 'multiline'], ['s', 'dotAll'], ['u', 'unicode'],
        ['v', 'unicodeSets'], ['y', 'sticky'],
      ].map(([ch, name]) => [ch, _gOPD(RegExp.prototype, name)?.get])
       .filter(([, get]) => get !== undefined)
      // At most MAX_VM_ARRAY_LENGTH results: a longer walk is host work the vm
      // timeout cannot interrupt.
      const _drain = (it, next) => {
        const out = []
        while (out.length < ${CLONE_DEPTH_THRESHOLD}) {
          const r = _apply(next, it, [])
          if (r.done) break
          out[out.length] = r.value
        }
        return out
      }
      // Single error-message extractor for EVERY catch in this literal
      // (also exported as errMsg). Read .message ONCE \u2014 a stateful accessor
      // can return a string to a typeof check and a hostile VM value to a
      // re-read, smuggling a non-string into {error} objects that cross to
      // the host. String() fallback via the captured intrinsic; never
      // throws ('<unprintable thrown value>' for poison getters), so a
      // throwing getter can't turn an {error} return into a raw rejection.
      const _errStr = (e) => {
        try {
          const m = e?.message
          return typeof m === 'string' ? m : _String(e)
        } catch {
          return '<unprintable thrown value>'
        }
      }
      // .stack under the same rules (exported as errStack): one read, a
      // string or nothing, never throws.
      const _errStack = (e) => {
        try {
          const s = e?.stack
          return typeof s === 'string' ? s : ''
        } catch {
          return ''
        }
      }
      // MCP inner-call failures cross the realm boundary by NAME: the
      // host-side wrapper throws an error named MCP_INNER_TOOL_ERROR_NAME
      // (toolWrappers.ts, flag-gated), and this rebuilds it as a VM-realm
      // Error so the script's catch never holds a host-realm object (a host
      // Error would be a sandbox escape via e.constructor.constructor). Each
      // property is read ONCE and typeof-gated (stateful-accessor hygiene,
      // same as _errStr); only string primitives cross, and .detail is
      // re-parsed from JSON with VM-realm _parse so the object is VM-owned.
      const _throwMcpVM = (e) => {
        const err = new _Error(_errStr(e))
        _defineProperty(err, 'name', { value: '${MCPTOOLERROR}', configurable: true, writable: true })
        const t = e?.toolName
        if (typeof t === 'string') {
          _defineProperty(err, 'toolName', { value: t, enumerable: true, configurable: true, writable: true })
        }
        const m = e?.error
        _defineProperty(err, 'error', { value: typeof m === 'string' ? m : _errStr(e), enumerable: true, configurable: true, writable: true })
        const d = e?.detailJson
        if (typeof d === 'string') {
          try {
            _defineProperty(err, 'detail', { value: _parse(d), enumerable: true, configurable: true, writable: true })
          } catch {}
          // Also stamp detailJson (non-enumerable plumbing) so the rebuilt
          // error round-trips through a SECOND _throwMcpVM: a helper whose
          // tool is an MCP tool (an SDK MCP server may register one under a
          // bare name such as Read) re-enters wrap()'s catch with the
          // rebuilt error (rejections propagate by identity), and without
          // this the second pass reads e?.detailJson === undefined and
          // silently drops .detail, breaking the advertised e.detail
          // contract on the nested path.
          try {
            _defineProperty(err, 'detailJson', { value: d, enumerable: false, configurable: true, writable: true })
          } catch {}
        }
        throw err
      }
      // A VM promise that settles with what call() returns. VM code never awaits
      // a host promise: on engines with the bug, the next thenable awaited after
      // one gets a host-realm resolving function. Promise.resolve does not help.
      // The call runs in the executor so a stack overflow on entry comes before
      // any host work. A throw and a rejection reach wrap's catch as before.
      const _viaVM = (call) => new _Promise((resolve, reject) => {
        const returned = call()
        const then = returned !== null && typeof returned === 'object' ? returned.then : undefined
        if (typeof then === 'function') _apply(then, returned, [resolve, reject])
        else resolve(returned)
      })
      return {
      arr: () => [],
      obj: () => ({}),
      parseJson: (text) => _parse(text),
      wrap: (hostFn, cloneFn, sanitizeFn) => (input) => {
        const p = (async () => {
          // INTAKE sanitize, VM-side (\uD83D\uDEE1\uFE0F HIGH, \xA710.5.12): hostFn's input is
          // otherwise a live VM reference whose get/ownKeys traps would
          // receive HOST-realm argArrays when host code (zod parse, the
          // consent param walk) reads it on V8. The walk runs here in the
          // VM, so traps only ever see VM-realm arguments; hostFn receives
          // inert data-property containers. Sanitize throws (length caps,
          // unreadable traps) take this wrap's normal {error} path.
          try { return cloneFn(await _viaVM(() => hostFn(sanitizeFn ? sanitizeFn(input) : input))) }
          catch (e) {
            // Read .name ONCE (stateful-accessor hygiene, as _errStr).
            const n = e?.name
            if (n === '${MCPTOOLERROR}') _throwMcpVM(e)
            // A call refused for its arguments (unwritableArguments.ts) also
            // crosses by name. Only the message, a string, goes into the
            // VM-realm error that the script catches.
            if (n === '${UNWRITABLEARGUMENTSERROR}') throw new _TypeError(_errStr(e))
            return { error: _errStr(e) }
          }
        })()
        // With the stack nearly full, p.catch() can itself overflow. p must
        // still be returned, or nothing can handle its rejection. The catch {}
        // stays empty: even reading the error there can overflow again.
        try { p.catch(() => {}) } catch {}
        return p
      },
      wrapN: (hostFn, cloneFn, sanitizeFn) => (...args) => {
        const p = (async () => {
          // Same intake sanitize as wrap, per positional arg.
          try { return cloneFn(await _viaVM(() => hostFn(...(sanitizeFn ? args.map(a => sanitizeFn(a)) : args)))) }
          catch (e) {
            // Read .name ONCE (stateful-accessor hygiene, as _errStr).
            const n = e?.name
            if (n === '${MCPTOOLERROR}') _throwMcpVM(e)
            return { error: _errStr(e) }
          }
        })()
        try { p.catch(() => {}) } catch {}
        return p
      },
      resolveDeep: async (v, cloneFn) => {
        // This catch's return is the one resolveDeep exit that bypasses
        // cloneFn, so every member of the {error} value MUST be a
        // primitive \u2014 _errStr guarantees a string, keeping raw VM objects
        // from crossing the boundary by identity. This exit IS reachable
        // for MCP rejections: a script ENDING on an unawaited MCP call
        // (e.g. last expression \`o.x = mcp__server__tool({})\`) returns the
        // pending promise inside the transpiler envelope, awaitVM unwraps
        // only the IIFE promise down to the envelope (null-proto, no
        // .then), and the inner promise first settles here. Mirror the
        // per-key marker so the failure value is never a bare
        // success-shaped {error} \u2014 but primitives ONLY: unlike the per-key
        // catch below, nothing on this exit passes through cloneFn, so
        // embedding e.detail (an object \u2014 and on an impostor, a hostile
        // getter's Proxy) would cross by identity. The raw body text is
        // already in the error string; consumers can parse it. (The
        // marker itself is normal-proto, matching the per-key marker it
        // mirrors \u2014 null-proto bought nothing here: the VM's
        // Object.prototype is frozen by hardenVMIntrinsics, and the host
        // .then-probes only the envelope, never the inner value. Note
        // util.inspect still prefixes BOTH markers' tool_result
        // renderings \u2014 the frozen intrinsics accessorize
        // Object.prototype.constructor, defeating inspect's plain-object
        // fast path regardless of prototype; the realm-safe fix would be
        // a host-side rebuild of this primitive-only value, deliberately
        // not added at this boundary.)
        try { v = await v } catch (e) {
          // try-guarded reads keep this catch total (resolveDeep must never
          // reject): a hostile rejection value with a throwing name/toolName
          // getter degrades to the bare-{error} shape, same as _errStr's
          // own throw discipline.
          let n; try { n = e?.name } catch {}
          if (n === '${MCPTOOLERROR}') {
            const failure = { error: _errStr(e), mcpToolError: true }
            let t; try { t = e?.toolName } catch {}
            if (typeof t === 'string') {
              _defineProperty(failure, 'toolName', { value: t, writable: true, enumerable: true, configurable: true })
            }
            return {__proto__: null, v: failure}
          }
          return {__proto__: null, v: { error: _errStr(e) }}
        }
        // Not a view: listing a typed array's keys costs one string per element.
        if (v !== null && typeof v === 'object' && !_isArray(v) && !_isView(v)) {
          try {
            for (const k of _keys(v)) {
              try {
                const val = v[k]
                if (val === null || typeof val !== 'object' || typeof val.then !== 'function') continue
                _defineProperty(v, k, { value: await val, writable: true, enumerable: true, configurable: true })
              } catch (e) {
                // o.*-assigned promises are awaited only here, at return
                // time \u2014 there is no script left to throw into, so a
                // rejected MCP call can't keep the throw contract on this
                // path. Second-best: carry the marker + toolName so the
                // failure value is discriminable from data (a bare {error}
                // is exactly the success-shaped value the MCP throw
                // contract exists to eliminate). Try-guarded reads keep
                // this catch total, mirroring the top-level catch above: a
                // throwing getter on the rejection value would otherwise
                // throw INSIDE this catch, escape to the enclosing for-loop
                // try, and silently abort auto-await of every remaining
                // o.* key (dropping innocent pending tool calls).
                let failure
                let n; try { n = e?.name } catch {}
                if (n === '${MCPTOOLERROR}') {
                  failure = { error: _errStr(e), mcpToolError: true }
                  let t; try { t = e?.toolName } catch {}
                  if (typeof t === 'string') {
                    _defineProperty(failure, 'toolName', { value: t, writable: true, enumerable: true, configurable: true })
                  }
                  // The rejection here is normally the _throwMcpVM-rebuilt
                  // VM error, which carries .detail already parsed
                  // (VM-realm); an impostor's throwing getter degrades to
                  // a detail-less failure value.
                  let d; try { d = e?.detail } catch {}
                  if (d !== null && typeof d === 'object') {
                    _defineProperty(failure, 'detail', { value: d, writable: true, enumerable: true, configurable: true })
                  }
                } else {
                  failure = { error: _errStr(e) }
                }
                _defineProperty(v, k, { value: failure, writable: true, enumerable: true, configurable: true })
              }
            }
          } catch {}
        }
        try { return {__proto__: null, v: cloneFn(v)} } catch { return {__proto__: null, v: undefined} }
      },
      awaitVM: async (v) => v,
      // ENTRY trampoline for every host function VM code can call through
      // Sealers.fn. Invariant: VM code only ever [[Call]]s this VM-realm
      // arrow, never hostFn itself, so an engine error raised on entering the
      // callee (stack exhaustion) is created in THIS realm; and whatever
      // hostFn throws \u2014 a host DOMException from atob, a VMContextPoisonedError,
      // a throwVM Error, or an engine RangeError raised inside the host frame \u2014
      // is caught HERE and rebuilt as a VM Error from a primitive string. The
      // catch runs no host code: _errStr reads .message VM-side (a host-side
      // read would hand a Proxy trap a host-realm args array, \xA710.5.12 \u2014
      // pinned by the poison-proxy suite in vmContextEscape.test.ts) and
      // _apply/_Error are the captured intrinsics, so a secondary failure
      // inside the catch is VM-realm too. Ordinary (non-null-proto) arrow: its
      // constructor chain is this realm's Function, like wrap()'s products.
      // (wrap/wrapN/resolveDeep above enter their host functions directly,
      // inside VM-side try/catch blocks whose catch yields only VM-realm
      // values; the thrown host value never reaches the script there either.)
      sealFn: (hostFn) => (...args) => {
        try { return _apply(hostFn, undefined, args) }
        catch (e) { throw new _Error(_errStr(e)) }
      },
      // Capped index copy into a fresh array of the same kind; an index read on
      // a typed array reaches no accessor and no prototype. undefined for a
      // kind this literal does not know.
      rebuildTypedArray: (v) => {
        const C = _taCtors[_apply(_taName, v, [])]
        if (C === undefined) return undefined
        const length = _apply(_taLength, v, [])
        const n = _min(length, ${CLONE_DEPTH_THRESHOLD})
        const out = new C(n)
        for (let i = 0; i < n; i++) out[i] = v[i]
        return _markTruncated(out, length)
      },
      // A DataView's ArrayBuffer sits in an internal slot, not a property, and
      // host inspect prints it: copy the bytes (capped) into a fresh buffer.
      // byteLength throws for a detached buffer.
      rebuildDataView: (v) => {
        const length = _apply(_dvByteLength, v, [])
        const n = _min(length, ${CLONE_DEPTH_THRESHOLD})
        const src = new _Uint8Array(_apply(_dvBuffer, v, []), _apply(_dvByteOffset, v, []), n)
        const buf = new _ArrayBuffer(n)
        const dst = new _Uint8Array(buf)
        for (let i = 0; i < n; i++) dst[i] = src[i]
        return _markTruncated(new _DataView(buf), length)
      },
      // As rebuildDataView. A detached buffer has length 0, and a Uint8Array
      // over it throws.
      rebuildArrayBuffer: (v) => {
        const length = _apply(_abByteLength, v, [])
        const n = _min(length, ${CLONE_DEPTH_THRESHOLD})
        const src = new _Uint8Array(v, 0, n)
        const buf = new _ArrayBuffer(n)
        const dst = new _Uint8Array(buf)
        for (let i = 0; i < n; i++) dst[i] = src[i]
        return _markTruncated(buf, length)
      },
      rebuildDate: (v) => new _Date(_apply(_dateGetTime, v, [])),
      // Host inspect prints "<items unknown>" for either, so an empty one
      // renders as the script's did.
      weakMapNew: () => new _WeakMap(),
      weakSetNew: () => new _WeakSet(),
      // Rebuilt from its slots, flag by flag (see _reFlags). lastIndex is always
      // an own data property, so the descriptor read finds it.
      rebuildRegExp: (v) => {
        let flags = ''
        for (let i = 0; i < _reFlags.length; i++) {
          if (_apply(_reFlags[i][1], v, [])) flags += _reFlags[i][0]
        }
        const out = new _RegExp(_apply(_reSource, v, []), flags)
        const last = _gOPD(v, 'lastIndex')
        if (last !== undefined && typeof last.value === 'number') out.lastIndex = last.value
        return out
      },
      // A fresh Error of the source's class, from primitives. stack is always
      // overwritten: the engine's own names this builder's frames. Listing the
      // keys last fills in the lazy properties here (see readError).
      rebuildError: (className, message, name, stack) => {
        const C = _errorCtors[className] ?? _Error
        const out = C === _AggregateError
          ? new C([], message)
          : C === _SuppressedError
            ? new C(undefined, undefined, message)
            : new C(message)
        if (typeof name === 'string' && name !== (className ?? 'Error')) {
          _defineProperty(out, 'name', { value: name, writable: true, configurable: true })
        }
        _defineProperty(out, 'stack', {
          value: typeof stack === 'string' ? stack : undefined,
          writable: true, configurable: true,
        })
        _ownKeys(out)
        return out
      },
      // What the host needs of a script's Error, read here and not from a host
      // frame. JavaScriptCore builds an Error's own stack on the first listing of
      // its keys or read of its stack, coercing the message to do it; asked from
      // here, a message object's toString runs in a VM frame. Under V8 the stack
      // is formatted in the frame that first reads it, so the reads are here too.
      // Lists the keys first, then takes message, name and
      // stack as text (a string as it is; a number, boolean or bigint coerced;
      // anything else undefined) and at most MAX_VM_ARRAY_LENGTH string keys.
      // undefined if any of it throws.
      readError: (e) => {
        try {
          _ownKeys(e)
          const text = (key) => {
            const d = _gOPD(e, key)
            const value = d !== undefined && 'value' in d ? d.value : undefined
            const kind = typeof value
            return kind === 'string' ? value
              : kind === 'number' || kind === 'boolean' || kind === 'bigint' ? _String(value)
              : undefined
          }
          const read = { __proto__: null, message: text('message'), name: text('name'), stack: text('stack'), keys: [] }
          const all = _ownKeys(e)
          for (let i = 0; i < all.length && read.keys.length < ${CLONE_DEPTH_THRESHOLD}; i++) {
            if (typeof all[i] === 'string') read.keys[read.keys.length] = all[i]
          }
          return read
        } catch { return undefined }
      },
      // What the model reads where a value could not be copied. Plain words,
      // fixed and short, made here.
      promiseWords: '[a promise that was not awaited: add await to get its value]',
      droppedWords: (what) => '[' + what + ' that could not be copied out of the script]',
      mapEntries: (m) => _drain(_apply(_mapEntries, m, []), _mapIterNext),
      setValues: (s) => _drain(_apply(_setValues, s, []), _setIterNext),
      mapNew: (m) => _markTruncated(new _Map(), _apply(_mapSize, m, [])),
      setNew: (s) => _markTruncated(new _Set(), _apply(_setSize, s, [])),
      // Error prototype to class name: no property of the source is read for it.
      errorNames: new _Map(_errorClasses.map(C => [C.prototype, C.name])),
      // Bare, unlike the two below: it only gets primitive strings, so it runs no script code.
      Err: Error,
      // VM frames around the intrinsics: see Sealers.toStr. Strict, so a script's
      // method never gets one as .caller. No tail call: it would drop the frame.
      stringify: (v, r, sp) => { 'use strict'; const str = _stringify(v, r, sp); return str },
      toStr: (v) => { 'use strict'; const str = _String(v); return str },
      errMsg: _errStr,
      errStack: _errStack,
      }
    })()`,
    context,
    rejectImport,
  );
  let sanitize = createVmSideCopier(context, {
    importModuleDynamically: rejectImport,
  }).sanitize;
  function errMsg(error) {
    let message;
    try {
      message = vmApi.errMsg(error);
    } catch {
      return "<unprintable thrown value>";
    }
    return typeof message === "string" ? message : "<unprintable thrown value>";
  }
  function errStack(error) {
    let stack;
    try {
      stack = vmApi.errStack(error);
    } catch {
      return "";
    }
    return typeof stack === "string" ? stack : "";
  }
  function cloneIntoVm(value, seen = new WeakMap()) {
    if (typeof value === "function") return;
    if (value === null || typeof value !== "object") return value;
    if (isUntrustedObject(value)) return;
    let cachedJson = payloadOf(value);
    if (cachedJson !== undefined) return vmApi.parseJson(cachedJson);
    let existing = seen.get(value);
    if (existing !== undefined) return existing;
    if (types.isPromise(value)) return vmApi.promiseWords;
    let rebuild = types.isTypedArray(value)
      ? vmApi.rebuildTypedArray
      : types.isDataView(value)
        ? vmApi.rebuildDataView
        : types.isArrayBuffer(value)
          ? vmApi.rebuildArrayBuffer
          : types.isRegExp(value)
            ? vmApi.rebuildRegExp
            : types.isDate(value)
              ? vmApi.rebuildDate
              : types.isWeakMap(value)
                ? vmApi.weakMapNew
                : types.isWeakSet(value)
                  ? vmApi.weakSetNew
                  : undefined;
    if (rebuild !== undefined) {
      let rebuilt;
      try {
        rebuilt = rebuild(value);
      } catch {
        rebuilt = undefined;
      }
      if (rebuilt === undefined) return dropValue(kindOf(value));
      seen.set(value, rebuilt);
      return rebuilt;
    }
    if (types.isMap(value)) return cloneMapIntoVm(value, seen);
    if (types.isSet(value)) return cloneSetIntoVm(value, seen);
    if (types.isNativeError(value)) return cloneErrorIntoVm(value, seen);
    if (Array.isArray(value)) {
      let array = vmApi.arr();
      seen.set(value, array);
      let length = Number.isSafeInteger(value.length) ? value.length : 0;
      let count = Math.min(length, CLONE_DEPTH_THRESHOLD);
      for (let index = 0; index < count; index++) {
        let descriptor = Object.getOwnPropertyDescriptor(value, index);
        array[index] = cloneIntoVm(descriptor && "value" in descriptor ? descriptor.value : undefined, seen);
      }
      array.length = length;
      return array;
    }
    let object = vmApi.obj();
    seen.set(value, object);
    for (let key of Object.keys(value)) {
      let descriptor = Object.getOwnPropertyDescriptor(value, key);
      Object.defineProperty(object, key, {
        value: cloneIntoVm(descriptor && "value" in descriptor ? descriptor.value : undefined, seen),
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }
    return object;
  }
  let droppedValues = new Set();
  function dropValue(kindLabel) {
    let words = vmApi.droppedWords(kindLabel);
    droppedValues.add(words);
    return words;
  }
  function keepEntry(clonedKey, originalKey) {
    if (clonedKey === undefined && originalKey !== undefined) return false;
    return !(typeof clonedKey === "string" && clonedKey !== originalKey && droppedValues.has(clonedKey));
  }
  function kindOf(value) {
    return types.isTypedArray(value)
      ? "a typed array"
      : types.isDataView(value)
        ? "a DataView"
        : types.isArrayBuffer(value)
          ? "an ArrayBuffer"
          : types.isRegExp(value)
            ? "a RegExp"
            : types.isDate(value)
              ? "a Date"
              : "a value";
  }
  function cloneMapIntoVm(map, seen) {
    let entries;
    try {
      entries = vmApi.mapEntries(map);
    } catch {
      return dropValue("a Map");
    }
    let copy = vmApi.mapNew(map);
    seen.set(map, copy);
    let count = entries.length;
    for (let index = 0; index < count; index++) {
      let pair = entries[index];
      let key = cloneIntoVm(pair[0], seen);
      if (!keepEntry(key, pair[0])) continue;
      Map.prototype.set.call(copy, key, cloneIntoVm(pair[1], seen));
    }
    return copy;
  }
  function cloneSetIntoVm(set, seen) {
    let entries;
    try {
      entries = vmApi.setValues(set);
    } catch {
      return dropValue("a Set");
    }
    let copy = vmApi.setNew(set);
    seen.set(set, copy);
    let count = entries.length;
    for (let index = 0; index < count; index++) {
      let cloned = cloneIntoVm(entries[index], seen);
      if (!keepEntry(cloned, entries[index])) continue;
      Set.prototype.add.call(copy, cloned);
    }
    return copy;
  }
  function cloneErrorIntoVm(error, seen) {
    let parts = vmApi.readError(error);
    if (parts === undefined) return dropValue("an Error");
    let { message, name, stack } = parts;
    let copy;
    try {
      copy = vmApi.rebuildError(
        vmApi.errorNames.get(Object.getPrototypeOf(error)),
        typeof message === "string" ? message : "",
        typeof name === "string" ? name : undefined,
        typeof stack === "string" ? stack : undefined,
      );
    } catch {
      return dropValue("an Error");
    }
    seen.set(error, copy);
    let keys = parts.keys;
    let count = Math.min(keys.length, CLONE_DEPTH_THRESHOLD);
    for (let index = 0; index < count; index++) {
      let key = keys[index];
      if (typeof key !== "string" || ERROR_LIKE_KEYS.has(key)) continue;
      let descriptor = Object.getOwnPropertyDescriptor(error, key);
      if (descriptor === undefined || !("value" in descriptor)) continue;
      let clonedValue = cloneIntoVm(descriptor.value, seen);
      if (clonedValue === undefined && descriptor.value !== undefined) continue;
      Object.defineProperty(copy, key, {
        value: clonedValue,
        writable: true,
        enumerable: descriptor.enumerable === true,
        configurable: true,
      });
    }
    return copy;
  }
  let sealedValues = new WeakSet();
  function sealAsync(fn) {
    sealedValues.add(fn);
    return fn;
  }
  return {
    fn: (fn) => vmApi.sealFn(stripPrototype((...args) => fn(...args))),
    clone: cloneIntoVm,
    throwVM: (message) => {
      throw new vmApi.Err(message);
    },
    rejectImport,
    stringify: vmApi.stringify,
    toStr: vmApi.toStr,
    errMsg,
    errStack,
    asyncData: (fn) => {
      let wrapped = stripPrototype((input) => fn(hostCopy(input)));
      return sealAsync(vmApi.wrap(wrapped, cloneIntoVm, sanitize));
    },
    asyncDataN: (fn) => {
      let wrapped = stripPrototype((...args) => fn(...args));
      return sealAsync(vmApi.wrapN(wrapped, cloneIntoVm));
    },
    resolveDeep: (promise) => vmApi.resolveDeep(promise, cloneIntoVm),
    awaitVM: vmApi.awaitVM,
    isSealedAsync: (value) => typeof value === "function" && sealedValues.has(value),
  };
}
//@ chunk-n51jggtb.js:143610-143707 placement
/**
 * 安全读取自有属性值。
 */
function ownValue(value, key) {
  let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(value, key);
  return ownPropertyDescriptor && "value" in ownPropertyDescriptor ? ownPropertyDescriptor.value : undefined;
}
export {
  defineGlobal,
  isVmContextPoisoned,
  VMContextPoisonedError,
  ownValue,
  createVmIsolationLayer,
  IMPORT_UNAVAILABLE_SOURCE,
};
