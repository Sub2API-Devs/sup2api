/**
 * @aws/lambda-invoke-store/dist-cjs/invoke-store.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws/lambda-invoke-store@0.2.0..0.2.4
 * pieces: chunk-edce4vxq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-edce4vxq.js:2273-4337 cjs-fingerprint
var Vr = x(function (yo) {
  var ve = {
      REQUEST_ID: Symbol.for("_AWS_LAMBDA_REQUEST_ID"),
      X_RAY_TRACE_ID: Symbol.for("_AWS_LAMBDA_X_RAY_TRACE_ID"),
      TENANT_ID: Symbol.for("_AWS_LAMBDA_TENANT_ID"),
    },
    included = ["true", "1"].includes(process.env?.AWS_LAMBDA_NODEJS_NO_GLOBAL_AWSLAMBDA ?? "");
  if (!included) globalThis.awslambda = globalThis.awslambda || {};
  class Xe {
    static PROTECTED_KEYS = ve;
    isProtectedKey(e) {
      return Object.values(ve).includes(e);
    }
    getRequestId() {
      return this.get(ve.REQUEST_ID) ?? "-";
    }
    getXRayTraceId() {
      return this.get(ve.X_RAY_TRACE_ID);
    }
    getTenantId() {
      return this.get(ve.TENANT_ID);
    }
  }
  class Ur extends Xe {
    currentContext;
    getContext() {
      return this.currentContext;
    }
    hasContext() {
      return this.currentContext !== void 0;
    }
    get(e) {
      return this.currentContext?.[e];
    }
    set(e, t) {
      if (this.isProtectedKey(e)) throw Error(`Cannot modify protected Lambda context field: ${String(e)}`);
      ((this.currentContext = this.currentContext || {}), (this.currentContext[e] = t));
    }
    run(e, t) {
      this.currentContext = e;
      try {
        return t();
      } finally {
        this.currentContext = void 0;
      }
    }
  }
  class Nt extends Xe {
    als;
    static async create() {
      let e = new Nt(),
        t = await import("async_hooks");
      return ((e.als = new t.AsyncLocalStorage()), e);
    }
    getContext() {
      return this.als.getStore();
    }
    hasContext() {
      return this.als.getStore() !== void 0;
    }
    get(e) {
      return this.als.getStore()?.[e];
    }
    set(e, t) {
      if (this.isProtectedKey(e)) throw Error(`Cannot modify protected Lambda context field: ${String(e)}`);
      let store = this.als.getStore();
      if (!store) throw Error("No context available");
      store[e] = t;
    }
    run(e, t) {
      return this.als.run(e, t);
    }
  }
  yo.InvokeStore = void 0;
  (function (e) {
    let t = null;
    async function r() {
      if (!t)
        t = (async () => {
          let o = "AWS_LAMBDA_MAX_CONCURRENCY" in process.env ? await Nt.create() : new Ur();
          if (!included && globalThis.awslambda?.InvokeStore) return globalThis.awslambda.InvokeStore;
          else if (!included && globalThis.awslambda) return ((globalThis.awslambda.InvokeStore = o), o);
          else return o;
        })();
      return t;
    }
    ((e.getInstanceAsync = r),
      (e._testing =
        process.env.AWS_LAMBDA_BENCHMARK_MODE === "1"
          ? {
              reset: () => {
                if (((t = null), globalThis.awslambda?.InvokeStore)) delete globalThis.awslambda.InvokeStore;
                globalThis.awslambda = {};
              },
            }
          : void 0));
  })(yo.InvokeStore || (yo.InvokeStore = {}));
  yo.InvokeStoreBase = Xe;
});

export { Vr };
