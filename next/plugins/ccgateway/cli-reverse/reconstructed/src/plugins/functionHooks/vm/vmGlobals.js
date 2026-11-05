/**
 * plugins/functionHooks/vm/vmGlobals.ts
 *
 * VM 全局对象与 console/编码等注入源码（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-j8f885h1.js (44)
 * attribution: placement 44
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import "vm";
import * as vmModule_2 from "vm";
import "vm";
import "vm";
import "vm";
import "vm";
import "vm";
import "vm";
import "vm";
import "vm";
import "vm";
import "vm";
import "vm";
import {
  isArrayBuffer,
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
import { resolve } from "path";
import { nullPrototypeFunction, freezeApiObject } from "../dispatch/chain.js";
import {
  matcherLog,
  MAX_MATCHER_DEPTH,
  MAX_MATCHER_KEYS,
  deepFreezeInPlace,
} from "../../../utils/hooks/functionHookMatchers.js";
import {
  describeLogArg,
  createVmInboundCopier,
  createVmRealm,
  NO_IMPORT_OPTIONS,
  callWithArgs,
  createVmErrorDescriber,
  VM_HOST_FN_WRAPPER,
} from "./vmRealm.js";
import { withUseStrict, VM_PRELUDE_SOURCE } from "./vmBootstrapSource.js";
import { errorMessage } from "../../../utils/errors.js";
import {
  STACK_EXHAUSTED_MESSAGE,
  STACK_NESTING_TOO_DEEP_MESSAGE,
  STACK_OVERFLOW_MESSAGES,
  MAX_STACK_NESTING_DEPTH,
} from "../../../utils/structuredCloneLimits.js";
import { HooksError, hasWeakSetTag, addWeakSetTag, tagError, readTag } from "../hooksErrors.js";
import { isUntrustedObject } from "../../../utils/untrustedValues.js";
import { SubAgentContext } from "../../../components/CtrlOToExpand.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-j8f885h1.js:211412-211601 placement
/**
 * 为 VM 构造冻结的 console（log/info/warn/error/debug），输出带插件前缀写入调试日志。
 */
function createVmConsole(wrapMethod, label) {
  let logAt = (level) =>
    nullPrototypeFunction(
      wrapMethod((...args) =>
        matcherLog().log(`${label} console.${level}: ${args.map(describeLogArg).join(" ")}`),
      ),
    );
  return freezeApiObject({
    log: logAt("log"),
    info: logAt("info"),
    warn: logAt("warn"),
    error: logAt("error"),
    debug: logAt("debug"),
  });
}
//@ chunk-j8f885h1.js:211623-214009 placement
var VM_MATCHER_SOURCE = (context) =>
  vmModule_2.runInContext(
    withUseStrict(`(() => {
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
        if (depth > ${MAX_MATCHER_DEPTH}) {
          throw new _Error(
            'the matcher is deeper than ${MAX_MATCHER_DEPTH} levels ' +
            '(a partial of e is a few levels deep; a cycle never ends)',
          )
        }
        if (--budget.left < 0) {
          throw new _Error(
            'the matcher holds more than ${MAX_MATCHER_KEYS} values ' +
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
      return matcher => copy(matcher, 0, { left: ${MAX_MATCHER_KEYS} })
    })()`),
    context,
  );
//@ chunk-j8f885h1.js:214031-214255 placement
/**
 * 在 VM 上下文中创建 "value instanceof Object" 判断函数（异常返回 false）。
 */
var createVmInstanceofObject = (context) =>
  vmModule_2.runInContext(
    withUseStrict(`(() => {
      const _Object = Object
      return value => {
        try {
          return value instanceof _Object
        } catch {
          return false
        }
      }
    })()`),
    context,
  );
//@ chunk-j8f885h1.js:214255-214328 placement
/**
 * VM 入站复制器
 */
function inboundCopier(context) {
  return createVmInboundCopier(context, {
    arrayLengthCap: undefined,
    protoKey: "carried",
  });
}
//@ chunk-j8f885h1.js:214382-214592 placement
var serializeUrl = (url) =>
  JSON.stringify({
    href: url.href,
    origin: url.origin,
    protocol: url.protocol,
    username: url.username,
    password: url.password,
    host: url.host,
    hostname: url.hostname,
    port: url.port,
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
  });
