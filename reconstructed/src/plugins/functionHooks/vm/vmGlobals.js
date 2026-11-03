/**
 * plugins/functionHooks/vm/vmGlobals.ts
 *
 * VM 全局对象与 console/编码等注入源码（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4121qate.js (44)
 * attribution: placement 44
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
import {
  isArrayBuffer,
  isArrayBuffer as isArrayBuffer_2,
  isUint8Array,
  isTypedArray,
  isDataView,
  isMap,
  isSet,
  isDate,
  isRegExp,
  isNativeError,
  isNumberObject,
  isStringObject,
  isBooleanObject,
  isBigIntObject,
  isArgumentsObject,
  isSharedArrayBuffer,
  isPromise,
  isWeakMap,
  isWeakSet,
  isGeneratorObject,
  isSymbolObject,
  isMapIterator,
  isSetIterator,
  isModuleNamespaceObject,
} from "util/types";
import {
  resolve,
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
} from "path";
import { NH, freezeApiObject } from "../dispatch/chain.js";
import { pd, NSi, $Si, Q5e } from "../../../utils/hooks/functionHookMatchers.js";
import {
  describeLogArg,
  createVmInboundCopier,
  createVmRealm,
  freeze,
  FAn,
  createVmErrorDescriber,
  VM_HOST_FN_WRAPPER,
} from "./vmRealm.js";
import { BT, VM_PRELUDE_SOURCE } from "./vmBootstrapSource.js";
import { errorMessage } from "../../../utils/errors.js";
import {
  STACK_EXHAUSTED_MESSAGE,
  STACK_NESTING_TOO_DEEP_MESSAGE,
  STACK_OVERFLOW_MESSAGES,
  MAX_STACK_NESTING_DEPTH,
} from "../../../utils/structuredCloneLimits.js";
import { HooksError, Qeo, apr, _xt, dpr } from "../hooksErrors.js";
import { Pf } from "../../../utils/untrustedValues.js";
import { SubAgentContext } from "../../../components/CtrlOToExpand.js";

/**
 * 为 VM 构造冻结的 console（log/info/warn/error/debug），输出带插件前缀写入调试日志。
 */
//@ chunk-4121qate.js:230219-230408 placement
function createVmConsole(e, o) {
  let r = (n) => NH(e((...s) => pd().log(`${o} console.${n}: ${s.map(describeLogArg).join(" ")}`)));
  return freezeApiObject({
    log: r("log"),
    info: r("info"),
    warn: r("warn"),
    error: r("error"),
    debug: r("debug"),
  });
}
//@ chunk-4121qate.js:230430-232816 placement
var VM_MATCHER_SOURCE = (e) =>
  vmModule_4.runInContext(
    BT(`(() => {
      const _isArray = Array.isArray, _keys = Object.keys,
            _create = Object.create, _defineProperty = Object.defineProperty,
            _getPrototypeOf = Object.getPrototypeOf, _RegExp = RegExp,
            _ObjectPrototype = Object.prototype,
            _toString = Object.prototype.toString,
            _toStringTag = Symbol.toStringTag,
            _Error = Error,
            _descriptor = Object.getOwnPropertyDescriptor,
            _source = _descriptor(RegExp.prototype, 'source').get,
            _flags = _descriptor(RegExp.prototype, 'flags').get
      const isRegExp = value => {
        try { _source.call(value); return true } catch { return false }
      }
      const isPlain = value => {
        const proto = _getPrototypeOf(value)
        return proto === null || _getPrototypeOf(proto) === null
      }
      const standIn = value => {
        const tag = { value: _toString.call(value).slice(8, -1) }
        return _create(_create(_ObjectPrototype, { [_toStringTag]: tag }))
      }
      const copy = (value, depth, budget) => {
        if (depth > ${NSi}) {
          throw new _Error(
            'the matcher is deeper than ${NSi} levels ' +
            '(a partial of e is a few levels deep; a cycle never ends)',
          )
        }
        if (--budget.left < 0) {
          throw new _Error(
            'the matcher holds more than ${$Si} values ' +
            '(a partial of e names a few fields)',
          )
        }
        if (typeof value === 'function') return () => {}
        if (typeof value !== 'object' || value === null) return value
        if (isRegExp(value)) {
          return new _RegExp(_source.call(value), _flags.call(value))
        }
        if (_isArray(value)) {
          const length = value.length
          const out = []
          for (let i = 0; i < length; i++) {
            out[i] = copy(value[i], depth + 1, budget)
          }
          return out
        }
        if (!isPlain(value)) return standIn(value)
        const out = {}
        for (const key of _keys(value)) {
          _defineProperty(out, key, {
            value: copy(value[key], depth + 1, budget),
            writable: true, enumerable: true, configurable: true,
          })
        }
        return out
      }
      return matcher => copy(matcher, 0, { left: ${$Si} })
    })()`),
    e,
  );
/**
 * 在 VM 上下文中创建 "value instanceof Object" 判断函数（异常返回 false）。
 */
//@ chunk-4121qate.js:232838-233062 placement
var createVmInstanceofObject = (e) =>
  vmModule_5.runInContext(
    BT(`(() => {
      const _Object = Object
      return value => {
        try {
          return value instanceof _Object
        } catch {
          return false
        }
      }
    })()`),
    e,
  );
//@ chunk-4121qate.js:233062-233135 placement
function lSi(e) {
  return createVmInboundCopier(e, { arrayLengthCap: void 0, protoKey: "carried" });
}
//@ chunk-4121qate.js:233189-233399 placement
var serializeUrl = (e) =>
  JSON.stringify({
    href: e.href,
    origin: e.origin,
    protocol: e.protocol,
    username: e.username,
    password: e.password,
    host: e.host,
    hostname: e.hostname,
    port: e.port,
    pathname: e.pathname,
    search: e.search,
    hash: e.hash,
  });
//@ chunk-4121qate.js:233443-233524 placement
function WP(e) {
  if (!isArrayBuffer(e)) throw TypeError("an ArrayBuffer was expected");
  return e;
}
//@ chunk-4121qate.js:233524-233616 placement
function GP(e) {
  if (typeof e !== "function") throw TypeError("a function was expected");
  return e;
}
//@ chunk-4121qate.js:233659-233738 placement
function En(e) {
  if (!isUint8Array(e)) throw TypeError("a Uint8Array was expected");
  return e;
}
//@ chunk-4121qate.js:233738-233826 placement
function at(e) {
  if (typeof e !== "string") throw TypeError("a string was expected");
  return e;
}
/**
 * VM 宿主辅助函数：字节长度、编解码、URL 解析、base64、随机数与摘要。
 */
