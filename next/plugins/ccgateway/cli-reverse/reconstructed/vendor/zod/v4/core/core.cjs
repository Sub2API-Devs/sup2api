/**
 * zod/v4/core/core.cjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_util } from "./util.cjs";

//@ chunk-1hnjmk23.js:104417-106858 cjs-fingerprint
var require_core = __commonJS(function (cjsExports) {
  var _a;
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.globalConfig =
    cjsExports.$ZodEncodeError =
    cjsExports.$ZodAsyncError =
    cjsExports.$brand =
    cjsExports.NEVER =
      undefined;
  cjsExports.$constructor = $constructor;
  cjsExports.config = config;
  var util_js_1 = require_util();
  cjsExports.NEVER = Object.freeze({
    status: "aborted",
  });
  var _zodDesc = {
    value: undefined,
    enumerable: false,
  };
  var _E = "captureStackTrace" in Error ? Error : null;
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
          util_js_1.members(target, protoMembers);
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
  cjsExports.$brand = Symbol("zod_brand");
  class $ZodAsyncError extends Error {
    constructor() {
      super("Encountered Promise during synchronous parse. Use .parseAsync() instead.");
    }
  }
  cjsExports.$ZodAsyncError = $ZodAsyncError;
  class $ZodEncodeError extends Error {
    constructor(name) {
      super(`Encountered unidirectional transform during encode: ${name}`);
      this.name = "ZodEncodeError";
    }
  }
  cjsExports.$ZodEncodeError = $ZodEncodeError;
  (_a = globalThis).__zod_globalConfig ?? (_a.__zod_globalConfig = {});
  cjsExports.globalConfig = globalThis.__zod_globalConfig;
  function config(newConfig) {
    if (newConfig) Object.assign(cjsExports.globalConfig, newConfig);
    return cjsExports.globalConfig;
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
export { require_core };