//@ chunk-j8f885h1.js:214636-214717 placement
/**
 * 断言 ArrayBuffer
 */
function requireArrayBuffer(value) {
  if (!isArrayBuffer(value)) throw TypeError("an ArrayBuffer was expected");
  return value;
}
//@ chunk-j8f885h1.js:214717-214809 placement
/**
 * 断言函数
 */
function requireFunction(value) {
  if (typeof value !== "function") throw TypeError("a function was expected");
  return value;
}
//@ chunk-j8f885h1.js:214852-214931 placement
/**
 * 断言 Uint8Array
 */
function requireUint8Array(value) {
  if (!isUint8Array(value)) throw TypeError("a Uint8Array was expected");
  return value;
}
//@ chunk-j8f885h1.js:214931-215019 placement
/**
 * 断言字符串
 */
function requireString(value) {
  if (typeof value !== "string") throw TypeError("a string was expected");
  return value;
}
//@ chunk-j8f885h1.js:215019-215747 placement
/**
 * VM 宿主辅助函数：字节长度、编解码、URL 解析、base64、随机数与摘要。
 */
var createVmHostHelpers = (root) => ({
  root,
  byteLength: (text) => Buffer.byteLength(requireString(text), "utf8"),
  encodeInto: (text, target) => {
    new TextEncoder().encodeInto(requireString(text), requireUint8Array(target));
  },
  decodeUtf8: (bytes, isFatal) =>
    new TextDecoder("utf-8", {
      fatal: isFatal === true,
    }).decode(requireUint8Array(bytes)),
  parseUrl: (input, baseUrl) => {
    let text = requireString(input);
    let base = baseUrl === undefined ? baseUrl : requireString(baseUrl);
    try {
      return serializeUrl(new URL(text, base));
    } catch {
      return null;
    }
  },
  setUrlPart: (input, part, value) => {
    let inputText = requireString(input);
    let partName = requireString(part);
    let partValue = requireString(value);
    try {
      let url = new URL(inputText);
      url[partName] = partValue;
      return serializeUrl(url);
    } catch {
      return null;
    }
  },
  atob: (text) => globalThis.atob(requireString(text)),
  btoa: (text) => globalThis.btoa(requireString(text)),
  randomUUID: () => crypto.randomUUID(),
  fillRandom: (target) => {
    crypto.getRandomValues(requireUint8Array(target));
  },
  digestInto: async (algorithm, data, alloc) => {
    let allocBuffer = requireFunction(alloc);
    let digest = await crypto.subtle.digest(requireString(algorithm), requireUint8Array(data));
    new Uint8Array(requireArrayBuffer(allocBuffer(digest.byteLength))).set(new Uint8Array(digest));
  },
  now: () => performance.now(),
});
//@ chunk-j8f885h1.js:215747-215769 placement
/**
 * VM 宿主辅助函数集
 */
var vmHostHelpers = (root) => freezeApiObject(createVmHostHelpers(root));
//@ chunk-j8f885h1.js:215769-215834 placement
/**
 * 清除定时器
 */
var clearTimerHandle = ({ handle, repeat }) => (repeat ? clearInterval(handle) : clearTimeout(handle));
//@ chunk-j8f885h1.js:215834-215966 placement
/**
 * 调用插件定时器回调，回调抛错时记录警告日志。
 */
var runTimerCallback = ({ pluginName, api, invoke, fn, args }) => {
  invoke(fn, args).catch((error) =>
    matcherLog().log(`${pluginName}: ${api}: the callback threw: ${errorMessage(error)}`, "warn"),
  );
};
//@ chunk-j8f885h1.js:215966-216020 placement
/**
 * 执行一次性定时回调
 */
function fireTimerOnce({ timers, id, fire }) {
  timers.delete(id);
  runTimerCallback(fire);
}
//@ chunk-j8f885h1.js:216020-216072 placement
/**
 * 执行 VM 前导源码
 */
var runVmPrelude = (context, pluginRoot) =>
  vmModule_2.runInContext(withUseStrict(VM_PRELUDE_SOURCE), context)(vmHostHelpers(resolve(pluginRoot)));