//@ chunk-4121qate.js:233826-234554 placement
var createVmHostHelpers = (e) => ({
  root: e,
  byteLength: (o) => Buffer.byteLength(at(o), "utf8"),
  encodeInto: (o, r) => {
    new TextEncoder().encodeInto(at(o), En(r));
  },
  decodeUtf8: (o, r) => new TextDecoder("utf-8", { fatal: r === !0 }).decode(En(o)),
  parseUrl: (o, r) => {
    let n = at(o),
      s = r === void 0 ? r : at(r);
    try {
      return serializeUrl(new URL(n, s));
    } catch {
      return null;
    }
  },
  setUrlPart: (o, r, n) => {
    let s = at(o),
      i = at(r),
      p = at(n);
    try {
      let f = new URL(s);
      return ((f[i] = p), serializeUrl(f));
    } catch {
      return null;
    }
  },
  atob: (o) => globalThis.atob(at(o)),
  btoa: (o) => globalThis.btoa(at(o)),
  randomUUID: () => crypto.randomUUID(),
  fillRandom: (o) => {
    crypto.getRandomValues(En(o));
  },
  digestInto: async (o, r, n) => {
    let s = GP(n),
      digest = await crypto.subtle.digest(at(o), En(r));
    new Uint8Array(WP(s(digest.byteLength))).set(new Uint8Array(digest));
  },
  now: () => performance.now(),
});
//@ chunk-4121qate.js:234554-234576 placement
var zP = (e) => freezeApiObject(createVmHostHelpers(e));
//@ chunk-4121qate.js:234576-234641 placement
var Cc = ({ handle: handle, repeat: repeat }) => (repeat ? clearInterval(handle) : clearTimeout(handle));
/**
 * 调用插件定时器回调，回调抛错时记录警告日志。
 */
//@ chunk-4121qate.js:234641-234773 placement
var runTimerCallback = ({ pluginName: pluginName, api: api, invoke: invoke, fn: fn, args: args }) => {
  invoke(fn, args).catch((i) =>
    pd().log(`${pluginName}: ${api}: the callback threw: ${errorMessage(i)}`, "warn"),
  );
};
//@ chunk-4121qate.js:234773-234827 placement
function JP({ timers: timers, id: id, fire: fire }) {
  (timers.delete(id), runTimerCallback(fire));
}
//@ chunk-4121qate.js:234827-234879 placement
var dSi = (e, o) => vmModule_6.runInContext(BT(VM_PRELUDE_SOURCE), e)(zP(resolve_7(o)));
//@ chunk-4121qate.js:234879-234925 placement
function On(e) {
  try {
    return e();
  } catch {
    return !1;
  }
}
//@ chunk-4121qate.js:234925-234965 placement
var QAn = (e) => On(() => e instanceof Error);
/**
 * 改写 VM 中 Object.prototype.__proto__ 的 setter：对普通对象定义为自有属性而非修改原型（防原型污染）。
 */
//@ chunk-4121qate.js:234987-235753 placement
function patchProtoSetter(e) {
  vmModule_7.runInContext(
    BT(`(() => {
      const define = Object.defineProperty
      const prototype = Object.prototype
      const standard = Object.getOwnPropertyDescriptor(prototype, '__proto__')
      const read = standard.get
      const write = standard.set
      const apply = Reflect.apply
      define(prototype, '__proto__', {
        get: read,
        set(value) {
          if (typeof this === 'function') {
            apply(write, this, [value])
          } else if (typeof this === 'object' && this !== null) {
            define(this, '__proto__', {
              value, writable: true, enumerable: true, configurable: true,
            })
          }
        },
        enumerable: false,
        configurable: true,
      })
    })()`),
    e,
  );
}
//@ chunk-4121qate.js:235753-235784 placement
var Mc = () => Object.create(null);
//@ chunk-4121qate.js:235806-235986 placement
var IS_ASYNC_GENERATOR_SOURCE = `(fn => {
  try {
    return typeof fn === 'function' &&
      Object.prototype.toString.call(fn) === '[object AsyncGeneratorFunction]'
  } catch {
    return false
  }
})`;
/**
 * VM 内迭代源码：调用异步生成器的 next/return，校验返回值形状。
 */
//@ chunk-4121qate.js:235986-236816 placement
var VM_ITERATE_SOURCE = `(async (it, method, arg) => {
  const isObject =
    it !== null && (typeof it === 'object' || typeof it === 'function')
  if (!isObject) {
    throw new TypeError(
      'a hook on a streaming event returns its async generator; got ' +
        (it === null ? 'null' : typeof it),
    )
  }
  const pull = it[method]
  if (typeof pull !== 'function') {
    if (method === 'return') return { __proto__: null, done: true, value: arg }
    throw new TypeError(
      'a hook on a streaming event returns its async generator; got an ' +
        'object without ' + method + '()',
    )
  }
  const step = await Reflect.apply(pull, it, [arg])
  const isStep = step !== null && typeof step === 'object'
  return {
    __proto__: null,
    done: !isStep || step.done === true,
    value: isStep ? step.value : undefined,
  }
})`;
//@ chunk-4121qate.js:236816-236826 placement
var fo = 64;
/**
 * VM 边界复制出值的源码字符串（深度上限、错误包装）
 */
