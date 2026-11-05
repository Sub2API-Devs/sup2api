/**
 * @aws/lambda-invoke-store/dist-cjs/invoke-store.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws/lambda-invoke-store@0.2.0..0.2.4
 * pieces: chunk-3p78mpxm.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-3p78mpxm.js:2273-4337 cjs-fingerprint
var require_invoke_store = __commonJS(function (cjsExports) {
  var PROTECTED_KEYS = {
    REQUEST_ID: Symbol.for("_AWS_LAMBDA_REQUEST_ID"),
    X_RAY_TRACE_ID: Symbol.for("_AWS_LAMBDA_X_RAY_TRACE_ID"),
    TENANT_ID: Symbol.for("_AWS_LAMBDA_TENANT_ID"),
  };
  var NO_GLOBAL_AWS_LAMBDA = ["true", "1"].includes(process.env?.AWS_LAMBDA_NODEJS_NO_GLOBAL_AWSLAMBDA ?? "");
  if (!NO_GLOBAL_AWS_LAMBDA) globalThis.awslambda = globalThis.awslambda || {};
  class InvokeStoreBase {
    static PROTECTED_KEYS = PROTECTED_KEYS;
    isProtectedKey(key) {
      return Object.values(PROTECTED_KEYS).includes(key);
    }
    getRequestId() {
      return this.get(PROTECTED_KEYS.REQUEST_ID) ?? "-";
    }
    getXRayTraceId() {
      return this.get(PROTECTED_KEYS.X_RAY_TRACE_ID);
    }
    getTenantId() {
      return this.get(PROTECTED_KEYS.TENANT_ID);
    }
  }
  class InvokeStoreSingle extends InvokeStoreBase {
    currentContext;
    getContext() {
      return this.currentContext;
    }
    hasContext() {
      return this.currentContext !== undefined;
    }
    get(key) {
      return this.currentContext?.[key];
    }
    set(key, value) {
      if (this.isProtectedKey(key))
        throw Error(`Cannot modify protected Lambda context field: ${String(key)}`);
      this.currentContext = this.currentContext || {};
      this.currentContext[key] = value;
    }
    run(context, fn) {
      this.currentContext = context;
      try {
        return fn();
      } finally {
        this.currentContext = undefined;
      }
    }
  }
  class InvokeStoreMulti extends InvokeStoreBase {
    als;
    static async create() {
      let instance = new InvokeStoreMulti();
      let asyncHooks = await import("async_hooks");
      instance.als = new asyncHooks.AsyncLocalStorage();
      return instance;
    }
    getContext() {
      return this.als.getStore();
    }
    hasContext() {
      return this.als.getStore() !== undefined;
    }
    get(key) {
      return this.als.getStore()?.[key];
    }
    set(key, value) {
      if (this.isProtectedKey(key))
        throw Error(`Cannot modify protected Lambda context field: ${String(key)}`);
      let store = this.als.getStore();
      if (!store) throw Error("No context available");
      store[key] = value;
    }
    run(context, fn) {
      return this.als.run(context, fn);
    }
  }
  cjsExports.InvokeStore = undefined;
  (function (InvokeStore) {
    let instance = null;
    async function getInstanceAsync() {
      if (!instance)
        instance = (async () => {
          let newInstance =
            "AWS_LAMBDA_MAX_CONCURRENCY" in process.env
              ? await InvokeStoreMulti.create()
              : new InvokeStoreSingle();
          if (!NO_GLOBAL_AWS_LAMBDA && globalThis.awslambda?.InvokeStore)
            return globalThis.awslambda.InvokeStore;
          else if (!NO_GLOBAL_AWS_LAMBDA && globalThis.awslambda) {
            globalThis.awslambda.InvokeStore = newInstance;
            return newInstance;
          } else return newInstance;
        })();
      return instance;
    }
    InvokeStore.getInstanceAsync = getInstanceAsync;
    InvokeStore._testing =
      process.env.AWS_LAMBDA_BENCHMARK_MODE === "1"
        ? {
            reset: () => {
              instance = null;
              if (globalThis.awslambda?.InvokeStore) delete globalThis.awslambda.InvokeStore;
              globalThis.awslambda = {};
            },
          }
        : undefined;
  })(cjsExports.InvokeStore || (cjsExports.InvokeStore = {}));
  cjsExports.InvokeStoreBase = InvokeStoreBase;
});
export { require_invoke_store };