//@ chunk-j8f885h1.js:216072-216118 placement
/**
 * 出错返回 false
 */
function safeCall(fn) {
  try {
    return fn();
  } catch {
    return false;
  }
}
//@ chunk-j8f885h1.js:216118-216158 placement
/**
 * 是否 VM 内 Error
 */
var isVmError = (value) => safeCall(() => value instanceof Error);
//@ chunk-j8f885h1.js:216180-216946 placement
/**
 * 改写 VM 中 Object.prototype.__proto__ 的 setter：对普通对象定义为自有属性而非修改原型（防原型污染）。
 */
function patchProtoSetter(context) {
  vmModule_2.runInContext(
    withUseStrict(`(() => {
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
    context,
  );
}
//@ chunk-j8f885h1.js:216946-216977 placement
/**
 * Object.create(null)
 */
var nullPrototypeObject = () => Object.create(null);
//@ chunk-j8f885h1.js:216999-217179 placement
var IS_ASYNC_GENERATOR_SOURCE = `(fn => {
  try {
    return typeof fn === 'function' &&
      Object.prototype.toString.call(fn) === '[object AsyncGeneratorFunction]'
  } catch {
    return false
  }
})`;
//@ chunk-j8f885h1.js:217179-218009 placement
/**
 * VM 内迭代源码：调用异步生成器的 next/return，校验返回值形状。
 */
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
//@ chunk-j8f885h1.js:218009-218019 placement
/**
 * 64
 */
var MAX_COPY_DEPTH = 64;
//@ chunk-j8f885h1.js:218019-238444 placement
/**
 * VM 边界复制出值的源码字符串（深度上限、错误包装）
 */
var VM_COPY_OUT_SOURCE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-j8f885h1.js:218019", () => {
  VM_COPY_OUT_SOURCE = `(kindOf => {
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
    for (let hop = 0; hop < ${MAX_COPY_DEPTH}; hop += 1) {
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
});
//@ chunk-j8f885h1.js:238444-244403 placement
/**
 * VM 内元素构造器表源码：本地元素构建时冻结并补上未接线的回调槽，外来构造器的结果按地址重接 onPress/onEvent 闭包。
 */
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
//@ chunk-j8f885h1.js:244403-246915 placement
/**
 * VM 内答案固定源码：把答案原型链上的 then 固定为不可变（防 thenable 劫持），无法固定则拒绝。
 */
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
      if (hop === ${MAX_COPY_DEPTH}) throw refusal()
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
//@ chunk-j8f885h1.js:246915-247358 placement
/**
 * VM 内 Error instanceof 补丁源码。
 */
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
//@ chunk-j8f885h1.js:247358-247711 placement
/**
 * VM 内流对象源码（next/return/throw 与 result 属性）。
 */
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
//@ chunk-j8f885h1.js:247711-248600 placement
/**
 * VM 内宿主调用包装源码：同步与异步错误都转换为环境内错误（转换失败时用固定的回退错误）。
 */
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
//@ chunk-j8f885h1.js:248600-248757 placement
/**
 * 修补 VM 中 Error 的 instanceof：宿主错误与 VM 内错误都识别为 Error。
 */
function patchErrorHasInstance(context) {
  let contextError = vmModule_2.runInContext(withUseStrict("Error"), context);
  let defaultHasInstance = Function.prototype[Symbol.hasInstance];
  vmModule_2.runInContext(
    withUseStrict(ERROR_HAS_INSTANCE_SOURCE),
    context,
  )(
    nullPrototypeFunction(
      (value) => isVmError(value) || safeCall(() => defaultHasInstance.call(contextError, value)),
    ),
  );
}
//@ chunk-j8f885h1.js:248757-249269 placement
/**
 * 创建 VM 与宿主之间的错误转换：fromEnvironment 转为 HooksError，intoEnvironment 转为环境内错误。
 */
function createErrorConverters(vmErrorDescriber, makers, vmInstanceofObject) {
  function fromEnvironment(error) {
    if (isVmError(error)) return error;
    let { name, message } = vmErrorDescriber(error);
    let converted = new HooksError(message === "" ? name : message);
    if (message !== "" && name !== converted.name) converted.thrownName = name;
    return hasWeakSetTag(error) ? addWeakSetTag(converted) : converted;
  }
  function intoEnvironment(error) {
    if (isVmError(error)) {
      let made = tagError(
        makers.makeError(
          (error instanceof HooksError ? error.thrownName : undefined) ?? error.name,
          error.message,
        ),
        readTag(error),
      );
      return hasWeakSetTag(error) ? addWeakSetTag(made) : made;
    }
    if (
      error === null ||
      (typeof error !== "object" && typeof error !== "function") ||
      vmInstanceofObject(error)
    )
      return error;
    let { name, message } = error;
    return makers.makeError(
      typeof name === "string" ? name : "Error",
      typeof message === "string" ? message : errorMessage(error),
    );
  }
  return {
    fromEnvironment,
    intoEnvironment,
  };
}
//@ chunk-j8f885h1.js:249741-250091 placement
/**
 * 值种类判断表（veiled、array、typed、map、set、date 等）。
 */
var VALUE_KIND_TESTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-j8f885h1.js:249741", () => {
  VALUE_KIND_TESTS = [
    [isUntrustedObject, "veiled"],
    [Array.isArray, "array"],
    [isTypedArray, "typed"],
    [isDataView, "window"],
    [isArrayBuffer, "buffer"],
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
});
//@ chunk-j8f885h1.js:250091-250100 placement
/**
 * 2
 */
var KIND_SLACK = 2;
//@ chunk-j8f885h1.js:250100-250134 placement
var mapped; // deferred: uses VALUE_KIND_TESTS of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:250100", () => {
  mapped = VALUE_KIND_TESTS.slice(KIND_SLACK).map(([test]) => test);
});
//@ chunk-j8f885h1.js:250134-250191 placement
/**
 * 任一谓词为真
 */
function anyPredicate(value) {
  for (let test of mapped) if (test(value)) return true;
  return false;
}
//@ chunk-j8f885h1.js:250191-250291 placement
/**
 * 判断值的种类（record、array、typed、map、set、date、error、veiled 等）。
 */
function valueKindOf(value) {
  return !isUntrustedObject(value) && !Array.isArray(value) && !anyPredicate(value)
    ? "record"
    : (VALUE_KIND_TESTS.find(([test]) => test(value))?.[1] ?? "record");
}
//@ chunk-j8f885h1.js:250291-250337 placement
/**
 * 执行值种类判定
 */
var runValueKindOf = (context) =>
  vmModule_2.runInContext(withUseStrict(VM_COPY_OUT_SOURCE), context)(nullPrototypeFunction(valueKindOf));
//@ chunk-j8f885h1.js:250359-250706 placement
/**
 * 检查答案原型链上的 then 是否已固定为不可变的非函数。
 */
function isThenFixed(value) {
  let current = typeof value === "function" || (typeof value === "object" && value !== null) ? value : null;
  for (let depth = 0; current !== null; depth += 1) {
    if (isUntrustedObject(current)) return false;
    let isExtensible = Reflect.isExtensible(current);
    let ownPropertyDescriptor = Reflect.getOwnPropertyDescriptor(current, "then");
    if (ownPropertyDescriptor !== undefined)
      return (
        ownPropertyDescriptor.writable === false &&
        ownPropertyDescriptor.configurable === false &&
        typeof ownPropertyDescriptor.value !== "function"
      );
    if (isExtensible || depth === MAX_COPY_DEPTH) return false;
    current = Reflect.getPrototypeOf(current);
  }
  return true;
}
//@ chunk-j8f885h1.js:250706-250870 placement
function createAnswerSettler(context) {
  let pin = vmModule_2.runInContext(withUseStrict(VM_ANSWER_PIN_SOURCE), context);
  return async (promise) => {
    let settled = await pin(promise);
    if (!isThenFixed(settled.v)) throw new HooksError("the answer holds a `then` that is not fixed");
    return settled;
  };
}
//@ chunk-j8f885h1.js:250870-251601 placement
/**
 * 创建 hooks VM 上下文（禁止字符串与 wasm 代码生成），装好 Error/proto 补丁与 realm，返回一组 VM 调用、克隆、错误转换与流工具。
 */
function createVmContext(pluginRoot) {
  let globals = nullPrototypeObject();
  let context = SubAgentContext(globals, {
    codeGeneration: {
      strings: false,
      wasm: false,
    },
  });
  patchErrorHasInstance(context);
  patchProtoSetter(context);
  createVmRealm(context, NO_IMPORT_OPTIONS);
  let vmCall = callWithArgs(context);
  let vmApply = vmModule_2.runInContext(
    withUseStrict("((self, fn, ...args) => Reflect.apply(fn, self, args))"),
    context,
  );
  let vmSettle = createAnswerSettler(context);
  let vmErrorDescriber = createVmErrorDescriber(context);
  let vmInstanceofObject = createVmInstanceofObject(context);
  let copyMatcher = VM_MATCHER_SOURCE(context);
  let vmClone = inboundCopier(context);
  let vmAsyncWrap = VM_HOST_FN_WRAPPER(context);
  let leaving = runValueKindOf(context);
  let makers = runVmPrelude(context, pluginRoot);
  let { fromEnvironment, intoEnvironment } = createErrorConverters(
    vmErrorDescriber,
    makers,
    vmInstanceofObject,
  );
  let wrapMethod = vmModule_2.runInContext(
    withUseStrict(VM_HOST_CALL_WRAPPER_SOURCE),
    context,
  )(nullPrototypeFunction(intoEnvironment));
  return {
    globals,
    context,
    makers,
    vmCall,
    vmApply,
    vmSettle,
    vmOwns: vmInstanceofObject,
    copyMatcher,
    vmClone,
    cloneIn: (value) => deepFreezeInPlace(vmClone(value)),
    leavingCopy: leaving.copy,
    leavingAnswer: leaving.answer,
    freezeOwn: leaving.freeze,
    leavingRefusal: leaving.refusal,
    vmAsyncWrap,
    fromEnvironment,
    intoEnvironment,
    wrapMethod,
    vmIterate: vmModule_2.runInContext(withUseStrict(VM_ITERATE_SOURCE), context),
    vmStream: vmModule_2.runInContext(withUseStrict(VM_STREAM_SOURCE), context),
    isGeneratorHook: vmModule_2.runInContext(withUseStrict(IS_ASYNC_GENERATOR_SOURCE), context),
  };
}
//@ chunk-j8f885h1.js:251601-251611 placement
/**
 * 与 VM 共享的心跳戳数组里，调用栈从第 2 个槽开始；前两个槽留给当前环境与当前调用。
 */
var STAMP_CALLER_STACK_START = 2;
//@ chunk-j8f885h1.js:251611-251621 placement
/**
 * 心跳戳数组里「当前调用编号」的槽位，插件每次进入调用都会写它。
 */
var STAMP_CURRENT_CALL_SLOT = 1;
//@ chunk-j8f885h1.js:251621-251631 placement
/**
 * 心跳戳数组里「当前环境编号」的槽位，进出环境时保存与恢复。
 */
var STAMP_ENVIRONMENT_SLOT = 0;
//@ chunk-j8f885h1.js:251631-251641 placement
/**
 * 心跳戳共享数组的槽位数：2 个固定槽加最多 7 层调用栈。
 */
var STAMP_SLOT_COUNT = 9;
//@ chunk-j8f885h1.js:251641-251729 placement (2.1.88 match: markScrollActivity, 0.639)
function markScrollActivity(view) {
  if (view) {
    Atomics.store(view, STAMP_CURRENT_CALL_SLOT, 0);
    setImmediate(Atomics.store, view, STAMP_CURRENT_CALL_SLOT, 0).unref();
  }
}
export {
  isVmError,
  inboundCopier,
  runVmPrelude,
  createVmInstanceofObject,
  createErrorConverters,
  createVmConsole,
  STAMP_SLOT_COUNT,
  STAMP_CALLER_STACK_START,
  STAMP_ENVIRONMENT_SLOT,
  STAMP_CURRENT_CALL_SLOT,
  createVmContext,
  VM_ELEMENT_TABLE_SOURCE,
  valueKindOf,
  markScrollActivity,
  runTimerCallback,
  fireTimerOnce,
  clearTimerHandle,
  nullPrototypeObject,
  patchErrorHasInstance,
  patchProtoSetter,
  VM_HOST_CALL_WRAPPER_SOURCE,
};