//@ chunk-4121qate.js:236826-257251 placement
var VM_COPY_OUT_SOURCE = `(kindOf => {
  // Taken now, before any plugin runs: the global's bindings are the
  // plugin's to replace.
  const apply = Reflect.apply
  const listed = Object.keys
  const listedAll = Reflect.ownKeys
  const describe = Reflect.getOwnPropertyDescriptor
  const define = Reflect.defineProperty
  const isList = Array.isArray
  const freeze = Object.freeze
  const parentOf = Reflect.getPrototypeOf
  const getterOf = (holder, name) => describe(holder, name).get
  // Their methods are called on instances made here, which no plugin holds,
  // and found on prototypes frozen before this script ran.
  const Seen = WeakMap
  const Done = WeakSet
  const Pairs = Map
  const eachPair = Map.prototype.forEach
  const setPair = Map.prototype.set
  const Members = Set
  const eachMember = Set.prototype.forEach
  const addMember = Set.prototype.add
  const Moment = Date
  const timeOf = Date.prototype.getTime
  const Pattern = RegExp
  const sourceOf = getterOf(RegExp.prototype, 'source')
  const flagsOf = getterOf(RegExp.prototype, 'flags')
  const Failure = Error
  const Boxed = Object
  const Veil = Proxy
  const Octets = Uint8Array
  const Window = DataView
  const typed = Reflect.getPrototypeOf(Uint8Array.prototype)
  const nameOf = getterOf(typed, Symbol.toStringTag)
  const setBytes = typed.set
  const typedBuffer = getterOf(typed, 'buffer')
  const typedOffset = getterOf(typed, 'byteOffset')
  const typedLength = getterOf(typed, 'length')
  const windowBuffer = getterOf(DataView.prototype, 'buffer')
  const windowOffset = getterOf(DataView.prototype, 'byteOffset')
  const windowLength = getterOf(DataView.prototype, 'byteLength')
  const VIEWS = Object.freeze({
    __proto__: null,
    Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array,
    Int32Array, Uint32Array, Float32Array, Float64Array, BigInt64Array,
    BigUint64Array,
    ...(typeof Float16Array === 'function' && { Float16Array }),
  })
  const ROOT = Object.prototype
  const MISTAKE = TypeError.prototype
  const RANGE = RangeError.prototype
  const TEXTS = Object.freeze(['name', 'message', 'stack'])
  // A record or a list of ours is written by assignment, which asks its
  // prototypes first: they are frozen by now, or nothing is made here.
  if (!Object.isFrozen(Object.prototype) || !Object.isFrozen(Array.prototype)) {
    throw new TypeError('the walks of what leaves are made after the hardening')
  }
  // The keys the root prototype holds, and will ever hold: under one of
  // them an assignment to a record of ours would find an accessor.
  const ROOTED = (() => {
    const held = { __proto__: null }
    const names = Reflect.ownKeys(Object.prototype)
    for (let at = 0; at < names.length; at += 1) held[names[at]] = true
    return Object.freeze(held)
  })()
  // Three stand-ins, made here and held by no plugin. Each is to the two
  // readers beyond (a structured clone of ours; another environment's walk by
  // keys) what it stands for: a function is refused by one and dropped by the
  // other, a Proxy refused by one and read by the other, a dead one by none.
  const REFUSED = Object.freeze(() => {})
  const NO_TRAPS = Object.freeze({ __proto__: null })
  // Why a walk refused the whole, by the stand-in it answers for it: as
  // REFUSED to both readers, and to \`refusal\` the end of a sentence.
  const REASONS = new Seen()
  const refusing = reason => {
    const made = freeze(() => {})
    REASONS.set(made, reason)
    return made
  }
  // No nesting spends the stack: a walk is out of it when it began with
  // little left, or a getter of the plugin's ran out of it.
  const SPENT = refusing('${STACK_EXHAUSTED_MESSAGE}')
  // What nests past the depth a copy out carries: no stack measures it.
  const DEEP = refusing('${STACK_NESTING_TOO_DEEP_MESSAGE}')
  const GONE = (() => {
    const made = Proxy.revocable({}, NO_TRAPS)
    made.revoke()
    return made.proxy
  })()
  // The one descriptor every listed key is written by: filled, handed to
  // \`define\`, which reads it and keeps nothing of it, and emptied.
  const slot = {
    __proto__: null,
    value: undefined,
    writable: true,
    enumerable: true,
    configurable: true,
  }
  const hidden = value => ({
    __proto__: null,
    value,
    writable: true,
    enumerable: false,
    configurable: true,
  })
  const isListed = (holder, name) => describe(holder, name)?.enumerable === true
  // Every key is asked once, as the walk by keys asked it: a getter runs
  // once, here; a Proxy's \`get\` answers, handed its target, the key, itself.
  const asked = (holder, key) => {
    try {
      return holder[key]
    } catch (thrown) {
      return unspent(thrown)
    }
  }
  // Whether what was thrown is an Error of the environment's own, of the kind
  // whose prototype this is: told by its slot and then its parent, so that
  // nothing of a plugin's runs for it, whatever the plugin threw.
  const isOf = (thrown, parent) =>
    typeof thrown === 'object' &&
    thrown !== null &&
    kindOf(thrown) === 'error' &&
    parentOf(thrown) === parent
  // What a plugin's getter or trap threw refuses that key alone, but the
  // engine's own out of stack, told by its own message: thrown on, it refuses
  // the whole.
  const isStackEnd = thrown => {
    if (!isOf(thrown, RANGE)) return false
    const said = describe(thrown, 'message')
    return (
      said !== undefined &&
      (said.value === '${STACK_OVERFLOW_MESSAGES[0]}' ||
        said.value === '${STACK_OVERFLOW_MESSAGES[1]}')
    )
  }
  const unspent = thrown => {
    if (isStackEnd(thrown)) throw thrown
    return REFUSED
  }
  // What cannot be made anew (a detached buffer: a TypeError) is refused
  // alone, not all that holds it; whatever else is thrown (ours, out of
  // stack) goes on, and refuses the whole.
  const orRefused = made => value => {
    try {
      return made(value)
    } catch (thrown) {
      if (thrown !== REFUSED && !isOf(thrown, MISTAKE)) throw thrown
      return REFUSED
    }
  }
  // A view over what was refused is refused, not made over nothing.
  const taken = made => {
    if (made === REFUSED) throw made
    return made
  }
  // The memory of a buffer in a fresh one. The environment's getter is the
  // first to ask the fresh view for its buffer; no species is consulted.
  const bytes = buffer => {
    const from = new Octets(buffer)
    const into = new Octets(apply(typedLength, from, []))
    apply(setBytes, into, [from])
    return apply(typedBuffer, into, [])
  }
  // Every object the environment was born with that its global names: a
  // namespace, a kind's prototype, each with the name it goes by there. A
  // kind our test knows is left out: an heir of its with no slot is a record.
  const BORN = new Seen()
  const isKnown = Kind => {
    try {
      return kindOf(new Kind()) !== 'record'
    } catch {
      return false
    }
  }
  const bear = (holder, path) => {
    const names = listedAll(holder)
    for (let at = 0; at < names.length; at += 1) {
      const held = describe(holder, names[at]).value
      if (typeof names[at] !== 'string' || held === holder) continue
      const name = path + names[at]
      const isKind = typeof held === 'function'
      const own = isKind && describe(held, 'prototype')?.value
      if (typeof own === 'object' && own !== null && own !== ROOT) {
        // The kinds within a namespace are made for no test: none is known.
        if (path !== '' || !isKnown(held)) BORN.set(own, name)
      } else if (typeof held === 'object' && held !== null) {
        BORN.set(held, name)
        if (path === '') bear(held, \`\${name}.\`)
      }
    }
  }
  bear(globalThis, '')
  // What names the kind of an object with no slot our test knows: itself, or
  // the first of its prototypes, born with the environment. None: a record,
  // whatever class made it. A Proxy among them ends the asking, unasked.
  const bornOf = value => {
    let link = value
    for (let hop = 0; hop < ${fo}; hop += 1) {
      const born = BORN.get(link)
      if (born !== undefined) return born
      link = parentOf(link)
      if (link === null || link === ROOT) return undefined
      if (kindOf(link) === 'veiled') return undefined
    }
    return undefined
  }
  // This walk: what it has copied already (a cycle, or what is held twice),
  // whether it copies an answer, what stands for all of it once refused, and
  // the frame of the container it is filling, the last it entered.
  let walk
  const kept = (value, out) => {
    walk.seen.set(value, out)
    return out
  }
  // A container entered and not yet filled: the walk steps the last entered,
  // a part at a time, so it nests as deep as its frames and never as deep as
  // the stack. Its copy stands for it from here on, and is filled in place.
  const entered = (step, from, into, parts) => {
    walk.depth += 1
    walk.top = { step, from, into, parts, at: 0, below: walk.top }
    return into
  }
  const left = frame => {
    walk.depth -= 1
    walk.top = frame.below
  }
  // Each kind of container is filled by a step of its own: part after part
  // until one is itself entered, which is filled first, or until none is left
  // and the walk goes back to what was entered before it.
  //
  // Own listed string keys, as both readers read them; the keys are taken
  // once, so nothing a getter adds lengthens the walk: as the frame is
  // entered, or at its first step by keys where another step came first.
  // No copy beneath is made under a catch: what it throws refuses the whole.
  const byKeys = frame => {
    const keys = (frame.parts ??= listed(frame.from))
    for (let at = frame.at; at < keys.length; at += 1) {
      const key = keys[at]
      const made = copy(asked(frame.from, key))
      // Nothing callable is written under \`then\` in an answer: a promise
      // of ours is resolved with it, would call that, and never settle.
      if (made === REFUSED && key === 'then' && walk.isAnswer) {
        walk.refused ??= REFUSED
      } else {
        slot.value = made
        define(frame.into, key, slot)
        slot.value = undefined
      }
      if (walk.top !== frame) {
        frame.at = at + 1
        return
      }
    }
    left(frame)
  }
  // The same, into a record of ours: it is fresh and its prototype frozen,
  // so under a key that prototype does not hold an assignment finds nothing
  // in its way and makes the listed, writable own value \`define\` makes.
  const byNames = frame => {
    const keys = frame.parts
    for (let at = frame.at; at < keys.length; at += 1) {
      const key = keys[at]
      const made = copy(asked(frame.from, key))
      if (made === REFUSED && key === 'then' && walk.isAnswer) {
        walk.refused ??= REFUSED
      } else if (ROOTED[key] === undefined) {
        frame.into[key] = made
      } else {
        slot.value = made
        define(frame.into, key, slot)
        slot.value = undefined
      }
      if (walk.top !== frame) {
        frame.at = at + 1
        return
      }
    }
    left(frame)
  }
  // A list read and written by index: its parts are as many as its length.
  const byIndex = frame => {
    for (let at = frame.at; at < frame.parts; at += 1) {
      frame.into[at] = copy(asked(frame.from, at))
      if (walk.top !== frame) {
        frame.at = at + 1
        return
      }
    }
    left(frame)
  }
  // A Map's keys and items, held in turn: an item is set under the copy of
  // its key once that copy is entered, and the key's parts are copied first.
  const byPairs = frame => {
    const held = frame.parts
    for (let at = frame.at; at < held.length; at += 1) {
      const made = copy(held[at])
      // The list is the walk's own: a key's place holds its copy from here.
      if (at % 2 === 0) held[at] = made
      else apply(setPair, frame.into, [held[at - 1], made])
      if (walk.top !== frame) {
        frame.at = at + 1
        return
      }
    }
    left(frame)
  }
  // An Error's cause, where it is not listed; its listed keys come after,
  // taken once all that its cause holds is copied.
  const byCause = frame => {
    frame.step = byKeys
    const cause = describe(frame.from, 'cause')
    if (cause !== undefined && !cause.enumerable) {
      define(frame.into, 'cause', hidden(copy(asked(frame.from, 'cause'))))
    }
  }
  const byMembers = frame => {
    const held = frame.parts
    for (let at = frame.at; at < held.length; at += 1) {
      apply(addMember, frame.into, [copy(held[at])])
      if (walk.top !== frame) {
        frame.at = at + 1
        return
      }
    }
    left(frame)
  }
  // A list that is no Proxy holds its length as a value. Its listed keys
  // come indices first, ascending, each below the length: as many keys as
  // the length, the last of them the last index, are every index and no
  // other key. Such a list is read and written by index, as its keys would
  // be; any other (a hole, a named key, an index not listed) by its keys.
  const items = (value, out) => {
    const size = value.length
    const keys = listed(value)
    const isDense =
      keys.length === size &&
      (size === 0 || keys[size - 1] === \`\${size - 1}\`)
    if (isDense) return entered(byIndex, value, out, size)
    out.length = size
    return entered(byKeys, value, out, keys)
  }
  const boxed = valueOf => value =>
    kept(value, Boxed(apply(valueOf, value, [])))
  const COPIES = Object.freeze({
    __proto__: null,
    // What is of a kind no copy here knows is never made an empty record:
    // all is refused, and the kind named.
    record: value => {
      const born = bornOf(value)
      if (born === undefined) {
        return entered(byNames, value, kept(value, {}), listed(value))
      }
      walk.refused ??= refusing(\`the kind \${born} does not copy\`)
      return REFUSED
    },
    array: value => items(value, kept(value, [])),
    // A Proxy, or what has slots no copy carries (a Promise): what its own
    // keys answer, here, as far as they answer, behind a Proxy of ours that
    // has no traps; a revoked one answers not even whether it is a list.
    veiled: value => {
      let inner
      try {
        inner = isList(value) ? [] : {}
      } catch (thrown) {
        unspent(thrown)
        return GONE
      }
      const out = kept(value, new Veil(inner, NO_TRAPS))
      let size
      let keys
      try {
        size = isList(inner) ? value.length : 0
        keys = listed(value)
      } catch (thrown) {
        unspent(thrown)
        return out
      }
      // A length no list has is the Proxy's own mistake, and no call.
      try {
        if (isList(inner)) inner.length = size
      } catch {
        return out
      }
      entered(byKeys, value, inner, keys)
      return out
    },
    arguments: value => COPIES.veiled(value),
    // The environment's own getter asks a plugin's view for its buffer: the
    // ArrayBuffer object is made for whoever asks first, and kept.
    typed: orRefused(value =>
      kept(
        value,
        new VIEWS[apply(nameOf, value, [])](
          taken(copy(apply(typedBuffer, value, []))),
          apply(typedOffset, value, []),
          apply(typedLength, value, []),
        ),
      ),
    ),
    window: orRefused(value =>
      kept(
        value,
        new Window(
          taken(copy(apply(windowBuffer, value, []))),
          apply(windowOffset, value, []),
          apply(windowLength, value, []),
        ),
      ),
    ),
    buffer: orRefused(value => kept(value, bytes(value))),
    map: value => {
      const out = kept(value, new Pairs())
      const held = []
      apply(eachPair, value, [
        (item, key) => {
          held[held.length] = key
          held[held.length] = item
        },
      ])
      return entered(byPairs, value, out, held)
    },
    set: value => {
      const out = kept(value, new Members())
      const held = []
      apply(eachMember, value, [item => { held[held.length] = item }])
      return entered(byMembers, value, out, held)
    },
    date: value => kept(value, new Moment(apply(timeOf, value, []))),
    number: boxed(Number.prototype.valueOf),
    string: boxed(String.prototype.valueOf),
    boolean: boxed(Boolean.prototype.valueOf),
    bigint: boxed(BigInt.prototype.valueOf),
    pattern: orRefused(value =>
      kept(
        value,
        new Pattern(apply(sourceOf, value, []), apply(flagsOf, value, [])),
      ),
    ),
    // A getter among an Error's three texts that throws refuses it alone.
    error: value => {
      const out = new Failure()
      try {
        // The stack a fresh Error is born with is this script's: not carried.
        define(out, 'stack', hidden(undefined))
        for (let at = 0; at < TEXTS.length; at += 1) {
          const name = TEXTS[at]
          // Read through the chain, as a copy of ours reads them: the name of
          // an Error's kind is its prototype's. What runs is handed nothing.
          const text = isListed(value, name) ? undefined : value[name]
          if (typeof text === 'string') define(out, name, hidden(text))
        }
      } catch (thrown) {
        return unspent(thrown)
      }
      return entered(byCause, value, kept(value, out), undefined)
    },
  })
  // What stands in the copy for a value: itself, a stand-in, or the copy of
  // a container, entered here and filled by the walk once this returns.
  const copy = value => {
    if (typeof value === 'function') return REFUSED
    if (typeof value !== 'object' || value === null) return value
    // Asked first, and of slots alone: nothing of the plugin's runs for it.
    const kind = kindOf(value)
    const held = walk.seen.get(value)
    if (held !== undefined) return held
    // Every object not copied before is a level, counted as the copy that
    // brings a value in counts one; that copy carries deeper.
    if (walk.depth >= ${MAX_STACK_NESTING_DEPTH}) throw DEEP
    return COPIES[kind](value)
  }
  // Lists, and records whose prototype is null or a root one, as deep as they
  // hold one another: read by descriptor, so no getter runs; a Proxy is left.
  // A prototype other than this environment's root one is asked for its own
  // once our kind test has answered for it: it may be a Proxy.
  const isPlain = value => {
    const parent = parentOf(value)
    if (parent === null || parent === ROOT) return true
    return kindOf(parent) !== 'veiled' && parentOf(parent) === null
  }
  // The frames of a freeze once it has met a value: one more for a list or
  // a plain record not met before, the same frames for anything else.
  const opened = (value, done, below) => {
    if (typeof value !== 'object' || value === null) return below
    if (done.has(value)) return below
    const kind = kindOf(value)
    const isRecord = kind === 'record' || kind === 'arguments'
    if (kind !== 'array' && !(isRecord && isPlain(value))) return below
    done.add(value)
    return { value, keys: listed(value), at: 0, below }
  }
  // Each is frozen once all it holds is; the walk keeps its own frames, and
  // what is met twice is entered once, so it ends at any depth.
  const frozen = own => {
    const done = new Done()
    let top = opened(own, done, null)
    while (top !== null) {
      if (top.at === top.keys.length) {
        freeze(top.value)
        top = top.below
      } else {
        top.at += 1
        const held = describe(top.value, top.keys[top.at - 1])?.value
        top = opened(held, done, top)
      }
    }
  }
  // Whatever else is thrown in a walk (ours past the depth; ours or the kind
  // test's out of stack, which is not the environment's) ends here, and
  // refuses the whole. A stack spent before either is entered throws in the
  // caller.
  const walked = isAnswer => leaving => {
    // A getter may hand something over in its turn: each walk has its own,
    // put back whatever happens.
    const outer = walk
    try {
      walk = {
        __proto__: null,
        seen: new Seen(),
        isAnswer,
        refused: undefined,
        top: null,
        depth: 0,
      }
      const made = copy(leaving)
      while (walk.top !== null) walk.top.step(walk.top)
      return walk.refused ?? made
    } catch (thrown) {
      return thrown === DEEP ? DEEP : SPENT
    } finally {
      walk = outer
    }
  }
  return freeze({
    __proto__: null,
    copy: walked(false),
    answer: walked(true),
    freeze: own => {
      try {
        frozen(own)
      } catch {}
    },
    refusal: made => REASONS.get(made),
  })
})`;
/**
 * VM 内元素构造器表源码：本地元素构建时冻结并补上未接线的回调槽，外来构造器的结果按地址重接 onPress/onEvent 闭包。
 */
