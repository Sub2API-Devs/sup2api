/**
 * @smithy/property-provider/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/property-provider@2.2.0
 * pieces: chunk-bjd2sxgw.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-bjd2sxgw.js:226-1497 cjs-fingerprint
var require_property_provider = x(function (cjsExports) {
  class ProviderError extends Error {
    name = "ProviderError";
    tryNextLink;
    constructor(message, t = true) {
      let n;
      let e = true;
      if (typeof t === "boolean") {
        n = undefined;
        e = t;
      } else if (t != null && typeof t === "object") {
        n = t.logger;
        e = t.tryNextLink ?? true;
      }
      super(message);
      this.tryNextLink = e;
      Object.setPrototypeOf(this, ProviderError.prototype);
      n?.debug?.(`@smithy/property-provider ${e ? "->" : "(!)"} ${message}`);
    }
    static from(r, tryNextLink = true) {
      return Object.assign(new this(r.message, tryNextLink), r);
    }
  }
  class f extends ProviderError {
    name = "CredentialsProviderError";
    constructor(message, tryNextLink = true) {
      super(message, tryNextLink);
      Object.setPrototypeOf(this, f.prototype);
    }
  }
  class l extends ProviderError {
    name = "TokenProviderError";
    constructor(message, tryNextLink = true) {
      super(message, tryNextLink);
      Object.setPrototypeOf(this, l.prototype);
    }
  }
  var chain =
    (...providers) =>
    async () => {
      if (providers.length === 0) throw new ProviderError("No providers in chain");
      let t;
      for (let provider of providers)
        try {
          return await provider();
        } catch (error) {
          t = error;
          if (error?.tryNextLink) continue;
          throw error;
        }
      throw t;
    };
  var fromStatic = (staticValue) => () => Promise.resolve(staticValue);
  var memoize = (provider, isExpired, requiresRefresh) => {
    let resolved;
    let pending;
    let hasResult;
    let isConstant = false;
    let coalesceProvider = async () => {
      if (!pending) pending = provider();
      try {
        resolved = await pending;
        hasResult = true;
        isConstant = false;
      } finally {
        pending = undefined;
      }
      return resolved;
    };
    if (isExpired === undefined)
      return async (options) => {
        if (!hasResult || options?.forceRefresh) resolved = await coalesceProvider();
        return resolved;
      };
    return async (options) => {
      if (!hasResult || options?.forceRefresh) resolved = await coalesceProvider();
      if (isConstant) return resolved;
      if (requiresRefresh && !requiresRefresh(resolved)) {
        isConstant = true;
        return resolved;
      }
      if (isExpired(resolved)) {
        await coalesceProvider();
        return resolved;
      }
      return resolved;
    };
  };
  cjsExports.CredentialsProviderError = f;
  cjsExports.ProviderError = ProviderError;
  cjsExports.TokenProviderError = l;
  cjsExports.chain = chain;
  cjsExports.fromStatic = fromStatic;
  cjsExports.memoize = memoize;
});
export { require_property_provider };
