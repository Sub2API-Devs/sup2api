/**
 * @smithy/property-provider/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @smithy/property-provider@2.2.0
 * pieces: chunk-f7zg61zb.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-f7zg61zb.js:226-1497 cjs-fingerprint
var require_property_provider = __commonJS(function (cjsExports) {
  class ProviderError extends Error {
    name = "ProviderError";
    tryNextLink;
    constructor(message, options = true) {
      let logger;
      let tryNextLink = true;
      if (typeof options === "boolean") {
        logger = undefined;
        tryNextLink = options;
      } else if (options != null && typeof options === "object") {
        logger = options.logger;
        tryNextLink = options.tryNextLink ?? true;
      }
      super(message);
      this.tryNextLink = tryNextLink;
      Object.setPrototypeOf(this, ProviderError.prototype);
      logger?.debug?.(`@smithy/property-provider ${tryNextLink ? "->" : "(!)"} ${message}`);
    }
    static from(error, tryNextLink = true) {
      return Object.assign(new this(error.message, tryNextLink), error);
    }
  }
  class CredentialsProviderError extends ProviderError {
    name = "CredentialsProviderError";
    constructor(message, tryNextLink = true) {
      super(message, tryNextLink);
      Object.setPrototypeOf(this, CredentialsProviderError.prototype);
    }
  }
  class TokenProviderError extends ProviderError {
    name = "TokenProviderError";
    constructor(message, tryNextLink = true) {
      super(message, tryNextLink);
      Object.setPrototypeOf(this, TokenProviderError.prototype);
    }
  }
  var chain =
    (...providers) =>
    async () => {
      if (providers.length === 0) throw new ProviderError("No providers in chain");
      let lastProviderError;
      for (let provider of providers)
        try {
          return await provider();
        } catch (error) {
          lastProviderError = error;
          if (error?.tryNextLink) continue;
          throw error;
        }
      throw lastProviderError;
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
  cjsExports.CredentialsProviderError = CredentialsProviderError;
  cjsExports.ProviderError = ProviderError;
  cjsExports.TokenProviderError = TokenProviderError;
  cjsExports.chain = chain;
  cjsExports.fromStatic = fromStatic;
  cjsExports.memoize = memoize;
});
export { require_property_provider };