//@ chunk-4121qate.js:257251-263210 placement
var VM_ELEMENT_TABLE_SOURCE = `(() => {
  const { freeze, isFrozen, keys } = Object
  const { isArray } = Array
  const Closures = Map
  const freezeDeep = value => {
    const isOpen =
      typeof value === 'object' && value !== null && !isFrozen(value)
    if (isOpen) {
      freeze(value)
      for (const key of keys(value)) freezeDeep(value[key])
    }
    return value
  }
  return (entries, local) => {
    const childrenOf = props => {
      const { children, ...rest } = props ?? {}
      const childList =
        children === undefined
          ? []
          : isArray(children)
            ? children
            : [children]
      return { rest, childList }
    }
    const isElement = node => typeof node === 'object' && node !== null
    const addressOf = node =>
      isElement(node.press) && isElement(node.props)
        ? node.press.handle + ':' + node.props.key
        : undefined
    // The slot an element keeps its closure in: a Button's onPress, an
    // Input's, Select's or Markdown's onEvent (over its onInput and
    // onSubmit, its onSelect, or its onLinkPress); none for the rest.
    const slotOfName = name =>
      name === 'Button'
        ? 'onPress'
        : name === 'Input' || name === 'Select' || name === 'Markdown'
          ? 'onEvent'
          : undefined
    // The prop a caller hands that element's closure in by.
    const givenOfName = name =>
      name === 'Input'
        ? 'onSubmit'
        : name === 'Select'
          ? 'onSelect'
          : name === 'Markdown'
            ? 'onLinkPress'
            : 'onPress'
    // Whether an element built without its closure waits for a rewire: a
    // Button, Input or Select always has one; a Markdown's is optional, so
    // one with neither onLinkPress nor pressableLinks is complete, while one
    // naming pressableLinks lost its onLinkPress crossing here and pends.
    const isPending = (name, rest) =>
      name === 'Markdown'
        ? rest.pressableLinks !== undefined &&
          typeof rest.onLinkPress !== 'function'
        : typeof rest[givenOfName(name)] !== 'function'
    const slotOf = node => slotOfName(node.type)
    const closuresOf = (node, closures) => {
      if (isArray(node)) {
        for (const child of node) closuresOf(child, closures)
      } else if (isElement(node)) {
        const slot = slotOf(node)
        const isWired = slot !== undefined && typeof node[slot] === 'function'
        const address = isWired ? addressOf(node) : undefined
        if (address !== undefined) closures.set(address, node[slot])
        closuresOf(node.children, closures)
      }
      return closures
    }
    const revive = (node, closures, root) => {
      if (isArray(node)) return node.map(child => revive(child, closures, root))
      if (!isElement(node)) return node
      const slot = slotOf(node)
      const isUnwired = slot !== undefined && typeof node[slot] !== 'function'
      if (isUnwired) {
        const address = addressOf(node)
        const held = address === undefined ? undefined : closures.get(address)
        if (held) return { ...node, [slot]: held }
        const handlers = handlersOf(root, node.type)
        const isRoot =
          !root.taken &&
          handlers !== undefined &&
          isElement(node.props) &&
          node.props.key === root.key
        if (!isRoot) return node
        root.taken = true
        const hover = isElement(node.hover) ? { hover: node.hover } : {}
        const below = isArray(node.children) ? node.children : []
        return h(node.type, { ...node.props, ...hover, ...handlers }, ...below)
      }
      return node.children === undefined
        ? node
        : { ...node, children: revive(node.children, closures, root) }
    }
    // The caller's own handlers, kept to rewire the one element a foreign
    // constructor answers for them, whatever the constructor is named: a
    // Button takes the onPress, an Input the onInput / onSubmit pair, a
    // Select the onSelect.
    const rootOf = props => ({
      taken: false,
      onPress: props?.onPress,
      onInput: props?.onInput,
      onSubmit: props?.onSubmit,
      onSelect: props?.onSelect,
      onLinkPress: props?.onLinkPress,
      key:
        props?.key ??
        props?.label ??
        (typeof props?.children === 'string' ? props.children : undefined),
    })
    const handlersOf = (root, type) => {
      if (type === 'Input') {
        return typeof root.onSubmit === 'function'
          ? { onInput: root.onInput, onSubmit: root.onSubmit }
          : undefined
      }
      if (type === 'Select') {
        return typeof root.onSelect === 'function'
          ? { onSelect: root.onSelect }
          : undefined
      }
      if (type === 'Markdown') {
        return typeof root.onLinkPress === 'function'
          ? { onLinkPress: root.onLinkPress }
          : undefined
      }
      return typeof root.onPress === 'function'
        ? { onPress: root.onPress }
        : undefined
    }
    const unwired = () => {}
    const table = { __proto__: null }
    for (const [name, value] of entries) {
      const isForeign = typeof value === 'function' && !local.includes(name)
      table[name] = isForeign
        ? freeze(props =>
            freezeDeep(
              revive(
                value(props),
                closuresOf(props?.children, new Closures()),
                rootOf(props),
              ),
            ),
          )
        : value
    }
    for (const name of local) {
      table[name] = freeze(props => {
        const { rest, childList } = childrenOf(props)
        const slot = slotOfName(name)
        if (slot === undefined || !isPending(name, rest)) {
          return freezeDeep(h(name, rest, ...childList))
        }
        const given = givenOfName(name)
        const built = h(name, { ...rest, [given]: unwired }, ...childList)
        return freezeDeep({ ...built, [slot]: undefined })
      })
    }
    return freeze(table)
  }
})()`;
/**
 * VM 内答案固定源码：把答案原型链上的 then 固定为不可变（防 thenable 劫持），无法固定则拒绝。
 */
