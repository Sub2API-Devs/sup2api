/**
 * zod/v4/core/core.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-vsk3y6b4.js (9)
 * attribution: esm-layout 3, esm-fingerprint 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { CONSTANT_CATCH, members } from "./util.js";
import { deferInit, runDeferredInits } from "../../../../runtime/deferred-init.js";

//@ chunk-vsk3y6b4.js:9655-9700 esm-layout
function constantCatch(fn) {
  let wrapped = () => fn;
  wrapped[CONSTANT_CATCH] = true;
  return wrapped;
}
//@ chunk-vsk3y6b4.js:9700-9815 esm-layout
var _a; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var INVALID;
var _zodDesc;
var _E;
deferInit("chunk-vsk3y6b4.js:9700", () => {
  INVALID = Object.freeze({
    status: "aborted",
  });
  _zodDesc = {
    value: undefined,
    enumerable: false,
  };
  _E = "captureStackTrace" in Error ? Error : null;
});
//@ chunk-vsk3y6b4.js:9815-10001 esm-fingerprint
function newError(Definition) {
  let E = _E;
  if (E) {
    let saved = E.stackTraceLimit;
    if (typeof saved === "number") {
      try {
        E.stackTraceLimit = 0;
      } catch {
        _E = null;
        return new Definition();
      }
      try {
        return new Definition();
      } finally {
        E.stackTraceLimit = saved;
      }
    }
  }
  return new Definition();
}
//@ chunk-vsk3y6b4.js:10001-11065 esm-fingerprint
function $constructor(name, initializer, proto, params) {
  let zodProto = {};
  function Internals(def) {
    this.def = def;
    this.constr = _;
    this.traits = new Set();
  }
  Internals.prototype = zodProto;
  let protoMembers = proto;
  let initialized = protoMembers && new WeakSet();
  function init(inst, def) {
    if (!inst._zod) {
      _zodDesc.value = new Internals(def);
      try {
        Object.defineProperty(inst, "_zod", _zodDesc);
      } finally {
        _zodDesc.value = undefined;
      }
    }
    if (inst._zod.traits.has(name)) return;
    inst._zod.traits.add(name);
    initializer(inst, def);
    if (initialized) {
      let own = Object.getPrototypeOf(inst);
      let ctorProto = inst._zod.constr.prototype;
      let up = own;
      while (up && up !== ctorProto) up = Object.getPrototypeOf(up);
      let target = up ?? own;
      if (!initialized.has(target)) {
        initialized.add(target);
        members(target, protoMembers);
      }
    }
    let proto = _.prototype;
    for (let k in proto) {
      if (!Object.prototype.hasOwnProperty.call(proto, k)) continue;
      if (!(k in inst)) inst[k] = proto[k].bind(inst);
    }
  }
  let Parent = params?.Parent ?? Object;
  class Definition extends Parent {}
  Object.defineProperty(Definition, "name", {
    value: name,
  });
  function _(def) {
    let inst = params?.Parent ? newError(Definition) : this;
    init(inst, def);
    let deferred = inst._zod.deferred;
    if (deferred) {
      for (let fn of deferred) fn();
      inst._zod.deferred = undefined;
    }
    let pp = globalThis.__zod_globalConfig?.postProcessor;
    if (pp) pp(inst);
    return inst;
  }
  Object.defineProperty(_, "init", {
    value: init,
  });
  Object.defineProperty(_, Symbol.hasInstance, {
    value: (inst) => {
      if (params?.Parent && inst instanceof params.Parent) return true;
      return inst?._zod?.traits?.has(name);
    },
  });
  Object.defineProperty(_, "name", {
    value: name,
  });
  return _;
}
//@ chunk-vsk3y6b4.js:11065-11186 esm-fingerprint
class $ZodAsyncError extends Error {
  constructor() {
    super("Encountered Promise during synchronous parse. Use .parseAsync() instead.");
  }
}
//@ chunk-vsk3y6b4.js:11186-11319 esm-fingerprint
class $ZodEncodeError extends Error {
  constructor(name) {
    super(`Encountered unidirectional transform during encode: ${name}`);
    this.name = "ZodEncodeError";
  }
}
//@ chunk-vsk3y6b4.js:11319-11380 esm-fingerprint
// deferred: uses _a of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-vsk3y6b4.js:11319", () => {
  (_a = globalThis).__zod_globalConfig ?? (_a.__zod_globalConfig = {});
});
//@ chunk-vsk3y6b4.js:11380-11418 esm-fingerprint
var globalConfig; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-vsk3y6b4.js:11380", () => {
  globalConfig = globalThis.__zod_globalConfig;
});
//@ chunk-vsk3y6b4.js:11418-11471 esm-layout
function config(newConfig) {
  if (newConfig) Object.assign(globalConfig, newConfig);
  return globalConfig;
}

// The import cycle this module closes (2 modules) is complete: run the load-time work its statements
// marked "deferred" waited for, in the official build's order (runtime/deferred-init.js).
runDeferredInits("vendor/zod/v4/core/core.js");
runDeferredInits("worker:vendor/zod/v4/core/core.js");
export { INVALID, globalConfig, config, $constructor, $ZodAsyncError, $ZodEncodeError, constantCatch };