//@ chunk-4121qate.js:263210-265722 placement
var VM_ANSWER_PIN_SOURCE = `(() => {
  // Taken now, before any plugin runs: the global's bindings are the
  // plugin's to replace.
  const isOpen = Reflect.isExtensible
  const describe = Reflect.getOwnPropertyDescriptor
  const define = Reflect.defineProperty
  const parentOf = Reflect.getPrototypeOf
  const Refusal = TypeError
  const ABSENT = Object.freeze({
    __proto__: null,
    value: undefined,
    writable: false,
    enumerable: false,
    configurable: false,
  })
  const KEPT = Object.freeze({
    __proto__: null,
    writable: false,
    configurable: false,
  })
  const refusal = () =>
    new Refusal('the answer holds a \`then\` that cannot be fixed')
  // A trap may not report a property non-configurable, nor non-writable
  // with it, unless its target holds it so; and must then read it the same.
  const isFixed = held =>
    held !== undefined &&
    held.writable === false &&
    held.configurable === false &&
    typeof held.value !== 'function'
  const pin = answer => {
    let link = answer
    for (let hop = 0; link !== null; hop += 1) {
      // Asked first: a trap must agree with its target, and what is closed
      // stays closed, so what the next two asks learn of it stays true.
      const isClosed = !isOpen(link)
      // Of a closed target a trap may not report a property it holds absent.
      const held = describe(link, 'then')
      if (!isClosed || held !== undefined) {
        // The lookup ends at this link: an own property, absent till now or
        // kept as it is, made fixed; then asked again, the define untrusted.
        define(link, 'then', held === undefined ? ABSENT : KEPT)
        if (!isFixed(describe(link, 'then'))) throw refusal()
        return
      }
      // Only closed links are passed, each with no own \`then\` for ever. One
      // that is a Proxy may still read as it likes: unseen here, refused by
      // the host's check. A chain through Proxies may turn back on itself.
      if (hop === ${fo}) throw refusal()
      // Of a closed target a trap must answer the target's own, which is fixed.
      link = parentOf(link)
    }
  }
  return async returned => {
    const answer = await returned
    const isHeld =
      typeof answer === 'function' ||
      (typeof answer === 'object' && answer !== null)
    // From here to the envelope nothing is awaited; after the pin nothing
    // the plugin runs, now or later, changes what reading \`then\` gives.
    if (isHeld) pin(answer)
    return { __proto__: null, v: answer }
  }
})()`;
/**
 * VM 内 Error instanceof 补丁源码。
 */
//@ chunk-4121qate.js:265722-266165 placement
var ERROR_HAS_INSTANCE_SOURCE = `(isError => {
  'use strict'
  const ordinary = Function.prototype[Symbol.hasInstance]
  Object.defineProperty(Error, Symbol.hasInstance, {
    value: function hasInstance(value) {
      if (this !== Error) return ordinary.call(this, value)
      try {
        if (ordinary.call(Error, value)) return true
      } catch {}
      try {
        return isError(value) === true
      } catch {
        return false
      }
    },
  })
})`;
/**
 * VM 内流对象源码（next/return/throw 与 result 属性）。
 */
//@ chunk-4121qate.js:266165-266518 placement
var VM_STREAM_SOURCE = `((pull, close, result) => {
  const stream = {
    next: () => pull(),
    return: () => close(),
    throw: error => close(undefined).then(() => { throw error }),
    [Symbol.asyncIterator]() { return this },
  }
  Object.defineProperty(stream, 'result', {
    get: () => result(),
    enumerable: true,
  })
  return Object.freeze(stream)
})`;
/**
 * VM 内宿主调用包装源码：同步与异步错误都转换为环境内错误（转换失败时用固定的回退错误）。
 */
//@ chunk-4121qate.js:266518-267407 placement
var VM_HOST_CALL_WRAPPER_SOURCE = `(intoEnvironment => {
  'use strict'
  const FALLBACK = new Error(
    'A Claude Code call failed and its error could not be passed to the plugin',
  )
  FALLBACK.stack = String(FALLBACK.stack).split('\\n')[0]
  Object.freeze(FALLBACK)
  const converted = error => {
    let out = FALLBACK
    try {
      out = intoEnvironment(error)
    } catch {}
    return out
  }
  return hostFn => (...args) => {
    let returned
    let isThenable
    try {
      returned = hostFn(...args)
      isThenable =
        returned !== null &&
        typeof returned === 'object' &&
        typeof returned.then === 'function'
    } catch (error) {
      throw converted(error)
    }
    if (isThenable) {
      return (async () => {
        try {
          return await returned
        } catch (error) {
          throw converted(error)
        }
      })()
    }
    return returned
  }
})`;
/**
 * 修补 VM 中 Error 的 instanceof：宿主错误与 VM 内错误都识别为 Error。
 */
//@ chunk-4121qate.js:267407-267564 placement
function patchErrorHasInstance(e) {
  let runInContext = vmModule_8.runInContext(BT("Error"), e),
    r = Function.prototype[Symbol.hasInstance];
  vmModule_8.runInContext(
    BT(ERROR_HAS_INSTANCE_SOURCE),
    e,
  )(NH((n) => QAn(n) || On(() => r.call(runInContext, n))));
}
/**
 * 创建 VM 与宿主之间的错误转换：fromEnvironment 转为 HooksError，intoEnvironment 转为环境内错误。
 */
//@ chunk-4121qate.js:267564-268076 placement
function createErrorConverters(e, o, r) {
  function n(i) {
    if (QAn(i)) return i;
    let { name: p, message: message } = e(i),
      a = new HooksError(message === "" ? p : message);
    if (message !== "" && p !== a.name) a.thrownName = p;
    return Qeo(i) ? apr(a) : a;
  }
  function s(i) {
    if (QAn(i)) {
      let m = _xt(
        o.makeError((i instanceof HooksError ? i.thrownName : void 0) ?? i.name, i.message),
        dpr(i),
      );
      return Qeo(i) ? apr(m) : m;
    }
    if (i === null || (typeof i !== "object" && typeof i !== "function") || r(i)) return i;
    let { name: f, message: message } = i;
    return o.makeError(
      typeof f === "string" ? f : "Error",
      typeof message === "string" ? message : errorMessage(i),
    );
  }
  return { fromEnvironment: n, intoEnvironment: s };
}
/**
 * 值种类判断表（veiled、array、typed、map、set、date 等）。
 */
//@ chunk-4121qate.js:268548-268898 placement
var VALUE_KIND_TESTS = [
  [Pf, "veiled"],
  [Array.isArray, "array"],
  [isTypedArray, "typed"],
  [isDataView, "window"],
  [isArrayBuffer_2, "buffer"],
  [isMap, "map"],
  [isSet, "set"],
  [isDate, "date"],
  [isRegExp, "pattern"],
  [isNativeError, "error"],
  [isNumberObject, "number"],
  [isStringObject, "string"],
  [isBooleanObject, "boolean"],
  [isBigIntObject, "bigint"],
  [isArgumentsObject, "arguments"],
  [isSharedArrayBuffer, "veiled"],
  [isPromise, "veiled"],
  [isWeakMap, "veiled"],
  [isWeakSet, "veiled"],
  [isGeneratorObject, "veiled"],
  [isSymbolObject, "veiled"],
  [isMapIterator, "veiled"],
  [isSetIterator, "veiled"],
  [isModuleNamespaceObject, "veiled"],
];
//@ chunk-4121qate.js:268898-268907 placement
var jc = 2;
//@ chunk-4121qate.js:268907-268941 placement
var mapped = VALUE_KIND_TESTS.slice(jc).map(([e]) => e);
//@ chunk-4121qate.js:268941-268998 placement
function Dc(e) {
  for (let o of mapped) if (o(e)) return !0;
  return !1;
}
/**
 * 判断值的种类（record、array、typed、map、set、date、error、veiled 等）。
 */
//@ chunk-4121qate.js:268998-269098 placement
function valueKindOf(e) {
  return !Pf(e) && !Array.isArray(e) && !Dc(e)
    ? "record"
    : (VALUE_KIND_TESTS.find(([r]) => r(e))?.[1] ?? "record");
}
//@ chunk-4121qate.js:269098-269144 placement
var Uc = (e) => vmModule_9.runInContext(BT(VM_COPY_OUT_SOURCE), e)(NH(valueKindOf));
/**
 * 检查答案原型链上的 then 是否已固定为不可变的非函数。
 */
//@ chunk-4121qate.js:269166-269513 placement
function isThenFixed(e) {
  let r = typeof e === "function" || (typeof e === "object" && e !== null) ? e : null;
  for (let n = 0; r !== null; n += 1) {
    if (Pf(r)) return !1;
    let isExtensible = Reflect.isExtensible(r),
      ownPropertyDescriptor = Reflect.getOwnPropertyDescriptor(r, "then");
    if (ownPropertyDescriptor !== void 0)
      return (
        ownPropertyDescriptor.writable === !1 &&
        ownPropertyDescriptor.configurable === !1 &&
        typeof ownPropertyDescriptor.value !== "function"
      );
    if (isExtensible || n === fo) return !1;
    r = Reflect.getPrototypeOf(r);
  }
  return !0;
}
//@ chunk-4121qate.js:269513-269677 placement
function createAnswerSettler(e) {
  let runInContext = vmModule_10.runInContext(BT(VM_ANSWER_PIN_SOURCE), e);
  return async (r) => {
    let n = await runInContext(r);
    if (!isThenFixed(n.v)) throw new HooksError("the answer holds a `then` that is not fixed");
    return n;
  };
}
/**
 * 创建 hooks VM 上下文（禁止字符串与 wasm 代码生成），装好 Error/proto 补丁与 realm，返回一组 VM 调用、克隆、错误转换与流工具。
 */
//@ chunk-4121qate.js:269677-270409 placement
function createVmContext(e) {
  let o = Mc(),
    r = SubAgentContext(o, { codeGeneration: { strings: !1, wasm: !1 } });
  (patchErrorHasInstance(r), patchProtoSetter(r), createVmRealm(r, freeze));
  let n = FAn(r),
    runInContext = vmModule_3.runInContext(BT("((self, fn, ...args) => Reflect.apply(fn, self, args))"), r),
    i = createAnswerSettler(r),
    p = createVmErrorDescriber(r),
    f = createVmInstanceofObject(r),
    a = VM_MATCHER_SOURCE(r),
    m = lSi(r),
    c = VM_HOST_FN_WRAPPER(r),
    u = Uc(r),
    l = dSi(r, e),
    { fromEnvironment: fromEnvironment, intoEnvironment: intoEnvironment } = createErrorConverters(p, l, f),
    x = vmModule_3.runInContext(BT(VM_HOST_CALL_WRAPPER_SOURCE), r)(NH(intoEnvironment));
  return {
    globals: o,
    context: r,
    makers: l,
    vmCall: n,
    vmApply: runInContext,
    vmSettle: i,
    vmOwns: f,
    copyMatcher: a,
    vmClone: m,
    cloneIn: (T) => Q5e(m(T)),
    leavingCopy: u.copy,
    leavingAnswer: u.answer,
    freezeOwn: u.freeze,
    leavingRefusal: u.refusal,
    vmAsyncWrap: c,
    fromEnvironment: fromEnvironment,
    intoEnvironment: intoEnvironment,
    wrapMethod: x,
    vmIterate: vmModule_3.runInContext(BT(VM_ITERATE_SOURCE), r),
    vmStream: vmModule_3.runInContext(BT(VM_STREAM_SOURCE), r),
    isGeneratorHook: vmModule_3.runInContext(BT(IS_ASYNC_GENERATOR_SOURCE), r),
  };
}
//@ chunk-4121qate.js:270409-270419 placement
var ZAn = 2;
//@ chunk-4121qate.js:270419-270429 placement
var ixt = 1;
//@ chunk-4121qate.js:270429-270439 placement
var axt = 0;
//@ chunk-4121qate.js:270439-270449 placement
var $Ui = 9;
//@ chunk-4121qate.js:270449-270537 placement = markScrollActivity (0.64)
function markScrollActivity(e) {
  if (e) (Atomics.store(e, ixt, 0), setImmediate(Atomics.store, e, ixt, 0).unref());
}

export {
  createVmContext,
  axt,
  ixt,
  VM_ELEMENT_TABLE_SOURCE,
  valueKindOf,
  markScrollActivity,
  runTimerCallback,
  JP,
  Cc,
  createVmConsole,
  Mc,
  patchErrorHasInstance,
  patchProtoSetter,
  VM_HOST_CALL_WRAPPER_SOURCE,
  ZAn,
  $Ui,
  QAn,
  lSi,
  dSi,
  createVmInstanceofObject,
  createErrorConverters,
};
